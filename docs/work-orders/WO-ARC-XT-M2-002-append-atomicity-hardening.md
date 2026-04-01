# WO-ARC-XT-M2-002 — Append Atomicity Hardening (SQLite)

Status: ISSUED
Authority: Axis
Assigned to: Forge
Phase: Milestone 2 — Storage Hardening
Execution mode: PLAN → ACT (artifact-first)

## Objective
Make the audit append operation atomic in SQLite so each append is all-or-nothing, preserving chain integrity under failures.

## Why this work order exists
Current append flow performs multiple steps:
1) insert event
2) insert rules
3) insert flags
4) update chain tail

These occur as separate calls, which risks partial writes and broken chain under interruption. This WO enforces transactional atomicity.

## Governance position
- Audit chain integrity is non-negotiable.
- SQLite is authoritative store.
- Fingerprints remain optional evidence (non-authority).
- No expansion into Git/UI/AI scopes.

## Scope
### In scope
- Wrap append sequence in a single SQLite transaction (BEGIN IMMEDIATE/COMMIT; ROLLBACK on error)
- Ensure idempotent failure behavior (no partial rows)
- Consolidate multi-step SQL into a single transactional unit
- Add explicit error handling and rollback paths
- Add tests for interruption/exception scenarios

### Out of scope
- Multi-process writer locking beyond single-process guarantees
- Git interception
- UI changes
- Schema redesign beyond minimal support for transactions

## Required outputs
1. Code changes in `src/core/auditLog.ts` implementing transactional append
2. Small refactor to group SQL statements into a single execution block
3. Tests:
   - partial failure simulation → no rows committed
   - successful append → all rows committed
   - chain integrity preserved after repeated writes
4. Update docs if any behavior wording changes (no new architecture docs required)

## Implementation requirements
- Use explicit transaction control via sqlite3 CLI:
  BEGIN IMMEDIATE;
  ... all statements ...
  COMMIT;
  (ROLLBACK on error)
- No intermediate state should be externally visible
- `audit_chain_state` update must be in the same transaction

## Data integrity rules
- Either full append is persisted, or nothing is
- No orphan rows in `audit_event_rules` or `audit_event_flags`
- Chain tail must never advance without corresponding event row

## Testing requirements
- Simulate failure between steps (e.g., throw before COMMIT) and verify DB unchanged
- Verify chain passes after many sequential appends
- Verify fingerprint optional fields unaffected by transaction wrapping

## Stop conditions
Stop and escalate if:
- Transaction handling weakens or bypasses hash-chain semantics
- Any partial-write scenario remains possible
- Scope expands beyond append atomicity

## Acceptance criteria
1. Append is atomic (all-or-nothing)
2. No partial rows under failure
3. Chain integrity preserved in all tests
4. No regression in existing audit tests
5. No scope drift

## Execution notes to Forge
- Prefer clarity over clever batching
- Keep transaction minimal and explicit
- Preserve current schema and behavior; only harden write semantics

## Next review owner
Axis — verify atomicity, integrity, and absence of side effects
