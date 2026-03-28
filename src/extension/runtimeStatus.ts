import path from 'node:path';
import type {
  AutoSaveMode,
  RoutePolicyResolution,
  Decision,
  DecisionSource,
  FallbackCause,
  LeaseStatus,
  RouteLane,
} from '../contracts/types';
import type { WorkspaceTargetResolution } from './workspaceTargeting';

export interface RuntimeStatusSnapshot {
  target: WorkspaceTargetResolution;
  autoSaveMode: AutoSaveMode;
  routePolicy: RoutePolicyResolution;
  // Phase 7.7 — Trigger visibility fields
  // Phase 7.8 — Staleness hardening fields
  lastDecision?: {
    decision: Decision;
    source: DecisionSource;
    fallbackCause: FallbackCause;
    evaluationLane?: RouteLane;
    leaseStatus: LeaseStatus;
    saveMode?: 'EXPLICIT' | 'AUTO';
    autoSaveMode?: AutoSaveMode;
    timestamp: string;
    filePath: string;
    // Phase 7.8 — Staleness indicators (descriptive only)
    isStale?: boolean;
    stalenessReason?: 'FILE_MISMATCH' | 'TIME_THRESHOLD' | 'BOTH';
  };
}

export const RUNTIME_STATUS_OBSERVATIONAL_NOTICE =
  'Diagnostics are observational only. They do not authorize, widen, or bypass save decisions.';

export const RUNTIME_STATUS_CLOUD_NOTICE =
  'Cloud note: this diagnostic must not be interpreted as cloud readiness, approval, or authorization.';

export const RUNTIME_STATUS_FAIL_CLOSED_NOTE =
  'Fail-closed note: missing/invalid route policy still degrades to `RULE_ONLY` and does not loosen baseline enforcement.';

export const RUNTIME_STATUS_BASELINE_NOTE =
  'Baseline note: route posture shown here is descriptive only; proof enforcement, rule floors, and fallback gates remain authoritative.';

// Phase 7.8 — Staleness threshold (5 minutes)
export const STALENESS_THRESHOLD_MS = 5 * 60 * 1000;

export const RUNTIME_STATUS_STALENESS_NOTICE =
  'Staleness note: displayed decision context may be from a different file or time window. This is descriptive only and does not invalidate prior decisions.';

function describeReason(reason: WorkspaceTargetResolution['reason']): string {
  switch (reason) {
    case 'NESTED_BOUNDARY':
      return 'Nearest nested project boundary inside the active VS Code workspace';
    case 'GLOBAL_FALLBACK':
      return 'Extension fallback root because no matching workspace folder was found';
    case 'WORKSPACE_FOLDER':
    default:
      return 'Active VS Code workspace folder root';
  }
}

function describeSaveContext(snapshot: RuntimeStatusSnapshot): string {
  if (snapshot.routePolicy.status !== 'LOADED') {
    return 'Current route policy state would fail closed to `RULE_ONLY` because the configured route policy is missing or invalid.';
  }

  if (
    snapshot.autoSaveMode !== 'off' &&
    snapshot.routePolicy.config.mode !== 'RULE_ONLY'
  ) {
    return 'Auto-save remains reduced-guarantee and would still fail closed to `RULE_ONLY` even when a less strict routed mode is configured.';
  }

  return 'Current posture preserves the established fail-closed enforcement floor for the active workspace root.';
}

export function renderRuntimeStatusMarkdown(
  snapshot: RuntimeStatusSnapshot,
): string {
  const auditPath = path.join(
    snapshot.target.effectiveRoot,
    '.arc',
    'audit.jsonl',
  );
  const routerPath = path.join(
    snapshot.target.effectiveRoot,
    '.arc',
    'router.json',
  );
  const markers =
    snapshot.target.markers.length > 0
      ? snapshot.target.markers.map((marker) => `\`${marker}\``).join(', ')
      : 'none detected';

  const sections = [
    '# ARC XT Active Workspace Status',
    '',
    `> ${RUNTIME_STATUS_OBSERVATIONAL_NOTICE}`,
    '',
    '## Workspace targeting',
    `- Active file: \`${snapshot.target.filePath ?? 'n/a'}\``,
    `- Workspace folder root: \`${snapshot.target.workspaceFolderRoot}\``,
    `- Effective governed root: \`${snapshot.target.effectiveRoot}\``,
    `- Targeting reason: ${describeReason(snapshot.target.reason)}`,
    `- Boundary markers at governed root: ${markers}`,
    `- Audit path: \`${auditPath}\``,
    `- Route-policy path: \`${routerPath}\``,
    '',
    '## Route posture',
    `- Route policy status: \`${snapshot.routePolicy.status}\``,
    `- Effective mode: \`${snapshot.routePolicy.config.mode}\``,
    `- Local lane enabled: \`${snapshot.routePolicy.config.localLaneEnabled}\``,
    `- Cloud lane enabled: \`${snapshot.routePolicy.config.cloudLaneEnabled}\``,
    `- Cloud data class: \`${snapshot.routePolicy.config.cloudDataClass}\``,
    `- Policy reason: ${snapshot.routePolicy.reason}`,
    '',
    '## Save behavior context',
    `- Auto-save mode: \`${snapshot.autoSaveMode}\``,
    `- Reduced-guarantee notice active: \`${snapshot.autoSaveMode !== 'off'}\``,
    `- Save-context note: ${describeSaveContext(snapshot)}`,
    `- ${RUNTIME_STATUS_FAIL_CLOSED_NOTE}`,
    `- ${RUNTIME_STATUS_BASELINE_NOTE}`,
    `- ${RUNTIME_STATUS_CLOUD_NOTICE}`,
  ];

  // Phase 7.7 — Last Save Decision section
  // Phase 7.8 — Staleness hardening
  if (snapshot.lastDecision) {
    const last = snapshot.lastDecision;
    const modelStatus = describeModelAvailability(
      last.source,
      last.fallbackCause,
    );
    const triggerDesc = describeTriggerSource(last.saveMode, last.autoSaveMode);
    const evalLaneDesc = last.evaluationLane ?? 'RULE_ONLY';
    const leaseDesc = describeLeaseStatus(last.leaseStatus);
    const stalenessDesc = describeStaleness(last.isStale, last.stalenessReason);

    sections.push(
      '',
      '## Last Save Decision',
      '',
      `> Descriptive only: this summary explains what happened. It does not authorize, override, or alter enforcement.`,
      '',
      `- Decision: \`${last.decision}\``,
      `- File: \`${last.filePath}\``,
      `- Timestamp: \`${last.timestamp}\``,
      `- Trigger: ${triggerDesc}`,
      `- Model availability: ${modelStatus}`,
      `- Evaluation lane: \`${evalLaneDesc}\``,
      `- Lease status: ${leaseDesc}`,
      ...stalenessDesc,
      '',
      `- ${RUNTIME_STATUS_OBSERVATIONAL_NOTICE}`,
      `- ${RUNTIME_STATUS_STALENESS_NOTICE}`,
    );
  }

  return sections.join('\n');
}

function describeModelAvailability(
  source: DecisionSource,
  fallbackCause: FallbackCause,
): string {
  // WRD-0072: Explicitly distinguish degraded/fallback from full evaluation
  if (source === 'MODEL_DISABLED' || fallbackCause === 'MODEL_DISABLED') {
    return '❌ Disabled by configuration (model not attempted)';
  }
  if (source === 'FALLBACK' && fallbackCause === 'UNAVAILABLE') {
    return '⚠️ Unavailable at runtime (fallback to rule-only)';
  }
  if (source === 'FALLBACK' && fallbackCause === 'TIMEOUT') {
    return '⚠️ Timed out at runtime (fallback to rule-only)';
  }
  if (source === 'FALLBACK' && fallbackCause === 'PARSE_FAILURE') {
    return '⚠️ Parse failure at runtime (fallback to rule-only)';
  }
  if (source === 'MODEL' || source === 'CLOUD_MODEL') {
    return '✅ Available and used';
  }
  if (source === 'RULE' || source === 'FALLBACK') {
    return 'ℹ️ Rule-only evaluation (model not required)';
  }
  return 'ℹ️ Not attempted';
}

function describeTriggerSource(
  saveMode?: 'EXPLICIT' | 'AUTO',
  autoSaveMode?: AutoSaveMode,
): string {
  if (!saveMode) {
    return 'Unknown';
  }
  if (saveMode === 'EXPLICIT') {
    return 'Explicit user save (Ctrl+S / Cmd+S)';
  }
  // Auto-save modes
  switch (autoSaveMode) {
    case 'afterDelay':
      return 'Auto-save after delay';
    case 'onFocusChange':
      return 'Auto-save on focus change';
    case 'onWindowChange':
      return 'Auto-save on window change';
    default:
      return 'Auto-save (mode unknown)';
  }
}

function describeLeaseStatus(leaseStatus: LeaseStatus): string {
  switch (leaseStatus) {
    case 'NEW':
      return 'Fresh evaluation (decision cached for reuse)';
    case 'REUSED':
      return 'Reused from lease (same file state)';
    case 'EXPIRED':
      return 'Lease expired (fresh evaluation required)';
    case 'BYPASSED':
      return 'Bypassed (not eligible for lease)';
  }
}

// Phase 7.8 — Staleness description (descriptive only, non-authorizing)
function describeStaleness(
  isStale?: boolean,
  stalenessReason?: 'FILE_MISMATCH' | 'TIME_THRESHOLD' | 'BOTH',
): string[] {
  if (!isStale) {
    return [
      '- Context freshness: ✅ Current file and recent (within 5 minutes)',
    ];
  }

  // Descriptive-only wording: provides context about staleness,
  // does not assert the decision is affected.
  const reasonText =
    stalenessReason === 'FILE_MISMATCH'
      ? '⚠️ From a different file (decision context may not apply)'
      : stalenessReason === 'TIME_THRESHOLD'
        ? '⚠️ From an earlier session (older than 5 minutes)'
        : stalenessReason === 'BOTH'
          ? '⚠️ From a different file and earlier session'
          : '⚠️ Context may not reflect current state';

  return [`- Context freshness: ${reasonText}`];
}
