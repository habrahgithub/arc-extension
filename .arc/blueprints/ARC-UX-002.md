# ARC Blueprint: ARC-UX-002

**Directive ID:** ARC-UX-002

> Status: CLOSED — 2026-03-29

## Execution Evidence

- `src/extension/statusBarItem.ts` — StatusBarItemService with 6 enforcement states
- `src/extension/taskBoardView.ts` — TaskBoardViewProvider (left sidebar webview)
- `src/extension.ts` — Integrated status bar and task board refresh on save
- `package.json` — viewsContainers and views contributions for arc-xt-container
- Verification: lint ✅ typecheck ✅ build ✅ test ✅ (352 passing)

## Objective

Close the remaining passive-visibility gap identified by the external review by activating a truthful ARC XT status indicator and adding a read-only Task Board surface in the VS Code left sidebar, while preserving existing save enforcement behavior and command identifiers.

## Scope

This directive covers bounded UX surfaces in `projects/lintel` only:

- activation and passive-visibility wiring in `src/extension.ts`
- status-bar implementation in `src/extension/statusBarItem.ts`
- left-sidebar Task Board contribution and provider wiring
- existing Task Board rendering reuse from the current review-surface model
- `package.json` view container / view contributions
- governance and UI tests needed to verify the new passive surfaces

Expected files include:

- `package.json`
- `src/extension.ts`
- `src/extension/statusBarItem.ts`
- `src/ui/index.ts`
- `src/ui/webview/TaskBoard.ts`
- tests covering command/view registration and truthful passive wording

## Constraints

- Must remain local-only, read-only, and non-authorizing
- Must not change save-governance logic, decision floors, routing, or proof requirements
- Must keep existing command ids and viewType ids stable
- Existing Task Board command/panel may remain, but the sidebar surface must reuse the same derived task state rather than introducing a second writable model
- The status bar must report descriptive posture only and must not imply approval, certification, or cloud readiness
- Sidebar implementation must follow VS Code primary-sidebar / activity-bar contribution patterns and remain bounded to the ARC XT extension surface

## Acceptance Criteria

1. ARC XT exposes a passive status indicator that is visible without opening a panel
2. ARC XT exposes a Task Board view in the left sidebar using a bounded view container / view contribution
3. The sidebar Task Board uses existing derived task-board data and creates no new writable task state
4. Existing command ids, package name, and save-path authority remain unchanged
5. Lint, typecheck, build, and test pass
6. Evidence, ops log, and decision log are updated per ARC closeout discipline

## Rollback Note

If the passive sidebar/status surfaces prove noisy or unstable:

1. Remove the status-bar activation and sidebar view contribution
2. Preserve the existing command-driven Task Board panel and review surfaces
3. Leave save-governance logic, package name, and command ids unchanged

This returns ARC XT to the current command/panel-driven UX without affecting enforcement.

## Phase Execution Package

### Phase 1 — passive visibility inventory

- inspect the existing `StatusBarItemService` scaffold and current Task Board rendering path
- identify missing activation/view contribution wiring

### Phase 2 — status-bar activation

- activate the status bar service in a bounded way
- ensure wording is descriptive-only and truthful

### Phase 3 — left-sidebar Task Board

- contribute an ARC XT sidebar container/view in the VS Code primary sidebar
- register a bounded provider that reuses the existing Task Board rendering model

### Phase 4 — governance verification

- add/update tests for status bar, sidebar view registration, and read-only posture
- run lint, typecheck, build, and test

## Execution Evidence

- Opened from the external-review incorporation audit on 2026-03-29
- Sidebar Task Board addition is an explicit operator request and is folded into this UX package
- No runtime enforcement changes are authorized by this directive opening
