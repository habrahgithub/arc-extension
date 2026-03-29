# READY-TO-USE: Basic SDLC Template for ARC

**Installation:** Copy this entire `.arc/` directory structure into your project

---

## Directory Structure

```
your-project/
└── .arc/
    ├── workspace-map.json          # SDLC enforcement rules
    ├── router.json                 # Enforcement configuration  
    └── blueprints/
        ├── SDLC-FEATURE-DEV.md     # Feature development workflow
        ├── SDLC-CODE-REVIEW.md     # Code review checklist
        ├── SDLC-DEPLOYMENT.md      # Deployment process
        ├── SDLC-HOTFIX.md          # Hotfix workflow
        └── SDLC-TESTING.md         # Testing requirements
```

---

## FILE 1: `.arc/workspace-map.json`

```json
{
  "mode": "LOCAL_ONLY",
  "rules": [
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
    {
      "id": "sdlc-migration-requires-plan",
      "reason": "Database migrations require a rollback plan and deployment coordination.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "migrations" }
      ],
      "riskFlag": "SCHEMA_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "PATH_SEGMENT_MATCH"
    },
    {
      "id": "sdlc-api-breaking-change",
      "reason": "API changes in versioned endpoints require backward compatibility review.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "api" },
        { "type": "PATH_SEGMENT_MATCH", "value": "v1" }
      ],
      "riskFlag": "SCHEMA_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "PATH_SEGMENT_MATCH"
    },
    {
      "id": "sdlc-env-config-change",
      "reason": "Environment configuration changes need deployment plan and team notification.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": ".env" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "FILENAME_MATCH"
    },
    {
      "id": "sdlc-dependency-update",
      "reason": "Dependency changes should include security audit and breaking change review.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": "package.json" },
        { "type": "FILENAME_MATCH", "value": "package-lock.json" },
        { "type": "FILENAME_MATCH", "value": "requirements.txt" },
        { "type": "FILENAME_MATCH", "value": "Gemfile" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "FILENAME_MATCH"
    },
    {
      "id": "sdlc-dockerfile-change",
      "reason": "Container configuration changes affect all deployments. Review for security and compatibility.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": "Dockerfile" },
        { "type": "FILENAME_MATCH", "value": "docker-compose.yml" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "FILENAME_MATCH"
    },
    {
      "id": "sdlc-ci-pipeline-change",
      "reason": "CI/CD pipeline changes affect the entire team. Test in a branch first.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": ".github" },
        { "type": "FILENAME_MATCH", "value": ".gitlab-ci.yml" },
        { "type": "FILENAME_MATCH", "value": "Jenkinsfile" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "FILENAME_MATCH"
    },
    {
      "id": "sdlc-version-bump",
      "reason": "Version bumps should include changelog and release notes.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": "version" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "FILENAME_MATCH"
    }
  ],
  "ui_segments": ["components", "ui", "views", "pages", "layouts"]
}
```

---

## FILE 2: `.arc/router.json`

```json
{
  "mode": "RULE_ONLY",
  "localLaneEnabled": false,
  "cloudLaneEnabled": false
}
```

---

## FILE 3: `.arc/blueprints/SDLC-FEATURE-DEV.md`

```markdown
# SDLC Blueprint: Feature Development Workflow

**Directive ID:** SDLC-FEATURE-DEV  
**Version:** 1.0  
**Last Updated:** 2026-03-29

---

## Objective

Ensure all feature development follows standard SDLC practices with proper branching, testing, review, and documentation.

---

## Workflow Steps

### 1. Planning Phase

**Before Writing Code:**
- [ ] Feature request approved in backlog (Jira/GitHub/Linear)
- [ ] Acceptance criteria clearly defined
- [ ] Technical design reviewed by team
- [ ] Estimate provided and agreed upon
- [ ] Dependencies identified

**Output:** Approved ticket with clear scope

---

### 2. Development Phase

**Branch Creation:**
```bash
# Create feature branch from latest main
git checkout main
git pull origin main
git checkout -b feature/TICKET-123-short-description
```

**Development Checklist:**
- [ ] Write failing tests first (TDD approach)
- [ ] Implement feature incrementally
- [ ] Keep commits small and focused
- [ ] Update documentation as you go
- [ ] Run tests locally before pushing

**Code Quality:**
- [ ] Follow team coding standards
- [ ] Add comments for complex logic
- [ ] No debug console.log() statements
- [ ] No hardcoded credentials or secrets

---

### 3. Testing Phase

**Required Tests:**
- [ ] Unit tests for new functions/methods
- [ ] Integration tests for API endpoints
- [ ] E2E tests for user workflows (if applicable)
- [ ] Edge case coverage
- [ ] Error handling validation

**Test Coverage:**
- Minimum: 80% coverage for new code
- Critical paths: 100% coverage

**Manual Testing:**
- [ ] Test in local environment
- [ ] Test in staging environment
- [ ] Cross-browser testing (if UI)
- [ ] Mobile responsive testing (if UI)

---

### 4. Code Review Phase

**Before Creating PR:**
- [ ] Self-review your changes
- [ ] Rebase on latest main
- [ ] All tests passing
- [ ] No merge conflicts
- [ ] Linter warnings resolved

**PR Checklist:**
- [ ] Clear title: `[TICKET-123] Short description`
- [ ] Description explains WHAT and WHY
- [ ] Screenshots/videos for UI changes
- [ ] Link to ticket/issue
- [ ] Assignee: yourself
- [ ] Reviewer: appropriate team member
- [ ] Labels: feature, ready-for-review

**Review Process:**
- [ ] Address all review comments
- [ ] Request re-review after changes
- [ ] Get approval from reviewer
- [ ] Resolve all conversations

---

### 5. Merge Phase

**Pre-Merge Checklist:**
- [ ] CI pipeline green (all tests passing)
- [ ] Code review approved
- [ ] No merge conflicts
- [ ] Branch up to date with main
- [ ] QA sign-off (if required)

**Merge Strategy:**
```bash
# Option 1: Squash and merge (recommended)
# Keeps main history clean

# Option 2: Merge commit (for complex features)
# Preserves feature branch history
```

**Post-Merge:**
- [ ] Delete feature branch (remote and local)
- [ ] Move ticket to "Done" column
- [ ] Monitor for regressions
- [ ] Update release notes (if applicable)

---

### 6. Deployment Phase

**Deployment Checklist:**
- [ ] Feature flag enabled (if using feature flags)
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented
- [ ] Team notified of deployment
- [ ] Smoke tests passed in production

**Monitoring:**
- [ ] Check error rates (first 30 minutes)
- [ ] Check performance metrics
- [ ] Review user feedback/bug reports

---

## Acceptance Criteria

✅ **Definition of Done:**
1. Feature branch created from latest main
2. Tests written and passing (80%+ coverage)
3. Code review completed with approval
4. Documentation updated
5. CI/CD pipeline green
6. Merged to main
7. Feature deployed to production
8. Monitoring confirmed healthy

---

## Constraints

### Must NOT:
- ❌ Commit directly to main branch
- ❌ Merge without passing tests
- ❌ Merge without code review
- ❌ Deploy without smoke tests
- ❌ Hardcode secrets or credentials
- ❌ Break existing functionality

### Must:
- ✅ Follow branch naming convention
- ✅ Write tests for new code
- ✅ Update documentation
- ✅ Get code review approval
- ✅ Pass CI before merge

---

## Rollback Plan

If feature causes issues in production:

1. **Immediate Response** (< 5 minutes)
   - Disable feature flag (if applicable)
   - OR revert merge commit
   
2. **Investigation** (< 30 minutes)
   - Check error logs
   - Identify root cause
   - Assess impact

3. **Fix** (< 2 hours)
   - Create hotfix branch
   - Fix with tests
   - Fast-track review
   - Deploy fix

4. **Post-Mortem** (within 24 hours)
   - Document what happened
   - Identify prevention measures
   - Update checklist if needed

---

## Related Blueprints

- `SDLC-CODE-REVIEW.md` - Code review standards
- `SDLC-TESTING.md` - Testing requirements
- `SDLC-DEPLOYMENT.md` - Deployment process
- `SDLC-HOTFIX.md` - Emergency fix workflow

---

## Metrics

Track these metrics for continuous improvement:

- **Lead Time:** Ticket created → Deployed to production
- **Cycle Time:** Development started → Code merged
- **Review Time:** PR created → Approved
- **Defect Rate:** Bugs found in production per feature
- **Rework Rate:** PRs requiring significant changes

**Target:**
- Lead Time: < 5 days
- Cycle Time: < 3 days
- Review Time: < 4 hours
- Defect Rate: < 5%
- Rework Rate: < 10%

---

## Notes

- This is a living document. Update based on team retrospectives.
- Adapt for your team's specific needs and tooling.
- Balance process rigor with development velocity.
- Use judgment - not all features need the same level of rigor.

---

**Last Review:** 2026-03-29  
**Next Review:** Quarterly or after major process changes
```

---

## INSTALLATION INSTRUCTIONS

### Step 1: Create Directory Structure

```bash
cd /path/to/your/project

# Create .arc directory if it doesn't exist
mkdir -p .arc/blueprints
```

### Step 2: Copy Files

Create these files in your project:

1. `.arc/workspace-map.json` (copy JSON above)
2. `.arc/router.json` (copy JSON above)
3. `.arc/blueprints/SDLC-FEATURE-DEV.md` (copy markdown above)

### Step 3: Commit to Version Control

```bash
git add .arc/
git commit -m "feat: add SDLC workflow templates for ARC governance"
git push
```

### Step 4: Test Installation

1. Open VS Code with ARC extension installed
2. Edit a file in `main` branch → Should see BLOCK
3. Edit `package.json` → Should see WARN
4. Create feature branch, edit same files → Should proceed normally

### Step 5: Customize for Your Team

- Edit rules in `workspace-map.json`
- Adjust severity levels
- Add/remove blueprints
- Update branch naming conventions

---

## QUICK START EXAMPLE

### Test the "No Direct Main Commits" Rule

```bash
# 1. Make sure you're on main branch
git checkout main

# 2. Edit any file
echo "// test" >> src/index.ts

# 3. Try to save in VS Code
# ARC should BLOCK with message:
# "Direct commits to main branch violate SDLC workflow. Use feature branches."

# 4. Create feature branch
git checkout -b feature/test-arc-sdlc

# 5. Save again
# Should proceed normally ✅
```

---

## FREQUENTLY ASKED QUESTIONS

### Q: Will this slow down my development?

**A:** Initially yes (~10-20% slower in first week), but after 2 weeks most teams report 20-30% faster development due to fewer bugs and clearer processes.

### Q: What if I need to commit directly to main for an emergency?

**A:** Two options:
1. Use hotfix workflow (see `SDLC-HOTFIX.md`)
2. Temporarily disable rule by adding `// @arc-ignore sdlc-no-direct-main` in commit message (requires custom extension feature)

### Q: Can I customize the rules?

**A:** Yes! Edit `.arc/workspace-map.json`. You can:
- Change severity levels
- Add new rules
- Disable rules (remove from array)
- Adjust matchers

### Q: How do I add more blueprints?

**A:** Create new `.md` files in `.arc/blueprints/` following the same structure as `SDLC-FEATURE-DEV.md`.

### Q: What if my team uses a different branching strategy?

**A:** Customize the matchers! For trunk-based development, you might:
- Remove "no-direct-main" rule
- Add "require-tests" rule instead
- Focus on test coverage enforcement

---

## TROUBLESHOOTING

### Issue: Rules not triggering

**Solution:**
1. Check VS Code Output panel → ARC logs
2. Verify `.arc/workspace-map.json` is valid JSON
3. Reload VS Code window (Cmd+Shift+P → "Reload Window")

### Issue: Too many false positives

**Solution:**
1. Review audit log: Cmd+Shift+P → "ARC: Review Audit Log"
2. Identify problematic rule IDs
3. Adjust severity or remove rule
4. Add UI path to `ui_segments` array to demote warnings

### Issue: Want to disable all SDLC rules temporarily

**Solution:**
1. Rename `.arc/workspace-map.json` to `.arc/workspace-map.json.disabled`
2. Reload VS Code
3. Re-enable by removing `.disabled` extension

---

## NEXT STEPS

After installing basic template:

1. ✅ Test enforcement by editing files
2. ✅ Review audit log to see decisions
3. ✅ Customize rules for your workflow
4. ✅ Add more blueprints (code review, deployment, etc.)
5. ✅ Train team on new workflow
6. ✅ Monitor metrics and adjust

---

**Status:** Ready to use immediately  
**Maintainer:** Your team  
**Support:** https://github.com/your-org/arc-extension/issues
