/**
 * P9-001 — File-Level Audit Indicator
 *
 * Minimal status bar indicator showing the audit state of the active file.
 * Consumes existing ledger data only — no schema changes, no enforcement,
 * no interaction required.
 *
 * Governance anchors:
 * - WO-ARC-XT-P9-001: read-first UI, output-channel-only, deterministic
 */

import * as vscode from 'vscode';
import { type FileAuditState, resolveFileAuditState } from './fileAuditState';

export { type FileAuditState, resolveFileAuditState } from './fileAuditState';

interface StateConfig {
  text: string;
  tooltip: string;
  color: string | undefined;
}

const STATE_CONFIG: Record<FileAuditState, StateConfig> = {
  VERIFIED: {
    text: '$(check) ARC: VERIFIED',
    tooltip: 'ARC XT — File audit: decision linked, no drift detected',
    color: undefined, // neutral — inherits theme default
  },
  DRIFT: {
    text: '$(warning) ARC: DRIFT',
    tooltip: 'ARC XT — File audit: drift detected between save decision and commit',
    color: '#e8a000', // warning amber — not aggressive red
  },
  NO_DECISION: {
    text: '$(circle-slash) ARC: NO DECISION',
    tooltip: 'ARC XT — File audit: no governed save decision found for this file',
    color: '#888888', // muted gray
  },
  UNKNOWN: {
    text: '$(dash) ARC',
    tooltip: 'ARC XT — File audit: no data for active file',
    color: '#888888', // muted gray
  },
};

export class FileAuditIndicator implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      99, // one slot left of the enforcement indicator (priority 100)
    );
    // Hidden by default — the main StatusBarItemService provides the primary indicator.
    // This item is shown only when a specific audit state (DRIFT, VERIFIED) is resolved.
    this.setState('UNKNOWN');
  }

  /**
   * Update the indicator for a specific file using the audit log query result.
   * Called by the wiring layer whenever the active file or its audit state changes.
   */
  updateForFile(
    filePath: string | undefined,
    queryFn: (fp: string) => { decisionId: string; driftStatus: string | null } | null,
  ): void {
    if (!filePath) {
      this.setState('UNKNOWN');
      return;
    }

    try {
      const row = queryFn(filePath);
      this.setState(resolveFileAuditState(row));
    } catch {
      this.setState('UNKNOWN');
    }
  }

  private setState(state: FileAuditState): void {
    const config = STATE_CONFIG[state];
    this.item.text = config.text;
    this.item.tooltip = config.tooltip;
    this.item.color = config.color;
    // Only show when there's a meaningful state to display
    if (state === 'DRIFT' || state === 'VERIFIED') {
      this.item.show();
    } else {
      this.item.hide();
    }
  }

  dispose(): void {
    this.item.dispose();
  }
}
