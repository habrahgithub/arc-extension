import fs from 'node:fs';
import path from 'node:path';
import type { AuditEntry } from '../contracts/types';

export interface DecisionTimelineResult {
  available: boolean;
  message: string;
}

export function renderDecisionTimeline(
  workspaceRoot: string,
  filePath: string,
): DecisionTimelineResult {
  const entries = readAuditEntries(workspaceRoot).filter(
    (entry) => entry.file_path === filePath,
  );

  if (entries.length === 0) {
    return {
      available: false,
      message: 'ARC: No decision timeline available for this file',
    };
  }

  const latestSave = [...entries]
    .reverse()
    .find((entry) => entry.event_type === 'SAVE');
  const latestDecisionId = latestSave?.decision_id;

  const lifecycleEntries = latestDecisionId
    ? entries.filter(
        (entry) =>
          entry.decision_id === latestDecisionId ||
          entry.linked_decision_id === latestDecisionId,
      )
    : [];

  const timeline = (lifecycleEntries.length > 0 ? lifecycleEntries : entries)
    .slice()
    .sort((left, right) => left.ts.localeCompare(right.ts));

  const lines = timeline.map((entry, index) => {
    const drift =
      entry.event_type === 'COMMIT' && entry.drift_status
        ? ` → ${entry.drift_status}`
        : '';
    const fingerprint = entry.fingerprint
      ? ` | fp:${entry.fingerprint.slice(0, 8)}`
      : '';

    return `[${index + 1}] ${entry.event_type.padEnd(6)} @ ${shortTs(entry.ts)}${drift}${fingerprint}`;
  });

  const summary = summarizeTimeline(timeline);

  return {
    available: true,
    message: [
      'ARC — Decision Timeline',
      '',
      `File: ${filePath}`,
      `Decision: ${latestDecisionId ?? 'N/A'}`,
      '',
      ...lines,
      '',
      'Summary:',
      ...summary.map((line) => `- ${line}`),
    ].join('\n'),
  };
}

function readAuditEntries(workspaceRoot: string): AuditEntry[] {
  const auditPath = path.join(workspaceRoot, '.arc', 'audit.jsonl');
  if (!fs.existsSync(auditPath)) {
    return [];
  }

  return fs
    .readFileSync(auditPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as AuditEntry];
      } catch {
        return [];
      }
    });
}

function shortTs(ts: string): string {
  return ts.replace('T', ' ').replace('Z', '').slice(0, 19);
}

function summarizeTimeline(entries: AuditEntry[]): string[] {
  const summary: string[] = [];

  if (entries.some((entry) => entry.event_type === 'SAVE')) {
    summary.push('Decision created');
  }
  if (entries.some((entry) => entry.event_type === 'RUN')) {
    summary.push('Code executed');
  }

  const drift = entries.find(
    (entry) => entry.event_type === 'COMMIT' && entry.drift_status,
  )?.drift_status;

  if (drift === 'DRIFT_DETECTED') {
    summary.push('Drift detected at commit');
  } else if (entries.some((entry) => entry.event_type === 'COMMIT')) {
    summary.push('Commit observed');
  }

  return summary.length > 0 ? summary : ['No timeline summary available'];
}
