import fs from 'node:fs';
import path from 'node:path';
import type { ActorIdentity, Classification, DecisionPayload, OverrideEntry } from '../contracts/types';

export class OverrideLogWriter {
  constructor(private readonly workspaceRoot: string) {}

  overridePath(): string {
    return path.join(this.workspaceRoot, '.arc', 'overrides.jsonl');
  }

  append(
    classification: Classification,
    decision: DecisionPayload,
    actor?: ActorIdentity,
  ): OverrideEntry {
    const arcDir = path.join(this.workspaceRoot, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });

    const entry: OverrideEntry = {
      ts: new Date().toISOString(),
      file_path: classification.filePath,
      decision: decision.decision,
      risk_level: decision.risk_level,
      violated_rules: decision.violated_rules,
      ...(actor !== undefined ? { actor } : {}),
      ...(decision.directive_id !== undefined ? { directive_id: decision.directive_id } : {}),
      ...(decision.blueprint_id !== undefined ? { blueprint_id: decision.blueprint_id } : {}),
      ...(decision.governance_mode !== undefined ? { governance_mode: decision.governance_mode } : {}),
    };

    fs.appendFileSync(this.overridePath(), `${JSON.stringify(entry)}\n`, 'utf8');
    return entry;
  }
}
