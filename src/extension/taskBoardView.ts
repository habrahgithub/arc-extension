import * as vscode from 'vscode';
import { buildCSPWithNonce, generateNonce } from '../ui/csp.js';
import { LocalReviewSurfaceService } from './reviewSurfaces.js';
import { detectFirstRunState } from '../core/firstRunDetection';

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
 * U01–U04: Root-aware empty-state with bounded next actions.
 * The Task Board can rebind to the correct active governed root when appropriate.
 *
 * WARDEN HARDENING: CSP nonce applied, no inline scripts without nonce.
 */

export class TaskBoardViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'arc.ui.taskBoard';
  private _view?: vscode.WebviewView;
  private _reviewService: LocalReviewSurfaceService;
  private _workspaceRoot: string;
  private _effectiveRoot: string;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    workspaceRoot: string,
  ) {
    this._workspaceRoot = workspaceRoot;
    this._effectiveRoot = workspaceRoot;
    this._reviewService = new LocalReviewSurfaceService(workspaceRoot);
  }

  /**
   * Rebind the Task Board to a different governed root.
   * Used when the operator selects a different root during first-run flow.
   */
  public rebindToRoot(newRoot: string): void {
    this._effectiveRoot = newRoot;
    this._reviewService = new LocalReviewSurfaceService(newRoot);
    this.refresh();
  }

  public get effectiveRoot(): string {
    return this._effectiveRoot;
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      // Scoped to Public/Logo only (WRD-0129 follow-up hardening)
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'Public', 'Logo'),
      ],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      async (message: { command?: string }) => {
        switch (message.command) {
          case 'refresh':
            webviewView.webview.html = this._getHtmlForWebview(
              webviewView.webview,
            );
            break;
          case 'openFullTaskBoard':
            await vscode.commands.executeCommand('arc.ui.taskBoard');
            break;
          case 'openRuntimeStatus':
            await vscode.commands.executeCommand('arc.showRuntimeStatus');
            break;
          case 'reviewGovernedRoot':
            await vscode.commands.executeCommand('arc.reviewGovernedRoot');
            break;
          case 'createArcConfig':
            await vscode.commands.executeCommand('arc.createArcConfig');
            break;
          case 'createFirstBlueprint':
            await vscode.commands.executeCommand('arc.createFirstBlueprint');
            break;
          case 'useExistingConfig':
            await vscode.commands.executeCommand('arc.useExistingConfig');
            break;
        }
      },
    );
  }

  public refresh(): void {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Use canonical derived Task Board state from LocalReviewSurfaceService
    const taskBoardMarkdown = this._reviewService.renderTaskBoard();
    const effectiveRoot = this._effectiveRoot;

    // Detect first-run state for bounded empty-state actions (U01–U04)
    const firstRunState = detectFirstRunState(effectiveRoot);
    const isEmpty =
      taskBoardMarkdown.trim() === '' ||
      taskBoardMarkdown.includes('No task board');

    // Generate CSP nonce for security hardening
    const nonce = generateNonce();
    const csp = buildCSPWithNonce(nonce, webview.cspSource);

    const logoPath = vscode.Uri.joinPath(
      this._extensionUri,
      'Public',
      'Logo',
      'ARC-ICON-1024.png',
    );
    const logoUri = webview.asWebviewUri(logoPath).toString();

    // Bounded empty-state actions (U04)
    const emptyStateActions = isEmpty
      ? `
  <div class="section">
    <h3>No Blueprint Artifacts Found</h3>
    <p class="empty">No local blueprints exist for the current governed root.</p>
    <div class="empty-actions">
      <button class="action-btn" onclick="sendMessage('reviewGovernedRoot')">🔍 Review Governed Root</button>
      <button class="action-btn" onclick="sendMessage('createArcConfig')">⚙️ Create Minimal ARC Config</button>
      <button class="action-btn" onclick="sendMessage('createFirstBlueprint')">📄 Create First Blueprint</button>
      <button class="action-btn" onclick="sendMessage('useExistingConfig')">📂 Use Existing ARC Config</button>
    </div>
  </div>`
      : '';

    // Root info section
    const rootInfo = `
  <div class="section">
    <div class="row">
      <span class="label">Governed Root:</span>
      <span class="value" title="${effectiveRoot}">${this._truncatePath(effectiveRoot)}</span>
    </div>
    <div class="row">
      <span class="label">ARC Config:</span>
      <span class="badge ${firstRunState.hasArcConfig ? 'success' : 'warning'}">${firstRunState.hasArcConfig ? 'Present' : 'Missing'}</span>
    </div>
    <div class="row">
      <span class="label">Blueprints:</span>
      <span class="badge ${firstRunState.hasBlueprints ? 'success' : 'warning'}">${firstRunState.hasBlueprints ? 'Present' : 'None'}</span>
    </div>
    <button class="clickable" onclick="sendMessage('openFullTaskBoard')">Open Full Board</button>
    <button class="clickable" onclick="sendMessage('openRuntimeStatus')">Runtime Status</button>
  </div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
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
    h2 { font-size: 13px; font-weight: 600; margin: 0; }
    h3 { font-size: 12px; font-weight: 600; margin: 10px 0 4px 0; color: #858585; }
    .header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .logo { width: 18px; height: 18px; object-fit: contain; }
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
    .empty-actions { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
    .action-btn { cursor: pointer; color: #569cd6; font-size: 11px; border: 1px solid #569cd6; background: none; padding: 4px 8px; border-radius: 3px; text-align: left; }
    .action-btn:hover { background-color: #569cd622; }
  </style>
</head>
<body>
  <div class="header">
    <img class="logo" src="${logoUri}" alt="ARC XT logo" />
    <h2>ARC XT Task Board</h2>
  </div>

  ${rootInfo}
  ${emptyStateActions}

  <div class="section markdown-body">
    ${isEmpty ? '<p class="empty">No task board content available. Use the actions above to get started.</p>' : this._markdownToHtml(taskBoardMarkdown)}
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
