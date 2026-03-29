import type {
  ContextPayload,
  ModelEvaluationResult,
  RiskLevel,
} from '../contracts/types';

export const DEFAULT_OLLAMA_ENDPOINT = 'http://127.0.0.1:11434/api/generate';
export const DEFAULT_OLLAMA_HOST = '127.0.0.1:11434';
export const DEFAULT_OLLAMA_MODEL = 'llama3.2:3b';
export const DEFAULT_OLLAMA_TIMEOUT_MS = 2_000;
export const DEFAULT_OLLAMA_RETRIES = 1;
export const DEFAULT_OLLAMA_BACKOFF_MS = 500;
export const DEFAULT_OLLAMA_JITTER_MS = 200;
export const ALLOWED_LOCAL_HOSTNAMES = [
  '127.0.0.1',
  'localhost',
  '::1',
] as const;

type ModelAdapterCauseCode =
  | 'UNAVAILABLE'
  | 'TIMEOUT'
  | 'PARSE_FAILURE'
  | 'DISABLED';

export class ModelAdapterError extends Error {
  constructor(
    message: string,
    readonly causeCode: ModelAdapterCauseCode,
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

  evaluate(
    _context: ContextPayload,
  ): Promise<ModelEvaluationResult | undefined> {
    void _context;
    return Promise.resolve(undefined);
  }
}

interface OllamaOptions {
  readonly endpoint?: string;
  readonly model?: string;
  readonly timeoutMs?: number;
  readonly retries?: number;
  readonly backoffMs?: number;
  readonly jitterMs?: number;
  readonly enabledByDefault?: boolean;
}

interface CloudOptions {
  readonly endpoint?: string;
  readonly model?: string;
  readonly timeoutMs?: number;
  readonly enabledByDefault?: boolean;
  readonly apiKey?: string;
}

interface ResolvedOllamaOptions {
  endpoint: string;
  model: string;
  timeoutMs: number;
  retries: number;
  backoffMs: number;
  jitterMs: number;
  configurationError?: string;
}

export class OllamaModelAdapter implements ModelAdapter {
  readonly enabledByDefault: boolean;
  private readonly endpoint: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly backoffMs: number;
  private readonly jitterMs: number;
  private readonly configurationError?: string;
  private warmupPromise: Promise<boolean> | null = null;
  private warmupComplete: boolean = false;

  constructor(options: OllamaOptions = {}) {
    const resolved = resolveOllamaOptions(options);
    this.endpoint = resolved.endpoint;
    this.model = resolved.model;
    this.timeoutMs = resolved.timeoutMs;
    this.retries = resolved.retries;
    this.backoffMs = resolved.backoffMs;
    this.jitterMs = resolved.jitterMs;
    this.configurationError = resolved.configurationError;
    this.enabledByDefault = options.enabledByDefault ?? false;
  }

  async evaluate(
    context: ContextPayload,
  ): Promise<ModelEvaluationResult | undefined> {
    if (this.configurationError) {
      throw new ModelAdapterError(this.configurationError, 'UNAVAILABLE');
    }

    // Ensure warmup is complete before first evaluation
    await this.ensureWarmup();

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
        const payload = await this.postPrompt(context);
        if (!payload.response) {
          throw new ModelAdapterError(
            'Missing Ollama response body.',
            'PARSE_FAILURE',
          );
        }

        return parseModelResponse(payload.response);
      } catch (error) {
        lastError = error;
        if (!isRetryableModelError(error) || attempt === this.retries) {
          throw mapToModelAdapterError(error);
        }

        // Apply backoff with jitter before retry (ARC-ADAPT-001)
        const delay =
          this.backoffMs + Math.floor(Math.random() * this.jitterMs);
        await this.sleep(delay);
      }
    }

    throw mapToModelAdapterError(lastError);
  }

  /**
   * Warmup ping — ensures Ollama is ready before first save event.
   * Local-only readiness check (ARC-ADAPT-001).
   */
  async warmup(): Promise<boolean> {
    if (this.warmupComplete) {
      return true;
    }

    if (this.configurationError) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          format: 'json',
          stream: false,
          prompt: 'Ready',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      this.warmupComplete = response.ok;
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Ensure warmup is complete, starting if necessary.
   */
  private async ensureWarmup(): Promise<void> {
    if (this.warmupComplete) {
      return;
    }

    if (!this.warmupPromise) {
      this.warmupPromise = this.warmup();
    }

    await this.warmupPromise;
  }

  /**
   * Sleep helper for backoff delays.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async postPrompt(
    context: ContextPayload,
  ): Promise<{ response?: string }> {
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

      return (await response.json()) as { response?: string };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ModelAdapterError('Ollama timed out.', 'TIMEOUT');
      }

      throw mapToModelAdapterError(error);
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
    this.timeoutMs = options.timeoutMs ?? DEFAULT_OLLAMA_TIMEOUT_MS;
    this.enabledByDefault = options.enabledByDefault ?? false;
    this.apiKey = options.apiKey;
  }

  async evaluate(
    context: ContextPayload,
  ): Promise<ModelEvaluationResult | undefined> {
    if (!this.endpoint) {
      throw new ModelAdapterError(
        'Cloud endpoint not configured.',
        'UNAVAILABLE',
      );
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

      throw new ModelAdapterError(
        'Missing cloud response body.',
        'PARSE_FAILURE',
      );
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

export function parseModelResponse(
  responseText: string,
): ModelEvaluationResult {
  const normalized = normalizeModelResponse(responseText);
  let parsed: unknown;

  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new ModelAdapterError(
      'Model returned invalid JSON.',
      'PARSE_FAILURE',
    );
  }

  if (!isModelEvaluationResult(parsed)) {
    throw new ModelAdapterError(
      'Model response failed schema validation.',
      'PARSE_FAILURE',
    );
  }

  if (
    parsed.decision === 'ALLOW' &&
    (parsed.risk_level === 'HIGH' || parsed.risk_level === 'CRITICAL')
  ) {
    throw new ModelAdapterError(
      'Model response contradicted the declared risk level.',
      'PARSE_FAILURE',
    );
  }

  return parsed;
}

function normalizeModelResponse(value: string): string {
  const fenced = stripMarkdownFence(value).trim();
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return fenced;
  }
  return fenced.slice(start, end + 1).trim();
}

function stripMarkdownFence(value: string): string {
  return value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}

function isModelEvaluationResult(
  value: unknown,
): value is ModelEvaluationResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    isDecision(candidate.decision) &&
    typeof candidate.reason === 'string' &&
    candidate.reason.trim().length > 0 &&
    isRiskLevel(candidate.risk_level) &&
    Array.isArray(candidate.violated_rules) &&
    candidate.violated_rules.every((rule) => typeof rule === 'string') &&
    typeof candidate.next_action === 'string' &&
    candidate.next_action.trim().length > 0
  );
}

function isDecision(value: unknown): boolean {
  return (
    value === 'ALLOW' ||
    value === 'WARN' ||
    value === 'REQUIRE_PLAN' ||
    value === 'BLOCK'
  );
}

function isRiskLevel(value: unknown): value is RiskLevel {
  return (
    value === 'LOW' ||
    value === 'MEDIUM' ||
    value === 'HIGH' ||
    value === 'CRITICAL'
  );
}

function resolveOllamaOptions(options: OllamaOptions): ResolvedOllamaOptions {
  const configuredEndpoint = options.endpoint ?? process.env.OLLAMA_HOST;
  const endpoint = configuredEndpoint
    ? normalizeOllamaEndpoint(configuredEndpoint)
    : { endpoint: DEFAULT_OLLAMA_ENDPOINT };
  const timeoutMs = normalizePositiveInteger(
    options.timeoutMs ?? envInteger('OLLAMA_TIMEOUT_MS'),
    DEFAULT_OLLAMA_TIMEOUT_MS,
  );
  const retries = normalizeRetryCount(
    options.retries ?? envInteger('OLLAMA_RETRIES'),
    DEFAULT_OLLAMA_RETRIES,
  );
  const backoffMs = normalizePositiveInteger(
    options.backoffMs ?? envInteger('OLLAMA_BACKOFF_MS'),
    DEFAULT_OLLAMA_BACKOFF_MS,
  );
  const jitterMs = normalizePositiveInteger(
    options.jitterMs ?? envInteger('OLLAMA_JITTER_MS'),
    DEFAULT_OLLAMA_JITTER_MS,
  );
  const model =
    options.model ?? process.env.SWD_SUBAGENT_MODEL ?? DEFAULT_OLLAMA_MODEL;

  return {
    endpoint: endpoint.endpoint,
    configurationError: endpoint.error,
    timeoutMs,
    retries,
    backoffMs,
    jitterMs,
    model,
  };
}

function normalizeOllamaEndpoint(value: string): {
  endpoint: string;
  error?: string;
} {
  const trimmed = value.trim();
  if (!trimmed) {
    return { endpoint: DEFAULT_OLLAMA_ENDPOINT };
  }

  const url = buildCandidateUrl(trimmed);
  if (!url) {
    return {
      endpoint: DEFAULT_OLLAMA_ENDPOINT,
      error: 'Ollama host configuration is invalid.',
    };
  }

  if (!isLocalHostname(url.hostname)) {
    return {
      endpoint: DEFAULT_OLLAMA_ENDPOINT,
      error:
        'Ollama host configuration must remain local-only (127.0.0.1, localhost, or ::1).',
    };
  }

  url.protocol = 'http:';
  url.pathname = '/api/generate';
  url.search = '';
  url.hash = '';

  return {
    endpoint: url.toString(),
  };
}

function buildCandidateUrl(value: string): URL | undefined {
  try {
    return value.startsWith('http://') || value.startsWith('https://')
      ? new URL(value)
      : new URL(`http://${value}`);
  } catch {
    return undefined;
  }
}

function isLocalHostname(hostname: string): boolean {
  return ALLOWED_LOCAL_HOSTNAMES.includes(
    hostname as (typeof ALLOWED_LOCAL_HOSTNAMES)[number],
  );
}

function envInteger(name: string): number | undefined {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizePositiveInteger(
  value: number | undefined,
  fallback: number,
): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}

function normalizeRetryCount(
  value: number | undefined,
  fallback: number,
): number {
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return Math.floor(value);
}

function isRetryableModelError(error: unknown): boolean {
  return (
    error instanceof ModelAdapterError &&
    (error.causeCode === 'TIMEOUT' || error.causeCode === 'UNAVAILABLE')
  );
}

function mapToModelAdapterError(error: unknown): ModelAdapterError {
  if (error instanceof ModelAdapterError) {
    return error;
  }

  if (error instanceof Error) {
    return new ModelAdapterError(error.message, 'UNAVAILABLE');
  }

  return new ModelAdapterError('Model adapter unavailable.', 'UNAVAILABLE');
}

function buildPrompt(context: ContextPayload): string {
  return [
    'Return JSON only.',
    'Respect these rules:',
    '- AUTH_CHANGE must not be downgraded below REQUIRE_PLAN.',
    '- SCHEMA_CHANGE must not be downgraded below WARN.',
    '- If multiple critical flags appear, BLOCK is allowed.',
    '- Do not return ALLOW when the declared risk_level is HIGH or CRITICAL.',
    `Context: ${JSON.stringify(context)}`,
    'Required JSON shape:',
    '{"decision":"ALLOW|WARN|REQUIRE_PLAN|BLOCK","reason":"string","risk_level":"LOW|MEDIUM|HIGH|CRITICAL","violated_rules":["string"],"next_action":"string"}',
  ].join('\n');
}
