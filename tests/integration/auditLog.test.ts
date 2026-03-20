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
});
