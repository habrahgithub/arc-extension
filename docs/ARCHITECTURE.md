# LINTEL Phase 5 Architecture

## Core flow
1. VS Code save events enter the extension lifecycle controller.
2. The controller reads the last committed snapshot and current save mode.
3. The save orchestrator loads optional local workspace mapping, classifies the path, evaluates rules, and preserves the existing enforcement floor.
4. `WARN` remains acknowledgment-based. `REQUIRE_PLAN` requires a complete, canonical, local-only blueprint proof.
5. All proof-resolution paths now force `blueprintMode: 'LOCAL_ONLY'` consistently.
6. Valid `REQUIRE_PLAN` saves persist `directive_id` and `blueprint_id` in the decision payload and audit entry.
7. Local review surfaces render audit, blueprint, and false-positive summaries outside the critical save path and tolerate malformed audit lines by skipping them and marking the review as partial.
8. Local performance instrumentation records save-path and review-surface timing to `.arc/perf.jsonl`.

## Phase 5 additions
- explicit, consistent `LOCAL_ONLY` proof-mode enforcement across all proof call sites
- removal of obsolete `createIfMissing` proof-input contract surface
- exported minimum section-body governance threshold for proof validation
- resilient review-surface parsing for malformed audit lines

## Blueprint policy boundary
- Shared/team blueprint handling is not authorized in Phase 5.
- Template scaffolds are intentionally marked as incomplete until every required section is filled with directive-specific content.
- Structural presence alone is insufficient for `REQUIRE_PLAN` authorization.

## Audit integrity boundary
`verifyChain()` is **file-level integrity only**. It verifies the hash chain across the files that are present, but it does **not** prove archive-existence completeness or detect wholesale deletion of the `.arc/` history.

## Local-model activation boundary
Local-model activation remains out of scope and disabled by default. Before any future activation:
- endpoint constraints must remain local-only or be explicitly re-approved
- prompt-injection exposure from bounded excerpts must be documented with schema-validation plus enforcement-floor mitigations
- stronger audit-integrity claims require a separately approved trust-boundary design

## Still deferred
- actual team/shared-repo deployment of blueprint proof workflow
- dashboards or remote review surfaces
- MCP and cloud routing
- marketplace/public release work
