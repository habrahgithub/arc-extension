# ARC-RUNTIME-ASSURANCE-M2 — Sample Audit Entries and Execution Traces

## 1) Before vs After audit entry shape

### Before (no deviation)
```json
{
  "event_type": "RUN",
  "actor_id": "workbench.action.files.save",
  "deviation": null,
  "failure_type": null,
  "explanation": null
}
```

### After (policy deviation with deterministic explanation)
```json
{
  "event_type": "RUN",
  "actor_id": "workbench.action.files.save",
  "deviation": {
    "isDeviation": true,
    "type": "POLICY",
    "reason": "Missing required policy: AUDIT_MODE."
  },
  "failure_type": "TYPE-B",
  "explanation": {
    "code": "REQUIRED_POLICY_MISSING",
    "summary": "Required policy was absent during execution.",
    "cause": "Execution occurred without required policy present in contract.",
    "evidence": [
      "missing_policy=AUDIT_MODE",
      "available_policies=[]"
    ]
  }
}
```

## 2) Deterministic execution traces by deviation type

### Sequence trace
1. Event: `RUN` with observed tool sequence `[git.commit]`.
2. Contract: `allowedToolSequence=[workbench.action.files.save]`.
3. Detector output: `SEQUENCE` deviation.
4. Synthesizer output: `TOOL_SEQUENCE_MISMATCH` with expected/observed sequence evidence.

### Policy trace
1. Event: `RUN` with `activePolicies=[]`.
2. Contract: `requiredPolicies=[AUDIT_MODE]`.
3. Detector output: `POLICY` deviation.
4. Synthesizer output: `REQUIRED_POLICY_MISSING` with missing/available policy evidence.

### Shape trace
1. Event: `RUN` with `outputShape=EMPTY_TEXT`.
2. Contract: `expectedOutputShape=NON_EMPTY_TEXT`.
3. Detector output: `SHAPE` deviation.
4. Synthesizer output: `OUTPUT_SHAPE_MISMATCH` with expected/observed shape evidence.
