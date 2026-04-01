import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DisabledModelAdapter,
  ModelAdapterError,
} from '../../src/adapters/modelAdapter';
import type {
  ContextPayload,
  ModelEvaluationResult,
} from '../../src/contracts/types';
import { AuditLogWriter } from '../../src/core/auditLog';
import { classifyFile } from '../../src/core/classifier';
import { validateContextPacket } from '../../src/core/contextPacket';
import { DEFAULT_RULES } from '../../src/core/rules';
import { evaluateRules } from '../../src/core/ruleEngine';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import {
  createBlueprintArtifact,
  createIncompleteBlueprintArtifact,
  fixtureDirectiveIds,
} from '../fixtures/blueprints';
import { fixtureInputs } from '../fixtures/saveInputs';

const workspaces: string[] = [];
const originalEnv = {
  OLLAMA_HOST: process.env.OLLAMA_HOST,
};

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-'));
  workspaces.push(workspace);
  return workspace;
}

class TimeoutAdapter {
  readonly enabledByDefault = true;

  evaluate(
    _context: ContextPayload,
  ): Promise<ModelEvaluationResult | undefined> {
    void _context;
    return Promise.reject(new ModelAdapterError('timed out', 'TIMEOUT'));
  }
}

class ParseFailureAdapter {
  readonly enabledByDefault = true;

  evaluate(
    _context: ContextPayload,
  ): Promise<ModelEvaluationResult | undefined> {
    void _context;
    return Promise.reject(new ModelAdapterError('bad json', 'PARSE_FAILURE'));
  }
}

class UnavailableAdapter {
  readonly enabledByDefault = true;

  evaluate(
    _context: ContextPayload,
  ): Promise<ModelEvaluationResult | undefined> {
    void _context;
    return Promise.reject(new ModelAdapterError('offline', 'UNAVAILABLE'));
  }
}

class UndefinedAdapter {
  readonly enabledByDefault = true;

  evaluate(
    _context: ContextPayload,
  ): Promise<ModelEvaluationResult | undefined> {
    void _context;
    return Promise.resolve(undefined);
  }
}

class TighteningAdapter {
  readonly enabledByDefault = true;

  evaluate(
    _context: ContextPayload,
  ): Promise<ModelEvaluationResult | undefined> {
    void _context;
    return Promise.resolve({
      decision: 'BLOCK',
      reason: 'Local model detected a broader governed change.',
      risk_level: 'CRITICAL',
      violated_rules: ['AUTH_CHANGE', 'MODEL_SIGNAL'],
      next_action: 'Block and investigate the governed change.',
    });
  }
}

class CloudTighteningAdapter {
  readonly enabledByDefault = true;

  evaluate(
    _context: ContextPayload,
  ): Promise<ModelEvaluationResult | undefined> {
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

class CountingCloudAdapter {
  readonly enabledByDefault = true;
  calls = 0;

  evaluate(
    _context: ContextPayload,
  ): Promise<ModelEvaluationResult | undefined> {
    void _context;
    this.calls += 1;
    return Promise.resolve({
      decision: 'WARN',
      reason: 'Cloud adapter should not have been used.',
      risk_level: 'HIGH',
      violated_rules: ['UNEXPECTED_CLOUD_CALL'],
      next_action: 'Investigate routing.',
    });
  }
}

afterEach(() => {
  if (originalEnv.OLLAMA_HOST === undefined) {
    delete process.env.OLLAMA_HOST;
  } else {
    process.env.OLLAMA_HOST = originalEnv.OLLAMA_HOST;
  }
  while (workspaces.length > 0) {
    const workspace = workspaces.pop();
    if (workspace) {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }
});

describe('save orchestrator', () => {
  it('records deviation metadata for RUN observation when runtime policy contract is missing', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(
      workspace,
      new DisabledModelAdapter(),
    );
    const filePath = path.join(workspace, 'src', 'deviation', 'run.ts');
    const text = 'export const run = true;\n';

    delete process.env.AUDIT_MODE;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, text, 'utf8');

    const runEntry = await orchestrator.observeExecution(
      'workbench.action.files.save',
      filePath,
    );

    expect(runEntry.deviation?.isDeviation).toBe(true);
    expect(runEntry.deviation?.type).toBe('POLICY');
    expect(runEntry.failure_type).toBe('TYPE-B');
    expect(runEntry.explanation?.code).toBe('REQUIRED_POLICY_MISSING');
    expect(runEntry.explanation?.evidence).toContain(
      'missing_policy=AUDIT_MODE',
    );
    expect(runEntry.governance_proposal).toBeUndefined();
  });

  it('does not flag deviation when RUN observation contract is satisfied', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(
      workspace,
      new DisabledModelAdapter(),
    );
    const filePath = path.join(workspace, 'src', 'deviation', 'clean.ts');
    const text = 'export const clean = true;\n';

    process.env.AUDIT_MODE = 'true';
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, text, 'utf8');

    const runEntry = await orchestrator.observeExecution(
      'workbench.action.files.save',
      filePath,
    );

    expect(runEntry.deviation).toBeUndefined();
    expect(runEntry.failure_type).toBeUndefined();
    expect(runEntry.explanation).toBeUndefined();
    expect(runEntry.governance_proposal).toBeUndefined();
    expect(orchestrator.listPendingGovernanceProposals()).toEqual([]);
  });

  it('attaches governance proposal only when repeated explanation reaches threshold', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(
      workspace,
      new DisabledModelAdapter(),
    );
    const filePath = path.join(workspace, 'src', 'deviation', 'threshold.ts');
    const text = 'export const threshold = true;\n';

    delete process.env.AUDIT_MODE;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, text, 'utf8');

    const first = await orchestrator.observeExecution(
      'workbench.action.files.save',
      filePath,
    );
    const second = await orchestrator.observeExecution(
      'workbench.action.files.save',
      filePath,
    );
    const third = await orchestrator.observeExecution(
      'workbench.action.files.save',
      filePath,
    );
    const fourth = await orchestrator.observeExecution(
      'workbench.action.files.save',
      filePath,
    );

    expect(first.explanation?.code).toBe('REQUIRED_POLICY_MISSING');
    expect(first.governance_proposal).toBeUndefined();
    expect(second.governance_proposal).toBeUndefined();
    expect(third.governance_proposal?.proposalType).toBe(
      'REVIEW_POLICY_REQUIREMENT',
    );
    expect(third.governance_proposal?.triggerCode).toBe(
      'REQUIRED_POLICY_MISSING',
    );
    expect(third.governance_proposal?.reviewStatus).toBe('PENDING_REVIEW');

    const pending = orchestrator.listPendingGovernanceProposals();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.proposalType).toBe('REVIEW_POLICY_REQUIREMENT');
    expect(pending[0]?.occurrenceCount).toBe(2);
    expect(fourth.governance_proposal?.reviewStatus).toBe('PENDING_REVIEW');
  });

  it('keeps separate registry records for different proposal types', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(
      workspace,
      new DisabledModelAdapter(),
    );
    const filePath = path.join(
      workspace,
      'src',
      'deviation',
      'registry-types.ts',
    );

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '', 'utf8');
    process.env.AUDIT_MODE = 'true';

    await orchestrator.observeExecution('arc.test.sequence', filePath);
    await orchestrator.observeExecution('arc.test.sequence', filePath);
    await orchestrator.observeExecution('arc.test.sequence', filePath);

    await orchestrator.observeExecution('arc.test.shape', filePath);
    await orchestrator.observeExecution('arc.test.shape', filePath);
    await orchestrator.observeExecution('arc.test.shape', filePath);

    const pending = orchestrator.listPendingGovernanceProposals();
    expect(pending).toHaveLength(2);
    expect(pending.map((record) => record.proposalType).sort()).toEqual([
      'REVIEW_CONTRACT',
      'REVIEW_OUTPUT_CONTRACT',
    ]);
  });

  it('writes a hash-chained audit entry with blueprint linkage for REQUIRE_PLAN saves', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(
      workspace,
      new DisabledModelAdapter(),
    );
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
    const perfEntries = perfLines.map(
      (line) => JSON.parse(line) as { operation: string },
    );
    const parsed = JSON.parse(auditLines[0]) as {
      prev_hash: string;
      hash: string;
      directive_id: string;
      blueprint_id: string;
      route_mode: string;
      route_lane: string;
      route_fallback: string;
    };

    expect(outcome.decision.decision).toBe('REQUIRE_PLAN');
    expect(outcome.decision.lease_status).toBe('NEW');
    expect(outcome.decision.directive_id).toBe(fixtureDirectiveIds.valid);
    expect(outcome.decision.blueprint_id).toBe(blueprint.blueprintId);
    expect(parsed.prev_hash).toBe('ROOT');
    expect(parsed.hash.length).toBe(64);
    expect(parsed.directive_id).toBe(fixtureDirectiveIds.valid);
    expect(parsed.blueprint_id).toBe(blueprint.blueprintId);
    expect(parsed.route_mode).toBe('RULE_ONLY');
    expect(parsed.route_lane).toBe('RULE_ONLY');
    expect(parsed.route_fallback).toBe('CONFIG_MISSING');
    expect(perfLines.length).toBeGreaterThanOrEqual(2);
    expect(
      perfEntries.some((entry) => entry.operation === 'classify_file'),
    ).toBe(true);
    expect(
      perfEntries.some((entry) => entry.operation === 'evaluate_rules'),
    ).toBe(true);
  });

  it('records AST fingerprint hash in audit entries when ast fingerprinting is enabled', async () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'RULE_ONLY',
        local_lane_enabled: false,
        cloud_lane_enabled: false,
        ast_fingerprinting_enabled: true,
      }),
      'utf8',
    );

    const orchestrator = new SaveOrchestrator(
      workspace,
      new DisabledModelAdapter(),
    );
    const assessed = await orchestrator.assessSave({
      ...fixtureInputs.auth,
      filePath: 'src/example.ts',
      fileName: 'example.ts',
      text: 'export function save(){ return true; }',
    });
    const outcome = orchestrator.commitAssessment(assessed, true);
    const auditPath = path.join(workspace, '.arc', 'audit.jsonl');
    const entries = fs.readFileSync(auditPath, 'utf8').trim().split('\n');
    const parsed = JSON.parse(entries[0]) as { fingerprint?: string };

    expect(outcome.analysis.fingerprints?.file).toBeDefined();
    expect(parsed.fingerprint).toBe(outcome.analysis.fingerprints?.file);
  });

  it('records deterministic save → run → commit decision lifecycle linkage', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(
      workspace,
      new DisabledModelAdapter(),
    );
    const filePath = path.join(workspace, 'src', 'auth', 'linked.ts');
    const text = 'export const linked = true;\n';

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, text, 'utf8');

    const assessed = await orchestrator.assessSave({
      ...fixtureInputs.auth,
      filePath,
      fileName: path.basename(filePath),
      text,
      previousText: text,
    });
    const saved = orchestrator.commitAssessment(assessed, true);
    const saveEntry = saved.auditEntry;

    expect(saveEntry).toBeDefined();
    expect(saveEntry?.event_type).toBe('SAVE');
    expect(saveEntry?.decision_id.length).toBe(64);

    const runEntry = await orchestrator.observeExecution(
      'workbench.action.files.save',
      filePath,
    );
    const commitEntry = await orchestrator.observeCommit(filePath, text);

    expect(runEntry.event_type).toBe('RUN');
    expect(runEntry.actor_type).toBe('SYSTEM');
    expect(runEntry.actor_id).toBe('workbench.action.files.save');
    expect(runEntry.next_action).toContain('No runtime mutation');

    expect(commitEntry.event_type).toBe('COMMIT');
    expect(commitEntry.actor_type).toBe('SYSTEM');
    expect(commitEntry.actor_id).toBe('git.commit');
    expect(runEntry.linked_decision_id).toBe(saveEntry?.decision_id);
    expect(commitEntry.linked_decision_id).toBe(saveEntry?.decision_id);
    expect(commitEntry.prev_hash).toBe(runEntry.hash);
    expect(orchestrator.verifyAuditChain()).toBe(true);

    const auditPath = path.join(workspace, '.arc', 'audit.jsonl');
    const entries = fs
      .readFileSync(auditPath, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(
        (line) =>
          JSON.parse(line) as {
            event_type: string;
            decision_id: string;
            linked_decision_id?: string;
          },
      );

    expect(entries[0]?.event_type).toBe('SAVE');
    expect(entries[1]?.event_type).toBe('RUN');
    expect(entries[1]?.linked_decision_id).toBe(entries[0]?.decision_id);
    expect(entries[2]?.event_type).toBe('COMMIT');
    expect(entries[2]?.linked_decision_id).toBe(entries[0]?.decision_id);
  });

  it('records NO_DRIFT when commit fingerprint matches linked save fingerprint', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(
      workspace,
      new DisabledModelAdapter(),
    );
    const filePath = path.join(workspace, 'src', 'auth', 'policy.ts');
    const text = 'export const canAccess = true;\n';

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, text, 'utf8');

    const saveInput = {
      ...fixtureInputs.auth,
      filePath,
      fileName: path.basename(filePath),
      text,
      previousText: text,
    };

    const assessed = await orchestrator.assessSave(saveInput);
    const saved = orchestrator.commitAssessment(assessed, true);
    const committed = await orchestrator.observeCommit(filePath, text);

    expect(saved.auditEntry?.decision_id).toBeTruthy();
    expect(committed.linked_decision_id).toBe(saved.auditEntry?.decision_id);
    expect(committed.drift_status).toBe('NO_DRIFT');
  });

  it('records DRIFT_DETECTED when commit fingerprint differs from linked save fingerprint', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(
      workspace,
      new DisabledModelAdapter(),
    );
    const filePath = path.join(workspace, 'src', 'auth', 'drift.ts');

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'export const version = 1;\n', 'utf8');

    const saveInput = {
      ...fixtureInputs.auth,
      filePath,
      fileName: path.basename(filePath),
      text: 'export const version = 1;\n',
      previousText: 'export const version = 1;\n',
    };

    const assessed = await orchestrator.assessSave(saveInput);
    const saved = orchestrator.commitAssessment(assessed, true);
    const committed = await orchestrator.observeCommit(
      filePath,
      'export const version = 2;\n',
    );

    expect(committed.linked_decision_id).toBe(saved.auditEntry?.decision_id);
    expect(committed.drift_status).toBe('DRIFT_DETECTED');
  });

  it('records NO_LINKED_DECISION when commit has no save lifecycle link', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(
      workspace,
      new DisabledModelAdapter(),
    );
    const filePath = path.join(workspace, 'src', 'auth', 'unlinked.ts');

    const committed = await orchestrator.observeCommit(
      filePath,
      'export const unlinked = true;\n',
    );

    expect(committed.linked_decision_id).toBeUndefined();
    expect(committed.drift_status).toBe('NO_LINKED_DECISION');
  });

  it('records FINGERPRINT_UNAVAILABLE when linked save fingerprint is unavailable', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(
      workspace,
      new DisabledModelAdapter(),
    );
    const writer = new AuditLogWriter(workspace);
    const filePath = path.join(workspace, 'src', 'auth', 'legacy.ts');
    const saveInput = {
      ...fixtureInputs.auth,
      filePath,
      fileName: path.basename(filePath),
      text: 'export const legacy = true;\n',
      previousText: 'export const legacy = true;\n',
    };
    const classification = classifyFile(saveInput, DEFAULT_RULES);

    writer.append(classification, {
      ...evaluateRules(classification, saveInput),
      fingerprint: undefined,
      fingerprint_version: undefined,
    });

    const committed = await orchestrator.observeCommit(
      filePath,
      'export const legacy = true;\n',
    );

    expect(committed.linked_decision_id).toBeTruthy();
    expect(committed.drift_status).toBe('FINGERPRINT_UNAVAILABLE');
  });

  it('fails closed to RULE_ONLY and keeps decisions unchanged when cloud-assisted config violates local-first prerequisites', async () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'CLOUD_ASSISTED',
        local_lane_enabled: false,
        cloud_lane_enabled: true,
        cloud_data_class: 'CLOUD_ELIGIBLE',
      }),
      'utf8',
    );

    const orchestrator = new SaveOrchestrator(
      workspace,
      new DisabledModelAdapter(),
    );
    const assessed = await orchestrator.assessSave(fixtureInputs.auth);

    expect(assessed.decision.decision).toBe('REQUIRE_PLAN');
    expect(assessed.decision.route_mode).toBe('RULE_ONLY');
    expect(assessed.decision.route_lane).toBe('RULE_ONLY');
    expect(assessed.decision.route_fallback).toBe('CONFIG_INVALID');
    expect(assessed.routePolicy.status).toBe('INVALID');
    expect(assessed.contextPacket.data_class).toBe('LOCAL_ONLY');
    expect(assessed.contextPacket.sensitivity_marker).toBe('UNASSESSED');
    expect(validateContextPacket(assessed.contextPacket)).toEqual({
      ok: true,
      issues: [],
    });
    expect(assessed.contextPacket.authority_tag).toBe(
      'LINTEL_LOCAL_ENFORCEMENT',
    );
    expect(assessed.decision.route_reason).toContain('Phase 6.6');
  });

  it('keeps rule-first outcomes unchanged when the router shell resolves explicit RULE_ONLY config', async () => {
    const workspace = makeWorkspace();
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

    const orchestrator = new SaveOrchestrator(
      workspace,
      new DisabledModelAdapter(),
    );
    const assessed = await orchestrator.assessSave(fixtureInputs.auth);

    expect(assessed.decision.decision).toBe('REQUIRE_PLAN');
    expect(assessed.decision.route_mode).toBe('RULE_ONLY');
    expect(assessed.decision.route_lane).toBe('RULE_ONLY');
    expect(assessed.decision.route_fallback).toBe('NONE');
    expect(assessed.decision.route_reason).toContain(
      'Phase 6.6 router shell remains RULE_ONLY',
    );
  });

  it('executes the local lane only for explicit LOCAL_PREFERRED saves and preserves the rule floor', async () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'LOCAL_PREFERRED',
        local_lane_enabled: true,
        cloud_lane_enabled: false,
      }),
      'utf8',
    );

    const orchestrator = new SaveOrchestrator(
      workspace,
      new TighteningAdapter(),
    );
    const assessed = await orchestrator.assessSave(fixtureInputs.auth);

    expect(assessed.routePolicy.status).toBe('LOADED');
    expect(assessed.routePolicy.config.mode).toBe('LOCAL_PREFERRED');
    expect(assessed.contextPacket.data_class).toBe('LOCAL_ONLY');
    expect(assessed.contextPacket.sensitivity_marker).toBe('UNASSESSED');
    expect(assessed.decision.source).toBe('MODEL');
    expect(assessed.decision.decision).toBe('BLOCK');
    expect(assessed.decision.route_mode).toBe('LOCAL_PREFERRED');
    expect(assessed.decision.route_lane).toBe('LOCAL');
    expect(assessed.decision.route_fallback).toBe('NONE');
    expect(assessed.decision.fallback_cause).toBe('NONE');
  });

  it('blocks local-lane execution for auto-save and fails closed to RULE_ONLY', async () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'LOCAL_PREFERRED',
        local_lane_enabled: true,
        cloud_lane_enabled: false,
      }),
      'utf8',
    );

    const orchestrator = new SaveOrchestrator(
      workspace,
      new TighteningAdapter(),
    );
    const assessed = await orchestrator.assessSave(fixtureInputs.autoAuth);

    expect(assessed.decision.decision).toBe('REQUIRE_PLAN');
    expect(assessed.decision.source).toBe('MODEL_DISABLED');
    expect(assessed.decision.fallback_cause).toBe('MODEL_DISABLED');
    expect(assessed.decision.route_mode).toBe('LOCAL_PREFERRED');
    expect(assessed.decision.route_lane).toBe('RULE_ONLY');
    expect(assessed.decision.route_fallback).toBe('AUTO_SAVE_BLOCKED');
    expect(assessed.decision.route_reason).toContain(
      'auto-save assessments fail closed to RULE_ONLY',
    );
  });

  it('executes cloud fallback only after approved local fallback and only for CLOUD_ELIGIBLE packets', async () => {
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
      new TimeoutAdapter(),
      new CloudTighteningAdapter(),
    );
    const assessed = await orchestrator.assessSave(fixtureInputs.auth);

    expect(assessed.contextPacket.data_class).toBe('CLOUD_ELIGIBLE');
    expect(assessed.decision.decision).toBe('BLOCK');
    expect(assessed.decision.source).toBe('CLOUD_MODEL');
    expect(assessed.decision.route_mode).toBe('CLOUD_ASSISTED');
    expect(assessed.decision.route_lane).toBe('CLOUD');
    expect(assessed.decision.route_fallback).toBe('NONE');
  });

  it('denies cloud fallback when the packet remains LOCAL_ONLY even under CLOUD_ASSISTED policy', async () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'CLOUD_ASSISTED',
        local_lane_enabled: true,
        cloud_lane_enabled: true,
      }),
      'utf8',
    );

    const cloudAdapter = new CountingCloudAdapter();
    const orchestrator = new SaveOrchestrator(
      workspace,
      new TimeoutAdapter(),
      cloudAdapter,
    );
    const assessed = await orchestrator.assessSave(fixtureInputs.auth);

    expect(assessed.contextPacket.data_class).toBe('LOCAL_ONLY');
    expect(assessed.decision.decision).toBe('REQUIRE_PLAN');
    expect(assessed.decision.source).toBe('FALLBACK');
    expect(assessed.decision.route_mode).toBe('CLOUD_ASSISTED');
    expect(assessed.decision.route_lane).toBe('RULE_ONLY');
    expect(assessed.decision.route_fallback).toBe('DATA_CLASS_DENIED');
    expect(assessed.decision.route_reason).toContain('LOCAL_ONLY');
    expect(cloudAdapter.calls).toBe(0);
  });

  it('keeps cloud fallback out of auto-save even when cloud policy is enabled', async () => {
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

    const cloudAdapter = new CountingCloudAdapter();
    const orchestrator = new SaveOrchestrator(
      workspace,
      new TimeoutAdapter(),
      cloudAdapter,
    );
    const assessed = await orchestrator.assessSave(fixtureInputs.autoAuth);

    expect(assessed.decision.route_mode).toBe('CLOUD_ASSISTED');
    expect(assessed.decision.route_lane).toBe('RULE_ONLY');
    expect(assessed.decision.route_fallback).toBe('AUTO_SAVE_BLOCKED');
    expect(assessed.decision.route_reason).toContain(
      'auto-save assessments fail closed to RULE_ONLY',
    );
    expect(cloudAdapter.calls).toBe(0);
  });

  it('does not escalate to cloud when the local lane succeeds under CLOUD_ASSISTED policy', async () => {
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

    const cloudAdapter = new CountingCloudAdapter();
    const orchestrator = new SaveOrchestrator(
      workspace,
      new TighteningAdapter(),
      cloudAdapter,
    );
    const assessed = await orchestrator.assessSave(fixtureInputs.auth);

    expect(assessed.decision.source).toBe('MODEL');
    expect(assessed.decision.route_mode).toBe('CLOUD_ASSISTED');
    expect(assessed.decision.route_lane).toBe('LOCAL');
    expect(cloudAdapter.calls).toBe(0);
  });

  it('denies REQUIRE_PLAN saves without a blueprint artifact', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(
      workspace,
      new DisabledModelAdapter(),
    );

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
    expect(outcome.decision.reason).toContain(
      'does not match the canonical Phase 5 artifact path',
    );
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

  it('invalidates reusable WARN decisions when workspace mapping changes governed state', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace);

    const first = await orchestrator.assessSave(fixtureInputs.schema);
    orchestrator.commitAssessment(first, true);

    const reused = await orchestrator.assessSave(fixtureInputs.schema);
    expect(reused.decision.lease_status).toBe('REUSED');

    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'workspace-map.json'),
      JSON.stringify({
        mode: 'LOCAL_ONLY',
        ui_segments: ['db'],
      }),
      'utf8',
    );

    const invalidated = await orchestrator.assessSave(fixtureInputs.schema);
    expect(invalidated.leaseReusable).toBe(false);
    expect(invalidated.classification.demoted).toBe(true);
    expect(invalidated.decision.decision).toBe('WARN');
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

    expect(assessed.classification.matchedRuleIds).toContain(
      'workspace-security-auth',
    );
    expect(assessed.decision.decision).toBe('REQUIRE_PLAN');
  });

  it('falls back to the rule decision when model evaluation fails', async () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'LOCAL_PREFERRED',
        local_lane_enabled: true,
        cloud_lane_enabled: false,
      }),
      'utf8',
    );
    const orchestrator = new SaveOrchestrator(workspace, new TimeoutAdapter());

    const assessed = await orchestrator.assessSave(fixtureInputs.auth);

    expect(assessed.decision.decision).toBe('REQUIRE_PLAN');
    expect(assessed.decision.fallback_cause).toBe('TIMEOUT');
    expect(assessed.decision.source).toBe('FALLBACK');
    expect(assessed.decision.route_mode).toBe('LOCAL_PREFERRED');
    expect(assessed.decision.route_lane).toBe('RULE_ONLY');
  });

  it('records model-evaluation timing when the local lane executes and times out', async () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'LOCAL_PREFERRED',
        local_lane_enabled: true,
        cloud_lane_enabled: false,
      }),
      'utf8',
    );
    const orchestrator = new SaveOrchestrator(workspace, new TimeoutAdapter());

    await orchestrator.assessSave(fixtureInputs.auth);

    const perfPath = path.join(workspace, '.arc', 'perf.jsonl');
    const perfEntries = fs
      .readFileSync(perfPath, 'utf8')
      .trim()
      .split('\n')
      .map(
        (line) =>
          JSON.parse(line) as {
            operation: string;
            metadata?: Record<string, string>;
          },
      );

    expect(
      perfEntries.find((entry) => entry.operation === 'evaluate_model'),
    ).toMatchObject({
      metadata: {
        lane: 'LOCAL',
      },
    });
  });

  it('falls back to the rule decision when the local model is unavailable', async () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'LOCAL_PREFERRED',
        local_lane_enabled: true,
        cloud_lane_enabled: false,
      }),
      'utf8',
    );
    const orchestrator = new SaveOrchestrator(
      workspace,
      new UnavailableAdapter(),
    );

    const assessed = await orchestrator.assessSave(fixtureInputs.auth);

    expect(assessed.decision.decision).toBe('REQUIRE_PLAN');
    expect(assessed.decision.fallback_cause).toBe('UNAVAILABLE');
    expect(assessed.decision.source).toBe('FALLBACK');
    expect(assessed.decision.route_mode).toBe('LOCAL_PREFERRED');
    expect(assessed.decision.route_lane).toBe('RULE_ONLY');
  });

  it('falls back to the rule decision when the local model returns invalid output', async () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'LOCAL_PREFERRED',
        local_lane_enabled: true,
        cloud_lane_enabled: false,
      }),
      'utf8',
    );
    const orchestrator = new SaveOrchestrator(
      workspace,
      new ParseFailureAdapter(),
    );

    const assessed = await orchestrator.assessSave(fixtureInputs.auth);

    expect(assessed.decision.decision).toBe('REQUIRE_PLAN');
    expect(assessed.decision.fallback_cause).toBe('PARSE_FAILURE');
    expect(assessed.decision.source).toBe('FALLBACK');
    expect(assessed.decision.route_mode).toBe('LOCAL_PREFERRED');
    expect(assessed.decision.route_lane).toBe('RULE_ONLY');
  });

  it('falls back to the rule decision when the local model returns no result', async () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'LOCAL_PREFERRED',
        local_lane_enabled: true,
        cloud_lane_enabled: false,
      }),
      'utf8',
    );
    const orchestrator = new SaveOrchestrator(
      workspace,
      new UndefinedAdapter(),
    );

    const assessed = await orchestrator.assessSave(fixtureInputs.auth);

    expect(assessed.decision.decision).toBe('REQUIRE_PLAN');
    expect(assessed.decision.fallback_cause).toBe('RULE_ONLY');
    expect(assessed.decision.source).toBe('FALLBACK');
    expect(assessed.decision.route_mode).toBe('LOCAL_PREFERRED');
    expect(assessed.decision.route_lane).toBe('RULE_ONLY');
  });

  it('fails closed to the rule decision when the local lane is enabled but the adapter is disabled', async () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'LOCAL_PREFERRED',
        local_lane_enabled: true,
        cloud_lane_enabled: false,
      }),
      'utf8',
    );
    const orchestrator = new SaveOrchestrator(
      workspace,
      new DisabledModelAdapter(),
    );

    const assessed = await orchestrator.assessSave(fixtureInputs.auth);

    expect(assessed.decision.decision).toBe('REQUIRE_PLAN');
    expect(assessed.decision.fallback_cause).toBe('MODEL_DISABLED');
    expect(assessed.decision.source).toBe('MODEL_DISABLED');
    expect(assessed.decision.route_mode).toBe('LOCAL_PREFERRED');
    expect(assessed.decision.route_lane).toBe('RULE_ONLY');
  });

  it('fails closed when the default adapter host config is non-local', async () => {
    process.env.OLLAMA_HOST = 'https://example.com/api/generate';

    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'LOCAL_PREFERRED',
        local_lane_enabled: true,
        cloud_lane_enabled: false,
      }),
      'utf8',
    );

    const orchestrator = new SaveOrchestrator(workspace);
    const assessed = await orchestrator.assessSave(fixtureInputs.auth);

    expect(assessed.decision.decision).toBe('REQUIRE_PLAN');
    expect(assessed.decision.fallback_cause).toBe('UNAVAILABLE');
    expect(assessed.decision.source).toBe('FALLBACK');
    expect(assessed.decision.route_mode).toBe('LOCAL_PREFERRED');
    expect(assessed.decision.route_lane).toBe('RULE_ONLY');
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
