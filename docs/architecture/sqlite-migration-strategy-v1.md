# JSONL → SQLite Migration Strategy v1 (WO-ARC-XT-M2-001)

## Goal
Promote SQLite to primary evidence authority while retaining JSONL as backward-safe export/output.

## Strategy
1. Initialize SQLite schema (`audit.sqlite3`) in `.arc/`.
2. Persist all new audit appends to SQLite first (authoritative write).
3. Maintain chain tail via `audit_chain_state`.
4. Emit JSONL entries as derived output from the same append payload.
5. Support full JSONL regeneration from SQLite (`exportJsonlFromSqlite`) when needed.

## Authority boundary
- SQLite is source of truth for chain verification + query.
- JSONL is non-authoritative export artifact.

## Backward-safe export
Exported JSONL retains historical shape fields:
- `ts`, `file_path`, `risk_flags`, `matched_rules`
- decision payload fields
- optional route/fingerprint metadata
- `prev_hash`, `hash`

## Rollout note
This WO ships schema + append/verify/export path only.
Any broad migration of historical JSONL archives into SQLite and any multi-process writer hardening require separate governed WOs.
