import path from 'node:path';
import * as vscode from 'vscode';
import type { AssessedSave, DirectiveProofInput } from './contracts/types';
import { isValidDirectiveId } from './core/blueprintArtifacts';
import { LocalReviewSurfaceService } from './extension/reviewSurfaces';
import { SaveLifecycleController } from './extension/saveLifecycleController';
import { SaveOrchestrator } from './extension/saveOrchestrator';

function autoSaveMode(): 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange' {
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
  if (!activeEditor || activeEditor.document.uri.toString() !== document.uri.toString()) {
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

function saveModeFromReason(reason: vscode.TextDocumentSaveReason): 'EXPLICIT' | 'AUTO' {
  return reason === vscode.TextDocumentSaveReason.Manual ? 'EXPLICIT' : 'AUTO';
}

async function openMarkdownPreview(title: string, content: string): Promise<void> {
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
      return { acknowledged: false, proof: { directiveId, blueprintMode: 'LOCAL_ONLY' } };
    }

    const created = orchestrator.ensureBlueprintTemplate(directiveId);
    const blueprintDocument = await vscode.workspace.openTextDocument(created.blueprintPath);
    await vscode.window.showTextDocument(blueprintDocument, { preview: false });
    resolution = orchestrator.validateBlueprintProof({
      directiveId,
      blueprintId: created.blueprintId,
      blueprintMode: 'LOCAL_ONLY',
    });
  }

  if (!resolution.ok || !resolution.link) {
    void vscode.window.showWarningMessage(
      `[LINTEL] ${resolution.reason}`,
      { modal: true },
    );
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
  const workspaceFolder =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? context.globalStorageUri.fsPath;
  const orchestrator = new SaveOrchestrator(workspaceFolder);
  const controller = new SaveLifecycleController(orchestrator);
  const reviewSurfaces = new LocalReviewSurfaceService(workspaceFolder);

  for (const document of vscode.workspace.textDocuments) {
    controller.primeCommittedSnapshot(document.uri.fsPath, document.getText());
  }

  const mode = autoSaveMode();
  if (mode === 'afterDelay' || mode === 'onFocusChange') {
    void vscode.window.showInformationMessage(
      `[LINTEL] Reduced-guarantee auto-save mode detected (${mode}). Explicit save remains the preferred path.`,
    );
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('lintel.reviewAudit', async () => {
      await openMarkdownPreview('LINTEL Audit Review', reviewSurfaces.renderAuditReview());
    }),
    vscode.commands.registerCommand('lintel.reviewBlueprints', async () => {
      await openMarkdownPreview(
        'LINTEL Blueprint Review',
        reviewSurfaces.renderBlueprintReview(),
      );
    }),
    vscode.commands.registerCommand('lintel.reviewFalsePositives', async () => {
      await openMarkdownPreview(
        'LINTEL False-Positive Review',
        reviewSurfaces.renderFalsePositiveReview(),
      );
    }),
    vscode.workspace.onDidOpenTextDocument((document) => {
      controller.primeCommittedSnapshot(document.uri.fsPath, document.getText());
    }),
    vscode.workspace.onWillSaveTextDocument((event) => {
      event.waitUntil(
        (async () => {
          const currentText = event.document.getText();
          if (controller.consumeRestoreBypass(event.document.uri.fsPath, currentText)) {
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

          if (assessment.shouldPrompt && assessment.decision.decision === 'REQUIRE_PLAN') {
            const planFlow = await collectRequirePlanProof(orchestrator, assessment);
            controller.finalizeSave(assessment, planFlow.acknowledged, planFlow.proof);
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
      const restore = controller.handleDidSave(document.uri.fsPath, document.getText());
      if (!restore) {
        return;
      }

      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, fullDocumentRange(document), restore.restoreText);
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
