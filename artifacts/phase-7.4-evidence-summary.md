# Phase 7.4 — Runtime Hardening and Configuration Controls

## Scope executed
- hardened the local model adapter with bounded retry logic for timeout/unavailable failures
- added local-only environment-backed runtime configuration for host, model, timeout, and retry count
- enforced fail-closed handling for non-local `OLLAMA_HOST` values
- hardened model parsing so malformed or contradictory outputs degrade as explicit `PARSE_FAILURE`
- expanded local performance instrumentation to cover classification, rule evaluation, and model evaluation timing
- aligned README / ARCHITECTURE / TESTING and governance/integration/unit tests to the hardened runtime contract

## Files changed
- `src/adapters/modelAdapter.ts`
- `src/contracts/types.ts`
- `src/extension/saveOrchestrator.ts`
- `tests/unit/modelAdapter.test.ts`
- `tests/integration/saveOrchestrator.test.ts`
- `tests/governance/policy.test.ts`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/TESTING.md`

## Runtime hardening summary
- retry handling is bounded by `OLLAMA_RETRIES` and applies only to `TIMEOUT` / `UNAVAILABLE`
- retry exhaustion remains a fallback/degradation path only
- malformed JSON, schema failure, and contradictory `ALLOW` + elevated risk degrade to `PARSE_FAILURE`
- non-local host config fails closed before any model request is attempted

## Local configuration summary
- supported environment keys:
  - `OLLAMA_HOST`
  - `SWD_SUBAGENT_MODEL`
  - `OLLAMA_TIMEOUT_MS`
  - `OLLAMA_RETRIES`
- missing or invalid config falls back to the established local baseline or degrades fail-closed
- non-local `OLLAMA_HOST` values do not activate cloud behavior and do not widen runtime authority

## Performance instrumentation summary
- `.arc/perf.jsonl` remains local-only observational evidence
- added explicit timing coverage for:
  - `classify_file`
  - `evaluate_rules`
  - `evaluate_model`
- existing `assess_save`, `commit_save`, and review-surface timing remain intact

## WRD-0067 handling
- handled by local-only host validation in the adapter
- governance/docs now anchor that non-local `OLLAMA_HOST` values must not imply cloud-lane activation or broader remote authority

## Trust-boundary statement
- no cloud behavior activated or widened
- no ARC Console, Vault, or remote dependency introduced
- no worker-runtime redesign introduced
- retries, warmup/readiness posture, and performance instrumentation remain non-authorizing

## Validation gates
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test:unit` ✅
- `npm run test:integration` ✅
- `npm run test:e2e` ✅
- `npm run test:governance` ✅
- `npm run build` ✅

## Open findings / deferrals
- worker-runtime reliability hardening remains separate future work under `agents/axis/App Idea Blueprints/SWD_local_forge_worker_reliability_project_plan.md`
- this phase does not adopt `llama.cpp` or any new runtime baseline
