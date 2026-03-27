# ARC Phase 7.0 Evidence Summary

## Scope implemented
- truthful workspace-target resolution for nested projects inside a larger VS Code workspace
- observational runtime status command for active workspace/audit targeting
- validated internal VSIX-based install guidance
- deterministic local smoke harness for repeatable non-cloud operator validation
- docs alignment for workspace targeting and operator clarity

## Key files
- `src/extension.ts`
- `src/extension/workspaceTargeting.ts`
- `src/extension/runtimeStatus.ts`
- `scripts/smoke_harness.js`
- `tests/unit/workspaceTargeting.test.ts`
- `tests/unit/runtimeStatus.test.ts`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/TESTING.md`

## Validation targets
- workspace-target selection prefers nearest nested boundary when present
- runtime status output reports effective governed root and route posture
- smoke harness emits deterministic local-only summary
- no cloud-lane activation introduced
- export locality unchanged

## Command gates
- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm run test:unit` — PASS
- `npm run test:integration` — PASS
- `npm run test:e2e` — PASS
- `npm run test:governance` — PASS
- `npm run build` — PASS
- `npm run smoke:harness` — PASS

## Validation notes
- unit coverage now includes workspace-target resolution and runtime-status rendering
- integration/e2e/governance suites passed unchanged, indicating no route-floor drift
- smoke harness emitted deterministic local-only `ALLOW` and `REQUIRE_PLAN` outcomes with `VALID` audit verification
