import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ActiveTaskSelectionStore } from '../../src/core/activeTaskSelection';
import { parseBlueprintTasks } from '../../src/core/blueprintArtifacts';
import type { BlueprintTask } from '../../src/contracts/types';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-n01-'));
  workspaces.push(ws);
  return ws;
}

function makeBlueprint(
  ws: string,
  directiveId: string,
  tasks: string[],
): string {
  const bpDir = path.join(ws, '.arc', 'blueprints');
  fs.mkdirSync(bpDir, { recursive: true });
  const bpPath = path.join(bpDir, `${directiveId}.md`);

  const taskLines = tasks.map((t) => `- [ ] ${t}`);
  const content = [
    `# Blueprint: ${directiveId}`,
    `**Directive ID:** ${directiveId}`,
    '',
    '## Objective',
    'Test blueprint',
    '',
    '## Tasks',
    ...taskLines,
    '',
  ].join('\n');

  fs.writeFileSync(bpPath, content, 'utf8');
  return bpPath;
}

afterEach(() => {
  while (workspaces.length > 0) {
    const ws = workspaces.pop();
    if (ws) {
      fs.rmSync(ws, { recursive: true, force: true });
    }
  }
});

describe('N01 — Persist Active Task Selection', () => {
  describe('AC1: Persist round-trip', () => {
    it('persists selection to .arc/active-task.json and restores on new store instance', () => {
      const ws = makeWorkspace();
      const bpPath = makeBlueprint(ws, 'TEST-001', [
        'Refactor auth middleware',
      ]);

      const tasks = parseBlueprintTasks(fs.readFileSync(bpPath, 'utf8'));
      const taskLineIndex = tasks[0].lineIndex;

      const task: BlueprintTask = {
        taskId: `TEST-001-task-${taskLineIndex}`,
        summary: 'Refactor auth middleware',
        status: 'TODO',
        directiveId: 'TEST-001',
        blueprintPath: bpPath,
      };

      const store1 = new ActiveTaskSelectionStore(ws);
      store1.select(task);
      expect(store1.hasSelection).toBe(true);

      const statePath = path.join(ws, '.arc', 'active-task.json');
      expect(fs.existsSync(statePath)).toBe(true);

      const store2 = new ActiveTaskSelectionStore(ws);
      expect(store2.hasSelection).toBe(true);
      expect(store2.active?.task.taskId).toBe(`TEST-001-task-${taskLineIndex}`);
    });

    it('clear() deletes the persisted file', () => {
      const ws = makeWorkspace();
      const bpPath = makeBlueprint(ws, 'TEST-001', [
        'Refactor auth middleware',
      ]);
      const tasks = parseBlueprintTasks(fs.readFileSync(bpPath, 'utf8'));
      const taskLineIndex = tasks[0].lineIndex;

      const task: BlueprintTask = {
        taskId: `TEST-001-task-${taskLineIndex}`,
        summary: 'Refactor auth middleware',
        status: 'TODO',
        directiveId: 'TEST-001',
        blueprintPath: bpPath,
      };

      const store = new ActiveTaskSelectionStore(ws);
      store.select(task);

      const statePath = path.join(ws, '.arc', 'active-task.json');
      expect(fs.existsSync(statePath)).toBe(true);

      store.clear();
      expect(store.hasSelection).toBe(false);
      expect(fs.existsSync(statePath)).toBe(false);
    });
  });

  describe('AC2: Fail-closed on missing blueprint', () => {
    it('silently clears selection if blueprint_path no longer exists', () => {
      const ws = makeWorkspace();
      const bpPath = makeBlueprint(ws, 'TEST-001', [
        'Refactor auth middleware',
      ]);
      const tasks = parseBlueprintTasks(fs.readFileSync(bpPath, 'utf8'));
      const taskLineIndex = tasks[0].lineIndex;

      const task: BlueprintTask = {
        taskId: `TEST-001-task-${taskLineIndex}`,
        summary: 'Refactor auth middleware',
        status: 'TODO',
        directiveId: 'TEST-001',
        blueprintPath: bpPath,
      };

      const store1 = new ActiveTaskSelectionStore(ws);
      store1.select(task);

      fs.unlinkSync(bpPath);

      const store2 = new ActiveTaskSelectionStore(ws);
      expect(store2.hasSelection).toBe(false);
    });
  });

  describe('AC3: Fail-closed on missing task_id', () => {
    it('silently clears selection if task_id no longer appears in blueprint', () => {
      const ws = makeWorkspace();
      const bpPath = makeBlueprint(ws, 'TEST-001', [
        'Refactor auth middleware',
      ]);
      const tasks = parseBlueprintTasks(fs.readFileSync(bpPath, 'utf8'));
      const taskLineIndex = tasks[0].lineIndex;

      const task: BlueprintTask = {
        taskId: `TEST-001-task-${taskLineIndex}`,
        summary: 'Refactor auth middleware',
        status: 'TODO',
        directiveId: 'TEST-001',
        blueprintPath: bpPath,
      };

      const store1 = new ActiveTaskSelectionStore(ws);
      store1.select(task);

      fs.writeFileSync(bpPath, '# Blueprint\n\n## Objective\nTest\n', 'utf8');

      const store2 = new ActiveTaskSelectionStore(ws);
      expect(store2.hasSelection).toBe(false);
    });
  });

  describe('AC4: No effect on save authorization', () => {
    it('toContextPacket returns only bounded metadata', () => {
      const ws = makeWorkspace();
      const bpPath = makeBlueprint(ws, 'TEST-001', [
        'Refactor auth middleware',
      ]);
      const tasks = parseBlueprintTasks(fs.readFileSync(bpPath, 'utf8'));
      const taskLineIndex = tasks[0].lineIndex;

      const task: BlueprintTask = {
        taskId: `TEST-001-task-${taskLineIndex}`,
        summary: 'Refactor auth middleware',
        status: 'TODO',
        directiveId: 'TEST-001',
        blueprintPath: bpPath,
      };

      const store = new ActiveTaskSelectionStore(ws);
      store.select(task);

      const packet = store.toContextPacket();
      expect(packet).not.toBeNull();

      expect(Object.keys(packet!)).toEqual([
        'task_id',
        'task_summary',
        'task_status',
      ]);
      expect(packet).not.toHaveProperty('decision');
      expect(packet).not.toHaveProperty('risk_level');
      expect(packet).not.toHaveProperty('authorize_save');
    });
  });

  describe('AC5: Corrupted state file handled gracefully', () => {
    it('silently clears selection if persisted file is corrupted', () => {
      const ws = makeWorkspace();

      const statePath = path.join(ws, '.arc', 'active-task.json');
      fs.mkdirSync(path.dirname(statePath), { recursive: true });
      fs.writeFileSync(statePath, 'not valid json', 'utf8');

      const store = new ActiveTaskSelectionStore(ws);
      expect(store.hasSelection).toBe(false);
    });
  });
});
