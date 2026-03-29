# ARC Blueprint: ARCXT-UX-CLARITY-001

**Directive ID:** ARCXT-UX-CLARITY-001

> Status: COMPLETE
> Execution Date: March 29, 2026
> Version: 0.1.8

## Objective

Make "Route policy / Workspace mapping: MISSING" status messages read as **safe, optional defaults** (not an error), and add **explicit, operator-confirmed** commands to create minimal fail-closed template configs.

User-POV clarity hardening:

- MISSING status now displays "optional config not present" instead of implying broken state
- Clarity notices explain fail-closed safety when configs are missing
- No implication that MISSING = error or misconfiguration

Template creation commands:

- `arc.createMinimalRoutePolicy` — writes `.arc/router.json` with RULE_ONLY defaults
- `arc.createMinimalWorkspaceMapping` — writes `.arc/workspace-map.json` with LOCAL_ONLY defaults
- `arc.createMinimalArcConfig` — writes both configs with explicit modal confirmation

## Scope

Files modified in `projects/lintel`:

- `src/extension/reviewSurfaces.ts` — MISSING status wording, clarity notices
- `src/extension/runtimeStatus.ts` — MISSING status wording, clarity section
- `src/extension/configTemplates.ts` — NEW: template creation command handlers
- `src/extension.ts` — Command registration for new arc.\* commands
- `package.json` — activationEvents and command contributions
- `tests/governance/arcxtUxClarity.test.ts` — NEW: 14 governance tests

Files created:

- `src/extension/configTemplates.ts` — Template creation command implementations
- `tests/governance/arcxtUxClarity.test.ts` — Governance test suite

## Constraints

**Risk Tier:** MEDIUM (writes local config files; must remain non-authorizing + fail-closed)

**Security constraints:**

- All template creation commands require explicit modal confirmation
- Templates use strict fail-closed defaults only (RULE_ONLY, LOCAL_ONLY, no lanes)
- No cloud readiness claims or lane enablement
- No auto-create without operator confirmation
- No overwrite without explicit confirmation

**Governance constraints:**

- Truthfulness: never imply "misconfigured = unsafe"
- Must state "fail-closed" in MISSING messaging
- Non-authorizing: templates do not change enforcement logic

## Acceptance Criteria

1. ✅ User-POV wording hardened:
   - MISSING status reads "optional config not present; using safe built-in defaults"
   - Clarity notices shown in Operator Context when status is MISSING
   - No implication that MISSING = broken/error

2. ✅ Template creation commands implemented:
   - `arc.createMinimalRoutePolicy` writes correct JSON structure
   - `arc.createMinimalWorkspaceMapping` writes correct JSON structure
   - `arc.createMinimalArcConfig` writes both files
   - All commands require explicit modal confirmation
   - All commands preserve fail-closed defaults

3. ✅ UI surfaces use real data (no hardcoded "LOADED")

4. ✅ Governance tests pass:
   - 14 tests covering template contents, config writing, clarity messaging
   - All tests verify fail-closed defaults
   - Non-authorizing behavior documented

5. ✅ Verification green:
   - `npm run lint` ✅
   - `npm run typecheck` ✅
   - `npm run build` ✅
   - `npm run test` ✅ (366 tests pass)

6. ✅ VSIX packaged:
   - `arc-audit-ready-core-0.1.8.vsix` (1.6 MB, 56 files)

## Rollback Note

**Git rollback:**

```bash
cd /home/habib/workspace/projects/lintel
git revert HEAD~4..HEAD  # Revert ARCXT-UX-CLARITY-001 commits
npm run build
```

**Manual rollback:**

```bash
cd /home/habib/workspace/projects/lintel
# Remove new files
rm src/extension/configTemplates.ts
rm tests/governance/arcxtUxClarity.test.ts

# Revert modified files to prior state
git checkout HEAD~4 -- src/extension/reviewSurfaces.ts src/extension/runtimeStatus.ts src/extension.ts package.json

npm run build
```

**Config file cleanup (if created):**

```bash
# Remove any configs created by template commands
rm .arc/router.json .arc/workspace-map.json 2>/dev/null
```

## Execution Evidence

**User-POV clarity constants added:**

- `WORKSPACE_MAPPING_MISSING_CLARITY` — "Workspace mapping is optional..."
- `ROUTE_POLICY_MISSING_CLARITY` — "Route policy is optional..."
- `RUNTIME_STATUS_ROUTE_POLICY_MISSING_CLARITY`
- `RUNTIME_STATUS_WORKSPACE_MAPPING_MISSING_CLARITY`

**Template creation commands:**
| Command | File Created | Defaults |
|---------|--------------|----------|
| `arc.createMinimalRoutePolicy` | `.arc/router.json` | RULE_ONLY, no lanes |
| `arc.createMinimalWorkspaceMapping` | `.arc/workspace-map.json` | LOCAL_ONLY, no rules |
| `arc.createMinimalArcConfig` | Both files | Both safe defaults |

**Test coverage:**

- `tests/governance/arcxtUxClarity.test.ts` — 14 tests
  - Canonical template contents (2 tests)
  - Config file writing (3 tests)
  - User-POV clarity messaging (3 tests)
  - Fail-closed guarantees (3 tests)
  - .arc directory creation (1 test)
  - Non-authorizing behavior (2 tests)

**Verification results:**

```
npm run lint      ✅
npm run typecheck ✅
npm run build     ✅
npm run test      ✅ (366 tests pass)
```

**VSIX:** `arc-audit-ready-core-0.1.8.vsix` (1.6 MB, 56 files)

**Blueprint closure:** ARCXT-UX-CLARITY-001 — COMPLETE
