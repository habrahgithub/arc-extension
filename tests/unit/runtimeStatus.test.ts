import { describe, expect, it } from 'vitest';
import {
  RUNTIME_STATUS_CLOUD_NOTICE,
  RUNTIME_STATUS_FAIL_CLOSED_NOTE,
  RUNTIME_STATUS_OBSERVATIONAL_NOTICE,
  renderRuntimeStatusMarkdown,
} from '../../src/extension/runtimeStatus';

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
    expect(markdown).toContain(RUNTIME_STATUS_OBSERVATIONAL_NOTICE);
    expect(markdown).toContain(RUNTIME_STATUS_CLOUD_NOTICE);
    expect(markdown).toContain(
      'Auto-save remains reduced-guarantee and would still fail closed to `RULE_ONLY`',
    );
  });

  it('keeps fail-closed reporting explicit when route policy is missing', () => {
    const markdown = renderRuntimeStatusMarkdown({
      target: {
        filePath: '/workspace/README.md',
        workspaceFolderRoot: '/workspace',
        effectiveRoot: '/workspace',
        reason: 'WORKSPACE_FOLDER',
        markers: [],
      },
      autoSaveMode: 'off',
      routePolicy: {
        status: 'MISSING',
        config: {
          mode: 'RULE_ONLY',
          localLaneEnabled: false,
          cloudLaneEnabled: false,
          cloudDataClass: 'LOCAL_ONLY',
        },
        reason: 'No route policy config was found.',
        policyHash: 'root',
      },
    });

    expect(markdown).toContain(RUNTIME_STATUS_FAIL_CLOSED_NOTE);
    expect(markdown).toContain(
      'Current route policy state would fail closed to `RULE_ONLY` because the configured route policy is missing or invalid.',
    );
    expect(markdown).toContain(RUNTIME_STATUS_CLOUD_NOTICE);
  });
});
