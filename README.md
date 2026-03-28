# ARC — Audit Ready Core

**Governed code enforcement for AI-assisted development in a local-first VS Code extension.**

ARC helps development teams maintain code quality and governance standards by intercepting saves and requiring explicit justification for high-risk changes. It is built for teams that need audit trails, proof-backed decisions, and fail-closed enforcement inside VS Code.

## Beta Status

**Status:** Public beta candidate  
**Channels:** Visual Studio Marketplace + Open VSX  
**Feedback:** GitHub Issues / invited tester feedback

Current product posture:

- local-first by default
- cloud lanes disabled by default
- suitable for developer testing and workflow feedback
- still evolving in wording, heuristics, and operator polish

## Quick Start

### Install

#### From Marketplace

1. Open the Extensions view in VS Code
2. Search for **ARC — Audit Ready Core**
3. Install the extension
4. Reload VS Code when prompted

#### From VSIX

1. Download the latest `.vsix` from the releases page
2. In VS Code: Extensions → `...` → **Install from VSIX...**
3. Select the downloaded `.vsix` file
4. Reload VS Code when prompted

### Verify Installation

1. Open any code file in your workspace
2. Make a change to a governed file such as `auth.ts`, `schema.sql`, or `package.json`
3. Attempt to save — ARC will prompt for acknowledgment or proof when required
4. Use `Ctrl+Shift+P` → **ARC: Review Audit Log** to inspect recent decisions

## What ARC Does

| Decision | When | Action Required |
| --- | --- | --- |
| **ALLOW** | Low-risk changes such as UI components or tests | None — save proceeds |
| **WARN** | Medium-risk changes such as config or schema edits | Acknowledge risk before save |
| **REQUIRE_PLAN** | High-risk changes such as auth or core logic | Link to governance blueprint proof |
| **BLOCK** | Critical-risk violations | Save blocked — address the risk first |

## Key Features

- **Local-first** — enforcement happens locally; no cloud dependency is required
- **Audit trail** — append-only record of save decisions with hash-chain integrity
- **Blueprint proofs** — high-risk changes can be linked to governance directives
- **Review surfaces** — built-in UI for audit inspection, proof review, and decision context
- **Fail-closed** — missing configuration defaults to the strictest safe posture

## Requirements

- VS Code `1.90.0` or later
- Node.js `20+` only if you want to build from source
- No external services required
- Optional: Ollama for local AI evaluation experiments

## Configuration

ARC works out of the box with sensible defaults. Optional configuration lives in `.arc/router.json`:

```json
{
  "mode": "RULE_ONLY",
  "localLaneEnabled": false,
  "cloudLaneEnabled": false
}
```

| Setting | Default | Description |
| --- | --- | --- |
| `mode` | `RULE_ONLY` | Enforcement mode (`RULE_ONLY`, `LOCAL_PREFERRED`, `CLOUD_ASSISTED`) |
| `localLaneEnabled` | `false` | Enable local AI model evaluation |
| `cloudLaneEnabled` | `false` | Enable cloud fallback only after explicit approval |

## Commands

| Command | Description |
| --- | --- |
| `ARC: Review Home` | Open the main ARC review surface |
| `ARC: Decision Feed` | View recent enforcement decisions |
| `ARC: Audit Timeline` | Inspect chronological audit entries |
| `ARC: Why Panel` | Explain the current or recent decision |
| `ARC: Review Audit Log` | Inspect recent save decisions |
| `ARC: Show Active Workspace Status` | View current workspace targeting and route posture |
| `ARC: Review Blueprint Proofs` | Review linked governance blueprints |
| `ARC: Review False-Positive Candidates` | Advisory review of potential false positives |
| `ARC: Show Welcome Guide` | Display onboarding information |

## Limitations

- **Heuristic classification** — risk assessment is rule-based, not full semantic understanding
- **File-level audit integrity** — hash chains verify individual files, not archive completeness
- **Local-only blueprints** — shared/team blueprint deployment is not yet supported
- **Cloud disabled by default** — cloud fallback requires explicit configuration and approval
- **Observational diagnostics only** — status surfaces describe posture; they do not authorize changes

## FAQ

### What programming languages does ARC support?

ARC is language-agnostic at the VS Code save layer. Today its built-in rules are strongest for common config, auth, and schema files such as `package.json`, `.env`, `schema.sql`, `*.sql`, and `*.prisma`.

### How does ARC detect high-risk changes?

ARC currently uses heuristic rules based on file paths, filenames, and extensions. For example, auth/session paths and core config files can trigger higher-risk handling, while schema files often trigger review-aware warnings.

### Can I disable cloud options?

Yes. Cloud is disabled by default. If you do not want cloud fallback, keep `cloudLaneEnabled: false` in `.arc/router.json`. `RULE_ONLY` mode also works without cloud services.

### How will ARC affect my workflow?

Most low-risk saves continue normally. Medium-risk saves may ask for acknowledgment, and higher-risk saves may require a linked plan or proof before the save proceeds. The goal is to add friction only where risk is higher.

### How does ARC help with code security?

ARC improves security posture through local-first enforcement, fail-closed defaults, visible save-time decisions, append-only audit logging, and proof-backed handling for higher-risk changes. It is a governance and review layer, not a full semantic security scanner.

## Support

- **Issues:** https://github.com/habrahgithub/arc-extension/issues
- **Repository:** https://github.com/habrahgithub/arc-extension
- **License:** Apache-2.0

## Learn More

For deeper technical and governance details, see:

- `docs/ARCHITECTURE.md`
- `docs/CODE_MAP.md`
- `docs/TESTING.md`
- `docs/BETA-RELEASE-CHECKLIST.md`

For retained validation and evidence artifacts, see:

- `artifacts/ARC-UX-VALIDATION-001-LOG.md`
- `artifacts/evidence/ARC-UX-VALIDATION-001/`
