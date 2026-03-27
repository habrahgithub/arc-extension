# ARC Phase 2 Evidence Summary

## Implementation summary
- Added a save lifecycle controller to track committed snapshots, pending reverts, and restore suppression
- Added reduced-guarantee auto-save handling and post-save revert behavior
- Added tamper-evident audit entries with `prev_hash` / `hash` and rotation continuity
- Added a local Ollama adapter path with timeout / parse-failure handling while keeping activation disabled by default
- Added a 10-case model conformance pack and expanded integration/e2e/governance coverage

## Command results
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test:unit` ✅
- `npm run test:integration` ✅
- `npm run test:e2e` ✅
- `npm run test:governance` ✅
- `npm run build` ✅

## Acceptance coverage
- reduced-guarantee auto-save modes recognized
- denied auto-save paths marked for revert and restored to prior snapshot
- `BLOCK` decisions remain `lease_status: BYPASSED`
- audit entries include integrity fields and verify across rotation
- local-model failures fall back without weakening the rule floor
- local-model path remains disabled by default
- `.arc/.gitignore` keeps runtime audit artifacts excluded by design

## Rollback note
Phase 2 rollback remains isolated to the nested ARC repo at `projects/lintel`. No shared platform runtime or external service dependency was introduced.

## Open findings / intentional deferrals
- blueprint-backed `REQUIRE_PLAN` proof remains deferred to Phase 3
- workspace mapping and review surfaces remain deferred to Phase 4
- local-model activation remains disabled pending later approval
- dashboards, MCP, cloud routing, and public release work remain out of scope

## Required next reviews
- Sentinel review required before Phase 2 closure
- Warden review required before any Phase 3 consideration
