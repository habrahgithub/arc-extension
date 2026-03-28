/**
 * False-Positive Review — Screen 5 (ARC-UI-001c)
 * 
 * Purpose: Display advisory false-positive candidates
 * 
 * Phase 7.9: Advisory-only boundary preserved (WRD-0081)
 * WRD-0098: Evidence-framed wording ("records show")
 * WRD-0099: No dismiss/re-evaluate actions
 * WRD-0092: CSP and sanitization applied
 */

import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildCSPWithNonce, generateNonce } from '../csp';
import { escapeHtml } from '../sanitize';

interface AuditEntry {
  ts: string;
  file_path: string;
  decision: string;
  reason: string;
  matched_rules: string[];
  source: string;
  route_fallback?: string;
}

interface FalsePositiveCandidate {
  entry: AuditEntry;
  qualityScore: number;
  qualityLabel: string;
}

/**
 * Create and show the False-Positive Review WebviewPanel
 */
export function createFalsePositiveReviewPanel(): vscode.WebviewPanel {
  const nonce = generateNonce();
  
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const panel = vscode.window.createWebviewPanel(
    'arcFalsePositive',
    'ARC XT — False-Positive Review',
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

  const candidates = readFalsePositiveCandidates();
  panel.webview.html = getFalsePositiveHtml(nonce, candidates);

  return panel;
}

/**
 * Read false-positive candidates from audit log
 * 
 * Phase 7.9: Quality scoring preserved (WARN=30, REQUIRE_PLAN=10, etc.)
 */
function readFalsePositiveCandidates(): FalsePositiveCandidate[] {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder) {
    return [];
  }
  
  const auditPath = path.join(workspaceFolder, '.arc', 'audit.jsonl');
  
  if (!fs.existsSync(auditPath)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(auditPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    const entries: AuditEntry[] = [];
    
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line) as AuditEntry);
      } catch {
        // Skip malformed lines
      }
    }
    
    // Filter to WARN and REQUIRE_PLAN (BLOCK excluded as rarely false positive)
    // Phase 7.9 quality scoring
    const candidates = entries
      .filter(e => e.decision === 'WARN' || e.decision === 'REQUIRE_PLAN')
      .map(entry => ({
        entry,
        qualityScore: calculateQualityScore(entry),
        qualityLabel: getQualityLabel(entry),
      }))
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, 10);
    
    return candidates;
  } catch {
    return [];
  }
}

/**
 * Phase 7.9 quality scoring
 */
function calculateQualityScore(entry: AuditEntry): number {
  let score = 0;
  
  if (entry.decision === 'WARN') score += 30;
  else if (entry.decision === 'REQUIRE_PLAN') score += 10;
  
  if (entry.source === 'RULE' || entry.source === 'FALLBACK') score += 20;
  if (entry.matched_rules.length === 0) score += 25;
  if (entry.route_fallback === 'CONFIG_MISSING' || entry.route_fallback === 'CONFIG_INVALID') score += 15;
  
  return score;
}

function getQualityLabel(entry: AuditEntry): string {
  const score = calculateQualityScore(entry);
  if (score >= 50) return '⚡ High';
  if (score >= 30) return '🔶 Medium';
  return '🔷 Low';
}

/**
 * Generate False-Positive Review HTML
 * 
 * Phase 7.9: Advisory-only boundary preserved
 * WRD-0098: Evidence-framed wording
 */
function getFalsePositiveHtml(
  nonce: string,
  candidates: FalsePositiveCandidate[],
): string {
  const csp = buildCSPWithNonce(nonce);
  const productName = 'ARC XT — Audit Ready Core';
  
  if (candidates.length === 0) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <meta charset="UTF-8">
  <title>${escapeHtml(productName)} — False-Positive Review</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; }
    h1 { margin: 0 0 16px 0; }
    .empty { color: #969696; }
    .notice { font-size: 12px; color: #969696; margin: 8px 0; padding: 8px; background: #1e1e1e; border-radius: 2px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(productName)}</h1>
  <p class="empty">No false-positive candidates found.</p>
  <p class="notice">False-positive review is advisory only. It does not dismiss candidates, re-evaluate decisions, or alter recorded audit entries.</p>
</body>
</html>`;
  }
  
  const candidatesHtml = candidates.map(c => `
    <div class="candidate-entry">
      <div class="entry-header">
        <span class="file-path">${escapeHtml(c.entry.file_path)}</span>
        <span class="quality-label">${escapeHtml(c.qualityLabel)}</span>
      </div>
      <ul>
        <li><strong>Decision:</strong> ${escapeHtml(c.entry.decision)}</li>
        <li><strong>Records show:</strong> ${escapeHtml(c.entry.reason)}</li>
        <li><strong>Matched rules:</strong> ${c.entry.matched_rules.length > 0 ? escapeHtml(c.entry.matched_rules.join(', ')) : 'none'}</li>
        <li><strong>Evaluation source:</strong> ${escapeHtml(c.entry.source)}</li>
      </ul>
    </div>
  `).join('');
  
  const notices = `
    <p class="notice">False-positive candidates are advisory only. They do not rewrite audit history, demote recorded decisions, or weaken the enforcement floor.</p>
    <p class="notice">Quality ranking is advisory only and does not override recorded decisions or weaken enforcement.</p>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <meta charset="UTF-8">
  <title>${escapeHtml(productName)} — False-Positive Review</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; }
    h1 { margin: 0 0 16px 0; }
    .candidate-entry { background: #252526; border: 1px solid #3c3c3c; border-radius: 4px; padding: 16px; margin-bottom: 16px; }
    .entry-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .file-path { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%; }
    .quality-label { padding: 2px 8px; border-radius: 2px; font-size: 12px; }
    ul { margin: 8px 0; padding-left: 20px; }
    li { margin: 4px 0; }
    .notice { font-size: 12px; color: #969696; margin: 8px 0; padding: 8px; background: #1e1e1e; border-radius: 2px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(productName)}</h1>
  <p class="notice">Records show ${candidates.length} false-positive candidate${candidates.length === 1 ? '' : 's'}, ranked by likelihood.</p>
  ${candidatesHtml}
  ${notices}
</body>
</html>`;
}
