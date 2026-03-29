import * as vscode from 'vscode';
import type { Decision } from '../contracts/types';

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
  | 'READY' // Extension active, enforcement enabled
  | 'AUTO_SAVE' // Auto-save detected (reduced guarantee mode)
  | 'BLOCKED' // Last save was blocked
  | 'WARNED' // Last save required acknowledgment
  | 'REQUIRE_PLAN' // Last save required blueprint proof
  | 'ERROR'; // Extension encountered an error; enforcement may be degraded;

const STATUS_CONFIG: Record<
  EnforcementStatus,
  { text: string; tooltip: string; color: string }
> = {
  READY: {
    text: '$(shield-check) ARC XT',
    tooltip: 'ARC XT — Audit Ready Core: Enforcement active (explicit save)',
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
    tooltip: 'ARC XT — Last save blocked: High-risk change requires review',
    color: '#ff0000',
  },
  WARNED: {
    text: '$(alert) ARC XT',
    tooltip: 'ARC XT — Last save required acknowledgment: Medium-risk change',
    color: '#ffa500',
  },
  REQUIRE_PLAN: {
    text: '$(link) ARC XT',
    tooltip:
      'ARC XT — Last save required blueprint proof: High-risk change linked to governance directive',
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
  private currentStatus: EnforcementStatus = 'READY';

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100, // Priority (higher = more to the right)
    );
    this.statusBarItem.command = 'arc.showRuntimeStatus';
    this.statusBarItem.show();
    this.updateStatus('READY');
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
   * Update status based on last save decision.
   */
  updateFromDecision(decision: Decision, reverted: boolean = false): void {
    if (reverted) {
      this.updateStatus('BLOCKED');
      return;
    }

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
