import type { RunDetail, RunSummary, TraceError, TraceEvent } from "../types/frontend";
import { statusName } from "./formatters";

function isObject(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === "object";
}

export function normalizeEvent(raw: unknown, index: number, runId: string): TraceEvent {
  const source = isObject(raw) ? raw : { output: raw };
  const tool = isObject(source.tool) ? source.tool.name : source.tool;
  const type = String(source.type ?? source.kind ?? (tool ? "tool_call" : "step"));
  const output = source.response !== undefined ? source.response : source.output !== undefined ? source.output : source.result;
  const rawError = source.error ?? (type === "error" ? source.payload ?? output : null);
  const error: TraceError | null = isObject(rawError)
    ? rawError
    : rawError
      ? { code: "execution_error", message: String(rawError), details: null }
      : null;

  return {
    id: String(source.id ?? source.eventId ?? `${runId}-event-${index + 1}`),
    runId,
    seq: Number(source.sequence ?? source.seq ?? index + 1),
    kind: type.includes("tool") || tool ? "tool" : type === "error" ? "error" : type,
    name: String(source.name ?? source.toolName ?? tool ?? type.replaceAll("_", " ")),
    input: source.input ?? source.arguments ?? source.params ?? null,
    output: output ?? null,
    error,
    durationMs: source.durationMs ?? source.duration ?? null,
    at: source.timestamp ?? source.startedAt ?? source.createdAt ?? null,
    raw: source,
  };
}

export function normalizeRun(raw: unknown): RunDetail {
  const root = isObject(raw) ? raw : {};
  const source = isObject(root.run) ? root.run : root;
  const id = String(source.id ?? "unknown-run");
  const rawEvents = Array.isArray(source.events) ? source.events : [];
  const events = rawEvents.map((event, index) => normalizeEvent(event, index, id));
  const startedAt = source.startedAt ?? source.createdAt ?? null;
  const finishedAt = source.completedAt ?? source.finishedAt ?? null;
  const calculatedDuration = startedAt && finishedAt ? Date.parse(String(finishedAt)) - Date.parse(String(startedAt)) : null;

  return {
    ...source,
    id,
    name: String(source.name ?? "Untitled run"),
    status: statusName(source.status),
    createdAt: source.createdAt ?? startedAt,
    startedAt,
    finishedAt,
    durationMs: source.durationMs ?? calculatedDuration,
    eventCount: Number(source.eventCount ?? events.length),
    events,
    kind: String(source.kind ?? "recorded"),
  };
}

export function eventInput(raw: unknown, index: number): Record<string, unknown> {
  const source = isObject(raw) ? raw : { output: raw };
  const tool = isObject(source.tool) ? source.tool.name : source.tool;
  const output = source.response !== undefined ? source.response : source.output !== undefined ? source.output : source.result;
  const type = source.type ?? source.kind ?? (tool ? "tool_call" : "step");
  return {
    ...source,
    type,
    sequence: index + 1,
    ...(source.timestamp || source.at ? { timestamp: source.timestamp ?? source.at } : {}),
    ...(tool ? { tool } : {}),
    ...(source.input !== undefined || source.arguments !== undefined || source.params !== undefined
      ? { input: source.input ?? source.arguments ?? source.params }
      : {}),
    ...(output !== undefined ? { output } : {}),
    ...(source.error !== undefined ? { error: source.error } : {}),
  };
}
