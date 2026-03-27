# ARC Phase 6.1 Evidence Summary

## Scope executed
- Lease v2 exact-governed-state fingerprinting
- route-policy hash and route-signature invalidation
- proof-linked and mapping-linked lease invalidation hardening
- documentation updates clarifying invalidation-only use of route state
- validation expansion for lease reuse and invalidation semantics

## Validation summary
- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run test:governance`
- `npm run build`

## Rollback note
- Phase 6.1 remains isolated to the nested `projects/lintel` repo.
- Rollback removes Lease v2 expansion and restores the prior lease behavior.
- Any lease records whose semantics changed under Phase 6.1 must be invalidated on rollback.
- No local or cloud inference lane is activated by this package.

## Open findings / deferrals
- local-model activation remains disabled and out of scope
- cloud routing remains disabled and out of scope
- `CLOUD_ELIGIBLE`, `GOVERNED_CHANGE`, `LOCAL_PREFERRED`, and `CLOUD_ASSISTED` remain inert until separately Warden-gated

## Review outcome
- Sentinel review: PASS
- Warden review: PASS
- WRD-6101: discharged for Phase 6.1 closure

## Next-phase gate note
- before Forge exercises `CLOUD_ELIGIBLE`, `GOVERNED_CHANGE`, `LOCAL_PREFERRED`, or `CLOUD_ASSISTED` in any non-default code path, a Warden gate is required and must be stated in the next authorizing package
