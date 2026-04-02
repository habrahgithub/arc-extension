# ARC XT — Team Deployment Guide

**Document Purpose:** Guidance for deploying ARC XT in multi-developer team environments.

**Status:** CONTROLLED INTERNAL RELEASE — Team deployment considerations for lab/controlled environments.

---

## Overview

ARC XT is designed as a **local-first** IDE governance extension. This guide covers considerations and patterns for deploying ARC XT across a team of developers.

---

## Deployment Models

### Model 1: Individual Developer (Default)

Each developer installs ARC XT independently with local-only configuration.

**Characteristics:**
- ✅ No coordination required
- ✅ Each developer maintains their own audit trail
- ✅ No shared state or configuration
- ❌ No centralized audit collection
- ❌ No team-wide governance enforcement

**Best for:**
- Small teams (1-3 developers)
- Early adoption / pilot testing
- Teams with diverse governance requirements

---

### Model 2: Coordinated Configuration

Team agrees on common governance rules and shares configuration.

**Characteristics:**
- ✅ Consistent governance rules across team
- ✅ Shared understanding of risk classifications
- ✅ Blueprint proofs can reference shared directives
- ❌ Manual configuration synchronization required
- ❌ No automatic policy distribution

**Setup:**
1. Create a shared `.arc/workspace-map.json` template
2. Distribute to team members via version control or internal docs
3. Each developer places file in their workspace `.arc/` directory

**Example shared workspace-map.json:**
```json
{
  "mode": "LOCAL_ONLY",
  "rules": [
    {
      "id": "TEAM-AUTH-001",
      "reason": "Authentication module changes require team review",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "auth" }
      ],
      "riskFlag": "AUTH_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "PATH_SEGMENT_MATCH"
    }
  ]
}
```

---

### Model 3: Centralized Audit Collection (Manual)

Team collects audit logs for compliance or review purposes.

**Characteristics:**
- ✅ Centralized audit trail for compliance
- ✅ Team can review governance decisions
- ✅ False positive analysis across team
- ❌ Manual export/import process
- ❌ No real-time synchronization
- ⚠️ Path sensitivity considerations (see Privacy section)

**Setup:**
1. Each developer periodically exports their `.arc/audit.jsonl`
2. Exported logs are aggregated to a central location
3. Team lead or compliance officer reviews aggregated logs

**Export script example:**
```bash
#!/bin/bash
# Export audit log with workspace identifier
WORKSPACE_NAME=$(basename "$(pwd)")
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
cp .arc/audit.jsonl "../audit-exports/${WORKSPACE_NAME}-${TIMESTAMP}.jsonl"
```

---

## Privacy Considerations for Team Deployment

### Audit Log Sensitivity

⚠️ **WARDEN ADVISORY:** Audit logs contain absolute file paths which may reveal:

- Developer workspace structure (e.g., `/home/alice/projects/...`)
- Project codenames or internal naming conventions
- File organization patterns

**Recommendations:**

1. **Path redaction before sharing:**
   ```bash
   # Redact home directory paths before sharing
   jq -r '.file_path |= gsub("/home/[^/]+/"; "[REDACTED]/")' .arc/audit.jsonl
   ```

2. **Workspace-relative paths only:**
   - Consider storing only relative paths in shared audit exports
   - Use workspace name as identifier instead of full path

3. **Access control:**
   - Limit audit log access to team leads and compliance officers
   - Do not share audit logs outside the team without review

### Blueprint Proof Sharing

Blueprint proofs (`.arc/blueprints/*.md`) may contain:

- Directive IDs linking to external governance documents
- Risk acknowledgment details
- Team-internal references

**Recommendations:**
- Store blueprints in version control if team visibility is desired
- Redact sensitive references before external sharing

---

## Configuration Management

### Shared Router Configuration

For teams wanting consistent enforcement posture:

```json
{
  "mode": "RULE_ONLY",
  "localLaneEnabled": true,
  "cloudLaneEnabled": false
}
```

**Distribution options:**
1. **Version control:** Commit `.arc/router.json` to team repo (if appropriate)
2. **Internal docs:** Document expected configuration in team onboarding
3. **Config management:** Use team config management tooling to distribute

### Environment Variables

Team-wide environment variable conventions:

| Variable | Recommended Team Default | Description |
|----------|-------------------------|-------------|
| `OLLAMA_HOST` | `127.0.0.1:11434` | Local Ollama endpoint |
| `SWD_SUBAGENT_MODEL` | `llama3.2:3b` or `qwen3.5:9b` | Local model for evaluation |
| `OLLAMA_TIMEOUT_MS` | `2000` | Model timeout (2 seconds) |
| `OLLAMA_RETRIES` | `1` | Retry count |
| `OLLAMA_BACKOFF_MS` | `500` | Retry backoff (ARC-ADAPT-001) |
| `OLLAMA_JITTER_MS` | `200` | Retry jitter (ARC-ADAPT-001) |

---

## Onboarding New Team Members

### Checklist

- [ ] Install ARC XT extension (Marketplace or VSIX)
- [ ] Verify extension activation (`ARC XT:` commands visible)
- [ ] Confirm the intended governed root before testing enforcement
- [ ] Configure `.arc/router.json` (if using shared config)
- [ ] Configure `.arc/workspace-map.json` (if using custom rules)
- [ ] Review `docs/PLAN-LINKED-SAVE-SOP.md` before testing any `REQUIRE_PLAN` flow
- [ ] Install and start Ollama (if using local model)
- [ ] Pull required model: `ollama pull llama3.2:3b`
- [ ] Run test save on governed file (e.g., `auth.ts`)
- [ ] Review welcome guide (`ARC XT: Show Welcome Guide`)
- [ ] Review team governance docs (directive IDs, blueprint conventions)

### Plan-linked save note

For any save that resolves to `REQUIRE_PLAN`, the operator workflow is:

**Governed Root → Config → Change ID → Blueprint → Save Blueprint → Re-save Governed File → Review**

`workspace-map.json` does not satisfy proof by itself. The save also requires a valid local blueprint artifact at `.arc/blueprints/<CHANGE-ID>.md`.

### Verification Commands

```bash
# Check extension is active
code --list-extensions | grep -i "arc\|lintel"

# Check Ollama is running
curl http://127.0.0.1:11434/api/tags

# Check audit log is being written
ls -la .arc/audit.jsonl
```

---

## Troubleshooting Team Deployments

### Issue: Inconsistent enforcement across team

**Possible causes:**
- Different `.arc/router.json` configurations
- Different `.arc/workspace-map.json` rules
- Different extension versions

**Resolution:**
1. Standardize configuration files
2. Verify extension version: `code --list-extensions --show-versions`
3. Distribute updated VSIX if needed

### Issue: Audit log aggregation failures

**Possible causes:**
- File locking (audit log in use)
- Path format differences (Windows vs. Unix)
- Encoding issues

**Resolution:**
1. Copy audit log before reading (don't read in-place)
2. Normalize line endings before aggregation
3. Use UTF-8 encoding consistently

### Issue: Blueprint proof mismatches

**Possible causes:**
- Directive ID format inconsistencies
- Missing blueprint files
- Different blueprint templates

**Resolution:**
1. Standardize directive ID format (e.g., `TEAM-PH1-001`)
2. Share blueprint templates via version control
3. Document blueprint conventions in team onboarding

---

## Compliance and Audit Readiness

### SOC 2 Considerations

For teams using ARC XT as part of SOC 2 compliance:

1. **Audit trail retention:**
   - Define retention period for audit logs (e.g., 90 days, 1 year)
   - Implement backup/export process for audit logs
   - Document audit log verification procedure

2. **Change management:**
   - Document directive/proof linkage conventions
   - Maintain directive registry (what IDs mean)
   - Track blueprint proof approvals

3. **Access control:**
   - Limit audit log access to authorized personnel
   - Document who can review/approve blueprints
   - Track team member onboarding/offboarding

### Evidence Collection

For compliance audits, collect:

1. **Configuration evidence:**
   - `.arc/router.json` (enforcement mode)
   - `.arc/workspace-map.json` (custom rules)

2. **Audit evidence:**
   - `.arc/audit.jsonl` (decision trail)
   - `.arc/audit.jsonl.*` (rotated archives)

3. **Blueprint evidence:**
   - `.arc/blueprints/*.md` (directive proofs)

---

## Limitations (Current Phase)

### Not Yet Supported

- ❌ Centralized policy distribution
- ❌ Real-time audit log streaming
- ❌ Team dashboard / command centre
- ❌ Shared blueprint repository
- ❌ Cloud lane synchronization
- ❌ Multi-workspace audit correlation

### Roadmap Considerations

Future team deployment features may include:
- Policy distribution via version control integration
- Audit log export automation
- Team dashboard webview
- Shared blueprint registry
- Cloud-assisted team synchronization (Warden-gated)

---

## See Also

- `docs/PRIVACY-AND-AUDIT.md` — What ARC XT logs and does not log
- `docs/WORKSPACE-MAPPING-GUIDE.md` — Custom rule configuration
- `docs/RELEASE-READINESS.md` — Installation and upgrade procedures

---

**End of Team Deployment Guide**

*This guide is for controlled internal team deployment. It does not authorize cloud-lane widening or external data transmission. For actual enforcement behavior, see runtime status and audit log.*
