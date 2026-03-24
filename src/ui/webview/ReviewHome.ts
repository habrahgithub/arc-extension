/**
 * Review Home — Screen 1 (ARC-UI-001)
 *
 * Purpose: Entry surface for internal operator review
 * Bounded navigation to existing review/status functions
 *
 * WRD-0096: Identity wording must not overclaim capability
 * WRD-0092: CSP and sanitization applied
 */

import * as vscode from 'vscode';
import { RESTRICTIVE_CSP } from './csp';
import { escapeHtml } from './sanitize';

/**
 * Create and show the Review Home WebviewPanel
 */
export function createReviewHomePanel(): vscode.WebviewPanel {
  const panel = vscode.window.createWebviewPanel(
    'arcReviewHome',
    'ARC — Review Home',
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

  panel.webview.html = getReviewHomeHtml();

  return panel;
}

/**
 * Generate Review Home HTML
 */
function getReviewHomeHtml(): string {
  const productName = 'ARC — Audit Ready Core';
  const postureNotes = [
    'Local-only governance',
    'Descriptive-only review',
    'Non-authorizing surface',
  ];

  const reviewCards = [
    {
      title: 'Runtime Status',
      description: 'Active workspace and decision context',
      command: 'lintel.showRuntimeStatus',
      icon: '📊',
    },
    {
      title: 'Audit Review',
      description: 'Inspect recent audit entries',
      command: 'lintel.reviewAudit',
      icon: '📋',
    },
    {
      title: 'Blueprint Proof Review',
      description: 'Proof lifecycle and validation state',
      command: 'lintel.reviewBlueprints',
      icon: '📄',
    },
    {
      title: 'False-Positive Review',
      description: 'Advisory candidate inspection',
      command: 'lintel.reviewFalsePositives',
      icon: '⚠️',
    },
  ];

  // Build HTML safely using template with escaped values
  const cardsHtml = reviewCards
    .map(
      (card) =>
        `<div class="card" data-command="${escapeHtml(card.command)}">` +
        `<div class="card-icon">${card.icon}</div>` +
        `<h2 class="card-title">${escapeHtml(card.title)}</h2>` +
        `<p class="card-description">${escapeHtml(card.description)}</p></div>`,
    )
    .join('');

  const badgesHtml = postureNotes
    .map((note) => `<span class="posture-badge">${escapeHtml(note)}</span>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="${RESTRICTIVE_CSP}">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(productName)} — Review Home</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; }
    .header { border-bottom: 1px solid #3c3c3c; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0 0 8px 0; font-size: 24px; }
    .posture-notes { display: flex; gap: 12px; flex-wrap: wrap; }
    .posture-badge { background: #0e639c; color: #fff; padding: 4px 8px; border-radius: 2px; font-size: 12px; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
    .card { background: #252526; border: 1px solid #3c3c3c; border-radius: 4px; padding: 16px; cursor: pointer; }
    .card:hover { border-color: #0e639c; }
    .card-icon { font-size: 24px; margin-bottom: 8px; }
    .card-title { font-size: 16px; font-weight: 600; margin: 0 0 8px 0; }
    .card-description { font-size: 13px; color: #969696; margin: 0; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #3c3c3c; font-size: 12px; color: #969696; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(productName)}</h1>
    <div class="posture-notes">${badgesHtml}</div>
  </div>
  <div class="cards-grid">${cardsHtml}</div>
  <div class="footer"><p>Review surfaces are local-only, read-only, and non-authorizing.</p></div>
  <script>(function(){const vscode=acquireVsCodeApi();document.querySelectorAll('.card').forEach(c=>{c.addEventListener('click',()=>{const cmd=c.getAttribute('data-command');if(cmd){vscode.postMessage({type:'exec',cmd});}});});})();</script>
</body>
</html>`;
}

/**
 * Handle messages from Review Home panel
 */
export function handleReviewHomeMessage(message: unknown): void {
  const msg = message as { type?: string; cmd?: string };
  if (msg.type === 'exec' && msg.cmd) {
    const allowed = [
      'lintel.showRuntimeStatus',
      'lintel.reviewAudit',
      'lintel.reviewBlueprints',
      'lintel.reviewFalsePositives',
    ];
    if (allowed.includes(msg.cmd)) {
      void vscode.commands.executeCommand(msg.cmd);
    }
  }
}
