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
  { text: string; tooltip: string; color: string }
> = {
  READY: {
    text: '$(shield-check) ARC XT',
    tooltip: 'ARC XT — Current file posture: allow',
    color: '#00ff00',
  },
  AUTO_SAVE: {
    text: '$(clock) ARC XT',
    tooltip:
      'ARC XT — Auto-save detected: Reduced guarantee mode (explicit saves recommended)',
    color: '#ffa500',
  },
  BLOCKED: {
    text: '$(stop) ARC XT',
    tooltip: 'ARC XT — Current file posture: block',
    color: '#ff0000',
  },
  WARNED: {
    text: '$(alert) ARC XT',
    tooltip: 'ARC XT — Current file posture: warn',
    color: '#ffa500',
  },
  REQUIRE_PLAN: {
    text: '$(link) ARC XT',
    tooltip: 'ARC XT — Current file posture: requires blueprint proof',
    color: '#007acc',
  },
  ERROR: {
    text: '$(error) ARC XT',
    tooltip:
      'ARC XT — Extension error: Enforcement may be degraded; check output panel',
    color: '#ff0000',
  },
};

export class StatusBarItemService {
  private statusBarItem: vscode.StatusBarItem;
  private currentStatus: EnforcementStatus | 'IDLE' = 'IDLE';

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100, // Priority (higher = more to the right)
    );
    this.statusBarItem.command = 'arc.showRuntimeStatus';
    this.statusBarItem.text = '$(shield) ARC XT';
    this.statusBarItem.tooltip = 'ARC XT — waiting for first file assessment';
    this.statusBarItem.color = undefined;
    this.statusBarItem.show();
  }

  /**
   * Update the status bar to reflect current enforcement state.
   */
  updateStatus(status: EnforcementStatus): void {
    this.currentStatus = status;
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
