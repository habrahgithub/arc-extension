import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { detectFirstRunState } from '../../src/core/firstRunDetection';
import {
  createMinimalArcConfig,
  generateBlueprintTemplate,
  generateBlueprintDirectiveId,
  ensureArcBlueprintsDir,
  getDefaultRouterConfig,
} from '../../src/core/arcBootstrap';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-bootstrap-'));
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

describe('U01 — First-run detection with no .arc config', () => {
  it('detects first-run when .arc directory does not exist', () => {
    const ws = makeWorkspace();
    const state = detectFirstRunState(ws);

    expect(state.isFirstRun).toBe(true);
    expect(state.hasArcConfig).toBe(false);
    expect(state.hasBlueprints).toBe(false);
    expect(state.governedRoot).toBe(ws);
  });

  it('detects first-run when .arc exists but has no config or blueprints', () => {
    const ws = makeWorkspace();
    const arcDir = path.join(ws, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });

    const state = detectFirstRunState(ws);

    expect(state.isFirstRun).toBe(true);
    expect(state.hasArcConfig).toBe(false);
    expect(state.hasBlueprints).toBe(false);
  });
});

describe('U02 — First-run with existing .arc config', () => {
  it('detects not first-run when router.json exists', () => {
    const ws = makeWorkspace();
    const arcDir = path.join(ws, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });
    fs.writeFileSync(
      path.join(arcDir, 'router.json'),
      JSON.stringify({ mode: 'RULE_ONLY' }),
      'utf8',
    );

    const state = detectFirstRunState(ws);

    expect(state.isFirstRun).toBe(false);
    expect(state.hasArcConfig).toBe(true);
  });

  it('detects not first-run when blueprints exist', () => {
    const ws = makeWorkspace();
    const arcDir = path.join(ws, '.arc');
    const blueprintsDir = path.join(arcDir, 'blueprints');
    fs.mkdirSync(blueprintsDir, { recursive: true });
    fs.writeFileSync(path.join(blueprintsDir, 'test.md'), '# Test', 'utf8');

    const state = detectFirstRunState(ws);

    expect(state.isFirstRun).toBe(false);
    expect(state.hasBlueprints).toBe(true);
  });
});

describe('U03 — Root ambiguity in nested repo layout', () => {
  it('identifies candidate roots with different markers', () => {
    const ws = makeWorkspace();

    // Create nested project structure
    const nestedProject = path.join(ws, 'nested-project');
    fs.mkdirSync(path.join(nestedProject, '.git'), { recursive: true });
    fs.writeFileSync(path.join(nestedProject, 'package.json'), '{}', 'utf8');

    // Create .arc in workspace root
    const arcDir = path.join(ws, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });

    const state = detectFirstRunState(ws);

    expect(state.candidates.length).toBeGreaterThanOrEqual(1);
    expect(state.governedRoot).toBe(ws); // .arc is in workspace root
  });

  it('prefers root with .arc over nested roots without .arc', () => {
    const ws = makeWorkspace();

    // Create nested projects
    const nestedProject = path.join(ws, 'app');
    fs.mkdirSync(path.join(nestedProject, '.git'), { recursive: true });

    // Create .arc in workspace root
    const arcDir = path.join(ws, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });

    const state = detectFirstRunState(ws);

    expect(state.governedRoot).toBe(ws);
    expect(state.hasArcConfig).toBe(false); // .arc dir exists but no config yet
  });
});

describe('U04 — Safe config bootstrap', () => {
  it('creates router.json with fail-closed defaults', () => {
    const ws = makeWorkspace();
    const result = createMinimalArcConfig({
      workspaceRoot: ws,
      overwriteExisting: false,
    });

    expect(result.success).toBe(true);
    expect(result.filesCreated.length).toBeGreaterThan(0);

    const routerPath = path.join(ws, '.arc', 'router.json');
    expect(fs.existsSync(routerPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(routerPath, 'utf8')) as Record<
      string,
      unknown
    >;
    expect(config.mode).toBe('RULE_ONLY');
    expect(config.local_lane_enabled).toBe(false);
    expect(config.cloud_lane_enabled).toBe(false);
  });

  it('creates workspace-map.json with LOCAL_ONLY default', () => {
    const ws = makeWorkspace();
    const result = createMinimalArcConfig({
      workspaceRoot: ws,
      overwriteExisting: false,
    });

    expect(result.success).toBe(true);

    const mapPath = path.join(ws, '.arc', 'workspace-map.json');
    expect(fs.existsSync(mapPath)).toBe(true);

    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8')) as Record<
      string,
      unknown
    >;
    expect(map.mode).toBe('LOCAL_ONLY');
  });

  it('does not overwrite existing config without explicit flag', () => {
    const ws = makeWorkspace();
    const arcDir = path.join(ws, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });
    const existingConfig = { mode: 'CUSTOM_MODE' };
    fs.writeFileSync(
      path.join(arcDir, 'router.json'),
      JSON.stringify(existingConfig),
      'utf8',
    );

    const result = createMinimalArcConfig({
      workspaceRoot: ws,
      overwriteExisting: false,
    });

    expect(result.filesSkipped.length).toBeGreaterThan(0);
    const config = JSON.parse(
      fs.readFileSync(path.join(arcDir, 'router.json'), 'utf8'),
    ) as Record<string, unknown>;
    expect(config.mode).toBe('CUSTOM_MODE'); // Original preserved
  });
});

describe('U05 — Blueprint template creation', () => {
  it('creates blueprint template with generalized naming', () => {
    const ws = makeWorkspace();
    const directiveId = generateBlueprintDirectiveId('myapp');
    const template = generateBlueprintTemplate(ws, directiveId, 'myapp');

    expect(template).toContain(directiveId);
    expect(template).toContain('## Objective');
    expect(template).toContain('## Scope');
    expect(template).toContain('## Risk Assessment');
    expect(template).toContain('## Verification');
    // Template should NOT contain LINTEL-specific naming
    expect(template).not.toContain('LINTEL');
  });

  it('ensures blueprints directory exists', () => {
    const ws = makeWorkspace();
    const bpDir = ensureArcBlueprintsDir(ws);

    expect(fs.existsSync(bpDir)).toBe(true);
    expect(bpDir).toBe(path.join(ws, '.arc', 'blueprints'));
  });

  it('generates directive IDs from project name', () => {
    expect(generateBlueprintDirectiveId('myapp')).toBe('MYAPP-CHG-001');
    expect(generateBlueprintDirectiveId('auth-service')).toBe(
      'AUTH-SERVICE-CHG-001',
    );
    expect(generateBlueprintDirectiveId()).toBe('WORKSPACE-CHG-001');
  });
});

describe('U06 — Fail-closed defaults preservation', () => {
  it('getDefaultRouterConfig returns fail-closed posture', () => {
    const config = getDefaultRouterConfig();

    expect(config.mode).toBe('RULE_ONLY');
    expect(config.local_lane_enabled).toBe(false);
    expect(config.cloud_lane_enabled).toBe(false);
    expect(config.governance_mode).toBe('ENFORCE');
  });

  it('bootstrap never enables model lanes', () => {
    const ws = makeWorkspace();
    createMinimalArcConfig({ workspaceRoot: ws, overwriteExisting: false });

    const routerPath = path.join(ws, '.arc', 'router.json');
    const config = JSON.parse(fs.readFileSync(routerPath, 'utf8')) as Record<
      string,
      unknown
    >;

    expect(config.local_lane_enabled).toBe(false);
    expect(config.cloud_lane_enabled).toBe(false);
  });
});
