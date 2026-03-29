# SDLC Blueprint: Git Operations Workflow

**Directive ID:** SDLC-GIT-001  
**Version:** 1.0  
**Last Updated:** 2026-03-29

---

## Objective

Ensure safe, consistent Git operations across the team:
- Prevent destructive operations
- Enforce branching strategy
- Maintain clean commit history
- Protect production branches

---

## BRANCHING STRATEGY

### Branch Types & Naming Conventions

| Branch Type | Pattern | Lifetime | Purpose | Example |
|-------------|---------|----------|---------|---------|
| **Main** | `main` | Permanent | Production code | `main` |
| **Development** | `develop` | Permanent | Integration branch | `develop` |
| **Feature** | `feature/TICKET-description` | Temporary | New features | `feature/DOC-123-export-pdf` |
| **Bugfix** | `bugfix/TICKET-description` | Temporary | Bug fixes | `bugfix/DOC-456-validation-error` |
| **Hotfix** | `hotfix/INC-timestamp-description` | Temporary | Production fixes | `hotfix/INC-2026-03-29-login-down` |
| **Release** | `release/v1.2.3` | Temporary | Release prep | `release/v1.2.3` |
| **Experimental** | `experiment/description` | Temporary | POCs/spikes | `experiment/graphql-migration` |

---

## GIT OPERATION WORKFLOWS

### 1. CREATE FEATURE BRANCH

**When:** Starting new feature development

**Process:**
```bash
# 1. Ensure main is up to date
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/DOC-123-export-pdf

# 3. Push to remote (set upstream)
git push -u origin feature/DOC-123-export-pdf

# 4. Create draft PR (optional)
gh pr create --draft --title "[WIP] DOC-123: PDF Export"
```

**Checklist:**
- [ ] Branch created from latest main
- [ ] Branch name follows convention
- [ ] Ticket number included in branch name
- [ ] Pushed to remote with upstream

---

### 2. COMMIT CHANGES

**When:** Saving work incrementally

**Commit Message Format (Conventional Commits):**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes nor adds feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, tooling
- `ci`: CI/CD changes
- `revert`: Revert previous commit

**Examples:**
```bash
# Good commit messages
git commit -m "feat(auth): add OAuth2 login support"
git commit -m "fix(validation): handle empty email field"
git commit -m "docs(readme): update installation instructions"
git commit -m "refactor(api): extract validation logic to utils"

# Bad commit messages
git commit -m "fixes"
git commit -m "WIP"
git commit -m "asdfasdf"
git commit -m "update"
```

**Atomic Commits Best Practices:**
```bash
# ✅ GOOD: One logical change per commit
git add src/auth/oauth.ts
git commit -m "feat(auth): add OAuth2 provider"

git add src/auth/oauth.test.ts
git commit -m "test(auth): add OAuth2 provider tests"

# ❌ BAD: Multiple unrelated changes
git add .
git commit -m "feat: lots of stuff"
```

**Checklist:**
- [ ] Commit is atomic (one logical change)
- [ ] Message follows conventional commit format
- [ ] Message is descriptive (not "fix", "update", "WIP")
- [ ] Tests included (if applicable)
- [ ] No debug code included

---

### 3. PUSH CHANGES

**When:** Sharing work with team or backing up

**Safe Push:**
```bash
# Standard push
git push origin feature/DOC-123-export-pdf

# Push with lease (safer, checks remote state)
git push --force-with-lease origin feature/DOC-123-export-pdf
```

**Force Push (DANGEROUS - Use with Caution):**
```bash
# ⚠️ Only use force push on YOUR OWN feature branches
# NEVER force push to main, develop, or shared branches

# If you must force push (after rebase):
git push --force-with-lease origin feature/DOC-123-export-pdf

# NEVER use plain --force (can lose others' work)
git push --force origin feature/DOC-123-export-pdf  # ❌ DON'T DO THIS
```

**Checklist:**
- [ ] Working on your own feature branch
- [ ] Not force pushing to shared branches
- [ ] Using `--force-with-lease` instead of `--force`
- [ ] Remote is up to date (or acknowledged divergence)

---

### 4. PULL CHANGES

**When:** Getting latest changes from remote

**Safe Pull:**
```bash
# Pull with rebase (keeps history linear)
git pull --rebase origin main

# Pull with merge (creates merge commit)
git pull origin main

# Fetch first to see what changed
git fetch origin
git log origin/main..main  # See what's different
git pull origin main
```

**Handling Conflicts:**
```bash
# If conflicts occur during pull/rebase
# 1. See which files have conflicts
git status

# 2. Open conflicted files and resolve
# Look for conflict markers:
# <<<<<<< HEAD
# Your changes
# =======
# Their changes
# >>>>>>> branch-name

# 3. Mark as resolved
git add <resolved-file>

# 4. Continue rebase (if rebasing)
git rebase --continue

# OR abort if you need to start over
git rebase --abort
```

**Checklist:**
- [ ] Branch is clean (no uncommitted changes)
- [ ] Using `--rebase` for cleaner history
- [ ] Conflicts resolved properly
- [ ] Tests still passing after merge/rebase

---

### 5. MERGE STRATEGIES

**When:** Integrating feature into main branch

**Strategy 1: Squash and Merge (Recommended for Features)**
```bash
# Combines all feature commits into one commit on main
# Keeps main history clean

# Via GitHub PR:
# Click "Squash and merge" button

# Via command line:
git checkout main
git merge --squash feature/DOC-123-export-pdf
git commit -m "feat(export): add PDF export functionality (#123)"
```

**When to use:**
- ✅ Feature branches with many small commits
- ✅ Work-in-progress commits that don't need to be preserved
- ✅ Want clean, linear main branch history

**Strategy 2: Merge Commit (For Complex Features)**
```bash
# Preserves all individual commits
# Shows feature branch structure

git checkout main
git merge --no-ff feature/DOC-123-export-pdf
```

**When to use:**
- ✅ Want to preserve detailed commit history
- ✅ Multiple developers worked on feature
- ✅ Need to track who did what

**Strategy 3: Rebase and Merge (For Linear History)**
```bash
# Replays feature commits on top of main
# Creates linear history without merge commits

git checkout feature/DOC-123-export-pdf
git rebase main
git checkout main
git merge --ff-only feature/DOC-123-export-pdf
```

**When to use:**
- ✅ Want completely linear history
- ✅ Solo developer on feature branch
- ✅ Team has strong rebase discipline

---

### 6. DELETE BRANCHES

**When:** After feature merged or abandoned

**Safe Delete:**
```bash
# Delete local branch (safe - prevents deleting unmerged)
git branch -d feature/DOC-123-export-pdf

# Force delete local branch (use with caution)
git branch -D feature/DOC-123-export-pdf

# Delete remote branch
git push origin --delete feature/DOC-123-export-pdf

# Prune stale remote branches
git fetch --prune
```

**Checklist:**
- [ ] Branch has been merged OR explicitly abandoned
- [ ] Code review completed (if applicable)
- [ ] No work-in-progress left behind
- [ ] Remote branch deleted too

---

### 7. HOTFIX WORKFLOW

**When:** Emergency production fix needed

**Fast-Track Process:**
```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/INC-2026-03-29-001-login-error

# 2. Make fix (keep changes minimal)
# Edit files...

# 3. Commit with incident reference
git commit -m "fix(auth): resolve login validation error

Incident: INC-2026-03-29-001
Root cause: Missing null check on email field
Impact: 100% of login attempts failing
Fix: Added email validation guard clause

Refs: #1234"

# 4. Push and create PR
git push -u origin hotfix/INC-2026-03-29-001-login-error
gh pr create --title "HOTFIX: Login validation error" --label "hotfix" --label "P0"

# 5. After merge, tag the release
git checkout main
git pull origin main
git tag -a v1.2.3-hotfix.1 -m "Hotfix: Login validation error"
git push origin v1.2.3-hotfix.1

# 6. Backport to develop if needed
git checkout develop
git cherry-pick <commit-hash>
git push origin develop

# 7. Delete hotfix branch
git branch -d hotfix/INC-2026-03-29-001-login-error
git push origin --delete hotfix/INC-2026-03-29-001-login-error
```

**Hotfix Checklist:**
- [ ] Created from main (not develop)
- [ ] Incident ticket referenced
- [ ] Changes are minimal (fix only)
- [ ] Tests included
- [ ] Expedited review completed
- [ ] Tagged after merge
- [ ] Backported to develop

---

### 8. RELEASE WORKFLOW

**When:** Preparing new version for production

**Release Process:**
```bash
# 1. Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.3.0

# 2. Update version numbers
npm version 1.3.0  # or manually edit package.json
git commit -m "chore(release): bump version to 1.3.0"

# 3. Update changelog
# Edit CHANGELOG.md with release notes
git add CHANGELOG.md
git commit -m "docs(changelog): add v1.3.0 release notes"

# 4. Push release branch
git push -u origin release/v1.3.0

# 5. Create release PR to main
gh pr create --base main --title "Release v1.3.0" --label "release"

# 6. After merge to main, tag the release
git checkout main
git pull origin main
git tag -a v1.3.0 -m "Release v1.3.0"
git push origin v1.3.0

# 7. Merge back to develop
git checkout develop
git merge main
git push origin develop

# 8. Delete release branch
git branch -d release/v1.3.0
git push origin --delete release/v1.3.0
```

**Release Checklist:**
- [ ] Version numbers updated
- [ ] Changelog updated
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Migration scripts tested
- [ ] Rollback plan documented
- [ ] Tagged after merge

---

### 9. REVERT COMMIT

**When:** Need to undo a problematic commit

**Safe Revert:**
```bash
# Revert creates a new commit that undoes changes
# Safe for shared branches (doesn't rewrite history)

# Revert most recent commit
git revert HEAD

# Revert specific commit
git revert <commit-hash>

# Revert multiple commits
git revert <oldest-hash>..<newest-hash>

# Revert a merge commit (need to specify parent)
git revert -m 1 <merge-commit-hash>
```

**When to use revert vs reset:**
```bash
# ✅ Use REVERT when:
# - Commit already pushed to shared branch
# - Need audit trail of the revert
# - Working on main/develop/release branches

# ⚠️ Use RESET when:
# - Commit only exists locally
# - Working on your own feature branch
# - Want to completely remove commit from history

git reset --hard HEAD~1  # DANGER: Loses work!
```

**Revert Checklist:**
- [ ] Identified problematic commit hash
- [ ] Tested revert locally
- [ ] Commit message explains why reverting
- [ ] PR created for revert (if on protected branch)
- [ ] Stakeholders notified

---

### 10. STASH MANAGEMENT

**When:** Need to save work temporarily

**Common Stash Operations:**
```bash
# Save current changes
git stash push -m "WIP: working on feature X"

# Save including untracked files
git stash push -u -m "WIP: including new files"

# List stashes
git stash list

# Apply most recent stash (keeps in stash list)
git stash apply

# Apply specific stash
git stash apply stash@{2}

# Pop most recent stash (removes from stash list)
git stash pop

# Show stash contents
git stash show -p stash@{0}

# Drop a stash
git stash drop stash@{0}

# Clear all stashes
git stash clear
```

**Stash Best Practices:**
- ✅ Always use `-m` to add descriptive message
- ✅ Apply stashes promptly (don't accumulate)
- ✅ Clean up old stashes regularly
- ❌ Don't use stash as permanent storage
- ❌ Don't stash sensitive data

---

## PROTECTED BRANCH RULES

### Main Branch Protection

**Required Checks:**
- [ ] Status checks must pass (CI/CD)
- [ ] At least 1 approval required
- [ ] Conversations must be resolved
- [ ] Branches must be up to date
- [ ] No force pushes allowed
- [ ] No deletions allowed

**Implementation:**
```yaml
# GitHub branch protection settings
branch: main
required_status_checks:
  strict: true
  contexts:
    - "ci/tests"
    - "ci/lint"
    - "ci/security-scan"
required_pull_request_reviews:
  required_approving_review_count: 1
  dismiss_stale_reviews: true
  require_code_owner_reviews: true
enforce_admins: true
restrictions: null
allow_force_pushes: false
allow_deletions: false
```

---

## GIT HOOKS

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running pre-commit checks..."

# 1. Prevent commits to main
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "main" ]; then
  echo "❌ Cannot commit directly to main branch!"
  exit 1
fi

# 2. Check for debug statements
if git diff --cached --name-only | grep -E '\.(js|ts)$' | xargs grep -n 'console\.\(log\|debug\)\|debugger'; then
  echo "❌ Debug statements found!"
  exit 1
fi

# 3. Check for merge conflict markers
if git diff --cached | grep -E '^(<{7}|={7}|>{7})'; then
  echo "❌ Merge conflict markers found!"
  exit 1
fi

# 4. Run linter
npm run lint-staged
if [ $? -ne 0 ]; then
  echo "❌ Linting failed!"
  exit 1
fi

echo "✅ Pre-commit checks passed!"
exit 0
```

### Commit-msg Hook
```bash
#!/bin/bash
# .git/hooks/commit-msg

COMMIT_MSG=$(cat "$1")

# Check for conventional commit format
if ! echo "$COMMIT_MSG" | grep -qE '^(feat|fix|docs|style|refactor|perf|test|chore|ci|revert)(\(.+\))?: .+'; then
  echo "❌ Commit message must follow conventional commits format!"
  echo "Example: feat(auth): add OAuth2 support"
  exit 1
fi

# Check minimum message length
if [ ${#COMMIT_MSG} -lt 10 ]; then
  echo "❌ Commit message too short!"
  exit 1
fi

# Check for WIP commits
if echo "$COMMIT_MSG" | grep -iqE '^(wip|fixup|squash)'; then
  echo "⚠️  WIP/fixup/squash commits should be squashed before merge"
  # Don't block, just warn
fi

exit 0
```

### Pre-push Hook
```bash
#!/bin/bash
# .git/hooks/pre-push

BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Prevent force push to protected branches
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "develop" ]; then
  if echo "$2" | grep -q '\+'; then
    echo "❌ Force push to $BRANCH is not allowed!"
    exit 1
  fi
fi

# Run tests before push
echo "Running tests before push..."
npm test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed! Fix before pushing."
  exit 1
fi

exit 0
```

---

## GIT BEST PRACTICES

### DO:
- ✅ Commit early and often
- ✅ Write descriptive commit messages
- ✅ Pull before push
- ✅ Use feature branches
- ✅ Review your own changes before PR
- ✅ Keep commits atomic
- ✅ Rebase feature branches on main
- ✅ Delete merged branches

### DON'T:
- ❌ Commit directly to main
- ❌ Force push to shared branches
- ❌ Commit commented-out code
- ❌ Commit secrets or credentials
- ❌ Make giant commits (500+ lines)
- ❌ Use generic commit messages
- ❌ Commit generated files
- ❌ Leave branches unmerged forever

---

## COMMON GIT PROBLEMS & SOLUTIONS

### Problem 1: "I committed to the wrong branch"

**Solution:**
```bash
# Move commit to correct branch
git checkout correct-branch
git cherry-pick <commit-hash>

# Remove from wrong branch
git checkout wrong-branch
git reset --hard HEAD~1
```

### Problem 2: "I need to undo my last commit"

**Solution:**
```bash
# Keep changes, undo commit
git reset --soft HEAD~1

# Discard changes completely
git reset --hard HEAD~1

# Already pushed? Use revert instead
git revert HEAD
```

### Problem 3: "I have merge conflicts"

**Solution:**
```bash
# See conflicted files
git status

# Open file, look for markers:
# <<<<<<< HEAD
# Your changes
# =======
# Their changes
# >>>>>>> branch

# Resolve manually, then:
git add <resolved-file>
git commit  # or git rebase --continue
```

### Problem 4: "My branch is behind main"

**Solution:**
```bash
# Option 1: Rebase (cleaner)
git checkout feature-branch
git fetch origin
git rebase origin/main

# Option 2: Merge
git checkout feature-branch
git merge origin/main
```

### Problem 5: "I accidentally committed a secret"

**Solution:**
```bash
# If not pushed yet:
git reset --soft HEAD~1
# Remove secret from files
git add .
git commit

# If already pushed (URGENT):
# 1. Rotate the secret immediately
# 2. Use git filter-branch or BFG Repo-Cleaner
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/secret" \
  --prune-empty --tag-name-filter cat -- --all

# 3. Force push (coordinate with team)
git push --force --all
```

---

## GIT ALIASES (Productivity)

Add to `~/.gitconfig`:

```bash
[alias]
  # Status shortcuts
  st = status -sb
  s = status
  
  # Commit shortcuts
  cm = commit -m
  ca = commit --amend
  can = commit --amend --no-edit
  
  # Branch shortcuts
  co = checkout
  cob = checkout -b
  br = branch
  brd = branch -d
  
  # Log shortcuts
  lg = log --graph --oneline --decorate --all
  last = log -1 HEAD
  
  # Diff shortcuts
  d = diff
  ds = diff --staged
  
  # Pull/push shortcuts
  pl = pull --rebase
  ps = push
  psf = push --force-with-lease
  
  # Stash shortcuts
  sl = stash list
  ss = stash save
  sp = stash pop
  
  # Cleanup
  prune-branches = !git branch --merged | grep -v '\\*\\|main\\|develop' | xargs -n 1 git branch -d
```

---

## ACCEPTANCE CRITERIA

### For Feature Branch Workflow
1. ✅ Branch created from latest main
2. ✅ Branch name follows convention
3. ✅ Commits follow conventional format
4. ✅ No commits directly to main
5. ✅ Branch merged via PR
6. ✅ Branch deleted after merge

### For Hotfix Workflow
1. ✅ Created from main (not develop)
2. ✅ Incident ticket referenced
3. ✅ Expedited review completed
4. ✅ Tagged after merge
5. ✅ Backported to develop

### For Release Workflow
1. ✅ Version numbers updated
2. ✅ Changelog complete
3. ✅ All tests passing
4. ✅ Tagged on main
5. ✅ Merged back to develop

---

## CONSTRAINTS

### Must NOT:
- ❌ Commit directly to main or develop
- ❌ Force push to shared branches
- ❌ Commit secrets or credentials
- ❌ Use generic commit messages
- ❌ Delete others' branches without permission
- ❌ Rewrite shared history

### Must:
- ✅ Use conventional commit messages
- ✅ Create feature branches for all work
- ✅ Pull before push
- ✅ Delete branches after merge
- ✅ Tag releases
- ✅ Resolve conflicts carefully

---

## METRICS TO TRACK

### Branch Metrics
- **Active Branches:** Count of unmerged branches
- **Stale Branches:** Branches > 30 days old
- **Branch Lifetime:** Average time from create to merge

### Commit Metrics
- **Commit Frequency:** Commits per day/week
- **Commit Size:** Lines changed per commit
- **Message Quality:** % following conventional commits

### Merge Metrics
- **Time to Merge:** PR created → merged
- **Merge Conflicts:** Frequency and resolution time
- **Revert Rate:** % of commits reverted

### Target SLAs
- Active branches: < 10 per developer
- Stale branches: < 5% of total branches
- Commit message compliance: > 90%
- Time to merge: < 24 hours for features

---

## RELATED BLUEPRINTS

- `SDLC-FEATURE-DEV.md` - Feature development workflow
- `SDLC-CODE-REVIEW.md` - Code review checklist
- `SDLC-DEPLOYMENT.md` - Deployment process
- `SDLC-HOTFIX.md` - Emergency fix workflow
- `SDLC-DEBUG-001.md` - Debugging & incident response

---

## ADDITIONAL RESOURCES

### Tools
- GitHub CLI: `gh`
- GitKraken: Visual Git client
- SourceTree: Git GUI
- Git-flow: Branching model helper

### Reading
- "Pro Git" by Scott Chacon
- "Git Best Practices" by Seth Robertson
- GitHub Flow documentation
- Conventional Commits specification

---

**Last Review:** 2026-03-29  
**Next Review:** Quarterly or after major process changes
