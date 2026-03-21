import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import { createBlueprintArtifact, fixtureDirectiveIds } from '../fixtures/blueprints';
import { fixtureInputs } from '../fixtures/saveInputs';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-phase64-'));
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

describe('Phase 6.4 pilot', () => {
  it('keeps the router shell live but RULE_ONLY, truthful, and non-executing', async () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'RULE_ONLY',
        local_lane_enabled: false,
        cloud_lane_enabled: false,
      }),
      'utf8',
    );

    const orchestrator = new SaveOrchestrator(workspace);
    const blueprint = createBlueprintArtifact(workspace);

    const buttonAssessment = await orchestrator.assessSave(fixtureInputs.button);
    const buttonOutcome = orchestrator.commitAssessment(buttonAssessment, true);

    const authAssessment = await orchestrator.assessSave(fixtureInputs.auth);
    const authOutcome = orchestrator.commitAssessment(authAssessment, true, {
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: blueprint.blueprintId,
    });

    expect(buttonOutcome.decision.decision).toBe('ALLOW');
    expect(authOutcome.decision.decision).toBe('REQUIRE_PLAN');
    expect(buttonOutcome.decision.route_mode).toBe('RULE_ONLY');
    expect(buttonOutcome.decision.route_lane).toBe('RULE_ONLY');
    expect(authOutcome.decision.route_mode).toBe('RULE_ONLY');
    expect(authOutcome.decision.route_lane).toBe('RULE_ONLY');
    expect(buttonOutcome.decision.route_fallback).toBe('NONE');
    expect(authOutcome.decision.route_fallback).toBe('NONE');
    expect(buttonOutcome.decision.route_reason).toContain('Phase 6.6 router shell remains RULE_ONLY');
    expect(authOutcome.decision.route_reason).toContain('Phase 6.6 router shell remains RULE_ONLY');
    expect(buttonOutcome.decision.source).not.toBe('MODEL');
    expect(authOutcome.decision.source).not.toBe('MODEL');
  });
});
