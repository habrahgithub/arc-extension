import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CloudModelAdapter,
  DisabledModelAdapter,
  OllamaModelAdapter,
} from '../../src/adapters/modelAdapter';

const projectRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
);
const readme = fs.readFileSync(path.join(projectRoot, 'README.md'), 'utf8');

describe('governance guards', () => {
  it('keeps the default model adapter disabled', () => {
    const adapter = new DisabledModelAdapter();
    expect(adapter.enabledByDefault).toBe(false);
  });

  it('keeps the Ollama adapter local-only and disabled by default', () => {
    const adapter = new OllamaModelAdapter();
    expect(adapter.enabledByDefault).toBe(false);
  });

  it('ensures arc gitignore excludes runtime audit artifacts', () => {
    const gitignore = fs.readFileSync(
      path.join(projectRoot, '.arc', '.gitignore'),
      'utf8',
    );

    expect(gitignore).toContain('audit.jsonl');
    expect(gitignore).toContain('archive/');
    expect(gitignore).toContain('perf.jsonl');
  });

  it('keeps runtime audit files excluded by design while allowing tracked blueprints', () => {
    const gitignore = fs.readFileSync(
      path.join(projectRoot, '.arc', '.gitignore'),
      'utf8',
    );

    expect(gitignore.split('\n')).toContain('audit.jsonl');
    expect(gitignore.split('\n')).toContain('archive/');
    expect(gitignore.split('\n')).toContain('perf.jsonl');
    expect(gitignore).not.toContain('blueprints/');
  });

  it('does not define non-local cloud endpoints in the model adapter', () => {
    const contents = fs.readFileSync(
      path.join(projectRoot, 'src', 'adapters', 'modelAdapter.ts'),
      'utf8',
    );

    expect(contents).toContain('http://127.0.0.1:11434');
    expect(contents).toContain('class CloudModelAdapter');
    expect(contents).not.toContain('api.openai.com');
  });

  it('anchors Phase 7.4 local runtime hardening to fail-closed local-only configuration semantics', () => {
    const modelAdapter = fs.readFileSync(
      path.join(projectRoot, 'src', 'adapters', 'modelAdapter.ts'),
      'utf8',
    );
    const architecture = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );
    const testing = fs.readFileSync(
      path.join(projectRoot, 'docs', 'TESTING.md'),
      'utf8',
    );

    expect(modelAdapter).toContain('OLLAMA_HOST');
    expect(modelAdapter).toContain('SWD_SUBAGENT_MODEL');
    expect(modelAdapter).toContain('OLLAMA_TIMEOUT_MS');
    expect(modelAdapter).toContain('OLLAMA_RETRIES');
    expect(modelAdapter).toContain('must remain local-only');
    expect(architecture).toContain(
      'non-local `OLLAMA_HOST` configuration must fail closed',
    );
    expect(testing).toContain(
      'non-local `OLLAMA_HOST` values must not imply cloud-lane activation',
    );
    expect(testing).toContain(
      'Malformed or contradictory model output must surface as explicit fallback behavior',
    );
  });

  it('documents that audit verification is file-level only', () => {
    const docs = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );

    expect(docs).toContain('file-level integrity only');
  });

  it('documents that shared/team blueprint handling and model activation stay out of scope', () => {
    const architecture = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );

    expect(readme).toContain('Local-only blueprints');
    expect(architecture).toContain(
      'Local-model activation in Phase 6.8 is bounded to the local lane only',
    );
  });

  it('documents RULE_ONLY defaults and no ARC/Vault save-path dependency for Phase 6.0', () => {
    const architecture = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );

    expect(readme).toContain('RULE_ONLY');
    expect(architecture).toContain('The default route mode is `RULE_ONLY`.');
    expect(architecture).toContain(
      'ARC Console and Vault are not runtime save-path dependencies.',
    );
  });

  it('documents Lease v2 invalidation and the carried-forward Warden gate for non-default trust-boundary values', () => {
    const architecture = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );
    const testing = fs.readFileSync(
      path.join(projectRoot, 'docs', 'TESTING.md'),
      'utf8',
    );

    expect(architecture).toContain('route-policy hash and route signature');
    expect(testing).toContain('route-policy hash invalidation');
  });

  it('documents the Phase 6.2 audit visibility cli as read-only/export-only and local-only', () => {
    const architecture = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );
    const testing = fs.readFileSync(
      path.join(projectRoot, 'docs', 'TESTING.md'),
      'utf8',
    );

    expect(architecture).toContain(
      'Vault-ready export bundles are local handoff only',
    );
    expect(architecture).toContain(
      'CLI failure must not weaken or block save enforcement',
    );
    expect(testing).toContain('CLI export contract correctness');
  });

  it('documents Context Bus v1 hardening as bounded, inert, and RULE_ONLY in Phase 6.3', () => {
    const architecture = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );
    const testing = fs.readFileSync(
      path.join(projectRoot, 'docs', 'TESTING.md'),
      'utf8',
    );

    expect(architecture).toContain(
      'authority_tag` must be locally asserted by trusted code',
    );
    expect(architecture).toContain(
      'packet presence is not a routing activation signal',
    );
    expect(testing).toContain('Context Bus packet validation');
  });

  it('documents the router shell baseline as single-path, fail-closed, and rule-floor preserving', () => {
    const architecture = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );
    const testing = fs.readFileSync(
      path.join(projectRoot, 'docs', 'TESTING.md'),
      'utf8',
    );

    expect(architecture).toContain('single authoritative source');
    expect(architecture).toContain('must never weaken the enforcement floor');
    expect(testing).toContain('router shell insertion without decision drift');
  });

  it('documents Phase 6.6 local-lane and cloud fallback activation boundaries', () => {
    const architecture = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );
    const testing = fs.readFileSync(
      path.join(projectRoot, 'docs', 'TESTING.md'),
      'utf8',
    );

    expect(readme).toContain('LOCAL_PREFERRED');
    expect(readme).toContain('CLOUD_ASSISTED');
    expect(architecture).toContain('`LOCAL_PREFERRED` is local-only');
    expect(architecture).toContain(
      '`CLOUD_ASSISTED` may be accepted only when `local_lane_enabled: true` and `cloud_lane_enabled: true`',
    );
    expect(architecture).toContain(
      'auto-save assessments fail closed to `RULE_ONLY`',
    );
    expect(testing).toContain('cloud fallback gate');
    expect(testing).toContain(
      'cloud fallback must occur only after approved local fallback states',
    );
  });

  it('documents Phase 6.7 Vault-ready export validation as local-only and non-mutating', () => {
    const architecture = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );
    const testing = fs.readFileSync(
      path.join(projectRoot, 'docs', 'TESTING.md'),
      'utf8',
    );

    expect(architecture).toContain(
      'Vault-ready means schema alignment for later handoff, not direct Vault write',
    );
    expect(architecture).toContain(
      'direct evidence sections remain distinguishable from derived summary sections',
    );
    expect(testing).toContain(
      'Vault-ready export coverage must retain versioned schema generation',
    );
    expect(testing).toContain(
      'malformed or incomplete export inputs must surface as `PARTIAL`',
    );
  });

  it('documents Phase 6.8 controlled activation review and rollback drill boundaries', () => {
    const architecture = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );
    const testing = fs.readFileSync(
      path.join(projectRoot, 'docs', 'TESTING.md'),
      'utf8',
    );

    expect(architecture).toContain(
      'rollback target remains hardened-equivalent posture',
    );
    expect(architecture).toContain('recommendation output is advisory only');
    expect(testing).toContain(
      'integrated validation coverage must prove no assembled path is looser than the hardened baseline',
    );
    expect(testing).toContain(
      'rollback drill must restore hardened-equivalent posture and preserve audit continuity',
    );
  });

  it('removes the obsolete createIfMissing proof-input contract field', () => {
    const types = fs.readFileSync(
      path.join(projectRoot, 'src', 'contracts', 'types.ts'),
      'utf8',
    );

    expect(types).not.toContain('createIfMissing');
  });

  it('registers only local review commands for Phase 5 surfaces', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
    ) as {
      activationEvents?: string[];
      contributes?: { commands?: Array<{ command: string }> };
    };

    const commands =
      packageJson.contributes?.commands?.map((entry) => entry.command) ?? [];
    const activationEvents = packageJson.activationEvents ?? [];

    expect(commands).toContain('arc.reviewAudit');
    expect(commands).toContain('arc.showRuntimeStatus');
    expect(commands).toContain('arc.reviewBlueprints');
    expect(commands).toContain('arc.reviewFalsePositives');
    // Activation is onStartupFinished (commands are registered dynamically)
    expect(activationEvents).toContain('onStartupFinished');
  });

  it('anchors the runtime-status command to an explicit observational-only diagnostic contract', () => {
    const runtimeStatus = fs.readFileSync(
      path.join(projectRoot, 'src', 'extension', 'runtimeStatus.ts'),
      'utf8',
    );
    const readme = fs.readFileSync(path.join(projectRoot, 'README.md'), 'utf8');
    const testing = fs.readFileSync(
      path.join(projectRoot, 'docs', 'TESTING.md'),
      'utf8',
    );

    expect(runtimeStatus).toContain('RUNTIME_STATUS_OBSERVATIONAL_NOTICE');
    expect(runtimeStatus).toContain(
      'Diagnostics are observational only. They do not authorize, widen, or bypass save decisions.',
    );
    expect(runtimeStatus).toContain(
      'Cloud note: this diagnostic must not be interpreted as cloud readiness, approval, or authorization.',
    );
    expect(runtimeStatus).toContain(
      'Fail-closed note: missing/invalid route policy still degrades to `RULE_ONLY` and does not loosen baseline enforcement.',
    );
    expect(readme).toContain('Show Active Workspace Status');
    expect(testing).toContain(
      'runtime status command must remain governance-anchored',
    );
  });

  it('anchors enforcement-related review-surface messaging to read-only, non-authorizing semantics', () => {
    const reviewSurfaces = fs.readFileSync(
      path.join(projectRoot, 'src', 'extension', 'reviewSurfaces.ts'),
      'utf8',
    );
    const architecture = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );
    const testing = fs.readFileSync(
      path.join(projectRoot, 'docs', 'TESTING.md'),
      'utf8',
    );

    expect(reviewSurfaces).toContain('REVIEW_SURFACE_LOCAL_ONLY_NOTICE');
    expect(reviewSurfaces).toContain(
      'Review surfaces are local-only and read-only. They summarize existing evidence but do not authorize, widen, or bypass save decisions.',
    );
    expect(reviewSurfaces).toContain('REVIEW_SURFACE_PROOF_REQUIRED_NOTICE');
    expect(reviewSurfaces).toContain(
      'Proof-required states remain blocked until the linked local blueprint artifact is valid; placeholder, inferred, or silently repaired proof state never counts as sufficient.',
    );
    expect(reviewSurfaces).toContain('REVIEW_SURFACE_FALSE_POSITIVE_NOTICE');
    expect(reviewSurfaces).toContain(
      'False-positive candidates are advisory only. They do not rewrite audit history, demote recorded decisions, or weaken the enforcement floor.',
    );
    expect(readme).toContain('Review surfaces');
    expect(architecture).toContain(
      'review-surface wording remains descriptive or advisory only',
    );
    expect(testing).toContain(
      'enforcement-related review-surface wording must remain governance-anchored',
    );
  });

  it('anchors the Phase 7.3 identity freeze without command-id migration or control-plane implication', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
    ) as {
      name: string;
      displayName: string;
      description: string;
      contributes?: { commands?: Array<{ command: string; title: string }> };
    };
    const architecture = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );
    const testing = fs.readFileSync(
      path.join(projectRoot, 'docs', 'TESTING.md'),
      'utf8',
    );

    const commands = packageJson.contributes?.commands ?? [];

    expect(packageJson.name).toBe('arc-audit-ready-core');
    expect(packageJson.displayName).toBe('ARC XT — Audit Ready Core');
    expect(packageJson.description).toContain('Governed code enforcement');
    expect(commands).toEqual(
      expect.arrayContaining([
        { command: 'arc.reviewAudit', title: 'ARC XT: Review Audit Log' },
        {
          command: 'arc.showRuntimeStatus',
          title: 'ARC XT: Show Active Workspace Status',
        },
        {
          command: 'arc.reviewBlueprints',
          title: 'ARC XT: Review Blueprint Proofs',
        },
        {
          command: 'arc.reviewFalsePositives',
          title: 'ARC XT: Review False-Positive Candidates',
        },
      ]),
    );
    expect(architecture).toContain(
      'command ids remain `lintel.*` until a separately approved package authorizes migration',
    );
    expect(testing).toContain(
      'user-facing command titles may change, but command ids must remain `lintel.*`',
    );
    expect(testing).toContain(
      'ARC XT naming must not imply ARC Console coupling, Vault dependency, cloud readiness, or broader runtime authority',
    );
  });

  it('defines a local audit visibility cli script without mutation commands or remote endpoints', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
    ) as {
      scripts?: Record<string, string>;
    };
    const cliSource = fs.readFileSync(
      path.join(projectRoot, 'src', 'cli.ts'),
      'utf8',
    );

    expect(packageJson.scripts?.['audit:cli']).toBe('node ./dist/cli.js');
    expect(cliSource).toContain('query');
    expect(cliSource).toContain('trace-directive');
    expect(cliSource).toContain('trace-route');
    expect(cliSource).toContain('perf');
    expect(cliSource).toContain('verify');
    expect(cliSource).toContain('export');
    expect(cliSource).not.toMatch(/\b(delete|repair|rewrite|rotate)\b/);
    expect(cliSource).not.toMatch(/https?:\/\//);
    expect(cliSource).not.toContain('fetch(');
  });

  it('keeps Vault-ready export local-only and free of direct transport clients', () => {
    const visibilitySource = fs.readFileSync(
      path.join(projectRoot, 'src', 'core', 'auditVisibility.ts'),
      'utf8',
    );

    expect(visibilitySource).toContain('phase-6.7-v1');
    expect(visibilitySource).toContain('LINTEL_VAULT_READY_EXPORT');
    expect(visibilitySource).toContain(
      "allowed_destinations: ['stdout', 'local_file']",
    );
    expect(visibilitySource).not.toMatch(/https?:\/\//);
    expect(visibilitySource).not.toContain('fetch(');
    expect(visibilitySource).not.toContain('writeFileSync(');
  });

  it('keeps Context Bus packet construction bounded and free of retrieval or file-read behavior', () => {
    const packetSource = fs.readFileSync(
      path.join(projectRoot, 'src', 'core', 'contextPacket.ts'),
      'utf8',
    );

    expect(packetSource).toContain('DEFAULT_AUTHORITY_TAG');
    expect(packetSource).toContain('DEFAULT_DATA_CLASS');
    expect(packetSource).toContain('DEFAULT_SENSITIVITY_MARKER');
    expect(packetSource).not.toContain('input.text');
    expect(packetSource).not.toMatch(/readFile|readdir|fs\./);
    expect(packetSource).not.toContain('fetch(');
    expect(packetSource).not.toMatch(/https?:\/\//);
  });

  it('keeps router shell plumbing single-path and free of direct adapter invocation', () => {
    const routerSource = fs.readFileSync(
      path.join(projectRoot, 'src', 'core', 'routerPolicy.ts'),
      'utf8',
    );

    expect(routerSource).toContain('RouterShell');
    expect(routerSource).toContain('LOCAL_PREFERRED');
    expect(routerSource).toContain('CLOUD_ASSISTED');
    expect(routerSource).toContain('AUTO_SAVE_BLOCKED');
    expect(routerSource).not.toContain('fetch(');
    expect(routerSource).not.toMatch(/https?:\/\//);
    expect(routerSource).not.toContain('new OllamaModelAdapter');
    expect(routerSource).not.toContain('new CloudModelAdapter');
  });

  it('keeps the decision floor logic unchanged and the cloud adapter provider-agnostic', () => {
    const decisionPolicy = fs.readFileSync(
      path.join(projectRoot, 'src', 'core', 'decisionPolicy.ts'),
      'utf8',
    );
    const modelAdapter = fs.readFileSync(
      path.join(projectRoot, 'src', 'adapters', 'modelAdapter.ts'),
      'utf8',
    );

    expect(decisionPolicy).toContain('const minimumFloor = stricterDecision(');
    expect(decisionPolicy).toContain(
      'const decision = stricterDecision(modelDecision.decision, minimumFloor)',
    );
    expect(modelAdapter).toContain('http://127.0.0.1:11434/api/generate');
    expect(modelAdapter).toContain('class CloudModelAdapter');
    expect(modelAdapter).not.toContain('api.openai.com');
    expect(new CloudModelAdapter().enabledByDefault).toBe(false);
  });
});
