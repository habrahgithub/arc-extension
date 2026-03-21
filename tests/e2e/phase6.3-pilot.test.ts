import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  MAX_CONTEXT_PACKET_EXCERPT_LENGTH,
  serializeContextPacket,
  validateContextPacket,
} from '../../src/core/contextPacket';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import { fixtureInputs } from '../fixtures/saveInputs';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-phase63-'));
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

describe('Phase 6.3 pilot', () => {
  it('keeps Context Bus packets validated, bounded, and inert under RULE_ONLY posture', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace);
    const assessed = await orchestrator.assessSave({
      ...fixtureInputs.auth,
      text: 'FULL_FILE_DO_NOT_EXPORT',
      selectionText: 'const scoped = "'.concat('x'.repeat(220), '";'),
    });

    const serialized = serializeContextPacket(assessed.contextPacket);
    const validation = validateContextPacket(assessed.contextPacket);

    expect(assessed.decision.route_mode).toBe('RULE_ONLY');
    expect(assessed.decision.route_lane).toBe('RULE_ONLY');
    expect(validation).toEqual({ ok: true, issues: [] });
    expect(assessed.contextPacket.authority_tag).toBe('LINTEL_LOCAL_ENFORCEMENT');
    expect(assessed.contextPacket.data_class).toBe('LOCAL_ONLY');
    expect(assessed.contextPacket.sensitivity_marker).toBe('UNASSESSED');
    expect(assessed.contextPacket.excerpt?.length).toBeLessThanOrEqual(MAX_CONTEXT_PACKET_EXCERPT_LENGTH);
    expect(serialized).not.toContain('FULL_FILE_DO_NOT_EXPORT');
    expect(serialized).not.toContain('CLOUD_ELIGIBLE');
    expect(serialized).not.toContain('GOVERNED_CHANGE');
  });
});
