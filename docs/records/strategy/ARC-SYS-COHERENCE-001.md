# ARC-SYS-COHERENCE-001 — System Coherence Protocol

**Date:** 2026-04-04  
**Reviewer:** Axis  
**Authority Status:** Retained design protocol; not current live runtime authority  
**Purpose:** Prevent ARC from fragmenting into contradictory surfaces or noisy feature clusters as HUD, plan, review, and future task flows evolve.

---

## Interpretation Boundary

This record captures a missing design lock identified during Axis review and strengthened by the formal addendum submitted on 2026-04-04:

> ARC must behave as **one system**, not as a bundle of independent features.

This protocol is now retained in canon as future design guidance.  
It does **not** widen current Stage 4 rollout authority and does **not** by itself authorize runtime changes.

Current live boundary remains:

- local-only
- `enabledByDefault = false`
- operator-configured route policy
- no cloud-lane or public-release expansion without a new reviewed package

---

## Core Law

> ARC must behave as ONE coherent system across all surfaces and moments of interaction.

If ARC produces conflicting signals, contradictory reasons, or too many simultaneous demands, trust breaks even when the underlying rules are technically correct.

---

## 1. Single Derived Truth

Future ARC surfaces should derive from a shared evaluation object:

`EvaluationResult`

This should become the single derived source for:

- severity
- decision
- explanation
- confidence / precision label
- next operator action

It should feed:

- gutter / radar
- status bar
- hover / explanation
- panel / review surface
- modal / save enforcement
- future CLI / CI bridges if adopted

Rule:

> No ARC surface should invent its own independent reason or severity when a shared evaluation already exists.

---

## 2. Unified Decision Model

At a given moment, ARC should converge on:

- one severity
- one decision
- one primary explanation

Canonical decisions remain:

- `ALLOW`
- `WARN`
- `REQUIRE_PLAN`
- `BLOCK`

Violation condition:

> If multiple conflicting live decisions exist for the same file state, ARC has entered a system-integrity breach.

---

## 3. No Signal Collision

All UI and system surfaces should reflect the same underlying state.

| Surface | Must Match |
|---|---|
| Gutter / Radar | `EvaluationResult.severity` |
| Status Bar | `EvaluationResult.decision` |
| Hover | primary explanation / reason |
| Modal | decision + reason |
| Panel / Review | full evaluation context |

Not allowed:

- gutter implies “high risk” while status bar implies “warning only”
- modal gives a different reason than hover/panel
- panel expands into a logic path that contradicts save-time enforcement

Rule:

> Multiple surfaces may reveal different depth, but not different truth.

---

## 4. Progressive Disclosure

ARC should reveal information in layers:

| Level | Surface | Purpose |
|---|---|---|
| L1 | Gutter + Status | Awareness |
| L2 | Hover | Explanation |
| L3 | Panel / Review | Context |
| L4 | Modal | Enforcement |

Rule:

> ARC must not dump full policy logic at first contact.  
> It should escalate disclosure only as operator need and risk increase.

---

## 5. Interaction Posture

The behavioral rhythm should be:

| Phase | Behavior |
|---|---|
| Typing | Invisible / passive |
| Awareness | Subtle / ambient |
| Save boundary | Strict / enforced |

Rule:

> No heavy cognitive interruption should occur during typing when save-time authority has not yet been invoked.

Additional constraint:

> No blocking behavior should occur outside the save boundary in the current Guardian/extension posture.

---

## 6. Evaluation Execution Contract

Future evaluation execution should be:

- deterministic
- stateless per execution cycle
- cached for reuse across all surfaces

Requirements:

- no duplicate evaluations for the same state when reuse is possible
- shared results across rendering layers
- no independent UI-first evaluation path

Rule:

> Performance, trust, and coherence depend on shared evaluation reuse.

---

## 7. Cognitive Flow Guarantee

ARC should preserve a mental contract:

> No surprise, contradiction, or forced policy wall before the save boundary unless there is a concrete high-risk reason.

Failure indicators:

- user confusion
- contradictory signals
- repeated noisy status changes
- enforcement surprise

These are coherence failures even if enforcement is technically “correct.”

---

## 8. Deterministic Behavior Guarantee

Given identical:

- file state
- context
- policy

ARC should produce identical:

- `EvaluationResult`
- visible signals
- enforcement outcome

Rule:

> Identical inputs must not produce contradictory operator experiences.

---

## 9. Fail-Safe Rewording

The submitted addendum proposed:

> "If evaluation exceeds performance threshold: default to Passive Awareness Mode; defer strict enforcement to save boundary."

Axis rewording:

- **Typing / awareness loops** may degrade to passive awareness when advanced context is unavailable.
- **Save boundary authority must not silently downgrade** from strict enforcement to passive awareness if that would weaken the current fail-closed posture.

Rule:

> Coherence improvements may reduce noise, but they must not weaken save-boundary authority without a separate policy review.

---

## 10. Anti-Pattern Prevention

The following are explicitly prohibited:

- independent UI logic outside `EvaluationResult`
- multiple conflicting evaluation pipelines
- UI-first logic with no policy grounding
- feature additions that create contradictory live states
- noisy surface growth that breaks ambient awareness

---

## 11. Future Layer Extension

The addendum correctly identifies that coherence should eventually extend to:

- CLI / Sentinel-like surfaces
- CI / Auditor-like reports
- future proxy / gateway enforcement layers

Axis boundary:

> This is a future target-state only. It is not current implementation authority for Stage 4 Lintel runtime scope.

Any adoption into:

- CLI
- CI
- gateway / proxy

must be opened as a new reviewed package.

---

## 12. Canon Mapping

This protocol maps to existing active tracks:

- **U24** — HUD / event architecture mapping
- **U27** — lean / anti-bloat reconciliation
- **U37** — system coherence protocol
- **U38** — `EvaluationResult` / signal-consistency contract

Active blueprint:

- `.arc/blueprints/ARCXT-UX-002.md`

Active ledger:

- `docs/records/directives/ARCXT-UX-002-TODO-LEDGER.md`

---

## 13. Approval Boundary

The submitted addendum proposed:

> "Approved before any further feature expansion."

Axis rewording:

This coherence protocol must be reviewed before any **feature expansion that touches evaluation, signal rendering, HUD/event architecture, or multi-surface operator behavior**.

It is not a freeze on unrelated work.

---

## 14. Axis Guidance

This protocol should be treated as:

- a coherence lock
- a future implementation contract
- a guard against UX fragmentation

It should **not** be treated as permission to add new UI surfaces or broaden runtime scope.

---

## Axis Decision

**Accepted as a missing but critical design lock, with the rewordings above binding for current canon.**

The protocol is now retained in canon and should guide future HUD/event/task-board evolution so ARC remains a coherent trust layer rather than a noisy pile of features.
