import { describe, expect, it } from 'vitest';
import { ModelAdapterError, parseModelResponse } from '../../src/adapters/modelAdapter';

describe('model adapter parsing', () => {
  it('parses fenced JSON responses', () => {
    const parsed = parseModelResponse(
      [
        '```json',
        '{"decision":"WARN","reason":"Check schema","risk_level":"HIGH","violated_rules":["rule-schema-file"],"next_action":"Review migration"}',
        '```',
      ].join('\n'),
    );

    expect(parsed.decision).toBe('WARN');
    expect(parsed.risk_level).toBe('HIGH');
  });

  it('rejects malformed payloads', () => {
    expect(() => parseModelResponse('{"decision":"ALLOW"}')).toThrow(ModelAdapterError);
  });
});
