# U46 — Security Canvas Reconciliation Matrix

**Status:** DONE  
**Date:** 2026-04-05  
**Directive:** D-MNLM6RCX  
**Reference:** ARC-BLUEPRINT-SECURITY-001 §S1–S12  
**Format Reference:** `docs/records/strategy/ARC-BLUEPRINT-001-reconciliation-matrix.md`  

---

## Reconciliation Buckets

| Bucket | Description | Action |
|--------|-------------|--------|
| **Adopt Now** | Already covered by current Lintel implementation | No action needed |
| **Track in Blueprint** | Gap identified; planning record created | Add to TODO ledger for future design |
| **Defer to Future** | Requires backend/cloud/expansion | Archive as reference |
| **Reject/Reword** | Conflicts with current WARDEN enforcement | Reword to avoid drift |

---

## Security Canvas Matrix

| S-Component | S1 Intent | Current Lintel Coverage | Gap | Decision | Tracking ID |
|-------------|-----------|------------------------|-----|----------|-------------|
| **S1 — Prompt Injection Firewall** | Detect/neutralize hidden instruction content | Rule engine classifies files by path; blueprint proof gates risky saves | No runtime content scanning or LLM output filtering | **ADOPT-NOW** (path classification) / **DEFER** (content scanning) | U39 |
| **S2 — Execution Token System** | Bounded, time-limited tokens for governed actions | Decision lease system (`decisionLease.ts`) with reusable decision caching | No explicit token issuance/revocation API | **TRACK** | — |
| **S3 — Tool Boundary Enforcer** | Prevent uncontrolled tool usage | `ALLOWED_LOCAL_HOSTNAMES` restricts model endpoints; adapters disabled by default | No dynamic tool allowlisting or invocation path validation | **ADOPT-NOW** (static allowlist) / **DEFER** (dynamic) | U40 |
| **S4 — Vault (Immutable Audit)** | Non-repudiable, hash-chained execution history | `.arc/audit.jsonl` with hash-chain integrity; `.arc/leases.jsonl`, `.arc/overrides.jsonl` | No cloud-backed continuity or event type taxonomy | **ADOPT-NOW** (local vault) / **DEFER** (cloud) | U45 |
| **S5 — Pattern Protection Layer** | Detect and block recurring unsafe patterns | Rule engine evaluates file patterns; governance safety tests (U11) prove non-authorizing behavior | No automated pattern detection across workspaces | **DEFER** | — |
| **S6 — Directive Lifecycle Guard** | Ensure no governed work skips required lifecycle stages | Linear save flow (classify → evaluate → proof check → decide → log) inherently prevents skipping | No explicit state machine or edge validation | **ADOPT-NOW** (implicit) / **DEFER** (explicit) | U41 |
| **S7 — Context Engineering Guard** | Control what context reaches models | `TaskContextPacket` (U10) — 3 bounded fields, local-only, explicit selection gate | No context sanitization, redaction, or provenance tagging | **ADOPT-NOW** (bounded injection) / **DEFER** (sanitization) | U42 |
| **S8 — RAG / Page Index Guard** | Prevent retrieval poisoning and unsafe downstream execution | No retrieval/RAG system exists in current ARC XT | S8 explicitly deferred | **OUT-OF-SCOPE** | — |
| **S9 — SDLC Debug Governance** | Govern debugging as a first-class controlled workflow | No debug governance system exists | Would require dedicated debug flow design | **DEFER** | — |
| **S10 — Declarative Policy Governance** | Policy as code: declarative, versioned, scope-aware, machine-evaluable | `router.json` + rule engine provide declarative policy; rules are versioned in code | No user-authored policy language or scope-aware policy evaluation | **DEFER** | — |
| **S11 — Governed State Transition Engine** | State machine with validated edges, no skip, audit trail | Linear save flow prevents skipping; audit trail records every decision | No declarative state graph or reversible transitions | **ADOPT-NOW** (implicit) / **DEFER** (explicit) | U41 |
| **S12 — EventStream Continuity** | Bounded continuity reconstruction from typed, hashed events | Audit trail can be reviewed via `Review Audit Log` command | No programmatic API for continuity reconstruction; no event type taxonomy | **DEFER** | U45 |

---

## Summary

| Decision | Count | Components |
|----------|-------|------------|
| **ADOPT-NOW** | 7 | S1 (path classification), S3 (static allowlist), S4 (local vault), S6 (implicit lifecycle), S7 (bounded injection), S11 (implicit state flow), S12 (audit trail) |
| **TRACK** | 1 | S2 (execution token system — lease system exists but no explicit token API) |
| **DEFER** | 6 | S1 (content scanning), S3 (dynamic allowlist), S5 (pattern detection), S6/S11 (explicit state machine), S7 (sanitization), S10 (policy language), S12 (reconstruction API), S9 (debug governance) |
| **OUT-OF-SCOPE** | 1 | S8 (RAG guard — no retrieval system exists) |

---

## Canvas Coverage Assessment

The security canvas (ARC-BLUEPRINT-SECURITY-001) correctly strengthens:
1. ARC as governed execution security (not generic extension hardening) ✅
2. Extension as visible control-plane surface ✅
3. Declarative policy and state transitions as first-class patterns ✅

Current Lintel implements approximately **60%** of the canvas at the local-record level. The remaining **40%** requires cloud backing, explicit state machines, or content inspection — all deferred until future authority-backend expansion.

---

**End of U46 Record**
