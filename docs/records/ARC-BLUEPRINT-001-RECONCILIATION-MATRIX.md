# ARC-BLUEPRINT-001 Reconciliation Matrix

**Date:** 2026-04-03
**Directive:** Axis Ruling — Reconcile Roadmap into Current Canon
**Scope:** No runtime changes. Docs-only package.

---

## Reconciliation Buckets

| Bucket | Description | Action |
|--------|-------------|--------|
| **Adopt Now** | Fits current Stage 4 local-only scope | Update active blueprint/ledger |
| **Track in Blueprint** | Requires future design work, but relevant to current UX | Add to TODO ledger |
| **Defer to Future** | Requires backend/cloud expansion | Archive as reference |
| **Reject/Reword** | Conflicts with current WARDEN enforcement | Reword to avoid drift |

---

## Reconciliation Matrix

| Roadmap Section | Bucket | Rationale | Tracking ID |
|----------------|--------|-----------|-------------|
| **1. Strategic Positioning (LOCKED)** | **Adopt Now** | Matches current ARC XT posture exactly | — |
| **2.1 Control Plane Purity** | **Adopt Now** | Already enforced (local-only, no model hosting) | — |
| **2.2 Execution Plane Separation** | **Adopt Now** | Ollama is worker; ARC governs it | — |
| **2.3 Artifact-Driven Execution** | **Adopt Now** | Current SOP: Plan → Approval → Act → Verify → Log | — |
| **2.4 Execution Mode Lock** | **Reject/Reword** | Current ARC XT has no explicit mode system | N/A |
| **4. Infrastructure Boundary (Vercel/Railway)** | **Defer to Future** | Exceeds WARDEN local-only envelope | **U28** |
| **5.1 Interaction Layer** | **Track in Blueprint** | Plan panel / Task panel match current UX work | **U24** |
| **7.1 Plan Artifact Engine** | **Track in Blueprint** | Needs path reconciliation (`.arc/plans/` vs `.arc/blueprints/`) | **U23** |
| **7.2 Execution Token System** | **Defer to Future** | Authority-layer feature, not in current rollout | **U28** |
| **7.3 Policy Enforcement Engine** | **Adopt Now** | Current rule engine + risk classifier matches | — |
| **7.4 Risk Classification Engine** | **Adopt Now** | Current risk flags + decision floor match | — |
| **7.5 Run Board** | **Track in Blueprint** | Current Task Board is lighter; Run Board is future | **U24** |
| **8. Threat Model** | **Track in Blueprint** | Essential security design, needs implementation mapping | **U21** |
| **9. Trust Boundary / Anti-Tamper** | **Track in Blueprint** | Integrity-state model needed for future hardening | **U22** |
| **10. Plan-as-Code** | **Track in Blueprint** | Path reconciliation needed (`.arc/plans/` vs `.arc/blueprints/`) | **U23** |
| **11. Guardian HUD / Event Model** | **Track in Blueprint** | Operationalization of event architecture | **U24** |
| **12. Save Intercept Safety** | **Track in Blueprint** | Emergency override needs governance review | **U26** |
| **13. Default Policy Pack v1** | **Track in Blueprint** | Protected surfaces mapping for future hardening | **U25** |
| **14. Lean / Anti-Bloat** | **Track in Blueprint** | Reconcile with current rule-first Lintel behavior | **U27** |

---

## New TODO Ledger Entries (U21–U28)

| ID | Status | Priority | Theme | Description |
|---|---|---:|---|---|
| U21 | LATER | High | Threat Model | Map roadmap threat model to implementation plan |
| U22 | LATER | High | Trust Boundary | Define integrity-state model for anti-tamper |
| U23 | LATER | High | Plan-as-Code | Reconcile `.arc/plans/` vs `.arc/blueprints/` paths |
| U24 | LATER | Medium | HUD / Events | Map Guardian HUD / event architecture to UX |
| U25 | LATER | Medium | Policy Pack v1 | Map protected surfaces to current rule engine |
| U26 | LATER | High | Override Governance | Review emergency "Save Anyway" vs fail-closed posture |
| U27 | LATER | Medium | Lean / Anti-Bloat | Reconcile adaptive governance with current rule-first behavior |
| U28 | LATER | Low | Authority Backend | Define Vercel/Railway boundary package for future expansion |

---

## Blueprint Updates

Updates to `.arc/blueprints/ARCXT-UX-002.md`:
- Added U21–U28 tracks under future planning section
- Clarified current scope vs future authority tracks
- Maintained WARDEN envelope boundary

---

## Decision Summary

**Adopt Now:** Strategic positioning, control-plane purity, execution separation, artifact-driven execution, policy/risk engines.

**Track in Blueprint:** Threat model, trust boundary, Plan-as-Code path reconciliation, HUD/event architecture, policy pack mapping, override governance, lean/anti-bloat.

**Defer to Future:** Vercel/Railway authority model, execution token system, backend expansion.

**Reject/Reword:** Execution Mode Lock (current ARC XT has no explicit mode system; this would require design work before adoption).

---

**End of Reconciliation Matrix**
