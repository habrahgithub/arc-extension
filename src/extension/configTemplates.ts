import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ARCXT-UX-CLARITY-001 — Minimal config template creation commands

/**
 * Get the effective governed workspace root
 */
function getWorkspaceRoot(): string {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    throw new Error('No workspace folder open');
  }
  return folders[0].uri.fsPath;
}

/**
 * Canonical minimal route policy template (fail-closed, no lanes)
 */
const MINIMAL_ROUTE_POLICY = {
  mode: 'RULE_ONLY',
  local_lane_enabled: false,
  cloud_lane_enabled: false,
  cloud_data_class: 'LOCAL_ONLY',
};

/**
 * Canonical minimal workspace mapping template (LOCAL_ONLY, no rules)
 */
const MINIMAL_WORKSPACE_MAPPING = {
  mode: 'LOCAL_ONLY',
  rules: [],
  ui_segments: [],
};

/**
 * Determine effective governed root and confirm file creation with user
 */
async function confirmConfigCreation(
  configType: 'route-policy' | 'workspace-mapping' | 'both',
): Promise<{ confirmed: boolean; governedRoot: string; filePaths: string[] }> {
  const governedRoot = getWorkspaceRoot();

  const filePaths: string[] = [];
  let description = '';

  if (configType === 'route-policy' || configType === 'both') {
    filePaths.push(path.join(governedRoot, '.arc', 'router.json'));
  }
  if (configType === 'workspace-mapping' || configType === 'both') {
    filePaths.push(path.join(governedRoot, '.arc', 'workspace-map.json'));
  }

  if (configType === 'both') {
    description =
      'Create both minimal route policy and workspace mapping configs';
  } else if (configType === 'route-policy') {
    description = 'Create minimal route policy config';
  } else {
    description = 'Create minimal workspace mapping config';
  }

  // ARCXT-UX-CLARITY-001: Explicit operator confirmation modal
  const filePathsList = filePaths.map((p) => `  - ${p}`).join('\n');
  const confirmMessage = `${description}?

Files to be created:
${filePathsList}

⚠️ This does NOT enable local or cloud lanes.
⚠️ Configs use safe fail-closed defaults (RULE_ONLY, LOCAL_ONLY).
⚠️ Existing configs will be overwritten.`;

  const choice = await vscode.window.showWarningMessage(
    'Create ARC config files?',
    { modal: true, detail: confirmMessage },
    'Create',
    'Cancel',
  );

  return {
    confirmed: choice === 'Create',
    governedRoot,
    filePaths,
  };
}

/**
 * Ensure .arc directory exists at governed root
 */
function ensureArcDirectory(governedRoot: string): void {
  const arcDir = path.join(governedRoot, '.arc');
  if (!fs.existsSync(arcDir)) {
    fs.mkdirSync(arcDir, { recursive: true });
  }
}

/**
 * Write config file with explicit overwrite confirmation if needed
 */
async function writeConfigFile(
  filePath: string,
  content: object,
): Promise<boolean> {
  // Check if file exists
  if (fs.existsSync(filePath)) {
    const existingContent = fs.readFileSync(filePath, 'utf8');
    const newContent = JSON.stringify(content, null, 2);

    // If content is identical, no need to overwrite
    if (existingContent.trim() === newContent.trim()) {
      return true; // Already has correct content
    }

    // Ask for overwrite confirmation
    const overwriteChoice = await vscode.window.showWarningMessage(
      'Config file exists.',
      {
        modal: true,
        detail: `${filePath}\n\nOverwrite with default template?`,
      },
      'Overwrite',
      'Cancel',
    );

    if (overwriteChoice !== 'Overwrite') {
      return false;
    }
  }

  // Write the config file
  fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
  return true;
}

/**
 * Command: Create minimal route policy config
 */
export async function createMinimalRoutePolicy(): Promise<void> {
  const result = await confirmConfigCreation('route-policy');

  if (!result.confirmed) {
    vscode.window.showInformationMessage('Route policy creation cancelled.');
    return;
  }

  try {
    ensureArcDirectory(result.governedRoot);

    const routerPath = path.join(result.governedRoot, '.arc', 'router.json');
    const success = await writeConfigFile(routerPath, MINIMAL_ROUTE_POLICY);

    if (success) {
      vscode.window.showInformationMessage(
        `Route policy created at ${routerPath}\n\nMode: RULE_ONLY (fail-closed)\nLocal lane: disabled\nCloud lane: disabled`,
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(
      `Failed to create route policy: ${errorMessage}`,
    );
  }
}

/**
 * Command: Create minimal workspace mapping config
 */
export async function createMinimalWorkspaceMapping(): Promise<void> {
  const result = await confirmConfigCreation('workspace-mapping');

  if (!result.confirmed) {
    vscode.window.showInformationMessage(
      'Workspace mapping creation cancelled.',
    );
    return;
  }

  try {
    ensureArcDirectory(result.governedRoot);

    const mappingPath = path.join(
      result.governedRoot,
      '.arc',
      'workspace-map.json',
    );
    const success = await writeConfigFile(
      mappingPath,
      MINIMAL_WORKSPACE_MAPPING,
    );

    if (success) {
      vscode.window.showInformationMessage(
        `Workspace mapping created at ${mappingPath}\n\nMode: LOCAL_ONLY\nRules: none\nUI segments: none`,
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(
      `Failed to create workspace mapping: ${errorMessage}`,
    );
  }
}

/**
 * Command: Create both minimal configs
 */
export async function createMinimalArcConfig(): Promise<void> {
  const result = await confirmConfigCreation('both');

  if (!result.confirmed) {
    vscode.window.showInformationMessage('Config creation cancelled.');
    return;
  }

  try {
    ensureArcDirectory(result.governedRoot);

    let successCount = 0;

    // Create route policy
    const routerPath = path.join(result.governedRoot, '.arc', 'router.json');
    if (await writeConfigFile(routerPath, MINIMAL_ROUTE_POLICY)) {
      successCount++;
    }

    // Create workspace mapping
    const mappingPath = path.join(
      result.governedRoot,
      '.arc',
      'workspace-map.json',
    );
    if (await writeConfigFile(mappingPath, MINIMAL_WORKSPACE_MAPPING)) {
      successCount++;
    }

    if (successCount === 2) {
      vscode.window.showInformationMessage(
        `Both configs created successfully!\n\nRoute policy: ${routerPath}\nWorkspace mapping: ${mappingPath}\n\nBoth use safe fail-closed defaults.`,
      );
    } else if (successCount === 1) {
      vscode.window.showWarningMessage(
        'One config created, one skipped (user cancelled overwrite).',
      );
    } else {
      vscode.window.showWarningMessage(
        'Config creation cancelled (user cancelled overwrite).',
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to create configs: ${errorMessage}`);
  }
}
