import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SaveLifecycleController } from '../../src/extension/saveLifecycleController';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import { createBlueprintArtifact, fixtureDirectiveIds } from '../fixtures/blueprints';
import { fixtureInputs } from '../fixtures/saveInputs';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-lifecycle-'));
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

describe('save lifecycle controller', () => {
  it('reverts denied auto-saves to the previous snapshot', async () => {
    const workspace = makeWorkspace();
    const controller = new SaveLifecycleController(new SaveOrchestrator(workspace));
    controller.primeCommittedSnapshot(
      fixtureInputs.autoAuth.filePath,
      fixtureInputs.autoAuth.previousText,
    );

    const assessed = await controller.prepareSave({
      filePath: fixtureInputs.autoAuth.filePath,
      fileName: fixtureInputs.autoAuth.fileName,
      text: fixtureInputs.autoAuth.text,
      saveMode: fixtureInputs.autoAuth.saveMode,
      autoSaveMode: fixtureInputs.autoAuth.autoSaveMode,
    });
    const outcome = controller.finalizeSave(assessed, false);
    const restore = controller.handleDidSave(
      fixtureInputs.autoAuth.filePath,
      fixtureInputs.autoAuth.text,
    );

    expect(outcome.shouldRevertAfterSave).toBe(true);
    expect(restore?.restoreText).toBe(fixtureInputs.autoAuth.previousText);
  });

  it('suppresses the next save for a restored snapshot', async () => {
    const workspace = makeWorkspace();
    const controller = new SaveLifecycleController(new SaveOrchestrator(workspace));
    controller.primeCommittedSnapshot(
      fixtureInputs.autoAuth.filePath,
      fixtureInputs.autoAuth.previousText,
    );

    const assessed = await controller.prepareSave({
      filePath: fixtureInputs.autoAuth.filePath,
      fileName: fixtureInputs.autoAuth.fileName,
      text: fixtureInputs.autoAuth.text,
      saveMode: fixtureInputs.autoAuth.saveMode,
      autoSaveMode: fixtureInputs.autoAuth.autoSaveMode,
    });

    controller.finalizeSave(assessed, false);
    controller.handleDidSave(fixtureInputs.autoAuth.filePath, fixtureInputs.autoAuth.text);

    expect(
      controller.consumeRestoreBypass(
        fixtureInputs.autoAuth.filePath,
        fixtureInputs.autoAuth.previousText,
      ),
    ).toBe(true);
  });

  it('does not queue a revert when REQUIRE_PLAN proof is valid', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace);
    const controller = new SaveLifecycleController(orchestrator);
    const blueprint = createBlueprintArtifact(workspace);

    controller.primeCommittedSnapshot(
      fixtureInputs.auth.filePath,
      fixtureInputs.auth.previousText,
    );

    const assessed = await controller.prepareSave({
      filePath: fixtureInputs.auth.filePath,
      fileName: fixtureInputs.auth.fileName,
      text: fixtureInputs.auth.text,
      saveMode: fixtureInputs.auth.saveMode,
      autoSaveMode: fixtureInputs.auth.autoSaveMode,
    });

    const outcome = controller.finalizeSave(assessed, true, {
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: blueprint.blueprintId,
    });

    expect(outcome.shouldRevertAfterSave).toBe(false);
    expect(controller.handleDidSave(fixtureInputs.auth.filePath, fixtureInputs.auth.text)).toBeUndefined();
  });
});
