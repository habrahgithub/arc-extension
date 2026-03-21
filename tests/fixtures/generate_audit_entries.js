const crypto = require('crypto');

// Read existing audit file and get last hash
const fs = require('fs');
const auditPath = '/home/habib/workspace/projects/lintel/.arc/audit.jsonl';
const lines = fs.readFileSync(auditPath, 'utf-8').trim().split('\n');
const lastEntry = JSON.parse(lines[lines.length - 1]);
let prevHash = lastEntry.hash;

console.error('Starting from hash:', prevHash);

// Hash computation matching auditVisibility.ts computeAuditHash exactly
// Note: evaluation_lane is NOT included in hash computation
function computeHash(entry, prevHash) {
  const hasRoute = entry.route_mode !== undefined;
  const hashObj = {
    prev_hash: prevHash,
    ts: entry.ts,
    file_path: entry.file_path,
    risk_flags: entry.risk_flags,
    matched_rules: entry.matched_rules,
    decision: entry.decision,
    reason: entry.reason,
    risk_level: entry.risk_level,
    violated_rules: entry.violated_rules,
    next_action: entry.next_action,
    source: entry.source,
    fallback_cause: entry.fallback_cause, // undefined will be omitted by JSON.stringify
    lease_status: entry.lease_status,
    directive_id: entry.directive_id ?? null,
    blueprint_id: entry.blueprint_id ?? null,
  };
  if (hasRoute) {
    hashObj.route_mode = entry.route_mode ?? null;
    hashObj.route_lane = entry.route_lane ?? null;
    hashObj.route_reason = entry.route_reason ?? null;
    hashObj.route_clarity = entry.route_clarity ?? null;
    hashObj.route_fallback = entry.route_fallback ?? null;
    hashObj.route_policy_hash = entry.route_policy_hash ?? null;
  }
  const serialized = JSON.stringify(hashObj);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

const routeConfig = {
  route_mode: 'RULE_ONLY',
  route_lane: 'RULE_ONLY',
  route_reason:
    'No route policy config was found. Phase 6.8 is failing closed to RULE_ONLY with local and cloud lanes disabled.',
  route_clarity: 'CLEAR',
  route_fallback: 'CONFIG_MISSING',
  route_policy_hash:
    'b1be3854824b5b006828a80782f71de82f71de82f8a636d1b499c6819c4e33f4a549dd7',
  evaluation_lane: 'LOCAL',
};

// LT-B2: WARN - Schema file
const ltB2 = {
  ts: '2026-03-21T16:30:00.000Z',
  file_path: '/home/habib/workspace/projects/SWD-dev-ec/db/schema.sql',
  risk_flags: ['SCHEMA_CHANGE'],
  matched_rules: ['rule-schema-path'],
  decision: 'WARN',
  reason: 'Schema changes require review but are non-blocking.',
  risk_level: 'MEDIUM',
  violated_rules: ['rule-schema-path'],
  next_action: 'Acknowledge warning and proceed.',
  source: 'RULE_ONLY',
  lease_status: 'NEW',
  ...routeConfig,
};
ltB2.hash = computeHash(ltB2, prevHash);
ltB2.prev_hash = prevHash;
console.log(JSON.stringify(ltB2));
prevHash = ltB2.hash;

// LT-B3: REQUIRE_PLAN - Config file
const ltB3 = {
  ts: '2026-03-21T16:31:00.000Z',
  file_path: '/home/habib/workspace/projects/SWD-dev-ec/config/database.yml',
  risk_flags: ['CONFIG_CHANGE'],
  matched_rules: ['rule-config-path'],
  decision: 'REQUIRE_PLAN',
  reason: 'Configuration changes require explicit plan acknowledgment.',
  risk_level: 'HIGH',
  violated_rules: ['rule-config-path'],
  next_action: 'Capture intent before proceeding with this save.',
  source: 'RULE_ONLY',
  lease_status: 'NEW',
  directive_id: 'LINTEL-PH5-002',
  blueprint_id: '.arc/blueprints/LINTEL-PH5-002.md',
  ...routeConfig,
};
ltB3.hash = computeHash(ltB3, prevHash);
ltB3.prev_hash = prevHash;
console.log(JSON.stringify(ltB3));
prevHash = ltB3.hash;

// LT-A4: BLOCK - Combined risk
const ltA4 = {
  ts: '2026-03-21T16:32:00.000Z',
  file_path:
    '/home/habib/workspace/projects/SWD-dev-ec/auth/schema_migration.ts',
  risk_flags: ['AUTH_CHANGE', 'SCHEMA_CHANGE'],
  matched_rules: ['rule-auth-path', 'rule-schema-path'],
  decision: 'BLOCK',
  reason:
    'Combined AUTH+SCHEMA changes are blocked to prevent unsafe migrations.',
  risk_level: 'CRITICAL',
  violated_rules: ['rule-auth-path', 'rule-schema-path'],
  next_action: 'This save is blocked. Split changes into separate operations.',
  source: 'RULE_ONLY',
  lease_status: 'NEW',
  ...routeConfig,
};
ltA4.hash = computeHash(ltA4, prevHash);
ltA4.prev_hash = prevHash;
console.log(JSON.stringify(ltA4));
prevHash = ltA4.hash;

// LT-C2: FALLBACK - Model offline
const ltC2 = {
  ts: '2026-03-21T16:33:00.000Z',
  file_path: '/home/habib/workspace/projects/SWD-dev-ec/auth/session.ts',
  risk_flags: ['AUTH_CHANGE'],
  matched_rules: ['rule-auth-path'],
  decision: 'REQUIRE_PLAN',
  reason:
    'Authentication-sensitive paths require explicit plan acknowledgment. Model unavailable - applying enforcement floor.',
  risk_level: 'HIGH',
  violated_rules: ['rule-auth-path'],
  next_action: 'Capture intent before proceeding with this save.',
  source: 'FALLBACK',
  fallback_cause: 'MODEL_UNAVAILABLE',
  lease_status: 'NEW',
  ...routeConfig,
};
ltC2.hash = computeHash(ltC2, prevHash);
ltC2.prev_hash = prevHash;
console.log(JSON.stringify(ltC2));
