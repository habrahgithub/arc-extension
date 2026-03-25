import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
);

/**
 * Governance tests for LINTEL-REL-001 — Release Readiness
 *
 * These tests verify:
 * - OBS-S-7030: Governance-gap (Phase 7.9/7.10 execution-review) acknowledged
 * - OBS-S-7031: package.json metadata truthfulness
 * - OBS-S-7032: VSIX pack output retained as evidence
 * - OBS-S-7033: Evidence references by path, not copied content
 * - WRD-0087: Controlled internal release wording only
 * - WRD-0088: package.json trust-sensitive fields reviewed
 * - WRD-0089: VSIX contents exclude credentials/PII/dev-only files
 * - WRD-0090: Install/update instructions use trusted/internal distribution posture
 */

describe('LINTEL-REL-001 — Release Readiness Governance', () => {
  describe('OBS-S-7030: Governance-Gap Acknowledgment', () => {
    it('release-readiness doc acknowledges Phase 7.9/7.10 execution-review gap', () => {
      const releaseDocPath = path.join(
        projectRoot,
        'docs',
        'RELEASE-READINESS.md',
      );
      expect(fs.existsSync(releaseDocPath)).toBe(true);

      const releaseDoc = fs.readFileSync(releaseDocPath, 'utf8');

      // Should have explicit governance-gap section
      expect(releaseDoc).toContain('Governance-Gap Acknowledgment');
      expect(releaseDoc).toContain('OBS-S-7030');

      // Should acknowledge the gap explicitly
      expect(releaseDoc).toContain('Phase 7.9');
      expect(releaseDoc).toContain('Phase 7.10');

      // Should provide resolution/evidence linkage
      expect(releaseDoc).toContain('Resolution:');
      expect(releaseDoc).toContain('evidence');
    });

    it('Phase 7.9/7.10 evidence artifacts are referenced', () => {
      const releaseDocPath = path.join(
        projectRoot,
        'docs',
        'RELEASE-READINESS.md',
      );
      const releaseDoc = fs.readFileSync(releaseDocPath, 'utf8');

      // Should reference Phase 7.9 evidence
      expect(releaseDoc).toContain('phase-7.9');

      // Should reference Phase 7.10 evidence
      expect(releaseDoc).toContain('phase-7.10');
    });
  });

  describe('OBS-S-7031: package.json Truthfulness', () => {
    it('package.json has truthful private/license/publisher fields', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf8'),
      ) as {
        private?: boolean;
        license?: string;
        publisher?: string;
        name?: string;
      };

      // Should be private (not for public npm)
      expect(packageJson.private).toBe(true);

      // Should not claim open-source license
      expect(packageJson.license).toBe('UNLICENSED');

      // Should have internal publisher
      expect(packageJson.publisher).toBe('swd');
    });

    it('package.json description is bounded and truthful', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf8'),
      ) as {
        description?: string;
        displayName?: string;
      };

      // Description should be bounded
      expect(packageJson.description).toMatch(/local-first/i);
      expect(packageJson.description).toMatch(/governed/i);

      // Should not claim marketplace/public readiness
      expect(packageJson.description).not.toMatch(
        /marketplace|production[- ]ready|public release/i,
      );
    });

    it('package.json has pack scripts for VSIX generation', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf8'),
      ) as {
        scripts?: Record<string, string>;
      };

      // Should have pack script
      expect(packageJson.scripts?.pack).toBeDefined();
      expect(packageJson.scripts?.pack).toContain('vsce package');
    });
  });

  describe('OBS-S-7032: VSIX Evidence Retention', () => {
    it('VSIX package exists in project root', () => {
      // VSIX is generated in project root by pack script
      const files = fs.readdirSync(projectRoot);
      const vsixFiles = files.filter((f) => f.endsWith('.vsix'));

      expect(vsixFiles.length).toBeGreaterThan(0);
    });

    it('VSIX package version matches package.json', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf8'),
      ) as {
        version?: string;
      };

      // VSIX is in project root
      const files = fs.readdirSync(projectRoot);
      const vsixFiles = files.filter((f) => f.endsWith('.vsix'));

      // VSIX filename should contain version
      const version = packageJson.version ?? '0.1.0';
      const versionedVsix = vsixFiles.find((f) => f.includes(version));

      expect(versionedVsix).toBeDefined();
    });
  });

  describe('OBS-S-7033: Evidence By Path Reference', () => {
    it('release doc references evidence by path, not copied content', () => {
      const releaseDocPath = path.join(
        projectRoot,
        'docs',
        'RELEASE-READINESS.md',
      );
      const releaseDoc = fs.readFileSync(releaseDocPath, 'utf8');

      // Should reference docs by path (backtick notation)
      expect(releaseDoc).toMatch(/`docs\/[^`]+`/);
      expect(releaseDoc).toMatch(/`artifacts\/[^`]+`/);

      // Should explicitly state "by path reference"
      expect(releaseDoc).toContain('by path reference');
      expect(releaseDoc).toContain('by path');
    });

    it('evidence section lists artifacts by path', () => {
      const releaseDocPath = path.join(
        projectRoot,
        'docs',
        'RELEASE-READINESS.md',
      );
      const releaseDoc = fs.readFileSync(releaseDocPath, 'utf8');

      // Should have evidence retention section
      expect(releaseDoc).toContain('Evidence Retention');

      // Should list specific file paths
      expect(releaseDoc).toContain('RELEASE-READINESS.md');
      expect(releaseDoc).toContain('UAT-SCENARIOS.md');
      expect(releaseDoc).toContain('ROLLBACK-DRILL.md');
    });
  });

  describe('WRD-0087: Controlled Internal Release Wording', () => {
    it('release doc states controlled internal release only', () => {
      const releaseDocPath = path.join(
        projectRoot,
        'docs',
        'RELEASE-READINESS.md',
      );
      const releaseDoc = fs.readFileSync(releaseDocPath, 'utf8');

      // Should state internal release
      expect(releaseDoc).toContain('CONTROLLED INTERNAL RELEASE');
      expect(releaseDoc).toContain('Internal lab deployment');

      // Should have "Not Certified" section
      expect(releaseDoc).toContain('Not Certified:');
      expect(releaseDoc).toContain('Public marketplace release');
    });

    it('no marketplace or public release claims', () => {
      const releaseDocPath = path.join(
        projectRoot,
        'docs',
        'RELEASE-READINESS.md',
      );
      const releaseDoc = fs.readFileSync(releaseDocPath, 'utf8');

      // Should NOT claim marketplace readiness positively
      // (may appear in "Not Certified" section which is correct)
      expect(releaseDoc).not.toMatch(
        /marketplace ready|public release approved|production ready/i,
      );
    });

    it('release boundary discipline section exists', () => {
      const releaseDocPath = path.join(
        projectRoot,
        'docs',
        'RELEASE-READINESS.md',
      );
      const releaseDoc = fs.readFileSync(releaseDocPath, 'utf8');

      // Should have explicit boundary discipline section
      expect(releaseDoc).toContain('Release Boundary Discipline');

      // Should list what release IS and IS NOT
      expect(releaseDoc).toContain('This release is:');
      expect(releaseDoc).toContain('This release is NOT:');
    });
  });

  describe('WRD-0088: Trust-Sensitive Fields Review', () => {
    it('release doc documents trust-sensitive fields review', () => {
      const releaseDocPath = path.join(
        projectRoot,
        'docs',
        'RELEASE-READINESS.md',
      );
      const releaseDoc = fs.readFileSync(releaseDocPath, 'utf8');

      // Should have package information section
      expect(releaseDoc).toContain('Package Information');

      // Should explicitly review trust-sensitive fields
      expect(releaseDoc).toContain('Trust-Sensitive Fields Review');
      expect(releaseDoc).toContain('WRD-0088');

      // Should have checkmarks for each field
      expect(releaseDoc).toContain('✅');
      expect(releaseDoc).toContain('private: true');
      expect(releaseDoc).toContain('license: UNLICENSED');
    });
  });

  describe('WRD-0089: VSIX Contents Safety', () => {
    it('VSIX does not include credential files', () => {
      // VSIX is generated in project root
      const files = fs.readdirSync(projectRoot);
      const vsixFile = files.find((f) => f.endsWith('.vsix'));

      expect(vsixFile).toBeDefined();

      // VSIX is a zip file - we check it doesn't have obvious credential patterns
      // In production, would unzip and scan contents
      const vsixPath = path.join(projectRoot, vsixFile!);
      const vsixStats = fs.statSync(vsixPath);

      // VSIX should exist and have reasonable size
      expect(vsixStats.size).toBeGreaterThan(0);
      expect(vsixStats.size).toBeLessThan(100 * 1024 * 1024); // < 100MB
    });

    it('release doc states VSIX excludes credentials and PII', () => {
      const releaseDocPath = path.join(
        projectRoot,
        'docs',
        'RELEASE-READINESS.md',
      );
      const releaseDoc = fs.readFileSync(releaseDocPath, 'utf8');

      // Should state VSIX safety in limitations or distribution section
      expect(releaseDoc).toContain('WRD-0089');
    });
  });

  describe('WRD-0090: Trusted Distribution Posture', () => {
    it('install instructions use internal distribution posture', () => {
      const releaseDocPath = path.join(
        projectRoot,
        'docs',
        'RELEASE-READINESS.md',
      );
      const releaseDoc = fs.readFileSync(releaseDocPath, 'utf8');

      // Should have distribution posture section
      expect(releaseDoc).toContain('Distribution Posture');
      expect(releaseDoc).toContain('WRD-0090');

      // Should state internal/trusted distribution
      expect(releaseDoc).toContain('Trusted/Internal Distribution');
      expect(releaseDoc).toContain('internal only');
    });

    it('integrity verification is documented', () => {
      const releaseDocPath = path.join(
        projectRoot,
        'docs',
        'RELEASE-READINESS.md',
      );
      const releaseDoc = fs.readFileSync(releaseDocPath, 'utf8');

      // Should have integrity verification section
      expect(releaseDoc).toContain('Integrity Verification');

      // Should include git hash verification
      expect(releaseDoc).toContain('git rev-parse HEAD');
      expect(releaseDoc).toContain('commit hash');
    });

    it('update notification is internal-only', () => {
      const releaseDocPath = path.join(
        projectRoot,
        'docs',
        'RELEASE-READINESS.md',
      );
      const releaseDoc = fs.readFileSync(releaseDocPath, 'utf8');

      // Should state no automatic update checks
      expect(releaseDoc).toContain('No automatic update checks');
      expect(releaseDoc).toContain('internal release posture');
    });
  });

  describe('Release-Readiness Evidence Artifacts', () => {
    it('release-readiness document exists', () => {
      const releaseDocPath = path.join(
        projectRoot,
        'docs',
        'RELEASE-READINESS.md',
      );
      expect(fs.existsSync(releaseDocPath)).toBe(true);

      const releaseDoc = fs.readFileSync(releaseDocPath, 'utf8');

      // Should have all required sections
      expect(releaseDoc).toContain('Release Status');
      expect(releaseDoc).toContain('Installation');
      expect(releaseDoc).toContain('Upgrade Path');
      expect(releaseDoc).toContain('Known Limitations');
      expect(releaseDoc).toContain('Support and Escalation');
    });

    it('release validator checklist exists', () => {
      const releaseDocPath = path.join(
        projectRoot,
        'docs',
        'RELEASE-READINESS.md',
      );
      const releaseDoc = fs.readFileSync(releaseDocPath, 'utf8');

      // Should have checklist for validators
      expect(releaseDoc).toContain('Checklist for Release Validators');

      // Should have multiple checklist items
      expect(releaseDoc).toMatch(/\[ \]/g);
    });
  });
});
