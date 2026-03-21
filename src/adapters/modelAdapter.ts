import type {
  ContextPayload,
  ModelEvaluationResult,
  RiskLevel,
} from '../contracts/types';

export class ModelAdapterError extends Error {
  constructor(
    message: string,
    readonly causeCode: 'UNAVAILABLE' | 'TIMEOUT' | 'PARSE_FAILURE',
  ) {
    super(message);
  }
}

export interface ModelAdapter {
  readonly enabledByDefault: boolean;
  evaluate(context: ContextPayload): Promise<ModelEvaluationResult | undefined>;
}

export class DisabledModelAdapter implements ModelAdapter {
  readonly enabledByDefault = false;

  evaluate(_context: ContextPayload): Promise<ModelEvaluationResult | undefined> {
    void _context;
    return Promise.resolve(undefined);
  }
}

interface OllamaOptions {
  readonly endpoint?: string;
  readonly model?: string;
  readonly timeoutMs?: number;
  readonly enabledByDefault?: boolean;
}

interface CloudOptions {
  readonly endpoint?: string;
  readonly model?: string;
  readonly timeoutMs?: number;
  readonly enabledByDefault?: boolean;
  readonly apiKey?: string;
}

export class OllamaModelAdapter implements ModelAdapter {
  readonly enabledByDefault: boolean;
  private readonly endpoint: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: OllamaOptions = {}) {
    this.endpoint = options.endpoint ?? 'http://127.0.0.1:11434/api/generate';
    this.model = options.model ?? 'llama3.2:3b';
    this.timeoutMs = options.timeoutMs ?? 2_000;
    this.enabledByDefault = options.enabledByDefault ?? false;
  }

  async evaluate(context: ContextPayload): Promise<ModelEvaluationResult | undefined> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          format: 'json',
          stream: false,
          prompt: buildPrompt(context),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ModelAdapterError(
          `Ollama unavailable with status ${response.status}`,
          'UNAVAILABLE',
        );
      }

      const payload = (await response.json()) as { response?: string };
      if (!payload.response) {
        throw new ModelAdapterError('Missing Ollama response body.', 'PARSE_FAILURE');
      }

      return parseModelResponse(payload.response);
    } catch (error) {
      if (error instanceof ModelAdapterError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ModelAdapterError('Ollama timed out.', 'TIMEOUT');
      }

      throw new ModelAdapterError('Ollama unavailable.', 'UNAVAILABLE');
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class CloudModelAdapter implements ModelAdapter {
  readonly enabledByDefault: boolean;
  private readonly endpoint?: string;
  private readonly model?: string;
  private readonly timeoutMs: number;
  private readonly apiKey?: string;

  constructor(options: CloudOptions = {}) {
    this.endpoint = options.endpoint;
    this.model = options.model;
    this.timeoutMs = options.timeoutMs ?? 2_000;
    this.enabledByDefault = options.enabledByDefault ?? false;
    this.apiKey = options.apiKey;
  }

  async evaluate(context: ContextPayload): Promise<ModelEvaluationResult | undefined> {
    if (!this.endpoint) {
      throw new ModelAdapterError('Cloud endpoint not configured.', 'UNAVAILABLE');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.model ?? null,
          context,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ModelAdapterError(
          `Cloud adapter unavailable with status ${response.status}`,
          'UNAVAILABLE',
        );
      }

      const payload = (await response.json()) as
        | { response?: string }
        | ModelEvaluationResult;

      if (isModelEvaluationResult(payload)) {
        return payload;
      }

      if (
        typeof payload === 'object' &&
        payload !== null &&
        'response' in payload &&
        typeof payload.response === 'string'
      ) {
        return parseModelResponse(payload.response);
      }

      throw new ModelAdapterError('Missing cloud response body.', 'PARSE_FAILURE');
    } catch (error) {
      if (error instanceof ModelAdapterError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ModelAdapterError('Cloud adapter timed out.', 'TIMEOUT');
      }

      throw new ModelAdapterError('Cloud adapter unavailable.', 'UNAVAILABLE');
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function parseModelResponse(responseText: string): ModelEvaluationResult {
  const normalized = stripMarkdownFence(responseText).trim();
  let parsed: unknown;

  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new ModelAdapterError('Model returned invalid JSON.', 'PARSE_FAILURE');
  }

  if (!isModelEvaluationResult(parsed)) {
    throw new ModelAdapterError('Model response failed schema validation.', 'PARSE_FAILURE');
  }

  return parsed;
}

function stripMarkdownFence(value: string): string {
  return value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}

function isModelEvaluationResult(value: unknown): value is ModelEvaluationResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    isDecision(candidate.decision) &&
    typeof candidate.reason === 'string' &&
    candidate.reason.length > 0 &&
    isRiskLevel(candidate.risk_level) &&
    Array.isArray(candidate.violated_rules) &&
    candidate.violated_rules.every((rule) => typeof rule === 'string') &&
    typeof candidate.next_action === 'string' &&
    candidate.next_action.length > 0
  );
}

function isDecision(value: unknown): boolean {
  return value === 'ALLOW' || value === 'WARN' || value === 'REQUIRE_PLAN' || value === 'BLOCK';
}

function isRiskLevel(value: unknown): value is RiskLevel {
  return value === 'LOW' || value === 'MEDIUM' || value === 'HIGH' || value === 'CRITICAL';
}

function buildPrompt(context: ContextPayload): string {
  return [
    'Return JSON only.',
    'Respect these rules:',
    '- AUTH_CHANGE must not be downgraded below REQUIRE_PLAN.',
    '- SCHEMA_CHANGE must not be downgraded below WARN.',
    '- If multiple critical flags appear, BLOCK is allowed.',
    `Context: ${JSON.stringify(context)}`,
    'Required JSON shape:',
    '{"decision":"ALLOW|WARN|REQUIRE_PLAN|BLOCK","reason":"string","risk_level":"LOW|MEDIUM|HIGH|CRITICAL","violated_rules":["string"],"next_action":"string"}',
  ].join('\n');
}
