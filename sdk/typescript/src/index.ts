export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface AgentTraceOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
  batchSize?: number;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export interface StartRunInput {
  id?: string;
  name: string;
  metadata?: JsonObject;
}

export interface TraceEventInput {
  id?: string;
  type?: "agent" | "tool" | "llm" | "error" | "log" | "tool_call";
  name: string;
  input?: JsonValue;
  output?: JsonValue;
  error?: { code: string; message: string; details?: JsonValue | null };
  metadata?: JsonObject;
  durationMs?: number;
  timestamp?: string;
}

export interface RunSummary {
  id: string;
  name: string;
  status: string;
  [key: string]: unknown;
}

export class AgentTraceHttpError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "AgentTraceHttpError";
  }
}

export class AgentTrace {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly batchSize: number;
  private readonly timeoutMs: number;
  private readonly fetcher: typeof fetch;

  constructor(options: AgentTraceOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "http://localhost:3000").replace(/\/$/, "");
    this.headers = options.headers ?? {};
    this.batchSize = positiveInteger(options.batchSize ?? 20, "batchSize");
    this.timeoutMs = positiveInteger(options.timeoutMs ?? 10_000, "timeoutMs");
    this.fetcher = options.fetch ?? globalThis.fetch;
    if (!this.fetcher) throw new Error("AgentTrace requires a fetch implementation");
  }

  async health(): Promise<{ status: string; sqlite: string }> {
    return this.request("/api/v1/healthz");
  }

  async validate(trace: JsonValue): Promise<unknown> {
    return this.request("/api/v1/runs/validate", { method: "POST", body: trace });
  }

  async import(trace: JsonValue): Promise<RunSummary> {
    return this.request("/api/v1/runs/import", { method: "POST", body: trace });
  }

  async startRun(input: StartRunInput): Promise<AgentTraceRun> {
    const run = await this.request<RunSummary>("/api/v1/runs", { method: "POST", body: { ...input, status: "running" } });
    return new AgentTraceRun(this, run, this.batchSize);
  }

  async request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: options.method ?? "GET",
        signal: controller.signal,
        headers: { Accept: "application/json", ...(options.body === undefined ? {} : { "Content-Type": "application/json" }), ...this.headers },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      const payload = await response.json().catch(() => ({})) as any;
      if (!response.ok) throw new AgentTraceHttpError(response.status, payload?.error?.code ?? "request_failed", payload?.error?.message ?? `AgentTrace request failed (${response.status})`);
      return payload as T;
    } catch (error) {
      if (error instanceof AgentTraceHttpError) throw error;
      if (error instanceof Error && error.name === "AbortError") throw new AgentTraceHttpError(408, "request_timeout", `AgentTrace request timed out after ${this.timeoutMs}ms`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

export class AgentTraceRun {
  private readonly pending: Array<TraceEventInput & { sequence: number }> = [];
  private sequence = 0;
  private closed = false;

  constructor(private readonly client: AgentTrace, public readonly run: RunSummary, private readonly batchSize: number) {}

  get id(): string { return this.run.id; }

  async record(event: TraceEventInput): Promise<void> {
    this.assertOpen();
    this.pending.push({ ...event, sequence: ++this.sequence });
    if (this.pending.length >= this.batchSize) await this.flush();
  }

  async tool<T extends JsonValue>(name: string, input: JsonValue, operation: () => T | Promise<T>, metadata?: JsonObject): Promise<T> {
    this.assertOpen();
    const startedAt = Date.now();
    try {
      const output = await operation();
      await this.record({ type: "tool_call", name, input, output, metadata, durationMs: Math.max(1, Date.now() - startedAt) });
      return output;
    } catch (error) {
      const normalized = normalizeError(error);
      await this.record({ type: "tool_call", name, input, error: normalized, metadata, durationMs: Math.max(1, Date.now() - startedAt) });
      await this.flush();
      throw error;
    }
  }

  async flush(): Promise<void> {
    this.assertOpen();
    if (!this.pending.length) return;
    const events = this.pending.splice(0, this.pending.length);
    try {
      await this.client.request(`/api/v1/runs/${encodeURIComponent(this.id)}/events`, { method: "POST", body: { events } });
    } catch (error) {
      this.pending.unshift(...events);
      throw error;
    }
  }

  async complete(summary?: string): Promise<RunSummary> {
    this.assertOpen();
    await this.flush();
    const result = await this.client.request<RunSummary>(`/api/v1/runs/${encodeURIComponent(this.id)}/complete`, { method: "POST", body: { status: "completed", ...(summary ? { summary } : {}) } });
    this.closed = true;
    return result;
  }

  async fail(error: unknown, summary?: string): Promise<RunSummary> {
    this.assertOpen();
    await this.flush();
    const result = await this.client.request<RunSummary>(`/api/v1/runs/${encodeURIComponent(this.id)}/complete`, { method: "POST", body: { status: "failed", error: normalizeError(error), ...(summary ? { summary } : {}) } });
    this.closed = true;
    return result;
  }

  private assertOpen(): void {
    if (this.closed) throw new Error(`AgentTrace run '${this.id}' is already complete`);
  }
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer`);
  return value;
}

function normalizeError(error: unknown): { code: string; message: string; details: JsonValue | null } {
  if (error instanceof Error) return { code: error.name || "error", message: error.message, details: null };
  return { code: "error", message: String(error), details: null };
}
