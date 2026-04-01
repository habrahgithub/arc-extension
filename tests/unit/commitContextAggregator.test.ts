/**
 * ARC-M4-001 — Commit Context Awareness
 *
 * Unit tests for the pure aggregation and formatting logic.
 */

import { describe, expect, it } from 'vitest';
import {
  aggregateCommitContext,
  formatCommitContextMessage,
} from '../../src/extension/interceptors/commitContextAggregator';

describe('aggregateCommitContext', () => {
  it('counts drift files correctly', () => {
    const rows = [
      { filePath: '/repo/a.ts', driftStatus: 'DRIFT_DETECTED' },
      { filePath: '/repo/b.ts', driftStatus: 'DRIFT_DETECTED' },
      { filePath: '/repo/c.ts', driftStatus: 'NO_DRIFT' },
    ];
    const summary = aggregateCommitContext(rows);
    expect(summary.driftCount).toBe(2);
    expect(summary.noDecisionCount).toBe(0);
    expect(summary.verifiedCount).toBe(1);
  });

  it('counts NO_LINKED_DECISION and null as no-decision', () => {
    const rows = [
      { filePath: '/repo/a.ts', driftStatus: 'NO_LINKED_DECISION' },
      { filePath: '/repo/b.ts', driftStatus: null },
    ];
    const summary = aggregateCommitContext(rows);
    expect(summary.driftCount).toBe(0);
    expect(summary.noDecisionCount).toBe(2);
    expect(summary.verifiedCount).toBe(0);
  });

  it('counts NO_DRIFT and FINGERPRINT_UNAVAILABLE as verified', () => {
    const rows = [
      { filePath: '/repo/a.ts', driftStatus: 'NO_DRIFT' },
      { filePath: '/repo/b.ts', driftStatus: 'FINGERPRINT_UNAVAILABLE' },
    ];
    const summary = aggregateCommitContext(rows);
    expect(summary.driftCount).toBe(0);
    expect(summary.noDecisionCount).toBe(0);
    expect(summary.verifiedCount).toBe(2);
  });

  it('returns all zeros for empty rows', () => {
    const summary = aggregateCommitContext([]);
    expect(summary.driftCount).toBe(0);
    expect(summary.noDecisionCount).toBe(0);
    expect(summary.verifiedCount).toBe(0);
  });

  it('aggregates mixed statuses correctly', () => {
    const rows = [
      { filePath: '/repo/a.ts', driftStatus: 'DRIFT_DETECTED' },
      { filePath: '/repo/b.ts', driftStatus: 'NO_LINKED_DECISION' },
      { filePath: '/repo/c.ts', driftStatus: null },
      { filePath: '/repo/d.ts', driftStatus: 'NO_DRIFT' },
      { filePath: '/repo/e.ts', driftStatus: 'FINGERPRINT_UNAVAILABLE' },
    ];
    const summary = aggregateCommitContext(rows);
    expect(summary.driftCount).toBe(1);
    expect(summary.noDecisionCount).toBe(2);
    expect(summary.verifiedCount).toBe(2);
  });
});

describe('formatCommitContextMessage', () => {
  it('returns undefined when nothing actionable (no drift, no unlinked)', () => {
    expect(
      formatCommitContextMessage({ driftCount: 0, noDecisionCount: 0, verifiedCount: 3 }),
    ).toBeUndefined();
  });

  it('returns undefined for all-zero summary', () => {
    expect(
      formatCommitContextMessage({ driftCount: 0, noDecisionCount: 0, verifiedCount: 0 }),
    ).toBeUndefined();
  });

  it('emits message when drift > 0', () => {
    const msg = formatCommitContextMessage({
      driftCount: 1,
      noDecisionCount: 0,
      verifiedCount: 2,
    });
    expect(msg).toBeDefined();
    expect(msg).toContain('ARC: Commit summary');
    expect(msg).toContain('1 file with drift');
    expect(msg).toContain('2 files verified');
    expect(msg).not.toContain('without decision');
  });

  it('emits message when noDecision > 0', () => {
    const msg = formatCommitContextMessage({
      driftCount: 0,
      noDecisionCount: 3,
      verifiedCount: 0,
    });
    expect(msg).toBeDefined();
    expect(msg).toContain('3 files without decision');
    expect(msg).not.toContain('with drift');
    expect(msg).not.toContain('verified');
  });

  it('emits combined message for drift + noDecision + verified', () => {
    const msg = formatCommitContextMessage({
      driftCount: 2,
      noDecisionCount: 1,
      verifiedCount: 4,
    });
    expect(msg).toBeDefined();
    expect(msg).toContain('2 files with drift');
    expect(msg).toContain('1 file without decision');
    expect(msg).toContain('4 files verified');
  });

  it('uses singular for count of 1', () => {
    const msg = formatCommitContextMessage({
      driftCount: 1,
      noDecisionCount: 1,
      verifiedCount: 1,
    });
    expect(msg).toContain('1 file with drift');
    expect(msg).toContain('1 file without decision');
    expect(msg).toContain('1 file verified');
  });
});
