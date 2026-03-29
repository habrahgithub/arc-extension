import * as vscode from 'vscode';
import { LocalReviewSurfaceService } from './reviewSurfaces';

/**
 * Task Board View Provider — Left Sidebar Task Board (ARC-UX-002)
 *
 * Provides a read-only, local-first task board showing:
 * - Current governed workspace
 * - Derived task state from blueprint artifacts (canonical)
 * - Route policy status
 *
 * This is a passive display only — it does not authorize, modify, or bypass enforcement.
 *
 * ARC-UX-002 CORRECTION: Reuses canonical derived Task Board state from
 * LocalReviewSurfaceService.renderTaskBoard() for consistency with Review Home.
 *
 * WARDEN HARDENING: CSP nonce applied, no inline scripts without nonce.
 */

export class TaskBoardViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'arc.ui.taskBoard';
  private _view?: vscode.WebviewView;
  private _reviewService: LocalReviewSurfaceService;
  private _workspaceRoot: string;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    workspaceRoot: string,
  ) {
    this._workspaceRoot = workspaceRoot;
    this._reviewService = new LocalReviewSurfaceService(workspaceRoot);
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview();

    webviewView.webview.onDidReceiveMessage(
      async (message: { command?: string }) => {
        switch (message.command) {
          case 'refresh':
            webviewView.webview.html = this._getHtmlForWebview();
            break;
          case 'openFullTaskBoard':
            await vscode.commands.executeCommand('arc.ui.taskBoard');
            break;
          case 'openRuntimeStatus':
            await vscode.commands.executeCommand('arc.showRuntimeStatus');
            break;
        }
      },
    );
  }

  public refresh(): void {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview();
    }
  }

  private _getHtmlForWebview(): string {
    // Use canonical derived Task Board state from LocalReviewSurfaceService
    const taskBoardMarkdown = this._reviewService.renderTaskBoard();
    const workspaceRoot = this._workspaceRoot;

    // Generate CSP nonce for security hardening
    const nonce = this._generateNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>ARC XT Task Board</title>
  <style nonce="${nonce}">
    :root {
      --vscode-font-family: var(--vscode-editor-font-family, system-ui);
      --vscode-foreground: var(--vscode-editor-foreground, #cccccc);
      --vscode-editor-background: var(--vscode-editor-background, #1e1e1e);
      --vscode-sideBar-background: var(--vscode-sideBar-background, #252526);
      --vscode-badge-background: var(--vscode-badge-background, #007acc);
      --vscode-badge-foreground: var(--vscode-badge-foreground, #ffffff);
    }
    body {
      font-family: var(--vscode-font-family);
      font-size: 12px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-sideBar-background);
      margin: 0;
      padding: 8px;
    }
    h2 { font-size: 13px; font-weight: 600; margin: 0 0 8px 0; }
    h3 { font-size: 12px; font-weight: 600; margin: 10px 0 4px 0; color: #858585; }
    .section { margin-bottom: 12px; padding: 6px; background-color: var(--vscode-editor-background); border-radius: 4px; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; }
    .label { color: #858585; }
    .value { font-weight: 500; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; background-color: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
    .badge.success { background-color: #4ec9b0; color: #1e1e1e; }
    .badge.warning { background-color: #dcdcaa; color: #1e1e1e; }
    .clickable { cursor: pointer; color: #569cd6; text-decoration: underline; font-size: 11px; border: none; background: none; padding: 0; margin-left: 8px; }
    .clickable:hover { color: var(--vscode-foreground); }
    .markdown-body { font-size: 11px; line-height: 1.5; }
    .markdown-body h1 { font-size: 14px; margin: 0 0 8px 0; }
    .markdown-body h2 { font-size: 13px; margin: 12px 0 6px 0; }
    .markdown-body ul { padding-left: 16px; margin: 4px 0; }
    .markdown-body li { margin: 2px 0; }
    .markdown-body code { background-color: var(--vscode-sideBar-background); padding: 1px 4px; border-radius: 2px; font-size: 10px; }
    .markdown-body blockquote { border-left: 3px solid #569cd6; padding-left: 8px; margin: 4px 0; color: #858585; }
    .markdown-body strong { color: var(--vscode-foreground); }
    .empty { color: #858585; font-style: italic; padding: 4px 0; }
  </style>
</head>
<body>
  <h2>$(tasklist) ARC XT Task Board</h2>

  <div class="section">
    <div class="row">
      <span class="label">Workspace:</span>
      <span class="value" title="${workspaceRoot}">${this._truncatePath(workspaceRoot)}</span>
    </div>
    <button class="clickable" onclick="sendMessage('openFullTaskBoard')">Open Full Board</button>
    <button class="clickable" onclick="sendMessage('openRuntimeStatus')">Runtime Status</button>
  </div>

  <div class="section markdown-body">
    ${this._markdownToHtml(taskBoardMarkdown)}
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    function sendMessage(command, data = {}) {
      vscode.postMessage({ command, ...data });
    }
  </script>
</body>
</html>`;
  }

  private _truncatePath(path: string, maxLength = 20): string {
    if (path.length <= maxLength) return path;
    return '...' + path.slice(-maxLength + 3);
  }

  private _generateNonce(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private _markdownToHtml(markdown: string): string {
    let html = markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/^\s*[-*+]\s+(.*$)/gim, '<li>$1</li>')
      .replace(/\n/gim, '<br>');

    html = html.replace(/(<li>.*<\/li>)/gis, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/gim, '');

    return html;
  }
}
