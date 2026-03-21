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
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-phase67-'));
  workspaces.push(workspace);
  return workspace;
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

describe('Phase 6.7 pilot', () => {
  it('exports a local-only Vault-ready bundle with explicit validation and no save-path dependency', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace);
    const blueprint = createBlueprintArtifact(workspace);

    const authAssessment = await orchestrator.assessSave(fixtureInputs.auth);
    const authOutcome = orchestrator.commitAssessment(authAssessment, true, {
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: blueprint.blueprintId,
    });

    fs.appendFileSync(path.join(workspace, '.arc', 'audit.jsonl'), 'not-json\n', 'utf8');

    const exportIo = captureIo();
    const code = runCli(
      ['export', '--workspace', workspace, '--directive-id', fixtureDirectiveIds.valid],
      exportIo.io,
    );

    expect(code).toBe(0);
    expect(exportIo.stderr()).toBe('');
    expect(authOutcome.decision.decision).toBe('REQUIRE_PLAN');
    expect(exportIo.stdout()).toContain('"bundle_type": "LINTEL_VAULT_READY_EXPORT"');
    expect(exportIo.stdout()).toContain('"local_only": true');
    expect(exportIo.stdout()).toContain('"direct_vault_write": false');
    expect(exportIo.stdout()).toContain('"direct_arc_dependency": false');
    expect(exportIo.stdout()).toContain('"status": "PARTIAL"');
    expect(exportIo.stdout()).toContain('"section_id": "bundle_validation"');
    expect(exportIo.stdout()).not.toContain('https://');
  });
});
