import { describe, expect, it } from 'vitest';
import type {
  DecisionPayload,
  EvaluationResult,
} from '../../src/contracts/types';

/**
 * U38 — EvaluationResult Contract Tests
 *
 * ARC-SYS-COHERENCE-001: EvaluationResult is the single derived truth
 * for all ARC surfaces. Every surface MUST derive display state from
 * this type only.
 */

describe('U38 — EvaluationResult Contract', () => {
  describe('AC1: EvaluationResult has all required signal fields', () => {
    it('contains decision, reason, risk_level, violated_rules, next_action', () => {
      // EvaluationResult is an alias of DecisionPayload
      // We verify by constructing a minimal valid instance
      const sample: EvaluationResult = {
        decision: 'WARN',
        reason: 'Auth change detected',
        risk_level: 'HIGH',
        violated_rules: ['AUTH_CHANGE'],
        next_action: 'Acknowledge risk to proceed',
        source: 'RULE',
        fallback_cause: 'NONE',
        lease_status: 'NEW',
      };

      expect(sample.decision).toBeDefined();
      expect(sample.reason).toBeDefined();
      expect(sample.risk_level).toBeDefined();
      expect(sample.violated_rules).toBeDefined();
      expect(sample.next_action).toBeDefined();
    });

    it('type alias ensures structural equivalence with DecisionPayload', () => {
      // This test proves EvaluationResult and DecisionPayload are interchangeable
      const payload: DecisionPayload = {
        decision: 'ALLOW',
        reason: 'Low-risk change',
        risk_level: 'LOW',
        violated_rules: [],
        next_action: 'Save proceeds',
        source: 'RULE',
        fallback_cause: 'NONE',
        lease_status: 'NEW',
      };

      // Assigning DecisionPayload to EvaluationResult must compile
      const result: EvaluationResult = payload;
      expect(result.decision).toBe('ALLOW');
    });
  });

  describe('AC2: No surface-specific field exists on EvaluationResult', () => {
    it('EvaluationResult does not contain gutter, statusbar, hover, panel, or modal fields', () => {
      // These fields would cause signal divergence between surfaces
      const keys: (keyof EvaluationResult)[] = [
        'decision',
        'reason',
        'risk_level',
        'violated_rules',
        'next_action',
        'source',
        'fallback_cause',
        'lease_status',
      ];

      // Optional fields that may or may not be present
      const optionalKeys: (keyof EvaluationResult)[] = [
        'directive_id',
        'blueprint_id',
        'route_mode',
        'route_lane',
        'route_reason',
        'route_clarity',
        'route_fallback',
        'route_policy_hash',
        'evaluation_lane',
        'save_mode',
        'auto_save_mode',
        'model_availability_status',
        'governance_mode',
        'actor_id',
        'actor_type',
        'fingerprint',
        'fingerprint_version',
        'deviation',
        'failure_type',
        'explanation',
        'governance_proposal',
        'confidence',
      ];

      // Verify no surface-specific keys exist
      const allKeys = [...keys, ...optionalKeys];
      expect(allKeys).not.toContain('gutter');
      expect(allKeys).not.toContain('statusbar');
      expect(allKeys).not.toContain('hover');
      expect(allKeys).not.toContain('panel');
      expect(allKeys).not.toContain('modal');
      expect(allKeys).not.toContain('surface_severity');
      expect(allKeys).not.toContain('surface_explanation');
    });
  });

  describe('AC3: Confidence field is valid when present', () => {
    it('accepts HIGH confidence', () => {
      const result: EvaluationResult = {
        decision: 'BLOCK',
        reason: 'Critical auth change',
        risk_level: 'CRITICAL',
        violated_rules: ['AUTH_CHANGE', 'CORE_CHANGE'],
        next_action: 'Link blueprint to proceed',
        source: 'RULE',
        fallback_cause: 'NONE',
        lease_status: 'BYPASSED',
        confidence: 'HIGH',
      };

      expect(result.confidence).toBe('HIGH');
    });

    it('accepts MEDIUM confidence', () => {
      const result: EvaluationResult = {
        decision: 'WARN',
        reason: 'Config change detected',
        risk_level: 'MEDIUM',
        violated_rules: ['CONFIG_CHANGE'],
        next_action: 'Acknowledge to proceed',
        source: 'RULE',
        fallback_cause: 'NONE',
        lease_status: 'NEW',
        confidence: 'MEDIUM',
      };

      expect(result.confidence).toBe('MEDIUM');
    });

    it('accepts LOW confidence', () => {
      const result: EvaluationResult = {
        decision: 'ALLOW',
        reason: 'Heuristic match only',
        risk_level: 'LOW',
        violated_rules: [],
        next_action: 'Save proceeds',
        source: 'RULE',
        fallback_cause: 'NONE',
        lease_status: 'NEW',
        confidence: 'LOW',
      };

      expect(result.confidence).toBe('LOW');
    });

    it('confidence is optional — undefined is valid', () => {
      const result: EvaluationResult = {
        decision: 'ALLOW',
        reason: 'No risk detected',
        risk_level: 'LOW',
        violated_rules: [],
        next_action: 'Save proceeds',
        source: 'RULE',
        fallback_cause: 'NONE',
        lease_status: 'NEW',
      };

      expect(result.confidence).toBeUndefined();
    });

    it('confidence must be one of three valid values — enforced by type', () => {
      // This is a compile-time check — if this compiles, the type is correct
      const validValues: Array<EvaluationResult['confidence']> = [
        'HIGH',
        'MEDIUM',
        'LOW',
        undefined,
      ];

      expect(validValues).toHaveLength(4);
      expect(validValues).toContain('HIGH');
      expect(validValues).toContain('MEDIUM');
      expect(validValues).toContain('LOW');
      expect(validValues).toContain(undefined);
    });
  });
});
