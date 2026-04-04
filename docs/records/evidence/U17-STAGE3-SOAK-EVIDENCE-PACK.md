# U17 — Stage 3 Soak Evidence Pack

**Pack ID:** U17-SOAK-001  
**Date:** 2026-04-03  
**Type:** Evidence Package (not readiness claim)  
**Stage:** 3 — Limited Operator Cohort  

---

## 1. Git State

| Repo | HEAD | Clean |
|------|------|-------|
| workspace | `5a24007` | ✅ |
| lintel | `5a24007` | ✅ |

Both repos clean, aligned `0/0` vs `origin/main`.

---

## 2. Stage 3 Authorization Boundary

**Authorization:** ✅ AUTHORIZED (Axis 2026-04-03)  
**Scope:** Limited operator cohort only  
**Constraints (WARDEN-enforced):**
- Local-only lane only
- `enabledByDefault = false`
- Operator-configured route policy only
- No cloud lane
- No auto-save execution expansion
- Active blueprint: `ARCXT-UX-002`

---

## 3. Build Result

```
npm run build
✅ PASS — Clean TypeScript compile, 0 errors
```

---

## 4. Test Result

```
npm run test
✅ Test Files: 69 passed (69)
✅ Tests: 534 passed (534)
✅ Duration: ~25s
```

No failures. All governance, unit, integration, and E2E tests passing.

---

## 5. Current VSIX / Version

| Field | Value |
|-------|-------|
| File | `arc-audit-ready-core-0.1.11.vsix` |
| Size | 2.1 MB |
| Build Commit | `5a24007` |
| Build Date | 2026-04-03 |
| Files | 616 |
| Dependencies | `ajv` + 4 transitive (included) |

---

## 6. Sentinel Monitoring Summary

**Posture:** Passive  
**Status:** No alerts triggered  
**Monitoring Scope:**
- Stage 3 stability
- WARDEN standing conditions
- Stage 4 package gate readiness

**Findings to Date:**
- None during current Stage 3 authorization period

---

## 7. Operator Cohort Observations

**Cohort Size:** Limited operators (per Axis authorization)  
**Observation Period:** Stage 3 active (2026-04-03 onwards)  
**Status:** Soak evidence collection in progress

**Observations:**
- Extension activates cleanly (no `Cannot find module 'typescript'` errors)
- Output channel singleton pattern prevents duplicates (H-006 closed)
- Test infrastructure ESM fix enables independent verification (H-007 closed)

---

## 8. Crash / Error Summary

**Extension Host Errors:** 0  
**Test Failures:** 0 (534/534 passing)  
**Build Errors:** 0  

**Known Non-Issues:**
- `navigator` migration errors affect other extensions (Gemini/Copilot), not ARC
- Test output cleanliness verified (no SQLite stderr noise)

---

## 9. Open Items Still Active

| Item | Status | Target |
|------|--------|--------|
| H-001 (`execSqlJson()` stderr) | ✅ CLOSED | — | |
| H-002 (SQLite EPERM) | ⏳ Open | Optional |
| U16 (doc/evidence maintenance) | 🟡 Active | Ongoing |
| U17 (soak evidence pack) | ✅ CLOSED | Stage 4 evidence submitted | |
| ARCXT-UX-002 follow-on | 🟡 Tracked | Blueprint + TODO ledger |

---

## 10. Stage 4 Gate Status

**Stage 4 Status: ✅ AUTHORIZED (Axis 2026-04-03) — broader internal rollout only, within WARDEN envelope.**


2. **Soak/stability decision: U17 pack submitted and accepted (Axis 2026-04-03)

This document was created as an evidence package; Stage 4 broader internal rollout was subsequently authorized (Axis 2026-04-03).  
It is an evidence package for decision-making purposes only.

---

## Evidence Links

| Artifact | Path |
|----------|------|
| Active blueprint | `.arc/blueprints/ARCXT-UX-002.md` |
| TODO ledger | `docs/records/directives/ARCXT-UX-002-TODO-LEDGER.md` |
| Release readiness | `docs/RELEASE-READINESS.md` |
| Roadmap reference | `docs/records/strategy/ARC-BLUEPRINT-001-roadmap-reference.md` |
| H-007 documentation | `docs/H-007-TEST-INFRASTRUCTURE-GAP.md` |
| Hardening backlog | `HARDENING-BACKLOG.md` |
| WARDEN finding | `governance/records/WARDEN-LINTEL-001.md` (workspace) |

---

**Package Date:** 2026-04-03  
**Prepared By:** Forge  
**Next Review: Stage 4 stability evidence + broader rollout feedback + soak stability decision
