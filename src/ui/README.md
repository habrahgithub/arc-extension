# ARC UI Layer

**Purpose:** Bounded internal review surface implementation for ARC XT — Audit Ready Core.

**Layer Boundary:** The UI layer (`src/ui/`) is a **read-only presentation layer** that depends on the Extension layer (`src/extension/`) and has **NO write access** to enforcement, proof, or audit state.

---

## Dependency Direction (OBS-S-7036)

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension API                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  extension.ts (activation, command registration, events)    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Extension Services (reviewSurfaces, runtimeStatus, etc.)   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│         UI Layer (src/ui/) — READ-ONLY PRESENTATION         │
│  - WebviewPanel creation and rendering                       │
│  - CSP enforcement                                           │
│  - Message validation (extension → webview only)            │
│  - NO write access to audit/proof/enforcement state         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│         Core Layer (src/core/) — Read-Only Access           │
│  - Classification                                            │
│  - Audit reading                                             │
│  - Performance reading                                       │
└─────────────────────────────────────────────────────────────┘
```

**Key Constraints:**

1. **UI → Extension:** UI layer calls extension services for data; extension creates UI panels
2. **UI → Core:** UI layer has NO direct access to core; all data flows through extension services
3. **No Write Access:** UI layer cannot modify:
   - Audit entries (`.arc/audit.jsonl`)
   - Blueprint artifacts (`.arc/blueprints/`)
   - Route policy (`.arc/router.json`)
   - Any enforcement state

---

## Security Boundaries (WRD-0092)

### Content Security Policy (CSP)

All WebviewPanels use restrictive CSP:
- No inline scripts (`'unsafe-inline'` NOT allowed)
- No external resources (only `vscode-resource:` or `vscode-webview:`)
- No `eval()` or `Function()` constructor
- Style only from allowed sources

### Message Validation

- Extension → Webview: Data sanitized before sending
- Webview → Extension: **NO messages that trigger enforcement actions**
- Message schema validated on both sides

### XSS Prevention

- All user-controlled data (file paths, audit entries, rule names) HTML-escaped
- No `innerHTML` with unsanitized data
- Use `textContent` for dynamic content

---

## UI Components

| Component | Purpose | Authority Level |
|-----------|---------|-----------------|
| ReviewHome | Navigation hub to existing review functions | Read-only navigation |
| RuntimeStatus | Display active workspace and decision context | Descriptive-only display |
| AuditReview | Show recent audit entries | Read-only inspection |
| BlueprintProofReview | Display proof lifecycle state | Instructional guidance |
| FalsePositiveReview | Show advisory false-positive candidates | Advisory-only display |
| GuidedProofWorkflow | Step-by-step REQUIRE_PLAN guidance | Instructional only |

**Excluded (WRD-0095):**
- Screen 7 (Command Centre / Runtime Exploration) — Parked future concept

---

## Wording Guidelines (WRD-0096)

**Identity:**
- Use: "ARC XT — Audit Ready Core"
- Use: "local-only", "descriptive-only", "non-authorizing"
- Do NOT use: "cloud-ready", "production-ready", "marketplace-ready"

**Capability:**
- Use: "governed code enforcement", "local-first"
- Do NOT use: "security certification", "compliance tool", "control-plane"

**Decision Display:**
- Use: "audit entry recorded", "decision was ALLOW/WARN/REQUIRE_PLAN/BLOCK"
- Do NOT use: "approved", "certified", "cleared"

**Proof Guidance:**
- Use: "you need to...", "complete the blueprint", "re-save the file"
- Do NOT use: "click to approve", "authorize save", "bypass enforcement"

---

## File Structure

```
src/ui/
├── README.md                    # This file — layer boundary documentation
├── webview/
│   ├── ReviewHome.ts            # Screen 1: Navigation hub
│   ├── RuntimeStatus.ts         # Screen 2: Decision context display
│   ├── AuditReview.ts           # Screen 3: Entry inspection
│   ├── BlueprintProofReview.ts  # Screen 4: Proof lifecycle
│   ├── FalsePositiveReview.ts   # Screen 5: Advisory candidates
│   └── GuidedProofWorkflow.ts   # Screen 6: Instructional guidance
├── csp.ts                       # Content Security Policy definitions
└── sanitize.ts                  # HTML sanitization utilities
```

---

## Testing Requirements

All UI components must have:
1. **Governance tests** verifying wording boundaries (WRD-0096)
2. **Security tests** verifying CSP and sanitization (WRD-0092)
3. **Boundary tests** verifying no write access to enforcement state (OBS-S-7036)

---

**End of UI Layer Documentation**
