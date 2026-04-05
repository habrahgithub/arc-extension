# ARC XT — Trust, Security, and Compliance

> Internal pilot artifact — not for enterprise procurement until authorized.

---

## 1. Security Posture

ARC XT is designed as a local-first governance layer for AI-assisted development. Its security architecture is built around these principles:

### Local-First Enforcement
- All rule evaluation happens on your machine — no code, diffs, or prompts are transmitted externally
- Cloud model lanes are disabled by default and require explicit operator configuration
- Fallback posture is fail-closed: missing configuration defaults to strictest safe enforcement

### Tamper-Evident Audit
- Every save decision is appended to a local, hash-chained audit log (`.arc/audit.jsonl`)
- Chain integrity is verifiable — any tampering breaks the hash chain and is detectable
- Audit log is append-only — entries are never modified or deleted

### No Secret Storage
- ARC XT does not store API keys, tokens, or credentials
- No authentication mechanism exists — the extension operates as a local tool without remote identity
- Configuration files (`.arc/router.json`, `.arc/workspace-map.json`) are plain text and operator-managed

### Isolation
- ARC XT runs as a VS Code extension — it does not install system services, kernel modules, or daemons
- No network listeners are opened by the extension
- Dependencies are minimal: `ajv` for JSON schema validation only

---

## 2. Privacy Statement

ARC XT is designed with a privacy-first architecture:

### Data Collected
- **None by default.** ARC XT does not collect, transmit, or store any user data outside the local workspace.

### Telemetry
- Telemetry is **disabled by default** and **opt-in only**
- When enabled, telemetry captures **metadata only** — no code, prompts, diffs, or content
- Telemetry data is stored locally — no cloud aggregation occurs
- See the [Telemetry Contract](U31-TELEMETRY-CONTRACT.md) for the bounded event schema

### Content Boundary
- **No code content** is captured or transmitted
- **No prompt text** is logged or forwarded
- **No diff data** is included in audit or telemetry records
- File paths are logged only in the local audit trail — never transmitted externally

### User Identity
- ARC XT does not identify users by name, email, or organization
- VS Code machine ID and session ID are used internally for attribution in audit logs — these are opaque identifiers

---

## 3. Data Processing (DPA)

ARC XT operates entirely on the user's machine. The following describes its data processing posture:

### Data Residency
- All data remains on the user's machine. ARC XT has no cloud component, no remote storage, and no external processing pipeline.

### Processing Scope
- ARC XT processes file metadata (path, type, risk classification) at save time
- Processing is synchronous and local — data is never queued, batched, or transmitted
- Audit log entries are written to local disk only

### Subprocessors
- ARC XT uses no subprocessors. The `ajv` dependency is a local JSON validation library with no network capability.

### Retention
- Audit log entries are retained indefinitely on the local machine
- No automated deletion or rotation exists — operators manage retention manually
- Telemetry data (if enabled) is also local-only and operator-managed

### Deletion
- Operators may delete audit log files at any time — however, this breaks chain integrity verification
- Uninstalling the VS Code extension removes ARC XT from the IDE — local files (`.arc/`) remain on disk

---

## 4. Procurement Readiness

ARC XT is currently an **internal pilot** and is **not yet cleared for enterprise procurement**. The following describes the planned enterprise track:

### Current State
- Distribution: Direct VSIX transfer to authorized operators
- Support: Internal pilot channels (no SLA, no support guarantee)
- License: Apache-2.0 (see package.json)
- Compliance Evidence: This document, the [Telemetry Contract](U31-TELEMETRY-CONTRACT.md), and the [Documentation Hygiene Truth Pass](U16-DOCUMENTATION-HYGIENE-TRUTH-PASS.md)

### Planned Enterprise Track
- **Not available yet.** An enterprise distribution model, support SLA, and procurement artifact set are under design (tracked as U36 in the blueprint).
- **Security review** will be conducted with external parties before any regulated-enterprise distribution.
- **DPA addendum** and **SOC 2 readiness** are planned but not yet implemented.

### Evidence Artifacts
- **Telemetry Contract:** [U31-TELEMETRY-CONTRACT.md](U31-TELEMETRY-CONTRACT.md) — privacy-first schema
- **Documentation Hygiene:** [U16-DOCUMENTATION-HYGIENE-TRUTH-PASS.md](U16-DOCUMENTATION-HYGIENE-TRUTH-PASS.md) — evidence alignment audit
- **System Coherence:** [ARC-SYS-COHERENCE-001.md](ARC-SYS-COHERENCE-001.md) — signal consistency protocol

---

*This trust document is an internal pilot artifact. It must not be used for enterprise procurement, regulatory filing, or public-facing compliance claims without separate Axis/Warden authorization.*
