import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import { fixtureInputs } from '../fixtures/saveInputs';

describe('phase 6.0 pilot scenarios', () => {
  it('preserves the active Phase 5 decision matrix while activation scaffolding is inactive', async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-e2e-ph6-'));
    const orchestrator = new SaveOrchestrator(workspace);

    const expectations = [
      { input: fixtureInputs.button, decision: 'ALLOW', prompt: false },
      { input: fixtureInputs.auth, decision: 'REQUIRE_PLAN', prompt: true },
      { input: fixtureInputs.schema, decision: 'WARN', prompt: true },
      { input: fixtureInputs.authSchema, decision: 'BLOCK', prompt: false },
      { input: fixtureInputs.autoAuth, decision: 'REQUIRE_PLAN', prompt: false },
    ] as const;

    for (const expectation of expectations) {
      const assessed = await orchestrator.assessSave(expectation.input);
      expect(assessed.decision.decision).toBe(expectation.decision);
      expect(assessed.shouldPrompt).toBe(expectation.prompt);
      expect(assessed.decision.route_mode).toBe('RULE_ONLY');
      expect(assessed.decision.route_lane).toBe('RULE_ONLY');
      expect(assessed.contextPacket.data_class).toBe('LOCAL_ONLY');
    }

    fs.rmSync(workspace, { recursive: true, force: true });
  });
});
