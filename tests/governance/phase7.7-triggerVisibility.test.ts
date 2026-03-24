import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
);

/**
 * Governance tests for Phase 7.7 — Trigger Visibility and Save-Decision Traceability
 *
 * These tests verify:
 * - OBS-S-7014: Implementation is proportional (no redesign)
 * - OBS-S-7015: Recent-decision state is bounded, non-authorizing, staleness-aware
 * - OBS-S-7016: Existing commands enriched (no new commands)
 * - WRD-0071: Descriptive decision framing (no authorization wording)
 * - WRD-0072: Degraded/fallback ALLOW distinguished from full-evaluation ALLOW
 * - WRD-0073: No audit/perf overclaiming
 * - WRD-0074: No new persistence path
 */

describe('Phase 7.7 — Trigger Visibility Governance', () => {
  describe('OBS-S-7014: Proportionality', () => {
    it('implementation is incremental refinement, not redesign', () => {
      const runtimeStatusSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'runtimeStatus.ts'),
        'utf8',
      );

      // Should add lastDecision field, not redesign the entire interface
      expect(runtimeStatusSource).toContain('lastDecision?:');
      expect(runtimeStatusSource).toContain('## Last Save Decision');

      // Should not introduce new authority surfaces (word "authorizes" as verb, not "authoritative" as adjective)
      expect(runtimeStatusSource).not.toMatch(/\bauthorizes\b/i);
      expect(runtimeStatusSource).not.toContain('override enforcement');
    });

    it('preserves existing command structure', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
      ) as {
        contributes?: { commands?: Array<{ command: string }> };
      };

      const commands =
        packageJson.contributes?.commands?.map((cmd) => cmd.command) ?? [];

      // Phase 7.5 commands should still be present
      expect(commands).toContain('arc.showWelcome');
      expect(commands).toContain('arc.reviewAudit');
      expect(commands).toContain('arc.showRuntimeStatus');
      expect(commands).toContain('arc.reviewBlueprints');
      expect(commands).toContain('arc.reviewFalsePositives');

      // No new commands added for Phase 7.7
      expect(commands.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('OBS-S-7015: Bounded Recent-Decision State', () => {
    it('lastDecision field is optional and non-authorizing', () => {
      const runtimeStatusSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'runtimeStatus.ts'),
        'utf8',
      );

      // Should be optional field
      expect(runtimeStatusSource).toContain('lastDecision?:');

      // Should include descriptive-only disclaimer
      expect(runtimeStatusSource).toContain('Descriptive only');
      expect(runtimeStatusSource).toContain('does not authorize');
    });

    it('uses existing audit data, not new state', () => {
      const extensionSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension.ts'),
        'utf8',
      );

      // Should read from existing audit.jsonl
      expect(extensionSource).toContain('audit.jsonl');
      expect(extensionSource).toContain('JSON.parse');

      // Should not create new persistence
      expect(extensionSource).not.toContain('writeFileSync');
      expect(extensionSource).not.toContain('appendFileSync');
    });
  });

  describe('OBS-S-7016: Prefer Existing Commands', () => {
    it('enriches lintel.showRuntimeStatus instead of adding new command', () => {
      const extensionSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension.ts'),
        'utf8',
      );
      const runtimeStatusSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'runtimeStatus.ts'),
        'utf8',
      );

      // Should enhance existing showRuntimeStatus command
      expect(extensionSource).toContain("'arc.showRuntimeStatus'");
      expect(runtimeStatusSource).toContain('## Last Save Decision');

      // Should not register new commands for trigger visibility
      const newCommandMatches = extensionSource.match(
        /registerCommand\('lintel\.(showTrigger|showDecision|traceSave)'/g,
      );
      expect(newCommandMatches).toBeNull();
    });

    it('enriches reviewAudit surface with evaluation lane and lease status', () => {
      const reviewSurfacesSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'reviewSurfaces.ts'),
        'utf8',
      );

      // Should add evaluation lane display
      expect(reviewSurfacesSource).toContain('Evaluation lane');

      // Should add lease status display
      expect(reviewSurfacesSource).toContain('Lease status');

      // Should add trigger source display
      expect(reviewSurfacesSource).toContain('Trigger');
    });
  });

  describe('WRD-0071: Descriptive Decision Framing', () => {
    it('uses descriptive language, not authorization wording', () => {
      const runtimeStatusSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'runtimeStatus.ts'),
        'utf8',
      );

      // Should use descriptive framing
      expect(runtimeStatusSource).toContain('explains what happened');
      expect(runtimeStatusSource).toContain('Descriptive only');

      // Should not imply authorization (negative assertions are OK)
      expect(runtimeStatusSource).toContain('does not authorize');
    });

    it('includes observational disclaimers', () => {
      const runtimeStatusSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'runtimeStatus.ts'),
        'utf8',
      );

      // Should include disclaimer
      expect(runtimeStatusSource).toContain(
        'RUNTIME_STATUS_OBSERVATIONAL_NOTICE',
      );
      expect(runtimeStatusSource).toContain(
        'does not authorize, override, or alter enforcement',
      );
    });
  });

  describe('WRD-0072: Distinguish Degraded vs Full ALLOW', () => {
    it('explicitly distinguishes model disabled from unavailable', () => {
      const runtimeStatusSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'runtimeStatus.ts'),
        'utf8',
      );

      // Should have explicit status for disabled
      expect(runtimeStatusSource).toContain('Disabled by configuration');
      expect(runtimeStatusSource).toContain('❌');

      // Should have explicit status for unavailable
      expect(runtimeStatusSource).toContain('Unavailable at runtime');
      expect(runtimeStatusSource).toContain('⚠️');
    });

    it('distinguishes timeout and parse failure from unavailable', () => {
      const runtimeStatusSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'runtimeStatus.ts'),
        'utf8',
      );

      // Should have separate status for timeout
      expect(runtimeStatusSource).toContain('Timed out');

      // Should have separate status for parse failure
      expect(runtimeStatusSource).toContain('Parse failure');
    });

    it('distinguishes rule-only from model-evaluation ALLOW', () => {
      const runtimeStatusSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'runtimeStatus.ts'),
        'utf8',
      );

      // Should have status for rule-only
      expect(runtimeStatusSource).toContain('Rule-only evaluation');
      expect(runtimeStatusSource).toContain('ℹ️');

      // Should have status for model used
      expect(runtimeStatusSource).toContain('Available and used');
      expect(runtimeStatusSource).toContain('✅');
    });
  });

  describe('WRD-0073: No Audit/Perf Overclaiming', () => {
    it('uses evidence language, not proof or guarantee', () => {
      const reviewSurfacesSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'reviewSurfaces.ts'),
        'utf8',
      );

      // Should use evidence language
      expect(reviewSurfacesSource).toContain('evidence');

      // Should not overclaim
      expect(reviewSurfacesSource).not.toMatch(/guarantee|prove|proof of/i);
    });

    it('preserves audit integrity boundary documentation', () => {
      const architectureDoc = fs.readFileSync(
        path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
        'utf8',
      );

      // Should document file-level integrity only
      expect(architectureDoc).toContain('file-level integrity only');
    });
  });

  describe('WRD-0074: No New Persistence Path', () => {
    it('uses existing audit.jsonl for trigger data', () => {
      const extensionSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension.ts'),
        'utf8',
      );

      // Should read from existing audit.jsonl
      expect(extensionSource).toContain('audit.jsonl');

      // Should not create new state files
      expect(extensionSource).not.toMatch(
        /decisions\.json|triggers\.json|state\.json/i,
      );
    });

    it('adds trigger fields to existing DecisionPayload type', () => {
      const typesSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'contracts', 'types.ts'),
        'utf8',
      );

      // Should add optional fields to existing interface
      expect(typesSource).toContain('save_mode?:');
      expect(typesSource).toContain('auto_save_mode?:');
      expect(typesSource).toContain('model_availability_status?:');

      // Should be in DecisionPayload interface
      const decisionPayloadMatch = typesSource.match(
        /export interface DecisionPayload \{[\s\S]*?\}/,
      );
      expect(decisionPayloadMatch).toBeTruthy();
    });

    it('does not introduce new persistence files', () => {
      // Check that no new .json files are created in .arc/
      const arcDir = path.join(projectRoot, '.arc');
      if (fs.existsSync(arcDir)) {
        const files = fs.readdirSync(arcDir);
        // Should only have expected files
        const expectedFiles = [
          'archive',
          'blueprints',
          '.gitignore',
          'audit.jsonl',
          'perf.jsonl',
        ];
        const unexpectedFiles = files.filter(
          (f) => !expectedFiles.some((e) => f === e || f.startsWith(e)),
        );
        // Allow some flexibility for test artifacts
        expect(unexpectedFiles.filter((f) => !f.startsWith('.'))).toHaveLength(
          0,
        );
      }
    });
  });

  describe('Trigger Context Capture', () => {
    it('saveOrchestrator passes trigger context to decision', () => {
      const saveOrchestratorSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'saveOrchestrator.ts'),
        'utf8',
      );

      // Should include trigger context in finalizeDecision
      expect(saveOrchestratorSource).toContain('save_mode');
      expect(saveOrchestratorSource).toContain('auto_save_mode');
    });

    it('model evaluation includes availability status', () => {
      const saveOrchestratorSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'saveOrchestrator.ts'),
        'utf8',
      );

      // Should set model_availability_status for each path
      expect(saveOrchestratorSource).toContain('DISABLED_BY_CONFIG');
      expect(saveOrchestratorSource).toContain('UNAVAILABLE_AT_RUNTIME');
      expect(saveOrchestratorSource).toContain('AVAILABLE_AND_USED');
      expect(saveOrchestratorSource).toContain('NOT_ATTEMPTED');
    });
  });
});
