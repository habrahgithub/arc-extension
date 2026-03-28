import fs from 'node:fs';
import path from 'node:path';
import * as vscode from 'vscode';
import type {
  AssessedSave,
  AuditEntry,
  DirectiveProofInput,
} from './contracts/types';
import { isValidDirectiveId } from './core/blueprintArtifacts';
import { RoutePolicyStore } from './core/routerPolicy';
import { LocalReviewSurfaceService } from './extension/reviewSurfaces';
import { renderRuntimeStatusMarkdown } from './extension/runtimeStatus';
import { SaveLifecycleController } from './extension/saveLifecycleController';
import { SaveOrchestrator } from './extension/saveOrchestrator';
import { WelcomeSurfaceService } from './extension/welcomeSurface';
import { resolveWorkspaceTarget } from './extension/workspaceTargeting';
// ARC-UI-001a — Internal Review Surface Upgrade (UI layer)
import { registerUiCommands } from './ui';

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

// **WRD-0102: Instructional wording — submitted for Warden review**
async function promptForDirectiveId(): Promise<string | undefined> {
  return vscode.window.showInputBox({
    title: 'ARC — Plan-Linked Save',
    prompt: 'Enter the Change ID that links this save to a governance plan.',
    placeHolder: 'LINTEL-PH5-001',
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (!value.trim()) {
        return 'Change ID is required for plan-linked saves.';
      }

      return isValidDirectiveId(value.trim())
        ? undefined
        : 'Use an uppercase, hyphenated Change ID such as LINTEL-PH5-001.';
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
      `[ARC] ${resolution.reason}`,
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
    void vscode.window.showWarningMessage(`[ARC] ${resolution.reason}`, {
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
    `[ARC] REQUIRE_PLAN: ${assessment.decision.reason}\nDirective ${directiveId} linked to ${resolution.link.blueprintId}.`,
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
      `[ARC] Reduced-guarantee auto-save mode detected (${mode}). Explicit save remains the preferred path.`,
    );
  }

  context.subscriptions.push(
    // ARC-CMD-001: Primary arc.* namespace (canonical)
    vscode.commands.registerCommand('arc.showWelcome', async () => {
      await welcomeSurface.showWelcome();
    }),
    vscode.commands.registerCommand('arc.reviewAudit', async () => {
      const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
      await openMarkdownPreview(
        'ARC Audit Review',
        reviewSurfaceFor(filePath).renderAuditReview(),
      );
    }),
    vscode.commands.registerCommand('arc.showRuntimeStatus', async () => {
      const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
      const target = targetFor(filePath);
      const routePolicy = new RoutePolicyStore(target.effectiveRoot).load();

      // Phase 7.7 — Read last audit entry for trigger visibility
      // Phase 7.8 — Staleness hardening and audit-read degradation
      const auditPath = path.join(target.effectiveRoot, '.arc', 'audit.jsonl');
      let lastAudit: AuditEntry | undefined;
      let auditReadError: string | undefined;

      try {
        if (fs.existsSync(auditPath)) {
          const auditContent = fs.readFileSync(auditPath, 'utf8');
          const lines = auditContent.trim().split('\n').filter(Boolean);
          if (lines.length > 0) {
            lastAudit = JSON.parse(lines[lines.length - 1]) as AuditEntry;
          }
        }
      } catch {
        // Phase 7.8 — WRD-0077: Do not silently ignore audit read errors.
        // Degrade to "audit unavailable" rather than "audit clean".
        // Do not expose raw error details to operator surface.
        auditReadError = 'AUDIT_READ_FAILED';
      }

      // Phase 7.8 — Staleness detection
      let lastDecisionContext:
        | (typeof lastAudit & {
            isStale?: boolean;
            stalenessReason?: 'FILE_MISMATCH' | 'TIME_THRESHOLD' | 'BOTH';
          })
        | undefined;

      if (lastAudit && !auditReadError) {
        const activeFilePath =
          vscode.window.activeTextEditor?.document.uri.fsPath;
        const lastDecisionTs = new Date(lastAudit.ts).getTime();
        const nowTs = Date.now();
        const timeDiff = nowTs - lastDecisionTs;

        // Staleness model (OBS-S-7019):
        // - FILE_MISMATCH: last decision file_path differs from active file
        // - TIME_THRESHOLD: last decision is older than 5 minutes
        // - BOTH: both conditions are true
        const isFileMismatch =
          activeFilePath != null && lastAudit.file_path !== activeFilePath;
        const isTimeStale = timeDiff > 5 * 60 * 1000; // 5 minutes

        const isStale = isFileMismatch || isTimeStale;
        const stalenessReason =
          isFileMismatch && isTimeStale
            ? 'BOTH'
            : isFileMismatch
              ? 'FILE_MISMATCH'
              : isTimeStale
                ? 'TIME_THRESHOLD'
                : undefined;

        lastDecisionContext = {
          ...lastAudit,
          isStale,
          stalenessReason,
        };
      }

      await openMarkdownPreview(
        'ARC Active Workspace Status',
        renderRuntimeStatusMarkdown({
          target,
          autoSaveMode: mode,
          routePolicy,
          lastDecision: lastDecisionContext
            ? {
                decision: lastDecisionContext.decision,
                source: lastDecisionContext.source,
                fallbackCause: lastDecisionContext.fallback_cause,
                evaluationLane: lastDecisionContext.evaluation_lane,
                leaseStatus: lastDecisionContext.lease_status,
                saveMode: lastDecisionContext.save_mode,
                autoSaveMode: lastDecisionContext.auto_save_mode,
                timestamp: lastDecisionContext.ts,
                filePath: lastDecisionContext.file_path,
                isStale: lastDecisionContext.isStale,
                stalenessReason: lastDecisionContext.stalenessReason,
              }
            : undefined,
        }),
      );
    }),
    vscode.commands.registerCommand('arc.reviewBlueprints', async () => {
      const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
      await openMarkdownPreview(
        'ARC Blueprint Proof Review',
        reviewSurfaceFor(filePath).renderBlueprintReview(),
      );
    }),
    vscode.commands.registerCommand('arc.reviewFalsePositives', async () => {
      const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
      await openMarkdownPreview(
        'ARC False-Positive Review',
        reviewSurfaceFor(filePath).renderFalsePositiveReview(),
      );
    }),

    // ARC-CMD-001: Compatibility bridge lintel.* namespace (legacy, deprecated)
    // These delegate to the same handlers, ensuring existing keybindings work
    vscode.commands.registerCommand('lintel.showWelcome', async () => {
      await welcomeSurface.showWelcome();
    }),
    vscode.commands.registerCommand('lintel.reviewAudit', async () => {
      const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
      await openMarkdownPreview(
        'ARC Audit Review',
        reviewSurfaceFor(filePath).renderAuditReview(),
      );
    }),
    vscode.commands.registerCommand('lintel.showRuntimeStatus', async () => {
      const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
      const target = targetFor(filePath);
      const routePolicy = new RoutePolicyStore(target.effectiveRoot).load();

      // Phase 7.7 — Read last audit entry for trigger visibility
      // Phase 7.8 — Staleness hardening and audit-read degradation
      const auditPath = path.join(target.effectiveRoot, '.arc', 'audit.jsonl');
      let lastAudit: AuditEntry | undefined;
      let auditReadError: string | undefined;

      try {
        if (fs.existsSync(auditPath)) {
          const auditContent = fs.readFileSync(auditPath, 'utf8');
          const lines = auditContent.trim().split('\n').filter(Boolean);
          if (lines.length > 0) {
            lastAudit = JSON.parse(lines[lines.length - 1]) as AuditEntry;
          }
        }
      } catch {
        // Phase 7.8 — WRD-0077: Do not silently ignore audit read errors.
        // Degrade to "audit unavailable" rather than "audit clean".
        // Do not expose raw error details to operator surface.
        auditReadError = 'AUDIT_READ_FAILED';
      }

      // Phase 7.8 — Staleness detection
      let lastDecisionContext:
        | (typeof lastAudit & {
            isStale?: boolean;
            stalenessReason?: 'FILE_MISMATCH' | 'TIME_THRESHOLD' | 'BOTH';
          })
        | undefined;

      if (lastAudit && !auditReadError) {
        const activeFilePath =
          vscode.window.activeTextEditor?.document.uri.fsPath;
        const lastDecisionTs = new Date(lastAudit.ts).getTime();
        const nowTs = Date.now();
        const timeDiff = nowTs - lastDecisionTs;

        // Staleness model (OBS-S-7019):
        // - FILE_MISMATCH: last decision file_path differs from active file
        // - TIME_THRESHOLD: last decision is older than 5 minutes
        // - BOTH: both conditions are true
        const isFileMismatch =
          activeFilePath != null && lastAudit.file_path !== activeFilePath;
        const isTimeStale = timeDiff > 5 * 60 * 1000; // 5 minutes

        const isStale = isFileMismatch || isTimeStale;
        const stalenessReason =
          isFileMismatch && isTimeStale
            ? 'BOTH'
            : isFileMismatch
              ? 'FILE_MISMATCH'
              : isTimeStale
                ? 'TIME_THRESHOLD'
                : undefined;

        lastDecisionContext = {
          ...lastAudit,
          isStale,
          stalenessReason,
        };
      }

      await openMarkdownPreview(
        'ARC Active Workspace Status',
        renderRuntimeStatusMarkdown({
          target,
          autoSaveMode: mode,
          routePolicy,
          lastDecision: lastDecisionContext
            ? {
                decision: lastDecisionContext.decision,
                source: lastDecisionContext.source,
                fallbackCause: lastDecisionContext.fallback_cause,
                evaluationLane: lastDecisionContext.evaluation_lane,
                leaseStatus: lastDecisionContext.lease_status,
                saveMode: lastDecisionContext.save_mode,
                autoSaveMode: lastDecisionContext.auto_save_mode,
                timestamp: lastDecisionContext.ts,
                filePath: lastDecisionContext.file_path,
                isStale: lastDecisionContext.isStale,
                stalenessReason: lastDecisionContext.stalenessReason,
              }
            : undefined,
        }),
      );
    }),
    vscode.commands.registerCommand('lintel.reviewBlueprints', async () => {
      const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
      await openMarkdownPreview(
        'ARC Blueprint Review',
        reviewSurfaceFor(filePath).renderBlueprintReview(),
      );
    }),
    vscode.commands.registerCommand('lintel.reviewFalsePositives', async () => {
      const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
      await openMarkdownPreview(
        'ARC False-Positive Review',
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
              `[ARC] BLOCK: ${assessment.decision.reason}`,
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
              `[ARC] ${assessment.decision.decision}: ${assessment.decision.reason}`,
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
        `[ARC] Save reverted: ${restore.reason}`,
        { modal: true },
      );
    }),
  );

  // ARC-UI-001a/b/c — Register UI commands (all arc.ui.* namespace)
  registerUiCommands(context);
}

export function deactivate(): void {
  // no-op
}
