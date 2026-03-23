# ARC — Audit Ready Core Architecture

## Companion references

- `docs/CODE_MAP.md` — source-file map, dependency graph, save-path flow, and test coverage reference
- `README.md` — product boundary and phase-specific operator/governance constraints
- `docs/TESTING.md` — validation, governance anchoring, and phase-specific test emphasis

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

## Phase 7.4 additions

- bounded retry and timeout handling for the local model adapter
- parser hardening that treats malformed or contradictory model output as explicit `PARSE_FAILURE`
- local-only environment-backed runtime configuration for host, model, timeout, and retry count
- expanded local performance instrumentation covering classification, rule evaluation, model evaluation, and total save assessment timing

## Phase 7.5 additions

- bounded welcome/onboarding surface for first-use operator guidance
- `lintel.showWelcome` command (`ARC: Show Welcome Guide`) for onboarding
- explicit onboarding wording distinguishing extension identity from ARC Console, Vault, or control-plane
- governance tests anchoring onboarding truthfulness (no authorization, cloud, or coupling implication)

## Phase 7.6 additions

- proof-state messaging clarity refinements (7 states preserved, no redesign)
- explicit distinction between local blueprints (`.arc/blueprints/`) and Axis execution packages
- clarified template creation semantics (starting point, not authorization)
- governance tests anchoring fail-closed messaging preservation

## Blueprint policy boundary

- Shared/team blueprint handling is not authorized in Phase 5.
- Template scaffolds are intentionally marked as incomplete until every required section is filled with directive-specific content.
- Structural presence alone is insufficient for `REQUIRE_PLAN` authorization.

## Proof-resolution states

The extension validates REQUIRE_PLAN saves against 8 proof states:

| State                     | Meaning                                                                      | Operator Action                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `VALID`                   | Blueprint linkage is valid. All sections contain directive-specific content. | Proceed with plan-backed save.                                                                    |
| `MISSING_DIRECTIVE`       | No directive ID provided. Hard enforcement block.                            | Provide directive ID (e.g., `LINTEL-PH5-001`) and create local blueprint.                         |
| `INVALID_DIRECTIVE`       | Directive ID format is invalid.                                              | Use uppercase, hyphenated format (e.g., `LINTEL-PH5-001`).                                        |
| `MISSING_ARTIFACT`        | No local blueprint file exists. Hard enforcement block.                      | Create `.arc/blueprints/<directive>.md`. Template is starting point — must complete all sections. |
| `MISMATCHED_BLUEPRINT_ID` | Supplied blueprint path doesn't match canonical path.                        | Link to canonical path `.arc/blueprints/<directive>.md`.                                          |
| `MALFORMED_ARTIFACT`      | Blueprint missing required sections or directive metadata.                   | Repair blueprint to include directive ID and all required sections.                               |
| `INCOMPLETE_ARTIFACT`     | Blueprint contains placeholder text or `INCOMPLETE_TEMPLATE` banner.         | Replace all `[REQUIRED]` placeholders with directive-specific content.                            |
| `UNAUTHORIZED_MODE`       | Non-LOCAL_ONLY mode requested.                                               | Use `LOCAL_ONLY` mode or request new Axis directive.                                              |

**Note:** The extension validates only local blueprint files in `.arc/blueprints/`. Axis execution packages (in `agents/axis/`) are outside the extension's runtime.

## Audit integrity boundary

`verifyChain()` is **file-level integrity only**. It verifies the hash chain across the files that are present, but it does **not** prove archive-existence completeness or detect wholesale deletion of the `.arc/` history.

## Local-model activation boundary

Local-model activation in Phase 6.8 is bounded to the local lane only unless a separately approved phase widens it.

- endpoint constraints for the local lane must remain local-only or be explicitly re-approved
- prompt-injection exposure from bounded excerpts must be documented with schema-validation plus enforcement-floor mitigations
- stronger audit-integrity claims require a separately approved trust-boundary design
- runtime retries, timeout handling, and parser hardening remain degradation paths only and must not become authorization paths
- non-local `OLLAMA_HOST` configuration must fail closed or remain explicitly operator-responsibility only; it must not imply cloud-lane activation

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

## Runtime configuration and instrumentation boundary

- local runtime configuration is bounded to host, model identifier, timeout, and retry count
- missing or invalid runtime configuration fails closed to the established local baseline
- non-local host configuration does not imply cloud readiness, cloud execution, or broader remote authority
- performance instrumentation remains observational only and may record classification, rule evaluation, model evaluation, and total save-path timing
- warmup/readiness behavior must remain bounded support behavior and must not introduce autonomous decisioning or background save authorization

## Workspace-targeting boundary

- effective governed root must be truthful for the active file under evaluation
- nested project targeting may refine evidence ownership but must not weaken route decisions
- diagnostics may report workspace-target choice and route posture but may not mutate save outcomes
- fallback root remains local-only and is used only when no matching workspace folder exists
- runtime-status command output must remain governance-anchored so observational-only wording cannot be silently removed
- cloud-related diagnostic fields are descriptive configuration facts only and do not imply readiness, approval, or authorization
- review-surface wording remains descriptive or advisory only and must not imply approval, clearance, or save authorization
- existing review commands may show governed-root and route-posture context, but those summaries do not change route or proof authority

## Phase 7.8 additions

- staleness detection for last-decision display (file-mismatch and time-threshold models)
- audit-read degradation handling that degrades to "audit unavailable" not "audit clean"
- descriptive-only staleness wording that does not reassure or overclaim certainty
- trigger-context schema documentation with accurate field optionality
- governance tests verifying semantic meaning of degraded/stale wording, not just string presence

## Phase 7.9 additions

- false-positive candidate quality scoring and ranking (advisory only)
- demotion reason field added to Classification type (explicit, testable)
- classification precision improvements based on evidence-backed patterns
- governance tests verifying enforcement-floor preservation and demotion explicitness
- governance tests verifying enforcement-floor preservation and demotion explicitness
- documentation of false-positive handling patterns and limitations

## Phase 7.10 additions

- internal UAT scenario pack (25 scenarios across 5 categories)
- rollback and recovery drill documentation (5 scenarios with evidence tracking)
- operator runbook hardening with internal-pilot wording
- governance tests verifying UAT truthfulness and runbook alignment
- evidence bundle referencing artifacts (not self-certifying)

## Phase 7.10 — Internal Pilot Readiness

Phase 7.10 certifies **INTERNAL PILOT READINESS** only through evidence-backed validation artifacts.

### UAT Scenario Categories

| Category                    | Scenarios | Coverage                                                    |
| --------------------------- | --------- | ----------------------------------------------------------- |
| Save-Time Governance Flows  | S01–S05   | ALLOW/WARN/REQUIRE_PLAN/BLOCK decisions, auto-save behavior |
| Proof Flows                 | P01–P05   | Blueprint linkage, validation, error handling               |
| Review Flows                | R01–R08   | Audit, runtime status, blueprint, false-positive review     |
| Degraded Runtime Flows      | D01–D05   | Audit-read failure, missing config, staleness               |
| False-Positive Review Flows | F01–F05   | Quality scoring, advisory disclaimer, BLOCK exclusion       |

### Rollback Drill Scenarios

| Scenario                 | Objective                     | Verification              |
| ------------------------ | ----------------------------- | ------------------------- |
| R1: Extension Rollback   | Restore to Phase 7.9 baseline | Git checkout, build, test |
| R2: Workspace Gitlink    | Restore workspace gitlink     | Gitlink verification      |
| R3: Audit Continuity     | Preserve audit history        | Entry count, hash chain   |
| R4: Command Stability    | Verify command functionality  | Execute all 5 commands    |
| R5: Enforcement Behavior | Verify unchanged governance   | ALLOW/WARN/REQUIRE_PLAN   |

### Pilot Readiness Boundaries

**Certified:**

- Internal lab use
- Controlled workspace environments
- Evidence-backed validation

**Not Certified:**

- Public release readiness
- Marketplace readiness
- Production deployment readiness
- Cloud-lane readiness (disabled by default)

### Evidence Artifacts

- `docs/PHASE-7.10-UAT-SCENARIOS.md` — UAT scenario matrix with verification commands
- `docs/PHASE-7.10-ROLLBACK-DRILL.md` — Rollback drill with pre/post state tracking
- `tests/governance/phase7.10-pilotReadiness.test.ts` — Governance tests (18 tests)

**Important:** Phase 7.10 readiness is **evidence-backed, not self-certified**. Evidence artifacts reference retained documentation and test results, not narrative assertions.

## Phase 7.9 — False-Positive Quality Scoring

Phase 7.9 introduces **advisory-only** false-positive quality scoring to help operators identify which non-ALLOW decisions are most likely to be true false positives vs legitimate enforcement.

### Quality Score Factors

| Factor                         | Score | Rationale                                                        |
| ------------------------------ | ----- | ---------------------------------------------------------------- |
| Decision is `WARN`             | +30   | WARN decisions are more likely false positives than REQUIRE_PLAN |
| Decision is `REQUIRE_PLAN`     | +10   | Plan-backed decisions are less likely false positives            |
| Source is `RULE` or `FALLBACK` | +20   | Rule-only evaluations lack model context                         |
| No matched rules               | +25   | Flagged without rule match suggests over-cautious classification |
| Fallback: `CONFIG_MISSING`     | +15   | Config issues may cause spurious flags                           |
| Fallback: `CONFIG_INVALID`     | +15   | Invalid config may cause spurious flags                          |

### Quality Labels

| Score Range | Label     | Meaning                                                                 |
| ----------- | --------- | ----------------------------------------------------------------------- |
| ≥50         | ⚡ High   | Rule-only evaluation with no matched rules — most likely false positive |
| 30–49       | 🔶 Medium | WARN decision or rule-only evaluation                                   |
| <30         | 🔷 Low    | REQUIRE_PLAN or model-evaluated — less likely false positive            |

**Important:** Quality scoring is **advisory only** (WRD-0081). It does not:

- Override recorded decisions
- Weaken the enforcement floor
- Rewrite audit history
- Authorize future saves

## Phase 7.9 — Demotion Clarity

Phase 7.9 makes demotion logic **explicit and testable** (WRD-0082) by adding a `demotionReason` field to the `Classification` type.

### Demotion Reasons

| Reason                | Condition                     | Meaning                                                            |
| --------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `UI_PATH_SINGLE_FLAG` | UI path + exactly 1 risk flag | Single-flag UI paths are demoted to reduce false-positive friction |

### Demotion Logic (classifier.ts)

```typescript
if (
  riskFlags.length > 0 &&
  isUiPath(input.filePath, options.additionalUiSegments) &&
  riskFlags.length < 2
) {
  const demotedRisk = demoteRisk(riskLevel);
  if (demotedRisk !== riskLevel) {
    riskLevel = demotedRisk;
    demoted = true;
    demotionReason = 'UI_PATH_SINGLE_FLAG';
  }
}
```

**Constraints:**

- Demotion only applies to UI paths (components/ui/views segments)
- Demotion only applies with exactly 1 risk flag
- Non-UI paths preserve original risk level
- Multi-flag paths preserve original risk level
- Demotion reason is always explicit in the Classification result

## Trigger and Audit Schema (Phase 7.8)

This section documents the trigger-context and audit-entry fields for maintainers and audit consumers. Fields marked **optional** may be absent in older audit entries or when the evaluation path did not produce them.

### DecisionPayload fields (embedded in AuditEntry)

| Field                       | Type             | Required     | Description                                                                                                                                   |
| --------------------------- | ---------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `decision`                  | `Decision`       | **required** | The governance decision: `ALLOW`, `WARN`, `REQUIRE_PLAN`, `BLOCK`.                                                                            |
| `reason`                    | `string`         | **required** | Human-readable explanation of the decision.                                                                                                   |
| `risk_level`                | `RiskLevel`      | **required** | Assessed risk: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.                                                                                           |
| `violated_rules`            | `string[]`       | **required** | List of rule IDs that matched (may be empty).                                                                                                 |
| `next_action`               | `string`         | **required** | Operator-facing next action guidance.                                                                                                         |
| `source`                    | `DecisionSource` | **required** | Decision origin: `RULE`, `MODEL`, `CLOUD_MODEL`, `MODEL_DISABLED`, `FALLBACK`.                                                                |
| `fallback_cause`            | `FallbackCause`  | **required** | Why fallback occurred (if applicable): `NONE`, `MODEL_DISABLED`, `RULE_ONLY`, `UNAVAILABLE`, `TIMEOUT`, `PARSE_FAILURE`, `ENFORCEMENT_FLOOR`. |
| `lease_status`              | `LeaseStatus`    | **required** | Lease state: `NEW`, `REUSED`, `EXPIRED`, `BYPASSED`.                                                                                          |
| `directive_id`              | `string`         | optional     | Linked directive ID (only for `REQUIRE_PLAN` saves with valid blueprint).                                                                     |
| `blueprint_id`              | `string`         | optional     | Linked blueprint ID (only for `REQUIRE_PLAN` saves with valid blueprint).                                                                     |
| `route_mode`                | `RouteMode`      | optional     | Configured route mode: `RULE_ONLY`, `LOCAL_PREFERRED`, `CLOUD_ASSISTED`.                                                                      |
| `route_lane`                | `RouteLane`      | optional     | Actual execution lane: `RULE_ONLY`, `LOCAL`, `CLOUD`.                                                                                         |
| `route_reason`              | `string`         | optional     | Why this route was selected.                                                                                                                  |
| `route_clarity`             | `RouteClarity`   | optional     | Route state clarity: `CLEAR`, `AMBIGUOUS`.                                                                                                    |
| `route_fallback`            | `RouteFallback`  | optional     | Fallback reason if any: `NONE`, `CONFIG_MISSING`, `CONFIG_INVALID`, `AUTO_SAVE_BLOCKED`, `PACKET_INVALID`, `DATA_CLASS_DENIED`.               |
| `route_policy_hash`         | `string`         | optional     | Hash of the route policy used (for lease invalidation).                                                                                       |
| `evaluation_lane`           | `RouteLane`      | optional     | Non-`RULE_ONLY` lane if used (derived from `route_lane`).                                                                                     |
| `save_mode`                 | `SaveMode`       | optional     | Phase 7.7+: `EXPLICIT` or `AUTO`. May be absent in older entries.                                                                             |
| `auto_save_mode`            | `AutoSaveMode`   | optional     | Phase 7.7+: VS Code auto-save mode. May be absent in older entries.                                                                           |
| `model_availability_status` | `string`         | optional     | Phase 7.7+: Model state. May be absent in older entries.                                                                                      |

### AuditEntry envelope fields

| Field           | Type         | Required     | Description                                                            |
| --------------- | ------------ | ------------ | ---------------------------------------------------------------------- |
| `ts`            | `string`     | **required** | ISO 8601 timestamp of the decision.                                    |
| `file_path`     | `string`     | **required** | Absolute file path of the evaluated file.                              |
| `risk_flags`    | `RiskFlag[]` | **required** | Risk flags triggered: `AUTH_CHANGE`, `SCHEMA_CHANGE`, `CONFIG_CHANGE`. |
| `matched_rules` | `string[]`   | **required** | Rule IDs that matched (same as `violated_rules` for compatibility).    |
| `prev_hash`     | `string`     | **required** | Previous entry hash (chain integrity).                                 |
| `hash`          | `string`     | **required** | This entry's hash (file-level integrity only).                         |

### Staleness model (Phase 7.8 display-only)

Staleness is a **display-only** indicator for operator context. It does not invalidate prior decisions.

| Condition                               | Staleness Reason | Meaning                                                |
| --------------------------------------- | ---------------- | ------------------------------------------------------ |
| `lastAudit.file_path !== activeFile`    | `FILE_MISMATCH`  | Decision was for a different file.                     |
| `Date.now() - lastAudit.ts > 5 minutes` | `TIME_THRESHOLD` | Decision is from an earlier session.                   |
| Both conditions                         | `BOTH`           | Decision is from a different file and earlier session. |
| Neither condition                       | (none)           | Decision context is current.                           |

**Important:** Staleness is descriptive only. A stale decision may still be valid for its original file. The indicator only warns the operator that the displayed context may not reflect the current editor state.

### Audit-read degradation (Phase 7.8)

When audit data cannot be read cleanly:

- Display degrades to "audit unavailable" — not "audit clean" or "no issues"
- Raw error details are not exposed to the operator surface
- The enforcement floor remains authoritative despite audit-read failure
- Absence of audit evidence does not imply approval or success

### Integrity boundary

The `hash` and `prev_hash` fields provide **file-level integrity only**:

- They verify the hash chain across files that are present
- They do **not** prove archive-existence completeness
- They do **not** detect wholesale deletion of `.arc/` history
- They do **not** guarantee all saves were recorded

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
