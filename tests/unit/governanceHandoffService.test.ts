import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { GovernanceProposal } from '../../src/contracts/types';
import { GovernanceHandoffService, GovernanceHandoffServiceError } from '../../src/core/governanceHandoffService';
import { GovernanceProposalRegistry } from '../../src/core/governanceProposalRegistry';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-handoff-unit-'));
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

describe('governance handoff service', () => {
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

  function approvedProposal(workspace: string) {
    const registry = new GovernanceProposalRegistry(workspace);
    const item = registry.upsert(proposal());
    return registry.approve(item.id, 'Axis', 'Approved for implementation handoff packaging.');
  }

  it('creates OPEN handoff artifact from approved proposal', () => {
    const workspace = makeWorkspace();
    const approved = approvedProposal(workspace);
    const service = new GovernanceHandoffService(workspace);

    const artifact = service.createFromApprovedProposal(approved.id, 'Forge');

    expect(artifact.proposalId).toBe(approved.id);
    expect(artifact.sourceReviewStatus).toBe('APPROVED');
    expect(artifact.handoffStatus).toBe('OPEN');
    expect(artifact.reviewContext?.decidedBy).toBe('Axis');
  });

  it('rejects handoff creation for pending proposal', () => {
    const workspace = makeWorkspace();
    const registry = new GovernanceProposalRegistry(workspace);
    const pending = registry.upsert(proposal());
    const service = new GovernanceHandoffService(workspace);

    expect(() =>
      service.createFromApprovedProposal(pending.id, 'Forge'),
    ).toThrowError(GovernanceHandoffServiceError);
  });

  it('rejects handoff creation for rejected proposal', () => {
    const workspace = makeWorkspace();
    const registry = new GovernanceProposalRegistry(workspace);
    const item = registry.upsert(proposal());
    const rejected = registry.reject(item.id, 'Axis', 'Rejected by governance review.');
    const service = new GovernanceHandoffService(workspace);

    expect(() =>
      service.createFromApprovedProposal(rejected.id, 'Forge'),
    ).toThrowError(GovernanceHandoffServiceError);
  });

  it('prevents duplicate OPEN handoff for the same approved proposal', () => {
    const workspace = makeWorkspace();
    const approved = approvedProposal(workspace);
    const service = new GovernanceHandoffService(workspace);

    service.createFromApprovedProposal(approved.id, 'Forge');

    expect(() =>
      service.createFromApprovedProposal(approved.id, 'Forge'),
    ).toThrowError(GovernanceHandoffServiceError);
  });
});
