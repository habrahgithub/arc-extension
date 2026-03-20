import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  BlueprintArtifactStore,
  MIN_SECTION_BODY_LENGTH,
} from '../../src/core/blueprintArtifacts';
import {
  createBlueprintArtifact,
  createIncompleteBlueprintArtifact,
  createMalformedBlueprintArtifact,
  fixtureDirectiveIds,
} from '../fixtures/blueprints';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-blueprints-'));
  workspaces.push(workspace);
  return workspace;
}

afterEach(() => {
  while (workspaces.length > 0) {
    const workspace = workspaces.pop();
    if (workspace) {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }
});

describe('blueprint artifact store', () => {
  it('creates deterministic but incomplete local blueprint templates', () => {
    const workspace = makeWorkspace();
    const store = new BlueprintArtifactStore(workspace);

    const link = store.ensureBlueprintTemplate(fixtureDirectiveIds.valid);
    const contents = fs.readFileSync(link.blueprintPath, 'utf8');

    expect(link.blueprintId).toBe(`.arc/blueprints/${fixtureDirectiveIds.valid}.md`);
    expect(fs.existsSync(link.blueprintPath)).toBe(true);
    expect(contents).toContain('INCOMPLETE_TEMPLATE');
    expect(contents).toContain('[REQUIRED]');
  });

  it('exports the minimum section-body threshold as a named governance constant', () => {
    expect(MIN_SECTION_BODY_LENGTH).toBe(12);
  });

  it('rejects malformed blueprint artifacts', () => {
    const workspace = makeWorkspace();
    const store = new BlueprintArtifactStore(workspace);
    const malformed = createMalformedBlueprintArtifact(workspace);

    const resolution = store.resolveProof({
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: malformed.blueprintId,
    });

    expect(resolution.ok).toBe(false);
    expect(resolution.status).toBe('MALFORMED_ARTIFACT');
  });

  it('rejects incomplete templates until the placeholder content is replaced', () => {
    const workspace = makeWorkspace();
    const store = new BlueprintArtifactStore(workspace);
    const incomplete = createIncompleteBlueprintArtifact(workspace);

    const resolution = store.resolveProof({
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: incomplete.blueprintId,
    });

    expect(resolution.ok).toBe(false);
    expect(resolution.status).toBe('INCOMPLETE_ARTIFACT');
  });

  it('rejects unsupported shared/team blueprint handling', () => {
    const workspace = makeWorkspace();
    const store = new BlueprintArtifactStore(workspace);
    const valid = createBlueprintArtifact(workspace);

    const resolution = store.resolveProof({
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: valid.blueprintId,
      blueprintMode: 'TEAM_SHARED',
    });

    expect(resolution.ok).toBe(false);
    expect(resolution.status).toBe('UNAUTHORIZED_MODE');
    expect(resolution.reason).toContain('Phase 5');
  });

  it('accepts completed local proofs and validates canonical linkage', () => {
    const workspace = makeWorkspace();
    const store = new BlueprintArtifactStore(workspace);
    const valid = createBlueprintArtifact(workspace);

    const resolved = store.resolveProof({
      directiveId: fixtureDirectiveIds.valid,
      blueprintId: valid.blueprintId,
      blueprintMode: 'LOCAL_ONLY',
    });

    expect(resolved.ok).toBe(true);
    expect(resolved.link?.blueprintId).toBe(valid.blueprintId);
  });
});
