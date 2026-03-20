import fs from 'node:fs';
import path from 'node:path';
import type { PerformanceEntry } from '../contracts/types';

export class LocalPerformanceRecorder {
  constructor(private readonly workspaceRoot: string) {}

  perfPath(): string {
    return path.join(this.workspaceRoot, '.arc', 'perf.jsonl');
  }

  ensureReady(): void {
    const arcDir = path.join(this.workspaceRoot, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });

    const gitignorePath = path.join(arcDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, 'audit.jsonl\narchive/\nperf.jsonl\n', 'utf8');
    } else {
      const contents = fs.readFileSync(gitignorePath, 'utf8');
      if (!contents.includes('perf.jsonl')) {
        fs.writeFileSync(
          gitignorePath,
          `${contents.trimEnd()}\nperf.jsonl\n`,
          'utf8',
        );
      }
    }

    if (!fs.existsSync(this.perfPath())) {
      fs.writeFileSync(this.perfPath(), '', 'utf8');
    }
  }

  record(entry: PerformanceEntry): void {
    this.ensureReady();
    fs.appendFileSync(this.perfPath(), `${JSON.stringify(entry)}\n`, 'utf8');
  }
}

export async function measureAsync<T>(
  record: (entry: PerformanceEntry) => void,
  operation: PerformanceEntry['operation'],
  action: () => Promise<T>,
  metadata?: PerformanceEntry['metadata'],
): Promise<T> {
  const started = performance.now();
  try {
    return await action();
  } finally {
    record({
      ts: new Date().toISOString(),
      operation,
      duration_ms: Number((performance.now() - started).toFixed(3)),
      metadata,
    });
  }
}

export function measureSync<T>(
  record: (entry: PerformanceEntry) => void,
  operation: PerformanceEntry['operation'],
  action: () => T,
  metadata?: PerformanceEntry['metadata'],
): T {
  const started = performance.now();
  try {
    return action();
  } finally {
    record({
      ts: new Date().toISOString(),
      operation,
      duration_ms: Number((performance.now() - started).toFixed(3)),
      metadata,
    });
  }
}
