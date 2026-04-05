import fs from 'node:fs';
import path from 'node:path';
import type {
  BlueprintArtifactLink,
  BlueprintMode,
  DirectiveProofInput,
} from '../contracts/types';

const REQUIRED_SECTIONS = [
  {
    heading: '## Objective',
    placeholder:
      '[REQUIRED] Describe the specific change intent for this save.',
  },
  {
    heading: '## Scope',
    placeholder: '[REQUIRED] List the files or surfaces this directive covers.',
  },
  {
    heading: '## Constraints',
    placeholder:
      '[REQUIRED] Record the non-scope, risk bounds, and governance constraints.',
  },
  {
    heading: '## Acceptance Criteria',
    placeholder:
      '[REQUIRED] Define how this change will be reviewed, tested, and validated.',
  },
  {
    heading: '## Rollback Note',
    placeholder:
      '[REQUIRED] Describe how to revert the change locally if the save must be undone.',
  },
] as const;

export const DIRECTIVE_ID_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/;
export const DEFAULT_BLUEPRINT_MODE: BlueprintMode = 'LOCAL_ONLY';
export const MIN_SECTION_BODY_LENGTH = 12;

export type BlueprintProofStatus =
  | 'VALID'
  | 'MISSING_DIRECTIVE'
  | 'INVALID_DIRECTIVE'
  | 'MISSING_ARTIFACT'
  | 'MISMATCHED_BLUEPRINT_ID'
  | 'MALFORMED_ARTIFACT'
  | 'INCOMPLETE_ARTIFACT'
  | 'UNAUTHORIZED_MODE';

export interface BlueprintProofResolution {
  ok: boolean;
  status: BlueprintProofStatus;
  reason: string;
  nextAction: string;
  link?: BlueprintArtifactLink;
}

export class BlueprintArtifactStore {
  constructor(private readonly workspaceRoot: string) {}

  canonicalBlueprintId(directiveId: string): string {
    return `.arc/blueprints/${directiveId}.md`;
  }

  blueprintPath(directiveId: string): string {
    return path.join(
      this.workspaceRoot,
      this.canonicalBlueprintId(directiveId),
    );
  }

  ensureBlueprintTemplate(directiveId: string): BlueprintArtifactLink {
    if (!isValidDirectiveId(directiveId)) {
      throw new Error(`Invalid directive ID: ${directiveId}`);
    }

    const blueprintPath = this.blueprintPath(directiveId);
    fs.mkdirSync(path.dirname(blueprintPath), { recursive: true });

    if (!fs.existsSync(blueprintPath)) {
      fs.writeFileSync(
        blueprintPath,
        renderBlueprintTemplate(directiveId),
        'utf8',
      );
    }

    return {
      directiveId,
      blueprintId: this.canonicalBlueprintId(directiveId),
      blueprintPath,
    };
  }

  resolveProof(proof?: DirectiveProofInput): BlueprintProofResolution {
    const mode = proof?.blueprintMode ?? DEFAULT_BLUEPRINT_MODE;
    if (mode !== DEFAULT_BLUEPRINT_MODE) {
      return {
        ok: false,
        status: 'UNAUTHORIZED_MODE',
        reason:
          'Shared or team blueprint handling is not authorized in Phase 5. The extension operates in LOCAL_ONLY mode.',
        nextAction:
          'Use LOCAL_ONLY blueprint handling or request a new Axis directive for team features.',
      };
    }

    if (!proof?.directiveId) {
      return {
        ok: false,
        status: 'MISSING_DIRECTIVE',
        reason:
          'Plan-linked saves require a Change ID (e.g., ARC-101) and a linked local blueprint artifact.',
        nextAction:
          'Provide a Change ID and create the local blueprint before saving.',
      };
    }

    if (!isValidDirectiveId(proof.directiveId)) {
      return {
        ok: false,
        status: 'INVALID_DIRECTIVE',
        reason: `Change ID "${proof.directiveId}" is not valid. Use uppercase, hyphenated format (e.g., ARC-101).`,
        nextAction: 'Use an uppercase, hyphenated Change ID. Example: ARC-101',
      };
    }

    const canonicalBlueprintId = this.canonicalBlueprintId(proof.directiveId);
    if (proof.blueprintId && proof.blueprintId !== canonicalBlueprintId) {
      return {
        ok: false,
        status: 'MISMATCHED_BLUEPRINT_ID',
        reason:
          'The supplied blueprint linkage does not match the canonical Phase 5 artifact path.',
        nextAction: `Link the save to ${canonicalBlueprintId}. The extension validates only local blueprint files in .arc/blueprints/, not Axis execution packages.`,
      };
    }

    const blueprintPath = this.blueprintPath(proof.directiveId);
    if (!fs.existsSync(blueprintPath)) {
      return {
        ok: false,
        status: 'MISSING_ARTIFACT',
        reason:
          'No local blueprint artifact exists for this REQUIRE_PLAN save.',
        nextAction: `Create ${canonicalBlueprintId} before saving. Note: Template creation is the starting point — you must replace all placeholder content before the blueprint can authorize a save.`,
      };
    }

    const contents = fs.readFileSync(blueprintPath, 'utf8');
    if (!hasBlueprintStructure(contents, proof.directiveId)) {
      return {
        ok: false,
        status: 'MALFORMED_ARTIFACT',
        reason:
          'The linked blueprint artifact is missing required Phase 5 sections or directive metadata.',
        nextAction:
          'Repair the local blueprint so it includes the directive ID and all required sections (Objective, Scope, Constraints, Acceptance Criteria, Rollback Note).',
      };
    }

    const completeness = validateBlueprintContent(contents);
    if (!completeness.ok) {
      return {
        ok: false,
        status: 'INCOMPLETE_ARTIFACT',
        reason: `${completeness.reason} The blueprint must contain directive-specific content, not placeholder text.`,
        nextAction:
          'Replace all placeholder guidance (marked [REQUIRED]) with directive-specific content. The INCOMPLETE_TEMPLATE status banner must be removed by completing all sections.',
      };
    }

    return {
      ok: true,
      status: 'VALID',
      reason:
        'Blueprint linkage is valid. All required sections contain directive-specific content.',
      nextAction: 'Proceed with the plan-backed save.',
      link: {
        directiveId: proof.directiveId,
        blueprintId: canonicalBlueprintId,
        blueprintPath,
      },
    };
  }
}

export function isValidDirectiveId(value: string): boolean {
  return DIRECTIVE_ID_PATTERN.test(value);
}

export function renderBlueprintTemplate(directiveId: string): string {
  return [
    `# ARC XT Blueprint: ${directiveId}`,
    `**Directive ID:** ${directiveId}`,
    '',
    '> Status: INCOMPLETE_TEMPLATE',
    '> Phase 5 requires every section below to contain directive-specific, non-placeholder content before this file can authorize a save.',
    '',
    ...REQUIRED_SECTIONS.flatMap((section) => [
      section.heading,
      section.placeholder,
      '',
    ]),
  ].join('\n');
}

export function hasBlueprintStructure(
  contents: string,
  directiveId: string,
): boolean {
  if (!contents.includes(`**Directive ID:** ${directiveId}`)) {
    return false;
  }

  return REQUIRED_SECTIONS.every((section) =>
    contents.includes(section.heading),
  );
}

export function validateBlueprintContent(
  contents: string,
): { ok: true } | { ok: false; reason: string } {
  const normalized = contents.replace(/\r\n/g, '\n');

  for (const section of REQUIRED_SECTIONS) {
    if (normalized.includes(section.placeholder)) {
      return {
        ok: false,
        reason: `${section.heading.replace('## ', '')} still contains placeholder content.`,
      };
    }

    const body = sectionBody(normalized, section.heading);
    if (!body || body.length < MIN_SECTION_BODY_LENGTH) {
      return {
        ok: false,
        reason: `${section.heading.replace('## ', '')} does not contain enough directive-specific content (minimum ${MIN_SECTION_BODY_LENGTH} characters).`,
      };
    }
  }

  if (normalized.includes('INCOMPLETE_TEMPLATE')) {
    return {
      ok: false,
      reason: 'The blueprint still declares itself as an incomplete template.',
    };
  }

  return { ok: true };
}

function sectionBody(contents: string, heading: string): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${escapedHeading}\\n([\\s\\S]*?)(?:\\n## |$)`);
  const match = contents.match(pattern);
  if (!match) {
    return '';
  }

  return match[1].replace(/\n/g, ' ').trim();
}

// ============================================================
// U07 — Canonical ## Tasks blueprint convention
// U08 — Parse blueprint tasks/todos into extension-visible state
// ============================================================

const TASK_HEADING = '## Tasks';
const TASK_LINE_PATTERN = /^\s*[-*]\s+\[([ xX])\]\s+(.+)$/;

export interface ParsedTaskLine {
  checked: boolean;
  text: string;
  lineIndex: number;
}

export function parseBlueprintTasks(contents: string): ParsedTaskLine[] {
  const lines = contents.replace(/\r\n/g, '\n').split('\n');
  const tasks: ParsedTaskLine[] = [];
  let inTasksSection = false;
  let lineIndex = 0;

  for (const line of lines) {
    lineIndex++;
    if (line.trim() === TASK_HEADING) {
      inTasksSection = true;
      continue;
    }

    // End of Tasks section at next heading
    if (inTasksSection && line.startsWith('## ')) {
      break;
    }

    if (inTasksSection) {
      const match = line.match(TASK_LINE_PATTERN);
      if (match) {
        const checked = match[1].toLowerCase() === 'x';
        const text = match[2].trim();
        if (text.length > 0) {
          tasks.push({ checked, text, lineIndex });
        }
      }
    }
  }

  return tasks;
}

export function hasTasksSection(contents: string): boolean {
  return contents.includes(TASK_HEADING);
}
