/**
 * ARC XT — Liquid Shell (Command Centre)
 *
 * ARC-UI-MINIMAL-001: Collapsed to single tab surface.
 * Sidebar = launcher only. Tab = Tasks + Review.
 * No rail, no secondary sidebar, no Architect/Runtime tabs.
 */

import * as vscode from 'vscode';
import { buildCSPWithNonce, generateNonce } from '../csp';
import { escapeHtml } from '../sanitize';
import type { GuardrailUpdate } from '../../contracts/types';

export function createLiquidShellPanel(
  context: vscode.ExtensionContext,
): vscode.WebviewPanel {
  const nonce = generateNonce();

  const panel = vscode.window.createWebviewPanel(
    'arcLiquidShell',
    'ARC XT',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'Public', 'Logo'),
      ],
    },
  );

  const logoPath = vscode.Uri.joinPath(
    context.extensionUri,
    'Public',
    'Logo',
    'ARC-ICON-1024.png',
  );
  const logoUri = panel.webview.asWebviewUri(logoPath).toString();
  const csp = buildCSPWithNonce(nonce, panel.webview.cspSource);

  panel.webview.html = buildLiquidShellHtml({ nonce, csp, logoUri });

  panel.webview.onDidReceiveMessage(
    async (message: {
      command?: string;
      commandId?: string;
      route?: string;
    }) => {
      if (message.command === 'executeCommand' && message.commandId) {
        await vscode.commands.executeCommand(message.commandId);
      }
    },
  );

  return panel;
}

interface LiquidShellOpts {
  nonce: string;
  csp: string;
  logoUri: string;
}

/** Sidebar WebviewViewProvider — minimal launcher only */
export class LiquidShellViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'arc.ui.liquidShell';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      // @ts-expect-error — retainContextWhenHidden is a valid VS Code webview option
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'Public', 'Logo'),
      ],
    };
    const nonce = generateNonce();
    const csp = buildCSPWithNonce(nonce, webviewView.webview.cspSource);
    const logoUri = webviewView.webview
      .asWebviewUri(
        vscode.Uri.joinPath(
          this._extensionUri,
          'Public',
          'Logo',
          'ARC-ICON-1024.png',
        ),
      )
      .toString();
    webviewView.webview.html = buildSidebarLauncherHtml({
      nonce,
      csp,
      logoUri,
    });
    webviewView.webview.onDidReceiveMessage(
      async (message: { command?: string; commandId?: string }) => {
        if (message.command === 'executeCommand' && message.commandId) {
          await vscode.commands.executeCommand(message.commandId);
        }
      },
    );
  }

  public reveal(): void {
    this._view?.show(false);
  }

  public sendGuardrailUpdate(update: GuardrailUpdate): void {
    void this._view?.webview.postMessage({ type: 'guardrailUpdate', update });
  }
}

/** Minimal sidebar launcher — ARC identity + Open Panel button */
function buildSidebarLauncherHtml(opts: {
  nonce: string;
  csp: string;
  logoUri: string;
}): string {
  const { nonce, csp, logoUri } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="Content-Security-Policy" content="${csp}"/>
<style nonce="${nonce}">
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--vscode-font-family, system-ui, sans-serif);
    font-size: 12px;
    color: var(--vscode-foreground, #cccccc);
    background: var(--vscode-sideBar-background, #252526);
    padding: 16px 12px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 12px;
  }
  .identity { display: flex; align-items: center; gap: 8px; }
  .identity img { width: 24px; height: 24px; border-radius: 4px; }
  .identity span { font-size: 13px; font-weight: 600; color: var(--vscode-textLink-foreground, #3794ff); }
  .open-btn {
    width: 100%; padding: 8px 12px;
    background: var(--vscode-button-background, #0e639c);
    color: var(--vscode-button-foreground, #ffffff);
    border: none; border-radius: 4px;
    font-size: 12px; font-weight: 500; cursor: pointer;
    text-align: center; transition: opacity 0.15s;
  }
  .open-btn:hover { opacity: 0.9; }
  .hint { font-size: 10px; color: var(--vscode-descriptionForeground, #808080); text-align: center; }
</style>
</head>
<body>
  <div class="identity">
    <img src="${logoUri}" alt="ARC XT"/>
    <span>ARC XT</span>
  </div>
  <button class="open-btn" id="btn-open">Open ARC Panel</button>
  <div class="hint">Governance layer for AI-assisted coding</div>
<script nonce="${nonce}">
  (function() {
    var vscode = acquireVsCodeApi();
    document.getElementById('btn-open').addEventListener('click', function() {
      vscode.postMessage({ command: 'executeCommand', commandId: 'arc.ui.liquidShell' });
    });
  })();
</script>
</body>
</html>`;
}

/** Minimal tab surface — Tasks + Review only */
function buildLiquidShellHtml(opts: LiquidShellOpts): string {
  const { nonce, csp, logoUri } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}"/>
<title>ARC XT</title>
<style nonce="${nonce}">
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--vscode-font-family, system-ui, sans-serif);
    font-size: 12px;
    color: var(--vscode-foreground, #cccccc);
    background: var(--vscode-editor-background, #1e1e1e);
    height: 100vh; overflow: hidden;
    display: flex; flex-direction: column;
  }

  /* ── Tab Bar ── */
  .tabs {
    display: flex; align-items: center;
    background: var(--vscode-panel-background, #252526);
    border-bottom: 1px solid var(--vscode-panel-border, #80808059);
    flex-shrink: 0;
  }
  .tab {
    padding: 8px 16px;
    font-size: 12px; font-weight: 500;
    color: var(--vscode-tab-inactiveForeground, #999);
    background: transparent;
    border: none; border-bottom: 1px solid transparent;
    cursor: pointer; transition: color 0.15s, border-color 0.15s;
  }
  .tab:hover { color: var(--vscode-foreground, #ccc); }
  .tab.active {
    color: var(--vscode-tab-activeForeground, #fff);
    border-bottom-color: var(--vscode-tab-activeBorder, #3794ff);
  }

  /* ── Content ── */
  .content {
    flex: 1; overflow-y: auto; padding: 16px;
  }
  .content::-webkit-scrollbar { width: 6px; }
  .content::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background, #79797966); border-radius: 3px; }

  .view { display: none; }
  .view.active { display: block; }

  /* ── Cards ── */
  .card {
    background: var(--vscode-editor-background, #1e1e1e);
    border: 1px solid var(--vscode-widget-border, #80808059);
    border-radius: 6px; padding: 14px; margin-bottom: 12px;
  }
  .card-label {
    font-size: 10px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--vscode-descriptionForeground, #808080);
    margin-bottom: 6px;
  }
  .card-value { font-size: 14px; font-weight: 600; color: var(--vscode-foreground, #ccc); }
  .card-desc { font-size: 11px; color: var(--vscode-descriptionForeground, #808080); margin-top: 4px; font-style: italic; }

  /* ── Task Rows ── */
  .task-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 12px; margin-bottom: 4px;
    border-radius: 4px;
    background: var(--vscode-list-hoverBackground, #2a2d2e);
    transition: background 0.1s;
  }
  .task-row:hover { background: var(--vscode-list-activeSelectionBackground, #094771); }
  .task-name { font-size: 12px; font-weight: 500; }
  .task-id { font-size: 10px; color: var(--vscode-textLink-foreground, #3794ff); margin-left: 8px; font-family: var(--vscode-editor-font-family, monospace); }
  .task-phase { font-size: 10px; color: var(--vscode-descriptionForeground, #808080); }

  /* ── Pills ── */
  .pill {
    display: inline-flex; align-items: center;
    border-radius: 999px; padding: 2px 8px;
    font-size: 9px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  .pill-info { background: rgba(56,189,248,0.15); color: rgba(186,230,253,0.9); }
  .pill-good { background: rgba(16,185,129,0.15); color: rgba(167,243,208,0.9); }
  .pill-warn { background: rgba(245,158,11,0.15); color: rgba(253,224,71,0.9); }
  .pill-neutral { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); }

  /* ── Deviation Rows ── */
  .deviation-row {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 10px 12px; margin-bottom: 4px;
    border-radius: 4px; border-left: 3px solid transparent;
    background: var(--vscode-list-hoverBackground, #2a2d2e);
  }
  .deviation-row.sev-high { border-left-color: #ee7d77; }
  .deviation-row.sev-medium { border-left-color: #f59e0b; }
  .deviation-row.sev-low { border-left-color: #9fcaff; }
  .deviation-text { font-size: 11px; line-height: 1.4; flex: 1; }
  .deviation-loc { font-size: 9px; color: var(--vscode-descriptionForeground, #808080); font-family: var(--vscode-editor-font-family, monospace); white-space: nowrap; }

  /* ── Empty State ── */
  .empty { text-align: center; padding: 40px 20px; color: var(--vscode-descriptionForeground, #808080); }
  .empty-icon { font-size: 28px; margin-bottom: 8px; opacity: 0.3; }
  .empty-text { font-size: 12px; }

  /* ── Terminal ── */
  .terminal {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px; line-height: 1.6;
    background: var(--vscode-terminal-background, #000);
    border: 1px solid var(--vscode-widget-border, #80808059);
    border-radius: 4px; padding: 12px;
    color: var(--vscode-terminal-foreground, #ccc);
  }
  .ts-green { color: #7aec8d; }
  .ts-amber { color: rgba(253,224,71,0.85); }
  .ts-sky { color: var(--vscode-textLink-foreground, #3794ff); }
</style>
</head>
<body>

<!-- Tab Bar -->
<div class="tabs">
  <button class="tab active" data-view="tasks">Tasks</button>
  <button class="tab" data-view="review">Review</button>
</div>

<!-- Content -->
<div class="content">

  <!-- ═══ Tasks View ═══ -->
  <div class="view active" id="view-tasks">
    <div class="card">
      <div class="card-label">Active Directive</div>
      <div class="card-desc">No active directive — open a governed workspace to begin.</div>
    </div>

    <div class="card">
      <div class="card-label">Task Pipeline</div>
      <div class="card-desc" style="padding:20px 0">No tasks loaded — open a governed workspace to see your task pipeline.</div>
    </div>

    <div class="card">
      <div class="card-label">Recent Activity</div>
      <div class="terminal">
        <div><span class="ts-green">[ready]</span> ARC XT loaded</div>
        <div><span class="ts-sky">[info]</span> Open a governed workspace to activate enforcement</div>
      </div>
    </div>
  </div>

  <!-- ═══ Review View ═══ -->
  <div class="view" id="view-review">
    <div class="card">
      <div class="card-label">Review Surface</div>
      <div class="card-desc">No deviations found — open a governed workspace and save a file to see review results.</div>
    </div>

    <div class="card">
      <div class="card-label">Example Deviation Format</div>
      <div class="deviation-row sev-high">
        <div style="flex:1">
          <div class="deviation-text">Missing strict type enforcement in payload route</div>
          <div class="task-phase">Rule BR-02 · Type validation bypass</div>
        </div>
        <div class="deviation-loc">L:08</div>
        <span class="pill pill-warn">Low confidence</span>
      </div>
      <div class="deviation-row sev-medium">
        <div style="flex:1">
          <div class="deviation-text">Token TTL configuration is hardcoded</div>
          <div class="task-phase">Rule BR-04 · Token lifecycle policy</div>
        </div>
        <div class="deviation-loc">L:13</div>
        <span class="pill pill-info">Medium confidence</span>
      </div>
    </div>
  </div>

</div>

<script nonce="${nonce}">
  (function() {
    var vscode = acquireVsCodeApi();

    // Tab switching
    document.querySelectorAll('.tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        var viewId = tab.getAttribute('data-view');
        document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
        document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
        tab.classList.add('active');
        document.getElementById('view-' + viewId).classList.add('active');
      });
    });
  })();
</script>
</body>
</html>`;
}
