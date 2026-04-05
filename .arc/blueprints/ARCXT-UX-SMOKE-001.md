# ARC Blueprint: ARCXT-UX-SMOKE-001

**Directive ID:** ARCXT-UX-SMOKE-001

> Status: PLANNED — 2026-04-05

## Objective

Resolve UX fragmentation identified in v0.1.13 smoke-test findings. ARC XT currently scatters its surfaces across three rendering models (sidebar webview, editor webview panels, markdown previews) with no coherent home. First-time users — especially non-traditional developers — face an empty board, unexplained state, and buttons that open markdown files without context.

**Root problem (one sentence):**
ARC XT scatters its surfaces across three different rendering models with no clear home, leaving beginners confused about where to look and what to click next.

## Axis Approval

Approved by Axis (via Claude Code, Axis continuity mode) on 2026-04-05.

**Approved scope:**
- Activity bar → Liquid Shell (primary surface change)
- Sidebar button routing fix (no markdown previews)
- Empty state improvement in Task Board
- Sidebar label rename ("Task Board" → "ARC XT")

**Axis constraints (binding):**
1. Do NOT remove Task Board from sidebar. Keep it as a lightweight persistent surface alongside Liquid Shell. Task Board is no longer primary but remains present.
2. Routing must NOT open new panel instances. Sidebar buttons must focus an existing Liquid Shell instance and switch its route, NOT create duplicate panels.

## Scope

Three source changes + one manifest change. No architecture changes. No new modules. No new commands. No governance logic changes.

| File | Change | Est. Lines |
|---|---|---|
| `package.json` | `contributes.views` — add `arc.ui.liquidShell` as primary Activity Bar view; rename sidebar container label to "ARC XT" | ~5 |
| `src/ui/webview/TaskBoard.ts` | Update sidebar button handlers: Runtime/Review buttons route to Liquid Shell (not markdown preview). Focus existing panel if open. | ~15 |
| `src/ui/webview/TaskBoard.ts` | Replace "No Blueprint Artifacts" empty state with structured "Get Started" empty state including [Show Welcome Guide] and [Open Runtime Status] actions | ~20 |
| `src/ui/webview/LiquidShell.ts` | Verify (no-change): all four views render with zero blueprint data | ~0 |

**Total estimated change:** ~30–50 lines across 2 source files + 1 manifest.

## Constraints

- Must remain local-only and non-authorizing
- Must not change save-governance logic, decision floors, routing, or proof requirements
- Must not remove any registered commands — all arc.showRuntimeStatus / arc.reviewGovernedRoot commands remain available via Command Palette
- Must not redesign Liquid Shell internals
- Sidebar Task Board must remain a registered webview view — only its role changes (from primary surface to secondary/helper surface)
- Liquid Shell focus behavior must not open duplicate panel instances (use existing panel if available)
- Markdown preview commands are demoted to debug/advanced-user access only — not removed

## Acceptance Criteria

1. Clicking the ARC XT Activity Bar icon opens Liquid Shell, not the Task Board sidebar
2. Task Board sidebar remains accessible alongside Liquid Shell
3. Sidebar "Runtime" and "Review" buttons no longer open markdown previews as the primary action
4. When no blueprints exist, Task Board shows a structured empty state with "Get Started" guidance and a [Show Welcome Guide] button
5. Sidebar container label reads "ARC XT" (not "Task Board")
6. Opening Runtime/Review from the sidebar does not create duplicate panel instances
7. Lint, typecheck, build, and test pass

## Phase Execution Package

### Phase 1 — manifest change
- In `package.json`, add `arc.ui.liquidShell` view contribution to the `arc-xt-container` viewsContainer
- Rename container label from current value to "ARC XT"
- Keep `arc.ui.taskBoard` view registered (sidebar remains — Axis constraint 1)

### Phase 2 — sidebar button routing
- In `src/ui/webview/TaskBoard.ts`, update Runtime/Review button handlers
- Route to `arc.ui.liquidShell` with route context, NOT `arc.showRuntimeStatus` or `arc.reviewGovernedRoot`
- Implement focus-existing logic: if a Liquid Shell panel is already open, focus it and route; do not open a second instance (Axis constraint 2)

### Phase 3 — empty state
- In `src/ui/webview/TaskBoard.ts`, replace the static "No Blueprint Artifacts" text block
- New empty state: icon + title + two-sentence explanation + "To get started" bullet list + [Show Welcome Guide] button + [Open Runtime Status] button

### Phase 4 — verification
- Verify LiquidShell renders correctly with zero blueprint data (read-only check, no code change expected)
- Run: lint, typecheck, build, test
- Confirm AC1–AC7 pass

## Rollback Note

If Liquid Shell fails to render as the Activity Bar primary surface:
1. Revert `package.json` view contribution change
2. Task Board sidebar remains unchanged — user returns to current state
3. Markdown preview commands remain registered throughout — no fallback gap

Rollback is a single manifest revert. No runtime enforcement changes to undo.

## Execution Evidence

_To be populated on closeout._

## Notes

- This directive is a UX clarity fix, not a feature addition
- Liquid Shell (`src/ui/webview/LiquidShell.ts`) is already implemented and passing CSP checks in v0.1.13
- `arc.ui.liquidShell` command is already registered in `src/ui/index.ts`
- The four Liquid Shell views (Runtime, Tasks, Review, Architect) already render useful content with zero blueprint data
- Forge migration note: primary tool is Qwen Code; Codex remains dormant pending recovery
