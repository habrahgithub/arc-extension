# Phase 6.5 Evidence Summary

## Package
- Package: `LINTEL-PH6-5-001`
- Phase: 6.5 — Local Lane Activation Gate
- Status: IMPLEMENTED / SENTINEL PASS / WARDEN PASS (`WRD-6501` discharged)
- Active Warden gate: `WRD-6501` discharged

## Scope delivered
- bounded `LOCAL_PREFERRED` acceptance in `.arc/router.json`
- explicit-save-only local-lane execution
- auto-save fail-closed behavior to `RULE_ONLY`
- reuse of the existing `OllamaModelAdapter` + `evaluateModelDecision(...)` + `enforceMinimumFloor(...)` path
- truthful route metadata for local execution, denial, and rule-only fallback
- no cloud routing or cloud endpoint activation

## Key files changed for Phase 6.5
- `src/contracts/types.ts`
- `src/core/routerPolicy.ts`
- `src/extension/saveOrchestrator.ts`
- `tests/unit/routerPolicy.test.ts`
- `tests/unit/lease.test.ts`
- `tests/integration/saveOrchestrator.test.ts`
- `tests/e2e/phase6.4-pilot.test.ts`
- `tests/e2e/phase6.5-pilot.test.ts`
- `tests/governance/policy.test.ts`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/TESTING.md`
- `docs/RISK_REGISTER.md`

## WRD-6501 implementation notes
1. **Enforcement floor unchanged**
   - `src/core/decisionPolicy.ts` was not modified.
   - `enforceMinimumFloor(...)`, `stricterDecision(...)`, and `compareDecisionSeverity(...)` remain intact.
2. **Route-policy relaxation is bounded**
   - `normalizeRoutePolicy(...)` now accepts `LOCAL_PREFERRED` only when `local_lane_enabled: true` and `cloud_lane_enabled: false`.
   - `CLOUD_ASSISTED` and any cloud-enabled config still fail closed to `RULE_ONLY`.
3. **Endpoint remains localhost-only**
   - `src/adapters/modelAdapter.ts` still uses `http://127.0.0.1:11434/api/generate`.
   - No remote endpoint or cloud provider URL was introduced.
4. **Trust-boundary defaults remain inert**
   - `data_class` remains `LOCAL_ONLY`.
   - `sensitivity_marker` remains `UNASSESSED`.
   - `CLOUD_ELIGIBLE`, `GOVERNED_CHANGE`, and `CLOUD_ASSISTED` remain non-operational.
5. **Auto-save explicitly resolved**
   - `LOCAL_PREFERRED` local-lane execution is blocked for `saveMode: 'AUTO'`.
   - Route metadata marks this with `route_lane: 'RULE_ONLY'` and `route_fallback: 'AUTO_SAVE_BLOCKED'`.
6. **Failure modes degrade to rule-first**
   - tested: adapter disabled, unavailable, timeout, parse failure, undefined result
   - all preserve rule-floor outcomes and do not loosen enforcement
7. **No second local invocation path**
   - local execution continues through the existing model adapter interface and existing orchestrator model-evaluation path
   - no direct `fetch(...)` path was added outside `modelAdapter.ts`

## Route-metadata outcomes now covered
- `route_mode: 'RULE_ONLY'` / `route_lane: 'RULE_ONLY'` for missing, invalid, or explicit RULE_ONLY config
- `route_mode: 'LOCAL_PREFERRED'` / `route_lane: 'LOCAL'` for explicit-save local execution
- `route_mode: 'LOCAL_PREFERRED'` / `route_lane: 'RULE_ONLY'` with `route_fallback: 'AUTO_SAVE_BLOCKED'` for auto-save denial
- `route_mode: 'LOCAL_PREFERRED'` / `route_lane: 'RULE_ONLY'` on model fallback, disabled adapter, or lease reuse

## Documentation updates
- README now describes Phase 6.5 local-lane activation and explicit-save-only behavior
- ARCHITECTURE documents `LOCAL_PREFERRED` as local-only and auto-save fail-closed behavior
- TESTING documents the local-lane activation gate plus all required fallback paths
- RISK_REGISTER records accepted and mitigated Phase 6.5 risks

## Validation
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test:unit` ✅
- `npm run test:integration` ✅
- `npm run test:e2e` ✅
- `npm run test:governance` ✅
- `npm run build` ✅

## Result summary
- runtime now permits bounded local-only inference for explicit `LOCAL_PREFERRED` saves
- rule floor remains authoritative
- cloud routing remains disabled
- auto-save remains fail-closed
- save-path behavior stays deterministic and auditable
