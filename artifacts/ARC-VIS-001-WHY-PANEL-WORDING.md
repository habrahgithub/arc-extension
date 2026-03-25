# ARC-VIS-001 — Why Panel Wording Submission (WRD-0110)

**Directive ID:** ARC-VIS-001  
**Surface:** Why Panel (Screen 3 of visibility layer)  
**Date:** 2026-03-24  
**Purpose:** Warden wording review per WRD-0110 (pre-merge requirement)

---

## Wording Constraints (from WRD-0110)

- Must be explanatory, not instructional
- Must use evidence-framed language ("records show")
- Must not imply authorization or approval
- Must preserve fail-closed truthfulness

---

## Submitted Wording

### Absent State (no decision for active file)

```
No decision explanation available for the active file.

Records show no audit entry for this file yet. An explanation will appear here 
after a save is evaluated.
```

**Warden Review:**
- ✅ Evidence-framed ("Records show")
- ✅ Not instructional (no "you should" language)
- ✅ No authorization implication
- ✅ Fail-closed truthful (no decision = no explanation)

---

### ALLOW Decision

```
Records show this save was allowed because the file did not trigger any rules 
requiring higher-level review. The risk assessment was {risk_level} and no 
additional proof was required.
```

**Warden Review:**
- ✅ Evidence-framed ("Records show")
- ✅ Explanatory (why allowed, not what to do)
- ✅ No authorization implication ("allowed" is descriptive of outcome)
- ✅ Fail-closed truthful (describes rule evaluation result)

---

### WARN Decision

```
Records show this save triggered a warning because {reason}. The file was 
allowed to proceed after acknowledgment, but the risk was flagged for operator 
awareness.
```

**Warden Review:**
- ✅ Evidence-framed ("Records show")
- ✅ Explanatory (why warned)
- ✅ No authorization implication ("allowed to proceed after acknowledgment" is factual)
- ✅ Fail-closed truthful (describes warning + acknowledgment flow)

---

### REQUIRE_PLAN Decision

```
Records show this save required a governance plan because {reason}. A 
directive-linked blueprint proof was required before the save could proceed.
```

**Warden Review:**
- ✅ Evidence-framed ("Records show")
- ✅ Explanatory (why plan required)
- ✅ No authorization implication ("required" describes enforcement, not approval)
- ✅ Fail-closed truthful (describes proof requirement)

---

### BLOCK Decision

```
Records show this save was blocked because {reason}. The risk level and matched 
rules did not meet the threshold for allowed saves.
```

**Warden Review:**
- ✅ Evidence-framed ("Records show")
- ✅ Explanatory (why blocked)
- ✅ No authorization implication ("blocked" describes enforcement outcome)
- ✅ Fail-closed truthful (describes threshold failure)

---

### Evaluation Source Descriptions

**Fallback:**
```
Records show evaluation fell back to rule-only mode: {fallback_cause}. Model 
evaluation was not available.
```

**Rule-only:**
```
Records show evaluation used rule-based classification only.
```

**Model:**
```
Records show evaluation used local model assessment.
```

**Warden Review:**
- ✅ All evidence-framed ("Records show")
- ✅ All descriptive (what happened, not what to do)
- ✅ No capability overclaim ("not available" vs "failed")
- ✅ Fail-closed truthful

---

### Footer Notice

```
Records show this explanation is derived from the audit entry for {file_path}. 
This panel explains why the decision occurred; it does not authorize, override, 
or bypass save decisions.
```

**Warden Review:**
- ✅ Evidence-framed ("Records show")
- ✅ Explicit boundary statement ("does not authorize, override, or bypass")
- ✅ No authorization implication
- ✅ Fail-closed truthful

---

## Warden Verification Checklist

| Constraint | Status |
|------------|--------|
| Explanatory not instructional | ✅ |
| Evidence-framed wording ("records show") | ✅ |
| No authorization implication | ✅ |
| Fail-closed truthfulness | ✅ |
| Degraded/absent states explicit | ✅ |

---

**Next:** Warden approval → Merge ARC-VIS-001 implementation.
