import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import type {
  RiskRule,
  WorkspaceMappingConfig,
  WorkspaceMappingResolution,
} from '../contracts/types';

const ajv = new Ajv();
const validateRiskRule = ajv.compile({
  type: 'object',
  required: [
    'id',
    'riskFlag',
    'scope',
    'severity',
    'decisionFloor',
    'reason',
    'matchers',
  ],
  properties: {
    id: { type: 'string' },
    riskFlag: {
      type: 'string',
      enum: ['AUTH_CHANGE', 'SCHEMA_CHANGE', 'CONFIG_CHANGE'],
    },
    scope: {
      type: 'string',
      enum: ['PATH_SEGMENT_MATCH', 'FILENAME_MATCH', 'EXTENSION_MATCH'],
    },
    severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    decisionFloor: {
      type: 'string',
      enum: ['ALLOW', 'WARN', 'REQUIRE_PLAN', 'BLOCK'],
    },
    reason: { type: 'string' },
    matchers: {
      type: 'array',
      items: {
        type: 'object',
        required: ['type', 'value'],
        properties: {
          type: {
            type: 'string',
            enum: ['PATH_SEGMENT_MATCH', 'FILENAME_MATCH', 'EXTENSION_MATCH'],
          },
          value: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
});

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
      parsed = JSON.parse(
        fs.readFileSync(mappingPath, 'utf8'),
      ) as WorkspaceMappingConfig;
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
        reason:
          'Shared or team workspace mapping is not authorized in Phase 5.',
      };
    }

    const rawRules = parsed.rules ?? [];
    if (!Array.isArray(rawRules)) {
      return {
        status: 'INVALID',
        mode,
        rules: [],
        uiSegments: [],
        reason: 'The workspace mapping rules field must be an array.',
      };
    }

    const validRules: RiskRule[] = [];
    const skippedCount = rawRules.reduce((count, rule) => {
      if (validateRiskRule(rule)) {
        validRules.push(rule as RiskRule);
        return count;
      }
      return count + 1;
    }, 0);

    const uiSegments = Array.isArray(parsed.ui_segments)
      ? parsed.ui_segments.filter(
          (segment): segment is string => typeof segment === 'string',
        )
      : [];

    return {
      status: 'LOADED',
      mode,
      rules: validRules,
      uiSegments,
      ...(skippedCount > 0
        ? {
            reason: `${skippedCount} rule(s) skipped: failed ARC XT risk-rule schema validation.`,
          }
        : {}),
    };
  }
}
