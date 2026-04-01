import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { GovernanceProposal } from '../../src/contracts/types';
import {
  GovernanceProposalRegistry,
  GovernanceProposalRegistryError,
  governanceProposalKey,
} from '../../src/core/governanceProposalRegistry';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-registry-'));
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

describe('governance proposal registry', () => {
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

  it('deduplicates identical proposals by deterministic key', () => {
    const workspace = makeWorkspace();
    const registry = new GovernanceProposalRegistry(workspace);

    const first = registry.upsert(proposal());
    const second = registry.upsert(proposal());

    expect(first.id).toBe(second.id);
    expect(second.occurrenceCount).toBe(2);
    expect(registry.listPending()).toHaveLength(1);
  });

  it('increments occurrence and preserves firstSeenAt while updating lastSeenAt', async () => {
    const workspace = makeWorkspace();
    const registry = new GovernanceProposalRegistry(workspace);

    const first = registry.upsert(proposal());
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = registry.upsert(proposal());

    expect(second.occurrenceCount).toBe(2);
    expect(second.firstSeenAt).toBe(first.firstSeenAt);
    expect(second.lastSeenAt >= first.lastSeenAt).toBe(true);
  });

  it('stores separate records for different proposal keys', () => {
    const workspace = makeWorkspace();
    const registry = new GovernanceProposalRegistry(workspace);

    registry.upsert(
      proposal({
        proposalType: 'REVIEW_CONTRACT',
        triggerCode: 'TOOL_SEQUENCE_MISMATCH',
      }),
    );
    registry.upsert(
      proposal({
        proposalType: 'REVIEW_OUTPUT_CONTRACT',
        triggerCode: 'OUTPUT_SHAPE_MISMATCH',
      }),
    );

    expect(registry.listPending()).toHaveLength(2);
  });

  it('approves a pending proposal with explicit decider and rationale', () => {
    const workspace = makeWorkspace();
    const registry = new GovernanceProposalRegistry(workspace);
    const created = registry.upsert(proposal());

    const approved = registry.approve(
      created.id,
      'Axis',
      'Policy requirement remains valid for governance planning.',
    );

    expect(approved.reviewStatus).toBe('APPROVED');
    expect(approved.reviewDecision?.decidedBy).toBe('Axis');
    expect(registry.listPending()).toEqual([]);
    expect(registry.listReviewed()).toHaveLength(1);
  });

  it('rejects a pending proposal with explicit decider and rationale', () => {
    const workspace = makeWorkspace();
    const registry = new GovernanceProposalRegistry(workspace);
    const created = registry.upsert(proposal());

    const rejected = registry.reject(
      created.id,
      'Axis',
      'Pattern is test-only and does not warrant governance action.',
    );

    expect(rejected.reviewStatus).toBe('REJECTED');
    expect(rejected.reviewDecision?.rationale).toContain('test-only');
    expect(registry.listPending()).toEqual([]);
  });

  it('blocks invalid status transitions once reviewed', () => {
    const workspace = makeWorkspace();
    const registry = new GovernanceProposalRegistry(workspace);
    const created = registry.upsert(proposal());

    registry.approve(created.id, 'Axis', 'Accepted for governance tracking.');

    expect(() =>
      registry.reject(created.id, 'Axis', 'Attempting to flip state.'),
    ).toThrowError(GovernanceProposalRegistryError);

    const loaded = registry.getById(created.id);
    expect(loaded?.reviewStatus).toBe('APPROVED');
  });

  it('rejects blank rationale input for review decisions', () => {
    const workspace = makeWorkspace();
    const registry = new GovernanceProposalRegistry(workspace);
    const created = registry.upsert(proposal());

    expect(() => registry.approve(created.id, 'Axis', '   ')).toThrowError(
      GovernanceProposalRegistryError,
    );
  });

  it('rejects blank decidedBy input for review decisions', () => {
    const workspace = makeWorkspace();
    const registry = new GovernanceProposalRegistry(workspace);
    const created = registry.upsert(proposal());

    expect(() => registry.reject(created.id, '   ', 'Valid rationale.')).toThrowError(
      GovernanceProposalRegistryError,
    );
  });

  it('persists reviewed records across new instances', () => {
    const workspace = makeWorkspace();
    const firstInstance = new GovernanceProposalRegistry(workspace);
    const item = firstInstance.upsert(proposal());
    firstInstance.approve(item.id, 'Axis', 'Approved after human review.');

    const secondInstance = new GovernanceProposalRegistry(workspace);
    const loaded = secondInstance.getByKey(governanceProposalKey(proposal()));

    expect(loaded?.id).toBe(item.id);
    expect(loaded?.reviewStatus).toBe('APPROVED');
    expect(loaded?.reviewDecision?.decidedBy).toBe('Axis');
  });
});
