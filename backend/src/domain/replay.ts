import { stableStringify, type Divergence, type JsonValue, type RunDetail, type TraceEvent, type TraceError } from "./models.js";
import { DomainError } from "./errors.js";
import type { ReplayOverride } from "./models.js";

export interface ReplayPlan { events: TraceEvent[]; divergences: Divergence[]; mode: "deterministic-fixture" | "projection"; status: "passed" | "failed" | "running" | "cancelled" | "unknown"; }
const same = (left: JsonValue | null, right: JsonValue | null) => stableStringify(left) === stableStringify(right);
const clone = <T>(value: T): T => structuredClone(value);
function path(before: JsonValue | null, after: JsonValue | null, prefix = ""): string {
  if (same(before, after)) return prefix || "/";
  if (before === null || after === null || typeof before !== "object" || typeof after !== "object" || Array.isArray(before) !== Array.isArray(after)) return prefix || "/";
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  for (const key of keys) {
    const b = Array.isArray(before) ? before[Number(key)] : before[key];
    const a = Array.isArray(after) ? after[Number(key)] : after[key];
    if (!same(b ?? null, a ?? null)) return path(b ?? null, a ?? null, `${prefix}/${key}`);
  }
  return prefix || "/";
}
function differences(before: TraceEvent, after: TraceEvent): Divergence[] {
  const result: Divergence[] = [];
  if (!same(before.input, after.input)) result.push({ seq: after.seq, eventId: after.id, category: "value-changed", path: `/input${path(before.input, after.input)}`, before: before.input, after: after.input, message: "Tool input changed." });
  if (!same(before.output, after.output)) result.push({ seq: after.seq, eventId: after.id, category: "value-changed", path: `/output${path(before.output, after.output)}`, before: before.output, after: after.output, message: "Recorded tool output changed by the replay override." });
  if (!same(before.error, after.error)) result.push({ seq: after.seq, eventId: after.id, category: "status-changed", path: "/error", before: before.error, after: after.error, message: "The replay changed the event error status." });
  if (before.name !== after.name) result.push({ seq: after.seq, eventId: after.id, category: "value-changed", path: "/name", before: before.name, after: after.name, message: "The replay changed the downstream event." });
  return result;
}
function errorValue(override: ReplayOverride): TraceError | null { return override.error ?? null; }

export function planReplay(original: RunDetail, targetEventId: string, override: ReplayOverride): ReplayPlan {
  const index = original.events.findIndex((event) => event.id === targetEventId);
  if (index < 0) throw new DomainError("replay_target_not_found", 422, `Replay target '${targetEventId}' was not found in run '${original.id}'.`);
  const target = original.events[index];
  if (target.kind !== "tool") throw new DomainError("replay_target_invalid", 422, "Only tool events can be overridden.", { eventId: target.id, kind: target.kind });
  if (override.output === undefined && override.error === undefined) throw new DomainError("replay_override_missing", 422, "Replay override must include output or error.");
  const mode = original.metadata.replayMode === "deterministic-fixture" ? "deterministic-fixture" : "projection";
  const events = clone(original.events);
  events[index].output = override.output === undefined ? null : clone(override.output);
  events[index].error = errorValue(override);
  if (override.error) events.splice(index + 1);
  if (mode === "deterministic-fixture") {
    for (const event of events.slice(index + 1)) {
      const rule = event.metadata.replay;
      if (rule === null || typeof rule !== "object" || Array.isArray(rule)) continue;
      const replay = rule as Record<string, JsonValue>;
      if (replay.afterTool !== target.name || replay.when === null || typeof replay.when !== "object" || Array.isArray(replay.when)) continue;
      const matches = Object.entries(replay.when as Record<string, JsonValue>).every(([key, value]) => events[index].output !== null && typeof events[index].output === "object" && !Array.isArray(events[index].output) && stableStringify(events[index].output[key]) === stableStringify(value));
      if (matches && replay.output !== undefined) event.output = clone(replay.output);
      if (matches && typeof replay.name === "string") event.name = replay.name;
    }
  }
  const divergences: Divergence[] = [];
  const originalBySeq = new Map(original.events.map((event) => [event.seq, event]));
  for (const event of events) { const before = originalBySeq.get(event.seq); if (before) divergences.push(...differences(before, event)); }
  for (const removed of original.events.filter((event) => !events.some((current) => current.seq === event.seq))) divergences.push({ seq: removed.seq, eventId: removed.id, category: "event-removed", path: "/", before: removed.output, after: null, message: "Replay stopped after the overridden tool error." });
  if (mode === "projection" && !override.error) for (const event of original.events.filter((item) => item.seq > target.seq && (item.kind === "agent" || item.kind === "llm"))) divergences.push({ seq: event.seq, eventId: event.id, category: "not-recomputed", path: "/", before: event.output, after: event.output, message: "Downstream agent reasoning was carried forward; it was not recomputed." });
  return { events, divergences, mode, status: override.error ? "failed" : original.status };
}
