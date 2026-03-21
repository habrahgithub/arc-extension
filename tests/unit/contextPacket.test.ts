import { describe, expect, it } from 'vitest';
import { classifyFile } from '../../src/core/classifier';
import {
  MAX_CONTEXT_PACKET_EXCERPT_LENGTH,
  buildContextPacket,
  serializeContextPacket,
  serializeContextPacketPayload,
  validateContextPacket,
} from '../../src/core/contextPacket';
import type { RoutePolicyResolution } from '../../src/contracts/types';
import { DEFAULT_RULES } from '../../src/core/rules';
import { fixtureInputs } from '../fixtures/saveInputs';

const cloudEligiblePolicy: RoutePolicyResolution = {
  status: 'LOADED',
  config: {
    mode: 'CLOUD_ASSISTED',
    localLaneEnabled: true,
    cloudLaneEnabled: true,
    cloudDataClass: 'CLOUD_ELIGIBLE',
  },
  reason: 'Cloud assisted enabled for lab review.',
  policyHash: 'policy-hash-cloud',
};

describe('context packet', () => {
  it('builds a bounded local-only packet for future routed evaluation', () => {
    const input = {
      ...fixtureInputs.auth,
      selectionText:
        'const payload = "'.concat('x'.repeat(300), '";'),
    };
    const classification = classifyFile(input, DEFAULT_RULES);
    const packet = buildContextPacket(classification, input);

    expect(packet.packet_id).toMatch(/^ctx_[a-f0-9]{12}$/);
    expect(packet.data_class).toBe('LOCAL_ONLY');
    expect(packet.sensitivity_marker).toBe('UNASSESSED');
    expect(packet.authority_tag).toBe('LINTEL_LOCAL_ENFORCEMENT');
    expect(packet.excerpt?.length).toBeLessThanOrEqual(MAX_CONTEXT_PACKET_EXCERPT_LENGTH);
    expect(packet.packet_hash).toHaveLength(64);
    expect(validateContextPacket(packet)).toEqual({ ok: true, issues: [] });
    expect(serializeContextPacket(packet)).toContain('"authority_tag": "LINTEL_LOCAL_ENFORCEMENT"');
    expect(serializeContextPacketPayload(packet)).toContain('"data_class":"LOCAL_ONLY"');
  });

  it('builds a CLOUD_ELIGIBLE packet only when explicit cloud policy enables it', () => {
    const classification = classifyFile(fixtureInputs.auth, DEFAULT_RULES);
    const packet = buildContextPacket(
      classification,
      fixtureInputs.auth,
      undefined,
      cloudEligiblePolicy,
    );

    expect(packet.data_class).toBe('CLOUD_ELIGIBLE');
    expect(validateContextPacket(packet, cloudEligiblePolicy)).toEqual({
      ok: true,
      issues: [],
    });
    expect(validateContextPacket(packet).ok).toBe(false);
    expect(serializeContextPacketPayload(packet)).toContain('"data_class":"CLOUD_ELIGIBLE"');
  });

  it('rejects malformed authority, trust-boundary values, invalid hash/id, and oversized excerpts', () => {
    const classification = classifyFile(fixtureInputs.auth, DEFAULT_RULES);
    const packet = buildContextPacket(classification, fixtureInputs.auth);
    const invalid = {
      ...packet,
      packet_id: 'ctx_invalid',
      packet_hash: '0'.repeat(64),
      authority_tag: 'FORGED' as typeof packet.authority_tag,
      data_class: 'CLOUD_ELIGIBLE' as typeof packet.data_class,
      sensitivity_marker: 'GOVERNED_CHANGE' as typeof packet.sensitivity_marker,
      excerpt: 'x'.repeat(MAX_CONTEXT_PACKET_EXCERPT_LENGTH + 1),
      heuristic_only: false as true,
    };

    const validation = validateContextPacket(invalid);

    expect(validation.ok).toBe(false);
    expect(validation.issues.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        'INVALID_PACKET_ID',
        'INVALID_PACKET_HASH',
        'INVALID_AUTHORITY_TAG',
        'INVALID_DATA_CLASS',
        'INVALID_SENSITIVITY_MARKER',
        'INVALID_EXCERPT_BOUNDS',
        'INVALID_HEURISTIC_ONLY',
      ]),
    );
  });

  it('does not derive packet content from full document text when no selection exists', () => {
    const classification = classifyFile(
      {
        ...fixtureInputs.auth,
        text: 'SECRET_FULL_FILE_CONTENT',
        selectionText: undefined,
      },
      DEFAULT_RULES,
    );
    const packet = buildContextPacket(
      classification,
      {
        ...fixtureInputs.auth,
        text: 'SECRET_FULL_FILE_CONTENT',
        selectionText: undefined,
      },
    );

    expect(packet.excerpt).toBeUndefined();
    expect(serializeContextPacket(packet)).not.toContain('SECRET_FULL_FILE_CONTENT');
  });
});
