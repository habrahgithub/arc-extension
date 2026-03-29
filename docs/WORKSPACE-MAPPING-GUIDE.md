# ARC XT — Workspace Mapping Guide (`.arc/workspace-map.json`)

**Document Purpose:** Practical operator guide for `.arc/workspace-map.json` — purpose, schema, examples, and when to create it.

---

## What is `workspace-map.json`?

`workspace-map.json` is an **optional workspace configuration file** that allows you to customize ARC XT's risk rules and UI behavior for your specific workspace.

**Default behavior:** If no `workspace-map.json` exists, ARC XT uses its built-in default rules. You do **not** need to create this file for basic usage.

---

## When to Create It

### You DO NOT need `workspace-map.json` if:

- ✅ You are a single developer using ARC XT with default rules
- ✅ The built-in risk classification meets your needs
- ✅ You only need local-first enforcement

### You MIGHT want `workspace-map.json` if:

- ⚠️ You want to add custom risk rules for your project structure
- ⚠️ You want to customize UI segments for your team
- ⚠️ You have project-specific files that should trigger higher/lower risk handling

### You CANNOT use `workspace-map.json` (Phase 5 limitation) if:

- ❌ You want shared/team workspace configuration (mode other than `LOCAL_ONLY`)
- ❌ You want cloud-assisted evaluation with custom rules

---

## File Location

```
<workspace-root>/.arc/workspace-map.json
```

**Example:**
```
/home/habib/workspace/projects/lintel/.arc/workspace-map.json
```

---

## Schema

```typescript
interface WorkspaceMappingConfig {
  mode?: "LOCAL_ONLY";           // Only LOCAL_ONLY is authorized in Phase 5
  ui_segments?: string[];        // Custom UI segment identifiers
  rules?: RiskRule[];            // Custom risk rules
}

interface RiskRule {
  id: string;                    // Unique rule identifier (e.g., "CUSTOM-AUTH-001")
  reason: string;                // Human-readable explanation
  matchers: RuleMatcher[];       // Conditions that trigger this rule
  riskFlag: RiskFlag;            // Risk category
  severity: RiskLevel;           // Severity level
  decisionFloor: Decision;       // Minimum enforcement decision
  scope: RuleScopeType;          // Matcher type
}

interface RuleMatcher {
  type: RuleScopeType;           // "PATH_SEGMENT_MATCH" | "FILENAME_MATCH" | "EXTENSION_MATCH"
  value: string;                 // Pattern to match
}

type RiskFlag = "AUTH_CHANGE" | "SCHEMA_CHANGE" | "CONFIG_CHANGE";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type Decision = "ALLOW" | "WARN" | "REQUIRE_PLAN" | "BLOCK";
type RuleScopeType = "PATH_SEGMENT_MATCH" | "FILENAME_MATCH" | "EXTENSION_MATCH";
```

---

## Examples

### Example 1: Empty (Use Defaults)

```json
{
  "mode": "LOCAL_ONLY"
}
```

This explicitly uses `LOCAL_ONLY` mode with no custom rules. Equivalent to not having the file.

---

### Example 2: Custom Auth Rule

Add a rule that treats any file in a `secrets/` directory as CRITICAL:

```json
{
  "mode": "LOCAL_ONLY",
  "rules": [
    {
      "id": "CUSTOM-SECRETS-001",
      "reason": "Files in secrets/ directory contain sensitive credentials",
      "matchers": [
        {
          "type": "PATH_SEGMENT_MATCH",
          "value": "secrets"
        }
      ],
      "riskFlag": "AUTH_CHANGE",
      "severity": "CRITICAL",
      "decisionFloor": "BLOCK",
      "scope": "PATH_SEGMENT_MATCH"
    }
  ]
}
```

**Effect:** Any file with `secrets` in its path (e.g., `src/secrets/api-key.ts`) will be blocked from save without explicit review.

---

### Example 3: Custom Extension Rule

Treat all `.sql` files as requiring review:

```json
{
  "mode": "LOCAL_ONLY",
  "rules": [
    {
      "id": "CUSTOM-SQL-001",
      "reason": "SQL migration files should be reviewed before save",
      "matchers": [
        {
          "type": "EXTENSION_MATCH",
          "value": ".sql"
        }
      ],
      "riskFlag": "SCHEMA_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "EXTENSION_MATCH"
    }
  ]
}
```

**Effect:** All `.sql` files will trigger a warning requiring acknowledgment before save.

---

### Example 4: Custom Filename Rule

Treat `package.json` as high-risk:

```json
{
  "mode": "LOCAL_ONLY",
  "rules": [
    {
      "id": "CUSTOM-PKG-001",
      "reason": "package.json changes affect dependencies and should be reviewed",
      "matchers": [
        {
          "type": "FILENAME_MATCH",
          "value": "package.json"
        }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "FILENAME_MATCH"
    }
  ]
}
```

**Effect:** Saving `package.json` requires linking a blueprint proof (directive ID).

---

### Example 5: Multiple Rules with UI Segments

```json
{
  "mode": "LOCAL_ONLY",
  "rules": [
    {
      "id": "CUSTOM-AUTH-001",
      "reason": "Auth module changes require explicit review",
      "matchers": [
        {
          "type": "PATH_SEGMENT_MATCH",
          "value": "auth"
        }
      ],
      "riskFlag": "AUTH_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "PATH_SEGMENT_MATCH"
    },
    {
      "id": "CUSTOM-SCHEMA-001",
      "reason": "Schema migrations should be acknowledged",
      "matchers": [
        {
          "type": "EXTENSION_MATCH",
          "value": ".prisma"
        }
      ],
      "riskFlag": "SCHEMA_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "EXTENSION_MATCH"
    }
  ],
  "ui_segments": ["auth-review", "schema-review"]
}
```

---

## Rule Matcher Types

| Type | Description | Example Match |
|------|-------------|---------------|
| `PATH_SEGMENT_MATCH` | Matches any directory segment in the path | `"auth"` matches `/src/auth/token.ts` |
| `FILENAME_MATCH` | Matches exact filename | `"package.json"` matches `package.json` |
| `EXTENSION_MATCH` | Matches file extension | `".sql"` matches `migration.sql` |

---

## Risk Flags

| Flag | When to Use |
|------|-------------|
| `AUTH_CHANGE` | Authentication, authorization, session, credential handling |
| `SCHEMA_CHANGE` | Database schema, migrations, ORM models |
| `CONFIG_CHANGE` | Configuration files, environment setup, dependency manifests |

---

## Severity Levels

| Level | Description | Typical Decision Floor |
|-------|-------------|------------------------|
| `LOW` | Minimal risk | `ALLOW` |
| `MEDIUM` | Moderate risk, review recommended | `WARN` |
| `HIGH` | High risk, explicit proof required | `REQUIRE_PLAN` |
| `CRITICAL` | Critical risk, save blocked | `BLOCK` |

---

## Decision Floors

| Floor | Behavior |
|-------|----------|
| `ALLOW` | Save proceeds silently |
| `WARN` | Warning shown; save proceeds after acknowledgment |
| `REQUIRE_PLAN` | Modal requires directive proof before save |
| `BLOCK` | Save is blocked; change must be split or reviewed |

---

## Validation and Errors

### Status Codes

When ARC XT loads `workspace-map.json`, it returns one of these statuses:

| Status | Meaning |
|--------|---------|
| `MISSING` | No `workspace-map.json` file exists (uses defaults) |
| `LOADED` | File loaded and validated successfully |
| `INVALID` | File exists but is not valid JSON or has invalid schema |
| `UNAUTHORIZED_MODE` | Mode is not `LOCAL_ONLY` (not authorized in Phase 5) |

### Common Errors

**Error: "The workspace mapping file is not valid JSON"**
- **Cause:** Syntax error in JSON
- **Fix:** Validate JSON with a tool like `jq` or JSONLint

**Error: "Shared or team workspace mapping is not authorized in Phase 5"**
- **Cause:** `mode` is set to something other than `LOCAL_ONLY`
- **Fix:** Change `mode` to `"LOCAL_ONLY"`

**Error: "The workspace mapping rules must follow the LINTEL risk-rule schema"**
- **Cause:** Rule structure is invalid
- **Fix:** Check that all required fields (`id`, `reason`, `matchers`, `riskFlag`, `severity`, `decisionFloor`, `scope`) are present and valid

---

## How to Create It

### Step 1: Create `.arc` Directory

If it doesn't exist:

```bash
mkdir -p .arc
```

### Step 2: Create `workspace-map.json`

```bash
cat > .arc/workspace-map.json << 'EOF'
{
  "mode": "LOCAL_ONLY",
  "rules": []
}
EOF
```

### Step 3: Verify in VS Code

1. Open VS Code
2. Run command: `ARC XT: Show Active Workspace Status`
3. Check that workspace mapping status is `LOADED`

---

## Troubleshooting

### Problem: Custom rules not triggering

**Check:**
1. Rule `id` is unique
2. `matchers` array is not empty
3. Matcher `type` and `value` are correct
4. File path actually matches the matcher pattern

### Problem: "UNAUTHORIZED_MODE" status

**Fix:** Ensure `mode` is set to `"LOCAL_ONLY"`:

```json
{
  "mode": "LOCAL_ONLY"
}
```

### Problem: "INVALID" status

**Fix:** Validate JSON syntax:

```bash
jq . .arc/workspace-map.json
```

Or use an online JSON validator.

---

## See Also

- `docs/PRIVACY-AND-AUDIT.md` — What ARC XT logs and does not log
- `docs/CODE_MAP.md` — Code structure and module responsibilities
- `docs/ARCHITECTURE.md` — Overall system architecture

---

**End of Workspace Mapping Guide**

*This guide is operator-facing documentation. It does not authorize, widen, or bypass enforcement. For actual enforcement behavior, see runtime status and audit log.*
