import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LocalReviewSurfaceService } from '../../src/extension/reviewSurfaces';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import {
  createBlueprintArtifact,
  createIncompleteBlueprintArtifact,
  fixtureDirectiveIds,
} from '../fixtures/blueprints';
import { fixtureInputs } from '../fixtures/saveInputs';

describe('phase 4 pilot scenarios', () => {
  it('denies incomplete proofs, accepts completed local proofs, and exposes local review surfaces', async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-e2e-'));
    const orchestrator = new SaveOrchestrator(workspace);
    const reviews = new LocalReviewSurfaceService(workspace);

    const incomplete = createIncompleteBlueprintArtifact(workspace);
    const denied = orchestrator.commitAssessment(
      await orchestrator.assessSave(fixtureInputs.auth),
      true,
      {
        directiveId: fixtureDirectiveIds.valid,
        blueprintId: incomplete.blueprintId,
        blueprintMode: 'LOCAL_ONLY',
      },
    );
    expect(denied.decision.lease_status).toBe('BYPASSED');
    expect(denied.decision.reason).toContain('placeholder');

    const completed = createBlueprintArtifact(workspace);
    const allowed = orchestrator.commitAssessment(
      await orchestrator.assessSave(fixtureInputs.auth),
      true,
      {
        directiveId: fixtureDirectiveIds.valid,
        blueprintId: completed.blueprintId,
        blueprintMode: 'LOCAL_ONLY',
      },
    );
    expect(allowed.decision.lease_status).toBe('NEW');
    expect(allowed.auditEntry?.blueprint_id).toBe(completed.blueprintId);

    const blueprintReview = reviews.renderBlueprintReview();
    const falsePositiveReview = reviews.renderFalsePositiveReview();
    expect(blueprintReview).toContain('LOCAL_ONLY');
    expect(blueprintReview).toContain('not authorized in Phase 5');
    expect(blueprintReview).toContain('Proof-required states remain blocked');
    expect(falsePositiveReview).toContain('False-Positive Review');
    expect(falsePositiveReview).toContain('advisory only');

    fs.rmSync(workspace, { recursive: true, force: true });
  });
});
