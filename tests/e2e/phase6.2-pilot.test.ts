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
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-phase62-'));
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

describe('Phase 6.2 pilot', () => {
  it('keeps route visibility observational and RULE_ONLY while exposing local audit evidence', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace);
    const blueprint = createBlueprintArtifact(workspace);

    const buttonAssessment = await orchestrator.assessSave(fixtureInputs.button);
    const buttonOutcome = orchestrator.commitAssessment(buttonAssessment, true);

    const authAssessment = await orchestrator.assessSave(fixtureInputs.auth);
    const authOutcome = orchestrator.commitAssessment(authAssessment, true, {
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: blueprint.blueprintId,
    });

    const routeIo = captureIo();
    const exportIo = captureIo();

    const routeCode = runCli(['trace-route', '--workspace', workspace], routeIo.io);
    const exportCode = runCli(
      ['export', '--workspace', workspace, '--directive-id', fixtureDirectiveIds.valid],
      exportIo.io,
    );

    expect(buttonOutcome.decision.route_mode).toBe('RULE_ONLY');
    expect(buttonOutcome.decision.route_lane).toBe('RULE_ONLY');
    expect(authOutcome.decision.route_mode).toBe('RULE_ONLY');
    expect(authOutcome.decision.route_lane).toBe('RULE_ONLY');
    expect(routeCode).toBe(0);
    expect(exportCode).toBe(0);
    expect(routeIo.stderr()).toBe('');
    expect(exportIo.stderr()).toBe('');
    expect(routeIo.stdout()).toContain('"route_mode": "RULE_ONLY"');
    expect(routeIo.stdout()).toContain('"route_lane": "RULE_ONLY"');
    expect(exportIo.stdout()).toContain('"vault_ready": true');
    expect(exportIo.stdout()).toContain('"direct_vault_write": false');
    expect(exportIo.stdout()).toContain('"direct_arc_dependency": false');
    expect(exportIo.stdout()).not.toContain('LOCAL_PREFERRED');
    expect(exportIo.stdout()).not.toContain('CLOUD_ASSISTED');
    expect(exportIo.stdout()).not.toContain('CLOUD_ELIGIBLE');
    expect(exportIo.stdout()).not.toContain('GOVERNED_CHANGE');
  });
});
