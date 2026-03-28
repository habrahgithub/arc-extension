import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { afterEach, describe, expect, it } from 'vitest';
import type { ContextPayload, ModelEvaluationResult } from '../../src/contracts/types';
import { classifyFile } from '../../src/core/classifier';
import { DEFAULT_RULES } from '../../src/core/rules';
import { evaluateRules } from '../../src/core/ruleEngine';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import { fixtureInputs } from '../fixtures/saveInputs';

const workspaces: string[] = [];

const PERFORMANCE_THRESHOLDS = {
  classifyFile: { median: 1.5, p95: 4 },
  evaluateRules: { median: 1, p95: 3 },
  evaluateModelHarness: { median: 1.5, p95: 4 },
  assessSave: { median: 20, p95: 45 },
} as const;

interface BenchmarkStats {
  iterations: number;
  mean: number;
  median: number;
  p95: number;
  min: number;
  max: number;
}

class FastLocalAdapter {
  readonly enabledByDefault = true;

  evaluate(context: ContextPayload): Promise<ModelEvaluationResult | undefined> {
    return Promise.resolve({
      decision: 'BLOCK',
      reason: `Perf harness model tightened the rule-floor decision for ${context.filePath}.`,
      risk_level: 'CRITICAL',
      violated_rules: ['AUTH_CHANGE', 'PERF_HARNESS'],
      next_action: 'Block and review the governed change.',
    });
  }
}

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-perf-'));
  workspaces.push(workspace);
  return workspace;
}

function round(value: number): number {
  return Number(value.toFixed(3));
}

function computeStats(samples: number[]): BenchmarkStats {
  const ordered = [...samples].sort((left, right) => left - right);
  const sum = ordered.reduce((total, value) => total + value, 0);
  const lastIndex = ordered.length - 1;
  const medianIndex = Math.floor(lastIndex / 2);
  const p95Index = Math.min(lastIndex, Math.ceil(lastIndex * 0.95));

  return {
    iterations: ordered.length,
    mean: round(sum / ordered.length),
    median: round(ordered[medianIndex]),
    p95: round(ordered[p95Index]),
    min: round(ordered[0]),
    max: round(ordered[lastIndex]),
  };
}

function logStats(label: string, stats: BenchmarkStats): void {
  console.info(
    `[perf] ${label}: median=${stats.median}ms p95=${stats.p95}ms mean=${stats.mean}ms min=${stats.min}ms max=${stats.max}ms iterations=${stats.iterations}`,
  );
}

function expectWithinThreshold(
  label: string,
  stats: BenchmarkStats,
  threshold: { median: number; p95: number },
): void {
  logStats(label, stats);
  expect(stats.median).toBeLessThanOrEqual(threshold.median);
  expect(stats.p95).toBeLessThanOrEqual(threshold.p95);
}

function benchmarkSync(
  iterations: number,
  warmupIterations: number,
  action: () => void,
): BenchmarkStats {
  for (let index = 0; index < warmupIterations; index += 1) {
    action();
  }

  const samples: number[] = [];
  for (let index = 0; index < iterations; index += 1) {
    const started = performance.now();
    action();
    samples.push(performance.now() - started);
  }

  return computeStats(samples);
}

async function benchmarkAsync(
  iterations: number,
  warmupIterations: number,
  action: () => Promise<void>,
): Promise<BenchmarkStats> {
  for (let index = 0; index < warmupIterations; index += 1) {
    await action();
  }

  const samples: number[] = [];
  for (let index = 0; index < iterations; index += 1) {
    const started = performance.now();
    await action();
    samples.push(performance.now() - started);
  }

  return computeStats(samples);
}

afterEach(() => {
  while (workspaces.length > 0) {
    const workspace = workspaces.pop();
    if (workspace) {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }
});

describe('ARC-PERF-001 performance baselines', () => {
  it('keeps classifyFile within the beta baseline', () => {
    const inputs = [
      fixtureInputs.button,
      fixtureInputs.auth,
      fixtureInputs.schema,
      fixtureInputs.authSchema,
    ];
    let cursor = 0;

    const stats = benchmarkSync(2_000, 100, () => {
      const input = inputs[cursor % inputs.length];
      cursor += 1;
      classifyFile(input, DEFAULT_RULES);
    });

    expectWithinThreshold(
      'classifyFile',
      stats,
      PERFORMANCE_THRESHOLDS.classifyFile,
    );
  });

  it('keeps evaluateRules within the beta baseline', () => {
    const classifications = [
      classifyFile(fixtureInputs.button, DEFAULT_RULES),
      classifyFile(fixtureInputs.auth, DEFAULT_RULES),
      classifyFile(fixtureInputs.schema, DEFAULT_RULES),
      classifyFile(fixtureInputs.authSchema, DEFAULT_RULES),
    ];
    const inputs = [
      fixtureInputs.button,
      fixtureInputs.auth,
      fixtureInputs.schema,
      fixtureInputs.authSchema,
    ];
    let cursor = 0;

    const stats = benchmarkSync(2_000, 100, () => {
      const index = cursor % classifications.length;
      cursor += 1;
      evaluateRules(classifications[index], inputs[index]);
    });

    expectWithinThreshold(
      'evaluateRules',
      stats,
      PERFORMANCE_THRESHOLDS.evaluateRules,
    );
  });

  it('keeps the model-evaluation harness within the beta baseline', async () => {
    const adapter = new FastLocalAdapter();
    const context: ContextPayload = {
      file_path: fixtureInputs.auth.filePath,
      risk_flags: ['AUTH_CHANGE'],
      matched_rule_ids: ['rule-auth-path'],
      last_decision: 'REQUIRE_PLAN',
      excerpt: fixtureInputs.auth.text,
      heuristic_only: true,
    };

    const stats = await benchmarkAsync(500, 25, async () => {
      await adapter.evaluate(context);
    });

    expectWithinThreshold(
      'evaluateModelHarness',
      stats,
      PERFORMANCE_THRESHOLDS.evaluateModelHarness,
    );
  });

  it('keeps explicit-save assessSave within the beta baseline', async () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'LOCAL_PREFERRED',
        local_lane_enabled: true,
        cloud_lane_enabled: false,
      }),
      'utf8',
    );

    const orchestrator = new SaveOrchestrator(workspace, new FastLocalAdapter());
    const stats = await benchmarkAsync(60, 5, async () => {
      await orchestrator.assessSave(fixtureInputs.auth);
    });

    expectWithinThreshold(
      'assessSave',
      stats,
      PERFORMANCE_THRESHOLDS.assessSave,
    );
  });
});
