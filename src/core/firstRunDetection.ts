import fs from 'node:fs';
import path from 'node:path';

export interface FirstRunState {
  isFirstRun: boolean;
  hasArcConfig: boolean;
  hasBlueprints: boolean;
  governedRoot: string;
  candidates: CandidateRoot[];
}

export interface CandidateRoot {
  path: string;
  markers: string[];
  hasArc: boolean;
  hasBlueprints: boolean;
}

const ARC_DIR = '.arc';
const ROUTER_CONFIG = 'router.json';
const BLUEPRINTS_DIR = 'blueprints';

function findCandidateRoots(startDir: string, maxDepth = 3): CandidateRoot[] {
  const candidates: CandidateRoot[] = [];
  const visited = new Set<string>();
  const queue: { dir: string; depth: number }[] = [{ dir: startDir, depth: 0 }];

  while (queue.length > 0) {
    const { dir, depth } = queue.shift()!;
    if (visited.has(dir) || depth > maxDepth) continue;
    visited.add(dir);

    const hasArc = fs.existsSync(path.join(dir, ARC_DIR));
    const arcDir = path.join(dir, ARC_DIR);
    const hasBlueprints =
      hasArc && fs.existsSync(path.join(arcDir, BLUEPRINTS_DIR));
    const markers = [];

    if (hasArc) markers.push('.arc');
    if (fs.existsSync(path.join(dir, '.git'))) markers.push('.git');
    if (fs.existsSync(path.join(dir, 'package.json')))
      markers.push('package.json');
    if (fs.existsSync(path.join(dir, 'tsconfig.json')))
      markers.push('tsconfig.json');

    if (markers.length > 0) {
      candidates.push({ path: dir, markers, hasArc, hasBlueprints });
    }

    // Scan subdirectories for nested roots
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          !entry.name.startsWith('.') &&
          entry.name !== 'node_modules'
        ) {
          queue.push({ dir: path.join(dir, entry.name), depth: depth + 1 });
        }
      }
    } catch {
      // Permission denied — skip this directory
    }
  }

  return candidates;
}

export function detectFirstRunState(
  workspaceRoot: string,
  activeFilePath?: string,
): FirstRunState {
  // Determine the primary search root
  const searchRoot = activeFilePath
    ? path.dirname(activeFilePath)
    : workspaceRoot;

  const candidates = findCandidateRoots(searchRoot);
  const primaryRoot = candidates[0]?.path ?? workspaceRoot;
  const arcDir = path.join(primaryRoot, ARC_DIR);

  const hasArcConfig = fs.existsSync(path.join(arcDir, ROUTER_CONFIG));
  const blueprintsDirPath = path.join(arcDir, BLUEPRINTS_DIR);
  const hasBlueprintsDir = fs.existsSync(blueprintsDirPath);

  // Count blueprint files in the blueprints subdirectory
  let blueprintCount = 0;
  if (hasBlueprintsDir) {
    try {
      const bpFiles = fs.readdirSync(blueprintsDirPath);
      blueprintCount = bpFiles.filter(
        (f) => f.endsWith('.md') || f.endsWith('.json'),
      ).length;
    } catch {
      blueprintCount = 0;
    }
  }

  // First run is when no .arc directory exists or it's empty
  const isFirstRun = !hasArcConfig && blueprintCount === 0;

  return {
    isFirstRun,
    hasArcConfig,
    hasBlueprints: blueprintCount > 0,
    governedRoot: primaryRoot,
    candidates,
  };
}

export function generateGuidedRootId(candidates: CandidateRoot[]): string {
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
