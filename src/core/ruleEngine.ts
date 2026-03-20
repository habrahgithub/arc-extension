import type { Classification, DecisionPayload, SaveInput } from '../contracts/types';
import { decisionForRisk } from './risk';

export function evaluateRules(
  classification: Classification,
  input: SaveInput,
): DecisionPayload {
  const hasAuth = classification.riskFlags.includes('AUTH_CHANGE');
  const hasSchema = classification.riskFlags.includes('SCHEMA_CHANGE');
  const hasConfig = classification.riskFlags.includes('CONFIG_CHANGE');

  if (hasAuth && hasSchema) {
    return {
      decision: 'BLOCK',
      reason: 'Authentication and schema changes together exceed the Phase 1 safety floor.',
      risk_level: 'CRITICAL',
      violated_rules: [
        ...classification.matchedRuleIds,
        'rule-auth-schema-combination',
      ],
      next_action: 'Stop and split the change into a reviewed plan before saving.',
      source: 'RULE',
      fallback_cause: 'NONE',
      lease_status: 'BYPASSED',
    };
  }

  if (hasAuth) {
    return {
      decision: 'REQUIRE_PLAN',
      reason: 'Authentication-sensitive paths require an explicit plan acknowledgment.',
      risk_level: classification.riskLevel === 'LOW' ? 'HIGH' : classification.riskLevel,
      violated_rules: classification.matchedRuleIds,
      next_action: 'Capture intent before proceeding with this save.',
      source: 'RULE',
      fallback_cause: 'NONE',
      lease_status: 'BYPASSED',
    };
  }

  if (hasConfig) {
    return {
      decision: 'REQUIRE_PLAN',
      reason: 'Configuration-sensitive files require plan-backed intent before save.',
      risk_level: classification.riskLevel === 'LOW' ? 'HIGH' : classification.riskLevel,
      violated_rules: classification.matchedRuleIds,
      next_action: 'Review the configuration impact and acknowledge the save.',
      source: 'RULE',
      fallback_cause: 'NONE',
      lease_status: 'BYPASSED',
    };
  }

  if (hasSchema) {
    return {
      decision: 'WARN',
      reason: 'Schema-oriented files require additional review before merge.',
      risk_level: classification.riskLevel === 'LOW' ? 'MEDIUM' : classification.riskLevel,
      violated_rules: classification.matchedRuleIds,
      next_action: 'Proceed only after confirming schema-side effects.',
      source: 'RULE',
      fallback_cause: 'NONE',
      lease_status: 'BYPASSED',
    };
  }

  return {
    decision: decisionForRisk(classification.riskLevel),
    reason:
      classification.riskFlags.length === 0
        ? 'No Phase 1 heuristic rules were matched.'
        : 'Risk was determined from heuristic path matching.',
    risk_level: classification.riskLevel,
    violated_rules: classification.matchedRuleIds,
    next_action:
      classification.riskFlags.length === 0
        ? 'Continue with the save.'
        : input.saveMode === 'EXPLICIT'
          ? 'Continue with the explicit save.'
          : 'Review the risk before the save proceeds.',
    source: 'RULE',
    fallback_cause: 'NONE',
    lease_status: 'BYPASSED',
  };
}
