import type {
  ExplanationCode,
  GovernanceFeedbackInput,
  GovernanceProposal,
  GovernanceProposalType,
} from '../contracts/types';

export const GOVERNANCE_PROPOSAL_THRESHOLD = 3;

const GOVERNANCE_PROPOSAL_MAP: Record<
  Exclude<ExplanationCode, 'NO_DEVIATION'>,
  {
    proposalType: GovernanceProposalType;
    summary: string;
    rationale: string;
    evidence: (input: GovernanceFeedbackInput) => string[];
  }
> = {
  TOOL_SEQUENCE_MISMATCH: {
    proposalType: 'REVIEW_CONTRACT',
    summary: 'Repeated tool sequence mismatch suggests contract review.',
    rationale: 'Observed execution repeatedly diverged from allowed sequence.',
    evidence: (input) => [
      `trigger_code=${input.explanation.code}`,
      `occurrence_count=${input.recentPattern?.occurrenceCount ?? 0}`,
      readEvidence(input.explanation.evidence, 'expected_sequence'),
      readEvidence(input.explanation.evidence, 'observed_sequence'),
    ],
  },
  REQUIRED_POLICY_MISSING: {
    proposalType: 'REVIEW_POLICY_REQUIREMENT',
    summary: 'Repeated missing required policy suggests policy review.',
    rationale: 'Executions repeatedly occurred without required policy context.',
    evidence: (input) => [
      `trigger_code=${input.explanation.code}`,
      `occurrence_count=${input.recentPattern?.occurrenceCount ?? 0}`,
      readEvidence(input.explanation.evidence, 'missing_policy'),
      readEvidence(input.explanation.evidence, 'available_policies'),
    ],
  },
  OUTPUT_SHAPE_MISMATCH: {
    proposalType: 'REVIEW_OUTPUT_CONTRACT',
    summary: 'Repeated output shape mismatch suggests output contract review.',
    rationale: 'Execution outputs repeatedly diverged from declared shape contract.',
    evidence: (input) => [
      `trigger_code=${input.explanation.code}`,
      `occurrence_count=${input.recentPattern?.occurrenceCount ?? 0}`,
      readEvidence(input.explanation.evidence, 'expected_shape'),
      readEvidence(input.explanation.evidence, 'observed_shape'),
    ],
  },
};

export class GovernanceFeedbackEvaluator {
  evaluate(input: GovernanceFeedbackInput): GovernanceProposal | undefined {
    if (!input.deviation.isDeviation) {
      return undefined;
    }

    if (input.failureType !== 'TYPE-B') {
      return undefined;
    }

    const occurrenceCount = input.recentPattern?.occurrenceCount ?? 0;
    if (occurrenceCount < GOVERNANCE_PROPOSAL_THRESHOLD) {
      return undefined;
    }

    if (input.explanation.code === 'NO_DEVIATION') {
      return undefined;
    }

    const rule = GOVERNANCE_PROPOSAL_MAP[input.explanation.code];
    return {
      proposalType: rule.proposalType,
      triggerCode: input.explanation.code,
      summary: rule.summary,
      rationale: rule.rationale,
      evidence: rule.evidence(input),
      reviewStatus: 'PENDING_REVIEW',
    };
  }
}

function readEvidence(evidence: string[], key: string): string {
  const value = evidence.find((item) => item.startsWith(`${key}=`));
  return value ?? `${key}=UNKNOWN`;
}
