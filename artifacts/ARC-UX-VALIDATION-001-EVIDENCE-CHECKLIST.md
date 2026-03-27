# ARC-UX-VALIDATION-001 — Evidence Capture Checklist

**Directive ID:** ARC-UX-VALIDATION-001  
**Phase:** Evidence Capture (Phase D)  
**Date:** 2026-03-26  

---

## Screenshot Capture Checklist

### Required Screenshots

| # | Surface | Command | What to Show | File Name |
|---|---------|---------|--------------|-----------|
| 1 | Review Home | `ARC: Review Home` | Full page with logo, all 4 cards visible | `01-review-home.png` |
| 2 | Decision Feed | `ARC: Decision Feed` | List of recent decisions (or empty state with message) | `02-decision-feed.png` |
| 3 | Audit Timeline | `ARC: Audit Timeline` | Chronological entries (or empty state) | `03-audit-timeline.png` |
| 4 | Why Panel | `ARC: Why Panel` | Decision explanation (or empty state) | `04-why-panel.png` |
| 5 | Command Palette | `Ctrl+Shift+P` | All `arc.ui.*` commands visible | `05-command-palette.png` |
| 6 | Runtime Status | `ARC: Show Active Workspace Status` | Workspace targeting info | `06-runtime-status.png` |
| 7 | Logo Close-up | Any branded surface | Logo visible at top of page | `07-logo-detail.png` |

### How to Capture

**On Linux (with X11):**
```bash
# Full screen
xwd -root | convert xwd:- screenshot.png

# Specific window (click on window after running command)
xwd | convert xwd:- window.png
```

**On macOS:**
```bash
# Full screen
screencapture -x fullscreen.png

# Specific window (press spacebar to select)
screencapture -w -x window.png
```

**On Windows:**
```powershell
# Use Snipping Tool or Win+Shift+S
```

**In VS Code:**
1. Open Command Palette (`Ctrl+Shift+P`)
2. Run the command (e.g., `ARC: Review Home`)
3. Wait for webview to load
4. Use system screenshot tool

---

## GIF Capture Checklist

### Required GIFs

| # | Flow | Steps | Duration | File Name |
|---|------|-------|----------|-----------|
| 1 | First Governed Save | 1. Open governed file<br>2. Make change<br>3. Save<br>4. Show decision popup | 15-30 sec | `01-governed-save.gif` |
| 2 | Review Home Navigation | 1. Open Review Home<br>2. Click each card<br>3. Show each surface loads | 30-45 sec | `02-review-navigation.gif` |
| 3 | Command Discovery | 1. Open Command Palette<br>2. Type "ARC"<br>3. Show all commands appear | 10-15 sec | `03-command-discovery.gif` |

### How to Capture

**Recommended Tools:**
- **Linux:** `peek`, `kooha`, or `simplescreenrecorder`
- **macOS:** `Licecap`, `GIPHY Capture`
- **Windows:** `Licecap`, `ScreenToGif`
- **Cross-platform:** `OBS Studio` (export as GIF)

**Settings:**
- Frame rate: 10-15 fps (sufficient for UI demos)
- Resolution: 1280x720 or lower (keep file size manageable)
- Duration: Under 60 seconds per GIF

---

## Live Walkthrough Evidence Pack

### Structure

Create a folder: `artifacts/evidence/ARC-UX-VALIDATION-001/`

Contents:
```
artifacts/evidence/ARC-UX-VALIDATION-001/
├── screenshots/
│   ├── 01-review-home.png
│   ├── 02-decision-feed.png
│   ├── 03-audit-timeline.png
│   ├── 04-why-panel.png
│   ├── 05-command-palette.png
│   ├── 06-runtime-status.png
│   └── 07-logo-detail.png
├── gifs/
│   ├── 01-governed-save.gif
│   ├── 02-review-navigation.gif
│   └── 03-command-discovery.gif
├── walkthrough-script.md
└── evidence-index.md
```

### Walkthrough Script Template

```markdown
# ARC First-Run Walkthrough Script

## Scene 1: Fresh Install (10 sec)
- Show VS Code with fresh ARC install
- Open Command Palette
- Type "ARC"
- Show all commands appear

## Scene 2: First Governed Save (20 sec)
- Open a governed file (e.g., auth.ts)
- Make a small change
- Press Ctrl+S
- Show decision popup appears
- Show acknowledgment/reason

## Scene 3: Review Home Navigation (30 sec)
- Open ARC: Review Home
- Show logo at top
- Click each card
- Show each surface loads correctly

## Scene 4: Decision Visibility (20 sec)
- Open ARC: Decision Feed
- Show recent decisions listed
- Click on a decision
- Show Why Panel explains the decision
```

### Evidence Index Template

```markdown
# ARC-UX-VALIDATION-001 Evidence Index

**Date Captured:** YYYY-MM-DD
**Environment:** VS Code X.Y.Z, ARC 0.1.1

## Screenshots

| File | Surface | Notes |
|------|---------|-------|
| 01-review-home.png | Review Home | Logo visible, 4 cards |
| ... | ... | ... |

## GIFs

| File | Flow | Duration | Notes |
|------|------|----------|-------|
| 01-governed-save.gif | First save | 20 sec | Shows WARN decision |
| ... | ... | ... | ... |

## Validation Notes

- All surfaces render correctly: ✅
- Logo visible on branded surfaces: ✅
- Navigation works from Review Home: ✅
- Commands discoverable in palette: ✅
- No blank/unexplained states: ✅
```

---

## Submission Checklist

Before submitting evidence pack:

- [ ] All 7 screenshots captured
- [ ] All 3 GIFs captured
- [ ] Walkthrough script completed
- [ ] Evidence index completed
- [ ] Files organized in correct folder structure
- [ ] File sizes reasonable (< 5MB per GIF, < 1MB per PNG)
- [ ] All surfaces show logo where intended
- [ ] No sensitive data visible in screenshots

---

**Next:** Capture evidence and commit to `artifacts/evidence/ARC-UX-VALIDATION-001/`

---

**End of Evidence Capture Checklist**
