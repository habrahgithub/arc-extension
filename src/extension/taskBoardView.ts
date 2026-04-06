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
      // @ts-expect-error — retainContextWhenHidden is a valid VS Code webview option not exposed in types
      retainContextWhenHidden: true,
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
          case 'createFirstBlueprint':
            await vscode.commands.executeCommand('arc.createFirstBlueprint');
            break;
          case 'createArcConfig':
            await vscode.commands.executeCommand('arc.createArcConfig');
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

    // Count open tasks from markdown (Phase B — slim summary)
    const taskCount = isEmpty
      ? 0
      : (taskBoardMarkdown.match(/^[-*]\s+/gm) || []).length;

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
    }
    body {
      font-family: var(--vscode-font-family);
      font-size: 12px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-sideBar-background);
      margin: 0;
      padding: 8px;
    }
    .header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .logo { width: 18px; height: 18px; object-fit: contain; }
    .title { font-size: 13px; font-weight: 600; margin: 0; }
    .summary {
      padding: 8px 10px;
      background-color: var(--vscode-editor-background);
      border-radius: 6px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .summary-left { display: flex; align-items: center; gap: 6px; }
    .summary-icon {
      width: 24px; height: 24px; border-radius: 6px;
      background: rgba(159,202,255,0.1);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
    }
    .summary-label { font-size: 12px; font-weight: 500; }
    .summary-count {
      font-size: 10px; font-weight: 700;
      background: rgba(159,202,255,0.15);
      color: rgba(159,202,255,0.9);
      padding: 2px 8px; border-radius: 99px;
      letter-spacing: 0.06em;
    }
    .detail-btn {
      width: 100%; padding: 8px;
      background: rgba(159,202,255,0.08);
      border: 1px solid rgba(159,202,255,0.15);
      border-radius: 6px;
      color: rgba(159,202,255,0.9);
      font-size: 11px; font-weight: 600;
      cursor: pointer; text-align: center;
      text-transform: uppercase; letter-spacing: 0.08em;
      transition: background 0.15s;
    }
    .detail-btn:hover { background: rgba(159,202,255,0.14); }
    .root-info {
      padding: 6px 10px;
      background-color: var(--vscode-editor-background);
      border-radius: 6px;
      margin-bottom: 10px;
    }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; }
    .label { color: #858585; font-size: 10px; }
    .value { font-weight: 500; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; }
    .badge {
      display: inline-block; padding: 1px 6px; border-radius: 3px;
      font-size: 9px; font-weight: 600;
    }
    .badge.success { background-color: #4ec9b0; color: #1e1e1e; }
    .badge.warning { background-color: #dcdcaa; color: #1e1e1e; }
    .empty-state {
      padding: 12px 10px; text-align: center;
      color: #858585; font-size: 11px; line-height: 1.5;
    }
    .empty-actions { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
    .action-btn {
      cursor: pointer; color: #569cd6; font-size: 11px;
      border: 1px solid #569cd6; background: none;
      padding: 5px 8px; border-radius: 4px; text-align: left;
      transition: background 0.15s;
    }
    .action-btn:hover { background-color: #569cd622; }
  </style>
</head>
<body>
  <div class="header">
    <img class="logo" src="${logoUri}" alt="ARC XT logo" />
    <h2 class="title">ARC XT</h2>
  </div>

  <div class="summary">
    <div class="summary-left">
      <div class="summary-icon">◻</div>
      <span class="summary-label">Tasks</span>
    </div>
    <span class="summary-count">${taskCount} open</span>
  </div>

  <button class="detail-btn" id="btn-openFullTaskBoard">Open Task Details</button>

  <div class="root-info" style="margin-top:10px">
    <div class="row">
      <span class="label">Root</span>
      <span class="value" title="${effectiveRoot}">${this._truncatePath(effectiveRoot)}</span>
    </div>
    <div class="row">
      <span class="label">Config</span>
      <span class="badge ${firstRunState.hasArcConfig ? 'success' : 'warning'}">${firstRunState.hasArcConfig ? 'Present' : 'Missing'}</span>
    </div>
    <div class="row">
      <span class="label">Blueprints</span>
      <span class="badge ${firstRunState.hasBlueprints ? 'success' : 'warning'}">${firstRunState.hasBlueprints ? 'Present' : 'None'}</span>
    </div>
  </div>

  ${
    isEmpty
      ? `
  <div class="empty-state">
    No blueprint artifacts yet.<br/>
    Make a governed save to create your first task.
    <div class="empty-actions">
      <button class="action-btn" id="btn-createFirstBlueprint">Create First Blueprint</button>
      <button class="action-btn" id="btn-createArcConfig">Create ARC Config</button>
    </div>
  </div>`
      : ''
  }

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    function sendMessage(command) {
      vscode.postMessage({ command });
    }
    [
      ['btn-openFullTaskBoard', 'openFullTaskBoard'],
      ['btn-createFirstBlueprint', 'createFirstBlueprint'],
      ['btn-createArcConfig', 'createArcConfig'],
    ].forEach(function([id, cmd]) {
      var el = document.getElementById(id);
      if (el) { el.addEventListener('click', function() { sendMessage(cmd); }); }
    });
  </script>
</body>
</html>`;
  }

  private _truncatePath(path: string, maxLength = 20): string {
    if (path.length <= maxLength) return path;
    return '...' + path.slice(-maxLength + 3);
  }
}
