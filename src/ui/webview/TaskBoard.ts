import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { buildCSPWithNonce, generateNonce } from '../csp';
import { escapeHtml } from '../sanitize';
import {
  LocalReviewSurfaceService,
  type TaskBoardItem,
} from '../../extension/reviewSurfaces';
import { version } from '../../../package.json';

// Phase 7.10 — Task Board v1 (ARC-UI-002)
export function createTaskBoardPanel(
  context: vscode.ExtensionContext,
): vscode.WebviewPanel {
  const nonce = generateNonce();
  const workspaceRoot = getWorkspaceRoot();
  const reviewService = new LocalReviewSurfaceService(workspaceRoot);

  const panel = vscode.window.createWebviewPanel(
    'arcTaskBoard',
    'ARC XT — Task Board',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'Public', 'Logo'),
      ],
    },
  );

  const items = reviewService.getTaskBoardItems();
  const csp = buildCSPWithNonce(nonce, panel.webview.cspSource);

  const logoPath = vscode.Uri.joinPath(
    context.extensionUri,
    'Public',
    'Logo',
    'ARC-ICON-1024.png',
  );
  const logoUri = panel.webview.asWebviewUri(logoPath).toString();

  // Read active task if present
  const activeTaskPath = path.join(workspaceRoot, '.arc', 'active-task.json');
  let activeTaskId: string | null = null;
  try {
    if (fs.existsSync(activeTaskPath)) {
      const raw = JSON.parse(fs.readFileSync(activeTaskPath, 'utf8'));
      activeTaskId = typeof raw.task_id === 'string' ? raw.task_id : null;
    }
  } catch {
    // fail-open: no active task
  }

  const created = items.filter((i) => i.status === 'Created');
  const inProgress = items.filter((i) => i.status === 'In Progress');
  const completed = items.filter((i) => i.status === 'Completed');

  const renderPhase = (
    label: string,
    dot: string,
    count: string,
    rows: string,
  ) => `
  <div class="phase">
    <div class="phase-header">
      <h2 class="phase-title"><span class="phase-dot ${dot}"></span>${escapeHtml(label)}</h2>
      <span class="phase-count mono">${escapeHtml(count)}</span>
    </div>
    ${rows || '<p class="empty-phase">No items</p>'}
  </div>`;

  const renderTaskRow = (item: TaskBoardItem, isActive: boolean) => {
    const statusClass =
      item.status === 'Completed'
        ? 'status-completed'
        : item.status === 'In Progress'
          ? 'status-progress'
          : 'status-created';
    const activeClass = isActive ? ' task-active' : '';
    const icon =
      item.status === 'Completed'
        ? '<span class="task-icon icon-done">✓</span>'
        : isActive
          ? '<span class="task-icon icon-active">▸</span>'
          : '<span class="task-icon icon-pending">○</span>';
    const elapsedHtml = isActive
      ? '<span class="task-elapsed mono">ACTIVE</span>'
      : '';
    return `
    <div class="task-row${activeClass}" data-id="${escapeHtml(item.directiveId)}">
      <div class="task-left">
        ${icon}
        <div class="task-body">
          <div class="task-title${item.status === 'Completed' ? ' done' : ''}">${escapeHtml(item.directiveId)}</div>
          <div class="task-meta">
            <span class="badge ${statusClass}">${escapeHtml(item.status)}</span>
            <span class="task-hint mono">${escapeHtml(item.nextAction.slice(0, 48))}${item.nextAction.length > 48 ? '…' : ''}</span>
          </div>
        </div>
      </div>
      <div class="task-right">
        ${elapsedHtml}
        <span class="task-score mono">${item.qualityScore}%</span>
      </div>
    </div>`;
  };

  const createdRows = created
    .map((i) => renderTaskRow(i, i.directiveId === activeTaskId))
    .join('');
  const progressRows = inProgress
    .map((i) => renderTaskRow(i, i.directiveId === activeTaskId))
    .join('');
  const completedRows = completed
    .map((i) => renderTaskRow(i, i.directiveId === activeTaskId))
    .join('');

  const logEntries = items.slice(0, 12).map((i) => {
    const cls =
      i.status === 'Completed'
        ? 'log-ok'
        : i.status === 'In Progress'
          ? 'log-warn'
          : 'log-info';
    const tag =
      i.status === 'Completed'
        ? 'PASS'
        : i.status === 'In Progress'
          ? 'PROG'
          : 'INFO';
    return `<div class="log-line"><span class="log-tag ${cls}">${tag}</span> <span class="log-id">${escapeHtml(i.directiveId)}</span> <span class="log-msg">${escapeHtml(i.validationReason.slice(0, 40))}</span></div>`;
  });

  const emptyState =
    items.length === 0
      ? `<div class="empty-board">
    <div class="empty-icon">◻</div>
    <div class="empty-title">No Blueprint Artifacts Yet</div>
    <div class="empty-body">
      ARC XT tracks governed changes through blueprint documents stored in
      <span class="mono">.arc/blueprints/</span>.
    </div>
    <div class="empty-steps">
      <div class="empty-step">▸ Make a governed save — edit any file and save to trigger ARC XT</div>
      <div class="empty-step">▸ Or open the Welcome Guide for a full walkthrough</div>
    </div>
    <div class="empty-actions-row">
      <button id="btn-welcome" class="empty-action-btn primary">Show Welcome Guide</button>
      <button id="btn-runtime" class="empty-action-btn">Open Runtime Status</button>
    </div>
  </div>`
      : '';

  panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <title>ARC XT — Task Board</title>
  <style nonce="${nonce}">
    :root {
      --bg:           #0e0e0e;
      --sidebar-bg:   #1a1a1a;
      --surface:      #131313;
      --surface-hi:   #1f2020;
      --surface-act:  #37373d;
      --surface-bright: #2b2c2c;
      --border:       rgba(255,255,255,0.05);
      --border-var:   #474848;
      --text:         #e6e5e5;
      --text-dim:     #ababab;
      --primary:      #9fcaff;
      --primary-dim:  #83bdff;
      --primary-bg:   #00497d;
      --primary-fg:   #b1d3ff;
      --warning:      #ffcc00;
      --success:      #7aec8d;
      --success-bg:   #004a1b;
      --success-fg:   #88fb9a;
      --error:        #ee7d77;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; overflow: hidden; }
    body {
      font-family: var(--vscode-font-family, system-ui, -apple-system, sans-serif);
      font-size: 12px;
      background: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
    }
    .mono { font-family: var(--vscode-editor-font-family, 'Cascadia Code', 'Fira Code', monospace); }
    .headline { font-weight: 700; letter-spacing: -0.02em; }

    /* ── Layout ── */
    .shell { display: flex; flex: 1; height: calc(100vh - 32px - 48px); overflow: hidden; }

    /* ── Top Bar ── */
    .topbar {
      height: 48px; display: flex; align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      background: var(--bg);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .topbar-left { display: flex; align-items: center; gap: 16px; }
    .topbar-title { font-size: 13px; font-weight: 700; color: var(--primary); letter-spacing: 0.08em; text-transform: uppercase; }
    .topbar-divider { width: 1px; height: 16px; background: var(--border-var); opacity: 0.4; }
    .topbar-actions { display: flex; gap: 4px; }
    .topbar-btn {
      font-size: 10px; font-weight: 700; color: var(--primary);
      text-transform: uppercase; letter-spacing: 0.05em;
      padding: 4px 8px; border: none; background: none; cursor: pointer;
      border-radius: 2px; transition: background 0.1s;
    }
    .topbar-btn:hover { background: rgba(255,255,255,0.05); }
    .topbar-btn.dim { color: var(--text-dim); }
    .topbar-icons { display: flex; gap: 8px; }
    .icon-btn {
      width: 28px; height: 28px; border: none; background: none; cursor: pointer;
      color: var(--text-dim); font-size: 16px; border-radius: 2px;
      display: flex; align-items: center; justify-content: center;
      transition: color 0.1s, background 0.1s;
    }
    .icon-btn:hover { color: var(--primary); background: rgba(255,255,255,0.05); }

    /* ── Left Nav ── */
    .nav {
      width: 52px; flex-shrink: 0;
      background: var(--sidebar-bg);
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column;
      padding: 8px 0;
    }
    .nav-item {
      display: flex; flex-direction: column; align-items: center;
      padding: 10px 0; gap: 3px; cursor: pointer;
      color: var(--text-dim); font-size: 9px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.04em;
      border-left: 2px solid transparent;
      transition: color 0.1s, background 0.1s;
      user-select: none;
    }
    .nav-item:hover { color: var(--text); background: rgba(255,255,255,0.03); }
    .nav-item.active { color: var(--primary); border-left-color: var(--primary); background: rgba(159,202,255,0.06); }
    .nav-icon { font-size: 15px; line-height: 1; }
    .nav-spacer { flex: 1; }
    .nav-run {
      margin: 8px 6px;
      background: var(--primary); color: #004272;
      border: none; border-radius: 2px; cursor: pointer;
      font-size: 9px; font-weight: 700; letter-spacing: 0.06em;
      padding: 8px 4px; text-align: center; text-transform: uppercase;
      transition: opacity 0.1s;
    }
    .nav-run:hover { opacity: 0.85; }

    /* ── Main Content ── */
    .main {
      flex: 1; overflow-y: auto; padding: 20px 24px;
      scrollbar-width: thin; scrollbar-color: #474848 transparent;
    }
    .main::-webkit-scrollbar { width: 4px; }
    .main::-webkit-scrollbar-thumb { background: #474848; border-radius: 2px; }

    /* ── Phase ── */
    .phase { margin-bottom: 28px; }
    .phase-header {
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 10px;
    }
    .phase-title { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .phase-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .dot-dim   { background: var(--text-dim); }
    .dot-pulse { background: var(--primary); animation: pulse 2s infinite; }
    .dot-done  { background: var(--success); }
    @keyframes pulse { 0%,100%{ opacity:1; } 50%{ opacity:0.4; } }
    .phase-count { font-size: 10px; color: var(--text-dim); letter-spacing: 0.06em; }
    .phase-active-label { font-size: 10px; color: var(--primary); letter-spacing: 0.06em; }
    .empty-phase { font-size: 11px; color: var(--text-dim); font-style: italic; padding: 4px 0; }

    /* ── Task Row ── */
    .task-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 12px; margin-bottom: 3px;
      background: var(--surface); cursor: pointer;
      border-left: 2px solid transparent;
      transition: background 0.1s;
    }
    .task-row:hover { background: var(--surface-bright); }
    .task-row.task-active {
      background: var(--surface-act);
      border-left-color: var(--primary);
    }
    .task-left { display: flex; align-items: center; gap: 12px; }
    .task-icon { font-size: 14px; width: 18px; text-align: center; flex-shrink: 0; }
    .icon-done   { color: var(--success); }
    .icon-active { color: var(--warning); }
    .icon-pending{ color: var(--primary-dim); }
    .task-title  { font-size: 12px; font-weight: 500; }
    .task-title.done { text-decoration: line-through; color: var(--text-dim); }
    .task-meta   { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
    .badge {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.04em; padding: 2px 5px; border-radius: 50px;
    }
    .status-created   { background: var(--primary-bg); color: var(--primary-fg); }
    .status-progress  { background: var(--warning); color: #000; }
    .status-completed { background: var(--success-bg); color: var(--success-fg); }
    .task-hint { font-size: 9px; color: var(--text-dim); opacity: 0.7; }
    .task-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
    .task-elapsed { font-size: 9px; color: var(--primary-dim); text-transform: uppercase; }
    .task-score   { font-size: 9px; color: var(--text-dim); }

    /* ── Stats bento ── */
    .bento { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px; }
    .bento-card {
      background: var(--surface); border: 1px solid var(--border);
      padding: 14px; border-radius: 2px;
    }
    .bento-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }
    .bento-label.primary { color: var(--primary); }
    .bento-label.warning { color: var(--warning); }
    .bento-label.success { color: var(--success); }
    .bento-value { font-size: 22px; font-weight: 700; }
    .bento-sub { font-size: 9px; color: var(--text-dim); text-transform: uppercase; margin-top: 4px; letter-spacing: 0.04em; }

    /* ── Right panel ── */
    .panel {
      width: 220px; flex-shrink: 0;
      border-left: 1px solid var(--border);
      display: flex; flex-direction: column; gap: 16px;
      padding: 16px 12px; overflow-y: auto;
      scrollbar-width: thin; scrollbar-color: #474848 transparent;
    }
    .panel-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
    .log-line { margin-bottom: 6px; font-size: 9px; line-height: 1.5; word-break: break-all; }
    .log-tag { font-weight: 700; padding: 1px 4px; border-radius: 2px; margin-right: 4px; font-size: 8px; text-transform: uppercase; }
    .log-ok   { background: var(--success-bg); color: var(--success-fg); }
    .log-warn { background: #3a3000; color: var(--warning); }
    .log-info { background: var(--primary-bg); color: var(--primary-fg); }
    .log-id   { color: var(--primary-dim); font-family: var(--vscode-editor-font-family, monospace); }
    .log-msg  { color: var(--text-dim); }
    .arch-note {
      background: var(--surface-hi); border-radius: 2px;
      padding: 10px; font-size: 10px; line-height: 1.5; color: var(--text-dim);
    }
    .arch-note .panel-title { color: var(--text); }

    /* ── Empty state ── */
    .empty-board {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; text-align: center;
      padding: 60px 24px; gap: 10px;
    }
    .empty-icon { font-size: 40px; opacity: 0.15; }
    .empty-title { font-size: 14px; font-weight: 600; color: var(--text-dim); }
    .empty-body { font-size: 11px; color: var(--text-dim); opacity: 0.7; line-height: 1.6; max-width: 340px; }
    .empty-steps { display: flex; flex-direction: column; gap: 4px; align-self: stretch; max-width: 340px; margin-top: 4px; }
    .empty-step { font-size: 11px; color: var(--text-dim); opacity: 0.6; text-align: left; line-height: 1.5; }
    .empty-actions-row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 8px; }
    .empty-action-btn {
      background: none; color: var(--primary);
      border: 1px solid var(--primary); border-radius: 2px; cursor: pointer;
      font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
      padding: 7px 14px; text-transform: uppercase;
      transition: background 0.15s;
    }
    .empty-action-btn.primary { background: var(--primary); color: #004272; border-color: var(--primary); }
    .empty-action-btn:hover { background: rgba(159,202,255,0.12); }
    .empty-action-btn.primary:hover { background: var(--primary-dim); }

    /* ── Footer ── */
    .footer {
      height: 32px; flex-shrink: 0;
      background: var(--surface-hi);
      border-top: 1px solid var(--border);
      display: flex; align-items: center;
      justify-content: space-between; padding: 0 16px;
    }
    .footer-left { display: flex; align-items: center; gap: 12px; }
    .footer-status { display: flex; align-items: center; gap: 5px; }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--primary); }
    .footer-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); }
    .footer-version { font-size: 9px; color: var(--text-dim); letter-spacing: 0.04em; }
  </style>
</head>
<body>

<!-- Top Bar -->
<header class="topbar">
  <div class="topbar-left">
    <img src="${escapeHtml(logoUri)}" width="20" height="20" alt="ARC XT" style="border-radius:2px;flex-shrink:0"/>
    <span class="topbar-title">Task_Board</span>
    <div class="topbar-divider"></div>
    <div class="topbar-actions">
      <button class="topbar-btn" id="btn-selectTask">Select Task</button>
      <button class="topbar-btn dim" id="btn-clearTask">Clear Task</button>
    </div>
  </div>
  <div class="topbar-icons">
    <button class="icon-btn" id="btn-runtime" title="Runtime Status">◉</button>
    <button class="icon-btn" id="btn-review" title="Review">✓</button>
  </div>
</header>

<!-- Shell: nav + content + panel -->
<div class="shell">

  <!-- Left Nav -->
  <nav class="nav">
    <div class="nav-item active" id="nav-tasks">
      <span class="nav-icon">◻</span>
      <span>Tasks</span>
    </div>
    <div class="nav-item" id="nav-runtime">
      <span class="nav-icon">◉</span>
      <span>Runtime</span>
    </div>
    <div class="nav-item" id="nav-review">
      <span class="nav-icon">✓</span>
      <span>Review</span>
    </div>
    <div class="nav-spacer"></div>
    <button class="nav-run" id="nav-run">▶<br>RUN</button>
  </nav>

  <!-- Main Content -->
  <main class="main">
    ${
      emptyState ||
      `
    ${renderPhase(
      'Planning',
      'dot-dim',
      `${String(created.length).padStart(2, '0')} Tasks`,
      createdRows,
    )}
    ${renderPhase(
      'Implementation',
      'dot-pulse',
      inProgress.length > 0 ? 'Active Session' : '00 Tasks',
      progressRows,
    )}
    ${renderPhase(
      'Review',
      'dot-done',
      `${String(completed.length).padStart(2, '0')} Completed`,
      completedRows,
    )}
    <div class="bento">
      <div class="bento-card">
        <div class="bento-label primary mono">Blueprint_Score</div>
        <div class="bento-value headline">${items.length > 0 ? Math.round(items.reduce((s, i) => s + i.qualityScore, 0) / items.length) : 0}<span style="font-size:14px;font-weight:400;color:var(--text-dim)">%</span></div>
        <div class="bento-sub mono">avg quality across ${items.length} artifact${items.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="bento-card">
        <div class="bento-label warning mono">In_Progress</div>
        <div class="bento-value headline">${inProgress.length} <span style="font-size:14px;font-weight:400;color:var(--text-dim)">active</span></div>
        <div class="bento-sub mono">${completed.length} completed · ${created.length} queued</div>
      </div>
    </div>
    `
    }
  </main>

  <!-- Right Panel -->
  <aside class="panel">
    <div>
      <div class="panel-title primary">Live_Logs</div>
      ${logEntries.length > 0 ? logEntries.join('') : '<div class="log-line" style="color:var(--text-dim);font-style:italic">No blueprint items loaded.</div>'}
    </div>
    ${
      activeTaskId
        ? `<div class="arch-note">
      <div class="panel-title">Active_Task</div>
      <div class="mono" style="font-size:10px;color:var(--primary);margin-bottom:4px">${escapeHtml(activeTaskId)}</div>
      <div>${escapeHtml(items.find((i) => i.directiveId === activeTaskId)?.nextAction ?? 'Blueprint loaded.')}</div>
    </div>`
        : `<div class="arch-note">
      <div class="panel-title">No Active Task</div>
      <div>Use <span class="mono" style="color:var(--primary)">Select Task</span> in the header to set your active work context.</div>
    </div>`
    }
  </aside>

</div>

<!-- Footer -->
<footer class="footer">
  <div class="footer-left">
    <div class="footer-status">
      <span class="status-dot"></span>
      <span class="footer-label mono">Ready</span>
    </div>
    <span class="footer-label mono" style="opacity:0.5">↻ Local_Only</span>
  </div>
  <div class="footer-version mono">ARC_XT_V${escapeHtml(version)}</div>
</footer>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  function cmd(c) { vscode.postMessage({ command: c }); }
  [
    ['btn-selectTask',  'arc.selectTask'],
    ['btn-clearTask',   'arc.clearActiveTask'],
    ['btn-runtime',     'arc.ui.liquidShell'],
    ['btn-review',      'arc.ui.liquidShell'],
    ['nav-runtime',     'arc.ui.liquidShell'],
    ['nav-review',      'arc.ui.liquidShell'],
    ['nav-run',         'arc.ui.liquidShell'],
    ['btn-welcome',     'arc.showWelcome'],
  ].forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    if (el) el.addEventListener('click', function() {
      // For Liquid Shell navigation, also pass the target route
      var route = null;
      if (pair[1] === 'arc.ui.liquidShell') {
        var id = pair[0];
        if (id.indexOf('runtime') >= 0 || id.indexOf('run') >= 0) route = 'runtime';
        else if (id.indexOf('review') >= 0) route = 'review';
        else if (id.indexOf('nav-run') >= 0) route = 'runtime';
      }
      if (route) {
        vscode.postMessage({ command: 'executeCommand', commandId: pair[1], route: route });
      } else {
        vscode.postMessage({ command: 'executeCommand', commandId: pair[1] });
      }
    });
  });
  document.querySelectorAll('.task-row').forEach(function(row) {
    row.addEventListener('click', function() {
      vscode.postMessage({ command: 'selectDirective', directiveId: row.dataset.id });
    });
  });
</script>
</body>
</html>`;

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(
    async (message: {
      command?: string;
      commandId?: string;
      directiveId?: string;
      route?: string;
    }) => {
      if (message.command === 'executeCommand' && message.commandId) {
        if (message.commandId === 'arc.ui.liquidShell' && message.route) {
          // Reveal sidebar shell and switch to the requested route
          await vscode.commands.executeCommand('arc.ui.liquidShell.navigate', message.route);
        } else {
          await vscode.commands.executeCommand(message.commandId);
        }
      }
    },
  );

  return panel;
}

function getWorkspaceRoot(): string {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    throw new Error('No workspace folder open');
  }
  return folders[0].uri.fsPath;
}
