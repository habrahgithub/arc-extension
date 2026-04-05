# ARC XT Blueprint: ARCXT-BUILD-001

**Directive ID:** ARCXT-BUILD-001

> Status: COMPLETE
> Phase 5 template requirements satisfied. This directive is a minimal build-system
> maintenance change with no runtime or governance impact.

## Objective

Update `tsconfig.json` to use explicit `moduleResolution: "node10"` instead of the
deprecated implicit `"node"` alias, and fix a trailing comma syntax violation.

This is a forward-compatibility fix — TypeScript currently emits a deprecation warning
for `"node"` and will reject it in TS 7.0. The change suppresses the warning without
altering resolution behavior.

## Scope

### Files Modified

- `tsconfig.json` — two changes:
  1. `moduleResolution: "node"` → `moduleResolution: "node10"`
  2. Trailing comma after `"vscode"` in `types` array removed (JSON strictness)

### Non-Scope

- No source code changes
- No runtime behavior changes
- No governance or enforcement logic changes
- No dependency changes
- No VSIX package contents change

## Constraints

### Governance Constraints

- No change to ARC extension behavior — purely declarative compiler config
- Must not alter emitted `dist/` output (verify by build diff)
- Must not break typecheck or build

### Risk Bounds

- Zero functional risk — `node10` is the explicit form of the current implicit default
- No API surface, command surface, or webview changes

## Acceptance Criteria

### Build Verification

- `npm run typecheck` passes with exit code 0
- `npm run build` produces identical `dist/` output
- No TypeScript deprecation warnings in build output

### Correctness

- `moduleResolution` is explicitly `"node10"` (not `"node"`)
- No trailing commas in `tsconfig.json`
- `tsc` does not emit TS5103 or TS1009 errors

## Rollback Note

Revert `tsconfig.json` to previous commit:

```bash
git checkout HEAD~1 -- tsconfig.json
npm run typecheck   # should still pass (warning returns, but no error)
```
