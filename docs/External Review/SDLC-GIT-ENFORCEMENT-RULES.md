# GIT OPERATION ENFORCEMENT RULES

Add these rules to your `.arc/workspace-map.json` to enforce Git best practices:

```json
{
  "mode": "LOCAL_ONLY",
  "rules": [
    // ========================================
    // EXISTING BASE RULES
    // ========================================
    {
      "id": "sdlc-no-direct-main",
      "reason": "Direct commits to main branch violate SDLC workflow. Use feature branches.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "main" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "CRITICAL",
      "decisionFloor": "BLOCK",
      "scope": "PATH_SEGMENT_MATCH"
    },

    // ========================================
    // GIT OPERATION RULES
    // ========================================

    {
      "id": "git-no-direct-develop",
      "reason": "Direct commits to develop branch violate GitFlow. Use feature/bugfix branches.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "develop" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "BLOCK",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "🚫 Cannot commit to develop. Create feature/bugfix branch instead."
    },

    {
      "id": "git-release-branch-requires-plan",
      "reason": "Release branches require version bump, changelog, and deployment plan.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "release" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "📦 Release branch. Required: 1) Version bump, 2) Changelog, 3) Release checklist"
    },

    {
      "id": "git-branch-name-convention",
      "reason": "Branch names should follow convention: feature/TICKET-description or bugfix/TICKET-description",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "feature" },
        { "type": "PATH_SEGMENT_MATCH", "value": "bugfix" },
        { "type": "PATH_SEGMENT_MATCH", "value": "hotfix" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "LOW",
      "decisionFloor": "WARN",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "ℹ️ Verify branch name: <type>/TICKET-description (e.g., feature/DOC-123-pdf-export)"
    },

    {
      "id": "git-gitignore-change",
      "reason": ".gitignore changes affect what gets committed. Review carefully to avoid committing secrets.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": ".gitignore" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "FILENAME_MATCH",
      "customMessage": "⚠️ .gitignore change. Ensure sensitive files are still excluded."
    },

    {
      "id": "git-hooks-change",
      "reason": "Git hooks affect entire team's workflow. Test locally before committing.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": ".git/hooks" },
        { "type": "PATH_SEGMENT_MATCH", "value": ".husky" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "🪝 Git hook change. Test locally and notify team."
    },

    {
      "id": "git-submodule-change",
      "reason": "Submodule changes can break builds. Update carefully and document.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": ".gitmodules" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "FILENAME_MATCH",
      "customMessage": "📌 Submodule change. Document reason and update instructions for team."
    },

    {
      "id": "git-lfs-change",
      "reason": "Git LFS configuration affects binary file handling. Changes require team coordination.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": ".gitattributes" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "FILENAME_MATCH",
      "customMessage": "📦 Git LFS config change. Verify large file handling is correct."
    },

    {
      "id": "git-workflow-config",
      "reason": "GitHub Actions or CI/CD workflow changes affect automated processes.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": ".github/workflows" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "⚙️ CI/CD workflow change. Test in branch before merging to main."
    },

    {
      "id": "git-codeowners-change",
      "reason": "CODEOWNERS affects PR review assignments. Changes require team agreement.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": "CODEOWNERS" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "FILENAME_MATCH",
      "customMessage": "👥 CODEOWNERS change. Confirm with affected teams."
    },

    {
      "id": "git-changelog-update",
      "reason": "CHANGELOG should be updated with each release. Include version and date.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": "CHANGELOG" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "LOW",
      "decisionFloor": "WARN",
      "scope": "FILENAME_MATCH",
      "customMessage": "📝 CHANGELOG update. Follow Keep a Changelog format."
    },

    {
      "id": "git-version-file",
      "reason": "Version file changes should align with release process.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": "VERSION" },
        { "type": "FILENAME_MATCH", "value": "version.txt" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "FILENAME_MATCH",
      "customMessage": "🔢 Version change. Ensure: 1) Follows semver, 2) Changelog updated, 3) Tag created"
    },

    {
      "id": "git-license-change",
      "reason": "License changes have legal implications. Requires stakeholder approval.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": "LICENSE" },
        { "type": "FILENAME_MATCH", "value": "COPYING" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "CRITICAL",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "FILENAME_MATCH",
      "customMessage": "⚖️ LICENSE change. Requires legal review and stakeholder approval."
    },

    {
      "id": "git-readme-substantial-change",
      "reason": "Substantial README changes may require documentation review.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": "README.md" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "LOW",
      "decisionFloor": "WARN",
      "scope": "FILENAME_MATCH",
      "customMessage": "📖 README change. Verify accuracy and completeness."
    },

    {
      "id": "git-commit-template",
      "reason": "Commit message template affects team's commit discipline.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": ".gitmessage" },
        { "type": "FILENAME_MATCH", "value": "commit-template" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "LOW",
      "decisionFloor": "WARN",
      "scope": "FILENAME_MATCH",
      "customMessage": "💬 Commit template change. Share with team."
    },

    {
      "id": "git-mailmap",
      "reason": ".mailmap maps author identities. Changes should be accurate and consensual.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": ".mailmap" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "LOW",
      "decisionFloor": "WARN",
      "scope": "FILENAME_MATCH",
      "customMessage": "📧 Mailmap change. Verify author mapping is correct."
    },

    {
      "id": "git-merge-conflict-markers",
      "reason": "Merge conflict markers left in code will break builds.",
      "matchers": [
        { "type": "EXTENSION_MATCH", "value": ".js" },
        { "type": "EXTENSION_MATCH", "value": ".ts" },
        { "type": "EXTENSION_MATCH", "value": ".tsx" },
        { "type": "EXTENSION_MATCH", "value": ".jsx" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "CRITICAL",
      "decisionFloor": "BLOCK",
      "scope": "EXTENSION_MATCH",
      "customMessage": "🚫 Check for conflict markers: <<<<<<<, =======, >>>>>>>"
    },

    {
      "id": "git-experimental-branch",
      "reason": "Experimental branches are for POCs. Document findings before merging.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "experiment" },
        { "type": "PATH_SEGMENT_MATCH", "value": "spike" },
        { "type": "PATH_SEGMENT_MATCH", "value": "poc" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "🧪 Experimental branch. Document findings and results before merging."
    }
  ],
  "ui_segments": ["components", "ui", "views", "pages", "layouts"]
}
```

---

## COMPLETE GIT HOOKS PACKAGE

See SDLC-GIT-WORKFLOW.md for:
- Pre-commit hook (branch check, debug detection, linting)
- Commit-msg hook (conventional commits validation)
- Pre-push hook (force push prevention, tests)
- Installation scripts
- Husky integration

---

**Total Git Rules:** 17 rules covering all Git operations  
**Status:** Ready to use
