import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DisabledModelAdapter } from '../../src/adapters/modelAdapter';
import { GovernanceHandoffService } from '../../src/core/governanceHandoffService';
import { GovernanceProposalRegistry } from '../../src/core/governanceProposalRegistry';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-handoff-int-'));
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

describe('governance handoff service integration', () => {
  it('does not auto-create handoff after approval without explicit create call', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace, new DisabledModelAdapter());
    const filePath = path.join(workspace, 'src', 'handoff', 'manual.ts');

    delete process.env.AUDIT_MODE;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'export const manual = true;\n', 'utf8');

    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    await orchestrator.observeExecution('workbench.action.files.save', filePath);

    const registry = new GovernanceProposalRegistry(workspace);
    const pending = registry.listPending();
    const firstPending = pending[0];
    if (!firstPending) {
      throw new Error('Expected pending proposal for approval.');
    }
    registry.approve(firstPending.id, 'Axis', 'Approved for explicit handoff packaging.');

    const service = new GovernanceHandoffService(workspace);
    expect(service.listOpen()).toEqual([]);
  });

  it('preserves open handoff artifact across reload/restart', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace, new DisabledModelAdapter());
    const filePath = path.join(workspace, 'src', 'handoff', 'persist.ts');

    delete process.env.AUDIT_MODE;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'export const persist = true;\n', 'utf8');

    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    await orchestrator.observeExecution('workbench.action.files.save', filePath);

    const registry = new GovernanceProposalRegistry(workspace);
    const pending = registry.listPending();
    const firstPending = pending[0];
    if (!firstPending) {
      throw new Error('Expected pending proposal for handoff creation.');
    }

    registry.approve(firstPending.id, 'Axis', 'Approved for handoff persistence test.');

    const service = new GovernanceHandoffService(workspace);
    const created = service.createFromApprovedProposal(firstPending.id, 'Forge');

    const reloadedService = new GovernanceHandoffService(workspace);
    const loaded = reloadedService.getById(created.id);

    expect(loaded?.proposalId).toBe(firstPending.id);
    expect(loaded?.handoffStatus).toBe('OPEN');
    expect(reloadedService.listOpen()).toHaveLength(1);
  });
});
