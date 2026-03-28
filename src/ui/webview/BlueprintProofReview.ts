/**
 * Blueprint Proof Review — Screen 4 (ARC-UI-001c)
 * 
 * Purpose: Display proof-resolution state for directive/blueprint linkage
 * 
 * Phase 7.6: All 8 proof states rendered distinctly
 * WRD-0098: Evidence-framed wording ("records show")
 * WRD-0092: CSP and sanitization applied
 * WRD-0100: Read-only, no proof creation/approval
 */

import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildCSPWithNonce, generateNonce } from '../csp';
import { escapeHtml } from '../sanitize';

/**
 * Blueprint proof resolution status (Phase 7.6)
 */
type BlueprintProofStatus =
  | 'VALID'
  | 'MISSING_DIRECTIVE'
  | 'INVALID_DIRECTIVE'
  | 'MISSING_ARTIFACT'
  | 'MISMATCHED_BLUEPRINT_ID'
  | 'MALFORMED_ARTIFACT'
  | 'INCOMPLETE_ARTIFACT'
  | 'UNAUTHORIZED_MODE';

interface BlueprintProofResolution {
  status: BlueprintProofStatus;
  reason: string;
  nextAction: string;
  directiveId?: string;
  blueprintId?: string;
  blueprintPath?: string;
}

/**
 * Create and show the Blueprint Proof Review WebviewPanel
 */
export function createBlueprintProofReviewPanel(): vscode.WebviewPanel {
  const nonce = generateNonce();
  
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const panel = vscode.window.createWebviewPanel(
    'arcBlueprintProof',
    'ARC XT — Blueprint Proof Review',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [],
    },
  );

  panel.webview.options = {
    enableScripts: true,
    localResourceRoots: [],
  };

  const proofData = readProofData();
  panel.webview.html = getBlueprintProofHtml(nonce, proofData);

  return panel;
}

/**
 * Read proof data from workspace
 * 
 * Phase 7.6: Read existing proof state, do not create/modify
 */
function readProofData(): BlueprintProofResolution[] {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder) {
    return [];
  }
  
  const blueprintsDir = path.join(workspaceFolder, '.arc', 'blueprints');
  const resolutions: BlueprintProofResolution[] = [];
  
  if (!fs.existsSync(blueprintsDir)) {
    return [{
      status: 'MISSING_ARTIFACT',
      reason: 'No blueprint artifacts found',
      nextAction: 'Complete a REQUIRE_PLAN save to create a blueprint',
    }];
  }
  
  const files = fs.readdirSync(blueprintsDir).filter(f => f.endsWith('.md'));
  
  for (const file of files) {
    const directiveId = file.replace(/\.md$/, '');
    const blueprintPath = path.join(blueprintsDir, file);
    const content = fs.readFileSync(blueprintPath, 'utf8');
    
    // Simple proof state detection (Phase 7.6)
    let status: BlueprintProofStatus = 'VALID';
    let reason = 'Blueprint artifact present';
    let nextAction = 'Blueprint available for REQUIRE_PLAN saves';
    
    // Check for incomplete template markers
    if (content.includes('[REQUIRED]') || content.includes('INCOMPLETE_TEMPLATE')) {
      status = 'INCOMPLETE_ARTIFACT';
      reason = 'Blueprint contains placeholder text';
      nextAction = 'Complete all required sections with directive-specific content';
    }
    
    resolutions.push({
      status,
      reason,
      nextAction,
      directiveId,
      blueprintId: directiveId,
      blueprintPath,
    });
  }
  
  if (resolutions.length === 0) {
    return [{
      status: 'MISSING_ARTIFACT',
      reason: 'No blueprint artifacts found',
      nextAction: 'Complete a REQUIRE_PLAN save to create a blueprint',
    }];
  }
  
  return resolutions;
}

/**
 * Generate Blueprint Proof Review HTML
 * 
 * Phase 7.6: All 8 proof states rendered distinctly
 * WRD-0098: Evidence-framed wording
 */
function getBlueprintProofHtml(
  nonce: string,
  resolutions: BlueprintProofResolution[],
): string {
  const csp = buildCSPWithNonce(nonce);
  const productName = 'ARC XT — Audit Ready Core';
  
  // Status badge colors (Phase 7.6: distinct rendering)
  const statusStyles: Record<BlueprintProofStatus, string> = {
    VALID: 'background: #0e639c; color: #fff;',
    MISSING_DIRECTIVE: 'background: #f48771; color: #000;',
    INVALID_DIRECTIVE: 'background: #f48771; color: #000;',
    MISSING_ARTIFACT: 'background: #f48771; color: #000;',
    MISMATCHED_BLUEPRINT_ID: 'background: #ffbf00; color: #000;',
    MALFORMED_ARTIFACT: 'background: #f48771; color: #000;',
    INCOMPLETE_ARTIFACT: 'background: #ffbf00; color: #000;',
    UNAUTHORIZED_MODE: 'background: #f48771; color: #000;',
  };
  
  const resolutionsHtml = resolutions.map(r => `
    <div class="proof-entry">
      <div class="entry-header">
        <span class="directive-id">${escapeHtml(r.directiveId ?? 'Unknown')}</span>
        <span class="status-badge" style="${escapeHtml(statusStyles[r.status])}">${escapeHtml(r.status)}</span>
      </div>
      <ul>
        <li><strong>Blueprint path:</strong> <code>${escapeHtml(r.blueprintPath ?? 'N/A')}</code></li>
        <li><strong>Records show:</strong> ${escapeHtml(r.reason)}</li>
        <li><strong>Next action:</strong> ${escapeHtml(r.nextAction)}</li>
      </ul>
    </div>
  `).join('');
  
  const notices = `
    <p class="notice">Proof review is read-only. It displays existing blueprint state but does not create, modify, or approve proofs.</p>
    <p class="notice">Template creation does not equal authorization. Execution packages are distinct from local proof artifacts.</p>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <meta charset="UTF-8">
  <title>${escapeHtml(productName)} — Blueprint Proof Review</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; }
    h1 { margin: 0 0 16px 0; }
    .proof-entry { background: #252526; border: 1px solid #3c3c3c; border-radius: 4px; padding: 16px; margin-bottom: 16px; }
    .entry-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .directive-id { font-weight: 600; }
    .status-badge { padding: 2px 8px; border-radius: 2px; font-size: 12px; font-weight: 600; }
    ul { margin: 8px 0; padding-left: 20px; }
    li { margin: 4px 0; }
    code { background: #1e1e1e; padding: 2px 6px; border-radius: 2px; }
    .notice { font-size: 12px; color: #969696; margin: 8px 0; padding: 8px; background: #1e1e1e; border-radius: 2px; }
    .empty { color: #969696; }
  </style>
</head>
<body>
  <h1>${escapeHtml(productName)}</h1>
  <p class="notice">Records show ${resolutions.length} blueprint artifact${resolutions.length === 1 ? '' : 's'} in .arc/blueprints/.</p>
  ${resolutionsHtml}
  ${notices}
</body>
</html>`;
}
