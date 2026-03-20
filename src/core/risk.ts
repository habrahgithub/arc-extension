import type { Decision, RiskLevel } from '../contracts/types';

export const RISK_ORDER: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function maxRisk(levels: RiskLevel[]): RiskLevel {
  if (levels.length === 0) {
    return 'LOW';
  }

  return levels.reduce((current, next) =>
    RISK_ORDER.indexOf(next) > RISK_ORDER.indexOf(current) ? next : current,
  );
}

export function demoteRisk(level: RiskLevel): RiskLevel {
  const index = RISK_ORDER.indexOf(level);
  if (index <= 0) {
    return level;
  }
  return RISK_ORDER[index - 1] ?? level;
}

export function decisionForRisk(level: RiskLevel): Decision {
  switch (level) {
    case 'CRITICAL':
      return 'BLOCK';
    case 'HIGH':
      return 'REQUIRE_PLAN';
    case 'MEDIUM':
      return 'WARN';
    case 'LOW':
    default:
      return 'ALLOW';
  }
}
