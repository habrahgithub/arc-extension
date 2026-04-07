import * as vscode from 'vscode';
import type { Decision } from '../contracts/types.js';

/**
 * Status Bar Item — Passive Enforcement Indicator
 *
 * Provides a always-visible indicator of ARC XT enforcement status in the VS Code status bar.
 * This is a passive display only — it does not authorize, modify, or bypass enforcement.
 *
 * Governance Anchors:
 * - ARC-UX-002: Passive enforcement indicator for operator visibility
 * - WRD-0068: Wording truthfulness (no implication of readiness beyond actual state)
 */

export type EnforcementStatus =
  | 'READY' // Active file posture is allow / no blocking state shown
  | 'AUTO_SAVE' // Auto-save detected (reduced guarantee mode)
  | 'BLOCKED' // Current file posture is blocked
  | 'WARNED' // Current file posture is warn
  | 'REQUIRE_PLAN' // Current file posture requires blueprint proof
  | 'ERROR'; // Extension encountered an error; enforcement may be degraded;

const STATUS_CONFIG: Record<
  EnforcementStatus,
  { text: string; tooltip: string; color: string | undefined }
> = {
  READY: {
    text: '$(shield-check) ARC',
    tooltip: 'ARC found no issues in the current file.',
    color: undefined, // inherits theme default — no aggressive green
  },
  AUTO_SAVE: {
    text: '$(clock) ARC',
    tooltip: 'ARC is monitoring save events. Explicit saves are recommended.',
    color: undefined,
  },
  BLOCKED: {
    text: '$(stop) ARC',
    tooltip: 'ARC blocked this save. Click to review the issue.',
    color: undefined,
  },
  WARNED: {
    text: '$(alert) ARC',
    tooltip: 'ARC flagged an issue. Click to review.',
    color: undefined,
  },
  REQUIRE_PLAN: {
    text: '$(link) ARC',
    tooltip: 'This change needs a linked blueprint. Click to review.',
    color: undefined,
  },
  ERROR: {
    text: '$(error) ARC',
    tooltip: 'ARC hit an error. Enforcement may be degraded.',
    color: undefined,
  },
};

export class StatusBarItemService {
  private statusBarItem: vscode.StatusBarItem;
  private currentStatus: EnforcementStatus | 'IDLE' = 'IDLE';
  private issueCount: number = 0;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.statusBarItem.command = 'arc.ui.liquidShell';
    this.statusBarItem.text = '$(shield) ARC';
    this.statusBarItem.tooltip = 'ARC is monitoring save events.';
    this.statusBarItem.color = undefined;
    this.statusBarItem.show();
  }

  /** Update the status bar to reflect current enforcement state. */
  updateStatus(status: EnforcementStatus, issues?: number): void {
    this.currentStatus = status;
    if (issues !== undefined) this.issueCount = issues;
    const config = STATUS_CONFIG[status];

    this.statusBarItem.text = config.text;
    this.statusBarItem.tooltip = config.tooltip;
    this.statusBarItem.color = config.color;
  }

  /** Check if status has not yet been assessed */
  isIdle(): boolean {
    return this.currentStatus === 'IDLE';
  }

  /**
   * Update status based on auto-save detection.
   */
  updateAutoSaveMode(
    autoSaveMode: 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange',
  ): void {
    if (autoSaveMode !== 'off') {
      this.updateStatus('AUTO_SAVE');
    } else if (this.currentStatus === 'AUTO_SAVE') {
      this.updateStatus('READY');
    }
  }

  /**
   * Update status based on an enforcement decision for the current file context.
   * When a save is reverted/cancelled, the indicator remains blocked until a
   * fresh current-file assessment replaces it.
   */
  updateFromDecision(decision: Decision, reverted: boolean = false): void {
    if (reverted) {
      this.updateStatus('BLOCKED');
      return;
    }

    this.applyDecisionStatus(decision);
  }

  updateFromAssessment(decision: Decision): void {
    this.applyDecisionStatus(decision);
  }

  private applyDecisionStatus(decision: Decision): void {
    switch (decision) {
      case 'BLOCK':
        this.updateStatus('BLOCKED');
        break;
      case 'WARN':
        this.updateStatus('WARNED');
        break;
      case 'REQUIRE_PLAN':
        this.updateStatus('REQUIRE_PLAN');
        break;
      case 'ALLOW':
      default: {
        // Return to READY or AUTO_SAVE based on current mode
        const autoSaveMode = vscode.workspace
          .getConfiguration('files')
          .get<string>('autoSave', 'off');
        this.updateAutoSaveMode(
          autoSaveMode as
            | 'off'
            | 'afterDelay'
            | 'onFocusChange'
            | 'onWindowChange',
        );
        break;
      }
    }
  }

  /**
   * Set status to error state.
   */
  updateError(): void {
    this.updateStatus('ERROR');
  }

  /**
   * Refresh status bar (e.g., after configuration change).
   */
  refresh(): void {
    const autoSaveMode = vscode.workspace
      .getConfiguration('files')
      .get<string>('autoSave', 'off');

    if (autoSaveMode !== 'off') {
      this.updateStatus('AUTO_SAVE');
    } else {
      this.updateStatus('READY');
    }
  }

  /**
   * Dispose of the status bar item.
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }
}
