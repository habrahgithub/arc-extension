import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  GovernanceHandoffArtifact,
  GovernanceProposalRecord,
} from '../contracts/types';
import { GovernanceProposalRegistry } from './governanceProposalRegistry';

const GOVERNANCE_HANDOFF_FILE = 'governance_handoffs.json';

export class GovernanceHandoffService {
  private readonly proposalRegistry: GovernanceProposalRegistry;

  constructor(private readonly workspaceRoot: string) {
    this.proposalRegistry = new GovernanceProposalRegistry(workspaceRoot);
  }

  createFromApprovedProposal(
    proposalId: string,
    createdBy: string,
  ): GovernanceHandoffArtifact {
    const normalizedCreator = createdBy.trim();
    if (!normalizedCreator) {
      throw new GovernanceHandoffServiceError(
        'INVALID_CREATED_BY',
        'createdBy must be a non-empty string.',
      );
    }

    const proposal = this.proposalRegistry.getById(proposalId);
    if (!proposal) {
      throw new GovernanceHandoffServiceError(
        'PROPOSAL_NOT_FOUND',
        `No governance proposal record found for id ${proposalId}.`,
      );
    }

    if (proposal.reviewStatus !== 'APPROVED') {
      throw new GovernanceHandoffServiceError(
        'PROPOSAL_NOT_APPROVED',
        `Proposal ${proposalId} is not approved for handoff packaging.`,
      );
    }

    if (!proposal.reviewDecision) {
      throw new GovernanceHandoffServiceError(
        'MISSING_REVIEW_DECISION',
        `Approved proposal ${proposalId} is missing reviewDecision payload.`,
      );
    }

    const existing = this.getByProposalId(proposalId);
    if (existing && existing.handoffStatus === 'OPEN') {
      throw new GovernanceHandoffServiceError(
        'OPEN_HANDOFF_EXISTS',
        `Open handoff already exists for proposal ${proposalId}.`,
      );
    }

    const artifact = createArtifact(proposal, normalizedCreator);
    const handoffs = this.readStore();
    handoffs.push(artifact);
    this.writeStore(handoffs);
    return artifact;
  }

  listOpen(): GovernanceHandoffArtifact[] {
    return this.readStore().filter((item) => item.handoffStatus === 'OPEN');
  }

  getById(id: string): GovernanceHandoffArtifact | undefined {
    return this.readStore().find((item) => item.id === id);
  }

  getByProposalId(proposalId: string): GovernanceHandoffArtifact | undefined {
    return this.readStore().find((item) => item.proposalId === proposalId);
  }

  private storePath(): string {
    return path.join(this.workspaceRoot, '.arc', GOVERNANCE_HANDOFF_FILE);
  }

  private ensureReady(): void {
    const arcDir = path.join(this.workspaceRoot, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });
    const storePath = this.storePath();
    if (!fs.existsSync(storePath)) {
      fs.writeFileSync(storePath, '[]\n', 'utf8');
    }
  }

  private readStore(): GovernanceHandoffArtifact[] {
    this.ensureReady();
    const payload = fs.readFileSync(this.storePath(), 'utf8').trim();
    if (!payload) {
      return [];
    }

    return JSON.parse(payload) as GovernanceHandoffArtifact[];
  }

  private writeStore(handoffs: GovernanceHandoffArtifact[]): void {
    this.ensureReady();
    fs.writeFileSync(this.storePath(), `${JSON.stringify(handoffs, null, 2)}\n`, 'utf8');
  }
}

function createArtifact(
  proposal: GovernanceProposalRecord,
  createdBy: string,
): GovernanceHandoffArtifact {
  const handoffKey = `proposal:${proposal.id}`;
  return {
    id: crypto.createHash('sha256').update(handoffKey).digest('hex'),
    proposalId: proposal.id,
    proposalType: proposal.proposalType,
    triggerCode: proposal.triggerCode,
    sourceReviewStatus: 'APPROVED',
    createdAt: new Date().toISOString(),
    createdBy,
    summary: proposal.summary,
    rationale: proposal.rationale,
    evidence: proposal.evidence,
    handoffStatus: 'OPEN',
    reviewContext: proposal.reviewDecision,
  };
}

export class GovernanceHandoffServiceError extends Error {
  constructor(
    readonly code:
      | 'INVALID_CREATED_BY'
      | 'PROPOSAL_NOT_FOUND'
      | 'PROPOSAL_NOT_APPROVED'
      | 'MISSING_REVIEW_DECISION'
      | 'OPEN_HANDOFF_EXISTS',
    message: string,
  ) {
    super(message);
    this.name = 'GovernanceHandoffServiceError';
  }
}
