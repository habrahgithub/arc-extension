import type { Classification, Finding, SaveInput } from '../../contracts/types';
import { TsAstParser } from './ast/ts/TsAstParser';
import { buildTsFingerprint } from './ast/ts/TsFingerprintBuilder';
import { normalizeTsAst } from './ast/ts/TsNodeNormalizer';

export interface AnalysisEngineOptions {
  readonly astFingerprintingEnabled?: boolean;
  readonly astParser?: TsAstParser;
}

export interface AnalysisResult {
  findings: Finding[];
  fingerprints?: {
    file: string;
    features: string[];
  };
}

export class AnalysisEngine {
  private readonly astFingerprintingEnabled: boolean;
  private readonly astParser: TsAstParser;

  constructor(options: AnalysisEngineOptions = {}) {
    this.astFingerprintingEnabled = options.astFingerprintingEnabled ?? false;
    this.astParser = options.astParser ?? new TsAstParser();
  }

  runAnalysis(classification: Classification, input: SaveInput): AnalysisResult {
    const findings: Finding[] = [
      ...classification.riskFlags.map((flag) => ({
        source: 'RULE' as const,
        code: flag,
        severity: classification.riskLevel,
        detail: `Matched risk flag ${flag}.`,
      })),
    ];

    if (!this.astFingerprintingEnabled) {
      return { findings };
    }

    const parsed = this.astParser.parse(input.filePath, input.text);
    if (!parsed.ok) {
      findings.push({
        source: 'AST',
        code: `AST_${parsed.reason}`,
        severity: 'LOW',
        detail: 'AST fingerprinting skipped for this save.',
      });
      return { findings };
    }

    const normalized = normalizeTsAst(parsed.sourceFile);
    const fingerprints = buildTsFingerprint(normalized);

    findings.push({
      source: 'AST',
      code: 'AST_FINGERPRINTED',
      severity: 'LOW',
      detail: 'AST fingerprint generated from normalized structure.',
    });

    return {
      findings,
      fingerprints,
    };
  }
}
