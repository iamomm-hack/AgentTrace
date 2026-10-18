/** JSON-safe values exchanged by the AgentTrace API. */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type RunStatus = "running" | "passed" | "failed" | "cancelled" | "unknown";
export type RunKind = "recorded" | "imported" | "replay";
export type EventKind = "agent" | "tool" | "llm" | "error" | "log";

export type TraceError = JsonObject & {
  code: string;
  message: string;
  details: JsonValue | null;
};

export interface TraceEvent {
  id: string;
  runId: string;
  seq: number;
  at: string;
  kind: EventKind;
  name: string;
  agentId: string | null;
  input: JsonValue | null;
  output: JsonValue | null;
  error: TraceError | null;
  durationMs: number | null;
  parentId: string | null;
  metadata: JsonObject;
}

export interface RunSummary {
  id: string;
  name: string;
  kind: RunKind;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  eventCount: number;
  failureCount: number;
  createdAt: string;
  metadata: JsonObject;
  parentRunId: string | null;
}

export interface RunDetail extends RunSummary {
  events: TraceEvent[];
}

export interface OverviewMetrics {
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  replayRuns: number;
  passRate: number | null;
  averageDurationMs: number | null;
}

export interface OverviewResponse {
  metrics: OverviewMetrics;
  recentRuns: RunSummary[];
}

export interface Divergence {
  seq: number;
  eventId: string;
  category: "value-changed" | "status-changed" | "event-added" | "event-removed" | "not-recomputed";
  path: string;
  before: JsonValue | null;
  after: JsonValue | null;
  message: string;
}

export interface ReplayRequest {
  runId: string;
  targetEventId: string;
  override: { output: JsonValue; error?: null } | { output?: null; error: TraceError };
}

export interface ReplayRecord {
  id: string;
  baseRunId: string;
  resultRunId: string;
  targetEventId: string;
  mode: "deterministic-fixture" | "projection";
  status: "completed" | "failed";
  override: ReplayRequest["override"];
  divergences: Divergence[];
  createdAt: string;
}

export interface TraceValidation {
  valid: true;
  schemaVersion: "1";
  eventCount: number;
  status: RunStatus;
  redactedPaths: string[];
  warnings: string[];
  preview: RunDetail;
}

export interface ReplayResponse {
  replay: ReplayRecord;
  original: RunDetail;
  replayed: RunDetail;
  divergences: Divergence[];
}

export interface FailureReport {
  id: string;
  runId: string;
  title: string;
  summary: string;
  evidence: JsonObject;
  reproduction: JsonObject;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceExport {
  schemaVersion: "1";
  generatedAt: string;
  report: FailureReport;
  source: { run: RunDetail; replay?: ReplayRecord };
  observations: JsonObject;
  controlledModification: JsonObject | null;
  divergences: Divergence[];
  limitations: string[];
  reproduction: JsonObject;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: JsonValue;
  };
  requestId: string;
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }
  return false;
}

export function normalizeJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalizeJson(value[key])]));
  }
  return value;
}

export function stableStringify(value: JsonValue | undefined): string {
  return JSON.stringify(value === undefined ? null : normalizeJson(value));
}
