import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuditLogWriter } from '../../src/core/auditLog';
import { classifyFile } from '../../src/core/classifier';
import { DEFAULT_RULES } from '../../src/core/rules';
import { evaluateRules } from '../../src/core/ruleEngine';
import {
  driftAwarenessMessage,
  emitDriftAwarenessSignal,
} from '../../src/extension/interceptors/driftAwareness';
import {
  aggregateCommitContext,
  formatCommitContextMessage,
} from '../../src/extension/interceptors/commitContextAggregator';
import { fixtureInputs } from '../fixtures/saveInputs';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-ci-'));
  workspaces.push(workspace);
  return workspace;
}

afterEach(() => {
  while (workspaces.length > 0) {
    const ws = workspaces.pop();
    if (ws) fs.rmSync(ws, { recursive: true, force: true });
  }
});

describe('commit drift awareness signals', () => {
  it('emits warning + output for DRIFT_DETECTED and NO_LINKED_DECISION only', () => {
    const warn = vi.fn<(message: string) => void>();
    const append = vi.fn<(message: string) => void>();

    emitDriftAwarenessSignal('DRIFT_DETECTED', { warn, append });
    emitDriftAwarenessSignal('NO_LINKED_DECISION', { warn, append });
    emitDriftAwarenessSignal('NO_DRIFT', { warn, append });
    emitDriftAwarenessSignal('FINGERPRINT_UNAVAILABLE', { warn, append });

    expect(append).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(append).toHaveBeenNthCalledWith(
      1,
      'ARC: Drift detected — commit differs from recorded decision',
    );
    expect(append).toHaveBeenNthCalledWith(
      2,
      'ARC: No linked decision found for this commit',
    );
  });

  it('returns messages only for the two awareness statuses', () => {
    expect(driftAwarenessMessage('DRIFT_DETECTED')).toBe(
      'ARC: Drift detected — commit differs from recorded decision',
    );
    expect(driftAwarenessMessage('NO_LINKED_DECISION')).toBe(
      'ARC: No linked decision found for this commit',
    );
    expect(driftAwarenessMessage('NO_DRIFT')).toBeUndefined();
    expect(driftAwarenessMessage('FINGERPRINT_UNAVAILABLE')).toBeUndefined();
    expect(driftAwarenessMessage(undefined)).toBeUndefined();
  });
});

describe('M4-001 — queryCommitContext integration', () => {
  it('returns no-decision for saves with no corresponding commit entry', () => {
    const workspace = makeWorkspace();
    const writer = new AuditLogWriter(workspace);
    const input = { ...fixtureInputs.auth, filePath: `${workspace}/src/auth/session.ts` };
    const classification = classifyFile(input, DEFAULT_RULES);
    const decision = evaluateRules(classification, input);

    writer.append(classification, decision, 'SAVE');

    const rows = writer.queryCommitContext(workspace);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.driftStatus).toBeNull(); // no commit entry yet
  });

  it('returns row for saves followed by a linked commit', () => {
    const workspace = makeWorkspace();
    const writer = new AuditLogWriter(workspace);
    // Use a file path rooted inside the workspace so queryCommitContext finds it
    const input = { ...fixtureInputs.auth, filePath: `${workspace}/src/auth/session.ts` };
    const classification = classifyFile(input, DEFAULT_RULES);
    const decision = evaluateRules(classification, input);

    const saveEntry = writer.append(classification, decision, 'SAVE');
    // Simulate a commit entry that links back to this save
    writer.append(classification, {
      ...decision,
      fingerprint: saveEntry.fingerprint,
    }, 'COMMIT');

    const rows = writer.queryCommitContext(workspace);
    const fileRow = rows.find((r) => r.filePath === classification.filePath);
    expect(fileRow).toBeDefined();
  });

  it('returns empty array when no saves exist for repo root', () => {
    const workspace = makeWorkspace();
    const writer = new AuditLogWriter(workspace);
    writer.ensureReady();

    const rows = writer.queryCommitContext(workspace);
    expect(rows).toHaveLength(0);
  });

  it('aggregation + format pipeline produces correct output for mixed state', () => {
    const rows = [
      { filePath: '/repo/auth.ts', driftStatus: 'DRIFT_DETECTED' },
      { filePath: '/repo/schema.ts', driftStatus: null },
      { filePath: '/repo/utils.ts', driftStatus: 'NO_DRIFT' },
    ];
    const summary = aggregateCommitContext(rows);
    const message = formatCommitContextMessage(summary);

    expect(summary.driftCount).toBe(1);
    expect(summary.noDecisionCount).toBe(1);
    expect(summary.verifiedCount).toBe(1);
    expect(message).toContain('ARC: Commit summary');
    expect(message).toContain('1 file with drift');
    expect(message).toContain('1 file without decision');
    expect(message).toContain('1 file verified');
  });

  it('format pipeline returns undefined for all-verified state (no noise on clean commits)', () => {
    const rows = [
      { filePath: '/repo/a.ts', driftStatus: 'NO_DRIFT' },
      { filePath: '/repo/b.ts', driftStatus: 'NO_DRIFT' },
    ];
    const summary = aggregateCommitContext(rows);
    const message = formatCommitContextMessage(summary);
    expect(message).toBeUndefined();
  });
});

