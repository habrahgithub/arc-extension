# ARC-RUNTIME-ASSURANCE-M4 — Governance Registry Snapshots and Upsert Trace

## 1) Before / after registry snapshots

### Before
```json
[]
```

### After repeated identical proposal key (`REVIEW_POLICY_REQUIREMENT:REQUIRED_POLICY_MISSING`)
```json
[
  {
    "id": "<sha256(REVIEW_POLICY_REQUIREMENT:REQUIRED_POLICY_MISSING)>",
    "proposalType": "REVIEW_POLICY_REQUIREMENT",
    "triggerCode": "REQUIRED_POLICY_MISSING",
    "summary": "Repeated missing required policy suggests policy review.",
    "rationale": "Executions repeatedly occurred without required policy context.",
    "evidence": [
      "trigger_code=REQUIRED_POLICY_MISSING",
      "occurrence_count=3",
      "missing_policy=AUDIT_MODE",
      "available_policies=[]"
    ],
    "reviewStatus": "PENDING_REVIEW",
    "occurrenceCount": 2,
    "firstSeenAt": "2026-04-01T...Z",
    "lastSeenAt": "2026-04-01T...Z"
  }
]
```

## 2) Dedup key rule

`proposalKey = "${proposalType}:${triggerCode}"`

- Same key => upsert existing record
- Different key => create separate record

## 3) Short upsert trace

1. Third repeated policy-missing event reaches threshold and creates first registry record (`occurrenceCount=1`).
2. Fourth repeated policy-missing event keeps same key and increments to `occurrenceCount=2`.
3. Repeated sequence mismatch at threshold creates `REVIEW_CONTRACT` record.
4. Repeated output shape mismatch at threshold creates `REVIEW_OUTPUT_CONTRACT` record.

Registry remains review-only and all records stay `PENDING_REVIEW`.
