import fs from 'node:fs';
import path from 'node:path';
import type { AuditFilterInput, PerfFilterInput } from './contracts/types';
import { AuditVisibilityService, formatCliText } from './core/auditVisibility';

interface CliIo {
  stdout(message: string): void;
  stderr(message: string): void;
}

interface ParsedArgs {
  command?: string;
  workspaceRoot: string;
  outputPath?: string;
  auditFilters: AuditFilterInput;
  perfFilters: PerfFilterInput;
  directiveId?: string;
}

const HELP_TEXT = [
  'LINTEL Audit Visibility CLI (Phase 6.2)',
  '',
  'Read-only / export-only commands:',
  '  query            Query local audit history',
  '  trace-directive  Trace a directive and linked blueprint evidence',
  '  trace-route      Summarize route metadata from local audit history',
  '  perf             Summarize local perf history',
  '  verify           Verify the local audit hash chain',
  '  export           Export a local Vault-ready evidence bundle to stdout or --out',
  '',
  'Common options:',
  '  --workspace <path>         Workspace root (defaults to current working directory)',
  '  --decision <value>         Filter audit entries by decision',
  '  --directive-id <value>     Filter or trace a directive id',
  '  --file-path <value>        Filter audit entries by file path substring',
  '  --route-mode <value>       Filter by observed route_mode string',
  '  --route-lane <value>       Filter by observed route_lane string',
  '  --route-clarity <value>    Filter by observed route_clarity string',
  '  --route-fallback <value>   Filter by observed route_fallback string',
  '  --since <iso-ts>           Lower timestamp bound',
  '  --until <iso-ts>           Upper timestamp bound',
  '  --limit <n>                Max records to return',
  '  --offset <n>               Record offset for audit queries',
  '  --operation <value>        Perf operation filter',
  '  --out <file>               Write export bundle to an explicit local file',
  '',
  'This CLI never mutates audit or blueprint state and never writes to Vault or ARC.',
].join('\n');

export function runCli(
  argv: string[],
  io: CliIo = defaultIo(),
): number {
  try {
    const parsed = parseArgs(argv);
    if (!parsed.command || parsed.command === 'help' || parsed.command === '--help') {
      io.stdout(`${HELP_TEXT}\n`);
      return 0;
    }

    const service = new AuditVisibilityService(parsed.workspaceRoot);
    let result: unknown;

    switch (parsed.command) {
      case 'query':
        result = service.queryAudit(parsed.auditFilters);
        break;
      case 'trace-directive':
        if (!parsed.directiveId) {
          throw new Error('trace-directive requires --directive-id <value>.');
        }
        result = service.traceDirective(parsed.directiveId);
        break;
      case 'trace-route':
        result = service.traceRoutes(parsed.auditFilters);
        break;
      case 'perf':
        result = service.summarizePerformance(parsed.perfFilters);
        break;
      case 'verify':
        result = service.verifyAuditHistory();
        break;
      case 'export': {
        result = service.exportBundle({
          auditFilters: parsed.auditFilters,
          perfFilters: parsed.perfFilters,
          directiveId: parsed.directiveId,
        });
        const rendered = formatCliText(result);
        if (parsed.outputPath) {
          const target = path.resolve(parsed.workspaceRoot, parsed.outputPath);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, `${rendered}\n`, 'utf8');
          io.stdout(`${JSON.stringify({ wrote: target, export_version: 'phase-6.2-v1' }, null, 2)}\n`);
          return 0;
        }
        io.stdout(`${rendered}\n`);
        return 0;
      }
      default:
        throw new Error(`Unknown command: ${parsed.command}`);
    }

    io.stdout(`${formatCliText(result)}\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown CLI failure.';
    io.stderr(`${message}\n`);
    return 1;
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const parsed: ParsedArgs = {
    command,
    workspaceRoot: process.cwd(),
    auditFilters: {},
    perfFilters: {},
  };

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    const value = rest[index + 1];

    switch (token) {
      case '--workspace':
        parsed.workspaceRoot = resolveRequiredValue(token, value, () => {
          index += 1;
        });
        break;
      case '--decision':
        parsed.auditFilters.decision = resolveRequiredValue(token, value, () => {
          index += 1;
        }) as AuditFilterInput['decision'];
        break;
      case '--directive-id':
        parsed.directiveId = resolveRequiredValue(token, value, () => {
          index += 1;
        });
        parsed.auditFilters.directiveId = parsed.directiveId;
        break;
      case '--file-path':
        parsed.auditFilters.filePathIncludes = resolveRequiredValue(token, value, () => {
          index += 1;
        });
        break;
      case '--route-mode':
        parsed.auditFilters.routeMode = resolveRequiredValue(token, value, () => {
          index += 1;
        });
        break;
      case '--route-lane':
        parsed.auditFilters.routeLane = resolveRequiredValue(token, value, () => {
          index += 1;
        });
        break;
      case '--route-clarity':
        parsed.auditFilters.routeClarity = resolveRequiredValue(token, value, () => {
          index += 1;
        });
        break;
      case '--route-fallback':
        parsed.auditFilters.routeFallback = resolveRequiredValue(token, value, () => {
          index += 1;
        });
        break;
      case '--since':
        parsed.auditFilters.sinceTs = resolveRequiredValue(token, value, () => {
          index += 1;
        });
        parsed.perfFilters.sinceTs = parsed.auditFilters.sinceTs;
        break;
      case '--until':
        parsed.auditFilters.untilTs = resolveRequiredValue(token, value, () => {
          index += 1;
        });
        parsed.perfFilters.untilTs = parsed.auditFilters.untilTs;
        break;
      case '--limit': {
        const limit = parsePositiveInt(resolveRequiredValue(token, value, () => {
          index += 1;
        }), token);
        parsed.auditFilters.limit = limit;
        parsed.perfFilters.limit = limit;
        break;
      }
      case '--offset':
        parsed.auditFilters.offset = parsePositiveInt(resolveRequiredValue(token, value, () => {
          index += 1;
        }), token, true);
        break;
      case '--operation':
        parsed.perfFilters.operation = resolveRequiredValue(token, value, () => {
          index += 1;
        }) as PerfFilterInput['operation'];
        break;
      case '--out':
        parsed.outputPath = resolveRequiredValue(token, value, () => {
          index += 1;
        });
        break;
      default:
        throw new Error(`Unknown option: ${token}`);
    }
  }

  return parsed;
}

function resolveRequiredValue(
  flag: string,
  value: string | undefined,
  onConsume: () => void,
): string {
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }
  onConsume();
  return value;
}

function parsePositiveInt(value: string, flag: string, allowZero = false): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || (!allowZero && parsed <= 0) || (allowZero && parsed < 0)) {
    throw new Error(`${flag} requires ${allowZero ? 'a non-negative' : 'a positive'} integer.`);
  }
  return parsed;
}

function defaultIo(): CliIo {
  return {
    stdout: (message) => process.stdout.write(message),
    stderr: (message) => process.stderr.write(message),
  };
}

if (require.main === module) {
  process.exitCode = runCli(process.argv.slice(2));
}
