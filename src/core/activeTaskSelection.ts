/**
 * U09 — Active Task Selection
 *
 * Manages bounded active-task selection for operator context.
 * Selection must be:
 * - Local-only (never authorizes saves on its own)
 * - User-initiated (no passive/auto selection)
 * - Advisory only (task context does not influence save authorization)
 */

import type { ActiveTaskSelection, BlueprintTask, TaskContextPacket } from '../contracts/types';

export class ActiveTaskSelectionStore {
  private _selection: ActiveTaskSelection | null = null;

  get active(): ActiveTaskSelection | null {
    return this._selection;
  }

  /**
   * Select a task explicitly.
   * Warden C2: Must be user-initiated — callers must verify user action.
   */
  select(task: BlueprintTask): void {
    this._selection = {
      task,
      selectedAt: new Date().toISOString(),
      userInitiated: true,
    };
  }

  /**
   * Clear the active task selection.
   */
  clear(): void {
    this._selection = null;
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
}
