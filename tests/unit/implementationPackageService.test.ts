import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { GovernanceProposal } from '../../src/contracts/types';
import { GovernanceHandoffService } from '../../src/core/governanceHandoffService';
import { ImplementationDraftService } from '../../src/core/implementationDraftService';
import {
  ImplementationPackageService,
  ImplementationPackageServiceError,
} from '../../src/core/implementationPackageService';
import { GovernanceProposalRegistry } from '../../src/core/governanceProposalRegistry';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-package-unit-'));
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

describe('implementation package service', () => {
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

  function createPromotedCandidate(
    workspace: string,
    proposalOverrides: Partial<GovernanceProposal> = {},
  ) {
    const registry = new GovernanceProposalRegistry(workspace);
    const item = registry.upsert(proposal(proposalOverrides));
    const approved = registry.approve(
      item.id,
      'Axis',
      'Approved for deterministic implementation package creation.',
    );
    const handoff = new GovernanceHandoffService(workspace).createFromApprovedProposal(
      approved.id,
      'Forge',
    );
    const draftService = new ImplementationDraftService(workspace);
    const draft = draftService.createFromHandoff(handoff.id, 'Forge');
    draftService.approveDraft(draft.id, 'Axis', 'Approved for package conversion.');
    draftService.promoteDraft(
      draft.id,
      'Axis',
      'Promoted as candidate for package creation.',
    );
    const candidate = draftService.getCandidateByDraftId(draft.id);
    if (!candidate) {
      throw new Error('Expected candidate to be available.');
    }
    return candidate;
  }

  it('creates implementation package from valid candidate', () => {
    const workspace = makeWorkspace();
    const candidate = createPromotedCandidate(workspace);
    const service = new ImplementationPackageService(workspace);

    const created = service.createFromCandidate(candidate.id, 'Forge');

    expect(created.candidateId).toBe(candidate.id);
    expect(created.packageStatus).toBe('DEFINED');
    expect(created.approvalRequired).toBe(true);
    expect(created.authorizationDecision).toBeUndefined();
    expect(service.getByCandidateId(candidate.id)?.id).toBe(created.id);
  });

  it('enforces deterministic one-package-per-candidate identity', () => {
    const workspace = makeWorkspace();
    const candidate = createPromotedCandidate(workspace);
    const service = new ImplementationPackageService(workspace);

    const first = service.createFromCandidate(candidate.id, 'Forge');
    expect(first.id).toBe(service.getByCandidateId(candidate.id)?.id);

    expect(() =>
      service.createFromCandidate(candidate.id, 'Forge'),
    ).toThrowError(ImplementationPackageServiceError);
  });

  it('rejects missing candidates and blank actor', () => {
    const workspace = makeWorkspace();
    const service = new ImplementationPackageService(workspace);

    expect(() => service.createFromCandidate('missing', 'Forge')).toThrowError(
      ImplementationPackageServiceError,
    );
    expect(() => service.createFromCandidate('missing', '   ')).toThrowError(
      ImplementationPackageServiceError,
    );
  });

  it('authorizes package from DEFINED state with explicit decision payload', () => {
    const workspace = makeWorkspace();
    const candidate = createPromotedCandidate(workspace);
    const service = new ImplementationPackageService(workspace);
    const created = service.createFromCandidate(candidate.id, 'Forge');

    const authorized = service.authorizePackage(
      created.id,
      'Axis',
      'Approved for future governed execution consideration.',
    );

    expect(authorized.packageStatus).toBe('AUTHORIZED');
    expect(authorized.authorizationDecision?.decidedBy).toBe('Axis');
    expect(service.listAuthorized()).toHaveLength(1);
    expect(service.listDefined()).toEqual([]);
  });

  it('denies package from DEFINED state with explicit decision payload', () => {
    const workspace = makeWorkspace();
    const candidate = createPromotedCandidate(workspace);
    const service = new ImplementationPackageService(workspace);
    const created = service.createFromCandidate(candidate.id, 'Forge');

    const denied = service.denyPackage(
      created.id,
      'Axis',
      'Denied pending additional governance review context.',
    );

    expect(denied.packageStatus).toBe('DENIED');
    expect(denied.authorizationDecision?.rationale).toContain('Denied pending');
  });

  it('blocks duplicate decisions and invalid transitions after first decision', () => {
    const workspace = makeWorkspace();
    const candidate = createPromotedCandidate(workspace);
    const service = new ImplementationPackageService(workspace);
    const created = service.createFromCandidate(candidate.id, 'Forge');

    service.authorizePackage(
      created.id,
      'Axis',
      'Approved for future governed execution consideration.',
    );
    expect(() =>
      service.authorizePackage(created.id, 'Axis', 'Attempt duplicate authorization.'),
    ).toThrowError(ImplementationPackageServiceError);
    expect(() =>
      service.denyPackage(created.id, 'Axis', 'Attempt invalid reversal.'),
    ).toThrowError(ImplementationPackageServiceError);
  });

  it('validates authorization actor and rationale', () => {
    const workspace = makeWorkspace();
    const candidate = createPromotedCandidate(workspace);
    const service = new ImplementationPackageService(workspace);
    const created = service.createFromCandidate(candidate.id, 'Forge');

    expect(() => service.authorizePackage(created.id, '   ', 'valid')).toThrowError(
      ImplementationPackageServiceError,
    );
    expect(() => service.denyPackage(created.id, 'Axis', '   ')).toThrowError(
      ImplementationPackageServiceError,
    );
  });
});
