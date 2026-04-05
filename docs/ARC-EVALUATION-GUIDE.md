# ARC XT — Operator Evaluation Guide (≤10 Minutes)

> This guide uses production enforcement — no evaluation mode or special code path.

---

## Prerequisites

- VS Code 1.90.0 or later
- ARC XT VSIX installed (`arc-audit-ready-core-0.1.11.vsix`)
- A test workspace (do not use a production repository)

**Estimated time:** 10 minutes

---

## Step 1: Install and Verify (1 min)

1. Install the VSIX: `code --install-extension arc-audit-ready-core-0.1.11.vsix --force`
2. Reload VS Code
3. Open Command Palette (`Ctrl+Shift+P`) and type `ARC XT`
4. You should see commands like:
   - `ARC XT: Review Audit Log`
   - `ARC XT: Show Active Workspace Status`

✅ **You just saw:** ARC XT is loaded and its commands are available.

---

## Step 2: First-Run Bootstrap (2 min)

1. Open a test workspace (a folder with a `.git` directory)
2. Create a simple TypeScript file: `src/test.ts` with content `export const test = true;`
3. Save the file (`Ctrl+S`) — you should see **no prompt** (this is a low-risk file)
4. Now create a governed file: `src/auth/login.ts` with content `export const login = () => {};`
5. Save the file — you should see a **WARN prompt** asking you to acknowledge the risk

**What you just saw:** ARC XT classifies files by path and type. `src/auth/` matches the `AUTH_CHANGE` risk rule, so it requires acknowledgment before saving. This is a **WARN** decision — you can proceed after acknowledging.

---

## Step 3: Trigger a WARN Signal (2 min)

1. Open `src/auth/login.ts`
2. Add a line: `// Added a comment to trigger re-save`
3. Save (`Ctrl+S`)
4. Observe the WARN prompt:
   - **Decision:** WARN
   - **Reason:** Auth change detected
   - **Action:** Acknowledge risk to proceed

5. Click **Acknowledge** — the file should save
6. Open Command Palette → `ARC XT: Review Audit Log`
7. You should see the WARN decision recorded in the audit log

**What you just saw:** ARC XT intercepted a save in a governed path (`src/auth/`), classified it as medium risk, required your acknowledgment, and logged the decision to the audit trail. This is **production enforcement** — not a demo mode.

---

## Step 4: Trigger a BLOCK Signal (2 min)

1. Create a core auth file: `src/auth/core/encryption.ts` with content `export const encrypt = (data: string) => data;`
2. Save the file — you should see a **BLOCK prompt** (save is blocked)
3. The prompt should explain that this file requires a linked blueprint (Change ID)
4. You cannot save without linking a blueprint — this is a **BLOCK** decision

**What you just saw:** ARC XT classified `src/auth/core/` as a critical-risk path. Without a linked blueprint artifact providing governance proof, the save is blocked entirely. This is **fail-closed enforcement** — no bypass exists without proper authorization.

---

## Step 5: Review the Audit Log (1 min)

1. Open Command Palette → `ARC XT: Review Audit Log`
2. You should see entries for:
   - The WARN decision on `src/auth/login.ts`
   - The BLOCK decision on `src/auth/core/encryption.ts`
   - Each entry includes timestamp, file path, risk level, and decision

**What you just saw:** Every enforcement action is recorded in a local, hash-chained audit log. This log is tamper-evident — any modification breaks the chain and is detectable.

---

## Step 6: Check the Task Board (1 min)

1. Look at the left sidebar — you should see the **ARC XT Task Board**
2. It should list blueprint artifacts in `.arc/blueprints/`
3. If no blueprints exist, the board shows bounded next actions (Create Blueprint, Review Governed Root, etc.)

**What you just saw:** The Task Board summarizes your blueprint artifacts and their validation state — Created, In Progress, or Completed. It is read-only and local-only.

---

## Summary

| Signal | Trigger Path | Decision | What It Means |
|--------|-------------|----------|---------------|
| **ALLOW** | `src/test.ts` | Save proceeds | Low-risk file — no governance required |
| **WARN** | `src/auth/login.ts` | Acknowledge to proceed | Medium-risk — auth/config change detected |
| **BLOCK** | `src/auth/core/encryption.ts` | Save blocked | High-risk — blueprint proof required |

### What ARC XT Is
- A local-first governance layer inside VS Code
- A tamper-evident audit trail for save decisions
- A risk classifier that intercepts saves in governed paths

### What ARC XT Is Not
- Not a linter (does not analyze code quality)
- Not a formatter (does not restructure code)
- Not an AI assistant (does not generate code)
- Not a CI/CD gate (operates at save time, not PR time)

---

*This evaluation guide uses production enforcement throughout. There is no evaluation mode, demo mode, or reduced-governance path.*
