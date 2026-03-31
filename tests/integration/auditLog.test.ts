import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AuditLogWriter } from '../../src/core/auditLog';
import { classifyFile } from '../../src/core/classifier';
import { DEFAULT_RULES } from '../../src/core/rules';
import { evaluateRules } from '../../src/core/ruleEngine';
import { fixtureInputs } from '../fixtures/saveInputs';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-audit-'));
  workspaces.push(workspace);
  return workspace;
}

afterEach(() => {
  while (workspaces.length > 0) {
    const workspace = workspaces.pop();
    if (workspace) {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }
});

describe('sqlite-backed audit log', () => {
  it('preserves append continuity and hash-chain integrity', () => {
    const workspace = makeWorkspace();
    const writer = new AuditLogWriter(workspace);
    const authClassification = classifyFile(fixtureInputs.auth, DEFAULT_RULES);
    const schemaClassification = classifyFile(fixtureInputs.schema, DEFAULT_RULES);

    const first = writer.append(
      authClassification,
      evaluateRules(authClassification, fixtureInputs.auth),
    );
    const second = writer.append(
      schemaClassification,
      evaluateRules(schemaClassification, fixtureInputs.schema),
    );

    expect(first.prev_hash).toBe('ROOT');
    expect(second.prev_hash).toBe(first.hash);
    expect(writer.verifyChain()).toBe(true);
  });

  it('detects tamper/hash mismatch during verification', () => {
    const workspace = makeWorkspace();
    const writer = new AuditLogWriter(workspace);
    const authClassification = classifyFile(fixtureInputs.auth, DEFAULT_RULES);
    writer.append(authClassification, evaluateRules(authClassification, fixtureInputs.auth));

    const sqlitePath = path.join(workspace, '.arc', 'audit.sqlite3');
    const tamperSql = "UPDATE audit_events SET hash = 'tampered' WHERE event_id = 1;";
    execFileSync('sqlite3', [sqlitePath, tamperSql], { encoding: 'utf8' });

    expect(writer.verifyChain()).toBe(false);
  });

  it('persists and exports optional fingerprint metadata while allowing null fingerprint', () => {
    const workspace = makeWorkspace();
    const writer = new AuditLogWriter(workspace);
    const authClassification = classifyFile(fixtureInputs.auth, DEFAULT_RULES);
    const baseDecision = evaluateRules(authClassification, fixtureInputs.auth);

    const withoutFingerprint = writer.append(authClassification, {
      ...baseDecision,
      fingerprint: undefined,
      fingerprint_version: undefined,
    });

    const withFingerprint = writer.append(authClassification, {
      ...baseDecision,
      fingerprint: 'sha256:abcdef123456',
      fingerprint_version: 'fp.v1',
      actor_id: 'forge-agent',
      actor_type: 'AGENT',
    });

    expect(withoutFingerprint.fingerprint).toBeUndefined();
    expect(withFingerprint.fingerprint_version).toBe('fp.v1');

    writer.exportJsonlFromSqlite();
    const exportedLines = fs
      .readFileSync(path.join(workspace, '.arc', 'audit.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);

    expect(exportedLines).toHaveLength(2);
    expect(exportedLines[1].fingerprint).toBe('sha256:abcdef123456');
    expect(exportedLines[1].fingerprint_version).toBe('fp.v1');
    expect(exportedLines[1].prev_hash).toBe(exportedLines[0].hash);
  });

  it('writes SQLite as primary while keeping JSONL as derived export shape', () => {
    const workspace = makeWorkspace();
    const writer = new AuditLogWriter(workspace);
    const schemaClassification = classifyFile(fixtureInputs.schema, DEFAULT_RULES);

    writer.append(schemaClassification, evaluateRules(schemaClassification, fixtureInputs.schema));

    const sqlitePath = path.join(workspace, '.arc', 'audit.sqlite3');
    const sqliteCount = execFileSync(
      'sqlite3',
      [sqlitePath, 'SELECT COUNT(*) AS total FROM audit_events;'],
      { encoding: 'utf8' },
    )
      .toString()
      .trim();

    expect(sqliteCount).toBe('1');

    writer.exportJsonlFromSqlite();
    const jsonl = fs.readFileSync(path.join(workspace, '.arc', 'audit.jsonl'), 'utf8');
    const exported = JSON.parse(jsonl.trim()) as Record<string, unknown>;
    expect(exported.file_path).toBe(schemaClassification.filePath);
    expect(Array.isArray(exported.matched_rules)).toBe(true);
    expect(Array.isArray(exported.risk_flags)).toBe(true);
  });
});
