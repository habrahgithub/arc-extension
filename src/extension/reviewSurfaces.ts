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
          return '# LINTEL Audit Review\n\nNo local audit log is present yet.';
        }

        const audit = readAuditEntries(auditPath);
        const recent = audit.entries.slice(-10).reverse();
        const counts = summarizeDecisionCounts(audit.entries);
        const operatorContext = this.renderOperatorContext([
          REVIEW_SURFACE_ENFORCEMENT_NOTE,
        ]);

        return [
          '# LINTEL Audit Review',
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
        const blueprintsDir = path.join(this.workspaceRoot, '.arc', 'blueprints');
        const files = fs.existsSync(blueprintsDir)
          ? fs.readdirSync(blueprintsDir).filter((file) => file.endsWith('.md')).sort()
          : [];
        const operatorContext = this.renderOperatorContext([
          `Workspace mapping status: \`${mapping.status}\``,
          REVIEW_SURFACE_PROOF_REQUIRED_NOTICE,
        ]);

        const sections = [
          '# LINTEL Blueprint Review',
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
            blueprintId: this.blueprintArtifacts.canonicalBlueprintId(directiveId),
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
        const candidates = audit.entries
          .filter((entry) => entry.decision !== 'ALLOW')
          .slice(-10)
          .reverse();
        const operatorContext = this.renderOperatorContext([
          `Workspace mapping status: \`${mapping.status}\``,
          REVIEW_SURFACE_FALSE_POSITIVE_NOTICE,
        ]);

        return [
          '# LINTEL False-Positive Review',
          '',
          ...operatorContext,
          '',
          `- Workspace mapping status: ${mapping.status}`,
          `- Local review only: yes`,
          `- Malformed lines skipped: ${audit.malformedCount}`,
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
            : candidates.flatMap((entry) => [
                `### ${entry.file_path}`,
                `- Decision: ${entry.decision}`,
                `- Route posture: \`${entry.route_mode ?? 'RULE_ONLY'}\` / \`${entry.route_lane ?? 'RULE_ONLY'}\``,
                `- Route fallback: \`${entry.route_fallback ?? 'NONE'}\``,
                `- Reason: ${entry.reason}`,
                `- Matched rules: ${entry.matched_rules.join(', ') || 'none'}`,
                `- Directive linkage: ${entry.directive_id ?? 'none'}`,
                `- Next action: ${entry.next_action}`,
                '',
              ])),
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

function summarizeDecisionCounts(entries: AuditEntry[]): Record<AuditEntry['decision'], number> {
  return entries.reduce<Record<AuditEntry['decision'], number>>(
    (counts, entry) => {
      counts[entry.decision] += 1;
      return counts;
    },
    { ALLOW: 0, WARN: 0, REQUIRE_PLAN: 0, BLOCK: 0 },
  );
}
