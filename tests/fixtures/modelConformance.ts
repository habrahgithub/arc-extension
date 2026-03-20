import type { Classification, DecisionPayload, ModelEvaluationResult } from '../../src/contracts/types';

interface ConformanceCase {
  name: string;
  classification: Classification;
  ruleDecision: DecisionPayload;
  modelDecision?: ModelEvaluationResult;
  expectedDecision: DecisionPayload['decision'];
}

const baseClassification: Classification = {
  filePath: 'src/auth/session.ts',
  fileName: 'session.ts',
  matchedRuleIds: ['rule-auth-path'],
  riskFlags: ['AUTH_CHANGE'],
  riskLevel: 'HIGH',
  heuristicOnly: true,
  demoted: false,
};

const baseRuleDecision: DecisionPayload = {
  decision: 'REQUIRE_PLAN',
  reason: 'Authentication-sensitive paths require an explicit plan acknowledgment.',
  risk_level: 'HIGH',
  violated_rules: ['rule-auth-path'],
  next_action: 'Capture intent before proceeding with this save.',
  source: 'RULE',
  fallback_cause: 'NONE',
  lease_status: 'BYPASSED',
};

export const modelConformanceCases: ConformanceCase[] = [
  {
    name: 'auth cannot downgrade below require plan',
    classification: baseClassification,
    ruleDecision: baseRuleDecision,
    modelDecision: {
      decision: 'ALLOW',
      reason: 'looks safe',
      risk_level: 'LOW',
      violated_rules: [],
      next_action: 'continue',
    },
    expectedDecision: 'REQUIRE_PLAN',
  },
  {
    name: 'auth may escalate to block',
    classification: baseClassification,
    ruleDecision: baseRuleDecision,
    modelDecision: {
      decision: 'BLOCK',
      reason: 'high confidence critical path',
      risk_level: 'CRITICAL',
      violated_rules: ['rule-auth-path'],
      next_action: 'stop',
    },
    expectedDecision: 'BLOCK',
  },
  {
    name: 'schema retains warn floor',
    classification: {
      ...baseClassification,
      filePath: 'db/schema.sql',
      fileName: 'schema.sql',
      matchedRuleIds: ['rule-schema-file'],
      riskFlags: ['SCHEMA_CHANGE'],
      riskLevel: 'MEDIUM',
    },
    ruleDecision: {
      ...baseRuleDecision,
      decision: 'WARN',
      risk_level: 'MEDIUM',
      violated_rules: ['rule-schema-file'],
    },
    modelDecision: {
      decision: 'ALLOW',
      reason: 'schema is minor',
      risk_level: 'LOW',
      violated_rules: [],
      next_action: 'continue',
    },
    expectedDecision: 'WARN',
  },
  {
    name: 'schema may escalate to require plan',
    classification: {
      ...baseClassification,
      filePath: 'db/schema.sql',
      fileName: 'schema.sql',
      matchedRuleIds: ['rule-schema-file'],
      riskFlags: ['SCHEMA_CHANGE'],
      riskLevel: 'MEDIUM',
    },
    ruleDecision: {
      ...baseRuleDecision,
      decision: 'WARN',
      risk_level: 'MEDIUM',
      violated_rules: ['rule-schema-file'],
    },
    modelDecision: {
      decision: 'REQUIRE_PLAN',
      reason: 'schema affects runtime contracts',
      risk_level: 'HIGH',
      violated_rules: ['rule-schema-file'],
      next_action: 'plan it',
    },
    expectedDecision: 'REQUIRE_PLAN',
  },
  {
    name: 'critical rule remains block',
    classification: {
      ...baseClassification,
      matchedRuleIds: ['rule-auth-path', 'rule-schema-file'],
      riskFlags: ['AUTH_CHANGE', 'SCHEMA_CHANGE'],
      riskLevel: 'CRITICAL',
    },
    ruleDecision: {
      ...baseRuleDecision,
      decision: 'BLOCK',
      risk_level: 'CRITICAL',
      violated_rules: ['rule-auth-path', 'rule-schema-file'],
    },
    modelDecision: {
      decision: 'WARN',
      reason: 'maybe fine',
      risk_level: 'MEDIUM',
      violated_rules: [],
      next_action: 'continue',
    },
    expectedDecision: 'BLOCK',
  },
  {
    name: 'low risk may stay allow',
    classification: {
      ...baseClassification,
      filePath: 'src/components/Button.tsx',
      fileName: 'Button.tsx',
      matchedRuleIds: [],
      riskFlags: [],
      riskLevel: 'LOW',
    },
    ruleDecision: {
      ...baseRuleDecision,
      decision: 'ALLOW',
      reason: 'No rules matched.',
      risk_level: 'LOW',
      violated_rules: [],
      next_action: 'continue',
    },
    modelDecision: {
      decision: 'ALLOW',
      reason: 'safe',
      risk_level: 'LOW',
      violated_rules: [],
      next_action: 'continue',
    },
    expectedDecision: 'ALLOW',
  },
  {
    name: 'high risk floor becomes warn when rule is only warn',
    classification: {
      ...baseClassification,
      riskLevel: 'HIGH',
    },
    ruleDecision: {
      ...baseRuleDecision,
      decision: 'WARN',
      risk_level: 'HIGH',
      violated_rules: ['rule-auth-path'],
    },
    modelDecision: {
      decision: 'ALLOW',
      reason: 'looks okay',
      risk_level: 'LOW',
      violated_rules: [],
      next_action: 'continue',
    },
    expectedDecision: 'WARN',
  },
  {
    name: 'model require plan preserved when above floor',
    classification: baseClassification,
    ruleDecision: baseRuleDecision,
    modelDecision: {
      decision: 'REQUIRE_PLAN',
      reason: 'maintain planning gate',
      risk_level: 'HIGH',
      violated_rules: ['rule-auth-path'],
      next_action: 'plan it',
    },
    expectedDecision: 'REQUIRE_PLAN',
  },
  {
    name: 'model block preserved when above floor on schema',
    classification: {
      ...baseClassification,
      filePath: 'db/schema.sql',
      fileName: 'schema.sql',
      matchedRuleIds: ['rule-schema-file'],
      riskFlags: ['SCHEMA_CHANGE'],
      riskLevel: 'MEDIUM',
    },
    ruleDecision: {
      ...baseRuleDecision,
      decision: 'WARN',
      risk_level: 'MEDIUM',
      violated_rules: ['rule-schema-file'],
    },
    modelDecision: {
      decision: 'BLOCK',
      reason: 'destructive schema change',
      risk_level: 'CRITICAL',
      violated_rules: ['rule-schema-file'],
      next_action: 'stop',
    },
    expectedDecision: 'BLOCK',
  },
  {
    name: 'missing model result keeps rule decision',
    classification: baseClassification,
    ruleDecision: baseRuleDecision,
    modelDecision: undefined,
    expectedDecision: 'REQUIRE_PLAN',
  },
];
