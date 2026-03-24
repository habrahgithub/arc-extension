/**
 * ARC UI Module — Internal Review Surface Upgrade (ARC-UI-001)
 *
 * Registers all 6 active UI screens:
 * 1. Review Home — Navigation hub
 * 2. Runtime Status — Decision context display
 * 3. Audit Review — Entry inspection
 * 4. Blueprint Proof Review — Proof lifecycle
 * 5. False-Positive Review — Advisory candidates
 * 6. Guided Proof Workflow — Instructional guidance
 *
 * Excludes Screen 7 (Command Centre) — Parked future concept (WRD-0095)
 */

import * as vscode from 'vscode';
import {
  createReviewHomePanel,
  handleReviewHomeMessage,
} from './webview/ReviewHome';

/**
 * Register all ARC-UI-001 commands
 *
 * These commands create WebviewPanels for existing review functions
 */
export function registerUiCommands(context: vscode.ExtensionContext): void {
  // Screen 1: Review Home
  context.subscriptions.push(
    vscode.commands.registerCommand('arc.ui.reviewHome', () => {
      const panel = createReviewHomePanel();

      panel.webview.onDidReceiveMessage(
        (message) => handleReviewHomeMessage(message),
        undefined,
        context.subscriptions,
      );
    }),
  );

  // Note: Screens 2-6 will use existing commands with WebviewPanel enhancement
  // - lintel.showRuntimeStatus
  // - lintel.reviewAudit
  // - lintel.reviewBlueprints
  // - lintel.reviewFalsePositives
  // Guided Proof Workflow is instructional guidance within existing flows
}

/**
 * UI Layer dependency direction (OBS-S-7036)
 *
 * This module depends on:
 * - vscode Extension API
 * - Existing extension commands (lintel.*)
 *
 * This module does NOT:
 * - Write to audit state
 * - Modify proof artifacts
 * - Change enforcement behavior
 * - Access core layer directly
 */
