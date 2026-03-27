# ARC Phase 6.2 Evidence Summary

## Scope implemented
- Audit Visibility CLI added as a local-only, read-only / export-only surface
- Commands implemented: `query`, `trace-directive`, `trace-route`, `perf`, `verify`, `export`
- Vault-ready export bundle remains local handoff only via stdout or explicit `--out <file>`
- No mutation-capable CLI path introduced
- No local-model activation or cloud routing introduced
- No ARC Console or direct Vault dependency introduced

## Files changed
- `src/cli.ts`
- `src/core/auditVisibility.ts`
- `src/contracts/types.ts`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/TESTING.md`
- `docs/RISK_REGISTER.md`
- `tests/unit/auditVisibility.test.ts`
- `tests/integration/cli.test.ts`
- `tests/e2e/phase6.2-pilot.test.ts`
- `tests/governance/policy.test.ts`

## Validation summary
- `npm run audit:cli -- help` ✅
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test:unit` ✅
- `npm run test:integration` ✅
- `npm run test:e2e` ✅
- `npm run test:governance` ✅
- `npm run build` ✅

## Query / verify / export behavior
- query supports deterministic filters for decision, directive id, file path substring, route metadata, timestamp bounds, limit, and offset
- directive trace reads local blueprint evidence only and reports blueprint validation state alongside linked audit entries
- route trace is observational only and reports the current `RULE_ONLY` posture truthfully
- verify surfaces malformed audit history as `PARTIAL` evidence instead of silent success
- export produces `phase-6.2-v1` bundles with `vault_ready: true`, `direct_vault_write: false`, and `direct_arc_dependency: false`

## Read files
- `.arc/audit.jsonl`
- `.arc/archive/*.jsonl`
- `.arc/perf.jsonl`
- `.arc/blueprints/<directive_id>.md` for directive trace only

## Rollback note
- Remove the CLI entrypoint and `auditVisibility` helpers from the nested `projects/lintel` repo
- Preserve existing audit history, archive files, perf history, and blueprint artifacts unchanged
- Do not rewrite historical audit entries during rollback

## Open findings / deferrals
- audit-chain verification remains file-level integrity only and still does not prove archive-existence completeness
- non-default trust-boundary values remain inert and Warden-gated for future packages

## Required non-activation confirmations
- No local-model lane was activated
- No cloud lane was activated
- No direct Vault or ARC integration path was introduced
- No mutation-capable CLI command was introduced

## Review outcome
- Sentinel: PASS
- Warden: PASS (`WRD-6201` discharged)
- Closure note: Phase 6.2 may close; `SENTINEL-S641` is carried forward as a maintenance observation for possible shared hash-helper extraction in a future phase
