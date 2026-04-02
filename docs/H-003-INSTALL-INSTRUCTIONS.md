# ARC XT — Clean Install Instructions (H-003 Remediation)

**Date:** 2026-04-02  
**WARDEN:** WARDEN-LINTEL-001  
**SENTINEL:** H-003 Cold Review Remediation

---

## Critical Fix Applied

**Commit:** `679a6f9`  
**Fix:** Lazy-load TypeScript dependency to avoid eager `require()` crash  
**Issue:** Extension crashed on activation with `Cannot find module 'typescript'`

---

## Installation Steps

### Step 1: Uninstall Current Extension

```bash
# Uninstall existing ARC XT extension
code --uninstall-extension swd.arc-audit-ready-core

# Verify removal
code --list-extensions | grep arc
# Expected: no output (extension removed)
```

### Step 2: Install New VSIX

```bash
# Navigate to lintel project root
cd /home/habib/workspace/projects/lintel

# Install new VSIX (built at 14:41, 2.03 MB, 616 files)
code --install-extension arc-audit-ready-core-0.1.11.vsix --force
```

Or via VS Code UI:
1. `Ctrl+Shift+X` → Extensions
2. Click `...` → **Install from VSIX...**
3. Select: `/home/habib/workspace/projects/lintel/arc-audit-ready-core-0.1.11.vsix`
4. Click **Install**
5. **Reload** VS Code when prompted

### Step 3: Verify Installation

```bash
# Check extension is installed
code --list-extensions --show-versions | grep arc
# Expected: swd.arc-audit-ready-core@0.1.11
```

---

## Verification Session

### Step 4: Open Fresh VS Code Session

1. **Close all VS Code windows**
2. **Wait 5 seconds** (ensure processes terminate)
3. **Open VS Code** to workspace: `/home/habib/workspace`

### Step 5: Check Extension Host Log

**Location:** `~/.vscode-server/data/logs/YYYYMMDDTHHMMSS/exthost1/remoteexthost.log`

**Find Latest Session:**
```bash
ls -lt ~/.vscode-server/data/logs/ | head -5
# Find most recent session directory
```

**Search for ARC Activation:**
```bash
grep -i "arc\|swd\|audit-ready" ~/.vscode-server/data/logs/*/exthost1/remoteexthost.log | tail -20
```

**Expected Log Output (SUCCESS):**
```
[timestamp] [info] Extension host activated
[timestamp] [info] Activating extension 'swd.arc-audit-ready-core'
[timestamp] [info] Extension 'swd.arc-audit-ready-core' activated
```

**NOT Expected (FAILURE):**
```
[timestamp] [error] Activating extension 'swd.arc-audit-ready-core' failed due to an error
[timestamp] [error] Error: Cannot find module 'typescript'
```

### Step 6: Test Command Activation

1. Open Command Palette: `Ctrl+Shift+P`
2. Type: `ARC XT`
3. Verify commands appear:
   - `ARC XT: Show Welcome Guide`
   - `ARC XT: Review Audit Log`
   - `ARC XT: Show Active Workspace Status`

4. Run: `ARC XT: Show Welcome Guide`
5. Verify welcome surface appears

---

## Report to SENTINEL

**Required Evidence:**

1. **Session Timestamp:**
   ```bash
   ls -lt ~/.vscode-server/data/logs/ | head -2
   # Report the timestamp (e.g., 20260402T144500)
   ```

2. **Extension Host Log Excerpt:**
   ```bash
   grep -A 5 "swd.arc-audit-ready-core" ~/.vscode-server/data/logs/<TIMESTAMP>/exthost1/remoteexthost.log
   ```

3. **Command Test:**
   - Screenshot or confirmation that `ARC XT: Show Welcome Guide` works

---

## Rollback (If Needed)

If new installation fails:

```bash
# Uninstall
code --uninstall-extension swd.arc-audit-ready-core

# Use kill-switch to disable model lane
cd /home/habib/workspace/projects/lintel
./scripts/kill-switch.sh

# Reload VS Code
# Extension will operate in rule-only mode
```

---

## VSIX Metadata

| Attribute | Value |
|-----------|-------|
| **File** | `arc-audit-ready-core-0.1.11.vsix` |
| **Size** | 2.03 MB |
| **Files** | 616 |
| **Build Time** | April 2, 14:41 |
| **Commit** | `679a6f9` |
| **Fix** | TypeScript lazy-loading |

---

**Next Actor:** Prime (install + verify) → SENTINEL (session log verification)
