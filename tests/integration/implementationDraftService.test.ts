import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DisabledModelAdapter } from '../../src/adapters/modelAdapter';
import { GovernanceHandoffService } from '../../src/core/governanceHandoffService';
import { ImplementationDraftService } from '../../src/core/implementationDraftService';
import { ImplementationPackageService } from '../../src/core/implementationPackageService';
import { GovernanceProposalRegistry } from '../../src/core/governanceProposalRegistry';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-draft-int-'));
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

describe('implementation draft service integration', () => {
  it('keeps package creation explicit after candidate promotion', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace, new DisabledModelAdapter());
    const filePath = path.join(workspace, 'src', 'draft', 'manual-package.ts');

    delete process.env.AUDIT_MODE;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'export const manualPackage = true;\n', 'utf8');

    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    await orchestrator.observeExecution('workbench.action.files.save', filePath);

    const registry = new GovernanceProposalRegistry(workspace);
    const pending = registry.listPending();
    const firstPending = pending[0];
    if (!firstPending) {
      throw new Error('Expected pending proposal for package explicitness test.');
    }

    registry.approve(firstPending.id, 'Axis', 'Approved for package explicitness test.');
    const handoff = new GovernanceHandoffService(workspace).createFromApprovedProposal(
      firstPending.id,
      'Forge',
    );

    const draftService = new ImplementationDraftService(workspace);
    const draft = draftService.createFromHandoff(handoff.id, 'Forge');
    draftService.approveDraft(draft.id, 'Axis', 'Approved for package conversion.');
    draftService.promoteDraft(
      draft.id,
      'Axis',
      'Promoted as candidate for package conversion.',
    );

    const packageService = new ImplementationPackageService(workspace);
    expect(packageService.list()).toEqual([]);
  });

  it('executes full chain handoff -> draft -> approve -> promote -> candidate', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace, new DisabledModelAdapter());
    const filePath = path.join(workspace, 'src', 'draft', 'chain.ts');

    delete process.env.AUDIT_MODE;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'export const chain = true;\n', 'utf8');

    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    await orchestrator.observeExecution('workbench.action.files.save', filePath);

    const registry = new GovernanceProposalRegistry(workspace);
    const pending = registry.listPending();
    const firstPending = pending[0];
    if (!firstPending) {
      throw new Error('Expected pending proposal for chain test.');
    }

    registry.approve(firstPending.id, 'Axis', 'Approved for chain lifecycle test.');

    const handoffService = new GovernanceHandoffService(workspace);
    const handoff = handoffService.createFromApprovedProposal(firstPending.id, 'Forge');

    const draftService = new ImplementationDraftService(workspace);
    const draft = draftService.createFromHandoff(handoff.id, 'Forge');
    draftService.approveDraft(draft.id, 'Axis', 'Draft approved for promotion.');
    const promoted = draftService.promoteDraft(
      draft.id,
      'Axis',
      'Promoted as implementation package candidate.',
    );

    expect(promoted.draftStatus).toBe('PROMOTED');
    expect(draftService.listCandidates()).toHaveLength(1);
    expect(draftService.getCandidateByDraftId(draft.id)?.status).toBe('CANDIDATE');
  });

  it('does not auto-promote after draft creation', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace, new DisabledModelAdapter());
    const filePath = path.join(workspace, 'src', 'draft', 'manual-promotion.ts');

    delete process.env.AUDIT_MODE;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'export const manualPromotion = true;\n', 'utf8');

    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    await orchestrator.observeExecution('workbench.action.files.save', filePath);

    const registry = new GovernanceProposalRegistry(workspace);
    const pending = registry.listPending();
    const firstPending = pending[0];
    if (!firstPending) {
      throw new Error('Expected pending proposal for manual promotion test.');
    }

    registry.approve(firstPending.id, 'Axis', 'Approved for manual promotion check.');

    const handoffService = new GovernanceHandoffService(workspace);
    const handoff = handoffService.createFromApprovedProposal(firstPending.id, 'Forge');

    const draftService = new ImplementationDraftService(workspace);
    const createdDraft = draftService.createFromHandoff(handoff.id, 'Forge');

    expect(createdDraft.draftStatus).toBe('DRAFT');
    expect(draftService.listCandidates()).toEqual([]);
  });

  it('creates package explicitly from promoted candidate', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace, new DisabledModelAdapter());
    const filePath = path.join(workspace, 'src', 'draft', 'package-chain.ts');

    delete process.env.AUDIT_MODE;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'export const packageChain = true;\n', 'utf8');

    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    await orchestrator.observeExecution('workbench.action.files.save', filePath);

    const registry = new GovernanceProposalRegistry(workspace);
    const pending = registry.listPending();
    const firstPending = pending[0];
    if (!firstPending) {
      throw new Error('Expected pending proposal for package chain test.');
    }

    registry.approve(firstPending.id, 'Axis', 'Approved for package chain lifecycle test.');
    const handoff = new GovernanceHandoffService(workspace).createFromApprovedProposal(
      firstPending.id,
      'Forge',
    );
    const draftService = new ImplementationDraftService(workspace);
    const draft = draftService.createFromHandoff(handoff.id, 'Forge');
    draftService.approveDraft(draft.id, 'Axis', 'Draft approved for package lifecycle.');
    draftService.promoteDraft(
      draft.id,
      'Axis',
      'Promoted as candidate for package lifecycle.',
    );
    const candidate = draftService.getCandidateByDraftId(draft.id);
    if (!candidate) {
      throw new Error('Expected promoted candidate for package chain test.');
    }

    const packageService = new ImplementationPackageService(workspace);
    const pkg = packageService.createFromCandidate(candidate.id, 'Forge');

    expect(pkg.candidateId).toBe(candidate.id);
    expect(pkg.packageStatus).toBe('DEFINED');
    expect(packageService.list()).toHaveLength(1);
  });

  it('candidate -> package -> authorize remains non-executing and runtime-isolated', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace, new DisabledModelAdapter());
    const filePath = path.join(workspace, 'src', 'draft', 'authorize-no-runtime.ts');

    delete process.env.AUDIT_MODE;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'export const authorizeNoRuntime = true;\n', 'utf8');

    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    const auditLogPath = path.join(workspace, '.arc', 'audit_log.json');
    const baselineAudit = fs.existsSync(auditLogPath)
      ? fs.readFileSync(auditLogPath, 'utf8')
      : undefined;

    const registry = new GovernanceProposalRegistry(workspace);
    const firstPending = registry.listPending()[0];
    if (!firstPending) {
      throw new Error('Expected pending proposal for authorization isolation test.');
    }
    registry.approve(
      firstPending.id,
      'Axis',
      'Approved for authorization lifecycle runtime isolation test.',
    );
    const handoff = new GovernanceHandoffService(workspace).createFromApprovedProposal(
      firstPending.id,
      'Forge',
    );
    const draftService = new ImplementationDraftService(workspace);
    const draft = draftService.createFromHandoff(handoff.id, 'Forge');
    draftService.approveDraft(draft.id, 'Axis', 'Draft approved for authorization test.');
    draftService.promoteDraft(
      draft.id,
      'Axis',
      'Promoted as candidate for authorization test.',
    );
    const candidate = draftService.getCandidateByDraftId(draft.id);
    if (!candidate) {
      throw new Error('Expected candidate for authorization isolation test.');
    }

    const packageService = new ImplementationPackageService(workspace);
    const pkg = packageService.createFromCandidate(candidate.id, 'Forge');
    const authorized = packageService.authorizePackage(
      pkg.id,
      'Axis',
      'Authorized for future execution consideration only.',
    );

    const afterAudit = fs.existsSync(auditLogPath)
      ? fs.readFileSync(auditLogPath, 'utf8')
      : undefined;
    expect(authorized.packageStatus).toBe('AUTHORIZED');
    expect(afterAudit).toBe(baselineAudit);
  });
});
