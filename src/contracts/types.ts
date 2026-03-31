export type Decision = 'ALLOW' | 'WARN' | 'REQUIRE_PLAN' | 'BLOCK';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RouteMode = 'RULE_ONLY' | 'LOCAL_PREFERRED' | 'CLOUD_ASSISTED';
export type RouteLane = 'RULE_ONLY' | 'LOCAL' | 'CLOUD';
export type RoutePolicyStatus = 'MISSING' | 'LOADED' | 'INVALID';
export type RouteClarity = 'CLEAR' | 'AMBIGUOUS';
export type RouteFallback =
  | 'NONE'
  | 'CONFIG_MISSING'
  | 'CONFIG_INVALID'
  | 'AUTO_SAVE_BLOCKED'
  | 'PACKET_INVALID'
  | 'DATA_CLASS_DENIED';
export type DataClass = 'LOCAL_ONLY' | 'CLOUD_ELIGIBLE' | 'RESTRICTED';
export type SensitivityMarker = 'UNASSESSED' | 'GOVERNED_CHANGE';
export type AuthorityTag = 'LINTEL_LOCAL_ENFORCEMENT';
export type RuleScopeType =
  | 'PATH_SEGMENT_MATCH'
  | 'FILENAME_MATCH'
  | 'EXTENSION_MATCH';
export type DecisionSource =
  | 'RULE'
  | 'MODEL'
  | 'CLOUD_MODEL'
  | 'MODEL_DISABLED'
  | 'FALLBACK';
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
export type AutoSaveMode =
  | 'off'
  | 'afterDelay'
  | 'onFocusChange'
  | 'onWindowChange';
export type BlueprintMode = 'LOCAL_ONLY' | 'TEAM_SHARED';
export type GovernanceMode = 'OBSERVE' | 'ENFORCE';
export type ActorType = 'human' | 'agent' | 'model';
export type FindingSource = 'RULE' | 'AST';

export interface ActorIdentity {
  type: ActorType;
  id: string;
  session?: string;
}

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
  // Phase 7.9 — Demotion clarity (WRD-0082)
  demotionReason?:
    | 'UI_PATH_SINGLE_FLAG'
    | 'UI_PATH_MULTI_FLAG_REDUCED'
    | 'EXPLICIT_RULE';
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
  route_mode?: RouteMode;
  route_lane?: RouteLane;
  route_reason?: string;
  route_clarity?: RouteClarity;
  route_fallback?: RouteFallback;
  route_policy_hash?: string;
  evaluation_lane?: Exclude<RouteLane, 'RULE_ONLY'>;
  // Phase 7.7 — Trigger visibility fields
  save_mode?: SaveMode;
  auto_save_mode?: AutoSaveMode;
  model_availability_status?:
    | 'DISABLED_BY_CONFIG'
    | 'UNAVAILABLE_AT_RUNTIME'
    | 'AVAILABLE_AND_USED'
    | 'NOT_ATTEMPTED';
  // Phase 8 — Governance mode marker
  governance_mode?: GovernanceMode;
}

export interface Finding {
  source: FindingSource;
  code: string;
  severity: RiskLevel;
  detail: string;
}

export interface ContextPayload {
  file_path: string;
  risk_flags: RiskFlag[];
  matched_rule_ids: string[];
  last_decision?: Decision;
  excerpt?: string;
  heuristic_only: true;
}

export interface ContextPacket {
  packet_id: string;
  ts: string;
  file_path: string;
  risk_flags: RiskFlag[];
  matched_rule_ids: string[];
  last_decision?: Decision;
  excerpt?: string;
  heuristic_only: true;
  directive_id?: string;
  blueprint_id?: string;
  authority_tag: AuthorityTag;
  data_class: DataClass;
  sensitivity_marker: SensitivityMarker;
  packet_hash: string;
}

export type ContextPacketValidationCode =
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_PACKET_ID'
  | 'INVALID_PACKET_HASH'
  | 'INVALID_HEURISTIC_ONLY'
  | 'INVALID_AUTHORITY_TAG'
  | 'INVALID_DATA_CLASS'
  | 'INVALID_SENSITIVITY_MARKER'
  | 'INVALID_EXCERPT_BOUNDS';

export interface ContextPacketValidationIssue {
  code: ContextPacketValidationCode;
  field: keyof ContextPacket | 'excerpt';
  reason: string;
}

export interface ContextPacketValidationResult {
  ok: boolean;
  issues: ContextPacketValidationIssue[];
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

export interface RoutePolicyConfig {
  mode?: RouteMode;
  local_lane_enabled?: boolean;
  cloud_lane_enabled?: boolean;
  cloud_data_class?: DataClass;
  governance_mode?: GovernanceMode;
  ast_fingerprinting_enabled?: boolean;
}

export interface NormalizedRoutePolicy {
  mode: RouteMode;
  localLaneEnabled: boolean;
  cloudLaneEnabled: boolean;
  cloudDataClass: DataClass;
  governanceMode: GovernanceMode;
  astFingerprintingEnabled: boolean;
}

export interface OverrideEntry {
  ts: string;
  file_path: string;
  decision: Decision;
  risk_level: RiskLevel;
  violated_rules: string[];
  actor?: ActorIdentity;
  directive_id?: string;
  blueprint_id?: string;
  governance_mode?: GovernanceMode;
}

export interface RoutePolicyResolution {
  status: RoutePolicyStatus;
  config: NormalizedRoutePolicy;
  reason: string;
  policyHash: string;
}

export interface RouteLaneDescriptor {
  lane: Exclude<RouteLane, 'RULE_ONLY'>;
  enabled: boolean;
  executable: boolean;
  reason: string;
  routeFallback?: RouteFallback;
}

export interface RouterShellResolution {
  routePolicy: RoutePolicyResolution;
  localLane: RouteLaneDescriptor;
  cloudLane: RouteLaneDescriptor;
  shouldUseModel: boolean;
  shouldUseCloudModel: boolean;
  packetValid: boolean;
}

export interface AuditEntry extends DecisionPayload {
  ts: string;
  file_path: string;
  risk_flags: RiskFlag[];
  matched_rules: string[];
  actor?: ActorIdentity;
  fingerprint?: string;
  prev_hash: string;
  hash: string;
}

export interface AssessedSave {
  classification: Classification;
  context: ContextPayload;
  contextPacket: ContextPacket;
  analysis: {
    findings: Finding[];
    fingerprints?: {
      file: string;
      features: string[];
    };
  };
  decision: DecisionPayload;
  input: SaveInput;
  routePolicy: RoutePolicyResolution;
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
    | 'classify_file'
    | 'commit_save'
    | 'evaluate_model'
    | 'evaluate_rules'
    | 'review_audit'
    | 'review_blueprints'
    | 'review_false_positives'
    | 'review_task_board'
    | 'load_workspace_map';
  duration_ms: number;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface AuditFilterInput {
  decision?: Decision;
  directiveId?: string;
  filePathIncludes?: string;
  routeMode?: string;
  routeLane?: string;
  routeClarity?: string;
  routeFallback?: string;
  sinceTs?: string;
  untilTs?: string;
  limit?: number;
  offset?: number;
}

export interface PerfFilterInput {
  operation?: PerformanceEntry['operation'];
  sinceTs?: string;
  untilTs?: string;
  limit?: number;
}

export interface AuditHistoryWarning {
  kind: 'MALFORMED_AUDIT_LINE' | 'MALFORMED_PERF_LINE' | 'MISSING_FILE';
  file_path: string;
  line_number?: number;
  detail: string;
}

export interface AuditHistoryMatch {
  entry: AuditEntry;
  source_file: string;
  line_number: number;
}

export interface PerfHistoryMatch {
  entry: PerformanceEntry;
  source_file: string;
  line_number: number;
}

export interface AuditQueryResult {
  filters: AuditFilterInput;
  files_read: string[];
  matched: AuditHistoryMatch[];
  warnings: AuditHistoryWarning[];
  partial: boolean;
}

export interface DirectiveTraceResult {
  directive_id: string;
  blueprint_id: string;
  blueprint_path: string;
  blueprint_status:
    | 'VALID'
    | 'MISSING_DIRECTIVE'
    | 'INVALID_DIRECTIVE'
    | 'MISSING_ARTIFACT'
    | 'MISMATCHED_BLUEPRINT_ID'
    | 'MALFORMED_ARTIFACT'
    | 'INCOMPLETE_ARTIFACT'
    | 'UNAUTHORIZED_MODE';
  blueprint_reason: string;
  files_read: string[];
  matched: AuditHistoryMatch[];
  warnings: AuditHistoryWarning[];
  partial: boolean;
}

export interface RouteTraceSummary {
  route_mode: string;
  route_lane: string;
  route_clarity: string;
  route_fallback: string;
  route_policy_hash: string | null;
  count: number;
}

export interface RouteTraceResult {
  filters: AuditFilterInput;
  files_read: string[];
  matched: AuditHistoryMatch[];
  summaries: RouteTraceSummary[];
  warnings: AuditHistoryWarning[];
  partial: boolean;
}

export interface PerfSummaryResult {
  filters: PerfFilterInput;
  files_read: string[];
  matched: PerfHistoryMatch[];
  warnings: AuditHistoryWarning[];
  partial: boolean;
  operation_summary: Array<{
    operation: PerformanceEntry['operation'];
    count: number;
    avg_duration_ms: number;
    max_duration_ms: number;
  }>;
}

export interface AuditVerificationResult {
  status: 'VALID' | 'INVALID' | 'PARTIAL';
  files_read: string[];
  warnings: AuditHistoryWarning[];
  partial: boolean;
  verified_entries: number;
  failure?: {
    file_path: string;
    line_number: number;
    reason: string;
  };
}

export type ExportEvidenceClass =
  | 'EXPORT_METADATA'
  | 'DIRECT_EVIDENCE'
  | 'DERIVED_SUMMARY'
  | 'VALIDATION_RESULT';

export type ExportBundleValidationCode =
  | 'MISSING_SECTION'
  | 'INVALID_EXPORT_VERSION'
  | 'INVALID_BUNDLE_TYPE'
  | 'INVALID_DESTINATION_POLICY'
  | 'PARTIAL_SOURCE_EVIDENCE';

export interface ExportBundleValidationIssue {
  code: ExportBundleValidationCode;
  section: string;
  reason: string;
}

export interface ExportBundleValidationResult {
  status: 'VALID' | 'INVALID' | 'PARTIAL';
  issues: ExportBundleValidationIssue[];
}

export interface AuditExportSection<T> {
  section_id: string;
  evidence_class: ExportEvidenceClass;
  partial: boolean;
  description: string;
  data: T;
}

export interface VaultReadyExportMetadata {
  package_phase: '6.7';
  source: 'LINTEL_AUDIT_VISIBILITY_CLI';
  local_only: true;
  direct_vault_write: false;
  direct_arc_dependency: false;
  allowed_destinations: ['stdout', 'local_file'];
}

export interface AuditExportBundle {
  export_version: 'phase-6.7-v1';
  bundle_type: 'LINTEL_VAULT_READY_EXPORT';
  generated_at: string;
  workspace_root: string;
  vault_ready: true;
  direct_vault_write: false;
  direct_arc_dependency: false;
  metadata: VaultReadyExportMetadata;
  sections: {
    export_metadata: AuditExportSection<VaultReadyExportMetadata>;
    audit_slice: AuditExportSection<AuditQueryResult>;
    route_trace: AuditExportSection<Omit<RouteTraceResult, 'summaries'>>;
    route_summary: AuditExportSection<RouteTraceSummary[]>;
    perf_slice: AuditExportSection<
      Omit<PerfSummaryResult, 'operation_summary'>
    >;
    perf_operation_summary: AuditExportSection<
      PerfSummaryResult['operation_summary']
    >;
    audit_integrity: AuditExportSection<AuditVerificationResult>;
    directive_linkage?: AuditExportSection<{
      directive_id: string;
      files_read: string[];
      matched_count: number;
      warnings: AuditHistoryWarning[];
      partial: boolean;
    }>;
    blueprint_linkage?: AuditExportSection<{
      blueprint_id: string;
      blueprint_path: string;
      blueprint_status: DirectiveTraceResult['blueprint_status'];
      blueprint_reason: string;
      partial: boolean;
    }>;
    bundle_validation: AuditExportSection<ExportBundleValidationResult>;
  };
  bundle_validation: ExportBundleValidationResult;
  warnings: AuditHistoryWarning[];
}
