import path from 'node:path';
import type { AutoSaveMode, RoutePolicyResolution } from '../contracts/types';
import type { WorkspaceTargetResolution } from './workspaceTargeting';

export interface RuntimeStatusSnapshot {
  target: WorkspaceTargetResolution;
  autoSaveMode: AutoSaveMode;
  routePolicy: RoutePolicyResolution;
}

export const RUNTIME_STATUS_OBSERVATIONAL_NOTICE =
  'Diagnostics are observational only. They do not authorize, widen, or bypass save decisions.';

export const RUNTIME_STATUS_CLOUD_NOTICE =
  'Cloud note: this diagnostic must not be interpreted as cloud readiness, approval, or authorization.';

export const RUNTIME_STATUS_FAIL_CLOSED_NOTE =
  'Fail-closed note: missing/invalid route policy still degrades to `RULE_ONLY` and does not loosen baseline enforcement.';

export const RUNTIME_STATUS_BASELINE_NOTE =
  'Baseline note: route posture shown here is descriptive only; proof enforcement, rule floors, and fallback gates remain authoritative.';

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

  if (snapshot.autoSaveMode !== 'off' && snapshot.routePolicy.config.mode !== 'RULE_ONLY') {
    return 'Auto-save remains reduced-guarantee and would still fail closed to `RULE_ONLY` even when a less strict routed mode is configured.';
  }

  return 'Current posture preserves the established fail-closed enforcement floor for the active workspace root.';
}

export function renderRuntimeStatusMarkdown(snapshot: RuntimeStatusSnapshot): string {
  const auditPath = path.join(snapshot.target.effectiveRoot, '.arc', 'audit.jsonl');
  const routerPath = path.join(snapshot.target.effectiveRoot, '.arc', 'router.json');
  const markers =
    snapshot.target.markers.length > 0
      ? snapshot.target.markers.map((marker) => `\`${marker}\``).join(', ')
      : 'none detected';

  return [
    '# LINTEL Active Workspace Status',
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
  ].join('\n');
}
