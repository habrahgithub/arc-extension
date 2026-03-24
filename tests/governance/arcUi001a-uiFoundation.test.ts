import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
);

/**
 * Governance tests for ARC-UI-001a — UI Foundation + Review Home
 *
 * These tests verify:
 * - OBS-S-7036: UI layer dependency direction documented
 * - OBS-S-7038: Component-adoption summary exists
 * - WRD-0092: CSP and sanitization implemented
 * - WRD-0096: Identity wording bounded
 */

describe('ARC-UI-001a — UI Foundation Governance', () => {
  describe('OBS-S-7036: UI Layer Boundary', () => {
    it('UI layer README documents dependency direction', () => {
      const uiReadmePath = path.join(projectRoot, 'src', 'ui', 'README.md');
      expect(fs.existsSync(uiReadmePath)).toBe(true);

      const uiReadme = fs.readFileSync(uiReadmePath, 'utf8');

      // Should document dependency direction
      expect(uiReadme).toContain('Dependency Direction');
      expect(uiReadme).toContain('UI → Extension');

      // Should explicitly state NO write access
      expect(uiReadme).toContain('NO write access');
      expect(uiReadme).toContain('audit');
      expect(uiReadme).toContain('proof');
      expect(uiReadme).toContain('enforcement');
    });

    it('UI layer has no direct core imports', () => {
      const uiFiles = [
        'src/ui/index.ts',
        'src/ui/csp.ts',
        'src/ui/sanitize.ts',
        'src/ui/webview/ReviewHome.ts',
      ];

      for (const file of uiFiles) {
        const filePath = path.join(projectRoot, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          // Should not import directly from core
          expect(content).not.toMatch(/from ['"]\.\/core['"]/);
          expect(content).not.toMatch(/from ['"]\.\.\/core['"]/);
        }
      }
    });
  });

  describe('OBS-S-7038: Component-Adoption Summary', () => {
    it('component-adoption summary exists', () => {
      const summaryPath = path.join(
        projectRoot,
        'artifacts',
        'ARC-UI-001a-COMPONENT-ADOPTION.md',
      );
      expect(fs.existsSync(summaryPath)).toBe(true);

      const summary = fs.readFileSync(summaryPath, 'utf8');

      // Should have adopted vs excluded sections
      expect(summary).toContain('Adopted Primitives');
      expect(summary).toContain('Excluded Template Elements');

      // Should justify decisions
      expect(summary).toContain('Justification');
    });

    it('summary documents what was reused vs excluded', () => {
      const summaryPath = path.join(
        projectRoot,
        'artifacts',
        'ARC-UI-001a-COMPONENT-ADOPTION.md',
      );
      const summary = fs.readFileSync(summaryPath, 'utf8');

      // Should list adopted components
      expect(summary).toMatch(/Adopted|Reuse|Import/i);

      // Should list excluded components
      expect(summary).toMatch(/Excluded|Not adopted|Rejected/i);

      // Should explain why
      expect(summary).toMatch(/Why|Reason|Justification/i);
    });
  });

  describe('WRD-0092: CSP and Sanitization', () => {
    it('CSP module defines restrictive policy with nonce support', () => {
      const cspPath = path.join(projectRoot, 'src', 'ui', 'csp.ts');
      expect(fs.existsSync(cspPath)).toBe(true);

      const csp = fs.readFileSync(cspPath, 'utf8');

      // Should have restrictive CSP with nonce support (WRD-0097 fix)
      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain("script-src 'nonce-");
      expect(csp).toContain("connect-src 'none'");
      expect(csp).toContain("frame-src 'none'");
      expect(csp).toContain('generateNonce');
      expect(csp).toContain('buildCSPWithNonce');
    });

    it('sanitization module escapes HTML', () => {
      const sanitizePath = path.join(projectRoot, 'src', 'ui', 'sanitize.ts');
      expect(fs.existsSync(sanitizePath)).toBe(true);

      const sanitize = fs.readFileSync(sanitizePath, 'utf8');

      // Should have escapeHtml function
      expect(sanitize).toContain('escapeHtml');
      expect(sanitize).toContain('&amp;');
      expect(sanitize).toContain('&lt;');
      expect(sanitize).toContain('&gt;');
    });

    it('ReviewHome uses CSP and sanitization', () => {
      const reviewHomePath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'ReviewHome.ts',
      );
      expect(fs.existsSync(reviewHomePath)).toBe(true);

      const reviewHome = fs.readFileSync(reviewHomePath, 'utf8');

      // Should import CSP with nonce support
      expect(reviewHome).toMatch(/import.*csp/i);
      expect(reviewHome).toContain('generateNonce');
      expect(reviewHome).toContain('buildCSPWithNonce');

      // Should import sanitization
      expect(reviewHome).toMatch(/import.*sanitize/i);

      // Should use escapeHtml
      expect(reviewHome).toContain('escapeHtml');

      // Should use nonce in script tag (WRD-0097 fix)
      expect(reviewHome).toContain('nonce=');
    });
  });

  describe('WRD-0096: Identity Wording', () => {
    it('Review Home uses bounded identity wording', () => {
      const reviewHomePath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'ReviewHome.ts',
      );
      const reviewHome = fs.readFileSync(reviewHomePath, 'utf8');

      // Should use correct product name
      expect(reviewHome).toContain('ARC — Audit Ready Core');

      // Should have posture notes
      expect(reviewHome).toContain('Local-only');
      expect(reviewHome).toContain('Descriptive-only');
      expect(reviewHome).toContain('Non-authorizing');
    });

    it('Review Home does not overclaim capability', () => {
      const reviewHomePath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'ReviewHome.ts',
      );
      const reviewHome = fs.readFileSync(reviewHomePath, 'utf8');

      // Should NOT claim cloud readiness
      expect(reviewHome).not.toMatch(/cloud[- ]ready|cloud[- ]enabled/i);

      // Should NOT claim marketplace readiness
      expect(reviewHome).not.toMatch(/marketplace|public release/i);

      // Should NOT claim production readiness
      expect(reviewHome).not.toMatch(/production[- ]ready/i);
    });

    it('Review Home footer has advisory disclaimer', () => {
      const reviewHomePath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'ReviewHome.ts',
      );
      const reviewHome = fs.readFileSync(reviewHomePath, 'utf8');

      // Should have disclaimer about non-authorizing nature
      expect(reviewHome).toMatch(
        /local[- ]only|read[- ]only|non[- ]authorizing/i,
      );
    });
  });

  describe('Screen 7 Exclusion (WRD-0095)', () => {
    it('no Screen 7 (Command Centre) implementation files', () => {
      const uiWebviewDir = path.join(projectRoot, 'src', 'ui', 'webview');

      // Check for actual implementation files
      const implFiles = ['CommandCentre.ts', 'CommandCenter.ts'];

      for (const implFile of implFiles) {
        const filePath = path.join(uiWebviewDir, implFile);
        expect(fs.existsSync(filePath)).toBe(false);
      }
    });

    it('documentation states Screen 7 is parked', () => {
      const readmePath = path.join(projectRoot, 'src', 'ui', 'README.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      // Documentation should state Screen 7 is excluded/parked
      expect(readme).toContain('Parked');
      expect(readme).toContain('Screen 7');
      expect(readme).toContain('Excluded');
    });
  });

  describe('No Execution Authority', () => {
    it('Review Home message handler uses command whitelist', () => {
      const reviewHomePath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'ReviewHome.ts',
      );
      const reviewHome = fs.readFileSync(reviewHomePath, 'utf8');

      // Should have whitelist
      expect(reviewHome).toContain('allowed');
      expect(reviewHome).toContain('arc.showRuntimeStatus');
      expect(reviewHome).toContain('arc.reviewAudit');

      // Should check command against whitelist before executing
      expect(reviewHome).toContain('includes');
    });

    it('UI layer has no audit write operations', () => {
      const uiDir = path.join(projectRoot, 'src', 'ui');

      const files = fs.readdirSync(uiDir, { recursive: true });
      for (const file of files) {
        const filePath = path.join(uiDir, file.toString());
        if (fs.statSync(filePath).isFile() && filePath.endsWith('.ts')) {
          const content = fs.readFileSync(filePath, 'utf8');
          // Should not write to audit
          expect(content).not.toMatch(/writeFileSync.*audit/i);
          expect(content).not.toMatch(/appendFileSync.*audit/i);
          expect(content).not.toMatch(/audit\.jsonl.*write/i);
        }
      }
    });
  });
});
