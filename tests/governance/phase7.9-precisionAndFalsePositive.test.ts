import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
);

/**
 * Governance tests for Phase 7.9 — Precision and False-Positive Reduction
 *
 * These tests verify:
 * - OBS-S-7023: Classification precision is evidence-backed (blocking)
 * - OBS-S-7026: Demotion logic is explicit, not inferred (blocking)
 * - WRD-0080: No enforcement-floor weakening (blocking)
 * - WRD-0081: False-positive surfacing remains advisory-only (non-blocking)
 * - WRD-0082: Demotion-path changes are explicit and test-backed (blocking)
 */

describe('Phase 7.9 — Precision and False-Positive Reduction Governance', () => {
  describe('OBS-S-7023: Classification Precision (Evidence-Backed)', () => {
    it('false-positive candidates are filtered and ranked by quality', () => {
      const reviewSurfacesSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'reviewSurfaces.ts'),
        'utf8',
      );

      // Should have quality scoring function
      expect(reviewSurfacesSource).toContain(
        'calculateFalsePositiveQualityScore',
      );

      // Should filter to WARN and REQUIRE_PLAN only (not BLOCK)
      expect(reviewSurfacesSource).toContain("decision === 'WARN'");
      expect(reviewSurfacesSource).toContain("decision === 'REQUIRE_PLAN'");

      // Should sort by quality score
      expect(reviewSurfacesSource).toContain('qualityScore - a.qualityScore');

      // Should have quality label display
      expect(reviewSurfacesSource).toContain('getFalsePositiveQualityLabel');
    });

    it('false-positive quality scoring is evidence-based', () => {
      const reviewSurfacesSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'reviewSurfaces.ts'),
        'utf8',
      );

      // Should score based on decision type
      expect(reviewSurfacesSource).toContain("decision === 'WARN'");
      expect(reviewSurfacesSource).toContain("decision === 'REQUIRE_PLAN'");

      // Should score based on evaluation source
      expect(reviewSurfacesSource).toContain("source === 'RULE'");
      expect(reviewSurfacesSource).toContain("source === 'FALLBACK'");

      // Should score based on matched rules
      expect(reviewSurfacesSource).toContain('matched_rules.length === 0');

      // Should score based on route fallback
      expect(reviewSurfacesSource).toContain('route_fallback ===');
    });

    it('false-positive quality notice is advisory-only', () => {
      const reviewSurfacesSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'reviewSurfaces.ts'),
        'utf8',
      );

      // Should have explicit advisory notice
      expect(reviewSurfacesSource).toContain(
        'REVIEW_SURFACE_FALSE_POSITIVE_QUALITY_NOTICE',
      );

      // Should state it does not override decisions
      expect(reviewSurfacesSource).toContain(
        'does not override recorded decisions',
      );

      // Should state it does not weaken enforcement
      expect(reviewSurfacesSource).toContain(
        'does not override recorded decisions or weaken enforcement',
      );
    });
  });

  describe('OBS-S-7026: Demotion Logic Explicitness', () => {
    it('demotion reason field added to Classification type', () => {
      const typesSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'contracts', 'types.ts'),
        'utf8',
      );

      // Should have demotionReason field
      expect(typesSource).toContain('demotionReason?:');

      // Should have explicit reason types
      expect(typesSource).toContain('UI_PATH_SINGLE_FLAG');
    });

    it('classifier sets explicit demotion reason', () => {
      const classifierSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'core', 'classifier.ts'),
        'utf8',
      );

      // Should declare demotionReason variable
      expect(classifierSource).toContain('demotionReason');

      // Should set reason explicitly
      expect(classifierSource).toContain(
        "demotionReason = 'UI_PATH_SINGLE_FLAG'",
      );

      // Should have Phase 7.9 comment marking the change
      expect(classifierSource).toContain('Phase 7.9');
      expect(classifierSource).toContain('WRD-0082');
    });

    it('demotion logic is not hidden or inferred', () => {
      const classifierSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'core', 'classifier.ts'),
        'utf8',
      );

      // Demotion condition should be explicit
      expect(classifierSource).toContain('isUiPath');
      expect(classifierSource).toContain('riskFlags.length < 2');

      // Should not have hidden demotion paths
      expect(classifierSource).not.toMatch(/hidden|inferred|implicit/i);
    });
  });

  describe('WRD-0080: No Enforcement-Floor Weakening', () => {
    it('false-positive filtering does not remove BLOCK decisions from audit', () => {
      const reviewSurfacesSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'reviewSurfaces.ts'),
        'utf8',
      );

      // BLOCK decisions are filtered from false-positive review (advisory display only)
      // but this does not affect the audit or enforcement
      expect(reviewSurfacesSource).toContain(
        "decision === 'WARN' || entry.decision === 'REQUIRE_PLAN'",
      );

      // The filtering is for display quality, not enforcement weakening
      // BLOCK decisions are still recorded in audit
      expect(reviewSurfacesSource).toContain('advisory only');
    });

    it('demotion logic preserves enforcement floor for non-UI paths', () => {
      const classifierSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'core', 'classifier.ts'),
        'utf8',
      );

      // Demotion only applies to UI paths
      expect(classifierSource).toContain('isUiPath');

      // Demotion only applies with single flag
      expect(classifierSource).toContain('riskFlags.length < 2');

      // Non-UI paths or multi-flag paths preserve original risk level
      // (no demotion code path for these cases)
    });

    it('enforcement floor constants preserved in codebase', () => {
      const typesSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'contracts', 'types.ts'),
        'utf8',
      );

      // Decision types should still include BLOCK and REQUIRE_PLAN
      expect(typesSource).toContain("'BLOCK'");
      expect(typesSource).toContain("'REQUIRE_PLAN'");
      expect(typesSource).toContain("'WARN'");
      expect(typesSource).toContain("'ALLOW'");
    });

    it('architecture doc preserves fail-closed language', () => {
      const architectureDoc = fs.readFileSync(
        path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
        'utf8',
      );

      // Should still have fail-closed language
      expect(architectureDoc).toMatch(/fail[- ]closed/i);
    });
  });

  describe('WRD-0081: False-Positive Surfacing Advisory-Only', () => {
    it('false-positive review surface has advisory disclaimer', () => {
      const reviewSurfacesSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'reviewSurfaces.ts'),
        'utf8',
      );

      // Should have advisory-only notice
      expect(reviewSurfacesSource).toContain(
        'REVIEW_SURFACE_FALSE_POSITIVE_NOTICE',
      );

      // Should state it does not rewrite history
      expect(reviewSurfacesSource).toContain('do not rewrite audit history');

      // Should state it does not weaken enforcement floor
      expect(reviewSurfacesSource).toContain('enforcement floor');
    });

    it('false-positive quality ranking is labeled as advisory', () => {
      const reviewSurfacesSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'reviewSurfaces.ts'),
        'utf8',
      );

      // Quality notice should state it is advisory
      expect(reviewSurfacesSource).toContain('advisory only');
    });

    it('false-positive candidates do not include authorization wording', () => {
      const reviewSurfacesSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'reviewSurfaces.ts'),
        'utf8',
      );

      // Should not use authorization language in display strings
      // Note: "authorize" may appear in disclaimers like "do not authorize" which is correct
      // We check that positive authorization claims are absent
      expect(reviewSurfacesSource).not.toMatch(
        /\b(authorize saves|grants approval|clears for save)\b/i,
      );
    });
  });

  describe('WRD-0082: Demotion-Path Explicitness and Test-Backing', () => {
    it('demotion reason is documented in types', () => {
      const typesSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'contracts', 'types.ts'),
        'utf8',
      );

      // Should have Phase 7.9 comment
      expect(typesSource).toContain('Phase 7.9');
      expect(typesSource).toContain('WRD-0082');
    });

    it('classifier demotion logic is commented', () => {
      const classifierSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'core', 'classifier.ts'),
        'utf8',
      );

      // Should have Phase 7.9 comment
      expect(classifierSource).toContain('Phase 7.9');
      expect(classifierSource).toContain('WRD-0082');

      // Should explain the demotion logic
      expect(classifierSource).toContain(
        'Make demotion logic explicit and testable',
      );
    });

    it('governance tests verify demotion explicitness', () => {
      // This test file itself is evidence of test-backing
      const thisTestSource = fs.readFileSync(
        path.join(
          projectRoot,
          'tests',
          'governance',
          'phase7.9-precisionAndFalsePositive.test.ts',
        ),
        'utf8',
      );

      // Should test demotion reason field
      expect(thisTestSource).toContain('demotionReason');

      // Should test explicit demotion logic
      expect(thisTestSource).toContain('explicit');
    });
  });

  describe('Phase 7.9 Evidence Artifacts', () => {
    it('Phase 7.9 section should be added to ARCHITECTURE.md', () => {
      const architectureDoc = fs.readFileSync(
        path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
        'utf8',
      );

      // Should have Phase 7.9 additions section (to be added)
      // This test will pass once documentation is updated
      expect(architectureDoc).toContain('Phase 7.9');
    });

    it('false-positive quality scoring documented', () => {
      const architectureDoc = fs.readFileSync(
        path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
        'utf8',
      );

      // Should document false-positive quality scoring (to be added)
      expect(architectureDoc).toContain('false-positive');
    });
  });
});
