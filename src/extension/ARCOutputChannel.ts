import * as vscode from 'vscode';

/**
 * Shared ARC Output Channel
 * 
 * Singleton pattern to prevent duplicate output channel creation.
 * All extension components should use this shared instance.
 */
export class ARCOutputChannel {
  private static instance: vscode.OutputChannel | null = null;

  /**
   * Get the shared ARC Output Channel instance
   * Creates the channel on first call, reuses thereafter
   */
  static getInstance(): vscode.OutputChannel {
    if (!ARCOutputChannel.instance) {
      ARCOutputChannel.instance = vscode.window.createOutputChannel('ARC Output Channel');
    }
    return ARCOutputChannel.instance;
  }

  /**
   * Append a line to the output channel
   */
  static appendLine(message: string): void {
    ARCOutputChannel.getInstance().appendLine(message);
  }

  /**
   * Show the output channel
   */
  static show(): void {
    ARCOutputChannel.getInstance().show();
  }

  /**
   * Dispose the output channel (for extension deactivation)
   */
  static dispose(): void {
    if (ARCOutputChannel.instance) {
      ARCOutputChannel.instance.dispose();
      ARCOutputChannel.instance = null;
    }
  }
}
