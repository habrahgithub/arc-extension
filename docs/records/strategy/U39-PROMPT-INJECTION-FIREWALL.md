# U39 — Prompt Injection Firewall (S1 Mapping)

**Status:** DONE  
**Date:** 2026-04-05  
**Directive:** D-MNLM6RCX  
**Reference:** ARC-BLUEPRINT-SECURITY-001 §S1 (Prompt Injection Firewall)  

---

## S1 Intent

Detect and neutralize malicious, hidden, or instruction-overriding content before it can influence governed execution.

---

## Current Lintel Coverage

### What Lintel Already Does
| Mechanism | Scope | Coverage |
|-----------|-------|----------|
| Rule engine file classification | `src/auth/`, `src/config/`, infrastructure paths | Files in governed paths are classified as risk-bearing before save |
| Blueprint proof requirement | `REQUIRE_PLAN` files | Files cannot be saved in governed paths without linked blueprint artifact containing proof |
| Fail-closed default | Missing/invalid config | Defaults to strictest safe posture |

### What Lintel Does NOT Do
| Gap | Reason |
|-----|--------|
| Runtime prompt scanning | ARC XT is not a content inspector; it classifies files, not prompts |
| LLM output filtering | ARC XT does not intercept model outputs |
| Content inspection | Save interception is path/rule-based, not content-semantics-based |

---

## Decision Per Component

| Component | Decision | Rationale |
|-----------|----------|-----------|
| File path risk classification | **ADOPT-NOW** | Already implemented — rule engine classifies files by path pattern before save |
| Blueprint proof gating for risky saves | **ADOPT-NOW** | Already implemented — `REQUIRE_PLAN` decisions require linked blueprint |
| Runtime prompt content scanning | **OUT-OF-SCOPE** | Must not become a runtime filter engine; control-plane boundary only |
| LLM output sanitization | **DEFER** | Future security-control-plane feature; exceeds current Stage 4 scope |
| Hidden instruction detection in file content | **DEFER** | Would require content-semantics analysis; not currently in scope |

---

## Constraints Preserved

- ✅ **Not a runtime filter engine:** ARC XT classifies files by path/rule, not by scanning content for injection patterns
- ✅ **Control-plane boundary only:** The extension acts as a governance gate at save time, not as a content inspection layer
- ✅ **No prompt interception:** ARC XT does not intercept, scan, or filter prompts sent to LLMs

---

**End of U39 Record**
