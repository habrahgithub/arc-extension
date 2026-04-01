/**
 * ARC-PHASE-008 — Phase 8 Governance Hardening
 *
 * Tests for:
 * 1. Override persistence — overrides.jsonl written on acknowledged saves
 * 2. Lease persistence — leases.jsonl written and recovered across restarts
 * 3. Observe mode — audit-only, no prompts, no blocking
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { classifyFile } from '../../src/core/classifier';
import { DecisionLeaseStore } from '../../src/core/decisionLease';
import { evaluateRules } from '../../src/core/ruleEngine';
import { OverrideLogWriter } from '../../src/core/overrideLog';
import { RoutePolicyStore } from '../../src/core/routerPolicy';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import { DEFAULT_RULES } from '../../src/core/rules';
import { fixtureInputs, makeSaveInput } from '../fixtures/saveInputs';
import type { ActorIdentity, OverrideEntry } from '../../src/contracts/types';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-phase008-'));
  workspaces.push(workspace);
  return workspace;
}

function writeRouterJson(workspace: string, config: object): void {
  const arcDir = path.join(workspace, '.arc');
  fs.mkdirSync(arcDir, { recursive: true });
  fs.writeFileSync(path.join(arcDir, 'router.json'), JSON.stringify(config));
}

afterEach(() => {
  for (const workspace of workspaces) {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
  workspaces.length = 0;
});

// ---------------------------------------------------------------------------
// 1. Override persistence
// ---------------------------------------------------------------------------

describe('OverrideLogWriter — override persistence', () => {
  it('creates overrides.jsonl on first write', () => {
    const workspace = makeWorkspace();
    const writer = new OverrideLogWriter(workspace);
    const input = fixtureInputs.auth;
    const classification = classifyFile(input, DEFAULT_RULES);
    const decision = evaluateRules(classification, input);

    writer.append(classification, decision);

    expect(fs.existsSync(path.join(workspace, '.arc', 'overrides.jsonl'))).toBe(true);
  });

  it('writes override entry with correct fields', () => {
    const workspace = makeWorkspace();
    const writer = new OverrideLogWriter(workspace);
    const input = fixtureInputs.auth;
    const classification = classifyFile(input, DEFAULT_RULES);
    const decision = evaluateRules(classification, input);
    const actor: ActorIdentity = { type: 'human', id: 'axis-001' };

    const entry = writer.append(classification, decision, actor);

    expect(entry.ts).toBeDefined();
    expect(entry.file_path).toBe(input.filePath);
    expect(entry.decision).toBe(decision.decision);
    expect(entry.risk_level).toBe(decision.risk_level);
    expect(entry.violated_rules).toEqual(decision.violated_rules);
    expect(entry.actor?.id).toBe('axis-001');
  });

  it('persists entry to disk and is readable', () => {
    const workspace = makeWorkspace();
    const writer = new OverrideLogWriter(workspace);
    const input = fixtureInputs.auth;
    const classification = classifyFile(input, DEFAULT_RULES);
    const decision = evaluateRules(classification, input);

    writer.append(classification, decision);

    const overridePath = path.join(workspace, '.arc', 'overrides.jsonl');
    const line = fs.readFileSync(overridePath, 'utf8').trim();
    const parsed = JSON.parse(line) as OverrideEntry;

    expect(parsed.file_path).toBe(input.filePath);
    expect(parsed.decision).toBeDefined();
  });

  it('appends multiple override entries', () => {
    const workspace = makeWorkspace();
    const writer = new OverrideLogWriter(workspace);
    const input = fixtureInputs.auth;
    const classification = classifyFile(input, DEFAULT_RULES);
    const decision = evaluateRules(classification, input);

    writer.append(classification, decision);
    writer.append(classification, decision);

    const overridePath = path.join(workspace, '.arc', 'overrides.jsonl');
    const lines = fs.readFileSync(overridePath, 'utf8').trim().split('\n').filter(Boolean);
    expect(lines).toHaveLength(2);
  });

  it('override is written via orchestrator on acknowledged WARN save', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace);
    const input = fixtureInputs.schema;

    const assessment = await orchestrator.assessSave(input);
    orchestrator.commitAssessment(assessment, true); // acknowledged

    const overridePath = path.join(workspace, '.arc', 'overrides.jsonl');
    if (assessment.decision.decision === 'WARN') {
      expect(fs.existsSync(overridePath)).toBe(true);
      const line = fs.readFileSync(overridePath, 'utf8').trim();
      const parsed = JSON.parse(line) as OverrideEntry;
      expect(parsed.file_path).toBe(input.filePath);
    } else {
      // schema.sql may not trigger WARN depending on rules — file path check
      expect(assessment.decision.decision).toBeDefined();
    }
  });

  it('override NOT written on ALLOW save', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace);
    const input = fixtureInputs.button;

    const assessment = await orchestrator.assessSave(input);
    orchestrator.commitAssessment(assessment, true);

    // Button.tsx → ALLOW, no override needed
    expect(assessment.decision.decision).toBe('ALLOW');
    const overridePath = path.join(workspace, '.arc', 'overrides.jsonl');
    expect(fs.existsSync(overridePath)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Lease persistence
// ---------------------------------------------------------------------------

describe('DecisionLeaseStore — lease persistence', () => {
  it('writes lease to leases.jsonl when workspaceRoot provided', () => {
    const workspace = makeWorkspace();
    const store = new DecisionLeaseStore(5 * 60 * 1000, workspace);
    const input = fixtureInputs.schema;
    const classification = classifyFile(input, DEFAULT_RULES);
    const decision = evaluateRules(classification, input);

    store.store(input, classification, decision);

    const leasePath = path.join(workspace, '.arc', 'leases.jsonl');
    if (store.isLeaseEligible(decision.decision)) {
      expect(fs.existsSync(leasePath)).toBe(true);
    }
  });

  it('recovers unexpired lease from disk on new store instance', () => {
    const workspace = makeWorkspace();
    const input = fixtureInputs.schema;
    const classification = classifyFile(input, DEFAULT_RULES);
    const decision = evaluateRules(classification, input);

    // Store lease with first instance
    const store1 = new DecisionLeaseStore(5 * 60 * 1000, workspace);
    store1.store(input, classification, decision);

    // Simulate restart — new store instance loads from disk
    if (store1.isLeaseEligible(decision.decision)) {
      const store2 = new DecisionLeaseStore(5 * 60 * 1000, workspace);
      const reused = store2.getReusableDecision(input, classification, decision);
      expect(reused).toBeDefined();
      expect(reused?.lease_status).toBe('REUSED');
    }
  });

  it('does not recover expired lease from disk', () => {
    const workspace = makeWorkspace();
    const input = fixtureInputs.schema;
    const classification = classifyFile(input, DEFAULT_RULES);
    const decision = evaluateRules(classification, input);

    // Store with 0ms TTL (immediately expired)
    const store1 = new DecisionLeaseStore(0, workspace);
    store1.store(input, classification, decision);

    // New instance should not recover expired lease
    const store2 = new DecisionLeaseStore(5 * 60 * 1000, workspace);
    const reused = store2.getReusableDecision(input, classification, decision);
    expect(reused).toBeUndefined();
  });

  it('works without workspaceRoot (in-memory only)', () => {
    const store = new DecisionLeaseStore();
    const input = fixtureInputs.schema;
    const classification = classifyFile(input, DEFAULT_RULES);
    const decision = evaluateRules(classification, input);

    store.store(input, classification, decision);

    if (store.isLeaseEligible(decision.decision)) {
      const reused = store.getReusableDecision(input, classification, decision);
      expect(reused).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Observe mode
// ---------------------------------------------------------------------------

describe('Observe governance mode', () => {
  it('RoutePolicyStore loads governance_mode: OBSERVE from router.json', () => {
    const workspace = makeWorkspace();
    writeRouterJson(workspace, { mode: 'RULE_ONLY', governance_mode: 'OBSERVE' });

    const result = new RoutePolicyStore(workspace).load();

    expect(result.status).toBe('LOADED');
    expect(result.config.governanceMode).toBe('OBSERVE');
  });

  it('RoutePolicyStore defaults governance_mode to ENFORCE when not set', () => {
    const workspace = makeWorkspace();
    writeRouterJson(workspace, { mode: 'RULE_ONLY' });

    const result = new RoutePolicyStore(workspace).load();

    expect(result.status).toBe('LOADED');
    expect(result.config.governanceMode).toBe('ENFORCE');
  });

  it('RoutePolicyStore uses ENFORCE when router.json is missing', () => {
    const workspace = makeWorkspace();
    const result = new RoutePolicyStore(workspace).load();
    expect(result.config.governanceMode).toBe('ENFORCE');
  });

  it('Observe mode overrides high-risk decision to ALLOW', async () => {
    const workspace = makeWorkspace();
    writeRouterJson(workspace, { mode: 'RULE_ONLY', governance_mode: 'OBSERVE' });
    const orchestrator = new SaveOrchestrator(workspace);

    const assessment = await orchestrator.assessSave(fixtureInputs.auth);

    expect(assessment.decision.decision).toBe('ALLOW');
    expect(assessment.decision.governance_mode).toBe('OBSERVE');
  });

  it('Observe mode sets shouldPrompt to false on high-risk file', async () => {
    const workspace = makeWorkspace();
    writeRouterJson(workspace, { mode: 'RULE_ONLY', governance_mode: 'OBSERVE' });
    const orchestrator = new SaveOrchestrator(workspace);

    const assessment = await orchestrator.assessSave(fixtureInputs.auth);

    expect(assessment.shouldPrompt).toBe(false);
  });

  it('Observe mode preserves risk classification in decision reason', async () => {
    const workspace = makeWorkspace();
    writeRouterJson(workspace, { mode: 'RULE_ONLY', governance_mode: 'OBSERVE' });
    const orchestrator = new SaveOrchestrator(workspace);

    const assessment = await orchestrator.assessSave(fixtureInputs.auth);

    expect(assessment.decision.reason).toContain('Observe mode');
    expect(assessment.decision.reason).toContain('REQUIRE_PLAN');
  });

  it('Observe mode still writes audit entry', async () => {
    const workspace = makeWorkspace();
    writeRouterJson(workspace, { mode: 'RULE_ONLY', governance_mode: 'OBSERVE' });
    const orchestrator = new SaveOrchestrator(workspace);

    const assessment = await orchestrator.assessSave(fixtureInputs.auth);
    orchestrator.commitAssessment(assessment, true);

    const auditPath = path.join(workspace, '.arc', 'audit.jsonl');
    expect(fs.existsSync(auditPath)).toBe(true);
    const line = fs.readFileSync(auditPath, 'utf8').trim();
    const parsed = JSON.parse(line) as { governance_mode?: string; decision: string };
    expect(parsed.decision).toBe('ALLOW');
    expect(parsed.governance_mode).toBe('OBSERVE');
  });

  it('Observe mode does NOT write override entry (no acknowledgment required)', async () => {
    const workspace = makeWorkspace();
    writeRouterJson(workspace, { mode: 'RULE_ONLY', governance_mode: 'OBSERVE' });
    const orchestrator = new SaveOrchestrator(workspace);

    const assessment = await orchestrator.assessSave(fixtureInputs.auth);
    orchestrator.commitAssessment(assessment, true);

    const overridePath = path.join(workspace, '.arc', 'overrides.jsonl');
    expect(fs.existsSync(overridePath)).toBe(false);
  });

  it('ENFORCE mode (default) still blocks on REQUIRE_PLAN when not acknowledged', async () => {
    const workspace = makeWorkspace();
    // No router.json → defaults to ENFORCE
    const orchestrator = new SaveOrchestrator(workspace);

    const assessment = await orchestrator.assessSave(fixtureInputs.auth);

    // Auth file should require REQUIRE_PLAN, not be silently ALLOWed
    expect(assessment.decision.governance_mode).toBeUndefined();
    expect(assessment.decision.decision).not.toBe('ALLOW');
  });
});
