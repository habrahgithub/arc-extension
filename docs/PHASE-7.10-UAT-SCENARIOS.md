# Phase 7.10 — Internal UAT Scenario Pack

**Directive ID:** LINTEL-PH7-10-001  
**Version:** 1.0  
**Date:** 2026-03-23  
**Status:** INTERNAL PILOT READY  

---

## Purpose

This document defines the bounded internal UAT scenario matrix for Phase 7.10 pilot readiness. Each scenario is verifiable against the current codebase and produces retained evidence.

**Scope:**
- Save-time governance flows
- Proof flows (REQUIRE_PLAN)
- Review flows (audit, runtime status, blueprints, false-positives)
- Degraded runtime flows (audit-read failure, staleness)
- False-positive review flows

**Not in scope:**
- Cloud-lane activation (disabled by default)
- Marketplace or public release validation
- ARC Console or Vault integration

---

## Scenario Matrix

### Category 1: Save-Time Governance Flows

| ID | Scenario | Expected Behavior | Verification Command | Evidence |
|----|----------|-------------------|---------------------|----------|
| S01 | ALLOW decision on low-risk file | Save proceeds without prompt; audit entry recorded | Save a `.md` file in non-auth path | `.arc/audit.jsonl` shows `ALLOW` |
| S02 | WARN decision on medium-risk file | Save proceeds after acknowledgment; audit entry recorded | Save `schema.sql` | `.arc/audit.jsonl` shows `WARN` |
| S03 | REQUIRE_PLAN decision on high-risk file | Save blocked until blueprint linked | Save `package.json` | Prompt for directive ID; audit shows `REQUIRE_PLAN` with `directive_id` |
| S04 | BLOCK decision on critical-risk file | Save blocked; no override available | Modify auth config file | Error modal shows `BLOCK`; no save occurs |
| S05 | Auto-save reduced-guarantee flow | Auto-save fails closed to `RULE_ONLY` | Enable VS Code auto-save; modify governed file | `.arc/audit.jsonl` shows `RULE_ONLY` lane |

### Category 2: Proof Flows (REQUIRE_PLAN)

| ID | Scenario | Expected Behavior | Verification Command | Evidence |
|----|----------|-------------------|---------------------|----------|
| P01 | Valid blueprint linkage | Save proceeds after blueprint validation | Link existing `.arc/blueprints/LINTEL-PH5-001.md` | Audit shows `directive_id` and `blueprint_id` |
| P02 | Missing blueprint artifact | Template created; user must complete sections | Enter new directive ID | `.arc/blueprints/<directive>.md` created with `[REQUIRED]` placeholders |
| P03 | Incomplete blueprint (placeholders) | Save blocked until placeholders replaced | Attempt save with template blueprint | Validation fails; reason states "incomplete artifact" |
| P04 | Invalid directive ID format | Save blocked; format guidance shown | Enter lowercase or malformed ID | InputBox shows validation error |
| P05 | Mismatched blueprint path | Save blocked; canonical path shown | Link non-canonical blueprint path | Resolution shows `MISMATCHED_BLUEPRINT_ID` |

### Category 3: Review Flows

| ID | Scenario | Expected Behavior | Verification Command | Evidence |
|----|----------|-------------------|---------------------|----------|
| R01 | Audit review with valid entries | Shows last 10 entries with decision counts | `ARC XT: Review Audit Log` | Markdown preview shows entries |
| R02 | Audit review with malformed lines | Skips malformed lines; shows warning | Corrupt an audit line manually | Warning shows malformed count |
| R03 | Runtime status display | Shows workspace targeting, route posture, last decision | `ARC XT: Show Active Workspace Status` | Markdown shows governed root, audit path |
| R04 | Staleness indicator (file mismatch) | Shows "different file" warning | View status from different file than last save | Status shows `⚠️ From a different file` |
| R05 | Staleness indicator (time threshold) | Shows "earlier session" warning | View status after 5+ minutes | Status shows `⚠️ From an earlier session` |
| R06 | Blueprint review | Shows validation status for each blueprint | `ARC XT: Review Blueprint Proofs` | Markdown shows blueprint list with status |
| R07 | False-positive review (no candidates) | Shows "no candidates" message | Run on fresh workspace | Message shows no candidates |
| R08 | False-positive review (with candidates) | Shows ranked candidates with quality labels | Run after WARN/REQUIRE_PLAN decisions | Candidates shown with ⚡/🔶/🔷 labels |

### Category 4: Degraded Runtime Flows

| ID | Scenario | Expected Behavior | Verification Command | Evidence |
|----|----------|-------------------|---------------------|----------|
| D01 | Audit file absent | Review shows "no audit log present" | Delete `.arc/audit.jsonl` | Review shows absence message |
| D02 | Audit-read failure (malformed JSON) | Degrades to "audit unavailable"; no raw error | Corrupt entire audit file | Review shows degradation notice |
| D03 | Route policy missing | Fails closed to `RULE_ONLY` | Delete `.arc/router.json` | Runtime status shows `RULE_ONLY` |
| D04 | Route policy invalid JSON | Fails closed to `RULE_ONLY` | Corrupt `router.json` | Runtime status shows `RULE_ONLY` |
| D05 | Blueprint directory absent | Review shows "no blueprint artifacts" | Delete `.arc/blueprints/` | Review shows absence message |

### Category 5: False-Positive Review Flows

| ID | Scenario | Expected Behavior | Verification Command | Evidence |
|----|----------|-------------------|---------------------|----------|
| F01 | High-quality candidate (rule-only, no rules) | Shows ⚡ High label | Trigger WARN with no matched rules | Candidate shows `⚡ High (rule-only, no matched rules)` |
| F02 | Medium-quality candidate (WARN, rule-only) | Shows 🔶 Medium label | Trigger WARN via rule match | Candidate shows `🔶 Medium (WARN decision, rule-only)` |
| F03 | Low-quality candidate (REQUIRE_PLAN) | Shows 🔷 Low label | Trigger REQUIRE_PLAN | Candidate shows `🔷 Low (REQUIRE_PLAN or model-evaluated)` |
| F04 | BLOCK decisions excluded | BLOCK not shown in candidates | Trigger BLOCK decision | BLOCK not in false-positive review |
| F05 | Advisory-only disclaimer present | Shows "advisory only" notice | Open false-positive review | Notice shows "advisory only" |

---

## Verification Protocol

### Prerequisites
1. Extension installed via VSIX
2. Workspace with `.arc/` directory initialized
3. Test files representing each risk category

### Execution Steps
1. Run each scenario in order
2. Record evidence (screenshots, audit entries, file states)
3. Mark scenario as PASS/FAIL in tracking sheet
4. Escalate any FAIL immediately

### Evidence Retention
- Screenshots saved to `artifacts/uat-screenshots/`
- Audit entries exported via `npm run audit:cli -- export --out artifacts/uat-audit-export.json`
- File states captured via `git diff` or file copies

---

## Pass Criteria

**Phase 7.10 passes UAT when:**
- All scenarios in Categories 1-5 execute successfully
- Evidence retained for each scenario
- No enforcement-floor weakening observed
- No authorization wording in operator surfaces
- Rollback drill successful (see `phase-7.10-rollback-drill.md`)

---

## Known Limitations

1. **Heuristic classification**: False positives may occur on edge-case paths
2. **File-level integrity only**: Audit verification does not detect wholesale deletion
3. **Local-only blueprints**: Team/shared blueprint handling not authorized
4. **Cloud disabled by default**: Cloud lane requires explicit route-policy enablement
5. **Advisory false-positive review**: Does not override recorded decisions

---

## Internal Pilot Status

**This UAT pack certifies INTERNAL PILOT READINESS only.**

It does **not** certify:
- Public release readiness
- Marketplace readiness
- Production deployment readiness
- Cloud-lane readiness

**Pilot deployment scope:**
- Internal lab use only
- Controlled workspace environments
- No external user exposure

---

**End of UAT Scenario Pack**
