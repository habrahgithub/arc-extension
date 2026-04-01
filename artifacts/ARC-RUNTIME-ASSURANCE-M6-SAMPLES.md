# ARC-RUNTIME-ASSURANCE-M6 — Approved Proposal Handoff Artifact Samples

## 1) Before / after handoff store snapshot

### Before
```json
[]
```

### After explicit createFromApprovedProposal(proposalId, "Forge")
```json
[
  {
    "id": "<sha256(proposal:<proposalId>)>",
    "proposalId": "<proposal-id>",
    "proposalType": "REVIEW_POLICY_REQUIREMENT",
    "triggerCode": "REQUIRED_POLICY_MISSING",
    "sourceReviewStatus": "APPROVED",
    "createdAt": "2026-04-02T...Z",
    "createdBy": "Forge",
    "summary": "Repeated missing required policy suggests policy review.",
    "rationale": "Executions repeatedly occurred without required policy context.",
    "evidence": [
      "trigger_code=REQUIRED_POLICY_MISSING",
      "occurrence_count=3"
    ],
    "handoffStatus": "OPEN",
    "reviewContext": {
      "decidedAt": "2026-04-02T...Z",
      "decidedBy": "Axis",
      "rationale": "Approved for implementation handoff packaging."
    }
  }
]
```

## 2) Eligibility trace

1. Proposal exists and is `APPROVED` with `reviewDecision`.
2. Operator explicitly calls `createFromApprovedProposal(proposalId, createdBy)`.
3. Service verifies no open handoff exists for `proposal:${proposalId}`.
4. Service writes one `OPEN` handoff artifact.

Rejected and pending proposals are rejected by guard checks.
