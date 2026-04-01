/**
 * P9-001 — File-Level Audit Indicator
 *
 * Unit tests for the pure state resolution logic.
 */

import { describe, expect, it } from 'vitest';
import { resolveFileAuditState } from '../../src/extension/fileAuditState';

describe('resolveFileAuditState', () => {
  it('returns NO_DECISION when row is null (no SAVE entry)', () => {
    expect(resolveFileAuditState(null)).toBe('NO_DECISION');
  });

  it('returns DRIFT when drift_status is DRIFT_DETECTED', () => {
    expect(
      resolveFileAuditState({ decisionId: 'abc', driftStatus: 'DRIFT_DETECTED' }),
    ).toBe('DRIFT');
  });

  it('returns VERIFIED when drift_status is NO_DRIFT', () => {
    expect(
      resolveFileAuditState({ decisionId: 'abc', driftStatus: 'NO_DRIFT' }),
    ).toBe('VERIFIED');
  });

  it('returns VERIFIED when drift_status is FINGERPRINT_UNAVAILABLE', () => {
    expect(
      resolveFileAuditState({ decisionId: 'abc', driftStatus: 'FINGERPRINT_UNAVAILABLE' }),
    ).toBe('VERIFIED');
  });

  it('returns VERIFIED when drift_status is null (SAVE exists, no COMMIT yet)', () => {
    // null drift_status = decision exists but no commit observation written yet
    expect(
      resolveFileAuditState({ decisionId: 'abc', driftStatus: null }),
    ).toBe('VERIFIED');
  });

  it('does not return UNKNOWN from resolveFileAuditState (UNKNOWN is for errors only)', () => {
    // resolveFileAuditState only returns NO_DECISION, DRIFT, or VERIFIED
    const states = [
      resolveFileAuditState(null),
      resolveFileAuditState({ decisionId: 'x', driftStatus: 'DRIFT_DETECTED' }),
      resolveFileAuditState({ decisionId: 'x', driftStatus: 'NO_DRIFT' }),
      resolveFileAuditState({ decisionId: 'x', driftStatus: null }),
    ];
    for (const state of states) {
      expect(state).not.toBe('UNKNOWN');
    }
  });
});
