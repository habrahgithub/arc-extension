import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import { createBlueprintArtifact, fixtureDirectiveIds } from '../fixtures/blueprints';
import { fixtureInputs } from '../fixtures/saveInputs';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-cli-'));
  workspaces.push(workspace);
  return workspace;
}

async function seedWorkspace(workspace: string): Promise<void> {
  const orchestrator = new SaveOrchestrator(workspace);
  const blueprint = createBlueprintArtifact(workspace);

  const authAssessment = await orchestrator.assessSave(fixtureInputs.auth);
  orchestrator.commitAssessment(authAssessment, true, {
    directiveId: fixtureDirectiveIds.valid,
    blueprintId: blueprint.blueprintId,
  });

  const schemaAssessment = await orchestrator.assessSave(fixtureInputs.schema);
  orchestrator.commitAssessment(schemaAssessment, true);
}

function captureIo() {
  let stdout = '';
  let stderr = '';

  return {
    io: {
      stdout: (message: string) => {
        stdout += message;
      },
      stderr: (message: string) => {
        stderr += message;
      },
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

afterEach(() => {
  while (workspaces.length > 0) {
    const workspace = workspaces.pop();
    if (workspace) {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }
});

describe('audit visibility cli', () => {
  it('supports read-only query and verify commands without mutating audit state', async () => {
    const workspace = makeWorkspace();
    await seedWorkspace(workspace);
    const auditPath = path.join(workspace, '.arc', 'audit.jsonl');
    const beforeAudit = fs.readFileSync(auditPath, 'utf8');

    const queryIo = captureIo();
    const queryCode = runCli(
      ['query', '--workspace', workspace, '--decision', 'REQUIRE_PLAN'],
      queryIo.io,
    );
    const verifyIo = captureIo();
    const verifyCode = runCli(['verify', '--workspace', workspace], verifyIo.io);

    expect(queryCode).toBe(0);
    expect(verifyCode).toBe(0);
    expect(queryIo.stderr()).toBe('');
    expect(verifyIo.stderr()).toBe('');
    expect(queryIo.stdout()).toContain('REQUIRE_PLAN');
    expect(verifyIo.stdout()).toContain('"status": "VALID"');
    expect(fs.readFileSync(auditPath, 'utf8')).toBe(beforeAudit);
  });

  it('exports a versioned local Vault-ready bundle only to the explicit output path', async () => {
    const workspace = makeWorkspace();
    await seedWorkspace(workspace);
    const exportPath = path.join('artifacts', 'visibility-export.json');
    const fullExportPath = path.join(workspace, exportPath);
    const blueprintPath = path.join(
      workspace,
      '.arc',
      'blueprints',
      `${fixtureDirectiveIds.valid}.md`,
    );
    const beforeBlueprint = fs.readFileSync(blueprintPath, 'utf8');

    const exportIo = captureIo();
    const code = runCli(
      [
        'export',
        '--workspace',
        workspace,
        '--directive-id',
        fixtureDirectiveIds.valid,
        '--out',
        exportPath,
      ],
      exportIo.io,
    );

    expect(code).toBe(0);
    expect(exportIo.stderr()).toBe('');
    expect(fs.existsSync(fullExportPath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(fullExportPath, 'utf8'))).toMatchObject({
      export_version: 'phase-6.7-v1',
      bundle_type: 'LINTEL_VAULT_READY_EXPORT',
      vault_ready: true,
      direct_vault_write: false,
      direct_arc_dependency: false,
      bundle_validation: {
        status: 'VALID',
      },
      metadata: {
        local_only: true,
      },
    });
    expect(fs.readFileSync(blueprintPath, 'utf8')).toBe(beforeBlueprint);
  });
});
