/**
 * Audit Review — Screen 3 (ARC-UI-001b)
 * 
 * Purpose: Display recent audit entries in UI form
 * 
 * OBS-S-7042: Preserve audit-read degradation handling
 * WRD-0098: Evidence-framed wording ("records show")
 * WRD-0099: Unavailable states render as warnings
 * WRD-0092: CSP and sanitization applied
 */

import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildCSPWithNonce, generateNonce } from '../csp';
import { escapeHtml } from '../sanitize';

interface AuditEntry {
  ts: string;
  file_path: string;
  decision: string;
  risk_level: string;
  route_mode?: string;
  route_lane?: string;
  fallback_cause?: string;
  lease_status?: string;
  save_mode?: string;
  auto_save_mode?: string;
  matched_rules: string[];
  directive_id?: string;
  blueprint_id?: string;
  next_action: string;
}

interface AuditReadResult {
  entries: AuditEntry[];
  malformedCount: number;
}

/**
 * Create and show the Audit Review WebviewPanel
 */
export function createAuditReviewPanel(): vscode.WebviewPanel {
  const nonce = generateNonce();
  
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const panel = vscode.window.createWebviewPanel(
    'arcAuditReview',
    'ARC XT — Audit Review',
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

  const auditData = readAuditData();
  panel.webview.html = getAuditReviewHtml(nonce, auditData);

  return panel;
}

/**
 * Read audit data from .arc/audit.jsonl
 * 
 * OBS-S-7042: Preserve audit-read degradation handling
 */
function readAuditData(): { entries: AuditEntry[]; malformedCount: number; readError: boolean } {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder) {
    return { entries: [], malformedCount: 0, readError: true };
  }
  
  const auditPath = path.join(workspaceFolder, '.arc', 'audit.jsonl');
  
  // OBS-S-7042: Handle audit-read degradation
  let readError = false;
  let entries: AuditEntry[] = [];
  let malformedCount = 0;
  
  try {
    if (fs.existsSync(auditPath)) {
      const content = fs.readFileSync(auditPath, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      
      for (const line of lines) {
        try {
          entries.push(JSON.parse(line) as AuditEntry);
        } catch {
          malformedCount++;
        }
      }
    }
  } catch {
    // OBS-S-7042: Degrade to "audit unavailable" - do not expose raw error
    readError = true;
  }
  
  // Return last 10 entries
  const recent = entries.slice(-10).reverse();
  return { entries: recent, malformedCount, readError };
}

/**
 * Generate Audit Review HTML
 * 
 * OBS-S-7042: Preserve audit-read degradation display
 * WRD-0098: Evidence-framed wording
 * WRD-0099: Unavailable = warning state
 */
function getAuditReviewHtml(
  nonce: string,
  data: { entries: AuditEntry[]; malformedCount: number; readError: boolean },
): string {
  const csp = buildCSPWithNonce(nonce);
  const productName = 'ARC XT — Audit Ready Core';
  
  // OBS-S-7042: Audit-read degradation display
  if (data.readError) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <meta charset="UTF-8">
  <title>${escapeHtml(productName)} — Audit Review</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; }
    h1 { margin: 0 0 16px 0; }
    .warning { background: rgba(255, 191, 0, 0.1); border: 1px solid #ffbf00; border-radius: 4px; padding: 16px; margin: 16px 0; }
    .warning h2 { margin: 0 0 8px 0; color: #ffbf00; }
    .notice { font-size: 12px; color: #969696; margin: 8px 0; padding: 8px; background: #1e1e1e; border-radius: 2px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(productName)}</h1>
  <div class="warning">
    <h2>⚠️ Audit-read degradation</h2>
    <p>Audit data could not be read cleanly.</p>
    <p>This display is partial and does not imply audit absence equals approval.</p>
    <p>Enforcement floor remains authoritative despite audit-read failure.</p>
  </div>
  <p class="notice">Enforcement note: fail-closed routing, proof requirements, and rule floors remain authoritative even when the operator wording becomes easier to read.</p>
</body>
</html>`;
  }
  
  // No audit entries
  if (data.entries.length === 0) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <meta charset="UTF-8">
  <title>${escapeHtml(productName)} — Audit Review</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; }
    h1 { margin: 0 0 16px 0; }
    .empty { color: #969696; }
  </style>
</head>
<body>
  <h1>${escapeHtml(productName)}</h1>
  <p class="empty">No local audit log is present yet.</p>
</body>
</html>`;
  }
  
  // WRD-0098: Evidence-framed wording ("records show")
  const entriesHtml = data.entries.map(entry => `
    <div class="audit-entry">
      <div class="entry-header">
        <span class="timestamp">${escapeHtml(entry.ts)}</span>
        <span class="decision decision-${entry.decision.toLowerCase()}">${escapeHtml(entry.decision)}</span>
      </div>
      <ul>
        <li><strong>File:</strong> <code>${escapeHtml(entry.file_path)}</code></li>
        <li><strong>Risk:</strong> ${escapeHtml(entry.risk_level)}</li>
        <li><strong>Route:</strong> <code>${escapeHtml(entry.route_mode ?? 'RULE_ONLY')}</code> / <code>${escapeHtml(entry.route_lane ?? 'RULE_ONLY')}</code></li>
        <li><strong>Lease:</strong> ${escapeHtml(entry.lease_status ?? 'N/A')}</li>
        <li><strong>Matched rules:</strong> ${entry.matched_rules.length > 0 ? escapeHtml(entry.matched_rules.join(', ')) : 'none'}</li>
        <li><strong>Records show:</strong> ${escapeHtml(entry.next_action)}</li>
      </ul>
    </div>
  `).join('');
  
  const malformedWarning = data.malformedCount > 0
    ? `<div class="warning"><strong>⚠️ ${data.malformedCount} malformed audit line(s) were skipped.</strong> This review is partial and malformed entries were not treated as valid evidence.</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <meta charset="UTF-8">
  <title>${escapeHtml(productName)} — Audit Review</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; }
    h1 { margin: 0 0 16px 0; }
    .audit-entry { background: #252526; border: 1px solid #3c3c3c; border-radius: 4px; padding: 16px; margin-bottom: 16px; }
    .entry-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .timestamp { font-size: 12px; color: #969696; }
    .decision { padding: 2px 8px; border-radius: 2px; font-size: 12px; font-weight: 600; }
    .decision-allow { background: #0e639c; color: #fff; }
    .decision-warn { background: #ffbf00; color: #000; }
    .decision-require_plan { background: #f48771; color: #000; }
    .decision-block { background: #ff0000; color: #fff; }
    ul { margin: 8px 0; padding-left: 20px; }
    li { margin: 4px 0; }
    code { background: #1e1e1e; padding: 2px 6px; border-radius: 2px; }
    .warning { background: rgba(255, 191, 0, 0.1); border: 1px solid #ffbf00; border-radius: 4px; padding: 16px; margin: 16px 0; }
    .notice { font-size: 12px; color: #969696; margin: 8px 0; padding: 8px; background: #1e1e1e; border-radius: 2px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(productName)}</h1>
  <p class="notice">Records show ${data.entries.length} recent audit entr${data.entries.length === 1 ? 'y' : 'ies'}. ${data.malformedCount > 0 ? `${data.malformedCount} malformed entries excluded.` : ''}</p>
  ${malformedWarning}
  ${entriesHtml}
  <p class="notice">Review surfaces are local-only, read-only, and non-authorizing. They summarize existing evidence but do not authorize, widen, or bypass save decisions.</p>
</body>
</html>`;
}
