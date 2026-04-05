# U42 — Context Engineering Guard (S7 Mapping)

**Status:** DONE  
**Date:** 2026-04-05  
**Directive:** D-MNLM6RCX  
**Reference:** ARC-BLUEPRINT-SECURITY-001 §S7 (Context Engineering Guard)  

---

## S7 Intent

Control what context reaches models or external agent systems. Prevent data leakage, context poisoning, over-permission, policy loss during handoff, and hidden instruction propagation.

---

## Current Lintel Coverage (U10 Implementation)

### What U10 Delivered
| Mechanism | Scope | Coverage |
|-----------|-------|----------|
| `TaskContextPacket` interface | `src/contracts/types.ts:775-778` | Exactly 3 fields: `task_id`, `task_summary`, `task_status` — no code, diffs, or blueprint text |
| Local-model-only injection | `src/extension/saveOrchestrator.ts:469-496` | Task context injected into LOCAL model evaluation only; cloud routes receive context WITHOUT task fields |
| Explicit selection gate | `src/extension/activeTaskSelection.ts` | Context injected only after user-initiated `arc.selectTask` command — no passive/auto injection |
| Advisory-only posture | U11 governance safety tests | Task context produces zero causal effect on save authorization or audit chain |

### S7 Concept → U10 Mapping

| S7 Concept | U10 Implementation | Constraint Preserved |
|------------|-------------------|---------------------|
| Trusted vs untrusted context separation | Task context separated from evaluation context; only 3 bounded fields injected | ✅ No-content telemetry preserved |
| Bounded field injection | `TaskContextPacket` limited to `task_id`, `task_summary`, `task_status` | ✅ No code, diffs, file paths, or evaluation results |
| Local-only boundary | Cloud routes receive context without task fields (Warden C3) | ✅ Local-only enforced at code level |
| Explicit selection gate | `arc.selectTask` requires user QuickPick interaction (Warden C2) | ✅ No passive/auto injection |
| Policy-preserving handoff | Task context does not influence rule floor or save authorization (Warden C5) | ✅ Advisory metadata only |

### What Lintel Does NOT Do (S7 Gaps)
| Gap | Reason |
|-----|--------|
| Context sanitization / redaction | ARC XT does not sanitize or redact context before model evaluation |
| Provenance tagging | Task context has no provenance or trust-level metadata |
| Retrieval guard (S8) | No retrieval/RAG guard exists — S8 deferred until retrieval enters scope |

---

## Decision Per Component

| Component | Decision | Rationale |
|-----------|----------|-----------|
| Bounded 3-field context injection | **ADOPT-NOW** | Already implemented in U10 — `TaskContextPacket` is S7-compliant |
| Local-only injection boundary | **ADOPT-NOW** | Cloud route exclusion (Warden C3) enforces local-only |
| Explicit selection gate | **ADOPT-NOW** | User-initiated `arc.selectTask` command (Warden C2) |
| Advisory-only posture | **ADOPT-NOW** | U11 tests prove zero effect on save authorization (Warden C5) |
| Context sanitization/redaction | **DEFER** | Would require content analysis; exceeds current Stage 4 scope |
| Provenance tagging | **DEFER** | Future security feature — not in current audit trail |
| Retrieval guard (S8) | **OUT-OF-SCOPE** | S8 explicitly deferred until retrieval enters reviewed scope |

---

## Constraints Preserved

- ✅ **No-content telemetry preserved:** `TaskContextPacket` contains only metadata — no code, diffs, prompts, or content
- ✅ **Local-only boundary enforced:** Cloud routes explicitly exclude task context
- ✅ **Policy-preserving handoff:** Task context is advisory — does not influence save authorization or rule floor

---

**End of U42 Record**
