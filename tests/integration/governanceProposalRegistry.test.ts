import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DisabledModelAdapter } from '../../src/adapters/modelAdapter';
import { GovernanceProposalRegistry } from '../../src/core/governanceProposalRegistry';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-registry-int-'));
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

describe('governance proposal registry integration', () => {
  it('removes reviewed records from pending queue', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace, new DisabledModelAdapter());
    const filePath = path.join(workspace, 'src', 'review', 'pending.ts');

    delete process.env.AUDIT_MODE;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'export const pending = true;\n', 'utf8');

    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    await orchestrator.observeExecution('workbench.action.files.save', filePath);

    const pendingBefore = orchestrator.listPendingGovernanceProposals();
    expect(pendingBefore).toHaveLength(1);
    const firstPending = pendingBefore[0];
    if (!firstPending) {
      throw new Error('Expected one pending proposal before review.');
    }

    const registry = new GovernanceProposalRegistry(workspace);
    registry.approve(
      firstPending.id,
      'Axis',
      'Approved for follow-up governance planning.',
    );

    const pendingAfter = registry.listPending();
    expect(pendingAfter).toEqual([]);
    expect(registry.listReviewed()).toHaveLength(1);
  });

  it('preserves reviewed state after restart/reload', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace, new DisabledModelAdapter());
    const filePath = path.join(workspace, 'src', 'review', 'reload.ts');

    delete process.env.AUDIT_MODE;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'export const reload = true;\n', 'utf8');

    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    await orchestrator.observeExecution('workbench.action.files.save', filePath);

    const registry = new GovernanceProposalRegistry(workspace);
    const pending = registry.listPending();
    const firstPending = pending[0];
    if (!firstPending) {
      throw new Error('Expected one pending proposal before reject.');
    }
    const reviewed = registry.reject(
      firstPending.id,
      'Axis',
      'Rejected due to test-only path.',
    );

    const reloadedRegistry = new GovernanceProposalRegistry(workspace);
    const loaded = reloadedRegistry.getById(reviewed.id);

    expect(loaded?.reviewStatus).toBe('REJECTED');
    expect(loaded?.reviewDecision?.decidedBy).toBe('Axis');
    expect(reloadedRegistry.listPending()).toEqual([]);
  });
});
