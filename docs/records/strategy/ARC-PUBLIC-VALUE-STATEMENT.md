# ARC XT — Value Statement

> **ARC XT catches risky AI-generated code before save or commit.**

---

## What ARC XT Does

ARC XT is a local-first VS Code extension that introduces a deterministic, tamper-evident audit layer into the IDE. It intercepts saves, evaluates changes against governance rules, and requires operator acknowledgment or proof before allowing risky changes to proceed.

In an AI-assisted workflow where code is generated faster than it can be reviewed, ARC XT ensures every change is accountable, traceable, and verifiable.

### Core Behaviors
- **Intercept:** Monitors save events in governed files (auth, config, infrastructure, etc.)
- **Evaluate:** Assesses risk using deterministic rule engine — no model dependency required
- **Enforce:** Requires acknowledgment for medium-risk changes and proof linkage for high-risk changes
- **Record:** Appends every decision to a local, hash-chained audit log — immutable and verifiable

### What You'll See
- A warning prompt when editing governed files, explaining the risk
- A blocked save with clear guidance when critical changes lack proof
- A Task Board summarizing your blueprint artifacts and their validation state
- An Audit Log showing every save decision with timestamps and hash-chain integrity

---

## What ARC XT Is NOT

- **Not a linter:** ARC XT does not analyze code style, syntax, or static analysis warnings. It governs file-level risk based on path, file type, and change classification.
- **Not a formatter:** ARC XT does not reformat, restructure, or auto-fix code. It enforces governance at the point of save.
- **Not an AI assistant:** ARC XT does not generate code, suggest completions, or respond to natural language. It evaluates and records decisions made by other tools.
- **Not a CI/CD gate:** ARC XT operates inside the IDE at save time. It does not replace PR review, CI checks, or deployment gates.

---

## Current Status: Internal Pilot

ARC XT is currently a **controlled internal release**. It is distributed via direct VSIX transfer to authorized operators only.

- **Not available on Visual Studio Marketplace** — no public listing exists
- **Not available on Open VSX** — no public registry entry exists
- **Not recommended for production use** — this is an internal pilot with bounded scope

ARC XT is suitable for developer testing, workflow feedback, and governance evaluation within trusted teams. It is not yet cleared for external distribution or enterprise procurement.

---

## How to Get Access

1. **Request authorization** through your internal ARC XT pilot channel
2. **Download the VSIX** from the authorized releases channel
3. **Install via VS Code:** Extensions → `...` → Install from VSIX...
4. **Reload VS Code** when prompted

For questions or feedback, use the internal pilot feedback channels. GitHub Issues are not open for external reporters at this time.

---

## Key Guarantees

- **Local-first:** No code, prompts, or diffs leave your machine by default
- **No cloud dependency:** ARC XT works without any external model or service
- **Fail-closed:** If configuration is missing or invalid, ARC XT defaults to the strictest safe posture
- **Audit integrity:** Every decision is appended to a local, hash-chained log — tamper-evident by design

---

*This value statement is binding for internal pilot distribution. It must not be used as a public marketing artifact without separate Axis/Warden authorization.*
