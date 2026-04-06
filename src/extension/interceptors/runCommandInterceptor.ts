import * as vscode from 'vscode';
import { SaveOrchestrator } from '../saveOrchestrator';

/**
 * Allowed command prefixes for command observation.
 * Only these command families trigger ARC observation logic.
 * Everything else is silently ignored to prevent editor thrash.
 */
const ALLOWED_COMMAND_PREFIXES = [
  // Save commands
  'workbench.action.files.save',
  'workbench.action.files.saveAll',
  'workbench.action.files.saveWithoutFormatting',
  'workbench.action.files.saveFiles',
  // SCM / commit commands
  'git.commit',
  'git.commitAmend',
  'git.commitStaged',
  'git.commitStagedAmend',
  'git.commitEmpty',
  // ARC-adjacent (lintel compat)
  'lintel.',
];

/**
 * Returns true if the given command ID is relevant to ARC observation.
 * All non-listed commands (Ctrl+Z, autocomplete, navigation, formatting,
 * third-party extensions) are silently ignored.
 */
function isObservationRelevant(command: string): boolean {
  return ALLOWED_COMMAND_PREFIXES.some((prefix) => command.startsWith(prefix));
}

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
      if (!event.command || !isObservationRelevant(event.command)) {
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
