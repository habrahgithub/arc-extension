import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ModelAdapterError } from '../../src/adapters/modelAdapter';
import type { ContextPayload, ModelEvaluationResult } from '../../src/contracts/types';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import {
  createBlueprintArtifact,
  createIncompleteBlueprintArtifact,
  fixtureDirectiveIds,
} from '../fixtures/blueprints';
import { fixtureInputs } from '../fixtures/saveInputs';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-'));
  workspaces.push(workspace);
  return workspace;
}

class TimeoutAdapter {
  readonly enabledByDefault = true;

  evaluate(_context: ContextPayload): Promise<ModelEvaluationResult | undefined> {
    void _context;
    return Promise.reject(new ModelAdapterError('timed out', 'TIMEOUT'));
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

describe('save orchestrator', () => {
  it('writes a hash-chained audit entry with blueprint linkage for REQUIRE_PLAN saves', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace);
    const blueprint = createBlueprintArtifact(workspace);

    const assessed = await orchestrator.assessSave(fixtureInputs.auth);
    const outcome = orchestrator.commitAssessment(assessed, true, {
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: blueprint.blueprintId,
    });
    const auditPath = path.join(workspace, '.arc', 'audit.jsonl');
    const perfPath = path.join(workspace, '.arc', 'perf.jsonl');
    const auditLines = fs.readFileSync(auditPath, 'utf8').trim().split('\n');
    const perfLines = fs.readFileSync(perfPath, 'utf8').trim().split('\n');
    const parsed = JSON.parse(auditLines[0]) as {
      prev_hash: string;
      hash: string;
      directive_id: string;
      blueprint_id: string;
    };

    expect(outcome.decision.decision).toBe('REQUIRE_PLAN');
    expect(outcome.decision.lease_status).toBe('NEW');
    expect(outcome.decision.directive_id).toBe(fixtureDirectiveIds.valid);
    expect(outcome.decision.blueprint_id).toBe(blueprint.blueprintId);
    expect(parsed.prev_hash).toBe('ROOT');
    expect(parsed.hash.length).toBe(64);
    expect(parsed.directive_id).toBe(fixtureDirectiveIds.valid);
    expect(parsed.blueprint_id).toBe(blueprint.blueprintId);
    expect(perfLines.length).toBeGreaterThanOrEqual(2);
  });

  it('denies REQUIRE_PLAN saves without a blueprint artifact', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace);

    const assessed = await orchestrator.assessSave(fixtureInputs.auth);
    const outcome = orchestrator.commitAssessment(assessed, true, {
      directiveId: fixtureDirectiveIds.valid,
    });

    expect(outcome.decision.decision).toBe('REQUIRE_PLAN');
    expect(outcome.decision.lease_status).toBe('BYPASSED');
    expect(outcome.decision.directive_id).toBeUndefined();
    expect(outcome.decision.blueprint_id).toBeUndefined();
    expect(outcome.shouldRevertAfterSave).toBe(true);
    expect(outcome.decision.reason).toContain('No local blueprint artifact');
  });

  it('rejects stale or mismatched blueprint linkage', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace);
    createBlueprintArtifact(workspace);

    const assessed = await orchestrator.assessSave(fixtureInputs.auth);
    const outcome = orchestrator.commitAssessment(assessed, true, {
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: `.arc/blueprints/${fixtureDirectiveIds.other}.md`,
    });

    expect(outcome.decision.lease_status).toBe('BYPASSED');
    expect(outcome.shouldRevertAfterSave).toBe(true);
    expect(outcome.decision.reason).toContain('does not match the canonical Phase 5 artifact path');
  });

  it('rejects incomplete templates and unsupported shared/team proof modes', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace);
    const incomplete = createIncompleteBlueprintArtifact(workspace);

    const assessed = await orchestrator.assessSave(fixtureInputs.auth);
    const incompleteOutcome = orchestrator.commitAssessment(assessed, true, {
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: incomplete.blueprintId,
    });
    expect(incompleteOutcome.decision.lease_status).toBe('BYPASSED');
    expect(incompleteOutcome.decision.reason).toContain('placeholder content');

    const sharedModeResolution = orchestrator.validateBlueprintProof({
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: incomplete.blueprintId,
      blueprintMode: 'TEAM_SHARED',
    });
    expect(sharedModeResolution.status).toBe('UNAUTHORIZED_MODE');
    expect(sharedModeResolution.reason).toContain('not authorized in Phase 5');
  });

  it('reuses REQUIRE_PLAN leases only while the linked artifact remains valid', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace);
    const blueprint = createBlueprintArtifact(workspace);

    const first = await orchestrator.assessSave(fixtureInputs.auth);
    orchestrator.commitAssessment(first, true, {
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: blueprint.blueprintId,
    });

    const second = await orchestrator.assessSave(fixtureInputs.auth);
    const reused = orchestrator.commitAssessment(second, true);
    expect(reused.decision.lease_status).toBe('REUSED');

    fs.rmSync(blueprint.blueprintPath, { force: true });
    const third = await orchestrator.assessSave(fixtureInputs.auth);
    expect(third.leaseReusable).toBe(false);
    const denied = orchestrator.commitAssessment(third, true, {
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: blueprint.blueprintId,
    });
    expect(denied.decision.lease_status).toBe('BYPASSED');
    expect(denied.shouldRevertAfterSave).toBe(true);
  });

  it('keeps ALLOW decisions bypassed and never cached as governance approval', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace);

    const assessed = await orchestrator.assessSave(fixtureInputs.button);
    const outcome = orchestrator.commitAssessment(assessed, true);

    expect(outcome.decision.decision).toBe('ALLOW');
    expect(outcome.decision.lease_status).toBe('BYPASSED');
    expect(outcome.shouldRevertAfterSave).toBe(false);
  });

  it('applies local workspace mapping rules without weakening the floor', async () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'workspace-map.json'),
      JSON.stringify({
        mode: 'LOCAL_ONLY',
        rules: [
          {
            id: 'workspace-security-auth',
            riskFlag: 'AUTH_CHANGE',
            scope: 'PATH_SEGMENT_MATCH',
            severity: 'HIGH',
            decisionFloor: 'REQUIRE_PLAN',
            reason: 'Treat security paths as auth-sensitive.',
            matchers: [{ type: 'PATH_SEGMENT_MATCH', value: 'security' }],
          },
        ],
      }),
      'utf8',
    );
    const orchestrator = new SaveOrchestrator(workspace);

    const assessed = await orchestrator.assessSave({
      ...fixtureInputs.button,
      filePath: 'src/security/session.ts',
      fileName: 'session.ts',
      text: 'export const secure = true;\n',
      previousText: 'export const secure = false;\n',
    });

    expect(assessed.classification.matchedRuleIds).toContain('workspace-security-auth');
    expect(assessed.decision.decision).toBe('REQUIRE_PLAN');
  });

  it('falls back to the rule decision when model evaluation fails', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace, new TimeoutAdapter());

    const assessed = await orchestrator.assessSave(fixtureInputs.auth);

    expect(assessed.decision.decision).toBe('REQUIRE_PLAN');
    expect(assessed.decision.fallback_cause).toBe('TIMEOUT');
    expect(assessed.decision.source).toBe('FALLBACK');
  });

  it('enforces LOCAL_ONLY consistently for new, reused, and reviewable proof paths', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace);
    const blueprint = createBlueprintArtifact(workspace);

    const first = await orchestrator.assessSave(fixtureInputs.auth);
    const newSave = orchestrator.commitAssessment(first, true, {
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: blueprint.blueprintId,
      blueprintMode: 'TEAM_SHARED',
    });
    expect(newSave.decision.lease_status).toBe('NEW');
    expect(newSave.decision.blueprint_id).toBe(blueprint.blueprintId);

    const validFirst = await orchestrator.assessSave(fixtureInputs.auth);
    orchestrator.commitAssessment(validFirst, true, {
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: blueprint.blueprintId,
    });

    const second = await orchestrator.assessSave(fixtureInputs.auth);
    expect(second.decision.lease_status).toBe('REUSED');
    expect(second.decision.blueprint_id).toBe(blueprint.blueprintId);
    expect(
      orchestrator.validateBlueprintProof({
        directiveId: fixtureDirectiveIds.valid,
        blueprintId: blueprint.blueprintId,
        blueprintMode: 'TEAM_SHARED',
      }).status,
    ).toBe('UNAUTHORIZED_MODE');
  });
});
