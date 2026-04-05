# U45 — Vault EventStream Continuity (S4/S12 Mapping)

**Status:** DONE  
**Date:** 2026-04-05  
**Directive:** D-MNLM6RCX  
**Reference:** ARC-BLUEPRINT-SECURITY-001 §S4 (Vault) + §S12 (EventStream Continuity Layer)  

---

## S4/S12 Intent

- **S4 (Vault):** Create non-repudiable execution history and governance evidence — append-only, hash-chained, typed events, replayable governance trail
- **S12 (EventStream Continuity):** Preserve bounded continuity across governed work without turning ARC into a general memory store — event emitted → typed and hashed → stored append-only → reconstructed into continuity context when needed

---

## Current Lintel Coverage

### What Lintel Already Does
| Mechanism | Scope | Coverage |
|-----------|-------|----------|
| Local audit log | `.arc/audit.jsonl` | Append-only, one JSON entry per save decision, includes decision, risk level, violated rules, timestamp |
| Hash-chain integrity | `auditLog.ts` | Each entry includes `prev_hash` and `hash` — chain integrity verifiable |
| Runtime artifacts | `.arc/leases.jsonl`, `.arc/overrides.jsonl` | Decision lease state and override records — local-only, append-only |
| Tamper detection | `auditLog.verifyChain()` | Chain verification returns false if any hash mismatch detected |

### Local-Record Posture (Current)
| Aspect | Current State | S4/S12 Equivalent |
|--------|--------------|-------------------|
| Storage | Local filesystem (`.arc/audit.jsonl`) | S4 Vault: local, append-only |
| Integrity | Hash-chained entries (`prev_hash` + `hash`) | S4: hash-chained, tamper-evident |
| Event types | Implicit in decision fields (decision, risk_level, source) | S12: typed events |
| Continuity | Operator can trace audit trail via `Review Audit Log` command | S12: bounded continuity reconstruction |
| Authority | Local-only — no cloud backing | S4: authority-backed continuity is future |

### What Lintel Does NOT Do (S4/S12 Gaps)
| Gap | Reason |
|-----|--------|
| Cloud-backed audit continuity | ARC XT has no cloud component — audit trail is local-only |
| Event type taxonomy | Events are not explicitly classified (e.g., `save_decision`, `override_used`) |
| Reconstruction API | No programmatic API for reconstructing continuity context from events |
| Cross-workshop continuity | Audit trail is scoped to single workspace — no federation |

---

## Decision Per Component

| Component | Decision | Rationale |
|-----------|----------|-----------|
| Local append-only audit log | **ADOPT-NOW** | Already implemented — `.arc/audit.jsonl` with hash-chained entries |
| Tamper-evident hash chain | **ADOPT-NOW** | Already implemented — `verifyChain()` validates integrity |
| Lease and override records | **ADOPT-NOW** | Already implemented — `.arc/leases.jsonl`, `.arc/overrides.jsonl` |
| Event type taxonomy | **DEFER** | Would require structured event classification; not currently needed |
| Cloud-backed continuity | **OUT-OF-SCOPE** | ARC XT is local-only; cloud continuity is a future authority-backend feature |
| Reconstruction API | **DEFER** | Audit trail is human-readable via Review Audit Log; programmatic API is future work |
| Cross-workspace federation | **OUT-OF-SCOPE** | Exceeds current Stage 4 scope |

---

## Constraints Preserved

- ✅ **Local-only:** No cloud continuity is claimed or implemented
- ✅ **Append-only:** Audit log entries are never modified or deleted
- ✅ **Tamper-evident:** Hash chain integrity is verifiable

---

**End of U45 Record**
