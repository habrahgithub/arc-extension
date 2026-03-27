/**
 * Review Home — Screen 1 (ARC-UI-001)
 *
 * Purpose: Entry surface for internal operator review
 * Bounded navigation to existing review/status functions
 *
 * WRD-0096: Identity wording must not overclaim capability
 * WRD-0092: CSP and sanitization applied
 * WRD-0097: Nonce-based CSP for inline scripts
 * ARC-BRAND-001: Logo integration in header
 */

import * as vscode from 'vscode';
import { buildCSPWithNonce, generateNonce } from '../csp';
import { escapeHtml } from '../sanitize';

/**
 * Create and show the Review Home WebviewPanel
 *
 * WRD-0097 Fix: Generate nonce per webview instance for CSP compliance
 * ARC-BRAND-001: Scoped localResourceRoots for logo (WRD-0114)
 */
export function createReviewHomePanel(
  context?: vscode.ExtensionContext,
): vscode.WebviewPanel {
  const nonce = generateNonce();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const panel = vscode.window.createWebviewPanel(
    'arcReviewHome',
    'ARC — Review Home',
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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  panel.webview.html = getReviewHomeHtml(nonce, panel, context);

  return panel;
}

/**
 * Generate Review Home HTML with nonce-based CSP
 *
 * WRD-0096 Compliance: Identity wording bounded to actual capability
 * WRD-0097 Compliance: Nonce in both CSP and script tag
 * ARC-BRAND-001: Logo in header (WRD-0115: branding-truthful)
 */
function getReviewHomeHtml(
  nonce: string,
  panel: vscode.WebviewPanel,
  context?: vscode.ExtensionContext,
): string {
  const csp = buildCSPWithNonce(nonce, panel.webview.cspSource);
  const productName = 'ARC — Audit Ready Core';
  const postureNotes = [
    'Local-only governance',
    'Descriptive-only review',
    'Non-authorizing surface',
  ];

  // ARC-BRAND-001: Logo URI (WRD-0116: local only, no remote)
  let logoUri = '';
  if (context && panel) {
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

  const reviewCards = [
    {
      title: 'Runtime Status',
      description: 'Active workspace and decision context',
      command: 'arc.ui.runtimeStatus',
      icon: '📊',
    },
    {
      title: 'Audit Review',
      description: 'Inspect recent audit entries',
      command: 'arc.ui.auditReview',
      icon: '📋',
    },
    {
      title: 'Blueprint Proof Review',
      description: 'Proof lifecycle and validation state',
      command: 'arc.ui.blueprintProof',
      icon: '📄',
    },
    {
      title: 'False-Positive Review',
      description: 'Advisory candidate inspection',
      command: 'arc.ui.falsePositiveReview',
      icon: '⚠️',
    },
  ];

  // Build HTML safely using template with escaped values
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
  const cardsHtml = reviewCards
    .map(
      (card) =>
        `<div class="card" data-command="${escapeHtml(card.command)}">` +
        `<div class="card-icon">${card.icon}</div>` +
        `<h2 class="card-title">${escapeHtml(card.title)}</h2>` +
        `<p class="card-description">${escapeHtml(card.description)}</p></div>`,
    )
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    .join('');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
  const badgesHtml = postureNotes
    .map((note) => `<span class="posture-badge">${escapeHtml(note)}</span>`)
    .join('');

  // Inline script with nonce attribute (WRD-0097 fix)
  const inlineScript = `(function(){const vscode=acquireVsCodeApi();document.querySelectorAll('.card').forEach(c=>{c.addEventListener('click',()=>{const cmd=c.getAttribute('data-command');if(cmd){vscode.postMessage({type:'exec',cmd});}});});})();`;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(productName)} — Review Home</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; }
    .header { border-bottom: 1px solid #3c3c3c; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0 0 8px 0; font-size: 24px; }
    .logo-container { margin-bottom: 16px; }
    .logo { max-height: 60px; width: auto; }
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
    ${logoHtml}
    <h1>${escapeHtml(productName)}</h1>
    <div class="posture-notes">${badgesHtml}</div>
  </div>
  <div class="cards-grid">${cardsHtml}</div>
  <div class="footer"><p>Review surfaces are local-only, read-only, and non-authorizing.</p></div>
  <script nonce="${escapeHtml(nonce)}">${inlineScript}</script>
</body>
</html>`;
}

/**
 * Handle messages from Review Home panel
 *
 * WRD-0092 Compliance: Whitelist-based command validation
 * OBS-S-7051: Command IDs declared and whitelisted
 */
export function handleReviewHomeMessage(message: unknown): void {
  const msg = message as { type?: string; cmd?: string };
  if (msg.type === 'exec' && msg.cmd) {
    // Whitelist of allowed commands (WRD-0092: no arbitrary command execution)
    const allowed = [
      'arc.showRuntimeStatus',
      'arc.reviewAudit',
      'arc.reviewBlueprints',
      'arc.reviewFalsePositives',
      // ARC-UI-001b commands
      'arc.ui.runtimeStatus',
      'arc.ui.auditReview',
      // ARC-UI-001c commands
      'arc.ui.blueprintProof',
      'arc.ui.falsePositiveReview',
      'arc.ui.guidedWorkflow',
    ];
    if (allowed.includes(msg.cmd)) {
      void vscode.commands.executeCommand(msg.cmd);
    }
  }
}
