# ARC — Audit Ready Core

## Release Readiness Record (LINTEL-REL-001)

**Directive ID:** LINTEL-REL-001  
**Version:** 0.1.0  
**Release Posture:** CONTROLLED INTERNAL RELEASE  
**Date:** 2026-03-23

---

## Release Status

**Status:** CONTROLLED INTERNAL RELEASE READY

**Certified For:**

- Internal lab deployment
- Controlled workspace environments
- Development and testing use

**Not Certified:**

- Public marketplace release
- Production deployment
- External user distribution
- Cloud-lane activation (disabled by default)

---

## Package Information

| Field        | Value                    |
| ------------ | ------------------------ |
| Name         | `lintel`                 |
| Display Name | `ARC — Audit Ready Core` |
| Version      | `0.1.0`                  |
| Publisher    | `swd` (internal)         |
| License      | `UNLICENSED`             |
| Private      | `true`                   |

**Trust-Sensitive Fields Review (WRD-0088):**

- ✅ `private: true` — not for public npm
- ✅ `license: UNLICENSED` — no open-source claims
- ✅ `publisher: swd` — internal publisher only
- ✅ `description` — truthful, bounded capability statement
- ✅ No marketplace keywords or public-release implications

---

## Installation

### Prerequisites

1. **VS Code:** ^1.90.0 or later
2. **Node.js:** >=20
3. **npm:** Latest stable version

### Build from Source

```bash
# Clone repository
git clone https://github.com/habrahgithub/lintel.git
cd lintel

# Install dependencies
npm install

# Build extension
npm run build

# Generate VSIX package
npm run pack
```

**Output:** `lintel-0.1.0.vsix` in project root

### Install VSIX

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Click `...` menu → `Install from VSIX...`
4. Select `lintel-0.1.0.vsix`
5. Reload VS Code when prompted

### Verify Installation

After installation, verify the extension is active:

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type `ARC:` — should show 5 commands:
   - `ARC: Show Welcome Guide`
   - `ARC: Review Audit Log`
   - `ARC: Show Active Workspace Status`
   - `ARC: Review Blueprint Proofs`
   - `ARC: Review False-Positive Candidates`

---

## Upgrade Path

### From Prior Phase (7.10 or earlier)

1. **Backup workspace** (recommended):

   ```bash
   git status
   git commit -am "Pre-upgrade backup"
   ```

2. **Uninstall prior version**:
   - Extensions view → Find "ARC — Audit Ready Core"
   - Click `Uninstall`
   - Reload VS Code

3. **Install new VSIX** (see Installation section)

4. **Verify audit continuity**:
   ```bash
   # Audit entries should be preserved
   wc -l .arc/audit.jsonl
   npm run audit:cli -- verify
   ```

### Rollback to Prior Phase

If upgrade issues occur, rollback to Phase 7.10 baseline:

```bash
cd /path/to/lintel
git checkout arc-r2-lintel-phase-7-10
npm install
npm run build
npm run pack
# Re-install VSIX from generated package
```

**Audit Continuity:** Rollback preserves `.arc/` directory and audit history.

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

| Issue                                                   | Workaround                                        |
| ------------------------------------------------------- | ------------------------------------------------- |
| `code` CLI doesn't support `--extensionDevelopmentPath` | Use VSIX install path instead                     |
| Auto-save triggers reduced-guarantee mode               | Prefer explicit saves (Ctrl+S/Cmd+S)              |
| Nested project boundaries may be unclear                | Use `ARC: Show Active Workspace Status` to verify |

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
sha256sum lintel-0.1.0.vsix  # Record for verification
```

### Update Notification

For internal deployments, update notification occurs via:

- Git branch update notification
- Direct communication for controlled deployments

No automatic update checks are implemented (internal release posture).

---

## Evidence Retention (OBS-S-7032, OBS-S-7033)

### Packaging Evidence

- **VSIX Package:** `dist/release/lintel-0.1.0.vsix` (retained)
- **Build Output:** `dist/extension.js` (generated by build)
- **Package Manifest:** `package.json` (version-controlled)

### Installation Evidence

- **Install Steps:** Documented above (repeatable)
- **Verification Commands:** `ARC:` commands list (verifiable)
- **Audit Continuity:** `.arc/audit.jsonl` preserved across upgrades

### Release-Readiness Evidence

- **This Document:** `docs/RELEASE-READINESS.md` (by path reference)
- **UAT Scenarios:** `docs/PHASE-7.10-UAT-SCENARIOS.md` (by path reference)
- **Rollback Drill:** `docs/PHASE-7.10-ROLLBACK-DRILL.md` (by path reference)

**Note:** Evidence is referenced by path, not copied (OBS-S-7033 compliance).

---

## Governance-Gap Acknowledgment (OBS-S-7030)

**Condition:** Phase 7.9 and 7.10 execution-review coverage was not separately gated before this release-readiness package.

**Acknowledgment:**

- Phase 7.9 (Precision & False-Positive Reduction) was implemented and closed with full governance test coverage (18 tests)
- Phase 7.10 (Pilot Readiness / UAT Pack) was implemented and closed with full governance test coverage (18 tests)
- Both phases passed Sentinel/Warden review and Axis approval
- Execution-review evidence is retained in:
  - `artifacts/phase-7.9-evidence-summary.md`
  - `artifacts/phase-7.10-evidence-summary.md` (this document serves this purpose)

**Resolution:** This release-readiness record explicitly acknowledges the governance-gap and provides retrospective evidence linkage to Phase 7.9 and 7.10 closure records.

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

- [ ] VSIX package generated successfully (`npm run pack`)
- [ ] VSIX installs cleanly in VS Code
- [ ] All 5 `ARC:` commands functional after install
- [ ] Audit continuity preserved (if upgrading)
- [ ] Governance tests pass (`npm run test:governance`)
- [ ] No marketplace/public-release wording in docs
- [ ] package.json truthfulness verified (private, license, publisher)
- [ ] Known limitations documented
- [ ] Rollback path documented and tested
- [ ] Evidence artifacts retained by path reference

---

**End of Release Readiness Record**
