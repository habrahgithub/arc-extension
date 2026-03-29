# ARC Blueprint: ARC-DOC-002

**Directive ID:** ARC-DOC-002

> Status: OPENED

## Objective

Close the remaining trust-transparency and operator-documentation gaps identified by the external review by documenting what ARC XT logs and does not log, explaining `.arc/router.json` and `.arc/workspace-map.json` for operators, and adding a bounded team deployment guide for the internal-pilot posture.

## Scope

This directive covers documentation-only surfaces for `projects/lintel`:

- `README.md`
- `docs/TEAM_DEPLOYMENT.md` (new)
- `docs/TESTING.md`
- `docs/CODE_MAP.md`
- `docs/ARCHITECTURE.md` if cross-references are needed
- `src/extension/welcomeSurface.ts` only if a concise “what’s logged” clarification is required

Required documentation topics:

- audit-log field contents vs. non-retained data
- `ContextPayload.excerpt` usage boundary
- operator guidance for `.arc/router.json`
- operator guidance for `.arc/workspace-map.json`
- team deployment / rollout guidance for the current internal-pilot posture

## Constraints

- Must remain truthful and bounded to the current internal-pilot product state
- Must not imply ARC Console coupling, Vault dependency, public marketplace readiness, or cloud-lane approval
- Must explicitly state what audit entries retain and what they do not retain
- Must not expose secrets, local credentials, or internal-only sensitive values in examples
- Must not add new runtime behavior or new persistent data stores

## Acceptance Criteria

1. README and/or welcome docs explicitly state what audit logs contain and what they do not contain
2. `ContextPayload.excerpt` handling is explained truthfully: runtime evaluation aid only unless persisted elsewhere, and not part of `audit.jsonl`
3. Operators have a practical guide for `.arc/router.json` and `.arc/workspace-map.json`
4. `docs/TEAM_DEPLOYMENT.md` exists and is bounded to internal-pilot rollout guidance
5. Lint, typecheck, build, and test still pass if any tested docs/surfaces are touched
6. Evidence, ops log, and decision log are updated

## Rollback Note

If documentation wording introduces confusion or overclaim:

1. Revert the documentation slice only
2. Preserve current runtime and audit behavior unchanged
3. Re-open the doc package with corrected, narrower wording

## Phase Execution Package

### Phase 1 — data-retention truth map

- map current audit entry fields and the runtime-only `ContextPayload.excerpt` boundary

### Phase 2 — operator docs

- update README and operator-facing docs with “logged vs not logged” statements
- document `.arc/router.json` and `.arc/workspace-map.json` with examples

### Phase 3 — team rollout guide

- add `docs/TEAM_DEPLOYMENT.md` for internal-pilot rollout only

### Phase 4 — verification and closure

- verify wording truthfulness
- run lint/typecheck/build/test if any tested docs/surfaces are touched

## Execution Evidence

- Opened from the external-review incorporation audit on 2026-03-29
- Warden elevated the privacy/logging transparency gap due to the existence of `ContextPayload.excerpt`
- No runtime behavior changes are authorized by this directive opening

