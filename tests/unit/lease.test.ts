import { describe, expect, it } from 'vitest';
import { classifyFile } from '../../src/core/classifier';
import { DecisionLeaseStore, routeSignatureForDecision } from '../../src/core/decisionLease';
import { buildRouteMetadata } from '../../src/core/routerPolicy';
import { DEFAULT_RULES } from '../../src/core/rules';
import { evaluateRules } from '../../src/core/ruleEngine';
import { fixtureInputs } from '../fixtures/saveInputs';

const ruleOnlyShell = {
  routePolicy: {
    status: 'MISSING' as const,
    config: {
      mode: 'RULE_ONLY' as const,
      localLaneEnabled: false,
      cloudLaneEnabled: false,
    },
    reason: 'Missing config.',
    policyHash: 'policy-hash-a',
  },
  localLane: {
    lane: 'LOCAL' as const,
    enabled: false,
    executable: false,
    reason: 'Local lane disabled.',
  },
  cloudLane: {
    lane: 'CLOUD' as const,
    enabled: false,
    executable: false,
    reason: 'Cloud lane disabled.',
  },
  shouldUseModel: false,
};

describe('decision lease', () => {
  it('reuses acknowledged WARN and proof-linked REQUIRE_PLAN decisions for the same governed state', () => {
    const store = new DecisionLeaseStore(60_000);
    const warnClassification = classifyFile(fixtureInputs.schema, DEFAULT_RULES);
    const warnDecision = {
      ...evaluateRules(warnClassification, fixtureInputs.schema),
      ...buildRouteMetadata(ruleOnlyShell, evaluateRules(warnClassification, fixtureInputs.schema)),
    };
    store.store(fixtureInputs.schema, warnClassification, warnDecision);
    const leasedWarn = store.getReusableDecision(
      fixtureInputs.schema,
      warnClassification,
      warnDecision,
    );

    expect(leasedWarn?.lease_status).toBe('REUSED');
    expect(leasedWarn?.decision).toBe('WARN');

    const requirePlanClassification = classifyFile(fixtureInputs.auth, DEFAULT_RULES);
    const requirePlanDecision = {
      ...evaluateRules(requirePlanClassification, fixtureInputs.auth),
      directive_id: 'LINTEL-PH6-1-001',
      blueprint_id: '.arc/blueprints/LINTEL-PH6-1-001.md',
      ...buildRouteMetadata(ruleOnlyShell, evaluateRules(requirePlanClassification, fixtureInputs.auth)),
    };

    store.store(fixtureInputs.auth, requirePlanClassification, requirePlanDecision);
    const leasedRequirePlan = store.getReusableDecision(
      fixtureInputs.auth,
      requirePlanClassification,
      requirePlanDecision,
    );

    expect(leasedRequirePlan?.lease_status).toBe('REUSED');
    expect(leasedRequirePlan?.decision).toBe('REQUIRE_PLAN');
  });

  it('never leases BLOCK decisions', () => {
    const store = new DecisionLeaseStore(60_000);
    const classification = classifyFile(fixtureInputs.authSchema, DEFAULT_RULES);
    const leased = store.getReusableDecision(
      fixtureInputs.authSchema,
      classification,
      {
        ...evaluateRules(classification, fixtureInputs.authSchema),
        ...buildRouteMetadata(ruleOnlyShell, evaluateRules(classification, fixtureInputs.authSchema)),
      },
    );

    expect(leased).toBeUndefined();
  });

  it('invalidates reuse when route-policy hash changes', () => {
    const store = new DecisionLeaseStore(60_000);
    const classification = classifyFile(fixtureInputs.schema, DEFAULT_RULES);
    const storedDecision = {
      ...evaluateRules(classification, fixtureInputs.schema),
      ...buildRouteMetadata(ruleOnlyShell, evaluateRules(classification, fixtureInputs.schema)),
    };
    store.store(fixtureInputs.schema, classification, storedDecision);

    const currentDecision = {
      ...storedDecision,
      route_policy_hash: 'policy-hash-b',
    };

    expect(
      store.getReusableDecision(fixtureInputs.schema, classification, currentDecision),
    ).toBeUndefined();
  });

  it('invalidates reuse when the route signature changes even if the policy hash does not', () => {
    const store = new DecisionLeaseStore(60_000);
    const classification = classifyFile(fixtureInputs.schema, DEFAULT_RULES);
    const storedDecision = {
      ...evaluateRules(classification, fixtureInputs.schema),
      ...buildRouteMetadata(ruleOnlyShell, evaluateRules(classification, fixtureInputs.schema)),
    };
    store.store(fixtureInputs.schema, classification, storedDecision);

    const currentDecision = {
      ...storedDecision,
      route_fallback: 'CONFIG_INVALID' as const,
    };

    expect(routeSignatureForDecision(storedDecision)).not.toBe(
      routeSignatureForDecision(currentDecision),
    );
    expect(
      store.getReusableDecision(fixtureInputs.schema, classification, currentDecision),
    ).toBeUndefined();
  });

  it('includes proof linkage in REQUIRE_PLAN lease fingerprints', () => {
    const store = new DecisionLeaseStore(60_000);
    const classification = classifyFile(fixtureInputs.auth, DEFAULT_RULES);
    const baseDecision = {
      ...evaluateRules(classification, fixtureInputs.auth),
      ...buildRouteMetadata(ruleOnlyShell, evaluateRules(classification, fixtureInputs.auth)),
    };

    const firstFingerprint = store.fingerprint(fixtureInputs.auth, classification, {
      ...baseDecision,
      directive_id: 'LINTEL-PH6-0-001',
      blueprint_id: '.arc/blueprints/LINTEL-PH6-0-001.md',
    });
    const secondFingerprint = store.fingerprint(fixtureInputs.auth, classification, {
      ...baseDecision,
      directive_id: 'LINTEL-PH6-1-001',
      blueprint_id: '.arc/blueprints/LINTEL-PH6-1-001.md',
    });

    expect(firstFingerprint).not.toBe(secondFingerprint);
  });
});
