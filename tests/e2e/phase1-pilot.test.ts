import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import { createBlueprintArtifact, fixtureDirectiveIds } from '../fixtures/blueprints';
import { fixtureInputs } from '../fixtures/saveInputs';

describe('phase 1 pilot scenarios', () => {
  it('matches the required decision matrix for the pilot', async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-e2e-'));
    const orchestrator = new SaveOrchestrator(workspace);
    const blueprint = createBlueprintArtifact(workspace);

    const allow = orchestrator.commitAssessment(
      await orchestrator.assessSave(fixtureInputs.button),
      true,
    );
    const requirePlan = orchestrator.commitAssessment(
      await orchestrator.assessSave(fixtureInputs.auth),
      true,
      {
        directiveId: fixtureDirectiveIds.valid,
        blueprintId: blueprint.blueprintId,
      },
    );
    const warn = orchestrator.commitAssessment(
      await orchestrator.assessSave(fixtureInputs.schema),
      false,
    );
    const block = orchestrator.commitAssessment(
      await orchestrator.assessSave(fixtureInputs.authSchema),
      false,
    );

    expect(allow.decision.decision).toBe('ALLOW');
    expect(requirePlan.decision.decision).toBe('REQUIRE_PLAN');
    expect(warn.decision.decision).toBe('WARN');
    expect(block.decision.decision).toBe('BLOCK');

    fs.rmSync(workspace, { recursive: true, force: true });
  });
});
