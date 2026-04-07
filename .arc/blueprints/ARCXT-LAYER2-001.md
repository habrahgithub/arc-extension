# ARC XT Blueprint: ARCXT-LAYER2-001

**Directive ID:** ARCXT-LAYER2-001

> Status: CRITICAL — Governance Integrity Incident
> Per ARC-GOV-ARCH-001 (Axis/Warden architecture ruling): move enforcement from IDE advisory to Git hard gate.

## Issue

ARC XT currently operates as a presence model — it signals risk but cannot truly block unauthorized progression. The save boundary is limited by VS Code API (cannot block file writes). The commit interceptor is post-commit observation only (reacts after commit lands). This means the product overclaims its enforcement authority.

## Root Cause

ARC's enforcement boundary is at the wrong layer:
- **IDE layer (Layer 1)** = signal only (UI, modals, status bar)
- **Git layer (Layer 2)** = first real gate (pre-commit hook)
- **CI layer (Layer 3)** = final authority (planned future)

The product currently only has Layer 1 + post-commit observation. No Layer 2 implementation exists.

## Required Correction

Implement Layer 2: `arc-pre-commit` hook that:
1. Reads `.arc/audit.jsonl` for unauthorized saves since last commit
2. Checks if any staged files have unresolved REQUIRE_PLAN decisions
3. Blocks commit with clear error message if authorization is missing
4. Exits with code 1 to abort commit
5. Self-installs into `.git/hooks/pre-commit` on extension activation

## Scope

### Files Created
- `src/core/preCommitHook.ts` — Hook generation and installation logic
- `hooks/pre-commit.sh` — The actual shell script (embedded resource)
- `.arc/auth-state.json` — Per-workspace authorization state (created on first governed save)

### Files Modified
- `src/extension.ts` — Install hook on activation, check auth state on save
- `src/extension/saveOrchestrator.ts` — Write to `.arc/auth-state.json` on REQUIRE_PLAN

### What Does NOT Change
- Rule engine, audit chain, blueprint proof logic
- IDE-layer UI (modals, status bar, panel)
- Post-commit observation (CommitInterceptor)
- Fail-closed posture

## Acceptance Criteria

### Hook Installation
- [x] On extension activation in a git workspace, `.git/hooks/pre-commit` is created
- [x] Hook is executable (chmod +x)
- [x] Hook is self-contained (no node.js dependency)

### Commit Blocking
- [x] Commit with no unauthorized saves → passes through
- [x] Commit with unresolved REQUIRE_PLAN saves → blocked with clear message
- [x] Commit after blueprint linkage → passes through
- [x] Hook exit code 1 aborts commit, exit code 0 allows commit

### Auth State
- [x] `.arc/auth-state.json` created on first REQUIRE_PLAN save
- [x] Updated when blueprint is linked (authorized: true)
- [x] Hook reads this file to determine commit eligibility

### Honesty
- [x] Blueprint does not overclaim — documents VS Code save blocking limitation
- [x] Hook is the first real enforcement boundary
- [x] CI layer remains future work (not claimed as current capability)

## Rollback Note

If hook blocks legitimate commits:
1. Delete `.git/hooks/pre-commit` to disable
2. Run `ARC XT: Install Pre-commit Hook` command to reinstall
3. Hook logs all decisions to `.arc/audit.jsonl` for post-incident review
