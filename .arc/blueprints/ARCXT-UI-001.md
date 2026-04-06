# ARC XT Blueprint: ARCXT-UI-001
**Directive ID:** ARCXT-UI-001

> Status: CLOSED — 2026-04-05
> Phase 5 template requirements satisfied. This directive is complete as a governed blueprint artifact and may progress through approval/execution review.

## Objective
Implement **Phase 2 semantic correction of ARC XT UI** to transition from a visually consistent dashboard into a **decision-first governance shell**.

This directive introduces:

- Runtime posture-first hierarchy (safety → route → policy → confidence)
- Review surface transformation from card-based display to structured judgment model
- Architect surface transformation from metric dashboard to system topology representation
- Execution control elevation via stateful `EXECUTE_RUN` interaction model
- Enforcement of “No-Line” visual system using tonal separation instead of structural borders

The intent is to align the UI with ARC’s role as a **control-plane authority**, not a passive display layer.

## Scope
### UI Surfaces Updated

- Runtime View
- Tasks View (semantic grouping only, no structural overhaul)
- Review View
- Architect View
- Sidebar Navigation (hint semantics)
- `EXECUTE_RUN` control (operator panel)

### Key Implementation Areas

- Runtime: `.posture-hero` introduction and reordering of content hierarchy
- Review: `.deviation-row` structured layout with severity, location, confidence, expandable context
- Architect:
  - `.topology-block`
  - `.route-map`
  - `.directive-list`
- Execution Control:
  - Multi-state `EXECUTE_RUN` (dormant, ready, executing, warning)
- Styling System:
  - removal of non-essential borders
  - tonal stepping enforcement
  - selective border retention (pills, severity bars, focus states)
- Motion Layer:
  - route transition opacity (80ms)
  - `EXECUTE_RUN` pulse animation (executing state)

### Files / Modules Impacted

- Webview UI rendering layer (`LiquidShell` or equivalent UI module)
- CSS token and component styling blocks
- Interaction handlers for:
  - route switching
  - execution state transitions
  - deviation expansion

## Constraints
### Governance Constraints

- Must comply with **ARC-GOV-RULE-002 (Plan → Act)**
- No introduction of execution logic inside UI (ARC remains control plane only per RULE-003)
- No coupling between UI state and product runtime logic
- No dynamic inference or learning behavior in UI layer

### Non-Scope

- No backend/runtime changes
- No telemetry implementation
- No new data sources or API integrations
- No change to directive lifecycle logic (ARC-GOV-011 untouched)

### Design Constraints

- Maintain 4px grid spacing discipline
- Preserve Material Design 3 token system
- Preserve typography stack (Space Grotesk / Inter / JetBrains Mono)
- Avoid decorative motion; only functional motion allowed
- Avoid reintroduction of card-heavy dashboard patterns

### Risk Bounds

- Risk of over-densifying Review surface → must maintain scanability
- Risk of Runtime reverting to metric-first layout → posture must remain dominant
- Risk of `EXECUTE_RUN` becoming visually noisy → state clarity over visual intensity
- Risk of Architect view becoming abstract → must remain readable without training

## Acceptance Criteria
### Runtime

- First visible element is `.posture-hero`
- Clearly communicates:
  - system state (safe/degraded/etc.)
  - route
  - policy
  - confidence
- Metrics appear only after posture section
- Warning (if present) is visually subordinate but immediately visible

### Review

- No card-based deviation layout remains
- All deviations rendered as structured rows:
  - severity indicator (color-coded)
  - issue text
  - location reference
  - confidence indicator
- Code context is hidden by default and expands on interaction
- High severity items visually dominate medium/low

### Architect

- No generic metric card grid present
- View contains:
  - policy mode header
  - route map (active / degraded / disabled states)
  - directive list
  - system parameter grouping
- Layout communicates structure, not analytics

### `EXECUTE_RUN`

- Must support all four states:
  - dormant
  - ready
  - executing (locked + animated)
  - warning
- Click action:
  - disabled or ignored when not ready
  - locked during execution
- Visual state must match execution readiness

### Visual System

- Borders removed from:
  - cards
  - sidebar navigation
  - topbar separators
- Borders remain only on:
  - pills
  - severity indicators
  - interactive focus states
- Tonal separation must be primary layout mechanism

### Motion

- Route transition uses ≤100ms opacity shift
- No continuous or decorative animations present
- `EXECUTE_RUN` animation only active during execution

### Navigation Semantics

Sidebar hints must reflect view purpose:

- Runtime → “What is happening”
- Tasks → “What is progressing”
- Review → “What needs judgment”
- Architect → “What defines the shape”

## Rollback Note
If regression or instability is detected:

### Immediate Revert

- Restore previous UI layout:
  - remove `.posture-hero`
  - revert Review to `.deviation` card structure
  - revert Architect to metric card layout
- Disable `EXECUTE_RUN` state logic (fallback to static button)

### File-Level Reversion

- Revert UI module (`LiquidShell` or equivalent) to prior commit baseline
- Restore previous CSS definitions for:
  - `.card`
  - `.metrics-row`
  - `.deviation`
- Remove newly introduced classes:
  - `.posture-hero`
  - `.deviation-row`
  - `.topology-block`
  - `.route-map`
  - `.directive-list`

### Safe State Confirmation

- Ensure:
  - extension loads without UI errors
  - webview renders without blank state
  - command palette actions still function

No data or runtime state is impacted by this rollback (UI-only directive).
