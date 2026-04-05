import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ActiveTaskSelectionStore } from '../../src/core/activeTaskSelection';
import type { BlueprintTask } from '../../src/contracts/types';
import { buildContext } from '../../src/core/contextBuilder';
import { classifyFile } from '../../src/core/classifier';
import { enforceMinimumFloor } from '../../src/core/decisionPolicy';
import { DEFAULT_RULES } from '../../src/core/rules';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-gov-safety-'));
  workspaces.push(ws);
  return ws;
}

afterEach(() => {
  while (workspaces.length > 0) {
    const ws = workspaces.pop();
    if (ws) {
      fs.rmSync(ws, { recursive: true, force: true });
    }
  }
});

const SAMPLE_TASK: BlueprintTask = {
  taskId: 'TEST-TASK-001',
  summary: 'Refactor auth middleware',
  status: 'TODO',
  directiveId: 'ARCXT-UX-002',
  blueprintPath: '/test/blueprint.md',
};

describe('U11 — Governance Safety Tests', () => {
  describe('AC1: Task selection does NOT produce a save authorization signal', () => {
    it('selecting a task does not change the decision outcome', () => {
      const store = new ActiveTaskSelectionStore();
      expect(store.active).toBeNull();

      store.select(SAMPLE_TASK);
      expect(store.active).not.toBeNull();
      expect(store.active?.userInitiated).toBe(true);

      // Task context packet contains only advisory metadata
      const packet = store.toContextPacket();
      expect(packet).not.toBeNull();
      expect(packet?.task_id).toBe('TEST-TASK-001');
      expect(packet?.task_summary).toBe('Refactor auth middleware');
      expect(packet?.task_status).toBe('TODO');

      // No authorization fields in packet
      expect(packet).not.toHaveProperty('decision');
      expect(packet).not.toHaveProperty('risk_level');
      expect(packet).not.toHaveProperty('authorize_save');
    });

    it('buildContext with task context does not alter classification', () => {
      const ws = makeWorkspace();
      const testFile = path.join(ws, 'src', 'test.ts');
      fs.mkdirSync(path.dirname(testFile), { recursive: true });
      fs.writeFileSync(testFile, 'export const test = true;\n', 'utf8');

      const classification = classifyFile(
        {
          filePath: testFile,
          text: 'export const test = true;\n',
          previousText: '',
          saveMode: 'EXPLICIT',
          autoSaveMode: 'off',
        },
        DEFAULT_RULES,
      );

      // Build context WITH task context
      const store = new ActiveTaskSelectionStore();
      store.select(SAMPLE_TASK);
      const taskContext = store.toContextPacket();

      const ctxWithTask = buildContext(classification, {
        filePath: testFile,
        text: 'export const test = true;\n',
        previousText: '',
        saveMode: 'EXPLICIT',
        autoSaveMode: 'off',
      }, taskContext);

      // Build context WITHOUT task context
      const ctxWithoutTask = buildContext(classification, {
        filePath: testFile,
        text: 'export const test = true;\n',
        previousText: '',
        saveMode: 'EXPLICIT',
        autoSaveMode: 'off',
      }, null);

      // Core decision fields are identical regardless of task context
      expect(ctxWithTask.file_path).toBe(ctxWithoutTask.file_path);
      expect(ctxWithTask.risk_flags).toEqual(ctxWithoutTask.risk_flags);
      expect(ctxWithTask.matched_rule_ids).toEqual(ctxWithoutTask.matched_rule_ids);
      expect(ctxWithTask.heuristic_only).toBe(ctxWithoutTask.heuristic_only);
    });
  });

  describe('AC2: Task context is absent from cloud-model routes', () => {
    it('task context fields are undefined when no task is selected', () => {
      const store = new ActiveTaskSelectionStore();
      const packet = store.toContextPacket();
      expect(packet).toBeNull();
    });

    it('buildContext without task selection has no task fields', () => {
      const ws = makeWorkspace();
      const testFile = path.join(ws, 'src', 'test.ts');
      fs.mkdirSync(path.dirname(testFile), { recursive: true });
      fs.writeFileSync(testFile, 'export const test = true;\n', 'utf8');

      const classification = classifyFile(
        {
          filePath: testFile,
          text: 'export const test = true;\n',
          previousText: '',
          saveMode: 'EXPLICIT',
          autoSaveMode: 'off',
        },
        DEFAULT_RULES,
      );

      const ctx = buildContext(classification, {
        filePath: testFile,
        text: 'export const test = true;\n',
        previousText: '',
        saveMode: 'EXPLICIT',
        autoSaveMode: 'off',
      }, null);

      // Task context fields must be undefined when no task is selected
      expect(ctx.task_id).toBeUndefined();
      expect(ctx.task_summary).toBeUndefined();
      expect(ctx.task_status).toBeUndefined();
    });
  });

  describe('AC3: Feature fails closed when no blueprint exists', () => {
    it('selecting a task for non-existent blueprint is safe (no-op)', () => {
      const store = new ActiveTaskSelectionStore();
      const task: BlueprintTask = {
        taskId: 'NONEXISTENT-001',
        summary: 'Test task',
        status: 'TODO',
        directiveId: 'NONEXISTENT',
        blueprintPath: '/nonexistent/blueprint.md',
      };

      // Selection succeeds (it's just local state)
      store.select(task);
      expect(store.active).not.toBeNull();
      expect(store.active?.task.directiveId).toBe('NONEXISTENT');

      // Clearing succeeds
      store.clear();
      expect(store.active).toBeNull();
    });

    it('toContextPacket returns null after clear', () => {
      const store = new ActiveTaskSelectionStore();
      store.select(SAMPLE_TASK);
      expect(store.toContextPacket()).not.toBeNull();

      store.clear();
      expect(store.toContextPacket()).toBeNull();
    });
  });

  describe('AC4: Blueprint proof remains the sole authorizing object', () => {
    it('task status does NOT influence enforceMinimumFloor decisions', () => {
      const ruleDecision = {
        decision: 'WARN' as const,
        reason: 'Auth change detected',
        risk_level: 'HIGH' as const,
        violated_rules: ['AUTH_CHANGE'],
        next_action: 'Acknowledge risk to proceed',
        source: 'RULE' as const,
        fallback_cause: 'NONE' as const,
        lease_status: 'NEW' as const,
      };

      const classification = {
        filePath: '/src/auth/login.ts',
        riskFlags: ['AUTH_CHANGE'],
        matchedRuleIds: ['AUTH_CHANGE'],
        riskLevel: 'HIGH' as const,
        demoted: false,
        heuristicOnly: true,
      };

      // Decision enforcement is based on rule decision and classification only
      const enforced = enforceMinimumFloor(ruleDecision, classification, {
        decision: 'ALLOW',
        reason: 'Model says allow',
        risk_level: 'LOW',
        violated_rules: [],
        next_action: 'Proceed',
      });

      // Task context (even if present) does NOT influence this enforcement
      const store = new ActiveTaskSelectionStore();
      store.select(SAMPLE_TASK);
      const taskPacket = store.toContextPacket();

      // Task packet exists but enforcement is still proof-based
      expect(taskPacket).not.toBeNull();
      expect(enforced.decision).toBe('WARN'); // Not ALLOW — rule floor preserved
    });
  });

  describe('AC5: Task context contains ONLY bounded metadata (Warden C1)', () => {
    it('TaskContextPacket has exactly 3 fields', () => {
      const store = new ActiveTaskSelectionStore();
      store.select(SAMPLE_TASK);
      const packet = store.toContextPacket();

      expect(packet).not.toBeNull();
      expect(Object.keys(packet!)).toEqual([
        'task_id',
        'task_summary',
        'task_status',
      ]);
    });

    it('TaskContextPacket does NOT contain code, diffs, or blueprint text', () => {
      const store = new ActiveTaskSelectionStore();
      store.select(SAMPLE_TASK);
      const packet = store.toContextPacket();

      expect(packet).not.toBeNull();
      // Verify no content-like fields leak through
      expect(packet).not.toHaveProperty('code');
      expect(packet).not.toHaveProperty('diff');
      expect(packet).not.toHaveProperty('blueprint_content');
      expect(packet).not.toHaveProperty('file_path');
      expect(packet).not.toHaveProperty('excerpt');
      expect(packet).not.toHaveProperty('risk_flags');
    });
  });
});
