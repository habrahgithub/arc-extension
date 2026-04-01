# ARC-RUNTIME-ASSURANCE-M7 — Implementation Draft Samples and Trace

## 1) Before / after draft store snapshots

### Before
```json
[]
```

### After explicit createFromHandoff(handoffId, "Forge")
```json
[
  {
    "id": "<sha256(handoff:<handoffId>)>",
    "handoffId": "<handoff-id>",
    "proposalId": "<proposal-id>",
    "proposalType": "REVIEW_POLICY_REQUIREMENT",
    "triggerCode": "REQUIRED_POLICY_MISSING",
    "sourceHandoffStatus": "OPEN",
    "createdAt": "2026-04-02T...Z",
    "createdBy": "Forge",
    "scope": "Policy requirement review candidate",
    "proposedChanges": [
      "Review current policy requirement",
      "Assess whether required policy should remain enforced"
    ],
    "riskLevel": "HIGH",
    "draftStatus": "DRAFT"
  }
]
```

## 2) Deterministic trace

1. Proposal is approved in M5.
2. Explicit M6 call creates OPEN handoff artifact.
3. Explicit M7 call `createFromHandoff(handoffId, createdBy)` creates DRAFT artifact.
4. Duplicate DRAFT for same handoff is rejected.

Drafts are staging-only and do not mutate runtime or policy behavior.
