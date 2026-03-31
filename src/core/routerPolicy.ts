import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import type {
  ContextPacket,
  DataClass,
  DecisionPayload,
  NormalizedRoutePolicy,
  RouteLaneDescriptor,
  RoutePolicyConfig,
  RoutePolicyResolution,
  RouterShellResolution,
  SaveInput,
} from '../contracts/types';
import { validateContextPacket } from './contextPacket';

const ajv = new Ajv();
const validateRoutePolicyConfig = ajv.compile({
  type: 'object',
  properties: {
    mode: { type: 'string', enum: ['RULE_ONLY', 'LOCAL_PREFERRED', 'CLOUD_ASSISTED'] },
    local_lane_enabled: { type: 'boolean' },
    cloud_lane_enabled: { type: 'boolean' },
    cloud_data_class: { type: 'string', enum: ['LOCAL_ONLY', 'CLOUD_ELIGIBLE', 'RESTRICTED'] },
    governance_mode: { type: 'string', enum: ['OBSERVE', 'ENFORCE'] },
  },
  additionalProperties: false,
});

const DEFAULT_ROUTE_POLICY: NormalizedRoutePolicy = {
  mode: 'RULE_ONLY',
  localLaneEnabled: false,
  cloudLaneEnabled: false,
  cloudDataClass: 'LOCAL_ONLY',
  governanceMode: 'ENFORCE',
};

const INVALID_PACKET_REASON =
  'Phase 6.6 denied model routing because the Context Bus packet failed validation.';
const DISABLED_LOCAL_LANE_REASON =
  'Phase 6.6 keeps the local lane disabled until LOCAL_PREFERRED or CLOUD_ASSISTED is explicitly enabled.';
const ENABLED_LOCAL_LANE_REASON =
  'Phase 6.6 local lane is explicitly enabled for governed explicit saves only.';
const LOCAL_AUTO_SAVE_BLOCKED_REASON =
  'Phase 6.6 local lane is enabled, but auto-save assessments fail closed to RULE_ONLY.';
const DISABLED_CLOUD_LANE_REASON =
  'Phase 6.6 keeps the cloud lane disabled until CLOUD_ASSISTED is explicitly enabled.';
const ENABLED_CLOUD_LANE_REASON =
  'Phase 6.6 cloud lane is explicitly enabled as a local-first fallback for explicit saves with CLOUD_ELIGIBLE packets.';
const CLOUD_AUTO_SAVE_BLOCKED_REASON =
  'Phase 6.6 cloud lane is enabled, but auto-save assessments fail closed to RULE_ONLY.';

export const DISABLED_ROUTE_LANES: Readonly<{
  local: RouteLaneDescriptor;
  cloud: RouteLaneDescriptor;
}> = {
  local: {
    lane: 'LOCAL',
    enabled: false,
    executable: false,
    reason: DISABLED_LOCAL_LANE_REASON,
  },
  cloud: {
    lane: 'CLOUD',
    enabled: false,
    executable: false,
    reason: DISABLED_CLOUD_LANE_REASON,
  },
};

export class RoutePolicyStore {
  constructor(private readonly workspaceRoot: string) {}

  configPath(): string {
    return path.join(this.workspaceRoot, '.arc', 'router.json');
  }

  load(): RoutePolicyResolution {
    const configPath = this.configPath();

    if (!fs.existsSync(configPath)) {
      return {
        status: 'MISSING',
        config: DEFAULT_ROUTE_POLICY,
        reason:
          'No route policy config was found. Phase 6.6 is failing closed to RULE_ONLY with local and cloud lanes disabled.',
        policyHash: hashPolicy(DEFAULT_ROUTE_POLICY),
      };
    }

    let rawParsed: unknown;
    try {
      rawParsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      return {
        status: 'INVALID',
        config: DEFAULT_ROUTE_POLICY,
        reason:
          'The route policy config is not valid JSON. Phase 6.6 is failing closed to RULE_ONLY with local and cloud lanes disabled.',
        policyHash: hashPolicy(DEFAULT_ROUTE_POLICY),
      };
    }

    if (!validateRoutePolicyConfig(rawParsed)) {
      return {
        status: 'INVALID',
        config: DEFAULT_ROUTE_POLICY,
        reason:
          'The route policy config failed schema validation. Phase 6.6 is failing closed to RULE_ONLY with local and cloud lanes disabled.',
        policyHash: hashPolicy(DEFAULT_ROUTE_POLICY),
      };
    }

    const parsed = rawParsed as RoutePolicyConfig;
    const normalized = normalizeRoutePolicy(parsed);
    if (!normalized) {
      return {
        status: 'INVALID',
        config: DEFAULT_ROUTE_POLICY,
        reason:
          'The route policy config requests unsupported routing behavior. Phase 6.6 is failing closed to RULE_ONLY with local and cloud lanes disabled.',
        policyHash: hashPolicy(DEFAULT_ROUTE_POLICY),
      };
    }

    return {
      status: 'LOADED',
      config: normalized,
      reason: loadedRouteReason(normalized),
      policyHash: hashPolicy(normalized),
    };
  }
}

export class RouterShell {
  resolve(
    routePolicy: RoutePolicyResolution,
    contextPacket: ContextPacket,
    input: SaveInput,
  ): RouterShellResolution {
    const packetValid = validateContextPacket(contextPacket, routePolicy).ok;
    const localLane = resolveLocalLane(routePolicy, input, packetValid);
    const cloudLane = resolveCloudLane(routePolicy, contextPacket, input, packetValid);

    return {
      routePolicy,
      localLane,
      cloudLane,
      shouldUseModel: localLane.executable,
      shouldUseCloudModel: cloudLane.executable,
      packetValid,
    };
  }
}

export function buildRouteMetadata(
  routerShell: RouterShellResolution,
  decision: DecisionPayload,
): Pick<
  DecisionPayload,
  | 'route_mode'
  | 'route_lane'
  | 'route_reason'
  | 'route_clarity'
  | 'route_fallback'
  | 'route_policy_hash'
> {
  const { routePolicy, localLane, cloudLane, shouldUseModel, packetValid } = routerShell;

  if (routePolicy.status === 'MISSING') {
    return {
      route_mode: routePolicy.config.mode,
      route_lane: 'RULE_ONLY',
      route_reason: routePolicy.reason,
      route_clarity: 'CLEAR',
      route_fallback: 'CONFIG_MISSING',
      route_policy_hash: routePolicy.policyHash,
    };
  }

  if (routePolicy.status === 'INVALID') {
    return {
      route_mode: routePolicy.config.mode,
      route_lane: 'RULE_ONLY',
      route_reason: routePolicy.reason,
      route_clarity: 'AMBIGUOUS',
      route_fallback: 'CONFIG_INVALID',
      route_policy_hash: routePolicy.policyHash,
    };
  }

  if (!packetValid) {
    return {
      route_mode: routePolicy.config.mode,
      route_lane: 'RULE_ONLY',
      route_reason: INVALID_PACKET_REASON,
      route_clarity: 'AMBIGUOUS',
      route_fallback: 'PACKET_INVALID',
      route_policy_hash: routePolicy.policyHash,
    };
  }

  if (decision.lease_status === 'REUSED') {
    return {
      route_mode: routePolicy.config.mode,
      route_lane: 'RULE_ONLY',
      route_reason:
        routePolicy.config.mode === 'CLOUD_ASSISTED'
          ? 'Phase 6.6 reused a prior governed decision without re-executing local or cloud lanes.'
          : routePolicy.config.mode === 'LOCAL_PREFERRED'
            ? 'Phase 6.6 reused a prior governed decision without re-executing the local lane.'
            : routePolicy.reason,
      route_clarity: 'CLEAR',
      route_fallback: 'NONE',
      route_policy_hash: routePolicy.policyHash,
    };
  }

  if (routePolicy.config.mode === 'LOCAL_PREFERRED') {
    return localPreferredMetadata(routePolicy, localLane, shouldUseModel, decision);
  }

  if (routePolicy.config.mode === 'CLOUD_ASSISTED') {
    return cloudAssistedMetadata(routePolicy, localLane, cloudLane, decision);
  }

  return {
    route_mode: routePolicy.config.mode,
    route_lane: 'RULE_ONLY',
    route_reason: routePolicy.reason,
    route_clarity: 'CLEAR',
    route_fallback: 'NONE',
    route_policy_hash: routePolicy.policyHash,
  };
}

function localPreferredMetadata(
  routePolicy: RoutePolicyResolution,
  localLane: RouteLaneDescriptor,
  shouldUseModel: boolean,
  decision: DecisionPayload,
): Pick<
  DecisionPayload,
  | 'route_mode'
  | 'route_lane'
  | 'route_reason'
  | 'route_clarity'
  | 'route_fallback'
  | 'route_policy_hash'
> {
  if (!shouldUseModel) {
    return {
      route_mode: routePolicy.config.mode,
      route_lane: 'RULE_ONLY',
      route_reason: localLane.reason,
      route_clarity: 'CLEAR',
      route_fallback: localLane.routeFallback ?? 'NONE',
      route_policy_hash: routePolicy.policyHash,
    };
  }

  if (decision.source === 'MODEL' && decision.evaluation_lane === 'LOCAL') {
    return {
      route_mode: routePolicy.config.mode,
      route_lane: 'LOCAL',
      route_reason: ENABLED_LOCAL_LANE_REASON,
      route_clarity: 'CLEAR',
      route_fallback: 'NONE',
      route_policy_hash: routePolicy.policyHash,
    };
  }

  if (
    decision.evaluation_lane === 'LOCAL' &&
    (decision.source === 'FALLBACK' || decision.source === 'MODEL_DISABLED')
  ) {
    return {
      route_mode: routePolicy.config.mode,
      route_lane: 'RULE_ONLY',
      route_reason: `Phase 6.6 local lane fell back to RULE_ONLY (${decision.fallback_cause}).`,
      route_clarity: 'CLEAR',
      route_fallback: 'NONE',
      route_policy_hash: routePolicy.policyHash,
    };
  }

  return {
    route_mode: routePolicy.config.mode,
    route_lane: 'RULE_ONLY',
    route_reason: routePolicy.reason,
    route_clarity: 'CLEAR',
    route_fallback: 'NONE',
    route_policy_hash: routePolicy.policyHash,
  };
}

function cloudAssistedMetadata(
  routePolicy: RoutePolicyResolution,
  localLane: RouteLaneDescriptor,
  cloudLane: RouteLaneDescriptor,
  decision: DecisionPayload,
): Pick<
  DecisionPayload,
  | 'route_mode'
  | 'route_lane'
  | 'route_reason'
  | 'route_clarity'
  | 'route_fallback'
  | 'route_policy_hash'
> {
  if (decision.source === 'CLOUD_MODEL' && decision.evaluation_lane === 'CLOUD') {
    return {
      route_mode: routePolicy.config.mode,
      route_lane: 'CLOUD',
      route_reason: ENABLED_CLOUD_LANE_REASON,
      route_clarity: 'CLEAR',
      route_fallback: 'NONE',
      route_policy_hash: routePolicy.policyHash,
    };
  }

  if (decision.source === 'MODEL' && decision.evaluation_lane === 'LOCAL') {
    return {
      route_mode: routePolicy.config.mode,
      route_lane: 'LOCAL',
      route_reason: 'Phase 6.6 local lane succeeded; cloud fallback was not needed.',
      route_clarity: 'CLEAR',
      route_fallback: 'NONE',
      route_policy_hash: routePolicy.policyHash,
    };
  }

  if (
    decision.evaluation_lane === 'CLOUD' &&
    (decision.source === 'FALLBACK' || decision.source === 'MODEL_DISABLED')
  ) {
    return {
      route_mode: routePolicy.config.mode,
      route_lane: 'RULE_ONLY',
      route_reason: `Phase 6.6 cloud lane fell back to RULE_ONLY (${decision.fallback_cause}).`,
      route_clarity: 'CLEAR',
      route_fallback: 'NONE',
      route_policy_hash: routePolicy.policyHash,
    };
  }

  if (
    decision.evaluation_lane === 'LOCAL' &&
    (decision.source === 'FALLBACK' || decision.source === 'MODEL_DISABLED')
  ) {
    return {
      route_mode: routePolicy.config.mode,
      route_lane: 'RULE_ONLY',
      route_reason: cloudLane.reason,
      route_clarity: 'CLEAR',
      route_fallback: cloudLane.routeFallback ?? 'NONE',
      route_policy_hash: routePolicy.policyHash,
    };
  }

  if (!localLane.executable) {
    return {
      route_mode: routePolicy.config.mode,
      route_lane: 'RULE_ONLY',
      route_reason: localLane.reason,
      route_clarity: 'CLEAR',
      route_fallback: localLane.routeFallback ?? 'NONE',
      route_policy_hash: routePolicy.policyHash,
    };
  }

  return {
    route_mode: routePolicy.config.mode,
    route_lane: 'RULE_ONLY',
    route_reason: routePolicy.reason,
    route_clarity: 'CLEAR',
    route_fallback: 'NONE',
    route_policy_hash: routePolicy.policyHash,
  };
}

function resolveLocalLane(
  routePolicy: RoutePolicyResolution,
  input: SaveInput,
  packetValid: boolean,
): RouteLaneDescriptor {
  if (
    routePolicy.status !== 'LOADED' ||
    !routePolicy.config.localLaneEnabled ||
    (routePolicy.config.mode !== 'LOCAL_PREFERRED' &&
      routePolicy.config.mode !== 'CLOUD_ASSISTED')
  ) {
    return DISABLED_ROUTE_LANES.local;
  }

  if (!packetValid) {
    return {
      lane: 'LOCAL',
      enabled: true,
      executable: false,
      reason: INVALID_PACKET_REASON,
      routeFallback: 'PACKET_INVALID',
    };
  }

  if (input.saveMode !== 'EXPLICIT') {
    return {
      lane: 'LOCAL',
      enabled: true,
      executable: false,
      reason: LOCAL_AUTO_SAVE_BLOCKED_REASON,
      routeFallback: 'AUTO_SAVE_BLOCKED',
    };
  }

  return {
    lane: 'LOCAL',
    enabled: true,
    executable: true,
    reason: ENABLED_LOCAL_LANE_REASON,
  };
}

function resolveCloudLane(
  routePolicy: RoutePolicyResolution,
  contextPacket: ContextPacket,
  input: SaveInput,
  packetValid: boolean,
): RouteLaneDescriptor {
  if (
    routePolicy.status !== 'LOADED' ||
    routePolicy.config.mode !== 'CLOUD_ASSISTED' ||
    !routePolicy.config.cloudLaneEnabled
  ) {
    return DISABLED_ROUTE_LANES.cloud;
  }

  if (!packetValid) {
    return {
      lane: 'CLOUD',
      enabled: true,
      executable: false,
      reason: INVALID_PACKET_REASON,
      routeFallback: 'PACKET_INVALID',
    };
  }

  if (input.saveMode !== 'EXPLICIT') {
    return {
      lane: 'CLOUD',
      enabled: true,
      executable: false,
      reason: CLOUD_AUTO_SAVE_BLOCKED_REASON,
      routeFallback: 'AUTO_SAVE_BLOCKED',
    };
  }

  if (contextPacket.data_class !== 'CLOUD_ELIGIBLE') {
    return {
      lane: 'CLOUD',
      enabled: true,
      executable: false,
      reason: `Phase 6.6 cloud lane denied because packet data_class is ${contextPacket.data_class}.`,
      routeFallback: 'DATA_CLASS_DENIED',
    };
  }

  return {
    lane: 'CLOUD',
    enabled: true,
    executable: true,
    reason: ENABLED_CLOUD_LANE_REASON,
  };
}

function normalizeRoutePolicy(
  config: RoutePolicyConfig,
): NormalizedRoutePolicy | undefined {
  if (!config || typeof config !== 'object') {
    return undefined;
  }

  const mode = config.mode ?? 'RULE_ONLY';
  const localLaneEnabled = config.local_lane_enabled ?? false;
  const cloudLaneEnabled = config.cloud_lane_enabled ?? false;
  const cloudDataClass = normalizeCloudDataClass(config.cloud_data_class);
  const governanceMode = config.governance_mode ?? 'ENFORCE';

  if (mode === 'RULE_ONLY') {
    if (localLaneEnabled || cloudLaneEnabled || cloudDataClass !== 'LOCAL_ONLY') {
      return undefined;
    }

    return {
      mode,
      localLaneEnabled: false,
      cloudLaneEnabled: false,
      cloudDataClass: 'LOCAL_ONLY',
      governanceMode,
    };
  }

  if (mode === 'LOCAL_PREFERRED') {
    if (!localLaneEnabled || cloudLaneEnabled || cloudDataClass !== 'LOCAL_ONLY') {
      return undefined;
    }

    return {
      mode,
      localLaneEnabled: true,
      cloudLaneEnabled: false,
      cloudDataClass: 'LOCAL_ONLY',
      governanceMode,
    };
  }

  if (mode === 'CLOUD_ASSISTED') {
    if (!localLaneEnabled || !cloudLaneEnabled) {
      return undefined;
    }

    return {
      mode,
      localLaneEnabled: true,
      cloudLaneEnabled: true,
      cloudDataClass,
      governanceMode,
    };
  }

  return undefined;
}

function normalizeCloudDataClass(value: DataClass | undefined): DataClass {
  if (value === 'CLOUD_ELIGIBLE' || value === 'RESTRICTED') {
    return value;
  }

  return 'LOCAL_ONLY';
}

function loadedRouteReason(config: NormalizedRoutePolicy): string {
  if (config.mode === 'CLOUD_ASSISTED') {
    return `Route policy loaded. Phase 6.6 is in CLOUD_ASSISTED mode with local-first cloud fallback gated by explicit save, packet validation, and data_class ${config.cloudDataClass}.`;
  }

  if (config.mode === 'LOCAL_PREFERRED') {
    return 'Route policy loaded. Phase 6.6 is in LOCAL_PREFERRED mode with the cloud lane disabled.';
  }

  return 'Route policy loaded. The Phase 6.6 router shell remains RULE_ONLY with local and cloud lanes disabled.';
}

function hashPolicy(config: NormalizedRoutePolicy): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      mode: config.mode,
      localLaneEnabled: config.localLaneEnabled,
      cloudLaneEnabled: config.cloudLaneEnabled,
      cloudDataClass: config.cloudDataClass,
      governanceMode: config.governanceMode,
    }))
    .digest('hex');
}
