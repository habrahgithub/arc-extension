import type {
  Classification,
  Decision,
  DecisionPayload,
  FallbackCause,
  ModelEvaluationResult,
  RiskLevel,
} from '../contracts/types';

const DECISION_ORDER: Decision[] = ['ALLOW', 'WARN', 'REQUIRE_PLAN', 'BLOCK'];

function compareDecisionSeverity(left: Decision, right: Decision): number {
  return DECISION_ORDER.indexOf(left) - DECISION_ORDER.indexOf(right);
}

function stricterDecision(left: Decision, right: Decision): Decision {
  return compareDecisionSeverity(left, right) >= 0 ? left : right;
}

export function minimumFloorForRisk(riskLevel: RiskLevel): Decision {
  switch (riskLevel) {
    case 'CRITICAL':
      return 'REQUIRE_PLAN';
    case 'HIGH':
      return 'WARN';
    case 'MEDIUM':
      return 'WARN';
    case 'LOW':
    default:
      return 'ALLOW';
  }
}

export function enforceMinimumFloor(
  ruleDecision: DecisionPayload,
  classification: Classification,
  modelDecision?: ModelEvaluationResult,
): DecisionPayload {
  if (!modelDecision) {
    return ruleDecision;
  }

  const minimumFloor = stricterDecision(
    minimumFloorForRisk(classification.riskLevel),
    ruleDecision.decision,
  );

  const decision = stricterDecision(modelDecision.decision, minimumFloor);
  const fallbackCause: FallbackCause =
    decision === modelDecision.decision ? 'NONE' : 'ENFORCEMENT_FLOOR';

  return {
    decision,
    reason: modelDecision.reason,
    risk_level: stricterRiskLevel(modelDecision.risk_level, ruleDecision.risk_level),
    violated_rules: uniqueStrings([
      ...ruleDecision.violated_rules,
      ...modelDecision.violated_rules,
    ]),
    next_action: modelDecision.next_action,
    source: 'MODEL',
    fallback_cause: fallbackCause,
    lease_status: 'BYPASSED',
  };
}

function riskRank(level: RiskLevel): number {
  return ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].indexOf(level);
}

function stricterRiskLevel(left: RiskLevel, right: RiskLevel): RiskLevel {
  return riskRank(left) >= riskRank(right) ? left : right;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
