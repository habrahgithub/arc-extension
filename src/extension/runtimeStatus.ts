import path from 'node:path';
import type { AutoSaveMode, RoutePolicyResolution } from '../contracts/types';
import type { WorkspaceTargetResolution } from './workspaceTargeting';

export interface RuntimeStatusSnapshot {
  target: WorkspaceTargetResolution;
  autoSaveMode: AutoSaveMode;
  routePolicy: RoutePolicyResolution;
}

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
    '> Diagnostics are observational only. They do not authorize, widen, or bypass save decisions.',
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
    '- Fail-closed note: missing/invalid route policy still degrades to `RULE_ONLY`.',
    '- Cloud note: this diagnostic must not be interpreted as cloud readiness or authorization.',
  ].join('\n');
}
