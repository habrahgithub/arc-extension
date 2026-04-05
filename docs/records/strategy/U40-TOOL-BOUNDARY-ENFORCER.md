# U40 — Tool Boundary Enforcer (S3 Mapping)

**Status:** DONE  
**Date:** 2026-04-05  
**Directive:** D-MNLM6RCX  
**Reference:** ARC-BLUEPRINT-SECURITY-001 §S3 (Tool Boundary Enforcer)  

---

## S3 Intent

Prevent uncontrolled or out-of-scope tool usage by validating tool invocation paths, enforcing allowlists, and restricting execution scope.

---

## Current Lintel Coverage

### What Lintel Already Does
| Mechanism | Scope | Coverage |
|-----------|-------|----------|
| Model adapter allowlist | `modelAdapter.ts` | `ALLOWED_LOCAL_HOSTNAMES = ['127.0.0.1', 'localhost', '::1']` — only local Ollama endpoints permitted |
| Disabled-by-default posture | All model adapters | `enabledByDefault = false` — no model evaluation unless explicitly configured |
| Router configuration | `router.json` | Operator-configured route policy determines whether local/cloud lanes are active |
| Route policy enforcement | `routerPolicy.ts` | Policy is loaded and validated at runtime; invalid config fails closed to `RULE_ONLY` |

### What Lintel Does NOT Do
| Gap | Reason |
|-----|--------|
| Tool invocation path validation | ARC XT does not validate which tools are invoked, only which files are saved |
| Execution scope restrictions beyond file paths | Scope is limited to save-time governance, not tool execution |
| Dynamic allowlist management | Allowlists are static in code or configured in `router.json` |

---

## Decision Per Component

| Component | Decision | Rationale |
|-----------|----------|-----------|
| Local hostname allowlist | **ADOPT-NOW** | Already implemented — `ALLOWED_LOCAL_HOSTNAMES` restricts model endpoints |
| Disabled-by-default model adapters | **ADOPT-NOW** | Already implemented — all adapters default to `enabledByDefault = false` |
| Route policy validation | **ADOPT-NOW** | Already implemented — `routerPolicy.ts` validates config and fails closed |
| Dynamic tool allowlisting | **DEFER** | Would require runtime tool registry; exceeds current Stage 4 scope |
| Execution scope validation | **OUT-OF-SCOPE** | ARC XT governs file saves, not tool invocation paths |

---

## Constraints Preserved

- ✅ **Validation only:** ARC XT validates model endpoint configuration; does not execute or authorize tool calls
- ✅ **No execution authority:** The extension is a governance gate, not a tool orchestrator
- ✅ **Local-only boundary:** `ALLOWED_LOCAL_HOSTNAMES` prevents any external model endpoint access

---

**End of U40 Record**
