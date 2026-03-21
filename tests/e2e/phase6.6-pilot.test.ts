import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ContextPayload, ModelEvaluationResult } from '../../src/contracts/types';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import { fixtureInputs } from '../fixtures/saveInputs';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-phase66-'));
  workspaces.push(workspace);
  return workspace;
}

class LocalUnavailableAdapter {
  readonly enabledByDefault = true;

  evaluate(_context: ContextPayload): Promise<ModelEvaluationResult | undefined> {
    void _context;
    return Promise.reject(new Error('local unavailable'));
  }
}

class CloudBlockingAdapter {
  readonly enabledByDefault = true;

  evaluate(_context: ContextPayload): Promise<ModelEvaluationResult | undefined> {
    void _context;
    return Promise.resolve({
      decision: 'BLOCK',
      reason: 'Cloud fallback confirmed the governed change.',
      risk_level: 'CRITICAL',
      violated_rules: ['AUTH_CHANGE', 'CLOUD_MODEL_CONFIRMATION'],
      next_action: 'Block and escalate.',
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

describe('Phase 6.6 pilot', () => {
  it('keeps cloud disabled by default, uses local-first fallback ordering, and denies auto-save cloud execution', async () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'CLOUD_ASSISTED',
        local_lane_enabled: true,
        cloud_lane_enabled: true,
        cloud_data_class: 'CLOUD_ELIGIBLE',
      }),
      'utf8',
    );

    const orchestrator = new SaveOrchestrator(
      workspace,
      new LocalUnavailableAdapter(),
      new CloudBlockingAdapter(),
    );

    const explicitAssessment = await orchestrator.assessSave(fixtureInputs.auth);
    const autoAssessment = await orchestrator.assessSave(fixtureInputs.autoAuth);

    expect(explicitAssessment.contextPacket.data_class).toBe('CLOUD_ELIGIBLE');
    expect(explicitAssessment.decision.source).toBe('CLOUD_MODEL');
    expect(explicitAssessment.decision.route_mode).toBe('CLOUD_ASSISTED');
    expect(explicitAssessment.decision.route_lane).toBe('CLOUD');

    expect(autoAssessment.decision.route_mode).toBe('CLOUD_ASSISTED');
    expect(autoAssessment.decision.route_lane).toBe('RULE_ONLY');
    expect(autoAssessment.decision.route_fallback).toBe('AUTO_SAVE_BLOCKED');
    expect(autoAssessment.decision.source).toBe('MODEL_DISABLED');
  });
});
