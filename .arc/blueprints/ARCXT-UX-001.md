# ARC Blueprint: ARCXT-UX-001
**Directive ID:** ARCXT-UX-001

## Objective

Remediate ARC XT extension UX to use user-friendly language instead of internal governance jargon. Translate "Directive ID" to "Change ID", remove "REQUIRE_PLAN" and "Phase 5" terminology from user-visible messages, and create public documentation routes for ARC XT on the Star Wealth Dynamics website.

## Scope

Files modified in `projects/lintel`:
- `src/extension.ts` — Reworded `promptForDirectiveId()` prompt and title
- `src/core/blueprintArtifacts.ts` — Reworded user-visible error messages
- `src/ui/webview/GuidedProofWorkflow.ts` — Reworded step titles and content

Files created in `projects/swd-landing`:
- `app/arc-xt/page.js` — ARC XT landing page
- `app/arc-xt/getting-started/page.js` — Setup guide
- `app/arc-xt/why-save-paused/page.js` — Save pause explanation
- `app/arc-xt/how-to-create-plan/page.js` — Blueprint guide
- `app/arc-xt/faq/page.js` — FAQ (15 questions)

Files modified in `projects/swd-landing`:
- `components/SiteHeader.jsx` — Added "ARC XT" nav entry

## Constraints

- **Enforcement integrity:** No changes to validation logic, regex patterns, or blocking conditions
- **WRD-0102:** Instructional wording carried forward to all modified surfaces (Warden-reviewed)
- **WRD-0127:** FAQ enforcement accuracy — resolved with accurate hard-block description
- **Public exposure:** Slice B requires Warden clearance before merge (obtained)
- **Residual item:** `extension.ts:158-159` still contains `REQUIRE_PLAN` term — follow-up pass required

## Acceptance Criteria

1. ✅ `npm run typecheck` passes in `projects/lintel`
2. ✅ `npm run build` passes in `projects/lintel`
3. ✅ `npm run lint` passes in `projects/swd-landing`
4. ✅ `npm run build` passes in `projects/swd-landing`
5. ✅ WRD-0102 resolved (instructional wording reviewed)
6. ✅ WRD-0127 resolved (FAQ accuracy corrected)
7. ✅ Warden clearance obtained for both slices

## Rollback Note

**Slice A (lintel) rollback:**
```bash
cd /home/habib/workspace/projects/lintel
git checkout HEAD -- src/extension.ts src/core/blueprintArtifacts.ts src/ui/webview/GuidedProofWorkflow.ts
npm run build
```

**Slice B (swd-landing) rollback:**
```bash
cd /home/habib/workspace/projects/swd-landing
git checkout HEAD -- components/SiteHeader.jsx
rm -rf app/arc-xt/
npm run build
```

## Warden Findings

| Finding | Severity | Status |
|---------|----------|--------|
| WRD-0102 | LOW | RESOLVED — instructional wording carried forward |
| WRD-0127 | MEDIUM | RESOLVED — FAQ enforcement accuracy corrected |
| Residual REQUIRE_PLAN (ext:158) | LOW | Noted — follow-up pass required |

## Execution Evidence

**Slice A — Extension UX:**
- User-facing copy translated from internal jargon to user-friendly language
- Enforcement logic unchanged (verified by Warden)
- WRD-0102 annotation present in all three modified files

**Slice B — Public Docs:**
- 5 new static routes created
- SiteHeader nav updated
- FAQ accuracy corrected per Warden requirement
- No auth/payment/AI surfaces introduced

**Verification:**
```
lintel: npm run typecheck ✅
lintel: npm run build ✅
swd-landing: npm run lint ✅
swd-landing: npm run build ✅
```
