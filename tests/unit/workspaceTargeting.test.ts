import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveWorkspaceTarget } from '../../src/extension/workspaceTargeting';

describe('resolveWorkspaceTarget', () => {
  it('prefers the nearest nested boundary inside the workspace folder', () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-target-'));
    const nested = path.join(workspace, 'projects', 'demo');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(nested, '.git'), 'gitdir: mock\n', 'utf8');
    const filePath = path.join(nested, 'src', 'auth', 'session.ts');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'export const session = true;\n', 'utf8');

    const target = resolveWorkspaceTarget(filePath, [workspace], path.join(workspace, '.fallback'));

    expect(target.workspaceFolderRoot).toBe(workspace);
    expect(target.effectiveRoot).toBe(nested);
    expect(target.reason).toBe('NESTED_BOUNDARY');
    expect(target.markers).toContain('.git');
  });

  it('falls back to the workspace folder when no nested boundary exists', () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-target-'));
    const filePath = path.join(workspace, 'docs', 'README.md');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '# docs\n', 'utf8');

    const target = resolveWorkspaceTarget(filePath, [workspace], path.join(workspace, '.fallback'));

    expect(target.effectiveRoot).toBe(workspace);
    expect(target.reason).toBe('WORKSPACE_FOLDER');
  });

  it('uses the fallback root when the file is outside any workspace folder', () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-target-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-outside-'));
    const fallback = path.join(workspace, '.fallback');
    fs.mkdirSync(fallback, { recursive: true });
    const filePath = path.join(outside, 'test.ts');
    fs.writeFileSync(filePath, 'export const outside = true;\n', 'utf8');

    const target = resolveWorkspaceTarget(filePath, [workspace], fallback);

    expect(target.effectiveRoot).toBe(fallback);
    expect(target.reason).toBe('GLOBAL_FALLBACK');
  });
});
