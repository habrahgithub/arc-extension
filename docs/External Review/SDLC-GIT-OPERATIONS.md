# SDLC Blueprint: Git Operations Workflow

**Directive ID:** SDLC-GIT-001  
**Version:** 1.0  
**Last Updated:** 2026-03-29

---

## Objective

Establish standardized Git operations that ensure:
- Clean, readable commit history
- Traceable changes via commit messages
- Safe collaboration through branching strategy
- Recoverable state via proper tagging
- Audit trail for compliance

---

## PART 1: BRANCHING STRATEGY

### Branch Types & Naming

| Branch Type | Pattern | Purpose | Lifetime | Merge Target |
|-------------|---------|---------|----------|--------------|
| **Main** | `main` | Production-ready code | Permanent | N/A |
| **Develop** | `develop` | Integration branch | Permanent | `main` |
| **Feature** | `feature/TICKET-123-description` | New features | Temporary | `develop` or `main` |
| **Bugfix** | `bugfix/TICKET-456-description` | Non-critical fixes | Temporary | `develop` or `main` |
| **Hotfix** | `hotfix/INC-789-description` | Critical production fixes | Temporary | `main` + `develop` |
| **Release** | `release/v1.2.0` | Release preparation | Temporary | `main` + `develop` |
| **Experiment** | `experiment/spike-name` | POCs, spikes | Temporary | None (delete) |

### Branch Naming Rules

**Format:**
```
<type>/<ticket-id>-<short-description>
```

**Examples:**
```bash
✅ GOOD:
feature/DOC-123-add-export-pdf
bugfix/BUG-456-fix-login-timeout
hotfix/INC-789-patch-memory-leak
release/v2.1.0

❌ BAD:
feature-add-stuff          # No ticket reference
fix                        # Too vague
john-working-on-feature    # Personal branch name
FEATURE/BIG_CHANGES        # Wrong case, unclear
```

**Rules:**
- Lowercase only
- Hyphens for word separation
- No spaces
- Include ticket/issue ID
- Descriptive but concise (< 50 chars total)

---

## PART 2: COMMIT MESSAGE STANDARDS

### Conventional Commits Format

**Structure:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

| Type | When to Use | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add OAuth2 login` |
| `fix` | Bug fix | `fix(api): handle null response` |
| `docs` | Documentation only | `docs(readme): update setup steps` |
| `style` | Code formatting (no logic) | `style(lint): fix eslint warnings` |
| `refactor` | Code restructure (no behavior change) | `refactor(db): extract query builder` |
| `perf` | Performance improvement | `perf(cache): implement Redis caching` |
| `test` | Add/modify tests | `test(api): add integration tests` |
| `build` | Build system changes | `build(webpack): upgrade to v5` |
| `ci` | CI/CD changes | `ci(github): add security scan` |
| `chore` | Maintenance tasks | `chore(deps): update dependencies` |
| `revert` | Revert previous commit | `revert: feat(auth): add OAuth2` |

### Commit Message Examples

#### ✅ GOOD Examples

```bash
feat(auth): add OAuth2 login support

Implements OAuth2 authentication flow with Google and GitHub providers.
Includes token refresh logic and session management.

Resolves: #123
See also: #124, #125
```

```bash
fix(api): prevent race condition in user creation

Add mutex lock to ensure atomic user creation operations.
Previously, concurrent requests could create duplicate users.

Fixes: #456
```

```bash
docs(contributing): add PR template guidelines

Updates CONTRIBUTING.md with:
- PR title format
- Required checklist items
- Review process steps
```

#### ❌ BAD Examples

```bash
# Too vague
fix bug

# No context
update code

# Not following format
Fixed the login issue that was reported

# Multiple changes
feat: add login, fix signup, update docs
```

### Subject Line Rules

- **Imperative mood**: "add feature" not "added feature"
- **No period** at end
- **Max 50 characters** (enforced by git hook)
- **Start with lowercase** after type
- **Be specific**: What changed and why?

### Body Guidelines

- **Wrap at 72 characters** (enforced by git hook)
- **Explain WHAT and WHY**, not HOW (code shows how)
- **Include context** for non-obvious changes
- **Reference issues/tickets**
- **Optional** for small, obvious changes

### Footer

**Use for:**
- Breaking changes: `BREAKING CHANGE: describe impact`
- Issue references: `Fixes: #123`, `Resolves: #456`
- Co-authors: `Co-authored-by: Name <email>`
- Deprecations: `Deprecated: old API endpoint`

---

## PART 3: WORKING WITH BRANCHES

### Creating Feature Branch

```bash
# 1. Ensure main is up to date
git checkout main
git pull origin main

# 2. Create and checkout feature branch
git checkout -b feature/TICKET-123-add-pdf-export

# 3. Verify branch
git branch
# Should show: * feature/TICKET-123-add-pdf-export

# 4. Push to remote (sets upstream)
git push -u origin feature/TICKET-123-add-pdf-export
```

### Making Commits

```bash
# 1. Stage specific files (prefer over git add .)
git add src/components/PDFExport.tsx
git add src/api/export.ts

# 2. Check what's staged
git status
git diff --staged

# 3. Commit with good message
git commit -m "feat(export): add PDF export component

Implements PDF export using jsPDF library.
Includes:
- Custom page layouts
- Header/footer templates
- Image embedding

Resolves: #123"

# 4. Push to remote
git push
```

### Updating Feature Branch

```bash
# Option 1: Rebase (recommended - cleaner history)
git checkout feature/TICKET-123-add-pdf-export
git fetch origin
git rebase origin/main

# If conflicts, resolve them then:
git add <resolved-files>
git rebase --continue

# Force push (required after rebase)
git push --force-with-lease

# Option 2: Merge (preserves history)
git checkout feature/TICKET-123-add-pdf-export
git fetch origin
git merge origin/main

# Resolve conflicts if any
git add <resolved-files>
git commit

git push
```

### Interactive Rebase (Cleaning History)

```bash
# Rebase last 3 commits
git rebase -i HEAD~3

# In editor, choose actions:
# pick   = use commit as-is
# reword = edit commit message
# edit   = amend commit
# squash = combine with previous commit
# fixup  = like squash but discard message
# drop   = remove commit

# Example:
pick  abc123 feat(export): add PDF component
squash def456 fix typo
squash ghi789 fix linting
reword jkl012 test(export): add PDF tests

# Results in 2 clean commits instead of 4
```

---

## PART 4: PULL REQUEST WORKFLOW

### Before Creating PR

**Pre-PR Checklist:**
- [ ] Branch up to date with target (rebase if needed)
- [ ] All tests passing locally
- [ ] Linter warnings resolved
- [ ] Self-review completed
- [ ] No debug code (console.log, debugger)
- [ ] Documentation updated
- [ ] Commit messages follow convention

### Creating PR

**PR Title Format:**
```
<type>(<scope>): <description> [TICKET-123]
```

**Examples:**
```
feat(auth): Add OAuth2 login [DOC-123]
fix(api): Prevent race condition in user creation [BUG-456]
docs(readme): Update installation steps [DOC-789]
```

**PR Description Template:**
```markdown
## Summary
Brief description of changes (1-2 sentences)

## Changes
- Added PDF export component
- Updated API to support export endpoint
- Added tests for export functionality

## Testing
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Manual testing completed
- [ ] Edge cases covered

## Screenshots (if UI changes)
[Add screenshots or GIFs]

## Breaking Changes
None / [Description of breaking changes]

## Related Issues
Resolves: #123
See also: #124, #125

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No linter warnings
```

### Code Review Process

**For Author:**
1. Respond to all review comments
2. Push fixes as new commits (don't force-push during review)
3. Re-request review after addressing feedback
4. Squash/clean commits after approval, before merge

**For Reviewer:**
1. Review within 4 hours (P1) or 24 hours (normal)
2. Check for:
   - Logic correctness
   - Edge cases
   - Security issues
   - Performance implications
   - Test coverage
   - Code style/readability
3. Use review types appropriately:
   - **Comment**: Suggestion, non-blocking
   - **Approve**: Ready to merge
   - **Request Changes**: Must be addressed

### Merging Strategies

**1. Squash and Merge (Recommended for Features)**
```bash
# On GitHub/GitLab: Click "Squash and Merge"
# OR manually:
git checkout main
git merge --squash feature/TICKET-123-add-pdf-export
git commit -m "feat(export): add PDF export functionality [#123]"
git push origin main
```

**Pros:**
- Clean, linear history on main
- One commit per feature
- Easy to revert entire feature

**Cons:**
- Loses individual commit detail
- Can't cherry-pick specific commits

**2. Rebase and Merge (For Clean Feature Branches)**
```bash
# Rebase feature branch first
git checkout feature/TICKET-123-add-pdf-export
git rebase main
git push --force-with-lease

# Then merge (fast-forward)
git checkout main
git merge feature/TICKET-123-add-pdf-export
git push origin main
```

**Pros:**
- Linear history
- Preserves individual commits
- Can cherry-pick commits

**Cons:**
- Requires clean commit history
- More complex for beginners

**3. Merge Commit (For Release Branches)**
```bash
git checkout main
git merge --no-ff release/v1.2.0
git push origin main
```

**Pros:**
- Preserves full branch history
- Shows exact merge points
- Good for releases

**Cons:**
- Non-linear history
- More complex git log

### When to Use Each Strategy

| Strategy | Use For | Avoid For |
|----------|---------|-----------|
| **Squash** | Features, bugfixes, small PRs | Releases, hotfixes with important history |
| **Rebase** | Clean feature branches | Shared branches, messy history |
| **Merge Commit** | Releases, important feature sets | Small changes, daily work |

---

## PART 5: HOTFIX WORKFLOW

### Emergency Production Fix

```bash
# 1. Create hotfix from main (production)
git checkout main
git pull origin main
git checkout -b hotfix/INC-2026-03-29-001-memory-leak

# 2. Make minimal fix
# (edit files)

# 3. Commit with incident reference
git add src/memory-manager.ts
git commit -m "fix(memory): patch memory leak in event handlers [INC-001]

Removes event listeners on component unmount to prevent memory leak.
This was causing production memory exhaustion.

Critical fix for P0 incident.
Incident: INC-2026-03-29-001
RCA: docs/incidents/INC-001-postmortem.md"

# 4. Test thoroughly
npm test
npm run e2e

# 5. Push and create PR
git push -u origin hotfix/INC-2026-03-29-001-memory-leak

# 6. Get expedited review

# 7. Merge to main
git checkout main
git merge hotfix/INC-2026-03-29-001-memory-leak
git tag v1.2.1-hotfix
git push origin main --tags

# 8. CRITICAL: Also merge to develop
git checkout develop
git merge hotfix/INC-2026-03-29-001-memory-leak
git push origin develop

# 9. Delete hotfix branch
git branch -d hotfix/INC-2026-03-29-001-memory-leak
git push origin --delete hotfix/INC-2026-03-29-001-memory-leak
```

**Hotfix Rules:**
- ✅ Minimal changes only
- ✅ Must include tests
- ✅ Merge to BOTH main and develop
- ✅ Tag with version bump
- ❌ No refactoring
- ❌ No new features
- ❌ No scope creep

---

## PART 6: RELEASE WORKFLOW

### Preparing Release

```bash
# 1. Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# 2. Bump version
npm version minor  # Updates package.json, creates git tag
# OR manually edit version files

# 3. Update changelog
# Edit CHANGELOG.md with release notes

# 4. Commit version bump
git add package.json CHANGELOG.md
git commit -m "chore(release): bump version to v1.2.0"

# 5. Push release branch
git push -u origin release/v1.2.0

# 6. Test thoroughly (QA, staging)
# - Run full test suite
# - Deploy to staging
# - Perform smoke tests
# - Get QA sign-off

# 7. Merge to main (production)
git checkout main
git merge --no-ff release/v1.2.0
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin main --tags

# 8. Merge back to develop
git checkout develop
git merge --no-ff release/v1.2.0
git push origin develop

# 9. Delete release branch
git branch -d release/v1.2.0
git push origin --delete release/v1.2.0
```

### Version Numbering (Semantic Versioning)

**Format:** `MAJOR.MINOR.PATCH` (e.g., `v1.2.3`)

| Change Type | Increment | Example |
|-------------|-----------|---------|
| Breaking changes | MAJOR | `1.2.3` → `2.0.0` |
| New features (backward compatible) | MINOR | `1.2.3` → `1.3.0` |
| Bug fixes (backward compatible) | PATCH | `1.2.3` → `1.2.4` |

**Pre-release versions:**
- Alpha: `v1.3.0-alpha.1`
- Beta: `v1.3.0-beta.1`
- RC: `v1.3.0-rc.1`

### Git Tags

```bash
# Create annotated tag (recommended)
git tag -a v1.2.0 -m "Release version 1.2.0

Features:
- PDF export
- OAuth2 login
- Dashboard improvements

Bug fixes:
- Memory leak in event handlers
- Race condition in user creation
"

# Push tags
git push origin v1.2.0
# OR push all tags
git push origin --tags

# List tags
git tag -l

# Show tag details
git show v1.2.0

# Delete tag (if mistake)
git tag -d v1.2.0
git push origin :refs/tags/v1.2.0
```

---

## PART 7: CONFLICT RESOLUTION

### When Conflicts Occur

```bash
# During rebase
git rebase origin/main
# CONFLICT (content): Merge conflict in src/api.ts

# 1. Check conflicted files
git status
# Shows: both modified: src/api.ts

# 2. Open file and resolve
# Look for conflict markers:
<<<<<<< HEAD
// Your changes
const result = fetchData();
=======
// Incoming changes
const data = getData();
>>>>>>> origin/main

# 3. Edit to desired state
const result = fetchData();  // Keep your version
# OR
const data = getData();  // Keep incoming version
# OR combine both

# 4. Remove conflict markers
# Final file should have NO <<<<, ====, >>>> markers

# 5. Mark as resolved
git add src/api.ts

# 6. Continue rebase
git rebase --continue

# If too complex, abort
git rebase --abort
```

### Conflict Prevention

**Best Practices:**
1. **Pull frequently** (at least daily)
2. **Keep PRs small** (< 400 lines)
3. **Communicate** about overlapping work
4. **Rebase often** to stay current
5. **Don't modify same files** simultaneously

---

## PART 8: GIT HOOKS

### Pre-commit Hook

**Purpose:** Prevent bad commits

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running pre-commit checks..."

# Check for debug statements
if git diff --cached --name-only | grep -E '\.(js|ts)$' | xargs grep -n 'console\.\(log\|debug\)\|debugger' 2>/dev/null; then
  echo "❌ Debug statements found. Remove before commit."
  exit 1
fi

# Check for merge conflict markers
if git diff --cached | grep -E '^(<<<<<<<|=======|>>>>>>>)'; then
  echo "❌ Merge conflict markers found."
  exit 1
fi

# Run linter
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linter errors found."
  exit 1
fi

# Run tests
npm test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed."
  exit 1
fi

echo "✅ Pre-commit checks passed"
exit 0
```

### Commit-msg Hook

**Purpose:** Enforce commit message format

```bash
#!/bin/bash
# .git/hooks/commit-msg

commit_msg=$(cat "$1")

# Check format: type(scope): subject
if ! echo "$commit_msg" | grep -qE '^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?: .{1,50}'; then
  echo "❌ Invalid commit message format"
  echo ""
  echo "Expected format: type(scope): subject"
  echo "Example: feat(auth): add OAuth2 login"
  echo ""
  echo "Valid types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert"
  exit 1
fi

# Check subject length
subject_line=$(echo "$commit_msg" | head -n 1)
if [ ${#subject_line} -gt 72 ]; then
  echo "❌ Commit subject too long (max 72 chars)"
  exit 1
fi

echo "✅ Commit message format valid"
exit 0
```

### Pre-push Hook

**Purpose:** Prevent pushing bad code

```bash
#!/bin/bash
# .git/hooks/pre-push

echo "Running pre-push checks..."

# Run full test suite
npm run test:all
if [ $? -ne 0 ]; then
  echo "❌ Full test suite failed"
  exit 1
fi

# Check for main/master direct push (if using PR workflow)
current_branch=$(git symbolic-ref --short HEAD)
if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
  echo "❌ Direct push to main/master not allowed. Use PRs."
  exit 1
fi

echo "✅ Pre-push checks passed"
exit 0
```

---

## PART 9: BRANCH CLEANUP

### Deleting Merged Branches

```bash
# Delete local branch (after merge)
git branch -d feature/TICKET-123-add-pdf-export

# Delete remote branch
git push origin --delete feature/TICKET-123-add-pdf-export

# Delete all local branches that are merged to main
git branch --merged main | grep -v "main" | xargs git branch -d

# Prune deleted remote branches
git fetch --prune
git remote prune origin
```

### Finding Stale Branches

```bash
# List branches sorted by last commit date
git for-each-ref --sort=-committerdate refs/heads/ --format='%(committerdate:short) %(refname:short)'

# Find branches older than 30 days
git for-each-ref --sort=-committerdate refs/heads/ --format='%(committerdate:short) %(refname:short)' | awk '$1 < "'$(date -d '30 days ago' +%Y-%m-%d)'"'

# Delete branches not updated in 60 days (interactive)
git for-each-ref --sort=-committerdate refs/heads/ --format='%(refname:short)' | while read branch; do
  last_commit=$(git log -1 --format=%ct "$branch")
  now=$(date +%s)
  days_old=$(( ($now - $last_commit) / 86400 ))
  
  if [ $days_old -gt 60 ]; then
    echo "Delete $branch (${days_old} days old)? [y/N]"
    read answer
    if [ "$answer" = "y" ]; then
      git branch -D "$branch"
    fi
  fi
done
```

---

## PART 10: ADVANCED GIT OPERATIONS

### Cherry-picking Commits

**Use Case:** Apply specific commits from one branch to another

```bash
# Find commit hash
git log --oneline feature/other-branch

# Cherry-pick specific commit
git checkout main
git cherry-pick abc1234

# Cherry-pick range of commits
git cherry-pick abc1234^..def5678

# Cherry-pick without committing (to modify first)
git cherry-pick -n abc1234
# Make changes
git commit -m "feat(x): cherry-picked and modified feature"
```

### Reverting Commits

```bash
# Revert single commit (creates new commit)
git revert abc1234

# Revert multiple commits
git revert abc1234 def5678

# Revert merge commit
git revert -m 1 abc1234  # -m 1 keeps first parent

# Revert without committing (to batch reverts)
git revert -n abc1234
git revert -n def5678
git commit -m "revert: undo problematic changes"
```

### Bisect (Finding Bug Introduction)

```bash
# Start bisect
git bisect start

# Mark current as bad
git bisect bad

# Mark known good commit
git bisect good abc1234

# Git will checkout middle commit
# Test if bug exists
npm test

# Mark as good or bad
git bisect good  # or bad

# Repeat until git finds first bad commit

# Reset when done
git bisect reset
```

### Stashing Changes

```bash
# Stash uncommitted changes
git stash

# Stash with message
git stash save "WIP: working on feature X"

# List stashes
git stash list

# Apply latest stash (keeps stash)
git stash apply

# Apply specific stash
git stash apply stash@{1}

# Apply and delete stash
git stash pop

# Create branch from stash
git stash branch feature/new-work

# Delete stash
git stash drop stash@{0}

# Clear all stashes
git stash clear
```

---

## PART 11: GIT CONFIGURATION

### User Configuration

```bash
# Set name and email (per repository)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Set globally
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# View configuration
git config --list
git config user.name
```

### Aliases

```bash
# Set up useful aliases
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual 'log --oneline --graph --all'

# Use aliases
git co main
git br
git visual
```

### Default Branch

```bash
# Set default branch name for new repos
git config --global init.defaultBranch main

# Rename existing master to main
git branch -m master main
git push -u origin main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
```

---

## ACCEPTANCE CRITERIA

### For Every Commit
1. ✅ Follows conventional commit format
2. ✅ Subject < 72 characters
3. ✅ Descriptive, clear message
4. ✅ References ticket/issue (if applicable)
5. ✅ No debug code

### For Every Branch
1. ✅ Follows naming convention
2. ✅ Created from correct base branch
3. ✅ Up to date with target branch
4. ✅ Deleted after merge

### For Every PR
1. ✅ Clear title and description
2. ✅ All tests passing
3. ✅ Code review approved
4. ✅ Conflicts resolved
5. ✅ Ready to merge

### For Every Release
1. ✅ Version bumped correctly
2. ✅ Changelog updated
3. ✅ Tagged appropriately
4. ✅ Merged to main and develop
5. ✅ Release branch deleted

---

## CONSTRAINTS

### Must NOT
- ❌ Commit directly to main (use PRs)
- ❌ Force-push to shared branches
- ❌ Rewrite published history
- ❌ Commit secrets/credentials
- ❌ Leave branches stale > 30 days
- ❌ Skip commit messages

### Must
- ✅ Use conventional commits
- ✅ Keep commits atomic (one logical change)
- ✅ Test before committing
- ✅ Rebase feature branches regularly
- ✅ Delete merged branches
- ✅ Tag releases

---

## TROUBLESHOOTING

### Common Issues

**"I committed to main by accident"**
```bash
# Create branch from current state
git branch feature/save-my-work

# Reset main to origin
git checkout main
git reset --hard origin/main

# Continue work on feature branch
git checkout feature/save-my-work
```

**"I need to undo last commit"**
```bash
# Undo commit, keep changes staged
git reset --soft HEAD~1

# Undo commit, keep changes unstaged
git reset HEAD~1

# Undo commit, discard changes (DANGEROUS)
git reset --hard HEAD~1
```

**"I committed secrets/passwords"**
```bash
# Remove from last commit
git reset --soft HEAD~1
# Edit file to remove secrets
git add <file>
git commit

# Already pushed? Use BFG or git-filter-repo
# (beyond scope - contact security team)
```

---

## METRICS

Track these metrics for git health:

- **Commit Size**: Average lines changed per commit (target: < 400)
- **Commit Frequency**: Commits per developer per day (target: 3-5)
- **Branch Lifetime**: Days from create to merge (target: < 3)
- **PR Size**: Lines changed per PR (target: < 400)
- **Review Time**: Hours from PR create to merge (target: < 24)
- **Stale Branches**: Branches > 30 days old (target: 0)

---

## RELATED BLUEPRINTS

- `SDLC-FEATURE-DEV.md` - Feature development workflow
- `SDLC-CODE-REVIEW.md` - Code review standards
- `SDLC-DEBUG-001.md` - Debugging & incident response
- `SDLC-DEPLOYMENT.md` - Deployment process

---

**Last Review:** 2026-03-29  
**Next Review:** Quarterly or after workflow changes
