# U41 — Lifecycle State Transitions (S6/S11 Mapping)

**Status:** DONE  
**Date:** 2026-04-05  
**Directive:** D-MNLM6RCX  
**Reference:** ARC-BLUEPRINT-SECURITY-001 §S6 (Directive Lifecycle Guard) + §S11 (Governed State Transition Engine)  

---

## S6/S11 Intent

Ensure no governed work skips required lifecycle stages. A directive, task, or governed package may only move through approved state edges — no skip, no silent mutation of state.

---

## Current Lintel Coverage

### What Lintel Already Does
| Mechanism | Scope | Coverage |
|-----------|-------|----------|
| Save interception flow | `src/extension.ts` → `saveOrchestrator.ts` | `classification → rule evaluation → proof check → decision → audit log` |
| Decision enforcement | `decisionPolicy.ts` | `ALLOW / WARN / REQUIRE_PLAN / BLOCK` — each decision gates save differently |
| Blueprint proof gating | `blueprintArtifacts.ts` | `REQUIRE_PLAN` saves require linked blueprint with validated proof structure |
| Audit chain integrity | `auditLog.ts` | Every decision appended to hash-chained audit log — tamper-evident |
| Fail-closed proof model | `saveOrchestrator.ts` | Missing proof → BLOCK decision; invalid proof → BYPASSED lease status |

### What Lintel Does NOT Do
| Gap | Reason |
|-----|--------|
| Explicit state machine for directive lifecycle | Current implementation uses imperative flow, not declarative state transitions |
| State edge validation at runtime | Save flow is linear; no runtime state graph is enforced |
| Reversible state transitions | Audit log is append-only; no rollback or state reversal is recorded as a distinct event |

---

## S6/S11 Concept → Lintel Artifact Mapping

| Security Model Concept | Current Lintel Behavior | Artifact | Gap |
|------------------------|------------------------|----------|-----|
| Directive lifecycle stages (PLAN → APPROVED → TOKENIZED → EXECUTING → EXECUTED → VERIFIED → LOGGED) | Save flow: classification → rule evaluation → proof check → decision → audit log | `saveOrchestrator.ts`, `auditLog.ts` | Lintel does not expose a named state machine; stages are implicit in the save flow |
| State edge validation (no skip allowed) | `REQUIRE_PLAN` saves blocked without proof; WARN saves blocked without acknowledgment | `saveOrchestrator.ts` | Linear flow inherently prevents skipping, but no explicit edge validation |
| Failed state transitions logged | BLOCK decisions logged to audit trail | `auditLog.ts` | Failed saves are not separately logged — only successful decisions are appended |
| State mutation audit trail | Hash-chained audit log records every decision | `auditLog.ts` | ✅ Complete |

---

## Decision Per Component

| Component | Decision | Rationale |
|-----------|----------|-----------|
| Linear save flow as implicit state machine | **ADOPT-NOW** | Current flow (classify → evaluate → proof check → decide → log) implements S6 lifecycle implicitly |
| Decision enforcement gating | **ADOPT-NOW** | `ALLOW/WARN/REQUIRE_PLAN/BLOCK` maps directly to S11 state transitions |
| Audit chain as state mutation log | **ADOPT-NOW** | Hash-chained audit log records every save decision — equivalent to S6 logging requirement |
| Failed state transition logging | **DEFER** | BLOCK decisions are logged, but failed save attempts (before decision) are not recorded |
| Explicit state edge validation | **DEFER** | Linear flow prevents skipping, but no declarative state graph is enforced |
| Reversible state transitions | **OUT-OF-SCOPE** | Audit log is append-only by design; rollback is an operator procedure, not a recorded state transition |

---

## Constraints Preserved

- ✅ **Fail-closed proof model preserved:** `REQUIRE_PLAN` saves require linked blueprint; missing proof → BLOCK
- ✅ **No silent state mutation:** Every decision is logged to hash-chained audit trail
- ✅ **No skip allowed:** Save flow is linear — classification must precede evaluation, which must precede proof check

---

**End of U41 Record**
