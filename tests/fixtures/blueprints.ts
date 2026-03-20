import fs from 'node:fs';
import path from 'node:path';
import { renderBlueprintTemplate } from '../../src/core/blueprintArtifacts';

export const fixtureDirectiveIds = {
  valid: 'LINTEL-PH5-001',
  other: 'LINTEL-PH5-099',
  invalid: 'lintel ph5',
};

export function createIncompleteBlueprintArtifact(
  workspace: string,
  directiveId = fixtureDirectiveIds.valid,
): { blueprintId: string; blueprintPath: string } {
  const blueprintId = `.arc/blueprints/${directiveId}.md`;
  const blueprintPath = path.join(workspace, blueprintId);
  fs.mkdirSync(path.dirname(blueprintPath), { recursive: true });
  fs.writeFileSync(blueprintPath, renderBlueprintTemplate(directiveId), 'utf8');
  return { blueprintId, blueprintPath };
}

export function createBlueprintArtifact(
  workspace: string,
  directiveId = fixtureDirectiveIds.valid,
): { blueprintId: string; blueprintPath: string } {
  const incomplete = createIncompleteBlueprintArtifact(workspace, directiveId);
  const completed = [
    `# LINTEL Blueprint: ${directiveId}`,
    `**Directive ID:** ${directiveId}`,
    '',
    '## Objective',
    'Document the auth boundary adjustment for this save.',
    '',
    '## Scope',
    '- src/auth/session.ts',
    '',
    '## Constraints',
    '- No cloud routing.',
    '- Keep the change local to the extension pilot.',
    '',
    '## Acceptance Criteria',
    '- Sentinel and Warden review the resulting save path.',
    '',
    '## Rollback Note',
    '- Revert the session logic and discard the save if governance fails.',
    '',
  ].join('\n');
  fs.writeFileSync(incomplete.blueprintPath, completed, 'utf8');
  return incomplete;
}

export function createMalformedBlueprintArtifact(
  workspace: string,
  directiveId = fixtureDirectiveIds.valid,
): { blueprintId: string; blueprintPath: string } {
  const blueprintId = `.arc/blueprints/${directiveId}.md`;
  const blueprintPath = path.join(workspace, blueprintId);
  fs.mkdirSync(path.dirname(blueprintPath), { recursive: true });
  fs.writeFileSync(
    blueprintPath,
    `# Broken Blueprint\n**Directive ID:** ${directiveId}\n`,
    'utf8',
  );
  return { blueprintId, blueprintPath };
}
