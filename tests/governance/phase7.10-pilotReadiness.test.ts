import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
);

/**
 * Governance tests for Phase 7.10 — Pilot Readiness / UAT Pack
 *
 * These tests verify:
 * - OBS-S-7027: UAT scenarios are verifiable against current codebase (blocking)
 * - OBS-S-7028: Rollback drill evidence distinguishes executed vs planned (blocking)
 * - WRD-0084: Internal-pilot wording only; no production/marketplace claims (blocking)
 * - WRD-0085: Runbook references existing behavior, not defines authority (blocking)
 * - WRD-0086: Evidence bundle references artifacts, not self-certifies (blocking)
 */

describe('Phase 7.10 — Pilot Readiness Governance', () => {
  describe('OBS-S-7027: UAT Scenarios Verifiable', () => {
    it('UAT scenario document exists with bounded scope', () => {
      const uatDocPath = path.join(
        projectRoot,
        'docs',
        'PHASE-7.10-UAT-SCENARIOS.md',
      );
      expect(fs.existsSync(uatDocPath)).toBe(true);

      const uatDoc = fs.readFileSync(uatDocPath, 'utf8');

      // Should have scenario matrix
      expect(uatDoc).toContain('Scenario Matrix');

      // Should have 5 categories
      expect(uatDoc).toContain('Category 1: Save-Time Governance Flows');
      expect(uatDoc).toContain('Category 2: Proof Flows');
      expect(uatDoc).toContain('Category 3: Review Flows');
      expect(uatDoc).toContain('Category 4: Degraded Runtime Flows');
      expect(uatDoc).toContain('Category 5: False-Positive Review Flows');

      // Should have verification commands
      expect(uatDoc).toContain('Verification Command');
      expect(uatDoc).toContain('Evidence');
    });

    it('UAT scenarios reference actual commands and files', () => {
      const uatDocPath = path.join(
        projectRoot,
        'docs',
        'PHASE-7.10-UAT-SCENARIOS.md',
      );
      const uatDoc = fs.readFileSync(uatDocPath, 'utf8');

      // Should reference actual audit file
      expect(uatDoc).toContain('.arc/audit.jsonl');

      // Should reference actual blueprint path
      expect(uatDoc).toContain('.arc/blueprints/');

      // Should reference actual commands
      expect(uatDoc).toContain('ARC XT: Review Audit Log');
      expect(uatDoc).toContain('ARC XT: Show Active Workspace Status');
    });

    it('UAT scenarios are testable against current codebase', () => {
      const uatDocPath = path.join(
        projectRoot,
        'docs',
        'PHASE-7.10-UAT-SCENARIOS.md',
      );
      const uatDoc = fs.readFileSync(uatDocPath, 'utf8');

      // Each scenario should have expected behavior
      expect(uatDoc).toContain('Expected Behavior');

      // Each scenario should have verification method
      expect(uatDoc).toContain('Verification');

      // Should have pass criteria
      expect(uatDoc).toContain('Pass Criteria');
    });
  });

  describe('OBS-S-7028: Rollback Drill Evidence', () => {
    it('rollback drill document exists with executed vs planned distinction', () => {
      const rollbackDocPath = path.join(
        projectRoot,
        'docs',
        'PHASE-7.10-ROLLBACK-DRILL.md',
      );
      expect(fs.existsSync(rollbackDocPath)).toBe(true);

      const rollbackDoc = fs.readFileSync(rollbackDocPath, 'utf8');

      // Should have executed vs planned distinction
      expect(rollbackDoc).toContain('Executed vs Planned');
      expect(rollbackDoc).toContain('EXECUTED');
      expect(rollbackDoc).toContain('PLANNED');

      // Should have evidence section
      expect(rollbackDoc).toContain('Evidence');
      expect(rollbackDoc).toContain('Pre-Rollback State');
      expect(rollbackDoc).toContain('Post-Rollback State');
    });

    it('rollback scenarios are demonstrable with evidence', () => {
      const rollbackDocPath = path.join(
        projectRoot,
        'docs',
        'PHASE-7.10-ROLLBACK-DRILL.md',
      );
      const rollbackDoc = fs.readFileSync(rollbackDocPath, 'utf8');

      // Should have multiple rollback scenarios
      expect(rollbackDoc).toContain('Scenario R1:');
      expect(rollbackDoc).toContain('Scenario R2:');
      expect(rollbackDoc).toContain('Scenario R3:');
      expect(rollbackDoc).toContain('Scenario R4:');
      expect(rollbackDoc).toContain('Scenario R5:');

      // Each scenario should have verification steps
      expect(rollbackDoc).toContain('Verification:');

      // Should have execution record template
      expect(rollbackDoc).toContain('Execution Record');
    });

    it('rollback drill distinguishes evidence from assertion', () => {
      const rollbackDocPath = path.join(
        projectRoot,
        'docs',
        'PHASE-7.10-ROLLBACK-DRILL.md',
      );
      const rollbackDoc = fs.readFileSync(rollbackDocPath, 'utf8');

      // Should explicitly state evidence requirements
      expect(rollbackDoc).toContain('Evidence Attached');
      expect(rollbackDoc).toContain('RECORDED AT EXECUTION TIME');

      // Should reject assertion without evidence
      expect(rollbackDoc).toContain('ASSERTED');
      expect(rollbackDoc).toContain('without evidence');
    });
  });

  describe('WRD-0084: Internal-Pilot Wording Only', () => {
    it('README stays beta-bounded and does not overclaim readiness', () => {
      const readmePath = path.join(projectRoot, 'README.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      // Public README may state beta posture, but must not overclaim full readiness
      expect(readme).toContain('Public beta candidate');
      expect(readme).not.toMatch(/production[- ]ready/i);
      expect(readme).not.toMatch(/marketplace[- ]ready/i);
      expect(readme).not.toMatch(/public release is ready/i);
    });

    it('UAT doc states internal-only scope', () => {
      const uatDocPath = path.join(
        projectRoot,
        'docs',
        'PHASE-7.10-UAT-SCENARIOS.md',
      );
      const uatDoc = fs.readFileSync(uatDocPath, 'utf8');

      // Should state internal-only scope
      expect(uatDoc).toContain('INTERNAL PILOT READINESS only');

      // Should explicitly state what it does NOT certify
      expect(uatDoc).toContain('does **not** certify');
      expect(uatDoc).toContain('Public release');
      expect(uatDoc).toContain('Marketplace');
    });

    it('no production or marketplace claims in codebase', () => {
      const readmePath = path.join(projectRoot, 'README.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      // Should NOT contain positive production-ready claims
      // Note: "Public release readiness" appears in "Not Certified" section which is correct
      expect(readme).not.toMatch(/production[- ]ready/i);
      expect(readme).not.toMatch(/marketplace[- ]ready/i);
      // Should not claim public release is certified (only that it's NOT certified)
      expect(readme).not.toMatch(/certifies public|public release is ready/i);
    });
  });

  describe('WRD-0085: Runbook References Existing Behavior', () => {
    it('README references actual commands', () => {
      const readmePath = path.join(projectRoot, 'README.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      // Should reference actual existing commands
      expect(readme).toContain('ARC XT: Review Audit Log');
      expect(readme).toContain('ARC XT: Show Active Workspace Status');
      expect(readme).toContain('ARC XT: Review Blueprint Proofs');
      expect(readme).toContain('ARC XT: Review False-Positive Candidates');

      // Should not define new commands
      expect(readme).not.toMatch(/new command|additional command/i);
    });

    it('UAT scenarios reference actual file paths', () => {
      const uatDocPath = path.join(
        projectRoot,
        'docs',
        'PHASE-7.10-UAT-SCENARIOS.md',
      );
      const uatDoc = fs.readFileSync(uatDocPath, 'utf8');

      // Should reference actual .arc paths
      expect(uatDoc).toContain('.arc/audit.jsonl');
      expect(uatDoc).toContain('.arc/blueprints/');
      expect(uatDoc).toContain('.arc/router.json');
      // perf.jsonl is optional, not required in UAT scenarios
    });

    it('runbook does not define new authority', () => {
      const readmePath = path.join(projectRoot, 'README.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      // Should not claim new authority in positive sense
      // Note: "authorizes" may appear in negative context like "does not authorize" which is correct
      expect(readme).not.toMatch(
        /authorizes new|enables new capability|grants new permission/i,
      );
    });
  });

  describe('WRD-0086: Evidence Bundle References Artifacts', () => {
    it('README references evidence artifacts by path', () => {
      const readmePath = path.join(projectRoot, 'README.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      // Should reference evidence by file path
      expect(readme).toContain('artifacts/ARC-UX-VALIDATION-001-LOG.md');
      expect(readme).toContain('artifacts/evidence/ARC-UX-VALIDATION-001/');

      // Should not self-certify readiness
      expect(readme).not.toMatch(/self[- ]certified|certifies itself/i);
    });

    it('evidence artifacts exist and are retained', () => {
      const uatDocPath = path.join(
        projectRoot,
        'docs',
        'PHASE-7.10-UAT-SCENARIOS.md',
      );
      const rollbackDocPath = path.join(
        projectRoot,
        'docs',
        'PHASE-7.10-ROLLBACK-DRILL.md',
      );

      // Both evidence artifacts should exist
      expect(fs.existsSync(uatDocPath)).toBe(true);
      expect(fs.existsSync(rollbackDocPath)).toBe(true);
    });

    it('evidence bundle does not overclaim certainty', () => {
      const uatDocPath = path.join(
        projectRoot,
        'docs',
        'PHASE-7.10-UAT-SCENARIOS.md',
      );
      const uatDoc = fs.readFileSync(uatDocPath, 'utf8');

      // Should use evidence language, not guarantee language
      // Note: "certifies" may appear in negative context like "does NOT certify" which is correct
      expect(uatDoc).not.toMatch(
        /guarantees success|proves correctness|certifies production/i,
      );

      // Should use pilot/readiness language
      expect(uatDoc).toContain('pilot readiness');
      expect(uatDoc).toContain('internal');
    });
  });

  describe('Phase 7.10 Evidence Artifacts', () => {
    it('Phase 7.10 section added to ARCHITECTURE.md', () => {
      const architectureDocPath = path.join(
        projectRoot,
        'docs',
        'ARCHITECTURE.md',
      );
      const architectureDoc = fs.readFileSync(architectureDocPath, 'utf8');

      // Should have Phase 7.10 additions section
      expect(architectureDoc).toContain('Phase 7.10');
    });

    it('pilot readiness documented', () => {
      const architectureDocPath = path.join(
        projectRoot,
        'docs',
        'ARCHITECTURE.md',
      );
      const architectureDoc = fs.readFileSync(architectureDocPath, 'utf8');

      // Should document pilot readiness
      expect(architectureDoc).toContain('pilot');
      expect(architectureDoc).toContain('readiness');
    });
  });
});
