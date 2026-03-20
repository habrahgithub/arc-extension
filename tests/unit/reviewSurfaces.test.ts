import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalReviewSurfaceService } from '../../src/extension/reviewSurfaces';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import { createBlueprintArtifact, fixtureDirectiveIds } from '../fixtures/blueprints';
import { fixtureInputs } from '../fixtures/saveInputs';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-review-'));
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

describe('local review surfaces', () => {
  it('renders local-only audit, blueprint, and false-positive views', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace);
    const blueprint = createBlueprintArtifact(workspace);

    orchestrator.commitAssessment(
      await orchestrator.assessSave(fixtureInputs.auth),
      true,
      {
        directiveId: fixtureDirectiveIds.valid,
        blueprintId: blueprint.blueprintId,
      },
    );

    const reviews = new LocalReviewSurfaceService(workspace);
    const audit = reviews.renderAuditReview();
    const proof = reviews.renderBlueprintReview();
    const falsePositives = reviews.renderFalsePositiveReview();

    expect(audit).toContain('LINTEL Audit Review');
    expect(audit).toContain('REQUIRE_PLAN');
    expect(proof).toContain('LOCAL_ONLY');
    expect(proof).toContain('Validation: VALID');
    expect(falsePositives).toContain('Candidate entries');
    expect(falsePositives).toContain('src/auth/session.ts');
  });

  it('keeps review surfaces available when audit history contains malformed lines', () => {
    const workspace = makeWorkspace();
    const arcDir = path.join(workspace, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });
    fs.writeFileSync(
      path.join(arcDir, 'audit.jsonl'),
      '{"ts":"2026-03-20T00:00:00.000Z","file_path":"src/auth/session.ts","risk_flags":["AUTH_CHANGE"],"matched_rules":["rule-auth-path"],"decision":"REQUIRE_PLAN","reason":"ok","risk_level":"HIGH","violated_rules":["rule-auth-path"],"next_action":"plan","source":"RULE","fallback_cause":"NONE","lease_status":"NEW","directive_id":"LINTEL-PH5-001","blueprint_id":".arc/blueprints/LINTEL-PH5-001.md","prev_hash":"ROOT","hash":"abc"}\nnot-json\n',
      'utf8',
    );

    const reviews = new LocalReviewSurfaceService(workspace);
    const audit = reviews.renderAuditReview();
    const falsePositives = reviews.renderFalsePositiveReview();

    expect(audit).toContain('Malformed lines skipped: 1');
    expect(audit).toContain('review is partial');
    expect(falsePositives).toContain('Malformed lines skipped: 1');
    expect(falsePositives).toContain('partial');
  });
});
