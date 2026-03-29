# ARC Blueprint: ARC-ADAPT-001

**Directive ID:** ARC-ADAPT-001

> Status: CLOSED — 2026-03-29

## Execution Evidence

- `src/adapters/modelAdapter.ts` — Backoff/jitter (500ms/200ms), warmup ping, sleep helper
- `tests/unit/modelAdapter.test.ts` — Updated for warmup ping (2 fetch calls)
- New env vars: `OLLAMA_BACKOFF_MS`, `OLLAMA_JITTER_MS`
- Local-only boundary enforced (ALLOWED_LOCAL_HOSTNAMES check)
- Verification: lint ✅ typecheck ✅ build ✅ test ✅ (352 passing)
- WARDEN REVIEW: PASS — local-only, no cloud-lane widening

## Objective

Harden the local Ollama adapter path by adding bounded retry backoff/jitter and local-only readiness signaling without weakening fail-closed behavior or widening cloud-lane authority.

## Scope

This directive covers local adapter/runtime resilience only:

- `src/adapters/modelAdapter.ts`
- `src/extension.ts`
- `src/extension/runtimeStatus.ts`
- related unit/integration/governance tests
- supporting docs only as needed for truthful operator wording

Potential sub-scope:

- immediate retry loop replacement with bounded backoff/jitter
- optional local-only warmup ping on activation
- optional local-only readiness indicator for diagnostic surfaces

## Constraints

- Must remain local-only; no new remote services, endpoints, or cloud-lane behavior
- Must preserve fail-closed fallback to the rule floor
- Must not auto-authorize, auto-retry indefinitely, or introduce background decisioning
- Warmup/readiness behavior must be bounded, descriptive, and non-authorizing
- Any heartbeat/polling behavior must be explicitly justified, rate-bounded, and Warden-reviewed before merge
- Warden review is required before merge

## Acceptance Criteria

1. Retry behavior includes bounded delay/backoff (and jitter if used) rather than immediate tight-loop retry
2. Fail-closed fallback behavior remains unchanged and covered by tests
3. Any warmup/readiness behavior is local-only, optional, and truthfully surfaced
4. No cloud readiness or authority expansion is introduced
5. Lint, typecheck, build, and test pass
6. Warden signs off before merge

## Rollback Note

If adapter hardening creates instability:

1. Revert the hardening slice only
2. Restore the prior fail-closed adapter behavior
3. Preserve audit/evidence of the attempted hardening for follow-up review

## Phase Execution Package

### Phase 1 — adapter inventory

- confirm current retry loop, timeout boundaries, and fallback behavior

### Phase 2 — bounded backoff/jitter

- replace immediate retry with bounded local backoff

### Phase 3 — local readiness support

- add a bounded warmup/readiness signal if justified
- explicitly keep it local-only and non-authorizing

### Phase 4 — Warden gate and verification

- add/update tests for retry exhaustion and fallback
- run lint, typecheck, build, and test
- obtain Warden review before merge

## Execution Evidence

- Opened from the external-review incorporation audit on 2026-03-29
- Sentinel confirmed current retries are immediate and warmup/readiness support is absent
- Warden requires merge-gate review for any local readiness or heartbeat behavior
