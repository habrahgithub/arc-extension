# LINTEL Phase 6.4 Evidence Summary

## Scope implemented
- formal RULE_ONLY router shell added on top of the existing authoritative route-policy resolution path
- router shell now emits deterministic shell-only route metadata
- disabled local/cloud lane descriptors added as inert, non-executable placeholders
- stale Phase 6.0 route-policy reason strings updated to truthful Phase 6.4 shell language
- Phase 6.4 docs, governance coverage, and evidence summary added

## Files changed
- `src/core/routerPolicy.ts`
- `src/contracts/types.ts`
- `src/extension/saveOrchestrator.ts`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/TESTING.md`
- `docs/RISK_REGISTER.md`
- `tests/unit/routerPolicy.test.ts`
- `tests/integration/saveOrchestrator.test.ts`
- `tests/e2e/phase6.4-pilot.test.ts`
- `tests/governance/policy.test.ts`

## Validation summary
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test:unit` ✅
- `npm run test:integration` ✅
- `npm run test:e2e` ✅
- `npm run test:governance` ✅
- `npm run build` ✅

## Router shell contract summary
- router shell delegates to the existing authoritative `RoutePolicyStore.load()` resolution path
- route metadata remains limited to:
  - `route_mode`
  - `route_lane`
  - `route_reason`
  - `route_clarity`
  - `route_fallback`
  - `route_policy_hash`
- router metadata describes shell state only and does not imply live inference execution
- ambiguity and invalid route state remain fail-closed to `RULE_ONLY`
- disabled local/cloud lane descriptors remain `enabled: false` and `executable: false`

## Outcome-preservation summary
- valid explicit `RULE_ONLY` config preserves existing rule-first decisions
- no local-model adapter or cloud client is invoked by the router shell
- no route-based weakening of the enforcement floor was introduced
- runtime posture remains `RULE_ONLY`

## Rollback note
- remove the formal router shell layer from the nested `projects/lintel` repo if rollback is authorized
- restore the prior pre-shell `RULE_ONLY` path without changing audit history
- preserve audit continuity for already-written entries
- do not rewrite historical audit files during rollback

## Open findings / deferrals
- future activation phases must keep using the single authoritative route-resolution path and must not introduce competing resolvers
- any widening of trust-boundary or route-mode values remains Warden-gated for future packages

## Required non-activation confirmations
- No local-model lane was activated
- No cloud lane was activated
- No live local inference path was introduced
- No non-default exercise of `CLOUD_ELIGIBLE`, `GOVERNED_CHANGE`, `LOCAL_PREFERRED`, or `CLOUD_ASSISTED` occurred

## Review outcome
- Sentinel: PASS
- Warden: PASS (`WRD-6401` discharged)
- Closure note: Phase 6.4 may close; Phase 6.5 is the next phase and requires mandatory Warden preactivation review before any package may be promoted
