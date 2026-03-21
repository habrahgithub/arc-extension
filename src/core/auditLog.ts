import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { AuditEntry, Classification, DecisionPayload } from '../contracts/types';

interface AuditLogOptions {
  readonly maxBytes?: number;
}

export class AuditLogWriter {
  private readonly maxBytes: number;
  private rotationCounter = 0;

  constructor(
    private readonly workspaceRoot: string,
    options: AuditLogOptions = {},
  ) {
    this.maxBytes = options.maxBytes ?? 10 * 1024 * 1024;
  }

  private auditPath(): string {
    return path.join(this.workspaceRoot, '.arc', 'audit.jsonl');
  }

  private archiveDir(): string {
    return path.join(this.workspaceRoot, '.arc', 'archive');
  }

  ensureReady(): void {
    const arcDir = path.join(this.workspaceRoot, '.arc');
    const blueprintsDir = path.join(arcDir, 'blueprints');
    fs.mkdirSync(blueprintsDir, { recursive: true });
    fs.mkdirSync(this.archiveDir(), { recursive: true });

    const gitignorePath = path.join(arcDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, 'audit.jsonl\narchive/\nperf.jsonl\n', 'utf8');
    } else {
      const contents = fs.readFileSync(gitignorePath, 'utf8');
      if (!contents.includes('perf.jsonl')) {
        fs.writeFileSync(gitignorePath, `${contents.trimEnd()}\nperf.jsonl\n`, 'utf8');
      }
    }

    const auditPath = this.auditPath();
    if (!fs.existsSync(auditPath)) {
      fs.writeFileSync(auditPath, '', 'utf8');
    }
  }

  append(classification: Classification, decision: DecisionPayload): AuditEntry {
    this.ensureReady();

    const baseEntry = {
      ts: new Date().toISOString(),
      file_path: classification.filePath,
      risk_flags: classification.riskFlags,
      matched_rules: classification.matchedRuleIds,
      ...decision,
    };

    const prevHash = this.currentTailHash();
    const hash = this.computeHash(baseEntry, prevHash);
    const entry: AuditEntry = {
      ...baseEntry,
      prev_hash: prevHash,
      hash,
    };

    const serialized = `${JSON.stringify(entry)}\n`;
    this.rotateIfNeeded(Buffer.byteLength(serialized));
    fs.appendFileSync(this.auditPath(), serialized, 'utf8');
    return entry;
  }

  currentTailHash(): string {
    const filePath = this.auditPath();
    if (!fs.existsSync(filePath)) {
      return 'ROOT';
    }

    const contents = fs.readFileSync(filePath, 'utf8').trim();
    if (contents.length === 0) {
      return this.latestArchiveHash();
    }

    const lastLine = contents.split('\n').at(-1);
    if (!lastLine) {
      return this.latestArchiveHash();
    }

    const parsed = JSON.parse(lastLine) as AuditEntry;
    return parsed.hash;
  }

  verifyChain(filePaths?: string[]): boolean {
    const paths = filePaths ?? this.defaultChainFiles();
    let previousHash = 'ROOT';

    for (const filePath of paths) {
      if (!fs.existsSync(filePath)) {
        continue;
      }

      const lines = fs
        .readFileSync(filePath, 'utf8')
        .split('\n')
        .filter(Boolean);

      for (const line of lines) {
        const entry = JSON.parse(line) as AuditEntry;
        if (entry.prev_hash !== previousHash) {
          return false;
        }

        const computed = this.computeHash(
          {
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
            directive_id: entry.directive_id,
            blueprint_id: entry.blueprint_id,
            route_mode: entry.route_mode,
            route_lane: entry.route_lane,
            route_reason: entry.route_reason,
            route_clarity: entry.route_clarity,
            route_fallback: entry.route_fallback,
            route_policy_hash: entry.route_policy_hash,
          },
          entry.prev_hash,
        );

        if (entry.hash !== computed) {
          return false;
        }

        previousHash = entry.hash;
      }
    }

    return true;
  }

  private rotateIfNeeded(incomingBytes: number): void {
    const currentPath = this.auditPath();
    const currentSize = fs.existsSync(currentPath)
      ? fs.statSync(currentPath).size
      : 0;

    if (currentSize + incomingBytes <= this.maxBytes || currentSize === 0) {
      return;
    }

    this.rotationCounter += 1;
    const archiveName = `audit-${new Date()
      .toISOString()
      .replace(/[.:]/g, '-')}-${String(this.rotationCounter).padStart(4, '0')}.jsonl`;
    const archivePath = path.join(this.archiveDir(), archiveName);
    fs.renameSync(currentPath, archivePath);
    fs.writeFileSync(currentPath, '', 'utf8');
  }

  private defaultChainFiles(): string[] {
    const archived = fs.existsSync(this.archiveDir())
      ? fs
          .readdirSync(this.archiveDir())
          .filter((fileName) => fileName.endsWith('.jsonl'))
          .sort()
          .map((fileName) => path.join(this.archiveDir(), fileName))
      : [];

    return [...archived, this.auditPath()];
  }

  private latestArchiveHash(): string {
    const archiveFiles = this.defaultChainFiles().filter(
      (filePath) => filePath !== this.auditPath(),
    );
    const lastArchive = archiveFiles.at(-1);
    if (!lastArchive || !fs.existsSync(lastArchive)) {
      return 'ROOT';
    }

    const contents = fs.readFileSync(lastArchive, 'utf8').trim();
    if (contents.length === 0) {
      return 'ROOT';
    }

    const lastLine = contents.split('\n').at(-1);
    if (!lastLine) {
      return 'ROOT';
    }

    const parsed = JSON.parse(lastLine) as AuditEntry;
    return parsed.hash;
  }

  private computeHash(
    entry: Omit<AuditEntry, 'prev_hash' | 'hash'>,
    prevHash: string,
  ): string {
    const serialized = hasRouteMetadata(entry)
      ? JSON.stringify({
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
          route_mode: entry.route_mode ?? null,
          route_lane: entry.route_lane ?? null,
          route_reason: entry.route_reason ?? null,
          route_clarity: entry.route_clarity ?? null,
          route_fallback: entry.route_fallback ?? null,
          route_policy_hash: entry.route_policy_hash ?? null,
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
        });

    return crypto.createHash('sha256').update(serialized).digest('hex');
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
