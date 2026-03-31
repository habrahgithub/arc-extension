import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SaveLifecycleController } from '../../src/extension/saveLifecycleController';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import { createBlueprintArtifact, fixtureDirectiveIds } from '../fixtures/blueprints';
import { fixtureInputs } from '../fixtures/saveInputs';

describe('phase 2 pilot scenarios', () => {
  it('keeps the required decision matrix and auto-save protection', async () => {
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

    // Auto-save test uses a fresh workspace with no pre-existing lease approvals
    // to verify that unapproved auto-saves are always reverted.
    const autoWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-e2e-auto-'));
    const controller = new SaveLifecycleController(new SaveOrchestrator(autoWorkspace));
    controller.primeCommittedSnapshot(
      fixtureInputs.autoAuth.filePath,
      fixtureInputs.autoAuth.previousText,
    );
    const autoAssessed = await controller.prepareSave({
      filePath: fixtureInputs.autoAuth.filePath,
      fileName: fixtureInputs.autoAuth.fileName,
      text: fixtureInputs.autoAuth.text,
      saveMode: fixtureInputs.autoAuth.saveMode,
      autoSaveMode: fixtureInputs.autoAuth.autoSaveMode,
    });
    const autoOutcome = controller.finalizeSave(autoAssessed, false);
    fs.rmSync(autoWorkspace, { recursive: true, force: true });

    expect(allow.decision.decision).toBe('ALLOW');
    expect(requirePlan.decision.decision).toBe('REQUIRE_PLAN');
    expect(requirePlan.decision.directive_id).toBe(fixtureDirectiveIds.valid);
    expect(warn.decision.decision).toBe('WARN');
    expect(block.decision.decision).toBe('BLOCK');
    expect(block.decision.lease_status).toBe('BYPASSED');
    expect(autoOutcome.shouldRevertAfterSave).toBe(true);

    fs.rmSync(workspace, { recursive: true, force: true });
  });
});
