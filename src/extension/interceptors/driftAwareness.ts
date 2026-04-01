import type { DriftStatus } from '../../contracts/types';

export interface DriftAwarenessSink {
  warn(message: string): void;
  append(message: string): void;
}

export function driftAwarenessMessage(
  driftStatus?: DriftStatus,
): string | undefined {
  if (driftStatus === 'DRIFT_DETECTED') {
    return 'ARC: Drift detected — commit differs from recorded decision';
  }

  if (driftStatus === 'NO_LINKED_DECISION') {
    return 'ARC: No linked decision found for this commit';
  }

  return undefined;
}

export function emitDriftAwarenessSignal(
  driftStatus: DriftStatus | undefined,
  sink: DriftAwarenessSink,
): void {
  const message = driftAwarenessMessage(driftStatus);
  if (!message) {
    return;
  }

  sink.append(message);
  sink.warn(message);
}
