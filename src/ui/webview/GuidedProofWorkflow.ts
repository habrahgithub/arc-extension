/**
 * Guided Proof Workflow — Screen 6 (ARC-UI-001c)
 *
 * Purpose: Instructional guidance for REQUIRE_PLAN proof completion
 *
 * WRD-0102: **INSTRUCTIONAL WORDING SUBMITTED FOR WARDEN REVIEW**
 * WRD-0098: Evidence-framed wording
 * WRD-0100: Instructional only, no approval surface
 * WRD-0092: CSP and sanitization applied
 */

import * as vscode from 'vscode';
import { buildCSPWithNonce, generateNonce } from '../csp';
import { escapeHtml } from '../sanitize';

/**
 * Create and show the Guided Proof Workflow WebviewPanel
 *
 * WRD-0102: Instructional wording only — no approval surface
 */
export function createGuidedProofWorkflowPanel(): vscode.WebviewPanel {
  const nonce = generateNonce();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const panel = vscode.window.createWebviewPanel(
    'arcGuidedWorkflow',
    'ARC — Guided Proof Workflow',
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

  panel.webview.html = getGuidedWorkflowHtml(nonce);

  return panel;
}

/**
 * Generate Guided Proof Workflow HTML
 *
 * **WRD-0102: INSTRUCTIONAL WORDING FOR WARDEN REVIEW**
 *
 * Key constraints:
 * - Must be instructional ("you need to..."), not authorizing ("click to approve...")
 * - Must not imply automatic authorization after completing steps
 * - Must distinguish execution packages from local blueprint artifacts
 * - Must preserve fail-closed messaging
 */
function getGuidedWorkflowHtml(nonce: string): string {
  const csp = buildCSPWithNonce(nonce);
  const productName = 'ARC — Audit Ready Core';

  // **WRD-0102: Instructional wording — submitted for Warden review**
  const steps = [
    {
      step: 1,
      title: 'Enter Change ID',
      content:
        'When prompted for a plan-linked save, enter the Change ID that links your change to a governance plan (e.g., LINTEL-PH5-001). The Change ID must be in uppercase, hyphenated format.',
    },
    {
      step: 2,
      title: 'Open Blueprint Artifact',
      content:
        'ARC will open or create the blueprint file at `.arc/blueprints/<change-id>.md`. This is your local proof artifact — you must complete all required sections with directive-specific content.',
    },
    {
      step: 3,
      title: 'Complete Required Sections',
      content:
        'Fill in all sections marked as required. Replace any placeholder text (e.g., [REQUIRED]) with actual content that describes your change. Template creation does not equal authorization — the blueprint must be complete.',
    },
    {
      step: 4,
      title: 'Save Blueprint File',
      content:
        'Save the blueprint file after completing all sections. ARC will validate the blueprint structure and content.',
    },
    {
      step: 5,
      title: 'Re-save the Governed File',
      content:
        'Return to your original file and attempt the save again. ARC will re-evaluate the save — a valid, complete blueprint satisfies the proof requirement, but other rules may still apply.',
    },
    {
      step: 6,
      title: 'Review Proof Status',
      content:
        'After a successful save, you can review the proof status using the Blueprint Proof Review surface. Records will show the change linkage in the audit entry.',
    },
  ];

  const stepsHtml = steps
    .map(
      (s) => `
    <div class="step">
      <div class="step-number">${s.step}</div>
      <div class="step-content">
        <h3>${escapeHtml(s.title)}</h3>
        <p>${escapeHtml(s.content)}</p>
      </div>
    </div>
  `,
    )
    .join('');

  const warnings = `
    <div class="warning-box">
      <h3>⚠️ Important Boundaries</h3>
      <ul>
        <li>This workflow is <strong>instructional only</strong> — it does not approve saves or create proof artifacts on your behalf.</li>
        <li>Completing these steps does not guarantee the save will pass — the blueprint must be valid and complete.</li>
        <li>Execution packages (e.g., Axis directives) are distinct from local blueprint artifacts — both are required for REQUIRE_PLAN saves.</li>
        <li>Template scaffolds are starting points — they must be completed with directive-specific content before authorization.</li>
      </ul>
    </div>
  `;

  const notices = `
    <p class="notice">Guided workflow is instructional only. It does not authorize, override, or bypass save decisions.</p>
    <p class="notice">Proof requirements and rule floors remain authoritative even when following this guidance.</p>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <meta charset="UTF-8">
  <title>${escapeHtml(productName)} — Guided Proof Workflow</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; }
    h1 { margin: 0 0 16px 0; }
    h2 { margin: 24px 0 12px 0; font-size: 18px; }
    .step { display: flex; gap: 16px; margin-bottom: 24px; }
    .step-number { flex: 0 0 40px; height: 40px; background: #0e639c; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; }
    .step-content { flex: 1; }
    .step-content h3 { margin: 0 0 8px 0; font-size: 16px; }
    .step-content p { margin: 0; color: #cccccc; }
    .warning-box { background: rgba(255, 191, 0, 0.1); border: 1px solid #ffbf00; border-radius: 4px; padding: 16px; margin: 24px 0; }
    .warning-box h3 { margin: 0 0 12px 0; color: #ffbf00; }
    .warning-box ul { margin: 0; padding-left: 20px; }
    .warning-box li { margin: 4px 0; }
    .notice { font-size: 12px; color: #969696; margin: 8px 0; padding: 8px; background: #1e1e1e; border-radius: 2px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(productName)}</h1>
  <h2>REQUIRE_PLAN Proof Workflow</h2>
  <p>Follow these steps to complete a REQUIRE_PLAN save with blueprint-backed proof:</p>
  ${stepsHtml}
  ${warnings}
  ${notices}
</body>
</html>`;
}
