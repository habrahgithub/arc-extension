import * as vscode from 'vscode';
import * as path from 'node:path';
import { buildCSPWithNonce, generateNonce } from '../csp';
import { escapeHtml } from '../sanitize';
import {
  LocalReviewSurfaceService,
  type TaskBoardItem,
} from '../../extension/reviewSurfaces';

// Phase 7.10 — Task Board v1 (ARC-UI-002)
// Uses centralized review-surface model from reviewSurfaces.ts
export function createTaskBoardPanel(
  context: vscode.ExtensionContext,
): vscode.WebviewPanel {
  const nonce = generateNonce();
  const workspaceRoot = getWorkspaceRoot();
  const reviewService = new LocalReviewSurfaceService(workspaceRoot);

  // ARC-BRAND-001: Scoped logo resource for header branding
  const panel = vscode.window.createWebviewPanel(
    'arcTaskBoard',
    'ARC XT Task Board',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'Public', 'Logo'),
      ],
    },
  );

  // Use centralized review-surface rendering
  const boardContent = reviewService.renderTaskBoard();

  const csp = buildCSPWithNonce(nonce, panel.webview.cspSource);

  const logoPath = vscode.Uri.joinPath(
    context.extensionUri,
    'Public',
    'Logo',
    'ARC-ICON-1024.png',
  );
  const logoUri = panel.webview.asWebviewUri(logoPath).toString();

  const rendered = renderMarkdown(boardContent);
  const titleMatch = rendered.match(/<h1>(.*?)<\/h1>/s);
  const titleHtml = titleMatch ? `<h1>${titleMatch[1]}</h1>` : '<h1>ARC XT Task Board</h1>';
  const bodyHtml = titleMatch ? rendered.replace(titleMatch[0], '') : rendered;

  panel.webview.html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ARC XT Task Board</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      line-height: 1.6;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .logo {
      width: 28px;
      height: 28px;
      object-fit: contain;
    }
    h1 {
      margin: 0;
    }
    h2 {
      margin-top: 24px;
      color: var(--vscode-editor-foreground);
    }
    h3, h4 {
      margin-top: 16px;
    }
    code {
      background-color: var(--vscode-textCodeBlock-background);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family);
      font-size: 0.9em;
    }
    em {
      color: var(--vscode-descriptionForeground);
    }
    strong {
      color: var(--vscode-editor-foreground);
    }
    ul {
      padding-left: 20px;
    }
    hr {
      border: none;
      border-top: 1px solid var(--vscode-panel-border);
      margin: 20px 0;
    }
    .posture-badge {
      display: inline-block;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 12px;
      margin-right: 8px;
    }
    .posture-badges {
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div class="header">
    <img class="logo" src="${escapeHtml(logoUri)}" alt="ARC XT logo" />
    ${titleHtml}
  </div>
  ${bodyHtml}
</body>
</html>
  `;

  return panel;
}

function getWorkspaceRoot(): string {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    throw new Error('No workspace folder open');
  }
  return folders[0].uri.fsPath;
}

// Simple markdown-to-HTML renderer for Task Board content
function renderMarkdown(md: string): string {
  return (
    md
      // Headers
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // Line breaks
      .replace(/\n/g, '<br>\n')
      // Horizontal rules
      .replace(/^---$/gm, '<hr>')
      // Lists (simple bullet handling)
      .replace(/^- (.*$)/gm, '<li>$1</li>')
  );
}
