# ARC Blueprint: ARC-UI-002

**Directive ID:** ARC-UI-002

## Objective

Introduce a local-only ARC Task Board review surface in the LINTEL extension so operators can see blueprint-backed work items progress through Created, In Progress, and Completed states without adding a new writable task system or changing save-governance authority.

## Scope

This directive covers a bounded Task Board v1 package for `projects/lintel`:

- Derived task-status logic built from existing `.arc/blueprints/*.md` artifacts and `.arc/audit.jsonl` evidence
- New Task Board review surface at `src/ui/webview/TaskBoard.ts`
- Command registration and Review Home entry updates in `package.json`, `src/ui/index.ts`, and `src/ui/webview/ReviewHome.ts`
- Read-model support in `src/extension/reviewSurfaces.ts`
- Governance/unit tests verifying the board is local-only, read-only, and non-authorizing

## Constraints

The Task Board must remain **descriptive only**:

- Must NOT create, edit, approve, close, or sync tasks to any external service
- Must NOT introduce new writable `.arc/*.json` state
- Must NOT alter audit history, blueprint proof validation, save routing, rule floors, or authority boundaries
- Must NOT depend on cloud services, remote APIs, or hidden persistence
- Statuses must be derived from existing evidence only: blueprint file existence, proof completeness/validation state, and recorded audit evidence

## Acceptance Criteria

1. Operators can open an ARC Task Board from the extension and see task items grouped into Created, In Progress, and Completed using existing local evidence only
2. Review Home exposes the Task Board as a navigation surface
3. Command registration is explicit and bounded
4. Board includes truthful local-only/read-only posture wording
5. Tests confirm:
   - No new mutable task-store artifacts introduced
   - Status classification behaves correctly for empty, incomplete, and valid blueprint artifacts
   - Lint, typecheck, build, and test pass for the bounded package

## Rollback Note

If the Task Board introduces UI instability or governance ambiguity:

1. Remove the Task Board command registration from `package.json` and `src/ui/index.ts`
2. Remove the Review Home entry and `src/ui/webview/TaskBoard.ts`
3. Revert the derived review-surface helpers added for task classification
4. Delete any task-board-specific tests

This returns the extension to prior review surfaces without affecting blueprint or audit data.

## Phase Execution Package

### Phase 1 — Evidence model and status derivation

- Add bounded Task Board read model to `src/extension/reviewSurfaces.ts`
- Derive each board item from `.arc/blueprints/*.md` using `BlueprintArtifactStore` validation results AND content analysis
- Use v1 status mapping (Path A classification):
  - **Created** = blueprint exists but is still the untouched template (detected via `[REQUIRED]` placeholders or `INCOMPLETE_TEMPLATE` banner)
  - **In Progress** = blueprint has been edited (no template markers) but proof is not yet `VALID`
  - **Completed** = blueprint proof resolves as `VALID`
- Keep the model read-only and local-only

### Phase 2 — Command and navigation wiring

- Add `arc.ui.taskBoard` to `package.json` activation events and contributed commands
- Register the new command in `src/ui/index.ts`
- Add Task Board card to `src/ui/webview/ReviewHome.ts`
- Whitelist only the explicit `arc.ui.taskBoard` command
- Preserve existing review-surface command boundaries

### Phase 3 — Task Board review surface

- Create `src/ui/webview/TaskBoard.ts`
- Render columns for Created, In Progress, and Completed
- Show directive ID, blueprint path, validation reason, and next action for each item
- Include clear posture text: board summarizes existing evidence, does not authorize or mutate work

### Phase 4 — Governance and regression coverage

- Add focused unit/governance tests for:
  - Status derivation across incomplete vs valid blueprints
  - Zero new writable task-store artifacts
  - Task Board command registration and Review Home linkage
  - Truthful local-only, read-only, non-authorizing wording
- Keep coverage bounded to the Task Board package

### Phase 5 — Verification and closure

- Run `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test` in `projects/lintel`
- Verify Task Board opens from Review Home and renders expected local items
- Verify status derivation semantics match blueprint definition (Created/In Progress/Completed)
- Close package only if repo drift outside bounded slice remains explicitly excluded

## Execution Evidence

**Status derivation alignment:**

- **Created** = `MISSING_DIRECTIVE`, `MISSING_ARTIFACT`, `UNAUTHORIZED_MODE` (no usable blueprint)
- **In Progress** = `INCOMPLETE_ARTIFACT`, `INVALID_DIRECTIVE`, `MISMATCHED_BLUEPRINT_ID`, `MALFORMED_ARTIFACT` (blueprint exists but incomplete)
- **Completed** = `VALID` (blueprint proof is complete)

**Test coverage:**

- `tests/governance/taskBoard.test.ts` — 11 tests covering status derivation, empty states, read-only posture, column rendering, no writable state
- `tests/governance/proofStateMessaging.test.ts` — Updated to match user-friendly wording from ARC-UX-001

**Verification results:**

- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run build` ✅
- `npm run test` ✅ (348 tests pass)

**Blueprint closure:** ARC-UI-002 — COMPLETE
