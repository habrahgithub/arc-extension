// import ts from 'typescript'; // Removed to enable lazy loading

export const DEFAULT_MAX_AST_INPUT_BYTES = 512 * 1024;

export interface TsAstParseSuccess {
  ok: true;
  sourceFile: any; // ts.SourceFile - using any to avoid compile-time dependency
}

export interface TsAstParseFailure {
  ok: false;
  reason:
    | 'UNSUPPORTED_EXTENSION'
    | 'INPUT_TOO_LARGE'
    | 'PARSE_FAILED'
    | 'TYPESCRIPT_UNAVAILABLE';
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

  private getTs() {
    try {
      return require('typescript');
    } catch {
      return null;
    }
  }

  parse(filePath: string, sourceText: string): TsAstParseResult {
    const ts = this.getTs();
    if (!ts) {
      return { ok: false, reason: 'TYPESCRIPT_UNAVAILABLE' };
    }

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
          sourceFile as unknown as {
            parseDiagnostics?: readonly any[];
          }
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
