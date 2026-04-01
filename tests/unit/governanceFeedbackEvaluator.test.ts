import { describe, expect, it } from 'vitest';
import type {
  ExecutionEvent,
  ExplanationResult,
  GovernanceFeedbackInput,
} from '../../src/contracts/types';
import {
  GOVERNANCE_PROPOSAL_THRESHOLD,
  GovernanceFeedbackEvaluator,
} from '../../src/core/governanceFeedbackEvaluator';

describe('governance feedback evaluator', () => {
  const evaluator = new GovernanceFeedbackEvaluator();

  function makeInput(
    explanation: ExplanationResult,
    occurrenceCount = GOVERNANCE_PROPOSAL_THRESHOLD,
  ): GovernanceFeedbackInput {
    const event: ExecutionEvent = {
      eventType: 'RUN',
      toolSequence: ['workbench.action.files.save'],
      activePolicies: [],
      outputShape: 'EMPTY_TEXT',
    };

    return {
      event,
      deviation: {
        isDeviation: true,
        type: 'POLICY',
      },
      explanation,
      failureType: 'TYPE-B',
      recentPattern: {
        occurrenceCount,
      },
    };
  }

  it('returns no proposal below threshold', () => {
    const result = evaluator.evaluate(
      makeInput(
        {
          code: 'REQUIRED_POLICY_MISSING',
          summary: 'Required policy was absent during execution.',
          cause: 'Execution occurred without required policy present in contract.',
          evidence: ['missing_policy=AUDIT_MODE', 'available_policies=[]'],
        },
        GOVERNANCE_PROPOSAL_THRESHOLD - 1,
      ),
    );

    expect(result).toBeUndefined();
  });

  it('returns REVIEW_CONTRACT at threshold for sequence mismatch', () => {
    const result = evaluator.evaluate(
      makeInput({
        code: 'TOOL_SEQUENCE_MISMATCH',
        summary: 'Expected sequence was not followed.',
        cause: 'Observed action/tool did not match the allowed sequence contract.',
        evidence: [
          'expected_sequence=[workbench.action.files.save]',
          'observed_sequence=[git.commit]',
        ],
      }),
    );

    expect(result?.proposalType).toBe('REVIEW_CONTRACT');
    expect(result?.reviewStatus).toBe('PENDING_REVIEW');
    expect(result?.evidence).toContain(
      `occurrence_count=${GOVERNANCE_PROPOSAL_THRESHOLD}`,
    );
  });

  it('returns REVIEW_POLICY_REQUIREMENT at threshold for policy missing', () => {
    const result = evaluator.evaluate(
      makeInput({
        code: 'REQUIRED_POLICY_MISSING',
        summary: 'Required policy was absent during execution.',
        cause: 'Execution occurred without required policy present in contract.',
        evidence: ['missing_policy=AUDIT_MODE', 'available_policies=[]'],
      }),
    );

    expect(result?.proposalType).toBe('REVIEW_POLICY_REQUIREMENT');
    expect(result?.triggerCode).toBe('REQUIRED_POLICY_MISSING');
    expect(result?.evidence).toContain('missing_policy=AUDIT_MODE');
  });

  it('returns REVIEW_OUTPUT_CONTRACT at threshold for shape mismatch', () => {
    const result = evaluator.evaluate(
      makeInput({
        code: 'OUTPUT_SHAPE_MISMATCH',
        summary: 'Observed output did not match expected contract shape.',
        cause: 'Execution result shape diverged from declared contract.',
        evidence: ['expected_shape=NON_EMPTY_TEXT', 'observed_shape=EMPTY_TEXT'],
      }),
    );

    expect(result?.proposalType).toBe('REVIEW_OUTPUT_CONTRACT');
    expect(result?.triggerCode).toBe('OUTPUT_SHAPE_MISMATCH');
    expect(result?.evidence).toContain('expected_shape=NON_EMPTY_TEXT');
  });

  it('returns no proposal for non-deviation path', () => {
    const input = makeInput({
      code: 'REQUIRED_POLICY_MISSING',
      summary: 'Required policy was absent during execution.',
      cause: 'Execution occurred without required policy present in contract.',
      evidence: ['missing_policy=AUDIT_MODE', 'available_policies=[]'],
    });
    input.deviation = { isDeviation: false, type: 'NONE' };

    const result = evaluator.evaluate(input);

    expect(result).toBeUndefined();
  });
});
