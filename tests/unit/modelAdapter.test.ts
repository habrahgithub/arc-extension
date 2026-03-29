import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_OLLAMA_ENDPOINT,
  ModelAdapterError,
  OllamaModelAdapter,
  parseModelResponse,
} from '../../src/adapters/modelAdapter';

const originalEnv = {
  OLLAMA_HOST: process.env.OLLAMA_HOST,
  SWD_SUBAGENT_MODEL: process.env.SWD_SUBAGENT_MODEL,
  OLLAMA_TIMEOUT_MS: process.env.OLLAMA_TIMEOUT_MS,
  OLLAMA_RETRIES: process.env.OLLAMA_RETRIES,
};

afterEach(() => {
  if (originalEnv.OLLAMA_HOST === undefined) {
    delete process.env.OLLAMA_HOST;
  } else {
    process.env.OLLAMA_HOST = originalEnv.OLLAMA_HOST;
  }
  if (originalEnv.SWD_SUBAGENT_MODEL === undefined) {
    delete process.env.SWD_SUBAGENT_MODEL;
  } else {
    process.env.SWD_SUBAGENT_MODEL = originalEnv.SWD_SUBAGENT_MODEL;
  }
  if (originalEnv.OLLAMA_TIMEOUT_MS === undefined) {
    delete process.env.OLLAMA_TIMEOUT_MS;
  } else {
    process.env.OLLAMA_TIMEOUT_MS = originalEnv.OLLAMA_TIMEOUT_MS;
  }
  if (originalEnv.OLLAMA_RETRIES === undefined) {
    delete process.env.OLLAMA_RETRIES;
  } else {
    process.env.OLLAMA_RETRIES = originalEnv.OLLAMA_RETRIES;
  }
  vi.unstubAllGlobals();
});

function createJsonResponse(responseText: string): {
  ok: boolean;
  json: () => Promise<{ response: string }>;
} {
  return {
    ok: true,
    json: async () => {
      await Promise.resolve();
      return { response: responseText };
    },
  };
}

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
    expect(() => parseModelResponse('{"decision":"ALLOW"}')).toThrow(
      ModelAdapterError,
    );
  });

  it('rejects contradictory allow responses with elevated risk', () => {
    expect(() =>
      parseModelResponse(
        '{"decision":"ALLOW","reason":"looks fine","risk_level":"HIGH","violated_rules":[],"next_action":"save"}',
      ),
    ).toThrow(ModelAdapterError);
  });
});

describe('ollama adapter configuration', () => {
  it('reads bounded local configuration from environment variables', async () => {
    process.env.OLLAMA_HOST = 'localhost:11434';
    process.env.SWD_SUBAGENT_MODEL = 'qwen3.5:9b';
    process.env.OLLAMA_TIMEOUT_MS = '4500';
    process.env.OLLAMA_RETRIES = '2';

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse(
          '{"decision":"WARN","reason":"Check auth","risk_level":"HIGH","violated_rules":["AUTH_CHANGE"],"next_action":"Review"}',
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new OllamaModelAdapter({ enabledByDefault: true });
    const result = await adapter.evaluate({
      file_path: 'src/auth/session.ts',
      risk_flags: ['AUTH_CHANGE'],
      matched_rule_ids: ['rule-auth-path'],
      heuristic_only: true,
    });

    expect(result?.decision).toBe('WARN');
    // Warmup ping + actual evaluation = 2 calls
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://localhost:11434/api/generate',
    );
    const requestInit = fetchMock.mock.calls[1]?.[1] as RequestInit | undefined;
    expect(typeof requestInit?.body).toBe('string');
    const body = JSON.parse(requestInit?.body as string) as { model: string };
    expect(body.model).toBe('qwen3.5:9b');
  });

  it('retries transient unavailable errors and then succeeds', async () => {
    process.env.OLLAMA_HOST = '127.0.0.1:11434';
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('socket closed'))
      .mockResolvedValueOnce(
        createJsonResponse(
          '{"decision":"WARN","reason":"Check auth","risk_level":"HIGH","violated_rules":["AUTH_CHANGE"],"next_action":"Review"}',
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new OllamaModelAdapter({
      enabledByDefault: true,
      retries: 1,
    });
    const result = await adapter.evaluate({
      file_path: 'src/auth/session.ts',
      risk_flags: ['AUTH_CHANGE'],
      matched_rule_ids: ['rule-auth-path'],
      heuristic_only: true,
    });

    expect(result?.decision).toBe('WARN');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fails closed when a non-local host is configured', async () => {
    process.env.OLLAMA_HOST = 'https://example.com/api/generate';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new OllamaModelAdapter({ enabledByDefault: true });

    await expect(
      adapter.evaluate({
        file_path: 'src/auth/session.ts',
        risk_flags: ['AUTH_CHANGE'],
        matched_rule_ids: ['rule-auth-path'],
        heuristic_only: true,
      }),
    ).rejects.toBeInstanceOf(ModelAdapterError);

    try {
      await adapter.evaluate({
        file_path: 'src/auth/session.ts',
        risk_flags: ['AUTH_CHANGE'],
        matched_rule_ids: ['rule-auth-path'],
        heuristic_only: true,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ModelAdapterError);
      expect((error as ModelAdapterError).causeCode).toBe('UNAVAILABLE');
      expect((error as Error).message).toContain('local-only');
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the default local endpoint when no config is provided', async () => {
    delete process.env.OLLAMA_HOST;
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse(
          '{"decision":"WARN","reason":"Check auth","risk_level":"HIGH","violated_rules":["AUTH_CHANGE"],"next_action":"Review"}',
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new OllamaModelAdapter({
      enabledByDefault: true,
      retries: 0,
    });
    await adapter.evaluate({
      file_path: 'src/auth/session.ts',
      risk_flags: ['AUTH_CHANGE'],
      matched_rule_ids: ['rule-auth-path'],
      heuristic_only: true,
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(DEFAULT_OLLAMA_ENDPOINT);
  });
});
