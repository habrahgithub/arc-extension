import { describe, expect, it } from 'vitest';
import type { BehaviorContract, ExecutionEvent, ExplanationInput } from '../../src/contracts/types';
import { ExplanationSynthesizer } from '../../src/core/explanationSynthesizer';

describe('explanation synthesizer', () => {
  const synthesizer = new ExplanationSynthesizer();

  function makeInput(overrides: Partial<ExplanationInput> = {}): ExplanationInput {
    const event: ExecutionEvent = {
      eventType: 'RUN',
      toolSequence: ['workbench.action.files.save'],
      activePolicies: ['AUDIT_MODE'],
      outputShape: 'NON_EMPTY_TEXT',
    };
    const contract: BehaviorContract = {
      allowedToolSequence: ['workbench.action.files.save'],
      requiredPolicies: ['AUDIT_MODE'],
      expectedOutputShape: 'NON_EMPTY_TEXT',
    };

    return {
      event,
      contract,
      deviation: { isDeviation: true, type: 'POLICY', reason: 'Missing required policy: AUDIT_MODE.' },
      failureType: 'TYPE-B',
      ...overrides,
    };
  }

  it('returns undefined when no deviation exists', () => {
    const result = synthesizer.synthesize(
      makeInput({ deviation: { isDeviation: false, type: 'NONE' } }),
    );

    expect(result).toBeUndefined();
  });

  it('maps sequence deviation to TOOL_SEQUENCE_MISMATCH explanation', () => {
    const result = synthesizer.synthesize(
      makeInput({
        event: {
          eventType: 'RUN',
          toolSequence: ['git.commit'],
          activePolicies: ['AUDIT_MODE'],
          outputShape: 'NON_EMPTY_TEXT',
        },
        contract: { allowedToolSequence: ['workbench.action.files.save'] },
        deviation: { isDeviation: true, type: 'SEQUENCE' },
      }),
    );

    expect(result?.code).toBe('TOOL_SEQUENCE_MISMATCH');
    expect(result?.evidence).toContain('expected_sequence=[workbench.action.files.save]');
    expect(result?.evidence).toContain('observed_sequence=[git.commit]');
  });

  it('maps policy deviation to REQUIRED_POLICY_MISSING explanation', () => {
    const result = synthesizer.synthesize(
      makeInput({
        event: {
          eventType: 'RUN',
          toolSequence: ['workbench.action.files.save'],
          activePolicies: [],
          outputShape: 'NON_EMPTY_TEXT',
        },
        contract: { requiredPolicies: ['AUDIT_MODE'] },
        deviation: { isDeviation: true, type: 'POLICY' },
      }),
    );

    expect(result?.code).toBe('REQUIRED_POLICY_MISSING');
    expect(result?.evidence).toContain('missing_policy=AUDIT_MODE');
    expect(result?.evidence).toContain('available_policies=[]');
  });

  it('maps shape deviation to OUTPUT_SHAPE_MISMATCH explanation', () => {
    const result = synthesizer.synthesize(
      makeInput({
        event: {
          eventType: 'RUN',
          toolSequence: ['workbench.action.files.save'],
          activePolicies: ['AUDIT_MODE'],
          outputShape: 'EMPTY_TEXT',
        },
        contract: { expectedOutputShape: 'NON_EMPTY_TEXT' },
        deviation: { isDeviation: true, type: 'SHAPE' },
      }),
    );

    expect(result?.code).toBe('OUTPUT_SHAPE_MISMATCH');
    expect(result?.evidence).toContain('expected_shape=NON_EMPTY_TEXT');
    expect(result?.evidence).toContain('observed_shape=EMPTY_TEXT');
  });
});
