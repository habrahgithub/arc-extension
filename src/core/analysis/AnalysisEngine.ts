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
  private astParser: TsAstParser | null = null;

  constructor(options: AnalysisEngineOptions = {}) {
    this.astFingerprintingEnabled = options.astFingerprintingEnabled ?? false;
    if (options.astParser) {
      this.astParser = options.astParser;
    }
  }

  private getAstParser(): TsAstParser | null {
    if (this.astParser) {
      return this.astParser;
    }
    try {
      this.astParser = new TsAstParser();
      return this.astParser;
    } catch {
      return null;
    }
  }

  runAnalysis(
    classification: Classification,
    input: SaveInput,
  ): AnalysisResult {
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

    const parser = this.getAstParser();
    if (!parser) {
      findings.push({
        source: 'AST',
        code: 'AST_PARSER_UNAVAILABLE',
        severity: 'LOW',
        detail: 'AST fingerprinting skipped due to parser unavailability.',
      });
      return { findings };
    }

    const parsed = parser.parse(input.filePath, input.text);
    if (!parsed.ok) {
      findings.push({
        source: 'AST',
        code: `AST_${parsed.reason}`,
        severity: 'LOW',
        detail: 'AST fingerprinting skipped for this save.',
      });
      return { findings };
    }

    try {
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
    } catch {
      findings.push({
        source: 'AST',
        code: 'AST_NORMALIZE_FAILED',
        severity: 'LOW',
        detail: 'AST fingerprinting skipped due to normalization failure.',
      });
      return { findings };
    }
  }
}
