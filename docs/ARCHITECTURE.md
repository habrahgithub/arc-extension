# ARC — Audit Ready Core Architecture

## Core flow
1. VS Code save events enter the extension lifecycle controller.
2. The controller reads the last committed snapshot and current save mode.
3. The save orchestrator loads optional local workspace mapping and route-policy config.
4. Missing or invalid route-policy config fails closed to `RULE_ONLY`.
5. The save orchestrator classifies the path, builds both the bounded `ContextPayload` and the minimal Context Bus v1 packet, and preserves the existing enforcement floor.
6. `WARN` remains acknowledgment-based. `REQUIRE_PLAN` requires a complete, canonical, local-only blueprint proof.
7. All proof-resolution paths force `blueprintMode: 'LOCAL_ONLY'` consistently.
8. Valid `REQUIRE_PLAN` saves persist `directive_id` and `blueprint_id` in the decision payload and audit entry.
9. Route metadata remains truthful: it records configured `LOCAL_PREFERRED` / `CLOUD_ASSISTED` intent separately from actual lane use and must not overstate execution.
10. Local review surfaces render audit, blueprint, and false-positive summaries outside the critical save path and tolerate malformed audit lines by skipping them and marking the review as partial.
11. Local performance instrumentation records save-path and review-surface timing to `.arc/perf.jsonl`.
12. Audit Visibility CLI reads local evidence only and remains outside the save authorization path.
13. Context Bus v1 packets are validated, canonically serialized, and fail closed when trust-boundary defaults are violated.
14. The Phase 6.8 router shell remains single-path and fail-closed while allowing bounded `CLOUD_ASSISTED` fallback only after approved local fallback states.
15. Vault-ready export generation and validation remain local-only and outside the save authorization path.
16. Integrated activation review and rollback drill remain evidence-producing flows only and may not self-authorize sustained activation.
17. Workspace-target resolution now selects the effective governed root per active file instead of assuming the first VS Code workspace folder.
18. Runtime status diagnostics report active workspace targeting and route posture without mutating save behavior.

## Phase 6.8 additions
- Context Bus v1 packet scaffolding with bounded excerpt, authority tag, data-class default, and packet hash
- route-policy config scaffolding with explicit `RULE_ONLY` fail-closed defaults
- route-related audit metadata scaffolding with deterministic inactive values
- Lease v2 exact-governed-state fingerprinting
- route-policy hash and route signature participating in lease invalidation only
- Audit Visibility CLI query / trace / verify / export helpers
- Context Bus v1 validation and canonical serialization contract hardening
- router shell formalized over the existing single authoritative source route-policy resolution path
- bounded local-lane activation using the existing Ollama adapter, existing model evaluation pipeline, and unchanged enforcement floor
- bounded cloud fallback using the same orchestrator pipeline, explicit packet data-class gating, and unchanged enforcement floor
- versioned Vault-ready export schema with explicit section classes for direct evidence, derived summaries, and validation results
- local bundle validation and explicit partial/incomplete evidence signaling for malformed export inputs
- integrated validation matrix covering assembled Phase 6.0–6.7 behavior together
- rollback drill and hardened-equivalent restoration evidence
- advisory lane-by-lane activation recommendation output
- preservation of Phase 5 save-time behavior while activation contracts are introduced

## Phase 7.0 additions
- workspace-target resolution that prefers the nearest nested boundary (`.git`, `package.json`, or existing `.arc/`) inside the active VS Code workspace
- per-target orchestrator/controller/review-surface caching so nested projects do not incorrectly share a parent `.arc/`
- observational runtime status surface for governed-root, audit-path, route-policy-path, and active posture visibility
- deterministic local smoke harness for repeatable internal non-cloud validation
- corrected internal install path centered on VSIX packaging and installation

## Phase 7.1 additions
- governance-test anchoring for `lintel.showRuntimeStatus`
- explicit runtime-status disclaimer constants guarding observational-only wording
- hardened runtime-status notes covering cloud non-authorization and fail-closed baseline preservation

## Phase 7.2 additions
- coherent operator-context summaries across the existing review surfaces
- explicit review-surface contract constants for local-only, read-only, non-authorizing behavior
- stronger proof-required and false-positive advisory wording anchored in governance tests

## Phase 7.3 additions
- manifest identity freeze to `ARC — Audit Ready Core`
- user-facing command titles aligned to `ARC:` while internal command ids remain `lintel.*`
- explicit compatibility wording distinguishing the extension identity from ARC Console, Vault, or broader control-plane authority

## Blueprint policy boundary
- Shared/team blueprint handling is not authorized in Phase 6.6.
- Template scaffolds are intentionally marked as incomplete until every required section is filled with directive-specific content.
- Structural presence alone is insufficient for `REQUIRE_PLAN` authorization.

## Audit integrity boundary
`verifyChain()` is **file-level integrity only**. It verifies the hash chain across the files that are present, but it does **not** prove archive-existence completeness or detect wholesale deletion of the `.arc/` history.

## Local-model activation boundary
Local-model activation in Phase 6.8 is bounded to the local lane only unless a separately approved phase widens it.
- endpoint constraints for the local lane must remain local-only or be explicitly re-approved
- prompt-injection exposure from bounded excerpts must be documented with schema-validation plus enforcement-floor mitigations
- stronger audit-integrity claims require a separately approved trust-boundary design

## Cloud fallback boundary
- cloud fallback is optional, lab-only, and disabled by default
- cloud evaluation may occur only for explicit saves
- cloud evaluation may occur only after approved local fallback states:
  - `MODEL_DISABLED`
  - `UNAVAILABLE`
  - `TIMEOUT`
  - `PARSE_FAILURE`
  - `RULE_ONLY`
- successful local execution blocks cloud escalation
- cloud payload is bounded to `ContextPayload` only; full-file content, packet governance metadata, and workspace-wide context do not leave the machine

## Route-policy boundary
- The default route mode is `RULE_ONLY`.
- `.arc/router.json` may exist as an activation-contract file, but missing or invalid config fails closed to `RULE_ONLY`.
- `LOCAL_PREFERRED` is local-only and may be accepted only when `local_lane_enabled: true` and `cloud_lane_enabled: false`.
- `CLOUD_ASSISTED` may be accepted only when `local_lane_enabled: true` and `cloud_lane_enabled: true`.
- `CLOUD_ELIGIBLE` is operator-configured at the route-policy level and must never be the default.
- auto-save assessments fail closed to `RULE_ONLY`.
- Context Bus `data_class` defaults to `LOCAL_ONLY`.
- `sensitivity_marker` remains `UNASSESSED` in Phase 6.6 and must not be read as active cloud-eligibility approval.
- Lease v2 may observe route-policy hash and route signature for invalidation only.
- `LOCAL_PREFERRED` is local-only and must not be read as cloud eligibility, data-class expansion, or sensitivity relaxation.
- `GOVERNED_CHANGE` remains deny-cloud in Phase 6.6.
- `CLOUD_ELIGIBLE` and `CLOUD_ASSISTED` are bounded to the explicit cloud fallback contract of Phase 6.6; any broader exercise requires a Warden gate.

## Context Bus boundary
- `authority_tag` must be locally asserted by trusted code and must remain `LINTEL_LOCAL_ENFORCEMENT`.
- packet validation rejects non-default `data_class` values unless active cloud policy explicitly authorizes the configured packet class in Phase 6.6.
- packet validation rejects non-default `sensitivity_marker` values in Phase 6.6.
- excerpt is the only content field and must remain bounded.
- packet presence is not a routing activation signal.
- no retrieval, embeddings, vector stores, remote transport, or uncontrolled workspace search may participate in packet construction.

## Router shell boundary
- the router shell remains single-path and fail-closed.
- the router shell uses the existing route-policy resolution path as its single authoritative source.
- route metadata is truthful about configured mode, actual lane use, and fallback.
- `LOCAL_PREFERRED` is local-only and explicit saves only.
- `CLOUD_ASSISTED` is local-first and explicit saves only.
- cloud denial for `LOCAL_ONLY`, `RESTRICTED`, invalid, or unknown packet state must be explicit in route evidence.
- auto-save assessments fail closed to `RULE_ONLY`.
- no cloud lane executes unless packet validation succeeds, `data_class` is `CLOUD_ELIGIBLE`, and approved local fallback states occur first.
- the router shell must never weaken the enforcement floor.
- ambiguity and invalid route state fail closed and must never weaken the enforcement floor.

## Control-plane dependency boundary
- ARC Console and Vault are not runtime save-path dependencies.
- CLI failure must not weaken or block save enforcement.
- Vault-ready export bundles are local handoff only.
- Phase 6.8 may prepare local evidence bundles only; it may not require ARC, Vault, or any remote service to authorize a save.

## Workspace-targeting boundary
- effective governed root must be truthful for the active file under evaluation
- nested project targeting may refine evidence ownership but must not weaken route decisions
- diagnostics may report workspace-target choice and route posture but may not mutate save outcomes
- fallback root remains local-only and is used only when no matching workspace folder exists
- runtime-status command output must remain governance-anchored so observational-only wording cannot be silently removed
- cloud-related diagnostic fields are descriptive configuration facts only and do not imply readiness, approval, or authorization
- review-surface wording remains descriptive or advisory only and must not imply approval, clearance, or save authorization
- existing review commands may show governed-root and route-posture context, but those summaries do not change route or proof authority

## Identity boundary
- ARC naming identifies the VS Code extension only; it does not imply ARC Console coupling, Vault dependency, or control-plane authority
- command ids remain `lintel.*` until a separately approved package authorizes migration
- branding may strengthen product identity but must not imply cloud readiness, marketplace readiness, or broader runtime permission
- welcome and onboarding work remain outside the identity-freeze package boundary

## Audit Visibility CLI boundary
- Commands are limited to `query`, `trace-directive`, `trace-route`, `perf`, `verify`, and `export`.
- The CLI reads `.arc/audit.jsonl`, `.arc/archive/*.jsonl`, `.arc/perf.jsonl`, and `.arc/blueprints/<directive_id>.md` when directive trace is requested.
- Malformed audit or perf lines are surfaced as partial/incomplete evidence and are never silently normalized into valid history.
- Export writes only to stdout or an explicit operator-selected local file path.
- Route visibility is observational only and remains truthful to the current routing posture.

## Vault-ready export boundary
- export schema version is explicit and must be detectable by downstream consumers
- bundle type is explicit and distinct from runtime audit files
- direct evidence sections remain distinguishable from derived summary sections and validation-result sections
- malformed or incomplete local inputs must remain partial/incomplete; they must never be silently normalized into valid evidence
- exported route, packet, and trust-boundary fields remain observational only and must not overstate execution, permission, or clearance
- Vault-ready means schema alignment for later handoff, not direct Vault write, API submission, or automatic upload
- no background transport path, uploader, or ARC runtime dependency may be introduced in Phase 6.7

## Controlled activation review boundary
- integrated validation must compare every assembled path against the hardened baseline
- no routed or exported path may be accepted if it is looser than the hardened baseline
- rollback target remains hardened-equivalent posture with `RULE_ONLY`, no sustained lanes, unchanged proof enforcement, local review surfaces intact, and no ARC/Vault runtime dependency
- rollback must preserve audit continuity and may not rewrite audit history
- recommendation output is advisory only and must not self-activate any sustained posture

## Still deferred
- actual team/shared-repo deployment of blueprint proof workflow
- dashboards or remote review surfaces
- router-shell execution beyond approved phases and broader cloud enablement
- marketplace/public release work
