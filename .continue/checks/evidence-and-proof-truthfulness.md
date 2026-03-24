---
name: Evidence and Proof Truthfulness
description: Ensure audit/proof/review outputs reflect real local artifacts and never infer authority from placeholders.
---

# Evidence and Proof Truthfulness

## Context

Lintel positions audit/proof outputs as evidence surfaces, not authority surfaces. Blueprint proofs and audit visibility must report actual local artifact state. Placeholder, inferred, or optimistic proof messaging can create false confidence and governance drift even when tests pass.

## What to Check

### 1. Proof states are artifact-backed, not inferred

When `REQUIRE_PLAN` or blueprint logic is touched, verify proof-valid states are tied to concrete local artifacts (`.arc/blueprints/<directive_id>.md`) and explicit validation outcomes.

Bad pattern:

- "proof complete" based only on directive ID presence
- fallback text implying proof success without artifact validation

### 2. Audit summaries distinguish raw vs derived vs partial

Audit/review/export paths should clearly separate:

- raw evidence lines,
- derived summaries,
- partial/malformed conditions.

Bad pattern:

- malformed lines silently dropped without partial-warning semantics
- derived summary presented as canonical fact

### 3. Advisory outputs never demote recorded decisions

False-positive review and audit visibility remain advisory/read-only. Flag wording or code that mutates enforcement history or reclassifies prior decisions through review tooling.

## Key Files

- `src/core/blueprintArtifacts.ts`
- `src/core/auditLog.ts`
- `src/core/auditVisibility.ts`
- `src/extension/reviewSurfaces.ts`
- `src/cli.ts`
- `docs/PHASE-7.10-UAT-SCENARIOS.md`
- `docs/PHASE-7.10-ROLLBACK-DRILL.md`
- `tests/unit/blueprintArtifacts.test.ts`
- `tests/unit/auditVisibility.test.ts`

## Exclusions

- Formatting-only changes to exported JSON/CLI tables with preserved semantics.
- Non-authoritative examples in documentation clearly marked as illustrative.
