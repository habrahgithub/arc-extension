# ARC XT — v0.1.13 Release Notes

> **ARC XT: Clean Baseline Release**
>
> A governance layer for AI-assisted coding in VS Code.

---

## What's New

### 🛡️ Identity & Brand Consistency

This is the first release where **ARC XT** is the only visible identity. All legacy "Lintel" references have been removed from user-facing surfaces:

- Repository metadata, homepage, and support links now point to the correct [arc-extension](https://github.com/habrahgithub/arc-extension) repository
- All user-facing strings use `ARC-XXX` directive format (replacing legacy `LINTEL-PH*-***` placeholders)
- Blueprint artifact templates now render as `# ARC XT Blueprint:` headers
- Welcome surface and onboarding use `arc.*` namespace

### 📦 Packaging Discipline

The VSIX now ships **only runtime assets** — no internal docs, no design templates, no test artifacts, no TypeScript source:

- Excluded `docs/` (internal governance records)
- Excluded `Public/UI Template/` (design references, not product assets)
- Excluded `test-evidence/` and `tests/`
- Excluded TypeScript source from dependencies (`node_modules/**/*.ts`)
- Whitelisted: `dist/`, `Public/Logo/`, `rules/`, and runtime-only `node_modules`

### 🎛️ Liquid Shell (Preview)

A new governance shell interface is included as a preview feature:

- **Runtime View** — Posture-led: system safety status first, then route details, then metrics
- **Review View** — Judgment-led: structured deviation rows with severity bars, location, and confidence indicators; expandable code context
- **Architect View** — Topology-led: policy mode, route map, directive state, and system parameters — not a dashboard
- **EXECUTE_RUN Control** — Ceremonial: state-aware button (dormant → ready → executing → warning) instead of a static CTA

Access via command palette: `ARC XT: Liquid Shell`

### ⚙️ Configuration

Two minimal configuration files are now available for operators who want to enable the proof chain:

- **Route Policy** (`.arc/router.json`) — `RULE_ONLY` mode, fail-closed defaults
- **Workspace Mapping** (`.arc/workspace-map.json`) — `LOCAL_ONLY` mode, no rules

Created via: `ARC XT: Create Minimal Route Policy` and `ARC XT: Create Minimal Workspace Mapping`

### 🔧 Compatibility

- Legacy `lintel.*` command bridge **retained** for backward compatibility with existing keybindings and macros (deprecated, will be removed in a future release)
- `welcomeShown` state migrated from `lintel.welcomeShown` → `arc.welcomeShown` with automatic migration from the legacy key

### 🐛 Fixes

- `tsconfig.json`: `moduleResolution` updated to explicit `"node10"` (forward-compatibility with TypeScript 7.0)
- CSP nonce policy: all webview event handlers use `addEventListener` instead of inline `onclick`
- Markdown preview commands now render as previews, not raw source

---

## Known Limitations

- **Model-based analysis** is disabled by default. The extension runs in `RULE_ONLY` mode with local heuristic evaluation only.
- **Liquid Shell** is a preview feature and does not yet replace the default task board webview.
- **No telemetry or feedback loop** — we have no visibility into how users interact with the extension. This is intentional and will be addressed with opt-in, privacy-safe metrics in a future release.

---

## Installation

```bash
# Download the VSIX from Releases
code --install-extension arc-audit-ready-core-0.1.13.vsix
```

Or build from source:

```bash
git clone https://github.com/habrahgithub/arc-extension.git
cd arc-extension
npm install
npm run build
npm run pack
```

---

## Commands

| Command | Description |
|---------|-------------|
| `ARC XT: Show Welcome Guide` | First-use onboarding |
| `ARC XT: Task Board` | Milestone pipeline view |
| `ARC XT: Liquid Shell` | Governance shell (preview) |
| `ARC XT: Review Audit Log` | Audit evidence review |
| `ARC XT: Review Blueprint Proofs` | Blueprint compliance review |
| `ARC XT: Runtime Status` | Active workspace status |
| `ARC XT: Create Minimal Route Policy` | Generate `.arc/router.json` |
| `ARC XT: Create Minimal Workspace Mapping` | Generate `.arc/workspace-map.json` |

---

## CHANGELOG

### v0.1.13 — Clean Baseline Release
- Full ARC XT identity (no LINTEL residue in user-facing surfaces)
- Liquid Shell preview (Runtime, Review, Architect, Tasks views)
- Packaging hygiene: runtime-only VSIX, no internal leakage
- Route policy and workspace mapping config creation commands
- Welcome state migration: `lintel.*` → `arc.*`
- Deprecated `lintel.*` command bridge (retained for compat)
- TypeScript config: `moduleResolution: "node10"`
- CSP nonce compliance for webview event handlers
- Markdown preview rendering fix

### v0.1.12
- Task Board activity bar webview
- Decision visibility layer (Decision Feed, Audit Timeline, Why Panel)
- Multi-panel review/status surfaces (Screens 1–6)

### v0.1.11
- Phase 7 completion: precision hardening, false positive scoring
- Runtime assurance milestones
