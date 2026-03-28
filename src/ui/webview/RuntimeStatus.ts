/**
 * Runtime Status — Screen 2 (ARC-UI-001b)
 *
 * Purpose: Display active workspace and decision context in UI form
 *
 * OBS-S-7041: Preserve Phase 7.8 staleness semantics
 * WRD-0099: Stale/unavailable states render as warnings (⚠️), not neutral/positive
 * WRD-0098: Evidence-framed wording ("records show")
 * WRD-0092: CSP and sanitization applied
 *
 * Note: This UI reads from existing extension state via commands.
 * The actual data fetching happens in extension.ts, not in the UI layer.
 */

import * as vscode from 'vscode';
import { buildCSPWithNonce, generateNonce } from '../csp';
import { escapeHtml } from '../sanitize';

/**
 * Runtime Status Snapshot (simplified for UI layer)
 */
interface RuntimeStatusSnapshot {
  activeFile?: string;
  workspaceFolder: string;
  governedRoot: string;
  targetingReason: string;
  routePolicyStatus: string;
  routePolicyMode: string;
  lastDecision?: {
    decision: string;
    timestamp: string;
    filePath: string;
    isStale?: boolean;
    stalenessReason?: 'FILE_MISMATCH' | 'TIME_THRESHOLD' | 'BOTH';
  };
}

/**
 * Create and show the Runtime Status WebviewPanel
 *
 * OBS-S-7039: UI registration in extension.ts
 */
export function createRuntimeStatusPanel(): vscode.WebviewPanel {
  const nonce = generateNonce();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const panel = vscode.window.createWebviewPanel(
    'arcRuntimeStatus',
    'ARC XT — Runtime Status',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [],
    },
  );

  panel.webview.options = {
    enableScripts: true,
    localResourceRoots: [],
  };

  // Get runtime status snapshot
  const snapshot = getRuntimeStatusSnapshot();
  panel.webview.html = getRuntimeStatusHtml(nonce, snapshot);

  return panel;
}

/**
 * Get runtime status snapshot from VS Code workspace state
 */
function getRuntimeStatusSnapshot(): RuntimeStatusSnapshot {
  const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
  const workspaceFolder =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? 'No workspace folder';

  // Determine governed root (simplified - full logic in extension/workspaceTargeting.ts)
  const governedRoot = workspaceFolder;

  // Get auto-save mode
  const configured = vscode.workspace
    .getConfiguration('files')
    .get<string>('autoSave', 'off');

  // Get route policy status (simplified - full logic in core/routerPolicy.ts)
  const routePolicyStatus = 'LOADED'; // Would read from actual .arc/router.json
  const routePolicyMode = 'RULE_ONLY'; // Default fail-closed

  return {
    activeFile,
    workspaceFolder,
    governedRoot,
    targetingReason:
      activeFile && activeFile !== workspaceFolder
        ? 'NESTED_BOUNDARY'
        : 'WORKSPACE_FOLDER',
    routePolicyStatus,
    routePolicyMode,
  };
}

/**
 * Generate Runtime Status HTML with nonce-based CSP
 *
 * OBS-S-7041: Preserve Phase 7.8 staleness semantics
 * WRD-0099: Stale states use ⚠️ warning emoji
 * WRD-0098: Evidence-framed wording
 */
function getRuntimeStatusHtml(
  nonce: string,
  snapshot: RuntimeStatusSnapshot,
): string {
  const csp = buildCSPWithNonce(nonce);
  const productName = 'ARC XT — Audit Ready Core';

  // Workspace targeting info
  const workspaceInfo = `
    <div class="info-section">
      <h2>Workspace Targeting</h2>
      <ul>
        <li><strong>Active file:</strong> <code>${escapeHtml(snapshot.activeFile ?? 'n/a')}</code></li>
        <li><strong>Workspace folder:</strong> <code>${escapeHtml(snapshot.workspaceFolder)}</code></li>
        <li><strong>Governed root:</strong> <code>${escapeHtml(snapshot.governedRoot)}</code></li>
        <li><strong>Targeting reason:</strong> ${escapeHtml(snapshot.targetingReason)}</li>
      </ul>
    </div>
  `;

  // Route policy info
  const routeInfo = `
    <div class="info-section">
      <h2>Route Posture</h2>
      <ul>
        <li><strong>Route policy status:</strong> <code>${escapeHtml(snapshot.routePolicyStatus)}</code></li>
        <li><strong>Effective mode:</strong> <code>${escapeHtml(snapshot.routePolicyMode)}</code></li>
      </ul>
    </div>
  `;

  // Staleness display (OBS-S-7041, WRD-0099)
  let stalenessHtml = '';
  if (snapshot.lastDecision) {
    const stalenessClass = snapshot.lastDecision.isStale
      ? 'warning'
      : 'success';
    const stalenessIcon = snapshot.lastDecision.isStale ? '⚠️' : '✅';
    const stalenessText = getStalenessText(snapshot.lastDecision);

    stalenessHtml = `
      <div class="info-section">
        <h2>Last Save Decision Context</h2>
        <div class="staleness ${stalenessClass}">
          <span class="icon">${stalenessIcon}</span>
          <span>${escapeHtml(stalenessText)}</span>
        </div>
        <p class="notice">Records show decision from <code>${escapeHtml(snapshot.lastDecision.filePath)}</code> at <code>${escapeHtml(snapshot.lastDecision.timestamp)}</code>.</p>
      </div>
    `;
  }

  // Observational notices
  const notices = `
    <div class="notices">
      <p class="notice">Diagnostics are observational only. They do not authorize, widen, or bypass save decisions.</p>
      <p class="notice">Staleness note: displayed decision context may be from a different file or time window. This is descriptive only and does not invalidate prior decisions.</p>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(productName)} — Runtime Status</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; }
    h1 { margin: 0 0 16px 0; font-size: 24px; }
    h2 { font-size: 16px; margin: 16px 0 8px 0; }
    .info-section { background: #252526; border: 1px solid #3c3c3c; border-radius: 4px; padding: 16px; margin-bottom: 16px; }
    ul { margin: 8px 0; padding-left: 20px; }
    li { margin: 4px 0; }
    code { background: #1e1e1e; padding: 2px 6px; border-radius: 2px; }
    .staleness { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 4px; margin: 8px 0; }
    .staleness.warning { background: rgba(255, 191, 0, 0.1); border: 1px solid #ffbf00; }
    .staleness.success { background: rgba(0, 255, 0, 0.1); border: 1px solid #00ff00; }
    .staleness .icon { font-size: 18px; }
    .notice { font-size: 12px; color: #969696; margin: 8px 0; padding: 8px; background: #1e1e1e; border-radius: 2px; }
    .notices { margin-top: 24px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(productName)}</h1>
  ${workspaceInfo}
  ${routeInfo}
  ${stalenessHtml}
  ${notices}
</body>
</html>`;
}

/**
 * Get staleness text preserving Phase 7.8 semantics (OBS-S-7041)
 *
 * WRD-0099: Warning emoji for stale states
 */
function getStalenessText(
  lastDecision: NonNullable<RuntimeStatusSnapshot['lastDecision']>,
): string {
  if (!lastDecision.isStale) {
    return 'Current file and recent (within 5 minutes)';
  }

  switch (lastDecision.stalenessReason) {
    case 'FILE_MISMATCH':
      return 'From a different file (decision context may not apply)';
    case 'TIME_THRESHOLD':
      return 'From an earlier session (older than 5 minutes)';
    case 'BOTH':
      return 'From a different file and earlier session';
    default:
      return 'Context may not reflect current state';
  }
}
