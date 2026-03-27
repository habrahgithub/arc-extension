# ARC-UI-001a Component-Adoption Summary

**Directive ID:** ARC-UI-001a  
**Date:** 2026-03-23  
**Purpose:** Document what template primitives were reused vs excluded (OBS-S-7038)  

---

## Template Reference

The extracted runtime UI template was used as a **design reference only**, not as direct import authority (per ARC-UI-001 §4.3).

---

## Adopted Primitives (Safe)

### From Template → ARC-UI-001a

| Component | Source | Adaptation | Justification |
|-----------|--------|------------|---------------|
| Header pattern | Template | Simplified | Product identity display only |
| Card layout | Template | Simplified | Navigation cards for review functions |
| Badge pattern | Template | Simplified | Posture indicators (local-only, etc.) |
| CSP pattern | Template | Enhanced | Restrictive CSP (no inline scripts) |
| Sanitization | Template | Enhanced | Full HTML escaping for all user data |

### What Was Kept Minimal

- **No component library imports** — all components implemented inline
- **No CSS framework** — minimal inline styles only
- **No build pipeline changes** — TypeScript-only, no React/Vue/Svelte

---

## Excluded Template Elements

### Runtime/Cloud Assumptions (Excluded)

| Excluded | Reason |
|----------|--------|
| Cloud/hybrid runtime controls | Not implemented in ARC |
| Agent orchestration UI | Out of scope |
| Command centre patterns | Screen 7 parked (WRD-0095) |
| Execution stream display | No execution authority |
| Vault write integration | Not implemented |
| ARC Console coupling | Not implemented |

### Simulated Logic (Excluded)

| Excluded | Reason |
|----------|--------|
| Mock runtime data | Use real extension data only |
| Placeholder governance flows | Use actual enforcement logic |
| Simulated approval paths | No UI approval authority |

---

## Original Implementation

### Created for ARC-UI-001a

| File | Purpose | Original/Adapted |
|------|---------|------------------|
| `src/ui/README.md` | Layer boundary doc | Original |
| `src/ui/csp.ts` | CSP definitions | Adapted (enhanced) |
| `src/ui/sanitize.ts` | Sanitization utils | Adapted (enhanced) |
| `src/ui/index.ts` | Module registration | Original |
| `src/ui/webview/ReviewHome.ts` | Screen 1 panel | Original |

### Why Original Implementation

- Template assumed different architecture (React-based)
- ARC uses vanilla TypeScript + VS Code Webview API
- Security requirements (CSP, sanitization) required custom implementation
- Bounded scope (1 screen) didn't justify full template adoption

---

## Component Count

| Category | Count |
|----------|-------|
| Adopted from template | 5 (patterns only, not code) |
| Excluded from template | 10+ (runtime/cloud assumptions) |
| Original implementation | 5 files |

---

## Security Comparison

| Aspect | Template | ARC-UI-001a |
|--------|----------|-------------|
| CSP | Optional | **Mandatory, restrictive** |
| Sanitization | Partial | **Full HTML escaping** |
| Message validation | Assumed | **Whitelist-based** |
| Execution authority | Some patterns | **None** |

---

## Justification Summary

**Why minimal adoption:**
1. Template architecture mismatch (React vs vanilla TS)
2. Security requirements exceeded template defaults
3. Bounded scope (1 screen) didn't justify full import
4. Governance constraints (no execution authority) required custom patterns

**Why patterns were useful:**
1. Card layout → navigation hub design
2. Badge pattern → posture indicators
3. CSP pattern → enhanced for ARC security needs

---

**End of Component-Adoption Summary**
