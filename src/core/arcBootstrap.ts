import fs from 'node:fs';
import path from 'node:path';

export interface BootstrapResult {
  success: boolean;
  filesCreated: string[];
  filesSkipped: string[];
  error?: string;
}

export interface BootstrapOptions {
  workspaceRoot: string;
  overwriteExisting?: boolean;
}

const ARC_DIR = '.arc';
const ROUTER_CONFIG = 'router.json';
const WORKSPACE_MAP = 'workspace-map.json';

export function getDefaultRouterConfig(): Record<string, unknown> {
  return {
    mode: 'RULE_ONLY',
    local_lane_enabled: false,
    cloud_lane_enabled: false,
    governance_mode: 'ENFORCE',
  };
}

export function getDefaultWorkspaceMap(): Record<string, unknown> {
  return {
    mode: 'LOCAL_ONLY',
    ui_segments: [],
    rules: [],
  };
}

export function createMinimalArcConfig(
  options: BootstrapOptions,
): BootstrapResult {
  const result: BootstrapResult = {
    success: false,
    filesCreated: [],
    filesSkipped: [],
  };

  try {
    const arcDir = path.join(options.workspaceRoot, ARC_DIR);

    // Create .arc directory if it doesn't exist
    if (!fs.existsSync(arcDir)) {
      fs.mkdirSync(arcDir, { recursive: true });

      // Create .gitignore for .arc directory
      const gitignorePath = path.join(arcDir, '.gitignore');
      fs.writeFileSync(
        gitignorePath,
        'audit.jsonl\narchive/\nperf.jsonl\naudit.sqlite3\n',
        'utf8',
      );
    }

    // Create router.json if it doesn't exist
    const routerPath = path.join(arcDir, ROUTER_CONFIG);
    if (fs.existsSync(routerPath) && !options.overwriteExisting) {
      result.filesSkipped.push(routerPath);
    } else {
      fs.writeFileSync(
        routerPath,
        JSON.stringify(getDefaultRouterConfig(), null, 2) + '\n',
        'utf8',
      );
      result.filesCreated.push(routerPath);
    }

    // Create workspace-map.json if it doesn't exist
    const mapPath = path.join(arcDir, WORKSPACE_MAP);
    if (fs.existsSync(mapPath) && !options.overwriteExisting) {
      result.filesSkipped.push(mapPath);
    } else {
      fs.writeFileSync(
        mapPath,
        JSON.stringify(getDefaultWorkspaceMap(), null, 2) + '\n',
        'utf8',
      );
      result.filesCreated.push(mapPath);
    }

    result.success = true;
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    result.success = false;
  }

  return result;
}

export function ensureArcBlueprintsDir(workspaceRoot: string): string {
  const blueprintsDir = path.join(workspaceRoot, ARC_DIR, 'blueprints');
  if (!fs.existsSync(blueprintsDir)) {
    fs.mkdirSync(blueprintsDir, { recursive: true });
  }
  return blueprintsDir;
}

export function generateBlueprintTemplate(
  workspaceRoot: string,
  directiveId: string,
  projectName?: string,
): string {
  const project = projectName || path.basename(workspaceRoot);

  return `# ${directiveId} — ${project} Change

**Directive ID:** ${directiveId}
**Project:** ${project}
**Status:** DRAFT
**Date Created:** ${new Date().toISOString()}

## Objective

> Describe the purpose of this governed change. What problem does this solve?

## Scope

### In scope
- List what files, paths, or surfaces are affected by this change
- Keep scope bounded and specific

### Out of scope
- List what is explicitly NOT covered by this directive

## Risk Assessment

- **Risk Level:** (Low / Medium / High)
- **Protected surfaces affected:** (auth / config / infra / none)
- **Expected behavior change:** (describe briefly)

## Verification

- [ ] Build passes
- [ ] Tests pass
- [ ] No new lint warnings
- [ ] Audit log shows governed decision

## Notes

- Blueprint template — replace this placeholder with actual content
- This blueprint is incomplete until all sections are filled
- Template creation does not count as authorization

---

**End of ${directiveId}**
`;
}

export function generateGuidedRootId(
  candidates: Array<{ path: string }>,
): string {
  if (candidates.length === 0) return 'WORKSPACE-ROOT-001';
  const baseName = path.basename(candidates[0].path);
  const slug = baseName.toUpperCase().replace(/[^A-Z0-9]/g, '-');
  return `${slug}-ROOT-001`;
}

export function generateBlueprintDirectiveId(projectName?: string): string {
  const base = projectName
    ? projectName.toUpperCase().replace(/[^A-Z0-9]/g, '-')
    : 'WORKSPACE';
  return `${base}-CHG-001`;
}
