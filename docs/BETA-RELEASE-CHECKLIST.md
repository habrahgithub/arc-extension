# ARC XT Beta Release Checklist

**Version target:** 0.1.5  
**Channel:** Controlled beta  
**Registries:** Visual Studio Marketplace, Open VSX

---

## 1. Pre-publish quality gate

Run from `projects/lintel/`:

```bash
npm run lint
npm run typecheck
npm run test
npx @vscode/vsce package
```

Confirm:

- package builds successfully
- latest `.vsix` installs cleanly
- `ARC XT: Review Home` opens
- `ARC XT: Decision Feed` opens
- `ARC XT: Audit Timeline` opens
- `ARC XT: Why Panel` opens
- `ARC XT: Show Active Workspace Status` reflects ARC XT naming
- governed save still shows visible intervention on protected files

---

## 2. Marketplace readiness check

Confirm before publishing:

- `package.json` version matches release target
- `preview: true` is present for beta posture
- extension icon is `Public/Logo/ARC-ICON-1024.png`
- LICENSE is present and Apache-2.0
- README reflects ARC XT naming and beta posture
- no public-facing text incorrectly describes cloud/default readiness

---

## 3. Evidence references

Keep these ready for tester support and governance review:

- `artifacts/ARC-UX-VALIDATION-001-LOG.md`
- `artifacts/evidence/ARC-UX-VALIDATION-001/evidence-index.md`
- `artifacts/evidence/ARC-UX-VALIDATION-001/screenshots/`
- `artifacts/evidence/ARC-UX-VALIDATION-001/gifs/`

---

## 4. Visual Studio Marketplace publish

Prerequisites:

- publisher account available
- Personal Access Token configured for `vsce`

Example:

```bash
npx @vscode/vsce publish --pre-release
```

If publishing the already-built package manually, keep the release version and README aligned first.

---

## 5. Open VSX publish

Prerequisites:

- Open VSX namespace available
- `OVSX_PAT` token available

Example:

```bash
npx ovsx publish arc-audit-ready-core-0.1.5.vsix -p "$OVSX_PAT"
```

If publishing from a different file path, adjust the filename accordingly.

---

## 6. Tester invite note

Recommended beta framing:

- local-first governance extension
- cloud disabled by default
- feedback requested on install, first-run clarity, command discoverability, and false-positive trust
- report issues with screenshots/GIFs where possible

---

## 7. Post-publish smoke

After publication:

- install from Marketplace or Open VSX path
- re-run first-run smoke
- confirm listing icon/README render correctly
- capture the published listing URL(s)

---

## 8. Hold line

Do not combine beta publication with:

- new product features
- runtime/model expansion
- governance weakening
- cloud-lane activation by default
