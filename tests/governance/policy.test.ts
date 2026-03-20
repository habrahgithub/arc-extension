import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DisabledModelAdapter, OllamaModelAdapter } from '../../src/adapters/modelAdapter';

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

    expect(contents).not.toMatch(/https:\/\//);
    expect(contents).toContain('http://127.0.0.1:11434');
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
    expect(architecture).toContain('Local-model activation remains out of scope');
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
});
