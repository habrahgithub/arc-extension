/**
 * Content Security Policy definitions for ARC UI WebviewPanels
 *
 * WRD-0092 Compliance: Restrictive CSP to prevent XSS and unauthorized resource loading
 * OBS-S-7037 Compliance: CSP defined before any WebviewPanel creation
 * WRD-0097 Fix: Nonce-based CSP for inline scripts (VS Code webview requirement)
 */

import * as crypto from 'crypto';

/**
 * Generate a cryptographic nonce for CSP
 *
 * This nonce must be:
 * 1. Generated per webview instance
 * 2. Included in CSP header
 * 3. Included in script tag as nonce attribute
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Build CSP with nonce for inline scripts
 *
 * Security constraints:
 * - default-src 'none': No resources by default
 * - script-src 'nonce-{nonce}': Only scripts with valid nonce
 * - style-src 'self' 'unsafe-inline': Styles from source + inline for VS Code theme vars
 * - img-src 'self' data: Images from source or data URIs (for icons)
 * - font-src 'self': Only local fonts
 * - connect-src 'none': No XHR/fetch (read-only UI)
 * - frame-src 'none': No iframes
 * - object-src 'none': No plugins
 * - base-uri 'none': No <base> tag manipulation
 * - form-action 'none': No form submissions (read-only UI)
 */
export function buildCSPWithNonce(nonce: string): string {
  return [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

/**
 * Restrictive CSP without nonce (for reference/testing)
 * Note: This doesn't work with inline scripts - use buildCSPWithNonce instead
 */
export const RESTRICTIVE_CSP = buildCSPWithNonce('REPLACE_WITH_ACTUAL_NONCE');
