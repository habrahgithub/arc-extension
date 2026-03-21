# Risk Register

## Accepted Phase 5 risks
- heuristic-first classification may still create false positives/negatives even with optional local mapping
- revert safety net depends on editor save lifecycle rather than a true pre-save cancel
- audit verification is file-level only and does not prove archive completeness
- local-model implementation exists but remains disabled pending future activation approval

## Accepted Phase 6.0 risks
- activation-contract scaffolding introduces future trust-boundary fields that could be misread if contract semantics drift
- route-policy metadata currently improves observability only and does not yet participate in lease invalidation
- Context Bus `data_class` remains fail-closed to `LOCAL_ONLY`; future reclassification requires separate review

## Accepted Phase 6.1 risks
- Lease v2 now treats route-policy state as an invalidation input, so accidental fingerprint drift could reduce reuse frequency
- future trust-boundary values remain present in types but must stay inert until separately Warden-gated

## Accepted Phase 6.2 risks
- operator-visible audit exports could overstate trust if CLI output is not kept truthful about `RULE_ONLY` posture
- malformed local evidence could lead to incomplete operator review, so partial-evidence handling must stay explicit
- local export files may contain governed evidence and therefore require deliberate operator handling outside the save path

## Accepted Phase 6.3 risks
- Context Bus validation now hardens trust-boundary precursor fields, so validator drift could falsely reject otherwise valid local saves
- canonical packet hashing introduces a second integrity contract that must remain aligned with packet field semantics over time
- future phases may over-interpret required `data_class` and `sensitivity_marker` fields unless inert/default semantics remain explicit

## Accepted Phase 6.4 risks
- the router shell becomes a live boundary in the save path, so any divergence from the single authoritative route-policy path could introduce hidden behavior drift
- stale or misleading route reason strings could overstate route execution if not kept truthful as the shell becomes formalized
- future activation phases may rely on inert lane descriptors, so Phase 6.4 must keep them structurally present but non-executable

## Accepted Phase 6.5 risks
- local-lane activation introduces the first live model call in the save path, so timeout and availability regressions could increase latency or fallback frequency
- `LOCAL_PREFERRED` is now active for explicit saves, so route metadata must distinguish configured preference from actual lane execution truthfully
- auto-save denial must remain explicit or local inference could silently expand beyond the authorized save boundary

## Accepted Phase 6.6 risks
- cloud fallback introduces the first remote trust-boundary expansion, so routing mistakes could expose bounded code context outside the machine
- `CLOUD_ASSISTED` is now active for lab-only explicit saves, so route metadata must distinguish denial, attempt, and cloud execution truthfully
- packet-class policy drift could accidentally widen cloud eligibility if operator-configured `CLOUD_ELIGIBLE` semantics are not kept fail-closed

## Accepted Phase 6.7 risks
- Vault-ready export formalizes an external evidence boundary, so schema drift could mislead downstream consumers if section classes stop being explicit
- partial local evidence may still be handed off intentionally, so operators must understand `PARTIAL` as incomplete evidence rather than full clearance
- local export files contain governed evidence and therefore require deliberate operator handling after generation

## Accepted Phase 6.8 risks
- integrated validation may expose latent coupling between routing, proof enforcement, export, and rollback flows that were not visible in isolated phase tests
- rollback drill depends on evidence-backed state comparison; weak instrumentation could understate residual risk
- advisory activation recommendations could be misread as operational approval if not kept explicitly non-self-activating

## Mitigated in Phase 5
- spread-order ambiguity in proof enforcement via explicit `LOCAL_ONLY` normalization
- stale proof-input contract expectations via removal of obsolete `createIfMissing`
- unnamed validation threshold via exported governance constant
- local review-surface fragility via malformed-audit-line tolerance and partial-review warnings

## Mitigated in Phase 6.0
- disabled-by-default route-policy scaffolding with `RULE_ONLY` fallback on missing or invalid config
- bounded Context Bus packet contract to prevent full-file or retrieval expansion
- route-related audit truthfulness constraints to prevent false inference claims
- explicit documentation that ARC Console and Vault are not save-path runtime dependencies

## Mitigated in Phase 6.1
- Lease v2 now invalidates on route-policy hash and route signature rather than reusing stale acknowledgements across governed-state drift
- route-policy inputs are constrained to invalidation only and do not activate non-default route modes
- carried-forward Warden-gated values are documented as inert until separately authorized

## Mitigated in Phase 6.2
- Audit Visibility CLI is limited to query / trace / verify / export and has no mutation-capable command surface
- Vault-ready export remains local handoff only with stdout or explicit local file output
- malformed audit and perf lines surface as partial evidence rather than silently normalizing into valid history
- save enforcement remains independent of CLI availability or success

## Mitigated in Phase 6.3
- Context Bus `authority_tag` is locally asserted and validated, preventing caller/config-forged provenance
- Context Bus `data_class` and `sensitivity_marker` remain fail-closed to `LOCAL_ONLY` / `UNASSESSED`
- packet construction remains excerpt-bounded and does not read full-file content when no selection exists
- retrieval, embeddings, vector stores, remote transport, and uncontrolled workspace search remain explicitly out of scope

## Mitigated in Phase 6.4
- router shell formalization now delegates to the existing authoritative route-policy path, preventing competing route resolvers
- local and cloud lane descriptors remain disabled and non-executable
- route metadata reason strings are updated to reflect Phase 6.4 shell semantics truthfully
- ambiguity and invalid route state remain fail-closed and cannot permissively weaken the rule-first floor

## Mitigated in Phase 6.5
- local-lane activation reuses the existing Ollama adapter, existing model evaluation pipeline, and unchanged enforcement floor rather than introducing a second invocation path
- `LOCAL_PREFERRED` is bounded to local-only explicit saves; `CLOUD_ASSISTED`, `CLOUD_ELIGIBLE`, and `GOVERNED_CHANGE` remain inert until separately authorized
- auto-save assessments fail closed to `RULE_ONLY`, keeping local inference out of the reduced-guarantee auto-save path
- timeout, parse failure, unavailable, undefined result, and adapter-disabled states all degrade to rule-first outcomes

## Mitigated in Phase 6.6
- cloud fallback remains disabled by default and lab-only until explicit operator policy enables `CLOUD_ASSISTED`
- cloud execution is denied for `LOCAL_ONLY`, `RESTRICTED`, invalid, and unknown packet state
- cloud execution is denied on auto-save and cannot bypass successful local execution
- cloud payload is bounded to `ContextPayload` only and cannot include full-file content or packet governance metadata
- cloud output passes through the unchanged enforcement floor and cannot weaken the rule-first decision
- the orchestrator uses a single adapter pipeline, preventing competing direct cloud invocation paths

## Mitigated in Phase 6.7
- Vault-ready export remains local-only with stdout or explicit local-file destinations only
- versioned bundle schema makes export structure explicit and detectable for downstream consumers
- bundle validation marks malformed or incomplete source evidence as `PARTIAL` rather than silently normalizing it
- raw evidence, derived summaries, and validation-result sections are now structurally distinct in the export contract
- save authorization remains independent from export success, Vault availability, and ARC availability

## Mitigated in Phase 6.8
- integrated validation now exercises assembled Phase 6 behavior together rather than relying solely on isolated micro-phase tests
- rollback drill evidence verifies restoration to hardened-equivalent posture instead of relying on narrative rollback claims
- audit continuity is explicitly checked across route activation, denial, export, and rollback transitions
- lane-by-lane activation output is documented as advisory only and cannot self-authorize sustained activation

## Deferred mitigations
- shared/team blueprint deployment after a separate data-handling policy review
- stronger audit-integrity guarantees beyond local file-level chaining
- provider lock, credential handling, prompt-injection disclosure, and activation-specific controls for broader cloud authorization
- router-shell execution beyond approved phases, dashboards, remote surfaces, MCP, and public release work
