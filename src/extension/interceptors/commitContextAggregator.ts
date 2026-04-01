/**
 * M4-001 — Commit Context Awareness
 *
 * Aggregates per-file drift/decision state at commit time into a structured
 * summary.  Logic is stateless and deterministic — no side effects, no I/O.
 */

export interface CommitContextSummary {
  readonly driftCount: number;
  readonly noDecisionCount: number;
  readonly verifiedCount: number;
}

/**
 * Aggregates rows from AuditLogWriter.queryCommitContext into counts.
 *
 * Classification:
 *   DRIFT_DETECTED                        → driftCount
 *   NO_LINKED_DECISION or null (no entry) → noDecisionCount
 *   NO_DRIFT | FINGERPRINT_UNAVAILABLE    → verifiedCount
 */
export function aggregateCommitContext(
  rows: { filePath: string; driftStatus: string | null }[],
): CommitContextSummary {
  let driftCount = 0;
  let noDecisionCount = 0;
  let verifiedCount = 0;

  for (const row of rows) {
    if (row.driftStatus === 'DRIFT_DETECTED') {
      driftCount++;
    } else if (
      row.driftStatus === 'NO_LINKED_DECISION' ||
      row.driftStatus === null
    ) {
      noDecisionCount++;
    } else {
      // NO_DRIFT or FINGERPRINT_UNAVAILABLE → verified
      verifiedCount++;
    }
  }

  return { driftCount, noDecisionCount, verifiedCount };
}

/**
 * Formats a commit context summary into a single output-channel message.
 *
 * Returns undefined when there is nothing actionable to surface (no drift and
 * no unlinked files).  This prevents noise on clean commits.
 */
export function formatCommitContextMessage(
  summary: CommitContextSummary,
): string | undefined {
  if (summary.driftCount === 0 && summary.noDecisionCount === 0) {
    return undefined;
  }

  const lines: string[] = ['ARC: Commit summary'];

  if (summary.driftCount > 0) {
    lines.push(
      `  - ${summary.driftCount} file${summary.driftCount === 1 ? '' : 's'} with drift`,
    );
  }

  if (summary.noDecisionCount > 0) {
    lines.push(
      `  - ${summary.noDecisionCount} file${summary.noDecisionCount === 1 ? '' : 's'} without decision`,
    );
  }

  if (summary.verifiedCount > 0) {
    lines.push(
      `  - ${summary.verifiedCount} file${summary.verifiedCount === 1 ? '' : 's'} verified`,
    );
  }

  return lines.join('\n');
}
