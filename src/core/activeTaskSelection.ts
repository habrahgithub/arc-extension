/**
 * U09/N01 — Active Task Selection with Persistence
 *
 * Manages bounded active-task selection for operator context.
 * Selection must be:
 * - Local-only (never authorizes saves on its own)
 * - User-initiated (no passive/auto selection)
 * - Advisory only (task context does not influence save authorization)
 *
 * N01: Persists selection across VS Code reloads via .arc/active-task.json
 * Schema: { task_id, blueprint_path, selected_at }
 * Restore validation: silently clears if blueprint missing or task_id not found
 */

import fs from 'node:fs';
import path from 'node:path';
import type {
  ActiveTaskSelection,
  BlueprintTask,
  TaskContextPacket,
} from '../contracts/types';
import { parseBlueprintTasks } from './blueprintArtifacts';

interface PersistedTaskSelection {
  task_id: string;
  blueprint_path: string;
  selected_at: string;
}

const ACTIVE_TASK_FILE = 'active-task.json';

export class ActiveTaskSelectionStore {
  private _selection: ActiveTaskSelection | null = null;
  private readonly _statePath: string;

  constructor(workspaceRoot?: string) {
    this._statePath = workspaceRoot
      ? path.join(workspaceRoot, '.arc', ACTIVE_TASK_FILE)
      : '';

    // N01: Attempt to restore persisted selection
    if (this._statePath) {
      this._restore();
    }
  }

  get active(): ActiveTaskSelection | null {
    return this._selection;
  }

  /**
   * Select a task explicitly.
   * Warden C2: Must be user-initiated — callers must verify user action.
   * N01: Persists selection to .arc/active-task.json
   */
  select(task: BlueprintTask): void {
    this._selection = {
      task,
      selectedAt: new Date().toISOString(),
      userInitiated: true,
    };

    // N01: Persist to .arc/active-task.json
    this._persist();
  }

  /**
   * Clear the active task selection.
   * N01: Deletes .arc/active-task.json
   */
  clear(): void {
    this._selection = null;
    this._clearPersisted();
  }

  /**
   * Build a bounded task context packet for local model evaluation.
   * Warden C1: Only task_id, task_summary, task_status — no code, diffs, blueprint text.
   * Warden C5: Advisory metadata only — must not influence save authorization.
   */
  toContextPacket(): TaskContextPacket | null {
    if (!this._selection) {
      return null;
    }

    return {
      task_id: this._selection.task.taskId,
      task_summary: this._selection.task.summary,
      task_status: this._selection.task.status,
    };
  }

  /**
   * Whether a task is currently selected.
   */
  get hasSelection(): boolean {
    return this._selection !== null;
  }

  /**
   * Restore persisted selection from .arc/active-task.json.
   * N01: Validates blueprint exists and task_id still present in blueprint.
   * Fail-closed: silently clears if validation fails.
   */
  private _restore(): void {
    if (!this._statePath || !fs.existsSync(this._statePath)) {
      return;
    }

    try {
      const raw = fs.readFileSync(this._statePath, 'utf8');
      const persisted: PersistedTaskSelection = JSON.parse(raw);

      // Validate blueprint_path still exists
      if (!fs.existsSync(persisted.blueprint_path)) {
        this._clearPersisted();
        return;
      }

      // Validate task_id still appears in blueprint
      const blueprintContent = fs.readFileSync(
        persisted.blueprint_path,
        'utf8',
      );
      const tasks = parseBlueprintTasks(blueprintContent);
      const taskExists = tasks.some((t) => {
        // task_id format is `${directiveId}-task-${lineIndex}`
        const taskIdSuffix = `task-${t.lineIndex}`;
        return persisted.task_id.endsWith(taskIdSuffix);
      });

      if (!taskExists) {
        this._clearPersisted();
        return;
      }

      // Validation passed — reconstruct selection
      this._selection = {
        task: {
          taskId: persisted.task_id,
          summary: 'Restored from previous session',
          status: 'TODO',
          directiveId: persisted.task_id.split('-task-')[0] || '',
          blueprintPath: persisted.blueprint_path,
        },
        selectedAt: persisted.selected_at,
        userInitiated: true,
      };
    } catch {
      // Corrupted file — silently clear
      this._clearPersisted();
    }
  }

  /**
   * Persist current selection to .arc/active-task.json.
   * N01: Only writes on select(), not on every access.
   */
  private _persist(): void {
    if (!this._statePath || !this._selection) {
      return;
    }

    try {
      const persisted: PersistedTaskSelection = {
        task_id: this._selection.task.taskId,
        blueprint_path: this._selection.task.blueprintPath,
        selected_at: this._selection.selectedAt,
      };

      fs.mkdirSync(path.dirname(this._statePath), { recursive: true });
      fs.writeFileSync(
        this._statePath,
        JSON.stringify(persisted, null, 2),
        'utf8',
      );
    } catch {
      // Failed to persist — selection remains in memory only (fail-closed)
    }
  }

  /**
   * Delete persisted state file.
   */
  private _clearPersisted(): void {
    if (this._statePath && fs.existsSync(this._statePath)) {
      try {
        fs.unlinkSync(this._statePath);
      } catch {
        // Failed to delete — in-memory selection cleared regardless
      }
    }
  }
}
