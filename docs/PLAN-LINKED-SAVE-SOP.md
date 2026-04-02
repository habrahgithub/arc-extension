# ARC XT — Plan-Linked Save SOP

**Document Purpose:** Standard operating procedure for `REQUIRE_PLAN` / plan-linked saves in ARC XT.

**Status:** ACTIVE — aligns operator workflow to current ARC XT enforcement behavior.

---

## Why this SOP exists

ARC XT blocks `REQUIRE_PLAN` saves unless the operator provides both:
- a valid **Change ID** (`directive_id`)
- a valid local **blueprint proof** (`.arc/blueprints/<CHANGE-ID>.md`)

A common point of confusion is that the save dialog shows an example such as `LINTEL-PH5-001` as a placeholder. That placeholder is **not** a submitted Change ID. The operator must enter a real Change ID explicitly.

This SOP aligns the operator workflow with the extension's current enforcement truth.

---

## ARC XT plan-linked save sequence

Use this order for any high-risk save that resolves to `REQUIRE_PLAN`:

1. **Confirm governed root**
2. **Confirm local ARC config**
3. **Enter a real Change ID**
4. **Create or open the local blueprint artifact**
5. **Complete the blueprint**
6. **Save the blueprint**
7. **Re-save the governed file**
8. **Review proof + audit evidence**

Do not skip steps. ARC XT is intentionally fail-closed here.

---

## Step 1 — Confirm governed root

Before trying to satisfy a plan-linked save, confirm ARC XT is targeting the correct local project root.

Expected checks:
- the governed root matches the intended project
- `.arc/` under that root is the one you mean to use
- if working in a monorepo or nested repo, do **not** assume workspace root is correct

Recommended command/surface:
- `ARC XT: Show Active Workspace Status`

If the wrong root is active, fix that first. Otherwise ARC XT may look for config or blueprints in the wrong place.

---

## Step 2 — Confirm local ARC config

Confirm the governed root has the expected local config files:

- `.arc/router.json`
- `.arc/workspace-map.json`

Important distinction:
- `workspace-map.json` defines local risk/rule mapping
- blueprint proof is a separate requirement for `REQUIRE_PLAN`

If config is missing, create minimal safe config first.

Safe defaults remain:
- `mode: RULE_ONLY`
- `local_lane_enabled: false` unless explicitly authorized/configured
- `cloud_lane_enabled: false`
- workspace mapping remains `LOCAL_ONLY`

---

## Step 3 — Enter a real Change ID

When ARC XT prompts for a plan-linked save, enter a real Change ID.

Requirements:
- uppercase
- hyphenated
- operator-provided, not placeholder text

Examples:
- `LINTEL-PH5-001`
- `WORKSPACE-CHG-001`
- `MYAPP-AUTH-001`

Invalid examples:
- empty input
- lowercase input
- placeholder left untouched

The dialog placeholder is only an example format.

---

## Step 4 — Create or open the local blueprint artifact

The canonical proof path is:

```text
.arc/blueprints/<CHANGE-ID>.md
```

ARC XT validates only the local canonical blueprint artifact.

Important:
- Axis directives / execution packages are **not** a substitute for the local blueprint file
- non-canonical paths do not satisfy proof validation

---

## Step 5 — Complete the blueprint

Template creation does **not** authorize the save.

The blueprint must contain directive-specific content for all required sections:
- Objective
- Scope
- Constraints
- Acceptance Criteria
- Rollback Note

The blueprint remains invalid if it still contains:
- `[REQUIRED]` placeholders
- `INCOMPLETE_TEMPLATE`
- missing required headings
- insufficient directive-specific detail

---

## Step 6 — Save the blueprint

After completing the required sections, save the blueprint file itself.

ARC XT will then be able to re-validate the proof on the next governed save attempt.

---

## Step 7 — Re-save the governed file

Return to the governed file and save again.

Expected result:
- ARC XT re-evaluates the save
- blueprint proof is checked again
- if valid, the `REQUIRE_PLAN` proof requirement is satisfied
- other rules may still apply

A valid blueprint does **not** override unrelated governance checks.

---

## Step 8 — Review proof and audit evidence

After the save path succeeds, review:
- blueprint proof state
- runtime status
- audit evidence

Recommended commands:
- `ARC XT: Review Blueprint Proofs`
- `ARC XT: Review Audit Log`
- `ARC XT: Show Active Workspace Status`

Expected audit evidence for a valid plan-linked save includes:
- `directive_id`
- `blueprint_id`

---

## What ARC XT is enforcing

For `REQUIRE_PLAN`, ARC XT currently enforces:
- valid Change ID required
- valid local blueprint artifact required
- canonical blueprint path required
- placeholder/incomplete template content is insufficient
- local-only proof handling only

This is intentional. The extension is blocking saves because the workflow is not yet aligned with the enforced proof contract.

---

## Common operator mistakes

### Mistake 1: Treating placeholder text as submitted input
The dialog example (for example `LINTEL-PH5-001`) is not an entered Change ID.

### Mistake 2: Confusing workspace mapping with blueprint proof
`workspace-map.json` helps classify risk; it does not satisfy `REQUIRE_PLAN` by itself.

### Mistake 3: Creating the blueprint but leaving it incomplete
A scaffolded template is only the starting point.

### Mistake 4: Working under the wrong governed root
If ARC XT is rooted at the wrong folder, it will validate the wrong `.arc/` state.

---

## Current operating rule

Until first-run/bootstrap improvements land, use this manual SOP:

**Governed Root → Config → Change ID → Blueprint → Save Blueprint → Re-save Governed File → Review**

This is the current ARC XT operator workflow of record.
