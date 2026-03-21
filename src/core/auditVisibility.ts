import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AuditEntry,
  AuditExportBundle,
  AuditExportSection,
  AuditFilterInput,
  AuditHistoryMatch,
  AuditHistoryWarning,
  AuditQueryResult,
  AuditVerificationResult,
  DirectiveTraceResult,
  ExportBundleValidationIssue,
  ExportBundleValidationResult,
  PerfFilterInput,
  PerformanceEntry,
  PerfHistoryMatch,
  PerfSummaryResult,
  RouteTraceResult,
  RouteTraceSummary,
  VaultReadyExportMetadata,
} from '../contracts/types';
import { BlueprintArtifactStore } from './blueprintArtifacts';

type ParsedAuditEntry = AuditHistoryMatch;
type ParsedPerfEntry = PerfHistoryMatch;

interface ParsedHistory<T> {
  filesRead: string[];
  matched: T[];
  warnings: AuditHistoryWarning[];
  partial: boolean;
}

interface ExportOptions {
  auditFilters?: AuditFilterInput;
  perfFilters?: PerfFilterInput;
  directiveId?: string;
}

export class AuditVisibilityService {
  private readonly blueprintArtifacts: BlueprintArtifactStore;

  constructor(private readonly workspaceRoot: string) {
    this.blueprintArtifacts = new BlueprintArtifactStore(workspaceRoot);
  }

  queryAudit(filters: AuditFilterInput = {}): AuditQueryResult {
    const history = readAuditHistory(this.workspaceRoot);
    return {
      filters: normalizeAuditFilters(filters),
      files_read: history.filesRead,
      matched: applyAuditFilters(history.matched, filters),
      warnings: history.warnings,
      partial: history.partial,
    };
  }

  traceDirective(directiveId: string): DirectiveTraceResult {
    const query = this.queryAudit({ directiveId });
    const blueprintId = this.blueprintArtifacts.canonicalBlueprintId(directiveId);
    const blueprintPath = this.blueprintArtifacts.blueprintPath(directiveId);
    const resolution = this.blueprintArtifacts.resolveProof({
      directiveId,
      blueprintId,
      blueprintMode: 'LOCAL_ONLY',
    });

    return {
      directive_id: directiveId,
      blueprint_id: blueprintId,
      blueprint_path: blueprintPath,
      blueprint_status: resolution.status,
      blueprint_reason: resolution.reason,
      files_read: dedupePaths([
        ...query.files_read,
        ...(fs.existsSync(blueprintPath) ? [blueprintPath] : []),
      ]),
      matched: query.matched,
      warnings: query.warnings,
      partial: query.partial,
    };
  }

  traceRoutes(filters: AuditFilterInput = {}): RouteTraceResult {
    const query = this.queryAudit(filters);
    const summaries = summarizeRoutes(query.matched);

    return {
      filters: query.filters,
      files_read: query.files_read,
      matched: query.matched,
      summaries,
      warnings: query.warnings,
      partial: query.partial,
    };
  }

  summarizePerformance(filters: PerfFilterInput = {}): PerfSummaryResult {
    const history = readPerformanceHistory(this.workspaceRoot);
    const normalized = normalizePerfFilters(filters);
    const matched = applyPerfFilters(history.matched, normalized);

    return {
      filters: normalized,
      files_read: history.filesRead,
      matched,
      warnings: history.warnings,
      partial: history.partial,
      operation_summary: summarizePerfOperations(matched),
    };
  }

  verifyAuditHistory(): AuditVerificationResult {
    const history = readAuditHistory(this.workspaceRoot);
    if (history.matched.length === 0) {
      return {
        status: history.partial ? 'PARTIAL' : 'VALID',
        files_read: history.filesRead,
        warnings: history.warnings,
        partial: history.partial,
        verified_entries: 0,
      };
    }

    let previousHash = 'ROOT';
    let verifiedEntries = 0;
    for (const record of history.matched) {
      if (record.entry.prev_hash !== previousHash) {
        return {
          status: 'INVALID',
          files_read: history.filesRead,
          warnings: history.warnings,
          partial: history.partial,
          verified_entries: verifiedEntries,
          failure: {
            file_path: record.source_file,
            line_number: record.line_number,
            reason: `prev_hash mismatch (expected ${previousHash}, got ${record.entry.prev_hash})`,
          },
        };
      }

      const computed = computeAuditHash(record.entry, record.entry.prev_hash);
      if (record.entry.hash !== computed) {
        return {
          status: 'INVALID',
          files_read: history.filesRead,
          warnings: history.warnings,
          partial: history.partial,
          verified_entries: verifiedEntries,
          failure: {
            file_path: record.source_file,
            line_number: record.line_number,
            reason: 'hash mismatch',
          },
        };
      }

      previousHash = record.entry.hash;
      verifiedEntries += 1;
    }

    return {
      status: history.partial ? 'PARTIAL' : 'VALID',
      files_read: history.filesRead,
      warnings: history.warnings,
      partial: history.partial,
      verified_entries: history.matched.length,
    };
  }

  exportBundle(options: ExportOptions = {}): AuditExportBundle {
    const auditQuery = this.queryAudit(options.auditFilters);
    const routeTrace = this.traceRoutes(options.auditFilters);
    const directiveTrace = options.directiveId
      ? this.traceDirective(options.directiveId)
      : undefined;
    const perfSummary = this.summarizePerformance(options.perfFilters);
    const verification = this.verifyAuditHistory();
    const metadata: VaultReadyExportMetadata = {
      package_phase: '6.7',
      source: 'LINTEL_AUDIT_VISIBILITY_CLI',
      local_only: true,
      direct_vault_write: false,
      direct_arc_dependency: false,
      allowed_destinations: ['stdout', 'local_file'],
    };

    const warnings = dedupeWarnings([
      ...auditQuery.warnings,
      ...routeTrace.warnings,
      ...perfSummary.warnings,
      ...(directiveTrace?.warnings ?? []),
      ...verification.warnings,
    ]);

    const sections: AuditExportBundle['sections'] = {
      export_metadata: createSection(
        'export_metadata',
        'EXPORT_METADATA',
        false,
        'Local-only export metadata describing package phase, source surface, and destination policy.',
        metadata,
      ),
      audit_slice: createSection(
        'audit_slice',
        'DIRECT_EVIDENCE',
        auditQuery.partial,
        'Direct evidence slice from local audit history matching the requested filters.',
        auditQuery,
      ),
      route_trace: createSection(
        'route_trace',
        'DIRECT_EVIDENCE',
        routeTrace.partial,
        'Observed route evidence from local audit history, excluding derived summaries.',
        {
          filters: routeTrace.filters,
          files_read: routeTrace.files_read,
          matched: routeTrace.matched,
          warnings: routeTrace.warnings,
          partial: routeTrace.partial,
        },
      ),
      route_summary: createSection(
        'route_summary',
        'DERIVED_SUMMARY',
        routeTrace.partial,
        'Derived route summary counts computed from the local route-trace evidence.',
        routeTrace.summaries,
      ),
      perf_slice: createSection(
        'perf_slice',
        'DIRECT_EVIDENCE',
        perfSummary.partial,
        'Direct performance evidence from local perf history excluding derived operation summaries.',
        {
          filters: perfSummary.filters,
          files_read: perfSummary.files_read,
          matched: perfSummary.matched,
          warnings: perfSummary.warnings,
          partial: perfSummary.partial,
        },
      ),
      perf_operation_summary: createSection(
        'perf_operation_summary',
        'DERIVED_SUMMARY',
        perfSummary.partial,
        'Derived performance summary computed from the local perf evidence slice.',
        perfSummary.operation_summary,
      ),
      audit_integrity: createSection(
        'audit_integrity',
        'VALIDATION_RESULT',
        verification.partial,
        'Audit hash-chain verification result over the files present locally.',
        verification,
      ),
      ...(directiveTrace
        ? {
            directive_linkage: createSection(
              'directive_linkage',
              'DIRECT_EVIDENCE',
              directiveTrace.partial,
              'Directive linkage evidence derived from local audit matches and blueprint resolution inputs.',
              {
                directive_id: directiveTrace.directive_id,
                files_read: directiveTrace.files_read,
                matched_count: directiveTrace.matched.length,
                warnings: directiveTrace.warnings,
                partial: directiveTrace.partial,
              },
            ),
            blueprint_linkage: createSection(
              'blueprint_linkage',
              'DIRECT_EVIDENCE',
              directiveTrace.partial,
              'Blueprint linkage evidence describing the locally resolved blueprint path and validation status.',
              {
                blueprint_id: directiveTrace.blueprint_id,
                blueprint_path: directiveTrace.blueprint_path,
                blueprint_status: directiveTrace.blueprint_status,
                blueprint_reason: directiveTrace.blueprint_reason,
                partial: directiveTrace.partial,
              },
            ),
          }
        : {}),
      bundle_validation: createSection(
        'bundle_validation',
        'VALIDATION_RESULT',
        false,
        'Local validation result over the versioned Vault-ready export bundle structure.',
        { status: 'VALID', issues: [] },
      ),
    };

    const provisionalBundle: AuditExportBundle = {
      export_version: 'phase-6.7-v1',
      bundle_type: 'LINTEL_VAULT_READY_EXPORT',
      generated_at: new Date().toISOString(),
      workspace_root: this.workspaceRoot,
      vault_ready: true,
      direct_vault_write: false,
      direct_arc_dependency: false,
      metadata,
      sections,
      bundle_validation: { status: 'VALID', issues: [] },
      warnings,
    };

    const bundleValidation = validateExportBundle(provisionalBundle);
    provisionalBundle.bundle_validation = bundleValidation;
    provisionalBundle.sections.bundle_validation = createSection(
      'bundle_validation',
      'VALIDATION_RESULT',
      bundleValidation.status === 'PARTIAL',
      'Local validation result over the versioned Vault-ready export bundle structure.',
      bundleValidation,
    );

    if (bundleValidation.status === 'INVALID') {
      const firstIssue = bundleValidation.issues[0];
      throw new Error(
        firstIssue
          ? `Export bundle validation failed (${firstIssue.section}: ${firstIssue.reason})`
          : 'Export bundle validation failed.',
      );
    }

    return provisionalBundle;
  }
}

export function formatCliText(result: unknown): string {
  return JSON.stringify(result, null, 2);
}

function readAuditHistory(workspaceRoot: string): ParsedHistory<ParsedAuditEntry> {
  const files = auditChainFiles(workspaceRoot);
  const warnings: AuditHistoryWarning[] = [];
  const matched: ParsedAuditEntry[] = [];

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      warnings.push({
        kind: 'MISSING_FILE',
        file_path: filePath,
        detail: 'Audit chain file is absent.',
      });
      continue;
    }

    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (!line.trim()) {
        return;
      }

      try {
        matched.push({
          entry: JSON.parse(line) as AuditEntry,
          source_file: filePath,
          line_number: index + 1,
        });
      } catch {
        warnings.push({
          kind: 'MALFORMED_AUDIT_LINE',
          file_path: filePath,
          line_number: index + 1,
          detail: 'Audit line could not be parsed and was excluded from valid evidence.',
        });
      }
    });
  }

  return {
    filesRead: files,
    matched,
    warnings,
    partial: warnings.length > 0,
  };
}

function readPerformanceHistory(workspaceRoot: string): ParsedHistory<ParsedPerfEntry> {
  const perfPath = path.join(workspaceRoot, '.arc', 'perf.jsonl');
  const warnings: AuditHistoryWarning[] = [];
  const matched: ParsedPerfEntry[] = [];

  if (!fs.existsSync(perfPath)) {
    warnings.push({
      kind: 'MISSING_FILE',
      file_path: perfPath,
      detail: 'Performance log is absent.',
    });

    return {
      filesRead: [perfPath],
      matched,
      warnings,
      partial: true,
    };
  }

  const lines = fs.readFileSync(perfPath, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (!line.trim()) {
      return;
    }

    try {
      matched.push({
        entry: JSON.parse(line) as PerformanceEntry,
        source_file: perfPath,
        line_number: index + 1,
      });
    } catch {
      warnings.push({
        kind: 'MALFORMED_PERF_LINE',
        file_path: perfPath,
        line_number: index + 1,
        detail: 'Performance line could not be parsed and was excluded from valid evidence.',
      });
    }
  });

  return {
    filesRead: [perfPath],
    matched,
    warnings,
    partial: warnings.length > 0,
  };
}

function auditChainFiles(workspaceRoot: string): string[] {
  const auditPath = path.join(workspaceRoot, '.arc', 'audit.jsonl');
  const archiveDir = path.join(workspaceRoot, '.arc', 'archive');
  const archived = fs.existsSync(archiveDir)
    ? fs
        .readdirSync(archiveDir)
        .filter((fileName) => fileName.endsWith('.jsonl'))
        .sort()
        .map((fileName) => path.join(archiveDir, fileName))
    : [];

  return [...archived, auditPath];
}

function computeAuditHash(
  entry: AuditEntry,
  prevHash: string,
): string {
  const serialized = hasRouteMetadata(entry)
    ? JSON.stringify({
        prev_hash: prevHash,
        ts: entry.ts,
        file_path: entry.file_path,
        risk_flags: entry.risk_flags,
        matched_rules: entry.matched_rules,
        decision: entry.decision,
        reason: entry.reason,
        risk_level: entry.risk_level,
        violated_rules: entry.violated_rules,
        next_action: entry.next_action,
        source: entry.source,
        fallback_cause: entry.fallback_cause,
        lease_status: entry.lease_status,
        directive_id: entry.directive_id ?? null,
        blueprint_id: entry.blueprint_id ?? null,
        route_mode: entry.route_mode ?? null,
        route_lane: entry.route_lane ?? null,
        route_reason: entry.route_reason ?? null,
        route_clarity: entry.route_clarity ?? null,
        route_fallback: entry.route_fallback ?? null,
        route_policy_hash: entry.route_policy_hash ?? null,
      })
    : JSON.stringify({
        prev_hash: prevHash,
        ts: entry.ts,
        file_path: entry.file_path,
        risk_flags: entry.risk_flags,
        matched_rules: entry.matched_rules,
        decision: entry.decision,
        reason: entry.reason,
        risk_level: entry.risk_level,
        violated_rules: entry.violated_rules,
        next_action: entry.next_action,
        source: entry.source,
        fallback_cause: entry.fallback_cause,
        lease_status: entry.lease_status,
        directive_id: entry.directive_id ?? null,
        blueprint_id: entry.blueprint_id ?? null,
      });

  return crypto.createHash('sha256').update(serialized).digest('hex');
}

function hasRouteMetadata(entry: Partial<AuditEntry>): boolean {
  return (
    entry.route_mode !== undefined ||
    entry.route_lane !== undefined ||
    entry.route_reason !== undefined ||
    entry.route_clarity !== undefined ||
    entry.route_fallback !== undefined ||
    entry.route_policy_hash !== undefined
  );
}

function applyAuditFilters(
  records: ParsedAuditEntry[],
  filters: AuditFilterInput,
): ParsedAuditEntry[] {
  const normalized = normalizeAuditFilters(filters);
  const start = normalized.offset ?? 0;

  const filtered = records.filter((record) => {
    const { entry } = record;
    if (normalized.decision && entry.decision !== normalized.decision) {
      return false;
    }
    if (normalized.directiveId && entry.directive_id !== normalized.directiveId) {
      return false;
    }
    if (
      normalized.filePathIncludes &&
      !entry.file_path.includes(normalized.filePathIncludes)
    ) {
      return false;
    }
    if (normalized.routeMode && entry.route_mode !== normalized.routeMode) {
      return false;
    }
    if (normalized.routeLane && entry.route_lane !== normalized.routeLane) {
      return false;
    }
    if (normalized.routeClarity && entry.route_clarity !== normalized.routeClarity) {
      return false;
    }
    if (normalized.routeFallback && entry.route_fallback !== normalized.routeFallback) {
      return false;
    }
    if (normalized.sinceTs && entry.ts < normalized.sinceTs) {
      return false;
    }
    if (normalized.untilTs && entry.ts > normalized.untilTs) {
      return false;
    }

    return true;
  });

  return normalized.limit ? filtered.slice(start, start + normalized.limit) : filtered.slice(start);
}

function applyPerfFilters(
  records: ParsedPerfEntry[],
  filters: PerfFilterInput,
): ParsedPerfEntry[] {
  const filtered = records.filter((record) => {
    const { entry } = record;
    if (filters.operation && entry.operation !== filters.operation) {
      return false;
    }
    if (filters.sinceTs && entry.ts < filters.sinceTs) {
      return false;
    }
    if (filters.untilTs && entry.ts > filters.untilTs) {
      return false;
    }

    return true;
  });

  return filters.limit ? filtered.slice(0, filters.limit) : filtered;
}

function summarizeRoutes(entries: ParsedAuditEntry[]): RouteTraceSummary[] {
  const summaries = new Map<string, RouteTraceSummary>();

  for (const record of entries) {
    const route_mode = record.entry.route_mode ?? 'UNSPECIFIED';
    const route_lane = record.entry.route_lane ?? 'UNSPECIFIED';
    const route_clarity = record.entry.route_clarity ?? 'UNSPECIFIED';
    const route_fallback = record.entry.route_fallback ?? 'UNSPECIFIED';
    const route_policy_hash = record.entry.route_policy_hash ?? null;
    const key = JSON.stringify({
      route_mode,
      route_lane,
      route_clarity,
      route_fallback,
      route_policy_hash,
    });

    const existing = summaries.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    summaries.set(key, {
      route_mode,
      route_lane,
      route_clarity,
      route_fallback,
      route_policy_hash,
      count: 1,
    });
  }

  return [...summaries.values()].sort((left, right) => right.count - left.count);
}

function summarizePerfOperations(matches: ParsedPerfEntry[]): PerfSummaryResult['operation_summary'] {
  const summaries = new Map<PerformanceEntry['operation'], { count: number; total: number; max: number }>();

  for (const match of matches) {
    const existing = summaries.get(match.entry.operation) ?? {
      count: 0,
      total: 0,
      max: 0,
    };
    existing.count += 1;
    existing.total += match.entry.duration_ms;
    existing.max = Math.max(existing.max, match.entry.duration_ms);
    summaries.set(match.entry.operation, existing);
  }

  return [...summaries.entries()]
    .map(([operation, summary]) => ({
      operation,
      count: summary.count,
      avg_duration_ms: Number((summary.total / summary.count).toFixed(3)),
      max_duration_ms: Number(summary.max.toFixed(3)),
    }))
    .sort((left, right) => left.operation.localeCompare(right.operation));
}

function createSection<T>(
  section_id: string,
  evidence_class: AuditExportSection<T>['evidence_class'],
  partial: boolean,
  description: string,
  data: T,
): AuditExportSection<T> {
  return {
    section_id,
    evidence_class,
    partial,
    description,
    data,
  };
}

export function validateExportBundle(bundle: AuditExportBundle): ExportBundleValidationResult {
  const issues: ExportBundleValidationIssue[] = [];

  if (bundle.export_version !== 'phase-6.7-v1') {
    issues.push({
      code: 'INVALID_EXPORT_VERSION',
      section: 'bundle',
      reason: 'unexpected export version.',
    });
  }

  if (bundle.bundle_type !== 'LINTEL_VAULT_READY_EXPORT') {
    issues.push({
      code: 'INVALID_BUNDLE_TYPE',
      section: 'bundle',
      reason: 'unexpected bundle type.',
    });
  }

  if (
    !bundle.metadata.local_only ||
    bundle.metadata.direct_vault_write ||
    bundle.metadata.direct_arc_dependency ||
    bundle.metadata.allowed_destinations[0] !== 'stdout' ||
    bundle.metadata.allowed_destinations[1] !== 'local_file'
  ) {
    issues.push({
      code: 'INVALID_DESTINATION_POLICY',
      section: 'metadata',
      reason: 'export metadata no longer reflects strict local-only destination policy.',
    });
  }

  const requiredSections = [
    'export_metadata',
    'audit_slice',
    'route_trace',
    'route_summary',
    'perf_slice',
    'perf_operation_summary',
    'audit_integrity',
    'bundle_validation',
  ] satisfies Array<keyof AuditExportBundle['sections']>;

  for (const section of requiredSections) {
    if (!bundle.sections[section]) {
      issues.push({
        code: 'MISSING_SECTION',
        section,
        reason: 'required export section is absent.',
      });
    }
  }

  const partialSections = Object.values(bundle.sections).filter((section) => section?.partial);
  if (partialSections.length > 0 || bundle.warnings.length > 0) {
    issues.push({
      code: 'PARTIAL_SOURCE_EVIDENCE',
      section: partialSections.map((section) => section.section_id).join(',') || 'warnings',
      reason: 'source evidence contains malformed, incomplete, or missing local inputs and is exported as partial evidence.',
    });
  }

  return {
    status: issues.some((issue) => issue.code !== 'PARTIAL_SOURCE_EVIDENCE')
      ? 'INVALID'
      : issues.length > 0
        ? 'PARTIAL'
        : 'VALID',
    issues,
  };
}

function normalizeAuditFilters(filters: AuditFilterInput): AuditFilterInput {
  return {
    ...filters,
    directiveId: filters.directiveId?.trim(),
    filePathIncludes: filters.filePathIncludes?.trim(),
    routeMode: filters.routeMode?.trim(),
    routeLane: filters.routeLane?.trim(),
    routeClarity: filters.routeClarity?.trim(),
    routeFallback: filters.routeFallback?.trim(),
    sinceTs: filters.sinceTs?.trim(),
    untilTs: filters.untilTs?.trim(),
    limit: filters.limit && filters.limit > 0 ? filters.limit : undefined,
    offset: filters.offset && filters.offset > 0 ? filters.offset : undefined,
  };
}

function normalizePerfFilters(filters: PerfFilterInput): PerfFilterInput {
  return {
    ...filters,
    sinceTs: filters.sinceTs?.trim(),
    untilTs: filters.untilTs?.trim(),
    limit: filters.limit && filters.limit > 0 ? filters.limit : undefined,
  };
}

function dedupeWarnings(warnings: AuditHistoryWarning[]): AuditHistoryWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = JSON.stringify(warning);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function dedupePaths(paths: string[]): string[] {
  return [...new Set(paths)];
}
