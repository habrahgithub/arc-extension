# ARC-RUNTIME-ASSURANCE-M8 — Draft Review & Promotion Gate Samples

## 1) Before / after draft + candidate snapshots

### Before
```json
{
  "draft": {
    "id": "<draft-id>",
    "draftStatus": "DRAFT",
    "reviewDecision": null
  },
  "candidateStore": []
}
```

### After approve + promote
```json
{
  "draft": {
    "id": "<draft-id>",
    "draftStatus": "PROMOTED",
    "reviewDecision": {
      "decidedAt": "2026-04-02T...Z",
      "decidedBy": "Axis",
      "rationale": "Promoted as implementation package candidate."
    }
  },
  "candidateStore": [
    {
      "id": "<candidate-id>",
      "draftId": "<draft-id>",
      "status": "CANDIDATE",
      "scope": "Policy requirement review candidate",
      "proposedChanges": [
        "Review current policy requirement",
        "Assess whether required policy should remain enforced"
      ],
      "riskLevel": "HIGH",
      "source": {
        "proposalId": "<proposal-id>",
        "handoffId": "<handoff-id>"
      }
    }
  ]
}
```

## 2) Lifecycle trace

1. Handoff is created explicitly from approved proposal (M6).
2. Draft is created explicitly from open handoff (M7).
3. Human approves draft (`DRAFT -> APPROVED`).
4. Human promotes approved draft (`APPROVED -> PROMOTED`).
5. Service creates non-executable package candidate (`status=CANDIDATE`).

No runtime, contract, policy, or enforcement mutation occurs.
