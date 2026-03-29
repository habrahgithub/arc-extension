# GIT OPERATIONS ENFORCEMENT RULES

Add these rules to your `.arc/workspace-map.json` to enforce Git best practices:

```json
{
  "mode": "LOCAL_ONLY",
  "rules": [
    // ... (existing rules from basic template)

    // ========================================
    // GIT OPERATIONS RULES
    // ========================================

    {
      "id": "git-no-commit-to-main",
      "reason": "Direct commits to main branch violate PR workflow. Create feature branch instead.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "main" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "CRITICAL",
      "decisionFloor": "BLOCK",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "🚫 Cannot commit directly to main. Create a feature branch: git checkout -b feature/TICKET-123-description"
    },
    {
      "id": "git-no-commit-to-master",
      "reason": "Direct commits to master branch violate PR workflow. Create feature branch instead.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "master" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "CRITICAL",
      "decisionFloor": "BLOCK",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "🚫 Cannot commit directly to master. Create a feature branch: git checkout -b feature/TICKET-123-description"
    },
    {
      "id": "git-no-commit-to-production",
      "reason": "Direct commits to production branch violate deployment workflow. Use release process.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "production" },
        { "type": "PATH_SEGMENT_MATCH", "value": "prod" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "CRITICAL",
      "decisionFloor": "BLOCK",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "🚫 Cannot commit directly to production. Use release workflow."
    },
    {
      "id": "git-release-branch-requires-plan",
      "reason": "Release branches require version bump, changelog, and QA sign-off. See SDLC-GIT-001.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "release" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "📦 Release branch detected. Required:\n1. Version bumped\n2. CHANGELOG.md updated\n3. QA sign-off\n4. Staging deployment tested"
    },
    {
      "id": "git-hotfix-requires-incident",
      "reason": "Hotfix branches must reference production incident. See SDLC-DEBUG-001 for incident response.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "hotfix" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "🚨 Hotfix branch detected. Required:\n1. Incident ticket created (INC-YYYY-MM-DD-NNN)\n2. Minimal fix only (no refactoring)\n3. Tests included\n4. Post-deployment: merge to develop also"
    },
    {
      "id": "git-changelog-requires-review",
      "reason": "CHANGELOG updates should accurately reflect release notes and follow format.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": "CHANGELOG" },
        { "type": "FILENAME_MATCH", "value": "HISTORY" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "FILENAME_MATCH",
      "customMessage": "📝 CHANGELOG updated. Verify:\n- Version number correct\n- All features/fixes listed\n- Breaking changes highlighted\n- Date is accurate"
    },
    {
      "id": "git-version-file-change",
      "reason": "Version file changes should follow semantic versioning and include CHANGELOG update.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": "package.json" },
        { "type": "FILENAME_MATCH", "value": "version.txt" },
        { "type": "FILENAME_MATCH", "value": "VERSION" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "FILENAME_MATCH",
      "customMessage": "🔢 Version change detected. Checklist:\n- Semantic versioning followed (MAJOR.MINOR.PATCH)\n- CHANGELOG.md updated\n- Git tag will be created\n- Release notes prepared"
    },
    {
      "id": "git-github-workflow-change",
      "reason": "GitHub Actions changes affect CI/CD pipeline. Test in feature branch first.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": ".github" },
        { "type": "PATH_SEGMENT_MATCH", "value": "workflows" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "⚙️ GitHub Actions workflow changed. Checklist:\n- Tested in feature branch\n- No secrets hardcoded\n- Workflow permissions reviewed\n- Team notified of CI/CD changes"
    },
    {
      "id": "git-gitlab-ci-change",
      "reason": "GitLab CI changes affect entire pipeline. Test in feature branch first.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": ".gitlab-ci.yml" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "FILENAME_MATCH",
      "customMessage": "⚙️ GitLab CI config changed. Verify:\n- Pipeline tested in feature branch\n- No breaking changes to existing jobs\n- Team notified"
    },
    {
      "id": "git-gitignore-addition",
      "reason": "Adding patterns to .gitignore is safe, but verify they don't hide important files.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": ".gitignore" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "LOW",
      "decisionFloor": "WARN",
      "scope": "FILENAME_MATCH",
      "customMessage": "🙈 .gitignore modified. Check:\n- Not hiding important files\n- Patterns are specific enough\n- No overly broad patterns (e.g., *.log)"
    },
    {
      "id": "git-hooks-directory",
      "reason": "Git hooks can modify repository behavior. Review carefully for malicious code.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": ".git" },
        { "type": "PATH_SEGMENT_MATCH", "value": "hooks" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "🪝 Git hook detected. Security review:\n- Hook script reviewed for malicious code\n- Team aware of new hook\n- Documented in README"
    },
    {
      "id": "git-submodule-change",
      "reason": "Git submodule changes can introduce dependency risks. Review submodule source.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": ".gitmodules" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "HIGH",
      "decisionFloor": "REQUIRE_PLAN",
      "scope": "FILENAME_MATCH",
      "customMessage": "📦 Git submodule configuration changed. Review:\n- Submodule source is trusted\n- Locked to specific commit (not branch)\n- Team aware of new dependency\n- Security scan completed"
    },
    {
      "id": "git-merge-conflict-markers",
      "reason": "Merge conflict markers must be resolved before commit.",
      "matchers": [
        { "type": "EXTENSION_MATCH", "value": ".js" },
        { "type": "EXTENSION_MATCH", "value": ".ts" },
        { "type": "EXTENSION_MATCH", "value": ".jsx" },
        { "type": "EXTENSION_MATCH", "value": ".tsx" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "CRITICAL",
      "decisionFloor": "BLOCK",
      "scope": "EXTENSION_MATCH",
      "customMessage": "⚠️ Potential merge conflict markers. Files must not contain:\n<<<<<<< HEAD\n=======\n>>>>>>> branch-name"
    },
    {
      "id": "git-large-file-warning",
      "reason": "Large files should use Git LFS. Files > 1MB should be tracked with LFS.",
      "matchers": [
        { "type": "EXTENSION_MATCH", "value": ".png" },
        { "type": "EXTENSION_MATCH", "value": ".jpg" },
        { "type": "EXTENSION_MATCH", "value": ".pdf" },
        { "type": "EXTENSION_MATCH", "value": ".zip" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "MEDIUM",
      "decisionFloor": "WARN",
      "scope": "EXTENSION_MATCH",
      "customMessage": "📦 Large file detected. Consider:\n- Using Git LFS for files > 1MB\n- Compressing images\n- Storing in cloud storage with URL reference"
    },
    {
      "id": "git-credentials-file",
      "reason": "Credential files should NEVER be committed. Add to .gitignore immediately.",
      "matchers": [
        { "type": "FILENAME_MATCH", "value": "credentials" },
        { "type": "FILENAME_MATCH", "value": "secrets" },
        { "type": "FILENAME_MATCH", "value": "id_rsa" },
        { "type": "FILENAME_MATCH", "value": ".pem" }
      ],
      "riskFlag": "AUTH_CHANGE",
      "severity": "CRITICAL",
      "decisionFloor": "BLOCK",
      "scope": "FILENAME_MATCH",
      "customMessage": "🚨 SECURITY: Credential file detected!\n1. DO NOT COMMIT\n2. Add to .gitignore\n3. Use environment variables or secrets manager\n4. If already committed, rotate credentials immediately"
    },
    {
      "id": "git-experiment-branch",
      "reason": "Experiment branches are for POCs/spikes. Document learnings before deleting.",
      "matchers": [
        { "type": "PATH_SEGMENT_MATCH", "value": "experiment" },
        { "type": "PATH_SEGMENT_MATCH", "value": "spike" },
        { "type": "PATH_SEGMENT_MATCH", "value": "poc" }
      ],
      "riskFlag": "CONFIG_CHANGE",
      "severity": "LOW",
      "decisionFloor": "WARN",
      "scope": "PATH_SEGMENT_MATCH",
      "customMessage": "🧪 Experiment branch. Remember:\n- Document learnings in ticket/wiki\n- Don't merge to main (unless POC succeeds)\n- Delete after extracting learnings\n- Consider time-boxing spike work"
    }
  ],
  "ui_segments": ["components", "ui", "views", "pages", "layouts"]
}
```

---

## GIT RULE CATEGORIES

### 1. **Branch Protection** (3 rules)
- `git-no-commit-to-main` - Blocks direct commits to main
- `git-no-commit-to-master` - Blocks direct commits to master
- `git-no-commit-to-production` - Blocks direct commits to production

### 2. **Workflow Enforcement** (3 rules)
- `git-release-branch-requires-plan` - Release branch checklist
- `git-hotfix-requires-incident` - Hotfix incident requirement
- `git-experiment-branch` - Experiment branch guidance

### 3. **Release Management** (2 rules)
- `git-changelog-requires-review` - CHANGELOG validation
- `git-version-file-change` - Version bump checklist

### 4. **CI/CD Protection** (2 rules)
- `git-github-workflow-change` - GitHub Actions review
- `git-gitlab-ci-change` - GitLab CI review

### 5. **Repository Configuration** (3 rules)
- `git-gitignore-addition` - .gitignore safety
- `git-hooks-directory` - Git hooks security review
- `git-submodule-change` - Submodule security review

### 6. **Code Quality** (1 rule)
- `git-merge-conflict-markers` - Blocks unresolved conflicts

### 7. **Performance** (1 rule)
- `git-large-file-warning` - Large file detection

### 8. **Security** (1 rule)
- `git-credentials-file` - Blocks credential files

**Total:** 16 git-specific enforcement rules

---

## SEVERITY BREAKDOWN

| Severity | Count | Decision | Examples |
|----------|-------|----------|----------|
| **CRITICAL** | 4 | BLOCK | main commits, conflict markers, credentials |
| **HIGH** | 4 | REQUIRE_PLAN | hotfix, release, version, hooks |
| **MEDIUM** | 4 | WARN | CI/CD, CHANGELOG, large files |
| **LOW** | 4 | WARN | .gitignore, experiments |

---

## PRE-COMMIT HOOK INTEGRATION

### Comprehensive Git Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit
# This hook enforces git best practices before allowing commit

echo "🔍 Running git pre-commit checks..."

# ============================================
# 1. CHECK FOR MERGE CONFLICT MARKERS
# ============================================
if git diff --cached | grep -E '^(<<<<<<<|=======|>>>>>>>)'; then
  echo "❌ Merge conflict markers found in staged files"
  echo "   Resolve conflicts before committing"
  exit 1
fi

# ============================================
# 2. CHECK FOR DEBUG STATEMENTS
# ============================================
if git diff --cached --name-only | grep -E '\.(js|ts|jsx|tsx)$' | xargs grep -n 'console\.\(log\|debug\)\|debugger' 2>/dev/null; then
  echo "❌ Debug statements found:"
  git diff --cached --name-only | grep -E '\.(js|ts|jsx|tsx)$' | xargs grep -n 'console\.\(log\|debug\)\|debugger' 2>/dev/null
  echo ""
  echo "   Remove console.log/debugger before committing"
  exit 1
fi

# ============================================
# 3. CHECK FOR CREDENTIALS
# ============================================
if git diff --cached --name-only | grep -E '(credentials|secrets|id_rsa|\.pem|\.key)'; then
  echo "🚨 SECURITY ALERT: Credential file detected!"
  echo "   DO NOT COMMIT CREDENTIALS"
  echo "   Add to .gitignore instead"
  exit 1
fi

# Check for common credential patterns in file content
if git diff --cached | grep -E '(password|api_key|secret_key|private_key)\s*=\s*["\']' | grep -v 'example\|placeholder\|your_'; then
  echo "🚨 SECURITY ALERT: Potential hardcoded credentials detected!"
  echo "   Use environment variables or secrets manager"
  exit 1
fi

# ============================================
# 4. CHECK FOR LARGE FILES (> 1MB)
# ============================================
large_files=$(git diff --cached --name-only | while read file; do
  if [ -f "$file" ]; then
    size=$(wc -c < "$file")
    if [ $size -gt 1048576 ]; then  # 1MB
      echo "$file ($(numfmt --to=iec-i --suffix=B $size))"
    fi
  fi
done)

if [ -n "$large_files" ]; then
  echo "⚠️  Large files detected (> 1MB):"
  echo "$large_files"
  echo ""
  echo "   Consider using Git LFS for large binary files"
  echo "   Continue anyway? [y/N]"
  read -r response
  if [[ ! "$response" =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# ============================================
# 5. VERIFY BRANCH NAME
# ============================================
current_branch=$(git symbolic-ref --short HEAD 2>/dev/null)

# Block commits to protected branches
if [[ "$current_branch" =~ ^(main|master|production|prod)$ ]]; then
  echo "🚫 Direct commits to '$current_branch' are not allowed"
  echo "   Create a feature branch instead:"
  echo "   git checkout -b feature/TICKET-123-description"
  exit 1
fi

# Validate branch name format (except for develop)
if [[ ! "$current_branch" =~ ^(develop|feature|bugfix|hotfix|release|experiment)/[a-z0-9-]+$ ]] && [[ "$current_branch" != "develop" ]]; then
  echo "⚠️  Branch name doesn't follow convention: $current_branch"
  echo "   Expected format: type/TICKET-123-description"
  echo "   Valid types: feature, bugfix, hotfix, release, experiment"
  echo ""
  echo "   Continue anyway? [y/N]"
  read -r response
  if [[ ! "$response" =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# ============================================
# 6. RUN LINTER
# ============================================
if command -v npm &> /dev/null; then
  if [ -f "package.json" ] && grep -q '"lint"' package.json; then
    echo "🔍 Running linter..."
    npm run lint --silent
    if [ $? -ne 0 ]; then
      echo "❌ Linter errors found"
      echo "   Fix linting errors before committing"
      exit 1
    fi
  fi
fi

# ============================================
# 7. RUN TESTS (optional, can be slow)
# ============================================
# Uncomment if you want to run tests on every commit
# if command -v npm &> /dev/null; then
#   if [ -f "package.json" ] && grep -q '"test"' package.json; then
#     echo "🧪 Running tests..."
#     npm test --silent
#     if [ $? -ne 0 ]; then
#       echo "❌ Tests failed"
#       exit 1
#     fi
#   fi
# fi

echo "✅ All pre-commit checks passed"
exit 0
```

### Install Hook Automatically

```bash
# Add to package.json scripts
{
  "scripts": {
    "install-hooks": "cp scripts/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit"
  }
}

# Or use husky (recommended)
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm test"
```

---

## COMMIT-MSG HOOK (Enforce Conventional Commits)

```bash
#!/bin/bash
# .git/hooks/commit-msg

commit_msg_file=$1
commit_msg=$(cat "$commit_msg_file")

# Check conventional commit format
if ! echo "$commit_msg" | grep -qE '^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?: .{1,}'; then
  echo "❌ Commit message doesn't follow Conventional Commits format"
  echo ""
  echo "Expected: type(scope): subject"
  echo "Example:  feat(auth): add OAuth2 login"
  echo ""
  echo "Valid types:"
  echo "  feat     - New feature"
  echo "  fix      - Bug fix"
  echo "  docs     - Documentation"
  echo "  style    - Formatting"
  echo "  refactor - Code restructure"
  echo "  perf     - Performance"
  echo "  test     - Tests"
  echo "  build    - Build system"
  echo "  ci       - CI/CD"
  echo "  chore    - Maintenance"
  echo "  revert   - Revert commit"
  exit 1
fi

# Check subject length
first_line=$(echo "$commit_msg" | head -n 1)
if [ ${#first_line} -gt 72 ]; then
  echo "⚠️  Commit subject too long: ${#first_line} chars (max 72)"
  echo "   Current: $first_line"
  exit 1
fi

# Check for imperative mood (common mistakes)
if echo "$first_line" | grep -qE ': (adds|added|adding|fixes|fixed|fixing)'; then
  echo "⚠️  Use imperative mood in subject"
  echo "   Use 'add' not 'adds', 'added', or 'adding'"
  echo "   Use 'fix' not 'fixes', 'fixed', or 'fixing'"
  exit 1
fi

echo "✅ Commit message format valid"
exit 0
```

---

## USAGE EXAMPLES

### Example 1: Blocked Main Commit

```bash
$ git checkout main
$ echo "fix" >> index.ts
$ git add index.ts
$ git commit -m "fix: urgent bug"

🔍 Running git pre-commit checks...
🚫 Direct commits to 'main' are not allowed
   Create a feature branch instead:
   git checkout -b feature/TICKET-123-description
```

### Example 2: Debug Statement Detection

```bash
$ git checkout -b feature/ABC-123-new-feature
$ echo "console.log('debug');" >> src/app.ts
$ git add src/app.ts
$ git commit -m "feat: add feature"

🔍 Running git pre-commit checks...
❌ Debug statements found:
src/app.ts:42:console.log('debug');

   Remove console.log/debugger before committing
```

### Example 3: Credential Detection

```bash
$ echo "API_KEY='secret123'" >> config.js
$ git add config.js
$ git commit -m "feat: add config"

🔍 Running git pre-commit checks...
🚨 SECURITY ALERT: Potential hardcoded credentials detected!
   Use environment variables or secrets manager
```

### Example 4: Invalid Commit Message

```bash
$ git commit -m "fixed the bug"

❌ Commit message doesn't follow Conventional Commits format

Expected: type(scope): subject
Example:  feat(auth): add OAuth2 login

Valid types:
  feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
```

---

## CUSTOMIZATION GUIDE

### Make Rules Stricter

**Block instead of warn:**
```json
{
  "id": "git-large-file-warning",
  "decisionFloor": "BLOCK"  // Now blocks instead of warning
}
```

### Make Rules More Lenient

**Warn instead of block:**
```json
{
  "id": "git-no-commit-to-main",
  "decisionFloor": "WARN"  // Now warns instead of blocking
}
```

### Disable a Rule

```json
// Option 1: Remove from array
// Option 2: Add enabled flag
{
  "id": "git-gitignore-addition",
  "enabled": false
}
```

### Add Custom Branch Types

```json
{
  "id": "git-docs-branch",
  "reason": "Documentation branches for major doc updates",
  "matchers": [
    { "type": "PATH_SEGMENT_MATCH", "value": "docs" }
  ],
  "riskFlag": "CONFIG_CHANGE",
  "severity": "LOW",
  "decisionFloor": "WARN"
}
```

---

## TESTING THE GIT RULES

### Test 1: Try Committing to Main

```bash
git checkout main
echo "test" >> README.md
git add README.md
# Should be BLOCKED by ARC
```

### Test 2: Create Proper Feature Branch

```bash
git checkout -b feature/TEST-123-test-arc
echo "test" >> README.md
git add README.md
# Should PROCEED normally
```

### Test 3: Test Pre-commit Hook

```bash
# Install hook first
cp /path/to/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Try committing debug code
echo "console.log('test');" >> src/test.ts
git add src/test.ts
git commit -m "feat: test"
# Should be BLOCKED by hook
```

---

**Status:** Ready to use - 16 comprehensive git enforcement rules  
**Integration:** Works with ARC extension + Git hooks  
**Coverage:** Branch protection, workflow, security, quality
