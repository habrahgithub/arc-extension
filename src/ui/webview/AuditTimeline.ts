/**
 * Audit Timeline — ARC-VIS-001 Surface 2
 *
 * Purpose: Chronological evidence-oriented activity trail
 * Emphasis: "Sequence and progression over time"
 *
 * Distinct from Screen 3 (Audit Review):
 * - Screen 3 = detailed entry inspection (specific fields)
 * - Audit Timeline = chronological flow (sequence/progression)
 *
 * WRD-0111: Degraded/stale/absent states render explicitly
 * WRD-0112: Evidence-framed wording ("records show")
 * WRD-0113: ARC-UI-001a security baseline (CSP, sanitization)
 */

import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildCSPWithNonce, generateNonce } from '../csp';
import { escapeHtml } from '../sanitize';

interface TimelineEntry {
  ts: string;
  file_path: string;
  decision: string;
  risk_level: string;
  route_mode?: string;
  source?: string;
}

/**
 * Create and show the Audit Timeline WebviewPanel
 */
export function createAuditTimelinePanel(
  context?: vscode.ExtensionContext,
): vscode.WebviewPanel {
  const nonce = generateNonce();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const panel = vscode.window.createWebviewPanel(
    'arc.auditTimeline',
    'ARC — Audit Timeline',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: context
        ? [
            context.extensionUri,
            vscode.Uri.joinPath(context.extensionUri, 'Public', 'Logo'),
          ]
        : [],
    },
  );

  panel.webview.options = {
    enableScripts: true,
    localResourceRoots: context
      ? [
          context.extensionUri,
          vscode.Uri.joinPath(context.extensionUri, 'Public', 'Logo'),
        ]
      : [],
  };

  const entries = readAuditTimeline();
  panel.webview.html = getAuditTimelineHtml(nonce, panel, entries, context);

  return panel;
}

/**
 * Read audit timeline from audit log
 *
 * OBS-S-7071: Read-only, no new persistence
 */
function readAuditTimeline(): TimelineEntry[] {
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
    const entries: TimelineEntry[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as TimelineEntry;
        entries.push(entry);
      } catch {
        // Skip malformed lines
      }
    }

    // Return all entries in chronological order (oldest first for timeline)
    return entries;
  } catch {
    return [];
  }
}

/**
 * Generate Audit Timeline HTML
 *
 * WRD-0111: Degraded/stale/absent states render explicitly
 * WRD-0112: Evidence-framed wording
 * ARC-BRAND-001: Logo in header (WRD-0115: branding-truthful)
 */
function getAuditTimelineHtml(
  nonce: string,
  panel: vscode.WebviewPanel,
  entries: TimelineEntry[],
  context?: vscode.ExtensionContext,
): string {
  const csp = buildCSPWithNonce(nonce);
  const productName = 'ARC — Audit Ready Core';

  // ARC-BRAND-001: Logo URI (WRD-0116: local only, no remote)
  let logoUri = '';
  if (context) {
    const logoPath = vscode.Uri.joinPath(
      context.extensionUri,
      'Public',
      'Logo',
      'ARC LOGO.png',
    );
    logoUri = panel.webview.asWebviewUri(logoPath).toString();
  }
  const logoHtml = logoUri
    ? `<div class="logo-container"><img src="${escapeHtml(logoUri)}" alt="ARC Logo" class="logo" /></div>`
    : '';

  // WRD-0111: Absent state explicit
  if (entries.length === 0) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <meta charset="UTF-8">
  <title>${escapeHtml(productName)} — Audit Timeline</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; }
    h1 { margin: 0 0 16px 0; }
    .absent { color: #969696; font-style: italic; }
    .notice { font-size: 12px; color: #969696; margin: 16px 0; padding: 8px; background: #1e1e1e; border-radius: 2px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(productName)}</h1>
  <p class="absent">No audit timeline available.</p>
  <p class="notice">Records show no audit entries in .arc/audit.jsonl. Timeline will populate as saves are evaluated.</p>
</body>
</html>`;
  }

  // Group entries by date for timeline visualization
  const entriesByDate = new Map<string, TimelineEntry[]>();
  for (const entry of entries) {
    const date = entry.ts.split('T')[0];
    const existing = entriesByDate.get(date) ?? [];
    existing.push(entry);
    entriesByDate.set(date, existing);
  }

  const timelineHtml = Array.from(entriesByDate.entries())
    .map(
      ([date, dayEntries]) => `
    <div class="timeline-day">
      <div class="day-header">${escapeHtml(date)}</div>
      ${dayEntries
        .map(
          (entry) => `
        <div class="timeline-entry">
          <div class="entry-time">${escapeHtml(entry.ts.split('T')[1]?.split('.')[0] ?? '')}</div>
          <div class="entry-content">
            <span class="decision decision-${entry.decision.toLowerCase()}">${escapeHtml(entry.decision)}</span>
            <span class="file-path">${escapeHtml(entry.file_path)}</span>
            <span class="risk">Risk: ${escapeHtml(entry.risk_level)}</span>
          </div>
        </div>
      `,
        )
        .join('')}
    </div>
  `,
    )
    .join('');

  const notices = `
    <p class="notice">Records show ${entries.length} audit entr${entries.length === 1 ? 'y' : 'ies'} in chronological order. This timeline is for evidence review only and does not certify completeness or authorize decisions.</p>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <meta charset="UTF-8">
  <title>${escapeHtml(productName)} — Audit Timeline</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; }
    h1 { margin: 0 0 16px 0; }
    .timeline-day { margin-bottom: 24px; }
    .day-header { font-size: 14px; font-weight: 600; color: #969696; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #3c3c3c; }
    .timeline-entry { display: flex; gap: 12px; margin-bottom: 8px; padding: 8px; background: #252526; border-radius: 4px; }
    .entry-time { font-size: 12px; color: #969696; min-width: 80px; }
    .entry-content { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .decision { padding: 2px 8px; border-radius: 2px; font-size: 12px; font-weight: 600; display: inline-block; width: fit-content; }
    .decision-allow { background: #0e639c; color: #fff; }
    .decision-warn { background: #ffbf00; color: #000; }
    .decision-require_plan { background: #f48771; color: #000; }
    .decision-block { background: #ff0000; color: #fff; }
    .file-path { font-weight: 600; font-size: 13px; }
    .risk { font-size: 12px; color: #969696; }
    .notice { font-size: 12px; color: #969696; margin: 16px 0; padding: 8px; background: #1e1e1e; border-radius: 2px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(productName)}</h1>
  ${timelineHtml}
  ${notices}
</body>
</html>`;
}
