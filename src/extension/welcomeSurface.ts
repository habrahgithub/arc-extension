import * as vscode from 'vscode';

/**
 * Welcome Surface — Bounded Operator Onboarding
 *
 * This surface provides first-use guidance for the ARC extension.
 * It is descriptive only and does not authorize, widen, or bypass enforcement.
 *
 * Governance Anchors:
 * - OBS-S-7009: Onboarding mechanism remains bounded (local-only, no remote resources)
 * - OBS-S-7010: Command identity preserved (lintel.* prefix, ARC-aligned titles)
 * - WRD-0068: Wording truthfulness (no implication of readiness beyond actual state)
 */

/**
 * The welcome content as a pure string.
 * Exported for testing without VS Code dependency.
 */
export const WELCOME_CONTENT = `# ARC XT — Audit Ready Core

## Welcome to ARC XT

This extension provides **governed code enforcement** for AI-assisted development in VS Code.

---

## Core Identity

**ARC XT** is the local-first IDE governance extension within the ARC platform. It enforces safe, auditable AI-assisted development by intercepting risky changes at save-time.

**Extension Identity:** ARC XT — Audit Ready Core

**Important Distinction:** This extension is the IDE enforcement layer only. It is not the ARC Console, Vault, or broader control-plane system.

---

## What This Extension Does

### Save-Time Enforcement

When you save a file, ARC XT:
1. **Classifies risk** based on file paths and patterns (auth, schema, config, infra)
2. **Evaluates rules** to determine the appropriate decision
3. **Enforces the decision** before the save completes
4. **Logs the action** to an append-only audit trail

### Decision Types

| Decision | Behavior |
|----------|----------|
| **ALLOW** | Save proceeds silently (low-risk files) |
| **WARN** | Warning shown; save proceeds after acknowledgment |
| **REQUIRE_PLAN** | Modal requires directive proof before save |
| **BLOCK** | Save is blocked; change must be split or reviewed |

### Fail-Closed Posture

When the local model (Ollama) is unavailable or returns malformed output, ARC XT **fails closed** to the established rule-based enforcement floor. Model failure never weakens the baseline protection.

---

## What This Extension Does NOT Do

- ❌ Does **not** call external AI APIs (local-only by default)
- ❌ Does **not** imply cloud readiness or remote execution capability
- ❌ Does **not** provide marketplace or team collaboration features
- ❌ Does **not** replace the need for code review or testing
- ❌ Does **not** authorize changes on your behalf
- ❌ Does **not** connect to ARC Console or Vault (no control-plane coupling)

---

## First Steps

### 1. Understand Your Workspace

ARC XT targets a governed root for enforcement. By default:
- If opened in a workspace folder: uses the workspace root
- Otherwise: uses a fallback storage location

View active workspace: **ARC XT: Show Active Workspace Status**

### 2. Review Runtime Status

See current enforcement posture, auto-save mode, and route policy:

**Command:** \`ARC XT: Show Active Workspace Status\`

### 3. Review Audit Log

See all enforcement decisions and risk flags:

**Command:** \`ARC XT: Review Audit Log\`

### 4. Review Blueprints

See linked blueprint proofs for REQUIRE_PLAN saves:

**Command:** \`ARC XT: Review Blueprint Proofs\`

---

## Configuration

ARC XT uses local-only configuration for runtime parameters. No cloud defaults or remote secrets are required.

### Environment Variables (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| \`OLLAMA_HOST\` | \`127.0.0.1:11434\` | Local Ollama endpoint |
| \`SWD_SUBAGENT_MODEL\` | \`llama3.2:3b\` | Local model for AI-assisted decisions |
| \`OLLAMA_TIMEOUT_MS\` | \`2000\` | Timeout for model requests (2 seconds) |
| \`OLLAMA_RETRIES\` | \`1\` | Number of retry attempts |

---

## Governance Boundaries

### Local-First Operation

- All enforcement happens locally
- No source code leaves your machine
- Audit log stored locally in \`.arc/audit.jsonl\`

### Fail-Closed Behavior

- Model unavailability → rule-based enforcement floor
- Parse failures → explicit fallback cause logged
- No silent weakening of protection

### Proof-Required Saves

For high-risk files (auth, config), you must:
1. Link a directive ID (e.g., \`LINTEL-PH5-001\`)
2. Acknowledge the risk before save proceeds

This ensures explicit intent for sensitive changes.

---

## Commands

| Command | Description |
|---------|-------------|
| \`ARC XT: Review Audit Log\` | View append-only audit trail |
| \`ARC XT: Show Active Workspace Status\` | See current enforcement posture |
| \`ARC XT: Review Blueprint Proofs\` | Review linked blueprint artifacts |
| \`ARC XT: Review False-Positive Candidates\` | Review potential false positives |
| \`ARC XT: Show Welcome Guide\` | Show this welcome guide |

---

## Support & Documentation

- **Architecture:** See \`docs/ARCHITECTURE.md\`
- **Testing:** See \`docs/TESTING.md\`
- **Risk Register:** See \`docs/RISK_REGISTER.md\`
- **Release Checklist:** See \`docs/RELEASE_CHECKLIST.md\`

---

## Privacy & Security

- **No external data transmission** — all processing is local
- **No credential storage** — secrets remain in your workspace
- **No remote dependencies** — operates offline
- **Audit trail** — all decisions logged to \`.arc/audit.jsonl\`

---

## Version

**Extension Version:** 0.1.0  
**Governance Framework:** ARC-GOV-RULE-002  
**Phase:** 7.5 — Welcome Surface and Operator Onboarding

---

*This onboarding surface is descriptive only. It does not authorize, widen, or bypass save-time enforcement. For actual enforcement behavior, see runtime status and audit log.*
`;

/**
 * Render the welcome content as markdown for preview.
 * This function is exported for testing.
 */
export function renderWelcomeMarkdown(): string {
  return WELCOME_CONTENT;
}

/**
 * Welcome Surface Service for VS Code extension.
 * Provides bounded onboarding without altering enforcement.
 */
export class WelcomeSurfaceService {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Show the welcome surface to the user.
   * Opens a markdown preview with bounded onboarding content.
   */
  async showWelcome(): Promise<void> {
    const document = await vscode.workspace.openTextDocument({
      content: WELCOME_CONTENT,
      language: 'markdown',
    });

    await vscode.window.showTextDocument(document, {
      preview: true,
      viewColumn: vscode.ViewColumn.One,
    });
  }

  /**
   * Check if this is the first activation (user hasn't dismissed welcome before).
   * Returns true if welcome should be shown.
   */
  shouldShowWelcome(): boolean {
    const hasSeenWelcome = this.context.globalState.get<boolean>(
      'lintel.welcomeShown',
      false,
    );
    return !hasSeenWelcome;
  }

  /**
   * Mark welcome as shown (user has seen it).
   */
  async markWelcomeShown(): Promise<void> {
    await this.context.globalState.update('lintel.welcomeShown', true);
  }
}
