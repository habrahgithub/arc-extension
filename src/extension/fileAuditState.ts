/**
 * P9-001 — File-Level Audit State Resolution (pure, no vscode dependency)
 *
 * Testable state-mapping logic extracted from fileAuditIndicator.ts.
 */

export type FileAuditState = 'VERIFIED' | 'DRIFT' | 'NO_DECISION' | 'UNKNOWN';

/**
 * Maps a raw audit query result to a FileAuditState.
 *
 * Classification rules:
 *   null row                               → NO_DECISION  (no SAVE entry)
 *   driftStatus = 'DRIFT_DETECTED'         → DRIFT
 *   driftStatus = 'NO_DRIFT' |
 *                'FINGERPRINT_UNAVAILABLE' |
 *                null (no COMMIT yet)      → VERIFIED
 */
export function resolveFileAuditState(
  row: { decisionId: string; driftStatus: string | null } | null,
): FileAuditState {
  if (row === null) {
    return 'NO_DECISION';
  }
  if (row.driftStatus === 'DRIFT_DETECTED') {
    return 'DRIFT';
  }
  return 'VERIFIED';
}
