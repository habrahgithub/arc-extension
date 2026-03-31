# SQLite Audit Schema v1 (WO-ARC-XT-M2-001)

## Authority + boundary
- Axis designed and issued WO-ARC-XT-M2-001.
- Forge implementation scope: storage substrate migration only.
- Governance authority remains policy/rule decisioning, not storage or fingerprint artifacts.

## Primary store statement
SQLite is the primary authoritative audit evidence store.

JSONL (`.arc/audit.jsonl`) is retained as a derived export/output artifact generated from SQLite rows.

## Tables

### `audit_events`
Canonical immutable event rows.

Columns:
- `event_id INTEGER PRIMARY KEY AUTOINCREMENT`
- `ts TEXT NOT NULL`
- `file_path TEXT NOT NULL`
- `decision TEXT NOT NULL`
- `reason TEXT NOT NULL`
- `risk_level TEXT NOT NULL`
- `source TEXT NOT NULL`
- `violated_rules TEXT NOT NULL` (JSON array)
- `next_action TEXT NOT NULL`
- `fallback_cause TEXT NOT NULL`
- `lease_status TEXT NOT NULL`
- `directive_id TEXT NULL`
- `blueprint_id TEXT NULL`
- `route_mode TEXT NULL`
- `route_lane TEXT NULL`
- `route_reason TEXT NULL`
- `route_clarity TEXT NULL`
- `route_fallback TEXT NULL`
- `route_policy_hash TEXT NULL`
- `actor_id TEXT NULL`
- `actor_type TEXT NULL`
- `fingerprint TEXT NULL`
- `fingerprint_version TEXT NULL`
- `prev_hash TEXT NOT NULL`
- `hash TEXT NOT NULL UNIQUE`

### `audit_event_rules`
Normalized rule links.
- `event_id INTEGER NOT NULL`
- `rule_id TEXT NOT NULL`
- `PRIMARY KEY(event_id, rule_id)`

### `audit_event_flags`
Normalized risk flag links.
- `event_id INTEGER NOT NULL`
- `risk_flag TEXT NOT NULL`
- `PRIMARY KEY(event_id, risk_flag)`

### `audit_chain_state`
Chain tail state.
- `singleton_id INTEGER PRIMARY KEY CHECK(singleton_id = 1)`
- `tail_event_id INTEGER NULL`
- `tail_hash TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

## Hash-chain semantics
For each append:
1. Read tail hash from `audit_chain_state.tail_hash` (or `ROOT` bootstrap).
2. Build canonical payload including route + fingerprint fields.
3. Compute `sha256(canonical_payload_with_prev_hash)`.
4. Insert immutable `audit_events` row with `prev_hash` and `hash`.
5. Update `audit_chain_state` to new tail.

Verification scans events in `event_id` order and asserts:
- row `prev_hash` matches computed chain predecessor.
- recomputed hash equals persisted `hash`.
- `audit_chain_state.tail_hash` matches final verified hash.

## Fingerprint semantics
- Fingerprint remains optional evidence.
- `fingerprint_version` is persisted alongside `fingerprint`.
- Missing/failed fingerprint computation must remain nullable (no placeholder synthesis).

## Concurrency assumption (bounded)
Current implementation uses process-local synchronous appends and SQLite WAL mode.
Near-concurrent multi-process writers are out of scope for v1 and require explicit lock/transaction strategy extension in a later WO.

## Indexes
- `idx_audit_events_ts`
- `idx_audit_events_file_path`
- `idx_audit_rules_rule_id`
- `idx_audit_flags_risk_flag`
