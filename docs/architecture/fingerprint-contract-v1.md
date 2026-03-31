# Fingerprint Contract v1 (WO-ARC-XT-M2-001)

## Purpose
Define fingerprint storage contract as evidence-only metadata in SQLite Audit Schema v1.

## Contract
1. `fingerprint` is optional and nullable.
2. `fingerprint_version` is optional and nullable, but when `fingerprint` is present it should be set.
3. Initial version label: `fp.v1`.
4. Fingerprints are never authority-bearing fields for save decision outcomes.
5. Failed AST analysis does not produce synthetic placeholder fingerprints.

## Persistence fields
- `audit_events.fingerprint`
- `audit_events.fingerprint_version`
- optional provenance support:
  - `audit_events.actor_id`
  - `audit_events.actor_type`

## Compatibility policy
- Future algorithm/shape changes must increment version label.
- No silent reuse of `fp.v1` after contract-breaking changes.
