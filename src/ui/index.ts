/**
 * ARC UI Module — Internal Review Surface Upgrade
 *
 * ARC-UI-001a: Screen 1 (Review Home) — COMPLETE
 * ARC-UI-001b: Screen 2 (Runtime Status) + Screen 3 (Audit Review) — COMPLETE
 * ARC-UI-001c: Screen 4 (Blueprint Proof) + Screen 5 (False-Positive) + Screen 6 (Guided Workflow) — IN PROGRESS
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
import { createBlueprintProofReviewPanel } from './webview/BlueprintProofReview';
import { createFalsePositiveReviewPanel } from './webview/FalsePositiveReview';
import { createGuidedProofWorkflowPanel } from './webview/GuidedProofWorkflow';

/**
 * Register all ARC-UI commands
 *
 * OBS-S-7039: UI registration in extension.ts
 * OBS-S-7051: Command IDs declared
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

  // Screen 4: Blueprint Proof Review (ARC-UI-001c)
  context.subscriptions.push(
    vscode.commands.registerCommand('arc.ui.blueprintProof', () => {
      createBlueprintProofReviewPanel();
    }),
  );

  // Screen 5: False-Positive Review (ARC-UI-001c)
  context.subscriptions.push(
    vscode.commands.registerCommand('arc.ui.falsePositiveReview', () => {
      createFalsePositiveReviewPanel();
    }),
  );

  // Screen 6: Guided Proof Workflow (ARC-UI-001c)
  context.subscriptions.push(
    vscode.commands.registerCommand('arc.ui.guidedWorkflow', () => {
      createGuidedProofWorkflowPanel();
    }),
  );
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
