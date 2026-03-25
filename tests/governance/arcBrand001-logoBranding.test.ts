import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
);

/**
 * Governance tests for ARC-BRAND-001 — Logo and Branding Integration
 *
 * These tests verify:
 * - WRD-0114: localResourceRoots scoped to Public/Logo/ only
 * - WRD-0115: Branding-truthful wording (no overclaiming)
 * - WRD-0116: No remote asset loading
 * - OBS-S-7082: Logo rendered on all 4 declared surfaces
 */

describe('ARC-BRAND-001 — Logo and Branding Governance', () => {
  const brandedSurfaces = [
    'ReviewHome.ts',
    'DecisionFeed.ts',
    'AuditTimeline.ts',
    'WhyPanel.ts',
  ];

  describe('WRD-0114: localResourceRoots Scope', () => {
    it('localResourceRoots scoped to Public/Logo/ only (not full extensionUri)', () => {
      for (const surface of brandedSurfaces) {
        const surfacePath = path.join(
          projectRoot,
          'src',
          'ui',
          'webview',
          surface,
        );
        const content = fs.readFileSync(surfacePath, 'utf8');

        // Check that localResourceRoots doesn't have extensionUri as separate array entry
        // The correct pattern: [vscode.Uri.joinPath(context.extensionUri, 'Public', 'Logo')]
        // Wrong pattern: [context.extensionUri, vscode.Uri.joinPath(...)]

        // Find all localResourceRoots array definitions
        const arrayPattern =
          /localResourceRoots:\s*context\s*\?\s*\[([^\]]+)\]/g;
        let match;
        while ((match = arrayPattern.exec(content)) !== null) {
          const arrayContent = match[1].trim();
          // Should NOT start with extensionUri as a separate entry
          // (it's OK inside joinPath function, just not as standalone first array item)
          expect(arrayContent).not.toMatch(/^context\.extensionUri\s*,/);
          // Should have Public/Logo path
          expect(arrayContent).toContain('Public');
          expect(arrayContent).toContain('Logo');
        }
      }
    });
  });

  describe('WRD-0115: Branding Truthfulness', () => {
    it('logo alt text is descriptive only (no overclaiming)', () => {
      for (const surface of brandedSurfaces) {
        const surfacePath = path.join(
          projectRoot,
          'src',
          'ui',
          'webview',
          surface,
        );
        const content = fs.readFileSync(surfacePath, 'utf8');

        // Should have alt="ARC Logo" (descriptive)
        expect(content).toContain('alt="ARC Logo"');

        // Should NOT have overclaiming alt text
        expect(content).not.toMatch(
          /alt="[^"]*(powered|protected|certified|official)[^"]*"/i,
        );
      }
    });

    it('no marketing/capability taglines with logo', () => {
      for (const surface of brandedSurfaces) {
        const surfacePath = path.join(
          projectRoot,
          'src',
          'ui',
          'webview',
          surface,
        );
        const content = fs.readFileSync(surfacePath, 'utf8');

        // Should NOT have marketing taglines
        expect(content).not.toMatch(/production[- ]ready/i);
        expect(content).not.toMatch(/marketplace/i);
        expect(content).not.toMatch(/powered by/i);
        expect(content).not.toMatch(/certified/i);
      }
    });
  });

  describe('WRD-0116: No Remote Asset Loading', () => {
    it('no http:// or https:// image references', () => {
      for (const surface of brandedSurfaces) {
        const surfacePath = path.join(
          projectRoot,
          'src',
          'ui',
          'webview',
          surface,
        );
        const content = fs.readFileSync(surfacePath, 'utf8');

        // Should NOT have remote image URLs
        expect(content).not.toMatch(/<img[^>]*src=["']https?:\/\//i);

        // Should use asWebviewUri for local assets
        expect(content).toMatch(/asWebviewUri/);
      }
    });
  });

  describe('OBS-S-7082: Logo Rendered on All Surfaces', () => {
    it('logoHtml computed in all 4 surfaces', () => {
      for (const surface of brandedSurfaces) {
        const surfacePath = path.join(
          projectRoot,
          'src',
          'ui',
          'webview',
          surface,
        );
        const content = fs.readFileSync(surfacePath, 'utf8');

        // Should compute logoUri
        expect(content).toContain('logoUri');

        // Should compute logoHtml
        expect(content).toContain('logoHtml');
      }
    });

    it('logoHtml rendered in HTML output for all 4 surfaces', () => {
      for (const surface of brandedSurfaces) {
        const surfacePath = path.join(
          projectRoot,
          'src',
          'ui',
          'webview',
          surface,
        );
        const content = fs.readFileSync(surfacePath, 'utf8');

        // Should render logoHtml in body (not just compute it)
        expect(content).toMatch(/\$\{logoHtml\}/);
      }
    });

    it('logo CSS styles present in all 4 surfaces', () => {
      for (const surface of brandedSurfaces) {
        const surfacePath = path.join(
          projectRoot,
          'src',
          'ui',
          'webview',
          surface,
        );
        const content = fs.readFileSync(surfacePath, 'utf8');

        // Should have logo CSS
        expect(content).toContain('.logo-container');
        expect(content).toContain('.logo');
        expect(content).toContain('max-height: 60px');
      }
    });
  });

  describe('ARC-UI-001a Security Baseline Preservation', () => {
    it('nonce-based CSP preserved in all branded surfaces', () => {
      for (const surface of brandedSurfaces) {
        const surfacePath = path.join(
          projectRoot,
          'src',
          'ui',
          'webview',
          surface,
        );
        const content = fs.readFileSync(surfacePath, 'utf8');

        // Should use nonce-based CSP functions
        expect(content).toContain('buildCSPWithNonce');
        expect(content).toContain('generateNonce');
      }
    });

    it('HTML sanitization used for logo URI', () => {
      for (const surface of brandedSurfaces) {
        const surfacePath = path.join(
          projectRoot,
          'src',
          'ui',
          'webview',
          surface,
        );
        const content = fs.readFileSync(surfacePath, 'utf8');

        // Should escape logoUri before use
        expect(content).toMatch(/escapeHtml\(logoUri\)/);
      }
    });
  });
});
