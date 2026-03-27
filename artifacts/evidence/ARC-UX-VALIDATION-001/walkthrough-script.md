# ARC First-Run Walkthrough Script

**Directive:** ARC-UX-VALIDATION-001  
**Extension Version:** 0.1.2  
**Goal:** Capture a concise, truthful evidence pack for first-run experience validation.

---

## Scene 1 — Fresh Install / Command Discovery

1. Open VS Code with ARC installed
2. Open Command Palette (`Ctrl+Shift+P`)
3. Type `ARC`
4. Show these commands are visible:
   - `ARC: Review Home`
   - `ARC: Decision Feed`
   - `ARC: Audit Timeline`
   - `ARC: Why Panel`
   - `ARC: Show Active Workspace Status`

Suggested captures:
- screenshot: `05-command-palette.png`
- GIF segment: `03-command-discovery.gif`

---

## Scene 2 — Review Home

1. Run `ARC: Review Home`
2. Wait for the webview to render
3. Ensure the logo is visible
4. Ensure all four cards are visible

Suggested captures:
- screenshot: `01-review-home.png`
- screenshot: `07-logo-detail.png`

---

## Scene 3 — Review Home Navigation

1. From Review Home, click each card
2. Confirm each target surface opens without silent failure
3. Return to Review Home as needed

Suggested captures:
- GIF segment: `02-review-navigation.gif`

---

## Scene 4 — Decision Visibility Surfaces

Open and capture:

1. `ARC: Decision Feed`
   - screenshot: `02-decision-feed.png`
2. `ARC: Audit Timeline`
   - screenshot: `03-audit-timeline.png`
3. `ARC: Why Panel`
   - screenshot: `04-why-panel.png`

Notes:
- empty state is acceptable if it is explanatory and truthful
- do not fabricate populated data

---

## Scene 5 — Runtime Status

1. Run `ARC: Show Active Workspace Status`
2. Capture workspace targeting / audit posture information

Suggested capture:
- screenshot: `06-runtime-status.png`

---

## Scene 6 — First Governed Save

1. Open a governed file
2. Make a small bounded change
3. Save the file
4. Capture the visible decision / prompt / reaction

Suggested capture:
- GIF segment: `01-governed-save.gif`

Notes:
- use a real governed interaction
- do not capture sensitive data
- if the result is an ALLOW path, do not misrepresent it as a warning/block

---

## Final Review

Before submission:

- confirm files are saved in the correct evidence folders
- confirm no sensitive data is visible
- confirm screenshots match current product truth
- confirm GIF durations are short and legible
