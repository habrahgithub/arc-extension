import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { LocalReviewSurfaceService } from '../../src/extension/reviewSurfaces';

const testWorkspace = '/tmp/lintel-taskboard-test';

describe('Task Board v1 (ARC-UI-002)', () => {
  beforeEach(() => {
    // Clean up and create test workspace
    fs.rmSync(testWorkspace, { recursive: true, force: true });
    fs.mkdirSync(path.join(testWorkspace, '.arc', 'blueprints'), {
      recursive: true,
    });
  });

  afterEach(() => {
    // Clean up test workspace
    fs.rmSync(testWorkspace, { recursive: true, force: true });
  });

  describe('Status Derivation (Path A)', () => {
    it('classifies untouched template as Created', () => {
      // Template with [REQUIRED] placeholders should be Created
      const template = `# LINTEL Blueprint: TEST-001
**Directive ID:** TEST-001

## Objective
[REQUIRED] Describe the specific change intent for this save.

## Scope
[REQUIRED] List the files or surfaces this directive covers.

## Constraints
[REQUIRED] Record the non-scope, risk bounds, and governance constraints.

## Acceptance Criteria
[REQUIRED] Define how this change will be reviewed, tested, and validated.

## Rollback Note
[REQUIRED] Describe how to revert the change locally if the save must be undone.
`;
      fs.writeFileSync(
        path.join(testWorkspace, '.arc/blueprints/TEST-001.md'),
        template,
        'utf8',
      );

      const service = new LocalReviewSurfaceService(testWorkspace);
      const output = service.renderTaskBoard();

      // Template with [REQUIRED] placeholders is classified as Created (Path A)
      expect(output).toContain('📋 Created');
      expect(output).toContain('TEST-001');
    });

    it('classifies edited-but-incomplete blueprint as In Progress', () => {
      // Edited content without [REQUIRED] placeholders but still incomplete
      const edited = `# LINTEL Blueprint: TEST-002
**Directive ID:** TEST-002

## Objective
This is my custom objective describing the actual change I'm making.

## Scope
This is my custom scope listing the files I'm changing.
`;
      fs.writeFileSync(
        path.join(testWorkspace, '.arc/blueprints/TEST-002.md'),
        edited,
        'utf8',
      );

      const service = new LocalReviewSurfaceService(testWorkspace);
      const output = service.renderTaskBoard();

      expect(output).toContain('🔄 In Progress');
      expect(output).toContain('TEST-002');
    });

    it('classifies complete blueprint as Completed', () => {
      const complete = `# LINTEL Blueprint: TEST-003
**Directive ID:** TEST-003

## Objective
This is a complete objective section with substantive content describing the change intent and why it is needed.

## Scope
This is a complete scope section listing all affected files, modules, and systems with clear boundaries.

## Constraints
This is a complete constraints section with risk bounds, security requirements, and compliance standards.

## Acceptance Criteria
This is a complete acceptance criteria section with specific tests, review steps, and success metrics.

## Rollback Note
This is a complete rollback note with git commands, config changes, and database migration reversal steps.
`;
      fs.writeFileSync(
        path.join(testWorkspace, '.arc/blueprints/TEST-003.md'),
        complete,
        'utf8',
      );

      const service = new LocalReviewSurfaceService(testWorkspace);
      const output = service.renderTaskBoard();

      expect(output).toContain('✅ Completed');
      expect(output).toContain('TEST-003');
    });
  });

  describe('Empty State Handling', () => {
    it('renders empty board when no blueprints exist', () => {
      const service = new LocalReviewSurfaceService(testWorkspace);
      const output = service.renderTaskBoard();

      expect(output).toContain('ARC XT Task Board');
      expect(output).toMatch(/No blueprint|empty/i);
    });

    it('renders empty board when blueprints directory is missing', () => {
      // Remove blueprints directory
      fs.rmSync(path.join(testWorkspace, '.arc', 'blueprints'), {
        recursive: true,
      });

      const service = new LocalReviewSurfaceService(testWorkspace);
      const output = service.renderTaskBoard();

      expect(output).toContain('ARC XT Task Board');
      // Output mentions no blueprint artifacts found
      expect(output).toMatch(/No blueprint artifacts found|empty/i);
    });
  });

  describe('Read-Only Posture', () => {
    it('includes local-only/read-only/non-authorizing posture wording', () => {
      const service = new LocalReviewSurfaceService(testWorkspace);
      const output = service.renderTaskBoard();

      // Posture wording appears in the operator context
      expect(output).toMatch(/local-only.*read-only|read-only.*local-only/i);
      expect(output).toMatch(/non-authorizing|does not authorize/i);
    });

    it('does not expose any mutation commands', () => {
      const service = new LocalReviewSurfaceService(testWorkspace);
      const output = service.renderTaskBoard();

      // Should not contain UI action verbs for task mutation (create task, edit task, etc.)
      expect(output).not.toMatch(
        /create task|edit task|delete task|modify task|update task/i,
      );
      // Should use descriptive language
      expect(output).toMatch(/summarizes|derivation|reflects/i);
    });
  });

  describe('Column Rendering', () => {
    it('shows summary counts for each status', () => {
      // Create one template (Created), one partial (In Progress), one complete (Completed)
      fs.writeFileSync(
        path.join(testWorkspace, '.arc/blueprints/TEMPLATE-001.md'),
        '# Template\n\n## Objective\n[REQUIRED] placeholder.\n\n## Scope\n[REQUIRED].\n\n## Constraints\n[REQUIRED].\n\n## Acceptance Criteria\n[REQUIRED].\n\n## Rollback Note\n[REQUIRED].',
        'utf8',
      );
      fs.writeFileSync(
        path.join(testWorkspace, '.arc/blueprints/PROGRESS-001.md'),
        '# Partial\n\n## Objective\nSome content.\n\n## Scope\nSome scope.\n\n## Constraints\nSome constraints.\n\n## Acceptance Criteria\nSome criteria.\n\n## Rollback Note\nSome rollback.',
        'utf8',
      );
      fs.writeFileSync(
        path.join(testWorkspace, '.arc/blueprints/COMPLETED-001.md'),
        '# Complete\n\n## Objective\nComplete objective with substantive content here.\n\n## Scope\nComplete scope with substantive content here.\n\n## Constraints\nComplete constraints with substantive content here.\n\n## Acceptance Criteria\nComplete acceptance criteria with substantive content here.\n\n## Rollback Note\nComplete rollback with substantive content here.',
        'utf8',
      );

      const service = new LocalReviewSurfaceService(testWorkspace);
      const output = service.renderTaskBoard();

      // Template and partial are In Progress, complete is Completed
      expect(output).toContain('**In Progress:**');
      expect(output).toContain('**Completed:**');
    });

    it('shows directive ID and blueprint path for each item', () => {
      fs.writeFileSync(
        path.join(testWorkspace, '.arc/blueprints/TEST-ID-001.md'),
        '# Test\n\n## Objective\nComplete.\n\n## Scope\nComplete.\n\n## Constraints\nComplete.\n\n## Acceptance Criteria\nComplete.\n\n## Rollback Note\nComplete.',
        'utf8',
      );

      const service = new LocalReviewSurfaceService(testWorkspace);
      const output = service.renderTaskBoard();

      expect(output).toContain('TEST-ID-001');
      expect(output).toContain('.arc/blueprints/TEST-ID-001.md');
    });
  });

  describe('No New Writable Task State', () => {
    it('does not create any task-store files', () => {
      const service = new LocalReviewSurfaceService(testWorkspace);
      service.renderTaskBoard();

      // Check that no task-store files were created
      const arcDir = path.join(testWorkspace, '.arc');
      const files = fs.readdirSync(arcDir);

      // Should only have blueprints directory and auto-generated files (.gitignore, perf.jsonl)
      // Should NOT have tasks.json, task-store.json, or similar
      expect(files).not.toContain('tasks.json');
      expect(files).not.toContain('task-store.json');
      expect(files).not.toContain('tasks');
    });

    it('does not modify existing blueprint files', () => {
      const blueprintPath = path.join(
        testWorkspace,
        '.arc/blueprints/TEST-001.md',
      );
      const originalContent =
        '# Test\n\n## Objective\nComplete.\n\n## Scope\nComplete.\n\n## Constraints\nComplete.\n\n## Acceptance Criteria\nComplete.\n\n## Rollback Note\nComplete.';
      fs.writeFileSync(blueprintPath, originalContent, 'utf8');

      const service = new LocalReviewSurfaceService(testWorkspace);
      service.renderTaskBoard();

      const afterContent = fs.readFileSync(blueprintPath, 'utf8');
      expect(afterContent).toBe(originalContent);
    });
  });
});
