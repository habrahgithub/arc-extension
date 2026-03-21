# Phase 6.6 Evidence Summary

## Package
- Package: `LINTEL-PH6-6-001`
- Phase: 6.6 — Cloud Fallback Gate
- Status: IMPLEMENTED / SENTINEL PASS / WARDEN PASS (`WRD-6601` discharged)
- Active Warden gate: `WRD-6601` discharged

## Scope delivered
- bounded `CLOUD_ASSISTED` acceptance in `.arc/router.json`
- operator-gated packet promotion to `CLOUD_ELIGIBLE`
- explicit-save-only cloud fallback after approved local fallback states
- single orchestrator pipeline preserved for local-first then cloud-fallback evaluation
- provider-agnostic `CloudModelAdapter` added on the existing adapter interface
- truthful route metadata for local execution, cloud execution, cloud denial, and rule-only fallback
- no rule-floor weakening and no competing direct cloud invocation path

## Key files changed for Phase 6.6
- `src/adapters/modelAdapter.ts`
- `src/contracts/types.ts`
- `src/core/contextPacket.ts`
- `src/core/routerPolicy.ts`
- `src/extension/saveOrchestrator.ts`
- `tests/unit/contextPacket.test.ts`
- `tests/unit/routerPolicy.test.ts`
- `tests/integration/saveOrchestrator.test.ts`
- `tests/e2e/phase6.4-pilot.test.ts`
- `tests/e2e/phase6.6-pilot.test.ts`
- `tests/governance/policy.test.ts`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/TESTING.md`
- `docs/RISK_REGISTER.md`

## WRD-6601 implementation notes
1. **`CLOUD_ELIGIBLE` is never the default**
   - `buildContextPacket(...)` still defaults packet `data_class` to `LOCAL_ONLY`.
   - `CLOUD_ELIGIBLE` is produced only when the active normalized route policy is explicitly cloud-enabled and declares `cloudDataClass: 'CLOUD_ELIGIBLE'`.
2. **Packet validation accepts `CLOUD_ELIGIBLE` only under explicit cloud policy**
   - `validateContextPacket(packet, routePolicy)` now checks the active normalized route policy.
   - Without explicit cloud-enabled policy, non-default data-class values still fail closed with `INVALID_DATA_CLASS`.
3. **Cloud exposure stays bounded to the documented payload subset**
   - `CloudModelAdapter` sends only `ContextPayload` fields.
   - No full `ContextPacket`, packet hash, authority tag, or full-file input is serialized to the remote adapter.
4. **`GOVERNED_CHANGE` remains deny-cloud**
   - `sensitivity_marker` stays `UNASSESSED` in Phase 6.6.
   - No branch reads `GOVERNED_CHANGE` as a cloud-permitting signal.
5. **Cloud output still passes through `enforceMinimumFloor(...)`**
   - local and cloud evaluations both run through the existing `evaluateModelDecision(...)` flow.
   - successful cloud output is post-processed by the unchanged enforcement floor logic.
6. **Approved local fallback states are closed and enumerated**
   - cloud is considered only after local-first evaluation ends in one of:
     - `MODEL_DISABLED`
     - `UNAVAILABLE`
     - `TIMEOUT`
     - `PARSE_FAILURE`
     - `RULE_ONLY`
   - successful local execution blocks cloud fallback.
7. **No second direct cloud invocation path exists**
   - cloud execution uses the existing adapter interface and the single orchestrator pipeline.
   - no direct `fetch(...)` was added outside `src/adapters/modelAdapter.ts`.

## Route-metadata outcomes now covered
- `route_mode: 'CLOUD_ASSISTED'` / `route_lane: 'RULE_ONLY'` with `route_fallback: 'DATA_CLASS_DENIED'` when packet state remains `LOCAL_ONLY`
- `route_mode: 'CLOUD_ASSISTED'` / `route_lane: 'RULE_ONLY'` with `route_fallback: 'PACKET_INVALID'` when packet validation fails
- `route_mode: 'CLOUD_ASSISTED'` / `route_lane: 'RULE_ONLY'` with `route_fallback: 'AUTO_SAVE_BLOCKED'` on auto-save denial
- `route_mode: 'CLOUD_ASSISTED'` / `route_lane: 'LOCAL'` for successful local execution under cloud-assisted policy
- `route_mode: 'CLOUD_ASSISTED'` / `route_lane: 'CLOUD'` only after approved local fallback and successful cloud execution
- `route_mode: 'CLOUD_ASSISTED'` / `route_lane: 'RULE_ONLY'` on cloud fallback to rule-first

## Documentation updates
- README now describes Phase 6.6 cloud fallback as lab-only, local-first, and operator-gated
- ARCHITECTURE documents the packet transition contract, the single orchestrator cloud-evaluation model, and bounded remote exposure
- TESTING documents cloud fallback gate coverage plus the carried-forward Lease v2 and CLI assertions
- RISK_REGISTER records accepted and mitigated Phase 6.6 cloud trust-boundary risks

## Validation
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test:unit` ✅
- `npm run test:integration` ✅
- `npm run test:e2e` ✅
- `npm run test:governance` ✅
- `npm run build` ✅

## Result summary
- runtime now permits bounded cloud fallback only under explicit `CLOUD_ASSISTED` policy and `CLOUD_ELIGIBLE` packet state
- local-first ordering remains authoritative
- cloud is denied for auto-save, `LOCAL_ONLY`, invalid, malformed, or unknown packet state
- rule floor remains authoritative for both local and cloud model output
- save-path behavior stays deterministic, auditable, and fail-closed
