import path from 'node:path';
import * as vscode from 'vscode';
import type { AssessedSave, DirectiveProofInput } from './contracts/types';
import { isValidDirectiveId } from './core/blueprintArtifacts';
import { RoutePolicyStore } from './core/routerPolicy';
import { LocalReviewSurfaceService } from './extension/reviewSurfaces';
import { renderRuntimeStatusMarkdown } from './extension/runtimeStatus';
import { SaveLifecycleController } from './extension/saveLifecycleController';
import { SaveOrchestrator } from './extension/saveOrchestrator';
import { WelcomeSurfaceService } from './extension/welcomeSurface';
import { resolveWorkspaceTarget } from './extension/workspaceTargeting';

function autoSaveMode():
  | 'off'
  | 'afterDelay'
  | 'onFocusChange'
  | 'onWindowChange' {
  const configured = vscode.workspace
    .getConfiguration('files')
    .get<string>('autoSave', 'off');

  switch (configured) {
    case 'afterDelay':
    case 'onFocusChange':
    case 'onWindowChange':
      return configured;
    case 'off':
    default:
      return 'off';
  }
}

function selectionText(document: vscode.TextDocument): string | undefined {
  const activeEditor = vscode.window.activeTextEditor;
  if (
    !activeEditor ||
    activeEditor.document.uri.toString() !== document.uri.toString()
  ) {
    return undefined;
  }

  const selection = activeEditor.selection;
  if (selection.isEmpty) {
    return undefined;
  }

  return document.getText(selection);
}

function fullDocumentRange(document: vscode.TextDocument): vscode.Range {
  const start = new vscode.Position(0, 0);
  const end = document.lineAt(document.lineCount - 1).range.end;
  return new vscode.Range(start, end);
}

function saveModeFromReason(
  reason: vscode.TextDocumentSaveReason,
): 'EXPLICIT' | 'AUTO' {
  return reason === vscode.TextDocumentSaveReason.Manual ? 'EXPLICIT' : 'AUTO';
}

async function openMarkdownPreview(
  title: string,
  content: string,
): Promise<void> {
  const document = await vscode.workspace.openTextDocument({
    content,
    language: 'markdown',
  });
  await vscode.window.showTextDocument(document, {
    preview: true,
    viewColumn: vscode.ViewColumn.Beside,
  });
  void title;
}

async function promptForDirectiveId(): Promise<string | undefined> {
  return vscode.window.showInputBox({
    title: 'LINTEL REQUIRE_PLAN proof',
    prompt: 'Enter the directive ID that authorizes this save.',
    placeHolder: 'LINTEL-PH5-001',
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (!value.trim()) {
        return 'Directive ID is required for REQUIRE_PLAN saves.';
      }

      return isValidDirectiveId(value.trim())
        ? undefined
        : 'Use an uppercase, hyphenated directive ID such as LINTEL-PH5-001.';
    },
  });
}

async function collectRequirePlanProof(
  orchestrator: SaveOrchestrator,
  assessment: AssessedSave,
): Promise<{ acknowledged: boolean; proof?: DirectiveProofInput }> {
  const directiveId = (await promptForDirectiveId())?.trim();
  if (!directiveId) {
    return { acknowledged: false };
  }

  let resolution = orchestrator.validateBlueprintProof({
    directiveId,
    blueprintMode: 'LOCAL_ONLY',
  });

  if (resolution.status === 'MISSING_ARTIFACT') {
    const choice = await vscode.window.showWarningMessage(
      `[LINTEL] ${resolution.reason}`,
      { modal: true },
      'Create Blueprint',
      'Cancel',
    );

    if (choice !== 'Create Blueprint') {
      return {
        acknowledged: false,
        proof: { directiveId, blueprintMode: 'LOCAL_ONLY' },
      };
    }

    const created = orchestrator.ensureBlueprintTemplate(directiveId);
    const blueprintDocument = await vscode.workspace.openTextDocument(
      created.blueprintPath,
    );
    await vscode.window.showTextDocument(blueprintDocument, { preview: false });
    resolution = orchestrator.validateBlueprintProof({
      directiveId,
      blueprintId: created.blueprintId,
      blueprintMode: 'LOCAL_ONLY',
    });
  }

  if (!resolution.ok || !resolution.link) {
    void vscode.window.showWarningMessage(`[LINTEL] ${resolution.reason}`, {
      modal: true,
    });
    return {
      acknowledged: false,
      proof: {
        directiveId,
        blueprintId: resolution.link?.blueprintId,
        blueprintMode: 'LOCAL_ONLY',
      },
    };
  }

  const continueChoice = await vscode.window.showWarningMessage(
    `[LINTEL] REQUIRE_PLAN: ${assessment.decision.reason}\nDirective ${directiveId} linked to ${resolution.link.blueprintId}.`,
    { modal: true },
    'Continue',
    'Cancel',
  );

  return {
    acknowledged: continueChoice === 'Continue',
    proof: {
      directiveId,
      blueprintId: resolution.link.blueprintId,
      blueprintMode: 'LOCAL_ONLY',
    },
  };
}

export function activate(context: vscode.ExtensionContext): void {
  const workspaceFolderRoots =
    vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) ?? [];
  const fallbackRoot = context.globalStorageUri.fsPath;
  const orchestrators = new Map<string, SaveOrchestrator>();
  const controllers = new Map<string, SaveLifecycleController>();
  const reviewSurfaces = new Map<string, LocalReviewSurfaceService>();
  const welcomeSurface = new WelcomeSurfaceService(context);

  function targetFor(filePath?: string) {
    return resolveWorkspaceTarget(filePath, workspaceFolderRoots, fallbackRoot);
  }

  function orchestratorFor(filePath?: string): SaveOrchestrator {
    const target = targetFor(filePath);
    const cached = orchestrators.get(target.effectiveRoot);
    if (cached) {
      return cached;
    }

    const created = new SaveOrchestrator(target.effectiveRoot);
    orchestrators.set(target.effectiveRoot, created);
    return created;
  }

  function controllerFor(filePath?: string): SaveLifecycleController {
    const target = targetFor(filePath);
    const cached = controllers.get(target.effectiveRoot);
    if (cached) {
      return cached;
    }

    const created = new SaveLifecycleController(orchestratorFor(filePath));
    controllers.set(target.effectiveRoot, created);
    return created;
  }

  function reviewSurfaceFor(filePath?: string): LocalReviewSurfaceService {
    const target = targetFor(filePath);
    const cached = reviewSurfaces.get(target.effectiveRoot);
    if (cached) {
      return cached;
    }

    const created = new LocalReviewSurfaceService(target.effectiveRoot);
    reviewSurfaces.set(target.effectiveRoot, created);
    return created;
  }

  // Show welcome surface on first activation (bounded onboarding)
  if (welcomeSurface.shouldShowWelcome()) {
    void welcomeSurface.showWelcome();
    void welcomeSurface.markWelcomeShown();
  }

  for (const document of vscode.workspace.textDocuments) {
    controllerFor(document.uri.fsPath).primeCommittedSnapshot(
      document.uri.fsPath,
      document.getText(),
    );
  }

  const mode = autoSaveMode();
  if (mode === 'afterDelay' || mode === 'onFocusChange') {
    void vscode.window.showInformationMessage(
      `[LINTEL] Reduced-guarantee auto-save mode detected (${mode}). Explicit save remains the preferred path.`,
    );
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('lintel.showWelcome', async () => {
      await welcomeSurface.showWelcome();
    }),
    vscode.commands.registerCommand('lintel.reviewAudit', async () => {
      const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
      await openMarkdownPreview(
        'LINTEL Audit Review',
        reviewSurfaceFor(filePath).renderAuditReview(),
      );
    }),
    vscode.commands.registerCommand('lintel.showRuntimeStatus', async () => {
      const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
      const target = targetFor(filePath);
      const routePolicy = new RoutePolicyStore(target.effectiveRoot).load();
      await openMarkdownPreview(
        'LINTEL Active Workspace Status',
        renderRuntimeStatusMarkdown({
          target,
          autoSaveMode: mode,
          routePolicy,
        }),
      );
    }),
    vscode.commands.registerCommand('lintel.reviewBlueprints', async () => {
      const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
      await openMarkdownPreview(
        'LINTEL Blueprint Review',
        reviewSurfaceFor(filePath).renderBlueprintReview(),
      );
    }),
    vscode.commands.registerCommand('lintel.reviewFalsePositives', async () => {
      const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
      await openMarkdownPreview(
        'LINTEL False-Positive Review',
        reviewSurfaceFor(filePath).renderFalsePositiveReview(),
      );
    }),
    vscode.workspace.onDidOpenTextDocument((document) => {
      controllerFor(document.uri.fsPath).primeCommittedSnapshot(
        document.uri.fsPath,
        document.getText(),
      );
    }),
    vscode.workspace.onWillSaveTextDocument((event) => {
      event.waitUntil(
        (async () => {
          const controller = controllerFor(event.document.uri.fsPath);
          const orchestrator = orchestratorFor(event.document.uri.fsPath);
          const currentText = event.document.getText();
          if (
            controller.consumeRestoreBypass(
              event.document.uri.fsPath,
              currentText,
            )
          ) {
            return [];
          }

          const assessment = await controller.prepareSave({
            filePath: event.document.uri.fsPath,
            fileName: path.basename(event.document.uri.fsPath),
            text: currentText,
            saveMode: saveModeFromReason(event.reason),
            autoSaveMode: mode,
            selectionText: selectionText(event.document),
          });

          if (assessment.reducedGuaranteeNotice) {
            void assessment.reducedGuaranteeNotice;
          }

          if (
            assessment.decision.decision === 'ALLOW' ||
            assessment.decision.lease_status === 'REUSED'
          ) {
            controller.finalizeSave(assessment, true);
            return [];
          }

          if (assessment.decision.decision === 'BLOCK') {
            controller.finalizeSave(assessment, false);
            void vscode.window.showErrorMessage(
              `[LINTEL] BLOCK: ${assessment.decision.reason}`,
              { modal: true },
            );
            return [];
          }

          if (
            assessment.shouldPrompt &&
            assessment.decision.decision === 'REQUIRE_PLAN'
          ) {
            const planFlow = await collectRequirePlanProof(
              orchestrator,
              assessment,
            );
            controller.finalizeSave(
              assessment,
              planFlow.acknowledged,
              planFlow.proof,
            );
            return [];
          }

          if (assessment.shouldPrompt) {
            const choice = await vscode.window.showWarningMessage(
              `[LINTEL] ${assessment.decision.decision}: ${assessment.decision.reason}`,
              { modal: true },
              'Continue',
              'Cancel',
            );

            controller.finalizeSave(assessment, choice === 'Continue');
            return [];
          }

          controller.finalizeSave(assessment, false);
          return [];
        })(),
      );
    }),
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      const restore = controllerFor(document.uri.fsPath).handleDidSave(
        document.uri.fsPath,
        document.getText(),
      );
      if (!restore) {
        return;
      }

      const edit = new vscode.WorkspaceEdit();
      edit.replace(
        document.uri,
        fullDocumentRange(document),
        restore.restoreText,
      );
      await vscode.workspace.applyEdit(edit);
      void vscode.window.showWarningMessage(
        `[LINTEL] Save reverted: ${restore.reason}`,
        { modal: true },
      );
    }),
  );
}

export function deactivate(): void {
  // no-op for Phase 5
}
