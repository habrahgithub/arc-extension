/**
 * ARCXT-MVG-001 — Milestone 3: Layer Leak Detector
 *
 * Scans import statements in a single file for upper→lower layer violations.
 * Regex-based (not AST). One rule only: upper layer must not import lower layer directly.
 *
 * Constraint: local-only, read-only, advisory — does not modify files.
 */

import * as path from 'node:path';
import type { FingerprintResult, LayerDriftItem } from '../contracts/types';
import { UPPER_LAYER_DIRS, LOWER_LAYER_DIRS } from './architectureFingerprint';

/** Matches `from 'specifier'` at the end of import/require statements */
const IMPORT_RE = /\bfrom\s+['"]([^'"]+)['"]/g;

export interface DetectorResult {
  hasViolation: boolean;
  item?: LayerDriftItem;
}

/**
 * Given a file path, returns the architecture layer it belongs to.
 * Returns null if the path doesn't match any known layer.
 */
function classifyLayer(filePath: string): 'upper' | 'lower' | 'service' | null {
  const segments = filePath.split(/[/\\]/).map((s) => s.toLowerCase());
  for (const seg of segments) {
    if (UPPER_LAYER_DIRS.has(seg)) return 'upper';
    if (LOWER_LAYER_DIRS.has(seg)) return 'lower';
  }
  return null;
}

/**
 * Resolves a potentially relative import specifier to an absolute-ish path
 * relative to the workspace root for layer classification purposes.
 */
function resolveImportLayer(
  importSpecifier: string,
  originFile: string,
): 'upper' | 'lower' | 'service' | null {
  if (importSpecifier.startsWith('.')) {
    const dir = path.dirname(originFile);
    const resolved = path.join(dir, importSpecifier).split('\\').join('/');
    return classifyLayer(resolved);
  }
  // bare module specifier — classify by path segments
  return classifyLayer(importSpecifier);
}

/**
 * Scan a single file for layer leakage violations.
 * Only fires on upper→lower direct import (bypassing service layer).
 */
export function detectLayerLeak(
  filePath: string,
  fileContent: string,
): DetectorResult {
  const originLayer = classifyLayer(filePath);
  if (originLayer !== 'upper') {
    return { hasViolation: false };
  }

  const matches = [...fileContent.matchAll(IMPORT_RE)];
  for (const match of matches) {
    const specifier = match[1];
    if (!specifier) continue;

    const targetLayer = resolveImportLayer(specifier, filePath);
    if (targetLayer === 'lower') {
      const originBase = path.basename(path.dirname(filePath)) + '/' + path.basename(filePath);
      const targetBase = specifier.includes('/')
        ? specifier.split('/').slice(-2).join('/')
        : specifier;

      const item: LayerDriftItem = {
        id: `DRIFT-${Date.now()}`,
        symbol: '⚠',
        originFile: originBase,
        targetFile: targetBase,
        relationship: 'direct_import',
        why: 'Upper layer importing lower layer directly — service layer bypassed',
        detectedAt: new Date().toISOString(),
        resolved: false,
      };
      return { hasViolation: true, item };
    }
  }

  return { hasViolation: false };
}

/**
 * Build a simulation drift item using real detected folder names.
 * Used during the 30s first-session simulation window.
 */
export function buildSimulationDrift(fingerprint: FingerprintResult): LayerDriftItem {
  const folders = fingerprint.detectedFolders;
  const upperFolder = folders.find((f) => UPPER_LAYER_DIRS.has(f)) ?? 'components';
  const lowerFolder = folders.find((f) => LOWER_LAYER_DIRS.has(f)) ?? 'entities';

  return {
    id: `DRIFT-SIM-001`,
    symbol: '⚠',
    originFile: `${upperFolder}/Dashboard.tsx`,
    targetFile: `${lowerFolder}/UserEntity.ts`,
    relationship: 'direct_import',
    why: 'Upper layer importing lower layer directly — service layer bypassed (simulation)',
    detectedAt: new Date().toISOString(),
    resolved: false,
  };
}
