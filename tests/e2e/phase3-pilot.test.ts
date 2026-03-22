import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import {
  createBlueprintArtifact,
  createMalformedBlueprintArtifact,
  fixtureDirectiveIds,
} from '../fixtures/blueprints';
import { fixtureInputs } from '../fixtures/saveInputs';

describe('phase 3 pilot scenarios', () => {
  it('blocks REQUIRE_PLAN saves without valid proof and allows them with canonical linkage', async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-e2e-'));
    const orchestrator = new SaveOrchestrator(workspace);

    const denied = orchestrator.commitAssessment(
      await orchestrator.assessSave(fixtureInputs.auth),
      true,
      { directiveId: fixtureDirectiveIds.valid },
    );
    expect(denied.decision.lease_status).toBe('BYPASSED');
    expect(denied.shouldRevertAfterSave).toBe(true);

    const blueprint = createBlueprintArtifact(workspace);
    const allowed = orchestrator.commitAssessment(
      await orchestrator.assessSave(fixtureInputs.auth),
      true,
      {
        directiveId: fixtureDirectiveIds.valid,
        blueprintId: blueprint.blueprintId,
      },
    );
    expect(allowed.decision.lease_status).toBe('NEW');
    expect(allowed.decision.blueprint_id).toBe(blueprint.blueprintId);

    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it('rejects malformed blueprint artifacts and malformed directive ids', async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-e2e-'));
    const orchestrator = new SaveOrchestrator(workspace);

    createMalformedBlueprintArtifact(workspace);
    const malformedArtifact = orchestrator.commitAssessment(
      await orchestrator.assessSave(fixtureInputs.auth),
      true,
      {
        directiveId: fixtureDirectiveIds.valid,
        blueprintId: `.arc/blueprints/${fixtureDirectiveIds.valid}.md`,
      },
    );
    expect(malformedArtifact.decision.lease_status).toBe('BYPASSED');
    expect(malformedArtifact.decision.reason).toContain(
      'missing required Phase 5 sections',
    );

    const malformedDirective = orchestrator.commitAssessment(
      await orchestrator.assessSave(fixtureInputs.auth),
      true,
      {
        directiveId: fixtureDirectiveIds.invalid,
      },
    );
    expect(malformedDirective.decision.lease_status).toBe('BYPASSED');
    expect(malformedDirective.decision.reason).toContain('not valid');
    expect(malformedDirective.decision.reason).toContain('uppercase');

    fs.rmSync(workspace, { recursive: true, force: true });
  });
});
