import path from 'node:path';
import type { Classification, RiskRule, SaveInput } from '../contracts/types';
import { demoteRisk, maxRisk } from './risk';

const UI_SEGMENTS = new Set(['components', 'ui', 'views']);

interface ClassifierOptions {
  additionalUiSegments?: string[];
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function pathSegments(filePath: string): string[] {
  return normalizePath(filePath)
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.toLowerCase());
}

function matchesRule(rule: RiskRule, filePath: string, fileName: string): boolean {
  const segments = pathSegments(filePath);
  const lowerFileName = fileName.toLowerCase();

  return rule.matchers.some((matcher) => {
    const value = matcher.value.toLowerCase();
    switch (matcher.type) {
      case 'PATH_SEGMENT_MATCH':
        return segments.includes(value);
      case 'FILENAME_MATCH':
        return lowerFileName === value;
      case 'EXTENSION_MATCH':
        return lowerFileName.endsWith(value);
      default:
        return false;
    }
  });
}

function isUiPath(filePath: string, additionalUiSegments: string[] = []): boolean {
  const uiSegments = new Set([
    ...UI_SEGMENTS,
    ...additionalUiSegments.map((segment) => segment.toLowerCase()),
  ]);

  return pathSegments(filePath).some((segment) => uiSegments.has(segment));
}

export function classifyFile(
  input: SaveInput,
  rules: RiskRule[],
  options: ClassifierOptions = {},
): Classification {
  const fileName = input.fileName ?? path.basename(input.filePath);
  const matchedRules = rules.filter((rule) => matchesRule(rule, input.filePath, fileName));
  const riskFlags = [...new Set(matchedRules.map((rule) => rule.riskFlag))];
  const matchedRuleIds = matchedRules.map((rule) => rule.id);
  let riskLevel = maxRisk(matchedRules.map((rule) => rule.severity));
  let demoted = false;

  if (
    riskFlags.length > 0 &&
    isUiPath(input.filePath, options.additionalUiSegments) &&
    riskFlags.length < 2
  ) {
    const demotedRisk = demoteRisk(riskLevel);
    if (demotedRisk !== riskLevel) {
      riskLevel = demotedRisk;
      demoted = true;
    }
  }

  return {
    filePath: normalizePath(input.filePath),
    fileName,
    matchedRuleIds,
    riskFlags,
    riskLevel,
    heuristicOnly: true,
    demoted,
  };
}
