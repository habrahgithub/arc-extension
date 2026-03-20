import { describe, expect, it } from 'vitest';
import { classifyFile } from '../../src/core/classifier';
import type { RiskRule } from '../../src/contracts/types';
import { DEFAULT_RULES } from '../../src/core/rules';
import { fixtureInputs, makeSaveInput } from '../fixtures/saveInputs';

describe('classifier', () => {
  it('does not treat AuthButton as auth-sensitive because auth must be a path segment', () => {
    const classification = classifyFile(
      makeSaveInput({
        filePath: 'src/components/AuthButton.tsx',
        fileName: 'AuthButton.tsx',
      }),
      DEFAULT_RULES,
    );

    expect(classification.riskFlags).toEqual([]);
    expect(classification.riskLevel).toBe('LOW');
  });

  it('classifies auth paths as high risk', () => {
    const classification = classifyFile(fixtureInputs.auth, DEFAULT_RULES);

    expect(classification.riskFlags).toContain('AUTH_CHANGE');
    expect(classification.riskLevel).toBe('HIGH');
  });

  it('classifies schema files as medium risk', () => {
    const classification = classifyFile(fixtureInputs.schema, DEFAULT_RULES);

    expect(classification.riskFlags).toContain('SCHEMA_CHANGE');
    expect(classification.riskLevel).toBe('MEDIUM');
  });

  it('applies local workspace mapping rules to improve precision without weakening floors', () => {
    const mappingRules: RiskRule[] = [
      {
        id: 'workspace-security-auth',
        riskFlag: 'AUTH_CHANGE',
        scope: 'PATH_SEGMENT_MATCH',
        severity: 'HIGH',
        decisionFloor: 'REQUIRE_PLAN',
        reason: 'Workspace mapping treats security paths as auth-sensitive.',
        matchers: [{ type: 'PATH_SEGMENT_MATCH', value: 'security' }],
      },
    ];

    const classification = classifyFile(
      makeSaveInput({
        filePath: 'src/security/session.ts',
        fileName: 'session.ts',
      }),
      [...DEFAULT_RULES, ...mappingRules],
    );

    expect(classification.riskFlags).toContain('AUTH_CHANGE');
    expect(classification.matchedRuleIds).toContain('workspace-security-auth');
    expect(classification.riskLevel).toBe('HIGH');
  });
});
