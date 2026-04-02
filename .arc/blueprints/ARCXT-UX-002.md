# ARC Blueprint: ARCXT-UX-002

**Directive ID:** ARCXT-UX-002

> Status: ACTIVE
> Audit Basis: Thread audit — 2026-04-02
> Current Focus: Plan-linked save SOP alignment plus thread-derived UX carry-forward

## Objective

Align the current ARC XT plan-linked save workflow to the extension's actual enforcement behavior, then capture the remaining thread-audited UX and onboarding gaps in one active local blueprint so the next saves and follow-on work use a truthful governed path.

This directive exists because the thread audit showed a mismatch between operator expectation and current enforcement truth:
- the save prompt was starting at Change ID without making root/config prerequisites explicit
- the Task Board can remain pinned to the wrong governed root in nested-repo layouts
- empty-state flows are too dead-end for first-run operators
- blueprint-backed task/todo workflow for local model context has been discussed but is not yet implemented

## Scope

This directive covers the current local UX/sop correction package in `projects/lintel` and the follow-on thread-audited work items that remain open.

Current slice includes:
- `src/extension.ts` — plan-linked save prompt/help alignment
- `src/ui/webview/GuidedProofWorkflow.ts` — workflow reordered to match current SOP
- `tests/governance/arcUi001c-proofWorkflow.test.ts` — governance coverage for SOP order
- `docs/PLAN-LINKED-SAVE-SOP.md` — current operator workflow of record

Follow-on work tracked under this blueprint includes:
- first-run bootstrap and governed-root selection
- Task Board root rebinding and empty-state improvements
- safe config/bootstrap guidance for new users
- blueprint task/todo extraction for operator workflow
- bounded task-context injection for local model use

## Constraints

- Blueprint proof remains the authority for `REQUIRE_PLAN`; a todo list must never become the authorizing object.
- ARC XT must remain local-only, fail-closed, and non-authorizing outside the existing proof model.
- No silent governed-root switching.
- No auto-creation of config or blueprint files without explicit operator confirmation.
- No lane enablement by default.
- No shared/team blueprint handling in this package.
- H-001 and H-002 remain hardening backlog items and are not closed by this directive.

## Acceptance Criteria

1. The current save flow truthfully guides the operator through the actual SOP order:
   **Governed Root → Config → Change ID → Blueprint → Save Blueprint → Re-save Governed File → Review**.
2. The active blueprint records the thread-audited incomplete work instead of leaving it only in chat history.
3. Remaining UX/onboarding work is broken into concrete execution tasks for follow-on implementation.
4. Any future todo/task layer remains blueprint-backed, local-only, and non-authorizing.
5. The directive remains valid as a local proof artifact and does not contain template placeholders.

## Rollback Note

If this execution slice must be reverted:

1. Revert the current SOP alignment changes in `src/extension.ts`, `src/ui/webview/GuidedProofWorkflow.ts`, and related tests/docs.
2. Remove this blueprint only if a replacement directive is created immediately; do not leave the save path without an active local proof record for the follow-on package.
3. Preserve `WO-ARC-XT-M4-001` and the hardening backlog as the retained thread audit evidence.

## Thread Audit — Completed in Current Slice

- [x] Plan-linked save prompt now names the Change ID step explicitly.
- [x] Blocked save paths now offer bounded recovery/help choices.
- [x] Guided Proof Workflow now reflects the real SOP order.
- [x] The current operator SOP is documented in `docs/PLAN-LINKED-SAVE-SOP.md`.

## Thread Audit — Uncompleted Work to Carry Forward

- [ ] Add first-run bootstrap that detects governed root and offers explicit root selection when ambiguous.
- [ ] Let the Task Board rebind to the correct active governed root instead of remaining pinned to initial activation root.
- [ ] Upgrade Task Board empty state with bounded actions such as Review Governed Root, Create Minimal ARC Config, and Create First Blueprint.
- [ ] Generalize first blueprint setup for new users instead of assuming LINTEL-specific naming.
- [ ] Add a canonical `## Tasks` section convention for blueprint-backed work tracking.
- [ ] Parse blueprint tasks/todos into extension-visible task context without making them authoritative.
- [ ] Allow bounded active-task selection so the local model can reason against the selected task context only.
- [ ] Keep model/task work local-only and subordinate to rule floors, blueprint proof, and audit requirements.

## Tasks

- [x] T1 — Audit the thread instructions and identify which UX/SOP items remain incomplete.
- [x] T2 — Align the current save prompt and guided workflow to the enforced ARC XT SOP.
- [x] T3 — Record the current SOP in a canonical local doc for operators.
- [x] T4 — Save a new active blueprint that captures the incomplete work from the thread audit.
- [ ] T5 — Implement `WO-ARC-XT-M4-001` first-run bootstrap and governed-root selection.
- [ ] T6 — Fix Task Board root rebinding and empty-state CTA flow.
- [ ] T7 — Define and implement blueprint-backed task/todo parsing.
- [ ] T8 — Add bounded active-task context injection for local model evaluation.
- [ ] T9 — Re-verify that all follow-on work preserves local-only, fail-closed, non-authorizing governance boundaries.

## Evidence

- Thread audit captured 2026-04-02 across Axis/Forge/Sentinel exchanges
- Work order retained at `docs/work-orders/WO-ARC-XT-M4-001-first-run-bootstrap-and-root-aware-blueprint-onboarding.md`
- Current SOP retained at `docs/PLAN-LINKED-SAVE-SOP.md`
- Open hardening items retained in `HARDENING-BACKLOG.md`
