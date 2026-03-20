import { describe, expect, it } from 'vitest';
import { classifyFile } from '../../src/core/classifier';
import { DEFAULT_RULES } from '../../src/core/rules';
import { evaluateRules } from '../../src/core/ruleEngine';
import { fixtureInputs } from '../fixtures/saveInputs';

describe('rule engine', () => {
  it('allows low-risk files', () => {
    const classification = classifyFile(fixtureInputs.button, DEFAULT_RULES);
    const decision = evaluateRules(classification, fixtureInputs.button);

    expect(decision.decision).toBe('ALLOW');
  });

  it('requires a plan for auth paths', () => {
    const classification = classifyFile(fixtureInputs.auth, DEFAULT_RULES);
    const decision = evaluateRules(classification, fixtureInputs.auth);

    expect(decision.decision).toBe('REQUIRE_PLAN');
  });

  it('warns for schema paths', () => {
    const classification = classifyFile(fixtureInputs.schema, DEFAULT_RULES);
    const decision = evaluateRules(classification, fixtureInputs.schema);

    expect(decision.decision).toBe('WARN');
  });

  it('blocks combined auth and schema changes', () => {
    const classification = classifyFile(fixtureInputs.authSchema, DEFAULT_RULES);
    const decision = evaluateRules(classification, fixtureInputs.authSchema);

    expect(decision.decision).toBe('BLOCK');
    expect(decision.risk_level).toBe('CRITICAL');
  });
});
