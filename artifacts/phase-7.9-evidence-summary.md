# Phase 7.9 — Precision and False-Positive Reduction Evidence Summary

**Directive ID:** LINTEL-PH7-9-001  
**Phase Name:** Precision and False-Positive Reduction  
**Risk Tier:** MEDIUM  
**Status:** IMPLEMENTATION COMPLETE  
**Date:** 2026-03-23  

---

## Executive Summary

Phase 7.9 successfully implements precision improvements and false-positive reduction without weakening the enforcement floor. All 5 sub-scopes (§2.1–2.5) are complete.

**Validation Results:**
- ✅ lint: PASS
- ✅ typecheck: PASS
- ✅ build: PASS
- ✅ test:unit: PASS
- ✅ test:integration: PASS
- ✅ test:e2e: PASS
- ✅ test:governance: PASS (215 tests total including 18 new Phase 7.9 tests)

---

## Blocking Conditions Resolution

| ID | Condition | Resolution |
|----|-----------|------------|
| OBS-S-7023 | Classification precision must be evidence-backed | **RESOLVED** — False-positive quality scoring based on decision type, source, matched rules, and fallback conditions |
| OBS-S-7026 | Demotion logic must be explicit, not inferred | **RESOLVED** — `demotionReason` field added to Classification type with explicit `UI_PATH_SINGLE_FLAG` value |
| WRD-0080 | No enforcement-floor weakening | **RESOLVED** — 4 governance tests verify floor preservation; BLOCK decisions still recorded; demotion only for UI paths with single flag |
| WRD-0082 | Demotion-path changes must be explicit and test-backed | **RESOLVED** — Demotion reason documented in types, commented in classifier, tested in governance suite |

---

## Non-Blocking Conditions Resolution

| ID | Condition | Resolution |
|----|-----------|------------|
| WRD-0081 | Advisory-only false-positive surfacing intact | **RESOLVED** — Quality scoring explicitly labeled "advisory only"; does not override decisions or weaken enforcement |
| WRD-0083 | Evaluate OBS-S-7017 opportunistically | **DEFERRED** — Not naturally touched by Phase 7.9 scope |

---

## Implementation Summary

### §2.1 Classification Precision Refinement

**Files Modified:**
- `src/extension/reviewSurfaces.ts` — False-positive quality scoring and ranking

**Precision Improvements:**
- False-positive candidates now filtered to WARN and REQUIRE_PLAN only (BLOCK excluded as rarely false positive)
- Candidates ranked by quality score (higher = more likely true false positive)
- Quality labels displayed: ⚡ High, 🔶 Medium, 🔷 Low

**Quality Score Factors:**

| Factor | Score | Rationale |
|--------|-------|-----------|
| Decision is `WARN` | +30 | WARN more likely false positive than REQUIRE_PLAN |
| Decision is `REQUIRE_PLAN` | +10 | Plan-backed less likely false positive |
| Source is `RULE` or `FALLBACK` | +20 | Rule-only lacks model context |
| No matched rules | +25 | Flagged without rule match suggests over-cautious classification |
| Fallback: `CONFIG_MISSING` or `CONFIG_INVALID` | +15 | Config issues may cause spurious flags |

### §2.2 False-Positive Candidate Quality Refinement

**Files Modified:**
- `src/extension/reviewSurfaces.ts` — Quality scoring functions and display

**New Functions:**
```typescript
function calculateFalsePositiveQualityScore(entry: AuditEntry): number
function getFalsePositiveQualityLabel(entry: AuditEntry): string
```

**Quality Labels:**
- ⚡ **High** (score ≥50): Rule-only, no matched rules — most likely false positive
- 🔶 **Medium** (score 30–49): WARN decision or rule-only evaluation
- 🔷 **Low** (score <30): REQUIRE_PLAN or model-evaluated — less likely false positive

**Advisory-Only Disclaimer (WRD-0081):**
```typescript
export const REVIEW_SURFACE_FALSE_POSITIVE_QUALITY_NOTICE =
  'False-positive candidates are ranked by likelihood. This ranking is ' +
  'advisory only and does not override recorded decisions or weaken enforcement.';
```

### §2.3 Demotion-Rule Clarity and Bounded Refinement

**Files Modified:**
- `src/contracts/types.ts` — Added `demotionReason` field
- `src/core/classifier.ts` — Set explicit demotion reason

**Type Change:**
```typescript
export interface Classification {
  // ... existing fields ...
  demoted: boolean;
  // Phase 7.9 — Demotion clarity (WRD-0082)
  demotionReason?: 'UI_PATH_SINGLE_FLAG' | 'UI_PATH_MULTI_FLAG_REDUCED' | 'EXPLICIT_RULE';
}
```

**Classifier Change:**
```typescript
// Phase 7.9 — Demotion clarity (WRD-0082)
// Make demotion logic explicit and testable
if (
  riskFlags.length > 0 &&
  isUiPath(input.filePath, options.additionalUiSegments) &&
  riskFlags.length < 2
) {
  const demotedRisk = demoteRisk(riskLevel);
  if (demotedRisk !== riskLevel) {
    riskLevel = demotedRisk;
    demoted = true;
    demotionReason = 'UI_PATH_SINGLE_FLAG';
  }
}
```

**Demotion Constraints:**
- Only applies to UI paths (components/ui/views segments)
- Only applies with exactly 1 risk flag
- Non-UI paths preserve original risk level
- Multi-flag paths preserve original risk level
- Demotion reason always explicit in Classification result

### §2.4 Internal Evidence and Documentation Alignment

**File Modified:**
- `docs/ARCHITECTURE.md` — Added Phase 7.9 sections

**New Documentation:**
- Phase 7.9 additions summary
- False-Positive Quality Scoring section with factor table and labels
- Demotion Clarity section with logic code sample and constraints
- Advisory-only warnings preserved

### §2.5 Validation Expansion

**File Created:**
- `tests/governance/phase7.9-precisionAndFalsePositive.test.ts` (18 tests)

**Test Coverage:**

| Test Group | Tests | Coverage |
|------------|-------|----------|
| OBS-S-7023: Classification Precision | 3 | Quality scoring, evidence-based factors, advisory notice |
| OBS-S-7026: Demotion Explicitness | 3 | Demotion reason field, classifier sets reason, no hidden logic |
| WRD-0080: No Floor Weakening | 4 | BLOCK filtering, non-UI floor preservation, constants, fail-closed |
| WRD-0081: Advisory-Only Surfacing | 3 | Disclaimer, quality ranking advisory, no authorization wording |
| WRD-0082: Demotion Test-Backing | 3 | Types documented, classifier commented, tests verify explicitness |
| Evidence Artifacts | 2 | Phase section, quality scoring documented |

---

## Non-Scope Verification (§3)

The following were **NOT** implemented (as required):

- ❌ Cloud-lane activation or widening
- ❌ Command id migration
- ❌ Runtime adapter redesign
- ❌ Policy-floor weakening
- ❌ Broad new rule families
- ❌ Dashboard or command-centre expansion
- ❌ ARC Console or Vault coupling
- ❌ Release packaging or marketplace work

**Authority Boundary (§3.1) Preserved:**
- False-positive review remains advisory only
- Quality scoring does not override decisions
- Demotion logic explicit and bounded
- No inference of safety from missing evidence

---

## Architecture Decisions Compliance (§4)

| Decision | Compliance |
|----------|------------|
| 4.1 Precision must not weaken the floor | ✅ Verified by 4 governance tests |
| 4.2 Ambiguity remains fail-closed | ✅ Preserved in code and docs |
| 4.3 False-positive review remains advisory only | ✅ Explicit disclaimers added |
| 4.4 Demotion behavior must stay explicit | ✅ `demotionReason` field added |
| 4.5 Existing surfaces preferred | ✅ No new commands added |
| 4.6 Governance coverage protects semantics | ✅ 18 governance tests |

---

## File Surface Summary (§5)

**Modified Files:**
- `src/extension/reviewSurfaces.ts` — Quality scoring, ranking, labels
- `src/contracts/types.ts` — `demotionReason` field
- `src/core/classifier.ts` — Explicit demotion reason setting
- `docs/ARCHITECTURE.md` — Phase 7.9 documentation

**New Files:**
- `tests/governance/phase7.9-precisionAndFalsePositive.test.ts` — 18 governance tests

---

## Required Evidence (§7)

### 1. Precision-improvement summary
**Provided above** — See Implementation Summary (§2.1, §2.2).

### 2. False-positive reduction summary
**Provided above** — Quality scoring reduces noise by ranking candidates by likelihood.

### 3. Unchanged enforcement floor confirmation
**Confirmed:**
- BLOCK decisions still recorded in audit (only filtered from false-positive review display)
- Demotion only applies to UI paths with single flag
- Non-UI paths and multi-flag paths preserve original risk level
- 4 governance tests verify floor preservation

### 4. Demotion-logic truthfulness summary
**Provided in §2.3** — `demotionReason` field makes demotion explicit and testable.

### 5. Open findings / deferrals list
- **WRD-0083 / OBS-S-7017**: Deferred — not naturally touched by Phase 7.9 scope

### 6. Phase-close evidence artifact
**This document** — `artifacts/phase-7.9-evidence-summary.md`

---

## Rollback Requirement (§9)

If Phase 7.9 is rolled back:

1. **Remove quality scoring** from `renderFalsePositiveReview()` — revert to simple last-10 display
2. **Remove `demotionReason` field** from Classification type
3. **Remove demotion reason setting** from classifier.ts
4. **Remove quality scoring functions** from reviewSurfaces.ts
5. **Remove Phase 7.9 documentation** from ARCHITECTURE.md
6. **Remove governance tests** — `phase7.9-precisionAndFalsePositive.test.ts`

**Rollback preserves:**
- Phase 7.8 baseline (staleness, audit-read degradation)
- Command stability
- Audit continuity
- Enforcement behavior

---

## Sentinel Review Status

**Pre-Review:** PASS (conditions accepted as binding)  
**Execution Review:** PENDING

**Observations for Execution Review:**
- None at this time

---

## Warden Review Status

**Pre-Review:** PASS (conditions accepted as binding)  
**Execution Review:** PENDING

**Trust-Boundary Verification:**
- ✅ No enforcement floor weakening (4 tests verify)
- ✅ Ambiguous paths remain fail-closed
- ✅ False-positive review remains advisory only
- ✅ Demotion logic is explicit, not hidden

---

## Axis Approval Status

**Pre-Review Approval:** APPROVED (2026-03-23)  
**Execution Approval:** PENDING (awaiting this evidence artifact)

**Axis Execution Stance:**
- Precision improvement: AUTHORIZED ✅
- Permissiveness: NOT AUTHORIZED ✅
- Ambiguity: Remains FAIL-CLOSED ✅
- Demotion logic: EXPLICIT, BOUNDED, GOVERNANCE-TESTED ✅

---

## Next Steps

1. **Axis** reviews this evidence artifact
2. **Sentinel** conducts execution review (correctness, proportionality)
3. **Warden** conducts execution review (trust-boundary verification)
4. **Forge** updates phase package status to EXECUTION-CLOSED

---

## Appendix: Test Output

```
Test Files  36 passed (36)
     Tests  215 passed (215)
  Start at  20:24:23
  Duration  2.36s
```

```
✓ tests/governance/phase7.9-precisionAndFalsePositive.test.ts (18 tests)
```

---

**End of Phase 7.9 Evidence Summary**
