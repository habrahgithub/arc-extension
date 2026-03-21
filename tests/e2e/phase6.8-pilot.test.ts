import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ModelAdapterError } from '../../src/adapters/modelAdapter';
import { runCli } from '../../src/cli';
import type { ContextPayload, ModelEvaluationResult } from '../../src/contracts/types';
import { AuditVisibilityService } from '../../src/core/auditVisibility';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import { createBlueprintArtifact, fixtureDirectiveIds } from '../fixtures/blueprints';
import { fixtureInputs } from '../fixtures/saveInputs';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-phase68-'));
  workspaces.push(workspace);
  return workspace;
}

function captureIo() {
  let stdout = '';
  let stderr = '';

  return {
    io: {
      stdout: (message: string) => {
        stdout += message;
      },
      stderr: (message: string) => {
        stderr += message;
      },
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

class LocalBlockingAdapter {
  readonly enabledByDefault = true;

  evaluate(_context: ContextPayload): Promise<ModelEvaluationResult | undefined> {
    void _context;
    return Promise.resolve({
      decision: 'BLOCK',
      reason: 'Local lane confirmed the governed change.',
      risk_level: 'CRITICAL',
      violated_rules: ['AUTH_CHANGE', 'LOCAL_MODEL_CONFIRMATION'],
      next_action: 'Block and investigate locally.',
    });
  }
}

class LocalTimeoutAdapter {
  readonly enabledByDefault = true;

  evaluate(_context: ContextPayload): Promise<ModelEvaluationResult | undefined> {
    void _context;
    return Promise.reject(new ModelAdapterError('timed out', 'TIMEOUT'));
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

describe('Phase 6.8 pilot', () => {
  it('runs the integrated validation matrix and proves rollback to hardened-equivalent posture with audit continuity', async () => {
    const workspace = makeWorkspace();
    const blueprint = createBlueprintArtifact(workspace);
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });

    const baselineOrchestrator = new SaveOrchestrator(workspace);
    const baselineAssessment = await baselineOrchestrator.assessSave(fixtureInputs.auth);
    const baselineOutcome = baselineOrchestrator.commitAssessment(baselineAssessment, true, {
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: blueprint.blueprintId,
    });

    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'LOCAL_PREFERRED',
        local_lane_enabled: true,
        cloud_lane_enabled: false,
      }),
      'utf8',
    );

    const localOrchestrator = new SaveOrchestrator(workspace, new LocalBlockingAdapter());
    const localAssessment = await localOrchestrator.assessSave(fixtureInputs.auth);
    const localOutcome = localOrchestrator.commitAssessment(localAssessment, true);

    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'CLOUD_ASSISTED',
        local_lane_enabled: true,
        cloud_lane_enabled: true,
      }),
      'utf8',
    );

    const deniedOrchestrator = new SaveOrchestrator(
      workspace,
      new LocalTimeoutAdapter(),
      new CloudBlockingAdapter(),
    );
    const deniedAssessment = await deniedOrchestrator.assessSave(fixtureInputs.auth);
    const deniedOutcome = deniedOrchestrator.commitAssessment(deniedAssessment, true, {
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: blueprint.blueprintId,
    });

    const autoAssessment = await deniedOrchestrator.assessSave(fixtureInputs.autoAuth);
    const autoOutcome = deniedOrchestrator.commitAssessment(autoAssessment, true, {
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: blueprint.blueprintId,
    });

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

    const cloudOrchestrator = new SaveOrchestrator(
      workspace,
      new LocalTimeoutAdapter(),
      new CloudBlockingAdapter(),
    );
    const cloudAssessment = await cloudOrchestrator.assessSave(fixtureInputs.auth);
    const cloudOutcome = cloudOrchestrator.commitAssessment(cloudAssessment, true);

    const exportIo = captureIo();
    const exportCode = runCli(
      ['export', '--workspace', workspace, '--directive-id', fixtureDirectiveIds.valid],
      exportIo.io,
    );

    fs.rmSync(path.join(workspace, '.arc', 'router.json'));

    const rollbackOrchestrator = new SaveOrchestrator(workspace);
    const rollbackAssessment = await rollbackOrchestrator.assessSave(fixtureInputs.auth);
    const rollbackOutcome = rollbackOrchestrator.commitAssessment(rollbackAssessment, true, {
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: blueprint.blueprintId,
    });

    const visibility = new AuditVisibilityService(workspace);
    const verification = visibility.verifyAuditHistory();
    const routeTrace = visibility.traceRoutes({});
    const auditPath = path.join(workspace, '.arc', 'audit.jsonl');
    const auditLines = fs.readFileSync(auditPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line) as { route_mode?: string; route_lane?: string; route_fallback?: string });

    expect(baselineOutcome.decision.decision).toBe('REQUIRE_PLAN');
    expect(baselineOutcome.decision.route_mode).toBe('RULE_ONLY');
    expect(baselineOutcome.decision.route_lane).toBe('RULE_ONLY');

    expect(localOutcome.decision.decision).toBe('BLOCK');
    expect(localOutcome.decision.route_mode).toBe('LOCAL_PREFERRED');
    expect(localOutcome.decision.route_lane).toBe('LOCAL');

    expect(deniedOutcome.decision.route_mode).toBe('CLOUD_ASSISTED');
    expect(deniedOutcome.decision.route_lane).toBe('RULE_ONLY');
    expect(deniedOutcome.decision.route_fallback).toBe('DATA_CLASS_DENIED');

    expect(autoOutcome.decision.route_mode).toBe('CLOUD_ASSISTED');
    expect(autoOutcome.decision.route_lane).toBe('RULE_ONLY');
    expect(autoOutcome.decision.route_fallback).toBe('AUTO_SAVE_BLOCKED');

    expect(cloudOutcome.decision.decision).toBe('BLOCK');
    expect(cloudOutcome.decision.route_mode).toBe('CLOUD_ASSISTED');
    expect(cloudOutcome.decision.route_lane).toBe('CLOUD');
    expect(cloudOutcome.decision.source).toBe('CLOUD_MODEL');

    expect(exportCode).toBe(0);
    expect(exportIo.stderr()).toBe('');
    expect(exportIo.stdout()).toContain('"bundle_type": "LINTEL_VAULT_READY_EXPORT"');
    expect(exportIo.stdout()).toContain('"direct_vault_write": false');
    expect(exportIo.stdout()).toContain('"direct_arc_dependency": false');

    expect(rollbackOutcome.decision.decision).toBe('REQUIRE_PLAN');
    expect(rollbackOutcome.decision.route_mode).toBe('RULE_ONLY');
    expect(rollbackOutcome.decision.route_lane).toBe('RULE_ONLY');
    expect(rollbackOutcome.decision.source).not.toBe('CLOUD_MODEL');

    expect(verification.status).toBe('VALID');
    expect(routeTrace.summaries.some((summary) => summary.route_mode === 'RULE_ONLY')).toBe(true);
    expect(routeTrace.summaries.some((summary) => summary.route_lane === 'LOCAL')).toBe(true);
    expect(routeTrace.summaries.some((summary) => summary.route_lane === 'CLOUD')).toBe(true);
    expect(routeTrace.summaries.some((summary) => summary.route_fallback === 'DATA_CLASS_DENIED')).toBe(true);
    expect(routeTrace.summaries.some((summary) => summary.route_fallback === 'AUTO_SAVE_BLOCKED')).toBe(true);
    expect(auditLines).toHaveLength(6);
    expect(auditLines.at(-1)?.route_mode).toBe('RULE_ONLY');
    expect(auditLines.at(-1)?.route_lane).toBe('RULE_ONLY');
  });
});
