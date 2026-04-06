import fs from 'node:fs';
import path from 'node:path';
import * as vscode from 'vscode';
import type {
  ActorIdentity,
  AssessedSave,
  AuditEntry,
  DirectiveProofInput,
} from './contracts/types';
import {
  isValidDirectiveId,
  parseBlueprintTasks,
} from './core/blueprintArtifacts';
import { RoutePolicyStore } from './core/routerPolicy';
import { LocalReviewSurfaceService } from './extension/reviewSurfaces';
import { renderRuntimeStatusMarkdown } from './extension/runtimeStatus';
import { SaveLifecycleController } from './extension/saveLifecycleController';
import { SaveOrchestrator } from './extension/saveOrchestrator';
import { StatusBarItemService } from './extension/statusBarItem';
import { FileAuditIndicator } from './extension/fileAuditIndicator';
import { TaskBoardViewProvider } from './extension/taskBoardView';
import { LiquidShellViewProvider } from './ui/webview/LiquidShell';
import { WelcomeSurfaceService } from './extension/welcomeSurface';
import { resolveWorkspaceTarget } from './extension/workspaceTargeting';
import { CommitInterceptor } from './extension/interceptors/commitInterceptor';
import { RunCommandInterceptor } from './extension/interceptors/runCommandInterceptor';
import { renderDecisionTimeline } from './extension/decisionTimeline';
import { explainFileState } from './extension/fileStateExplainer';
import { resolveFileAuditState } from './extension/fileAuditState';
import { ARCOutputChannel } from './extension/ARCOutputChannel';
import { FirstRunBootstrapService } from './extension/firstRunBootstrap';
// ARC-UI-001a — Internal Review Surface Upgrade (UI layer)
import { registerUiCommands } from './ui';
// ARCXT-UX-CLARITY-001 — Minimal config template creation commands
import {
  createMinimalArcConfig,
  createMinimalRoutePolicy,
  createMinimalWorkspaceMapping,
} from './extension/configTemplates';
// ARCXT-MVG-001 — Minimal Viable Guardrail
import { GuardrailState } from './extension/guardrailState';
import { registerFirstSessionHook } from './extension/firstSessionHook';
import { detectLayerLeak } from './core/layerLeakDetector';

function humanActor(): ActorIdentity {
  return {
    type: 'human',
    id: vscode.env.machineId,
    session: vscode.env.sessionId,
  };
}

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
  void title;
  await vscode.commands.executeCommand(
    'markdown.showPreviewToSide',
    document.uri,
  );
}

const PLAN_LINKED_SAVE_SOP_SEQUENCE =
  'Governed Root → Config → Change ID → Blueprint → Save Blueprint → Re-save Governed File → Review';

const PLAN_LINKED_SAVE_SOP_MARKDOWN = `# ARC XT — Current Plan-Linked Save SOP

Use this order for any \`REQUIRE_PLAN\` save:

1. **Confirm governed root**
2. **Confirm local ARC config**
3. **Enter a real Change ID**
4. **Create or open the local blueprint artifact**
5. **Complete the blueprint**
6. **Save the blueprint**
7. **Re-save the governed file**
8. **Review proof and audit evidence**

## Important clarifications

- The dialog placeholder (for example \`ARC-101\`) is only an example format. It is not submitted input.
- \`.arc/workspace-map.json\` does **not** satisfy proof by itself.
- The canonical proof path is \`.arc/blueprints/<CHANGE-ID>.md\`.
- Template creation is a starting point only; incomplete blueprints do not authorize saves.
`;

async function showPlanLinkedSaveSopPreview(): Promise<void> {
  await openMarkdownPreview(
    'ARC XT — Plan-Linked Save SOP',
    PLAN_LINKED_SAVE_SOP_MARKDOWN,
  );
}

async function handlePlanLinkedSaveHelpChoice(
  choice: string | undefined,
): Promise<void> {
  switch (choice) {
    case 'Review SOP':
      await showPlanLinkedSaveSopPreview();
      return;
    case 'Guided Workflow':
      await vscode.commands.executeCommand('arc.ui.guidedWorkflow');
      return;
    case 'Runtime Status':
      await vscode.commands.executeCommand('arc.showRuntimeStatus');
      return;
    case 'Blueprint Review':
      await vscode.commands.executeCommand('arc.reviewBlueprints');
      return;
    default:
      return;
  }
}

// **WRD-0102: Instructional wording — submitted for Warden review**
async function promptForDirectiveId(): Promise<string | undefined> {
  return vscode.window.showInputBox({
    title: 'ARC XT — Plan-Linked Save (Step 3: Change ID)',
    prompt:
      'Current SOP: confirm governed root and local ARC config, then enter the Change ID that links this save to a governance plan.',
    placeHolder: 'ARC-101',
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (!value.trim()) {
        return 'Change ID is required for plan-linked saves.';
      }

      return isValidDirectiveId(value.trim())
        ? undefined
        : 'Use an uppercase, hyphenated Change ID such as ARC-101.';
    },
  });
}

async function collectRequirePlanProof(
  orchestrator: SaveOrchestrator,
  assessment: AssessedSave,
): Promise<{ acknowledged: boolean; proof?: DirectiveProofInput }> {
  const directiveId = (await promptForDirectiveId())?.trim();
  if (!directiveId) {
    const choice = await vscode.window.showWarningMessage(
      `[ARC XT] Plan-linked save remains blocked until you enter a real Change ID and link a valid local blueprint proof.\nCurrent SOP: ${PLAN_LINKED_SAVE_SOP_SEQUENCE}`,
      { modal: true },
      'Guided Workflow',
      'Runtime Status',
      'Review SOP',
    );
    await handlePlanLinkedSaveHelpChoice(choice);
    return { acknowledged: false };
  }

  let resolution = orchestrator.validateBlueprintProof({
    directiveId,
    blueprintMode: 'LOCAL_ONLY',
  });

  if (resolution.status === 'MISSING_ARTIFACT') {
    const choice = await vscode.window.showWarningMessage(
      `[ARC XT] ${resolution.reason}\nCurrent SOP: ${PLAN_LINKED_SAVE_SOP_SEQUENCE}`,
      { modal: true },
      'Create Blueprint',
      'Guided Workflow',
      'Review SOP',
    );

    if (choice !== 'Create Blueprint') {
      await handlePlanLinkedSaveHelpChoice(choice);
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
    const choice = await vscode.window.showWarningMessage(
      `[ARC XT] ${resolution.reason}\nCurrent SOP: ${PLAN_LINKED_SAVE_SOP_SEQUENCE}`,
      { modal: true },
      'Blueprint Review',
      'Guided Workflow',
      'Review SOP',
    );
    await handlePlanLinkedSaveHelpChoice(choice);
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
    `[ARC XT] Plan-linked save: ${assessment.decision.reason}\nChange ID ${directiveId} linked to ${resolution.link.blueprintId}.`,
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
  const statusBarItem = new StatusBarItemService();
  const timelineOutput = ARCOutputChannel.getInstance();
  const fileAuditIndicator = new FileAuditIndicator();
  let statusRefreshGeneration = 0;
  context.subscriptions.push(statusBarItem);
  context.subscriptions.push(fileAuditIndicator);
  context.subscriptions.push(timelineOutput);
  context.subscriptions.push(new RunCommandInterceptor(orchestratorFor));

  // ARCXT-MVG-001 — Guardrail state (created before CommitInterceptor)
  const guardrailState = new GuardrailState(context.workspaceState);

  context.subscriptions.push(
    new CommitInterceptor(
      orchestratorFor,
      () => {
        const fp = activeEditorFilePath();
        fileAuditIndicator.updateForFile(fp, (f) =>
          orchestratorFor(f).queryFileAuditState(f),
        );
      },
      guardrailState,
    ),
  );

  function editorFilePath(editor?: vscode.TextEditor): string | undefined {
    if (!editor || editor.document.uri.scheme !== 'file') {
      return undefined;
    }

    const filePath = editor.document.uri.fsPath;
    return filePath.length > 0 ? filePath : undefined;
  }

  function activeEditorFilePath(): string | undefined {
    return editorFilePath(vscode.window.activeTextEditor);
  }

  async function refreshStatusBarForEditor(
    editor: vscode.TextEditor | undefined,
  ): Promise<void> {
    const generation = ++statusRefreshGeneration;
    const filePath = editorFilePath(editor);

    if (!filePath || !editor) {
      statusBarItem.refresh();
      return;
    }

    try {
      const assessment = await controllerFor(filePath).prepareSave({
        filePath,
        fileName: path.basename(filePath),
        text: editor.document.getText(),
        saveMode: 'EXPLICIT',
        autoSaveMode: autoSaveMode(),
        selectionText: selectionText(editor.document),
      });

      if (generation !== statusRefreshGeneration) {
        return;
      }

      statusBarItem.updateFromAssessment(assessment.decision.decision);
    } catch {
      if (generation !== statusRefreshGeneration) {
        return;
      }

      statusBarItem.updateError();
    }
  }

  // P9-001 — trigger 1: active editor change (file open / tab switch)
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      const filePath = editorFilePath(editor);
      fileAuditIndicator.updateForFile(filePath, (f) =>
        orchestratorFor(f).queryFileAuditState(f),
      );

      if (filePath) {
        const target = targetFor(filePath);
        if (taskBoardProvider.effectiveRoot !== target.effectiveRoot) {
          taskBoardProvider.rebindToRoot(target.effectiveRoot);
        }
      }

      void refreshStatusBarForEditor(editor);
    }),
  );

  // Prime indicator for the file open at activation time
  {
    const fp = activeEditorFilePath();
    fileAuditIndicator.updateForFile(fp, (f) =>
      orchestratorFor(f).queryFileAuditState(f),
    );
  }

  // ARC-UX-002 — Register Task Board View Provider (left sidebar)
  const targetForFirstFile = resolveWorkspaceTarget(
    activeEditorFilePath(),
    workspaceFolderRoots,
    fallbackRoot,
  );
  let retainedRoot = targetForFirstFile.effectiveRoot;
  const taskBoardProvider = new TaskBoardViewProvider(
    context.extensionUri,
    targetForFirstFile.effectiveRoot,
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      TaskBoardViewProvider.viewType,
      taskBoardProvider,
    ),
  );

  // ARCXT-UX-SMOKE-001 — Liquid Shell as primary Activity Bar surface
  const liquidShellProvider = new LiquidShellViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      LiquidShellViewProvider.viewType,
      liquidShellProvider,
    ),
    // arc.ui.liquidShell → reveal sidebar (not new panel)
    vscode.commands.registerCommand('arc.ui.liquidShell', () => {
      liquidShellProvider.reveal();
    }),
    // arc.ui.liquidShell.navigate → reveal + switch route inside the shell
    vscode.commands.registerCommand('arc.ui.liquidShell.navigate', (route: string) => {
      liquidShellProvider.navigateTo(route);
    }),
    // arc.guardrail.justify → prompt user for justification text and persist
    vscode.commands.registerCommand('arc.guardrail.justify', async (driftId: string) => {
      const input = await vscode.window.showInputBox({
        title: 'Justify Layer Leak',
        prompt: 'Provide a brief justification for this architectural exception',
        placeHolder: 'e.g. Legacy pattern, will refactor in LINTEL-PH6',
      });
      if (input && input.trim()) {
        await guardrailState.justifyDrift(driftId, input.trim());
      }
    }),
  );

  // ARCXT-MVG-001 — First-session hook, on-save detector, guardrail→UI bridge
  const workspaceRoot = workspaceFolderRoots[0] ?? fallbackRoot;
  context.subscriptions.push(
    registerFirstSessionHook(workspaceRoot, guardrailState, context),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.uri.scheme !== 'file') return;
      const result = detectLayerLeak(doc.uri.fsPath, doc.getText());
      if (result.hasViolation && result.item) {
        guardrailState.addDrift(result.item);
        liquidShellProvider.reveal();
      }
    }),
    guardrailState.onUpdate((update) => {
      liquidShellProvider.sendGuardrailUpdate(update);
    }),
  );

  function targetFor(filePath?: string) {
    const target = resolveWorkspaceTarget(
      filePath,
      workspaceFolderRoots,
      fallbackRoot,
      filePath ? undefined : { retainedRoot },
    );

    if (filePath) {
      retainedRoot = target.effectiveRoot;
    }

    return target;
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

  // U01–U06: First-run bootstrap for new operators (local-only, fail-closed)
  const firstRunBootstrap = new FirstRunBootstrapService(context);
  const firstTargetResolution = targetFor(activeEditorFilePath());

  if (
    firstRunBootstrap.shouldShowBootstrap(firstTargetResolution.effectiveRoot)
  ) {
    void (async () => {
      const bootstrapResult = await firstRunBootstrap.showBootstrap(
        firstTargetResolution.effectiveRoot,
        activeEditorFilePath(),
        firstTargetResolution.workspaceFolderRoot,
      );

      // U03: Rebind Task Board to the selected governed root
      if (
        bootstrapResult.selectedRoot &&
        bootstrapResult.selectedRoot !== firstTargetResolution.effectiveRoot
      ) {
        retainedRoot = bootstrapResult.selectedRoot;
        taskBoardProvider.rebindToRoot(bootstrapResult.selectedRoot);
      }
    })();
  }

  for (const document of vscode.workspace.textDocuments) {
    controllerFor(document.uri.fsPath).primeCommittedSnapshot(
      document.uri.fsPath,
      document.getText(),
    );
  }

  const mode = autoSaveMode();
  statusBarItem.updateAutoSaveMode(mode);
  void refreshStatusBarForEditor(vscode.window.activeTextEditor);
  if (mode === 'afterDelay' || mode === 'onFocusChange') {
    void vscode.window.showInformationMessage(
      `[ARC XT] Reduced-guarantee auto-save mode detected (${mode}). Explicit save remains the preferred path.`,
    );
  }

  context.subscriptions.push(
    // ARC-CMD-001: Primary arc.* namespace (canonical)
    vscode.commands.registerCommand('arc.showWelcome', async () => {
      await welcomeSurface.showWelcome();
    }),
    vscode.commands.registerCommand('arc.showDecisionTimeline', () => {
      const activeFile = activeEditorFilePath();
      if (!activeFile) {
        void vscode.window.showWarningMessage(
          'ARC: No decision timeline available for this file',
        );
        return;
      }

      const target = targetFor(activeFile);
      const timeline = renderDecisionTimeline(target.effectiveRoot, activeFile);
      timelineOutput.appendLine(timeline.message);
      timelineOutput.show(true);

      if (!timeline.available) {
        void vscode.window.showWarningMessage(timeline.message);
      }
    }),
    // P9-002 — Inline Context On-Demand Explanation
    vscode.commands.registerCommand('arc.explainCurrentFileState', () => {
      const activeFile = activeEditorFilePath();
      let state: import('./extension/fileAuditState').FileAuditState;
      try {
        const row = activeFile
          ? orchestratorFor(activeFile).queryFileAuditState(activeFile)
          : null;
        state = resolveFileAuditState(row);
      } catch {
        state = 'UNKNOWN';
      }
      const explanation = explainFileState(state, activeFile);
      for (const line of explanation.lines) {
        timelineOutput.appendLine(line);
      }
      timelineOutput.show(true);
    }),
    vscode.commands.registerCommand('arc.reviewAudit', async () => {
      const filePath = activeEditorFilePath();
      await openMarkdownPreview(
        'ARC XT — Audit Review',
        reviewSurfaceFor(filePath).renderAuditReview(),
      );
    }),
    vscode.commands.registerCommand('arc.showRuntimeStatus', async () => {
      const filePath = activeEditorFilePath();
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
        const activeFilePath = activeEditorFilePath();
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
        'ARC XT — Active Workspace Status',
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
      const filePath = activeEditorFilePath();
      await openMarkdownPreview(
        'ARC XT — Blueprint Proof Review',
        reviewSurfaceFor(filePath).renderBlueprintReview(),
      );
    }),
    vscode.commands.registerCommand('arc.reviewFalsePositives', async () => {
      const filePath = activeEditorFilePath();
      await openMarkdownPreview(
        'ARC XT — False-Positive Review',
        reviewSurfaceFor(filePath).renderFalsePositiveReview(),
      );
    }),

    // ARC-CMD-001: Compatibility bridge lintel.* namespace (DEPRECATED — retained for backward compat with existing keybindings/macros)
    // DO NOT add new commands to this namespace. All new commands use arc.* prefix.
    // This bridge will be removed in a future major release.
    vscode.commands.registerCommand('lintel.showWelcome', async () => {
      await welcomeSurface.showWelcome();
    }),
    vscode.commands.registerCommand('lintel.reviewAudit', async () => {
      const filePath = activeEditorFilePath();
      await openMarkdownPreview(
        'ARC XT — Audit Review',
        reviewSurfaceFor(filePath).renderAuditReview(),
      );
    }),
    vscode.commands.registerCommand('lintel.showRuntimeStatus', async () => {
      const filePath = activeEditorFilePath();
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
        const activeFilePath = activeEditorFilePath();
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
        'ARC XT — Active Workspace Status',
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
      const filePath = activeEditorFilePath();
      await openMarkdownPreview(
        'ARC XT — Blueprint Review',
        reviewSurfaceFor(filePath).renderBlueprintReview(),
      );
    }),
    vscode.commands.registerCommand('lintel.reviewFalsePositives', async () => {
      const filePath = activeEditorFilePath();
      await openMarkdownPreview(
        'ARC XT — False-Positive Review',
        reviewSurfaceFor(filePath).renderFalsePositiveReview(),
      );
    }),
    // ARCXT-UX-CLARITY-001 — Minimal config template creation commands
    vscode.commands.registerCommand(
      'arc.createMinimalRoutePolicy',
      async () => {
        await createMinimalRoutePolicy();
      },
    ),
    vscode.commands.registerCommand(
      'arc.createMinimalWorkspaceMapping',
      async () => {
        await createMinimalWorkspaceMapping();
      },
    ),
    vscode.commands.registerCommand('arc.createMinimalArcConfig', async () => {
      await createMinimalArcConfig();
    }),

    // U04: Bounded empty-state actions from Task Board
    vscode.commands.registerCommand('arc.reviewGovernedRoot', async () => {
      await vscode.commands.executeCommand('arc.showRuntimeStatus');
    }),
    vscode.commands.registerCommand('arc.createArcConfig', async () => {
      const currentRoot = taskBoardProvider.effectiveRoot;
      const result = await firstRunBootstrap.executeBootstrapAction(
        'create-config',
        currentRoot,
      );
      if (result.configCreated) {
        taskBoardProvider.refresh();
      }
    }),
    vscode.commands.registerCommand('arc.createFirstBlueprint', async () => {
      const currentRoot = taskBoardProvider.effectiveRoot;
      const result = await firstRunBootstrap.executeBootstrapAction(
        'create-blueprint',
        currentRoot,
      );
      if (result.blueprintCreated) {
        taskBoardProvider.refresh();
      }
    }),
    vscode.commands.registerCommand('arc.useExistingConfig', async () => {
      const currentRoot = taskBoardProvider.effectiveRoot;
      await firstRunBootstrap.executeBootstrapAction(
        'use-existing',
        currentRoot,
      );
      taskBoardProvider.refresh();
    }),

    // U09 — Active task selection commands (bounded, local-only, non-authorizing)
    vscode.commands.registerCommand(
      'arc.selectTask',
      async (directiveId: string) => {
        const orchestrator = orchestratorFor();
        const tasks = orchestrator.activeTaskSelection;
        const bpPath =
          orchestrator.blueprintArtifacts.blueprintPath(directiveId);
        if (!fs.existsSync(bpPath)) {
          void vscode.window.showWarningMessage(
            `[ARC XT] Blueprint not found: ${directiveId}`,
          );
          return;
        }
        const content = fs.readFileSync(bpPath, 'utf8');
        const parsedTasks = parseBlueprintTasks(content);
        if (parsedTasks.length === 0) {
          void vscode.window.showWarningMessage(
            `[ARC XT] No tasks found in blueprint: ${directiveId}`,
          );
          return;
        }

        const items = parsedTasks.map((t) => ({
          label: t.checked ? `✅ ${t.text}` : `⬜ ${t.text}`,
          description: `Line ${t.lineIndex}`,
          task: t,
        }));

        const choice = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select a task for local model context',
          title: 'ARC XT — Active Task Selection',
        });

        if (choice) {
          tasks.select({
            taskId: `${directiveId}-task-${choice.task.lineIndex}`,
            summary: choice.task.text,
            status: choice.task.checked ? 'DONE' : 'TODO',
            directiveId,
            blueprintPath: bpPath,
          });
          void vscode.window.showInformationMessage(
            `[ARC XT] Active task selected: ${choice.task.text}`,
          );
        }
      },
    ),
    vscode.commands.registerCommand('arc.clearActiveTask', async () => {
      const orchestrator = orchestratorFor();
      orchestrator.activeTaskSelection.clear();
      void vscode.window.showInformationMessage(
        '[ARC XT] Active task cleared.',
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

          const actor = humanActor();

          if (
            assessment.decision.decision === 'ALLOW' ||
            assessment.decision.lease_status === 'REUSED'
          ) {
            controller.finalizeSave(assessment, true, undefined, actor);
            statusBarItem.updateFromDecision(
              assessment.decision.decision,
              false,
            );
            taskBoardProvider.refresh();
            return [];
          }

          if (assessment.decision.decision === 'BLOCK') {
            controller.finalizeSave(assessment, false, undefined, actor);
            statusBarItem.updateFromDecision(
              assessment.decision.decision,
              true,
            );
            taskBoardProvider.refresh();
            void vscode.window.showErrorMessage(
              `[ARC XT] BLOCK: ${assessment.decision.reason}`,
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
              actor,
            );
            statusBarItem.updateFromDecision(
              assessment.decision.decision,
              !planFlow.acknowledged,
            );
            taskBoardProvider.refresh();
            return [];
          }

          if (assessment.shouldPrompt) {
            const choice = await vscode.window.showWarningMessage(
              `[ARC XT] ${assessment.decision.decision}: ${assessment.decision.reason}`,
              { modal: true },
              'Continue',
              'Cancel',
            );

            controller.finalizeSave(
              assessment,
              choice === 'Continue',
              undefined,
              actor,
            );
            statusBarItem.updateFromDecision(
              assessment.decision.decision,
              choice !== 'Continue',
            );
            taskBoardProvider.refresh();
            return [];
          }

          controller.finalizeSave(assessment, false, undefined, actor);
          statusBarItem.updateFromDecision(assessment.decision.decision, false);
          taskBoardProvider.refresh();
          return [];
        })(),
      );
    }),
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      // P9-001 — trigger 3: post-save
      fileAuditIndicator.updateForFile(document.uri.fsPath, (f) =>
        orchestratorFor(f).queryFileAuditState(f),
      );

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
        `[ARC XT] Save reverted: ${restore.reason}`,
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
