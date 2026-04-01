import type {
  ExecutionEnvelope,
  ExecutionProtocol,
  ExecutionToken,
  ReadinessVerdict,
} from '../contracts/types';
import crypto from 'node:crypto';

export class ExecutionGovernance {
  /**
   * M11 — Define Execution Protocol
   */
  defineProtocol(input: Partial<ExecutionProtocol>): ExecutionProtocol {
    if (!input.protocolId) throw new Error('Protocol ID is required');
    
    return {
      protocolId: input.protocolId,
      requiredChecks: input.requiredChecks ?? [],
      requiredApprovals: input.requiredApprovals ?? [],
      constraints: input.constraints ?? [],
      allowedMode: input.allowedMode ?? 'CONTROLLED',
    };
  }

  /**
   * M12 — Verify Execution Readiness
   */
  verifyReadiness(
    packageHash: string,
    protocol: ExecutionProtocol,
    evidence: {
      passedChecks: string[];
      confirmedApprovals: string[];
      constraintsAcknowledged: boolean;
      packageValid: boolean;
    }
  ): ReadinessVerdict {
    const checksPassed = protocol.requiredChecks.filter((c) =>
      evidence.passedChecks.includes(c)
    );
    const checksFailed = protocol.requiredChecks.filter(
      (c) => !evidence.passedChecks.includes(c)
    );

    const approvalsPresent = protocol.requiredApprovals.filter((a) =>
      evidence.confirmedApprovals.includes(a)
    );
    const approvalsMissing = protocol.requiredApprovals.filter(
      (a) => !evidence.confirmedApprovals.includes(a)
    );

    const ok =
      checksFailed.length === 0 &&
      approvalsMissing.length === 0 &&
      evidence.constraintsAcknowledged &&
      evidence.packageValid;

    let reason: string | undefined;
    if (!ok) {
      const parts = [];
      if (checksFailed.length > 0) parts.push(`Failed checks: ${checksFailed.join(', ')}`);
      if (approvalsMissing.length > 0) parts.push(`Missing approvals: ${approvalsMissing.join(', ')}`);
      if (!evidence.constraintsAcknowledged) parts.push('Constraints not acknowledged');
      if (!evidence.packageValid) parts.push('Package invalid');
      reason = parts.join('; ');
    }

    return {
      ok,
      timestamp: new Date().toISOString(),
      checksPassed,
      checksFailed,
      approvalsPresent,
      approvalsMissing,
      constraintsAcknowledged: evidence.constraintsAcknowledged,
      packageValid: evidence.packageValid,
      reason,
    };
  }

  /**
   * M13 — Issue Execution Token
   */
  issueToken(
    packageHash: string,
    protocolId: string,
    verdict: ReadinessVerdict,
    ttlMinutes: number = 15
  ): ExecutionToken {
    if (!verdict.ok) {
      throw new Error(`Cannot issue token for invalid readiness verdict: ${verdict.reason}`);
    }

    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(
      new Date(verdict.timestamp).getTime() + ttlMinutes * 60000
    ).toISOString();

    return {
      tokenId,
      packageHash,
      protocolId,
      verdictTimestamp: verdict.timestamp,
      expiresAt,
      reused: false,
    };
  }

  /**
   * M14 — Define Execution Envelope
   */
  defineEnvelope(input: Partial<ExecutionEnvelope>): ExecutionEnvelope {
    return {
      allowedPaths: input.allowedPaths ?? [],
      blockedPaths: input.blockedPaths ?? [],
      evidenceLoggingRequired: input.evidenceLoggingRequired ?? true,
      rollbackRequirement: input.rollbackRequirement ?? 'MANDATORY',
      stopConditions: input.stopConditions ?? ['ANY_ERROR'],
    };
  }

  /**
   * Verify an Execution Token for validity (expiry and reuse)
   */
  verifyToken(token: ExecutionToken): { ok: boolean; reason?: string } {
    if (token.reused) {
      return { ok: false, reason: 'Token has already been used' };
    }

    const now = new Date();
    const expiresAt = new Date(token.expiresAt);

    if (now > expiresAt) {
      return { ok: false, reason: `Token expired at ${token.expiresAt}` };
    }

    return { ok: true };
  }
}
