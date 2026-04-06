/**
 * ARCXT-MVG-001 — Milestone 2: First-Session Hook
 *
 * On first activation of a workspace session, fires a 30-second timer.
 * When it expires, triggers the architecture fingerprint scan and then
 * the simulation drift event so the user sees the guardrail card.
 *
 * "First session" = no prior guardrail state persisted for this workspace root.
 */

import * as vscode from 'vscode';
import type { GuardrailState } from './guardrailState';

const SIMULATION_DELAY_MS = 30_000;

/**
 * Register the first-session hook.
 * Call from extension activate(). Returns a disposable for cleanup.
 */
export function registerFirstSessionHook(
  workspaceRoot: string,
  guardrail: GuardrailState,
  context: vscode.ExtensionContext,
): vscode.Disposable {
  // Only run if no prior scan has been recorded for this workspace
  const priorScan = context.workspaceState.get<boolean>('arc.mvg.fingerprintRun');
  if (priorScan) {
    return { dispose: () => undefined };
  }

  const timer = setTimeout(() => {
    void runFirstSessionScan(workspaceRoot, guardrail, context);
  }, SIMULATION_DELAY_MS);

  return new vscode.Disposable(() => clearTimeout(timer));
}

async function runFirstSessionScan(
  workspaceRoot: string,
  guardrail: GuardrailState,
  context: vscode.ExtensionContext,
): Promise<void> {
  // Mark as run so we don't repeat on subsequent activations
  await context.workspaceState.update('arc.mvg.fingerprintRun', true);

  // Step 1: fingerprint
  const { scanArchitecture } = await import('../core/architectureFingerprint');
  const fingerprint = scanArchitecture(workspaceRoot);
  guardrail.setFingerprint(fingerprint);

  // Step 2: push architecture_detected state
  guardrail.setState('architecture_detected');

  // Step 3: after a short pause, fire simulation drift
  await new Promise<void>((r) => setTimeout(r, 1_500));
  guardrail.triggerSimulation(fingerprint);
}
