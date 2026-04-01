import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AuditEntry,
  AuditEventType,
  Classification,
  DecisionPayload,
  ExplanationCode,
  PatternSnapshot,
} from '../contracts/types';

interface AuditLogOptions {
  readonly maxBytes?: number;
}

interface PersistedEventRow {
  readonly event_id: number;
  readonly event_type: AuditEntry['event_type'];
  readonly decision_id: string;
  readonly linked_decision_id: string | null;
  readonly drift_status: AuditEntry['drift_status'] | null;
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
  readonly deviation: string | null;
  readonly failure_type: string | null;
  readonly explanation: string | null;
  readonly governance_proposal: string | null;
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
        event_type TEXT NOT NULL DEFAULT 'SAVE',
        decision_id TEXT NOT NULL,
        linked_decision_id TEXT,
        drift_status TEXT,
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
        deviation TEXT,
        failure_type TEXT,
        explanation TEXT,
        governance_proposal TEXT,
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
      CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_events_decision_id ON audit_events(decision_id);
      CREATE INDEX IF NOT EXISTS idx_audit_rules_rule_id ON audit_event_rules(rule_id);
      CREATE INDEX IF NOT EXISTS idx_audit_flags_risk_flag ON audit_event_flags(risk_flag);

      INSERT INTO audit_chain_state(singleton_id, tail_hash, updated_at)
      SELECT 1, 'ROOT', datetime('now')
      WHERE NOT EXISTS (SELECT 1 FROM audit_chain_state WHERE singleton_id = 1);
    `);

    const eventTypeColumn = this.execSqlJson<Array<{ name: string }>[number]>(
      `PRAGMA table_info('audit_events');`,
    ).some((column) => column.name === 'event_type');

    if (!eventTypeColumn) {
      this.execSql(
        "ALTER TABLE audit_events ADD COLUMN event_type TEXT NOT NULL DEFAULT 'SAVE';",
      );
    }

    const decisionIdColumn = this.execSqlJson<Array<{ name: string }>[number]>(
      `PRAGMA table_info('audit_events');`,
    ).some((column) => column.name === 'decision_id');

    if (!decisionIdColumn) {
      this.execSql("ALTER TABLE audit_events ADD COLUMN decision_id TEXT;");
      this.execSql("UPDATE audit_events SET decision_id = hash WHERE decision_id IS NULL;");
      this.execSql(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_events_decision_id ON audit_events(decision_id);',
      );
    }

    const linkedDecisionIdColumn = this.execSqlJson<Array<{ name: string }>[number]>(
      `PRAGMA table_info('audit_events');`,
    ).some((column) => column.name === 'linked_decision_id');

    if (!linkedDecisionIdColumn) {
      this.execSql(
        'ALTER TABLE audit_events ADD COLUMN linked_decision_id TEXT;',
      );
    }

    const driftStatusColumn = this.execSqlJson<Array<{ name: string }>[number]>(
      `PRAGMA table_info('audit_events');`,
    ).some((column) => column.name === 'drift_status');

    if (!driftStatusColumn) {
      this.execSql('ALTER TABLE audit_events ADD COLUMN drift_status TEXT;');
    }

    const deviationColumn = this.execSqlJson<Array<{ name: string }>[number]>(
      `PRAGMA table_info('audit_events');`,
    ).some((column) => column.name === 'deviation');

    if (!deviationColumn) {
      this.execSql('ALTER TABLE audit_events ADD COLUMN deviation TEXT;');
    }

    const failureTypeColumn = this.execSqlJson<
      Array<{ name: string }>[number]
    >(`PRAGMA table_info('audit_events');`).some(
      (column) => column.name === 'failure_type',
    );

    if (!failureTypeColumn) {
      this.execSql('ALTER TABLE audit_events ADD COLUMN failure_type TEXT;');
    }

    const explanationColumn = this.execSqlJson<
      Array<{ name: string }>[number]
    >(`PRAGMA table_info('audit_events');`).some(
      (column) => column.name === 'explanation',
    );

    if (!explanationColumn) {
      this.execSql('ALTER TABLE audit_events ADD COLUMN explanation TEXT;');
    }

    const governanceProposalColumn = this.execSqlJson<
      Array<{ name: string }>[number]
    >(`PRAGMA table_info('audit_events');`).some(
      (column) => column.name === 'governance_proposal',
    );

    if (!governanceProposalColumn) {
      this.execSql(
        'ALTER TABLE audit_events ADD COLUMN governance_proposal TEXT;',
      );
    }
  }

  append(
    classification: Classification,
    decision: DecisionPayload,
    eventType: AuditEventType = 'SAVE',
    actor?: ActorIdentity,
    fingerprint?: string,
  ): AuditEntry {
    this.ensureReady();

    const timestamp = new Date().toISOString();
    const decisionId = this.computeDecisionId(
      eventType,
      classification.filePath,
      decision.fingerprint,
      timestamp,
    );
    const linkage = this.resolveLifecycleLink(
      eventType,
      classification.filePath,
      decision.fingerprint,
    );
    const baseEntry = {
      event_type: eventType,
      decision_id: decisionId,
      linked_decision_id: linkage.linkedDecisionId,
      drift_status: linkage.driftStatus,
      ts: timestamp,
      file_path: classification.filePath,
      risk_flags: classification.riskFlags,
      matched_rules: classification.matchedRuleIds,
      ...decision,
      actor_id: decision.actor_id,
      actor_type: decision.actor_type,
      fingerprint: fingerprint ?? decision.fingerprint,
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

  explanationPatternSnapshot(
    explanationCode: ExplanationCode,
    options: {
      eventType?: AuditEventType;
      filePath?: string;
      limit?: number;
    } = {},
  ): PatternSnapshot {
    this.ensureReady();
    const filters: string[] = [
      'explanation IS NOT NULL',
      `json_extract(explanation, '$.code') = ${sql(explanationCode)}`,
    ];

    if (options.eventType) {
      filters.push(`event_type = ${sql(options.eventType)}`);
    }

    if (options.filePath) {
      filters.push(`file_path = ${sql(options.filePath)}`);
    }

    const limit = options.limit ?? 50;
    const rows = this.execSqlJson<Array<{ ts: string }>[number]>(`
      SELECT ts
      FROM audit_events
      WHERE ${filters.join(' AND ')}
      ORDER BY event_id DESC
      LIMIT ${limit};
    `);

    if (rows.length === 0) {
      return { occurrenceCount: 0 };
    }

    const ordered = [...rows].reverse();
    return {
      occurrenceCount: rows.length,
      firstSeenAt: ordered[0]?.ts,
      lastSeenAt: rows[0]?.ts,
    };
  }

  /**
   * M4-001 — Commit Context Awareness
   *
   * Queries the latest SAVE entry per file within the repository root, then
   * cross-references against any existing COMMIT entries to determine drift
   * status.  Files with no matching COMMIT entry are classified as
   * NO_LINKED_DECISION (the commit observation for them hasn't been written
   * yet, or they were never committed through the interceptor).
   */
  queryCommitContext(
    repoRoot: string,
  ): { filePath: string; driftStatus: string | null }[] {
    this.ensureReady();
    const prefix = repoRoot.endsWith('/') ? repoRoot : `${repoRoot}/`;
    const rows = this.execSqlJson<{ file_path: string; drift_status: string | null }>(`
      WITH latest_saves AS (
        SELECT file_path, MAX(event_id) AS max_id
        FROM audit_events
        WHERE event_type = 'SAVE'
          AND (file_path = ${sql(repoRoot)} OR file_path LIKE ${sql(`${prefix}%`)})
        GROUP BY file_path
      ),
      commit_status AS (
        SELECT
          s.file_path,
          s.decision_id,
          (
            SELECT c.drift_status
            FROM audit_events c
            WHERE c.event_type = 'COMMIT'
              AND c.linked_decision_id = s.decision_id
            ORDER BY c.event_id DESC
            LIMIT 1
          ) AS drift_status
        FROM latest_saves ls
        JOIN audit_events s ON s.event_id = ls.max_id
      )
      SELECT file_path, drift_status FROM commit_status;
    `);
    return rows.map((r) => ({ filePath: r.file_path, driftStatus: r.drift_status }));
  }

  /**
   * P9-001 — File-Level Audit Indicator
   *
   * Returns the latest SAVE entry for a file and the drift_status from its
   * most recent linked COMMIT, if any.  Returns null when no SAVE exists.
   */
  queryFileAuditState(
    filePath: string,
  ): { decisionId: string; driftStatus: string | null } | null {
    this.ensureReady();
    const rows = this.execSqlJson<{
      decision_id: string;
      drift_status: string | null;
    }>(`
      SELECT
        s.decision_id,
        (
          SELECT c.drift_status
          FROM audit_events c
          WHERE c.event_type = 'COMMIT'
            AND c.linked_decision_id = s.decision_id
          ORDER BY c.event_id DESC
          LIMIT 1
        ) AS drift_status
      FROM audit_events s
      WHERE s.event_type = 'SAVE' AND s.file_path = ${sql(filePath)}
      ORDER BY s.event_id DESC
      LIMIT 1;
    `);
    if (rows.length === 0 || rows[0] === undefined) {
      return null;
    }
    return { decisionId: rows[0].decision_id, driftStatus: rows[0].drift_status };
  }

  verifyChain(): boolean {
    const rows = this.execSqlJson<PersistedEventRow>(`
      SELECT
        ae.event_id,
        ae.event_type,
        ae.decision_id,
        ae.linked_decision_id,
        ae.drift_status,
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
        ae.deviation,
        ae.failure_type,
        ae.explanation,
        ae.governance_proposal,
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
        ae.event_type,
        ae.decision_id,
        ae.linked_decision_id,
        ae.drift_status,
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
        ae.deviation,
        ae.failure_type,
        ae.explanation,
        ae.governance_proposal,
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
        event_type,
        decision_id,
        linked_decision_id,
        drift_status,
        ts, file_path, decision, reason, risk_level, source,
        violated_rules, next_action, fallback_cause, lease_status,
        directive_id, blueprint_id, route_mode, route_lane, route_reason,
        route_clarity, route_fallback, route_policy_hash,
        actor_id, actor_type, fingerprint, fingerprint_version,
        deviation, failure_type,
        explanation,
        governance_proposal,
        prev_hash, hash
      ) VALUES (
        ${sql(entry.event_type)},
        ${sql(entry.decision_id)},
        ${sql(entry.linked_decision_id ?? null)},
        ${sql(entry.drift_status ?? null)},
        ${sql(entry.ts)}, ${sql(entry.file_path)}, ${sql(entry.decision)}, ${sql(entry.reason)}, ${sql(entry.risk_level)}, ${sql(entry.source)},
        ${sql(JSON.stringify(entry.violated_rules))}, ${sql(entry.next_action)}, ${sql(entry.fallback_cause)}, ${sql(entry.lease_status)},
        ${sql(entry.directive_id ?? null)}, ${sql(entry.blueprint_id ?? null)}, ${sql(entry.route_mode ?? null)}, ${sql(entry.route_lane ?? null)}, ${sql(entry.route_reason ?? null)},
        ${sql(entry.route_clarity ?? null)}, ${sql(entry.route_fallback ?? null)}, ${sql(entry.route_policy_hash ?? null)},
        ${sql(entry.actor_id ?? null)}, ${sql(entry.actor_type ?? null)}, ${sql(entry.fingerprint ?? null)}, ${sql(entry.fingerprint_version ?? null)},
        ${sql(entry.deviation ? JSON.stringify(entry.deviation) : null)}, ${sql(entry.failure_type ?? null)},
        ${sql(entry.explanation ? JSON.stringify(entry.explanation) : null)},
        ${sql(entry.governance_proposal ? JSON.stringify(entry.governance_proposal) : null)},
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
      event_type: row.event_type,
      decision_id: row.decision_id,
      linked_decision_id: row.linked_decision_id ?? undefined,
      drift_status: row.drift_status ?? undefined,
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
      deviation: row.deviation
        ? (JSON.parse(row.deviation) as AuditEntry['deviation'])
        : undefined,
      failure_type: (row.failure_type as AuditEntry['failure_type']) ?? undefined,
      explanation: row.explanation
        ? (JSON.parse(row.explanation) as AuditEntry['explanation'])
        : undefined,
      governance_proposal: row.governance_proposal
        ? (JSON.parse(row.governance_proposal) as AuditEntry['governance_proposal'])
        : undefined,
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
      event_type: entry.event_type,
      decision_id: entry.decision_id,
      linked_decision_id: entry.linked_decision_id ?? null,
      drift_status: entry.drift_status ?? null,
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
<<<<<<< HEAD
        }
      : basePayload;

    const withFingerprint = hasFingerprintMetadata(entry)
      ? {
          ...withRoute,
          actor_id: entry.actor_id ?? null,
          actor_type: entry.actor_type ?? null,
          fingerprint: entry.fingerprint ?? null,
          fingerprint_version: entry.fingerprint_version ?? null,
        }
      : withRoute;

    const serialized = JSON.stringify(
      hasDeviationMetadata(entry)
        ? {
            ...withFingerprint,
            deviation: entry.deviation ?? null,
            failure_type: entry.failure_type ?? null,
            explanation: entry.explanation ?? null,
            governance_proposal: entry.governance_proposal ?? null,
          }
        : withFingerprint,
    );
=======
          ...(entry.fingerprint !== undefined
            ? { fingerprint: entry.fingerprint }
            : {}),
        })
      : JSON.stringify({
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
          ...(entry.fingerprint !== undefined
            ? { fingerprint: entry.fingerprint }
            : {}),
        });
>>>>>>> origin/codex/build-ast-layer-and-unify-analysis-engine

    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  private execSql(sqlStatement: string): void {
    execFileSync('sqlite3', ['-bail', this.sqlitePath(), sqlStatement], {
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

  private findLatestSaveDecisionId(
    filePath: string,
    fingerprint?: string,
  ): string | undefined {
    const fingerprintPredicate =
      fingerprint === undefined
        ? 'fingerprint IS NULL'
        : `fingerprint = ${sql(fingerprint)}`;
    const rows = this.execSqlJson<Array<{ decision_id: string }>[number]>(`
      SELECT decision_id
      FROM audit_events
      WHERE event_type = 'SAVE'
        AND file_path = ${sql(filePath)}
        AND ${fingerprintPredicate}
      ORDER BY event_id DESC
      LIMIT 1;
    `);

    return rows[0]?.decision_id;
  }

  private findLatestSaveDecisionByFilePath(
    filePath: string,
  ): { decision_id: string; fingerprint: string | null } | undefined {
    const rows = this.execSqlJson<
      Array<{ decision_id: string; fingerprint: string | null }>[number]
    >(`
      SELECT decision_id, fingerprint
      FROM audit_events
      WHERE event_type = 'SAVE'
        AND file_path = ${sql(filePath)}
      ORDER BY event_id DESC
      LIMIT 1;
    `);

    return rows[0];
  }

  private resolveLifecycleLink(
    eventType: AuditEventType,
    filePath: string,
    fingerprint?: string,
  ): {
    linkedDecisionId?: string;
    driftStatus?: AuditEntry['drift_status'];
  } {
    if (eventType === 'SAVE') {
      return {};
    }

    if (eventType === 'RUN') {
      return {
        linkedDecisionId: this.findLatestSaveDecisionId(filePath, fingerprint),
      };
    }

    const linkedSave = this.findLatestSaveDecisionByFilePath(filePath);
    if (!linkedSave) {
      return {
        driftStatus: 'NO_LINKED_DECISION',
      };
    }

    if (!linkedSave.fingerprint || !fingerprint) {
      return {
        linkedDecisionId: linkedSave.decision_id,
        driftStatus: 'FINGERPRINT_UNAVAILABLE',
      };
    }

    return {
      linkedDecisionId: linkedSave.decision_id,
      driftStatus:
        linkedSave.fingerprint === fingerprint ? 'NO_DRIFT' : 'DRIFT_DETECTED',
    };
  }

  private computeDecisionId(
    eventType: AuditEventType,
    filePath: string,
    fingerprint: string | undefined,
    timestamp: string,
  ): string {
    return crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          event_type: eventType,
          file_path: filePath,
          fingerprint: fingerprint ?? null,
          ts: timestamp,
        }),
      )
      .digest('hex');
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

function hasDeviationMetadata(entry: Partial<AuditEntry>): boolean {
  return (
    entry.deviation !== undefined ||
    entry.failure_type !== undefined ||
    entry.explanation !== undefined ||
    entry.governance_proposal !== undefined
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
