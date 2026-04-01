import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  GovernanceHandoffArtifact,
  GovernanceReviewDecision,
  ImplementationDraft,
  ImplementationPackageCandidate,
} from '../contracts/types';
import { GovernanceHandoffService } from './governanceHandoffService';

const IMPLEMENTATION_DRAFTS_FILE = 'implementation_drafts.json';
const IMPLEMENTATION_CANDIDATES_FILE = 'implementation_package_candidates.json';

type DraftTemplate = {
  scope: string;
  proposedChanges: string[];
  riskLevel: ImplementationDraft['riskLevel'];
};

const DRAFT_TEMPLATE_BY_PROPOSAL_TYPE: Record<string, DraftTemplate> = {
  REVIEW_CONTRACT: {
    scope: 'Contract review candidate',
    proposedChanges: [
      'Review current contract definition',
      'Assess whether contract constraints remain valid',
    ],
    riskLevel: 'MEDIUM',
  },
  REVIEW_POLICY_REQUIREMENT: {
    scope: 'Policy requirement review candidate',
    proposedChanges: [
      'Review current policy requirement',
      'Assess whether required policy should remain enforced',
    ],
    riskLevel: 'HIGH',
  },
  REVIEW_OUTPUT_CONTRACT: {
    scope: 'Output contract review candidate',
    proposedChanges: [
      'Review expected output contract',
      'Assess whether output shape contract remains correct',
    ],
    riskLevel: 'MEDIUM',
  },
};

export class ImplementationDraftService {
  private readonly handoffService: GovernanceHandoffService;

  constructor(private readonly workspaceRoot: string) {
    this.handoffService = new GovernanceHandoffService(workspaceRoot);
  }

  createFromHandoff(handoffId: string, createdBy: string): ImplementationDraft {
    const normalizedCreator = createdBy.trim();
    if (!normalizedCreator) {
      throw new ImplementationDraftServiceError(
        'INVALID_CREATED_BY',
        'createdBy must be a non-empty string.',
      );
    }

    const handoff = this.handoffService.getById(handoffId);
    if (!handoff) {
      throw new ImplementationDraftServiceError(
        'HANDOFF_NOT_FOUND',
        `No handoff artifact found for id ${handoffId}.`,
      );
    }

    if (handoff.handoffStatus !== 'OPEN') {
      throw new ImplementationDraftServiceError(
        'HANDOFF_NOT_OPEN',
        `Handoff ${handoffId} is not OPEN.`,
      );
    }

    if (handoff.sourceReviewStatus !== 'APPROVED') {
      throw new ImplementationDraftServiceError(
        'HANDOFF_NOT_APPROVED_CHAIN',
        `Handoff ${handoffId} does not originate from approved proposal chain.`,
      );
    }

    const existing = this.getByHandoffId(handoffId);
    if (existing && existing.draftStatus === 'DRAFT') {
      throw new ImplementationDraftServiceError(
        'OPEN_DRAFT_EXISTS',
        `Open draft already exists for handoff ${handoffId}.`,
      );
    }

    const template = DRAFT_TEMPLATE_BY_PROPOSAL_TYPE[handoff.proposalType];
    if (!template) {
      throw new ImplementationDraftServiceError(
        'UNSUPPORTED_PROPOSAL_TYPE',
        `Unsupported proposal type ${handoff.proposalType}.`,
      );
    }

    const draft = createDraft(handoff, normalizedCreator, template);
    const drafts = this.readStore();
    drafts.push(draft);
    this.writeStore(drafts);
    return draft;
  }

  listOpen(): ImplementationDraft[] {
    return this.readStore().filter((draft) => draft.draftStatus === 'DRAFT');
  }

  getById(id: string): ImplementationDraft | undefined {
    return this.readStore().find((draft) => draft.id === id);
  }

  getByHandoffId(handoffId: string): ImplementationDraft | undefined {
    return this.readStore().find((draft) => draft.handoffId === handoffId);
  }

  approveDraft(
    id: string,
    decidedBy: string,
    rationale: string,
  ): ImplementationDraft {
    return this.applyReviewDecision(id, 'APPROVED', decidedBy, rationale);
  }

  rejectDraft(
    id: string,
    decidedBy: string,
    rationale: string,
  ): ImplementationDraft {
    return this.applyReviewDecision(id, 'REJECTED', decidedBy, rationale);
  }

  promoteDraft(
    id: string,
    decidedBy: string,
    rationale: string,
  ): ImplementationDraft {
    const decision = normalizeDecision(decidedBy, rationale);
    const drafts = this.readStore();
    const current = drafts.find((draft) => draft.id === id);
    if (!current) {
      throw new ImplementationDraftServiceError(
        'DRAFT_NOT_FOUND',
        `No draft found for id ${id}.`,
      );
    }

    if (current.draftStatus !== 'APPROVED') {
      throw new ImplementationDraftServiceError(
        'INVALID_DRAFT_TRANSITION',
        `Cannot transition ${current.draftStatus} to PROMOTED.`,
      );
    }

    if (this.getCandidateByDraftId(current.id)) {
      throw new ImplementationDraftServiceError(
        'CANDIDATE_EXISTS',
        `Candidate already exists for draft ${current.id}.`,
      );
    }

    const promoted: ImplementationDraft = {
      ...current,
      draftStatus: 'PROMOTED',
      reviewDecision: decision,
    };
    const nextDrafts = drafts.map((draft) =>
      draft.id === promoted.id ? promoted : draft,
    );

    const candidate = createCandidate(promoted, decision.decidedBy);
    const candidates = this.readCandidates();
    candidates.push(candidate);

    this.writeStore(nextDrafts);
    this.writeCandidates(candidates);
    return promoted;
  }

  listCandidates(): ImplementationPackageCandidate[] {
    return this.readCandidates();
  }

  getCandidateByDraftId(
    draftId: string,
  ): ImplementationPackageCandidate | undefined {
    return this.readCandidates().find((candidate) => candidate.draftId === draftId);
  }

  private storePath(): string {
    return path.join(this.workspaceRoot, '.arc', IMPLEMENTATION_DRAFTS_FILE);
  }

  private candidatesPath(): string {
    return path.join(this.workspaceRoot, '.arc', IMPLEMENTATION_CANDIDATES_FILE);
  }

  private ensureReady(): void {
    const arcDir = path.join(this.workspaceRoot, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });
    const storePath = this.storePath();
    if (!fs.existsSync(storePath)) {
      fs.writeFileSync(storePath, '[]\n', 'utf8');
    }
    const candidatesPath = this.candidatesPath();
    if (!fs.existsSync(candidatesPath)) {
      fs.writeFileSync(candidatesPath, '[]\n', 'utf8');
    }
  }

  private readStore(): ImplementationDraft[] {
    this.ensureReady();
    const payload = fs.readFileSync(this.storePath(), 'utf8').trim();
    if (!payload) {
      return [];
    }

    return JSON.parse(payload) as ImplementationDraft[];
  }

  private writeStore(drafts: ImplementationDraft[]): void {
    this.ensureReady();
    fs.writeFileSync(this.storePath(), `${JSON.stringify(drafts, null, 2)}\n`, 'utf8');
  }

  private readCandidates(): ImplementationPackageCandidate[] {
    this.ensureReady();
    const payload = fs.readFileSync(this.candidatesPath(), 'utf8').trim();
    if (!payload) {
      return [];
    }

    return JSON.parse(payload) as ImplementationPackageCandidate[];
  }

  private writeCandidates(candidates: ImplementationPackageCandidate[]): void {
    this.ensureReady();
    fs.writeFileSync(
      this.candidatesPath(),
      `${JSON.stringify(candidates, null, 2)}\n`,
      'utf8',
    );
  }

  private applyReviewDecision(
    id: string,
    targetStatus: 'APPROVED' | 'REJECTED',
    decidedBy: string,
    rationale: string,
  ): ImplementationDraft {
    const decision = normalizeDecision(decidedBy, rationale);
    const drafts = this.readStore();
    const current = drafts.find((draft) => draft.id === id);
    if (!current) {
      throw new ImplementationDraftServiceError(
        'DRAFT_NOT_FOUND',
        `No draft found for id ${id}.`,
      );
    }

    if (current.draftStatus !== 'DRAFT') {
      throw new ImplementationDraftServiceError(
        'INVALID_DRAFT_TRANSITION',
        `Cannot transition ${current.draftStatus} to ${targetStatus}.`,
      );
    }

    const updated: ImplementationDraft = {
      ...current,
      draftStatus: targetStatus,
      reviewDecision: decision,
    };
    const nextDrafts = drafts.map((draft) =>
      draft.id === updated.id ? updated : draft,
    );
    this.writeStore(nextDrafts);
    return updated;
  }
}

function createDraft(
  handoff: GovernanceHandoffArtifact,
  createdBy: string,
  template: DraftTemplate,
): ImplementationDraft {
  const draftKey = `handoff:${handoff.id}`;
  return {
    id: crypto.createHash('sha256').update(draftKey).digest('hex'),
    handoffId: handoff.id,
    proposalId: handoff.proposalId,
    proposalType: handoff.proposalType,
    triggerCode: handoff.triggerCode,
    sourceHandoffStatus: 'OPEN',
    createdAt: new Date().toISOString(),
    createdBy,
    scope: template.scope,
    proposedChanges: template.proposedChanges,
    riskLevel: template.riskLevel,
    draftStatus: 'DRAFT',
  };
}

export class ImplementationDraftServiceError extends Error {
  constructor(
    readonly code:
      | 'INVALID_CREATED_BY'
      | 'INVALID_REVIEW_ACTOR'
      | 'INVALID_REVIEW_RATIONALE'
      | 'HANDOFF_NOT_FOUND'
      | 'HANDOFF_NOT_OPEN'
      | 'HANDOFF_NOT_APPROVED_CHAIN'
      | 'OPEN_DRAFT_EXISTS'
      | 'UNSUPPORTED_PROPOSAL_TYPE'
      | 'DRAFT_NOT_FOUND'
      | 'INVALID_DRAFT_TRANSITION'
      | 'CANDIDATE_EXISTS',
    message: string,
  ) {
    super(message);
    this.name = 'ImplementationDraftServiceError';
  }
}

function normalizeDecision(
  decidedBy: string,
  rationale: string,
): GovernanceReviewDecision {
  const normalizedBy = decidedBy.trim();
  if (!normalizedBy) {
    throw new ImplementationDraftServiceError(
      'INVALID_REVIEW_ACTOR',
      'decidedBy must be a non-empty string.',
    );
  }
  const normalizedRationale = rationale.trim();
  if (!normalizedRationale) {
    throw new ImplementationDraftServiceError(
      'INVALID_REVIEW_RATIONALE',
      'rationale must be a non-empty string.',
    );
  }
  return {
    decidedAt: new Date().toISOString(),
    decidedBy: normalizedBy,
    rationale: normalizedRationale,
  };
}

function createCandidate(
  draft: ImplementationDraft,
  createdBy: string,
): ImplementationPackageCandidate {
  const candidateKey = `draft:${draft.id}`;
  return {
    id: crypto.createHash('sha256').update(candidateKey).digest('hex'),
    draftId: draft.id,
    createdAt: new Date().toISOString(),
    createdBy,
    scope: draft.scope,
    proposedChanges: draft.proposedChanges,
    riskLevel: draft.riskLevel,
    source: {
      proposalId: draft.proposalId,
      handoffId: draft.handoffId,
    },
    status: 'CANDIDATE',
  };
}
