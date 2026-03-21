# Phase 6.8 End-to-End Evidence Pack

## Integrated scenarios exercised
1. Hardened baseline `RULE_ONLY` with valid `REQUIRE_PLAN` proof
2. Explicit-save local-lane execution under `LOCAL_PREFERRED`
3. Cloud denial under `CLOUD_ASSISTED` when packet remains `LOCAL_ONLY`
4. Auto-save denial under `CLOUD_ASSISTED`
5. Cloud execution under `CLOUD_ASSISTED` only after approved local fallback and `CLOUD_ELIGIBLE`
6. Vault-ready local export generation and validation
7. Rollback to hardened-equivalent posture by removing route-policy activation config
8. Audit continuity verification after integrated transitions

## Evidence anchors
- `tests/e2e/phase6.8-pilot.test.ts`
- `tests/e2e/phase6.6-pilot.test.ts`
- `tests/e2e/phase6.7-pilot.test.ts`
- `tests/integration/saveOrchestrator.test.ts`
- `tests/unit/lease.test.ts`
- `tests/governance/policy.test.ts`

## Rollback verification anchors
- final post-rollback route mode: `RULE_ONLY`
- final post-rollback route lane: `RULE_ONLY`
- cloud source absent after rollback
- audit verification result remains `VALID`
- route-trace summaries retain evidence of denial, attempt, execution, and rollback state transitions

## Save-path independence anchors
- export path remains CLI-only
- no ARC dependency introduced
- no Vault dependency introduced
- cloud failures continue to degrade to stricter existing behavior
