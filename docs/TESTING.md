# Testing

## Suites
- unit: classifier, rule engine, lease policy, blueprint artifacts, workspace mapping, review surfaces, model parsing, route-policy config, Context Bus packet validation, adapter contracts, and Audit Visibility CLI helpers
- integration: save orchestrator, lifecycle controller, audit rotation and verification, route-metadata truthfulness, router shell behavior, local-lane activation gate, cloud fallback gate, and Audit Visibility CLI command behavior
- e2e: decision matrix, auto-save protection, proof-artifact enforcement, resilient local review behavior, Phase 6.2 observational CLI behavior preservation, Phase 6.3 Context Bus inertness preservation, Phase 6.4 router-shell preservation, Phase 6.5 local-lane activation gate, Phase 6.6 cloud fallback gate, Phase 6.7 Vault-ready export validation, and Phase 6.8 integrated rollback drill
- governance: adapter posture, runtime artifact hygiene, contract truthfulness, documentation guardrails, and command-surface constraints
- performance: deterministic beta baselines for classification, rule evaluation, model-evaluation harness behavior, and total explicit-save assessment time
- smoke harness: deterministic local-only operator validation for repeatable non-cloud checks

## Required contract
All command gates in the active phase package must exist and pass before closure.

## Performance suite

- Run with `npm run test:performance`
- The suite is intentionally local and deterministic:
  - no live Ollama dependency
  - no cloud dependency
  - model timings use a bounded local stub adapter
- The suite records beta baselines for:
  - `classifyFile()`
  - `evaluateRules()`
  - model-evaluation harness behavior
  - `SaveOrchestrator.assessSave()` in explicit-save `LOCAL_PREFERRED` mode
- Thresholds are conservative beta gates, not realtime guarantees
- Retain concise summaries/transcripts for release evidence under `artifacts/ARC-PERF-001/`

## Phase 7.0 emphasis
- workspace-target resolution must prefer nested governed roots truthfully when boundary markers exist
- runtime status diagnostics must remain observational only
- nested-project audit targeting must not silently land in a parent `.arc/` when a nearer governed boundary exists
- internal install/package path must remain documented and repeatable
- `npm run smoke:harness` must remain deterministic and local-only
- Lease v2 coverage must retain route-policy hash invalidation and route signature invalidation semantics.
- Audit Visibility CLI coverage must retain CLI export contract correctness and malformed-entry partial-evidence handling.
- Vault-ready export coverage must retain versioned schema generation, bundle validation, and local-only destination discipline.
- integrated validation coverage must prove no assembled path is looser than the hardened baseline.
- route-policy config must fail closed to `RULE_ONLY`
- Context Bus packets must remain bounded and local-only by default
- packet validation must accept `CLOUD_ELIGIBLE` only when explicit cloud policy authorizes it
- packet validation must reject malformed or unknown packet states
- router shell insertion without decision drift must remain covered explicitly
- `LOCAL_PREFERRED` must remain local-only and explicit saves only
- `CLOUD_ASSISTED` must remain local-first and explicit saves only
- auto-save assessments fail closed to `RULE_ONLY`
- `LOCAL_ONLY`, `RESTRICTED`, invalid, and unknown packet states must deny cloud explicitly
- route-related audit metadata must distinguish configured mode from actual lane execution
- cloud fallback must occur only after approved local fallback states
- cloud output must pass through the existing enforcement floor unchanged
- timeout, parse failure, unavailable, undefined result, and adapter-disabled fallback must all degrade to rule-first outcomes
- no full-file payload, packet governance metadata, or uncontrolled workspace expansion may reach cloud execution
- CLI failure must not weaken or block save enforcement
- Vault-ready export bundles must distinguish direct evidence, derived summaries, and validation-result sections
- malformed or incomplete export inputs must surface as `PARTIAL`, not be silently normalized
- no direct Vault write path, ARC dependency, or remote upload path may appear in export flows
- rollback drill must restore hardened-equivalent posture and preserve audit continuity
- cloud denial matrix must be exercised during integrated validation, not merely documented

## Phase 7.1 emphasis
- runtime status command must remain governance-anchored in `test:governance`
- runtime status diagnostics must retain explicit observational-only disclaimer text
- cloud-related runtime status fields must remain factual and non-authorizing
- fail-closed reporting for missing/invalid policy and reduced-guarantee auto-save must remain explicit
- command-surface changes for operator diagnostics must not silently weaken the established non-cloud enforcement floor

## Phase 7.2 emphasis
- enforcement-related review-surface wording must remain governance-anchored
- review surfaces must stay local-only, read-only, and non-authorizing
- proof-required messaging must remain truthful to actual local blueprint validity
- false-positive candidate wording must remain advisory only and must not imply decision demotion
- governed-root and route-posture summaries in review surfaces must remain descriptive only

## Phase 7.3 emphasis
- manifest identity freeze must remain governance-anchored in package and documentation checks
- user-facing command titles may change, but command ids must remain `lintel.*` unless a separate package authorizes migration
- ARC XT naming must not imply ARC Console coupling, Vault dependency, cloud readiness, or broader runtime authority
- identity work must not introduce welcome screens, onboarding flows, or new UI surfaces

## Phase 7.4 emphasis
- retries, timeout handling, and parser hardening must remain fail-closed and rule-floor preserving
- local runtime configuration must remain bounded, default-safe, and local-only in posture
- non-local `OLLAMA_HOST` values must not imply cloud-lane activation or broader remote authority
- performance instrumentation must remain observational only and must not affect save decisions
- Malformed or contradictory model output must surface as explicit fallback behavior rather than silent repair
