# LINTEL / ARC Code Map

**Project:** ARC XT — Audit Ready Core (internal: `lintel`)
**Type:** VS Code extension — local-first governed save-time enforcement
**Source:** 5,764 lines across 24 files | Tests: 5,186 lines across 37 files
**Current phase:** 7.7 (Trigger Visibility and Save-Decision Traceability)

---

## Directory Structure

```
projects/lintel/
├── src/
│   ├── contracts/          # Type definitions (no runtime logic)
│   ├── core/               # Pure business logic (no VS Code dependency)
│   ├── adapters/           # External integration adapters (Ollama, cloud)
│   ├── extension/          # VS Code integration layer
│   ├── extension.ts        # Extension entry point (activate/deactivate)
│   └── cli.ts              # Audit Visibility CLI entry point
├── tests/
│   ├── unit/               # Per-module unit tests
│   ├── integration/        # Cross-module tests (orchestrator, lifecycle, CLI)
│   ├── e2e/                # Phase-by-phase end-to-end pilots
│   ├── governance/         # Semantic truthfulness and boundary tests
│   └── fixtures/           # Shared test data
├── docs/                   # ARCHITECTURE.md, RISK_REGISTER.md, TESTING.md
├── artifacts/              # Phase evidence summaries and closure records
├── rules/                  # Default risk rules (JSON) and schemas
└── .arc/                   # Runtime data (audit.jsonl, perf.jsonl, blueprints/)
```

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│  VS Code Extension Layer                                │
│  extension.ts → commands, save interception, UI prompts │
│  extension/*  → orchestration, lifecycle, surfaces      │
├─────────────────────────────────────────────────────────┤
│  Adapter Layer                                          │
│  adapters/modelAdapter.ts → Ollama, Cloud, Disabled     │
├─────────────────────────────────────────────────────────┤
│  Core Business Logic                                    │
│  core/* → classifier, rules, policy, audit, proofs,     │
│           routing, leasing, packets, performance        │
├─────────────────────────────────────────────────────────┤
│  Contract Layer                                         │
│  contracts/types.ts → all shared type definitions       │
├─────────────────────────────────────────────────────────┤
│  CLI Layer (read-only)                                  │
│  cli.ts → audit query, trace, verify, export            │
└─────────────────────────────────────────────────────────┘
```

---

## Save-Path Flow

```
VS Code save event
    │
    ▼
extension.ts: onWillSaveTextDocument
    │
    ▼
SaveLifecycleController.prepareSave()
    │
    ▼
SaveOrchestrator.assessSave()
    ├── classifyFile()          → risk level, matched rules
    ├── buildContext()          → bounded excerpt, risk flags
    ├── buildContextPacket()    → hashed packet with authority tag
    ├── RouterShell.resolve()   → route mode, lane enablement
    ├── evaluateRules()         → rule-based decision + floor
    ├── DecisionLeaseStore      → check for reusable lease
    └── evaluateLane()          → model evaluation (local/cloud)
        ├── OllamaModelAdapter  → local model
        ├── CloudModelAdapter   → cloud fallback (if approved)
        └── DisabledModelAdapter→ no-op
    │
    ▼
enforceMinimumFloor()           → decision never weaker than risk floor
    │
    ▼
SaveOrchestrator.commitAssessment()
    ├── finalizeDecision()      → proof validation, lease storage, trigger context
    └── AuditLogWriter.append() → hash-chained audit entry
    │
    ▼
extension.ts: prompt/revert/allow based on decision
```

---

## File Reference

### Contract Layer

| File | Lines | Purpose |
|------|------:|---------|
| `src/contracts/types.ts` | 476 | All type definitions: Decision, Classification, DecisionPayload, AuditEntry, ContextPacket, route/export/perf types. No runtime logic. |

**Key types:** `Decision` (`ALLOW`|`WARN`|`REQUIRE_PLAN`|`BLOCK`), `RiskLevel` (`LOW`|`MEDIUM`|`HIGH`|`CRITICAL`), `DecisionPayload` (the core decision record with route, proof, trigger, and lease fields), `AuditEntry` (extends DecisionPayload with timestamp, file path, hash chain), `SaveInput`, `Classification`, `ContextPacket`.

---

### Core Layer

| File | Lines | Purpose |
|------|------:|---------|
| `src/core/classifier.ts` | 83 | Classifies files by path pattern matching against risk rules. |
| `src/core/rules.ts` | 4 | Loads default rules from `rules/default.json`. |
| `src/core/ruleEngine.ts` | 85 | Evaluates classified files against built-in rules (AUTH_CHANGE, SCHEMA_CHANGE, CONFIG_CHANGE). |
| `src/core/risk.ts` | 35 | Risk level ordering (`LOW` < `MEDIUM` < `HIGH` < `CRITICAL`), demotion, max, decision mapping. |
| `src/core/contextBuilder.ts` | 28 | Builds `ContextPayload` from classification + input. Trims excerpts. |
| `src/core/contextPacket.ts` | 284 | Context Bus v1 packets: creation, SHA256 hashing, validation, serialization. Enforces authority tag, data class, sensitivity marker defaults. |
| `src/core/decisionPolicy.ts` | 77 | Minimum decision floors per risk level. Merges model decisions with rule floors — decision never weakens below floor. |
| `src/core/decisionLease.ts` | 138 | 5-minute TTL decision caching keyed by file-state fingerprint. Prevents repeated prompts for unchanged files. |
| `src/core/routerPolicy.ts` | 527 | Route policy resolution (`RULE_ONLY`/`LOCAL_PREFERRED`/`CLOUD_ASSISTED`), router shell execution, lane enablement, cloud fallback gating, policy hashing. Largest core module. |
| `src/core/auditLog.ts` | 266 | Append-only, hash-chained audit writer. Rotates at 10MB. SHA256 integrity chain with `prev_hash` linking. |
| `src/core/auditVisibility.ts` | 768 | Read-only audit/perf queries: filter, trace directives, trace routes, verify chain, export Vault-ready bundles. Largest file in project. |
| `src/core/blueprintArtifacts.ts` | 263 | Directive proof management: template scaffolding, 8-state proof resolution, section validation. |
| `src/core/workspaceMapping.ts` | 119 | Loads `.arc/workspace-map.json` for workspace-specific rule overrides and UI segments. |
| `src/core/performance.ts` | 77 | Records timing entries to `.arc/perf.jsonl`. Provides `measureSync`/`measureAsync` wrappers. |

**Key classes:** `BlueprintArtifactStore` (proof lifecycle), `AuditLogWriter` (append + verify), `AuditVisibilityService` (query + export), `DecisionLeaseStore` (caching), `RoutePolicyStore` + `RouterShell` (routing).

**Key functions:** `classifyFile()`, `evaluateRules()`, `enforceMinimumFloor()`, `buildContextPacket()`, `validateContextPacket()`, `resolveProof()`.

---

### Adapter Layer

| File | Lines | Purpose |
|------|------:|---------|
| `src/adapters/modelAdapter.ts` | 423 | Three model adapters behind `ModelAdapter` interface. |

**Adapters:**
- `DisabledModelAdapter` — no-op, `enabledByDefault = false`
- `OllamaModelAdapter` — local Ollama endpoint, bounded retries (default 1), timeout (default 2000ms), local-only host validation (`127.0.0.1`, `localhost`, `::1`)
- `CloudModelAdapter` — Bearer-auth endpoint, bounded to `ContextPayload` only

**Key constants:** `DEFAULT_OLLAMA_TIMEOUT_MS = 2_000`, `DEFAULT_OLLAMA_RETRIES = 1`, `ALLOWED_LOCAL_HOSTNAMES`.

---

### Extension Layer

| File | Lines | Purpose |
|------|------:|---------|
| `src/extension.ts` | 418 | VS Code entry point. Registers 5 commands, intercepts saves (onWillSave/onDidSave), manages REQUIRE_PLAN proof flow, revert-after-save. |
| `src/extension/saveOrchestrator.ts` | 537 | Full save assessment pipeline: classify → context → packet → route → evaluate → floor → audit. Central orchestration module. |
| `src/extension/saveLifecycleController.ts` | 104 | Save lifecycle: primes committed snapshots, tracks pending reverts, suppresses duplicate restores. |
| `src/extension/reviewSurfaces.ts` | 265 | Renders markdown review surfaces: audit log, blueprint proofs, false-positive candidates. Local-only, read-only, non-authorizing. |
| `src/extension/runtimeStatus.ts` | 211 | Renders runtime status markdown: workspace targeting, route posture, save behavior, last save decision (Phase 7.7). |
| `src/extension/workspaceTargeting.ts` | 100 | Resolves effective governed root per active file. Scans for nested `.arc`/`.git`/`package.json` boundary markers. |
| `src/extension/welcomeSurface.ts` | 236 | First-use onboarding via markdown preview. Fire-and-forget, does not block activation or enforcement. |

**Registered commands (5):**

| Command ID | Title | Surface |
|---|---|---|
| `lintel.showWelcome` | ARC XT: Show Welcome Guide | welcomeSurface.ts |
| `lintel.reviewAudit` | ARC XT: Review Audit Log | reviewSurfaces.ts |
| `lintel.showRuntimeStatus` | ARC XT: Show Active Workspace Status | runtimeStatus.ts |
| `lintel.reviewBlueprints` | ARC XT: Review Blueprint Proofs | reviewSurfaces.ts |
| `lintel.reviewFalsePositives` | ARC XT: Review False-Positive Candidates | reviewSurfaces.ts |

---

### CLI Layer

| File | Lines | Purpose |
|------|------:|---------|
| `src/cli.ts` | 241 | Read-only Audit Visibility CLI. Commands: `query`, `trace-directive`, `trace-route`, `perf`, `verify`, `export`. Outside save authorization path. |

---

## Dependency Graph

```
contracts/types.ts          ← everything depends on this
        │
        ▼
   ┌─── core/ ───────────────────────────────────────┐
   │                                                  │
   │  risk ← classifier ← ruleEngine                 │
   │           ↑                                      │
   │  contextBuilder ← contextPacket                  │
   │                                                  │
   │  decisionPolicy    decisionLease                 │
   │                                                  │
   │  routerPolicy (uses contextPacket)               │
   │                                                  │
   │  auditLog    performance    workspaceMapping     │
   │                                                  │
   │  blueprintArtifacts                              │
   │                                                  │
   │  auditVisibility (uses auditLog, blueprintArtifacts) │
   └──────────────────────────────────────────────────┘
        │
        ▼
   adapters/modelAdapter.ts (uses contracts/types only)
        │
        ▼
   ┌─── extension/ ──────────────────────────────────┐
   │                                                  │
   │  saveOrchestrator (imports all core + adapters)  │
   │       ↑                                          │
   │  saveLifecycleController                         │
   │                                                  │
   │  reviewSurfaces (core read-only)                 │
   │  runtimeStatus  (pure rendering)                 │
   │  workspaceTargeting (fs only)                    │
   │  welcomeSurface (vscode only)                    │
   └──────────────────────────────────────────────────┘
        │
        ▼
   extension.ts (wires everything to VS Code lifecycle)

   cli.ts (uses auditVisibility only — completely separate from extension)
```

---

## Key Design Patterns

### Fail-Closed Enforcement
- Missing/invalid route policy → `RULE_ONLY`
- Model timeout/unavailable/parse failure → rule-floor fallback
- Incomplete blueprint → save blocked
- Auto-save → reduced-guarantee, fails closed to `RULE_ONLY`

### Hash-Chained Audit
- Every audit entry includes `prev_hash` (SHA256 of previous entry)
- `GENESIS` for first entry in chain
- `verifyChain()` is file-level integrity only — does not prove completeness

### Decision Leasing
- 5-minute TTL keyed by file-state fingerprint
- Prevents repeated prompts for unchanged files
- `REQUIRE_PLAN` leases re-validate blueprint proof on reuse
- `BLOCK` decisions bypass leasing entirely

### Blueprint Proof Lifecycle
- 8 proof states: `VALID`, `MISSING_DIRECTIVE`, `INVALID_DIRECTIVE`, `MISSING_ARTIFACT`, `MISMATCHED_BLUEPRINT_ID`, `MALFORMED_ARTIFACT`, `INCOMPLETE_ARTIFACT`, `UNAUTHORIZED_MODE`
- Template creation (`INCOMPLETE_TEMPLATE` status) is a starting point, not authorization
- 5 required sections: Objective, Scope, Constraints, Acceptance Criteria, Rollback Note
- Minimum 12 characters per section body

### Routing
- 3 modes: `RULE_ONLY` (default), `LOCAL_PREFERRED`, `CLOUD_ASSISTED`
- Cloud fallback only after approved local fallback states
- Policy hash participates in lease invalidation
- Auto-save always fails closed to `RULE_ONLY`

### Trigger Visibility (Phase 7.7)
- `model_availability_status` captures 4 states: `DISABLED_BY_CONFIG`, `UNAVAILABLE_AT_RUNTIME`, `AVAILABLE_AND_USED`, `NOT_ATTEMPTED`
- `save_mode` / `auto_save_mode` added to all decisions via `triggerContext`
- Last audit entry displayed in runtime status — descriptive only, non-authorizing

---

## Test Coverage Map

| Category | Files | Lines | Coverage Focus |
|----------|------:|------:|----------------|
| **Unit** | 13 | 1,383 | Individual module correctness |
| **Integration** | 4 | 1,079 | Cross-module orchestration, CLI, lifecycle |
| **E2E** | 14 | 982 | Phase-by-phase behavioral pilots (Phase 1–6.8) |
| **Governance** | 4 | 1,409 | Semantic truthfulness, boundary anchoring |
| **Fixtures** | 3 | 333 | Shared test data (blueprints, model conformance, save inputs) |
| **Total** | **37** | **5,186** | |

### Governance test anchoring

| Test file | Phase | Tests | Anchors |
|-----------|-------|------:|---------|
| `policy.test.ts` | 7.1–7.2 | ~30 | Runtime-status disclaimers, review-surface contracts |
| `welcomeSurface.test.ts` | 7.5 | 18 | Onboarding truthfulness, no remote resources, identity |
| `proofStateMessaging.test.ts` | 7.6 | 24 | Proof-state messaging clarity, fail-closed preservation |
| `phase7.7-triggerVisibility.test.ts` | 7.7 | 18 | Trigger visibility, descriptive framing, no authority widening |

---

## Runtime Data (.arc/)

| Path | Purpose | Written by |
|------|---------|-----------|
| `.arc/audit.jsonl` | Append-only hash-chained audit log | AuditLogWriter |
| `.arc/archive/*.jsonl` | Rotated audit files (>10MB) | AuditLogWriter |
| `.arc/perf.jsonl` | Performance timing entries | LocalPerformanceRecorder |
| `.arc/blueprints/<directive>.md` | Local blueprint proof artifacts | BlueprintArtifactStore |
| `.arc/workspace-map.json` | Optional workspace rule overrides | Operator (manual) |
| `.arc/router.json` | Route policy configuration | Operator (manual) |

---

## Enforcement Boundaries

| Boundary | Rule | Reference |
|----------|------|-----------|
| Identity | Display name = `ARC XT — Audit Ready Core`; internal ids = `lintel.*` | Phase 7.3 |
| Blueprint mode | `LOCAL_ONLY` only; team/shared blocked | Phase 5 |
| Cloud lane | Disabled by default; requires `cloud_lane_enabled: true` + approved local fallback | Phase 6.8 |
| Audit integrity | File-level hash chain only; does not prove archive completeness | ARCHITECTURE.md |
| Review surfaces | Local-only, read-only, non-authorizing | Phase 7.2 |
| Welcome/onboarding | Descriptive only; does not block activation or enforcement | Phase 7.5 |
| Trigger visibility | Descriptive only; does not authorize, override, or alter enforcement | Phase 7.7 |
| Control-plane | No ARC Console or Vault runtime dependency | All phases |
| Model host | Local-only hostnames enforced; non-local fails closed | Phase 7.4 |

---

## Phase History

| Phase | Focus | Key additions |
|-------|-------|--------------|
| 1–4 | Foundation | Classifier, rules, audit, blueprint proofs, leasing |
| 5 | REQUIRE_PLAN | Full proof-required save flow with directive linkage |
| 6.0–6.5 | Routing | Route policy, context packets, model evaluation, cloud fallback |
| 6.6–6.7 | Export | Vault-ready export, audit visibility CLI |
| 6.8 | Activation | Integrated validation, rollback drill, advisory recommendation |
| 7.0 | Workspace | Nested workspace targeting, runtime status |
| 7.1–7.2 | Governance | Review-surface contracts, runtime-status anchoring |
| 7.3 | Identity | ARC XT display-name freeze, command title alignment |
| 7.4 | Model hardening | Retry/timeout, parser hardening, runtime config |
| 7.5 | Onboarding | Welcome surface, first-use guidance |
| 7.6 | Proof clarity | Proof-state messaging refinement |
| 7.7 | Trigger visibility | Save-decision traceability, model availability status |
