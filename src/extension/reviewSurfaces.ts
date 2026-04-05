import fs from 'node:fs';
import path from 'node:path';
import type { AuditEntry } from '../contracts/types';
import {
  BlueprintArtifactStore,
  type BlueprintProofResolution,
  parseBlueprintTasks,
  hasTasksSection,
} from '../core/blueprintArtifacts';
import { LocalPerformanceRecorder, measureSync } from '../core/performance';
import {
  calculateFalsePositiveQualityScore,
  getFalsePositiveQualityLabel,
} from '../core/falsePositiveScorer';
import { RoutePolicyStore } from '../core/routerPolicy';
import { WorkspaceMappingStore } from '../core/workspaceMapping';

interface AuditReadResult {
  entries: AuditEntry[];
  malformedCount: number;
}

// Phase 7.10 — Task Board v1 (ARC-UI-002)
export interface TaskBoardItem {
  directiveId: string;
  blueprintPath: string;
  status: 'Created' | 'In Progress' | 'Completed';
  validationReason: string;
  nextAction: string;
  qualityScore: number;
}

export const REVIEW_SURFACE_LOCAL_ONLY_NOTICE =
  'Review surfaces are local-only and read-only. They summarize existing evidence but do not authorize, widen, or bypass save decisions.';

export const REVIEW_SURFACE_ENFORCEMENT_NOTE =
  'Enforcement note: fail-closed routing, proof requirements, and rule floors remain authoritative even when the operator wording becomes easier to read.';

export const REVIEW_SURFACE_PROOF_REQUIRED_NOTICE =
  'Proof-required states remain blocked until the linked local blueprint artifact is valid; placeholder, inferred, or silently repaired proof state never counts as sufficient.';

export const REVIEW_SURFACE_FALSE_POSITIVE_NOTICE =
  'False-positive candidates are advisory only. They do not rewrite audit history, demote recorded decisions, or weaken the enforcement floor.';

// Phase 7.8 — Audit-read degradation notice (WRD-0077)
export const REVIEW_SURFACE_AUDIT_READ_ERROR_NOTICE =
  'Audit-read degradation: audit data could not be read cleanly. This display is partial and does not imply audit absence equals approval or clean state.';

// Phase 7.9 — False-positive quality notice (WRD-0081)
export const REVIEW_SURFACE_FALSE_POSITIVE_QUALITY_NOTICE =
  'False-positive candidates are ranked by likelihood. This ranking is advisory only and does not override recorded decisions or weaken enforcement.';

// ARCXT-UX-CLARITY-001 — User-POV clarity for MISSING/INVALID status
export const WORKSPACE_MAPPING_MISSING_CLARITY =
  'Workspace mapping is optional. MISSING status means built-in safe defaults are applied (LOCAL_ONLY, no rules).';

export const ROUTE_POLICY_MISSING_CLARITY =
  'Route policy is optional. MISSING status means fail-closed RULE_ONLY mode with all lanes disabled.';

function describeWorkspaceMappingStatus(status: string): string {
  switch (status) {
    case 'MISSING':
      return '`MISSING` (optional config not present; using safe built-in defaults)';
    case 'INVALID':
      return '`INVALID` (config present but invalid; using safe built-in defaults)';
    case 'UNAUTHORIZED_MODE':
      return '`UNAUTHORIZED_MODE` (shared/team mapping not authorized; ignoring mapping)';
    case 'LOADED':
      return '`LOADED` (configured)';
    default:
      return `\`${status}\``;
  }
}

function describeRoutePolicyStatus(status: string): string {
  switch (status) {
    case 'MISSING':
      return '`MISSING` (optional config not present; fail-closed to safe RULE_ONLY)';
    case 'INVALID':
      return '`INVALID` (config present but invalid; fail-closed to safe RULE_ONLY)';
    case 'LOADED':
      return '`LOADED` (configured)';
    default:
      return `\`${status}\``;
  }
}

export class LocalReviewSurfaceService {
  private readonly blueprintArtifacts: BlueprintArtifactStore;
  private readonly workspaceMapping: WorkspaceMappingStore;
  private readonly performanceRecorder: LocalPerformanceRecorder;
  private readonly routePolicy: RoutePolicyStore;

  constructor(private readonly workspaceRoot: string) {
    this.blueprintArtifacts = new BlueprintArtifactStore(workspaceRoot);
    this.workspaceMapping = new WorkspaceMappingStore(workspaceRoot);
    this.performanceRecorder = new LocalPerformanceRecorder(workspaceRoot);
    this.routePolicy = new RoutePolicyStore(workspaceRoot);
  }

  renderAuditReview(): string {
    return measureSync(
      (entry) => this.performanceRecorder.record(entry),
      'review_audit',
      () => {
        const auditPath = path.join(this.workspaceRoot, '.arc', 'audit.jsonl');
        if (!fs.existsSync(auditPath)) {
          return '# ARC XT Audit Review\n\nNo local audit log is present yet.';
        }

        // Phase 7.8 — WRD-0077: Handle audit-read degradation
        let audit: AuditReadResult;
        let auditReadError = false;

        try {
          audit = readAuditEntries(auditPath);
        } catch {
          // Degrade to "audit unavailable" - do not expose raw error
          auditReadError = true;
          audit = { entries: [], malformedCount: 0 };
        }

        if (auditReadError) {
          return [
            '# ARC XT Audit Review',
            '',
            '## Audit-read degradation',
            '',
            `> ${REVIEW_SURFACE_AUDIT_READ_ERROR_NOTICE}`,
            '',
            '- Audit data could not be read cleanly',
            '- This display is partial and does not imply audit absence equals approval',
            '- Enforcement floor remains authoritative despite audit-read failure',
            '',
            `> ${REVIEW_SURFACE_ENFORCEMENT_NOTE}`,
          ].join('\n');
        }

        const recent = audit.entries.slice(-10).reverse();
        const counts = summarizeDecisionCounts(audit.entries);
        const operatorContext = this.renderOperatorContext([
          REVIEW_SURFACE_ENFORCEMENT_NOTE,
        ]);

        return [
          '# ARC XT Audit Review',
          '',
          ...operatorContext,
          '',
          `- Total valid entries: ${audit.entries.length}`,
          `- Malformed lines skipped: ${audit.malformedCount}`,
          `- ALLOW: ${counts.ALLOW}`,
          `- WARN: ${counts.WARN}`,
          `- REQUIRE_PLAN: ${counts.REQUIRE_PLAN}`,
          `- BLOCK: ${counts.BLOCK}`,
          '',
          ...(audit.malformedCount > 0
            ? [
                '## Review warning',
                `- ${audit.malformedCount} malformed audit line(s) were skipped. This review is partial and malformed entries were not treated as valid evidence.`,
                '',
              ]
            : []),
          '## Recent entries',
          ...recent.flatMap((entry) => [
            `### ${entry.ts} — ${entry.decision}`,
            `- File: ${entry.file_path}`,
            `- Risk: ${entry.risk_level}`,
            `- Route posture: \`${entry.route_mode ?? 'RULE_ONLY'}\` / \`${entry.route_lane ?? 'RULE_ONLY'}\``,
            `- Route fallback: \`${entry.route_fallback ?? 'NONE'}\``,
            `- Evaluation lane: \`${entry.evaluation_lane ?? 'RULE_ONLY'}\``,
            `- Lease status: ${entry.lease_status}`,
            `- Trigger: ${entry.save_mode ?? 'unknown'} / ${entry.auto_save_mode ?? 'unknown'}`,
            `- Matched rules: ${entry.matched_rules.join(', ') || 'none'}`,
            `- Directive: ${entry.directive_id ?? 'none'}`,
            `- Blueprint: ${entry.blueprint_id ?? 'none'}`,
            `- Next action: ${entry.next_action}`,
            '',
          ]),
        ].join('\n');
      },
      { workspace_root: this.workspaceRoot },
    );
  }

  renderBlueprintReview(): string {
    return measureSync(
      (entry) => this.performanceRecorder.record(entry),
      'review_blueprints',
      () => {
        const mapping = this.workspaceMapping.load();
        const blueprintsDir = path.join(
          this.workspaceRoot,
          '.arc',
          'blueprints',
        );
        const files = fs.existsSync(blueprintsDir)
          ? fs
              .readdirSync(blueprintsDir)
              .filter((file) => file.endsWith('.md'))
              .sort()
          : [];
        const operatorContext = this.renderOperatorContext([
          `Workspace mapping status: ${describeWorkspaceMappingStatus(mapping.status)}`,
          REVIEW_SURFACE_PROOF_REQUIRED_NOTICE,
        ]);

        const sections = [
          '# ARC XT Blueprint Review',
          '',
          ...operatorContext,
          '',
          `- Blueprint mode: ${mapping.mode}`,
          `- Mode status: ${mapping.status}`,
          `- Shared/team deployment: ${mapping.mode === 'LOCAL_ONLY' ? 'not authorized in Phase 5' : 'blocked'}`,
          '',
        ];

        if (mapping.reason) {
          sections.push(`- Mapping note: ${mapping.reason}`, '');
        }

        if (files.length === 0) {
          sections.push('No local blueprint artifacts are present.');
          return sections.join('\n');
        }

        sections.push('## Blueprint artifacts', '');

        for (const fileName of files) {
          const directiveId = fileName.replace(/\.md$/, '');
          const resolution = this.blueprintArtifacts.resolveProof({
            directiveId,
            blueprintId:
              this.blueprintArtifacts.canonicalBlueprintId(directiveId),
            blueprintMode: 'LOCAL_ONLY',
          });

          sections.push(
            `### ${fileName}`,
            `- Directive: ${directiveId}`,
            `- Validation: ${resolution.status}`,
            `- Reason: ${resolution.reason}`,
            `- Next action: ${resolution.nextAction}`,
            `- Artifact path: \`${resolution.link?.blueprintPath ?? this.blueprintArtifacts.blueprintPath(directiveId)}\``,
            '',
          );
        }

        return sections.join('\n');
      },
      { workspace_root: this.workspaceRoot },
    );
  }

  renderFalsePositiveReview(): string {
    return measureSync(
      (entry) => this.performanceRecorder.record(entry),
      'review_false_positives',
      () => {
        const auditPath = path.join(this.workspaceRoot, '.arc', 'audit.jsonl');
        const mapping = this.workspaceMapping.load();
        const audit = fs.existsSync(auditPath)
          ? readAuditEntries(auditPath)
          : { entries: [], malformedCount: 0 };

        // Phase 7.9 — False-positive candidate quality refinement
        // Filter to show only non-BLOCK decisions (BLOCK is rarely a false positive)
        // and sort by likelihood of being a true false positive
        const candidates = audit.entries
          .filter(
            (entry) =>
              entry.decision === 'WARN' || entry.decision === 'REQUIRE_PLAN',
          )
          .map((entry) => ({
            entry,
            // Quality score: higher = more likely to be a true false positive candidate
            // - WARN decisions are more likely false positives than REQUIRE_PLAN
            // - Rule-only evaluations (no model) are more likely false positives
            // - Files with no matched rules but still flagged are likely false positives
            qualityScore: calculateFalsePositiveQualityScore(entry),
          }))
          .sort((a, b) => b.qualityScore - a.qualityScore) // Highest quality first
          .slice(0, 10) // Top 10 candidates
          .map((c) => c.entry);

        const operatorContext = this.renderOperatorContext([
          `Workspace mapping status: ${describeWorkspaceMappingStatus(mapping.status)}`,
          REVIEW_SURFACE_FALSE_POSITIVE_NOTICE,
          REVIEW_SURFACE_FALSE_POSITIVE_QUALITY_NOTICE,
        ]);

        return [
          '# ARC XT False-Positive Review',
          '',
          ...operatorContext,
          '',
          `- Workspace mapping status: ${describeWorkspaceMappingStatus(mapping.status)}`,
          `- Local review only: yes`,
          `- Malformed lines skipped: ${audit.malformedCount}`,
          `- Candidates shown: ${candidates.length} (ranked by false-positive likelihood)`,
          '',
          ...(audit.malformedCount > 0
            ? [
                '## Review warning',
                `- ${audit.malformedCount} malformed audit line(s) were skipped. Candidate analysis is partial.`,
                '',
              ]
            : []),
          '## Candidate entries',
          ...(candidates.length === 0
            ? ['No candidate governance entries have been recorded yet.']
            : candidates.flatMap((entry) => {
                const qualityLabel = getFalsePositiveQualityLabel(entry);
                return [
                  `### ${entry.file_path}`,
                  `- Decision: ${entry.decision}`,
                  `- False-positive likelihood: ${qualityLabel}`,
                  `- Route posture: \`${entry.route_mode ?? 'RULE_ONLY'}\` / \`${entry.route_lane ?? 'RULE_ONLY'}\``,
                  `- Route fallback: \`${entry.route_fallback ?? 'NONE'}\``,
                  `- Reason: ${entry.reason}`,
                  `- Matched rules: ${entry.matched_rules.join(', ') || 'none'}`,
                  `- Directive linkage: ${entry.directive_id ?? 'none'}`,
                  `- Next action: ${entry.next_action}`,
                  '',
                ];
              })),
        ].join('\n');
      },
      { workspace_root: this.workspaceRoot },
    );
  }

  // Phase 7.10 — Task Board v1 (ARC-UI-002)
  renderTaskBoard(): string {
    return measureSync(
      (entry) => this.performanceRecorder.record(entry),
      'review_task_board',
      () => {
        const mapping = this.workspaceMapping.load();
        const blueprintsDir = path.join(
          this.workspaceRoot,
          '.arc',
          'blueprints',
        );
        const files = fs.existsSync(blueprintsDir)
          ? fs
              .readdirSync(blueprintsDir)
              .filter((file) => file.endsWith('.md'))
              .sort()
          : [];

        const operatorContext = this.renderOperatorContext([
          `Workspace mapping status: ${describeWorkspaceMappingStatus(mapping.status)}`,
          'Task Board is read-only and local-only — it summarizes existing blueprint evidence but does not authorize or mutate work.',
        ]);

        const sections = [
          '# ARC XT Task Board',
          '',
          ...operatorContext,
          '',
          '- Task derivation: from `.arc/blueprints/*.md` validation state',
          '- Status mapping: Created (template) → In Progress (edited) → Completed (valid)',
          '- No external sync: board reflects local evidence only',
          '',
        ];

        if (files.length === 0) {
          sections.push('No blueprint artifacts found. Task board is empty.');
          return sections.join('\n');
        }

        // Derive task items from blueprint proof state and content analysis
        const items: TaskBoardItem[] = files.map((fileName) => {
          const directiveId = fileName.replace(/\.md$/, '');
          const blueprintPath = path.join(blueprintsDir, fileName);
          const content = fs.readFileSync(blueprintPath, 'utf8');

          const resolution = this.blueprintArtifacts.resolveProof({
            directiveId,
            blueprintId:
              this.blueprintArtifacts.canonicalBlueprintId(directiveId),
            blueprintMode: 'LOCAL_ONLY',
          });

          // U07/U08: Parse task section if present
          const taskCount = hasTasksSection(content)
            ? parseBlueprintTasks(content).length
            : 0;
          const taskLabel = taskCount > 0 ? ` (${taskCount} tasks)` : '';

          // Path A classification: detect untouched template vs edited-but-incomplete
          const status = deriveTaskStatusPathA(resolution, content);
          const qualityScore = calculateTaskQualityScore(resolution, status);

          return {
            directiveId,
            blueprintPath:
              resolution.link?.blueprintPath ??
              this.blueprintArtifacts.blueprintPath(directiveId),
            status,
            validationReason: resolution.reason,
            nextAction: resolution.nextAction + taskLabel,
            qualityScore,
          };
        });

        // Group by status
        const created = items
          .filter((i) => i.status === 'Created')
          .sort((a, b) => b.qualityScore - a.qualityScore);
        const inProgress = items
          .filter((i) => i.status === 'In Progress')
          .sort((a, b) => b.qualityScore - a.qualityScore);
        const completed = items
          .filter((i) => i.status === 'Completed')
          .sort((a, b) => b.qualityScore - a.qualityScore);

        sections.push('## Summary');
        sections.push(`- **Created:** ${created.length}`);
        sections.push(`- **In Progress:** ${inProgress.length}`);
        sections.push(`- **Completed:** ${completed.length}`);
        sections.push('');

        // Render columns
        sections.push('## 📋 Created');
        sections.push(
          '_Blueprint exists but remains template-like or materially incomplete._',
        );
        sections.push('');
        if (created.length === 0) {
          sections.push('_No items in this column._');
        } else {
          sections.push(...renderTaskColumn(created));
        }
        sections.push('');

        sections.push('## 🔄 In Progress');
        sections.push(
          '_Blueprint has directive-specific content but proof is not yet VALID._',
        );
        sections.push('');
        if (inProgress.length === 0) {
          sections.push('_No items in this column._');
        } else {
          sections.push(...renderTaskColumn(inProgress));
        }
        sections.push('');

        sections.push('## ✅ Completed');
        sections.push('_Blueprint proof resolves as VALID._');
        sections.push('');
        if (completed.length === 0) {
          sections.push('_No items in this column._');
        } else {
          sections.push(...renderTaskColumn(completed));
        }

        return sections.join('\n');
      },
      { workspace_root: this.workspaceRoot },
    );
  }

  private renderOperatorContext(notes: string[]): string[] {
    const routePolicy = this.routePolicy.load();
    const mapping = this.workspaceMapping.load();

    // ARCXT-UX-CLARITY-001: Add clarity notices for MISSING status
    const clarityNotes: string[] = [];
    if (routePolicy.status === 'MISSING') {
      clarityNotes.push(ROUTE_POLICY_MISSING_CLARITY);
    }
    if (mapping.status === 'MISSING') {
      clarityNotes.push(WORKSPACE_MAPPING_MISSING_CLARITY);
    }

    return [
      '## Operator context',
      `- Governed root: \`${this.workspaceRoot}\``,
      `- Route policy status: ${describeRoutePolicyStatus(routePolicy.status)}`,
      `- Effective route mode: \`${routePolicy.config.mode}\``,
      `- Route note: ${routePolicy.reason}`,
      `- Review contract: ${REVIEW_SURFACE_LOCAL_ONLY_NOTICE}`,
      ...clarityNotes.map((note) => `- ${note}`),
      ...notes.map((note) => `- ${note}`),
    ];
  }
}

function readAuditEntries(filePath: string): AuditReadResult {
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .reduce<AuditReadResult>(
      (result, line) => {
        try {
          result.entries.push(JSON.parse(line) as AuditEntry);
        } catch {
          result.malformedCount += 1;
        }

        return result;
      },
      { entries: [], malformedCount: 0 },
    );
}

function summarizeDecisionCounts(
  entries: AuditEntry[],
): Record<AuditEntry['decision'], number> {
  return entries.reduce<Record<AuditEntry['decision'], number>>(
    (counts, entry) => {
      counts[entry.decision] += 1;
      return counts;
    },
    { ALLOW: 0, WARN: 0, REQUIRE_PLAN: 0, BLOCK: 0 },
  );
}

// Phase 7.10 — Task Board v1 status derivation (ARC-UI-002)
// Path A classification: detects untouched template vs edited-but-incomplete
function deriveTaskStatusPathA(
  resolution: BlueprintProofResolution,
  content: string,
): 'Created' | 'In Progress' | 'Completed' {
  // Completed = blueprint proof resolves as VALID
  if (resolution.status === 'VALID') {
    return 'Completed';
  }

  // Created = blueprint exists but is still the untouched template
  // Detect via stable template signals only
  const hasTemplateMarkers =
    content.includes('[REQUIRED]') || content.includes('INCOMPLETE_TEMPLATE');

  if (hasTemplateMarkers) {
    return 'Created';
  }

  // In Progress = blueprint has been edited but proof is not yet VALID
  return 'In Progress';
}

// Phase 7.10 — Task Board quality scoring (advisory only)
// Higher score = more complete/actionable task item
function calculateTaskQualityScore(
  resolution: BlueprintProofResolution,
  status: string,
): number {
  let score = 0;

  // Completed tasks get highest base score
  if (status === 'Completed') {
    score += 100;
  } else if (status === 'In Progress') {
    score += 50;
  } else {
    score += 10;
  }

  // Bonus for having a clear next action
  if (resolution.nextAction && resolution.nextAction.length > 0) {
    score += 20;
  }

  // Bonus for having a specific validation reason (not generic)
  if (resolution.reason && !resolution.reason.includes('template')) {
    score += 15;
  }

  return score;
}

// Phase 7.10 — Task Board column rendering
function renderTaskColumn(items: TaskBoardItem[]): string[] {
  const lines: string[] = [];
  for (const item of items) {
    lines.push(
      `#### ${item.directiveId}`,
      `- Status: **${item.status}**`,
      `- Blueprint: \`${item.blueprintPath}\``,
      `- Validation: ${item.validationReason}`,
      `- Next action: ${item.nextAction}`,
      '',
    );
  }
  return lines;
}
