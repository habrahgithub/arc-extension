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

  fingerprint(
    input: SaveInput,
    classification: Classification,
    decision: Pick<
      DecisionPayload,
      | 'decision'
      | 'directive_id'
      | 'blueprint_id'
      | 'route_mode'
      | 'route_lane'
      | 'route_clarity'
      | 'route_fallback'
      | 'route_policy_hash'
    >,
  ): string {
    return crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          filePath: classification.filePath,
          text: input.text,
          riskFlags: classification.riskFlags,
          matchedRuleIds: classification.matchedRuleIds,
          riskLevel: classification.riskLevel,
          demoted: classification.demoted,
          decision: decision.decision,
          directiveId: decision.directive_id ?? null,
          blueprintId: decision.blueprint_id ?? null,
          routePolicyHash: decision.route_policy_hash ?? null,
          routeSignature: routeSignatureForDecision(decision),
        }),
      )
      .digest('hex');
  }

  getReusableDecision(
    input: SaveInput,
    classification: Classification,
    decision: DecisionPayload,
  ): DecisionPayload | undefined {
    if (!this.isLeaseEligible(decision.decision)) {
      return undefined;
    }

    const record = this.leases.get(classification.filePath);
    if (!record || record.decision.decision !== decision.decision) {
      return undefined;
    }

    const comparisonDecision =
      decision.decision === 'REQUIRE_PLAN'
        ? {
            ...decision,
            directive_id: record.decision.directive_id,
            blueprint_id: record.decision.blueprint_id,
          }
        : decision;
    const fingerprint = this.fingerprint(input, classification, comparisonDecision);

    if (record.fingerprint !== fingerprint) {
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

    const fingerprint = this.fingerprint(input, classification, decision);
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

export function routeSignatureForDecision(
  decision: Pick<
    DecisionPayload,
    'route_mode' | 'route_lane' | 'route_clarity' | 'route_fallback'
  >,
): string {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        route_mode: decision.route_mode ?? null,
        route_lane: decision.route_lane ?? null,
        route_clarity: decision.route_clarity ?? null,
        route_fallback: decision.route_fallback ?? null,
      }),
    )
    .digest('hex');
}
