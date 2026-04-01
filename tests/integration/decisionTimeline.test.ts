import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DisabledModelAdapter } from '../../src/adapters/modelAdapter';
import { renderDecisionTimeline } from '../../src/extension/decisionTimeline';
import { SaveOrchestrator } from '../../src/extension/saveOrchestrator';
import { fixtureInputs } from '../fixtures/saveInputs';

const workspaces: string[] = [];

function makeWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-timeline-'));
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

describe('decision timeline visibility', () => {
  it('renders ordered timeline for active file decision lifecycle', async () => {
    const workspace = makeWorkspace();
    const orchestrator = new SaveOrchestrator(workspace, new DisabledModelAdapter());
    const filePath = path.join(workspace, 'src', 'example.ts');
    const text = 'export const timeline = true;\n';

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, text, 'utf8');

    const assessed = await orchestrator.assessSave({
      ...fixtureInputs.auth,
      filePath,
      fileName: path.basename(filePath),
      text,
      previousText: text,
    });
    orchestrator.commitAssessment(assessed, true);
    await orchestrator.observeExecution('workbench.action.files.save', filePath);
    await orchestrator.observeCommit(filePath, 'export const timeline = false;\n');

    const timeline = renderDecisionTimeline(workspace, filePath);

    expect(timeline.available).toBe(true);
    expect(timeline.message).toContain('ARC — Decision Timeline');
    expect(timeline.message).toContain('File:');
    expect(timeline.message).toContain('[1] SAVE');
    expect(timeline.message).toContain('[2] RUN');
    expect(timeline.message).toContain('[3] COMMIT');
    expect(timeline.message).toContain('DRIFT_DETECTED');
  });

  it('returns no-timeline message when file has no decision records', () => {
    const workspace = makeWorkspace();
    const filePath = path.join(workspace, 'src', 'empty.ts');

    const timeline = renderDecisionTimeline(workspace, filePath);

    expect(timeline.available).toBe(false);
    expect(timeline.message).toBe('ARC: No decision timeline available for this file');
  });
});
