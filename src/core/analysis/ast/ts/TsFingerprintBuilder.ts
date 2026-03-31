import crypto from 'node:crypto';
import type { NormalizedAstNode } from './TsNodeNormalizer';

export type FileFingerprint = string;
export type FeatureFingerprint = string;

export interface TsFingerprintResult {
  file: FileFingerprint;
  features: FeatureFingerprint[];
}

export function buildTsFingerprint(
  normalized: NormalizedAstNode,
): TsFingerprintResult {
  const canonical = JSON.stringify(normalized);
  const file = digest(canonical);
  const features = collectFeatureFingerprints(normalized);

  return {
    file,
    features,
  };
}

function collectFeatureFingerprints(root: NormalizedAstNode): FeatureFingerprint[] {
  const features: string[] = [];
  walk(root, [root.kind], features);
  return [...new Set(features)].sort();
}

function walk(node: NormalizedAstNode, path: string[], output: string[]): void {
  if (path.length >= 2) {
    output.push(digest(path.join('>')));
  }

  for (const child of node.children ?? []) {
    walk(child, [...path, child.kind], output);
  }
}

function digest(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
