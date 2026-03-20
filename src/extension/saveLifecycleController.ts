import type {
  AssessedSave,
  AutoSaveMode,
  Decision,
  DirectiveProofInput,
  PendingRevert,
  SaveInput,
  SaveMode,
  SaveOutcome,
} from '../contracts/types';
import { SaveOrchestrator } from './saveOrchestrator';

interface PrepareSaveOptions {
  filePath: string;
  fileName?: string;
  text: string;
  saveMode: SaveMode;
  autoSaveMode: AutoSaveMode;
  selectionText?: string;
  lastDecision?: Decision;
}

interface RestoreInstruction {
  filePath: string;
  restoreText: string;
  reason: string;
}

export class SaveLifecycleController {
  private readonly committedSnapshots = new Map<string, string>();
  private readonly pendingReverts = new Map<string, PendingRevert>();
  private readonly suppressedRestores = new Map<string, string>();

  constructor(private readonly orchestrator: SaveOrchestrator) {}

  primeCommittedSnapshot(filePath: string, text: string): void {
    if (!this.committedSnapshots.has(filePath)) {
      this.committedSnapshots.set(filePath, text);
    }
  }

  consumeRestoreBypass(filePath: string, text: string): boolean {
    const suppressed = this.suppressedRestores.get(filePath);
    if (!suppressed || suppressed !== text) {
      return false;
    }

    this.suppressedRestores.delete(filePath);
    this.committedSnapshots.set(filePath, text);
    return true;
  }

  async prepareSave(options: PrepareSaveOptions): Promise<AssessedSave> {
    const previousText = this.committedSnapshots.get(options.filePath) ?? options.text;
    const input: SaveInput = {
      filePath: options.filePath,
      fileName: options.fileName,
      text: options.text,
      previousText,
      saveMode: options.saveMode,
      autoSaveMode: options.autoSaveMode,
      selectionText: options.selectionText,
      lastDecision: options.lastDecision,
    };

    return this.orchestrator.assessSave(input);
  }

  finalizeSave(
    assessment: AssessedSave,
    acknowledged: boolean,
    proof?: DirectiveProofInput,
  ): SaveOutcome {
    const outcome = this.orchestrator.commitAssessment(assessment, acknowledged, proof);

    if (outcome.shouldRevertAfterSave) {
      this.pendingReverts.set(outcome.input.filePath, {
        filePath: outcome.input.filePath,
        previousText: outcome.input.previousText,
        decision: outcome.decision,
      });
    }

    return outcome;
  }

  handleDidSave(filePath: string, text: string): RestoreInstruction | undefined {
    const pending = this.pendingReverts.get(filePath);

    if (!pending) {
      this.committedSnapshots.set(filePath, text);
      return undefined;
    }

    this.pendingReverts.delete(filePath);
    this.suppressedRestores.set(filePath, pending.previousText);

    return {
      filePath,
      restoreText: pending.previousText,
      reason: pending.decision.reason,
    };
  }
}
