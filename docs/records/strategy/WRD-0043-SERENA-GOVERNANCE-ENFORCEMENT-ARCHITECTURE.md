# WRD-0043 — Serena Governance Enforcement Architecture

**Status:** ARCHITECTURE SCOPING ONLY  
**Date:** 2026-04-05  
**Authority:** Axis Authorization (2026-04-05)  
**Risk Classification:** HIGH  

---

## 1. Objective
Define the architecture and scoping for Serena-based governance enforcement of ARC XT, including wrapper vs native-hook vs hybrid integration paths, trust boundaries, and Warden live-test criteria. **This is architecture only — no implementation or runtime code changes are included.**

---

## 2. Option Matrix: Wrapper vs Native-Hook vs Hybrid

| Criterion | Wrapper (External Process) | Native-Hook (Extension Integration) | Hybrid (Bridge Process + Extension IPC) |
|-----------|---------------------------|-----------------------------------|----------------------------------------|
| **Trust Boundary** | High (isolated process) | Medium (same extension host) | High (IPC boundary enforced) |
| **Fail-Closed Behavior** | Serena crash → ARC falls back to local-only enforcement | Serena crash → ARC extension may be destabilized | IPC timeout → ARC falls back to local-only |
| **Installation Complexity** | Low (separate binary/service) | High (requires extension rebuild) | Medium (requires IPC setup) |
| **Rollback Safety** | High (stop process, keep ARC) | Low (requires extension downgrade) | High (disable bridge, keep ARC) |
| **Warden Live-Test Feasibility** | High (can test isolation directly) | Medium (requires extension reload) | High (can test IPC failure modes) |
| **Risk of Duplicate Processes** | High (needs process lifecycle management) | None | Medium (needs IPC lifecycle management) |
| **Recommended for Stage 4** | ✅ **Yes** (safest, most reversible) | ❌ No (too invasive for current stage) | ⚠️ Consider for Stage 5+ |

**Axis Recommendation:** Proceed with **Wrapper (External Process)** for initial governance enforcement. It provides the strongest isolation, clearest rollback path, and most deterministic Warden live-test conditions.

---

## 3. Trust Boundary & Fail-Closed Behavior

### 3.1 Trust Model
- **ARC XT Extension:** Local enforcement authority (trusted for local decisions)
- **Serena Wrapper:** Governance validation layer (trusted for policy evaluation, untrusted for code execution)
- **Trust Boundary:** Serena must never mutate ARC XT's local policy, audit log, or runtime state. Serena is advisory-only until explicitly authorized by Warden.

### 3.2 Fail-Closed Requirements
| Failure Mode | Required Behavior | Verification Method |
|--------------|-------------------|---------------------|
| Serena process crash | ARC XT continues local-only enforcement | Warden live-test: kill Serena, verify ARC still blocks saves |
| IPC timeout (hybrid) | ARC XT falls back to local-only | Warden live-test: block IPC port, verify ARC still functions |
| Serena policy error | ARC XT ignores erroneous policy, uses local cache | Warden live-test: inject invalid policy, verify ARC rejects it |
| Serena duplicate process | Second instance rejected or ignored | Warden live-test: launch second Serena, verify first remains authoritative |

---

## 4. Install / Activation / Rollback Story

### 4.1 Installation (Wrapper Path)
1. Serena binary/service installed to `~/.arc/serena/` (user-local, not system-wide)
2. ARC XT extension detects Serena presence via socket/health-check at startup
3. If Serena is present and healthy, ARC XT enables optional governance bridge
4. **Default:** Bridge is **disabled** until operator explicitly enables it

### 4.2 Activation
1. Operator runs `arc serena enable` (local CLI command)
2. ARC XT verifies Serena health endpoint
3. ARC XT logs activation event to local audit trail
4. **No mutation of `mcp.json` or runtime registry**

### 4.3 Rollback
1. Operator runs `arc serena disable`
2. ARC XT stops sending governance queries to Serena
3. Serena process remains installed but inactive
4. ARC XT falls back to local-only enforcement (verified by Warden live-test)

---

## 5. Warden Live-Test Plan & Pass/Fail Criteria

### 5.1 Test Environment
- ARC XT: `4e9d7a8` (clean local build)
- Serena: Wrapper process (architecture defined, not yet implemented)
- Test workspace: Isolated temp directory with governed files

### 5.2 Pass/Fail Criteria

| Test | Expected Behavior | Pass Condition | Fail Condition |
|------|-------------------|----------------|----------------|
| **T1: Local Enforcement Isolation** | ARC XT enforces locally without Serena | All WARN/BLOCK events trigger correctly | ARC XT fails to enforce without Serena |
| **T2: Serena Crash Recovery** | ARC XT continues enforcement after Serena crash | ARC XT falls back to local-only within 5s | ARC XT hangs or loses enforcement state |
| **T3: Invalid Policy Rejection** | ARC XT rejects malformed Serena policy | Audit log shows policy rejection event | ARC XT applies invalid policy |
| **T4: Duplicate Process Detection** | Second Serena instance is rejected or ignored | Only first instance remains authoritative | Both instances attempt governance |
| **T5: Rollback Cleanliness** | `arc serena disable` fully removes Serena influence | ARC XT behaves identically to pre-Serena state | Residual Serena queries or state remain |

### 5.3 Warden Sign-Off
Warden must independently verify all 5 tests pass before any Serena runtime code is authorized for broader rollout. **This architecture package does not authorize implementation.**

---

## 6. Explicit Deferrals

The following items are **explicitly blocked** and remain out of scope for this architecture package:

| Item | Status | Reason |
|------|--------|--------|
| **WRD-0042** (Runtime registry → HIGH-risk) | ❌ **BLOCKED** | Requires separate Axis/Warden authorization before any generated `mcp.json` path |
| **WRD-0044** (M2 governance code changes) | ❌ **BLOCKED** | M2 changes remain uncommitted and cannot be cited as runtime evidence until committed cleanly |
| **MCP Duplicate-Process Cleanup** | ❌ **BLOCKED** | Pending explicit Axis authorization; not executed in this package |
| **Serena Runtime Code Implementation** | ❌ **BLOCKED** | This is architecture-only; implementation requires separate Axis review after Warden live-test |
| **Generated `mcp.json` Path** | ❌ **BLOCKED** | Hard constraint: no auto-generation or mutation of `mcp.json` in this slice |

---

## 7. Next Steps (Post-Architecture Approval)

1. Axis reviews and approves this architecture package.
2. Warden defines exact test environment and executes live-test plan.
3. If all 5 tests pass, Axis authorizes **WRD-0043 implementation slice** (bounded wrapper implementation only).
4. Implementation slice must include:
   - Serena wrapper binary/service (isolated process)
   - ARC XT health-check integration (no policy mutation)
   - Rollback CLI commands (`arc serena enable/disable`)
   - No `mcp.json` mutation, no runtime-registry changes.

---

**End of WRD-0043 Architecture Package**
