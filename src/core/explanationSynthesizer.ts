import type { ExplanationInput, ExplanationResult } from '../contracts/types';

const EXPLANATION_TABLE: Record<
  NonNullable<ExplanationInput['deviation']['type']>,
  Omit<ExplanationResult, 'evidence'> & { evidence: (input: ExplanationInput) => string[] }
> = {
  NONE: {
    code: 'NO_DEVIATION',
    summary: 'No deviation was detected.',
    cause: 'Execution event satisfied the behavior contract.',
    evidence: () => [],
  },
  SEQUENCE: {
    code: 'TOOL_SEQUENCE_MISMATCH',
    summary: 'Expected sequence was not followed.',
    cause: 'Observed action/tool did not match the allowed sequence contract.',
    evidence: (input) => {
      const expected = input.contract?.allowedToolSequence ?? [];
      const observed = input.event.toolSequence;
      return [
        `expected_sequence=${formatList(expected)}`,
        `observed_sequence=${formatList(observed)}`,
      ];
    },
  },
  POLICY: {
    code: 'REQUIRED_POLICY_MISSING',
    summary: 'Required policy was absent during execution.',
    cause: 'Execution occurred without required policy present in contract.',
    evidence: (input) => {
      const missing =
        input.contract?.requiredPolicies?.find(
          (policy) => !input.event.activePolicies.includes(policy),
        ) ?? 'UNKNOWN_POLICY';
      return [
        `missing_policy=${missing}`,
        `available_policies=${formatList(input.event.activePolicies)}`,
      ];
    },
  },
  SHAPE: {
    code: 'OUTPUT_SHAPE_MISMATCH',
    summary: 'Observed output did not match expected contract shape.',
    cause: 'Execution result shape diverged from declared contract.',
    evidence: (input) => [
      `expected_shape=${input.contract?.expectedOutputShape ?? 'UNSPECIFIED'}`,
      `observed_shape=${input.event.outputShape ?? 'UNSPECIFIED'}`,
    ],
  },
};

export class ExplanationSynthesizer {
  synthesize(input: ExplanationInput): ExplanationResult | undefined {
    if (!input.deviation.isDeviation) {
      return undefined;
    }

    const mapping = EXPLANATION_TABLE[input.deviation.type];
    return {
      code: mapping.code,
      summary: mapping.summary,
      cause: mapping.cause,
      evidence: mapping.evidence(input),
    };
  }
}

function formatList(values: string[]): string {
  if (values.length === 0) {
    return '[]';
  }

  return `[${values.join(',')}]`;
}
