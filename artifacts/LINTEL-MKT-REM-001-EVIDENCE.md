# LINTEL-MKT-REM-001 — VSIX Packaging Remediation Evidence

**Directive ID:** LINTEL-MKT-REM-001  
**Title:** WRD-0091 VSIX Content Remediation for Marketplace Readiness  
**Date:** 2026-03-24  
**Status:** IMPLEMENTATION COMPLETE  

---

## Executive Summary

This package remediates the VSIX packaging boundary to exclude development-only files and retain only runtime-required content. This is **preparation work only** — not marketplace approval.

**Results:**
- Before: 98 files, 1.73 MB
- After: 44 files, 1.36 MB
- Reduction: 55% file count, 21% size

---

## WRD-0119: Minimum Exclusion List

**Implemented via:** `.vscodeignore`

**Excluded Categories:**

| Category | Pattern | Rationale |
|----------|---------|-----------|
| Evidence bundles | `artifacts/**` | Internal governance evidence (OBS-S-7092) |
| Internal state | `.arc/**` | Runtime audit data, not distributable |
| Local config | `.continue/**` | User-specific Continue extension config |
| Test files | `tests/**`, `vitest.config.*` | Development-only |
| Source code | `src/**`, `*.ts` | Ship compiled `dist/` only |
| Dev config | `eslint.config.*`, `tsconfig.*`, `.prettierrc` | Development-only |
| Internal docs | `AGENTS.md`, `LINTEL-*.md`, `PHASE*.md`, `docs/**` | Internal governance docs |

**Retained (Runtime Required):**

| Path | Rationale |
|------|-----------|
| `package.json` | Extension manifest |
| `README.md` | User documentation |
| `LICENSE` | License file (required by VSIX) |
| `dist/**` | Compiled extension code |
| `rules/**` | Runtime classification rules (see WRD-0123) |
| `Public/Logo/**` | Branding asset (see WRD-0122) |

---

## WRD-0120: No Secrets/Credentials/PII

**Verification:**
```bash
unzip -l lintel-0.1.0.vsix | grep -iE "(secret|key|token|password|credential|\.env|id_rsa|\.pem)"
# Result: No matches
```

**Result:** ✅ No secrets, credentials, or PII found in VSIX.

**.env Handling:**
- `.env` — Excluded
- `.env.*` — Excluded
- `.env.example` — Excluded (template only, no secrets)

---

## WRD-0122: Public/Logo/ Retained

**Status:** ✅ Included

**Rationale:** Required for ARC-UI-001a/b/c and ARC-BRAND-001 branding surfaces at runtime.

**Contents:**
```
Public/
└── Logo/
    └── ARC LOGO.png (1.3 MB)
```

---

## WRD-0123: rules/ Shipping Declaration

**Status:** ✅ Included

**Rationale:** The `rules/` directory contains the runtime classification rules (`default.json`) used by the rule engine for risk classification. This is **runtime-required** content, not development-only.

**Contents:**
```
rules/
├── default.json (1.26 KB) — Risk classification rules
└── schemas/
    └── README.md (0.16 KB) — Schema documentation
```

**Why it ships:**
- Used by `src/core/ruleEngine.ts` at runtime
- Classifies files for risk flags (AUTH_CHANGE, SCHEMA_CHANGE, CONFIG_CHANGE)
- Required for WARN/REQUIRE_PLAN/BLOCK decisions

---

## OBS-S-7092: artifacts/** Excluded

**Status:** ✅ Excluded

**Rationale:** The `artifacts/` directory contains governance evidence bundles (phase summaries, closure records) that are:
- Internal governance documentation
- Not required for extension runtime
- Potentially confusing to end users

---

## VSIX Content Summary

**Generated:** `lintel-0.1.0.vsix`

**Contents:**
```
lintel-0.1.0.vsix (44 files, 1.36 MB)
├── LICENSE.txt (0.11 KB)
├── package.json (3.15 KB)
├── readme.md
├── Public/
│   └── Logo/
│       └── ARC LOGO.png (1.3 MB)
├── dist/
│   ├── cli.js (8.75 KB)
│   ├── extension.js (20.66 KB)
│   ├── adapters/ (1 file)
│   ├── contracts/ (1 file)
│   ├── core/ (14 files)
│   ├── extension/ (6 files)
│   └── ui/ (12 files)
└── rules/
    ├── default.json (1.26 KB)
    └── schemas/ (1 file)
```

**Excluded (verified absent):**
- ❌ `artifacts/`
- ❌ `.arc/`
- ❌ `.continue/`
- ❌ `tests/`
- ❌ `src/`
- ❌ `docs/`
- ❌ `vitest.config.ts`
- ❌ `eslint.config.*`
- ❌ `tsconfig.*`

---

## Governance Tests

**File:** `tests/governance/mktRem001-vsixPackaging.test.ts`

**Test Coverage:**
- WRD-0119: Minimum exclusion list enforced
- WRD-0120: No secrets/credentials/PII
- WRD-0122: Public/Logo/ retained
- WRD-0123: rules/ shipping declared
- OBS-S-7092: artifacts/** excluded
- Package size < 5 MB
- File count < 100 files

---

## WRD-0121: Not Marketplace Approval

**Disclaimer:** This remediation is **preparation work only**. It does not constitute:
- ❌ Marketplace approval
- ❌ Production certification
- ❌ Public release authorization

This package prepares the VSIX boundary for a **future** marketplace-readiness package (separate directive required).

---

## Validation

```
lint     ✓
typecheck ✓
build    ✓
test     ✓ (312 + 8 = 320 tests)
pack     ✓ (44 files, 1.36 MB)
```

---

**End of LINTEL-MKT-REM-001 Evidence Summary**
