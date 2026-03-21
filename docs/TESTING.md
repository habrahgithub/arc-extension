# Testing

## Suites
- unit: classifier, rule engine, lease policy, blueprint artifacts, workspace mapping, review surfaces, model parsing, route-policy config, Context Bus packet validation, adapter contracts, and Audit Visibility CLI helpers
- integration: save orchestrator, lifecycle controller, audit rotation and verification, route-metadata truthfulness, router shell behavior, local-lane activation gate, cloud fallback gate, and Audit Visibility CLI command behavior
- e2e: decision matrix, auto-save protection, proof-artifact enforcement, resilient local review behavior, Phase 6.2 observational CLI behavior preservation, Phase 6.3 Context Bus inertness preservation, Phase 6.4 router-shell preservation, Phase 6.5 local-lane activation gate, Phase 6.6 cloud fallback gate, and Phase 6.7 Vault-ready export validation
- governance: adapter posture, runtime artifact hygiene, contract truthfulness, documentation guardrails, and command-surface constraints

## Required contract
All command gates in the active phase package must exist and pass before closure.

## Phase 6.7 emphasis
- Lease v2 coverage must retain route-policy hash invalidation and route signature invalidation semantics.
- Audit Visibility CLI coverage must retain CLI export contract correctness and malformed-entry partial-evidence handling.
- Vault-ready export coverage must retain versioned schema generation, bundle validation, and local-only destination discipline.
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
