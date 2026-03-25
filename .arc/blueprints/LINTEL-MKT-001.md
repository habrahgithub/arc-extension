# LINTEL Blueprint: LINTEL-MKT-001
**Directive ID:** LINTEL-MKT-001

## Objective
Prepare LINTEL for truthful external marketplace presentation by improving public-facing metadata, README top-layer clarity, install guidance, and listing-support assets without changing enforcement behavior, runtime posture, or authority boundaries.

## Scope
This directive covers the marketplace-readiness package surface only: `README.md` top-layer rewrite, marketplace-facing `package.json` metadata refinement, truthful screenshot or listing-support asset preparation, bounded public/support documentation updates, and governance tests/evidence for disclosure truthfulness.

## Constraints
This work must remain presentation-only. It must not introduce runtime activation, cloud expansion, feature changes, command behavior changes, or ARC Console/Vault coupling. Public-facing text must stay truthful to the current product: local-first, rule-first, audit-backed, with optional local Ollama adapter disabled by default unless an approved route selects it, and cloud fallback optional/lab-only/disabled by default. Package closure is blocked until Prime resolves the licensing posture for marketplace use.

## Acceptance Criteria
The README top section becomes externally understandable while preserving deep technical sections below, marketplace-facing metadata is reviewed and truthful, any screenshot depicts real current UI, support/install guidance is clear, no public-facing wording overclaims capability or certification, governance tests cover disclosure truthfulness, and lint, typecheck, build, test, and pack all pass.

## Rollback Note
If the marketplace-readiness edits create misleading public posture or operational confusion, revert the README, metadata, screenshot/listing-support changes, and related governance tests to the prior internal-release baseline, and do not claim marketplace readiness until a corrected bounded revision is approved.
