import { describe, expect, it } from 'vitest';
import { TsAstParser } from '../../src/core/analysis/ast/ts/TsAstParser';

describe('ts ast parser boundaries', () => {
  it('rejects unsupported file extensions', () => {
    const parser = new TsAstParser();
    const result = parser.parse('src/readme.md', '# title');

    expect(result).toEqual({ ok: false, reason: 'UNSUPPORTED_EXTENSION' });
  });

  it('rejects content over configured max byte size', () => {
    const parser = new TsAstParser({ maxInputBytes: 10 });
    const result = parser.parse('src/huge.ts', 'export const value = 12345;');

    expect(result).toEqual({ ok: false, reason: 'INPUT_TOO_LARGE' });
  });

  it('rejects malformed TypeScript fixtures as parse failure', () => {
    const parser = new TsAstParser();
    const malformedTs = 'export function broken( {';
    const result = parser.parse('src/broken.ts', malformedTs);

    expect(result).toEqual({ ok: false, reason: 'PARSE_FAILED' });
  });

  it('parses valid tsx when extension is supported', () => {
    const parser = new TsAstParser();
    const result = parser.parse('src/App.tsx', 'export const App = () => <div />;');

    expect(result.ok).toBe(true);
  });
});
