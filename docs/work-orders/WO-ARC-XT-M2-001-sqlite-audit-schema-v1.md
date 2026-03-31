# WO-ARC-XT-M2-001 — SQLite Audit Schema v1

Status: ISSUED
Authority: Axis
Assigned to: Forge
Phase: Milestone 2 — Storage Migration Preparation
Execution mode: PLAN → ACT (artifact-first)

## Objective
Design and implement SQLite Audit Schema v1 as the new primary governed evidence store for ARC, while preserving JSONL as an export/output format only.

## Why this work order exists
ARC has now introduced structured evidence via AST fingerprints and unified analysis output. JSONL was sufficient to reach the current state, but it is not the correct long-term primary storage substrate for:
- query performance at scale
- multi-session write safety
- durable audit correlation
- indexed evidence retrieval
- enterprise export workflows
- future retention and integrity operations

This work order formalizes the migration path toward SQLite as primary evidence storage.

## Governance position
This work order follows the locked architecture amendments:
1. Security is cross-cutting, not a late layer.
2. SQLite migration is a pre-condition before Git/SDLC phase expansion.
3. Fingerprints are evidence, not authority.
4. JSONL remains export/output only once migration is complete.

## Scope
### In scope
- Define SQLite schema for audit-first evidence storage
- Preserve hash-chain integrity model
- Include versioned fingerprint metadata support
- Define append/write model and read/query model
- Define export compatibility model for JSONL
- Add schema creation and verification path
- Add test fixtures for schema integrity and chain continuity

### Out of scope
- Git interception
- Husky/pre-commit integration
- React/UI refactor
- cloud sync or enterprise replication
- changing governance authority model
- broad feature enablement of AST fingerprinting

## Required outputs
Forge must produce the following artifacts:
1. `docs/architecture/sqlite-audit-schema-v1.md`
2. `docs/architecture/fingerprint-contract-v1.md` (if not already added elsewhere, use this work order’s contract assumptions)
3. SQLite DDL implementation under the appropriate source path
4. Migration strategy note: JSONL → SQLite primary, JSONL retained as export only
5. Verification tests for:
   - append continuity
   - hash-chain integrity
   - query correctness
   - optional fingerprint persistence
   - backward-safe export generation

## Mandatory schema requirements
The design must support:
- immutable audit event records
- previous-hash linkage
- hash verification
- optional actor identity
- optional fingerprint
- fingerprint version field
- route policy hash / route metadata preservation
- decision, source, risk level, matched rules, risk flags
- timestamps suitable for query/export

## Minimum recommended tables
### 1. `audit_events`
Canonical evidence records.

Must include fields for:
- event id
- timestamp
- file path
- decision
- source
- risk level
- matched rules
- risk flags
- directive id
- blueprint id
- lease status
- route metadata
- actor metadata (bounded)
- fingerprint (optional)
- fingerprint_version (optional)
- prev_hash
- hash

### 2. `audit_event_rules`
Normalized link table for matched rules.

### 3. `audit_event_flags`
Normalized link table for risk flags.

### 4. `audit_chain_state`
Minimal chain-tail and verification support table if needed.

## Data model rules
1. Audit store is authoritative.
2. Cache/query helpers must not become source of truth.
3. Fingerprint is optional evidence, never mandatory for writes.
4. Failed AST analysis must not generate placeholder fingerprints.
5. JSONL export must be derived from SQLite, not treated as authoritative once migration completes.

## Fingerprint handling rules
- Add `fingerprint_version` from the beginning.
- Initial recommended value: `fp.v1`
- Future fingerprint-affecting changes must not silently reuse old version labels.

## Testing requirements
Forge must add tests for at least:
- append of sequential events preserves chain
- verification detects tamper or hash mismatch
- null fingerprint writes remain valid
- fingerprinted events persist and query correctly
- JSONL export reproduces required audit shape
- concurrent/near-concurrent write assumptions are documented and bounded

## Stop conditions
Forge must stop and escalate if any of the following occurs:
- schema design would require weakening hash-chain semantics
- migration would make JSONL authoritative again
- fingerprint storage pressures governance into treating fingerprints as decision authority
- implementation requires broadening scope into Git/SDLC or UI refactor

## Acceptance criteria
This work order is complete only when:
1. SQLite schema exists and is documented.
2. Hash-chain semantics are preserved in SQLite.
3. Fingerprint metadata is versioned.
4. JSONL is clearly demoted to export/output format.
5. Tests prove append, verify, and export behavior.
6. No governance scope drift occurred.

## Execution notes to Forge
- Prefer minimal, stable schema over clever schema.
- Preserve evidence integrity first; optimize query ergonomics second.
- Do not redesign ARC around SQLite. Replace storage substrate, not authority model.
- Keep security and testing cross-cutting throughout implementation.

## Next review owner
Axis — review schema durability, evidence authority boundaries, and migration correctness before any broad adoption.
