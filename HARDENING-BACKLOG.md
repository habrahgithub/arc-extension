# ARC XT Hardening Backlog

**Project:** lintel (ARC XT)  
**WARDEN Finding:** WARDEN-LINTEL-001  
**Date Opened:** 2026-04-02  
**Status:** Open — Internal Pilot Phase

---

## Carry-Forward Hardening Items

Per WARDEN standing conditions and Axis recommendations.

---

### H-001: execSqlJson() Stderr Capture

**Priority:** Medium  
**Status:** Open  
**WARDEN Reference:** Standing Condition #2

**Issue:** `execSqlJson()` at `auditLog.ts:755` does not have `stdio: 'pipe'` for stderr capture. While SELECT queries rarely produce stderr noise, this is a gap in the hardening posture.

**Fix Required:**
```typescript
private execSqlJson<T>(sqlStatement: string): T[] {
  const output = execFileSync(
    'sqlite3',
    ['-json', this.sqlitePath(), sqlStatement],
    {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'], // Add stderr capture
    },
  ).trim();
  // ...
}
```

**Target:** Next release cycle (post-internal pilot)

**Verification:**
- Run `npm run test` — no stderr output
- Verify JSON parsing still works correctly

---

### H-002: SQLite EPERM Test-Path Investigation

**Priority:** Low  
**Status:** Open  
**WARDEN Reference:** Axis Recommendation #6

**Issue:** Isolated test runs (`npm run test -- tests/integration/auditLog.test.ts`) may fail with `spawnSync sqlite3 EPERM` in some sandboxed environments, while full suite passes.

**Investigation Required:**
1. Reproduce in clean sandbox environment
2. Identify file permission differences
3. Determine if test harness or sqlite3 binary issue

**Potential Fixes:**
- Use temp dir with explicit permissions
- Switch to `better-sqlite3` npm package (no subprocess)
- Document as known limitation if environment-specific

**Target:** After internal pilot stability verified

**Workaround:** Run full test suite (`npm run test`) instead of isolated files.

---

### H-003: Clean VS Code Profile Verification

**Priority:** High  
**Status:** Open  
**WARDEN Reference:** Axis Recommendation #6

**Issue:** Verify install + activate in a clean VS Code profile before broader use.

**Verification Steps:**
1. Create fresh VS Code profile
2. Install VSIX: `arc-audit-ready-core-0.1.11.vsix`
3. Verify activation without errors
4. Test basic commands
5. Verify no unexpected extensions/dependencies

**Checklist:**
- [ ] Clean profile created
- [ ] VSIX installed successfully
- [ ] Extension activates on startup
- [ ] All commands available in palette
- [ ] No Extension Host errors
- [ ] Audit log writes correctly
- [ ] Rule enforcement works

**Target:** Before Stage 2 rollout (explicit-save path)

**Owner:** Sentinel

---

### H-004: Kill-Switch / Rollback Readiness

**Priority:** High  
**Status:** Open  
**WARDEN Reference:** Axis Recommendation #5

**Requirement:** One-step disable path for model lane with revert to rule-only.

**Implementation:**
1. Document disable procedure in `ACTIVATION-GUIDE.md`
2. Create rollback script: `scripts/disable-model-lane.sh`
3. Verify rollback preserves audit chain
4. Test fallback cause capture in audit evidence

**Rollback Steps (Draft):**
```bash
# Disable local lane in router config
echo '{"mode": "RULE_ONLY", "local_lane_enabled": false}' > .arc/router.json

# Reload VS Code
# Verify: Extension operates in rule-only mode
```

**Target:** Before Stage 2 rollout

**Owner:** Forge

---

### H-005: Audit Evidence for Model Failures

**Priority:** Medium  
**Status:** Open  
**WARDEN Reference:** Axis Recommendation #5

**Requirement:** Capture fallback cause, timeout, unavailable, and disabled states in audit evidence.

**Verification:**
- Review `auditLog.ts` — ensure `fallback_cause` persisted
- Check `DecisionPayload` type — all failure modes represented
- Test each failure mode:
  - `TIMEOUT` — model takes >120s
  - `UNAVAILABLE` — Ollama not running
  - `PARSE_FAILURE` — invalid model response
  - `MODEL_DISABLED` — local lane disabled

**Target:** Stage 1 internal pilot

**Owner:** Sentinel

---

## Rollout Sequence Status

| Stage | Description | Status | Gate |
|-------|-------------|--------|------|
| **Stage 1** | Internal pilot only | 🟡 In Progress | WARDEN approval |
| **Stage 2** | Explicit-save path only (`LOCAL_PREFERRED`) | ⏳ Pending | H-003, H-004 closed |
| **Stage 3** | Limited operator cohort | ⏳ Pending | Sentinel stability verification |
| **Stage 4** | Broader rollout | ⏳ Pending | All hardening items closed |

---

## Standing Conditions (WARDEN)

1. **Local-Only Scope** — No cloud-lane without new WARDEN gate
2. **execSqlJson() Advisory** — Track for next cycle (H-001)
3. **Route Policy Configuration** — `enabledByDefault = false` unchanged

---

## Next Review

**Trigger:** Stage 2 rollout request  
**Required Closures:** H-001, H-003, H-004  
**Optional:** H-002, H-005

---

**Last Updated:** 2026-04-02  
**Audit Point:** `16106de` (lintel) / `a657562` (workspace)
