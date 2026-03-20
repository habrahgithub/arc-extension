import crypto from 'node:crypto';
import type {
  Classification,
  DecisionPayload,
  Decision,
  LeaseRecord,
  SaveInput,
} from '../contracts/types';

export class DecisionLeaseStore {
  private readonly leases = new Map<string, LeaseRecord>();

  constructor(private readonly ttlMs = 5 * 60 * 1000) {}

  fingerprint(input: SaveInput, classification: Classification): string {
    return crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          filePath: classification.filePath,
          text: input.text,
          riskFlags: classification.riskFlags,
          matchedRuleIds: classification.matchedRuleIds,
        }),
      )
      .digest('hex');
  }

  getReusableDecision(
    input: SaveInput,
    classification: Classification,
    decision: Decision,
  ): DecisionPayload | undefined {
    if (!this.isLeaseEligible(decision)) {
      return undefined;
    }

    const fingerprint = this.fingerprint(input, classification);
    const record = this.leases.get(classification.filePath);

    if (!record || record.fingerprint !== fingerprint) {
      return undefined;
    }

    if (record.expiresAt < Date.now()) {
      this.leases.delete(classification.filePath);
      return undefined;
    }

    return {
      ...record.decision,
      lease_status: 'REUSED',
    };
  }

  store(
    input: SaveInput,
    classification: Classification,
    decision: DecisionPayload,
  ): DecisionPayload {
    if (!this.isLeaseEligible(decision.decision)) {
      return {
        ...decision,
        lease_status: 'BYPASSED',
      };
    }

    const fingerprint = this.fingerprint(input, classification);
    const storedDecision: DecisionPayload = {
      ...decision,
      lease_status: 'NEW',
    };

    this.leases.set(classification.filePath, {
      fingerprint,
      decision: storedDecision,
      expiresAt: Date.now() + this.ttlMs,
    });

    return storedDecision;
  }

  isLeaseEligible(decision: Decision): boolean {
    return decision === 'WARN' || decision === 'REQUIRE_PLAN';
  }
}
