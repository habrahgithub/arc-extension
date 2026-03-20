# LINTEL Code

Phase 5 implementation of the LINTEL local-first IDE governance layer.

## Phase 5 scope
- VS Code save-time governance for `ALLOW / WARN / REQUIRE_PLAN / BLOCK`
- optional local workspace mapping to refine local precision without weakening rule floors
- local-only, read-only review surfaces for audit, proof, and false-positive analysis
- append-only local audit writer with hash-chain integrity and rotation
- local performance instrumentation at `.arc/perf.jsonl`
- blueprint-backed `REQUIRE_PLAN` proof at `.arc/blueprints/<directive_id>.md`
- content-level blueprint validation using a named governance threshold constant
- resilient review-surface parsing for malformed local audit lines
- local Ollama adapter present but disabled by default

## Important limitations
- classification remains heuristic-first, with optional local mapping only
- audit verification is **file-level integrity only** and does not prove archive-existence completeness
- shared/team blueprint handling remains unauthorized in Phase 5
- local-model activation remains out of scope and disabled by default
- dashboards, MCP, cloud routing, and public release work remain deferred

## Phase 5 proof workflow
1. `REQUIRE_PLAN` requests a directive ID.
2. LINTEL validates the canonical artifact path `.arc/blueprints/<directive_id>.md` under enforced `LOCAL_ONLY` mode.
3. Save may proceed only when the blueprint is complete, local-only, and linked in the audit entry via `directive_id` and `blueprint_id`.
4. Local review surfaces remain available even if malformed audit lines are present; malformed lines are skipped and reported as partial review warnings.

## Local review commands
- `LINTEL: Review Audit Log`
- `LINTEL: Review Blueprint Proofs`
- `LINTEL: Review False-Positive Candidates`

## Commands
- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run test:governance`
- `npm run build`
