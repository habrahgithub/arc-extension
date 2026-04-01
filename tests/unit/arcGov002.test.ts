/**
 * ARC-GOV-002 — Tier 1 Governance Integrity
 *
 * Tests for:
 * 1. ActorIdentity — present in audit entries when provided
 * 2. Secret redaction — patterns removed from context packet excerpt
 * 3. SSRF guard — Ollama adapter rejects non-local hostnames
 * 4. AJV validation — malformed route policy and workspace rules fail closed
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { DecisionPayload } from '../../src/contracts/types';
import { AuditLogWriter } from '../../src/core/auditLog';
import { classifyFile } from '../../src/core/classifier';
import { redactSecrets } from '../../src/core/contextPacket';
import { evaluateRules } from '../../src/core/ruleEngine';
import { DEFAULT_RULES } from '../../src/core/rules';
import { RoutePolicyStore } from '../../src/core/routerPolicy';
import { WorkspaceMappingStore } from '../../src/core/workspaceMapping';
import { ModelAdapterError, OllamaModelAdapter } from '../../src/adapters/modelAdapter';
import { fixtureInputs } from '../fixtures/saveInputs';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-gov002-'));
  workspaces.push(workspace);
  return workspace;
}

function makeAllowDecision(): DecisionPayload {
  const input = fixtureInputs.button;
  const classification = classifyFile(input, DEFAULT_RULES);
  return evaluateRules(classification, input);
}

afterEach(() => {
  for (const workspace of workspaces) {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
  workspaces.length = 0;
  delete process.env.OLLAMA_HOST;
});

// ---------------------------------------------------------------------------
// 1. ActorIdentity in audit entries
// ---------------------------------------------------------------------------

describe('ActorIdentity — audit entry attribution', () => {
  it('stores actor when provided via decision fields', () => {
    const workspace = makeWorkspace();
    const writer = new AuditLogWriter(workspace);
    const input = fixtureInputs.button;
    const classification = classifyFile(input, DEFAULT_RULES);
    const decision = { ...evaluateRules(classification, input), actor_id: 'test-machine-id', actor_type: 'USER' as const };

    const entry = writer.append(classification, decision);

    expect(entry.actor_id).toBe('test-machine-id');
    expect(entry.actor_type).toBe('USER');
  });

  it('omits actor fields when not provided', () => {
    const workspace = makeWorkspace();
    const writer = new AuditLogWriter(workspace);
    const input = fixtureInputs.button;
    const classification = classifyFile(input, DEFAULT_RULES);
    const decision = evaluateRules(classification, input);

    const entry = writer.append(classification, decision);

    expect(entry.actor_id).toBeUndefined();
    expect(entry.actor_type).toBeUndefined();
  });

  it('persists actor to audit.jsonl and reads it back', () => {
    const workspace = makeWorkspace();
    const writer = new AuditLogWriter(workspace);
    const input = fixtureInputs.button;
    const classification = classifyFile(input, DEFAULT_RULES);
    const decision = { ...evaluateRules(classification, input), actor_id: 'machine-xyz', actor_type: 'USER' as const };

    writer.append(classification, decision);

    const auditPath = path.join(workspace, '.arc', 'audit.jsonl');
    const line = fs.readFileSync(auditPath, 'utf8').trim();
    const parsed = JSON.parse(line) as { actor_id?: string; actor_type?: string };

    expect(parsed.actor_type).toBe('USER');
    expect(parsed.actor_id).toBe('machine-xyz');
  });

  it('preserves hash-chain integrity when actor fields are present', () => {
    const workspace = makeWorkspace();
    const writer = new AuditLogWriter(workspace);
    const input = fixtureInputs.button;
    const classification = classifyFile(input, DEFAULT_RULES);
    const decision = { ...evaluateRules(classification, input), actor_id: 'machine-abc', actor_type: 'USER' as const };

    writer.append(classification, decision);
    writer.append(classification, decision);

    expect(writer.verifyChain()).toBe(true);
  });

  it('supports agent actor type', () => {
    const workspace = makeWorkspace();
    const writer = new AuditLogWriter(workspace);
    const input = fixtureInputs.button;
    const classification = classifyFile(input, DEFAULT_RULES);
    const decision = { ...evaluateRules(classification, input), actor_id: 'forge_v1', actor_type: 'AGENT' as const };

    const entry = writer.append(classification, decision);

    expect(entry.actor_type).toBe('AGENT');
    expect(entry.actor_id).toBe('forge_v1');
  });

  it('chain verifies correctly when mixing entries with and without actor', () => {
    const workspace = makeWorkspace();
    const writer = new AuditLogWriter(workspace);
    const input = fixtureInputs.button;
    const classification = classifyFile(input, DEFAULT_RULES);
    const decision = evaluateRules(classification, input);
    const decisionWithActor = { ...decision, actor_id: 'human-1', actor_type: 'USER' as const };

    writer.append(classification, decision);
    writer.append(classification, decisionWithActor);
    writer.append(classification, decision);

    expect(writer.verifyChain()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Secret redaction
// ---------------------------------------------------------------------------

describe('redactSecrets — excerpt secret removal', () => {
  it('returns undefined for undefined input', () => {
    expect(redactSecrets(undefined)).toBeUndefined();
  });

  it('returns empty string unchanged', () => {
    expect(redactSecrets('')).toBe('');
  });

  it('redacts env-style KEY=value secrets', () => {
    const input = 'API_KEY=supersecret123 other text';
    const result = redactSecrets(input);
    expect(result).toContain('API_KEY=<REDACTED>');
    expect(result).not.toContain('supersecret123');
  });

  it('redacts Bearer token', () => {
    const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const result = redactSecrets(input);
    expect(result).toContain('Bearer <REDACTED>');
    expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });

  it('redacts private key block', () => {
    const input = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\n-----END RSA PRIVATE KEY-----';
    const result = redactSecrets(input);
    expect(result).toContain('<REDACTED PRIVATE KEY BLOCK>');
    expect(result).not.toContain('MIIEowIBAAKCAQEA');
  });

  it('leaves non-secret code unchanged', () => {
    const input = 'const x = myFunction(foo, bar);';
    expect(redactSecrets(input)).toBe(input);
  });

  it('redacts multiple secrets in one excerpt', () => {
    const input = 'SECRET_KEY=abc123 and also Bearer token123xyz';
    const result = redactSecrets(input);
    expect(result).not.toContain('abc123');
    expect(result).not.toContain('token123xyz');
  });
});

// ---------------------------------------------------------------------------
// 3. SSRF guard — Ollama adapter
// ---------------------------------------------------------------------------

describe('OllamaModelAdapter — SSRF guard', () => {
  it('rejects non-local hostname (example.com)', async () => {
    process.env.OLLAMA_HOST = 'https://attacker.example.com/api/generate';
    const adapter = new OllamaModelAdapter({ enabledByDefault: true });

    await expect(
      adapter.evaluate({ file_path: 'src/auth/session.ts', risk_flags: ['AUTH_CHANGE'], matched_rule_ids: [], heuristic_only: true }),
    ).rejects.toBeInstanceOf(ModelAdapterError);
  });

  it('rejects LAN IP address (192.168.x.x)', async () => {
    process.env.OLLAMA_HOST = 'http://192.168.1.100:11434';
    const adapter = new OllamaModelAdapter({ enabledByDefault: true });

    let threw = false;
    try {
      await adapter.evaluate({ file_path: 'src/auth.ts', risk_flags: [], matched_rule_ids: [], heuristic_only: true });
    } catch (e) {
      threw = true;
      expect(e).toBeInstanceOf(ModelAdapterError);
      expect((e as ModelAdapterError).causeCode).toBe('UNAVAILABLE');
      expect((e as Error).message).toContain('local-only');
    }
    expect(threw).toBe(true);
  });

  it('accepts localhost hostname without configurationError', () => {
    process.env.OLLAMA_HOST = 'localhost:11434';
    const adapter = new OllamaModelAdapter({ enabledByDefault: true });
    expect(adapter).toBeDefined();
  });

  it('accepts 127.0.0.1 hostname without configurationError', () => {
    process.env.OLLAMA_HOST = '127.0.0.1:11434';
    const adapter = new OllamaModelAdapter({ enabledByDefault: true });
    expect(adapter).toBeDefined();
  });

  it('accepts bracketed IPv6 localhost [::1] without configurationError', () => {
    process.env.OLLAMA_HOST = '[::1]:11434';
    const adapter = new OllamaModelAdapter({ enabledByDefault: true });
    expect(adapter).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 4a. AJV — RoutePolicyStore rejects malformed config
// ---------------------------------------------------------------------------

describe('RoutePolicyStore — AJV schema validation', () => {
  it('fails closed on config with unknown fields', () => {
    const workspace = makeWorkspace();
    const arcDir = path.join(workspace, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });
    fs.writeFileSync(
      path.join(arcDir, 'router.json'),
      JSON.stringify({ mode: 'RULE_ONLY', unknown_field: true }),
    );

    const result = new RoutePolicyStore(workspace).load();

    expect(result.status).toBe('INVALID');
    expect(result.config.mode).toBe('RULE_ONLY');
  });

  it('fails closed on config with invalid mode enum value', () => {
    const workspace = makeWorkspace();
    const arcDir = path.join(workspace, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });
    fs.writeFileSync(
      path.join(arcDir, 'router.json'),
      JSON.stringify({ mode: 'INVALID_MODE' }),
    );

    const result = new RoutePolicyStore(workspace).load();

    expect(result.status).toBe('INVALID');
  });

  it('fails closed on config with non-boolean lane flag', () => {
    const workspace = makeWorkspace();
    const arcDir = path.join(workspace, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });
    fs.writeFileSync(
      path.join(arcDir, 'router.json'),
      JSON.stringify({ mode: 'RULE_ONLY', local_lane_enabled: 'yes' }),
    );

    const result = new RoutePolicyStore(workspace).load();

    expect(result.status).toBe('INVALID');
  });

  it('loads valid RULE_ONLY config successfully', () => {
    const workspace = makeWorkspace();
    const arcDir = path.join(workspace, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });
    fs.writeFileSync(
      path.join(arcDir, 'router.json'),
      JSON.stringify({ mode: 'RULE_ONLY' }),
    );

    const result = new RoutePolicyStore(workspace).load();

    expect(result.status).toBe('LOADED');
    expect(result.config.mode).toBe('RULE_ONLY');
  });
});

// ---------------------------------------------------------------------------
// 4b. AJV — WorkspaceMappingStore skips invalid rules
// ---------------------------------------------------------------------------

describe('WorkspaceMappingStore — AJV per-rule validation', () => {
  it('loads valid rules successfully', () => {
    const workspace = makeWorkspace();
    const arcDir = path.join(workspace, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });
    fs.writeFileSync(
      path.join(arcDir, 'workspace-map.json'),
      JSON.stringify({
        mode: 'LOCAL_ONLY',
        rules: [
          {
            id: 'rule-test-001',
            riskFlag: 'AUTH_CHANGE',
            scope: 'PATH_SEGMENT_MATCH',
            severity: 'HIGH',
            decisionFloor: 'REQUIRE_PLAN',
            reason: 'Test auth rule',
            matchers: [{ type: 'PATH_SEGMENT_MATCH', value: 'auth' }],
          },
        ],
      }),
    );

    const result = new WorkspaceMappingStore(workspace).load();

    expect(result.status).toBe('LOADED');
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].id).toBe('rule-test-001');
    expect(result.reason).toBeUndefined();
  });

  it('skips invalid rules and records warning in reason', () => {
    const workspace = makeWorkspace();
    const arcDir = path.join(workspace, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });
    fs.writeFileSync(
      path.join(arcDir, 'workspace-map.json'),
      JSON.stringify({
        mode: 'LOCAL_ONLY',
        rules: [
          {
            id: 'rule-valid-001',
            riskFlag: 'AUTH_CHANGE',
            scope: 'PATH_SEGMENT_MATCH',
            severity: 'HIGH',
            decisionFloor: 'REQUIRE_PLAN',
            reason: 'Valid rule',
            matchers: [{ type: 'PATH_SEGMENT_MATCH', value: 'auth' }],
          },
          {
            id: 'rule-broken',
            riskFlag: 'NOT_A_VALID_FLAG',
            scope: 'PATH_SEGMENT_MATCH',
            severity: 'HIGH',
            decisionFloor: 'REQUIRE_PLAN',
            reason: 'Broken rule',
            matchers: [],
          },
        ],
      }),
    );

    const result = new WorkspaceMappingStore(workspace).load();

    expect(result.status).toBe('LOADED');
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].id).toBe('rule-valid-001');
    expect(result.reason).toContain('skipped');
  });

  it('returns LOADED with empty rules and warning when all rules are invalid', () => {
    const workspace = makeWorkspace();
    const arcDir = path.join(workspace, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });
    fs.writeFileSync(
      path.join(arcDir, 'workspace-map.json'),
      JSON.stringify({
        mode: 'LOCAL_ONLY',
        rules: [{ id: 'bad', riskFlag: 'NOPE', matchers: 'not-an-array' }],
      }),
    );

    const result = new WorkspaceMappingStore(workspace).load();

    expect(result.status).toBe('LOADED');
    expect(result.rules).toHaveLength(0);
    expect(result.reason).toContain('skipped');
  });

  it('returns INVALID when rules field is not an array', () => {
    const workspace = makeWorkspace();
    const arcDir = path.join(workspace, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });
    fs.writeFileSync(
      path.join(arcDir, 'workspace-map.json'),
      JSON.stringify({ mode: 'LOCAL_ONLY', rules: 'not-an-array' }),
    );

    const result = new WorkspaceMappingStore(workspace).load();

    expect(result.status).toBe('INVALID');
  });
});
