import * as vscode from 'vscode';
import { SaveOrchestrator } from '../saveOrchestrator';
import { emitDriftAwarenessSignal } from './driftAwareness';
import {
  aggregateCommitContext,
  formatCommitContextMessage,
} from './commitContextAggregator';
import { ARCOutputChannel } from '../ARCOutputChannel';
import type { GuardrailState } from '../guardrailState';

interface GitApiV1 {
  repositories: GitRepository[];
}

interface GitRepository {
  rootUri: vscode.Uri;
  state: {
    HEAD: { commit?: string } | undefined;
    onDidChange: (listener: () => unknown) => vscode.Disposable;
  };
}

interface GitExtensionExports {
  getAPI(version: 1): GitApiV1;
}

export class CommitInterceptor implements vscode.Disposable {
  private readonly subscriptions: vscode.Disposable[] = [];
  private readonly headByRepo = new Map<string, string | undefined>();
  private readonly outputChannel = ARCOutputChannel.getInstance();

  constructor(
    private readonly orchestratorFor: (filePath?: string) => SaveOrchestrator,
    // P9-001 — optional callback invoked after each commit observation so the
    // file audit indicator can refresh without coupling to the indicator directly
    private readonly onCommitObserved?: () => void,
    // MVG-001 — optional guardrail state for layer-leak preflight escalation
    private readonly guardrailState?: GuardrailState,
  ) {
    this.initialize();
  }

  dispose(): void {
    // Don't dispose shared ARCOutputChannel - only remove from subscriptions
    while (this.subscriptions.length > 0) {
      this.subscriptions.pop()?.dispose();
    }
  }

  private initialize(): void {
    const gitExtension =
      vscode.extensions.getExtension<GitExtensionExports>('vscode.git');
    if (!gitExtension) {
      return;
    }

    const api = gitExtension.isActive
      ? gitExtension.exports.getAPI(1)
      : gitExtension.activate().then((exports) => exports.getAPI(1));

    void Promise.resolve(api)
      .then((resolvedApi) => {
        for (const repository of resolvedApi.repositories) {
          const repoRoot = repository.rootUri.fsPath;
          this.headByRepo.set(repoRoot, repository.state.HEAD?.commit);
          const subscription = repository.state.onDidChange(
            () => void this.onRepoStateChange(repository, repoRoot),
          );
          this.subscriptions.push(subscription);
        }
      })
      .catch(() => undefined);
  }

  private async onRepoStateChange(repository: GitRepository, repoRoot: string): Promise<void> {
    const previousHead = this.headByRepo.get(repoRoot);
    const nextHead = repository.state.HEAD?.commit;
    this.headByRepo.set(repoRoot, nextHead);

    if (!nextHead || previousHead === nextHead) {
      return;
    }

    const activeFilePath = vscode.window.activeTextEditor?.document.uri.fsPath;
    const observedPath = activeFilePath ?? repoRoot;
    const observedText =
      activeFilePath && vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.document.getText()
        : undefined;

    const orchestrator = this.orchestratorFor(observedPath);

    const entry = await orchestrator.observeCommit(observedPath, observedText).catch(() => undefined);
    if (!entry) return;

    // Per-file drift signal (existing behavior)
    emitDriftAwarenessSignal(entry.drift_status, {
      warn: (message) => { void vscode.window.showWarningMessage(message); },
      append: (message) => { this.outputChannel.appendLine(message); },
    });

    // M4-001 — Commit context awareness (aggregate summary)
    const contextRows = orchestrator.queryCommitContext(repoRoot);
    const summary = aggregateCommitContext(contextRows);
    const message = formatCommitContextMessage(summary);
    if (message) {
      this.outputChannel.appendLine(message);
    }

    // P9-001 — notify file audit indicator
    this.onCommitObserved?.();

    // MVG-001 — guardrail commit preflight escalation
    await this.runGuardrailPreflight();
  }

  private async runGuardrailPreflight(): Promise<void> {
    if (!this.guardrailState || this.guardrailState.unresolvedCount === 0) {
      return;
    }

    this.guardrailState.enterCommitPreflight();

    const count = this.guardrailState.unresolvedCount;
    const label = count === 1 ? '1 layer leak' : `${count} layer leaks`;
    const choice = await vscode.window.showWarningMessage(
      `ARC XT: Commit landed with ${label} unresolved. Open ARC XT to review.`,
      'Open ARC XT',
      'Dismiss',
    );

    if (choice === 'Open ARC XT') {
      await vscode.commands.executeCommand('arc.ui.liquidShell.navigate', 'architect');
    }
  }
}
