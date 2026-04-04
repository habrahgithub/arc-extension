import * as vscode from 'vscode';
import fs from 'node:fs';
import path from 'node:path';
import { detectFirstRunState, type CandidateRoot } from '../core/firstRunDetection';
import {
  createMinimalArcConfig,
  ensureArcBlueprintsDir,
  generateBlueprintTemplate,
  generateGuidedRootId,
  generateBlueprintDirectiveId,
} from '../core/arcBootstrap';

export interface BootstrapStep {
  id: string;
  title: string;
  description: string;
  action: 'skip' | 'config' | 'blueprint' | 'root-select' | 'use-existing';
}

export class FirstRunBootstrapService {
  private _showedWelcome = false;

  constructor(private readonly _context: vscode.ExtensionContext) {
    // Track whether we've already shown the bootstrap flow
    this._showedWelcome =
      this._context.globalState.get<boolean>('arc.showedFirstRunBootstrap', false) ?? false;
  }

  /**
   * Check if we should show the first-run bootstrap flow.
   * Returns true if this is the first activation AND no .arc config exists.
   */
  shouldShowBootstrap(workspaceRoot: string): boolean {
    if (this._showedWelcome) return false;
    const state = detectFirstRunState(workspaceRoot);
    return state.isFirstRun;
  }

  /**
   * Mark that we've shown the bootstrap flow so we don't show it again.
   */
  markBootstrapShowned(): void {
    this._showedWelcome = true;
    void this._context.globalState.update('arc.showedFirstRunBootstrap', true);
  }

  /**
   * Show the first-run bootstrap flow.
   * This guides the operator through:
   * 1. Reviewing the detected governed root
   * 2. Creating minimal ARC config (optional)
   * 3. Creating first blueprint (optional)
   */
  async showBootstrap(workspaceRoot: string, activeFilePath?: string): Promise<void> {
    const state = detectFirstRunState(workspaceRoot, activeFilePath);

    // Step 1: Welcome message
    const welcomeChoice = await vscode.window.showInformationMessage(
      `ARC XT — First Run Detected\n\nGoverned root: ${state.governedRoot}\n\n` +
        `Would you like to set up ARC XT configuration for this workspace?`,
      { modal: true },
      'Set Up ARC XT',
      'Skip for Now',
    );

    if (welcomeChoice !== 'Set Up ARC XT') {
      this.markBootstrapShowned();
      return;
    }

    // Step 2: Root selection if multiple candidates exist
    let selectedRoot = state.governedRoot;
    if (state.candidates.length > 1) {
      const rootItems = state.candidates.map((c) => ({
        label: `${path.basename(c.path)} (${c.markers.join(', ')})`,
        description: c.path,
        detail: c.hasArc ? 'ARC config exists' : 'No ARC config',
        candidate: c,
      }));

      const rootChoice = await vscode.window.showQuickPick(rootItems, {
        placeHolder: 'Select the governed root for this workspace',
        title: 'ARC XT — Governed Root Selection',
      });

      if (rootChoice) {
        selectedRoot = rootChoice.candidate.path;
      }
    }

    // Step 3: Config bootstrap
    if (!state.hasArcConfig) {
      const configChoice = await vscode.window.showInformationMessage(
        `ARC XT — Minimal Configuration\n\n` +
          `Create default ARC config in ${selectedRoot}/.arc/\n\n` +
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
          vscode.window.showInformationMessage(
            `ARC XT config created: ${result.filesCreated.map((f) => path.basename(f)).join(', ')}`,
          );
        } else {
          vscode.window.showErrorMessage(`ARC XT config failed: ${result.error}`);
        }
      }
    }

    // Step 4: Blueprint bootstrap
    if (!state.hasBlueprints) {
      const bpChoice = await vscode.window.showInformationMessage(
        `ARC XT — First Blueprint\n\n` +
          `No blueprint artifacts found. Create a first blueprint template?`,
        { modal: true },
        'Create Blueprint',
        'Skip Blueprint',
      );

      if (bpChoice === 'Create Blueprint') {
        const directiveId = generateBlueprintDirectiveId(path.basename(selectedRoot));
        const projectName = path.basename(selectedRoot);
        const template = generateBlueprintTemplate(selectedRoot, directiveId, projectName);

        const blueprintsDir = ensureArcBlueprintsDir(selectedRoot);
        const bpFileName = `${directiveId.toLowerCase()}.md`;
        const bpPath = path.join(blueprintsDir, bpFileName);

        if (!fs.existsSync(bpPath)) {
          fs.writeFileSync(bpPath, template, 'utf8');

          // Open the blueprint for editing
          const doc = await vscode.workspace.openTextDocument(bpPath);
          await vscode.window.showTextDocument(doc);

          vscode.window.showInformationMessage(
            `ARC XT blueprint created: ${bpFileName}\n\n` +
              `Replace placeholder content before using for plan-linked saves.`,
          );
        } else {
          vscode.window.showWarningMessage(`Blueprint already exists: ${bpFileName}`);
        }
      }
    }

    // Mark that we've shown the bootstrap flow
    this.markBootstrapShowned();

    // Final confirmation
    vscode.window.showInformationMessage(
      `ARC XT first-run setup complete.\n\n` +
        `Mode: RULE_ONLY (local-only, fail-closed)\n` +
        `Governed root: ${selectedRoot}`,
    );
  }
}
