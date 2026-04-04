# U32 — 10-Minute Evaluation Path Plan

**Status:** PLANNED  
**Priority:** P1  
**Category:** UX / Evaluation  
**Date:** 2026-04-04  

---

## Objective
Create a guided first-run demo / quick evaluation path that shows **WARN → REQUIRE_PLAN → BLOCK** with clear value before friction. Distinct from bootstrap; proves value quickly.

## Evaluation Flow (Target: <10 minutes)
1. **Installation:** VSIX install (2 min)
2. **First-Run Bootstrap:** Guided root selection + config creation (2 min)
3. **Governed File Edit (WARN):** Edit a file matching `auth/*` or `config/*`. Save triggers WARN with clear explanation (2 min)
4. **Protected File Edit (BLOCK):** Edit a file matching `auth/core/*`. Save triggers BLOCK with guidance (2 min)
5. **Review Surface:** Open Audit Log to see the hash-chained record (2 min)

## Success Criteria
- Operator understands value proposition within 10 minutes.
- Operator sees at least one WARN and one BLOCK event.
- Operator can explain how ARC XT differs from a linter.

## UX Principles
- **Show Value Before Asking for Proof:** Evaluation path explicitly demonstrates WARN (acknowledge risk), REQUIRE_PLAN (link blueprint), and BLOCK (stop critical change) flows.
- **No Hidden Friction:** Warnings and blocks should have clear "Why?" explanations and next steps.
- **Safe Environment:** Evaluation mode should not mutate or corrupt existing user projects.

## Implementation Note
This is a **planning record**. Implementation of the evaluation mode requires a separate Axis review to ensure it doesn't inadvertently weaken enforcement posture.

---

**End of U32 Record**
