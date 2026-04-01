import { describe, expect, it } from 'vitest';
import { AnalysisEngine } from '../../src/core/analysis/AnalysisEngine';

const tsInput = {
  filePath: 'src/example.ts',
  text: 'export function add(a:number,b:number){return a+b;}',
  previousText: '',
  saveMode: 'EXPLICIT' as const,
  autoSaveMode: 'off' as const,
};

const classification = {
  filePath: 'src/example.ts',
  fileName: 'example.ts',
  matchedRuleIds: ['rule-1'],
  riskFlags: ['CONFIG_CHANGE'] as const,
  riskLevel: 'HIGH' as const,
  heuristicOnly: true as const,
  demoted: false,
};

describe('analysis engine', () => {
  it('skips fingerprints when feature flag is disabled', () => {
    const engine = new AnalysisEngine({ astFingerprintingEnabled: false });
    const result = engine.runAnalysis(classification, tsInput);

    expect(result.fingerprints).toBeUndefined();
    expect(result.findings.some((entry) => entry.source === 'RULE')).toBe(true);
  });

  it('produces deterministic fingerprints for equivalent TS structure', () => {
    const engine = new AnalysisEngine({ astFingerprintingEnabled: true });
    const first = engine.runAnalysis(classification, tsInput);
    const second = engine.runAnalysis(classification, {
      ...tsInput,
      text: 'export   function add(x:number,y:number){ return x + y }',
    });

    expect(first.fingerprints?.file).toBeDefined();
    expect(first.fingerprints?.file).toBe(second.fingerprints?.file);
    expect(first.fingerprints?.features).toEqual(second.fingerprints?.features);
  });

  it('changes fingerprint when structure changes', () => {
    const engine = new AnalysisEngine({ astFingerprintingEnabled: true });
    const first = engine.runAnalysis(classification, tsInput);
    const second = engine.runAnalysis(classification, {
      ...tsInput,
      text: 'export const add = (a:number,b:number) => a+b;',
    });

    expect(first.fingerprints?.file).not.toBe(second.fingerprints?.file);
  });

  it('handles malformed TypeScript safely without fingerprints', () => {
    const engine = new AnalysisEngine({ astFingerprintingEnabled: true });
    const result = engine.runAnalysis(classification, {
      ...tsInput,
      filePath: 'src/bad.ts',
      text: 'export function broken( {',
    });

    expect(result.fingerprints).toBeUndefined();
    expect(result.findings.some((entry) => entry.code === 'AST_PARSE_FAILED')).toBe(
      true,
    );
  });
});
