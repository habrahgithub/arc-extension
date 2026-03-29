import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Task Board View Provider — Left Sidebar Task Board (ARC-UX-002)
 *
 * Provides a read-only, local-first task board showing:
 * - Current governed workspace
 * - Recent enforcement decisions
 * - Pending blueprint proofs
 * - Route policy status
 *
 * This is a passive display only — it does not authorize, modify, or bypass enforcement.
 */

export class TaskBoardViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'arc.ui.taskBoard';
  private _view?: vscode.WebviewView;
  private _workspaceRoot: string;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    workspaceRoot: string,
  ) {
    this._workspaceRoot = workspaceRoot;
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(
      async (message: { command?: string }) => {
        switch (message.command) {
          case 'refresh':
            webviewView.webview.html = this._getHtmlForWebview();
            break;
          case 'openAuditReview':
            await vscode.commands.executeCommand('arc.ui.auditReview');
            break;
          case 'openBlueprints':
            await vscode.commands.executeCommand('arc.ui.blueprintProof');
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
    const taskBoardData = this._getTaskBoardData();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ARC XT Task Board</title>
  <style>
    :root {
      --vscode-font-family: var(--vscode-editor-font-family, system-ui);
      --vscode-foreground: var(--vscode-editor-foreground, #cccccc);
      --vscode-editor-background: var(--vscode-editor-background, #1e1e1e);
      --vscode-sideBar-background: var(--vscode-sideBar-background, #252526);
      --vscode-list-hoverBackground: var(--vscode-list-hoverBackground, #2a2d2e);
      --vscode-badge-background: var(--vscode-badge-background, #007acc);
      --vscode-badge-foreground: var(--vscode-badge-foreground, #ffffff);
      --success: #4ec9b0;
      --warning: #dcdcaa;
      --error: #f48771;
      --info: #569cd6;
    }
    body {
      font-family: var(--vscode-font-family);
      font-size: 12px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-sideBar-background);
      margin: 0;
      padding: 8px;
    }
    h2, h3 {
      font-size: 13px;
      font-weight: 600;
      margin: 8px 0 4px 0;
      color: var(--vscode-foreground);
    }
    .section {
      margin-bottom: 12px;
      padding: 6px;
      background-color: var(--vscode-editor-background);
      border-radius: 4px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 0;
    }
    .label {
      color: #858585;
    }
    .value {
      font-weight: 500;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
      background-color: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }
    .badge.success { background-color: var(--success); color: #1e1e1e; }
    .badge.warning { background-color: var(--warning); color: #1e1e1e; }
    .badge.error { background-color: var(--error); color: #1e1e1e; }
    .badge.info { background-color: var(--info); }
    .decision-item {
      padding: 4px 6px;
      margin: 2px 0;
      border-radius: 3px;
      background-color: var(--vscode-list-hoverBackground);
      font-size: 11px;
    }
    .decision-item.blocked { border-left: 3px solid var(--error); }
    .decision-item.warned { border-left: 3px solid var(--warning); }
    .decision-item.allowed { border-left: 3px solid var(--success); }
    .clickable {
      cursor: pointer;
      color: var(--info);
      text-decoration: underline;
    }
    .clickable:hover {
      color: var(--vscode-foreground);
    }
    .empty {
      color: #858585;
      font-style: italic;
      padding: 4px 0;
    }
    button {
      background-color: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border: none;
      padding: 4px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
      margin-top: 4px;
    }
    button:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <h2>$(tasklist) ARC XT Task Board</h2>
  
  <div class="section">
    <h3>Workspace</h3>
    <div class="row">
      <span class="label">Root:</span>
      <span class="value" title="${taskBoardData.workspaceRoot}">${this._truncatePath(taskBoardData.workspaceRoot)}</span>
    </div>
    <div class="row">
      <span class="label">Mode:</span>
      <span class="badge ${taskBoardData.routePolicy === 'RULE_ONLY' ? 'success' : 'info'}">${taskBoardData.routePolicy}</span>
    </div>
    <div class="row">
      <span class="label">Auto-Save:</span>
      <span class="badge ${taskBoardData.autoSaveMode !== 'off' ? 'warning' : 'success'}">${taskBoardData.autoSaveMode}</span>
    </div>
    <button class="clickable" onclick="sendMessage('openRuntimeStatus')">View Full Status</button>
  </div>

  <div class="section">
    <h3>Recent Decisions</h3>
    ${
      taskBoardData.recentDecisions.length === 0
        ? '<div class="empty">No recent decisions</div>'
        : taskBoardData.recentDecisions
            .map(
              (d) => `
          <div class="decision-item ${d.decision.toLowerCase()}">
            <div class="row">
              <span class="badge ${this._getDecisionBadgeClass(d.decision)}">${d.decision}</span>
              <span class="label">${this._truncatePath(d.file_path)}</span>
            </div>
            <div class="row" style="margin-top: 2px;">
              <span class="label" style="font-size: 10px;">${new Date(d.ts).toLocaleTimeString()}</span>
            </div>
          </div>
        `,
            )
            .join('')
    }
    <button class="clickable" onclick="sendMessage('openAuditReview')">Review All</button>
  </div>

  <div class="section">
    <h3>Blueprint Proofs</h3>
    <div class="row">
      <span class="label">Pending:</span>
      <span class="badge ${taskBoardData.pendingBlueprints > 0 ? 'warning' : 'success'}">${taskBoardData.pendingBlueprints}</span>
    </div>
    <button class="clickable" onclick="sendMessage('openBlueprints')">Review Proofs</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    function sendMessage(command, data = {}) {
      vscode.postMessage({ command, ...data });
    }
  </script>
</body>
</html>`;
  }

  private _truncatePath(path: string, maxLength = 25): string {
    if (path.length <= maxLength) {
      return path;
    }
    return '...' + path.slice(-maxLength + 3);
  }

  private _getDecisionBadgeClass(decision: string): string {
    switch (decision) {
      case 'ALLOW':
        return 'success';
      case 'WARN':
        return 'warning';
      case 'REQUIRE_PLAN':
        return 'info';
      case 'BLOCK':
        return 'error';
      default:
        return 'info';
    }
  }

  private _getTaskBoardData(): {
    workspaceRoot: string;
    routePolicy: string;
    autoSaveMode: string;
    recentDecisions: Array<{ ts: string; file_path: string; decision: string }>;
    pendingBlueprints: number;
  } {
    // Read route policy
    let routePolicy = 'RULE_ONLY';
    const routerPath = path.join(this._workspaceRoot, '.arc', 'router.json');
    if (fs.existsSync(routerPath)) {
      try {
        const router = JSON.parse(fs.readFileSync(routerPath, 'utf8')) as {
          mode?: string;
        };
        routePolicy = router.mode || 'RULE_ONLY';
      } catch {
        // ignore
      }
    }

    // Read auto-save mode
    const config = vscode.workspace.getConfiguration('files');
    const autoSaveMode = config.get<string>('autoSave', 'off');

    // Read recent decisions from audit log
    const recentDecisions: Array<{
      ts: string;
      file_path: string;
      decision: string;
    }> = [];
    const auditPath = path.join(this._workspaceRoot, '.arc', 'audit.jsonl');
    if (fs.existsSync(auditPath)) {
      try {
        const content = fs.readFileSync(auditPath, 'utf8');
        const lines = content.trim().split('\n').filter(Boolean).slice(-5); // Last 5
        for (const line of lines) {
          const entry = JSON.parse(line) as {
            ts: string;
            file_path: string;
            decision: string;
          };
          recentDecisions.push({
            ts: entry.ts,
            file_path: entry.file_path,
            decision: entry.decision,
          });
        }
      } catch {
        // ignore read errors
      }
    }

    // Count pending blueprints (simplified - just count .arc/blueprints/*.md files)
    let pendingBlueprints = 0;
    const blueprintsDir = path.join(this._workspaceRoot, '.arc', 'blueprints');
    if (fs.existsSync(blueprintsDir)) {
      try {
        const files = fs
          .readdirSync(blueprintsDir)
          .filter((f) => f.endsWith('.md'));
        pendingBlueprints = files.length;
      } catch {
        // ignore
      }
    }

    return {
      workspaceRoot: this._workspaceRoot,
      routePolicy,
      autoSaveMode,
      recentDecisions: recentDecisions.reverse(), // Most recent last
      pendingBlueprints,
    };
  }
}
