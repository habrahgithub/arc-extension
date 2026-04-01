import * as vscode from 'vscode';
import { SaveOrchestrator } from '../saveOrchestrator';

export class RunCommandInterceptor implements vscode.Disposable {
  private readonly disposable: vscode.Disposable;

  constructor(
    private readonly orchestratorFor: (filePath?: string) => SaveOrchestrator,
  ) {
    const maybeListener: unknown = Reflect.get(
      vscode.commands as object,
      'onDidExecuteCommand',
    );

    if (typeof maybeListener !== 'function') {
      this.disposable = new vscode.Disposable(() => undefined);
      return;
    }

    const onDidExecuteCommand = maybeListener as (
      listener: (event: { command?: string }) => unknown,
    ) => vscode.Disposable;

    this.disposable = onDidExecuteCommand((event: { command?: string }) => {
      if (!event.command || event.command.startsWith('arc.')) {
        return;
      }

      const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
      void this.orchestratorFor(filePath)
        .observeExecution(event.command, filePath)
        .catch(() => undefined);
    });
  }

  dispose(): void {
    this.disposable.dispose();
  }
}
