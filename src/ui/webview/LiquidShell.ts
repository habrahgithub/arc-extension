/**
 * ARC XT — Liquid Shell (Command Centre)
 *
 * Phase 2 — Semantic UI correctness.
 *
 * Each view answers a different primary question:
 *   Runtime   → what is happening now?  (posture-led)
 *   Tasks     → what is progressing?     (pipeline-led)
 *   Review    → what requires judgment?  (deviation-led)
 *   Architect → what defines the shape?  (topology-led)
 *
 * Design principles:
 * - "No-Line" rule: tonal depth replaces borders wherever possible
 * - "Nested Monolith": recessed/elevated planes via tonal stepping
 * - Each view has a unique hero surface, not relabeled cards
 * - EXECUTE_RUN is ceremonial — state-aware, not decorative
 * - Motion only for focus, route transitions, and feedback
 */

import * as vscode from 'vscode';
import { buildCSPWithNonce, generateNonce } from '../csp';
import { escapeHtml } from '../sanitize';

export function createLiquidShellPanel(
  context: vscode.ExtensionContext,
): vscode.WebviewPanel {
  const nonce = generateNonce();

  const panel = vscode.window.createWebviewPanel(
    'arcLiquidShell',
    'ARC XT — Liquid Shell',
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

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(
    async (message: {
      command?: string;
      commandId?: string;
      route?: string;
    }) => {
      if (message.command === 'executeCommand' && message.commandId) {
        await vscode.commands.executeCommand(message.commandId);
      }
      if (message.command === 'navigateRoute' && message.route) {
        panel.webview.postMessage({
          type: 'routeChanged',
          route: message.route,
        });
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

function buildLiquidShellHtml(opts: LiquidShellOpts): string {
  const { nonce, csp, logoUri } = opts;

  return `<!DOCTYPE html>
<html class="dark" lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}"/>
<title>ARC XT — Liquid Shell</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
<style nonce="${nonce}">
  /* ═══════════════════════════════════════
     TOKEN SYSTEM (MD3 dark)
     ═══════════════════════════════════════ */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    /* Surfaces — tonal stepping, no hard lines */
    --background:                #0e0e0e;
    --surface:                   #0e0e0e;
    --surface-dim:               #0e0e0e;
    --surface-container:         #191a1a;
    --surface-container-low:     #131313;
    --surface-container-lowest:  #000000;
    --surface-container-high:    #1f2020;
    --surface-container-highest: #252626;
    --surface-bright:            #2b2c2c;

    /* Accents */
    --primary:                   #9fcaff;
    --primary-container:         #00497d;
    --primary-fixed:             #d1e4ff;
    --primary-fixed-dim:         #b8d7ff;
    --primary-dim:               #83bdff;
    --on-primary:                #004272;

    --tertiary:                  #c6ffc7;
    --tertiary-container:        #88fb9a;
    --tertiary-fixed-dim:        #7aec8d;
    --on-tertiary-container:     #005f25;

    --secondary:                 #969fa9;
    --secondary-container:       #343c45;
    --on-secondary-container:    #b7c0cb;

    --error:                     #ee7d77;
    --error-container:           #7f2927;
    --on-error-container:        #ff9993;

    --on-surface:                #e6e5e5;
    --on-surface-variant:        #ababab;
    --outline-variant:           #474848;

    /* Fonts */
    --font-headline: 'Space Grotesk', system-ui, sans-serif;
    --font-body:     'Inter', system-ui, sans-serif;
    --font-mono:     'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace;

    /* Radii */
    --radius-sm:   0.125rem;
    --radius-lg:   0.25rem;
    --radius-xl:   0.5rem;
    --radius-full: 0.75rem;
  }

  html, body {
    height: 100%; overflow: hidden;
    background: var(--background);
    color: var(--on-surface);
    font-family: var(--font-body);
    font-size: 12px; line-height: 1.5;
  }

  .mono     { font-family: var(--font-mono); }
  .headline { font-family: var(--font-headline); font-weight: 700; letter-spacing: -0.02em; }
  .label    { font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }

  .material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20;
    font-size: 16px; vertical-align: middle;
  }
  .material-symbols-outlined.filled {
    font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20;
  }

  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: var(--surface); }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--secondary-container); border-radius: 2px; }

  /* ═══════════════════════════════════════
     SHELL LAYOUT
     ═══════════════════════════════════════ */
  .shell { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

  /* ── Top App Bar ──
     Tonal separation replaces border-bottom for immersion */
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    height: 40px; padding: 0 16px;
    background: var(--surface-dim);
    flex-shrink: 0; z-index: 10;
    /* tonal seam — no border */
  }
  .topbar-left { display: flex; align-items: center; gap: 16px; }
  .topbar-brand  {
    font-family: var(--font-headline); font-size: 16px; font-weight: 700;
    color: var(--primary); letter-spacing: -0.03em;
  }
  .topbar-nav { display: flex; gap: 0; height: 100%; }
  .topbar-nav-item {
    display: flex; align-items: center;
    padding: 0 12px; height: 100%;
    font-family: var(--font-headline); font-size: 12px; font-weight: 500;
    text-transform: uppercase; letter-spacing: 0.06em;
    color: rgba(255,255,255,0.35);
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: color 0.2s, background 0.2s, border-color 0.2s;
    background: none; border: none; border-bottom-width: 2px;
    font-family: inherit; font-size: inherit;
  }
  .topbar-nav-item:hover { color: var(--on-surface); background: rgba(255,255,255,0.04); }
  .topbar-nav-item.active { color: var(--primary); border-bottom-color: var(--primary); }
  .topbar-icons { display: flex; gap: 6px; }
  .topbar-icon-btn {
    width: 28px; height: 28px; border: none; background: none; cursor: pointer;
    color: rgba(255,255,255,0.35); border-radius: var(--radius-sm);
    display: flex; align-items: center; justify-content: center;
    transition: color 0.15s, background 0.15s;
  }
  .topbar-icon-btn:hover { color: var(--on-surface); background: rgba(255,255,255,0.06); }

  /* ── Main Body ── */
  .body { display: flex; flex: 1; overflow: hidden; }

  /* ═══════════════════════════════════════
     NARROW ICON RAIL
     ═══════════════════════════════════════ */
  .rail {
    width: 64px; flex-shrink: 0;
    background: rgba(26,26,26,0.8);
    display: flex; flex-direction: column;
    align-items: center; padding: 12px 0; gap: 4px;
    backdrop-filter: blur(12px);
  }
  .rail-logo {
    width: 40px; height: 40px; border-radius: 10px;
    background: rgba(255,255,255,0.06);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  }
  .rail-logo img { width: 22px; height: 22px; border-radius: 3px; }
  .rail-item {
    position: relative;
    width: 48px; height: 48px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 12px;
    background: rgba(255,255,255,0.02);
    color: rgba(255,255,255,0.4);
    cursor: pointer;
    transition: all 0.2s;
  }
  .rail-item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); }
  .rail-item.active {
    background: rgba(159,202,255,0.1);
    color: var(--primary-fixed);
    /* rail indicator replaces border */
  }
  .rail-item.active::before {
    content: '';
    position: absolute; left: 6px; top: 10px; bottom: 10px;
    width: 3px; border-radius: 99px;
    background: var(--primary);
    transition: opacity 0.2s;
  }
  .rail-spacer { flex: 1; }
  .rail-btn {
    width: 48px; height: 48px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 12px;
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.45);
    cursor: pointer;
    transition: all 0.15s;
  }
  .rail-btn:hover { background: rgba(255,255,255,0.06); color: var(--on-surface); }

  /* ═══════════════════════════════════════
     SECONDARY SIDEBAR
     ═══════════════════════════════════════ */
  .sidebar {
    width: 260px; flex-shrink: 0;
    background: rgba(255,255,255,0.012);
    padding: 20px 16px;
    display: flex; flex-direction: column;
    overflow-y: auto;
    backdrop-filter: blur(12px);
  }
  .sidebar-brand { margin-bottom: 24px; }
  .sidebar-brand-name {
    font-family: var(--font-headline); font-size: 22px;
    font-weight: 700; color: var(--primary); letter-spacing: -0.02em;
  }
  .sidebar-brand-sub {
    font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.28em; color: rgba(255,255,255,0.28); margin-top: 2px;
  }

  /* ── Glass Card (recessed plane) ──
     Borders pushed down — depth from tonal layer + top gradient highlight */
  .card {
    position: relative;
    border-radius: 16px;
    background: rgba(255,255,255,0.035);
    backdrop-filter: blur(16px);
    overflow: hidden;
    padding: 14px;
    transition: background 0.2s;
  }
  .card::before {
    content: '';
    position: absolute; left: 0; right: 0; top: 0; height: 1px;
    background: linear-gradient(to right, transparent, rgba(255,255,255,0.12), transparent);
  }
  .card-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: rgba(255,255,255,0.35); }
  .card-value { font-family: var(--font-headline); font-size: 20px; font-weight: 600; color: var(--primary-fixed); margin-top: 2px; }
  .card-desc  { font-size: 12px; line-height: 1.5; color: rgba(255,255,255,0.55); margin-top: 6px; }
  .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }

  /* ── Pills ── */
  .pill {
    display: inline-flex; align-items: center;
    border-radius: 999px; border: 1px solid;
    padding: 2px 10px;
    font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.12em;
  }
  .pill-info    { background: rgba(56,189,248,0.12); color: rgba(186,230,253,0.9); border-color: rgba(56,189,248,0.15); }
  .pill-good    { background: rgba(16,185,129,0.12); color: rgba(167,243,208,0.9); border-color: rgba(16,185,129,0.15); }
  .pill-warn    { background: rgba(245,158,11,0.12); color: rgba(253,224,71,0.9); border-color: rgba(245,158,11,0.15); }
  .pill-neutral { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.55); border-color: rgba(255,255,255,0.06); }

  /* ── Sidebar Nav ── */
  .sidebar-section-label {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em;
    color: rgba(255,255,255,0.32); margin: 16px 0 6px;
  }
  .sidebar-nav-item {
    display: flex; align-items: center; justify-content: space-between;
    border-radius: 12px;
    padding: 10px 14px; margin-bottom: 6px;
    cursor: pointer;
    transition: all 0.18s;
    /* no border default — tonal only */
  }
  .sidebar-nav-item:hover { background: rgba(255,255,255,0.04); }
  .sidebar-nav-item.active { background: rgba(159,202,255,0.07); }
  .sidebar-nav-left { display: flex; align-items: center; gap: 10px; }
  .sidebar-nav-item .nav-icon { color: rgba(255,255,255,0.45); }
  .sidebar-nav-item.active .nav-icon { color: var(--primary-fixed); }
  .sidebar-nav-label { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.65); }
  .sidebar-nav-item.active .sidebar-nav-label { color: var(--on-surface); }
  .sidebar-nav-hint { font-size: 10px; color: rgba(255,255,255,0.3); }

  /* ── Operator + EXECUTE_RUN ──
     Ceremonial button: state-aware, not decorative */
  .operator { display: flex; align-items: center; gap: 10px; }
  .operator-avatar {
    width: 36px; height: 36px; border-radius: 12px;
    background: linear-gradient(135deg, rgba(159,202,255,0.25), rgba(146,110,255,0.18));
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-headline); font-size: 13px; font-weight: 600;
    color: var(--primary-fixed);
  }
  .operator-name { font-size: 12px; font-weight: 500; color: var(--on-surface); }
  .operator-role { font-size: 10px; color: rgba(255,255,255,0.35); }

  /* EXECUTE_RUN — ceremonial, state-aware */
  .btn-execute {
    width: 100%; margin-top: 14px;
    border-radius: 14px;
    background: rgba(159,202,255,0.06);
    color: rgba(209,228,255,0.5);
    font-family: var(--font-body); font-size: 11px; font-weight: 700;
    padding: 10px 16px;
    cursor: pointer;
    text-transform: uppercase; letter-spacing: 0.12em;
    transition: all 0.25s;
    position: relative;
    /* Dormant by default — only lights up when valid */
  }
  .btn-execute:hover {
    background: rgba(159,202,255,0.1);
    color: rgba(209,228,255,0.7);
  }
  /* Ready state — subtle glow, full authority */
  .btn-execute.ready {
    background: rgba(159,202,255,0.12);
    color: var(--primary-fixed);
    box-shadow: 0 0 20px rgba(159,202,255,0.08), inset 0 0 0 1px rgba(159,202,255,0.12);
  }
  .btn-execute.ready:hover {
    background: rgba(159,202,255,0.18);
    box-shadow: 0 0 28px rgba(159,202,255,0.12), inset 0 0 0 1px rgba(159,202,255,0.16);
  }
  /* Executing — locked, pulsing */
  .btn-execute.executing {
    background: rgba(159,202,255,0.15);
    color: var(--primary-fixed);
    cursor: not-allowed;
    animation: exec-pulse 1.5s ease-in-out infinite;
  }
  @keyframes exec-pulse {
    0%, 100% { box-shadow: 0 0 0 rgba(159,202,255,0); }
    50% { box-shadow: 0 0 16px rgba(159,202,255,0.12); }
  }
  /* Warning — amber tone when risk detected */
  .btn-execute.warning {
    background: rgba(245,158,11,0.08);
    color: rgba(253,224,71,0.7);
  }
  .btn-execute.warning:hover {
    background: rgba(245,158,11,0.14);
  }

  /* ═══════════════════════════════════════
     MAIN CONTENT
     ═══════════════════════════════════════ */
  .content {
    flex: 1; padding: 20px 24px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--outline-variant) transparent;
    transition: opacity 0.15s ease;
  }
  .content::-webkit-scrollbar { width: 5px; }
  .content::-webkit-scrollbar-thumb { background: var(--outline-variant); border-radius: 3px; }

  .content-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
  .content-eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: 0.24em; color: rgba(255,255,255,0.3); }
  .content-title {
    font-family: var(--font-headline); font-size: 28px;
    font-weight: 600; letter-spacing: -0.02em; margin-top: 6px;
  }
  .content-subtitle {
    font-size: 13px; line-height: 1.5;
    color: rgba(255,255,255,0.4); margin-top: 6px; max-width: 560px;
  }

  /* ═══════════════════════════════════════
     RUNTIME VIEW — Posture Hero
     ═══════════════════════════════════════ */

  /* The dominant posture banner — answers "Am I safe?" first */
  .posture-hero {
    position: relative;
    border-radius: 16px;
    padding: 20px 24px;
    margin-bottom: 16px;
    /* SAFE state default */
    background: linear-gradient(135deg, rgba(16,185,129,0.06), rgba(255,255,255,0.02));
    overflow: hidden;
  }
  .posture-hero::before {
    content: '';
    position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
    border-radius: 4px 0 0 4px;
    background: var(--tertiary-fixed-dim);
  }
  .posture-hero.degraded {
    background: linear-gradient(135deg, rgba(245,158,11,0.06), rgba(255,255,255,0.02));
  }
  .posture-hero.degraded::before {
    background: rgba(253,224,71,0.7);
  }
  .posture-hero.blocked {
    background: linear-gradient(135deg, rgba(238,125,119,0.06), rgba(255,255,255,0.02));
  }
  .posture-hero.blocked::before {
    background: rgba(238,125,119,0.7);
  }
  .posture-row { display: flex; align-items: flex-start; gap: 20px; }
  .posture-state {
    display: flex; align-items: center; gap: 10px; flex-shrink: 0;
  }
  .posture-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: var(--tertiary-fixed-dim);
    box-shadow: 0 0 8px rgba(122,236,141,0.3);
  }
  .posture-dot.degraded { background: rgba(253,224,71,0.7); box-shadow: 0 0 8px rgba(253,224,71,0.2); }
  .posture-dot.blocked  { background: rgba(238,125,119,0.7); box-shadow: 0 0 8px rgba(238,125,119,0.2); }
  .posture-label {
    font-family: var(--font-headline); font-size: 18px; font-weight: 700;
    letter-spacing: -0.01em;
  }
  .posture-meta {
    display: flex; align-items: center; gap: 16px;
    margin-top: 10px; padding-left: 26px;
  }
  .posture-meta-item {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; color: rgba(255,255,255,0.45);
  }
  .posture-meta-item .mono { color: rgba(159,202,255,0.7); font-size: 10px; }
  .posture-right { margin-left: auto; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }

  /* Warning card (inside Runtime) */
  .warn-card {
    border-radius: 12px;
    background: rgba(251,146,60,0.06);
    padding: 14px;
    display: flex; align-items: flex-start; gap: 12px;
    margin-top: 12px;
  }
  .warn-icon { color: rgba(253,186,116,0.8); margin-top: 2px; }
  .warn-title { font-size: 12px; font-weight: 500; color: rgba(254,215,170,0.9); }
  .warn-desc  { font-size: 12px; line-height: 1.5; color: rgba(254,215,170,0.55); margin-top: 4px; }
  .warn-btn {
    margin-left: auto; flex-shrink: 0;
    border-radius: 10px;
    background: rgba(255,255,255,0.04);
    color: rgba(254,215,170,0.8);
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em;
    padding: 7px 12px; cursor: pointer;
    transition: background 0.12s;
  }
  .warn-btn:hover { background: rgba(255,255,255,0.08); }

  /* Metrics row (secondary to posture) */
  .metrics-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
  .metric {
    border-radius: 14px;
    background: rgba(255,255,255,0.03);
    padding: 14px;
  }
  .metric-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: rgba(255,255,255,0.3); margin-bottom: 6px; }
  .metric-value  { font-size: 16px; font-weight: 500; color: var(--on-surface); }
  .metric-hint   { font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 4px; }

  /* ═══════════════════════════════════════
     TASKS VIEW — Pipeline surface
     ═══════════════════════════════════════ */
  .task-list { display: flex; flex-direction: column; gap: 8px; }
  .task-row {
    display: flex; align-items: center; justify-content: space-between;
    border-radius: 14px;
    background: rgba(255,255,255,0.03);
    padding: 12px 14px;
    transition: background 0.15s;
  }
  .task-row:hover { background: rgba(255,255,255,0.05); }
  .task-left { display: flex; align-items: center; gap: 10px; }
  .task-icon-box {
    width: 34px; height: 34px; border-radius: 12px;
    background: rgba(255,255,255,0.04);
    display: flex; align-items: center; justify-content: center;
    color: rgba(159,202,255,0.8);
  }
  .task-name  { font-size: 12px; font-weight: 500; color: var(--on-surface); }
  .task-id    { font-size: 10px; color: rgba(186,230,253,0.8); margin-left: 6px; }
  .task-phase { font-size: 10px; color: rgba(255,255,255,0.35); }

  /* ═══════════════════════════════════════
     REVIEW VIEW — Structured deviation rows
     NOT card cognition — table cognition
     ═══════════════════════════════════════ */
  .review-hero {
    display: flex; align-items: flex-start; gap: 16px;
    border-radius: 16px;
    padding: 18px 20px;
    background: rgba(255,255,255,0.03);
    margin-bottom: 16px;
  }
  .review-hero::before {
    content: '';
    position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
    border-radius: 4px 0 0 4px;
  }
  .review-confidence {
    font-family: var(--font-headline); font-size: 14px; font-weight: 700;
    color: var(--tertiary-fixed-dim);
    display: flex; align-items: center; gap: 6px;
  }
  .review-confidence .dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--tertiary-fixed-dim);
    box-shadow: 0 0 6px rgba(122,236,141,0.3);
  }
  .review-file {
    font-family: var(--font-mono); font-size: 11px;
    color: rgba(159,202,255,0.6); margin-top: 6px;
  }
  .review-right { margin-left: auto; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  .review-count { font-size: 11px; color: rgba(255,255,255,0.4); }

  /* Structured deviation row — table-like, not card-like */
  .deviation-row {
    display: grid;
    grid-template-columns: 8px 1fr auto auto;
    gap: 0;
    align-items: center;
    border-radius: 12px;
    background: rgba(255,255,255,0.025);
    padding: 12px 16px 12px 0;
    margin-bottom: 6px;
    transition: background 0.15s;
    cursor: pointer;
  }
  .deviation-row:hover { background: rgba(255,255,255,0.045); }
  .deviation-row.severity-high {
    background: rgba(238,125,119,0.04);
  }
  .deviation-row.severity-medium {
    background: rgba(245,158,11,0.03);
  }
  /* Left severity bar — color communicates risk instantly */
  .severity-bar {
    width: 8px; height: 36px;
    border-radius: 0 4px 4px 0;
    margin-right: 14px;
  }
  .severity-bar.high   { background: rgba(238,125,119,0.7); box-shadow: 0 0 8px rgba(238,125,119,0.15); }
  .severity-bar.medium { background: rgba(245,158,11,0.5); box-shadow: 0 0 8px rgba(245,158,11,0.1); }
  .severity-bar.low    { background: rgba(159,202,255,0.35); }
  .deviation-body { min-width: 0; }
  .deviation-title { font-size: 12px; color: var(--on-surface); line-height: 1.4; }
  .deviation-rule  { font-size: 10px; color: rgba(255,255,255,0.35); margin-top: 2px; }
  .deviation-location {
    font-family: var(--font-mono); font-size: 10px;
    color: rgba(255,255,255,0.3);
    padding: 3px 8px; border-radius: 6px;
    background: rgba(255,255,255,0.04);
    white-space: nowrap;
  }
  .deviation-confidence {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; padding: 3px 8px; border-radius: 6px;
    white-space: nowrap;
  }
  .deviation-confidence.low    { background: rgba(159,202,255,0.1); color: rgba(186,230,253,0.8); }
  .deviation-confidence.medium { background: rgba(245,158,11,0.1); color: rgba(253,224,71,0.8); }
  .deviation-confidence.high   { background: rgba(16,185,129,0.1); color: rgba(167,243,208,0.8); }

  /* Expandable code context */
  .deviation-context {
    display: none;
    margin-top: 8px;
    border-radius: 10px;
    background: rgba(0,0,0,0.35);
    padding: 12px 14px;
    font-family: var(--font-mono);
    font-size: 11px; line-height: 1.6;
    color: rgba(255,255,255,0.55);
  }
  .deviation-context.open { display: block; }
  .deviation-context .code-line { color: rgba(255,255,255,0.35); }
  .deviation-context .code-highlight {
    background: rgba(238,125,119,0.08);
    border-left: 2px solid rgba(238,125,119,0.4);
    padding-left: 8px; margin-left: -8px;
    color: rgba(254,215,170,0.8);
  }

  /* ═══════════════════════════════════════
     ARCHITECT VIEW — System Topology
     NOT a dashboard — a governance map
     ═══════════════════════════════════════ */
  .topology-block {
    border-radius: 16px;
    background: rgba(255,255,255,0.03);
    padding: 18px 20px;
    margin-bottom: 12px;
  }
  .topology-label {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em;
    color: rgba(255,255,255,0.3); margin-bottom: 10px;
  }
  .topology-value {
    font-family: var(--font-headline); font-size: 16px;
    font-weight: 600; color: var(--on-surface);
  }
  .topology-hint {
    font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 4px;
  }

  .route-map {
    display: flex; flex-direction: column; gap: 8px;
  }
  .route-entry {
    display: flex; align-items: center; justify-content: space-between;
    border-radius: 10px;
    background: rgba(255,255,255,0.025);
    padding: 10px 14px;
  }
  .route-left { display: flex; align-items: center; gap: 10px; }
  .route-indicator {
    width: 6px; height: 6px; border-radius: 50%;
  }
  .route-indicator.active { background: var(--tertiary-fixed-dim); box-shadow: 0 0 6px rgba(122,236,141,0.3); }
  .route-indicator.disabled { background: rgba(255,255,255,0.15); }
  .route-name { font-size: 12px; color: var(--on-surface); font-weight: 500; }
  .route-desc { font-size: 10px; color: rgba(255,255,255,0.3); }
  .route-badge { font-size: 10px; font-weight: 600; }

  .directive-list { display: flex; flex-direction: column; gap: 6px; }
  .directive-entry {
    display: flex; align-items: center; justify-content: space-between;
    border-radius: 8px;
    padding: 8px 12px;
    background: rgba(255,255,255,0.02);
    font-size: 11px;
  }
  .directive-id { font-family: var(--font-mono); color: rgba(159,202,255,0.7); }
  .directive-status { font-size: 10px; font-weight: 600; }

  /* ═══════════════════════════════════════
     SHARED: Terminal, stats, bento grid
     ═══════════════════════════════════════ */
  .bento { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }

  .terminal {
    border-radius: 12px;
    background: rgba(0,0,0,0.45);
    padding: 14px;
    font-family: var(--font-mono);
    font-size: 11px; line-height: 1.7;
    color: rgba(255,255,255,0.6);
    margin-top: 12px;
  }
  .terminal .ts-green  { color: var(--tertiary-fixed-dim); }
  .terminal .ts-amber  { color: rgba(253,224,71,0.8); }
  .terminal .ts-sky    { color: var(--primary); }

  .stat-mini {
    border-radius: 14px;
    background: rgba(255,255,255,0.025);
    padding: 14px;
    backdrop-filter: blur(12px);
  }
  .stat-mini-label { font-size: 11px; color: rgba(255,255,255,0.4); display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .stat-mini-value { font-family: var(--font-headline); font-size: 32px; font-weight: 700; letter-spacing: -0.03em; }
  .stat-mini-hint  { font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 6px; }
  .right-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
</style>
</head>
<body>

<div class="shell">
  <!-- ═══ Top App Bar ═══ -->
  <header class="topbar">
    <div class="topbar-left">
      <img src="${escapeHtml(logoUri)}" width="20" height="20" alt="ARC XT" style="border-radius:3px;flex-shrink:0"/>
      <span class="topbar-brand">ARC XT</span>
      <nav class="topbar-nav">
        <button class="topbar-nav-item active" data-route="runtime">Runtime</button>
        <button class="topbar-nav-item" data-route="tasks">Tasks</button>
        <button class="topbar-nav-item" data-route="review">Review</button>
        <button class="topbar-nav-item" data-route="architect">Architect</button>
      </nav>
    </div>
    <div class="topbar-icons">
      <button class="topbar-icon-btn" id="btn-terminal" title="Terminal">
        <span class="material-symbols-outlined">terminal</span>
      </button>
      <button class="topbar-icon-btn" id="btn-bugs" title="Bugs">
        <span class="material-symbols-outlined">bug_report</span>
      </button>
      <button class="topbar-icon-btn" id="btn-settings" title="Settings">
        <span class="material-symbols-outlined">settings</span>
      </button>
    </div>
  </header>

  <div class="body">
    <!-- ═══ Narrow Icon Rail ═══ -->
    <nav class="rail">
      <div class="rail-logo"><img src="${escapeHtml(logoUri)}" alt="ARC"/></div>
      <div class="rail-item active" data-route="runtime" title="Runtime">
        <span class="material-symbols-outlined">analytics</span>
      </div>
      <div class="rail-item" data-route="tasks" title="Tasks">
        <span class="material-symbols-outlined">assignment</span>
      </div>
      <div class="rail-item" data-route="review" title="Review">
        <span class="material-symbols-outlined">fact_check</span>
      </div>
      <div class="rail-item" data-route="architect" title="Architect">
        <span class="material-symbols-outlined">architecture</span>
      </div>
      <div class="rail-spacer"></div>
      <div class="rail-btn" title="Settings">
        <span class="material-symbols-outlined">settings</span>
      </div>
    </nav>

    <!-- ═══ Secondary Sidebar ═══ -->
    <aside class="sidebar custom-scrollbar">
      <div class="sidebar-brand">
        <div class="sidebar-brand-name headline">ARC XT</div>
        <div class="sidebar-brand-sub label">Engineering Core</div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <div>
            <div class="card-label">Active Directive</div>
            <div class="card-value headline">ARC-101</div>
          </div>
          <span class="pill pill-info">Live</span>
        </div>
        <div class="card-desc">OnSave route inspection with strict policy envelope and bounded execution posture.</div>
      </div>

      <div class="sidebar-section-label label">Navigation</div>

      <div>
        <div class="sidebar-nav-item active" data-route="runtime">
          <div class="sidebar-nav-left">
            <span class="material-symbols-outlined nav-icon" style="font-size:15px">analytics</span>
            <div>
              <div class="sidebar-nav-label">Runtime</div>
              <div class="sidebar-nav-hint">What is happening</div>
            </div>
          </div>
          <span class="material-symbols-outlined filled" style="font-size:14px;color:rgba(159,202,255,0.7)">chevron_right</span>
        </div>
        <div class="sidebar-nav-item" data-route="tasks">
          <div class="sidebar-nav-left">
            <span class="material-symbols-outlined nav-icon" style="font-size:15px">assignment</span>
            <div>
              <div class="sidebar-nav-label">Tasks</div>
              <div class="sidebar-nav-hint">What is progressing</div>
            </div>
          </div>
          <span class="material-symbols-outlined" style="font-size:14px;color:rgba(255,255,255,0.18)">chevron_right</span>
        </div>
        <div class="sidebar-nav-item" data-route="review">
          <div class="sidebar-nav-left">
            <span class="material-symbols-outlined nav-icon" style="font-size:15px">fact_check</span>
            <div>
              <div class="sidebar-nav-label">Review</div>
              <div class="sidebar-nav-hint">What needs judgment</div>
            </div>
          </div>
          <span class="material-symbols-outlined" style="font-size:14px;color:rgba(255,255,255,0.18)">chevron_right</span>
        </div>
        <div class="sidebar-nav-item" data-route="architect">
          <div class="sidebar-nav-left">
            <span class="material-symbols-outlined nav-icon" style="font-size:15px">architecture</span>
            <div>
              <div class="sidebar-nav-label">Architect</div>
              <div class="sidebar-nav-hint">What defines the shape</div>
            </div>
          </div>
          <span class="material-symbols-outlined" style="font-size:14px;color:rgba(255,255,255,0.18)">chevron_right</span>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="card-header">
          <div class="card-label">Operator</div>
          <span class="material-symbols-outlined" style="font-size:15px;color:rgba(255,255,255,0.25)">notifications</span>
        </div>
        <div class="operator">
          <div class="operator-avatar">H</div>
          <div>
            <div class="operator-name">System Architect</div>
            <div class="operator-role">Bounded execution role</div>
          </div>
        </div>
        <!-- EXECUTE_RUN — starts "ready" when directive is live -->
        <button class="btn-execute ready" id="btn-execute">EXECUTE_RUN</button>
      </div>
    </aside>

    <!-- ═══ Main Content ═══ -->
    <main class="content custom-scrollbar" id="main-content">

      <!-- ═══════════════════════════════════
           RUNTIME — Posture-led hero surface
           Answers: Am I safe? → What is active? → What changed?
           ═══════════════════════════════════ -->
      <div id="view-runtime">
        <div class="content-header">
          <div>
            <div class="content-eyebrow label">Control Plane</div>
            <h1 class="content-title headline">Runtime Control</h1>
          </div>
          <div style="display:flex;gap:6px">
            <span class="pill pill-good">Stable</span>
            <span class="pill pill-info">v2.4.0</span>
          </div>
        </div>

        <!-- HERO: System posture banner -->
        <div class="posture-hero">
          <div class="posture-row">
            <div style="flex:1">
              <div class="posture-state">
                <div class="posture-dot"></div>
                <div class="posture-label headline">System Safe</div>
                <span class="pill pill-good">Pass</span>
              </div>
              <div class="posture-meta">
                <div class="posture-meta-item">
                  Route: <span class="mono">Local → Cloud</span>
                </div>
                <div class="posture-meta-item">
                  Policy: <span class="mono">STRICT</span>
                </div>
                <div class="posture-meta-item">
                  Confidence: <span class="mono">HIGH</span>
                </div>
              </div>
            </div>
            <div class="posture-right">
              <span class="pill pill-info">LIVE_RUNNING</span>
              <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:2px">OnSave trigger</div>
            </div>
          </div>

          <!-- Warning: subordinate to posture -->
          <div class="warn-card">
            <span class="material-symbols-outlined warn-icon">warning</span>
            <div style="flex:1">
              <div class="warn-title">Audit degradation warning</div>
              <div class="warn-desc">Audit read fallback engaged. Strict route policy remains active, but confidence is reduced until retry succeeds.</div>
            </div>
            <button class="warn-btn">Retry</button>
          </div>
        </div>

        <!-- Secondary: metrics below posture -->
        <div class="bento">
          <div>
            <div class="card">
              <div class="card-header">
                <div>
                  <div class="card-label">Route Detail</div>
                  <div class="card-value headline" style="font-size:16px">Primary Route</div>
                </div>
              </div>
              <div class="metrics-row">
                <div class="metric">
                  <div class="metric-label label">Trigger</div>
                  <div class="metric-value" style="font-size:15px">OnSave</div>
                  <div class="metric-hint">Automatic bounded execution</div>
                </div>
                <div class="metric">
                  <div class="metric-label label">Route</div>
                  <div class="metric-value" style="font-size:15px;display:flex;align-items:center;gap:6px">
                    Local <span class="material-symbols-outlined" style="font-size:14px;color:rgba(255,255,255,0.25)">arrow_right_alt</span> Cloud
                  </div>
                  <div class="metric-hint">Strict enforcement manifest</div>
                </div>
                <div class="metric">
                  <div class="metric-label label">Target</div>
                  <div class="metric-value" style="font-size:15px;display:flex;align-items:center;gap:6px">
                    <span class="material-symbols-outlined" style="font-size:15px;color:rgba(159,202,255,0.7)">description</span>
                    src/auth/service.ts
                  </div>
                  <div class="metric-hint">3.4kb · protected surface</div>
                </div>
              </div>
            </div>

            <div class="card" style="margin-top:12px">
              <div class="card-header">
                <div>
                  <div class="card-label">Task Stream</div>
                  <div class="card-value headline" style="font-size:16px">Active Tasks</div>
                </div>
                <span class="pill pill-info">3 visible</span>
              </div>
              <div class="task-list">
                <div class="task-row">
                  <div class="task-left">
                    <div class="task-icon-box"><span class="material-symbols-outlined" style="font-size:16px">assignment</span></div>
                    <div>
                      <span class="task-name">Directive route verification</span><span class="task-id mono">ARC-101</span>
                      <div class="task-phase">Planning</div>
                    </div>
                  </div>
                  <span class="pill pill-info">Active</span>
                </div>
                <div class="task-row">
                  <div class="task-left">
                    <div class="task-icon-box"><span class="material-symbols-outlined" style="font-size:16px">assignment</span></div>
                    <div>
                      <span class="task-name">Policy manifest sync</span><span class="task-id mono">ARC-118</span>
                      <div class="task-phase">Implementation</div>
                    </div>
                  </div>
                  <span class="pill pill-warn">Review</span>
                </div>
                <div class="task-row">
                  <div class="task-left">
                    <div class="task-icon-box"><span class="material-symbols-outlined" style="font-size:16px">assignment</span></div>
                    <div>
                      <span class="task-name">Execution token envelope</span><span class="task-id mono">ARC-123</span>
                      <div class="task-phase">Review</div>
                    </div>
                  </div>
                  <span class="pill pill-good">Ready</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right column -->
          <div>
            <div class="card">
              <div class="card-header">
                <div>
                  <div class="card-label">Compliance</div>
                  <div class="card-value headline" style="font-size:16px">Deviations</div>
                </div>
                <span class="material-symbols-outlined" style="color:rgba(159,202,255,0.7)">shield</span>
              </div>
              <div style="margin-bottom:8px">
                <div class="deviation-row severity-high" data-context="ctx-1">
                  <div class="severity-bar high"></div>
                  <div class="deviation-body">
                    <div class="deviation-title">Missing strict type enforcement in payload route</div>
                    <div class="deviation-rule mono">BR-02 · FAIL</div>
                  </div>
                  <div class="deviation-location mono">L:42</div>
                  <div class="deviation-confidence low">Low</div>
                </div>
                <div class="deviation-row severity-medium" data-context="ctx-2">
                  <div class="severity-bar medium"></div>
                  <div class="deviation-body">
                    <div class="deviation-title">Fallback audit cache used for previous run</div>
                    <div class="deviation-rule mono">AUDIT-03 · WARN</div>
                  </div>
                  <div class="deviation-location mono">L:18</div>
                  <div class="deviation-confidence medium">Medium</div>
                </div>
                <div class="deviation-row" data-context="ctx-3">
                  <div class="severity-bar low"></div>
                  <div class="deviation-body">
                    <div class="deviation-title">Telemetry label naming drift detected</div>
                    <div class="deviation-rule mono">TEL-01 · INFO</div>
                  </div>
                  <div class="deviation-location mono">L:09</div>
                  <div class="deviation-confidence high">High</div>
                </div>
              </div>
            </div>

            <div class="card" style="margin-top:12px">
              <div class="card-header">
                <div>
                  <div class="card-label">Live Output</div>
                  <div class="card-value headline" style="font-size:16px">Terminal</div>
                </div>
                <span class="material-symbols-outlined" style="color:rgba(159,202,255,0.7)">terminal</span>
              </div>
              <div class="terminal">
                <div><span class="ts-green">[14:30:50]</span> Initializing ARC XT runtime...</div>
                <div><span class="ts-green">[14:30:51]</span> OnSave trigger detected: <span class="ts-sky">src/core/index.ts</span></div>
                <div><span class="ts-green">[14:30:52]</span> Route verified: CLOUD (STRICT)</div>
                <div><span class="ts-amber">[14:30:53]</span> Warning: audit cache fallback enabled</div>
                <div><span class="ts-green">[14:30:54]</span> No blocking violations found</div>
              </div>
            </div>

            <div class="right-stats">
              <div class="stat-mini">
                <div class="stat-mini-label"><span class="material-symbols-outlined" style="font-size:14px">speed</span> System health</div>
                <div class="stat-mini-value headline">98.2<span style="font-size:18px;font-weight:400;color:rgba(255,255,255,0.4)">%</span></div>
                <div class="stat-mini-hint">Process efficiency rated optimal</div>
              </div>
              <div class="stat-mini">
                <div class="stat-mini-label"><span class="material-symbols-outlined filled" style="font-size:14px;color:rgba(167,243,208,0.7)">check_circle</span> Confidence</div>
                <div class="stat-mini-value headline" style="font-size:28px">High</div>
                <div class="stat-mini-hint">Stable shell, reduced only by fallback</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════
           TASKS — Pipeline surface
           Answers: what is progressing through the system?
           ═══════════════════════════════════ -->
      <div id="view-tasks" style="display:none">
        <div class="content-header">
          <div>
            <div class="content-eyebrow label">Control Plane</div>
            <h1 class="content-title headline">Task Board</h1>
            <p class="content-subtitle">Milestone-first navigation with active focus and clean phase separation.</p>
          </div>
          <div style="display:flex;gap:6px">
            <span class="pill pill-good">Stable</span>
            <span class="pill pill-info">v2.4.0</span>
          </div>
        </div>

        <!-- Phase-grouper: Planning -->
        <div style="margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.2)"></span>
            <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.16em;color:rgba(255,255,255,0.35)">Planning</span>
            <span style="flex:1;height:1px;background:rgba(255,255,255,0.05)"></span>
            <span style="font-size:10px;color:rgba(255,255,255,0.25)">01 task</span>
          </div>
          <div class="task-list">
            <div class="task-row">
              <div class="task-left">
                <div class="task-icon-box"><span class="material-symbols-outlined" style="font-size:16px">bolt</span></div>
                <div>
                  <span class="task-name">Directive route verification</span><span class="task-id mono">ARC-101</span>
                  <div class="task-phase">Planning</div>
                </div>
              </div>
              <span class="pill pill-info">Active</span>
            </div>
          </div>
        </div>

        <!-- Phase-grouper: Implementation -->
        <div style="margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <span style="width:6px;height:6px;border-radius:50%;background:rgba(159,202,255,0.5);box-shadow:0 0 6px rgba(159,202,255,0.2)"></span>
            <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.16em;color:rgba(255,255,255,0.35)">Implementation</span>
            <span style="flex:1;height:1px;background:rgba(255,255,255,0.05)"></span>
            <span style="font-size:10px;color:rgba(255,255,255,0.25)">01 task</span>
          </div>
          <div class="task-list">
            <div class="task-row">
              <div class="task-left">
                <div class="task-icon-box"><span class="material-symbols-outlined" style="font-size:16px">sync</span></div>
                <div>
                  <span class="task-name">Policy manifest sync</span><span class="task-id mono">ARC-118</span>
                  <div class="task-phase">Implementation</div>
                </div>
              </div>
              <span class="pill pill-warn">Review</span>
            </div>
          </div>
        </div>

        <!-- Phase-grouper: Review -->
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <span style="width:6px;height:6px;border-radius:50%;background:var(--tertiary-fixed-dim);box-shadow:0 0 6px rgba(122,236,141,0.2)"></span>
            <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.16em;color:rgba(255,255,255,0.35)">Review</span>
            <span style="flex:1;height:1px;background:rgba(255,255,255,0.05)"></span>
            <span style="font-size:10px;color:rgba(255,255,255,0.25)">01 task</span>
          </div>
          <div class="task-list">
            <div class="task-row">
              <div class="task-left">
                <div class="task-icon-box"><span class="material-symbols-outlined" style="font-size:16px">security</span></div>
                <div>
                  <span class="task-name">Execution token envelope</span><span class="task-id mono">ARC-123</span>
                  <div class="task-phase">Review</div>
                </div>
              </div>
              <span class="pill pill-good">Ready</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════
           REVIEW — Judgment surface
           Answers: what failed, why it matters, where, can I proceed?
           ═══════════════════════════════════ -->
      <div id="view-review" style="display:none">
        <div class="content-header">
          <div>
            <div class="content-eyebrow label">Control Plane</div>
            <h1 class="content-title headline">Blueprint Review</h1>
            <p class="content-subtitle">Readable code-risk surface with deviation hierarchy and confidence framing.</p>
          </div>
          <div style="display:flex;gap:6px">
            <span class="pill pill-warn">2 issues</span>
            <span class="pill pill-info">v2.4.0</span>
          </div>
        </div>

        <!-- Review hero: confidence + file context -->
        <div class="review-hero">
          <div>
            <div class="review-confidence">
              <div class="dot"></div>
              Confidence: High
            </div>
            <div class="review-file">src/auth/service.ts · 3.4kb · SHA-256: 8f2a…c190</div>
          </div>
          <div class="review-right">
            <div class="review-count">3 deviations · 1 blocking</div>
            <span class="pill pill-warn">Cannot push</span>
          </div>
        </div>

        <!-- Structured deviation rows — table cognition, not cards -->
        <div style="margin-bottom:6px">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.16em;color:rgba(255,255,255,0.3);margin-bottom:8px">
            Severity Order — Blocking First
          </div>
        </div>

        <div class="deviation-row severity-high" data-context="ctx-r1">
          <div class="severity-bar high"></div>
          <div class="deviation-body">
            <div class="deviation-title">Missing strict type enforcement in payload route</div>
            <div class="deviation-rule mono">Rule BR-02 · Type validation bypass</div>
          </div>
          <div class="deviation-location mono">L:08</div>
          <div class="deviation-confidence low">Low</div>
        </div>
        <div class="deviation-context" id="ctx-r1">
          <div class="code-line">05 &nbsp;&nbsp;<span style="color:rgba(168,130,255,0.8)">async</span> <span style="color:rgba(250,204,21,0.8)">validateUser</span>(payload: <span style="color:rgba(96,165,250,0.8)">any</span>) {</div>
          <div class="code-line code-highlight">06 &nbsp;&nbsp;&nbsp;&nbsp;<span style="color:rgba(96,165,250,0.8)">// ⚠ any-type cast violates BR-02</span></div>
          <div class="code-line code-highlight">07 &nbsp;&nbsp;&nbsp;&nbsp;<span style="color:rgba(168,130,255,0.8)">return</span> payload;</div>
          <div class="code-line">08 &nbsp;&nbsp;}</div>
          <div style="margin-top:8px;font-size:11px;color:rgba(254,215,170,0.7)">
            → Fix: Replace <span class="mono" style="color:var(--primary)">any</span> with a typed interface and Zod schema validation.
          </div>
        </div>

        <div class="deviation-row severity-medium" data-context="ctx-r2">
          <div class="severity-bar medium"></div>
          <div class="deviation-body">
            <div class="deviation-title">Token TTL configuration is hardcoded — should use environment vault</div>
            <div class="deviation-rule mono">Rule BR-04 · Token lifecycle policy</div>
          </div>
          <div class="deviation-location mono">L:13</div>
          <div class="deviation-confidence medium">Medium</div>
        </div>
        <div class="deviation-context" id="ctx-r2">
          <div class="code-line">11 &nbsp;&nbsp;<span style="color:rgba(168,130,255,0.8)">async</span> <span style="color:rgba(250,204,21,0.8)">login</span>(user: User) {</div>
          <div class="code-line code-highlight">12 &nbsp;&nbsp;&nbsp;&nbsp;<span style="color:rgba(96,165,250,0.8)">const</span> payload = { username: user.username, sub: user.userId };</div>
          <div class="code-line code-highlight">13 &nbsp;&nbsp;&nbsp;&nbsp;<span style="color:rgba(96,165,250,0.8)">const</span> ttl = <span style="color:rgba(250,204,21,0.8)">'72h'</span>; <span style="color:rgba(255,255,255,0.25)">// ← hardcoded</span></div>
          <div class="code-line">14 &nbsp;&nbsp;}</div>
          <div style="margin-top:8px;font-size:11px;color:rgba(254,215,170,0.7)">
            → Fix: Read TTL from <span class="mono" style="color:var(--primary)">process.env.JWT_TTL</span> with vault fallback.
          </div>
        </div>

        <div class="deviation-row" data-context="ctx-r3">
          <div class="severity-bar low"></div>
          <div class="deviation-body">
            <div class="deviation-title">Implicit injection shorthand — standardize constructor</div>
            <div class="deviation-rule mono">Rule BR-01 · Injection pattern safety</div>
          </div>
          <div class="deviation-location mono">L:04</div>
          <div class="deviation-confidence high">High</div>
        </div>
      </div>

      <!-- ═══════════════════════════════════
           ARCHITECT — Governance overview
           Answers: what defines the system's operating shape?
           NOT a settings page — a topology map
           ═══════════════════════════════════ -->
      <div id="view-architect" style="display:none">
        <div class="content-header">
          <div>
            <div class="content-eyebrow label">Control Plane</div>
            <h1 class="content-title headline">Architect View</h1>
            <p class="content-subtitle">System posture, route policies, and directive-state visibility in one shell.</p>
          </div>
          <div style="display:flex;gap:6px">
            <span class="pill pill-good">Stable</span>
            <span class="pill pill-info">v2.4.0</span>
          </div>
        </div>

        <!-- Policy mode — dominant -->
        <div class="topology-block">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div>
              <div class="topology-label">Policy Mode</div>
              <div class="topology-value" style="color:var(--tertiary-fixed-dim)">STRICT_ENFORCEMENT</div>
              <div class="topology-hint">All requests require valid signature + pre-flight audit</div>
            </div>
            <div style="display:flex;gap:6px">
              <span class="pill pill-good" style="font-size:9px">Sign-Req</span>
              <span class="pill pill-good" style="font-size:9px">Audit-Pre</span>
              <span class="pill pill-good" style="font-size:9px">Log-All</span>
            </div>
          </div>
        </div>

        <div class="bento">
          <div>
            <!-- Active Routes -->
            <div class="topology-block">
              <div class="topology-label">Active Routes</div>
              <div class="route-map">
                <div class="route-entry">
                  <div class="route-left">
                    <div class="route-indicator active"></div>
                    <div>
                      <div class="route-name">Local → Cloud</div>
                      <div class="route-desc mono">Primary · us-east-1.aws.arc</div>
                    </div>
                  </div>
                  <span class="route-badge pill pill-good">Active</span>
                </div>
                <div class="route-entry">
                  <div class="route-left">
                    <div class="route-indicator disabled"></div>
                    <div>
                      <div class="route-name">Local → Fallback</div>
                      <div class="route-desc mono">Secondary · disabled</div>
                    </div>
                  </div>
                  <span class="route-badge pill pill-neutral">Disabled</span>
                </div>
                <div class="route-entry">
                  <div class="route-left">
                    <div class="route-indicator disabled"></div>
                    <div>
                      <div class="route-name">Audit Cache Read</div>
                      <div class="route-desc mono">Degraded — fallback engaged</div>
                    </div>
                  </div>
                  <span class="route-badge pill pill-warn">Degraded</span>
                </div>
              </div>
            </div>

            <!-- Blueprint Score -->
            <div class="topology-block">
              <div class="topology-label">Blueprint Score</div>
              <div style="display:flex;align-items:baseline;gap:12px">
                <div class="topology-value headline" style="font-size:36px">94<span style="font-size:16px;font-weight:400;color:rgba(255,255,255,0.3)">%</span></div>
                <span class="pill pill-good">Above threshold</span>
              </div>
              <div class="topology-hint" style="margin-top:6px">Composite of rule evaluations across 3 active directives</div>
            </div>
          </div>

          <div>
            <!-- Directive State -->
            <div class="topology-block">
              <div class="topology-label">Directive State</div>
              <div class="directive-list">
                <div class="directive-entry">
                  <span class="directive-id">ARC-101</span>
                  <div style="display:flex;align-items:center;gap:8px">
                    <span style="font-size:11px;color:rgba(255,255,255,0.5)">Route verification</span>
                    <span class="directive-status pill pill-info">Active</span>
                  </div>
                </div>
                <div class="directive-entry">
                  <span class="directive-id">ARC-118</span>
                  <div style="display:flex;align-items:center;gap:8px">
                    <span style="font-size:11px;color:rgba(255,255,255,0.5)">Policy manifest</span>
                    <span class="directive-status pill pill-warn">Review</span>
                  </div>
                </div>
                <div class="directive-entry">
                  <span class="directive-id">ARC-123</span>
                  <div style="display:flex;align-items:center;gap:8px">
                    <span style="font-size:11px;color:rgba(255,255,255,0.5)">Token envelope</span>
                    <span class="directive-status pill pill-good">Ready</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- System Parameters -->
            <div class="topology-block">
              <div class="topology-label">System Parameters</div>
              <div style="display:flex;flex-direction:column;gap:8px">
                <div style="display:flex;justify-content:space-between">
                  <span style="font-size:11px;color:rgba(255,255,255,0.35)">Thread ID</span>
                  <span class="mono" style="font-size:11px;color:rgba(159,202,255,0.7)">0x7ff82c03</span>
                </div>
                <div style="display:flex;justify-content:space-between">
                  <span style="font-size:11px;color:rgba(255,255,255,0.35)">Memory Usage</span>
                  <span class="mono" style="font-size:11px;color:rgba(159,202,255,0.7)">142.8 MB</span>
                </div>
                <div style="display:flex;justify-content:space-between">
                  <span style="font-size:11px;color:rgba(255,255,255,0.35)">Node Affinity</span>
                  <span class="mono" style="font-size:11px;color:rgba(159,202,255,0.7)">CLUSTER-B12</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </main>
  </div>
</div>

<script nonce="${nonce}">
  (function() {
    var vscode = acquireVsCodeApi();
    var routes = ['runtime', 'tasks', 'review', 'architect'];

    // ── Navigation with subtle content fade ──
    function activateRoute(route) {
      // Topbar nav
      document.querySelectorAll('.topbar-nav-item').forEach(function(el) {
        el.classList.toggle('active', el.getAttribute('data-route') === route);
      });
      // Rail
      document.querySelectorAll('.rail-item').forEach(function(el) {
        el.classList.toggle('active', el.getAttribute('data-route') === route);
      });
      // Sidebar nav items
      document.querySelectorAll('.sidebar-nav-item').forEach(function(el) {
        el.classList.toggle('active', el.getAttribute('data-route') === route);
      });
      // Content views — with brief opacity transition
      var content = document.getElementById('main-content');
      routes.forEach(function(r) {
        var view = document.getElementById('view-' + r);
        if (view) view.style.display = r === route ? '' : 'none';
      });
      // Subtle fade on route change
      if (content) {
        content.style.opacity = '0.5';
        setTimeout(function() { content.style.opacity = '1'; }, 80);
      }

      vscode.postMessage({ command: 'navigateRoute', route: route });
    }

    // Wire all nav elements
    document.querySelectorAll('[data-route]').forEach(function(el) {
      el.addEventListener('click', function() {
        activateRoute(el.getAttribute('data-route'));
      });
    });

    // ── EXECUTE_RUN — ceremonial with state awareness ──
    var execBtn = document.getElementById('btn-execute');
    var execState = 'ready'; // ready | executing | warning

    if (execBtn) {
      execBtn.addEventListener('click', function() {
        if (execState === 'executing') return; // locked during execution

        execState = 'executing';
        execBtn.className = 'btn-execute executing';
        execBtn.textContent = 'EXECUTING…';

        vscode.postMessage({ command: 'executeCommand', commandId: 'arc.showRuntimeStatus' });

        // Simulate execution completion (replace with real state machine)
        setTimeout(function() {
          execState = 'ready';
          execBtn.className = 'btn-execute ready';
          execBtn.textContent = 'EXECUTE_RUN';
        }, 3000);
      });
    }

    // ── Deviation row click → expand code context ──
    document.querySelectorAll('.deviation-row[data-context]').forEach(function(row) {
      row.addEventListener('click', function() {
        var ctxId = row.getAttribute('data-context');
        var ctx = document.getElementById(ctxId);
        if (ctx) {
          var isOpen = ctx.classList.contains('open');
          // Close all contexts first
          document.querySelectorAll('.deviation-context').forEach(function(c) {
            c.classList.remove('open');
          });
          // Toggle clicked
          if (!isOpen) ctx.classList.add('open');
        }
      });
    });

    // ── Topbar icon buttons ──
    var btnMap = {
      'btn-terminal':  'arc.showRuntimeStatus',
      'btn-bugs':     'arc.reviewGovernedRoot',
      'btn-settings': 'arc.showWelcome'
    };
    Object.keys(btnMap).forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', function() {
        vscode.postMessage({ command: 'executeCommand', commandId: btnMap[id] });
      });
    });
  })();
</script>
</body>
</html>`;
}
