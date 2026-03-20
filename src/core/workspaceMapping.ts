import fs from 'node:fs';
import path from 'node:path';
import type { RiskRule, WorkspaceMappingConfig, WorkspaceMappingResolution } from '../contracts/types';

const DEFAULT_MODE = 'LOCAL_ONLY' as const;

export class WorkspaceMappingStore {
  constructor(private readonly workspaceRoot: string) {}

  mappingPath(): string {
    return path.join(this.workspaceRoot, '.arc', 'workspace-map.json');
  }

  load(): WorkspaceMappingResolution {
    const mappingPath = this.mappingPath();
    if (!fs.existsSync(mappingPath)) {
      return {
        status: 'MISSING',
        mode: DEFAULT_MODE,
        rules: [],
        uiSegments: [],
        reason: 'No local workspace mapping was found.',
      };
    }

    let parsed: WorkspaceMappingConfig;
    try {
      parsed = JSON.parse(fs.readFileSync(mappingPath, 'utf8')) as WorkspaceMappingConfig;
    } catch {
      return {
        status: 'INVALID',
        mode: DEFAULT_MODE,
        rules: [],
        uiSegments: [],
        reason: 'The workspace mapping file is not valid JSON.',
      };
    }

    const mode = parsed.mode ?? DEFAULT_MODE;
    if (mode !== DEFAULT_MODE) {
      return {
        status: 'UNAUTHORIZED_MODE',
        mode,
        rules: [],
        uiSegments: [],
        reason: 'Shared or team workspace mapping is not authorized in Phase 5.',
      };
    }

    const rules = parsed.rules ?? [];
    if (!Array.isArray(rules) || !rules.every(isRiskRule)) {
      return {
        status: 'INVALID',
        mode,
        rules: [],
        uiSegments: [],
        reason: 'The workspace mapping rules must follow the LINTEL risk-rule schema.',
      };
    }

    const uiSegments = Array.isArray(parsed.ui_segments)
      ? parsed.ui_segments.filter((segment): segment is string => typeof segment === 'string')
      : [];

    return {
      status: 'LOADED',
      mode,
      rules,
      uiSegments,
    };
  }
}

function isRiskRule(value: unknown): value is RiskRule {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.reason === 'string' &&
    Array.isArray(candidate.matchers) &&
    candidate.matchers.every(isRuleMatcher) &&
    isRiskFlag(candidate.riskFlag) &&
    isRiskLevel(candidate.severity) &&
    isDecision(candidate.decisionFloor) &&
    isRuleScopeType(candidate.scope)
  );
}

function isRuleMatcher(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return isRuleScopeType(candidate.type) && typeof candidate.value === 'string';
}

function isDecision(value: unknown): boolean {
  return value === 'ALLOW' || value === 'WARN' || value === 'REQUIRE_PLAN' || value === 'BLOCK';
}

function isRiskLevel(value: unknown): boolean {
  return value === 'LOW' || value === 'MEDIUM' || value === 'HIGH' || value === 'CRITICAL';
}

function isRiskFlag(value: unknown): boolean {
  return value === 'AUTH_CHANGE' || value === 'SCHEMA_CHANGE' || value === 'CONFIG_CHANGE';
}

function isRuleScopeType(value: unknown): boolean {
  return (
    value === 'PATH_SEGMENT_MATCH' ||
    value === 'FILENAME_MATCH' ||
    value === 'EXTENSION_MATCH'
  );
}
