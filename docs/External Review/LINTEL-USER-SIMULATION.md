# LINTEL/ARC User Simulation - Questions & Issues Log

**Simulation Date:** 2026-03-28  
**Method:** Multi-persona user testing simulation  
**Objective:** Identify real-world friction points, confusion, and missing documentation

---

## SIMULATION SESSION 1: New User (Junior Developer - Sarah)

**Background:** Sarah is a junior full-stack developer who just joined a team using ARC. She's comfortable with VS Code but hasn't used governance tools before.

---

### 📝 Installation Experience

**Sarah's Action:** Installed "ARC — Audit Ready Core" from VS Code marketplace

**Expected:** Welcome screen, getting started guide, or some indication it's working  
**Actual:** Nothing visible happened  
**Sarah's Reaction:** "Wait... is it actually installed? How do I know?"

**Issue #1:** No first-run activation feedback
- **Severity:** HIGH (user abandonment risk)
- **User Quote:** "I expected SOMETHING to happen when I installed it"
- **Fix:** Auto-show welcome screen on first activation

---

**Sarah's Action:** Opened Command Palette, typed "ARC"

**Found:** 15 different commands  
**Sarah's Reaction:** "Whoa... that's a lot. Which one do I use?"

**Issue #2:** Too many commands, no guidance on where to start
- **Severity:** MEDIUM
- **User Quote:** "I see 'Review Home', 'Decision Feed', 'Audit Timeline'... I don't know what any of these mean"
- **Fix:** Reduce visible commands, show only "Show Welcome Guide" and "Review Home" until user is onboarded

---

### 📝 First Save Test

**Sarah's Action:** Opened existing file `HomePage.tsx`, changed a color, saved

**Expected:** Something should happen (she read the README)  
**Actual:** File saved normally, no visible feedback  
**Sarah's Reaction:** "Is ARC even running? I thought it was supposed to intercept saves?"

**Issue #3:** No feedback on LOW risk saves
- **Severity:** HIGH (users can't tell if extension is working)
- **User Quote:** "How do I know it's not just broken?"
- **Fix:** Add status bar indicator: "ARC: Monitoring (3 saves today, 0 blocked)"

---

**Sarah's Action:** Created a new file `auth.ts`, added code, saved

**Expected:** Enforcement dialog  
**Actual:** Got modal: "Authentication-sensitive paths require an explicit plan acknowledgment."  
**Sarah's Reaction:** "What's a 'plan acknowledgment'? What do I do now?"

**Issue #4:** Enforcement messages use technical jargon
- **Severity:** HIGH
- **User Quote:** "I don't know what this is asking me to do"
- **Fix:** Rewrite messages in plain English with actionable steps

---

### 📝 Understanding Decisions

**Sarah's Question:** "What's the difference between WARN and REQUIRE_PLAN?"

**Where she looked:** 
- README → found table showing decisions but no examples
- Welcome guide → not visible (didn't know to run the command)
- In-editor docs → none exist

**Sarah's Reaction:** "I guess WARN is like a yellow light and REQUIRE_PLAN is like a red light?"

**Issue #5:** No examples of each decision type
- **Severity:** MEDIUM
- **User Quote:** "Show me an actual file that triggers WARN vs REQUIRE_PLAN"
- **Fix:** Add interactive examples to welcome screen

---

### 📝 Configuration Questions

**Sarah's Question:** "Can I make it less strict for my development branch?"

**Where she looked:**
- Settings → searched for "ARC" → found nothing
- `.arc/` folder → saw `audit.jsonl` but nothing about configuration
- README → mentions `.arc/router.json` but doesn't say what to put in it

**Sarah's Reaction:** "I give up, I'll just live with it"

**Issue #6:** Configuration not discoverable
- **Severity:** MEDIUM
- **User Quote:** "I'm not going to manually create a JSON file without knowing what goes in it"
- **Fix:** Add `ARC: Create Configuration File` command with wizard

---

## SIMULATION SESSION 2: Experienced Developer (Mid-Level - Marcus)

**Background:** Marcus is a mid-level developer who's skeptical of "AI governance" but willing to try it

---

### 📝 Performance Concerns

**Marcus's Action:** Saved a large file (2000 lines), noticed slight delay

**Expected:** Save should be nearly instant  
**Actual:** ~500ms delay (noticeable but acceptable)  
**Marcus's Reaction:** "Not bad, but I wonder if it'll get worse"

**Question #7:** "How can I see the performance breakdown?"
- **Where he looked:** Commands → found "Runtime Status" but it doesn't show latency
- **What he wants:** Per-save timing: classification (Xms), rule eval (Xms), model (Xms)
- **Fix:** Add performance metrics to Runtime Status panel

---

**Marcus's Action:** Saved the same file again immediately

**Expected:** Same delay  
**Actual:** Instant (lease reuse)  
**Marcus's Reaction:** "Oh nice, it remembers! But why didn't it tell me?"

**Issue #8:** Lease reuse is invisible to user
- **Severity:** LOW
- **User Quote:** "I'd like to know when it's using a cached decision"
- **Fix:** Add tooltip or log message: "Reused decision from 30s ago"

---

### 📝 AI Model Concerns

**Marcus's Question:** "Is this sending my code to OpenAI?"

**Where he looked:**
- README → says "local-first" and "no external APIs"
- But also mentions "cloud fallback" → **CONFUSION**

**Marcus's Reaction:** "Wait, so is it local or not?"

**Issue #9:** "Local-first" vs "cloud fallback" messaging is contradictory
- **Severity:** HIGH (trust issue)
- **User Quote:** "Just tell me straight: does my code leave my machine or not?"
- **Fix:** README should say: "Your code NEVER leaves your machine in v0.1. Cloud is disabled and requires explicit configuration."

---

**Marcus's Action:** Checked if Ollama is running

**Expected:** Extension should tell him if model is available  
**Actual:** No indication until he tries to save a high-risk file  
**Marcus's Reaction:** "Would be nice to know up front"

**Question #10:** "How do I check if Ollama is connected?"
- **Where he looked:** Runtime Status → doesn't show model connection status
- **Fix:** Add model health check to Runtime Status: "✅ Ollama connected (llama3.2:3b)" or "⚠️ Ollama unavailable (rules-only mode)"

---

### 📝 Customization Desires

**Marcus's Question:** "Can I add my own rules?"

**Where he looked:**
- `.arc/` folder → nothing
- `rules/` folder in extension directory → found `default.json`
- README → no mention of custom rules

**Marcus's Reaction:** "Looks like I can't without forking the extension"

**Question #11:** "How do I define custom risk patterns for my project?"
- **Current state:** Possible via `.arc/workspace-map.json` but not documented
- **Fix:** Add "Custom Rules Guide" to docs with examples

---

## SIMULATION SESSION 3: Team Lead (Senior - Priya)

**Background:** Priya is a tech lead evaluating ARC for her team of 8 developers

---

### 📝 Team Adoption Concerns

**Priya's Question:** "How do I roll this out to my team?"

**Where she looked:**
- README → focused on individual installation
- No "Team Guide" or "Organization Setup"

**Priya's Reaction:** "I need to know: do I give them a config file? Do I set up a shared rule set? What's the process?"

**Issue #12:** No team deployment guide
- **Severity:** HIGH (blocks team adoption)
- **User Quote:** "Individual tools are fine, but I need to know how to standardize this across a team"
- **Fix:** Add `docs/TEAM_DEPLOYMENT.md` with:
  - How to share `.arc/` config via git
  - How to enforce installation (CI check)
  - How to review team audit logs

---

**Priya's Question:** "What happens if someone disables the extension?"

**Where she looked:**
- Security docs → don't exist
- FAQ → mentions this briefly but no solution

**Priya's Reaction:** "So it's honor system? That won't work for production repos"

**Question #13:** "Can I enforce that the extension is enabled?"
- **Current state:** No, extension can be disabled at any time
- **What she wants:** CI-level enforcement (pre-commit hook or GitHub Action)
- **Fix:** Create `arc-cli` package for CI integration

---

### 📝 Audit & Compliance

**Priya's Question:** "Can I see all saves across my team?"

**Where she looked:**
- Audit commands → only show local log
- README → mentions "local-first" (implies no aggregation)

**Priya's Reaction:** "So each developer has their own log? How do I audit that?"

**Question #14:** "How do I aggregate audit logs for compliance reporting?"
- **Current state:** `.arc/audit.jsonl` is local per developer
- **What she wants:** Central dashboard or log aggregation
- **Fix:** Document as Phase 2 feature, suggest interim solution (collect logs via CI)

---

**Priya's Action:** Ran `ARC: Audit Timeline` command

**Expected:** Filterable view of team activity  
**Actual:** Only her own saves  
**Priya's Reaction:** "This is just for me. I need team visibility"

**Issue #15:** Audit UI is single-user only
- **Severity:** MEDIUM (team leads need visibility)
- **Fix:** Add note to UI: "Team aggregation coming in Phase 2"

---

### 📝 Security Validation

**Priya's Question:** "How do I verify the audit log is tamper-proof?"

**Where she looked:**
- Architecture docs → mentions hash chain
- CLI commands → no `verify` command
- README → no guidance on verification

**Priya's Reaction:** "I trust it's designed well, but I need to PROVE it to my CISO"

**Question #16:** "How do I run the integrity check?"
- **Current state:** `verifyChain()` exists in code but no user-facing command
- **Fix:** Add `npm run audit:verify` and `ARC: Verify Audit Integrity` command

---

## SIMULATION SESSION 4: Security Engineer (Alex)

**Background:** Alex is evaluating ARC for security compliance, very skeptical

---

### 📝 Data Privacy

**Alex's Question:** "What data does the audit log contain?"

**Where he looked:**
- Privacy policy → doesn't exist
- README → says "append-only audit" but doesn't list fields
- Architecture docs → mentions "file path, risk flags" but not comprehensive

**Alex's Reaction:** "I need to know EXACTLY what's logged before I approve this"

**Issue #17:** No data privacy documentation
- **Severity:** CRITICAL (blocks enterprise adoption)
- **User Quote:** "Show me a sample audit entry with all fields annotated"
- **Fix:** Add `docs/PRIVACY.md` with:
  - Complete list of logged fields
  - What's NOT logged (file contents, credentials)
  - Data retention policy
  - GDPR considerations

---

**Alex's Question:** "Does this send code to an AI service?"

**Where he looked:**
- Security docs → don't exist
- README → says "local-first" but also mentions "cloud model adapter"
- Code → found `CloudModelAdapter` class

**Alex's Reaction:** "Red flag. Why does cloud code exist in a 'local-first' product?"

**Question #18:** "Can code ever leave the machine?"
- **Current state:** Cloud adapter exists but is disabled by default
- **What Alex wants:** Hard guarantee, not "disabled by default"
- **Fix:** Add compile-time flag to completely remove cloud code in "enterprise mode"

---

### 📝 Threat Modeling

**Alex's Question:** "What if a malicious developer edits the rules file?"

**Where he looked:**
- Security docs → don't exist
- `.arc/` folder → no file permissions or signing

**Alex's Reaction:** "Rules are just a JSON file. Anyone can change them."

**Question #19:** "How are rules protected from tampering?"
- **Current state:** Rules are unsigned, can be edited
- **What Alex wants:** Signed rules with verification
- **Fix:** Document as known limitation, suggest git hooks to enforce rules.json review

---

**Alex's Question:** "What's the attack surface of this extension?"

**Where he looked:**
- Architecture docs → focus on functionality, not security
- Threat model → doesn't exist

**Alex's Reaction:** "I can't approve this without a threat model"

**Issue #20:** No threat model document
- **Severity:** CRITICAL (blocks security review)
- **Fix:** Create `docs/THREAT_MODEL.md` with:
  - Trust boundaries
  - Attack vectors (malicious files, crafted rules, model poisoning)
  - Mitigations
  - Residual risks

---

## SIMULATION SESSION 5: Power User (Emily)

**Background:** Emily is an early adopter who loves customization and automation

---

### 📝 Customization Explorations

**Emily's Question:** "Can I use GPT-4 instead of Ollama?"

**Where she looked:**
- Configuration docs → mentions `.arc/router.json` but no examples
- Code → found `CloudModelAdapter` with API key support

**Emily's Reaction:** "I see the code supports it, but how do I configure it?"

**Question #21:** "How do I connect to OpenAI/Anthropic/etc?"
- **Current state:** Code supports it, but no documentation
- **Fix:** Add "Advanced: Cloud Models" guide with security warnings

---

**Emily's Action:** Created `.arc/router.json` with cloud enabled

```json
{
  "mode": "CLOUD_ASSISTED",
  "cloudLaneEnabled": true
}
```

**Expected:** Extension uses cloud model  
**Actual:** Error: "Cloud endpoint not configured"  
**Emily's Reaction:** "Okay, so I need an endpoint. Where do I get that?"

**Issue #22:** Cloud configuration has no examples
- **Severity:** MEDIUM (power users can't enable advanced features)
- **Fix:** Add example configs for popular providers (OpenAI, Anthropic, local LLM servers)

---

### 📝 Automation Desires

**Emily's Question:** "Can I run ARC from CI?"

**Where she looked:**
- CLI → found `src/cli.ts` but no docs on how to use it
- Scripts → saw `audit:cli` in package.json

**Emily's Reaction:** "There's a CLI! But how do I use it?"

**Question #23:** "What are the CLI options?"
- **Current state:** CLI exists but has no `--help` or docs
- **Fix:** Add `docs/CLI.md` and implement `--help` flag

---

**Emily's Action:** Tried to write a script to auto-accept WARN decisions

```javascript
// Her attempt
const vscode = require('vscode');
// How do I programmatically accept a decision?
```

**Emily's Reaction:** "No API for this? I can't automate approvals?"

**Question #24:** "Is there an API for programmatic interaction?"
- **Current state:** No public API
- **What Emily wants:** `arc.acceptDecision(fileUri)` or similar
- **Fix:** Document as Phase 2 feature, explain why (governance requires human approval)

---

## COMMON THEMES ACROSS ALL PERSONAS

### 🔍 Discovery Issues
1. First-run experience is empty (no welcome, no feedback)
2. Too many commands with unclear purposes
3. Configuration is not discoverable
4. No visual indicators of extension state

### 📖 Documentation Gaps
1. No team deployment guide
2. No security/threat model docs
3. No privacy/data handling docs
4. No CLI documentation
5. No advanced configuration examples

### 🎯 Clarity Issues
1. "Local-first" vs "cloud fallback" messaging
2. Technical jargon in error messages
3. No examples of decision types
4. Performance characteristics unclear

### 🔐 Trust Issues
1. No proof that code stays local
2. No verification of audit integrity
3. No protection against rule tampering
4. No transparency on what's logged

### 👥 Team Issues
1. No way to enforce extension is enabled
2. No audit log aggregation
3. No shared configuration guidance
4. No compliance reporting

---

## PRIORITIZED FIX LIST

### 🔴 P0 - MUST FIX BEFORE BETA
1. Add first-run welcome screen
2. Add status bar indicator
3. Rewrite error messages (remove jargon)
4. Document "does code leave machine?" clearly
5. Add audit integrity verification command

### 🟡 P1 - SHOULD FIX FOR v1.0
6. Create team deployment guide
7. Add CLI documentation
8. Create privacy documentation
9. Add performance metrics to UI
10. Reduce number of visible commands

### 🟢 P2 - NICE TO HAVE
11. Cloud model configuration examples
12. Custom rules guide
13. Threat model document
14. API for programmatic interaction
15. CI integration package

---

## USER QUOTES - HIGHLIGHT REEL

**On first install:**
> "I expected SOMETHING to happen when I installed it" - Sarah

**On understanding value:**
> "Show me an actual file that triggers WARN vs REQUIRE_PLAN" - Sarah

**On trust:**
> "Just tell me straight: does my code leave my machine or not?" - Marcus

**On team adoption:**
> "Individual tools are fine, but I need to know how to standardize this across a team" - Priya

**On security validation:**
> "I need to PROVE it to my CISO" - Priya

**On compliance:**
> "I need to know EXACTLY what's logged before I approve this" - Alex

**On customization:**
> "I see the code supports it, but how do I configure it?" - Emily

---

## RECOMMENDATIONS FOR HABIB

### Quick Wins (1-2 days)
1. ✅ Add welcome screen that auto-shows on first run
2. ✅ Add status bar: "ARC: Active" with click-to-open
3. ✅ Add one-line privacy statement to README: "Your code never leaves your machine in v0.1"

### Medium Effort (3-5 days)
4. ✅ Rewrite 5 most common error messages
5. ✅ Create `docs/TEAM_DEPLOYMENT.md`
6. ✅ Create `docs/PRIVACY.md`
7. ✅ Add `ARC: Verify Audit Integrity` command

### Long Term (Phase 2)
8. Team audit aggregation
9. CI integration package
10. Public API for programmatic interaction

---

*This simulation was conducted by adopting five distinct user personas and walking through realistic workflows, questions, and frustrations. All quotes are simulated but representative of real user reactions to similar products.*
