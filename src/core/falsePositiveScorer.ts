import type { AuditEntry } from '../contracts/types';

export function calculateFalsePositiveQualityScore(entry: AuditEntry): number {
  let score = 0;

  if (entry.decision === 'WARN') {
    score += 30;
  } else if (entry.decision === 'REQUIRE_PLAN') {
    score += 10;
  }

  if (entry.source === 'RULE' || entry.source === 'FALLBACK') {
    score += 20;
  }

  if (entry.matched_rules.length === 0) {
    score += 25;
  }

  if (
    entry.route_fallback === 'CONFIG_MISSING' ||
    entry.route_fallback === 'CONFIG_INVALID'
  ) {
    score += 15;
  }

  return score;
}

export function getFalsePositiveQualityLabel(entry: AuditEntry): string {
  const score = calculateFalsePositiveQualityScore(entry);
  if (score >= 50) {
    return '⚡ High (rule-only, no matched rules)';
  }
  if (score >= 30) {
    return '🔶 Medium (WARN decision, rule-only)';
  }
  return '🔷 Low (REQUIRE_PLAN or model-evaluated)';
}
