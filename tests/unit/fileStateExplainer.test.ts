import { describe, expect, it } from 'vitest';
import { explainFileState } from '../../src/extension/fileStateExplainer';

describe('explainFileState', () => {
  it('VERIFIED: first line is file label, status line present, footer present', () => {
    const result = explainFileState('VERIFIED', '/workspace/src/auth.ts');
    expect(result.lines[0]).toContain('auth.ts');
    expect(result.lines).toContain('Status: VERIFIED');
    expect(result.lines[result.lines.length - 1]).toBe(
      'Use: ARC: Show Decision Timeline',
    );
  });

  it('VERIFIED: no more than 8 lines', () => {
    const result = explainFileState('VERIFIED', '/workspace/src/auth.ts');
    expect(result.lines.length).toBeLessThanOrEqual(8);
  });

  it('DRIFT: status line and drift explanation present, footer present', () => {
    const result = explainFileState('DRIFT', '/workspace/src/session.ts');
    expect(result.lines[0]).toContain('session.ts');
    expect(result.lines).toContain('Status: DRIFT');
    const combined = result.lines.join('\n');
    expect(combined).toMatch(/diverged|did not match/i);
    expect(result.lines[result.lines.length - 1]).toBe(
      'Use: ARC: Show Decision Timeline',
    );
  });

  it('DRIFT: no more than 8 lines', () => {
    const result = explainFileState('DRIFT', '/workspace/src/session.ts');
    expect(result.lines.length).toBeLessThanOrEqual(8);
  });

  it('NO_DECISION: status line, guidance present, footer present', () => {
    const result = explainFileState('NO_DECISION', '/workspace/src/new.ts');
    expect(result.lines[0]).toContain('new.ts');
    expect(result.lines).toContain('Status: NO DECISION');
    const combined = result.lines.join('\n');
    expect(combined).toMatch(/no.*save|save.*the file/i);
    expect(result.lines[result.lines.length - 1]).toBe(
      'Use: ARC: Show Decision Timeline',
    );
  });

  it('UNKNOWN: handles undefined filePath gracefully', () => {
    const result = explainFileState('UNKNOWN', undefined);
    expect(result.lines).toContain('Status: UNKNOWN');
    expect(result.lines[result.lines.length - 1]).toBe(
      'Use: ARC: Show Decision Timeline',
    );
  });

  it('all states produce at least 4 lines', () => {
    for (const state of ['VERIFIED', 'DRIFT', 'NO_DECISION', 'UNKNOWN'] as const) {
      const result = explainFileState(state, '/workspace/src/file.ts');
      expect(result.lines.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('no state produces markdown or alarming language', () => {
    for (const state of ['VERIFIED', 'DRIFT', 'NO_DECISION', 'UNKNOWN'] as const) {
      const combined = explainFileState(state, '/workspace/src/file.ts').lines.join('\n');
      // No markdown headers or bold markers
      expect(combined).not.toMatch(/^#|^\*\*|__/m);
      // No alarming absolutes
      expect(combined).not.toMatch(/\b(corrupted|broken|lost|destroyed|invalid)\b/i);
    }
  });
});
