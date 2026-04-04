import fs from 'node:fs';
import path from 'node:path';

export type WorkspaceTargetReason =
  | 'NESTED_BOUNDARY'
  | 'RETAINED_ROOT'
  | 'WORKSPACE_FOLDER'
  | 'GLOBAL_FALLBACK';

export interface WorkspaceTargetResolution {
  filePath?: string;
  workspaceFolderRoot: string;
  effectiveRoot: string;
  reason: WorkspaceTargetReason;
  markers: string[];
}

export interface ResolveWorkspaceTargetOptions {
  retainedRoot?: string;
}

function isWithin(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function hasBoundaryMarker(candidate: string): string[] {
  const markers: string[] = [];

  if (fs.existsSync(path.join(candidate, '.arc'))) {
    markers.push('.arc');
  }
  if (fs.existsSync(path.join(candidate, '.git'))) {
    markers.push('.git');
  }
  if (fs.existsSync(path.join(candidate, 'package.json'))) {
    markers.push('package.json');
  }

  return markers;
}

export function resolveWorkspaceTarget(
  filePath: string | undefined,
  workspaceFolderRoots: string[],
  fallbackRoot: string,
  options: ResolveWorkspaceTargetOptions = {},
): WorkspaceTargetResolution {
  if (!filePath) {
    if (options.retainedRoot && shouldReuseRetainedRoot(options.retainedRoot, workspaceFolderRoots)) {
      const workspaceFolderRoot = resolveWorkspaceFolderRoot(
        options.retainedRoot,
        workspaceFolderRoots,
        fallbackRoot,
      );

      return {
        filePath,
        workspaceFolderRoot,
        effectiveRoot: options.retainedRoot,
        reason: 'RETAINED_ROOT',
        markers: hasBoundaryMarker(options.retainedRoot),
      };
    }

    const root = workspaceFolderRoots[0] ?? fallbackRoot;
    return {
      filePath,
      workspaceFolderRoot: root,
      effectiveRoot: root,
      reason: workspaceFolderRoots.length > 0 ? 'WORKSPACE_FOLDER' : 'GLOBAL_FALLBACK',
      markers: hasBoundaryMarker(root),
    };
  }

  const containingRoots = workspaceFolderRoots
    .filter((root) => isWithin(root, filePath))
    .sort((left, right) => right.length - left.length);
  const workspaceFolderRoot = containingRoots[0] ?? fallbackRoot;

  if (!containingRoots[0]) {
    return {
      filePath,
      workspaceFolderRoot,
      effectiveRoot: fallbackRoot,
      reason: 'GLOBAL_FALLBACK',
      markers: hasBoundaryMarker(fallbackRoot),
    };
  }

  let cursor = path.dirname(filePath);
  while (isWithin(workspaceFolderRoot, cursor)) {
    const markers = hasBoundaryMarker(cursor);
    if (cursor !== workspaceFolderRoot && markers.length > 0) {
      return {
        filePath,
        workspaceFolderRoot,
        effectiveRoot: cursor,
        reason: 'NESTED_BOUNDARY',
        markers,
      };
    }

    if (cursor === workspaceFolderRoot) {
      break;
    }

    const parent = path.dirname(cursor);
    if (parent === cursor) {
      break;
    }
    cursor = parent;
  }

  return {
    filePath,
    workspaceFolderRoot,
    effectiveRoot: workspaceFolderRoot,
    reason: 'WORKSPACE_FOLDER',
    markers: hasBoundaryMarker(workspaceFolderRoot),
  };
}

function resolveWorkspaceFolderRoot(
  candidateRoot: string,
  workspaceFolderRoots: string[],
  fallbackRoot: string,
): string {
  const containingRoots = workspaceFolderRoots
    .filter((root) => isWithin(root, candidateRoot))
    .sort((left, right) => right.length - left.length);

  return containingRoots[0] ?? fallbackRoot;
}

function shouldReuseRetainedRoot(
  retainedRoot: string,
  workspaceFolderRoots: string[],
): boolean {
  if (!fs.existsSync(retainedRoot)) {
    return false;
  }

  if (workspaceFolderRoots.length === 0) {
    return true;
  }

  return workspaceFolderRoots.some((root) => isWithin(root, retainedRoot));
}
