import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { AuditEntry, Classification, DecisionPayload } from '../contracts/types';

interface AuditLogOptions {
  readonly maxBytes?: number;
}

interface PersistedEventRow {
  readonly event_id: number;
  readonly ts: string;
  readonly file_path: string;
  readonly decision: AuditEntry['decision'];
  readonly reason: string;
  readonly risk_level: AuditEntry['risk_level'];
  readonly source: AuditEntry['source'];
  readonly violated_rules: string;
  readonly next_action: string;
  readonly fallback_cause: AuditEntry['fallback_cause'];
  readonly lease_status: AuditEntry['lease_status'];
  readonly directive_id: string | null;
  readonly blueprint_id: string | null;
  readonly route_mode: AuditEntry['route_mode'] | null;
  readonly route_lane: AuditEntry['route_lane'] | null;
  readonly route_reason: string | null;
  readonly route_clarity: AuditEntry['route_clarity'] | null;
  readonly route_fallback: AuditEntry['route_fallback'] | null;
  readonly route_policy_hash: string | null;
  readonly actor_id: string | null;
  readonly actor_type: AuditEntry['actor_type'] | null;
  readonly fingerprint: string | null;
  readonly fingerprint_version: string | null;
  readonly prev_hash: string;
  readonly hash: string;
  readonly matched_rules: string;
  readonly risk_flags: string;
}

export class AuditLogWriter {
  private readonly maxBytes: number;

  constructor(
    private readonly workspaceRoot: string,
    options: AuditLogOptions = {},
  ) {
    this.maxBytes = options.maxBytes ?? 10 * 1024 * 1024;
  }

  private auditPath(): string {
    return path.join(this.workspaceRoot, '.arc', 'audit.jsonl');
  }

  private sqlitePath(): string {
    return path.join(this.workspaceRoot, '.arc', 'audit.sqlite3');
  }

  ensureReady(): void {
    const arcDir = path.join(this.workspaceRoot, '.arc');
    const blueprintsDir = path.join(arcDir, 'blueprints');
    fs.mkdirSync(blueprintsDir, { recursive: true });

    const gitignorePath = path.join(arcDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(
        gitignorePath,
        'audit.jsonl\naudit.sqlite3\narchive/\nperf.jsonl\n',
        'utf8',
      );
    } else {
      const contents = fs.readFileSync(gitignorePath, 'utf8');
      const next = ensureGitignoreLine(contents, 'audit.sqlite3');
      fs.writeFileSync(gitignorePath, next, 'utf8');
    }

    if (!fs.existsSync(this.auditPath())) {
      fs.writeFileSync(this.auditPath(), '', 'utf8');
    }

    this.execSql(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS audit_events (
        event_id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL,
        file_path TEXT NOT NULL,
        decision TEXT NOT NULL,
        reason TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        source TEXT NOT NULL,
        violated_rules TEXT NOT NULL,
        next_action TEXT NOT NULL,
        fallback_cause TEXT NOT NULL,
        lease_status TEXT NOT NULL,
        directive_id TEXT,
        blueprint_id TEXT,
        route_mode TEXT,
        route_lane TEXT,
        route_reason TEXT,
        route_clarity TEXT,
        route_fallback TEXT,
        route_policy_hash TEXT,
        actor_id TEXT,
        actor_type TEXT,
        fingerprint TEXT,
        fingerprint_version TEXT,
        prev_hash TEXT NOT NULL,
        hash TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS audit_event_rules (
        event_id INTEGER NOT NULL,
        rule_id TEXT NOT NULL,
        PRIMARY KEY (event_id, rule_id),
        FOREIGN KEY (event_id) REFERENCES audit_events(event_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_event_flags (
        event_id INTEGER NOT NULL,
        risk_flag TEXT NOT NULL,
        PRIMARY KEY (event_id, risk_flag),
        FOREIGN KEY (event_id) REFERENCES audit_events(event_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_chain_state (
        singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
        tail_event_id INTEGER,
        tail_hash TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (tail_event_id) REFERENCES audit_events(event_id)
      );

      CREATE INDEX IF NOT EXISTS idx_audit_events_ts ON audit_events(ts);
      CREATE INDEX IF NOT EXISTS idx_audit_events_file_path ON audit_events(file_path);
      CREATE INDEX IF NOT EXISTS idx_audit_rules_rule_id ON audit_event_rules(rule_id);
      CREATE INDEX IF NOT EXISTS idx_audit_flags_risk_flag ON audit_event_flags(risk_flag);

      INSERT INTO audit_chain_state(singleton_id, tail_hash, updated_at)
      SELECT 1, 'ROOT', datetime('now')
      WHERE NOT EXISTS (SELECT 1 FROM audit_chain_state WHERE singleton_id = 1);
    `);
  }

  append(classification: Classification, decision: DecisionPayload): AuditEntry {
    this.ensureReady();

    const baseEntry = {
      ts: new Date().toISOString(),
      file_path: classification.filePath,
      risk_flags: classification.riskFlags,
      matched_rules: classification.matchedRuleIds,
      ...decision,
      actor_id: decision.actor_id,
      actor_type: decision.actor_type,
      fingerprint: decision.fingerprint,
      fingerprint_version: decision.fingerprint_version,
    };

    const prevHash = this.currentTailHash();
    const hash = this.computeHash(baseEntry, prevHash);
    const entry: AuditEntry = {
      ...baseEntry,
      prev_hash: prevHash,
      hash,
    };

    this.persistAppendAtomically(entry);

    const serialized = `${JSON.stringify(entry)}\n`;
    this.rotateIfNeeded(Buffer.byteLength(serialized));
    fs.appendFileSync(this.auditPath(), serialized, 'utf8');

    return entry;
  }

  currentTailHash(): string {
    this.ensureReady();
    const rows = this.execSqlJson<{ tail_hash: string }>(
      'SELECT tail_hash FROM audit_chain_state WHERE singleton_id = 1;',
    );
    return rows[0]?.tail_hash ?? 'ROOT';
  }

  verifyChain(): boolean {
    const rows = this.execSqlJson<PersistedEventRow>(`
      SELECT
        ae.event_id,
        ae.ts,
        ae.file_path,
        ae.decision,
        ae.reason,
        ae.risk_level,
        ae.source,
        ae.violated_rules,
        ae.next_action,
        ae.fallback_cause,
        ae.lease_status,
        ae.directive_id,
        ae.blueprint_id,
        ae.route_mode,
        ae.route_lane,
        ae.route_reason,
        ae.route_clarity,
        ae.route_fallback,
        ae.route_policy_hash,
        ae.actor_id,
        ae.actor_type,
        ae.fingerprint,
        ae.fingerprint_version,
        ae.prev_hash,
        ae.hash,
        COALESCE((SELECT json_group_array(rule_id) FROM audit_event_rules WHERE event_id = ae.event_id), '[]') AS matched_rules,
        COALESCE((SELECT json_group_array(risk_flag) FROM audit_event_flags WHERE event_id = ae.event_id), '[]') AS risk_flags
      FROM audit_events ae
      ORDER BY ae.event_id ASC;
    `);

    let previousHash = 'ROOT';
    for (const row of rows) {
      if (row.prev_hash !== previousHash) {
        return false;
      }
      const entry = this.rowToAuditEntry(row);
      const computed = this.computeHash(
        {
          ...entry,
          actor_id: entry.actor_id,
          actor_type: entry.actor_type,
          fingerprint: entry.fingerprint,
          fingerprint_version: entry.fingerprint_version,
        },
        entry.prev_hash,
      );

      if (computed !== row.hash) {
        return false;
      }
      previousHash = row.hash;
    }

    const tail = this.currentTailHash();
    return tail === previousHash;
  }

  exportJsonlFromSqlite(): void {
    this.ensureReady();
    const rows = this.execSqlJson<PersistedEventRow>(`
      SELECT
        ae.event_id,
        ae.ts,
        ae.file_path,
        ae.decision,
        ae.reason,
        ae.risk_level,
        ae.source,
        ae.violated_rules,
        ae.next_action,
        ae.fallback_cause,
        ae.lease_status,
        ae.directive_id,
        ae.blueprint_id,
        ae.route_mode,
        ae.route_lane,
        ae.route_reason,
        ae.route_clarity,
        ae.route_fallback,
        ae.route_policy_hash,
        ae.actor_id,
        ae.actor_type,
        ae.fingerprint,
        ae.fingerprint_version,
        ae.prev_hash,
        ae.hash,
        COALESCE((SELECT json_group_array(rule_id) FROM audit_event_rules WHERE event_id = ae.event_id), '[]') AS matched_rules,
        COALESCE((SELECT json_group_array(risk_flag) FROM audit_event_flags WHERE event_id = ae.event_id), '[]') AS risk_flags
      FROM audit_events ae
      ORDER BY ae.event_id ASC;
    `);
    const payload = rows
      .map((row) => JSON.stringify(this.rowToAuditEntry(row)))
      .join('\n');
    fs.writeFileSync(this.auditPath(), payload.length > 0 ? `${payload}\n` : '', 'utf8');
  }

  private persistAppendAtomically(entry: AuditEntry): void {
    const insertRulesSql = entry.matched_rules
      .map(
        (ruleId) =>
          `INSERT INTO audit_event_rules (event_id, rule_id) VALUES ((SELECT event_id FROM audit_events WHERE hash = ${sql(entry.hash)}), ${sql(ruleId)});`,
      )
      .join('\n');

    const insertFlagsSql = entry.risk_flags
      .map(
        (flag) =>
          `INSERT INTO audit_event_flags (event_id, risk_flag) VALUES ((SELECT event_id FROM audit_events WHERE hash = ${sql(entry.hash)}), ${sql(flag)});`,
      )
      .join('\n');

    this.execSql(`
      BEGIN IMMEDIATE;
      INSERT INTO audit_events (
        ts, file_path, decision, reason, risk_level, source,
        violated_rules, next_action, fallback_cause, lease_status,
        directive_id, blueprint_id, route_mode, route_lane, route_reason,
        route_clarity, route_fallback, route_policy_hash,
        actor_id, actor_type, fingerprint, fingerprint_version,
        prev_hash, hash
      ) VALUES (
        ${sql(entry.ts)}, ${sql(entry.file_path)}, ${sql(entry.decision)}, ${sql(entry.reason)}, ${sql(entry.risk_level)}, ${sql(entry.source)},
        ${sql(JSON.stringify(entry.violated_rules))}, ${sql(entry.next_action)}, ${sql(entry.fallback_cause)}, ${sql(entry.lease_status)},
        ${sql(entry.directive_id ?? null)}, ${sql(entry.blueprint_id ?? null)}, ${sql(entry.route_mode ?? null)}, ${sql(entry.route_lane ?? null)}, ${sql(entry.route_reason ?? null)},
        ${sql(entry.route_clarity ?? null)}, ${sql(entry.route_fallback ?? null)}, ${sql(entry.route_policy_hash ?? null)},
        ${sql(entry.actor_id ?? null)}, ${sql(entry.actor_type ?? null)}, ${sql(entry.fingerprint ?? null)}, ${sql(entry.fingerprint_version ?? null)},
        ${sql(entry.prev_hash)}, ${sql(entry.hash)}
      );

      ${insertRulesSql}
      ${insertFlagsSql}

      UPDATE audit_chain_state
      SET tail_event_id = (SELECT event_id FROM audit_events WHERE hash = ${sql(entry.hash)}),
          tail_hash = ${sql(entry.hash)},
          updated_at = ${sql(new Date().toISOString())}
      WHERE singleton_id = 1;

      COMMIT;
    `);
  }

  private rowToAuditEntry(row: PersistedEventRow): AuditEntry {
    return {
      ts: row.ts,
      file_path: row.file_path,
      risk_flags: JSON.parse(row.risk_flags) as AuditEntry['risk_flags'],
      matched_rules: JSON.parse(row.matched_rules) as AuditEntry['matched_rules'],
      decision: row.decision,
      reason: row.reason,
      risk_level: row.risk_level,
      violated_rules: JSON.parse(row.violated_rules) as string[],
      next_action: row.next_action,
      source: row.source,
      fallback_cause: row.fallback_cause,
      lease_status: row.lease_status,
      directive_id: row.directive_id ?? undefined,
      blueprint_id: row.blueprint_id ?? undefined,
      route_mode: row.route_mode ?? undefined,
      route_lane: row.route_lane ?? undefined,
      route_reason: row.route_reason ?? undefined,
      route_clarity: row.route_clarity ?? undefined,
      route_fallback: row.route_fallback ?? undefined,
      route_policy_hash: row.route_policy_hash ?? undefined,
      actor_id: row.actor_id ?? undefined,
      actor_type: row.actor_type ?? undefined,
      fingerprint: row.fingerprint ?? undefined,
      fingerprint_version: row.fingerprint_version ?? undefined,
      prev_hash: row.prev_hash,
      hash: row.hash,
    };
  }

  private rotateIfNeeded(incomingBytes: number): void {
    const currentPath = this.auditPath();
    const currentSize = fs.existsSync(currentPath)
      ? fs.statSync(currentPath).size
      : 0;
    if (incomingBytes > 0 && currentSize > this.maxBytes * 2) {
      this.exportJsonlFromSqlite();
    }
  }

  private computeHash(
    entry: Omit<AuditEntry, 'prev_hash' | 'hash'>,
    prevHash: string,
  ): string {
    const basePayload = {
      prev_hash: prevHash,
      ts: entry.ts,
      file_path: entry.file_path,
      risk_flags: entry.risk_flags,
      matched_rules: entry.matched_rules,
      decision: entry.decision,
      reason: entry.reason,
      risk_level: entry.risk_level,
      violated_rules: entry.violated_rules,
      next_action: entry.next_action,
      source: entry.source,
      fallback_cause: entry.fallback_cause,
      lease_status: entry.lease_status,
      directive_id: entry.directive_id ?? null,
      blueprint_id: entry.blueprint_id ?? null,
    };

    const withRoute = hasRouteMetadata(entry)
      ? {
          ...basePayload,
          route_mode: entry.route_mode ?? null,
          route_lane: entry.route_lane ?? null,
          route_reason: entry.route_reason ?? null,
          route_clarity: entry.route_clarity ?? null,
          route_fallback: entry.route_fallback ?? null,
          route_policy_hash: entry.route_policy_hash ?? null,
        }
      : basePayload;

    const serialized = hasFingerprintMetadata(entry)
      ? JSON.stringify({
          ...withRoute,
          actor_id: entry.actor_id ?? null,
          actor_type: entry.actor_type ?? null,
          fingerprint: entry.fingerprint ?? null,
          fingerprint_version: entry.fingerprint_version ?? null,
        })
      : JSON.stringify(withRoute);

    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  private execSql(sqlStatement: string): void {
    execFileSync('sqlite3', [this.sqlitePath(), sqlStatement], {
      encoding: 'utf8',
    });
  }

  private execSqlJson<T>(sqlStatement: string): T[] {
    const output = execFileSync('sqlite3', ['-json', this.sqlitePath(), sqlStatement], {
      encoding: 'utf8',
    }).trim();
    if (!output) {
      return [];
    }
    return JSON.parse(output) as T[];
  }
}


function hasRouteMetadata(entry: Partial<AuditEntry>): boolean {
  return (
    entry.route_mode !== undefined ||
    entry.route_lane !== undefined ||
    entry.route_reason !== undefined ||
    entry.route_clarity !== undefined ||
    entry.route_fallback !== undefined ||
    entry.route_policy_hash !== undefined
  );
}

function hasFingerprintMetadata(entry: Partial<AuditEntry>): boolean {
  return (
    entry.actor_id !== undefined ||
    entry.actor_type !== undefined ||
    entry.fingerprint !== undefined ||
    entry.fingerprint_version !== undefined
  );
}

function ensureGitignoreLine(contents: string, line: string): string {
  if (contents.includes(line)) {
    return contents;
  }
  return `${contents.trimEnd()}\n${line}\n`;
}

function sql(value: string | null): string {
  if (value === null) {
    return 'NULL';
  }
  return `'${value.replace(/'/g, "''")}'`;
}
