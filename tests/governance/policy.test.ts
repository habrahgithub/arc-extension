import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CloudModelAdapter, DisabledModelAdapter, OllamaModelAdapter } from '../../src/adapters/modelAdapter';

const projectRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
);

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

  it('documents that audit verification is file-level only', () => {
    const docs = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );

    expect(docs).toContain('file-level integrity only');
  });

  it('documents that shared/team blueprint handling and model activation stay out of scope', () => {
    const readme = fs.readFileSync(path.join(projectRoot, 'README.md'), 'utf8');
    const architecture = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );

    expect(readme).toContain('shared/team blueprint handling remains unauthorized');
    expect(architecture).toContain('Local-model activation in Phase 6.6 is bounded to the local lane only');
  });

  it('documents RULE_ONLY defaults and no ARC/Vault save-path dependency for Phase 6.0', () => {
    const readme = fs.readFileSync(path.join(projectRoot, 'README.md'), 'utf8');
    const architecture = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );

    expect(readme).toContain('RULE_ONLY');
    expect(readme).toContain('ARC Console and Vault are not runtime save-path dependencies');
    expect(architecture).toContain('The default route mode is `RULE_ONLY`.');
    expect(architecture).toContain('ARC Console and Vault are not runtime save-path dependencies.');
  });

  it('documents Lease v2 invalidation and the carried-forward Warden gate for non-default trust-boundary values', () => {
    const readme = fs.readFileSync(path.join(projectRoot, 'README.md'), 'utf8');
    const architecture = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );
    const testing = fs.readFileSync(
      path.join(projectRoot, 'docs', 'TESTING.md'),
      'utf8',
    );

    expect(readme).toContain('Lease v2');
    expect(readme).toContain('CLOUD_ELIGIBLE');
    expect(architecture).toContain('route-policy hash and route signature');
    expect(testing).toContain('route-policy hash invalidation');
  });

  it('documents the Phase 6.2 audit visibility cli as read-only/export-only and local-only', () => {
    const readme = fs.readFileSync(path.join(projectRoot, 'README.md'), 'utf8');
    const architecture = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );
    const testing = fs.readFileSync(
      path.join(projectRoot, 'docs', 'TESTING.md'),
      'utf8',
    );

    expect(readme).toContain('Audit Visibility CLI');
    expect(readme).toContain('read-only / export-only');
    expect(readme).toContain('.arc/audit.jsonl');
    expect(architecture).toContain('Vault-ready export bundles are local handoff only');
    expect(architecture).toContain('CLI failure must not weaken or block save enforcement');
    expect(testing).toContain('CLI export contract correctness');
  });

  it('documents Context Bus v1 hardening as bounded, inert, and RULE_ONLY in Phase 6.3', () => {
    const readme = fs.readFileSync(path.join(projectRoot, 'README.md'), 'utf8');
    const architecture = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );
    const testing = fs.readFileSync(
      path.join(projectRoot, 'docs', 'TESTING.md'),
      'utf8',
    );

    expect(readme).toContain('Context Bus v1 contract hardening');
    expect(readme).toContain('authority_tag');
    expect(readme).toContain('LOCAL_ONLY');
    expect(architecture).toContain('authority_tag` must be locally asserted by trusted code');
    expect(architecture).toContain('packet presence is not a routing activation signal');
    expect(testing).toContain('Context Bus packet validation');
  });

  it('documents the router shell baseline as single-path, fail-closed, and rule-floor preserving', () => {
    const readme = fs.readFileSync(path.join(projectRoot, 'README.md'), 'utf8');
    const architecture = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );
    const testing = fs.readFileSync(
      path.join(projectRoot, 'docs', 'TESTING.md'),
      'utf8',
    );

    expect(readme).toContain('router shell');
    expect(architecture).toContain('single authoritative source');
    expect(architecture).toContain('must never weaken the enforcement floor');
    expect(testing).toContain('router shell insertion without decision drift');
  });

  it('documents Phase 6.6 local-lane and cloud fallback activation boundaries', () => {
    const readme = fs.readFileSync(path.join(projectRoot, 'README.md'), 'utf8');
    const architecture = fs.readFileSync(
      path.join(projectRoot, 'docs', 'ARCHITECTURE.md'),
      'utf8',
    );
    const testing = fs.readFileSync(
      path.join(projectRoot, 'docs', 'TESTING.md'),
      'utf8',
    );

    expect(readme).toContain('Phase 6.6');
    expect(readme).toContain('LOCAL_PREFERRED');
    expect(readme).toContain('CLOUD_ASSISTED');
    expect(readme).toContain('lab-only');
    expect(architecture).toContain('`LOCAL_PREFERRED` is local-only');
    expect(architecture).toContain('`CLOUD_ASSISTED` may be accepted only when `local_lane_enabled: true` and `cloud_lane_enabled: true`');
    expect(architecture).toContain('auto-save assessments fail closed to `RULE_ONLY`');
    expect(testing).toContain('cloud fallback gate');
    expect(testing).toContain('cloud fallback must occur only after approved local fallback states');
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
      contributes?: { commands?: Array<{ command: string }> };
    };

    const commands =
      packageJson.contributes?.commands?.map((entry) => entry.command) ?? [];

    expect(commands).toContain('lintel.reviewAudit');
    expect(commands).toContain('lintel.reviewBlueprints');
    expect(commands).toContain('lintel.reviewFalsePositives');
  });

  it('defines a local audit visibility cli script without mutation commands or remote endpoints', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
    ) as {
      scripts?: Record<string, string>;
    };
    const cliSource = fs.readFileSync(path.join(projectRoot, 'src', 'cli.ts'), 'utf8');

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
    expect(decisionPolicy).toContain('const decision = stricterDecision(modelDecision.decision, minimumFloor)');
    expect(modelAdapter).toContain('http://127.0.0.1:11434/api/generate');
    expect(modelAdapter).toContain('class CloudModelAdapter');
    expect(modelAdapter).not.toContain('api.openai.com');
    expect(new CloudModelAdapter().enabledByDefault).toBe(false);
  });
});
