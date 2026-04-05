# ARCXT-UX-002 — Thread-Derived Todo Ledger

**Directive ID:** `ARCXT-UX-002`  
**Status:** ACTIVE  
**Maintainer:** Forge (under Axis review)  
**Last Reviewed:** 2026-04-04  
**Purpose:** Preserve unfinished work, discussion-derived ideas, follow-on feature requests, and deep-research-derived planning tracks from the active ARC XT workflow thread so they are not lost between execution slices.

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

Canonical records placement is defined in:

- `docs/records/README.md`

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

| ID  | Status | Priority | Theme                             | Description                                                                                                                                                     | Notes / Exit Signal                                                                                                              |
| --- | ------ | -------: | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| U01 | DONE   |       P1 | First-run bootstrap               | Detect first-run / misconfigured-root conditions and surface a bounded bootstrap entry point.                                                                   | New users should not land in an empty or misleading state with no guided next action.                                            |
| U02 | DONE   |       P1 | Governed-root selection           | Detect candidate governed roots (workspace root, nested repo root, active-file root) and require explicit choice when ambiguous.                                | No silent root switching. Must remain transparent and local-only.                                                                |
| U03 | DONE   |       P1 | Task Board rebinding              | Let the Task Board and review surfaces rebind to the correct active governed root instead of staying pinned to initial activation root.                         | Fixes empty-board-in-monorepo failure mode seen in current workflow.                                                             |
| U04 | DONE   |       P1 | Empty-state recovery              | Upgrade Task Board empty state with bounded actions: Review Governed Root, Create Minimal ARC Config, Create First Blueprint, Use Existing ARC Config.          | Empty state should guide, not dead-end.                                                                                          |
| U05 | DONE   |       P1 | Safe config bootstrap             | Add explicit, non-destructive creation flow for `.arc/router.json` and `.arc/workspace-map.json` with fail-closed defaults.                                     | Must preserve `RULE_ONLY`, `local_lane_enabled=false`, `cloud_lane_enabled=false`.                                               |
| U06 | DONE   |       P1 | First blueprint setup             | Generalize first blueprint creation for new users instead of assuming LINTEL-specific naming.                                                                   | Suggested IDs may use workspace/project slug patterns.                                                                           |
| U07 | DONE   |       P1 | Blueprint task schema             | Define a canonical `## Tasks` blueprint convention that the extension can parse safely.                                                                         | Must be blueprint-backed and optional until adopted.                                                                             |
| U08 | DONE   |       P1 | Task parsing                      | Parse blueprint tasks/todos into extension-visible task state and Task Board summaries.                                                                         | Task list must remain advisory; blueprint remains proof authority.                                                               |
| U09 | DONE   |       P1 | Active task selection             | Allow bounded active-task selection for operator context.                                                                                                       | Selection must be local-only and never authorize saves on its own.                                                               |
| U10 | DONE   |       P1 | Local model context               | Inject bounded task context (`task_id`, `task_summary`, `task_status`) into local model evaluation only after an active task is explicitly selected.            | Must not widen model scope or bypass rule floor.                                                                                 |
| U11 | DONE   |       P1 | Governance safety                 | Add tests proving todo/task features stay non-authorizing, local-only, fail-closed, and subordinate to blueprint proof.                                         | Required before any broader rollout of task-led workflow.                                                                        |
| U12 | LATER  |       P2 | Commit linkage                    | Improve commit linkage when no active file is open or when a commit spans multiple files.                                                                       | Current `NO_LINKED_DECISION` behavior is truthful but ergonomically limited.                                                     |
| U13 | LATER  |       P2 | Blocked-save recovery             | Add a direct blocked-save recovery path such as “Open Current Blueprint” / “Resume SOP” from the save failure flow.                                             | Derived from current operator friction during `REQUIRE_PLAN` saves.                                                              |
| U14 | LATER  |       P2 | Task Board guidance               | Show active Change ID / blueprint and next required operator action directly in the Task Board.                                                                 | Helps operators understand why saves are blocked and what to do next.                                                            |
| U15 | WATCH  |       P2 | TS6 migration                     | Plan a real TypeScript 6+ module-resolution migration package instead of silencing the deprecation warning.                                                     | Do **not** add `ignoreDeprecations: "6.0"` while repo is pinned to TS 5.9.3.                                                     |
| U16 | DONE   |       P1 | Documentation / evidence flow     | Establish and maintain a pristine documentation flow for review/demo readiness.                                                                                 | Evidence-flow record exists; remaining work is keeping release/readiness, blueprint, evidence, and rollout docs aligned to truth. |
| U17 | DONE   |       P1 | Stage 3 soak evidence pack        | Prepare the exact minimum evidence pack Sentinel expects for Stage 3 soak submission.                                                                           | Completed and accepted; retained in `docs/records/evidence/U17-STAGE3-SOAK-EVIDENCE-PACK.md`.                                             |
| U18 | WATCH  |       P1 | ARC roadmap reconciliation        | Retain `ARC-BLUEPRINT-001` as a future architecture reference and reconcile it with current local-only Lintel scope before any control-plane expansion.         | Vercel/Railway/cloud items are not current Stage 4 authority and require separate Axis/Warden gating.                            |
| U19 | WATCH  |       P2 | Infrastructure boundary alignment | Define how future Vercel control endpoints and Railway authority services could align with current Lintel behavior without creating premature backend coupling. | Planning only until a new reviewed package opens control-plane expansion.                                                        |
| U20 | NEXT   |       P2 | Roadmap primitive mapping         | Map roadmap concepts such as plan artifacts, execution tokens, run board, and modes to existing Lintel primitives.                                              | Must stay descriptive first and avoid widening current runtime or authority scope.                                               |
| U21 | LATER  |     High | Threat model mapping              | Map roadmap threat model to implementation plan; define concrete test cases for ARC threat surface.                                                             | Axis review required; reference: `docs/records/strategy/ARC-BLUEPRINT-001-reconciliation-matrix.md`.                            |
| U22 | LATER  |     High | Trust boundary                    | Define integrity-state model for anti-tamper hardening; map current audit chain to trust boundary requirements.                                                 | WARDEN standing-condition alignment.                                                                                             |
| U23 | LATER  |     High | Plan-as-Code reconciliation       | Reconcile `.arc/plans/` vs `.arc/blueprints/` paths; define canonical artifact location for future Plan-as-Code expansion.                                      | Must not disrupt current blueprint proof model.                                                                                  |
| U24 | LATER  |   Medium | HUD / Events                      | Map Guardian HUD / event architecture to current UX surfaces (Task Board, review home, output channels).                                                        | Keep current Task Board minimal; HUD mapping is design-only until new rollout.                                                   |
| U25 | LATER  |   Medium | Policy pack v1                    | Map protected surfaces to current rule engine; define default policy pack for future expansion.                                                                 | Must not weaken current deterministic enforcement.                                                                               |
| U26 | LATER  |     High | Override governance               | Review emergency "Save Anyway (Logged)" vs current fail-closed posture; requires explicit Axis/Warden policy review.                                            | Current fail-closed posture remains binding until new review.                                                                    |
| U27 | LATER  |   Medium | Lean / Anti-Bloat                 | Reconcile adaptive governance tiers with current rule-first Lintel behavior; prevent ARC from becoming a chat tool.                                             | Axis ruling: "Lean anti-bloat rules are defined" — track for future rollout.                                                     |
| U28 | LATER  |      Low | Authority backend                 | Define Vercel/Railway boundary package for future expansion; capture current local-only baseline for contrast.                                                  | Defer to future authority track; not current Stage 4 scope.                                                                      |
| U29 | DONE   |       P1 | Public asset alignment            | Align Marketplace, landing, and public docs around a concrete value statement ("catches risky AI-generated code before save/commit"), explicit Open VSX parity, and plain-language proof explanation. | Must stay truthful to current Stage 4 internal posture; no public-release implication without a separate package. |
| U30 | DONE   |       P1 | ARC-specific trust pages          | Create ARC-specific security, privacy, DPA, and procurement-facing pages separate from DocSmith/payroll material.                                               | Required before regulated-enterprise or bank outreach.                                                                           |
| U31 | DONE   |       P1 | Telemetry contract                | Publish a privacy-first telemetry contract and bounded event schema: no code, prompts, diffs, or content telemetry; event metadata only, opt-in.               | Must preserve local-first posture and remain non-authorizing.                                                                    |
| U32 | DONE   |       P1 | 10-minute evaluation path         | Create a guided first-run demo / quick evaluation path that shows WARN → REQUIRE_PLAN → BLOCK with clear value before friction.                                 | Distinct from bootstrap; should prove value quickly for new users.                                                               |
| U33 | LATER  |     High | Override / dispute workflow       | Design override-with-reason and rule-dispute capture as explicit, auditable workflows.                                                                          | Requires policy review; must not weaken current fail-closed posture by default.                                                  |
| U34 | WATCH  |     High | Enterprise distribution pack      | Define signed releases, checksum publication, private-marketplace / rehost guidance, offline/on-prem distribution posture, and procurement pack contents.       | Public/enterprise gate only; not required for current Stage 4 internal rollout.                                                  |
| U35 | WATCH  |   Medium | Pricing / packaging validation    | Validate Free / Pro / Team / Enterprise packaging and willingness-to-pay assumptions against real retention and interview evidence.                              | Planning only until usage metrics and interviews exist.                                                                          |
| U36 | DONE   |       P1 | Privacy-safe retention metrics    | Define local-first, privacy-safe retention and engagement metrics (3-day retention, save-gate engagement, override/dispute rate, latency).                      | Must be grounded in the telemetry contract and remain optional/opt-in.                                                           |
| U37 | DONE   |       P1 | System coherence protocol         | Define ARC as one coherent system across all surfaces: single derived truth, no signal collision, progressive disclosure, and calm→precise→strict behavior.     | Reference: `docs/records/strategy/ARC-SYS-COHERENCE-001.md`; must not add noisy or contradictory UX.                                     |
| U38 | DONE   |       P1 | EvaluationResult contract         | Define `EvaluationResult` / signal-consistency contract as the shared source for severity, decision, explanation, and surface rendering across ARC.              | Must preserve single derived state and avoid conflicting reasons across gutter/status/hover/panel/modal.                         |
| U39 | NEXT   |       P1 | Prompt injection firewall mapping | Map `S1 Prompt Injection Firewall` into current local-only Lintel scope and decide what can be adopted now vs deferred.                                          | Must stay control-plane only and not become a runtime filter engine beyond reviewed boundaries.                                  |
| U40 | NEXT   |       P1 | Tool boundary enforcer mapping    | Map `S3 Tool Boundary Enforcer` to current adapter/tool boundaries, path restrictions, and allowlist posture.                                                   | Must not widen ARC into execution authority; validation only.                                                                    |
| U41 | NEXT   |       P1 | Lifecycle/state transition map    | Map `S6/S11` directive lifecycle guard and governed state transitions to current proof, audit, and save-governance behavior.                                    | Must preserve current fail-closed proof model and audit chain.                                                                   |
| U42 | NEXT   |       P1 | Context engineering guard         | Define `S7 Context Engineering Guard` for bounded local context packets, trusted/untrusted separation, and policy-preserving handoff.                            | Must preserve no-content telemetry and local-only boundaries.                                                                    |
| U43 | WATCH  |       P1 | Retrieval/RAG guard deferment     | Explicitly defer `S8 Retrieval / RAG Guard` until retrieval enters reviewed scope; retain denial/default-out-of-scope posture in canon.                          | Retrieval remains out of current Stage 4 runtime scope.                                                                          |
| U44 | LATER  |       P2 | Governed debug flow               | Define `S9 SDLC Debug Governance` as a future governed-debug workflow.                                                                                          | Must not turn ARC into an orchestration runtime or freeform fixer.                                                               |
| U45 | NEXT   |       P1 | Vault vs EventStream continuity   | Reconcile `S4 Vault` and `S12 EventStream Continuity` with current audit log, evidence flow, and trust-boundary posture.                                        | Must distinguish local record vs future authority-backed continuity.                                                             |
| U46 | NEXT   |       P1 | Security canvas reconciliation    | Produce `ARC-BLUEPRINT-SECURITY-001` reconciliation matrix: adopt now / track / defer / reject.                                                                 | Reference record only until matrix exists.                                                                                       |
| U47 | LATER  |       P2 | Historical-record migration       | Migrate retained legacy root-level records into the sectioned `docs/records/` canon only when references can be updated safely.                                 | Keep audit traceability; do not churn historical references without a bounded migration package.                                 |

---

## B. New Ideas Captured During Deep Audit

These are discussion-derived ideas worth retaining, but not yet accepted as immediate execution scope.

| ID  | Status | Priority | Idea                                                                                            | Why it matters                                                                                                                                            |
| --- | ------ | -------: | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| N01 | NEXT   |       P2 | Persist local active-task selection in a tiny local ARC state file or equivalent bounded store. | Prevents losing operator context across reloads while remaining local-only.                                                                               |
| N02 | LATER  |       P3 | Task Board progress summary (`x/y tasks complete`) once blueprint task parsing lands.           | Gives a clearer execution picture without making tasks authoritative.                                                                                     |
| N03 | LATER  |       P3 | “Create from template, then open for edit” blueprint bootstrap shortcut.                        | Reduces first-run friction while preserving explicit confirmation.                                                                                        |
| N04 | WATCH  |       P3 | Distinguish “wrong root” empty state from “no blueprint yet” empty state.                       | Avoids misleading new users when blueprint artifacts exist in a nested root.                                                                              |
| N05 | LATER  |       P3 | Auto-generate a compact evidence index from blueprint, build, test, and release state.          | Reduces documentation drift and improves review readiness.                                                                                                |
| N06 | LATER  |       P3 | Run board alignment                                                                             | Explore how roadmap run-board states could map to current review/task-board surfaces without inventing premature orchestration UI.                        | Keeps future UX direction visible while preserving current bounded scope.          |
| N07 | LATER  |       P3 | Mode-system alignment                                                                           | Explore how roadmap modes (`Inspect`, `Plan`, `Act`, `Review` and task modes like `ORGANIZE/CLEAN/REFACTOR/BUILD`) could map to current ARC XT workflows. | Preserves architecture direction without making mode claims before implementation. |

---

## C. Already Landed in Current Slice

| ID  | Status | Description                                                                                                                                                  |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D01 | DONE   | Current plan-linked save prompt/guided workflow aligned to real SOP order.                                                                                   |
| D02 | DONE   | `docs/PLAN-LINKED-SAVE-SOP.md` created as canonical operator workflow of record.                                                                             |
| D03 | DONE   | Active blueprint `ARCXT-UX-002` created to hold thread-audited follow-on work.                                                                               |
| D04 | DONE   | Work order `WO-ARC-XT-M4-001` issued for first-run bootstrap and root-aware onboarding.                                                                      |
| D05 | DONE   | `docs/records/evidence/ARCXT-STAGE3-EVIDENCE-FLOW.md` created as the documentation/evidence flow of record.                                                           |
| D06 | DONE   | `docs/RELEASE-READINESS.md` and `docs/H-007-TEST-INFRASTRUCTURE-GAP.md` reconciled to current release truth.                                                  |
| D07 | DONE   | `docs/records/strategy/ARC-BLUEPRINT-001-roadmap-reference.md` retained the integrated ARC roadmap as future reference without widening current rollout authority. |
| D08 | DONE   | Roadmap-derived future alignment items were captured in the todo ledger and active blueprint instead of being left only in thread history.                   |
| D09 | DONE   | Stage 3 soak evidence pack completed and accepted; retained in `docs/records/evidence/U17-STAGE3-SOAK-EVIDENCE-PACK.md`.                                             |
| D10 | DONE   | `docs/records/strategy/ARC-BLUEPRINT-001-reconciliation-matrix.md` mapped the roadmap into Adopt/Track/Defer/Reject buckets.                                         |
| D11 | DONE   | `docs/records/reviews/ARC-DEEP-RESEARCH-AXIS-REVIEW.md` captured Axis review of the deep research report and mapped new planning tracks into canon.                |
| D12 | DONE   | `docs/records/strategy/ARC-SYS-COHERENCE-001.md` retained the missing system-coherence protocol and linked it into the active blueprint/todo canon.                 |
| D13 | DONE   | Formal approval-grade coherence addendum reviewed and merged into `docs/records/strategy/ARC-SYS-COHERENCE-001.md` with Axis boundary rewording for current canon. |
| D14 | DONE   | `docs/records/strategy/ARC-BLUEPRINT-SECURITY-001-reference.md` retained the security and governance enforcement canvas as a reference record for future reconciliation.      |
| D15 | DONE   | Active records were reorganized into a sectioned canon (`directives/`, `evidence/`, `strategy/`, `reviews/`, `research/`) and indexed in `docs/records/README.md`. |

---

## D. Suggested Execution Order

1. **U29–U32/U36** — documentation, public asset clarity, telemetry contract, quick-evaluation flow, and privacy-safe metric design
2. **U16 / U29–U32 / U36** — documentation, public asset clarity, telemetry contract, quick-evaluation flow, and privacy-safe metric design
3. **U37–U38 / U24 / U27 / U39–U42 / U45–U46** — coherence, shared evaluation contract, HUD/event behavior, and security-control-plane reconciliation
4. ~~**U07–U11** — blueprint-backed task/todo layer~~ ✅ DONE
5. **U12–U28 / U33–U35 / U43–U44 / N01–N07** — workflow friction, roadmap reconciliation, enterprise/trust packaging, security deferments, and quality-of-life refinements

---

## References

- Active blueprint: `.arc/blueprints/ARCXT-UX-002.md`
- Work order: `docs/work-orders/WO-ARC-XT-M4-001-first-run-bootstrap-and-root-aware-blueprint-onboarding.md`
- Current SOP: `docs/PLAN-LINKED-SAVE-SOP.md`
- Stage hardening ledger: `HARDENING-BACKLOG.md`
- Records canon: `docs/records/README.md`
- Evidence-flow record: `docs/records/evidence/ARCXT-STAGE3-EVIDENCE-FLOW.md`
- Roadmap reference: `docs/records/strategy/ARC-BLUEPRINT-001-roadmap-reference.md`
- Security reference: `docs/records/strategy/ARC-BLUEPRINT-SECURITY-001-reference.md`
- Deep research review: `docs/records/reviews/ARC-DEEP-RESEARCH-AXIS-REVIEW.md`
- System coherence record: `docs/records/strategy/ARC-SYS-COHERENCE-001.md`

---

## U01–U06 Closure Record (2026-04-04)

All 6 items closed. WO-ARC-XT-M4-001 accepted by Axis after 3 review rounds.

Gaps closed:
- Gap 1: Workspace folder root handoff from targeting logic
- Gap 2: Truthful Workspace Root item wording
- Gap 3: AC5/AC7 placeholder tests replaced with source-inspection assertions

Axis verdict: APPROVED WITH CONDITIONS (conditions satisfied)

---

## U07–U11 Closure Record (2026-04-05)

All 5 items closed. Directive D-MNLJ3B4J executed, token T-58C683BB-MNLJ3HLN authorized.

Implementation delivered:
- U07: `## Tasks` blueprint convention in `src/core/blueprintArtifacts.ts`
- U08: Task parsing into Task Board summaries in `src/extension/reviewSurfaces.ts`
- U09: Bounded active-task selection (`arc.selectTask`, `arc.clearActiveTask`)
- U10: Local model context injection (Warden C1-C5 compliant)
- U11: Governance safety tests (9 tests, all passing)

Warden pre-clearance verdict:
- C1: Only task_id, task_summary, task_status — PASS
- C2: Explicit user-initiated selection — PASS
- C3: Local-model-only, cloud excluded — PASS
- C4: Rule floor untouched — PASS
- C5: Advisory only, no save auth effect — PASS

Test results: 71 files / 565 tests passing (556 → 565, +9 new governance safety tests)

Axis verdict: APPROVED (deferred final clearance pending Codex recovery)

SENTINEL verdict: PASS (all code/files/tests verified)
WARDEN verdict: PASS (C1-C5 binding conditions satisfied)
