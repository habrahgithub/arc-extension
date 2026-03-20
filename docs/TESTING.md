# Testing

## Suites
- unit: classifier, rule engine, lease policy, blueprint artifacts, workspace mapping, review surfaces, model parsing, conformance pack
- integration: save orchestrator, lifecycle controller, audit rotation and verification
- e2e: decision matrix, auto-save protection, proof-artifact enforcement, and resilient local review behavior
- governance: local-only adapter posture, runtime artifact hygiene, contract truthfulness, and documentation guardrails

## Required contract
All command gates in the active phase package must exist and pass before closure.

## Phase 5 emphasis
- `LOCAL_ONLY` proof enforcement must be consistent across all proof-resolution paths
- obsolete proof-input fields must not remain in the public contract
- the minimum proof-content threshold must be exported from a single source of truth
- malformed audit lines must not break local review surfaces
- malformed audit lines must not be treated as valid evidence
- local-model activation remains out of scope
