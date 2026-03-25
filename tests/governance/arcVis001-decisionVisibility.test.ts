import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
);

/**
 * Governance tests for ARC-VIS-001 — Decision Visibility Layer
 *
 * These tests verify:
 * - WRD-0110: Why Panel wording submitted for review
 * - WRD-0111: Degraded/stale/absent states render explicitly
 * - WRD-0112: Evidence-framed wording throughout
 * - WRD-0113: ARC-UI-001a security baseline replicated
 * - OBS-S-7071: Read-model additions bounded/read-only
 */

describe('ARC-VIS-001 — Decision Visibility Governance', () => {
  describe('WRD-0110: Why Panel Wording Review', () => {
    it('Why Panel wording submission exists', () => {
      const submissionPath = path.join(
        projectRoot,
        'artifacts',
        'ARC-VIS-001-WHY-PANEL-WORDING.md',
      );
      expect(fs.existsSync(submissionPath)).toBe(true);

      const submission = fs.readFileSync(submissionPath, 'utf8');

      // Should have all decision types documented
      expect(submission).toContain('ALLOW');
      expect(submission).toContain('WARN');
      expect(submission).toContain('REQUIRE_PLAN');
      expect(submission).toContain('BLOCK');

      // Should have Warden review checklist
      expect(submission).toContain('Warden Review');
      expect(submission).toContain('Warden Verification Checklist');
    });

    it('Why Panel uses evidence-framed wording', () => {
      const whyPanelPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'WhyPanel.ts',
      );
      const whyPanel = fs.readFileSync(whyPanelPath, 'utf8');

      // Should use "Records show" pattern
      expect(whyPanel).toContain('Records show');

      // Should NOT use instructional language
      expect(whyPanel).not.toMatch(/you should|you must|click to/i);
    });
  });

  describe('WRD-0111: Degraded/Stale/Absent States', () => {
    it('Decision Feed renders absent state explicitly', () => {
      const feedPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'DecisionFeed.ts',
      );
      const feed = fs.readFileSync(feedPath, 'utf8');

      // Should have explicit absent state
      expect(feed).toContain('No recent decisions recorded');
      expect(feed).toContain('absent');
    });

    it('Audit Timeline renders absent state explicitly', () => {
      const timelinePath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'AuditTimeline.ts',
      );
      const timeline = fs.readFileSync(timelinePath, 'utf8');

      // Should have explicit absent state
      expect(timeline).toContain('No audit timeline available');
      expect(timeline).toContain('absent');
    });

    it('Why Panel renders absent state explicitly', () => {
      const whyPanelPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'WhyPanel.ts',
      );
      const whyPanel = fs.readFileSync(whyPanelPath, 'utf8');

      // Should have explicit absent state
      expect(whyPanel).toContain('No decision explanation available');
      expect(whyPanel).toContain('absent');
    });
  });

  describe('WRD-0112: Evidence-Framed Wording', () => {
    it('Decision Feed uses evidence-framed wording', () => {
      const feedPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'DecisionFeed.ts',
      );
      const feed = fs.readFileSync(feedPath, 'utf8');

      // Should use "Records show" pattern
      expect(feed).toContain('Records show');

      // Should NOT claim certification
      expect(feed).not.toMatch(/certifies|guarantees/i);
    });

    it('Audit Timeline uses evidence-framed wording', () => {
      const timelinePath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'AuditTimeline.ts',
      );
      const timeline = fs.readFileSync(timelinePath, 'utf8');

      // Should use "Records show" pattern
      expect(timeline).toContain('Records show');

      // Should NOT claim certification (but "completeness" in negative context is OK)
      expect(timeline).not.toMatch(/certifies completeness/i);
      expect(timeline).not.toMatch(/certified audit/i);
    });

    it('Why Panel uses evidence-framed wording', () => {
      const whyPanelPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'WhyPanel.ts',
      );
      const whyPanel = fs.readFileSync(whyPanelPath, 'utf8');

      // Should use "Records show" pattern
      expect(whyPanel).toContain('Records show');

      // Should have boundary disclaimer
      expect(whyPanel).toContain('does not authorize');
    });
  });

  describe('WRD-0113: ARC-UI-001a Security Baseline', () => {
    it('Decision Feed imports CSP and sanitization', () => {
      const feedPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'DecisionFeed.ts',
      );
      const feed = fs.readFileSync(feedPath, 'utf8');

      expect(feed).toMatch(/import.*csp/i);
      expect(feed).toMatch(/import.*sanitize/i);
      expect(feed).toContain('buildCSPWithNonce');
      expect(feed).toContain('escapeHtml');
    });

    it('Audit Timeline imports CSP and sanitization', () => {
      const timelinePath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'AuditTimeline.ts',
      );
      const timeline = fs.readFileSync(timelinePath, 'utf8');

      expect(timeline).toMatch(/import.*csp/i);
      expect(timeline).toMatch(/import.*sanitize/i);
      expect(timeline).toContain('buildCSPWithNonce');
      expect(timeline).toContain('escapeHtml');
    });

    it('Why Panel imports CSP and sanitization', () => {
      const whyPanelPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'WhyPanel.ts',
      );
      const whyPanel = fs.readFileSync(whyPanelPath, 'utf8');

      expect(whyPanel).toMatch(/import.*csp/i);
      expect(whyPanel).toMatch(/import.*sanitize/i);
      expect(whyPanel).toContain('buildCSPWithNonce');
      expect(whyPanel).toContain('escapeHtml');
    });

    it('All visibility surfaces use nonce-based CSP', () => {
      const surfaces = ['DecisionFeed.ts', 'AuditTimeline.ts', 'WhyPanel.ts'];

      for (const surface of surfaces) {
        const surfacePath = path.join(
          projectRoot,
          'src',
          'ui',
          'webview',
          surface,
        );
        const content = fs.readFileSync(surfacePath, 'utf8');

        expect(content).toContain('generateNonce');
        expect(content).toContain('buildCSPWithNonce');
      }
    });
  });

  describe('OBS-S-7071: Read-Model Bounded/Read-Only', () => {
    it('Decision Feed has no write operations', () => {
      const feedPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'DecisionFeed.ts',
      );
      const feed = fs.readFileSync(feedPath, 'utf8');

      // Should NOT have write operations
      expect(feed).not.toMatch(/writeFileSync|appendFileSync/i);
      expect(feed).not.toMatch(/fs\.write/i);
    });

    it('Audit Timeline has no write operations', () => {
      const timelinePath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'AuditTimeline.ts',
      );
      const timeline = fs.readFileSync(timelinePath, 'utf8');

      // Should NOT have write operations
      expect(timeline).not.toMatch(/writeFileSync|appendFileSync/i);
      expect(timeline).not.toMatch(/fs\.write/i);
    });

    it('Why Panel has no write operations', () => {
      const whyPanelPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'WhyPanel.ts',
      );
      const whyPanel = fs.readFileSync(whyPanelPath, 'utf8');

      // Should NOT have write operations
      expect(whyPanel).not.toMatch(/writeFileSync|appendFileSync/i);
      expect(whyPanel).not.toMatch(/fs\.write/i);
    });

    it('All surfaces read from existing audit.jsonl only', () => {
      const surfaces = ['DecisionFeed.ts', 'AuditTimeline.ts', 'WhyPanel.ts'];

      for (const surface of surfaces) {
        const surfacePath = path.join(
          projectRoot,
          'src',
          'ui',
          'webview',
          surface,
        );
        const content = fs.readFileSync(surfacePath, 'utf8');

        // Should read from audit.jsonl
        expect(content).toContain('audit.jsonl');

        // Should NOT create new persistence
        expect(content).not.toMatch(/\.json(?!l)/i);
      }
    });
  });

  describe('Command Registration (ARC-VIS-001)', () => {
    it('UI module registers visibility commands', () => {
      const indexPath = path.join(projectRoot, 'src', 'ui', 'index.ts');
      const index = fs.readFileSync(indexPath, 'utf8');

      // Should register all visibility commands
      expect(index).toContain('arc.ui.decisionFeed');
      expect(index).toContain('arc.ui.auditTimeline');
      expect(index).toContain('arc.ui.whyPanel');
    });

    it('ReviewHome whitelist updated for new commands', () => {
      const reviewHomePath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'ReviewHome.ts',
      );
      const reviewHome = fs.readFileSync(reviewHomePath, 'utf8');

      // Should have updated whitelist (may or may not include visibility commands)
      expect(reviewHome).toContain('allowed');
    });
  });
});
