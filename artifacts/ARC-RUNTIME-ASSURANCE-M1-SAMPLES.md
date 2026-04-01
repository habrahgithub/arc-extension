# ARC-RUNTIME-ASSURANCE-M1 — Sample Vault Entries

## Before (no deviation field)

```json
{
  "event_type": "RUN",
  "decision": "WARN",
  "actor_id": "workbench.action.files.save",
  "reason": "[OBSERVATION] RUN event captured for workbench.action.files.save"
}
```

## After (deviation detected)

```json
{
  "event_type": "RUN",
  "decision": "WARN",
  "actor_id": "workbench.action.files.save",
  "failure_type": "TYPE-B",
  "deviation": {
    "isDeviation": true,
    "type": "POLICY",
    "reason": "Missing required policy: AUDIT_MODE."
  }
}
```

## Execution Trace (detect-only)

1. Execution event emitted: `RUN workbench.action.files.save`
2. `DeviationDetector.evaluate()` checks sequence, required policies, output shape
3. Detector returns POLICY deviation (when `AUDIT_MODE` policy is absent)
4. Result attached to decision context (`deviation`, `failure_type: TYPE-B`)
5. Audit append continues unchanged (no blocking or enforcement mutation)
