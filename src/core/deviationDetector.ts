import type {
  BehaviorContract,
  DeviationResult,
  ExecutionEvent,
} from '../contracts/types';

export class DeviationDetector {
  evaluate(
    event: ExecutionEvent,
    contract?: BehaviorContract,
  ): DeviationResult {
    if (!contract) {
      return { isDeviation: false, type: 'NONE' };
    }

    if (contract.allowedToolSequence && contract.allowedToolSequence.length > 0) {
      const sequenceMismatch =
        event.toolSequence.length !== contract.allowedToolSequence.length ||
        event.toolSequence.some(
          (tool, index) => tool !== contract.allowedToolSequence?.[index],
        );
      if (sequenceMismatch) {
        return {
          isDeviation: true,
          type: 'SEQUENCE',
          reason: `Observed tool sequence ${formatList(event.toolSequence)} does not match allowed sequence ${formatList(contract.allowedToolSequence)}.`,
        };
      }
    }

    if (contract.requiredPolicies && contract.requiredPolicies.length > 0) {
      const missingPolicy = contract.requiredPolicies.find(
        (policy) => !event.activePolicies.includes(policy),
      );
      if (missingPolicy) {
        return {
          isDeviation: true,
          type: 'POLICY',
          reason: `Missing required policy: ${missingPolicy}.`,
        };
      }
    }

    if (
      contract.expectedOutputShape !== undefined &&
      event.outputShape !== contract.expectedOutputShape
    ) {
      return {
        isDeviation: true,
        type: 'SHAPE',
        reason: `Observed output shape ${event.outputShape ?? 'undefined'} does not match expected shape ${contract.expectedOutputShape}.`,
      };
    }

    return { isDeviation: false, type: 'NONE' };
  }
}

function formatList(values: string[]): string {
  if (values.length === 0) {
    return '[]';
  }

  return `[${values.join(', ')}]`;
}
