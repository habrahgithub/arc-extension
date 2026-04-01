import { describe, it, expect } from 'vitest';
import { ExecutionGovernance } from '../../src/core/executionGovernance';

describe('ExecutionGovernance', () => {
  const gov = new ExecutionGovernance();

  describe('M11 — Define Execution Protocol', () => {
    it('defines a valid protocol', () => {
      const protocol = gov.defineProtocol({
        protocolId: 'EP-001',
        requiredChecks: ['lint', 'test'],
        requiredApprovals: ['axis'],
      });
      expect(protocol.protocolId).toBe('EP-001');
      expect(protocol.requiredChecks).toContain('lint');
      expect(protocol.requiredApprovals).toContain('axis');
    });

    it('throws if protocolId is missing', () => {
      expect(() => gov.defineProtocol({})).toThrow('Protocol ID is required');
    });
  });

  describe('M12 — Verify Execution Readiness', () => {
    const protocol = gov.defineProtocol({
      protocolId: 'EP-001',
      requiredChecks: ['lint', 'test'],
      requiredApprovals: ['axis'],
    });

    it('verifies readiness as OK when all conditions met', () => {
      const verdict = gov.verifyReadiness('pkg-hash', protocol, {
        passedChecks: ['lint', 'test'],
        confirmedApprovals: ['axis'],
        constraintsAcknowledged: true,
        packageValid: true,
      });
      expect(verdict.ok).toBe(true);
      expect(verdict.checksFailed).toHaveLength(0);
      expect(verdict.approvalsMissing).toHaveLength(0);
    });

    it('verifies readiness as NOT OK when checks fail', () => {
      const verdict = gov.verifyReadiness('pkg-hash', protocol, {
        passedChecks: ['lint'], // missing 'test'
        confirmedApprovals: ['axis'],
        constraintsAcknowledged: true,
        packageValid: true,
      });
      expect(verdict.ok).toBe(false);
      expect(verdict.checksFailed).toContain('test');
      expect(verdict.reason).toContain('Failed checks: test');
    });

    it('verifies readiness as NOT OK when approvals are missing', () => {
      const verdict = gov.verifyReadiness('pkg-hash', protocol, {
        passedChecks: ['lint', 'test'],
        confirmedApprovals: [], // missing 'axis'
        constraintsAcknowledged: true,
        packageValid: true,
      });
      expect(verdict.ok).toBe(false);
      expect(verdict.approvalsMissing).toContain('axis');
    });
  });

  describe('M13 — Issue Execution Token', () => {
    const protocol = gov.defineProtocol({
      protocolId: 'EP-001',
      requiredChecks: [],
      requiredApprovals: [],
    });

    it('issues a token for a valid verdict', () => {
      const verdict = gov.verifyReadiness('pkg-hash', protocol, {
        passedChecks: [],
        confirmedApprovals: [],
        constraintsAcknowledged: true,
        packageValid: true,
      });
      const token = gov.issueToken('pkg-hash', 'EP-001', verdict);
      expect(token.tokenId).toBeDefined();
      expect(token.packageHash).toBe('pkg-hash');
      expect(token.protocolId).toBe('EP-001');
    });

    it('throws when trying to issue token for invalid verdict', () => {
      const verdict = gov.verifyReadiness('pkg-hash', protocol, {
        passedChecks: [],
        confirmedApprovals: [],
        constraintsAcknowledged: false, // missing acknowledgment
        packageValid: true,
      });
      expect(() => gov.issueToken('pkg-hash', 'EP-001', verdict)).toThrow('Cannot issue token');
    });
  });

  describe('M14 — Define Execution Envelope', () => {
    it('defines a valid envelope', () => {
      const envelope = gov.defineEnvelope({
        allowedPaths: ['src/core/*'],
        stopConditions: ['MANUAL_STOP'],
      });
      expect(envelope.allowedPaths).toContain('src/core/*');
      expect(envelope.stopConditions).toContain('MANUAL_STOP');
      expect(envelope.evidenceLoggingRequired).toBe(true); // default
    });
  });

  describe('verifyToken', () => {
    const verdict = {
      ok: true,
      timestamp: new Date().toISOString(),
      checksPassed: [],
      checksFailed: [],
      approvalsPresent: [],
      approvalsMissing: [],
      constraintsAcknowledged: true,
      packageValid: true,
    };

    it('returns ok for a valid, non-expired, non-reused token', () => {
      const token = gov.issueToken('pkg-hash', 'EP-001', verdict, 15);
      const result = gov.verifyToken(token);
      expect(result.ok).toBe(true);
    });

    it('returns error for a reused token', () => {
      const token = gov.issueToken('pkg-hash', 'EP-001', verdict, 15);
      token.reused = true;
      const result = gov.verifyToken(token);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('Token has already been used');
    });

    it('returns error for an expired token', () => {
      // Issue a token that expired 1 minute ago
      const pastTimestamp = new Date(Date.now() - 20 * 60000).toISOString();
      const expiredVerdict = { ...verdict, timestamp: pastTimestamp };
      const token = gov.issueToken('pkg-hash', 'EP-001', expiredVerdict, 15);
      
      const result = gov.verifyToken(token);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Token expired at');
    });
  });
});
