/**
 * HTML Sanitization utilities for ARC UI WebviewPanels
 *
 * WRD-0092 Compliance: Prevent XSS by sanitizing all user-controlled data
 * OBS-S-7037 Compliance: Sanitization defined before any WebviewPanel creation
 */

/**
 * Escape HTML special characters to prevent XSS
 *
 * Use this for ALL user-controlled data:
 * - File paths
 * - Audit entries
 * - Rule names
 * - Directive IDs
 * - Any text from workspace files
 *
 * @param text - Untrusted text content
 * @returns HTML-safe string
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') {
    text = String(text);
  }

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape for use in HTML attribute values
 *
 * @param text - Untrusted attribute value
 * @returns HTML-safe attribute value
 */
export function escapeHtmlAttribute(text: string): string {
  return escapeHtml(text)
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '&#13;')
    .replace(/\t/g, '&#9;');
}

/**
 * Escape for use in JavaScript string literals within HTML
 *
 * @param text - Untrusted text for JS context
 * @returns JS-safe string
 */
export function escapeForJs(text: string): string {
  return escapeHtml(text)
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\//g, '\\/');
}

/**
 * Sanitize file path for display
 *
 * Additional safety: truncate long paths to prevent UI overflow attacks
 *
 * @param filePath - File path from workspace
 * @param maxLength - Maximum display length (default: 200)
 * @returns Sanitized and truncated path
 */
export function sanitizeFilePath(filePath: string, maxLength = 200): string {
  const sanitized = escapeHtml(filePath);

  if (sanitized.length > maxLength) {
    return '...' + sanitized.slice(-maxLength + 3);
  }

  return sanitized;
}

/**
 * Sanitize audit entry text for display
 *
 * @param text - Text from audit entry
 * @returns Sanitized text
 */
export function sanitizeAuditText(text: string): string {
  return escapeHtml(text);
}

/**
 * Sanitize directive ID for display
 *
 * Directive IDs should match pattern ARC-XXX but we still escape
 *
 * @param directiveId - Directive ID string
 * @returns Sanitized directive ID
 */
export function sanitizeDirectiveId(directiveId: string): string {
  // Basic validation (defensive, not security-critical)
  if (!/^[A-Z0-9\-_]+$/.test(directiveId)) {
    return 'INVALID_DIRECTIVE_ID';
  }
  return escapeHtml(directiveId);
}

/**
 * Create safe HTML from trusted template with sanitized values
 *
 * @param template - HTML template with {{placeholders}}
 * @param values - Key-value pairs for placeholders (values will be escaped)
 * @returns Safe HTML string
 */
export function renderTemplate(
  template: string,
  values: Record<string, string>,
): string {
  let result = template;

  for (const [key, value] of Object.entries(values)) {
    const placeholder = new RegExp(`\\{\\{${escapeRegex(key)}\\}\\}`, 'g');
    result = result.replace(placeholder, escapeHtml(value));
  }

  return result;
}

/**
 * Escape regex special characters
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
