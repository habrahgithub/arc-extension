import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
);

/**
 * Governance tests for ARC-UI-001c — Blueprint Proof + False-Positive + Guided Workflow
 *
 * These tests verify:
 * - WRD-0102: Screen 6 wording does not imply authorization
 * - WRD-0098: Evidence-framed wording used
 * - WRD-0100/0101: No interactive mutation elements
 * - WRD-0103: CSP/sanitization baseline replicated
 */

describe('ARC-UI-001c — UI Governance', () => {
  describe('WRD-0102: Screen 6 Wording Review', () => {
    it('Screen 6 does not contain authority-implying strings', () => {
      const workflowPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'GuidedProofWorkflow.ts',
      );
      const workflow = fs.readFileSync(workflowPath, 'utf8');

      // Should NOT contain authority-implying strings
      // Note: Comments may contain these words for documentation purposes
      // Check the actual step content strings
      expect(workflow).not.toMatch(/content: '.*authorizes your change/i);
      expect(workflow).not.toMatch(/content: '.*will allow the save/i);

      // Should use linkage language instead
      expect(workflow).toContain('links your change to a governance plan');
    });

    it('Screen 6 warning box is present', () => {
      const workflowPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'GuidedProofWorkflow.ts',
      );
      const workflow = fs.readFileSync(workflowPath, 'utf8');

      // Should have warning box
      expect(workflow).toContain('warning-box');
      expect(workflow).toContain('Important Boundaries');

      // Should have instructional-only disclaimer
      expect(workflow).toContain('instructional only');
      expect(workflow).toContain('does not approve saves');
    });

    it('Screen 6 footer notices are present', () => {
      const workflowPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'GuidedProofWorkflow.ts',
      );
      const workflow = fs.readFileSync(workflowPath, 'utf8');

      // Should have footer notices
      expect(workflow).toContain('instructional only');
      expect(workflow).toContain('does not authorize, override, or bypass');
      expect(workflow).toContain(
        'Proof requirements and rule floors remain authoritative',
      );
    });

    it('Screen 6 does not contain interactive elements', () => {
      const workflowPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'GuidedProofWorkflow.ts',
      );
      const workflow = fs.readFileSync(workflowPath, 'utf8');

      // Should NOT have buttons, forms, or inputs
      expect(workflow).not.toMatch(/<button/i);
      expect(workflow).not.toMatch(/<form/i);
      expect(workflow).not.toMatch(/<input/i);
      expect(workflow).not.toMatch(/<select/i);
      expect(workflow).not.toMatch(/onclick/i);
    });
  });

  describe('WRD-0098: Evidence-Framed Wording', () => {
    it('Screen 4 uses evidence-framed wording', () => {
      const proofPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'BlueprintProofReview.ts',
      );
      const proof = fs.readFileSync(proofPath, 'utf8');

      // Should use "records show" language
      expect(proof).toContain('Records show');

      // Should NOT use certification language
      expect(proof).not.toMatch(/certifies/i);
      expect(proof).not.toMatch(/guarantees/i);
    });

    it('Screen 5 uses evidence-framed wording', () => {
      const fpPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'FalsePositiveReview.ts',
      );
      const fp = fs.readFileSync(fpPath, 'utf8');

      // Should use "records show" language
      expect(fp).toContain('Records show');

      // Should NOT use certification language
      expect(fp).not.toMatch(/certifies/i);
      expect(fp).not.toMatch(/guarantees/i);
    });

    it('Screen 6 uses evidence-framed wording', () => {
      const workflowPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'GuidedProofWorkflow.ts',
      );
      const workflow = fs.readFileSync(workflowPath, 'utf8');

      // Should use "records show" language (in HTML template)
      expect(workflow).toContain('Records will show');
    });
  });

  describe('WRD-0100/0101: No Interactive Mutation', () => {
    it('Screen 4 has no interactive elements', () => {
      const proofPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'BlueprintProofReview.ts',
      );
      const proof = fs.readFileSync(proofPath, 'utf8');

      // Should NOT have buttons, forms, or inputs
      expect(proof).not.toMatch(/<button/i);
      expect(proof).not.toMatch(/<form/i);
      expect(proof).not.toMatch(/<input/i);
      expect(proof).not.toMatch(/onclick/i);
    });

    it('Screen 5 has no interactive elements', () => {
      const fpPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'FalsePositiveReview.ts',
      );
      const fp = fs.readFileSync(fpPath, 'utf8');
      const htmlContent = fp.match(/return `[\s\S]*?`;/g)?.join('') ?? '';

      // Should NOT have buttons, forms, or inputs
      expect(htmlContent).not.toMatch(/<button/i);
      expect(htmlContent).not.toMatch(/<form/i);
      expect(htmlContent).not.toMatch(/<input/i);
      expect(htmlContent).not.toMatch(/onclick/i);

      // Should NOT have dismiss/re-evaluate actions in HTML
      // Note: "does not dismiss" is acceptable (advisory disclaimer)
      expect(htmlContent).not.toMatch(/<button[^>]*dismiss/i);
      expect(htmlContent).not.toMatch(/<a[^>]*dismiss/i);
      expect(htmlContent).not.toMatch(/onclick[^>]*dismiss/i);
      expect(htmlContent).not.toMatch(/action[^>]*dismiss/i);
    });
  });

  describe('WRD-0103: Security Baseline', () => {
    it('Screen 4 imports CSP and sanitization', () => {
      const proofPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'BlueprintProofReview.ts',
      );
      const proof = fs.readFileSync(proofPath, 'utf8');

      expect(proof).toMatch(/import.*csp/i);
      expect(proof).toMatch(/import.*sanitize/i);
      expect(proof).toContain('buildCSPWithNonce');
      expect(proof).toContain('escapeHtml');
    });

    it('Screen 5 imports CSP and sanitization', () => {
      const fpPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'FalsePositiveReview.ts',
      );
      const fp = fs.readFileSync(fpPath, 'utf8');

      expect(fp).toMatch(/import.*csp/i);
      expect(fp).toMatch(/import.*sanitize/i);
      expect(fp).toContain('buildCSPWithNonce');
      expect(fp).toContain('escapeHtml');
    });

    it('Screen 6 imports CSP and sanitization', () => {
      const workflowPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'GuidedProofWorkflow.ts',
      );
      const workflow = fs.readFileSync(workflowPath, 'utf8');

      expect(workflow).toMatch(/import.*csp/i);
      expect(workflow).toMatch(/import.*sanitize/i);
      expect(workflow).toContain('buildCSPWithNonce');
      expect(workflow).toContain('escapeHtml');
    });

    it('All screens use nonce-based CSP', () => {
      const screens = [
        'BlueprintProofReview.ts',
        'FalsePositiveReview.ts',
        'GuidedProofWorkflow.ts',
      ];

      for (const screen of screens) {
        const screenPath = path.join(
          projectRoot,
          'src',
          'ui',
          'webview',
          screen,
        );
        const content = fs.readFileSync(screenPath, 'utf8');

        expect(content).toContain('generateNonce');
        expect(content).toContain('buildCSPWithNonce');
      }
    });
  });

  describe('Phase 7.6: Proof State Distinction', () => {
    it('Screen 4 renders all 8 proof states', () => {
      const proofPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'BlueprintProofReview.ts',
      );
      const proof = fs.readFileSync(proofPath, 'utf8');

      // All 8 Phase 7.6 proof states should be represented
      const proofStates = [
        'VALID',
        'MISSING_DIRECTIVE',
        'INVALID_DIRECTIVE',
        'MISSING_ARTIFACT',
        'MISMATCHED_BLUEPRINT_ID',
        'MALFORMED_ARTIFACT',
        'INCOMPLETE_ARTIFACT',
        'UNAUTHORIZED_MODE',
      ];

      for (const state of proofStates) {
        expect(proof).toContain(state);
      }
    });

    it('Screen 4 has distinct status styles', () => {
      const proofPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'BlueprintProofReview.ts',
      );
      const proof = fs.readFileSync(proofPath, 'utf8');

      // Should have statusStyles mapping
      expect(proof).toContain('statusStyles');
    });
  });

  describe('Phase 7.9: Advisory Boundary', () => {
    it('Screen 5 preserves advisory-only boundary', () => {
      const fpPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'FalsePositiveReview.ts',
      );
      const fp = fs.readFileSync(fpPath, 'utf8');

      // Should have advisory-only notices
      expect(fp).toContain('advisory only');
      expect(fp).toContain('does not dismiss candidates');
      expect(fp).toContain('rewrite audit history');
      expect(fp).toContain('demote recorded decisions');
      expect(fp).toContain('enforcement floor');
    });

    it('Screen 5 preserves quality scoring', () => {
      const fpPath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'FalsePositiveReview.ts',
      );
      const fp = fs.readFileSync(fpPath, 'utf8');

      // Should have quality scoring functions
      expect(fp).toContain('calculateQualityScore');
      expect(fp).toContain('getQualityLabel');

      // Should have Phase 7.9 scoring values
      expect(fp).toContain('30'); // WARN
      expect(fp).toContain('10'); // REQUIRE_PLAN
      expect(fp).toContain('20'); // RULE/FALLBACK
    });
  });

  describe('Command Registration (OBS-S-7051)', () => {
    it('UI module registers all 001c commands', () => {
      const indexPath = path.join(projectRoot, 'src', 'ui', 'index.ts');
      const index = fs.readFileSync(indexPath, 'utf8');

      // Should register all 001c commands
      expect(index).toContain('arc.ui.blueprintProof');
      expect(index).toContain('arc.ui.falsePositiveReview');
      expect(index).toContain('arc.ui.guidedWorkflow');
    });

    it('ReviewHome whitelist includes 001c commands', () => {
      const reviewHomePath = path.join(
        projectRoot,
        'src',
        'ui',
        'webview',
        'ReviewHome.ts',
      );
      const reviewHome = fs.readFileSync(reviewHomePath, 'utf8');

      // Should whitelist all 001c commands
      expect(reviewHome).toContain('arc.ui.blueprintProof');
      expect(reviewHome).toContain('arc.ui.falsePositiveReview');
      expect(reviewHome).toContain('arc.ui.guidedWorkflow');
    });
  });
});
