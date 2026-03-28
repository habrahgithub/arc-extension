import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BlueprintArtifactStore,
  renderBlueprintTemplate,
} from '../../src/core/blueprintArtifacts';

const projectRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
);

/**
 * Governance tests for Phase 7.6 — Proof-State Messaging Clarity
 *
 * These tests verify:
 * - OBS-S-7012: Improvements are proportionate (incremental refinements)
 * - OBS-S-7013: Execution-package vs local-blueprint distinction is clear
 * - WRD-0069: Fail-closed messaging preserved (no softening)
 * - WRD-0070: Template ≠ authorization semantics preserved
 */

describe('Phase 7.6 — Proof-State Messaging Clarity', () => {
  describe('OBS-S-7012: Proportionality of Improvements', () => {
    it('retains all 7 original proof states without redesign', () => {
      const sourcePath = path.join(
        projectRoot,
        'src',
        'core',
        'blueprintArtifacts.ts',
      );
      const source = fs.readFileSync(sourcePath, 'utf8');

      // All original proof states must be present
      expect(source).toContain("'VALID'");
      expect(source).toContain("'MISSING_DIRECTIVE'");
      expect(source).toContain("'INVALID_DIRECTIVE'");
      expect(source).toContain("'MISSING_ARTIFACT'");
      expect(source).toContain("'MISMATCHED_BLUEPRINT_ID'");
      expect(source).toContain("'MALFORMED_ARTIFACT'");
      expect(source).toContain("'INCOMPLETE_ARTIFACT'");
      expect(source).toContain("'UNAUTHORIZED_MODE'");

      // No new proof states added
      const statusMatches = source.match(/status:\s*'([A-Z_]+)'/g);
      const statuses =
        statusMatches?.map((m) => m.match(/'([A-Z_]+)'/)?.[1]) ?? [];
      const uniqueStatuses = [...new Set(statuses)];

      expect(uniqueStatuses).toHaveLength(8); // 7 proof states + VALID
    });

    it('preserves existing resolveProof structure without redesign', () => {
      const sourcePath = path.join(
        projectRoot,
        'src',
        'core',
        'blueprintArtifacts.ts',
      );
      const source = fs.readFileSync(sourcePath, 'utf8');

      // Core validation flow must be preserved
      expect(source).toContain('isValidDirectiveId');
      expect(source).toContain('hasBlueprintStructure');
      expect(source).toContain('validateBlueprintContent');

      // No new validation methods introduced
      expect(source).not.toContain('validateExecutionPackage');
      expect(source).not.toContain('checkCloudBlueprint');
    });
  });

  describe('OBS-S-7013: Execution-Package vs Local-Blueprint Distinction', () => {
    it('clarifies that extension validates only local blueprints', () => {
      const sourcePath = path.join(
        projectRoot,
        'src',
        'core',
        'blueprintArtifacts.ts',
      );
      const source = fs.readFileSync(sourcePath, 'utf8');

      // Must explicitly mention local blueprint validation
      expect(source).toContain('local blueprint');
      expect(source).toContain('.arc/blueprints/');

      // Must distinguish from execution packages
      expect(source).toContain('not Axis execution packages');
    });

    it('does not introduce runtime awareness of execution packages', () => {
      const sourcePath = path.join(
        projectRoot,
        'src',
        'core',
        'blueprintArtifacts.ts',
      );
      const source = fs.readFileSync(sourcePath, 'utf8');

      // Must not try to locate or validate execution packages in code logic
      // (comments mentioning them for operator clarity are OK)
      expect(source).not.toMatch(/agents\/axis\//);
      expect(source).not.toMatch(/fetch\(|readFileSync.*axis/i);
      expect(source).not.toContain('validateExecutionPackage');
    });
  });

  describe('WRD-0069: Fail-Closed Messaging Preserved', () => {
    it('MISSING_DIRECTIVE message preserves hard enforcement block', () => {
      const store = new BlueprintArtifactStore('/tmp/test-workspace');
      const result = store.resolveProof({
        directiveId: '',
        blueprintMode: 'LOCAL_ONLY',
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe('MISSING_DIRECTIVE');
      // Must provide clear directive action without softening language
      expect(result.nextAction).toMatch(/provide|create.*blueprint.*before/i);
      expect(result.nextAction).not.toMatch(
        /you may|optional|suggestion|consider/i,
      );
    });

    it('MISSING_ARTIFACT message preserves hard enforcement block', () => {
      const store = new BlueprintArtifactStore('/tmp/test-workspace');
      const result = store.resolveProof({
        directiveId: 'TEST-001',
        blueprintId: '.arc/blueprints/TEST-001.md',
        blueprintMode: 'LOCAL_ONLY',
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe('MISSING_ARTIFACT');
      // Must not soften the block
      expect(result.reason).toContain('No local blueprint artifact exists');
      expect(result.nextAction).not.toMatch(/you may|optional|suggestion/i);
    });

    it('INCOMPLETE_ARTIFACT message preserves hard enforcement block', () => {
      const testDir = '/tmp/test-workspace/.arc/blueprints';
      fs.mkdirSync(testDir, { recursive: true });

      // Create incomplete template
      const template = renderBlueprintTemplate('TEST-001');
      fs.writeFileSync(path.join(testDir, 'TEST-001.md'), template, 'utf8');

      const store = new BlueprintArtifactStore('/tmp/test-workspace');
      const result = store.resolveProof({
        directiveId: 'TEST-001',
        blueprintId: '.arc/blueprints/TEST-001.md',
        blueprintMode: 'LOCAL_ONLY',
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe('INCOMPLETE_ARTIFACT');
      // Must explicitly state placeholders must be replaced
      expect(result.nextAction).toContain('Replace all placeholder');
      expect(result.nextAction).not.toMatch(/you may|optional|suggestion/i);

      // Cleanup
      fs.rmSync(path.dirname(testDir), { recursive: true, force: true });
    });

    it('UNAUTHORIZED_MODE message preserves hard enforcement block', () => {
      const store = new BlueprintArtifactStore('/tmp/test-workspace');
      const result = store.resolveProof({
        directiveId: 'TEST-001',
        blueprintMode: 'CLOUD_ASSISTED' as unknown as 'LOCAL_ONLY',
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe('UNAUTHORIZED_MODE');
      // Must explicitly state LOCAL_ONLY requirement
      expect(result.reason).toContain('LOCAL_ONLY');
    });
  });

  describe('WRD-0070: Template ≠ Authorization Semantics', () => {
    it('MISSING_ARTIFACT message clarifies template is starting point', () => {
      const store = new BlueprintArtifactStore('/tmp/test-workspace');
      const result = store.resolveProof({
        directiveId: 'TEST-001',
        blueprintId: '.arc/blueprints/TEST-001.md',
        blueprintMode: 'LOCAL_ONLY',
      });

      expect(result.status).toBe('MISSING_ARTIFACT');
      // Must clarify template creation is starting point, not done
      expect(result.nextAction).toContain('starting point');
      expect(result.nextAction).toContain('replace all placeholder content');
    });

    it('rendered template includes INCOMPLETE_TEMPLATE status banner', () => {
      const template = renderBlueprintTemplate('TEST-001');

      expect(template).toContain('Status: INCOMPLETE_TEMPLATE');
      expect(template).toContain('[REQUIRED]');
      expect(template).toContain('placeholder');
    });

    it('template placeholders cannot authorize saves', () => {
      const testDir = '/tmp/test-workspace/.arc/blueprints';
      fs.mkdirSync(testDir, { recursive: true });

      const template = renderBlueprintTemplate('TEST-001');
      fs.writeFileSync(path.join(testDir, 'TEST-001.md'), template, 'utf8');

      const store = new BlueprintArtifactStore('/tmp/test-workspace');
      const result = store.resolveProof({
        directiveId: 'TEST-001',
        blueprintId: '.arc/blueprints/TEST-001.md',
        blueprintMode: 'LOCAL_ONLY',
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe('INCOMPLETE_ARTIFACT');

      // Cleanup
      fs.rmSync(path.dirname(testDir), { recursive: true, force: true });
    });
  });

  describe('Proof-State Message Clarity', () => {
    it('VALID message is clear and actionable', () => {
      const testDir = '/tmp/test-workspace/.arc/blueprints';
      fs.mkdirSync(testDir, { recursive: true });

      // Create complete blueprint
      const content = `# LINTEL Blueprint: TEST-001
**Directive ID:** TEST-001

## Objective
This is a complete objective section with enough content to pass validation.

## Scope
This is a complete scope section with enough content to pass validation.

## Constraints
This is a complete constraints section with enough content to pass validation.

## Acceptance Criteria
This is a complete acceptance criteria section with enough content.

## Rollback Note
This is a complete rollback note section with enough content to pass validation.
`;
      fs.writeFileSync(path.join(testDir, 'TEST-001.md'), content, 'utf8');

      const store = new BlueprintArtifactStore('/tmp/test-workspace');
      const result = store.resolveProof({
        directiveId: 'TEST-001',
        blueprintId: '.arc/blueprints/TEST-001.md',
        blueprintMode: 'LOCAL_ONLY',
      });

      expect(result.ok).toBe(true);
      expect(result.status).toBe('VALID');
      expect(result.reason).toContain('valid');
      expect(result.nextAction).toBe('Proceed with the plan-backed save.');

      // Cleanup
      fs.rmSync(path.dirname(testDir), { recursive: true, force: true });
    });

    it('MALFORMED_ARTIFACT message lists required sections', () => {
      const testDir = '/tmp/test-workspace/.arc/blueprints';
      fs.mkdirSync(testDir, { recursive: true });

      // Create malformed blueprint (missing sections)
      const content = `# LINTEL Blueprint: TEST-001
**Directive ID:** TEST-001

## Objective
Some content here.
`;
      fs.writeFileSync(path.join(testDir, 'TEST-001.md'), content, 'utf8');

      const store = new BlueprintArtifactStore('/tmp/test-workspace');
      const result = store.resolveProof({
        directiveId: 'TEST-001',
        blueprintId: '.arc/blueprints/TEST-001.md',
        blueprintMode: 'LOCAL_ONLY',
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe('MALFORMED_ARTIFACT');
      // Must list required sections
      expect(result.nextAction).toContain('Objective');
      expect(result.nextAction).toContain('Scope');
      expect(result.nextAction).toContain('Constraints');

      // Cleanup
      fs.rmSync(path.dirname(testDir), { recursive: true, force: true });
    });

    it('INVALID_DIRECTIVE message provides clear format example', () => {
      const store = new BlueprintArtifactStore('/tmp/test-workspace');
      const result = store.resolveProof({
        directiveId: 'invalid-lowercase',
        blueprintMode: 'LOCAL_ONLY',
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe('INVALID_DIRECTIVE');
      // Must provide clear format example
      expect(result.nextAction).toContain('LINTEL-PH5-001');
      expect(result.nextAction).toContain('uppercase');
      expect(result.nextAction).toContain('hyphenated');
    });
  });

  describe('Documentation Alignment', () => {
    it('ARCHITECTURE.md documents proof-resolution states', () => {
      const docPath = path.join(projectRoot, 'docs', 'ARCHITECTURE.md');
      const doc = fs.readFileSync(docPath, 'utf8');

      // Must document proof states
      expect(doc).toContain('VALID');
      expect(doc).toContain('MISSING_DIRECTIVE');
      expect(doc).toContain('MISSING_ARTIFACT');
    });

    it('blueprintArtifacts.ts has inline documentation for proof states', () => {
      const sourcePath = path.join(
        projectRoot,
        'src',
        'core',
        'blueprintArtifacts.ts',
      );
      const source = fs.readFileSync(sourcePath, 'utf8');

      // Must have type definition for proof states
      expect(source).toContain('BlueprintProofStatus');
      expect(source).toContain('BlueprintProofResolution');
    });
  });
});
