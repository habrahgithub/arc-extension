# ARC XT — Privacy and Audit Logging

**Document Purpose:** Operator-facing transparency about what ARC XT logs, what it does not log, and how audit data is stored and verified.

**WARDEN Note:** This document addresses the trust-transparency gap identified in the external review incorporation audit. It explicitly enumerates what the audit trail contains and does not contain.

---

## What ARC XT Logs

### Audit Entry Structure

Every save-time enforcement decision is logged to `.arc/audit.jsonl` as an **AuditEntry**. Each entry contains:

| Field            | Type       | Description                                | Example                                          |
| ---------------- | ---------- | ------------------------------------------ | ------------------------------------------------ |
| `ts`             | `string`   | ISO 8601 timestamp of the decision         | `"2026-03-29T13:21:07.000Z"`                     |
| `file_path`      | `string`   | **Absolute path** to the file being saved  | `"/home/user/project/src/auth.ts"`               |
| `risk_flags`     | `string[]` | Risk categories triggered by this file     | `["AUTH", "CORE_LOGIC"]`                         |
| `matched_rules`  | `string[]` | Rule IDs that matched this file path       | `["RULE-AUTH-001"]`                              |
| `decision`       | `string`   | Enforcement decision taken                 | `"ALLOW"`, `"WARN"`, `"REQUIRE_PLAN"`, `"BLOCK"` |
| `reason`         | `string`   | Human-readable explanation of the decision | `"High-risk auth file requires blueprint proof"` |
| `risk_level`     | `string`   | Assessed risk level                        | `"LOW"`, `"MEDIUM"`, `"HIGH"`, `"CRITICAL"`      |
| `violated_rules` | `string[]` | Rules that were violated (if any)          | `[]`                                             |
| `next_action`    | `string`   | Suggested operator action                  | `"Link blueprint proof before save"`             |
| `source`         | `string`   | Decision source (rule/model)               | `"RULE_ENGINE"`                                  |
| `fallback_cause` | `string?`  | If fallback occurred, the cause            | `"MODEL_UNAVAILABLE"`                            |
| `directive_id`   | `string?`  | Linked governance directive (if any)       | `"LINTEL-PH5-001"`                               |
| `blueprint_id`   | `string?`  | Linked blueprint proof (if any)            | `"BP-AUTH-001"`                                  |
| `prev_hash`      | `string`   | Hash of previous entry (chain integrity)   | `"abc123..."`                                    |
| `hash`           | `string`   | SHA-256 hash of this entry                 | `"def456..."`                                    |

### What `file_path` Contains

⚠️ **Important:** The `file_path` field contains the **absolute workspace path** to the file being saved. This means:

- Workspace root is included (e.g., `/home/user/my-project/src/auth.ts`)
- Directory structure is visible in the audit log
- File names are visible in the audit log
- **This may reveal project structure or naming conventions**

**Example:**

```json
{
  "file_path": "/home/habib/workspace/projects/lintel/src/core/auth.ts",
  "risk_flags": ["AUTH", "CORE_LOGIC"],
  ...
}
```

---

## What ARC XT Does NOT Log

### Explicitly Excluded Data

| Data Type                    | Logged? | Rationale                                                                                                           |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| **File content**             | ❌ NO   | ARC XT does not store the actual code/text being saved                                                              |
| **File diffs**               | ❌ NO   | No before/after snapshots are retained                                                                              |
| **Selection text / excerpt** | ❌ NO   | The `excerpt` field in `ContextPayload` is used for model evaluation only; it is **not** persisted to the audit log |
| **User identity**            | ❌ NO   | No username, email, or operator identifier is logged                                                                |
| **Credentials**              | ❌ NO   | No secrets, tokens, or API keys are logged                                                                          |
| **External AI requests**     | ❌ NO   | If local model is used, prompts are not logged to audit                                                             |
| **Cloud payloads**           | ❌ NO   | Cloud lane (if enabled) does not log request/response content to audit                                              |

### The `excerpt` Field Boundary

The `ContextPayload` interface includes an optional `excerpt` field:

```typescript
export interface ContextPayload {
  file_path: string;
  risk_flags: RiskFlag[];
  matched_rule_ids: string[];
  last_decision?: Decision;
  excerpt?: string; // ← Used for model evaluation only
  heuristic_only: true;
}
```

**Critical distinction:**

| Context                    | `excerpt` Persisted to Audit?                                    |
| -------------------------- | ---------------------------------------------------------------- |
| `ContextPayload` (runtime) | ✅ Present — used for model/rule evaluation                      |
| `ContextPacket` (runtime)  | ✅ Present — runtime assessment only, NOT persisted to audit log |
| `AuditEntry`               | ❌ **NOT PRESENT** — excerpt is NOT logged                       |

**The `excerpt` field is NOT included in `AuditEntry`.** It is used transiently during save-time evaluation but is **not persisted** to the audit trail.

**What `excerpt` contains (when present):**

- Up to 160 characters of the selected text at save time
- Trimmed and compacted (whitespace normalized)
- Used only for model evaluation context

**Why this matters:**

- The audit log reveals **which files** were saved and **what decisions** were made
- The audit log does **not** reveal **what code** was in those files
- Project structure may be inferred from file paths, but code content is not exposed

---

## Audit Log Storage

### Location

```
.arc/audit.jsonl
```

- **Format:** JSON Lines (one JSON object per line)
- **Encoding:** UTF-8
- **Rotation:** Automatic rotation when size threshold is exceeded (archived to `.arc/audit.jsonl.1`, etc.)

### Integrity Protection

Each audit entry includes a **hash chain**:

```
[Entry N-1].hash → [Entry N].prev_hash
[Entry N] = SHA-256([Entry N fields] + [Entry N].prev_hash)
```

**Verification:**

```bash
npm run audit:cli -- verify
```

This command:

1. Reads all audit entries in sequence
2. Verifies each `prev_hash` matches the previous entry's `hash`
3. Reports any chain breaks (tampering or corruption)

**Limitations:**

- Hash chain verifies **integrity** (no tampering), not **completeness** (no deletion)
- If the entire `.arc/` directory is deleted, there is no external record
- Individual file tampering is detectable; wholesale deletion is not

---

## Privacy Implications

### What an Auditor Can Learn

From the audit log alone, an auditor can determine:

1. **Which files** were modified (by absolute path)
2. **When** they were modified (timestamp)
3. **What risk level** was assigned (LOW/MEDIUM/HIGH/CRITICAL)
4. **What decision** was made (ALLOW/WARN/REQUIRE_PLAN/BLOCK)
5. **Why** the decision was made (reason string)
6. **Whether** a blueprint proof was linked (directive_id, blueprint_id)

### What an Auditor Cannot Learn

From the audit log alone, an auditor **cannot** determine:

1. **What code** was in the file (content is not logged)
2. **What changed** in the file (no diff is logged)
3. **Who** made the change (no user identity is logged)
4. **What the selection text was** (excerpt is not persisted to audit)

### Workspace Path Sensitivity

⚠️ **WARDEN ADVISORY:** The `file_path` field contains absolute workspace paths. This may reveal:

- Project codenames or internal naming conventions
- Directory structure and organization
- Developer workspace layout (e.g., `/home/alice/projects/...`)

**Mitigation:**

- Audit logs are stored locally only (`.arc/audit.jsonl`)
- No external transmission occurs by default
- For team deployments, consider path anonymization or redaction policies

---

## Data Retention

### Default Retention

- Audit logs are retained **indefinitely** on the local filesystem
- No automatic deletion or expiration occurs
- Rotation creates archived copies (`.audit.jsonl.1`, etc.) but does not delete

### Manual Deletion

Operators may delete audit logs manually:

```bash
rm -rf .arc/audit.jsonl*
```

⚠️ **Warning:** Deleting audit logs breaks the hash chain. Future verification will fail from the deletion point forward.

### Team Deployment Considerations

For multi-developer environments:

1. **Centralized audit collection** is not currently supported
2. **Audit log sharing** requires manual export (e.g., copy `.arc/audit.jsonl`)
3. **Path sensitivity** should be considered before sharing audit logs

See `docs/TEAM_DEPLOYMENT.md` for team deployment guidance.

---

## Compliance Notes

### GDPR / Data Privacy

- **Personal data:** File paths may indirectly identify developers (via workspace structure)
- **Data subject rights:** Operators can request audit log deletion (manual)
- **Data minimization:** Only file paths and metadata are logged; no code content

### SOC 2 / Audit Readiness

- **Audit trail:** Append-only log with hash-chain integrity
- **Change management:** High-risk changes require blueprint proof linkage
- **Fail-closed:** Missing configuration defaults to strictest posture

---

## Summary Table

| Data Element             | Logged to Audit?   | Used at Runtime?            | Persisted? |
| ------------------------ | ------------------ | --------------------------- | ---------- |
| File path (absolute)     | ✅ YES             | ✅ YES                      | ✅ YES     |
| Timestamp                | ✅ YES             | ✅ YES                      | ✅ YES     |
| Risk flags               | ✅ YES             | ✅ YES                      | ✅ YES     |
| Matched rules            | ✅ YES             | ✅ YES                      | ✅ YES     |
| Decision                 | ✅ YES             | ✅ YES                      | ✅ YES     |
| Reason                   | ✅ YES             | ✅ YES                      | ✅ YES     |
| Directive/Blueprint IDs  | ✅ YES (if linked) | ✅ YES                      | ✅ YES     |
| Excerpt (selection text) | ❌ NO              | ✅ YES (transient)          | ❌ NO      |
| File content             | ❌ NO              | ✅ YES (for classification) | ❌ NO      |
| User identity            | ❌ NO              | ❌ NO                       | ❌ NO      |
| Credentials/secrets      | ❌ NO              | ❌ NO                       | ❌ NO      |

---

**End of Privacy and Audit Logging Documentation**

_This document is operator-facing transparency. It does not authorize, widen, or bypass enforcement. For actual enforcement behavior, see runtime status and audit log._
