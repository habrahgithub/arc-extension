# ARC Blueprint: ARCXT-BRAND-001

**Directive ID:** ARCXT-BRAND-001

> Status: CLOSED

## Objective

Align the LINTEL extension's public-facing identity with ARC platform canon by migrating user-visible branding from **ARC — Audit Ready Core** to the bounded product identity **ARC XT — Audit Ready Core**, while keeping internal/runtime identifiers stable.

## Scope

This directive covers a display-branding package for `projects/lintel` only:

- `package.json` display-facing metadata (`displayName`, marketplace-facing description text if needed)
- User-facing titles and headings in extension review surfaces and onboarding content
- Marketplace/install guidance in `README.md` and release-readiness docs
- Governance/docs/tests that explicitly enforce the old public-facing name

In scope surfaces include:

- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CODE_MAP.md`
- `docs/RELEASE-READINESS.md`
- `src/extension/welcomeSurface.ts`
- `src/ui/webview/**`
- tests that assert the display identity

## Constraints

- Must keep internal package/runtime identifiers stable for now:
  - package name remains `arc-audit-ready-core`
  - existing command ids remain unchanged
  - existing repo and artifact lineage remain unchanged
- Must NOT change save-governance logic, enforcement floors, routing, or authority
- Must NOT imply ARC Console coupling, Vault dependency, cloud readiness, or team features beyond what actually exists
- Must NOT rename the product simply to `ARC` because ARC remains the umbrella platform, not the extension itself
- This package is display-branding only; any later repo/package/id migration requires a separate directive

## Acceptance Criteria

1. User-facing extension identity is consistently updated to `ARC XT — Audit Ready Core`
2. Marketplace/install/readme guidance reflects the new display identity truthfully
3. Internal package name and command ids remain unchanged
4. Lint, typecheck, build, and test pass for the bounded package
5. Evidence, ops log, and decision log are updated per ARC closeout discipline

## Rollback Note

If the branding migration creates confusion or breaks marketplace/test expectations:

1. Revert display-facing identity strings from `ARC XT — Audit Ready Core` back to `ARC — Audit Ready Core`
2. Restore any affected docs/test assertions in the same bounded rollback
3. Preserve internal ids and package name unchanged in either direction

This returns the extension to the prior public identity without affecting runtime behavior.

## Phase Execution Package

### Phase 1 — identity inventory

- Enumerate all user-visible extension naming surfaces
- Separate display branding from internal ids and stable command identities

### Phase 2 — bounded display rename

- Apply `ARC XT — Audit Ready Core` to public-facing extension identity surfaces only
- Keep internal ids, package name, and repo lineage unchanged

### Phase 3 — docs/tests alignment

- Update readme, release-readiness docs, and governance tests
- Verify marketplace/install instructions remain truthful

### Phase 4 — verification and closure

- Run `npm run lint`
- Run `npm run typecheck`
- Run `npm run build`
- Run `npm run test`
- Record evidence and closure in canonical governance paths

## Execution Evidence

- Opened as a bounded follow-on directive after `ARC-GOV-LOG-001` and `ARC-PERF-001` merged to `main`
- Executed on branch `arc-r2-lintel-branding-directive` as a display-branding-only package
- Updated public-facing extension identity to `ARC XT — Audit Ready Core` across manifest display metadata, welcome/review surfaces, canonical docs, and governance tests
- Preserved internal package name `arc-audit-ready-core`, existing command ids, and webview/viewType identifiers
- Verification completed:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
  - `npm run test`
- Canonical evidence path: `artifacts/ARCXT-BRAND-001/`
- No runtime logic changes were authorized or introduced by this directive
