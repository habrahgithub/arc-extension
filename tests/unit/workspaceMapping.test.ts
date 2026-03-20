import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WorkspaceMappingStore } from '../../src/core/workspaceMapping';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-mapping-'));
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

describe('workspace mapping store', () => {
  it('loads local-only mappings when the schema is valid', () => {
    const workspace = makeWorkspace();
    const arcDir = path.join(workspace, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });
    fs.writeFileSync(
      path.join(arcDir, 'workspace-map.json'),
      JSON.stringify({
        mode: 'LOCAL_ONLY',
        ui_segments: ['panels'],
        rules: [
          {
            id: 'workspace-security-auth',
            riskFlag: 'AUTH_CHANGE',
            scope: 'PATH_SEGMENT_MATCH',
            severity: 'HIGH',
            decisionFloor: 'REQUIRE_PLAN',
            reason: 'Treat security as auth-sensitive.',
            matchers: [{ type: 'PATH_SEGMENT_MATCH', value: 'security' }],
          },
        ],
      }),
      'utf8',
    );

    const resolution = new WorkspaceMappingStore(workspace).load();

    expect(resolution.status).toBe('LOADED');
    expect(resolution.uiSegments).toContain('panels');
    expect(resolution.rules).toHaveLength(1);
  });

  it('hard-stops unsupported shared/team mapping modes', () => {
    const workspace = makeWorkspace();
    const arcDir = path.join(workspace, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });
    fs.writeFileSync(
      path.join(arcDir, 'workspace-map.json'),
      JSON.stringify({ mode: 'TEAM_SHARED', rules: [] }),
      'utf8',
    );

    const resolution = new WorkspaceMappingStore(workspace).load();

    expect(resolution.status).toBe('UNAUTHORIZED_MODE');
    expect(resolution.reason).toContain('not authorized');
  });
});
