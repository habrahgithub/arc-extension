import crypto from 'node:crypto';
import type {
  AuthorityTag,
  Classification,
  ContextPacket,
  ContextPacketValidationIssue,
  ContextPacketValidationResult,
  DataClass,
  Decision,
  DirectiveProofInput,
  RiskFlag,
  RoutePolicyResolution,
  SaveInput,
  SensitivityMarker,
} from '../contracts/types';
import { trimExcerpt } from './contextBuilder';

export const DEFAULT_AUTHORITY_TAG: AuthorityTag = 'LINTEL_LOCAL_ENFORCEMENT';

// Secret redaction patterns — applied to excerpt before packet is built.
// Does not replace full-file text; only the bounded excerpt field.
const SECRET_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // .env style: KEY=value or KEY="value"
  { pattern: /([A-Z_][A-Z0-9_]*)=["']?[^\s"']{4,}["']?/g, replacement: '$1=<REDACTED>' },
  // Bearer token
  { pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, replacement: 'Bearer <REDACTED>' },
  // Private key block header
  { pattern: /-----BEGIN[^-]*PRIVATE KEY-----[\s\S]*?-----END[^-]*PRIVATE KEY-----/gi, replacement: '<REDACTED PRIVATE KEY BLOCK>' },
];

export function redactSecrets(text: string | undefined): string | undefined {
  if (!text) {
    return text;
  }
  let redacted = text;
  for (const { pattern, replacement } of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, replacement);
  }
  return redacted;
}
export const DEFAULT_DATA_CLASS: DataClass = 'LOCAL_ONLY';
export const DEFAULT_SENSITIVITY_MARKER: SensitivityMarker = 'UNASSESSED';
export const CONTEXT_PACKET_ID_PREFIX = 'ctx_';
export const MAX_CONTEXT_PACKET_EXCERPT_LENGTH = 161;

interface ContextPacketPayload {
  ts: string;
  file_path: string;
  risk_flags: RiskFlag[];
  matched_rule_ids: string[];
  last_decision?: Decision;
  excerpt?: string;
  heuristic_only: true;
  directive_id?: string;
  blueprint_id?: string;
  authority_tag: AuthorityTag;
  data_class: DataClass;
  sensitivity_marker: SensitivityMarker;
}

export function buildContextPacket(
  classification: Classification,
  input: SaveInput,
  proof?: DirectiveProofInput,
  routePolicy?: RoutePolicyResolution,
): ContextPacket {
  const payload = buildContextPacketPayload(classification, input, proof, routePolicy);
  const packetHash = computeContextPacketHash(payload);
  const packet: ContextPacket = {
    packet_id: `${CONTEXT_PACKET_ID_PREFIX}${packetHash.slice(0, 12)}`,
    ...payload,
    packet_hash: packetHash,
  };

  assertValidContextPacket(packet, routePolicy);
  return packet;
}

export function validateContextPacket(
  packet: ContextPacket,
  routePolicy?: RoutePolicyResolution,
): ContextPacketValidationResult {
  const issues: ContextPacketValidationIssue[] = [];

  if (!packet.packet_id) {
    issues.push(issue('MISSING_REQUIRED_FIELD', 'packet_id', 'packet_id is required.'));
  }
  if (!packet.ts) {
    issues.push(issue('MISSING_REQUIRED_FIELD', 'ts', 'ts is required.'));
  }
  if (!packet.file_path) {
    issues.push(issue('MISSING_REQUIRED_FIELD', 'file_path', 'file_path is required.'));
  }
  if (!Array.isArray(packet.risk_flags)) {
    issues.push(issue('MISSING_REQUIRED_FIELD', 'risk_flags', 'risk_flags must be present as an array.'));
  }
  if (!Array.isArray(packet.matched_rule_ids)) {
    issues.push(
      issue('MISSING_REQUIRED_FIELD', 'matched_rule_ids', 'matched_rule_ids must be present as an array.'),
    );
  }
  if (packet.heuristic_only !== true) {
    issues.push(
      issue('INVALID_HEURISTIC_ONLY', 'heuristic_only', 'heuristic_only must remain true in Phase 6.3.'),
    );
  }
  if (packet.authority_tag !== DEFAULT_AUTHORITY_TAG) {
    issues.push(
      issue(
        'INVALID_AUTHORITY_TAG',
        'authority_tag',
        'authority_tag must be asserted by trusted local code and remain LINTEL_LOCAL_ENFORCEMENT.',
      ),
    );
  }
  if (!isAllowedDataClass(packet.data_class, routePolicy)) {
    issues.push(
      issue(
        'INVALID_DATA_CLASS',
        'data_class',
        dataClassValidationReason(routePolicy),
      ),
    );
  }
  if (packet.sensitivity_marker !== DEFAULT_SENSITIVITY_MARKER) {
    issues.push(
      issue(
        'INVALID_SENSITIVITY_MARKER',
        'sensitivity_marker',
        'sensitivity_marker must remain fail-closed to UNASSESSED in Phase 6.3.',
      ),
    );
  }
  if (packet.excerpt && packet.excerpt.length > MAX_CONTEXT_PACKET_EXCERPT_LENGTH) {
    issues.push(
      issue(
        'INVALID_EXCERPT_BOUNDS',
        'excerpt',
        `excerpt exceeds the maximum bounded length of ${MAX_CONTEXT_PACKET_EXCERPT_LENGTH}.`,
      ),
    );
  }

  const expectedHash = computeContextPacketHash(payloadFromPacket(packet));
  if (packet.packet_hash !== expectedHash) {
    issues.push(
      issue(
        'INVALID_PACKET_HASH',
        'packet_hash',
        'packet_hash does not match the canonical serialized packet payload.',
      ),
    );
  }

  const expectedId = `${CONTEXT_PACKET_ID_PREFIX}${expectedHash.slice(0, 12)}`;
  if (packet.packet_id !== expectedId) {
    issues.push(
      issue(
        'INVALID_PACKET_ID',
        'packet_id',
        'packet_id does not match the canonical packet hash prefix.',
      ),
    );
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function assertValidContextPacket(
  packet: ContextPacket,
  routePolicy?: RoutePolicyResolution,
): void {
  const validation = validateContextPacket(packet, routePolicy);
  if (validation.ok) {
    return;
  }

  const reasons = validation.issues.map((entry) => `${entry.field}: ${entry.reason}`).join(' | ');
  throw new Error(`Invalid Context Bus v1 packet: ${reasons}`);
}

export function serializeContextPacket(packet: ContextPacket): string {
  return JSON.stringify(
    {
      packet_id: packet.packet_id,
      ...payloadFromPacket(packet),
      packet_hash: packet.packet_hash,
    },
    null,
    2,
  );
}

export function serializeContextPacketPayload(packet: ContextPacket): string {
  return serializePayload(payloadFromPacket(packet));
}

export function computeContextPacketHash(payload: ContextPacketPayload): string {
  return crypto.createHash('sha256').update(serializePayload(payload)).digest('hex');
}

function buildContextPacketPayload(
  classification: Classification,
  input: SaveInput,
  proof?: DirectiveProofInput,
  routePolicy?: RoutePolicyResolution,
): ContextPacketPayload {
  return {
    ts: new Date().toISOString(),
    file_path: classification.filePath,
    risk_flags: [...classification.riskFlags],
    matched_rule_ids: [...classification.matchedRuleIds],
    last_decision: input.lastDecision,
    excerpt: redactSecrets(trimExcerpt(input.selectionText)),
    heuristic_only: true,
    directive_id: proof?.directiveId,
    blueprint_id: proof?.blueprintId,
    authority_tag: DEFAULT_AUTHORITY_TAG,
    data_class: resolveDataClass(routePolicy),
    sensitivity_marker: DEFAULT_SENSITIVITY_MARKER,
  };
}

function payloadFromPacket(packet: ContextPacket): ContextPacketPayload {
  return {
    ts: packet.ts,
    file_path: packet.file_path,
    risk_flags: [...packet.risk_flags],
    matched_rule_ids: [...packet.matched_rule_ids],
    last_decision: packet.last_decision,
    excerpt: packet.excerpt,
    heuristic_only: packet.heuristic_only,
    directive_id: packet.directive_id,
    blueprint_id: packet.blueprint_id,
    authority_tag: packet.authority_tag,
    data_class: packet.data_class,
    sensitivity_marker: packet.sensitivity_marker,
  };
}

function serializePayload(payload: ContextPacketPayload): string {
  return JSON.stringify({
    ts: payload.ts,
    file_path: payload.file_path,
    risk_flags: payload.risk_flags,
    matched_rule_ids: payload.matched_rule_ids,
    last_decision: payload.last_decision ?? null,
    excerpt: payload.excerpt ?? null,
    heuristic_only: payload.heuristic_only,
    directive_id: payload.directive_id ?? null,
    blueprint_id: payload.blueprint_id ?? null,
    authority_tag: payload.authority_tag,
    data_class: payload.data_class,
    sensitivity_marker: payload.sensitivity_marker,
  });
}

function resolveDataClass(routePolicy?: RoutePolicyResolution): DataClass {
  if (
    routePolicy?.status === 'LOADED' &&
    routePolicy.config.mode === 'CLOUD_ASSISTED' &&
    routePolicy.config.cloudLaneEnabled
  ) {
    return routePolicy.config.cloudDataClass;
  }

  return DEFAULT_DATA_CLASS;
}

function isAllowedDataClass(
  value: DataClass,
  routePolicy?: RoutePolicyResolution,
): boolean {
  if (
    routePolicy?.status === 'LOADED' &&
    routePolicy.config.mode === 'CLOUD_ASSISTED' &&
    routePolicy.config.cloudLaneEnabled
  ) {
    return value === routePolicy.config.cloudDataClass;
  }

  return value === DEFAULT_DATA_CLASS;
}

function dataClassValidationReason(routePolicy?: RoutePolicyResolution): string {
  if (
    routePolicy?.status === 'LOADED' &&
    routePolicy.config.mode === 'CLOUD_ASSISTED' &&
    routePolicy.config.cloudLaneEnabled
  ) {
    return `data_class must match the explicit cloud policy value of ${routePolicy.config.cloudDataClass} in Phase 6.6.`;
  }

  return 'data_class must remain fail-closed to LOCAL_ONLY unless explicit cloud fallback policy authorizes a different packet class.';
}

function issue(
  code: ContextPacketValidationIssue['code'],
  field: ContextPacketValidationIssue['field'],
  reason: string,
): ContextPacketValidationIssue {
  return { code, field, reason };
}
