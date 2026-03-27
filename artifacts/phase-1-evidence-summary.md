# ARC Phase 1 Evidence Summary

## Implementation summary
- Created a new governed Phase 1 repo at `projects/lintel`
- Implemented the VS Code extension scaffold and explicit-save orchestration path
- Added the Phase 1 classifier, rule engine, decision lease, local audit writer, and disabled model adapter
- Added controlled rule definitions and Phase 1 docs/checklists

## Command results
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test:unit` ✅
- `npm run test:integration` ✅
- `npm run test:e2e` ✅
- `npm run test:governance` ✅
- `npm run build` ✅

## Acceptance coverage
- low-risk file path => `ALLOW`
- auth path => `REQUIRE_PLAN`
- schema path => `WARN`
- auth + schema => `BLOCK`
- explicit-save integration path tested
- no cloud endpoint defined in Phase 1 adapter
- `.arc/.gitignore` excludes audit artifacts
- model adapter disabled by default

## Rollback note
Phase 1 rollback is isolated to the new nested repo at `projects/lintel`. No shared platform dependencies or workspace-global services were added.

## Open findings / intentional deferrals
- auto-save detection and revert safety net deferred to Phase 2
- audit hash chain and rotation deferred to Phase 2
- blueprint-backed `REQUIRE_PLAN` proof deferred to Phase 3
- local model runtime activation and conformance gating deferred to Phase 2

## Required next review
- Sentinel review required before Phase 2 authorization
