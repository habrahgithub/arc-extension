# H-003: Clean VS Code Profile Verification Protocol

**Priority:** High  
**Owner:** Sentinel  
**Status:** In Progress — Diagnosis Phase  
**Stage Gate:** Stage 2 Blocker

---

## Issue Report

**Symptom:** Extension failing to activate in VS Code  
**Reported:** 2026-04-02 (session log)  
**Current State:** VSIX built with all dependencies (2.1 MB, includes ajv)

---

## Diagnosis Protocol

### Step 1: Capture Extension Host Logs

```bash
# In VS Code:
# 1. Help → Toggle Developer Tools
# 2. Console tab → Copy all errors
# 3. Output → Extension Host → Copy all logs
```

**Expected Errors (if any):**
- `Cannot find module 'ajv'` — Dependency missing (FIXED in 2.1 MB VSIX)
- `Activating extension...` timeout — Activation taking >5s
- `Cannot read property of undefined` — Code error in activate()
- `Command already registered` — Duplicate registration

### Step 2: Verify Extension Registration

```bash
# List installed extensions
code --list-extensions --show-versions | grep arc

# Expected: swd.arc-audit-ready-core@0.1.11
```

### Step 3: Check Activation Events

**File:** `package.json` → `activationEvents`

```json
{
  "activationEvents": [
    "onStartupFinished"
  ]
}
```

**Expected:** Extension activates within 5s of VS Code startup.

### Step 4: Verify Command Registration

After activation, check Command Palette (`Ctrl+Shift+P`):
- `ARC XT: Show Welcome Guide`
- `ARC XT: Review Audit Log`
- `ARC XT: Show Active Workspace Status`
- `ARC: Show Decision Timeline`

**If missing:** Activation failed or command registration error.

### Step 5: Check Output Channels

**VS Code → Output → Select "ARC Output Channel"**

**Expected:** No errors on startup.

---

## Known Resolved Issues

### ✅ CSP Font Blocking (Fixed e19bd7d)
- **Error:** `Content Security Policy blocks... font-src data:`
- **Fix:** Added `data:` to `font-src` in `buildCSPWithNonce()`

### ✅ Missing ajv Dependency (Fixed 94e6f5f)
- **Error:** `Cannot find module 'ajv'`
- **Fix:** Added `!node_modules/**` to `.vscodeignore`

### ✅ Test Stderr Noise (Fixed e19bd7d)
- **Error:** `UNIQUE constraint failed` printed to test output
- **Fix:** Added `stdio: 'pipe'` to `execSql()`

---

## Test Matrix

| Environment | VS Code Version | Status | Notes |
|-------------|-----------------|--------|-------|
| Dev (habib) | 1.90+ | ⏳ Pending | Report: "not starting" |
| Clean Profile | 1.90+ | ⏳ Pending | H-003 verification |
| Production | N/A | ⏳ Pending | Stage 3+ |

---

## Success Criteria (H-003 Closure)

- [ ] Extension activates within 5s of VS Code startup
- [ ] No Extension Host errors
- [ ] All ARC XT commands available in Command Palette
- [ ] ARC Output Channel shows no errors
- [ ] Test save event triggers audit log write
- [ ] Test commit event triggers drift detection

---

## Rollback Plan (If Diagnosis Fails)

1. **Uninstall extension:**
   ```bash
   code --uninstall-extension swd.arc-audit-ready-core
   ```

2. **Verify clean state:**
   ```bash
   code --list-extensions | grep arc
   # Expected: no output
   ```

3. **Revert to rule-only mode:**
   - Extension operates without model lane
   - All rule-engine enforcement preserved

---

## Next Steps

1. **User Action Required:** Provide Extension Host logs from failed startup
2. **Sentinel Action:** Reproduce in clean profile environment
3. **Forge Action:** Implement H-004 kill-switch in parallel

---

**Last Updated:** 2026-04-02  
**Audit Point:** `1b8c4ba` (lintel)
