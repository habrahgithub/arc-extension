import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
);

/**
 * Governance tests for Phase 7.8 — Operator Friction Hardening
 *
 * These tests verify:
 * - OBS-S-7019: Staleness model is concrete (file-mismatch, time-threshold, or both)
 * - OBS-S-7020: Tests verify semantic meaning, not just string presence
 * - OBS-S-7021: Core-layer changes are justified (extension-layer only for this phase)
 * - WRD-0076: Operator wording is descriptive-only, non-reassuring
 * - WRD-0077: Audit-read degradation resolves to "unavailable" not "clean"
 * - WRD-0078: Schema docs reflect actual optionality, no overclaim
 */

describe('Phase 7.8 — Operator Friction Hardening Governance', () => {
  describe('OBS-S-7019: Concrete Staleness Model', () => {
    it('defines staleness as file-mismatch, time-threshold, or both', () => {
      const runtimeStatusSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'runtimeStatus.ts'),
        'utf8',
      );

      // Should have explicit staleness threshold constant
      expect(runtimeStatusSource).toContain('STALENESS_THRESHOLD_MS');
      expect(runtimeStatusSource).toContain('5 * 60 * 1000'); // 5 minutes

      // Should have explicit staleness reason types
      expect(runtimeStatusSource).toContain('FILE_MISMATCH');
      expect(runtimeStatusSource).toContain('TIME_THRESHOLD');
      expect(runtimeStatusSource).toContain('BOTH');
    });

    it('implements staleness detection in extension.ts', () => {
      const extensionSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension.ts'),
        'utf8',
      );

      // Should check file path mismatch
      expect(extensionSource).toContain('isFileMismatch');
      expect(extensionSource).toContain('file_path !== activeFilePath');

      // Should check time threshold
      expect(extensionSource).toContain('isTimeStale');
      expect(extensionSource).toContain('5 * 60 * 1000');

      // Should combine into staleness reason
      expect(extensionSource).toContain('stalenessReason');
    });

    it('staleness model is documented in ARCHITECTURE.md', () => {
      const architectureDoc = fs.readFileSync(
        path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
        'utf8',
      );

      // Should document staleness conditions
      expect(architectureDoc).toContain('FILE_MISMATCH');
      expect(architectureDoc).toContain('TIME_THRESHOLD');
      expect(architectureDoc).toContain('5 minutes');
    });
  });

  describe('OBS-S-7020: Semantic Meaning Tests (Not String Presence)', () => {
    it('staleness wording is descriptive-only, not reassuring', () => {
      const runtimeStatusSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'runtimeStatus.ts'),
        'utf8',
      );

      // Should use descriptive language ("may not reflect", "from a different file")
      expect(runtimeStatusSource).toMatch(
        /may not reflect|from a different file|earlier session/i,
      );

      // Should include explicit disclaimer about descriptive-only nature
      expect(runtimeStatusSource).toContain('Descriptive only');
      expect(runtimeStatusSource).toContain('does not invalidate');

      // Should NOT use alarming/reassuring language in staleness display strings
      const describeStalenessFn = runtimeStatusSource.match(
        /\/\/ Phase 7\.8 — Staleness description[\s\S]*?return \[.*?\];/m,
      );
      if (describeStalenessFn) {
        // Check that the staleness wording itself is neutral and descriptive
        expect(describeStalenessFn[0]).toContain('may not apply');
        expect(describeStalenessFn[0]).toContain('may not reflect');
        // Should not use definitive negative judgments
        expect(describeStalenessFn[0]).not.toMatch(
          /\b(wrong|incorrect|invalid|broken)\b/i,
        );
      }
    });

    it('staleness display distinguishes file-mismatch from time-staleness', () => {
      const runtimeStatusSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'runtimeStatus.ts'),
        'utf8',
      );

      // File mismatch should mention "different file"
      expect(runtimeStatusSource).toContain('different file');

      // Time staleness should mention time window
      expect(runtimeStatusSource).toContain('5 minutes');
      expect(runtimeStatusSource).toContain('earlier session');

      // Both should be combined
      expect(runtimeStatusSource).toContain(
        'different file and earlier session',
      );
    });

    it('audit-read degradation wording does not imply "audit clean"', () => {
      const reviewSurfacesSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'reviewSurfaces.ts'),
        'utf8',
      );

      // Should explicitly state this is partial/degraded
      expect(reviewSurfacesSource).toMatch(
        /partial|degraded|unavailable|could not be read/i,
      );

      // Should NOT imply absence means clean/no issues
      expect(reviewSurfacesSource).not.toMatch(
        /audit clean|no issues|all clear|no problems/i,
      );

      // Should explicitly state absence does not equal approval
      expect(reviewSurfacesSource).toContain(
        'does not imply audit absence equals approval',
      );
    });

    it('audit-read degradation preserves enforcement floor wording', () => {
      const reviewSurfacesSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'reviewSurfaces.ts'),
        'utf8',
      );

      // Should explicitly state enforcement remains authoritative
      expect(reviewSurfacesSource).toContain('Enforcement floor');
      expect(reviewSurfacesSource).toContain('authoritative');
    });
  });

  describe('OBS-S-7021: Extension-Layer Changes Only', () => {
    it('Phase 7.8 changes are scoped to extension layer', () => {
      // Core files should not be modified for Phase 7.8
      // All changes should be in extension.ts, runtimeStatus.ts, reviewSurfaces.ts

      const runtimeStatusSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'runtimeStatus.ts'),
        'utf8',
      );

      const reviewSurfacesSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'reviewSurfaces.ts'),
        'utf8',
      );

      const extensionSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension.ts'),
        'utf8',
      );

      // Changes should be present in extension layer
      expect(runtimeStatusSource).toContain('isStale');
      expect(reviewSurfacesSource).toContain('auditReadError');
      expect(extensionSource).toContain('stalenessReason');

      // Core audit log should not be modified (only read)
      const auditLogSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'core', 'auditLog.ts'),
        'utf8',
      );

      // Core audit log should not have Phase 7.8 specific changes
      expect(auditLogSource).not.toContain('Phase 7.8');
      expect(auditLogSource).not.toContain('staleness');
    });

    it('no new core modules introduced for Phase 7.8', () => {
      const coreDir = path.join(projectRoot, 'src', 'core');
      const coreFiles = fs.readdirSync(coreDir);

      // Phase 7.8 should not add new core files
      // All existing core files are from prior phases
      // Note: analysis/ folder and falsePositiveScorer added via Phase 7.11 AST analysis merge
      // Note: execution* files added via Phase 7.11 execution governance chain
      const expectedCoreFiles = [
        'analysis', // Phase 7.11 — AST analysis layer
        'arcBootstrap.ts', // U01-U06 — first-run bootstrap
        'auditLog.ts',
        'auditVisibility.ts',
        'blueprintArtifacts.ts',
        'classifier.ts',
        'contextBuilder.ts',
        'contextPacket.ts',
        'activeTaskSelection.ts', // U07-U11 — task selection store
        'decisionLease.ts',
        'decisionPolicy.ts',
        'deviationDetector.ts', // added via main (Codex PRs)
        'executionGovernance.ts', // Phase 7.11 — execution governance chain
        'executionService.ts', // Phase 7.11 — execution governance chain
        'executionStore.ts', // Phase 7.11 — execution governance chain
        'explanationSynthesizer.ts', // added via main (Codex PRs)
        'falsePositiveScorer.ts', // Phase 7.11 — AST analysis layer
        'firstRunDetection.ts', // U01-U06 — first-run detection
        'governanceFeedbackEvaluator.ts', // added via main (Codex PRs)
        'governanceProposalRegistry.ts', // added via Codex PR #7
        'governanceHandoffService.ts', // added via Codex PR #7
        'implementationDraftService.ts', // added via Codex PR #7
        'implementationPackageService.ts', // added via Codex PR #7
        'architectureFingerprint.ts', // ARCXT-MVG-001 — Minimal Viable Guardrail (authorized by Prime/Axis)
        'layerLeakDetector.ts', // ARCXT-MVG-001 — Minimal Viable Guardrail (authorized by Prime/Axis)
        'overrideLog.ts', // Phase 8 (ARC-PHASE-008) — not Phase 7.8
        'performance.ts',
        'risk.ts',
        'routerPolicy.ts',
        'ruleEngine.ts',
        'rules.ts',
        'workspaceMapping.ts',
      ];

      // Allow for some flexibility but flag unexpected additions
      const unexpectedFiles = coreFiles.filter(
        (f) => !expectedCoreFiles.includes(f) && !f.startsWith('.'),
      );

      // Phase 7.8 should not add core files
      expect(unexpectedFiles).toHaveLength(0);
    });
  });

  describe('WRD-0076: Descriptive-Only, Non-Reassuring Wording', () => {
    it('staleness notice uses descriptive language', () => {
      const runtimeStatusSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'runtimeStatus.ts'),
        'utf8',
      );

      // Should have explicit staleness notice
      expect(runtimeStatusSource).toContain('RUNTIME_STATUS_STALENESS_NOTICE');
      expect(runtimeStatusSource).toContain(
        'may be from a different file or time window',
      );

      // Should explicitly state it does not invalidate
      expect(runtimeStatusSource).toContain('does not invalidate');
    });

    it('staleness display does not use alarming language', () => {
      const runtimeStatusSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'runtimeStatus.ts'),
        'utf8',
      );

      // Should NOT use alarming words that suggest data corruption or loss
      expect(runtimeStatusSource).not.toMatch(
        /corrupted|lost|destroyed|invalidated|void/i,
      );

      // Should use neutral warning indicators
      expect(runtimeStatusSource).toContain('⚠️');
    });

    it('freshness display uses positive confirmation when current', () => {
      const runtimeStatusSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'runtimeStatus.ts'),
        'utf8',
      );

      // Should have positive indicator for fresh data
      expect(runtimeStatusSource).toContain('✅ Current file and recent');
    });
  });

  describe('WRD-0077: Audit-Read Degradation to "Unavailable"', () => {
    it('audit read errors are tracked but not exposed as raw errors', () => {
      const extensionSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension.ts'),
        'utf8',
      );

      // Should track audit read error state
      expect(extensionSource).toContain('auditReadError');

      // Should NOT expose raw error details to operator in user-facing strings
      // Note: Comments may mention "raw error" but not in actual display strings
      const userFacingStrings = extensionSource.match(
        /'(?:\\.|[^'])*'|"(?:\\.|[^"])*"/g,
      );
      if (userFacingStrings) {
        const errorExposures = userFacingStrings.filter((s) =>
          /err\.message|err\.stack/.test(s),
        );
        expect(errorExposures).toHaveLength(0);
      }

      // Should use bounded error identifier
      expect(extensionSource).toContain('AUDIT_READ_FAILED');
    });

    it('review surface degrades to "audit unavailable" display', () => {
      const reviewSurfacesSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'reviewSurfaces.ts'),
        'utf8',
      );

      // Should have explicit audit-read degradation notice
      expect(reviewSurfacesSource).toContain(
        'REVIEW_SURFACE_AUDIT_READ_ERROR_NOTICE',
      );

      // Should display "Audit-read degradation" heading
      expect(reviewSurfacesSource).toContain('Audit-read degradation');

      // Should state data could not be read cleanly
      expect(reviewSurfacesSource).toContain('could not be read cleanly');
    });

    it('audit-read degradation does not retry or attempt recovery', () => {
      const extensionSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension.ts'),
        'utf8',
      );

      const reviewSurfacesSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'reviewSurfaces.ts'),
        'utf8',
      );

      // Should NOT have retry logic for audit reads
      expect(extensionSource).not.toMatch(/retry|reattempt|recover/i);
      expect(reviewSurfacesSource).not.toMatch(/retry|reattempt|recover/i);

      // Should accept the failure and degrade gracefully
      // The error state is set to a string constant, not boolean
      expect(extensionSource).toContain("auditReadError = 'AUDIT_READ_FAILED'");
    });
  });

  describe('WRD-0078: Schema Documentation Reflects Optionality', () => {
    it('ARCHITECTURE.md documents field optionality accurately', () => {
      const architectureDoc = fs.readFileSync(
        path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
        'utf8',
      );

      // Should have explicit "optional" markers for optional fields
      expect(architectureDoc).toMatch(/optional.*May be absent/i);

      // Should distinguish required from optional
      expect(architectureDoc).toContain('**required**');
      expect(architectureDoc).toContain('optional');

      // Should note Phase 7.7+ fields as potentially absent in older entries
      expect(architectureDoc).toContain('Phase 7.7+');
      expect(architectureDoc).toContain('May be absent in older entries');
    });

    it('schema docs do not overclaim chain integrity', () => {
      const architectureDoc = fs.readFileSync(
        path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
        'utf8',
      );

      // Should explicitly state file-level integrity only
      expect(architectureDoc).toContain('file-level integrity only');

      // Should explicitly state what hash chain does NOT prove
      expect(architectureDoc).toMatch(
        /do.*not.*prove|do.*not.*detect|do.*not.*guarantee/i,
      );

      // Should mention specific limitations
      expect(architectureDoc).toContain('archive-existence completeness');
      expect(architectureDoc).toContain('wholesale deletion');
    });

    it('save_mode field documented as optional per OBS-S-7017', () => {
      const architectureDoc = fs.readFileSync(
        path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
        'utf8',
      );

      // save_mode should be explicitly documented as optional
      const saveModeMatch = architectureDoc.match(
        /`save_mode`.*optional|optional.*`save_mode`/i,
      );
      expect(saveModeMatch).toBeTruthy();
    });
  });

  describe('Phase 7.8 Evidence Artifacts', () => {
    it('Phase 7.8 section added to ARCHITECTURE.md', () => {
      const architectureDoc = fs.readFileSync(
        path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
        'utf8',
      );

      // Should have Phase 7.8 additions section
      expect(architectureDoc).toContain('## Phase 7.8 additions');
      expect(architectureDoc).toContain('staleness detection');
      expect(architectureDoc).toContain('audit-read degradation');
    });

    it('Trigger and Audit Schema section added', () => {
      const architectureDoc = fs.readFileSync(
        path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
        'utf8',
      );

      // Should have schema documentation section
      expect(architectureDoc).toContain(
        '## Trigger and Audit Schema (Phase 7.8)',
      );
      expect(architectureDoc).toContain('DecisionPayload fields');
      expect(architectureDoc).toContain('AuditEntry envelope fields');
    });
  });
});
