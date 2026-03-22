# LINTEL Code

Phase 7.2 operator-surface refinement of the LINTEL local-first IDE governance layer.

## Phase 7.0 scope
- VS Code save-time governance for `ALLOW / WARN / REQUIRE_PLAN / BLOCK`
- optional local workspace mapping to refine local precision without weakening rule floors
- local-only, read-only review surfaces for audit, proof, and false-positive analysis
- append-only local audit writer with hash-chain integrity and rotation
- local performance instrumentation at `.arc/perf.jsonl`
- blueprint-backed `REQUIRE_PLAN` proof at `.arc/blueprints/<directive_id>.md`
- content-level blueprint validation using a named governance threshold constant
- resilient review-surface parsing for malformed local audit lines
- local Ollama adapter present but disabled by default unless an approved route selects it
- Context Bus v1 packet scaffolding with bounded excerpts only
- route-policy and audit metadata scaffolding locked to fail-closed defaults
- fail-closed route-policy config handling at `.arc/router.json`
- Lease v2 exact-governed-state fingerprinting with route-policy hash and route-signature invalidation
- Audit Visibility CLI for read-only / export-only local evidence access
- versioned Vault-ready export schema with local-only validation and handoff discipline
- Context Bus v1 contract hardening with validation, canonical serialization, and fail-closed trust-boundary defaults
- local-lane activation gate with explicit local-only `LOCAL_PREFERRED` enablement for explicit saves only
- cloud fallback gate with explicit, lab-only `CLOUD_ASSISTED` routing after approved local fallback only
- integrated validation and rollback drill across assembled Phase 6 capabilities
- advisory lane-by-lane activation recommendation memo backed by evidence only
- truthful workspace-target resolution for nested projects inside a larger VS Code workspace
- observational runtime status surface for active workspace/audit targeting
- deterministic local smoke harness for repeatable non-cloud operator validation

## Important limitations
- classification remains heuristic-first, with optional local mapping only
- audit verification is **file-level integrity only** and does not prove archive-existence completeness
- shared/team blueprint handling remains unauthorized in Phase 6.8
- local-model activation is authorized only for explicitly enabled local-lane saves in Phase 6.8
- cloud fallback is optional, lab-only, and disabled by default
- ARC Console and Vault are not runtime save-path dependencies
- dashboards, MCP, and public release work remain deferred
- diagnostics are observational only and must not be treated as authorization

## Phase 7.0 operator hardening boundary
1. Effective governed workspace root must be truthful and visible to the operator.
2. Nested project boundaries may become the governed root inside a larger VS Code workspace.
3. Runtime status surfaces remain observational only and must not widen route behavior.
4. Internal install/run guidance must reflect the actually validated local workflow.
5. Internal smoke/UAT harnesses must remain deterministic and must not auto-repair malformed evidence.

## Phase 7.1 governance hardening boundary
1. `LINTEL: Show Active Workspace Status` remains an observational-only diagnostic surface.
2. Cloud-related fields in runtime status are factual configuration/reporting values only.
3. Runtime status must not imply cloud readiness, approval, or authorization.
4. Fail-closed posture reporting must remain truthful for missing/invalid policy, fallback, and auto-save cases.
5. Governance tests must anchor the runtime-status command and its disclaimer contract against silent removal.

## Phase 7.2 operator-surface boundary
1. Existing review commands may become clearer and more coherent, but they remain local-only, read-only, and non-authorizing.
2. Review wording may clarify fail-closed, fallback, and proof-required states only if governance tests anchor the meaning, not just the presence of text.
3. False-positive review remains advisory only and does not demote recorded decisions or rewrite audit history.
4. Blueprint review must reflect real local artifact state only; placeholder or inferred proof state never counts as valid.
5. No new dashboards, panels, or broader product UI are authorized in this phase.

## Phase 6.8 activation-contract boundary
1. LINTEL may load route-policy config from `.arc/router.json`.
2. Missing or invalid route-policy config fails closed to `RULE_ONLY`.
3. Context Bus v1 packets remain minimal, local, and bounded to excerpt-level context.
4. Route-related audit metadata must remain truthful and must not imply that local or cloud routing executed when it did not.
5. Lease v2 may use route-policy hash and route signature for invalidation only, not activation.
6. `LOCAL_PREFERRED` is local-only and may execute only for explicit saves when `.arc/router.json` enables the local lane and keeps the cloud lane disabled.
7. `CLOUD_ASSISTED` may be considered only after approved local fallback states and only for explicit saves.
8. `CLOUD_ELIGIBLE` must be operator-configured and must never become the default packet class.
9. `GOVERNED_CHANGE` remains deny-cloud and does not become a permissive signal in Phase 6.6.
10. Audit Visibility CLI remains read-only / export-only and is not part of save authorization.
11. Context Bus v1 remains bounded; no full-file payload may leave the machine.
12. Auto-save assessments fail closed to `RULE_ONLY` even when `LOCAL_PREFERRED` or `CLOUD_ASSISTED` is configured.
13. The Phase 6.8 router shell remains fail-closed and annotation-truthful; it must not weaken the rule floor.
14. Vault-ready evidence export is local-only, versioned, and validation-backed; it does not write to Vault or call ARC.
15. Integrated validation and rollback drill are advisory and evidence-backed only; they do not self-authorize sustained activation.

## Proof workflow
1. `REQUIRE_PLAN` requests a directive ID.
2. LINTEL validates the canonical artifact path `.arc/blueprints/<directive_id>.md` under enforced `LOCAL_ONLY` mode.
3. Save may proceed only when the blueprint is complete, local-only, and linked in the audit entry via `directive_id` and `blueprint_id`.
4. Local review surfaces remain available even if malformed audit lines are present; malformed lines are skipped and reported as partial review warnings.

## Local review commands
- `LINTEL: Review Audit Log`
- `LINTEL: Show Active Workspace Status`
- `LINTEL: Review Blueprint Proofs`
- `LINTEL: Review False-Positive Candidates`

## Review-surface contract
- review surfaces summarize existing local evidence only
- review surfaces remain local-only, read-only, and non-authorizing
- governed-root and route-posture summaries are descriptive only
- proof-required states remain blocked until the linked local blueprint artifact is valid
- false-positive candidates are advisory only and do not lower the enforcement floor

## Workspace targeting
- LINTEL now chooses the effective governed root truthfully per active file.
- It prefers the nearest nested project boundary inside the active VS Code workspace when a child root contains one of:
  - `.git`
  - `package.json`
  - `.arc/`
- If no nested boundary exists, LINTEL uses the active VS Code workspace folder root.
- Use `LINTEL: Show Active Workspace Status` to inspect:
  - active file
  - workspace folder root
  - effective governed root
  - audit path
  - route-policy path
  - active route posture
- Runtime status is descriptive only; its cloud-related fields do not imply readiness, approval, or authorization.

## Internal install / run path
Validated local/internal path:
1. `npm install`
2. `npm run build`
3. package the extension:
   - `npx @vscode/vsce package --allow-missing-repository`
4. install the generated VSIX in VS Code
   - Extensions → `...` → `Install from VSIX...`
5. reload the VS Code window

Notes:
- some `code` CLI environments do not support `--extensionDevelopmentPath`
- the VSIX path is the validated internal install path for this repo
- use `LINTEL: Show Active Workspace Status` after install to verify audit targeting

## Audit Visibility CLI
- Run with `npm run audit:cli -- <command> [options]`
- Supported commands: `query`, `trace-directive`, `trace-route`, `perf`, `verify`, `export`
- Read-only / export-only boundary:
  - reads `.arc/audit.jsonl`
  - reads `.arc/archive/*.jsonl`
  - reads `.arc/perf.jsonl`
  - reads `.arc/blueprints/<directive_id>.md` for directive trace only
  - writes only to stdout or an explicit local `--out <file>` destination for export
- Audit Visibility CLI does not mutate audit or blueprint state.
- Audit Visibility CLI does not write to Vault, call ARC Console, or participate in save authorization.
- export bundles are versioned and validated locally before they are emitted
- export bundles distinguish raw evidence, derived summaries, and validation results
- Vault-ready means local schema alignment for downstream handoff, not ingestion

## Context Bus v1 contract hardening
- `authority_tag` is locally asserted by trusted code and remains `LINTEL_LOCAL_ENFORCEMENT`
- `data_class` remains fail-closed to `LOCAL_ONLY` unless explicit cloud policy marks packets as `CLOUD_ELIGIBLE`
- `sensitivity_marker` remains fail-closed to `UNASSESSED`
- packet construction uses bounded excerpt input only and does not read full document text when no selection is present
- cloud policy may change packet `data_class`, but packet presence alone is not a routing activation signal
- retrieval, embeddings, vector stores, and uncontrolled workspace search remain out of scope

## Router shell
- route resolution remains on a single authoritative path based on the existing route-policy surface
- router shell metadata distinguishes configured intent from actual lane use
- `LOCAL_PREFERRED` is local-only and explicit saves only
- `CLOUD_ASSISTED` is local-first, explicit saves only, and lab-only
- `CLOUD_ELIGIBLE` is operator-configured and never default
- auto-save assessments fail closed to `RULE_ONLY`
- the cloud lane executes only after approved local fallback and only for `CLOUD_ELIGIBLE` packets
- ambiguity and invalid route state fail closed
- router shell does not weaken the existing rule-first enforcement floor

## Vault-ready evidence export
- export schema version is `phase-6.7-v1`
- bundle type is `LINTEL_VAULT_READY_EXPORT`
- export is local-only and may write only to stdout or an explicit local file path
- bundle validation runs locally and marks malformed or incomplete source evidence as `PARTIAL`
- exported trust-boundary values remain observational only and must not imply new permission
- save authorization remains independent from export success, Vault availability, or ARC availability

## Controlled activation review and rollback drill
- integrated validation must not produce any outcome looser than the hardened baseline
- rollback target is hardened-equivalent posture:
  - `RULE_ONLY`
  - no sustained local or cloud lane activity
  - unchanged proof enforcement
  - local review surfaces intact
  - no ARC/Vault runtime dependency
- rollback must preserve audit continuity and may not rewrite history
- the lane-by-lane activation recommendation memo is advisory only and requires post-review Axis/Prime decisioning for any sustained activation

## Commands
- `npm run audit:cli -- help`
- `npm run smoke:harness`
- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run test:governance`
- `npm run build`
