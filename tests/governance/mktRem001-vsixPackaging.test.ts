import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
);

type Semver = { major: number; minor: number; patch: number };

function parseSemver(input: string): Semver | null {
  const m = input.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function cmpSemver(a: Semver, b: Semver): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function resolveLatestReleaseVsixPath(): string {
  const releasesDir = path.join(projectRoot, 'artifacts', 'releases');
  if (!fs.existsSync(releasesDir)) return '';

  const entries = fs.readdirSync(releasesDir, { withFileTypes: true });
  const candidates = entries
    .filter((e) => e.isFile() && e.name.endsWith('.vsix'))
    .map((e) => e.name)
    .filter((name) => name.startsWith('arc-audit-ready-core-'));

  // Prefer matching the current package.json version if present.
  const pkgPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
        version?: string;
      };
      const v = typeof pkg.version === 'string' ? pkg.version : '';
      const expected = `arc-audit-ready-core-${v}.vsix`;
      if (candidates.includes(expected)) {
        return path.join(releasesDir, expected);
      }
    } catch {
      // Fall through to semver-based resolution.
    }
  }

  // Otherwise choose the highest semver-like filename suffix.
  let bestName = '';
  let bestVer: Semver | null = null;
  for (const name of candidates) {
    const m = name.match(/^arc-audit-ready-core-(\d+\.\d+\.\d+)\.vsix$/);
    if (!m) continue;
    const ver = parseSemver(m[1]);
    if (!ver) continue;
    if (!bestVer || cmpSemver(ver, bestVer) > 0) {
      bestVer = ver;
      bestName = name;
    }
  }

  return bestName ? path.join(releasesDir, bestName) : '';
}

const latestVsixPath = resolveLatestReleaseVsixPath();

function readVsixBinary(vsixPath: string): string {
  return fs.readFileSync(vsixPath, 'latin1');
}

function estimateVsixFileCount(vsixPath: string): number {
  const binary = readVsixBinary(vsixPath);
  const zipLocalHeader = `PK${String.fromCharCode(3)}${String.fromCharCode(4)}`;
  return binary.split(zipLocalHeader).length - 1;
}

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
      const vsixPath = latestVsixPath;
      if (!fs.existsSync(vsixPath)) {
        // Skip if VSIX not built yet
        return;
      }

      // List VSIX contents
      const contents = readVsixBinary(vsixPath);

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
      const vsixPath = latestVsixPath;
      if (!fs.existsSync(vsixPath)) {
        return;
      }

      const contents = readVsixBinary(vsixPath);

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
      const vsixPath = latestVsixPath;
      if (!fs.existsSync(vsixPath)) {
        return;
      }

      const contents = readVsixBinary(vsixPath);

      // .env.example is OK, but not other .env files
      expect(contents).not.toMatch(/\.env[^.]/);
    });
  });

  describe('WRD-0122: Public/Logo/ Retained', () => {
    it('VSIX includes Public/Logo/ for runtime', () => {
      const vsixPath = latestVsixPath;
      if (!fs.existsSync(vsixPath)) {
        return;
      }

      const contents = readVsixBinary(vsixPath);

      // Should contain Public/Logo/
      expect(contents).toContain('Public/');
      expect(contents).toContain('Logo/');
      expect(contents).toContain('ARC-ICON-1024.png');
    });
  });

  describe('WRD-0123: rules/ Shipping Declaration', () => {
    it('rules/ directory is included with justification', () => {
      const vsixPath = latestVsixPath;
      if (!fs.existsSync(vsixPath)) {
        return;
      }

      const contents = readVsixBinary(vsixPath);

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
      const vsixPath = latestVsixPath;
      if (!fs.existsSync(vsixPath)) {
        return;
      }

      const contents = readVsixBinary(vsixPath);

      // Should NOT contain artifacts/
      expect(contents).not.toContain('artifacts/');
    });
  });

  describe('Packaging Size Reduction', () => {
    it('VSIX size is reasonable (< 5 MB)', () => {
      const vsixPath = latestVsixPath;
      if (!fs.existsSync(vsixPath)) {
        return;
      }

      const stats = fs.statSync(vsixPath);
      const sizeMB = stats.size / (1024 * 1024);

      // Should be under 5 MB
      expect(sizeMB).toBeLessThan(5);
    });

    it('VSIX file count is reasonable (< 100 files)', () => {
      const vsixPath = latestVsixPath;
      if (!fs.existsSync(vsixPath)) {
        return;
      }

      const fileCount = estimateVsixFileCount(vsixPath);
      expect(fileCount).toBeLessThan(100);
    });
  });
});
