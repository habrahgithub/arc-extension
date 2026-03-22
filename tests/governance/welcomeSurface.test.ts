import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
);

/**
 * Read welcome content directly from source file for testing.
 * This avoids the VS Code module dependency in test environment.
 */
function getWelcomeContent(): string {
  const sourcePath = path.join(
    projectRoot,
    'src',
    'extension',
    'welcomeSurface.ts',
  );
  const source = fs.readFileSync(sourcePath, 'utf8');

  // Extract WELCOME_CONTENT string
  const match = source.match(/export const WELCOME_CONTENT = `([\s\S]*?)`;/);
  if (!match) {
    throw new Error('WELCOME_CONTENT not found in welcomeSurface.ts');
  }
  return match[1];
}

/**
 * Governance tests for Phase 7.5 Welcome Surface
 *
 * These tests verify:
 * - OBS-S-7009: Onboarding mechanism remains bounded (local-only)
 * - OBS-S-7010: Command identity preserved (lintel.* prefix, ARC-aligned)
 * - WRD-0068: Wording truthfulness (no implication of readiness beyond actual state)
 */

describe('Phase 7.5 — Welcome Surface Governance', () => {
  describe('OBS-S-7009: Onboarding Mechanism Boundary', () => {
    it('keeps welcome content local-only without remote resource references', () => {
      const content = getWelcomeContent();

      // Must not contain external URLs (except local Ollama default)
      expect(content).not.toMatch(/https?:\/\/(?!localhost|127\.0\.0\.1)/);
      expect(content).not.toContain('fetch(');
      expect(content).not.toContain('cdn.');
      expect(content).not.toContain('googleapis.com');
      expect(content).not.toContain('unpkg.com');
    });

    it('does not imply webview remote loading capability', () => {
      const welcomeSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'welcomeSurface.ts'),
        'utf8',
      );

      // Must not contain remote resource loading patterns
      expect(welcomeSource).not.toMatch(
        /https?:\/\/(?!localhost|127\.0\.0\.1)/,
      );
      expect(welcomeSource).not.toContain('fetch(');
      expect(welcomeSource).not.toContain('webview.html');
      expect(welcomeSource).not.toContain('external resource');
    });
  });

  describe('OBS-S-7010: Command Identity Preservation', () => {
    it('uses lintel.* prefix for the welcome command', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
      ) as {
        contributes?: { commands?: Array<{ command: string; title: string }> };
      };

      const commands = packageJson.contributes?.commands ?? [];
      const welcomeCommand = commands.find((cmd) =>
        cmd.title.includes('Welcome'),
      );

      expect(welcomeCommand).toBeDefined();
      expect(welcomeCommand?.command).toBe('lintel.showWelcome');
    });

    it('uses ARC-aligned title for the welcome command', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
      ) as {
        contributes?: { commands?: Array<{ command: string; title: string }> };
      };

      const commands = packageJson.contributes?.commands ?? [];
      const welcomeCommand = commands.find(
        (cmd) => cmd.command === 'lintel.showWelcome',
      );

      expect(welcomeCommand).toBeDefined();
      expect(welcomeCommand?.title).toBe('ARC: Show Welcome Guide');
      expect(welcomeCommand?.title).toContain('ARC:');
    });

    it('preserves existing command identity without migration', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
      ) as {
        contributes?: { commands?: Array<{ command: string }> };
      };

      const commands =
        packageJson.contributes?.commands?.map((cmd) => cmd.command) ?? [];

      // All commands must use lintel.* prefix
      commands.forEach((cmd) => {
        expect(cmd).toMatch(/^lintel\./);
      });

      // Expected commands from Phase 7.3 identity freeze
      expect(commands).toContain('lintel.showWelcome');
      expect(commands).toContain('lintel.reviewAudit');
      expect(commands).toContain('lintel.showRuntimeStatus');
      expect(commands).toContain('lintel.reviewBlueprints');
      expect(commands).toContain('lintel.reviewFalsePositives');
    });
  });

  describe('WRD-0068: Onboarding Wording Truthfulness', () => {
    it('does not imply active protection or authorization capability', () => {
      const content = getWelcomeContent();

      // Must not claim to "protect", "authorize", or "approve" changes in positive context
      // (mentions in "does NOT" context are allowed for clarity)
      expect(content).not.toMatch(
        /(protects|protecting|protection of|authorizes|authorized by|approves)/i,
      );

      // Must use descriptive language only
      expect(content).toContain('descriptive only');
      expect(content).toContain('does not authorize');
    });

    it('does not imply cloud readiness or remote execution', () => {
      const content = getWelcomeContent();

      // Must not imply cloud capability in positive context
      // (mentions in "does NOT" or "Does **not**" context are allowed for clarity)
      expect(content).not.toMatch(
        /(cloud-ready|cloud-enabled|cloud integration|provides remote execution|makes API calls)/i,
      );

      // Must explicitly state local-only operation
      expect(content).toContain('local-first');
      expect(content).toContain('local-only');
      expect(content).toContain('Does **not** call external AI APIs');
    });

    it('does not imply marketplace or team readiness', () => {
      const content = getWelcomeContent();

      // Must not claim marketplace or team features in positive context
      // (mentions in "does NOT" context are allowed for clarity)
      expect(content).not.toMatch(
        /(provides marketplace|provides team|shared features|multi-user features)/i,
      );

      // Must explicitly state these are NOT features
      expect(content).toContain('Does **not** provide marketplace');
      expect(content).toContain('Does **not** provide');
    });

    it('does not imply ARC Console or Vault coupling', () => {
      const content = getWelcomeContent();

      // Must distinguish from ARC Console and Vault
      expect(content).toContain(
        'It is not the ARC Console, Vault, or broader control-plane system',
      );
      expect(content).toContain('no control-plane coupling');
      expect(content).not.toMatch(/ARC Console integration/i);
      expect(content).not.toMatch(/Vault integration/i);
    });

    it('explicitly states fail-closed posture', () => {
      const content = getWelcomeContent();

      // Must explain fail-closed behavior truthfully
      expect(content).toContain('fails closed');
      expect(content).toContain(
        'Model failure never weakens the baseline protection',
      );
    });

    it('explicitly states proof-required behavior', () => {
      const content = getWelcomeContent();

      // Must explain proof requirement for high-risk saves
      expect(content).toContain('REQUIRE_PLAN');
      expect(content).toContain('directive proof');
      expect(content).toContain('explicit intent');
    });

    it('includes disclaimer about descriptive-only nature', () => {
      const content = getWelcomeContent();

      // Must have explicit disclaimer at the end
      expect(content).toContain('descriptive only');
      expect(content).toContain('does not authorize, widen, or bypass');
    });
  });

  describe('Package.json Governance', () => {
    it('uses ARC-aligned display name', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
      ) as {
        displayName?: string;
      };

      expect(packageJson.displayName).toBe('ARC — Audit Ready Core');
    });

    it('description reflects local-first governance posture', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
      ) as {
        description?: string;
      };

      const desc = packageJson.description ?? '';
      expect(desc).toContain('local-first');
      expect(desc.toLowerCase()).toContain('governed');
      expect(desc).not.toMatch(/cloud/i);
      expect(desc).not.toMatch(/remote/i);
    });

    it('activation events remain command-based without remote triggers', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
      ) as {
        activationEvents?: string[];
      };

      const events = packageJson.activationEvents ?? [];

      // Must use onStartupFinished and onCommand only
      events.forEach((event) => {
        expect(event).toMatch(/^(onStartupFinished|onCommand:)/);
      });

      // Must not have remote or network-based activation
      expect(events).not.toContain('onHttp:*');
      expect(events).not.toContain('onCustomProtocol:*');
    });
  });

  describe('Welcome Source Code Governance', () => {
    it('welcomeSurface.ts includes governance anchor comments', () => {
      const welcomeSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'welcomeSurface.ts'),
        'utf8',
      );

      // Must reference the carry-forward conditions
      expect(welcomeSource).toContain('OBS-S-7009');
      expect(welcomeSource).toContain('OBS-S-7010');
      expect(welcomeSource).toContain('WRD-0068');
    });

    it('welcomeSurface.ts includes descriptive-only disclaimer', () => {
      const welcomeSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension', 'welcomeSurface.ts'),
        'utf8',
      );

      // Must have inline documentation about bounded nature
      expect(welcomeSource).toContain('descriptive only');
      expect(welcomeSource).toContain('does not authorize');
    });

    it('extension.ts wires welcome command without altering enforcement', () => {
      const extensionSource = fs.readFileSync(
        path.join(projectRoot, 'src', 'extension.ts'),
        'utf8',
      );

      // Welcome command must be wired separately from save enforcement
      expect(extensionSource).toContain('lintel.showWelcome');

      // Must not alter save enforcement logic
      expect(extensionSource).toContain('onWillSaveTextDocument');
      expect(extensionSource).toContain('onDidSaveTextDocument');
    });
  });
});
