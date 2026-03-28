import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildCSPWithNonce, generateNonce } from '../csp';
import { escapeHtml } from '../sanitize';

// Phase 7.10 — Task Board v1 (ARC-UI-002)
export function createTaskBoardPanel(
  context: vscode.ExtensionContext,
): vscode.WebviewPanel {
  const nonce = generateNonce();

  const panel = vscode.window.createWebviewPanel(
    'arcTaskBoard',
    'ARC Task Board',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [context.extensionUri],
    },
  );

  const workspaceRoot = getWorkspaceRoot();
  const boardContent = renderTaskBoard(workspaceRoot);

  const csp = buildCSPWithNonce(nonce, panel.webview.cspSource);

  panel.webview.html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ARC Task Board</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      line-height: 1.6;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    h1 {
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 10px;
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
  </style>
</head>
<body>
  ${boardContent}
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

// Phase 7.10 — Task Board v1 rendering (ARC-UI-002)
function renderTaskBoard(workspaceRoot: string): string {
  const blueprintsDir = path.join(workspaceRoot, '.arc', 'blueprints');

  if (!fs.existsSync(blueprintsDir)) {
    return renderEmptyBoard('No `.arc/blueprints/` directory found.');
  }

  const files = fs
    .readdirSync(blueprintsDir)
    .filter((f) => f.endsWith('.md'))
    .sort();

  if (files.length === 0) {
    return renderEmptyBoard(
      'No blueprint artifacts found. Task board is empty.',
    );
  }

  const items = files.map((fileName) => {
    const directiveId = fileName.replace(/\.md$/, '');
    const blueprintPath = path.join(blueprintsDir, fileName);
    const content = fs.readFileSync(blueprintPath, 'utf8');
    const status = deriveTaskStatus(content, fileName);
    return { directiveId, blueprintPath, status };
  });

  const created = items.filter((i) => i.status === 'Created');
  const inProgress = items.filter((i) => i.status === 'In Progress');
  const completed = items.filter((i) => i.status === 'Completed');

  return [
    '<h1>ARC Task Board</h1>',
    '<div class="posture-badges">',
    '<span class="posture-badge">Read-only</span>',
    '<span class="posture-badge">Local-only</span>',
    '<span class="posture-badge">Non-authorizing</span>',
    '</div>',
    '<p><em>Task derivation: from <code>.arc/blueprints/*.md</code> content analysis</em></p>',
    '<p><em>Status mapping: Created → In Progress → Completed (based on blueprint completeness)</em></p>',
    '',
    '<h2>Summary</h2>',
    `<ul><li><strong>Created:</strong> ${created.length}</li>`,
    `<li><strong>In Progress:</strong> ${inProgress.length}</li>`,
    `<li><strong>Completed:</strong> ${completed.length}</li></ul>`,
    '',
    renderColumn(
      '📋 Created',
      'Blueprint exists but remains template-like or materially incomplete.',
      created,
    ),
    renderColumn(
      '🔄 In Progress',
      'Blueprint has directive-specific content but is not yet complete.',
      inProgress,
    ),
    renderColumn(
      '✅ Completed',
      'Blueprint appears complete with all required sections filled.',
      completed,
    ),
  ].join('\n');
}

function renderEmptyBoard(message: string): string {
  return [
    '<h1>ARC Task Board</h1>',
    '<div class="posture-badges">',
    '<span class="posture-badge">Read-only</span>',
    '<span class="posture-badge">Local-only</span>',
    '<span class="posture-badge">Non-authorizing</span>',
    '</div>',
    `<p><em>${message}</em></p>`,
  ].join('\n');
}

function renderColumn(
  title: string,
  description: string,
  items: Array<{ directiveId: string; blueprintPath: string; status: string }>,
): string {
  const lines: string[] = [
    `<h2>${title}</h2>`,
    `<p><em>${description}</em></p>`,
  ];

  if (items.length === 0) {
    lines.push('<p><em>No items in this column.</em></p>');
    return lines.join('\n');
  }

  lines.push('<ul>');
  for (const item of items) {
    lines.push(
      `<li><strong>${escapeHtml(item.directiveId)}</strong> — <code>${escapeHtml(item.blueprintPath)}</code></li>`,
    );
  }
  lines.push('</ul>');

  return lines.join('\n');
}

// Phase 7.10 — Simple status derivation from blueprint content
function deriveTaskStatus(
  content: string,
  fileName: string,
): 'Created' | 'In Progress' | 'Completed' {
  // Check for template placeholders
  const hasTemplatePlaceholders =
    content.includes('[REQUIRED]') ||
    content.includes('Describe the specific') ||
    content.includes('List the files') ||
    content.includes('Record the non-scope');

  if (hasTemplatePlaceholders) {
    return 'Created';
  }

  // Check for substantive content in key sections
  const hasObjective = /## Objective\s*\n\s*[A-Z]/.test(content);
  const hasScope = /## Scope\s*\n\s*[A-Z]/.test(content);
  const hasConstraints = /## Constraints\s*\n\s*[A-Z]/.test(content);
  const hasAcceptance = /## Acceptance Criteria\s*\n\s*[A-Z]/.test(content);
  const hasRollback = /## Rollback Note\s*\n\s*[A-Z]/.test(content);

  const sectionCount = [
    hasObjective,
    hasScope,
    hasConstraints,
    hasAcceptance,
    hasRollback,
  ].filter(Boolean).length;

  if (sectionCount >= 5) {
    return 'Completed';
  }

  return 'In Progress';
}
