/**
 * Content Security Policy definitions for ARC UI WebviewPanels
 * 
 * WRD-0092 Compliance: Restrictive CSP to prevent XSS and unauthorized resource loading
 * OBS-S-7037 Compliance: CSP defined before any WebviewPanel creation
 */

import type { WebviewPanel } from 'vscode';

/**
 * Restrictive CSP for all ARC review WebviewPanels
 * 
 * Security constraints:
 * - default-src 'none': No resources by default
 * - script-src 'self': Only scripts from webview source (no inline, no eval)
 * - style-src 'self' 'unsafe-inline': Styles from source + inline for VS Code theme vars
 * - img-src 'self' data: Images from source or data URIs (for icons)
 * - font-src 'self': Only local fonts
 * - connect-src 'none': No XHR/fetch (read-only UI)
 * - frame-src 'none': No iframes
 * - object-src 'none': No plugins
 * - base-uri 'none': No <base> tag manipulation
 * - form-action 'none': No form submissions (read-only UI)
 */
export const RESTRICTIVE_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

/**
 * Apply restrictive CSP to a WebviewPanel
 * 
 * Must be called BEFORE setting any HTML content
 */
export function applyCSP(panel: WebviewPanel): void {
  panel.webview.options = {
    enableScripts: true, // Required for VS Code webview messaging
    localResourceRoots: [], // No local file access beyond extension
    portMapping: [], // No port mapping
  };
  
  // CSP is applied via meta tag in HTML content
  // This function ensures webview options don't weaken security
}

/**
 * Generate CSP meta tag for HTML head
 */
export function getCSPMetaTag(): string {
  return `<meta http-equiv="Content-Security-Policy" content="${escapeHtml(RESTRICTIVE_CSP)}">`;
}

/**
 * Escape HTML for CSP header
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
