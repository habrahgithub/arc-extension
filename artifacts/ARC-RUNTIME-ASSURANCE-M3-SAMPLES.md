# ARC-RUNTIME-ASSURANCE-M3 — Governance Proposal Samples and Recurrence Trace

## 1) Before vs After audit-adjacent proposal payload

### Before (deviation + explanation, below threshold)
```json
{
  "event_type": "RUN",
  "deviation": { "isDeviation": true, "type": "POLICY" },
  "explanation": {
    "code": "REQUIRED_POLICY_MISSING",
    "summary": "Required policy was absent during execution.",
    "cause": "Execution occurred without required policy present in contract.",
    "evidence": ["missing_policy=AUDIT_MODE", "available_policies=[]"]
  },
  "governance_proposal": null
}
```

### After (same explanation at threshold)
```json
{
  "event_type": "RUN",
  "deviation": { "isDeviation": true, "type": "POLICY" },
  "explanation": {
    "code": "REQUIRED_POLICY_MISSING",
    "summary": "Required policy was absent during execution.",
    "cause": "Execution occurred without required policy present in contract.",
    "evidence": ["missing_policy=AUDIT_MODE", "available_policies=[]"]
  },
  "governance_proposal": {
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
    "reviewStatus": "PENDING_REVIEW"
  }
}
```

## 2) Short recurrence trace (fixed threshold = 3)

1. RUN #1 with `REQUIRED_POLICY_MISSING` explanation → `occurrence_count=1` → no proposal.
2. RUN #2 with same explanation code → `occurrence_count=2` → no proposal.
3. RUN #3 with same explanation code → `occurrence_count=3` → proposal attached.

## 3) Proposal mapping outcomes

- `TOOL_SEQUENCE_MISMATCH` → `REVIEW_CONTRACT`
- `REQUIRED_POLICY_MISSING` → `REVIEW_POLICY_REQUIREMENT`
- `OUTPUT_SHAPE_MISMATCH` → `REVIEW_OUTPUT_CONTRACT`

All proposals remain `reviewStatus=PENDING_REVIEW` in M3.
