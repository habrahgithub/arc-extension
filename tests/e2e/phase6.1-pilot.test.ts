import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import { createBlueprintArtifact, fixtureDirectiveIds } from '../fixtures/blueprints';
import { fixtureInputs } from '../fixtures/saveInputs';

describe('phase 6.1 pilot scenarios', () => {
  it('invalidates prior acknowledged reuse when route-policy state changes while remaining RULE_ONLY', async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-e2e-ph61-'));
    const orchestrator = new SaveOrchestrator(workspace);
    const blueprint = createBlueprintArtifact(workspace);

    const first = await orchestrator.assessSave(fixtureInputs.auth);
    orchestrator.commitAssessment(first, true, {
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: blueprint.blueprintId,
    });

    const reused = await orchestrator.assessSave(fixtureInputs.auth);
    expect(reused.decision.lease_status).toBe('REUSED');

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

    const invalidated = await orchestrator.assessSave(fixtureInputs.auth);
    expect(invalidated.leaseReusable).toBe(false);
    expect(invalidated.decision.route_mode).toBe('RULE_ONLY');
    expect(invalidated.decision.route_lane).toBe('RULE_ONLY');
    expect(invalidated.decision.decision).toBe('REQUIRE_PLAN');

    fs.rmSync(workspace, { recursive: true, force: true });
  });
});
