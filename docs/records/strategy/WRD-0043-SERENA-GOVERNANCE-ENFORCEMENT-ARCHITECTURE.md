# WRD-0043 — Serena Governance Enforcement Architecture

**Status:** ARCHITECTURE SCOPING ONLY  
**Date:** 2026-04-05  
**Authority:** Axis Authorization (2026-04-05)  
**Risk Classification:** HIGH

---

## 1. Objective

Define the architecture for Serena-based governance enforcement of ARC XT, using a **governed MCP proxy/wrapper** in front of Serena. This is an architecture package only — no implementation, runtime code changes, or live enforcement changes are included.

---

## 2. Option Matrix

| Criterion                        | A: Env-Only (`ARC_INTERCEPTION_SCRIPT`)          | B: Native-Hook (VS Code Extension API)            | C: Governed MCP Proxy/Wrapper                                       |
| -------------------------------- | ------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------- |
| **Description**                  | Set env var pointing to interception script path | Hook directly into VS Code extension lifecycle    | Intercept all Serena MCP calls through a bounded proxy process      |
| **Trust Boundary**               | Low (env var can be spoofed)                     | Medium (extension host trust)                     | **High** (separate process, explicit MCP boundary)                  |
| **Fail-Closed Behavior**         | Env unset → Serena runs unguarded                | Hook failure → may destabilize extension          | Proxy down → Serena calls blocked or logged-only                    |
| **Installation Complexity**      | Low (single env var)                             | High (requires extension rebuild + API stability) | Medium (proxy process + MCP config)                                 |
| **Rollback Safety**              | High (unset env var)                             | Low (requires extension downgrade)                | **High** (disable proxy, Serena falls back to no-op)                |
| **Warden Live-Test Feasibility** | Medium (env var state hard to audit)             | Medium (requires extension reload)                | **High** (can test proxy isolation, failure modes, audit trail)     |
| **Audit Path**                   | None (env var not logged)                        | Partial (extension logs only)                     | **Complete** (`ops/serena-audit.log` captures all proxied calls)    |
| **Recommended for Stage 4**      | ❌ No (insufficient trust boundary)              | ❌ No (too invasive for current stage)            | ✅ **Yes** (strongest isolation, clearest rollback, complete audit) |

**Axis Selected Direction:** **Option C — Governed MCP Proxy/Wrapper**.  
Do not rely on `ARC_INTERCEPTION_SCRIPT` env wiring alone. Do not assume native-hook support exists until proven.

---

## 3. Selected Architecture & Rationale

### 3.1 Architecture Overview

```
Serena Agent
    ↓
Governed MCP Proxy (serena-governance-proxy)
    ↓ (validates, logs, enforces)
ARC XT Extension (local enforcement authority)
    ↓
Local Audit Trail (.arc/audit.jsonl)
```

### 3.2 Rationale

- **MCP is Serena's primary interface** — wrapping it provides the cleanest interception point without modifying Serena internals
- **Proxy process is isolated** — runs as separate process, can be killed without affecting Serena or ARC XT
- **Audit path is explicit** — all proxied calls logged to `ops/serena-audit.log`
- **No native assumptions** — does not require VS Code extension API stability or env var wiring
- **Rollback is trivial** — disable proxy, Serena falls back to direct (ungoverned) mode, which is detectable and auditable

### 3.3 Proxy Responsibilities

1. Intercept all Serena MCP tool calls
2. Validate against ARC XT policy rules
3. Log call details to `ops/serena-audit.log`
4. Block or allow based on risk classification
5. Require approval/token flow for medium/high-risk targets

---

## 4. Fail-Closed Behavior for Mutating Calls

| Call Type                          | Risk Level | Default Behavior                            | Fail-Closed Action                                                |
| ---------------------------------- | ---------- | ------------------------------------------- | ----------------------------------------------------------------- |
| Read-only (view, analyze, explain) | LOW        | Allowed through proxy                       | Proxy down → calls pass through with warning logged               |
| Mutating (edit, create, delete)    | MEDIUM     | Requires approval token                     | Proxy down → **BLOCKED** until proxy restored or manual override  |
| High-risk (auth, config, infra)    | HIGH       | Requires Warden-approved token              | Proxy down → **BLOCKED** until proxy restored and Warden sign-off |
| Serena self-modification           | HIGH       | Always blocked unless explicitly authorized | **BLOCKED** (no exceptions)                                       |

### 4.1 Fail-Closed Guarantees

- **Proxy crash:** All mutating calls are blocked. Read-only calls pass through with audit warning. ARC XT logs event and continues local enforcement.
- **Proxy timeout (>5s):** Call blocked, logged as timeout. Operator must retry or use manual override procedure.
- **Audit log full:** Proxy stops accepting new calls. Operator must rotate or archive `ops/serena-audit.log`.

---

## 5. Approval / Token Flow for Medium/High-Risk Targets

### 5.1 Risk Classification

| Risk Level | Classification Criteria                        | Required Approval                       |
| ---------- | ---------------------------------------------- | --------------------------------------- |
| LOW        | Read-only, no file mutation, no config change  | None (automatic)                        |
| MEDIUM     | File edits in non-governed paths, refactoring  | Operator approval (logged)              |
| HIGH       | Auth, config, infra, or governed-path mutation | ARC XT approval token + Warden sign-off |

### 5.2 Token Flow (MEDIUM/HIGH)

1. Serena agent requests governance token from ARC XT via proxy
2. ARC XT evaluates request against local policy rules
3. If approved, ARC XT issues time-limited token (default: 15 minutes)
4. Proxy attaches token to Serena's MCP call
5. ARC XT verifies token before allowing mutation
6. Token logged to `ops/serena-audit.log` with call details

### 5.3 Token Properties

- **Time-limited:** 15 minutes default, configurable via ARC XT policy
- **Call-bound:** Token valid for specific MCP call pattern only
- **Single-use:** Token invalidated after first use
- **Revocable:** Operator can revoke token via `arc token revoke <id>`

---

## 6. Audit Path to `ops/serena-audit.log`

### 6.1 Log Format

Each proxied call generates one audit entry:

```json
{
  "timestamp": "2026-04-05T12:34:56.789Z",
  "serena_session": "session-id-123",
  "mcp_method": "tools/edit",
  "target_path": "src/auth/login.ts",
  "risk_level": "HIGH",
  "token_id": "tok-abc123",
  "decision": "ALLOW",
  "operator_id": "human-123",
  "proxy_latency_ms": 12
}
```

### 6.2 Log Properties

- **Append-only:** Log entries never modified or deleted
- **Local storage:** `ops/serena-audit.log` in workspace root
- **Rotation:** Operator procedure for archiving (no automated rotation yet)
- **Audit chain:** Each entry includes hash of previous entry (future: full hash chain)

### 6.3 Log Integrity

- Proxy verifies log file integrity on startup
- If log file is missing or corrupted, proxy enters fail-closed mode (all mutating calls blocked)
- Operator must restore or recreate log file before proxy resumes

---

## 7. Install / Rollback / Operator Procedure

### 7.1 Installation

1. **Proxy binary** installed to `~/.arc/serena-governance-proxy` (user-local, not system-wide)
2. **Serena MCP config** updated to route through proxy (no `mcp.json` mutation — operator edits config manually)
3. **Operator runs** `arc serena-proxy enable` to activate governance wrapper
4. **Proxy verifies** ARC XT health endpoint and opens MCP listener
5. **Default state:** Proxy active, all calls governed, audit log open

### 7.2 Activation

1. Operator runs `arc serena-proxy enable`
2. Proxy checks ARC XT availability
3. If ARC XT healthy, proxy opens MCP listener
4. Operator sees: `Serena governance proxy active. All calls governed.`
5. Event logged to local audit trail and `ops/serena-audit.log`

### 7.3 Rollback

1. Operator runs `arc serena-proxy disable`
2. Proxy closes MCP listener, stops intercepting calls
3. Serena falls back to direct (ungoverned) mode
4. **Audit entry logged:** `proxy_disabled` with timestamp
5. ARC XT continues local-only enforcement (unaffected by proxy state)

### 7.4 Operator Procedures

| Action         | Command                    | Effect                                            |
| -------------- | -------------------------- | ------------------------------------------------- |
| Enable proxy   | `arc serena-proxy enable`  | Activates governance wrapper                      |
| Disable proxy  | `arc serena-proxy disable` | Deactivates wrapper, Serena runs unguarded        |
| View audit log | `arc serena-audit tail`    | Shows last 50 entries from `ops/serena-audit.log` |
| Revoke token   | `arc token revoke <id>`    | Invalidates specified token                       |
| Health check   | `arc serena-proxy status`  | Shows proxy state, ARC XT health, audit log state |

---

## 8. Warden Live-Test Plan & Pass/Fail Criteria

### 8.1 Test Environment

- ARC XT: clean local build (current HEAD)
- Serena: existing Serena agent (no modifications)
- Proxy: serena-governance-proxy (architecture defined, not yet implemented)
- Test workspace: isolated temp directory with governed files across all risk levels

### 8.2 Pass/Fail Criteria

| Test                         | Expected Behavior                                        | Pass Condition                                                     | Fail Condition                                               |
| ---------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| **T1: Read-Through**         | Low-risk calls pass through proxy unblocked              | All read-only calls succeed, logged to audit                       | Read-only calls blocked or unlogged                          |
| **T2: Medium-Risk Approval** | Mutating calls require operator approval                 | MEDIUM calls blocked until token issued, then allowed              | MEDIUM calls allowed without token or blocked after token    |
| **T3: High-Risk Token Flow** | HIGH calls require ARC XT token + Warden sign-off        | HIGH calls blocked until valid token, logged with token ID         | HIGH calls allowed without token or token not logged         |
| **T4: Proxy Crash Recovery** | All mutating calls blocked when proxy crashes            | Proxy crash → mutating calls blocked, read calls pass with warning | Proxy crash → calls pass unguarded or ARC XT destabilized    |
| **T5: Audit Log Integrity**  | All proxied calls logged to `ops/serena-audit.log`       | Every call has corresponding audit entry with hash chain           | Missing entries, corrupted log, or unhashed entries          |
| **T6: Rollback Cleanliness** | `arc serena-proxy disable` fully removes proxy influence | Serena runs unguarded, ARC XT continues local enforcement          | Residual proxy state, blocked calls, or audit gaps           |
| **T7: Token Timeout**        | Expired tokens rejected by proxy                         | Token >15 min old → call blocked, timeout logged                   | Expired token accepted or not logged                         |
| **T8: Log Full / Corrupted** | Proxy enters fail-closed when log integrity fails        | Log corrupted → all mutating calls blocked, operator alerted       | Log corrupted → calls pass through or proxy crashes silently |

### 8.3 Warden Sign-Off

Warden must independently verify all 8 tests pass before any proxy implementation is authorized for broader rollout. **This architecture package does not authorize implementation.**

---

## 9. Explicit Deferrals & Standing Constraints

The following items are **explicitly blocked** and remain out of scope for this architecture package:

| Item                                        | Status                  | Reason                                                                                         |
| ------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| **WRD-0042** (Runtime registry → HIGH-risk) | ❌ **OPEN / HIGH RISK** | Requires separate Axis/Warden authorization before any generated `mcp.json` path               |
| **WRD-0044** (M2 governance code changes)   | ❌ **OPEN**             | 6 M2 files remain uncommitted; cannot be cited as runtime evidence until committed cleanly     |
| **Generated `mcp.json` Path**               | ❌ **BLOCKED**          | Hard constraint: no auto-generation or mutation of `mcp.json` in this slice                    |
| **Runtime-Registry Mutation**               | ❌ **BLOCKED**          | Hard constraint: no mutation of runtime registry in this slice                                 |
| **MCP Duplicate-Process Cleanup**           | ❌ **BLOCKED**          | Manual procedure only if duplicates recur; no automation package yet                           |
| **Serena Runtime Code Implementation**      | ❌ **BLOCKED**          | This is architecture-only; implementation requires separate Axis review after Warden live-test |

---

## 10. Next Steps (Post-Architecture Approval)

1. Axis reviews and approves this architecture package.
2. Warden defines exact test environment and executes live-test plan (8 tests).
3. If all 8 tests pass, Axis authorizes **WRD-0043 implementation slice** (bounded proxy implementation only).
4. Implementation slice must include:
   - serena-governance-proxy binary/service (isolated process)
   - MCP config template (operator-edited, not auto-generated)
   - Audit log initialization and integrity verification
   - CLI commands (`arc serena-proxy enable/disable`, `arc serena-audit tail`, `arc token revoke`)
   - **No `mcp.json` mutation, no runtime-registry changes, no duplicate-process automation.**

---

**End of WRD-0043 Architecture Package**
