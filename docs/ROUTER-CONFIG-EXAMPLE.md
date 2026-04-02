# ARC XT Router Configuration Example

**WARDEN Authorization:** WARDEN-LINTEL-001 (Local Ollama Lane Only)

---

## Default Configuration (RULE_ONLY)

Create `.arc/router.json` in your workspace root:

```json
{
  "mode": "RULE_ONLY",
  "local_lane_enabled": false,
  "cloud_lane_enabled": false,
  "governance_mode": "ENFORCE"
}
```

---

## Optional: Local Lane Enabled

```json
{
  "mode": "LOCAL_PREFERRED",
  "local_lane_enabled": true,
  "cloud_lane_enabled": false,
  "governance_mode": "ENFORCE"
}
```

**Requirements:**
- Ollama must be running: `ollama serve`
- Model must be available: `ollama pull qwen3.5:9b`

---

## Settings Reference

| Setting | Values | Default | Description |
|---------|--------|---------|-------------|
| `mode` | `RULE_ONLY`, `LOCAL_PREFERRED`, `CLOUD_ASSISTED` | `RULE_ONLY` | Enforcement mode |
| `local_lane_enabled` | `true`, `false` | `false` | Enable local AI (requires Ollama) |
| `cloud_lane_enabled` | `true`, `false` | `false` | **Not authorized** by WARDEN |
| `governance_mode` | `ENFORCE`, `OBSERVE` | `ENFORCE` | Enforcement or audit-only |

---

## WARDEN Constraints

**AUTHORIZED:**
- ✅ Local-only (`localhost`, `127.0.0.1`, `::1`)
- ✅ `enabledByDefault = false` posture

**NOT AUTHORIZED** (requires new WARDEN gate):
- ❌ Cloud lane activation
- ❌ Changing default to `enabledByDefault = true`
- ❌ Modifying `ALLOWED_LOCAL_HOSTNAMES`

---

**Reference:** WARDEN-LINTEL-001, ACTIVATION-GUIDE.md
