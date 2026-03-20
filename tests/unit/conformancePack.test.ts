import { describe, expect, it } from 'vitest';
import { enforceMinimumFloor } from '../../src/core/decisionPolicy';
import { modelConformanceCases } from '../fixtures/modelConformance';

describe('model conformance pack', () => {
  it('keeps 10 fixed scenarios within the enforcement floor', () => {
    expect(modelConformanceCases).toHaveLength(10);

    for (const scenario of modelConformanceCases) {
      const resolved = enforceMinimumFloor(
        scenario.ruleDecision,
        scenario.classification,
        scenario.modelDecision,
      );

      expect(resolved.decision, scenario.name).toBe(scenario.expectedDecision);
    }
  });
});
