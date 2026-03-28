/**
 * Decision Feed — ARC-VIS-001 Surface 1
 *
 * Purpose: Compact awareness of recent ARC decisions
 * Emphasis: "What has been happening lately?"
 *
 * Distinct from Screen 3 (Audit Review):
 * - Screen 3 = detailed entry inspection
 * - Decision Feed = quick scanning, recent decisions only
 *
 * WRD-0111: Degraded/stale/absent states render explicitly
 * WRD-0112: Evidence-framed wording
 * WRD-0113: ARC-UI-001a security baseline (CSP, sanitization)
 */

import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildCSPWithNonce, generateNonce } from '../csp';
import { escapeHtml } from '../sanitize';

interface DecisionEntry {
  ts: string;
  file_path: string;
  decision: 'ALLOW' | 'WARN' | 'REQUIRE_PLAN' | 'BLOCK';
  risk_level: string;
  reason: string;
}

/**
 * Create and show the Decision Feed WebviewPanel
 */
export function createDecisionFeedPanel(
  context?: vscode.ExtensionContext,
): vscode.WebviewPanel {
  const nonce = generateNonce();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const panel = vscode.window.createWebviewPanel(
    'arc.decisionFeed',
    'ARC XT — Decision Feed',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      // WRD-0114: Scoped to Public/Logo/ ONLY (not full extensionUri)
      localResourceRoots: context
        ? [vscode.Uri.joinPath(context.extensionUri, 'Public', 'Logo')]
        : [],
    },
  );

  panel.webview.options = {
    enableScripts: true,
    // WRD-0114: Scoped to Public/Logo/ ONLY
    localResourceRoots: context
      ? [vscode.Uri.joinPath(context.extensionUri, 'Public', 'Logo')]
      : [],
  };

  const decisions = readRecentDecisions();
  panel.webview.html = getDecisionFeedHtml(nonce, panel, decisions, context);

  return panel;
}

/**
 * Read recent decisions from audit log
 *
 * OBS-S-7071: Read-only, no new persistence
 */
function readRecentDecisions(): DecisionEntry[] {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder) {
    return [];
  }

  const auditPath = path.join(workspaceFolder, '.arc', 'audit.jsonl');

  if (!fs.existsSync(auditPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(auditPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    const entries: DecisionEntry[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as DecisionEntry;
        entries.push(entry);
      } catch {
        // Skip malformed lines
      }
    }

    // Return last 10 decisions, most recent first
    return entries.slice(-10).reverse();
  } catch {
    return [];
  }
}

/**
 * Generate Decision Feed HTML
 *
 * WRD-0111: Degraded/stale/absent states render explicitly
 * WRD-0112: Evidence-framed wording ("records show")
 * ARC-BRAND-001: Logo in header (WRD-0115: branding-truthful)
 */
function getDecisionFeedHtml(
  nonce: string,
  panel: vscode.WebviewPanel,
  decisions: DecisionEntry[],
  context?: vscode.ExtensionContext,
): string {
  const csp = buildCSPWithNonce(nonce, panel.webview.cspSource);
  const productName = 'ARC XT — Audit Ready Core';

  // ARC-BRAND-001: Logo URI (WRD-0116: local only, no remote)
  let logoUri = '';
  if (context) {
    const logoPath = vscode.Uri.joinPath(
      context.extensionUri,
      'Public',
      'Logo',
      'ARC-ICON-1024.png',
    );
    logoUri = panel.webview.asWebviewUri(logoPath).toString();
  }
  const logoHtml = logoUri
    ? `<div class="logo-container"><img src="${escapeHtml(logoUri)}" alt="ARC Logo" class="logo" /></div>`
    : '';

  // WRD-0111: Absent state explicit
  if (decisions.length === 0) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <meta charset="UTF-8">
  <title>${escapeHtml(productName)} — Decision Feed</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; }
    h1 { margin: 0 0 16px 0; }
    .logo-container { margin-bottom: 16px; }
    .logo { max-height: 60px; width: auto; }
    .absent { color: #969696; font-style: italic; }
    .notice { font-size: 12px; color: #969696; margin: 16px 0; padding: 8px; background: #1e1e1e; border-radius: 2px; }
  </style>
</head>
<body>
  ${logoHtml}
  <h1>${escapeHtml(productName)}</h1>
  <p class="absent">No recent decisions recorded.</p>
  <p class="notice">Records show no audit entries in .arc/audit.jsonl. Decisions will appear here after saves are evaluated.</p>
</body>
</html>`;
  }

  // Decision badge colors
  const decisionColors: Record<string, string> = {
    ALLOW: 'background: #0e639c; color: #fff;',
    WARN: 'background: #ffbf00; color: #000;',
    REQUIRE_PLAN: 'background: #f48771; color: #000;',
    BLOCK: 'background: #ff0000; color: #fff;',
  };

  const decisionsHtml = decisions
    .map(
      (d) => `
    <div class="decision-entry">
      <div class="entry-header">
        <span class="decision-badge" style="${escapeHtml(decisionColors[d.decision])}">${escapeHtml(d.decision)}</span>
        <span class="timestamp">${escapeHtml(d.ts)}</span>
      </div>
      <div class="file-path">${escapeHtml(d.file_path)}</div>
      <div class="risk">Risk: ${escapeHtml(d.risk_level)}</div>
      <div class="reason">${escapeHtml(d.reason)}</div>
    </div>
  `,
    )
    .join('');

  const notices = `
    <p class="notice">Records show ${decisions.length} recent decision${decisions.length === 1 ? '' : 's'}. This feed is for awareness only and does not authorize, override, or bypass save decisions.</p>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <meta charset="UTF-8">
  <title>${escapeHtml(productName)} — Decision Feed</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; }
    h1 { margin: 0 0 16px 0; }
    .logo-container { margin-bottom: 16px; }
    .logo { max-height: 60px; width: auto; }
    .decision-entry { background: #252526; border: 1px solid #3c3c3c; border-radius: 4px; padding: 12px; margin-bottom: 12px; }
    .entry-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .decision-badge { padding: 2px 8px; border-radius: 2px; font-size: 12px; font-weight: 600; }
    .timestamp { font-size: 12px; color: #969696; }
    .file-path { font-weight: 600; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .risk { font-size: 12px; color: #969696; margin-bottom: 4px; }
    .reason { font-size: 13px; color: #cccccc; }
    .notice { font-size: 12px; color: #969696; margin: 16px 0; padding: 8px; background: #1e1e1e; border-radius: 2px; }
  </style>
</head>
<body>
  ${logoHtml}
  <h1>${escapeHtml(productName)}</h1>
  ${decisionsHtml}
  ${notices}
</body>
</html>`;
}
