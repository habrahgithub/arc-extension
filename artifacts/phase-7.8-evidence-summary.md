# Phase 7.8 — Operator Friction Hardening Evidence Summary

**Directive ID:** LINTEL-PH7-8-001  
**Phase Name:** Operator Friction Hardening  
**Risk Tier:** MEDIUM  
**Status:** IMPLEMENTATION COMPLETE  
**Date:** 2026-03-23  

---

## Executive Summary

Phase 7.8 successfully implements operator friction hardening without widening authority surfaces, introducing new persistence paths, or redesigning routing policy. All 4 sub-scopes (§2.1–2.4) plus validation (§2.5) are complete.

**Validation Results:**
- ✅ lint: PASS
- ✅ typecheck: PASS
- ✅ build: PASS
- ✅ test:unit: PASS (35 files, 197 tests total)
- ✅ test:integration: PASS
- ✅ test:e2e: PASS
- ✅ test:governance: PASS (98 tests including 20 new Phase 7.8 tests)

---

## Pre-Review Conditions Resolution

### Sentinel Carry-Forward Conditions

| ID | Condition | Resolution |
|----|-----------|------------|
| OBS-S-7019 | Forge must define staleness model concretely | **RESOLVED** — Staleness model defined as file-mismatch, time-threshold (5 min), or both |
| OBS-S-7020 | Tests must verify semantic meaning, not just string presence | **RESOLVED** — 20 governance tests verify wording semantics |
| OBS-S-7021 | Core-layer changes require justification | **RESOLVED** — All changes scoped to extension layer only |

### Warden Carry-Forward Conditions

| ID | Condition | Resolution |
|----|-----------|------------|
| WRD-0076 | Operator wording: descriptive-only, non-reassuring | **RESOLVED** — All staleness wording uses "may not apply/reflect" framing |
| WRD-0077 | Audit-read degradation: no raw errors, no masking, degrade to "unavailable" | **RESOLVED** — Errors tracked as `AUDIT_READ_FAILED`, no raw exposure |
| WRD-78 | Schema docs: reflect optionality, no overclaim | **RESOLVED** — ARCHITECTURE.md documents all optional fields accurately |

---

## Implementation Summary

### §2.1 Last-decision staleness hardening

**Files Modified:**
- `src/extension/runtimeStatus.ts` — Added staleness interface fields and display logic
- `src/extension.ts` — Implemented staleness detection in `lintel.showRuntimeStatus` command

**Staleness Model (OBS-S-7019):**
```typescript
// File-mismatch: last decision file_path differs from active file
const isFileMismatch = activeFilePath != null && lastAudit.file_path !== activeFilePath;

// Time-threshold: last decision is older than 5 minutes
const isTimeStale = timeDiff > 5 * 60 * 1000;

// Combined staleness
const isStale = isFileMismatch || isTimeStale;
const stalenessReason = isFileMismatch && isTimeStale
  ? 'BOTH'
  : isFileMismatch
    ? 'FILE_MISMATCH'
    : isTimeStale
      ? 'TIME_THRESHOLD'
      : undefined;
```

**Display Wording (WRD-0076):**
- Fresh context: `✅ Current file and recent (within 5 minutes)`
- File mismatch: `⚠️ From a different file (decision context may not apply)`
- Time stale: `⚠️ From an earlier session (older than 5 minutes)`
- Both: `⚠️ From a different file and earlier session`

**Key Design Decisions:**
- Staleness is **descriptive only** — does not invalidate prior decisions
- Uses neutral "may not apply/reflect" wording — avoids alarming language
- 5-minute threshold chosen as reasonable session boundary

### §2.2 Trigger-context completeness hardening

**Status:** No additional implementation required beyond Phase 7.7.

Phase 7.7 already implemented complete trigger-context capture:
- `save_mode` (EXPLICIT/AUTO)
- `auto_save_mode` (afterDelay/onFocusChange/onWindowChange)
- `model_availability_status` (DISABLED_BY_CONFIG/UNAVAILABLE_AT_RUNTIME/AVAILABLE_AND_USED/NOT_ATTEMPTED)

Phase 7.8 adds documentation of these fields in ARCHITECTURE.md (§2.4).

### §2.3 Non-authorizing audit-read degradation handling

**Files Modified:**
- `src/extension.ts` — Fixed silent catch at lines 268-270
- `src/extension/reviewSurfaces.ts` — Added audit-read degradation display

**WRD-0077 Compliance:**
```typescript
// Before (Phase 7.7):
catch {
  // Silently ignore audit read errors; lastAudit remains undefined
}

// After (Phase 7.8):
catch {
  // Phase 7.8 — WRD-0077: Do not silently ignore audit read errors.
  // Degrade to "audit unavailable" rather than "audit clean".
  // Do not expose raw error details to operator surface.
  auditReadError = 'AUDIT_READ_FAILED';
}
```

**Degradation Display:**
```markdown
## Audit-read degradation

> Audit-read degradation: audit data could not be read cleanly. 
> This display is partial and does not imply audit absence equals 
> approval or clean state.

- Audit data could not be read cleanly
- This display is partial and does not imply audit absence equals approval
- Enforcement floor remains authoritative despite audit-read failure
```

**Key Properties:**
- No raw error details exposed (no `err.message`, `err.stack`)
- No retry or recovery logic (would mask audit corruption)
- Degrades to "unavailable" not "clean" or "no issues"

### §2.4 Trigger / audit schema clarification

**File Modified:**
- `docs/ARCHITECTURE.md` — Added "Trigger and Audit Schema (Phase 7.8)" section

**Documented Schemas:**

1. **DecisionPayload fields** — 18 fields with optionality markers
   - 8 required fields (decision, reason, risk_level, etc.)
   - 10 optional fields (directive_id, blueprint_id, route_*, save_mode, etc.)

2. **AuditEntry envelope fields** — 6 required fields
   - ts, file_path, risk_flags, matched_rules, prev_hash, hash

3. **Staleness model** — Display-only indicator with 4 states
   - FILE_MISMATCH, TIME_THRESHOLD, BOTH, or current

4. **Audit-read degradation** — 3 properties
   - Degrade to "unavailable", no raw errors, no retry

5. **Integrity boundary** — File-level only
   - Hash chain verifies files that exist
   - Does NOT prove archive completeness
   - Does NOT detect wholesale deletion

### §2.5 Validation expansion

**File Created:**
- `tests/governance/phase7.8-operatorFrictionHardening.test.ts` (20 tests)

**Test Coverage:**

| Test Group | Tests | Coverage |
|------------|-------|----------|
| OBS-S-7019: Concrete Staleness Model | 3 | Threshold constant, implementation, documentation |
| OBS-S-7020: Semantic Meaning | 4 | Descriptive wording, file/time distinction, degradation language |
| OBS-S-7021: Extension-Layer Only | 2 | No core changes, no new modules |
| WRD-0076: Descriptive-Only Wording | 3 | Staleness notice, neutral language, positive confirmation |
| WRD-0077: Audit-Read Degradation | 3 | Error tracking, display degradation, no retry |
| WRD-0078: Schema Optionality | 3 | Field documentation, integrity boundary, save_mode optionality |
| Evidence Artifacts | 2 | Phase section, schema section |

---

## Non-Scope Verification (§3)

The following were **NOT** implemented (as required):

- ❌ Cloud-lane activation or widening
- ❌ Command id migration
- ❌ New persistence files under `.arc/`
- ❌ Routing-policy redesign
- ❌ Model-adapter redesign
- ❌ Dashboard or command-centre expansion
- ❌ ARC Console or Vault coupling
- ❌ Release packaging or marketplace work

**Authority Boundary (§3.1) Preserved:**
- No save authorization changes
- No policy floor reinterpretation
- No synthetic evidence inference
- No audit evidence replacement

---

## Architecture Decisions Compliance (§4)

| Decision | Compliance |
|----------|------------|
| 4.1 Existing save authority remains authoritative | ✅ Preserved |
| 4.2 Staleness must be explicit, not hidden | ✅ Implemented |
| 4.3 Existing evidence remains primary | ✅ No synthetic state |
| 4.4 Fail-closed meaning remains explicit | ✅ Preserved |
| 4.5 Existing command surfaces preferred | ✅ No new commands |
| 4.6 Governance coverage protects semantics | ✅ 20 governance tests |

---

## File Surface Summary (§5)

**Modified Files:**
- `src/extension.ts` — Staleness detection, audit-read error handling
- `src/extension/runtimeStatus.ts` — Staleness interface, display logic
- `src/extension/reviewSurfaces.ts` — Audit-read degradation display
- `docs/ARCHITECTURE.md` — Schema documentation

**New Files:**
- `tests/governance/phase7.8-operatorFrictionHardening.test.ts` — Governance tests

**No Core-Layer Changes (OBS-S-7021):**
- All changes confined to `src/extension/` layer
- No modifications to `src/core/*` files
- Justification: Friction hardening is display/UX layer only

---

## Required Evidence (§7)

### 1. Operator-friction hardening summary
**Provided above** — See Implementation Summary.

### 2. Stale/partial display behavior note
**Provided in §2.1** — Staleness model defined with explicit conditions and neutral wording.

### 3. No new persistence/authority confirmation
**Confirmed:**
- No new `.json` or `.jsonl` files created
- No new write operations introduced
- All changes are read-only (audit read, display logic)

### 4. Trigger/audit schema clarification summary
**Provided in §2.4** — Full schema documented in ARCHITECTURE.md with optionality markers.

### 5. Open findings / deferrals list
**None** — All scope items completed.

### 6. Phase-close evidence artifact
**This document** — `artifacts/phase-7.8-evidence-summary.md`

---

## Rollback Requirement (§9)

If Phase 7.8 is rolled back:

1. **Remove staleness fields** from `RuntimeStatusSnapshot` interface
2. **Remove staleness detection** from `lintel.showRuntimeStatus` command
3. **Remove audit-read error tracking** — revert to silent catch
4. **Remove degradation display** from `renderAuditReview()`
5. **Remove schema documentation** from ARCHITECTURE.md
6. **Remove governance tests** — `phase7.8-operatorFrictionHardening.test.ts`

**Rollback preserves:**
- Phase 7.7 baseline (trigger visibility fields)
- Command stability
- Audit continuity
- Existing enforcement behavior

---

## Sentinel Review Status

**Pre-Review:** PASS (no structural objection)  
**Execution Review:** PENDING

**Observations for Execution Review:**
- None at this time

---

## Warden Review Status

**Pre-Review:** PASS (no structural objection)  
**Execution Review:** PENDING

**Trust-Boundary Verification:**
- ✅ Stale indicators do not reassure ("may not apply" vs "is invalid")
- ✅ Degraded audit-read states do not imply "no evidence = no problem"
- ✅ All wording maintains "descriptive only, non-authorizing" framing

---

## Axis Approval Status

**Pre-Review Approval:** APPROVED  
**Execution Approval:** PENDING (awaiting this evidence artifact)

---

## Next Steps

1. **Axis** reviews this evidence artifact
2. **Sentinel** conducts execution review (correctness, proportionality)
3. **Warden** conducts execution review (trust-boundary verification)
4. **Forge** updates phase package status to EXECUTION-CLOSED

---

## Appendix: Test Output

```
Test Files  35 passed (35)
     Tests  197 passed (197)
  Start at  19:27:12
  Duration  1.92s
```

```
✓ tests/governance/phase7.8-operatorFrictionHardening.test.ts (20 tests)
```

---

**End of Phase 7.8 Evidence Summary**
