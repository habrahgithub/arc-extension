import type { Classification, ContextPayload, SaveInput } from '../contracts/types';

const EXCERPT_LIMIT = 160;

export function trimExcerpt(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > EXCERPT_LIMIT
    ? `${compact.slice(0, EXCERPT_LIMIT)}…`
    : compact;
}

export function buildContext(
  classification: Classification,
  input: SaveInput,
): ContextPayload {
  return {
    file_path: classification.filePath,
    risk_flags: classification.riskFlags,
    matched_rule_ids: classification.matchedRuleIds,
    last_decision: input.lastDecision,
    excerpt: trimExcerpt(input.selectionText),
    heuristic_only: true,
  };
}
