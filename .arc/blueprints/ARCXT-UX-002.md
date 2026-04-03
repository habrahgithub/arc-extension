# ARC Blueprint: ARCXT-UX-002

**Directive ID:** ARCXT-UX-002

> Status: ACTIVE
> Audit Basis: Thread audit — 2026-04-02 through 2026-04-03
> Current Focus: Plan-linked save SOP alignment, root-aware onboarding, blueprint-backed todo workflow capture, and retained roadmap reconciliation

## Objective

Align the current ARC XT plan-linked save workflow to the extension's actual enforcement behavior, then preserve the remaining thread-audited UX, onboarding, and task-led workflow gaps in one active local blueprint so no discussed work is lost between execution slices.

This directive exists because the thread audit showed a mismatch between operator expectation and current enforcement truth:

- the save prompt was starting at Change ID without making root/config prerequisites explicit
- the Task Board can remain pinned to the wrong governed root in nested-repo layouts
- empty-state flows are too dead-end for first-run operators
- blueprint-backed task/todo workflow for local model context has been discussed but is not yet implemented
- discussion-derived follow-on ideas were at risk of living only in chat history instead of a maintained local artifact

## Scope

This directive covers the current local UX/SOP correction package in `projects/lintel` and the follow-on thread-audited work items that remain open.

Current slice includes:

- `src/extension.ts` — plan-linked save prompt/help alignment
- `src/ui/webview/GuidedProofWorkflow.ts` — workflow reordered to match current SOP
- `tests/governance/arcUi001c-proofWorkflow.test.ts` — governance coverage for SOP order
- `docs/PLAN-LINKED-SAVE-SOP.md` — current operator workflow of record
- `docs/records/ARCXT-UX-002-TODO-LEDGER.md` — maintained discussion-derived todo ledger
- `docs/records/ARCXT-STAGE3-EVIDENCE-FLOW.md` — documentation/evidence flow of record for Stage 3
- `docs/records/ARC-BLUEPRINT-001-INTEGRATED-ROADMAP-REFERENCE.md` — retained future ARC roadmap reference

Follow-on work tracked under this blueprint includes:

- first-run bootstrap and governed-root selection
- Task Board root rebinding and empty-state improvements
- safe config/bootstrap guidance for new users
- blueprint task/todo extraction for operator workflow
- bounded task-context injection for local model use
- discussion-derived workflow improvements that remain local-only and non-authorizing
- roadmap-derived future architecture reconciliation work that remains planning-only until separately approved

## Constraints

- Blueprint proof remains the authority for `REQUIRE_PLAN`; a todo list must never become the authorizing object.
- ARC XT must remain local-only, fail-closed, and non-authorizing outside the existing proof model.
- No silent governed-root switching.
- No auto-creation of config or blueprint files without explicit operator confirmation.
- No lane enablement by default.
- No shared/team blueprint handling in this package.
- No task/todo feature may bypass rule floors, route policy, audit requirements, or WARDEN standing conditions.
- The retained roadmap reference is non-authoritative for current Stage 3 scope and must not be used to justify backend/cloud/control-plane expansion without a new reviewed package.
- H-001 and H-002 remain hardening backlog items and are not closed by this directive.

## Acceptance Criteria

1. The current save flow truthfully guides the operator through the actual SOP order:
   **Governed Root → Config → Change ID → Blueprint → Save Blueprint → Re-save Governed File → Review**.
2. The active blueprint records the thread-audited incomplete work instead of leaving it only in chat history.
3. A maintained todo ledger captures unfinished work and new discussion-derived ideas in a canonical local artifact.
4. Remaining UX/onboarding work is broken into concrete execution tasks for follow-on implementation.
5. Any future todo/task layer remains blueprint-backed, local-only, and non-authorizing.
6. The directive remains valid as a local proof artifact and does not contain template placeholders.

## Rollback Note

If this execution slice must be reverted:

1. Revert the current SOP alignment changes in `src/extension.ts`, `src/ui/webview/GuidedProofWorkflow.ts`, and related tests/docs.
2. Remove this blueprint only if a replacement directive is created immediately; do not leave the save path without an active local proof record for the follow-on package.
3. Preserve `WO-ARC-XT-M4-001`, `docs/records/ARCXT-UX-002-TODO-LEDGER.md`, and the hardening backlog as retained thread-audit evidence.

## Workflow of Record

Manual operator flow remains:

**Governed Root → Config → Change ID → Blueprint → Save Blueprint → Re-save Governed File → Review**

Reference: `docs/PLAN-LINKED-SAVE-SOP.md`

## Maintained Todo Ledger

Canonical discussion-derived backlog:

- `docs/records/ARCXT-UX-002-TODO-LEDGER.md`

Maintenance rule:

- new materially discussed work items must be recorded in the todo ledger and reflected here before they are considered part of the active governed package
- the todo ledger is operational context only; it does not authorize saves

## Thread Audit — Completed in Current Slice

- [x] Plan-linked save prompt now names the Change ID step explicitly.
- [x] Blocked save paths now offer bounded recovery/help choices.
- [x] Guided Proof Workflow now reflects the real SOP order.
- [x] The current operator SOP is documented in `docs/PLAN-LINKED-SAVE-SOP.md`.
- [x] A maintained discussion-derived todo ledger now exists in `docs/records/ARCXT-UX-002-TODO-LEDGER.md`.
- [x] The documentation/evidence flow is recorded in `docs/records/ARCXT-STAGE3-EVIDENCE-FLOW.md`.
- [x] `docs/RELEASE-READINESS.md` and `docs/H-007-TEST-INFRASTRUCTURE-GAP.md` were reconciled to current Stage 3 truth.
- [x] `docs/records/ARC-BLUEPRINT-001-INTEGRATED-ROADMAP-REFERENCE.md` retains the integrated ARC roadmap as future reference without widening Stage 3 authority.
- [x] Roadmap-derived future alignment items are now tracked in the todo ledger and this blueprint.

## Thread Audit — Detailed Carry-Forward Work

### Root-aware onboarding and first-run bootstrap

- [ ] U01 — Detect first-run / misconfigured-root conditions and surface a bounded bootstrap entry point.
- [ ] U02 — Detect candidate governed roots and require explicit choice when ambiguous.
- [ ] U03 — Let the Task Board and review surfaces rebind to the correct active governed root.
- [ ] U04 — Upgrade the Task Board empty state with bounded recovery actions.
- [ ] U05 — Add safe, explicit config bootstrap for `.arc/router.json` and `.arc/workspace-map.json`.
- [ ] U06 — Generalize first blueprint creation for new users instead of assuming LINTEL-specific naming.

### Blueprint-backed todo / task workflow

- [ ] U07 — Define a canonical `## Tasks` blueprint convention that can be parsed safely.
- [ ] U08 — Parse blueprint tasks/todos into extension-visible task state and Task Board summaries.
- [ ] U09 — Allow bounded active-task selection for operator context.
- [ ] U10 — Inject bounded task context into local model evaluation only after explicit task selection.
- [ ] U11 — Add tests proving todo/task features stay local-only, non-authorizing, and fail-closed.

### Workflow friction and follow-up ideas retained from discussion

- [ ] U12 — Improve commit linkage when no active file is open or when a commit spans multiple files.
- [ ] U13 — Add blocked-save recovery shortcuts such as “Open Current Blueprint” / “Resume SOP”.
- [ ] U14 — Show active Change ID / blueprint and next required operator action directly in the Task Board.
- [ ] U15 — Stage a real TypeScript 6+ module-resolution migration package instead of a silencing patch.
- [ ] U16 — Maintain the documentation/evidence flow so blueprint, release, and evidence docs stay aligned to current truth.
- [ ] U17 — Prepare the exact minimum Stage 3 soak evidence pack Sentinel expects before next gate escalation.
- [ ] U18 — Reconcile `ARC-BLUEPRINT-001` future architecture direction with current local-only Lintel scope before any control-plane expansion.
- [ ] U19 — Define how future Vercel/Railway infrastructure boundaries could align with current Lintel behavior without premature coupling.
- [ ] U20 — Map roadmap concepts such as plan artifacts, execution tokens, run board, and modes to existing Lintel primitives.

### ARC-BLUEPRINT-001 Reconciliation Tracks (Axis 2026-04-03)

- [ ] U21 — Map roadmap threat model to implementation plan; define concrete test cases for ARC threat surface.
- [ ] U22 — Define integrity-state model for anti-tamper hardening; map current audit chain to trust boundary requirements.
- [ ] U23 — Reconcile `.arc/plans/` vs `.arc/blueprints/` paths; define canonical artifact location for future Plan-as-Code.
- [ ] U24 — Map Guardian HUD / event architecture to current UX surfaces (Task Board, review home, output channels).
- [ ] U25 — Map protected surfaces to current rule engine; define default policy pack for future expansion.
- [ ] U26 — Review emergency "Save Anyway (Logged)" vs current fail-closed posture; requires Axis/Warden policy review.
- [ ] U27 — Reconcile adaptive governance tiers with current rule-first Lintel behavior; prevent ARC from becoming a chat tool.
- [ ] U28 — Define Vercel/Railway boundary package for future expansion; capture current local-only baseline for contrast.

**Reconciliation reference:** `docs/records/ARC-BLUEPRINT-001-RECONCILIATION-MATRIX.md`

- [ ] N01 — Consider persisting local active-task selection across reloads in a bounded local ARC state file or equivalent store.
- [ ] N02 — Consider Task Board progress summaries (`x/y tasks complete`) once task parsing lands.
- [ ] N03 — Consider a “create from template, then open for edit” bootstrap shortcut.
- [ ] N04 — Distinguish wrong-root empty state from true no-blueprint empty state.
- [ ] N05 — Consider auto-generating a compact evidence index from blueprint, build, test, and release state.
- [ ] N06 — Consider how roadmap run-board states could map to current review/task-board surfaces without premature orchestration UI.
- [ ] N07 — Consider how roadmap modes (`Inspect`, `Plan`, `Act`, `Review` and `ORGANIZE/CLEAN/REFACTOR/BUILD`) could map to current ARC XT workflows.

## Tasks

- [x] T1 — Audit the thread instructions and identify which UX/SOP items remain incomplete.
- [x] T2 — Align the current save prompt and guided workflow to the enforced ARC XT SOP.
- [x] T3 — Record the current SOP in a canonical local doc for operators.
- [x] T4 — Save a new active blueprint that captures the incomplete work from the thread audit.
- [x] T5 — Create and maintain a canonical todo ledger for discussion-derived unfinished work and new ideas.
- [ ] T6 — Execute `WO-ARC-XT-M4-001` first-run bootstrap and governed-root selection package.
- [ ] T7 — Fix Task Board root rebinding and empty-state CTA flow.
- [ ] T8 — Define and implement blueprint-backed task/todo parsing.
- [ ] T9 — Add bounded active-task context injection for local model evaluation.
- [x] T10 — Establish the documentation/evidence flow record for Stage 3 review readiness.
- [ ] T11 — Prepare the canonical Stage 3 soak evidence pack / summary record.
- [ ] T12 — Reconcile the retained ARC roadmap reference with current Lintel scope and future package boundaries.
- [ ] T13 — Map roadmap primitives and infrastructure-boundary concepts to current Lintel capabilities without widening scope.
- [ ] T14 — Implement selected workflow-friction follow-ups retained in the todo ledger.
- [ ] T15 — Re-verify that all follow-on work preserves local-only, fail-closed, non-authorizing governance boundaries.

## Evidence

- Thread audit captured across Axis/Forge/Sentinel exchanges on 2026-04-02 through 2026-04-03
- Work order retained at `docs/work-orders/WO-ARC-XT-M4-001-first-run-bootstrap-and-root-aware-blueprint-onboarding.md`
- Current SOP retained at `docs/PLAN-LINKED-SAVE-SOP.md`
- Maintained todo ledger retained at `docs/records/ARCXT-UX-002-TODO-LEDGER.md`
- Evidence-flow record retained at `docs/records/ARCXT-STAGE3-EVIDENCE-FLOW.md`
- Roadmap reference retained at `docs/records/ARC-BLUEPRINT-001-INTEGRATED-ROADMAP-REFERENCE.md`
- Open hardening items retained in `HARDENING-BACKLOG.md`
