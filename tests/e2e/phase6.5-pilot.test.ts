import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ContextPayload, ModelEvaluationResult } from '../../src/contracts/types';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import { createBlueprintArtifact, fixtureDirectiveIds } from '../fixtures/blueprints';
import { fixtureInputs } from '../fixtures/saveInputs';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-phase65-'));
  workspaces.push(workspace);
  return workspace;
}

class LocalLaneAdapter {
  readonly enabledByDefault = true;

  evaluate(_context: ContextPayload): Promise<ModelEvaluationResult | undefined> {
    void _context;
    return Promise.resolve({
      decision: 'BLOCK',
      reason: 'Local lane confirmed a governed auth change.',
      risk_level: 'CRITICAL',
      violated_rules: ['AUTH_CHANGE', 'LOCAL_MODEL_CONFIRMATION'],
      next_action: 'Block and complete the local blueprint flow.',
    });
  }
}

afterEach(() => {
  while (workspaces.length > 0) {
    const workspace = workspaces.pop();
    if (workspace) {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }
});

describe('Phase 6.5 pilot', () => {
  it('activates the local lane only for explicit LOCAL_PREFERRED saves and fails closed on auto-save', async () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'LOCAL_PREFERRED',
        local_lane_enabled: true,
        cloud_lane_enabled: false,
      }),
      'utf8',
    );

    const orchestrator = new SaveOrchestrator(workspace, new LocalLaneAdapter());
    const blueprint = createBlueprintArtifact(workspace);

    const explicitAssessment = await orchestrator.assessSave(fixtureInputs.auth);
    const explicitOutcome = orchestrator.commitAssessment(explicitAssessment, true, {
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: blueprint.blueprintId,
    });

    const autoAssessment = await orchestrator.assessSave(fixtureInputs.autoAuth);
    const autoOutcome = orchestrator.commitAssessment(autoAssessment, true);

    expect(explicitOutcome.decision.decision).toBe('BLOCK');
    expect(explicitOutcome.decision.source).toBe('MODEL');
    expect(explicitOutcome.decision.route_mode).toBe('LOCAL_PREFERRED');
    expect(explicitOutcome.decision.route_lane).toBe('LOCAL');
    expect(explicitOutcome.decision.route_fallback).toBe('NONE');
    expect(explicitOutcome.contextPacket.data_class).toBe('LOCAL_ONLY');
    expect(explicitOutcome.contextPacket.sensitivity_marker).toBe('UNASSESSED');

    expect(autoOutcome.decision.decision).toBe('REQUIRE_PLAN');
    expect(autoOutcome.decision.source).toBe('MODEL_DISABLED');
    expect(autoOutcome.decision.route_mode).toBe('LOCAL_PREFERRED');
    expect(autoOutcome.decision.route_lane).toBe('RULE_ONLY');
    expect(autoOutcome.decision.route_fallback).toBe('AUTO_SAVE_BLOCKED');
    expect(autoOutcome.decision.route_reason).toContain('auto-save assessments fail closed to RULE_ONLY');
  });
});
