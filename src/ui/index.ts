/**
 * ARC UI Module — Command Registrations
 *
 * All user-facing surfaces route through the main ARC panel.
 * Legacy panel commands removed (merged into panel tabs).
 */

import * as vscode from 'vscode';
import { createRuntimeStatusPanel } from './webview/RuntimeStatus';
import { createAuditReviewPanel } from './webview/AuditReview';
import { createBlueprintProofReviewPanel } from './webview/BlueprintProofReview';
import { createFalsePositiveReviewPanel } from './webview/FalsePositiveReview';
import { createGuidedProofWorkflowPanel } from './webview/GuidedProofWorkflow';
import { createTaskBoardPanel } from './webview/TaskBoard';
import { createLiquidShellPanel } from './webview/LiquidShell';

/**
 * Register all ARC-UI commands.
 * Only surfaces that are actually user-facing remain registered.
 * DecisionFeed, AuditTimeline, WhyPanel, ReviewHome merged into main panel.
 */
export function registerUiCommands(context: vscode.ExtensionContext): void {
  // Runtime Status (standalone for Command Palette access)
  context.subscriptions.push(
    vscode.commands.registerCommand('arc.ui.runtimeStatus', () => {
      createRuntimeStatusPanel();
    }),
  );

  // Audit Review (standalone for Command Palette access)
  context.subscriptions.push(
    vscode.commands.registerCommand('arc.ui.auditReview', () => {
      createAuditReviewPanel();
    }),
  );

  // Blueprint Proof Review (standalone for Command Palette access)
  context.subscriptions.push(
    vscode.commands.registerCommand('arc.ui.blueprintProof', () => {
      createBlueprintProofReviewPanel();
    }),
  );

  // False-Positive Review (standalone for Command Palette access)
  context.subscriptions.push(
    vscode.commands.registerCommand('arc.ui.falsePositiveReview', () => {
      createFalsePositiveReviewPanel();
    }),
  );

  // Guided Proof Workflow (standalone for Command Palette access)
  context.subscriptions.push(
    vscode.commands.registerCommand('arc.ui.guidedWorkflow', () => {
      createGuidedProofWorkflowPanel();
    }),
  );

  // Task Board (standalone for Command Palette access)
  context.subscriptions.push(
    vscode.commands.registerCommand('arc.ui.taskBoard', () => {
      createTaskBoardPanel(context);
    }),
  );

  // Liquid Shell panel (debug/developer access via Command Palette)
  context.subscriptions.push(
    vscode.commands.registerCommand('arc.ui.liquidShell.panel', () => {
      createLiquidShellPanel(context);
    }),
  );
}
