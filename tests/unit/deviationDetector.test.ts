import { describe, expect, it } from 'vitest';
import type { BehaviorContract, ExecutionEvent } from '../../src/contracts/types';
import { DeviationDetector } from '../../src/core/deviationDetector';

describe('deviation detector', () => {
  const detector = new DeviationDetector();

  function event(overrides: Partial<ExecutionEvent> = {}): ExecutionEvent {
    return {
      eventType: 'RUN',
      toolSequence: ['workbench.action.files.save'],
      activePolicies: ['AUDIT_MODE'],
      outputShape: 'NON_EMPTY_TEXT',
      ...overrides,
    };
  }

  it('returns NONE when contract is satisfied', () => {
    const contract: BehaviorContract = {
      allowedToolSequence: ['workbench.action.files.save'],
      requiredPolicies: ['AUDIT_MODE'],
      expectedOutputShape: 'NON_EMPTY_TEXT',
    };

    expect(detector.evaluate(event(), contract)).toEqual({
      isDeviation: false,
      type: 'NONE',
    });
  });

  it('detects sequence deviation deterministically', () => {
    const contract: BehaviorContract = {
      allowedToolSequence: ['git.commit'],
    };

    const result = detector.evaluate(event(), contract);
    expect(result.isDeviation).toBe(true);
    expect(result.type).toBe('SEQUENCE');
    expect(result.reason).toContain('does not match allowed sequence');
  });

  it('detects policy deviation when required policy is absent', () => {
    const contract: BehaviorContract = {
      requiredPolicies: ['AUDIT_MODE', 'SWD_PHASE_MODE'],
    };

    const result = detector.evaluate(event({ activePolicies: ['AUDIT_MODE'] }), contract);
    expect(result.isDeviation).toBe(true);
    expect(result.type).toBe('POLICY');
    expect(result.reason).toContain('SWD_PHASE_MODE');
  });
});
