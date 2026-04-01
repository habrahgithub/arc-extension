import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  GovernanceProposal,
  GovernanceReviewStatus,
  GovernanceProposalRecord,
} from '../contracts/types';

const GOVERNANCE_REGISTRY_FILE = 'governance_registry.json';

export function governanceProposalKey(proposal: GovernanceProposal): string {
  return `${proposal.proposalType}:${proposal.triggerCode}`;
}

export class GovernanceProposalRegistry {
  constructor(private readonly workspaceRoot: string) {}

  upsert(proposal: GovernanceProposal): GovernanceProposalRecord {
    const records = this.readRecords();
    const key = governanceProposalKey(proposal);
    const now = new Date().toISOString();
    const existing = records.find((record) => record.id === proposalIdForKey(key));

    if (!existing) {
      const created: GovernanceProposalRecord = {
        id: proposalIdForKey(key),
        ...proposal,
        occurrenceCount: 1,
        firstSeenAt: now,
        lastSeenAt: now,
      };
      records.push(created);
      this.writeRecords(records);
      return created;
    }

    const updated: GovernanceProposalRecord = {
      ...existing,
      summary: proposal.summary,
      rationale: proposal.rationale,
      evidence: proposal.evidence,
      occurrenceCount: existing.occurrenceCount + 1,
      lastSeenAt: now,
    };
    const nextRecords = records.map((record) =>
      record.id === updated.id ? updated : record,
    );
    this.writeRecords(nextRecords);
    return updated;
  }

  listPending(): GovernanceProposalRecord[] {
    return this.readRecords()
      .filter((record) => record.reviewStatus === 'PENDING_REVIEW')
      .sort((a, b) => a.firstSeenAt.localeCompare(b.firstSeenAt));
  }

  listReviewed(): GovernanceProposalRecord[] {
    return this.readRecords()
      .filter((record) => record.reviewStatus !== 'PENDING_REVIEW')
      .sort((a, b) => a.lastSeenAt.localeCompare(b.lastSeenAt));
  }

  getById(id: string): GovernanceProposalRecord | undefined {
    return this.readRecords().find((record) => record.id === id);
  }

  getByKey(key: string): GovernanceProposalRecord | undefined {
    return this.readRecords().find((record) => record.id === proposalIdForKey(key));
  }

  approve(
    id: string,
    decidedBy: string,
    rationale: string,
  ): GovernanceProposalRecord {
    return this.updateReviewStatus(id, 'APPROVED', decidedBy, rationale);
  }

  reject(
    id: string,
    decidedBy: string,
    rationale: string,
  ): GovernanceProposalRecord {
    return this.updateReviewStatus(id, 'REJECTED', decidedBy, rationale);
  }

  private registryPath(): string {
    return path.join(this.workspaceRoot, '.arc', GOVERNANCE_REGISTRY_FILE);
  }

  private ensureReady(): void {
    const arcDir = path.join(this.workspaceRoot, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });
    const registryPath = this.registryPath();
    if (!fs.existsSync(registryPath)) {
      fs.writeFileSync(registryPath, '[]\n', 'utf8');
    }
  }

  private readRecords(): GovernanceProposalRecord[] {
    this.ensureReady();
    const payload = fs.readFileSync(this.registryPath(), 'utf8').trim();
    if (!payload) {
      return [];
    }

    return JSON.parse(payload) as GovernanceProposalRecord[];
  }

  private writeRecords(records: GovernanceProposalRecord[]): void {
    this.ensureReady();
    fs.writeFileSync(this.registryPath(), `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  }

  private updateReviewStatus(
    id: string,
    targetStatus: Exclude<GovernanceReviewStatus, 'PENDING_REVIEW'>,
    decidedBy: string,
    rationale: string,
  ): GovernanceProposalRecord {
    const normalizedDecider = decidedBy.trim();
    if (!normalizedDecider) {
      throw new GovernanceProposalRegistryError(
        'INVALID_DECIDER',
        'decidedBy must be a non-empty string.',
      );
    }

    const normalizedRationale = rationale.trim();
    if (!normalizedRationale) {
      throw new GovernanceProposalRegistryError(
        'INVALID_RATIONALE',
        'rationale must be a non-empty string.',
      );
    }

    const records = this.readRecords();
    const existing = records.find((record) => record.id === id);
    if (!existing) {
      throw new GovernanceProposalRegistryError(
        'RECORD_NOT_FOUND',
        `No governance proposal record found for id ${id}.`,
      );
    }

    if (existing.reviewStatus !== 'PENDING_REVIEW') {
      throw new GovernanceProposalRegistryError(
        'INVALID_STATUS_TRANSITION',
        `Cannot transition ${existing.reviewStatus} to ${targetStatus}.`,
      );
    }

    const updated: GovernanceProposalRecord = {
      ...existing,
      reviewStatus: targetStatus,
      reviewDecision: {
        decidedAt: new Date().toISOString(),
        decidedBy: normalizedDecider,
        rationale: normalizedRationale,
      },
    };
    const nextRecords = records.map((record) =>
      record.id === existing.id ? updated : record,
    );
    this.writeRecords(nextRecords);
    return updated;
  }
}

export class GovernanceProposalRegistryError extends Error {
  constructor(
    readonly code:
      | 'INVALID_STATUS_TRANSITION'
      | 'INVALID_DECIDER'
      | 'INVALID_RATIONALE'
      | 'RECORD_NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'GovernanceProposalRegistryError';
  }
}

function proposalIdForKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}
