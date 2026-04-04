# U36 — Privacy-Safe Retention Metrics Spec

**Status:** PLANNED  
**Priority:** P1  
**Category:** Metrics / Privacy  
**Date:** 2026-04-04  

---

## Objective
Define local-first, privacy-safe retention and engagement metrics (3-day retention, save-gate engagement, override/dispute rate, latency). Must be grounded in U31 telemetry contract and remain optional/opt-in.

## Privacy Constraints
1. **Local-Only Computation:** All metrics are computed locally. No raw data leaves the machine.
2. **No User/Content Tracking:** Metrics use anonymous session IDs, not user names or file paths.
3. **Opt-In Only:** Metrics are disabled unless telemetry is explicitly enabled.

## Defined Metrics
| Metric | Definition | Privacy Safety |
|--------|------------|----------------|
| **Save-Gate Engagement** | % of saves that trigger WARN/BLOCK vs ALLOW | None (aggregate only) |
| **Override/Dispute Rate** | % of WARN/BLOCK events that are overridden by user | None (aggregate only) |
| **Enforcement Latency** | Median/95th percentile ms for decision calculation | None (timing only) |
| **3-Day Retention** | % of operators who interact with ARC XT on 3 consecutive days | Session-based, anonymous |

## Implementation Note
This is a **specification document**. Implementation of metrics is out of scope for this docs slice and requires a separate Axis/Warden review to ensure compliance with U31 telemetry contract.

---

**End of U36 Record**
