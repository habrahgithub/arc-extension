# ARC XT Records Canon

**Status:** ACTIVE  
**Last Reviewed:** 2026-04-04  
**Purpose:** Keep retained records organized by role so active proof, evidence, strategy references, reviews, and research do not drift into one undifferentiated document pile.

---

## Canon Structure

### `directives/`
Operational records tied to an active governed directive.

Current records:
- `directives/ARCXT-UX-002-TODO-LEDGER.md`

### `evidence/`
Evidence packs, gate records, and review-readiness support artifacts.

Current records:
- `evidence/ARCXT-STAGE3-EVIDENCE-FLOW.md`
- `evidence/U17-STAGE3-SOAK-EVIDENCE-PACK.md`

### `strategy/`
Retained architecture references, reconciliation matrices, and future-planning records.  
These records are **not live authority** unless separately promoted through blueprint/governance review.

Current records:
- `strategy/ARC-BLUEPRINT-001-roadmap-reference.md`
- `strategy/ARC-BLUEPRINT-001-reconciliation-matrix.md`
- `strategy/ARC-BLUEPRINT-SECURITY-001-reference.md`
- `strategy/ARC-SYS-COHERENCE-001.md`

### `reviews/`
Axis/Sentinel/Warden review outputs that interpret research or strategy into bounded canon.

Current records:
- `reviews/ARC-DEEP-RESEARCH-AXIS-REVIEW.md`

### `research/`
Source research artifacts retained for traceability.  
These are source inputs, not governing directives.

Current records:
- `research/ARC-market-feasibility-deep-research-2026-04-04.md`

---

## Active Canon Chain

For current ARC XT work, read in this order:

1. Active blueprint: `.arc/blueprints/ARCXT-UX-002.md`
2. Maintained ledger: `docs/records/directives/ARCXT-UX-002-TODO-LEDGER.md`
3. Evidence flow: `docs/records/evidence/ARCXT-STAGE3-EVIDENCE-FLOW.md`
4. Release posture: `docs/RELEASE-READINESS.md`
5. Hardening status: `HARDENING-BACKLOG.md`

Reference-only planning records then follow under:
- `docs/records/strategy/`
- `docs/records/reviews/`
- `docs/records/research/`

---

## Naming / Placement Rules

1. **Directive-bound operational backlog** goes under `directives/`.
2. **Evidence and gate packs** go under `evidence/`.
3. **Reference architecture / future-state material** goes under `strategy/`.
4. **Interpretive governance reviews** go under `reviews/`.
5. **Source market/security/user research** goes under `research/`.
6. Reference records must say whether they are:
   - active authority
   - planning input
   - retained reference only
7. A source research file must not be mistaken for a live blueprint.

---

## Retained Historical Records

These older records remain at `docs/records/` root until a dedicated migration package moves them without breaking references:

- `LINTEL-BUILD-AUDIT-001.md`
- `PHASE0_EXECUTIVE_SUMMARY.md`
- `PHASE0_PROGRESS_ASSESSMENT.md`
- `SWD_EXECUTION_LOG.md`

They are historical records, not part of the active ARCXT-UX-002 execution chain.
