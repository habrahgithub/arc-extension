import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { GovernanceProposal } from '../../src/contracts/types';
import { GovernanceHandoffService } from '../../src/core/governanceHandoffService';
import {
  ImplementationDraftService,
  ImplementationDraftServiceError,
} from '../../src/core/implementationDraftService';
import { GovernanceProposalRegistry } from '../../src/core/governanceProposalRegistry';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-draft-unit-'));
  workspaces.push(workspace);
  return workspace;
}

afterEach(() => {
  while (workspaces.length > 0) {
    const workspace = workspaces.pop();
    if (workspace) {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }
});

describe('implementation draft service', () => {
  function proposal(overrides: Partial<GovernanceProposal> = {}): GovernanceProposal {
    return {
      proposalType: 'REVIEW_POLICY_REQUIREMENT',
      triggerCode: 'REQUIRED_POLICY_MISSING',
      summary: 'Repeated missing required policy suggests policy review.',
      rationale: 'Executions repeatedly occurred without required policy context.',
      evidence: ['trigger_code=REQUIRED_POLICY_MISSING', 'occurrence_count=3'],
      reviewStatus: 'PENDING_REVIEW',
      ...overrides,
    };
  }

  function createApprovedHandoff(
    workspace: string,
    proposalOverrides: Partial<GovernanceProposal> = {},
  ) {
    const registry = new GovernanceProposalRegistry(workspace);
    const item = registry.upsert(proposal(proposalOverrides));
    const approved = registry.approve(
      item.id,
      'Axis',
      'Approved for deterministic implementation draft packaging.',
    );

    const handoffService = new GovernanceHandoffService(workspace);
    return handoffService.createFromApprovedProposal(approved.id, 'Forge');
  }

  it('creates draft from valid open handoff', () => {
    const workspace = makeWorkspace();
    const handoff = createApprovedHandoff(workspace);
    const draftService = new ImplementationDraftService(workspace);

    const draft = draftService.createFromHandoff(handoff.id, 'Forge');

    expect(draft.handoffId).toBe(handoff.id);
    expect(draft.draftStatus).toBe('DRAFT');
    expect(draft.reviewDecision).toBeUndefined();
  });

  it('approves draft with explicit decision payload', () => {
    const workspace = makeWorkspace();
    const handoff = createApprovedHandoff(workspace);
    const draftService = new ImplementationDraftService(workspace);
    const draft = draftService.createFromHandoff(handoff.id, 'Forge');

    const approved = draftService.approveDraft(
      draft.id,
      'Axis',
      'Draft scope is acceptable for promotion review.',
    );

    expect(approved.draftStatus).toBe('APPROVED');
    expect(approved.reviewDecision?.decidedBy).toBe('Axis');
  });

  it('rejects draft with explicit decision payload', () => {
    const workspace = makeWorkspace();
    const handoff = createApprovedHandoff(workspace);
    const draftService = new ImplementationDraftService(workspace);
    const draft = draftService.createFromHandoff(handoff.id, 'Forge');

    const rejected = draftService.rejectDraft(
      draft.id,
      'Axis',
      'Draft scope is out-of-bounds for implementation review.',
    );

    expect(rejected.draftStatus).toBe('REJECTED');
    expect(rejected.reviewDecision?.rationale).toContain('out-of-bounds');
  });

  it('promotes approved draft and creates package candidate', () => {
    const workspace = makeWorkspace();
    const handoff = createApprovedHandoff(workspace);
    const draftService = new ImplementationDraftService(workspace);
    const draft = draftService.createFromHandoff(handoff.id, 'Forge');

    draftService.approveDraft(draft.id, 'Axis', 'Approved for candidate packaging.');
    const promoted = draftService.promoteDraft(
      draft.id,
      'Axis',
      'Promoted as candidate for future implementation package.',
    );

    expect(promoted.draftStatus).toBe('PROMOTED');
    const candidate = draftService.getCandidateByDraftId(draft.id);
    expect(candidate?.status).toBe('CANDIDATE');
  });

  it('blocks invalid transitions and duplicate candidate creation', () => {
    const workspace = makeWorkspace();
    const handoff = createApprovedHandoff(workspace);
    const draftService = new ImplementationDraftService(workspace);
    const draft = draftService.createFromHandoff(handoff.id, 'Forge');

    draftService.rejectDraft(draft.id, 'Axis', 'Rejected by human review.');
    expect(() =>
      draftService.promoteDraft(draft.id, 'Axis', 'Attempting invalid promote.'),
    ).toThrowError(ImplementationDraftServiceError);

    const secondHandoff = createApprovedHandoff(workspace, {
      triggerCode: 'OUTPUT_SHAPE_MISMATCH',
      proposalType: 'REVIEW_OUTPUT_CONTRACT',
    });
    const secondDraft = draftService.createFromHandoff(secondHandoff.id, 'Forge');
    draftService.approveDraft(secondDraft.id, 'Axis', 'Approve second draft.');
    draftService.promoteDraft(secondDraft.id, 'Axis', 'Promote second draft.');

    expect(() =>
      draftService.promoteDraft(secondDraft.id, 'Axis', 'Duplicate promote.'),
    ).toThrowError(ImplementationDraftServiceError);
  });

  it('enforces rationale/decider validation on review actions', () => {
    const workspace = makeWorkspace();
    const handoff = createApprovedHandoff(workspace);
    const draftService = new ImplementationDraftService(workspace);
    const draft = draftService.createFromHandoff(handoff.id, 'Forge');

    expect(() => draftService.approveDraft(draft.id, '   ', 'valid')).toThrowError(
      ImplementationDraftServiceError,
    );
    expect(() => draftService.rejectDraft(draft.id, 'Axis', '   ')).toThrowError(
      ImplementationDraftServiceError,
    );
  });

  it('maps proposal types deterministically and rejects unsupported types', () => {
    const workspace = makeWorkspace();
    const handoff = createApprovedHandoff(workspace, {
      proposalType: 'REVIEW_OUTPUT_CONTRACT',
      triggerCode: 'OUTPUT_SHAPE_MISMATCH',
    });
    const draftService = new ImplementationDraftService(workspace);

    const mapped = draftService.createFromHandoff(handoff.id, 'Forge');
    expect(mapped.scope).toBe('Output contract review candidate');
    expect(mapped.riskLevel).toBe('MEDIUM');

    const unsupportedHandoff = createApprovedHandoff(workspace, {
      proposalType: 'UNSUPPORTED_TYPE' as GovernanceProposal['proposalType'],
    });
    expect(() =>
      draftService.createFromHandoff(unsupportedHandoff.id, 'Forge'),
    ).toThrowError(ImplementationDraftServiceError);
  });
});
