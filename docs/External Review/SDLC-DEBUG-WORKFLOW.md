# SDLC Blueprint: Debugging & Incident Response Workflow

**Directive ID:** SDLC-DEBUG-001  
**Version:** 1.0  
**Last Updated:** 2026-03-29

---

## Objective

Ensure systematic, documented debugging and incident response that:
- Resolves production issues quickly
- Captures root cause for prevention
- Maintains audit trail
- Prevents debug code in production

---

## Workflow Types

### Type 1: Local Development Debugging
For bugs found during development (not in production)

### Type 2: Production Incident Response
For live issues affecting users (requires immediate action)

### Type 3: Post-Mortem Analysis
After incident resolved (learning & prevention)

---

## TYPE 1: LOCAL DEVELOPMENT DEBUGGING

### When to Use
- Bug found during development
- Test failure investigation
- Code review feedback
- Performance issue in local/staging

### Process

#### 1. Reproduce Bug
- [ ] Create minimal reproduction case
- [ ] Document steps to reproduce
- [ ] Capture error messages/stack traces
- [ ] Note environment (OS, browser, dependencies)

#### 2. Isolate Issue
- [ ] Identify affected component/module
- [ ] Binary search through recent changes
- [ ] Check if regression (was it working before?)
- [ ] Test in clean environment

#### 3. Debug Investigation
- [ ] Add strategic console.log/debug statements
- [ ] Use debugger breakpoints
- [ ] Check logs for context
- [ ] Review related code
- [ ] Search for similar issues (GitHub, Stack Overflow)

**Debugging Best Practices:**
```javascript
// ✅ GOOD: Descriptive debug logging
console.log('[Auth] Login attempt:', { userId, timestamp });

// ❌ BAD: Cryptic debug code
console.log('here', x);

// ✅ GOOD: Conditional debugging
if (process.env.DEBUG) {
  console.log('[Performance]', performanceMetrics);
}

// ❌ BAD: Debug code that modifies behavior
// debugger; // left in production code
```

#### 4. Fix & Test
- [ ] Implement fix
- [ ] Add regression test
- [ ] Verify fix resolves issue
- [ ] Remove debug code before commit
- [ ] Self-review for leftover debug statements

#### 5. Document
- [ ] Update ticket with findings
- [ ] Add code comments if complex
- [ ] Update tests
- [ ] Note in PR description

---

## TYPE 2: PRODUCTION INCIDENT RESPONSE

### Severity Levels

| Level | Description | Response Time | Approval |
|-------|-------------|---------------|----------|
| P0 - Critical | Service down, data loss | < 15 min | Skip normal review |
| P1 - High | Major feature broken | < 1 hour | Expedited review |
| P2 - Medium | Minor feature broken | < 4 hours | Normal review |
| P3 - Low | Cosmetic issue | < 24 hours | Normal review |

### P0/P1 Incident Response Flow

#### Phase 1: DETECT (0-5 minutes)
- [ ] Incident reported (monitoring alert, user report)
- [ ] Acknowledge incident in #incidents channel
- [ ] Assign incident commander
- [ ] Create incident ticket: `INC-YYYY-MM-DD-001`

**Communication Template:**
```
🚨 INCIDENT DETECTED
ID: INC-2026-03-29-001
Severity: P0
Impact: Login service down (100% of users)
Detected: 2026-03-29 14:30 UTC
IC: @username
```

#### Phase 2: TRIAGE (5-15 minutes)
- [ ] Assess impact (how many users affected?)
- [ ] Check recent deployments (rollback candidate?)
- [ ] Review error logs
- [ ] Check monitoring dashboards
- [ ] Notify stakeholders

**Questions to Answer:**
1. What is broken?
2. Since when?
3. What changed recently?
4. How many users affected?
5. Is data at risk?

#### Phase 3: MITIGATE (15-60 minutes)
- [ ] Implement quick fix (if obvious)
- [ ] OR rollback last deployment
- [ ] OR disable failing feature
- [ ] OR route traffic away from broken component

**Mitigation Checklist:**
- [ ] Fix deployed to production
- [ ] Monitoring confirms issue resolved
- [ ] Sample users verified working
- [ ] Error rate back to normal

**Update Stakeholders:**
```
✅ INCIDENT MITIGATED
ID: INC-2026-03-29-001
Resolution: Rolled back deploy #1234
Time to mitigation: 23 minutes
Status: Monitoring for regression
```

#### Phase 4: ROOT CAUSE (1-4 hours)
- [ ] Why did it happen?
- [ ] Why didn't tests catch it?
- [ ] Why didn't monitoring alert sooner?
- [ ] What was the blast radius?

**RCA Template:**
```markdown
## Root Cause Analysis: INC-2026-03-29-001

### Timeline
14:25 - Deploy #1234 started
14:30 - First error spike
14:35 - Incident detected
14:40 - Rollback initiated
14:48 - Service restored

### Root Cause
Database connection pool exhausted due to missing 
timeout configuration in new auth service.

### Why It Happened
1. New code added DB connection without timeout
2. Code review missed the missing config
3. Load test didn't simulate production traffic
4. Monitoring didn't alert on connection pool

### Impact
- 100% of login attempts failed for 18 minutes
- ~500 users affected
- No data loss
- Revenue impact: minimal (free tier users)
```

#### Phase 5: PERMANENT FIX (varies)
- [ ] Create fix branch: `hotfix/INC-2026-03-29-001`
- [ ] Implement proper fix (not just rollback)
- [ ] Add regression tests
- [ ] Code review (can be expedited for P0/P1)
- [ ] Deploy fix
- [ ] Monitor for 24 hours

#### Phase 6: POST-MORTEM (within 24 hours)
- [ ] Schedule post-mortem meeting
- [ ] Document timeline
- [ ] Identify prevention measures
- [ ] Create follow-up tickets
- [ ] Share learnings with team

---

## TYPE 3: POST-MORTEM ANALYSIS

### Meeting Structure (60 minutes)

#### 1. Recap (10 minutes)
- What happened?
- Timeline of events
- Impact assessment

#### 2. Root Cause (20 minutes)
- Why did it happen?
- 5 Whys analysis
- Contributing factors

**5 Whys Example:**
```
Problem: Login service down

Why? Database connections exhausted
Why? No connection timeout set
Why? New code didn't include timeout config
Why? Code review didn't catch it
Why? No checklist for DB connection config
```

#### 3. Prevention (20 minutes)
- What can prevent this?
- Process improvements
- Technical improvements
- Monitoring improvements

**Action Items Template:**
- [ ] Add DB connection timeout to config template
- [ ] Add checklist item to code review template
- [ ] Add connection pool monitoring alert
- [ ] Update load test to include connection limits
- [ ] Add documentation on DB best practices

#### 4. Follow-Up (10 minutes)
- Assign action items
- Set deadlines
- Schedule follow-up review

### Blameless Post-Mortem Culture

**DO:**
- ✅ Focus on systems and processes
- ✅ Ask "how can we prevent this?"
- ✅ Share learnings across teams
- ✅ Celebrate quick mitigation

**DON'T:**
- ❌ Blame individuals
- ❌ Punish for mistakes
- ❌ Hide incidents
- ❌ Rush through post-mortem

---

## DEBUG CODE PREVENTION

### Pre-Commit Checklist
- [ ] Remove all `console.log()` statements
- [ ] Remove all `debugger` statements
- [ ] Remove all `TODO: debug` comments
- [ ] Remove test data/credentials
- [ ] Check for commented-out debug code

### Automated Checks

**ESLint Rules:**
```javascript
// .eslintrc.js
rules: {
  'no-console': 'error',
  'no-debugger': 'error',
  'no-alert': 'error'
}
```

**Pre-commit Hook:**
```bash
# .git/hooks/pre-commit
#!/bin/bash

# Check for debug statements
if git diff --cached | grep -E '(console\.(log|debug)|debugger)'; then
  echo "Error: Debug statements found in staged files"
  exit 1
fi
```

**ARC Rules:**
```json
{
  "id": "sdlc-no-debug-code",
  "reason": "Debug statements must be removed before commit",
  "matchers": [
    { "type": "EXTENSION_MATCH", "value": ".js" },
    { "type": "EXTENSION_MATCH", "value": ".ts" }
  ],
  "pattern": "console\\.(log|debug)|debugger",
  "riskFlag": "CONFIG_CHANGE",
  "severity": "MEDIUM",
  "decisionFloor": "WARN"
}
```

---

## DEBUGGING TOOLS & TECHNIQUES

### Browser DevTools
- Elements tab: Inspect DOM
- Console tab: Run commands, see logs
- Sources tab: Set breakpoints
- Network tab: Check API calls
- Performance tab: Profile rendering

### Node.js Debugging
```bash
# Start with debugger
node --inspect server.js

# Attach Chrome DevTools
# chrome://inspect

# VS Code debugging
# F5 to start, F10 to step over, F11 to step into
```

### Production Debugging (Safe Methods)
- ✅ Log aggregation (Datadog, Sentry)
- ✅ APM tools (New Relic, Dynatrace)
- ✅ Feature flags for controlled rollout
- ✅ Canary deployments
- ❌ SSH into production (emergency only)
- ❌ Edit code directly in production

---

## INCIDENT COMMUNICATION

### Status Page Updates

**Template:**
```
[INVESTIGATING] We are aware of login issues
Posted: 2:30 PM UTC

[UPDATE] We have identified the issue and are rolling back
Posted: 2:45 PM UTC

[RESOLVED] Login service has been restored
Posted: 3:00 PM UTC

[POST-MORTEM] Full incident report: [link]
Posted: Next day
```

### Internal Updates (#incidents channel)

**Frequency:**
- P0: Every 15 minutes
- P1: Every 30 minutes  
- P2: Every hour
- P3: Once when resolved

**Template:**
```
⏰ UPDATE (T+30min)
Status: Still investigating
Actions taken: Checked logs, identified suspicious deploy
Next steps: Rolling back deploy #1234
ETA: 10 minutes
```

---

## ACCEPTANCE CRITERIA

### For Local Debugging
1. ✅ Bug reproduced with steps
2. ✅ Root cause identified
3. ✅ Fix implemented with test
4. ✅ All debug code removed
5. ✅ Documented in ticket

### For Production Incident
1. ✅ Incident detected < 15min (P0) or < 1hr (P1)
2. ✅ Stakeholders notified
3. ✅ Mitigation deployed
4. ✅ RCA documented
5. ✅ Post-mortem completed
6. ✅ Prevention tasks created

---

## CONSTRAINTS

### Must NOT:
- ❌ Deploy debug code to production
- ❌ Skip post-mortem for P0/P1 incidents
- ❌ Hide incidents from stakeholders
- ❌ Blame individuals in post-mortem
- ❌ Rush permanent fix without tests

### Must:
- ✅ Remove debug statements before commit
- ✅ Document RCA for all P0/P1 incidents
- ✅ Create prevention tasks
- ✅ Share learnings with team
- ✅ Test permanent fix thoroughly

---

## ROLLBACK DECISION TREE

```
Is service critical? (auth, payments, core features)
├─ YES
│  └─ Rollback immediately, debug offline
└─ NO
   └─ Is fix obvious and quick? (< 15 minutes)
      ├─ YES → Deploy fix
      └─ NO → Rollback, debug offline
```

---

## METRICS TO TRACK

### Incident Metrics
- **MTTD** (Mean Time To Detect): Alert → Acknowledgment
- **MTTR** (Mean Time To Resolve): Detection → Mitigation
- **Incident Frequency**: Count per week/month
- **Repeat Incidents**: Same root cause

### Quality Metrics
- **Escaped Defects**: Bugs found in production
- **Debug Code in Production**: Count of leaked debug statements
- **Post-Mortem Completion**: % of incidents with post-mortem

### Target SLAs
- MTTD: < 5 minutes (P0), < 15 minutes (P1)
- MTTR: < 1 hour (P0), < 4 hours (P1)
- Post-Mortem: 100% for P0/P1, within 24 hours

---

## RELATED BLUEPRINTS

- `SDLC-FEATURE-DEV.md` - Feature development workflow
- `SDLC-HOTFIX.md` - Emergency fix workflow
- `SDLC-TESTING.md` - Testing requirements
- `SDLC-CODE-REVIEW.md` - Code review checklist

---

## EXAMPLES

### Example 1: Memory Leak (P1 Incident)

**Problem:** Application memory usage growing over time

**Debug Process:**
1. Detect: Monitoring alert on memory usage
2. Triage: Check heap snapshots, identify leak
3. Mitigate: Restart service (temporary)
4. RCA: Event listeners not cleaned up
5. Fix: Add cleanup in component unmount
6. Prevent: Add memory monitoring to CI

### Example 2: Race Condition (P2 Bug)

**Problem:** Intermittent test failures

**Debug Process:**
1. Reproduce: Run test 100x, fails 5x
2. Isolate: Add timing logs, find race
3. Fix: Add proper async/await
4. Test: Run 1000x, 0 failures
5. Document: Add comment explaining timing

---

## DEBUGGING CHECKLIST

Quick reference for debugging sessions:

### Before You Start
- [ ] Can you reproduce it?
- [ ] Do you have the error message?
- [ ] Do you know when it started?
- [ ] Do you have the logs?

### While Debugging
- [ ] Are you working on a copy (not production)?
- [ ] Are you tracking your changes?
- [ ] Are you documenting findings?
- [ ] Have you asked for help if stuck > 2 hours?

### Before Committing Fix
- [ ] Did you add a test that would catch this?
- [ ] Did you remove all debug code?
- [ ] Did you document the fix?
- [ ] Did you verify it works in clean environment?

---

## DEBUGGING ANTI-PATTERNS

### ❌ Don't Do This:

1. **Random Changes**
   - "Let me try changing this and see what happens"
   - Instead: Form hypothesis, test systematically

2. **Debug in Production**
   - "Let me add a console.log to production to see"
   - Instead: Use proper logging/monitoring

3. **Skip Tests**
   - "I'll fix the bug but not add a test"
   - Instead: Always add regression test

4. **Hide Bugs**
   - "Nobody will notice this edge case"
   - Instead: Document known issues

5. **Blame Others**
   - "This is broken because someone else..."
   - Instead: Focus on the fix

---

## ADDITIONAL RESOURCES

### Tools
- Browser DevTools
- VS Code Debugger
- Node.js Inspector
- Chrome DevTools Protocol
- Sentry (error tracking)
- Datadog (APM)

### Reading
- "The Art of Debugging" - Norman Matloff
- "Effective Debugging" - Diomidis Spinellis
- "Debugging: The 9 Indispensable Rules" - David Agans

---

**Last Review:** 2026-03-29  
**Next Review:** Quarterly or after major incident
