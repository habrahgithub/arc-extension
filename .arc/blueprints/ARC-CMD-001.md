# LINTEL Blueprint: ARC-CMD-001

**Directive ID:** ARC-CMD-001

## Objective

Migrate the extension’s canonical internal command namespace from `lintel.*` to `arc.*` while preserving existing command behavior, maintaining activation continuity, and keeping a bounded compatibility bridge for legacy `lintel.*` command IDs during the transition.

## Scope

This directive covers command ID migration in `package.json`, `src/extension.ts`, relevant UI command references such as `src/ui/index.ts` and `src/ui/webview/ReviewHome.ts`, compatibility alias handling for legacy `lintel.*` commands, activation-event validation, and governance tests that confirm command behavior remains unchanged.

## Constraints

The migration must change identity only, not behavior. Exact target `arc.*` command IDs must be declared before implementation and reviewed for bounded naming. The compatibility bridge must avoid duplicate command-palette entries, preserve extension activation, and remain explicit and temporary. No save, proof, route, review, cloud, Vault, or ARC Console authority may be widened by this work.

## Acceptance Criteria

The canonical commands are migrated to the approved `arc.*` namespace, the temporary legacy `lintel.*` bridge is documented and test-backed, command palette duplication is avoided, activation continuity is verified, existing command behavior remains unchanged, and lint, typecheck, build, and governance tests all pass.

## Rollback Note

If the migration causes activation or command-resolution issues, revert the namespace changes in `package.json`, `src/extension.ts`, UI command references, and related tests, restore the prior `lintel.*` command registrations as canonical, and remove the incomplete bridge changes before retrying under a new bounded revision.
