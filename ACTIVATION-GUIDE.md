# ARC XT Activation Guide

**WARDEN Authorization:** WARDEN-LINTEL-001 (2026-04-02)  
**Verdict:** CONDITIONAL PASS — Local Ollama Lane Authorized  
**Audit Point:** `e19bd7d` (lintel) / `a657562` (workspace)

---

## Quick Start

### 1. Install the VSIX

```bash
# From lintel project root
code --install-extension arc-audit-ready-core-0.1.11.vsix --force
```

Or via VS Code UI:
1. `Ctrl+Shift+X` → Extensions
2. Click `...` → **Install from VSIX...**
3. Select: `projects/lintel/arc-audit-ready-core-0.1.11.vsix`
4. **Reload** VS Code when prompted

---

### 2. Verify Installation

```bash
# Check extension is installed
code --list-extensions | grep arc-audit
# Expected: swd.arc-audit-ready-core
```

In VS Code:
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type `ARC XT` — should show available commands
3. Try: `ARC XT: Show Welcome Guide`

---

### 3. Configure Local Model (Optional)

ARC XT uses local Ollama by default. Ensure Ollama is running:

```bash
# Check Ollama status
ollama list

# Pull model if needed
ollama pull qwen3.5:9b

# Start Ollama service
ollama serve
```

**Note:** Extension works WITHOUT Ollama (rule-only mode). Local model is optional enhancement.

---

## WARDEN Standing Conditions

Activation is authorized **ONLY** under these conditions:

### 1. Local-Only Enforcement
- ✅ Ollama endpoint: `http://localhost:11434`
- ✅ Allowed hosts: `localhost`, `127.0.0.1`, `::1`
- ❌ Cloud endpoints NOT authorized (requires new WARDEN gate)

### 2. Default-Off Posture
- ✅ `enabledByDefault = false` in router config
- ✅ User must explicitly enable local lane
- ❌ Do not change default without WARDEN review

### 3. Route Policy Configuration
- ✅ Operator-configured via `.arc/router.json`
- ✅ Fail-closed to `RULE_ONLY` on errors
- ❌ No automatic cloud fallback

---

## Configuration Files

### `.arc/router.json` (Optional)

```json
{
  "mode": "RULE_ONLY",
  "local_lane_enabled": false,
  "cloud_lane_enabled": false,
  "governance_mode": "ENFORCE"
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `mode` | `RULE_ONLY` | Enforcement mode |
| `local_lane_enabled` | `false` | Enable local AI (requires Ollama) |
| `cloud_lane_enabled` | `false` | **Not authorized** by WARDEN |
| `governance_mode` | `ENFORCE` | `ENFORCE` or `OBSERVE` |

---

## Available Commands

| Command | Description |
|---------|-------------|
| `ARC XT: Show Welcome Guide` | Onboarding surface |
| `ARC XT: Review Audit Log` | Inspect recent decisions |
| `ARC XT: Show Active Workspace Status` | Runtime diagnostics |
| `ARC XT: Review Blueprint Proofs` | Governance artifacts |
| `ARC XT: Review False-Positive Candidates` | Advisory review |
| `ARC: Show Decision Timeline` | File decision history |
| `ARC: Explain Current File State` | File audit explanation |

---

## Testing Post-Installation

### 1. Basic Functionality

```bash
cd projects/lintel

# Run full test suite
npm run test

# Expected: 69 files / 533 tests passed
```

### 2. Build Verification

```bash
npm run build
# Expected: Clean TypeScript compile
```

### 3. VSIX Integrity

```bash
# Check VSIX contents
vsce ls arc-audit-ready-core-0.1.11.vsix

# Expected: 613 files including node_modules/ajv
```

---

## Troubleshooting

### Extension Not Activating

**Symptom:** No ARC XT commands in Command Palette

**Fix:**
1. Check Output → "Extension Host" for errors
2. Reload VS Code window (`Ctrl+Shift+P` → "Developer: Reload Window")
3. Verify VSIX installed: `code --list-extensions`

### SQLite EPERM Error (Test Only)

**Symptom:** `spawnSync sqlite3 EPERM` when running single test file

**Fix:** Run full test suite instead:
```bash
npm run test  # Works
npm run test -- tests/integration/auditLog.test.ts  # May fail
```

**Note:** Test harness limitation, not production impact.

### Ollama Connection Error

**Symptom:** Local model unavailable errors

**Fix:**
```bash
# Check Ollama is running
ollama list

# Restart Ollama
ollama serve

# Pull model if missing
ollama pull qwen3.5:9b
```

---

## Security Boundaries

### What ARC XT Does

- ✅ Intercepts save events in governed files
- ✅ Evaluates risk against rule engine
- ✅ Requires acknowledgment for WARN decisions
- ✅ Requires blueprint proof for REQUIRE_PLAN decisions
- ✅ Appends hash-chained audit entries
- ✅ Displays drift detection at commit time

### What ARC XT Does NOT Do

- ❌ Send code to cloud services (local-only)
- ❌ Modify files without explicit acknowledgment
- ❌ Weaken rule-engine decisions
- ❌ Execute code or run commands
- ❌ Access external networks

---

## Governance References

- **WARDEN Finding:** `governance/records/WARDEN-LINTEL-001.md`
- **Project Registry:** `governance/project-registry.yml` (lintel entry)
- **Forge Policy:** `agents/protocols/FORGE-AGENT-POLICY.md`
- **Testing Guide:** `docs/TESTING.md` (Known Limitations section)

---

## Support

**Issues:** https://github.com/habrahgithub/lintel/issues  
**Internal Pilot:** Active — feedback welcome  
**Next Review:** Triggered by cloud-lane proposal or security incident

---

**Version:** 0.1.11  
**Release Date:** 2026-04-02  
**Authorization:** WARDEN-LINTEL-001 (Local Ollama Lane Only)
