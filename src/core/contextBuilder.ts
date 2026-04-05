import type {
  Classification,
  ContextPayload,
  SaveInput,
  TaskContextPacket,
} from '../contracts/types';

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
  taskContext?: TaskContextPacket | null,
): ContextPayload {
  const base: ContextPayload = {
    file_path: classification.filePath,
    risk_flags: classification.riskFlags,
    matched_rule_ids: classification.matchedRuleIds,
    last_decision: input.lastDecision,
    excerpt: trimExcerpt(input.selectionText),
    heuristic_only: true,
  };

  // U10 — Inject bounded task context (Warden C1: only task_id, task_summary, task_status)
  // Warden C3: Only injected into local model context — cloud routes must not receive this
  // Warden C5: Advisory metadata only — does not influence save authorization
  if (taskContext) {
    base.task_id = taskContext.task_id;
    base.task_summary = taskContext.task_summary;
    base.task_status = taskContext.task_status;
  }

  return base;
}
