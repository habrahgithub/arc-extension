# ARC Blueprint: ARC-GOV-LOG-001

**Directive ID:** ARC-GOV-LOG-001

## Objective

Restore ARC-governed package closeout discipline for the LINTEL beta-hardening sequence so every approved package is closed through blueprint, evidence bundle, ops log, decision log, and Vault/log handling rather than code-only completion claims.

## Scope

This directive covers governance-closeout restoration for the current LINTEL beta-hardening sequence:

- Create and maintain canonical LINTEL blueprints for `ARC-GOV-LOG-001` and `ARC-PERF-001`
- Restore package evidence routing under `artifacts/<DIRECTIVE-ID>/`
- Record phase execution in `ops/logs/2026-03.md`
- Record repo-level decision statements in `docs/DECISIONS.md`
- Align closeout wording to the local-first Vault/log contract defined by workspace canon

## Constraints

- Must NOT widen LINTEL runtime authority, save behavior, routing, or enforcement
- Must NOT create ad hoc files in workspace root
- Must NOT write directly to Vault SQLite or bypass `swd-vault`
- Must treat Vault/log ingestion as preferred closeout only when the canonical CLI path is active; otherwise evidence remains in `artifacts/` and the exception is recorded in `docs/DECISIONS.md`
- Must keep the package bounded to governance restoration and evidence routing; product/runtime changes belong to follow-on directives such as `ARC-PERF-001`

## Acceptance Criteria

1. Canonical blueprints exist for the approved follow-on beta-hardening packages now in execution
2. Retained evidence folders exist under `artifacts/` using directive-scoped naming
3. `ops/logs/2026-03.md` contains a dated record restoring LINTEL beta-hardening closeout discipline
4. `docs/DECISIONS.md` records the governance restoration decision
5. The package introduces no runtime/save-path behavior changes

## Rollback Note

If this governance restoration package must be undone before merge:

1. Remove the new directive blueprints from `projects/lintel/.arc/blueprints/`
2. Remove the directive-scoped evidence folders created under `artifacts/`
3. Revert the corresponding `ops/logs/2026-03.md` and `docs/DECISIONS.md` entries in the same git rollback

This restores the repo to the prior documentation state without affecting runtime logic.

## Execution Evidence

- Primary follow-on directive opened: `ARC-PERF-001`
- Canonical evidence path: `artifacts/ARC-GOV-LOG-001/`
- Canonical log path: `ops/logs/2026-03.md`
- Canonical decision path: `docs/DECISIONS.md`
