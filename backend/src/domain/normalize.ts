import { createHash } from "node:crypto";
import { validation } from "./errors.js";
import { asJsonObject, asJsonValue, stableStringify, type EventInput, type JsonObject, type JsonValue, type NormalizedTrace, type RunKind, type RunStatus, type TraceError } from "./models.js";

const MAX_EVENTS = 10_000;
const validStatuses = new Set(["running", "passed", "failed", "cancelled", "unknown"]);

function text(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.trim() === "") throw validation(`${field} must be a non-empty string`);
  return value;
}
function timestamp(value: unknown, fallback: string, field: string): string {
  const result = text(value, field) ?? fallback;
  if (Number.isNaN(Date.parse(result))) throw validation(`${field} must be an ISO-8601 timestamp`);
  return new Date(result).toISOString();
}
function positive(value: unknown, fallback: number, field: string): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) throw validation(`${field} must be a positive integer`);
  return value;
}
function jsonOrNull(value: unknown, field: string): JsonValue | null { return value === undefined ? null : asJsonValue(value, field); }
function eventKind(input: EventInput): "agent" | "tool" | "llm" | "error" | "log" {
  const raw = text(input.kind ?? input.type, "event.kind") ?? "log";
  if (["tool", "tool_call", "tool_result", "tool_use"].includes(raw)) return "tool";
  if (["agent", "message", "assistant", "agent_step"].includes(raw)) return "agent";
  if (["llm", "model", "completion"].includes(raw)) return "llm";
  if (["error", "exception", "failure"].includes(raw)) return "error";
  return "log";
}
function eventError(value: unknown): TraceError | null {
  if (value === undefined || value === null) return null;
  const item = asJsonObject(value, "error");
  return { code: text(item.code, "error.code") ?? "trace_error", message: text(item.message, "error.message") ?? "Trace error", details: item.details ?? null };
}
function eventMetadata(input: EventInput): JsonObject {
  const known = new Set(["id", "type", "kind", "sequence", "seq", "timestamp", "at", "name", "payload", "tool", "toolName", "agentId", "parentId", "input", "response", "output", "error", "durationMs", "metadata"]);
  const unknown = Object.fromEntries(Object.entries(input).filter(([key]) => !known.has(key)));
  return asJsonObject({ ...(input.metadata === undefined ? {} : asJsonObject(input.metadata, "event.metadata")), ...unknown }, "event.metadata");
}

export function normalizeTrace(value: unknown, now = "2026-01-01T00:00:00.000Z"): NormalizedTrace {
  let source: Record<string, unknown> = {};
  let rawEvents: unknown;
  if (Array.isArray(value)) rawEvents = value;
  else if (value !== null && typeof value === "object") { source = value as Record<string, unknown>; rawEvents = source.events ?? source.steps ?? source.trace; }
  else throw validation("trace must be an object or an array of events");
  if (!Array.isArray(rawEvents) || rawEvents.length === 0) throw validation("trace must contain an events or steps array with at least one event");
  if (rawEvents.length > MAX_EVENTS) throw validation(`trace cannot contain more than ${MAX_EVENTS} events`);
  const startedAt = timestamp(source.startedAt ?? source.started_at, now, "startedAt");
  const events = rawEvents.map((raw, index) => {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw validation(`events[${index}] must be an object`);
    const input = raw as EventInput;
    const kind = eventKind(input);
    const tool = text(input.tool ?? input.toolName, `events[${index}].tool`);
    const name = text(input.name ?? tool ?? input.type, `events[${index}].name`) ?? kind;
    const at = timestamp(input.at ?? input.timestamp, new Date(Date.parse(startedAt) + index).toISOString(), `events[${index}].at`);
    const sequence = positive(input.seq ?? input.sequence, index + 1, `events[${index}].seq`);
    const output = input.output !== undefined ? input.output : input.response;
    if (kind === "tool" && output === undefined && input.error === undefined) throw validation(`events[${index}].output or error is required for tool events`);
    const duration = input.durationMs === undefined || input.durationMs === null ? null : positive(input.durationMs, 1, `events[${index}].durationMs`);
    return {
      id: text(input.id, `events[${index}].id`) ?? `event-${index + 1}`, seq: sequence, at, kind, name,
      agentId: text(input.agentId, `events[${index}].agentId`) ?? null, input: jsonOrNull(input.input ?? input.payload, `events[${index}].input`), output: jsonOrNull(output, `events[${index}].output`),
      error: eventError(input.error), durationMs: duration, parentId: text(input.parentId, `events[${index}].parentId`) ?? null, metadata: eventMetadata(input),
    };
  });
  const sequences = new Set<number>();
  for (const event of events) { if (sequences.has(event.seq)) throw validation(`duplicate event sequence ${event.seq}`); sequences.add(event.seq); }
  events.sort((left, right) => left.seq - right.seq);
  const statusValue = text(source.status, "status") ?? (events.some((event) => event.error || event.kind === "error") ? "failed" : "passed");
  const status = statusValue === "completed" ? "passed" : statusValue;
  if (!validStatuses.has(status)) throw validation("status is invalid");
  const kindValue = text(source.kind, "kind");
  const kind: RunKind = kindValue === "recorded" || kindValue === "replay" ? kindValue : "imported";
  return {
    ...(text(source.id, "id") ? { id: text(source.id, "id") } : {}), ...(text(source.name, "name") ? { name: text(source.name, "name") } : {}),
    status: status as RunStatus, kind, startedAt, finishedAt: source.finishedAt === null ? null : source.finishedAt === undefined ? null : timestamp(source.finishedAt, startedAt, "finishedAt"),
    metadata: source.metadata === undefined ? {} : asJsonObject(source.metadata, "metadata"), events,
  };
}
export function fingerprintEvent(event: { seq: number; kind: string; name: string; input: JsonValue | null; output: JsonValue | null; error: TraceError | null }): string {
  return createHash("sha256").update(stableStringify({ seq: event.seq, kind: event.kind, name: event.name, input: event.input, output: event.output, error: event.error })).digest("hex");
}
