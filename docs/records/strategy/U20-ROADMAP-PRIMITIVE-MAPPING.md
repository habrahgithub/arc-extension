# U20 — Roadmap Primitive Mapping

**Status:** DONE  
**Date:** 2026-04-05  
**Directive:** D-MNLP16UC  
**Reference:** `docs/records/strategy/ARC-BLUEPRINT-001-roadmap-reference.md`  

---

## Objective

Map roadmap concepts from the integrated ARC blueprint to existing Lintel primitives. This is a descriptive record only — no implementation claims, no runtime widening, no authority expansion.

---

## Roadmap Concept → Lintel Primitive Mapping

| Roadmap Concept | Lintel Primitive | Gap / Notes |
|-----------------|------------------|-------------|
| **Plan artifact** | `.arc/blueprints/*.md` | Blueprint IS the plan artifact. Contains directive ID, objective, scope, constraints, acceptance criteria, and rollback note. |
| **Execution token** | `.arc/leases.jsonl` entries | Decision lease system provides bounded execution approval. Reusable leases cache prior decisions for equivalent saves. |
| **Change ID** | Blueprint-linked save directive | Directive ID (`ARCXT-UX-002`, etc.) embedded in blueprint path and save flow. `REQUIRE_PLAN` saves require valid directive ID. |
| **Run board** | Task Board (`arc.selectTask`) | Advisory only — not an orchestrator. Task Board summarizes blueprint validation state; `arc.selectTask` enables bounded task selection for local model context. |
| **Inspect mode** | Rule-only evaluation (`RULE_ONLY`) | Current default posture. No model evaluation required — rule engine classifies files and determines risk. |
| **Act mode** | Plan-linked save (blueprint required) | `REQUIRE_PLAN` flow — save blocked until operator links a valid blueprint artifact with proof structure. |
| **Review mode** | Audit log + review surfaces | `ARC XT: Review Audit Log` command + review surfaces (Task Board, Runtime Status, Decision Feed, Audit Timeline). |
| **Approve** | Operator acknowledgment (WARN) / blueprint validation (REQUIRE_PLAN) | No separate approval API — operator acknowledgment is implicit in WARN saves; blueprint proof validation gates REQUIRE_PLAN saves. |
| **Verify** | Hash-chain integrity verification | `auditLog.verifyChain()` validates audit trail integrity; blueprint proof validation checks required sections. |
| **Log** | `.arc/audit.jsonl` | Append-only, hash-chained audit log records every save decision with timestamp, file path, risk level, and decision. |

---

## Constraint Verification

- ✅ **Descriptive only:** No implementation claims or runtime widening
- ✅ **No authority expansion:** All mappings reference existing Lintel behavior
- ✅ **Local-only:** No cloud or backend concepts introduced

---

## Gap Summary

The roadmap's core concepts (plan, execute, approve, verify, log) are fully represented in current Lintel primitives. The primary gap is **naming** — Lintel uses implementation-specific terminology (`blueprint`, `lease`, `REQUIRE_PLAN`) rather than the roadmap's abstract terminology (`plan artifact`, `execution token`, `act mode`). This is acceptable — the behavior is equivalent, and the naming difference reflects Lintel's local-first, non-authorizing posture.

---

**End of U20 Record**
