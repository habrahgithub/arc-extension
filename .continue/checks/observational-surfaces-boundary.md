---
name: Observational Surfaces Boundary
description: Ensure runtime and review surfaces remain descriptive only and never imply authorization or readiness.
---

# Observational Surfaces Boundary

## Context

ARC/Lintel has strict governance boundaries where status and review commands are informational only. The codebase repeatedly states that runtime status, review surfaces, and cloud fields must not imply authorization, approval, or readiness. This check catches wording or behavior drift that can silently change operator interpretation.

## What to Check

### 1. No authoritative language in observational surfaces

Review command output, markdown/help text, and status labels in runtime/review surfaces. Flag wording that implies approval or release authority.

Good patterns in this repo:

- "observational only"
- "descriptive only"
- "does not imply readiness/approval/authorization"

Bad patterns:

- "approved", "certified", "production ready", "safe to release"
- "cloud ready" used as an operational gate or implicit authorization

### 2. Status commands do not change enforcement behavior

Check that runtime-status or review-surface code paths do not alter route decisions, rule outcomes, proof requirements, or save authorization.

Bad example:

- a runtime-status flag toggles route/lane behavior
- a review command mutates persisted policy/audit state

### 3. Cloud metadata is reporting-only

Cloud-related fields may be displayed, but must remain factual config/reporting values. Flag any change that treats displayed cloud fields as activation or permission.

## Key Files

- `README.md`
- `docs/ARCHITECTURE.md`
- `src/extension/runtimeStatus.ts`
- `src/extension/reviewSurfaces.ts`
- `src/extension.ts`
- `tests/unit/runtimeStatus.test.ts`
- `tests/unit/reviewSurfaces.test.ts`

## Exclusions

- Refactors that only rename symbols without changing operator-visible text or behavior.
- Test fixture text that intentionally includes forbidden wording as a negative case.
