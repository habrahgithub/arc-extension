---
name: Fail-Closed Governance Integrity
description: Prevent permissive fallbacks when policy, routing, parser, or proof state is missing/invalid.
---

# Fail-Closed Governance Integrity

## Context

This project relies on fail-closed governance: missing/invalid policy or ambiguous route state must degrade to restrictive behavior (`RULE_ONLY`, proof-required blocking, advisory-only surfaces). Deterministic tests exist, but review should still catch subtle logic drift that can widen authority.

## What to Check

### 1. Missing/invalid config paths stay restrictive

Inspect changes around route policy parsing/loading and runtime config. Confirm invalid or absent config cannot open local/cloud lanes or reduce rule-floor strictness.

Good pattern:

- invalid policy -> restrictive fallback with truthful audit/status messaging

Bad pattern:

- parse/load error -> permissive defaults
- auto-save taking non-`RULE_ONLY` route

### 2. Ambiguous or partial state does not become authorization

Where packet class, route signatures, policy hashes, or lease checks fail/are absent, decisions must remain conservative.

Bad pattern:

- uncertainty treated as "eligible"
- signature mismatch accepted as valid

### 3. Error handling does not skip governance checks

Catch/timeout/retry branches in model and save orchestration must not bypass rule evaluation, proof validation, or audit continuity.

Bad pattern:

- exception path proceeds without proof check
- timeout fallback becomes allow-path without explicit policy support

## Key Files

- `src/core/routerPolicy.ts`
- `src/core/decisionPolicy.ts`
- `src/core/decisionLease.ts`
- `src/extension/saveOrchestrator.ts`
- `src/extension/saveLifecycleController.ts`
- `src/adapters/modelAdapter.ts`
- `tests/governance/*.test.ts`
- `tests/integration/saveOrchestrator.test.ts`

## Exclusions

- Purely cosmetic logging changes with unchanged decision semantics.
- New test cases that intentionally simulate permissive states as failures.
