# LINTEL Blueprint: ARC-UI-001a
**Directive ID:** ARC-UI-001a

## Objective
Introduce the bounded UI foundation for ARC review surfaces and implement Screen 1 (Review Home) as a read-only navigation hub for existing review functions without changing enforcement behavior, save authority, or audit state.

## Scope
This directive covers the UI foundation under `src/ui/`, Review Home screen implementation, bounded UI registration in `src/extension.ts`, component-adoption documentation, and governance tests for wording, security posture, dependency direction, and non-authorizing behavior.

## Constraints
The UI must remain local-only, descriptive, and read-only. It must not approve saves, modify audit records, alter blueprint proof state, bypass enforcement, or introduce Screen 7 command-centre concepts. If a webview is used, CSP, sanitization, and message validation must remain strict and no external resources may be loaded.

## Acceptance Criteria
The Review Home screen renders successfully in the extension, uses bounded ARC identity wording, exposes navigation only to existing review surfaces, documents adopted vs excluded template components, preserves the UI-to-extension dependency boundary, and is covered by governance tests for security and non-authorizing behavior.

## Rollback Note
If the UI foundation or Review Home surface causes instability, remove the UI registration from `src/extension.ts`, remove the `src/ui/` foundation files introduced for ARC-UI-001a, and return the extension to the prior markdown-only review-surface flow.
