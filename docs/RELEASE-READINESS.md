# ARC XT — Audit Ready Core

## Release Readiness Record (LINTEL-REL-001)

**Directive ID:** LINTEL-REL-001
**Version:** 0.1.12
**Release Posture:** CONTROLLED INTERNAL RELEASE
**Date:** 2026-04-05
**Last Canon Review:** 2026-04-05
**Stage 4 Authorization:** ✅ AUTHORIZED (Axis 2026-04-03 — broader internal rollout)

---

## Release Status

**Status:** CONTROLLED INTERNAL RELEASE READY (STAGE 4 BROADER INTERNAL ROLLOUT)

**Certified For:**

- Internal lab deployment
- Controlled workspace environments
- Development and testing use

**Not Certified:**

- Public marketplace release
- Production deployment
- External user distribution
- Cloud-lane activation (disabled by default)

**Current Posture Statement:**

- Stage 4 broader internal rollout is authorized and operational
- Documentation prerequisites for Stage 5 public/enterprise gate are substantially complete
- Remaining Stage 5 gate items: U34 (enterprise distribution), U33/U26 (override policy) — pending Axis/Warden policy review

---

## Package Information

| Field        | Value                       |
| ------------ | --------------------------- |
| Name         | `lintel`                    |
| Display Name | `ARC XT — Audit Ready Core` |
| Version      | `0.1.12`                    |
| Publisher    | `swd` (internal)            |
| License      | `Apache-2.0`                |
| Private      | `true`                      |

**Trust-Sensitive Fields Review (WRD-0088):**

- ✅ `private: true` — not for public npm
- ✅ `license: Apache-2.0` — no open-source claims
- ✅ `publisher: swd` — internal publisher only
- ✅ `description` — truthful, bounded capability statement
- ✅ No marketplace keywords or public-release implications

---

## Phase Completion Status

| Phase                            | Items                                                            | Status  | Commit  |
| -------------------------------- | ---------------------------------------------------------------- | ------- | ------- |
| **Phase 4 — Task Layer**         | U07-U11 (task schema, parsing, selection, context, safety tests) | ✅ DONE | 16feef3 |
| **Phase 5 — Evaluation**         | U29 (value statement), U30 (trust pages), U32 (eval guide)       | ✅ DONE | 1caf057 |
| **Phase 6 — Coherence**          | U37 (coherence protocol), U38 (EvaluationResult contract)        | ✅ DONE | 40d6dbb |
| **Phase 7 — Security Mapping**   | U39-U42/U45-U46 (6 security canvas records + capstone matrix)    | ✅ DONE | 5593736 |
| **Phase 8 — Roadmap Primitives** | U20 (roadmap primitive mapping)                                  | ✅ DONE | c1d2872 |
| **Phase 9 — Task Persistence**   | N01 (persist active task selection across reloads)               | ✅ DONE | c1d2872 |
| **Phase 10 — Telemetry/Metrics** | U31 (telemetry contract), U36 (privacy-safe metrics)             | ✅ DONE | 3c7b4f1 |

---

## Stage 5 Prerequisites (Public/Enterprise Gate)

| Prerequisite                    | Item    | Status   | Notes                                    |
| ------------------------------- | ------- | -------- | ---------------------------------------- |
| Public asset alignment          | U29     | ✅ DONE  | ARC-PUBLIC-VALUE-STATEMENT.md created    |
| ARC-specific trust pages        | U30     | ✅ DONE  | ARC-TRUST-PAGES.md created               |
| Telemetry contract              | U31     | ✅ DONE  | U31-TELEMETRY-CONTRACT.md created        |
| Evaluation path                 | U32     | ✅ DONE  | ARC-EVALUATION-GUIDE.md created          |
| Privacy-safe metrics            | U36     | ✅ DONE  | U36-PRIVACY-SAFE-METRICS-SPEC.md created |
| Enterprise distribution posture | U34     | ⏳ WATCH | Not yet started — requires Axis scoping  |
| Override/dispute policy         | U33/U26 | ⏳ LATER | Requires Axis/Warden policy review       |

---

## Installation

### Prerequisites

1. **VS Code:** ^1.90.0 or later
2. **Node.js:** >=20
3. **npm:** Latest stable version

### Install from VSIX

1. Download the latest `.vsix` from the releases page
2. In VS Code: Extensions → `...` → **Install from VSIX...**
3. Select the downloaded `.vsix` file
4. Reload VS Code when prompted

---

## Verification

### Build

```bash
npm run build
# Expected: Clean TypeScript compile
```

### Test Suite

```bash
npm run test
# Expected: 73+ files / 579+ tests, all passing
```

### VSIX Package

```bash
npm run pack
# Expected: arc-audit-ready-core-0.1.12.vsix produced
```

---

## Known Limitations

### Classification Limitations

1. **Heuristic-first classification**: False positives may occur on edge-case paths
2. **File-level integrity only**: Audit verification does not detect wholesale `.arc/` deletion
3. **Local-only blueprints**: Team/shared blueprint handling not authorized

### Runtime Limitations

4. **Cloud disabled by default**: Cloud lane requires explicit route-policy enablement
5. **Local model optional**: Ollama adapter present but disabled unless route selects it
6. **Auto-save reduced guarantee**: Auto-save assessments fail closed to `RULE_ONLY`

### Integration Limitations

7. **ARC Console not integrated**: No runtime dependency on ARC Console
8. **Vault not integrated**: Vault-ready export is local schema alignment only
9. **No dashboard**: Dashboard/command-centre work deferred

### Release Limitations

10. **Internal release only**: Not certified for public/marketplace release
11. **No production claims**: Production deployment requires separate approval
12. **Controlled distribution**: VSIX for internal lab use only

---

## Support and Escalation

### Support Channels

- **Internal Documentation:** `docs/ARCHITECTURE.md`, `README.md`
- **UAT Scenarios:** `docs/PHASE-7.10-UAT-SCENARIOS.md`
- **Rollback Drill:** `docs/PHASE-7.10-ROLLBACK-DRILL.md`

### Escalation Path

1. **Review architecture docs** for enforcement boundary clarification
2. **Check UAT scenarios** for expected behavior verification
3. **Run governance tests** for compliance validation
4. **Escalate to Axis** for policy/routing questions
5. **Escalate to Warden** for security/trust-boundary questions

### Known Issues and Workarounds

| Issue                                                   | Workaround                                           |
| ------------------------------------------------------- | ---------------------------------------------------- |
| `code` CLI doesn't support `--extensionDevelopmentPath` | Use VSIX install path instead                        |
| Auto-save triggers reduced-guarantee mode               | Prefer explicit saves (Ctrl+S/Cmd+S)                 |
| Nested project boundaries may be unclear                | Use `ARC XT: Show Active Workspace Status` to verify |

---

## Distribution Posture (WRD-0090)

### Trusted/Internal Distribution

This extension is distributed under **controlled internal release** posture:

1. **Distribution Channel:** Direct VSIX transfer (internal only)
2. **Integrity Verification:** Git commit hash verification recommended
3. **Source Verification:** Build from source for full transparency

### VSIX Contents Safety (WRD-0089)

**VSIX package excludes:**

- Credentials and secrets (no `.env`, `.secret`, or key files)
- PII (no personal data or user-specific configuration)
- Dev-only files (tests, source maps excluded from runtime)

**VSIX includes:**

- Compiled extension code (`dist/extension.js`)
- Required metadata (`package.json`, `readme.md`)
- Documentation (`docs/` for operator reference)

### Integrity Verification

```bash
# Verify VSIX built from expected commit
cd /path/to/lintel
git rev-parse HEAD  # Should match expected commit hash
npm run pack
sha256sum artifacts/releases/arc-audit-ready-core-0.1.12.vsix  # Record for verification
```

### Update Notification

For internal deployments, update notification occurs via:

- Git branch update notification
- Direct communication for controlled deployments

No automatic update checks are implemented (internal release posture).

---

## Evidence Retention (OBS-S-7032, OBS-S-7033)

### Packaging Evidence

- **VSIX Package:** `artifacts/releases/arc-audit-ready-core-0.1.12.vsix` (retained)
- **Build Output:** `dist/extension.js` (generated by build)
- **Package Manifest:** `package.json` (version-controlled)

### Installation Evidence

- **Install Steps:** Documented above (repeatable)
- **Verification Commands:** `ARC XT:` commands list (verifiable)
- **Audit Continuity:** `.arc/audit.jsonl` preserved across upgrades

### Release-Readiness Evidence

- **This Document:** `docs/RELEASE-READINESS.md` (by path reference)
- **Phase Completion Records:** Ledger entries in `docs/records/directives/ARCXT-UX-002-TODO-LEDGER.md` (by path reference)
- **Security Mapping Records:** `docs/records/strategy/U39-U42/U45-U46` (by path reference)

**Note:** Evidence is referenced by path, not copied (OBS-S-7033 compliance).

---

## Governance-Gap Acknowledgment (OBS-S-7030)

**Condition:** All Phase 4-9 execution-review coverage is now complete and closed.

- Phase 4 (U07-U11): Closed with full governance test coverage (565+ tests)
- Phase 5 (U29-U32): Closed with docs-only artifacts
- Phase 6 (U37-U38): Closed with type contract + tests
- Phase 7 (U39-U42/U45-U46): Closed with security mapping records
- Phase 8-9 (U20/N01): Closed with docs + bounded persistence feature

**Resolution:** All active work items under ARCXT-UX-002 are closed. Remaining items are LATER/WATCH status requiring new reviewed packages.

---

## Release Boundary Discipline (WRD-0087)

**This release is:**

- ✅ Controlled internal release
- ✅ Evidence-backed (UAT scenarios, rollback drill)
- ✅ Truthful about capability and limitations

**This release is NOT:**

- ❌ Public marketplace release
- ❌ Production deployment approval
- ❌ Cloud-lane activation
- ❌ ARC Console or Vault integration

**Wording Discipline:**

- All documentation states "internal release" or "controlled release"
- No "production-ready", "marketplace-ready", or "public release" claims
- Capability statements are bounded to actual implemented features

---

## Checklist for Release Validators

- [x] VSIX package generated successfully (`npm run pack`)
- [x] VSIX installs cleanly in VS Code
- [x] All `ARC XT:` commands functional after install
- [x] Audit continuity preserved (if upgrading)
- [x] Governance tests pass (`npm run test:governance`)
- [x] No marketplace/public-release wording in docs
- [x] package.json truthfulness verified (private, license, publisher)
- [x] Known limitations documented
- [x] Rollback path documented and tested
- [x] Evidence artifacts retained by path reference

---

**End of Release Readiness Record — Version 0.1.12**
