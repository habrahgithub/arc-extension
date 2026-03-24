/**
 * ARC UI Module — Internal Review Surface Upgrade
 *
 * ARC-UI-001a: Screen 1 (Review Home) — COMPLETE
 * ARC-UI-001b: Screen 2 (Runtime Status) + Screen 3 (Audit Review) — IN PROGRESS
 * ARC-UI-001c: Screens 4-6 — PENDING
 *
 * Excludes Screen 7 (Command Centre) — Parked future concept (WRD-0095)
 */

import * as vscode from 'vscode';
import {
  createReviewHomePanel,
  handleReviewHomeMessage,
} from './webview/ReviewHome';
import { createRuntimeStatusPanel } from './webview/RuntimeStatus';
import { createAuditReviewPanel } from './webview/AuditReview';

/**
 * Register all ARC-UI commands
 *
 * OBS-S-7039: UI registration in extension.ts
 */
export function registerUiCommands(context: vscode.ExtensionContext): void {
  // Screen 1: Review Home (ARC-UI-001a)
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

  // Screen 2: Runtime Status (ARC-UI-001b)
  context.subscriptions.push(
    vscode.commands.registerCommand('arc.ui.runtimeStatus', () => {
      createRuntimeStatusPanel();
    }),
  );

  // Screen 3: Audit Review (ARC-UI-001b)
  context.subscriptions.push(
    vscode.commands.registerCommand('arc.ui.auditReview', () => {
      createAuditReviewPanel();
    }),
  );

  // Note: Screens 4-6 deferred to ARC-UI-001c
  // - lintel.reviewBlueprints (Screen 4)
  // - lintel.reviewFalsePositives (Screen 5)
  // - Guided Proof Workflow (Screen 6)
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
