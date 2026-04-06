/**
 * ARCXT-MVG-001 — Milestone 4: Guardrail State
 *
 * In-memory store for guardrail card state + drift items.
 * Persists justifications to workspace state so they survive reloads.
 * Emits updates to registered listeners (Liquid Shell webview).
 */

import * as vscode from 'vscode';
import type {
  GuardrailCardState,
  GuardrailUpdate,
  FingerprintResult,
  LayerDriftItem,
} from '../contracts/types';
import { buildSimulationDrift } from '../core/layerLeakDetector';

const JUSTIFICATIONS_KEY = 'arc.mvg.justifications';

export class GuardrailState {
  private _state: GuardrailCardState = 'idle';
  private _fingerprint?: FingerprintResult;
  private _driftItems: LayerDriftItem[] = [];
  private _listeners: Array<(update: GuardrailUpdate) => void> = [];

  constructor(private readonly _workspaceState: vscode.Memento) {
    // Restore persisted justifications
    const saved = _workspaceState.get<Record<string, string>>(JUSTIFICATIONS_KEY, {});
    for (const [id, justification] of Object.entries(saved)) {
      const item = this._driftItems.find((d) => d.id === id);
      if (item) {
        item.resolved = true;
        item.justification = justification;
      }
    }
  }

  // ── State transitions ────────────────────────────────────────────────────

  setState(state: GuardrailCardState): void {
    this._state = state;
    this._emit();
  }

  setFingerprint(fp: FingerprintResult): void {
    this._fingerprint = fp;
  }

  triggerSimulation(fingerprint: FingerprintResult): void {
    const drift = buildSimulationDrift(fingerprint);
    this._driftItems.push(drift);
    this._state = 'simulation';
    this._emit();

    // After 2s auto-advance to drift_detected so the card shows the violation
    setTimeout(() => {
      this._state = 'drift_detected';
      this._emit();
    }, 2_000);
  }

  addDrift(item: LayerDriftItem): void {
    // Avoid duplicates by originFile+targetFile
    const exists = this._driftItems.some(
      (d) => d.originFile === item.originFile && d.targetFile === item.targetFile && !d.resolved,
    );
    if (!exists) {
      this._driftItems.push(item);
      this._state = 'drift_detected';
      this._emit();
    }
  }

  async justifyDrift(id: string, justification: string): Promise<void> {
    const item = this._driftItems.find((d) => d.id === id);
    if (item) {
      item.resolved = true;
      item.justification = justification;
      await this._persistJustifications();
      if (this.unresolvedCount === 0) {
        this._state = 'architecture_detected';
      }
      this._emit();
    }
  }

  enterCommitPreflight(): void {
    if (this.unresolvedCount > 0) {
      this._state = 'commit_preflight';
      this._emit();
    }
  }

  // ── Accessors ────────────────────────────────────────────────────────────

  get state(): GuardrailCardState {
    return this._state;
  }

  get fingerprint(): FingerprintResult | undefined {
    return this._fingerprint;
  }

  get driftItems(): LayerDriftItem[] {
    return this._driftItems;
  }

  get unresolvedCount(): number {
    return this._driftItems.filter((d) => !d.resolved).length;
  }

  get latestUnresolved(): LayerDriftItem | undefined {
    return this._driftItems.find((d) => !d.resolved);
  }

  // ── Listeners ────────────────────────────────────────────────────────────

  onUpdate(listener: (update: GuardrailUpdate) => void): vscode.Disposable {
    this._listeners.push(listener);
    return new vscode.Disposable(() => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    });
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private _emit(): void {
    const update: GuardrailUpdate = {
      state: this._state,
      fingerprint: this._fingerprint,
      drift: this.latestUnresolved,
      unresolvedCount: this.unresolvedCount,
    };
    for (const listener of this._listeners) {
      listener(update);
    }
  }

  private async _persistJustifications(): Promise<void> {
    const map: Record<string, string> = {};
    for (const item of this._driftItems) {
      if (item.resolved && item.justification) {
        map[item.id] = item.justification;
      }
    }
    await this._workspaceState.update(JUSTIFICATIONS_KEY, map);
  }
}
