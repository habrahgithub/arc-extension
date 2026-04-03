# ARCXT-UX-002 — Thread-Derived Todo Ledger

**Directive ID:** `ARCXT-UX-002`  
**Status:** ACTIVE  
**Maintainer:** Forge (under Axis review)  
**Last Reviewed:** 2026-04-03  
**Purpose:** Preserve unfinished work, discussion-derived ideas, and follow-on feature requests from the active ARC XT workflow thread so they are not lost between execution slices.

---

## Operating Rule

This ledger is the **maintained operational backlog** for the active blueprint `ARCXT-UX-002`.

Use it to capture:
- unfinished work explicitly discussed in thread review
- follow-on UX/onboarding improvements
- blueprint-backed task/todo workflow ideas
- governance-safe feature ideas that should not be lost between saves, commits, or rollout stages

This ledger is **not authorizing**.  
Blueprint proof in `.arc/blueprints/ARCXT-UX-002.md` remains the governing artifact for plan-linked work.

---

## Maintenance Rules

1. Add every materially new thread-derived work item here before it is forgotten.
2. Mirror substantive items back into the active blueprint summary so the blueprint and ledger remain aligned.
3. Keep statuses truthful: `NOW`, `NEXT`, `LATER`, `WATCH`, `DONE`.
4. Do not mark an item `DONE` until code/docs/tests or an explicit decision package exists.
5. If an item affects enforcement, routing, model scope, or authorization, it requires Axis review before closure.
6. Todo/task features must remain local-only, blueprint-backed, and non-authorizing.

---

## Workflow of Record

Current enforced operator sequence:

**Governed Root → Config → Change ID → Blueprint → Save Blueprint → Re-save Governed File → Review**

Reference: `docs/PLAN-LINKED-SAVE-SOP.md`

---

## A. Thread-Derived Required Work

| ID | Status | Priority | Theme | Description | Notes / Exit Signal |
|---|---|---:|---|---|---|
| U01 | NOW | P1 | First-run bootstrap | Detect first-run / misconfigured-root conditions and surface a bounded bootstrap entry point. | New users should not land in an empty or misleading state with no guided next action. |
| U02 | NOW | P1 | Governed-root selection | Detect candidate governed roots (workspace root, nested repo root, active-file root) and require explicit choice when ambiguous. | No silent root switching. Must remain transparent and local-only. |
| U03 | NOW | P1 | Task Board rebinding | Let the Task Board and review surfaces rebind to the correct active governed root instead of staying pinned to initial activation root. | Fixes empty-board-in-monorepo failure mode seen in current workflow. |
| U04 | NOW | P1 | Empty-state recovery | Upgrade Task Board empty state with bounded actions: Review Governed Root, Create Minimal ARC Config, Create First Blueprint, Use Existing ARC Config. | Empty state should guide, not dead-end. |
| U05 | NOW | P1 | Safe config bootstrap | Add explicit, non-destructive creation flow for `.arc/router.json` and `.arc/workspace-map.json` with fail-closed defaults. | Must preserve `RULE_ONLY`, `local_lane_enabled=false`, `cloud_lane_enabled=false`. |
| U06 | NOW | P1 | First blueprint setup | Generalize first blueprint creation for new users instead of assuming LINTEL-specific naming. | Suggested IDs may use workspace/project slug patterns. |
| U07 | NEXT | P1 | Blueprint task schema | Define a canonical `## Tasks` blueprint convention that the extension can parse safely. | Must be blueprint-backed and optional until adopted. |
| U08 | NEXT | P1 | Task parsing | Parse blueprint tasks/todos into extension-visible task state and Task Board summaries. | Task list must remain advisory; blueprint remains proof authority. |
| U09 | NEXT | P1 | Active task selection | Allow bounded active-task selection for operator context. | Selection must be local-only and never authorize saves on its own. |
| U10 | NEXT | P1 | Local model context | Inject bounded task context (`task_id`, `task_summary`, `task_status`) into local model evaluation only after an active task is explicitly selected. | Must not widen model scope or bypass rule floor. |
| U11 | NEXT | P1 | Governance safety | Add tests proving todo/task features stay non-authorizing, local-only, fail-closed, and subordinate to blueprint proof. | Required before any broader rollout of task-led workflow. |
| U12 | LATER | P2 | Commit linkage | Improve commit linkage when no active file is open or when a commit spans multiple files. | Current `NO_LINKED_DECISION` behavior is truthful but ergonomically limited. |
| U13 | LATER | P2 | Blocked-save recovery | Add a direct blocked-save recovery path such as “Open Current Blueprint” / “Resume SOP” from the save failure flow. | Derived from current operator friction during `REQUIRE_PLAN` saves. |
| U14 | LATER | P2 | Task Board guidance | Show active Change ID / blueprint and next required operator action directly in the Task Board. | Helps operators understand why saves are blocked and what to do next. |
| U15 | WATCH | P2 | TS6 migration | Plan a real TypeScript 6+ module-resolution migration package instead of silencing the deprecation warning. | Do **not** add `ignoreDeprecations: "6.0"` while repo is pinned to TS 5.9.3. |
| U16 | NOW | P1 | Documentation / evidence flow | Establish and maintain a pristine documentation flow for review/demo readiness. | Evidence-flow record exists; remaining work is keeping release/readiness, blueprint, and evidence docs aligned to current truth. |
| U17 | NOW | P1 | Stage 3 soak evidence pack | Prepare the exact minimum evidence pack Sentinel expects for Stage 3 soak submission. | Must include HEADs, authorization boundary, build/test proof, VSIX/version, and explicit open-item truth. |
| U18 | WATCH | P1 | ARC roadmap reconciliation | Retain `ARC-BLUEPRINT-001` as a future architecture reference and reconcile it with current local-only Lintel scope before any control-plane expansion. | Vercel/Railway/cloud items are not current Stage 3 authority and require separate Axis/Warden gating. |
| U19 | WATCH | P2 | Infrastructure boundary alignment | Define how future Vercel control endpoints and Railway authority services could align with current Lintel behavior without creating premature backend coupling. | Planning only until a new reviewed package opens control-plane expansion. |
| U20 | NEXT | P2 | Roadmap primitive mapping | Map roadmap concepts such as plan artifacts, execution tokens, run board, and modes to existing Lintel primitives. | Must stay descriptive first and avoid widening current runtime or authority scope. |

---

## B. New Ideas Captured During Deep Audit

These are discussion-derived ideas worth retaining, but not yet accepted as immediate execution scope.

| ID | Status | Priority | Idea | Why it matters |
|---|---|---:|---|---|
| N01 | NEXT | P2 | Persist local active-task selection in a tiny local ARC state file or equivalent bounded store. | Prevents losing operator context across reloads while remaining local-only. |
| N02 | LATER | P3 | Task Board progress summary (`x/y tasks complete`) once blueprint task parsing lands. | Gives a clearer execution picture without making tasks authoritative. |
| N03 | LATER | P3 | “Create from template, then open for edit” blueprint bootstrap shortcut. | Reduces first-run friction while preserving explicit confirmation. |
| N04 | WATCH | P3 | Distinguish “wrong root” empty state from “no blueprint yet” empty state. | Avoids misleading new users when blueprint artifacts exist in a nested root. |
| N05 | LATER | P3 | Auto-generate a compact evidence index from blueprint, build, test, and release state. | Reduces documentation drift and improves review readiness. |
| N06 | LATER | P3 | Run board alignment | Explore how roadmap run-board states could map to current review/task-board surfaces without inventing premature orchestration UI. | Keeps future UX direction visible while preserving current bounded scope. |
| N07 | LATER | P3 | Mode-system alignment | Explore how roadmap modes (`Inspect`, `Plan`, `Act`, `Review` and task modes like `ORGANIZE/CLEAN/REFACTOR/BUILD`) could map to current ARC XT workflows. | Preserves architecture direction without making mode claims before implementation. |

---

## C. Already Landed in Current Slice

| ID | Status | Description |
|---|---|---|
| D01 | DONE | Current plan-linked save prompt/guided workflow aligned to real SOP order. |
| D02 | DONE | `docs/PLAN-LINKED-SAVE-SOP.md` created as canonical operator workflow of record. |
| D03 | DONE | Active blueprint `ARCXT-UX-002` created to hold thread-audited follow-on work. |
| D04 | DONE | Work order `WO-ARC-XT-M4-001` issued for first-run bootstrap and root-aware onboarding. |
| D05 | DONE | `docs/records/ARCXT-STAGE3-EVIDENCE-FLOW.md` created as the documentation/evidence flow of record. |
| D06 | DONE | `docs/RELEASE-READINESS.md` and `docs/H-007-TEST-INFRASTRUCTURE-GAP.md` reconciled to current Stage 3 truth. |
| D07 | DONE | `docs/records/ARC-BLUEPRINT-001-INTEGRATED-ROADMAP-REFERENCE.md` retained the integrated ARC roadmap as future reference without widening Stage 3 authority. |
| D08 | DONE | Roadmap-derived future alignment items were captured in the todo ledger and active blueprint instead of being left only in thread history. |

---

## D. Suggested Execution Order

1. **U01–U06** — root-aware onboarding/bootstrap package (`WO-ARC-XT-M4-001`)
2. **U16–U17** — documentation/evidence hygiene and Stage 3 soak pack readiness
3. **U07–U11** — blueprint-backed task/todo layer
4. **U12–U20 / N01–N07** — workflow friction, roadmap reconciliation, infrastructure planning, and quality-of-life refinements

---

## References

- Active blueprint: `.arc/blueprints/ARCXT-UX-002.md`
- Work order: `docs/work-orders/WO-ARC-XT-M4-001-first-run-bootstrap-and-root-aware-blueprint-onboarding.md`
- Current SOP: `docs/PLAN-LINKED-SAVE-SOP.md`
- Stage hardening ledger: `HARDENING-BACKLOG.md`
- Evidence-flow record: `docs/records/ARCXT-STAGE3-EVIDENCE-FLOW.md`
- Roadmap reference: `docs/records/ARC-BLUEPRINT-001-INTEGRATED-ROADMAP-REFERENCE.md`

