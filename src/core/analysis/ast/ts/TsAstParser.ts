import ts from 'typescript';

export const DEFAULT_MAX_AST_INPUT_BYTES = 512 * 1024;

export interface TsAstParseSuccess {
  ok: true;
  sourceFile: ts.SourceFile;
}

export interface TsAstParseFailure {
  ok: false;
  reason: 'UNSUPPORTED_EXTENSION' | 'INPUT_TOO_LARGE' | 'PARSE_FAILED';
}

export type TsAstParseResult = TsAstParseSuccess | TsAstParseFailure;

export interface TsAstParserOptions {
  readonly maxInputBytes?: number;
}

export class TsAstParser {
  private readonly maxInputBytes: number;

  constructor(options: TsAstParserOptions = {}) {
    this.maxInputBytes = options.maxInputBytes ?? DEFAULT_MAX_AST_INPUT_BYTES;
  }

  parse(filePath: string, sourceText: string): TsAstParseResult {
    if (!isSupportedTsPath(filePath)) {
      return { ok: false, reason: 'UNSUPPORTED_EXTENSION' };
    }

    if (Buffer.byteLength(sourceText, 'utf8') > this.maxInputBytes) {
      return { ok: false, reason: 'INPUT_TOO_LARGE' };
    }

    try {
      const scriptKind = filePath.toLowerCase().endsWith('.tsx')
        ? ts.ScriptKind.TSX
        : ts.ScriptKind.TS;
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        scriptKind,
      );
      const diagnostics =
        (
          sourceFile as unknown as { parseDiagnostics?: readonly ts.Diagnostic[] }
        ).parseDiagnostics ?? [];
      if (diagnostics.length > 0) {
        return { ok: false, reason: 'PARSE_FAILED' };
      }

      return { ok: true, sourceFile };
    } catch {
      return { ok: false, reason: 'PARSE_FAILED' };
    }
  }
}

export function isSupportedTsPath(filePath: string): boolean {
  return /\.(ts|tsx)$/i.test(filePath);
}
