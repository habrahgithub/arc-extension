/**
 * ARC XT — Liquid Shell (Command Centre)
 *
 * ARC-UI-MINIMAL-001 / ARC-UI-PLANNING-001
 * Phase C+D: Issues/Review tabs, action-tightened issue cards, bounded AI handoff.
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
    async (message: { command?: string; commandId?: string }) => {
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

/** Minimal tab surface — Issues + Review only */
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
  .tabs {
    display: flex; align-items: center; height: 32px; flex-shrink: 0;
    background: var(--vscode-panel-background, #252526);
    border-bottom: 1px solid var(--vscode-widget-border, #80808059);
  }
  .tab {
    padding: 0 12px; height: 100%;
    font-size: 11px; font-weight: 500;
    color: var(--vscode-tab-inactiveForeground, #999);
    background: transparent; border: none; border-bottom: 1px solid transparent;
    cursor: pointer; transition: all 0.15s;
  }
  .tab:hover { color: var(--vscode-foreground, #ccc); }
  .tab.active {
    color: var(--vscode-tab-activeForeground, #fff);
    border-bottom-color: var(--vscode-tab-activeBorder, #3794ff);
  }
  .content { flex: 1; overflow-y: auto; padding: 12px; }
  .content::-webkit-scrollbar { width: 6px; }
  .content::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background, #79797966); border-radius: 3px; }
  .view { display: none; max-width: 720px; margin: 0 auto; width: 100%; }
  .view.active { display: block; }

  .issue-card {
    background: var(--vscode-editor-background, #1e1e1e);
    border: 1px solid var(--vscode-widget-border, #80808059);
    border-radius: 6px; padding: 12px; margin-bottom: 8px;
    border-left: 3px solid var(--vscode-editorWarning-foreground, #cca700);
  }
  .issue-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .risk-badge {
    font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 3px;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .risk-high { background: rgba(241,76,76,0.15); color: var(--vscode-editorError-foreground, #f14c4c); }
  .risk-medium { background: rgba(204,167,0,0.15); color: var(--vscode-editorWarning-foreground, #cca700); }
  .risk-low { background: rgba(159,202,255,0.15); color: var(--vscode-textLink-foreground, #3794ff); }
  .file-path { font-size: 10px; color: var(--vscode-descriptionForeground, #808080); font-family: var(--vscode-editor-font-family, monospace); }
  .issue-title { font-size: 12px; font-weight: 500; margin-bottom: 2px; }
  .issue-reason { font-size: 10px; color: var(--vscode-descriptionForeground, #808080); margin-bottom: 8px; }

  .actions { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 8px; }
  .btn {
    font-size: 10px; padding: 3px 8px; border-radius: 3px; cursor: pointer;
    background: var(--vscode-button-secondaryBackground, #3a3d41);
    color: var(--vscode-button-secondaryForeground, #cccccc);
    border: 1px solid transparent; transition: opacity 0.15s;
  }
  .btn:hover { opacity: 0.9; }
  .btn-primary { background: var(--vscode-button-background, #0e639c); color: var(--vscode-button-foreground, #ffffff); }
  .btn-secondary { background: transparent; border-color: var(--vscode-widget-border, #80808059); }

  .empty { text-align: center; padding: 48px 16px; color: var(--vscode-descriptionForeground, #808080); }
  .empty-icon { font-size: 24px; margin-bottom: 6px; opacity: 0.4; }
  .empty-text { font-size: 11px; font-weight: 500; margin-bottom: 4px; }
  .empty-hint { font-size: 10px; }

  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.6);
    display: none; align-items: center; justify-content: center; z-index: 100;
  }
  .modal-overlay.active { display: flex; }
  .modal {
    background: var(--vscode-editor-background, #1e1e1e);
    border: 1px solid var(--vscode-widget-border, #80808059);
    border-radius: 6px; padding: 16px; max-width: 480px; width: 90%;
  }
  .modal-title { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
  .modal-body { font-size: 11px; line-height: 1.5; margin-bottom: 12px; color: var(--vscode-foreground, #ccc); }
  .modal-actions { display: flex; justify-content: flex-end; gap: 6px; }
</style>
</head>
<body>
<div class="tabs">
  <button class="tab active" data-view="issues">Issues</button>
  <button class="tab" data-view="review">Review</button>
</div>
<div class="content">
  <div class="view active" id="view-issues">
    <div class="empty">
      <div class="empty-icon">🛡️</div>
      <div class="empty-text">No governed issues in the current file.</div>
      <div class="empty-hint">ARC is monitoring save events.</div>
    </div>
  </div>

  <div class="view" id="view-review">
    <div class="empty">
      <div class="empty-icon">📋</div>
      <div class="empty-text">No review events yet.</div>
      <div class="empty-hint">Save a file to see audit history here.</div>
    </div>
  </div>
</div>

<div class="modal-overlay" id="modal-overlay">
  <div class="modal">
    <div class="modal-title" id="modal-title">ARC XT</div>
    <div class="modal-body" id="modal-body"></div>
    <div class="modal-actions">
      <button class="btn btn-primary" id="modal-ok">OK</button>
      <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
    </div>
  </div>
</div>

<script nonce="${nonce}">
  (function() {
    var vscode = acquireVsCodeApi();
    document.querySelectorAll('.tab').forEach(function(t) {
      t.addEventListener('click', function() {
        document.querySelectorAll('.tab').forEach(function(x) { x.classList.remove('active'); });
        document.querySelectorAll('.view').forEach(function(x) { x.classList.remove('active'); });
        t.classList.add('active');
        document.getElementById('view-' + t.getAttribute('data-view')).classList.add('active');
      });
    });

    document.querySelectorAll('.btn[data-action]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var action = btn.getAttribute('data-action');
        var content = '';
        switch(action) {
          case 'explain':
            content = 'This violates <strong>Rule BR-02</strong> (Type Validation Bypass).<br/><br/>The payload is cast to <code>any</code> without schema validation, allowing unsafe data to bypass type checks.<br/><br/><strong>Fix:</strong> Add Zod or TypeScript schema validation.';
            break;
          case 'quick-plan':
            content = 'Create a blueprint at:<br/><code>.arc/blueprints/ARC-101.md</code><br/><br/><strong>Objective:</strong> Add strict type enforcement to <code>src/auth/service.ts</code>';
            break;
          case 'copy-prompt':
            var prompt = 'Project: arc-xt\\nFile: src/auth/service.ts:42\\nRisk: MEDIUM\\nIssue: Missing strict type enforcement in payload route (Rule BR-02).\\nConstraint: Do not alter existing logic, only add validation layer.';
            navigator.clipboard.writeText(prompt).then(function() {
              content = 'AI Handoff prompt copied to clipboard.';
            }, function() {
              content = 'Clipboard access denied. Use browser copy.';
            });
            break;
          case 'bypass':
            content = 'Bypassing once allows this save but logs an audit deviation. Proceed?';
            break;
        }
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('modal-overlay').classList.add('active');
      });
    });

    document.getElementById('modal-ok').addEventListener('click', function() {
      document.getElementById('modal-overlay').classList.remove('active');
    });
    document.getElementById('modal-cancel').addEventListener('click', function() {
      document.getElementById('modal-overlay').classList.remove('active');
    });
  })();
</script>
</body>
</html>`;
}
