export type Decision = 'ALLOW' | 'WARN' | 'REQUIRE_PLAN' | 'BLOCK';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RuleScopeType =
  | 'PATH_SEGMENT_MATCH'
  | 'FILENAME_MATCH'
  | 'EXTENSION_MATCH';
export type DecisionSource = 'RULE' | 'MODEL' | 'MODEL_DISABLED' | 'FALLBACK';
export type FallbackCause =
  | 'NONE'
  | 'MODEL_DISABLED'
  | 'RULE_ONLY'
  | 'UNAVAILABLE'
  | 'TIMEOUT'
  | 'PARSE_FAILURE'
  | 'ENFORCEMENT_FLOOR';
export type LeaseStatus = 'NEW' | 'REUSED' | 'EXPIRED' | 'BYPASSED';
export type RiskFlag = 'AUTH_CHANGE' | 'SCHEMA_CHANGE' | 'CONFIG_CHANGE';
export type SaveMode = 'EXPLICIT' | 'AUTO';
export type AutoSaveMode = 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange';
export type BlueprintMode = 'LOCAL_ONLY' | 'TEAM_SHARED';

export interface RuleMatcher {
  type: RuleScopeType;
  value: string;
}

export interface RiskRule {
  id: string;
  riskFlag: RiskFlag;
  scope: RuleScopeType;
  severity: RiskLevel;
  decisionFloor: Decision;
  reason: string;
  matchers: RuleMatcher[];
}

export interface Classification {
  filePath: string;
  fileName: string;
  matchedRuleIds: string[];
  riskFlags: RiskFlag[];
  riskLevel: RiskLevel;
  heuristicOnly: true;
  demoted: boolean;
}

export interface DecisionPayload {
  decision: Decision;
  reason: string;
  risk_level: RiskLevel;
  violated_rules: string[];
  next_action: string;
  source: DecisionSource;
  fallback_cause: FallbackCause;
  lease_status: LeaseStatus;
  directive_id?: string;
  blueprint_id?: string;
}

export interface ContextPayload {
  file_path: string;
  risk_flags: RiskFlag[];
  matched_rule_ids: string[];
  last_decision?: Decision;
  excerpt?: string;
  heuristic_only: true;
}

export interface SaveInput {
  filePath: string;
  fileName?: string;
  text: string;
  previousText: string;
  saveMode: SaveMode;
  autoSaveMode: AutoSaveMode;
  lastDecision?: Decision;
  selectionText?: string;
}

export interface DirectiveProofInput {
  directiveId?: string;
  blueprintId?: string;
  blueprintMode?: BlueprintMode;
}

export interface BlueprintArtifactLink {
  directiveId: string;
  blueprintId: string;
  blueprintPath: string;
}

export interface LeaseRecord {
  fingerprint: string;
  decision: DecisionPayload;
  expiresAt: number;
}

export interface AuditEntry extends DecisionPayload {
  ts: string;
  file_path: string;
  risk_flags: RiskFlag[];
  matched_rules: string[];
  prev_hash: string;
  hash: string;
}

export interface AssessedSave {
  classification: Classification;
  context: ContextPayload;
  decision: DecisionPayload;
  input: SaveInput;
  leaseReusable: boolean;
  shouldPrompt: boolean;
  reducedGuaranteeNotice?: string;
}

export interface SaveOutcome extends AssessedSave {
  auditEntry?: AuditEntry;
  shouldRevertAfterSave: boolean;
}

export interface PendingRevert {
  filePath: string;
  previousText: string;
  decision: DecisionPayload;
}

export interface ModelEvaluationResult {
  decision: Decision;
  reason: string;
  risk_level: RiskLevel;
  violated_rules: string[];
  next_action: string;
}

export interface WorkspaceMappingConfig {
  mode?: BlueprintMode;
  ui_segments?: string[];
  rules?: RiskRule[];
}

export interface WorkspaceMappingResolution {
  status: 'MISSING' | 'LOADED' | 'UNAUTHORIZED_MODE' | 'INVALID';
  mode: BlueprintMode;
  rules: RiskRule[];
  uiSegments: string[];
  reason?: string;
}

export interface PerformanceEntry {
  ts: string;
  operation:
    | 'assess_save'
    | 'commit_save'
    | 'review_audit'
    | 'review_blueprints'
    | 'review_false_positives'
    | 'load_workspace_map';
  duration_ms: number;
  metadata?: Record<string, string | number | boolean | null>;
}
