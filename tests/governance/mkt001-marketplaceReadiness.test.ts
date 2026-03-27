import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
);

/**
 * Governance tests for LINTEL-MKT-001 — Marketplace Readiness
 *
 * These tests verify:
 * - OBS-S-7100: README top section externally understandable
 * - OBS-S-7101: Marketplace-facing package.json fields truthful
 * - WRD-0125: Public capability claims follow truth table
 * - WRD-0126: Screenshots depict real UI (if present)
 * - WRD-0128: No internal governance nomenclature in public text
 */

describe('LINTEL-MKT-001 — Marketplace Readiness Governance', () => {
  describe('OBS-S-7100: README External Clarity', () => {
    it('README top section serves first-time external visitors', () => {
      const readmePath = path.join(projectRoot, 'README.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      // Should have quick start / install section near top
      expect(readme).toMatch(/## Quick Start/i);
      expect(readme).toMatch(/### Install/i);

      // Should explain what ARC does in plain language
      expect(readme).toMatch(/what.*does|what.*is|governed code/i);

      // Should have requirements section
      expect(readme).toMatch(/## Requirements/i);

      // Should have commands section
      expect(readme).toMatch(/## Commands/i);
    });

    it('README preserves links to deeper technical material below top layer', () => {
      const readmePath = path.join(projectRoot, 'README.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      // Should still link to deeper technical material
      expect(readme).toMatch(/## Learn More/i);
      expect(readme).toMatch(/## Support/i);
      expect(readme).toMatch(/docs\//);
    });
  });

  describe('OBS-S-7101: Marketplace Metadata Truthfulness', () => {
    it('package.json has marketplace-facing fields completed', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf8'),
      ) as {
        name?: string;
        displayName?: string;
        description?: string;
        categories?: string[];
        keywords?: string[];
        repository?: { url?: string };
        bugs?: { url?: string };
        homepage?: string;
        icon?: string;
      };

      // Should have display name
      expect(packageJson.displayName).toBeDefined();

      // Should have description
      expect(packageJson.description).toBeDefined();

      // Should have categories
      expect(packageJson.categories).toBeDefined();
      expect(packageJson.categories?.length).toBeGreaterThan(0);

      // Should have keywords for discoverability
      expect(packageJson.keywords).toBeDefined();
      expect(packageJson.keywords?.length).toBeGreaterThan(0);

      // Should have repository URL
      expect(packageJson.repository?.url).toBeDefined();

      // Should have bugs/issues URL
      expect(packageJson.bugs?.url).toBeDefined();

      // Should have homepage URL
      expect(packageJson.homepage).toBeDefined();

      // Should have icon reference
      expect(packageJson.icon).toBeDefined();
    });

    it('package.json description does not overclaim capability', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf8'),
      ) as {
        description?: string;
      };

      const description = packageJson.description || '';

      // Should NOT claim marketplace readiness
      expect(description).not.toMatch(/marketplace.*ready/i);

      // Should NOT claim production certification
      expect(description).not.toMatch(/production.*certified/i);

      // Should NOT claim cloud capability as default
      expect(description).not.toMatch(/cloud.*enabled/i);
    });
  });

  describe('WRD-0125: Capability Truth Table Compliance', () => {
    it('public text does not claim cloud capability as default', () => {
      const readmePath = path.join(projectRoot, 'README.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      // Should state cloud is disabled by default
      expect(readme).toMatch(/cloud.*disabled|cloud.*default.*false/i);

      // Should NOT claim cloud is enabled
      expect(readme).not.toMatch(/cloud.*enabled.*by.*default/i);
    });

    it('public text states local-first posture', () => {
      const readmePath = path.join(projectRoot, 'README.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      // Should state local-first
      expect(readme).toMatch(/local[- ]first/i);

      // Should NOT require external services
      expect(readme).toMatch(/no.*external.*required|no.*cloud.*required/i);
    });

    it('public text states rule-first enforcement', () => {
      const readmePath = path.join(projectRoot, 'README.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      // Should mention rule-based or fail-closed
      expect(readme).toMatch(/rule[- ]based|fail[- ]closed|rule[- ]first/i);
    });

    it('public text does not claim dashboard/website capability', () => {
      const readmePath = path.join(projectRoot, 'README.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      // Should NOT claim dashboard capability
      expect(readme).not.toMatch(/dashboard.*available|web.*dashboard/i);

      // Should NOT claim external website
      expect(readme).not.toMatch(/app\..*\.com|dashboard\..*\.com/i);
    });
  });

  describe('WRD-0128: No Internal Governance Nomenclature', () => {
    it('README top section avoids internal phase references', () => {
      const readmePath = path.join(projectRoot, 'README.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      // Get first 100 lines (top section)
      const topSection = readme.split('\n').slice(0, 100).join('\n');

      // Should NOT have internal phase references in top section
      expect(topSection).not.toMatch(/Phase \d+\.\d+/i);

      // Should NOT have internal directive IDs in top section
      expect(topSection).not.toMatch(/LINTEL-[A-Z]+-\d+/i);

      // Should NOT have internal governance codes in top section
      expect(topSection).not.toMatch(/WRD-\d+|OBS-S-\d+/i);
    });

    it('README top section uses external-friendly language', () => {
      const readmePath = path.join(projectRoot, 'README.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      // Get first 100 lines (top section)
      const topSection = readme.split('\n').slice(0, 100).join('\n');

      // Should use friendly terms
      expect(topSection).toMatch(/install|get started|quick start/i);
      expect(topSection).toMatch(/feature|capability|functionality/i);

      // Should NOT use internal jargon in top section
      expect(topSection).not.toMatch(/enforcement floor/i);
      expect(topSection).not.toMatch(/governance gate/i);
      expect(topSection).not.toMatch(/closure record/i);
    });
  });

  describe('WRD-0126: Screenshot Truthfulness', () => {
    it('Public/ directory exists for marketplace assets', () => {
      const publicPath = path.join(projectRoot, 'Public');
      expect(fs.existsSync(publicPath)).toBe(true);
    });

    it('Logo asset exists and is referenced in package.json', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf8'),
      ) as {
        icon?: string;
      };

      expect(packageJson.icon).toBeDefined();

      const logoPath = path.join(projectRoot, packageJson.icon!);
      expect(fs.existsSync(logoPath)).toBe(true);
    });

    it('Logo file is valid PNG', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf8'),
      ) as {
        icon?: string;
      };

      const logoPath = path.join(projectRoot, packageJson.icon!);
      const logoContent = fs.readFileSync(logoPath);

      // PNG magic number: 89 50 4E 47
      expect(logoContent[0]).toBe(0x89);
      expect(logoContent[1]).toBe(0x50);
      expect(logoContent[2]).toBe(0x4e);
      expect(logoContent[3]).toBe(0x47);
    });
  });

  describe('Marketplace Evidence Pack', () => {
    it('Marketplace readiness evidence artifact exists', () => {
      const evidencePath = path.join(
        projectRoot,
        'artifacts',
        'LINTEL-MKT-001-EVIDENCE.md',
      );
      expect(fs.existsSync(evidencePath)).toBe(true);
    });

    it('Evidence documents licensing posture (WRD-0124)', () => {
      const evidencePath = path.join(
        projectRoot,
        'artifacts',
        'LINTEL-MKT-001-EVIDENCE.md',
      );
      if (!fs.existsSync(evidencePath)) {
        return;
      }

      const evidence = fs.readFileSync(evidencePath, 'utf8');

      // Should mention licensing
      expect(evidence).toMatch(/license|licensing|WRD-0124/i);
    });
  });
});
