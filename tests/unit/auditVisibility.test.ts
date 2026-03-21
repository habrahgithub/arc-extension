import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AuditVisibilityService, validateExportBundle } from '../../src/core/auditVisibility';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import { createBlueprintArtifact, fixtureDirectiveIds } from '../fixtures/blueprints';
import { fixtureInputs } from '../fixtures/saveInputs';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-visibility-'));
  workspaces.push(workspace);
  return workspace;
}

async function seedWorkspace(workspace: string): Promise<void> {
  const orchestrator = new SaveOrchestrator(workspace);
  const blueprint = createBlueprintArtifact(workspace);

  const authAssessment = await orchestrator.assessSave(fixtureInputs.auth);
  orchestrator.commitAssessment(authAssessment, true, {
    directiveId: fixtureDirectiveIds.valid,
    blueprintId: blueprint.blueprintId,
  });

  const schemaAssessment = await orchestrator.assessSave(fixtureInputs.schema);
  orchestrator.commitAssessment(schemaAssessment, true);
}

afterEach(() => {
  while (workspaces.length > 0) {
    const workspace = workspaces.pop();
    if (workspace) {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }
});

describe('audit visibility service', () => {
  it('supports deterministic query, directive trace, route trace, perf summary, and versioned export bundle generation', async () => {
    const workspace = makeWorkspace();
    await seedWorkspace(workspace);
    const service = new AuditVisibilityService(workspace);

    const query = service.queryAudit({
      decision: 'REQUIRE_PLAN',
      directiveId: fixtureDirectiveIds.valid,
      filePathIncludes: 'auth',
      routeMode: 'RULE_ONLY',
    });
    const directiveTrace = service.traceDirective(fixtureDirectiveIds.valid);
    const routeTrace = service.traceRoutes({ routeLane: 'RULE_ONLY' });
    const perfSummary = service.summarizePerformance({ operation: 'assess_save' });
    const verification = service.verifyAuditHistory();
    const bundle = service.exportBundle({
      auditFilters: { directiveId: fixtureDirectiveIds.valid },
      perfFilters: { operation: 'assess_save' },
      directiveId: fixtureDirectiveIds.valid,
    });

    expect(query.partial).toBe(false);
    expect(query.matched).toHaveLength(1);
    expect(query.matched[0]?.entry.decision).toBe('REQUIRE_PLAN');
    expect(directiveTrace.blueprint_status).toBe('VALID');
    expect(directiveTrace.matched).toHaveLength(1);
    expect(routeTrace.summaries[0]).toMatchObject({
      route_mode: 'RULE_ONLY',
      route_lane: 'RULE_ONLY',
    });
    expect(perfSummary.operation_summary.find((entry) => entry.operation === 'assess_save')).toBeTruthy();
    expect(verification.status).toBe('VALID');
    expect(bundle.export_version).toBe('phase-6.7-v1');
    expect(bundle.bundle_type).toBe('LINTEL_VAULT_READY_EXPORT');
    expect(bundle.vault_ready).toBe(true);
    expect(bundle.direct_vault_write).toBe(false);
    expect(bundle.direct_arc_dependency).toBe(false);
    expect(bundle.metadata.allowed_destinations).toEqual(['stdout', 'local_file']);
    expect(bundle.sections.audit_slice.evidence_class).toBe('DIRECT_EVIDENCE');
    expect(bundle.sections.route_summary.evidence_class).toBe('DERIVED_SUMMARY');
    expect(bundle.sections.bundle_validation.evidence_class).toBe('VALIDATION_RESULT');
    expect(bundle.bundle_validation.status).toBe('VALID');
    expect(bundle.sections.directive_linkage?.data.directive_id).toBe(fixtureDirectiveIds.valid);
    expect(bundle.sections.blueprint_linkage?.data.blueprint_id).toBeTruthy();
  });

  it('surfaces malformed audit history as partial evidence instead of silently accepting it', async () => {
    const workspace = makeWorkspace();
    await seedWorkspace(workspace);

    fs.appendFileSync(path.join(workspace, '.arc', 'audit.jsonl'), 'not-json\n', 'utf8');

    const service = new AuditVisibilityService(workspace);
    const query = service.queryAudit({});
    const verification = service.verifyAuditHistory();
    const bundle = service.exportBundle({});

    expect(query.partial).toBe(true);
    expect(query.warnings.some((warning) => warning.kind === 'MALFORMED_AUDIT_LINE')).toBe(true);
    expect(verification.status).toBe('PARTIAL');
    expect(bundle.bundle_validation.status).toBe('PARTIAL');
    expect(bundle.sections.bundle_validation.data.issues.some((issue) => issue.code === 'PARTIAL_SOURCE_EVIDENCE')).toBe(true);
  });

  it('fails bundle validation when local-only destination metadata is corrupted', async () => {
    const workspace = makeWorkspace();
    await seedWorkspace(workspace);

    const service = new AuditVisibilityService(workspace);
    const bundle = service.exportBundle({});
    const corrupted = {
      ...bundle,
      metadata: {
        ...bundle.metadata,
        direct_vault_write: true as never,
      },
    };

    const validation = validateExportBundle(corrupted);

    expect(validation.status).toBe('INVALID');
    expect(validation.issues.some((issue) => issue.code === 'INVALID_DESTINATION_POLICY')).toBe(true);
  });
});
