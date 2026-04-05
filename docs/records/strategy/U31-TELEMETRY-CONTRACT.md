# U31 — Telemetry Contract (Privacy-First)

**Status:** DONE  
**Priority:** P1  
**Category:** Telemetry / Privacy  
**Date:** 2026-04-04  

---

## Objective
Publish a privacy-first telemetry contract and bounded event schema. Telemetry must remain **local-first, opt-in, and capture NO code, prompts, or content**.

## Privacy Rules (Non-Negotiable)
1. **No Code Capture:** Telemetry must never include source code, diffs, prompts, or file content.
2. **No Prompt/Chat Data:** No LLM interaction logs, chat history, or model outputs.
3. **Opt-In Only:** Telemetry is disabled by default. User must explicitly enable it.
4. **Local-First Storage:** Telemetry data is stored locally. Aggregation/upload (if any) requires explicit user consent.

## Bounded Event Schema
The following metadata-only events may be captured if telemetry is enabled:

| Event | Metadata | Privacy Risk |
|-------|----------|--------------|
| `save_decision` | decision type (ALLOW/WARN/BLOCK), risk level, file extension | None |
| `override_used` | decision type, risk level, time-to-override | None |
| `enforcement_latency` | ms duration (no content) | None |
| `first_run_completed` | boolean flag | None |
| `blueprint_created` | boolean flag | None |

## Explicitly Excluded
- File names or paths
- Code snippets or AST data
- Model provider names or versions
- User identity or email
- Organization or team identifiers

## Implementation Note
This contract is a **specification document**. Implementation of telemetry is out of scope for this docs slice and requires a separate Axis/Warden review.

---

**End of U31 Record**
