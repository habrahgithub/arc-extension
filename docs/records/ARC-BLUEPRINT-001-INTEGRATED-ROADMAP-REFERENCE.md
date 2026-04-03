# ARC-BLUEPRINT-001 — Integrated Roadmap Reference

**Status:** RETAINED REFERENCE  
**Date Captured:** 2026-04-03  
**Source:** Prime thread directive  
**Authority Status:** Not current live authorization for Lintel runtime scope

---

## Interpretation Boundary

This record preserves the integrated ARC roadmap shared in-thread so the architecture ideas are not lost.

It is **reference material**, not active implementation authority for the current Stage 3 Lintel rollout.

Current authoritative constraints still remain:
- WARDEN local-only lane only
- `enabledByDefault = false`
- operator-configured route policy only
- no cloud-lane expansion without new WARDEN review
- current active governed package remains `ARCXT-UX-002`

Use this record for future planning/reconciliation only.

---

# ARC ROADMAP BLUEPRINT (INTEGRATED)

## ARC-BLUEPRINT-001

### ARC Execution Roadmap + Infrastructure Boundary (Non-Deviating)

---

## 1. Strategic Positioning (LOCKED)

ARC = Governed AI Execution Layer inside IDE

Core Principle:
Plan → Approval → Act → Verify → Log

ARC must NOT become:

* AI runtime
* Chat UI
* Model host

---

## 2. Core Principles (Non-Deviating)

### 2.1 Control Plane Purity

ARC = policy + enforcement + audit

ARC must NOT:

* run models
* host inference
* act as agent runtime

---

### 2.2 Execution Plane Separation

External runtimes (Ollama, Cline, Continue, cloud APIs)
→ are workers
→ ARC governs them

---

### 2.3 Artifact-Driven Execution

Plan → Approval → Act → Verify → Log

No deviation allowed.

---

### 2.4 Execution Mode Lock

Every task MUST declare one mode:

* ORGANIZE
* CLEAN
* REFACTOR
* BUILD

---

## 3. Target System Architecture

[ VS Code Extension (ARC) ]
↓
Analyze → Decide → Enforce → Log → Explain
↓
[ Vercel (Control API Layer) ]
↓
[ Railway (Authority + State) ]
↓
[ External Runtimes / Models ]

---

## 4. Infrastructure Boundary (LOCKED)

### 4.1 Vercel (Control Plane Edge)

Purpose: Thin, stateless control endpoints

Responsibilities:

* OAuth callbacks (OpenAI, Claude, Qwen, etc.)
* Signed execution token issuance
* Entitlement check endpoint
* Policy fetch endpoint (lightweight)
* Audit ingestion API (write-only)

Constraints:

* No heavy logic
* No persistent state
* No long-running processes

---

### 4.2 Railway (Authority Layer)

Purpose: Trusted backend + persistence

Responsibilities:

* Licensing / entitlement service
* ARC policy store
* Audit log storage (Postgres)
* Execution records
* Team/org configurations
* Background workers (future)

Constraints:

* Source of truth
* All critical validation happens here

---

### 4.3 VS Code Extension (ARC)

Purpose: Local control plane execution

Responsibilities:

* Analysis engine
* Decision engine
* Enforcement engine
* UI signals + prompts
* Local cache (non-authoritative)

Constraints:

* No secrets
* No authority
* Must degrade safely without backend

---

## 5. ARC Core Architecture Layers

### Layer 1: Interaction Layer

* Inline editing signals (non-generative guidance)
* Plan panel
* Task panel
* Run board

### Layer 2: Execution Control Layer

* Plan Artifact Engine
* Execution Token System
* Policy Enforcement Engine
* Risk Classification Engine

### Layer 3: Action Layer (Adapters Only)

* File system adapter
* Terminal adapter
* MCP connectors (bounded)
* Browser adapter (governed, allowlist only)

### Layer 4: Evidence Layer

* Change logs
* Execution logs
* Test outputs
* Vault hash chain integration

### Layer 5: Governance Layer

* Policy packs
* Approval gates
* Mode system

---

## 6. Execution Lifecycle (Canonical)

Plan → Approve → Execute → Verify → Log

No execution allowed outside lifecycle.

---

## 7. Key Systems (Deep Definition)

### 7.1 Plan Artifact Engine

Structure:

* Intent
* Scope
* Risk level
* Policy requirements
* Expected outputs
* Stop conditions

Properties:

* Mandatory
* Immutable after approval

---

### 7.2 Execution Token System

Properties:

* Bound to plan hash
* Time-limited
* Scope-limited

Rules:

* Non-reusable
* Invalid on plan change

---

### 7.3 Policy Enforcement Engine

Examples:

* Auth change → approval required
* Config change → warning
* Dependency change → validation required

---

### 7.4 Risk Classification Engine

Levels:

* Low
* Medium
* High

Signals:

* File type
* Pattern detection
* Historical risk

---

### 7.5 Run Board

States:

* Draft
* Awaiting Approval
* Active
* Blocked
* Completed
* Failed

---

### 7.6 Evidence System

Includes:

* Code diff
* Logs
* Test results
* Policy checks

Stored in:

* Vault + Railway

---

## 8. Modes (Critical UX Layer)

* Inspect Mode → read-only
* Plan Mode → create plan only
* Act Mode → execute approved plan
* Review Mode → generate reports

---

## 9. Phase Roadmap (Execution Locked)

### 🟢 Phase 1 — Analysis Core Stabilization

Mode: REFACTOR

Goal: Deterministic signal engine

Scope:

* Normalize classifier + ruleEngine + risk + explanation
* Standard output contract:

AnalysisResult {
findings[]
riskScore
explanations[]
severity
confidence
}

* Reduce false positives

Deliverable:
✔ Analysis Engine v1

Stop Conditions:

* No enforcement
* No backend integration

Gate:

* Deterministic output
* Stable scoring
* Zero noise drift

---

### 🟡 Phase 2 — Decision Engine

Mode: BUILD

Goal: Convert signals into decisions

Scope:

* Map AnalysisResult → Decision

Decision types:

* ALLOW

* WARN

* BLOCK

* REQUIRE_APPROVAL

* Activate executionGovernance

* Integrate deviationDetector

Deliverable:
✔ Decision Engine v1

Stop:

* No blocking enforcement yet

---

### 🔴 Phase 3 — Enforcement Engine

Mode: BUILD

Goal: ARC becomes authority

Scope:

* Intercept file save + write
* Apply decisions

Actions:

* BLOCK → stop
* REQUIRE_APPROVAL → trigger

Protected areas:

* auth
* config
* infra

Deliverable:
✔ Enforcement Engine v1

---

### 🟠 Phase 4 — Approval System

Mode: BUILD

Goal: Controlled execution

Scope:

* Approval prompts
* Decision lease activation
* Minimal UI

Deliverable:
✔ Approval System v1

---

### 🔵 Phase 5 — Execution Lifecycle

Mode: BUILD

Goal: Structured execution

Scope:

* Context packets
* Execution tracking

Deliverable:
✔ Execution Lifecycle v1

---

### 🟣 Phase 6 — Model Governance

Mode: BUILD

Goal: Govern runtimes

Scope:

* Local vs Cloud routing rules
* Vendor OAuth via Vercel
* Model permissions

Constraint:

* ARC does NOT run models

Deliverable:
✔ Model Governance v1

---

### ⚫ Phase 7 — Audit System

Mode: BUILD

Goal: Immutable evidence

Scope:

* Hash-chained logs
* Event capture
* Audit export

Storage:

* Railway Postgres

Deliverable:
✔ Audit System v1

---

## 10. Global Deviation Rules (STRICT)

STOP if:

1. Runtime behavior added to ARC
2. Chat UI introduced
3. Heavy backend logic added to Vercel
4. Phase boundaries crossed
5. Unplanned feature introduced

---

## 11. Integration Strategy

### Local Models

* Ollama / llama.cpp
* External execution only

### Cloud Models

* OAuth via Vercel
* Vendor-agnostic

### MCP

* Allowlisted connectors
* Logged + governed

---

## 12. Monetization Strategy

Free:

* Analysis
* Basic planning
* Local workflows

Paid:

* Governance engine
* Tokens
* Policy packs
* Audit logs
* Team features

---

## 13. Success Criteria

Short-term:

* Stable analysis
* Developer feedback

Mid-term:

* Adoption + retention

Long-term:

* Enterprise trust
* Compliance usage

---

## FINAL POSITIONING (LOCKED)

ARC is:
Governed execution layer for AI-assisted development

ARC is NOT:

* AI assistant
* Model runner
* Coding agent

"AI can act — ARC proves it can be trusted."
