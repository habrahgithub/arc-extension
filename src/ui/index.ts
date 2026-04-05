/**
 * ARC UI Module — Internal Review Surface Upgrade
 *
 * ARC-UI-001a: Screen 1 (Review Home) — COMPLETE
 * ARC-UI-001b: Screen 2 (Runtime Status) + Screen 3 (Audit Review) — COMPLETE
 * ARC-UI-001c: Screen 4 (Blueprint Proof) + Screen 5 (False-Positive) + Screen 6 (Guided Workflow) — COMPLETE
 * ARC-VIS-001: Decision Feed + Audit Timeline + Why Panel — COMPLETE
 * ARC-BRAND-001: Logo integration — COMPLETE
 * ARC-UX-VALIDATION-001: First-run UX validation — IN PROGRESS
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
// ARC-VIS-001: Decision Visibility Layer
import { createDecisionFeedPanel } from './webview/DecisionFeed';
import { createAuditTimelinePanel } from './webview/AuditTimeline';
import { createWhyPanelPanel } from './webview/WhyPanel';
// Phase 7.10 — Task Board v1 (ARC-UI-002)
import { createTaskBoardPanel } from './webview/TaskBoard';
// Phase 7.11 — Liquid Shell (ARC-UI-003)
import { createLiquidShellPanel } from './webview/LiquidShell';

/**
 * Register all ARC-UI commands
 *
 * OBS-S-7039: UI registration in extension.ts
 * OBS-S-7051: Command IDs declared
 * ARC-BRAND-001: Pass context for logo loading
 */
export function registerUiCommands(context: vscode.ExtensionContext): void {
  // Screen 1: Review Home (ARC-UI-001a, ARC-BRAND-001)
  context.subscriptions.push(
    vscode.commands.registerCommand('arc.ui.reviewHome', () => {
      const panel = createReviewHomePanel(context);

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

  // ARC-VIS-001: Decision Visibility Layer (ARC-BRAND-001)
  context.subscriptions.push(
    vscode.commands.registerCommand('arc.ui.decisionFeed', () => {
      createDecisionFeedPanel(context);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('arc.ui.auditTimeline', () => {
      createAuditTimelinePanel(context);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('arc.ui.whyPanel', () => {
      createWhyPanelPanel(context);
    }),
  );

  // Phase 7.10 — Task Board v1 (ARC-UI-002)
  context.subscriptions.push(
    vscode.commands.registerCommand('arc.ui.taskBoard', () => {
      createTaskBoardPanel(context);
    }),
  );

  // Phase 7.11 — Liquid Shell (ARC-UI-003)
  context.subscriptions.push(
    vscode.commands.registerCommand('arc.ui.liquidShell', () => {
      createLiquidShellPanel(context);
    }),
  );
}

/**
 * UI Layer dependency direction (OBS-S-7036)
 *
 * This module depends on:
 * - vscode Extension API
 * - Existing extension commands (arc.*)
 *
 * This module does NOT:
 * - Write to audit state
 * - Modify proof artifacts
 * - Change enforcement behavior
 * - Access core layer directly
 */
