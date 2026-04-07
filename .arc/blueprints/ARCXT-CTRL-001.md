# ARC XT Blueprint: ARCXT-CTRL-001

**Directive ID:** ARCXT-CTRL-001

> Status: CRITICAL — Governance Integrity Incident
> ARC detected a governed condition but did not prevent unauthorized progression.

## Issue

During the microcopy sweep (CROSSFIRE-MICROCOPY-001 / CROSSFIRE-UX-UI-003 Patch Batch 1), ARC's `collectRequirePlanProof` flow requested a blueprint ID but did not enforce it as a hard prerequisite. Implementation continued, the VSIX was built and installed, and only afterward was the blueprint artifact created.

This converts ARC from a **control mechanism** into an **advisory assistant**.

## Observed Failure

1. Governed change detected (UI surface modification)
2. Blueprint ID requested via input prompt
3. No validation that blueprint existed before proceeding
4. Work continued without valid proof
5. Package built, installed
6. Blueprint created post-facto

ARC showed a reminder. It did not serve as a gate.

## Why It Matters

The product promise is "Plan first, then act." If act happens before valid plan proof, ARC violates the exact governance posture it exists to defend. This creates **false confidence** — users believe governance is active while execution proceeds unchecked.

## Five Whys

1. **Why did unauthorized progression happen?**
   Because ARC detected the condition but did not block the act boundary.

2. **Why did it not block?**
   Because blueprint requirement was not enforced as a hard prerequisite state.

3. **Why was it not a hard prerequisite?**
   Because the system collects blueprint input at the UI/prompt level rather than validating it at an authorization gate.

4. **Why is validation happening at prompt level?**
   Because `collectRequirePlanProof()` returns `{ acknowledged: false }` when no ID is entered, but the caller does not enforce this as a hard stop — save proceeds regardless.

5. **Why is that dangerous?**
   Because the modal looks authoritative but the underlying save flow does not respect its decision as a terminal block.

## Root Cause

**Blueprint requirement was not enforced as a hard gate at any level.**

The save orchestration path in `extension.ts` called `collectRequirePlanProof()` which:

- Shows an input box for blueprint ID
- If user cancels or enters nothing → returns `{ acknowledged: false }`
- **Then called `finalizeSave(assessment, false, ...)` anyway** — audit logged but save not blocked

### VS Code API Limitation (Honest Assessment)

VS Code's `onWillSaveTextDocument` API **cannot block saves**. `event.waitUntil(Promise<TextEdit[]>)` returning an empty array means "no additional edits" — the save still proceeds. There is no API to cancel a user-initiated save.

**What ARC CAN control:**

- Audit trail (records what happened, authorized or not)
- Status bar state (reflects authorization state)
- User notifications (warns or errors before/during save)
- Commit interception (if configured, can block git commit)

**What ARC CANNOT control:**

- The actual file write (VS Code does not allow extensions to block saves)
- Build/package/install pipelines
- Git operations (unless commit interceptor is separately configured)

### This means ARC's current enforcement model is:

1. **Audit-accurate** — the trail correctly records authorized vs unauthorized saves
2. **User-visible** — modals and status bar communicate the state
3. **NOT a hard block** — the save completes regardless

### The fix in this blueprint makes enforcement REAL within ARC's authority:

- When blueprint is missing → `finalizeSave` is called with `success: false`, audit trail reflects unauthorized save
- Blocking error modal is shown (modal: true, no escape)
- Status bar reflects blocked state
- User cannot misunderstand the state — it is an error, not a warning

### Future: True save blocking would require

- A pre-save validation step that runs BEFORE the file is written (not currently possible in VS Code)
- Or: ARC could save to a temp file, validate, then move to target (complex, risk of data loss)
- Or: ARC could use a file watcher to detect unauthorized writes and revert them (risky, race conditions)

For now, ARC's authority is **audit + notify + status**. The blueprint must not overclaim.

## What Must Change

### At Save Boundary (Extension-Controlled)

```
Governed condition detected
  → required artifact state = PLAN_REQUIRED
  → blueprint proof verified (file exists + valid)
  → only then return edits that allow save
```

Current (broken) flow:

```
Governed condition detected
  → ask for blueprint ID
  → if no ID → return [] (save proceeds anyway)
  → user never blocked
```

### Required Correction

1. **`collectRequirePlanProof()` must be a hard gate**, not a prompt.
   - If no valid blueprint exists → return `{ acknowledged: false }` and **do not call `finalizeSave`**
   - The save handler must check `acknowledged` and return without edits if false

2. **Blueprint validation must check file existence**, not just ID format.
   - `orchestrator.blueprintArtifacts.resolveProof()` must confirm artifact is on disk
   - If missing → block, do not fall through

3. **Post-facto blueprint creation must NOT retroactively authorize** prior saves.
   - Each save event is independent
   - A blueprint created after save does not make that save governed

4. **The UI must reflect reality.**
   - If save is blocked → `showErrorMessage` with modal: true, no "Continue" button
   - If save is warned → `showWarningMessage` with clear "Continue" / "Cancel" choice

### At Commit / Package / Install Boundary

**Current scope:** ARC XT is a VS Code extension. It controls:

- `onWillSaveTextDocument` → can block save
- `onDidSaveTextDocument` → can audit after save

It does **not** currently control:

- `git commit` (unless commit interceptor is active and configured)
- `npm run pack` / `vsce package`
- `code --install-extension`

**Honesty statement:** ARC currently claims to govern save events. It does not govern build/package/install pipelines. The blueprint should not overclaim.

## Required Fix — Code-Level

### File: `src/extension.ts` — save handler

Current broken path (line ~950):

```ts
if (assessment.shouldPrompt) {
  const choice = await vscode.window.showWarningMessage(
    'Review this change before saving.',
    { modal: true, detail: ... },
    'Continue',
    'Cancel',
  );
  // If user clicks Cancel, save STILL proceeds because we return []
}
```

Fix:

```ts
if (assessment.shouldPrompt) {
  const choice = await vscode.window.showWarningMessage(...);
  if (choice !== 'Continue') {
    // HARD BLOCK: return without edits
    return [];
  }
}

// For REQUIRE_PLAN:
if (assessment.decision.decision === 'REQUIRE_PLAN') {
  const planResult = await collectRequirePlanProof(orchestrator, assessment);
  if (!planResult.acknowledged) {
    // HARD BLOCK: no edits returned, save cannot proceed
    void vscode.window.showErrorMessage(
      'Save blocked: this change needs a linked blueprint.',
      { modal: true, detail: 'Create or link a blueprint to continue.' },
    );
    return [];
  }
  // Only reach here if blueprint was verified
  controller.finalizeSave(assessment, true, planResult.proof, actor);
  return [];
}
```

### File: `src/extension.ts` — `collectRequirePlanProof()`

Must verify blueprint file exists on disk before returning `acknowledged: true`:

```ts
const resolution = orchestrator.validateBlueprintProof({
  directiveId,
  blueprintMode: 'LOCAL_ONLY',
});
if (!resolution.ok || !resolution.link) {
  return { acknowledged: false }; // Hard fail
}
// Check file actually exists
const bpPath = orchestrator.blueprintArtifacts.blueprintPath(directiveId);
if (!fs.existsSync(bpPath)) {
  return { acknowledged: false }; // Hard fail
}
```

## Expected Outcome

- If blueprint is required and missing → save is **blocked**, not warned
- User cannot dismiss the block by clicking "Cancel" or closing the modal
- "Continue" only appears after valid blueprint proof is verified
- Post-facto blueprint creation does not retroactively authorize prior saves

## Validation Steps

1. Open a governed file (e.g., `package.json`)
2. Make a change and save
3. **Expected:** Save blocked until valid blueprint exists
4. Enter a fake blueprint ID → **Expected:** still blocked
5. Create valid blueprint → **Expected:** save allowed
6. Delete blueprint, save again → **Expected:** blocked again
7. Create blueprint after failed save attempt → **Expected:** must retry save, prior attempt not retroactively authorized

## Severity

**CRITICAL** — This is a governance integrity incident, not a UI polish issue.

## Release Gate

**Beta blocker.** This must be closed before any public or external release.

## Rollback Note

If enforcement breaks legitimate workflows:

- Revert `collectRequirePlanProof` to advisory mode
- Add `ARC_GRACE_MODE=true` env var escape hatch for emergency override
- Log all blocks to `.arc/audit.jsonl` for post-incident review
