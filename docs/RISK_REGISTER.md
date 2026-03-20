# Risk Register

## Accepted Phase 5 risks
- heuristic-first classification may still create false positives/negatives even with optional local mapping
- revert safety net depends on editor save lifecycle rather than a true pre-save cancel
- audit verification is file-level only and does not prove archive completeness
- local-model implementation exists but remains disabled pending future activation approval

## Mitigated in Phase 5
- spread-order ambiguity in proof enforcement via explicit `LOCAL_ONLY` normalization
- stale proof-input contract expectations via removal of obsolete `createIfMissing`
- unnamed validation threshold via exported governance constant
- local review-surface fragility via malformed-audit-line tolerance and partial-review warnings

## Deferred mitigations
- shared/team blueprint deployment after a separate data-handling policy review
- stronger audit-integrity guarantees beyond local file-level chaining
- endpoint lock, prompt-injection disclosure, and activation-specific controls for any future local-model authorization
- dashboards, remote surfaces, MCP, cloud routing, and public release work
