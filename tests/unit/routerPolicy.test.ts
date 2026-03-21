import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { classifyFile } from '../../src/core/classifier';
import { buildContextPacket } from '../../src/core/contextPacket';
import { DEFAULT_RULES } from '../../src/core/rules';
import {
  DISABLED_ROUTE_LANES,
  RoutePolicyStore,
  RouterShell,
  buildRouteMetadata,
} from '../../src/core/routerPolicy';
import { fixtureInputs } from '../fixtures/saveInputs';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-router-'));
  workspaces.push(workspace);
  return workspace;
}

afterEach(() => {
  while (workspaces.length > 0) {
    const workspace = workspaces.pop();
    if (workspace) {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }
});

describe('route policy store', () => {
  it('fails closed to RULE_ONLY when config is missing', () => {
    const workspace = makeWorkspace();
    const resolution = new RoutePolicyStore(workspace).load();

    expect(resolution.status).toBe('MISSING');
    expect(resolution.config.mode).toBe('RULE_ONLY');
    expect(resolution.config.localLaneEnabled).toBe(false);
    expect(resolution.config.cloudLaneEnabled).toBe(false);
  });

  it('accepts CLOUD_ASSISTED only when both lanes are enabled and cloud data class is explicit or fail-closed', () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'CLOUD_ASSISTED',
        local_lane_enabled: true,
        cloud_lane_enabled: true,
        cloud_data_class: 'CLOUD_ELIGIBLE',
      }),
      'utf8',
    );

    const resolution = new RoutePolicyStore(workspace).load();
    expect(resolution.status).toBe('LOADED');
    expect(resolution.config.mode).toBe('CLOUD_ASSISTED');
    expect(resolution.config.localLaneEnabled).toBe(true);
    expect(resolution.config.cloudLaneEnabled).toBe(true);
    expect(resolution.config.cloudDataClass).toBe('CLOUD_ELIGIBLE');
  });

  it('accepts explicit RULE_ONLY config with lanes disabled', () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'RULE_ONLY',
        local_lane_enabled: false,
        cloud_lane_enabled: false,
      }),
      'utf8',
    );

    const resolution = new RoutePolicyStore(workspace).load();
    expect(resolution.status).toBe('LOADED');
    expect(resolution.config.mode).toBe('RULE_ONLY');
    expect(resolution.config.cloudDataClass).toBe('LOCAL_ONLY');
  });

  it('accepts LOCAL_PREFERRED only when the local lane is enabled and the cloud lane stays disabled', () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'LOCAL_PREFERRED',
        local_lane_enabled: true,
        cloud_lane_enabled: false,
      }),
      'utf8',
    );

    const resolution = new RoutePolicyStore(workspace).load();
    expect(resolution.status).toBe('LOADED');
    expect(resolution.config.mode).toBe('LOCAL_PREFERRED');
    expect(resolution.config.localLaneEnabled).toBe(true);
    expect(resolution.config.cloudLaneEnabled).toBe(false);
    expect(resolution.config.cloudDataClass).toBe('LOCAL_ONLY');
  });

  it('rejects LOCAL_PREFERRED when the local lane is not enabled', () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'LOCAL_PREFERRED',
        local_lane_enabled: false,
        cloud_lane_enabled: false,
      }),
      'utf8',
    );

    const resolution = new RoutePolicyStore(workspace).load();
    expect(resolution.status).toBe('INVALID');
    expect(resolution.config.mode).toBe('RULE_ONLY');
  });

  it('rejects CLOUD_ASSISTED when the local lane is not enabled first', () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'CLOUD_ASSISTED',
        local_lane_enabled: false,
        cloud_lane_enabled: true,
        cloud_data_class: 'CLOUD_ELIGIBLE',
      }),
      'utf8',
    );

    const resolution = new RoutePolicyStore(workspace).load();
    expect(resolution.status).toBe('INVALID');
    expect(resolution.config.mode).toBe('RULE_ONLY');
  });

  it('resolves explicit-save local lane activation through the single authoritative route-policy path', () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'LOCAL_PREFERRED',
        local_lane_enabled: true,
        cloud_lane_enabled: false,
      }),
      'utf8',
    );

    const resolution = new RoutePolicyStore(workspace).load();
    const classification = classifyFile(fixtureInputs.auth, DEFAULT_RULES);
    const contextPacket = buildContextPacket(classification, fixtureInputs.auth);
    const shell = new RouterShell().resolve(resolution, contextPacket, fixtureInputs.auth);

    expect(shell.routePolicy).toBe(resolution);
    expect(shell.shouldUseModel).toBe(true);
    expect(shell.shouldUseCloudModel).toBe(false);
    expect(shell.localLane.enabled).toBe(true);
    expect(shell.localLane.executable).toBe(true);
    expect(shell.cloudLane.enabled).toBe(false);

    const metadata = buildRouteMetadata(shell, {
      decision: 'WARN',
      reason: 'model tightened',
      risk_level: 'HIGH',
      violated_rules: ['AUTH_CHANGE'],
      next_action: 'Review',
      source: 'MODEL',
      fallback_cause: 'NONE',
      lease_status: 'BYPASSED',
      evaluation_lane: 'LOCAL',
    });
    expect(metadata.route_mode).toBe('LOCAL_PREFERRED');
    expect(metadata.route_lane).toBe('LOCAL');
    expect(metadata.route_fallback).toBe('NONE');
  });

  it('blocks local lane execution for auto-save and falls back to RULE_ONLY metadata', () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'LOCAL_PREFERRED',
        local_lane_enabled: true,
        cloud_lane_enabled: false,
      }),
      'utf8',
    );

    const resolution = new RoutePolicyStore(workspace).load();
    const classification = classifyFile(fixtureInputs.autoAuth, DEFAULT_RULES);
    const contextPacket = buildContextPacket(classification, fixtureInputs.autoAuth);
    const shell = new RouterShell().resolve(
      resolution,
      contextPacket,
      fixtureInputs.autoAuth,
    );

    expect(shell.shouldUseModel).toBe(false);
    expect(shell.shouldUseCloudModel).toBe(false);
    expect(shell.localLane.enabled).toBe(true);
    expect(shell.localLane.executable).toBe(false);

    const metadata = buildRouteMetadata(shell, {
      decision: 'REQUIRE_PLAN',
      reason: 'rule floor',
      risk_level: 'HIGH',
      violated_rules: ['AUTH_CHANGE'],
      next_action: 'Provide blueprint',
      source: 'MODEL_DISABLED',
      fallback_cause: 'MODEL_DISABLED',
      lease_status: 'BYPASSED',
      evaluation_lane: 'LOCAL',
    });
    expect(metadata.route_mode).toBe('LOCAL_PREFERRED');
    expect(metadata.route_lane).toBe('RULE_ONLY');
    expect(metadata.route_fallback).toBe('AUTO_SAVE_BLOCKED');
  });

  it('denies cloud execution when the packet remains LOCAL_ONLY under CLOUD_ASSISTED policy', () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'CLOUD_ASSISTED',
        local_lane_enabled: true,
        cloud_lane_enabled: true,
      }),
      'utf8',
    );

    const resolution = new RoutePolicyStore(workspace).load();
    const classification = classifyFile(fixtureInputs.auth, DEFAULT_RULES);
    const contextPacket = buildContextPacket(classification, fixtureInputs.auth, undefined, resolution);
    const shell = new RouterShell().resolve(resolution, contextPacket, fixtureInputs.auth);

    expect(shell.shouldUseModel).toBe(true);
    expect(shell.shouldUseCloudModel).toBe(false);
    expect(shell.cloudLane.enabled).toBe(true);
    expect(shell.cloudLane.executable).toBe(false);
    expect(shell.cloudLane.routeFallback).toBe('DATA_CLASS_DENIED');
  });

  it('enables cloud fallback only when CLOUD_ASSISTED policy marks packets as CLOUD_ELIGIBLE', () => {
    const workspace = makeWorkspace();
    fs.mkdirSync(path.join(workspace, '.arc'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.arc', 'router.json'),
      JSON.stringify({
        mode: 'CLOUD_ASSISTED',
        local_lane_enabled: true,
        cloud_lane_enabled: true,
        cloud_data_class: 'CLOUD_ELIGIBLE',
      }),
      'utf8',
    );

    const resolution = new RoutePolicyStore(workspace).load();
    const classification = classifyFile(fixtureInputs.auth, DEFAULT_RULES);
    const contextPacket = buildContextPacket(classification, fixtureInputs.auth, undefined, resolution);
    const shell = new RouterShell().resolve(resolution, contextPacket, fixtureInputs.auth);

    expect(contextPacket.data_class).toBe('CLOUD_ELIGIBLE');
    expect(shell.shouldUseModel).toBe(true);
    expect(shell.shouldUseCloudModel).toBe(true);
    expect(shell.cloudLane.enabled).toBe(true);
    expect(shell.cloudLane.executable).toBe(true);

    const metadata = buildRouteMetadata(shell, {
      decision: 'BLOCK',
      reason: 'Cloud fallback tightened the decision.',
      risk_level: 'CRITICAL',
      violated_rules: ['AUTH_CHANGE'],
      next_action: 'Block',
      source: 'CLOUD_MODEL',
      fallback_cause: 'NONE',
      lease_status: 'BYPASSED',
      evaluation_lane: 'CLOUD',
    });
    expect(metadata.route_mode).toBe('CLOUD_ASSISTED');
    expect(metadata.route_lane).toBe('CLOUD');
  });

  it('keeps the default disabled cloud lane descriptor structurally non-executable', () => {
    expect(DISABLED_ROUTE_LANES.cloud).toMatchObject({
      lane: 'CLOUD',
      enabled: false,
      executable: false,
    });
    expect('execute' in DISABLED_ROUTE_LANES.cloud).toBe(false);
  });
});
