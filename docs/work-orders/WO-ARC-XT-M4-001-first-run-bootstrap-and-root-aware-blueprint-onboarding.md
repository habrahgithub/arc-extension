# WO-ARC-XT-M4-001 — First-Run Bootstrap & Root-Aware Blueprint Onboarding

Status: ISSUED
Authority: Axis
Assigned to: Forge
Phase: Milestone 4 — Onboarding, Root Selection, and Blueprint Bootstrap
Execution mode: PLAN → ACT (artifact-first)

## Objective
Add a bounded first-run bootstrap flow for ARC XT that helps new operators select the correct governed root, create minimal local configuration safely, and create their first local blueprint artifact without weakening enforcement or enabling any model lane by default.

## Why this work order exists
ARC XT currently derives task state from `.arc/blueprints/*.md` under the governed root. In nested-repo and monorepo setups, the extension can remain pinned to the initial activation root, which can leave the Task Board empty even when valid blueprint artifacts exist in a nested project.

For experienced operators this is diagnosable. For new users it creates first-run confusion:
- the governed root may be wrong for the intended project
- the Task Board can appear empty even though blueprint artifacts exist elsewhere
- the extension does not currently guide the operator through safe local bootstrap steps
- the empty state does not provide bounded next actions

This work order formalizes a generalized onboarding/bootstrap path that remains local-first, fail-closed, and explicitly operator-confirmed.

## Governance position
This package is allowed only if it preserves the following:
1. Local-only operation remains authoritative.
2. Bootstrap flows are descriptive and bounded; they do not authorize or widen enforcement.
3. Safe defaults remain fail-closed (`RULE_ONLY`, local lane disabled, cloud lane disabled).
4. New-user convenience must not silently mutate governed roots or enable runtime lanes.
5. Monorepo and nested-repo root selection must be explicit when ambiguity exists.

## Scope
### In scope
- Detect first-run bootstrap conditions for new operators
- Detect candidate governed roots (workspace root, nested project roots, active-file root)
- Add a bounded root-selection step when multiple plausible governed roots exist
- Add a safe bootstrap wizard or equivalent guided flow for:
  - reviewing governed root
  - creating minimal ARC config
  - creating first local blueprint artifact
  - choosing to use existing local ARC config
- Improve Task Board empty state so it offers bounded next actions instead of only an empty message
- Ensure the Task Board can rebind to the correct governed root rather than remaining pinned to the first activation root for the whole session
- Reuse existing bounded surfaces where sensible (`welcomeSurface`, `configTemplates`, blueprint template creation)
- Add tests for first-run/bootstrap and nested-root behavior
- Update docs for the new operator flow

### Out of scope
- Enabling local or cloud lanes by default
- Team/shared blueprint registries
- Remote sync or control-plane coupling
- Marketplace onboarding flows
- Any change to WARDEN local-only scope
- Any bypass of `REQUIRE_PLAN` proof rules

## Required outputs
Forge must produce the following artifacts:
1. Runtime implementation for bounded first-run bootstrap/root selection
2. Task Board improvements for root-aware empty-state guidance
3. Tests covering root selection, empty-state CTAs, and safe config/bootstrap behavior
4. Documentation updates for first-run/local bootstrap flow
5. Any small supporting contract/type changes required for root-aware task-board rendering

## Required product behavior
### Layer A — Governed root selection
The first-run flow must determine and present the effective governed root.

If multiple plausible roots exist, the operator must be shown bounded choices such as:
- workspace root
- active file root
- detected nested project root(s)

Requirements:
- no silent promotion from workspace root to nested root
- no silent fallback to a different root after the operator has confirmed a choice
- root choice must remain local-only and transparent in UI wording
- Task Board/root-aware views must reflect the effective governed root truthfully

### Layer B — Safe config bootstrap
If local ARC config is absent for the selected governed root, the operator may choose to create:
- `.arc/router.json`
- `.arc/workspace-map.json`

Requirements:
- creation must be explicit and confirm the exact file paths to be written
- defaults must remain:
  - `mode: RULE_ONLY`
  - `local_lane_enabled: false`
  - `cloud_lane_enabled: false`
  - workspace mapping remains `LOCAL_ONLY`
- existing configs must never be overwritten without explicit confirmation

### Layer C — Blueprint bootstrap
If `.arc/blueprints/` is absent or empty, the operator may create a first local blueprint artifact from a canonical template.

Requirements:
- template creation must be explicit, not automatic
- generated naming must be generalized for new users, not LINTEL-specific by default
- suggested directive IDs may use workspace/project slug patterns (examples: `WORKSPACE-CHG-001`, `MYAPP-AUTH-001`)
- created blueprint must remain incomplete until operator replaces placeholder content
- template creation must never count as authorization by itself

## Empty-state requirements
When the Task Board has no local blueprint artifacts for the effective governed root, it must do more than report emptiness.

The empty state must offer bounded next actions such as:
- Review Governed Root
- Create Minimal ARC Config
- Create First Blueprint
- Use Existing ARC Config

These actions must remain local-only and non-authorizing.

## UX and safety rules
- First-run experience must be guided, not automatic
- No file creation without operator confirmation
- No lane enablement during bootstrap
- No background mutation of runtime policy
- No implication that onboarding equals readiness or approval
- Wording must stay truthful about local-only/read-only boundaries

## Technical direction
Forge should prefer incremental reuse of the existing bounded surfaces and utilities:
- `src/extension/welcomeSurface.ts`
- `src/extension/configTemplates.ts`
- `src/core/blueprintArtifacts.ts`
- `src/extension/taskBoardView.ts`
- `src/extension/reviewSurfaces.ts`
- workspace-targeting logic in extension activation

Preferred implementation direction:
1. separate governed-root detection from one-time activation pinning
2. allow task-board/review surfaces to re-resolve or rebind to active governed root when appropriate
3. keep bootstrap actions explicit and local
4. avoid introducing any new remote/runtime dependency

## Testing requirements
Forge must add or update tests covering at least:
- first-run with no `.arc` config
- first-run with existing `.arc` config
- root ambiguity in nested repo/monorepo layout
- Task Board empty state showing bounded next actions
- root rebinding/refresh behavior for the Task Board
- first blueprint template creation remaining incomplete until placeholders are replaced
- bootstrap flow preserving fail-closed defaults

## Stop conditions
Forge must stop and escalate if any of the following becomes necessary:
- enabling any model lane by default
- silently writing config or blueprint files without operator confirmation
- introducing shared/team blueprint behavior
- coupling onboarding to remote services or cloud APIs
- weakening `REQUIRE_PLAN` proof enforcement to make onboarding feel smoother

## Acceptance criteria
This work order is complete only when:
1. New operators can identify/select the correct governed root on first use.
2. Safe config bootstrap is explicit, local-only, and fail-closed by default.
3. First blueprint creation is template-driven, generalized, and non-authorizing.
4. Task Board empty state provides bounded actions instead of dead-end emptiness.
5. Task Board/root-aware surfaces reflect the correct governed root in nested-repo scenarios.
6. Tests prove no silent mutation and no enforcement weakening.
7. Documentation clearly explains the bootstrap flow and its limits.

## Execution notes to Forge
- Treat this as a bounded onboarding/UX-governance package, not a feature-expansion package.
- Prefer reusing existing local surfaces over inventing broad new UI layers.
- Optimize for truthful operator understanding, not automation.
- Convenience is allowed only when it preserves fail-closed governance posture.

## Next review owner
Axis — review root-selection truthfulness, bootstrap safety, and enforcement-boundary preservation before any broader onboarding expansion.
