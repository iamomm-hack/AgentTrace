export type JsonPrimitive = null | boolean | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type RunStatus = "running" | "passed" | "failed" | "cancelled" | "unknown";
export type RunKind = "recorded" | "imported" | "replay";
export type EventKind = "agent" | "tool" | "llm" | "error" | "log";

export interface TraceError {
  [key: string]: JsonValue;
  code: string;
  message: string;
  details: JsonValue | null;
}

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
export interface RunDetail extends RunSummary { events: TraceEvent[]; }
export type Run = RunSummary;

export interface FailureReport {
  id: string; runId: string; title: string; summary: string; evidence: JsonObject; reproduction: JsonObject; createdAt: string; updatedAt: string;
}
export interface Overview {
  metrics: { totalRuns: number; passedRuns: number; failedRuns: number; replayRuns: number; passRate: number | null; averageDurationMs: number | null };
  recentRuns: Run[];
}
export interface Divergence {
  seq: number; eventId: string; category: "value-changed" | "status-changed" | "event-added" | "event-removed" | "not-recomputed"; path: string; before: JsonValue | null; after: JsonValue | null; message: string;
}
export interface EventInput {
  id?: unknown; type?: unknown; kind?: unknown; sequence?: unknown; seq?: unknown; timestamp?: unknown; at?: unknown; name?: unknown; payload?: unknown; tool?: unknown; toolName?: unknown; agentId?: unknown; parentId?: unknown; input?: unknown; response?: unknown; output?: unknown; error?: unknown; durationMs?: unknown; metadata?: unknown; [key: string]: unknown;
}
export interface NormalizedTrace { id?: string; name?: string; status?: RunStatus; kind?: RunKind; startedAt?: string; finishedAt?: string | null; metadata: JsonObject; events: Array<Omit<TraceEvent, "runId">>; }
export interface TraceEventCreate { id?: string; runId: string; seq: number; at: string; kind: EventKind; name: string; agentId: string | null; input: JsonValue | null; output: JsonValue | null; error: TraceError | null; durationMs: number | null; parentId: string | null; metadata: JsonObject; }
export interface FailureReportCreate { runId: string; title: string; summary: string; evidence: JsonObject; reproduction: JsonObject; }
export interface BranchOverride { sequence?: number; tool: string; input?: JsonValue; response: JsonValue; }
export interface Branch { id: string; runId: string; name?: string; overrides: BranchOverride[]; createdAt: string; }
export interface ReplayCallInput { sequence?: number; tool: string; input?: JsonValue; }
export interface ReplayCallResult { index: number; sequence?: number; tool: string; input?: JsonValue; found: boolean; source: "recorded" | "branch" | "request" | "missing"; response?: JsonValue; }
export interface ReplayResult { runId: string; branchId?: string; deterministic: true; calls: ReplayCallResult[]; }
export interface ReplayRecord { id: string; baseRunId: string; resultRunId: string; targetEventId: string; mode: "deterministic-fixture" | "projection"; status: "completed" | "failed"; createdAt: string; }
export interface ReplayResponse { replay: ReplayRecord; original: RunDetail; replayed: RunDetail; divergences: Divergence[]; }
export interface ActualCall { tool: string; input?: JsonValue; response: JsonValue; }
export interface ComparisonResult { runId: string; branchId?: string; match: boolean; expectedCount: number; actualCount: number; firstMismatch?: { index: number; reason: "missing_expected" | "unexpected_actual" | "tool_mismatch" | "input_mismatch" | "response_mismatch"; expected?: JsonValue; actual?: JsonValue; }; }
export interface ReportInput { title?: unknown; summary?: unknown; failure?: unknown; expected?: unknown; actual?: unknown; metadata?: unknown; }
export interface ReplayOverride { output?: JsonValue; error?: TraceError; }

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).every(isJsonValue);
  return false;
}
export function normalizeJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalizeJson(value[key] as JsonValue)]));
  return value;
}
export function stableStringify(value: JsonValue | undefined): string { return JSON.stringify(value === undefined ? null : normalizeJson(value)); }
export function asJsonValue(value: unknown, field: string): JsonValue { if (!isJsonValue(value)) throw new Error(`${field} must be a JSON value`); return value; }
export function asJsonObject(value: unknown, field: string): JsonObject { const json = asJsonValue(value, field); if (json === null || Array.isArray(json) || typeof json !== "object") throw new Error(`${field} must be a JSON object`); return json as JsonObject; }
