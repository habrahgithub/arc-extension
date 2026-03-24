# ARC-CMD-001 Pre-Execution Submission

**Directive ID:** ARC-CMD-001  
**Date:** 2026-03-24  
**Purpose:** Pre-execution submissions for Warden verification (WRD-0105, WRD-0106, OBS-S-7060/61/62)

---

## WRD-0106: Exact Target `arc.*` Command ID List

### Current `lintel.*` Commands (Legacy)

| Current ID | Title | Usage |
|------------|-------|-------|
| `lintel.showWelcome` | ARC: Show Welcome Guide | Activation, onboarding |
| `lintel.reviewAudit` | ARC: Review Audit Log | Review surface |
| `lintel.showRuntimeStatus` | ARC: Show Active Workspace Status | Review surface |
| `lintel.reviewBlueprints` | ARC: Review Blueprint Proofs | Review surface |
| `lintel.reviewFalsePositives` | ARC: Review False-Positive Candidates | Review surface |

### Target `arc.*` Commands (Canonical)

| Target ID | Source ID | Title | Notes |
|-----------|-----------|-------|-------|
| `arc.showWelcome` | `lintel.showWelcome` | ARC: Show Welcome Guide | Primary activation |
| `arc.reviewAudit` | `lintel.reviewAudit` | ARC: Review Audit Log | Review surface |
| `arc.showRuntimeStatus` | `lintel.showRuntimeStatus` | ARC: Show Active Workspace Status | Review surface |
| `arc.reviewBlueprints` | `lintel.reviewBlueprints` | ARC: Review Blueprint Proofs | Review surface |
| `arc.reviewFalsePositives` | `lintel.reviewFalsePositives` | ARC: Review False-Positive Candidates | Review surface |

### Existing `arc.*` Commands (No Change)

These commands from ARC-UI-001a/b/c are already `arc.*` namespace:

| Command ID | Source | Notes |
|------------|--------|-------|
| `arc.ui.reviewHome` | ARC-UI-001a | Review navigation hub |
| `arc.ui.runtimeStatus` | ARC-UI-001b | Runtime status UI |
| `arc.ui.auditReview` | ARC-UI-001b | Audit review UI |
| `arc.ui.blueprintProof` | ARC-UI-001c | Blueprint proof UI |
| `arc.ui.falsePositiveReview` | ARC-UI-001c | False-positive UI |
| `arc.ui.guidedWorkflow` | ARC-UI-001c | Guided workflow UI |

### Migration Summary

- **5 legacy commands** migrate from `lintel.*` to `arc.*`
- **6 UI commands** already use `arc.*` namespace (no change)
- **Total canonical commands:** 11 (all `arc.*`)

---

## WRD-0105 / OBS-S-7061: Compatibility-Bridge Strategy

### Bridge Mechanism: Dual Registration

During the transition period, **both** `lintel.*` and `arc.*` command IDs will be registered:

```typescript
// extension.ts activation
export function activate(context: vscode.ExtensionContext): void {
  // ... existing setup ...

  // ARC-CMD-001: Dual registration for compatibility bridge
  // Primary: arc.* namespace (canonical)
  context.subscriptions.push(
    vscode.commands.registerCommand('arc.showWelcome', async () => {
      await welcomeSurface.showWelcome();
    }),
    // ... other arc.* commands ...
  );

  // Compatibility: lintel.* namespace (legacy alias, deprecated)
  // These delegate to the same handlers, ensuring existing keybindings work
  context.subscriptions.push(
    vscode.commands.registerCommand('lintel.showWelcome', async () => {
      await welcomeSurface.showWelcome();
    }),
    // ... other lintel.* commands ...
  );
}
```

### Bridge Properties

| Property | Value |
|----------|-------|
| Mechanism | Dual registration (same handler) |
| Direction | `lintel.*` → delegates to same handler as `arc.*` |
| Duration | Temporary (until next major version) |
| Deprecation | `lintel.*` marked as deprecated in docs |
| Breaking | None during bridge period |

### Avoiding Duplicate Command-Palette Entries (WRD-0105)

**Problem:** Registering both `lintel.*` and `arc.*` could show duplicate entries in the Command Palette.

**Solution:** Only `arc.*` commands are contributed to `package.json` → `contributes.commands`. The `lintel.*` commands are registered programmatically **without** `package.json` contribution.

```json
// package.json - ONLY arc.* commands contributed
"contributes": {
  "commands": [
    {
      "command": "arc.showWelcome",
      "title": "ARC: Show Welcome Guide"
    },
    // ... other arc.* commands only ...
  ]
}
```

```typescript
// extension.ts - lintel.* registered programmatically (no palette entry)
vscode.commands.registerCommand('lintel.showWelcome', handler);
// This command works for keybindings/activation but doesn't appear in palette
```

**Result:**
- Command Palette shows only `arc.*` commands (no duplicates)
- Existing keybindings using `lintel.*` continue to work
- Activation events for `lintel.*` continue to fire

---

## OBS-S-7060: `extension.ts` Scope Clarification

### Current State

`extension.ts` currently registers 5 `lintel.*` commands + 6 `arc.ui.*` commands (from ARC-UI-001a/b/c).

### Migration Scope

**Files Modified:**
- `src/extension.ts` — Command registration (dual registration during bridge)
- `package.json` — `contributes.commands` and `activationEvents` migration

**Changes in `extension.ts`:**
1. Add `arc.*` command registrations (primary)
2. Retain `lintel.*` command registrations (compatibility bridge)
3. Both delegate to same handler functions (no behavior change)

**Changes NOT Made:**
- No handler logic changes
- No new commands added
- No command behavior modifications
- No activation logic changes (beyond `package.json` updates)

### Scope Boundary

| Aspect | In Scope | Out of Scope |
|--------|----------|--------------|
| Command ID namespace | ✅ `lintel.*` → `arc.*` | — |
| Command titles | ✅ ARC-aligned (already correct) | — |
| Command handlers | — | ✅ No changes |
| Activation events | ✅ Migrate to `arc.*` | — |
| Keybindings | ✅ Compatibility preserved | — |
| Tests | ✅ Update to use `arc.*` | — |
| New commands | — | ✅ Not authorized |
| Behavior changes | — | ✅ Not authorized |

---

## OBS-S-7062: Activation-Event Migration Plan

### Current Activation Events

```json
"activationEvents": [
  "onStartupFinished",
  "onCommand:lintel.showWelcome",
  "onCommand:lintel.reviewAudit",
  "onCommand:lintel.showRuntimeStatus",
  "onCommand:lintel.reviewBlueprints",
  "onCommand:lintel.reviewFalsePositives"
]
```

### Target Activation Events (Atomic Migration)

```json
"activationEvents": [
  "onStartupFinished",
  "onCommand:arc.showWelcome",
  "onCommand:arc.reviewAudit",
  "onCommand:arc.showRuntimeStatus",
  "onCommand:arc.reviewBlueprints",
  "onCommand:arc.reviewFalsePositives",
  "onCommand:arc.ui.reviewHome",
  "onCommand:arc.ui.runtimeStatus",
  "onCommand:arc.ui.auditReview",
  "onCommand:arc.ui.blueprintProof",
  "onCommand:arc.ui.falsePositiveReview",
  "onCommand:arc.ui.guidedWorkflow"
]
```

### Atomic Migration Strategy

**Single Commit Approach:**
- `package.json` changes (commands + activation events) in **one commit**
- `extension.ts` changes (dual registration) in **same commit**
- Tests updated in **same commit**

**Rationale:**
- Prevents activation gaps during migration
- Ensures `arc.*` commands activate correctly from first use
- Maintains `lintel.*` activation for existing keybindings (via dual registration)

### Migration Commit Structure

```
feat(ARC-CMD-001): migrate command namespace from lintel.* to arc.*

- package.json: contributes.commands migrated to arc.*
- package.json: activationEvents migrated to arc.* (+ ARC-UI-001a/b/c)
- extension.ts: dual registration (arc.* primary, lintel.* compatibility)
- tests: updated to use arc.* namespace
- docs: migration summary and deprecation notice

WRD-0105: No duplicate palette entries (lintel.* not in contributes.commands)
WRD-0106: All arc.* command IDs declared
OBS-S-7060: extension.ts scope bounded to registration only
OBS-S-7062: Atomic migration in single commit
```

---

## Warden Verification Checklist

| Condition | Status | Evidence |
|-----------|--------|----------|
| WRD-0105: Duplicate palette entries avoided | ✅ Ready | `lintel.*` not in `contributes.commands` |
| WRD-0106: Exact `arc.*` IDs declared | ✅ Ready | 5 target IDs listed above |
| OBS-S-7060: `extension.ts` scope clear | ✅ Ready | Registration only, no handler changes |
| OBS-S-7061: Bridge mechanism declared | ✅ Ready | Dual registration strategy |
| OBS-S-7062: Atomic activation migration | ✅ Ready | Single commit strategy |

---

**Next:** Warden verification → Upon approval, Forge may execute ARC-CMD-001.
