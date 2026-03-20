import { describe, expect, it } from 'vitest';
import { classifyFile } from '../../src/core/classifier';
import { DecisionLeaseStore } from '../../src/core/decisionLease';
import { DEFAULT_RULES } from '../../src/core/rules';
import { evaluateRules } from '../../src/core/ruleEngine';
import { fixtureInputs } from '../fixtures/saveInputs';

describe('decision lease', () => {
  it('reuses acknowledged WARN and REQUIRE_PLAN decisions for the same file state', () => {
    const store = new DecisionLeaseStore(60_000);
    const classification = classifyFile(fixtureInputs.auth, DEFAULT_RULES);
    const decision = evaluateRules(classification, fixtureInputs.auth);

    store.store(fixtureInputs.auth, classification, decision);
    const leased = store.getReusableDecision(
      fixtureInputs.auth,
      classification,
      decision.decision,
    );

    expect(leased?.lease_status).toBe('REUSED');
    expect(leased?.decision).toBe('REQUIRE_PLAN');
  });

  it('never leases BLOCK decisions', () => {
    const store = new DecisionLeaseStore(60_000);
    const classification = classifyFile(fixtureInputs.authSchema, DEFAULT_RULES);
    const leased = store.getReusableDecision(
      fixtureInputs.authSchema,
      classification,
      'BLOCK',
    );

    expect(leased).toBeUndefined();
  });
});
