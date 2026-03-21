import { describe, expect, it } from 'vitest';
import { renderRuntimeStatusMarkdown } from '../../src/extension/runtimeStatus';

describe('renderRuntimeStatusMarkdown', () => {
  it('renders workspace target and route posture clearly', () => {
    const markdown = renderRuntimeStatusMarkdown({
      target: {
        filePath: '/workspace/projects/demo/src/auth/session.ts',
        workspaceFolderRoot: '/workspace',
        effectiveRoot: '/workspace/projects/demo',
        reason: 'NESTED_BOUNDARY',
        markers: ['.git', 'package.json'],
      },
      autoSaveMode: 'afterDelay',
      routePolicy: {
        status: 'LOADED',
        config: {
          mode: 'LOCAL_PREFERRED',
          localLaneEnabled: true,
          cloudLaneEnabled: false,
          cloudDataClass: 'LOCAL_ONLY',
        },
        reason: 'Route policy loaded.',
        policyHash: 'abc123',
      },
    });

    expect(markdown).toContain('Effective governed root');
    expect(markdown).toContain('/workspace/projects/demo');
    expect(markdown).toContain('Nearest nested project boundary');
    expect(markdown).toContain('LOCAL_PREFERRED');
    expect(markdown).toContain('Diagnostics are observational only');
  });
});
