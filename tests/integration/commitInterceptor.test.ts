import { describe, expect, it, vi } from 'vitest';
import {
  driftAwarenessMessage,
  emitDriftAwarenessSignal,
} from '../../src/extension/interceptors/driftAwareness';

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
