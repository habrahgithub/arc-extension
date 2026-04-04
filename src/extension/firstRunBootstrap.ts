import * as vscode from 'vscode';
import fs from 'node:fs';
import path from 'node:path';
import { detectFirstRunState } from '../core/firstRunDetection';
import {
  createMinimalArcConfig,
  ensureArcBlueprintsDir,
  generateBlueprintTemplate,
  generateBlueprintDirectiveId,
} from '../core/arcBootstrap';

export interface BootstrapResult {
  selectedRoot: string | null;
  configCreated: boolean;
  blueprintCreated: string | null;
  skipped: boolean;
}

export class FirstRunBootstrapService {
  private _showedWelcome = false;

  constructor(private readonly _context: vscode.ExtensionContext) {
    this._showedWelcome =
      this._context.globalState.get<boolean>(
        'arc.showedFirstRunBootstrap',
        false,
      ) ?? false;
  }

  shouldShowBootstrap(workspaceRoot: string): boolean {
    if (this._showedWelcome) return false;
    const state = detectFirstRunState(workspaceRoot);
    return state.isFirstRun;
  }

  markBootstrapShown(): void {
    this._showedWelcome = true;
    void this._context.globalState.update('arc.showedFirstRunBootstrap', true);
  }

  /**
   * Show the first-run bootstrap flow.
   * Returns the selected governed root, or null if skipped.
   *
   * @param workspaceRoot — the effective root passed from targeting logic
   * @param activeFilePath — current active file path (optional)
   * @param actualWorkspaceFolderRoot — the real VS Code workspace folder root
   */
  async showBootstrap(
    workspaceRoot: string,
    activeFilePath?: string,
    actualWorkspaceFolderRoot?: string,
  ): Promise<BootstrapResult> {
    const state = detectFirstRunState(workspaceRoot, activeFilePath);
    const workspaceFolderRoot = actualWorkspaceFolderRoot ?? workspaceRoot;

    // Step 1: Welcome message
    const welcomeChoice = await vscode.window.showInformationMessage(
      `ARC XT — First Run Detected\n\nGoverned root: ${state.governedRoot}\n\n` +
        `Would you like to set up ARC XT configuration for this workspace?`,
      { modal: true },
      'Set Up ARC XT',
      'Skip for Now',
    );

    if (welcomeChoice !== 'Set Up ARC XT') {
      this.markBootstrapShown();
      return {
        selectedRoot: null,
        configCreated: false,
        blueprintCreated: null,
        skipped: true,
      };
    }

    // Step 2: Root selection — present workspace-root / active-file-root / nested-root choices
    let selectedRoot = state.governedRoot;
    const rootChoices = this._buildRootSelectionItems(
      state,
      workspaceFolderRoot,
      workspaceRoot,
      activeFilePath,
    );

    if (rootChoices.length > 1) {
      const rootChoice = await vscode.window.showQuickPick(rootChoices, {
        placeHolder: 'Select the governed root for this workspace',
        title: 'ARC XT — Governed Root Selection',
      });

      if (rootChoice) {
        selectedRoot = rootChoice.rootPath;
      }
    }

    // Step 3: Config bootstrap (with exact-path confirmation)
    let configCreated = false;
    if (!state.hasArcConfig) {
      const configChoice = await vscode.window.showInformationMessage(
        `ARC XT — Minimal Configuration\n\n` +
          `Create default ARC config in:\n${selectedRoot}/.arc/router.json\n${selectedRoot}/.arc/workspace-map.json\n\n` +
          `Defaults: RULE_ONLY mode, local lane disabled, cloud lane disabled.`,
        { modal: true },
        'Create Config',
        'Skip Config',
      );

      if (configChoice === 'Create Config') {
        const result = createMinimalArcConfig({
          workspaceRoot: selectedRoot,
          overwriteExisting: false,
        });

        if (result.success) {
          configCreated = true;
          vscode.window.showInformationMessage(
            `ARC XT config created: ${result.filesCreated.map((f) => path.basename(f)).join(', ')}`,
          );
        } else {
          vscode.window.showErrorMessage(
            `ARC XT config failed: ${result.error}`,
          );
        }
      }
    }

    // Step 4: Blueprint bootstrap (with exact-path confirmation)
    let blueprintCreated: string | null = null;
    if (!state.hasBlueprints) {
      const directiveId = generateBlueprintDirectiveId(
        path.basename(selectedRoot),
      );
      const projectName = path.basename(selectedRoot);
      const bpFileName = `${directiveId.toLowerCase()}.md`;
      const blueprintsDir = ensureArcBlueprintsDir(selectedRoot);
      const bpPath = path.join(blueprintsDir, bpFileName);

      const bpChoice = await vscode.window.showInformationMessage(
        `ARC XT — First Blueprint\n\n` +
          `Create blueprint at:\n${bpPath}\n\n` +
          `This blueprint will be a template — replace placeholder content before use.`,
        { modal: true },
        'Create Blueprint',
        'Skip Blueprint',
      );

      if (bpChoice === 'Create Blueprint') {
        const template = generateBlueprintTemplate(
          selectedRoot,
          directiveId,
          projectName,
        );

        if (!fs.existsSync(bpPath)) {
          fs.writeFileSync(bpPath, template, 'utf8');
          blueprintCreated = bpPath;

          // Open the blueprint for editing
          const doc = await vscode.workspace.openTextDocument(bpPath);
          await vscode.window.showTextDocument(doc);

          vscode.window.showInformationMessage(
            `ARC XT blueprint created: ${bpFileName}\n\n` +
              `Replace placeholder content before using for plan-linked saves.`,
          );
        } else {
          vscode.window.showWarningMessage(
            `Blueprint already exists: ${bpFileName}`,
          );
        }
      }
    }

    // Mark that we've shown the bootstrap flow
    this.markBootstrapShown();

    // Final confirmation
    vscode.window.showInformationMessage(
      `ARC XT first-run setup complete.\n\n` +
        `Mode: RULE_ONLY (local-only, fail-closed)\n` +
        `Governed root: ${selectedRoot}`,
    );

    return { selectedRoot, configCreated, blueprintCreated, skipped: false };
  }

  /**
   * Build root selection items that present workspace-root / active-file-root / nested-root choices.
   * Per WO-ARC-XT-M4-001: operator must be shown bounded choices when multiple plausible roots exist.
   *
   * @param workspaceFolderRoot — the actual VS Code workspace folder root (always shown as "Workspace Root")
   * @param effectiveRoot — the current effective root from targeting logic
   */
  private _buildRootSelectionItems(
    state: ReturnType<typeof detectFirstRunState>,
    workspaceFolderRoot: string,
    effectiveRoot: string,
    activeFilePath?: string,
  ): Array<{
    label: string;
    description: string;
    detail: string;
    rootPath: string;
  }> {
    const items: Array<{
      label: string;
      description: string;
      detail: string;
      rootPath: string;
    }> = [];

    // Always offer the actual workspace folder root as "Workspace Root"
    const workspaceHasArc = fs.existsSync(
      path.join(workspaceFolderRoot, '.arc', 'router.json'),
    );
    items.push({
      label: `📁 Workspace Root`,
      description: workspaceFolderRoot,
      detail: workspaceHasArc ? 'ARC config exists' : 'No ARC config',
      rootPath: workspaceFolderRoot,
    });

    // Offer active file root if different from workspace root
    if (activeFilePath) {
      const activeRoot = path.dirname(activeFilePath);
      if (activeRoot !== workspaceFolderRoot) {
        const candidate = state.candidates.find((c) => c.path === activeRoot);
        items.push({
          label: `📄 Active File Root`,
          description: activeRoot,
          detail: candidate?.hasArc ? 'ARC config exists' : 'No ARC config',
          rootPath: activeRoot,
        });
      }
    }

    // Offer nested project roots (those with .git or package.json markers)
    for (const candidate of state.candidates) {
      if (
        candidate.path !== workspaceFolderRoot &&
        candidate.markers.includes('.git')
      ) {
        const exists = items.some((i) => i.rootPath === candidate.path);
        if (!exists) {
          items.push({
            label: `🔧 Nested Project: ${path.basename(candidate.path)}`,
            description: candidate.path,
            detail: candidate.hasArc ? 'ARC config exists' : 'No ARC config',
            rootPath: candidate.path,
          });
        }
      }
    }

    return items;
  }

  /**
   * Execute a bounded bootstrap action from the Task Board empty-state.
   * Returns the selected root if config/blueprint was created, or null if skipped.
   * Includes exact-path confirmation per WO-ARC-XT-M4-001.
   */
  async executeBootstrapAction(
    action: 'create-config' | 'create-blueprint' | 'use-existing',
    workspaceRoot: string,
  ): Promise<BootstrapResult> {
    if (action === 'use-existing') {
      this.markBootstrapShown();
      return {
        selectedRoot: workspaceRoot,
        configCreated: false,
        blueprintCreated: null,
        skipped: false,
      };
    }

    if (action === 'create-config') {
      const routerPath = path.join(workspaceRoot, '.arc', 'router.json');
      const mapPath = path.join(workspaceRoot, '.arc', 'workspace-map.json');

      const confirmChoice = await vscode.window.showInformationMessage(
        `ARC XT — Confirm Config Creation\n\n` +
          `Files to create:\n• ${routerPath}\n• ${mapPath}\n\n` +
          `Defaults: RULE_ONLY, local lane disabled, cloud lane disabled.`,
        { modal: true },
        'Confirm',
        'Cancel',
      );

      if (confirmChoice !== 'Confirm') {
        return {
          selectedRoot: null,
          configCreated: false,
          blueprintCreated: null,
          skipped: true,
        };
      }

      const result = createMinimalArcConfig({
        workspaceRoot,
        overwriteExisting: false,
      });
      if (result.success) {
        vscode.window.showInformationMessage(
          `ARC XT config created: ${result.filesCreated.map((f) => path.basename(f)).join(', ')}`,
        );
        this.markBootstrapShown();
        return {
          selectedRoot: workspaceRoot,
          configCreated: true,
          blueprintCreated: null,
          skipped: false,
        };
      } else {
        vscode.window.showErrorMessage(`ARC XT config failed: ${result.error}`);
        return {
          selectedRoot: null,
          configCreated: false,
          blueprintCreated: null,
          skipped: true,
        };
      }
    }

    if (action === 'create-blueprint') {
      const directiveId = generateBlueprintDirectiveId(
        path.basename(workspaceRoot),
      );
      const blueprintsDir = ensureArcBlueprintsDir(workspaceRoot);
      const bpFileName = `${directiveId.toLowerCase()}.md`;
      const bpPath = path.join(blueprintsDir, bpFileName);

      const confirmChoice = await vscode.window.showInformationMessage(
        `ARC XT — Confirm Blueprint Creation\n\n` +
          `File to create:\n${bpPath}\n\n` +
          `This will be a template — replace placeholder content before use.`,
        { modal: true },
        'Confirm',
        'Cancel',
      );

      if (confirmChoice !== 'Confirm') {
        return {
          selectedRoot: null,
          configCreated: false,
          blueprintCreated: null,
          skipped: true,
        };
      }

      const template = generateBlueprintTemplate(
        workspaceRoot,
        directiveId,
        path.basename(workspaceRoot),
      );

      if (!fs.existsSync(bpPath)) {
        fs.writeFileSync(bpPath, template, 'utf8');
        const doc = await vscode.workspace.openTextDocument(bpPath);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage(
          `ARC XT blueprint created: ${bpFileName}\n\n` +
            `Replace placeholder content before using for plan-linked saves.`,
        );
        this.markBootstrapShown();
        return {
          selectedRoot: workspaceRoot,
          configCreated: false,
          blueprintCreated: bpPath,
          skipped: false,
        };
      } else {
        vscode.window.showWarningMessage(
          `Blueprint already exists: ${bpFileName}`,
        );
        return {
          selectedRoot: workspaceRoot,
          configCreated: false,
          blueprintCreated: null,
          skipped: false,
        };
      }
    }

    return {
      selectedRoot: null,
      configCreated: false,
      blueprintCreated: null,
      skipped: true,
    };
  }
}
