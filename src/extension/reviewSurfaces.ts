import fs from 'node:fs';
import path from 'node:path';
import type { AuditEntry } from '../contracts/types';
import { BlueprintArtifactStore } from '../core/blueprintArtifacts';
import { LocalPerformanceRecorder, measureSync } from '../core/performance';
import { RoutePolicyStore } from '../core/routerPolicy';
import { WorkspaceMappingStore } from '../core/workspaceMapping';

interface AuditReadResult {
  entries: AuditEntry[];
  malformedCount: number;
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
          return '# ARC Audit Review\n\nNo local audit log is present yet.';
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
            '# ARC Audit Review',
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
          '# ARC Audit Review',
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
          `Workspace mapping status: \`${mapping.status}\``,
          REVIEW_SURFACE_PROOF_REQUIRED_NOTICE,
        ]);

        const sections = [
          '# ARC Blueprint Review',
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
          `Workspace mapping status: \`${mapping.status}\``,
          REVIEW_SURFACE_FALSE_POSITIVE_NOTICE,
          REVIEW_SURFACE_FALSE_POSITIVE_QUALITY_NOTICE,
        ]);

        return [
          '# ARC False-Positive Review',
          '',
          ...operatorContext,
          '',
          `- Workspace mapping status: ${mapping.status}`,
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

  private renderOperatorContext(notes: string[]): string[] {
    const routePolicy = this.routePolicy.load();
    return [
      '## Operator context',
      `- Governed root: \`${this.workspaceRoot}\``,
      `- Route policy status: \`${routePolicy.status}\``,
      `- Effective route mode: \`${routePolicy.config.mode}\``,
      `- Route note: ${routePolicy.reason}`,
      `- Review contract: ${REVIEW_SURFACE_LOCAL_ONLY_NOTICE}`,
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

// Phase 7.9 — False-positive quality scoring (advisory only, WRD-0081)
// Higher score = more likely to be a true false positive candidate
function calculateFalsePositiveQualityScore(entry: AuditEntry): number {
  let score = 0;

  // WARN decisions are more likely false positives than REQUIRE_PLAN
  if (entry.decision === 'WARN') {
    score += 30;
  } else if (entry.decision === 'REQUIRE_PLAN') {
    score += 10;
  }

  // Rule-only evaluations (no model) are more likely false positives
  if (entry.source === 'RULE' || entry.source === 'FALLBACK') {
    score += 20;
  }

  // Files with no matched rules but still flagged are likely false positives
  if (entry.matched_rules.length === 0) {
    score += 25;
  }

  // Demoted decisions are more likely false positives (UI path demotion)
  // Note: demotion info is not in audit entry, would need to be added

  // Fallback with config/packet issues are more likely false positives
  if (
    entry.route_fallback === 'CONFIG_MISSING' ||
    entry.route_fallback === 'CONFIG_INVALID'
  ) {
    score += 15;
  }

  return score;
}

function getFalsePositiveQualityLabel(entry: AuditEntry): string {
  const score = calculateFalsePositiveQualityScore(entry);
  if (score >= 50) {
    return '⚡ High (rule-only, no matched rules)';
  }
  if (score >= 30) {
    return '🔶 Medium (WARN decision, rule-only)';
  }
  return '🔷 Low (REQUIRE_PLAN or model-evaluated)';
}
