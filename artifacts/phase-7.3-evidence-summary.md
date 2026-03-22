# Phase 7.3 — Extension Identity and Manifest Rebrand

## Execution note
- local Forge worker was retried for this phase and again stalled after `FILES_SCANNED`
- retained local-worker evidence remains under `artifacts/phase-7.3-local-worker/`
- Phase 7.3 implementation therefore proceeded through the main governed path

## Scope executed
- froze the extension display identity to `ARC — Audit Ready Core`
- aligned existing command titles to `ARC:` while preserving internal command ids as `lintel.*`
- aligned canonical README / ARCHITECTURE / TESTING docs to the identity-freeze contract
- added governance-test anchoring so branding changes cannot silently migrate command ids or imply ARC Console / Vault coupling

## Files changed
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/TESTING.md`
- `tests/governance/policy.test.ts`

## Identity mode
- **bounded transition naming**
- user-facing extension identity is now `ARC — Audit Ready Core`
- package name remains `lintel`
- command ids remain `lintel.*`
- command titles now use the `ARC:` prefix

## Trust-boundary statement
- no command ids changed
- no save, route, proof, fallback, or review authority changed
- no cloud behavior was activated or implied
- no ARC Console coupling, Vault dependency, or control-plane authority was introduced
- no welcome screen, onboarding flow, or new UI surface was introduced

## Validation gates
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test:unit` ✅
- `npm run test:integration` ✅
- `npm run test:e2e` ✅
- `npm run test:governance` ✅
- `npm run build` ✅

## Carry-forward
- `WRD-0066` handled by explicit compatibility wording that ARC naming identifies the VS Code extension only
- `OBS-S-7008` preserved by keeping `lintel.*` command ids unchanged
- local-worker reliability hardening deferred to `agents/axis/App Idea Blueprints/SWD_local_forge_worker_reliability_project_plan.md`
