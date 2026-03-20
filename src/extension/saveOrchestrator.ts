import { DisabledModelAdapter, ModelAdapterError, type ModelAdapter } from '../adapters/modelAdapter';
import type {
  AssessedSave,
  AuditEntry,
  BlueprintArtifactLink,
  Classification,
  ContextPayload,
  DecisionPayload,
  DirectiveProofInput,
  FallbackCause,
  SaveInput,
  SaveOutcome,
} from '../contracts/types';
import { AuditLogWriter } from '../core/auditLog';
import {
  BlueprintArtifactStore,
  type BlueprintProofResolution,
} from '../core/blueprintArtifacts';
import { classifyFile } from '../core/classifier';
import { buildContext } from '../core/contextBuilder';
import { enforceMinimumFloor } from '../core/decisionPolicy';
import { DecisionLeaseStore } from '../core/decisionLease';
import { LocalPerformanceRecorder, measureAsync, measureSync } from '../core/performance';
import { DEFAULT_RULES } from '../core/rules';
import { evaluateRules } from '../core/ruleEngine';
import { WorkspaceMappingStore } from '../core/workspaceMapping';

export class SaveOrchestrator {
  private readonly blueprintArtifacts: BlueprintArtifactStore;
  private readonly workspaceMapping: WorkspaceMappingStore;
  private readonly performanceRecorder: LocalPerformanceRecorder;

  constructor(
    private readonly workspaceRoot: string,
    private readonly modelAdapter: ModelAdapter = new DisabledModelAdapter(),
    private readonly leaseStore = new DecisionLeaseStore(),
    private readonly auditLog = new AuditLogWriter(workspaceRoot),
  ) {
    this.blueprintArtifacts = new BlueprintArtifactStore(workspaceRoot);
    this.workspaceMapping = new WorkspaceMappingStore(workspaceRoot);
    this.performanceRecorder = new LocalPerformanceRecorder(workspaceRoot);
  }

  async assessSave(input: SaveInput): Promise<AssessedSave> {
    return measureAsync(
      (entry) => this.performanceRecorder.record(entry),
      'assess_save',
      async () => {
        const mapping = measureSync(
          (entry) => this.performanceRecorder.record(entry),
          'load_workspace_map',
          () => this.workspaceMapping.load(),
          { file_path: input.filePath },
        );
        const classification = classifyFile(
          input,
          [...DEFAULT_RULES, ...mapping.rules],
          { additionalUiSegments: mapping.uiSegments },
        );
        const context = buildContext(classification, input);
        const ruleDecision = evaluateRules(classification, input);

        const reusedLease = this.getReusableDecision(input, classification, ruleDecision.decision);
        if (reusedLease) {
          return {
            classification,
            context,
            decision: reusedLease,
            input,
            leaseReusable: true,
            shouldPrompt: false,
            reducedGuaranteeNotice: reducedGuaranteeNotice(input),
          };
        }

        const evaluatedDecision = await this.evaluateModelDecision(
          classification,
          context,
          ruleDecision,
        );

        return {
          classification,
          context,
          decision: evaluatedDecision,
          input,
          leaseReusable: false,
          shouldPrompt:
            input.saveMode === 'EXPLICIT' &&
            (evaluatedDecision.decision === 'WARN' ||
              evaluatedDecision.decision === 'REQUIRE_PLAN'),
          reducedGuaranteeNotice: reducedGuaranteeNotice(input),
        };
      },
      { file_path: input.filePath, save_mode: input.saveMode },
    );
  }

  commitAssessment(
    assessment: AssessedSave,
    acknowledged: boolean,
    proof?: DirectiveProofInput,
  ): SaveOutcome {
    return measureSync(
      (entry) => this.performanceRecorder.record(entry),
      'commit_save',
      () => {
        const finalizedDecision = this.finalizeDecision(assessment, acknowledged, proof);
        const auditEntry = this.auditLog.append(
          assessment.classification,
          finalizedDecision,
        );

        return {
          ...assessment,
          decision: finalizedDecision,
          auditEntry,
          shouldRevertAfterSave: shouldRevertAfterSave(finalizedDecision),
        };
      },
      {
        file_path: assessment.input.filePath,
        acknowledged,
        decision: assessment.decision.decision,
      },
    );
  }

  verifyAuditChain(): boolean {
    return this.auditLog.verifyChain();
  }

  ensureBlueprintTemplate(directiveId: string): BlueprintArtifactLink {
    return this.blueprintArtifacts.ensureBlueprintTemplate(directiveId);
  }

  validateBlueprintProof(proof?: DirectiveProofInput): BlueprintProofResolution {
    return this.blueprintArtifacts.resolveProof(proof);
  }

  private getReusableDecision(
    input: SaveInput,
    classification: Classification,
    decision: DecisionPayload['decision'],
  ): DecisionPayload | undefined {
    const reusedLease = this.leaseStore.getReusableDecision(
      input,
      classification,
      decision,
    );

    if (!reusedLease) {
      return undefined;
    }

    if (reusedLease.decision !== 'REQUIRE_PLAN') {
      return reusedLease;
    }

    const resolution = this.blueprintArtifacts.resolveProof({
      ...localOnlyProof({
        directiveId: reusedLease.directive_id,
        blueprintId: reusedLease.blueprint_id,
      }),
    });

    return resolution.ok ? reusedLease : undefined;
  }

  private async evaluateModelDecision(
    classification: Classification,
    context: ContextPayload,
    ruleDecision: DecisionPayload,
  ): Promise<DecisionPayload> {
    if (!this.modelAdapter.enabledByDefault) {
      return {
        ...ruleDecision,
        source: 'MODEL_DISABLED',
        fallback_cause: 'MODEL_DISABLED',
      };
    }

    try {
      const modelDecision = await this.modelAdapter.evaluate(context);
      if (!modelDecision) {
        return {
          ...ruleDecision,
          source: 'FALLBACK',
          fallback_cause: 'RULE_ONLY',
        };
      }

      return enforceMinimumFloor(ruleDecision, classification, modelDecision);
    } catch (error) {
      const fallbackCause = mapModelErrorToFallback(error);
      return {
        ...ruleDecision,
        source: 'FALLBACK',
        fallback_cause: fallbackCause,
      };
    }
  }

  private finalizeDecision(
    assessment: AssessedSave,
    acknowledged: boolean,
    proof?: DirectiveProofInput,
  ): DecisionPayload {
    const decision = assessment.decision;

    if (decision.decision === 'BLOCK') {
      return {
        ...decision,
        lease_status: 'BYPASSED',
      };
    }

    if (decision.lease_status === 'REUSED') {
      if (decision.decision !== 'REQUIRE_PLAN') {
        return decision;
      }

      const resolution = this.blueprintArtifacts.resolveProof({
        ...localOnlyProof({
          directiveId: decision.directive_id,
          blueprintId: decision.blueprint_id,
        }),
      });

      return resolution.ok
        ? decision
        : policyFailureDecision(decision, resolution.reason, resolution.nextAction);
    }

    if (!this.leaseStore.isLeaseEligible(decision.decision)) {
      return {
        ...decision,
        lease_status: 'BYPASSED',
      };
    }

    if (!acknowledged) {
      return {
        ...decision,
        lease_status: 'BYPASSED',
      };
    }

    if (decision.decision === 'REQUIRE_PLAN') {
      const resolution = this.blueprintArtifacts.resolveProof(localOnlyProof(proof));
      if (!resolution.ok || !resolution.link) {
        return policyFailureDecision(decision, resolution.reason, resolution.nextAction);
      }

      return this.leaseStore.store(assessment.input, assessment.classification, {
        ...decision,
        directive_id: resolution.link.directiveId,
        blueprint_id: resolution.link.blueprintId,
      });
    }

    return this.leaseStore.store(assessment.input, assessment.classification, decision);
  }
}

function policyFailureDecision(
  decision: DecisionPayload,
  reason: string,
  nextAction: string,
): DecisionPayload {
  return {
    ...decision,
    reason,
    next_action: nextAction,
    lease_status: 'BYPASSED',
    directive_id: undefined,
    blueprint_id: undefined,
  };
}

function reducedGuaranteeNotice(input: SaveInput): string | undefined {
  if (
    input.autoSaveMode === 'afterDelay' ||
    input.autoSaveMode === 'onFocusChange'
  ) {
    return 'LINTEL is running in a reduced-guarantee auto-save mode.';
  }

  return undefined;
}

function shouldRevertAfterSave(decision: DecisionPayload): boolean {
  if (decision.decision === 'ALLOW') {
    return false;
  }

  return decision.lease_status === 'BYPASSED';
}

function mapModelErrorToFallback(error: unknown): FallbackCause {
  if (error instanceof ModelAdapterError) {
    switch (error.causeCode) {
      case 'TIMEOUT':
        return 'TIMEOUT';
      case 'PARSE_FAILURE':
        return 'PARSE_FAILURE';
      case 'UNAVAILABLE':
      default:
        return 'UNAVAILABLE';
    }
  }

  return 'UNAVAILABLE';
}

function localOnlyProof(proof?: DirectiveProofInput): DirectiveProofInput {
  return {
    ...proof,
    blueprintMode: 'LOCAL_ONLY',
  };
}

export type { AuditEntry };
