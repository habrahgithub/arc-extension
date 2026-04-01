/**
 * P9-002 — Inline Context On-Demand Explanation (pure, no vscode dependency)
 *
 * Produces a plain-text explanation for the current file's audit state.
 * Output is max 6-8 lines, no markdown, appended to the ARC Output Channel.
 */

import type { FileAuditState } from './fileAuditState';

export interface FileStateExplanation {
  readonly lines: readonly string[];
}

/**
 * Builds a plain-text explanation of the current audit state for a file.
 *
 * Rules:
 *   VERIFIED     — file has a SAVE entry; commit drift check passed (or no commit yet)
 *   DRIFT        — file has a SAVE entry; linked commit diff diverged from recorded decision
 *   NO_DECISION  — no SAVE entry exists; file has not been assessed by ARC
 *   UNKNOWN      — state could not be determined (no active file or query error)
 *
 * Footer line is always appended: "Use: ARC: Show Decision Timeline"
 */
export function explainFileState(
  state: FileAuditState,
  filePath: string | undefined,
): FileStateExplanation {
  const label = filePath ? filePath.split('/').pop() ?? filePath : '(no file)';

  switch (state) {
    case 'VERIFIED':
      return {
        lines: [
          `ARC: File state for ${label}`,
          'Status: VERIFIED',
          'This file has at least one ARC-governed save on record.',
          'If a commit has been observed, the committed content matched the recorded decision.',
          'No drift was detected between the save decision and the committed output.',
          'Use: ARC: Show Decision Timeline',
        ],
      };

    case 'DRIFT':
      return {
        lines: [
          `ARC: File state for ${label}`,
          'Status: DRIFT',
          'This file has a recorded save decision, but the committed content diverged from it.',
          'The commit fingerprint did not match the fingerprint in the save record.',
          'This does not block execution. It is a signal that the committed state was not assessed.',
          'Use: ARC: Show Decision Timeline',
        ],
      };

    case 'NO_DECISION':
      return {
        lines: [
          `ARC: File state for ${label}`,
          'Status: NO DECISION',
          'No ARC-governed save entry exists for this file.',
          'The file has not been assessed by the ARC rule engine in this workspace.',
          'Save the file with ARC active to generate an assessment record.',
          'Use: ARC: Show Decision Timeline',
        ],
      };

    case 'UNKNOWN':
    default:
      return {
        lines: [
          'ARC: File state',
          'Status: UNKNOWN',
          'No active file is open, or the audit state could not be determined.',
          'Open a file and ensure ARC is active in this workspace.',
          'Use: ARC: Show Decision Timeline',
        ],
      };
  }
}
