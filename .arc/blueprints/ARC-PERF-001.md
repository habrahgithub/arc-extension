# ARC Blueprint: ARC-PERF-001

**Directive ID:** ARC-PERF-001

## Objective

Add a deterministic performance validation suite for the LINTEL extension so the beta-hardening sequence has explicit baseline evidence for classification, rule evaluation, model-evaluation harness behavior, and total save assessment time.

## Scope

This directive covers a bounded performance-validation package for `projects/lintel`:

- Add a dedicated `tests/performance/` suite
- Add `npm run test:performance` in `projects/lintel/package.json`
- Exercise and baseline:
  - file classification
  - rule evaluation
  - model-evaluation harness behavior using a bounded local stub adapter
  - total `assessSave()` execution time in an explicit-save local-lane path
- Update `projects/lintel/docs/TESTING.md`
- Retain concise benchmark evidence in `artifacts/ARC-PERF-001/`

## Constraints

- Must NOT depend on live Ollama/network availability for the benchmark gate
- Must NOT weaken save enforcement, rule floors, routing, or fallback posture
- Must keep performance instrumentation descriptive only
- Thresholds must be conservative enough for repeatable local/CI execution and clearly documented as beta baselines, not hard realtime guarantees
- Evidence should retain benchmark summaries and verification transcripts only, not bulky runtime residue

## Acceptance Criteria

1. `npm run test:performance` exists and passes
2. The performance suite measures the four required surfaces:
   - `classifyFile()`
   - `evaluateRules()`
   - model-evaluation harness behavior
   - `SaveOrchestrator.assessSave()`
3. Baseline thresholds are explicit in the suite and pass locally
4. `docs/TESTING.md` documents how to run and interpret the performance suite
5. Evidence is retained under `artifacts/ARC-PERF-001/` and the phase is logged in `ops/logs/2026-03.md`

## Rollback Note

If the performance suite proves too unstable or misleading before merge:

1. Remove `tests/performance/`
2. Remove `test:performance` from `projects/lintel/package.json`
3. Revert the related `projects/lintel/docs/TESTING.md` updates
4. Remove the bounded evidence bundle under `artifacts/ARC-PERF-001/`
5. Revert the package-specific log/decision entries

This returns LINTEL to the prior test surface without affecting save-path behavior.

## Phase Execution Package

### Phase 1 — harness design

- Build a deterministic performance test harness inside `tests/performance/`
- Use bounded local fixtures and stub adapters only
- Compute median, mean, and p95 timing summaries

### Phase 2 — benchmark coverage

- Measure `classifyFile()` across governed fixture paths
- Measure `evaluateRules()` using precomputed classifications
- Measure model-evaluation harness behavior using an immediate local stub adapter
- Measure `SaveOrchestrator.assessSave()` with explicit-save `LOCAL_PREFERRED` routing enabled

### Phase 3 — docs and evidence

- Add `test:performance` to `package.json`
- Update `docs/TESTING.md`
- Retain concise local benchmark summaries in `artifacts/ARC-PERF-001/`

### Phase 4 — verification and closure

- Run `npm run lint`
- Run `npm run typecheck`
- Run `npm run build`
- Run `npm run test`
- Run `npm run test:performance`
- Record results in `ops/logs/2026-03.md` and `docs/DECISIONS.md`

## Execution Evidence

- Evidence root: `artifacts/ARC-PERF-001/`
- Test entrypoint: `npm run test:performance`
- Canonical supporting doc: `projects/lintel/docs/TESTING.md`
