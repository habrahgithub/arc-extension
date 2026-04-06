/**
 * ARCXT-MVG-001 — Milestone 1: Architecture Fingerprint Scan
 *
 * Infers likely project architecture pattern from shallow folder/file layout.
 * No heavy indexing. Reads top-level and one level deep only.
 *
 * Constraint: local-only, read-only, advisory — does not authorize saves.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  ArchitecturePattern,
  FingerprintResult,
  PatternConfidence,
} from '../contracts/types';

/** Upper-layer folder names — these should not import lower-layer internals */
export const UPPER_LAYER_DIRS = new Set([
  'components', 'views', 'pages', 'ui', 'screens',
  'routes', 'controllers', 'handlers', 'api',
]);

/** Lower-layer folder names — data/domain internals */
export const LOWER_LAYER_DIRS = new Set([
  'entities', 'models', 'schemas', 'db', 'database',
  'repositories', 'prisma', 'orm',
]);

/** Service/mediation layer */
export const SERVICE_LAYER_DIRS = new Set([
  'services', 'usecases', 'use-cases', 'domain', 'core',
]);

interface FolderPresence {
  upper: string[];
  lower: string[];
  service: string[];
  all: string[];
}

function readTopDirs(root: string): string[] {
  try {
    return fs
      .readdirSync(root)
      .filter((f) => {
        try {
          return fs.statSync(path.join(root, f)).isDirectory() && !f.startsWith('.');
        } catch {
          return false;
        }
      })
      .map((f) => f.toLowerCase());
  } catch {
    return [];
  }
}

function classifyDirs(dirs: string[]): FolderPresence {
  return {
    upper: dirs.filter((d) => UPPER_LAYER_DIRS.has(d)),
    lower: dirs.filter((d) => LOWER_LAYER_DIRS.has(d)),
    service: dirs.filter((d) => SERVICE_LAYER_DIRS.has(d)),
    all: dirs,
  };
}

function derivePattern(p: FolderPresence): {
  pattern: ArchitecturePattern;
  confidence: PatternConfidence;
  label: string;
} {
  const hasService = p.service.length > 0;
  const hasUpper = p.upper.length > 0;
  const hasLower = p.lower.length > 0;

  // service + controller/route + data layer → MVC/layered backend
  if (hasService && p.upper.some((d) => ['routes', 'controllers', 'handlers', 'api'].includes(d)) && hasLower) {
    return { pattern: 'route_service_data', confidence: 'HIGH', label: 'Route-Service-Data Architecture' };
  }
  // service + components → frontend with service layer
  if (hasService && p.upper.some((d) => ['components', 'views', 'pages', 'screens'].includes(d))) {
    return { pattern: 'ui_service_data', confidence: 'HIGH', label: 'UI-Service Architecture' };
  }
  // service layer present
  if (hasService && (hasUpper || hasLower)) {
    return { pattern: 'service_layer_app', confidence: 'MEDIUM', label: 'Service-Layer Architecture' };
  }
  // only upper or lower without service
  if (hasUpper || hasLower) {
    return { pattern: 'service_layer_app', confidence: 'LOW', label: 'Layered Architecture (partial)' };
  }

  return { pattern: 'unknown_structure', confidence: 'LOW', label: 'Unknown Structure' };
}

/**
 * Scan workspace root and return architecture fingerprint.
 * Reads one level deep only.
 */
export function scanArchitecture(workspaceRoot: string): FingerprintResult {
  const dirs = readTopDirs(workspaceRoot);

  // Also check one level deep in common src/ dirs
  const srcDirs = readTopDirs(path.join(workspaceRoot, 'src'));
  const appDirs = readTopDirs(path.join(workspaceRoot, 'app'));
  const allDirs = Array.from(new Set([...dirs, ...srcDirs, ...appDirs]));

  const presence = classifyDirs(allDirs);
  const { pattern, confidence, label } = derivePattern(presence);

  return {
    pattern,
    confidence,
    label,
    detectedFolders: [
      ...presence.upper,
      ...presence.service,
      ...presence.lower,
    ].slice(0, 6),
  };
}

/**
 * Human-readable protection message for the Liquid Shell guardrail card.
 */
export function buildActivationMessage(result: FingerprintResult): string {
  if (result.confidence === 'LOW' || result.pattern === 'unknown_structure') {
    return `ARC couldn't detect a clear architecture yet. I'll still watch for risky layer bypass patterns.`;
  }
  return `ARC detected a ${result.label}. Layer Leakage Protection is now active.`;
}
