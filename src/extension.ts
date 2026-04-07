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
import {
  LiquidShellViewProvider,
  createLiquidShellPanel,
} from './ui/webview/LiquidShell';
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
  // Use showTextDocument with preview: true instead of markdown.showPreviewToSide
  // to avoid leaving behind an untitled editor tab that prompts to save on close.
  await vscode.window.showTextDocument(document, {
    preview: true,
    viewColumn: vscode.ViewColumn.Beside,
  });
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

// Plain-language prompt for blueprint linkage
async function promptForDirectiveId(): Promise<string | undefined> {
  return vscode.window.showInputBox({
    title: 'Link a blueprint',
    prompt: 'Enter the blueprint ID that plans this change.',
    placeHolder: 'ARC-101',
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (!value.trim()) {
        return 'A blueprint ID is required to continue.';
      }

      return isValidDirectiveId(value.trim())
        ? undefined
        : 'Use an uppercase, hyphenated ID like ARC-101.';
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
      'This change needs a linked blueprint before saving.',
      {
        modal: true,
        detail: 'Enter a blueprint ID to plan this change, or create one now.',
      },
      'Create Blueprint',
      'Explain',
    );
    if (choice === 'Create Blueprint') {
      await vscode.commands.executeCommand('arc.createFirstBlueprint');
    } else if (choice === 'Explain') {
      await showPlanLinkedSaveSopPreview();
    }
    return { acknowledged: false };
  }

  let resolution = orchestrator.validateBlueprintProof({
    directiveId,
    blueprintMode: 'LOCAL_ONLY',
  });

  if (resolution.status === 'MISSING_ARTIFACT') {
    const choice = await vscode.window.showWarningMessage(
      'Blueprint not found.',
      {
        modal: true,
        detail: `No blueprint exists for "${directiveId}". Create one now?`,
      },
      'Create Blueprint',
      'Go Back',
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
    await vscode.window.showTextDocument(blueprintDocument, {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });
    resolution = orchestrator.validateBlueprintProof({
      directiveId,
      blueprintId: created.blueprintId,
      blueprintMode: 'LOCAL_ONLY',
    });
  }

  if (!resolution.ok || !resolution.link) {
    const choice = await vscode.window.showWarningMessage(
      'Blueprint not valid.',
      {
        modal: true,
        detail: `${resolution.reason}\n\nReview and complete the blueprint, or go back.`,
      },
      'Open Blueprint',
      'Go Back',
    );
    if (choice === 'Open Blueprint') {
      const bpPath = orchestrator.blueprintArtifacts.blueprintPath(directiveId);
      if (bpPath && fs.existsSync(bpPath)) {
        const doc = await vscode.workspace.openTextDocument(bpPath);
        await vscode.window.showTextDocument(doc, {
          preview: true,
          viewColumn: vscode.ViewColumn.Beside,
        });
      }
    }
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
    'Save requires a linked blueprint.',
    {
      modal: true,
      detail: `${assessment.decision.reason}\n\nLinked to: ${resolution.link.blueprintId}`,
    },
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
  // ARCXT-UX-SMOKE-001 — Liquid Shell as single Activity Bar surface
  // TaskBoardViewProvider kept for effectiveRoot tracking but NOT registered as view
  const taskBoardProvider = new TaskBoardViewProvider(
    context.extensionUri,
    targetForFirstFile.effectiveRoot,
  );
  let retainedRoot = targetForFirstFile.effectiveRoot;
  // Old sidebar view removed — use Liquid Shell only

  const liquidShellProvider = new LiquidShellViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      LiquidShellViewProvider.viewType,
      liquidShellProvider,
    ),
    // arc.ui.liquidShell → open tab panel (primary work surface)
    vscode.commands.registerCommand('arc.ui.liquidShell', () => {
      const panel = createLiquidShellPanel(context);
      panel.reveal(vscode.ViewColumn.One);
    }),
    // arc.guardrail.justify → prompt user for justification text and persist
    vscode.commands.registerCommand(
      'arc.guardrail.justify',
      async (driftId: string) => {
        const input = await vscode.window.showInputBox({
          title: 'Justify Layer Leak',
          prompt:
            'Provide a brief justification for this architectural exception',
          placeHolder: 'e.g. Legacy pattern, will refactor in LINTEL-PH6',
        });
        if (input && input.trim()) {
          await guardrailState.justifyDrift(driftId, input.trim());
        }
      },
    ),
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
  // U04 — Bootstrap owns first-run; welcome only if bootstrap not applicable
  const firstRunBootstrap = new FirstRunBootstrapService(context);
  const firstTargetResolution = targetFor(activeEditorFilePath());

  // ARC-STABILITY-LOCK-001 T3: Grace mode — demote REQUIRE_PLAN to WARN
  // until user completes bootstrap wizard. Prevents first-session hard-block.
  let graceModeActive = firstRunBootstrap.shouldShowBootstrap(
    firstTargetResolution.effectiveRoot,
  );

  if (graceModeActive) {
    void (async () => {
      const bootstrapResult = await firstRunBootstrap.showBootstrap(
        firstTargetResolution.effectiveRoot,
        activeEditorFilePath(),
        firstTargetResolution.workspaceFolderRoot,
      );
      graceModeActive = false;

      // U03: Rebind Task Board to the selected governed root
      if (
        bootstrapResult.selectedRoot &&
        bootstrapResult.selectedRoot !== firstTargetResolution.effectiveRoot
      ) {
        retainedRoot = bootstrapResult.selectedRoot;
        taskBoardProvider.rebindToRoot(bootstrapResult.selectedRoot);
      }
    })();
  } else if (welcomeSurface.shouldShowWelcome()) {
    // Bootstrap not applicable — show welcome as secondary onboarding
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
  statusBarItem.updateAutoSaveMode(mode);
  void refreshStatusBarForEditor(vscode.window.activeTextEditor);
  if (mode === 'afterDelay' || mode === 'onFocusChange') {
    void vscode.window.showInformationMessage(
      `ARC found auto-save mode (${mode}). Explicit saves are recommended.`,
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
      await vscode.commands.executeCommand('arc.ui.auditReview');
    }),
    vscode.commands.registerCommand('arc.showRuntimeStatus', async () => {
      await vscode.commands.executeCommand('arc.ui.runtimeStatus');
    }),
    vscode.commands.registerCommand('arc.reviewBlueprints', async () => {
      await vscode.commands.executeCommand('arc.ui.blueprintProof');
    }),
    vscode.commands.registerCommand('arc.reviewFalsePositives', async () => {
      await vscode.commands.executeCommand('arc.ui.falsePositiveReview');
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
          void vscode.window
            .showWarningMessage(
              'Blueprint not found.',
              {
                detail: `No blueprint found for "${directiveId}". Create one?`,
              },
              'Create Blueprint',
            )
            .then((choice) => {
              if (choice === 'Create Blueprint') {
                void vscode.commands.executeCommand('arc.createFirstBlueprint');
              }
            });
          return;
        }
        const content = fs.readFileSync(bpPath, 'utf8');
        const parsedTasks = parseBlueprintTasks(content);
        if (parsedTasks.length === 0) {
          void vscode.window.showWarningMessage('No tasks in blueprint.', {
            detail: `Blueprint "${directiveId}" has no tasks defined.`,
          });
          return;
        }

        const items = parsedTasks.map((t) => ({
          label: t.checked ? `✅ ${t.text}` : `⬜ ${t.text}`,
          description: `Line ${t.lineIndex}`,
          task: t,
        }));

        const choice = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select a task for local model context',
          title: 'Select active task',
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
            `Active task set: ${choice.task.text}`,
          );
        }
      },
    ),
    vscode.commands.registerCommand('arc.clearActiveTask', async () => {
      const orchestrator = orchestratorFor();
      orchestrator.activeTaskSelection.clear();
      void vscode.window.showInformationMessage('Active task cleared.');
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
          try {
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
              const blockChoice = await vscode.window.showErrorMessage(
                'Save blocked: sensitive file change.',
                { modal: true, detail: assessment.decision.reason },
                'View Rule',
                'Explain',
              );
              if (blockChoice === 'View Rule') {
                await vscode.commands.executeCommand('arc.ui.liquidShell');
              } else if (blockChoice === 'Explain') {
                await showPlanLinkedSaveSopPreview();
              }
              return [];
            }

            // ARC-STABILITY-LOCK-001 T3: Grace mode — demote REQUIRE_PLAN to WARN
            // during first session so new users aren't hard-blocked without context.
            if (
              graceModeActive &&
              assessment.decision.decision === 'REQUIRE_PLAN'
            ) {
              assessment.decision.decision = 'WARN';
              assessment.decision.reason =
                'This change would normally need a linked blueprint. Complete ARC setup for full enforcement.';
              assessment.shouldPrompt = true;
            }

            if (
              assessment.shouldPrompt &&
              assessment.decision.decision === 'REQUIRE_PLAN'
            ) {
              const planFlow = await collectRequirePlanProof(
                orchestrator,
                assessment,
              );
              if (!planFlow.acknowledged) {
                // ARCXT-CTRL-001: Hard block — no valid blueprint, no save.
                void vscode.window.showErrorMessage(
                  'Save blocked: this change needs a linked blueprint.',
                  {
                    modal: true,
                    detail:
                      'Create or link a blueprint to continue. This change cannot be saved without one.',
                  },
                );
                return [];
              }
              controller.finalizeSave(assessment, true, planFlow.proof, actor);
              statusBarItem.updateFromDecision(
                assessment.decision.decision,
                !planFlow.acknowledged,
              );
              taskBoardProvider.refresh();
              return [];
            }

            if (assessment.shouldPrompt) {
              const choice = await vscode.window.showWarningMessage(
                `${assessment.decision.decision}: ${assessment.decision.reason}`,
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
            statusBarItem.updateFromDecision(
              assessment.decision.decision,
              false,
            );
            taskBoardProvider.refresh();
            return [];
          } catch (err) {
            // ARC-STABILITY-LOCK-001 BLOCKER-C: Hard error boundary on save pipeline.
            // Any exception here must be surfaced — never silent.
            const message = err instanceof Error ? err.message : String(err);
            void vscode.window.showErrorMessage(
              'ARC could not check this save.',
              {
                detail: `${message}. Your change was saved without an ARC audit.`,
              },
            );
            // Fail-open: return empty edit array so save proceeds.
            return [];
          }
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
      void vscode.window.showWarningMessage('Save reverted.', {
        modal: true,
        detail: restore.reason,
      });
    }),
  );

  // ARC-UI-001a/b/c — Register UI commands (all arc.ui.* namespace)
  registerUiCommands(context);
}

export function deactivate(): void {
  // no-op
}
