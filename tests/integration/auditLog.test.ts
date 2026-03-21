import crypto from 'node:crypto';
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

describe('audit log rotation', () => {
  it('preserves chain continuity across rotation', () => {
    const workspace = makeWorkspace();
    const writer = new AuditLogWriter(workspace, { maxBytes: 400 });
    const authClassification = classifyFile(fixtureInputs.auth, DEFAULT_RULES);
    const schemaClassification = classifyFile(fixtureInputs.schema, DEFAULT_RULES);

    writer.append(authClassification, evaluateRules(authClassification, fixtureInputs.auth));
    writer.append(schemaClassification, evaluateRules(schemaClassification, fixtureInputs.schema));
    writer.append(authClassification, evaluateRules(authClassification, fixtureInputs.auth));

    const archiveDir = path.join(workspace, '.arc', 'archive');
    expect(fs.readdirSync(archiveDir).length).toBeGreaterThan(0);
    expect(writer.verifyChain()).toBe(true);
  });

  it('continues to verify legacy Phase 5 entries that do not contain route metadata', () => {
    const workspace = makeWorkspace();
    const writer = new AuditLogWriter(workspace);
    const arcDir = path.join(workspace, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });
    const baseEntry = {
      ts: '2026-03-20T00:00:00.000Z',
      file_path: 'src/auth/session.ts',
      risk_flags: ['AUTH_CHANGE'],
      matched_rules: ['rule-auth-path'],
      decision: 'REQUIRE_PLAN',
      reason: 'Authentication-sensitive paths require an explicit plan acknowledgment.',
      risk_level: 'HIGH',
      violated_rules: ['rule-auth-path'],
      next_action: 'Capture intent before proceeding with this save.',
      source: 'RULE',
      fallback_cause: 'NONE',
      lease_status: 'NEW',
      directive_id: 'LINTEL-PH5-001',
      blueprint_id: '.arc/blueprints/LINTEL-PH5-001.md',
    };
    const hash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          prev_hash: 'ROOT',
          ...baseEntry,
          directive_id: baseEntry.directive_id,
          blueprint_id: baseEntry.blueprint_id,
        }),
      )
      .digest('hex');
    fs.writeFileSync(
      path.join(arcDir, 'audit.jsonl'),
      [
        JSON.stringify({
          ...baseEntry,
          prev_hash: 'ROOT',
          hash,
        }),
      ].join('\n'),
      'utf8',
    );

    expect(writer.verifyChain()).toBe(true);
  });
});
