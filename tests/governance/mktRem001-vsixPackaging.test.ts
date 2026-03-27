import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
);

/**
 * Governance tests for LINTEL-MKT-REM-001 — VSIX Packaging Remediation
 *
 * These tests verify:
 * - WRD-0119: Minimum exclusion list enforced
 * - WRD-0120: No secrets/credentials/PII in VSIX
 * - WRD-0122: Public/Logo/ retained for runtime
 * - WRD-0123: rules/ shipping declared
 * - OBS-S-7092: artifacts/** excluded
 */

describe('LINTEL-MKT-REM-001 — VSIX Packaging Governance', () => {
  describe('WRD-0119: Minimum Exclusion List', () => {
    it('.vscodeignore exists and is properly configured', () => {
      const vscodeignorePath = path.join(projectRoot, '.vscodeignore');
      expect(fs.existsSync(vscodeignorePath)).toBe(true);

      const content = fs.readFileSync(vscodeignorePath, 'utf8');

      // Should exclude artifacts
      expect(content).toContain('artifacts/**');

      // Should exclude tests
      expect(content).toContain('tests/**');

      // Should exclude .arc (internal state)
      expect(content).toContain('.arc/**');

      // Should exclude .continue (local config)
      expect(content).toContain('.continue/**');

      // Should exclude src (ship dist/ only)
      expect(content).toContain('src/**');
    });

    it('VSIX excludes development-only files', () => {
      const vsixPath = path.join(projectRoot, 'lintel-0.1.1.vsix');
      if (!fs.existsSync(vsixPath)) {
        // Skip if VSIX not built yet
        return;
      }

      // List VSIX contents
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call
      const { execSync } = require('child_process');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const contents = execSync(`unzip -l ${vsixPath}`, { encoding: 'utf8' });

      // Should NOT contain excluded patterns
      expect(contents).not.toContain('artifacts/');
      expect(contents).not.toContain('tests/');
      expect(contents).not.toContain('.arc/');
      expect(contents).not.toContain('.continue/');
      expect(contents).not.toContain('src/');
      expect(contents).not.toContain('vitest.config');
    });
  });

  describe('WRD-0120: No Secrets/Credentials/PII', () => {
    it('VSIX contains no secret/credential patterns', () => {
      const vsixPath = path.join(projectRoot, 'lintel-0.1.0.vsix');
      if (!fs.existsSync(vsixPath)) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call
      const { execSync } = require('child_process');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const contents = execSync(`unzip -l ${vsixPath}`, { encoding: 'utf8' });

      // Should NOT contain secret-related filenames
      expect(contents).not.toMatch(/\.env(?!\.example)/i);
      expect(contents).not.toMatch(/secret/i);
      expect(contents).not.toMatch(/credential/i);
      expect(contents).not.toMatch(/token/i);
      expect(contents).not.toMatch(/password/i);
      expect(contents).not.toMatch(/id_rsa/i);
      expect(contents).not.toMatch(/\.pem/i);
    });

    it('No .env files except .env.example in VSIX', () => {
      const vsixPath = path.join(projectRoot, 'lintel-0.1.0.vsix');
      if (!fs.existsSync(vsixPath)) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call
      const { execSync } = require('child_process');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const contents = execSync(`unzip -l ${vsixPath}`, { encoding: 'utf8' });

      // .env.example is OK, but not other .env files
      expect(contents).not.toMatch(/\.env[^.]/);
    });
  });

  describe('WRD-0122: Public/Logo/ Retained', () => {
    it('VSIX includes Public/Logo/ for runtime', () => {
      const vsixPath = path.join(projectRoot, 'lintel-0.1.0.vsix');
      if (!fs.existsSync(vsixPath)) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call
      const { execSync } = require('child_process');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const contents = execSync(`unzip -l ${vsixPath}`, { encoding: 'utf8' });

      // Should contain Public/Logo/
      expect(contents).toContain('Public/');
      expect(contents).toContain('Logo/');
      expect(contents).toContain('ARC LOGO.png');
    });
  });

  describe('WRD-0123: rules/ Shipping Declaration', () => {
    it('rules/ directory is included with justification', () => {
      const vsixPath = path.join(projectRoot, 'lintel-0.1.0.vsix');
      if (!fs.existsSync(vsixPath)) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call
      const { execSync } = require('child_process');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const contents = execSync(`unzip -l ${vsixPath}`, { encoding: 'utf8' });

      // Should contain rules/ (runtime classification rules)
      expect(contents).toContain('rules/');
      expect(contents).toContain('default.json');
    });

    it('rules/ shipping is documented in remediation evidence', () => {
      const evidencePath = path.join(
        projectRoot,
        'artifacts',
        'LINTEL-MKT-REM-001-EVIDENCE.md',
      );
      if (!fs.existsSync(evidencePath)) {
        return;
      }

      const content = fs.readFileSync(evidencePath, 'utf8');

      // Should document why rules/ ships
      expect(content).toMatch(/rules\/.*runtime|classification|enforcement/i);
    });
  });

  describe('OBS-S-7092: artifacts/** Excluded', () => {
    it('VSIX excludes artifacts/ directory', () => {
      const vsixPath = path.join(projectRoot, 'lintel-0.1.0.vsix');
      if (!fs.existsSync(vsixPath)) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call
      const { execSync } = require('child_process');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const contents = execSync(`unzip -l ${vsixPath}`, { encoding: 'utf8' });

      // Should NOT contain artifacts/
      expect(contents).not.toContain('artifacts/');
    });
  });

  describe('Packaging Size Reduction', () => {
    it('VSIX size is reasonable (< 5 MB)', () => {
      const vsixPath = path.join(projectRoot, 'lintel-0.1.0.vsix');
      if (!fs.existsSync(vsixPath)) {
        return;
      }

      const stats = fs.statSync(vsixPath);
      const sizeMB = stats.size / (1024 * 1024);

      // Should be under 5 MB
      expect(sizeMB).toBeLessThan(5);
    });

    it('VSIX file count is reasonable (< 100 files)', () => {
      const vsixPath = path.join(projectRoot, 'lintel-0.1.0.vsix');
      if (!fs.existsSync(vsixPath)) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call
      const { execSync } = require('child_process');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const contents = execSync(`unzip -l ${vsixPath}`, { encoding: 'utf8' });

      // Count lines (rough file count estimate)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const lineCount = contents.split('\n').length;
      expect(lineCount).toBeLessThan(100);
    });
  });
});
