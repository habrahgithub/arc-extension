# ARC-RUNTIME-ASSURANCE-M5 — Review-State Snapshots and Transition Trace

## 1) Before / after registry snapshot (APPROVED)

### Before (pending)
```json
{
  "id": "<proposal-id>",
  "proposalType": "REVIEW_POLICY_REQUIREMENT",
  "triggerCode": "REQUIRED_POLICY_MISSING",
  "reviewStatus": "PENDING_REVIEW",
  "reviewDecision": null
}
```

### After approve
```json
{
  "id": "<proposal-id>",
  "proposalType": "REVIEW_POLICY_REQUIREMENT",
  "triggerCode": "REQUIRED_POLICY_MISSING",
  "reviewStatus": "APPROVED",
  "reviewDecision": {
    "decidedAt": "2026-04-02T...Z",
    "decidedBy": "Axis",
    "rationale": "Approved for follow-up governance planning."
  }
}
```

## 2) Before / after registry snapshot (REJECTED)

### Before (pending)
```json
{
  "id": "<proposal-id>",
  "reviewStatus": "PENDING_REVIEW",
  "reviewDecision": null
}
```

### After reject
```json
{
  "id": "<proposal-id>",
  "reviewStatus": "REJECTED",
  "reviewDecision": {
    "decidedAt": "2026-04-02T...Z",
    "decidedBy": "Axis",
    "rationale": "Rejected due to test-only path."
  }
}
```

## 3) Transition trace

1. `PENDING_REVIEW -> APPROVED` is allowed with non-empty `decidedBy` and `rationale`.
2. `PENDING_REVIEW -> REJECTED` is allowed with non-empty `decidedBy` and `rationale`.
3. Any reviewed state (`APPROVED` or `REJECTED`) cannot transition again.
4. Blank `decidedBy` or blank `rationale` is rejected without mutation.

Reviewed records are excluded from pending queue (`listPending`).
