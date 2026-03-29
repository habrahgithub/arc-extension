# ENHANCED workspace-map.json WITH DEBUGGING RULES

Add these rules to your `.arc/workspace-map.json` to enforce debugging discipline:

```json
{
  "mode": "LOCAL_ONLY",
  "rules": [
    {
      "id": "sdlc-no-direct-main",
      "reason": "Direct commits to main branch violate SDLC workflow. Use feature branches.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "main" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "CRITICAL",
      "decisionFloor": "BLOCK",
      "scope": "PATH_SEGMENT_MATCH"
    },
    {
      "id": "sdlc-migration-requires-plan",
      "reason": "Database migrations require a rollback plan and deployment coordination.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "migrations" }
      ],
      "riskFlag": "SCHEMA_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "PATH_SEGMENT_MATCH"
    },
    {
      "id": "sdlc-api-breaking-change",
      "reason": "API changes in versioned endpoints require backward compatibility review.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "api" },
        { "type": "PATH_SEGMENT_MATCH", "value": "v1" }
      ],
      "riskFlag": "SCHEMA_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "PATH_SEGMENT_MATCH"
    },
    {
      "id": "sdlc-env-config-change",
      "reason": "Environment configuration changes need deployment plan and team notification.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": ".env" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "FILENAME_MATCH"
    },
    {
      "id": "sdlc-dependency-update",
      "reason": "Dependency changes should include security audit and breaking change review.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": "package.json" },
        { "type": "FILENAME_MATCH", "value": "package-lock.json" },
        { "type": "FILENAME_MATCH", "value": "requirements.txt" },
        { "type": "FILENAME_MATCH", "value": "Gemfile" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "FILENAME_MATCH"
    },
    {
      "id": "sdlc-dockerfile-change",
      "reason": "Container configuration changes affect all deployments. Review for security and compatibility.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": "Dockerfile" },
        { "type": "FILENAME_MATCH", "value": "docker-compose.yml" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "FILENAME_MATCH"
    },
    {
      "id": "sdlc-ci-pipeline-change",
      "reason": "CI/CD pipeline changes affect the entire team. Test in a branch first.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": ".github" },
        { "type": "FILENAME_MATCH", "value": ".gitlab-ci.yml" },
        { "type": "FILENAME_MATCH", "value": "Jenkinsfile" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "FILENAME_MATCH"
    },

    // ========================================
    // DEBUGGING & INCIDENT RESPONSE RULES
    // ========================================

    {
      "id": "debug-no-console-log-in-source",
      "reason": "Debug console.log statements must be removed before commit. Use proper logging framework or remove before committing.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "src" },
        { "type": "EXTENSION_MATCH", "value": ".js" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "⚠️ Check for console.log/console.debug statements. Remove before commit or use proper logging."
    },
    {
      "id": "debug-no-console-log-in-ts",
      "reason": "Debug console.log statements must be removed before commit. Use proper logging framework or remove before committing.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "src" },
        { "type": "EXTENSION_MATCH", "value": ".ts" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "⚠️ Check for console.log/console.debug statements. Remove before commit or use proper logging."
    },
    {
      "id": "debug-no-debugger-statement",
      "reason": "Debugger statements left in code can cause production issues. Remove before commit.",
      "matchers": [
        { "type": "EXTENSION_MATCH", "value": ".js" },
        { "type": "EXTENSION_MATCH", "value": ".ts" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "EXTENSION_MATCH",
      "customMessage": "🚫 Debugger statement detected. These must be removed before commit."
    },
    {
      "id": "debug-test-only-in-test-files",
      "reason": "Test.only() or describe.only() blocks prevent full test suite from running. Remove or justify.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "test" },
        { "type": "EXTENSION_MATCH", "value": ".test.ts" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "⚠️ Check for .only() in tests. This prevents full test suite from running."
    },
    {
      "id": "debug-mock-data-in-source",
      "reason": "Mock/test data should not be in source files. Move to test fixtures or remove.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": "mock" },
        { "type": "PATH_SEGMENT_MATCH", "value": "src" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "⚠️ Mock data in source code. Should this be in test fixtures instead?"
    },
    {
      "id": "debug-temp-files",
      "reason": "Temporary debugging files (temp.*, debug.*, test.*) should not be committed.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": "temp." },
        { "type": "FILENAME_MATCH", "value": "debug." },
        { "type": "FILENAME_MATCH", "value": "scratch." }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "FILENAME_MATCH",
      "customMessage": "⚠️ Temporary debug file detected. Should this be committed?"
    },
    {
      "id": "debug-commented-code",
      "reason": "Large blocks of commented code should be removed (use git history instead). Review before committing.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "src" },
        { "type": "EXTENSION_MATCH", "value": ".ts" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "LOW",
      "decisionFloor": "WARN",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "ℹ️ Review for large blocks of commented code. Git history is better than code comments."
    },
    {
      "id": "incident-hotfix-branch",
      "reason": "Hotfix branches require incident documentation and expedited review process. See SDLC-DEBUG-001.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "hotfix" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "🚨 Hotfix branch detected. Requires: 1) Incident ticket, 2) RCA doc, 3) Expedited review"
    },
    {
      "id": "incident-postmortem-required",
      "reason": "Post-mortem documents for P0/P1 incidents require thorough review and action items.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "incidents" },
        { "type": "FILENAME_MATCH", "value": "postmortem" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "📋 Post-mortem document. Ensure: Timeline, RCA, Prevention tasks are complete."
    },
    {
      "id": "monitoring-alert-config",
      "reason": "Monitoring/alerting configuration changes affect incident detection. Test thresholds carefully.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "monitoring" },
        { "type": "PATH_SEGMENT_MATCH", "value": "alerts" },
        { "type": "FILENAME_MATCH", "value": "datadog" },
        { "type": "FILENAME_MATCH", "value": "sentry" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "📊 Monitoring config change. Verify: 1) Alert thresholds tested, 2) No alert fatigue, 3) Runbook updated"
    },
    {
      "id": "debug-performance-logging",
      "reason": "Performance.now() or performance timing code may indicate performance debugging. Remove if not needed for production.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "src" },
        { "type": "EXTENSION_MATCH", "value": ".ts" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "LOW",
      "decisionFloor": "WARN",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "⏱️ Performance timing code detected. Keep only if needed for production monitoring."
    }
  ],
  "ui_segments": ["components", "ui", "views", "pages", "layouts"]
}
```

---

## RULE CATEGORIES ADDED

### 1. **Debug Statement Prevention** (3 rules)
- `debug-no-console-log-in-source` - Warns about console.log in source
- `debug-no-console-log-in-ts` - Warns about console.log in TypeScript
- `debug-no-debugger-statement` - Requires plan for debugger statements

### 2. **Test Quality** (1 rule)
- `debug-test-only-in-test-files` - Warns about .only() in tests

### 3. **Code Hygiene** (3 rules)
- `debug-mock-data-in-source` - Warns about mock data in source
- `debug-temp-files` - Warns about temp/debug/scratch files
- `debug-commented-code` - Warns about commented code blocks

### 4. **Incident Response** (3 rules)
- `incident-hotfix-branch` - Requires plan for hotfix branches
- `incident-postmortem-required` - Warns about post-mortem completeness
- `monitoring-alert-config` - Requires plan for monitoring changes

### 5. **Performance Debug** (1 rule)
- `debug-performance-logging` - Warns about performance timing code

---

## SEVERITY LEVELS EXPLAINED

| Severity | Decision | When Used |
|----------|----------|-----------|
| **CRITICAL** | BLOCK | Never allow (e.g., commit to main) |
| **HIGH** | REQUIRE_PLAN | Needs documentation (e.g., debugger statements, hotfix) |
| **MEDIUM** | WARN | Should review but can proceed (e.g., console.log) |
| **LOW** | WARN | Best practice reminder (e.g., commented code) |

---

## CUSTOMIZATION TIPS

### Make Rules Stricter
Change `decisionFloor` from `WARN` to `REQUIRE_PLAN` or `BLOCK`:

```json
{
  "id": "debug-no-console-log-in-source",
  "decisionFloor": "BLOCK"  // Now blocks instead of warns
}
```

### Make Rules More Lenient
Change `decisionFloor` from `REQUIRE_PLAN` to `WARN`:

```json
{
  "id": "debug-no-debugger-statement",
  "decisionFloor": "WARN"  // Now warns instead of requiring plan
}
```

### Disable a Rule
Remove the rule from the array, or add `"enabled": false`:

```json
{
  "id": "debug-commented-code",
  "enabled": false,  // Rule disabled
  ...
}
```

### Add Custom Message
Use `customMessage` field to provide better context:

```json
{
  "id": "your-custom-rule",
  "customMessage": "💡 Your helpful message here"
}
```

---

## TESTING THE DEBUGGING RULES

### Test 1: Console.log Detection
```bash
# 1. Create file in src/
echo "console.log('debug');" > src/test.js

# 2. Save in VS Code
# Should see: ⚠️ WARN with message about removing console.log
```

### Test 2: Debugger Statement
```bash
# 1. Create file with debugger
echo "debugger;" > src/debug.js

# 2. Save in VS Code
# Should see: 🔴 REQUIRE_PLAN with message about removing debugger
```

### Test 3: Hotfix Branch
```bash
# 1. Create hotfix branch
git checkout -b hotfix/INC-2026-03-29-001

# 2. Edit any file and save
# Should see: 🔴 REQUIRE_PLAN requiring incident doc
```

---

## INTEGRATION WITH CI/CD

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check for debug statements
if git diff --cached --name-only | grep -E '\.(js|ts)$' | xargs grep -n 'console\.\(log\|debug\)\|debugger'; then
  echo "❌ Debug statements found. Remove before commit."
  exit 1
fi

# Check for .only() in tests
if git diff --cached --name-only | grep -E '\.test\.(js|ts)$' | xargs grep -n '\.only('; then
  echo "❌ .only() found in tests. Remove or justify."
  exit 1
fi

exit 0
```

### ESLint Integration
```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-console': 'error',
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.object.name='test'][callee.property.name='only']",
        message: 'test.only() is not allowed in commits'
      }
    ]
  }
};
```

---

## QUICK REFERENCE

### Common Scenarios

| Scenario | Rule Triggered | Action |
|----------|----------------|--------|
| Forgot to remove console.log | `debug-no-console-log-*` | Remove or use logger |
| Left debugger statement | `debug-no-debugger-statement` | Remove immediately |
| Committing temp file | `debug-temp-files` | Delete or add to .gitignore |
| Hotfix without doc | `incident-hotfix-branch` | Create incident ticket |
| .only() in test | `debug-test-only-in-test-files` | Remove .only() |

---

**Status:** Ready to use - add to your `.arc/workspace-map.json`
