import fs from 'node:fs';
import path from 'node:path';
import {
  DisabledModelAdapter,
  ModelAdapterError,
  OllamaModelAdapter,
  type ModelAdapter,
} from '../adapters/modelAdapter';
import type {
  AssessedSave,
  AuditEntry,
  AuditEventType,
  BehaviorContract,
  BlueprintArtifactLink,
  Classification,
  ContextPayload,
  DecisionPayload,
  ExecutionEvent,
  DirectiveProofInput,
  FallbackCause,
  GovernanceProposalRecord,
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
import { buildContextPacket } from '../core/contextPacket';
import { enforceMinimumFloor } from '../core/decisionPolicy';
import { DecisionLeaseStore } from '../core/decisionLease';
import {
  LocalPerformanceRecorder,
  measureAsync,
  measureSync,
} from '../core/performance';
import { DeviationDetector } from '../core/deviationDetector';
import { ExplanationSynthesizer } from '../core/explanationSynthesizer';
import { GovernanceFeedbackEvaluator } from '../core/governanceFeedbackEvaluator';
import { GovernanceProposalRegistry } from '../core/governanceProposalRegistry';
import {
  buildRouteMetadata,
  RoutePolicyStore,
  RouterShell,
} from '../core/routerPolicy';
import { DEFAULT_RULES } from '../core/rules';
import { evaluateRules } from '../core/ruleEngine';
import { WorkspaceMappingStore } from '../core/workspaceMapping';

export class SaveOrchestrator {
  private readonly blueprintArtifacts: BlueprintArtifactStore;
  private readonly workspaceMapping: WorkspaceMappingStore;
  private readonly performanceRecorder: LocalPerformanceRecorder;
  private readonly routePolicy: RoutePolicyStore;
  private readonly routerShell: RouterShell;
  private readonly disabledModelAdapter: ModelAdapter;
  private readonly deviationDetector = new DeviationDetector();
  private readonly explanationSynthesizer = new ExplanationSynthesizer();
  private readonly governanceFeedbackEvaluator = new GovernanceFeedbackEvaluator();
  private readonly governanceProposalRegistry: GovernanceProposalRegistry;

  constructor(
    private readonly workspaceRoot: string,
    private readonly localModelAdapter: ModelAdapter = new OllamaModelAdapter({
      enabledByDefault: true,
    }),
    private readonly cloudModelAdapter: ModelAdapter = new DisabledModelAdapter(),
    private readonly leaseStore = new DecisionLeaseStore(),
    private readonly auditLog = new AuditLogWriter(workspaceRoot),
  ) {
    this.blueprintArtifacts = new BlueprintArtifactStore(workspaceRoot);
    this.workspaceMapping = new WorkspaceMappingStore(workspaceRoot);
    this.performanceRecorder = new LocalPerformanceRecorder(workspaceRoot);
    this.routePolicy = new RoutePolicyStore(workspaceRoot);
    this.routerShell = new RouterShell();
    this.disabledModelAdapter = new DisabledModelAdapter();
    this.governanceProposalRegistry = new GovernanceProposalRegistry(workspaceRoot);
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
        const classification = measureSync(
          (entry) => this.performanceRecorder.record(entry),
          'classify_file',
          () =>
            classifyFile(input, [...DEFAULT_RULES, ...mapping.rules], {
              additionalUiSegments: mapping.uiSegments,
            }),
          { file_path: input.filePath, save_mode: input.saveMode },
        );
        const routePolicy = this.routePolicy.load();
        const context = buildContext(classification, input);
        const contextPacket = buildContextPacket(
          classification,
          input,
          undefined,
          routePolicy,
        );
        const routerShell = this.routerShell.resolve(
          routePolicy,
          contextPacket,
          input,
        );
        const ruleDecision = this.withRouteMetadata(
          measureSync(
            (entry) => this.performanceRecorder.record(entry),
            'evaluate_rules',
            () => evaluateRules(classification, input),
            {
              file_path: input.filePath,
              risk_level: classification.riskLevel,
              matched_rule_count: classification.matchedRuleIds.length,
            },
          ),
          routerShell,
        );

        const reusedLease = this.getReusableDecision(
          input,
          classification,
          ruleDecision,
        );
        if (reusedLease) {
          return {
            classification,
            context,
            contextPacket,
            decision: this.withRouteMetadata(reusedLease, routerShell),
            input,
            routePolicy,
            leaseReusable: true,
            shouldPrompt: false,
            reducedGuaranteeNotice: reducedGuaranteeNotice(input),
          };
        }

        const evaluatedDecision = await this.evaluateModelDecision(
          classification,
          context,
          ruleDecision,
          routerShell,
        );

        return {
          classification,
          context,
          contextPacket,
          decision: evaluatedDecision,
          input,
          routePolicy,
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
        const finalizedDecision = this.finalizeDecision(
          assessment,
          acknowledged,
          proof,
        );
        const decisionWithFingerprint: DecisionPayload = {
          ...finalizedDecision,
          fingerprint: this.leaseStore.fingerprint(
            assessment.input,
            assessment.classification,
            finalizedDecision,
          ),
          fingerprint_version: 'lease.v1',
        };

        const auditEntry = this.auditLog.append(
          assessment.classification,
          decisionWithFingerprint,
        );

        return {
          ...assessment,
          decision: decisionWithFingerprint,
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

  async observeExecution(commandId: string, filePath?: string): Promise<AuditEntry> {
    return this.observeEvent('RUN', commandId, filePath, readObservedText(filePath));
  }

  async observeCommit(repositoryRoot?: string, observedText?: string): Promise<AuditEntry> {
    return this.observeEvent(
      'COMMIT',
      'git.commit',
      repositoryRoot,
      observedText ?? readObservedText(repositoryRoot),
    );
  }

  ensureBlueprintTemplate(directiveId: string): BlueprintArtifactLink {
    return this.blueprintArtifacts.ensureBlueprintTemplate(directiveId);
  }

  validateBlueprintProof(
    proof?: DirectiveProofInput,
  ): BlueprintProofResolution {
    return this.blueprintArtifacts.resolveProof(proof);
  }

  listPendingGovernanceProposals(): GovernanceProposalRecord[] {
    return this.governanceProposalRegistry.listPending();
  }

  private getReusableDecision(
    input: SaveInput,
    classification: Classification,
    decision: DecisionPayload,
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

  private async observeEvent(
    eventType: AuditEventType,
    identifier: string,
    filePath?: string,
    observedText = '',
  ): Promise<AuditEntry> {
    const observedPath = filePath
      ? filePath
      : path.join(
          this.workspaceRoot,
          '.arc',
          'observation',
          eventType.toLowerCase(),
          identifier,
        );

    const assessment = await this.assessSave({
      filePath: observedPath,
      fileName: path.basename(observedPath),
      text: observedText,
      previousText: observedText,
      saveMode: 'EXPLICIT',
      autoSaveMode: 'off',
    });

    const decision: DecisionPayload = {
      ...assessment.decision,
      lease_status: 'BYPASSED',
      reason: `[OBSERVATION] ${eventType} event captured for ${identifier}`,
      next_action: 'Observation captured. No runtime mutation applied.',
      actor_type: 'SYSTEM',
      actor_id: identifier,
      fingerprint: this.leaseStore.fingerprint(
        assessment.input,
        assessment.classification,
        assessment.decision,
      ),
      fingerprint_version: 'lease.v1',
    };

    const executionEvent: ExecutionEvent = {
      eventType,
      toolSequence: [identifier],
      activePolicies: activeRuntimePolicies(),
      outputShape: observedText.length > 0 ? 'NON_EMPTY_TEXT' : 'EMPTY_TEXT',
    };
    const contract = contractForObservedEvent(eventType, identifier);
    const deviation = this.deviationDetector.evaluate(executionEvent, contract);
    const explanation = deviation.isDeviation
      ? this.explanationSynthesizer.synthesize({
          event: executionEvent,
          contract,
          deviation,
          failureType: 'TYPE-B',
        })
      : undefined;
    const recentPatternHistory = explanation
      ? this.auditLog.explanationPatternSnapshot(explanation.code, {
          eventType,
          filePath: assessment.classification.filePath,
        })
      : undefined;
    const recentPattern = recentPatternHistory
      ? {
          occurrenceCount: recentPatternHistory.occurrenceCount + 1,
          firstSeenAt: recentPatternHistory.firstSeenAt,
          lastSeenAt: new Date().toISOString(),
        }
      : undefined;
    const governanceProposal = explanation
      ? this.governanceFeedbackEvaluator.evaluate({
          event: executionEvent,
          deviation,
          explanation,
          failureType: 'TYPE-B',
          recentPattern,
        })
      : undefined;
    const decisionWithDeviation: DecisionPayload = deviation.isDeviation
      ? {
          ...decision,
          deviation,
          failure_type: 'TYPE-B',
          explanation,
          governance_proposal: governanceProposal,
        }
      : decision;

    if (governanceProposal) {
      this.governanceProposalRegistry.upsert(governanceProposal);
    }

    return this.auditLog.append(
      assessment.classification,
      decisionWithDeviation,
      eventType,
    );
  }

  private async evaluateModelDecision(
    classification: Classification,
    context: ContextPayload,
    ruleDecision: DecisionPayload,
    routerShell: ReturnType<RouterShell['resolve']>,
  ): Promise<DecisionPayload> {
    const localDecision = await this.evaluateLane(
      'LOCAL',
      this.localModelAdapterFor(routerShell),
      classification,
      context,
      ruleDecision,
    );

    if (!shouldAttemptCloud(routerShell, localDecision)) {
      return this.withRouteMetadata(localDecision, routerShell);
    }

    const cloudDecision = await this.evaluateLane(
      'CLOUD',
      this.cloudModelAdapterFor(routerShell),
      classification,
      context,
      ruleDecision,
    );

    return this.withRouteMetadata(cloudDecision, routerShell);
  }

  private finalizeDecision(
    assessment: AssessedSave,
    acknowledged: boolean,
    proof?: DirectiveProofInput,
  ): DecisionPayload {
    const decision = assessment.decision;
    // Phase 7.7 — Add trigger context to all decisions
    const triggerContext = {
      save_mode: assessment.input.saveMode,
      auto_save_mode: assessment.input.autoSaveMode,
    };

    if (decision.decision === 'BLOCK') {
      return {
        ...decision,
        ...triggerContext,
        lease_status: 'BYPASSED',
      };
    }

    if (decision.lease_status === 'REUSED') {
      if (decision.decision !== 'REQUIRE_PLAN') {
        return {
          ...decision,
          ...triggerContext,
        };
      }

      const resolution = this.blueprintArtifacts.resolveProof({
        ...localOnlyProof({
          directiveId: decision.directive_id,
          blueprintId: decision.blueprint_id,
        }),
      });

      return resolution.ok
        ? {
            ...decision,
            ...triggerContext,
          }
        : policyFailureDecision(
            decision,
            resolution.reason,
            resolution.nextAction,
          );
    }

    if (!this.leaseStore.isLeaseEligible(decision.decision)) {
      return {
        ...decision,
        ...triggerContext,
        lease_status: 'BYPASSED',
      };
    }

    if (!acknowledged) {
      return {
        ...decision,
        ...triggerContext,
        lease_status: 'BYPASSED',
      };
    }

    if (decision.decision === 'REQUIRE_PLAN') {
      const resolution = this.blueprintArtifacts.resolveProof(
        localOnlyProof(proof),
      );
      if (!resolution.ok || !resolution.link) {
        return policyFailureDecision(
          decision,
          resolution.reason,
          resolution.nextAction,
        );
      }

      return this.leaseStore.store(
        assessment.input,
        assessment.classification,
        {
          ...decision,
          ...triggerContext,
          directive_id: resolution.link.directiveId,
          blueprint_id: resolution.link.blueprintId,
        },
      );
    }

    return this.leaseStore.store(assessment.input, assessment.classification, {
      ...decision,
      ...triggerContext,
    });
  }

  private withRouteMetadata(
    decision: DecisionPayload,
    routerShell: ReturnType<RouterShell['resolve']>,
  ): DecisionPayload {
    return {
      ...decision,
      ...buildRouteMetadata(routerShell, decision),
    };
  }

  private localModelAdapterFor(
    routerShell: ReturnType<RouterShell['resolve']>,
  ): ModelAdapter {
    if (!routerShell.shouldUseModel) {
      return this.disabledModelAdapter;
    }

    return this.localModelAdapter;
  }

  private cloudModelAdapterFor(
    routerShell: ReturnType<RouterShell['resolve']>,
  ): ModelAdapter {
    if (!routerShell.shouldUseCloudModel) {
      return this.disabledModelAdapter;
    }

    return this.cloudModelAdapter;
  }

  private async evaluateLane(
    lane: 'LOCAL' | 'CLOUD',
    modelAdapter: ModelAdapter,
    classification: Classification,
    context: ContextPayload,
    ruleDecision: DecisionPayload,
  ): Promise<DecisionPayload> {
    if (!modelAdapter.enabledByDefault) {
      return {
        ...ruleDecision,
        source: 'MODEL_DISABLED',
        fallback_cause: 'MODEL_DISABLED',
        evaluation_lane: lane,
        model_availability_status: 'DISABLED_BY_CONFIG',
      };
    }

    try {
      const modelDecision = await measureAsync(
        (entry) => this.performanceRecorder.record(entry),
        'evaluate_model',
        () => modelAdapter.evaluate(context),
        {
          lane,
          file_path: context.file_path,
          adapter_enabled: modelAdapter.enabledByDefault,
        },
      );
      if (!modelDecision) {
        return {
          ...ruleDecision,
          source: 'FALLBACK',
          fallback_cause: 'RULE_ONLY',
          evaluation_lane: lane,
          model_availability_status: 'NOT_ATTEMPTED',
        };
      }

      const enforced = enforceMinimumFloor(
        ruleDecision,
        classification,
        modelDecision,
      );
      return {
        ...enforced,
        source: lane === 'CLOUD' ? 'CLOUD_MODEL' : enforced.source,
        evaluation_lane: lane,
        model_availability_status: 'AVAILABLE_AND_USED',
      };
    } catch (error) {
      const fallbackCause = mapModelErrorToFallback(error);
      return {
        ...ruleDecision,
        source: 'FALLBACK',
        fallback_cause: fallbackCause,
        evaluation_lane: lane,
        model_availability_status: 'UNAVAILABLE_AT_RUNTIME',
      };
    }
  }
}

function contractForObservedEvent(
  eventType: AuditEventType,
  identifier: string,
): BehaviorContract | undefined {
  if (eventType !== 'RUN') {
    return undefined;
  }

  if (identifier === 'workbench.action.files.save') {
    return {
      allowedToolSequence: ['workbench.action.files.save'],
      requiredPolicies: ['AUDIT_MODE'],
      expectedOutputShape: 'NON_EMPTY_TEXT',
    };
  }

  if (identifier === 'arc.test.sequence') {
    return {
      allowedToolSequence: ['workbench.action.files.save'],
    };
  }

  if (identifier === 'arc.test.shape') {
    return {
      expectedOutputShape: 'NON_EMPTY_TEXT',
    };
  }

  return undefined;
}

function activeRuntimePolicies(): string[] {
  const active: string[] = [];
  if (process.env.AUDIT_MODE === 'true') {
    active.push('AUDIT_MODE');
  }
  return active;
}

function readObservedText(filePath?: string): string {
  if (!filePath || !fs.existsSync(filePath)) {
    return '';
  }

  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
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
    return 'ARC XT is running in a reduced-guarantee auto-save mode.';
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

function shouldAttemptCloud(
  routerShell: ReturnType<RouterShell['resolve']>,
  localDecision: DecisionPayload,
): boolean {
  if (!routerShell.shouldUseCloudModel) {
    return false;
  }

  if (localDecision.evaluation_lane !== 'LOCAL') {
    return false;
  }

  if (localDecision.source === 'MODEL') {
    return false;
  }

  if (localDecision.source === 'CLOUD_MODEL') {
    return false;
  }

  return (
    localDecision.fallback_cause === 'MODEL_DISABLED' ||
    localDecision.fallback_cause === 'UNAVAILABLE' ||
    localDecision.fallback_cause === 'TIMEOUT' ||
    localDecision.fallback_cause === 'PARSE_FAILURE' ||
    localDecision.fallback_cause === 'RULE_ONLY'
  );
}

function localOnlyProof(proof?: DirectiveProofInput): DirectiveProofInput {
  return {
    ...proof,
    blueprintMode: 'LOCAL_ONLY',
  };
}

export type { AuditEntry };
