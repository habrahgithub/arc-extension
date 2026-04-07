/**
 * Why Panel — ARC-VIS-001 Surface 3
 *
 * Purpose: Explanation surface for why a decision occurred
 * Emphasis: "Why this happened" (not "what to do next")
 *
 * Distinct from other surfaces:
 * - Decision Feed = "What has been happening lately?"
 * - Audit Timeline = "Sequence and progression over time"
 * - Why Panel = "Why this happened"
 *
 * WRD-0110: **WORDING SUBMITTED FOR WARDEN REVIEW BEFORE MERGE**
 * WRD-0111: Degraded/stale/absent states render explicitly
 * WRD-0112: Evidence-framed wording ("records show")
 * WRD-0113: ARC-UI-001a security baseline (CSP, sanitization)
 */

import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildCSPWithNonce, generateNonce } from '../csp';
import { escapeHtml } from '../sanitize';

interface WhyExplanation {
  ts: string;
  file_path: string;
  decision: string;
  reason: string;
  risk_level: string;
  matched_rules: string[];
  source: string;
  fallback_cause?: string;
  next_action: string;
}

/**
 * Create and show the Why Panel WebviewPanel
 */
export function createWhyPanelPanel(
  context?: vscode.ExtensionContext,
): vscode.WebviewPanel {
  const nonce = generateNonce();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const panel = vscode.window.createWebviewPanel(
    'arc.whyPanel',
    'ARC XT — Why Panel',
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

  const explanation = getCurrentWhyExplanation();
  panel.webview.html = getWhyPanelHtml(nonce, panel, explanation, context);

  return panel;
}

/**
 * Get explanation for current/recent decision
 *
 * OBS-S-7071: Read-only, no new persistence
 */
function getCurrentWhyExplanation(): WhyExplanation | null {
  const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  if (!activeFile || !workspaceFolder) {
    return null;
  }

  const auditPath = path.join(workspaceFolder, '.arc', 'audit.jsonl');

  if (!fs.existsSync(auditPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(auditPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);

    // Find most recent decision for active file
    for (const line of lines.reverse()) {
      try {
        const entry = JSON.parse(line) as WhyExplanation;
        if (entry.file_path === activeFile) {
          return entry;
        }
      } catch {
        // Skip malformed lines
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Generate Why Panel HTML
 *
 * **WRD-0110: WORDING SUBMITTED FOR WARDEN REVIEW BEFORE MERGE**
 *
 * Wording constraints:
 * - Must be explanatory, not instructional
 * - Must use evidence-framed language ("records show")
 * - Must not imply authorization or approval
 * - Must preserve fail-closed truthfulness
 * ARC-BRAND-001: Logo in header (WRD-0115: branding-truthful)
 */
function getWhyPanelHtml(
  nonce: string,
  panel: vscode.WebviewPanel,
  explanation: WhyExplanation | null,
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
  if (!explanation) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <meta charset="UTF-8">
  <title>${escapeHtml(productName)} — Why Panel</title>
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
  <p class="absent">No decision explanation available for the active file.</p>
  <p class="notice">No audit entry exists for this file yet. An explanation will appear here after a save is evaluated.</p>
</body>
</html>`;
  }

  // Decision color
  const decisionColors: Record<string, string> = {
    ALLOW: 'background: #0e639c; color: #fff;',
    WARN: 'background: #ffbf00; color: #000;',
    REQUIRE_PLAN: 'background: #f48771; color: #000;',
    BLOCK: 'background: #ff0000; color: #fff;',
  };

  // **WRD-0110: Wording submitted for Warden review**
  const whyContent = getWhyContent(explanation);

  const rulesHtml =
    explanation.matched_rules.length > 0
      ? `<div class="section">
      <div class="section-title">Matched Rules</div>
      <div class="rules-list">${explanation.matched_rules.map((r) => `<span class="rule-badge">${escapeHtml(r)}</span>`).join('')}</div>
    </div>`
      : '';

  const notices = `
    <p class="notice">Derived from the audit entry for ${escapeHtml(explanation.file_path)}. This panel is read-only — it does not change or override save decisions.</p>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <meta charset="UTF-8">
  <title>${escapeHtml(productName)} — Why Panel</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; }
    h1 { margin: 0 0 16px 0; }
    .logo-container { margin-bottom: 16px; }
    .logo { max-height: 60px; width: auto; }
    .decision-banner { padding: 16px; border-radius: 4px; margin-bottom: 24px; }
    .decision-badge { padding: 4px 12px; border-radius: 2px; font-size: 14px; font-weight: 600; display: inline-block; margin-bottom: 8px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: 600; color: #969696; margin-bottom: 8px; }
    .section-content { font-size: 14px; line-height: 1.6; }
    .rules-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .rule-badge { background: #252526; border: 1px solid #3c3c3c; padding: 4px 8px; border-radius: 2px; font-size: 12px; }
    .notice { font-size: 12px; color: #969696; margin: 16px 0; padding: 8px; background: #1e1e1e; border-radius: 2px; }
  </style>
</head>
<body>
  ${logoHtml}
  <h1>${escapeHtml(productName)}</h1>
  
  <div class="decision-banner" style="background: ${escapeHtml(decisionColors[explanation.decision] || '#252526')}">
    <span class="decision-badge" style="${escapeHtml(decisionColors[explanation.decision] || '')}">${escapeHtml(explanation.decision)}</span>
    <div class="file-path" style="margin-top: 8px; font-weight: 600;">${escapeHtml(explanation.file_path)}</div>
  </div>
  
  <div class="section">
    <div class="section-title">Why This Decision Occurred</div>
    <div class="section-content">${whyContent}</div>
  </div>
  
  ${rulesHtml}
  
  <div class="section">
  <div class="section-title">Risk Assessment</div>
  <div class="section-content">Risk level: <strong>${escapeHtml(explanation.risk_level)}</strong></div>
  </div>
  
  <div class="section">
    <div class="section-title">Evaluation Source</div>
    <div class="section-content">${getEvaluationSource(explanation.source, explanation.fallback_cause)}</div>
  </div>
  
  ${notices}
</body>
</html>`;
}

/**
 * Get "why" content based on decision type
 *
 * **WRD-0110: WORDING SUBMITTED FOR WARDEN REVIEW**
 */
function getWhyContent(explanation: WhyExplanation): string {
  switch (explanation.decision) {
    case 'ALLOW':
      return `This save was allowed. The file did not trigger any rules requiring review. Risk level: <strong>${escapeHtml(explanation.risk_level.toLowerCase())}</strong>.`;

    case 'WARN':
      return `This save triggered a warning: ${escapeHtml(explanation.reason.toLowerCase())}. It was allowed to proceed after acknowledgment.`;

    case 'REQUIRE_PLAN':
      return `This save required a linked blueprint: ${escapeHtml(explanation.reason.toLowerCase())}. A directive proof was needed before the save could proceed.`;

    case 'BLOCK':
      return `This save was blocked: ${escapeHtml(explanation.reason.toLowerCase())}. The matched rules required a higher threshold to allow this change.`;

    default:
      return `Decision: ${escapeHtml(explanation.decision)} — ${escapeHtml(explanation.reason)}`;
  }
}

/**
 * Get evaluation source description
 */
function getEvaluationSource(source: string, fallback_cause?: string): string {
  if (source === 'FALLBACK' && fallback_cause) {
    return `Fell back to rule-only mode: ${escapeHtml(fallback_cause)}. The local model was not available.`;
  }
  if (source === 'RULE') {
    return 'Evaluated using rule-based classification only.';
  }
  if (source === 'MODEL') {
    return 'Evaluated using local model assessment.';
  }
  return `Evaluation source: ${escapeHtml(source)}`;
}
