import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import type { Branch, BranchOverride, Divergence, FailureReport, JsonObject, JsonValue, Overview, ReplayRecord, RunDetail, RunKind, RunStatus, RunSummary, TraceError, TraceEvent } from "../domain/models.js";
import { normalizeJson } from "../domain/models.js";
import { fingerprintEvent } from "../domain/normalize.js";
import type { FailureReportCreate, TraceEventCreate } from "../domain/models.js";
type Row = Record<string, unknown>;
const encode = (value: JsonValue) => JSON.stringify(normalizeJson(value));
const decode = (value: unknown, fallback: JsonValue = {}) => value === null || value === undefined ? fallback : JSON.parse(String(value)) as JsonValue;
const object = (value: unknown): JsonObject => { const parsed = decode(value); return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonObject : {}; };
const optional = (value: unknown): string | null => value === null || value === undefined ? null : String(value);

export interface RunListQuery { q?: string; status?: RunStatus; kind?: RunKind; limit?: number; }
export interface ReplayParts { record: ReplayRecord; original: RunDetail; replayed: RunDetail; divergences: Divergence[]; }

export class RunRepository {
  constructor(private readonly db: DatabaseSync) {}
  createRun(input: { id?: string; name: string; kind: RunKind; status: RunStatus; startedAt: string; finishedAt?: string | null; metadata: JsonObject; parentRunId?: string | null }, now: string): RunSummary {
    const id = input.id ?? randomUUID(); const duration = input.finishedAt ? Math.max(0, Date.parse(input.finishedAt) - Date.parse(input.startedAt)) : null;
    this.db.prepare(`INSERT INTO runs (id,name,kind,status,started_at,finished_at,duration_ms,parent_run_id,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, input.name, input.kind, input.status, input.startedAt, input.finishedAt ?? null, duration, input.parentRunId ?? null, encode(input.metadata), now, now);
    return this.getRun(id)!;
  }
  updateRun(id: string, status: RunStatus, finishedAt: string, now: string): RunSummary {
    const run = this.getRun(id)!; const duration = Math.max(0, Date.parse(finishedAt) - Date.parse(run.startedAt));
    this.db.prepare("UPDATE runs SET status=?, finished_at=?, duration_ms=?, updated_at=? WHERE id=?").run(status, finishedAt, duration, now, id); return this.getRun(id)!;
  }
  getRun(id: string): RunSummary | undefined {
    const row = this.db.prepare(`SELECT r.*, COUNT(e.id) event_count, SUM(CASE WHEN e.error_json IS NOT NULL OR e.kind='error' THEN 1 ELSE 0 END) failure_count FROM runs r LEFT JOIN events e ON e.run_id=r.id WHERE r.id=? GROUP BY r.id`).get(id) as Row | undefined;
    return row ? this.toRun(row) : undefined;
  }
  getRunDetail(id: string): RunDetail | undefined {
    const run = this.getRun(id); if (!run) return undefined;
    const rows = this.db.prepare("SELECT * FROM events WHERE run_id=? ORDER BY seq ASC").all(id) as Row[]; return { ...run, events: rows.map((row) => this.toEvent(row)) };
  }
  listRuns(query: RunListQuery = {}): RunSummary[] {
    const clauses = ["1=1"]; const params: Array<string | number> = [];
    if (query.q) { clauses.push("(LOWER(r.name) LIKE LOWER(?) OR LOWER(r.id) LIKE LOWER(?))"); params.push(`%${query.q}%`, `%${query.q}%`); }
    if (query.status) { clauses.push("r.status=?"); params.push(query.status); } if (query.kind) { clauses.push("r.kind=?"); params.push(query.kind); }
    params.push(Math.min(Math.max(query.limit ?? 50, 1), 100));
    const rows = this.db.prepare(`SELECT r.*, COUNT(e.id) event_count, SUM(CASE WHEN e.error_json IS NOT NULL OR e.kind='error' THEN 1 ELSE 0 END) failure_count FROM runs r LEFT JOIN events e ON e.run_id=r.id WHERE ${clauses.join(" AND ")} GROUP BY r.id ORDER BY r.created_at DESC,r.id DESC LIMIT ?`).all(...params) as Row[];
    return rows.map((row) => this.toRun(row));
  }
  nextSequence(runId: string): number {
    const row = this.db.prepare("SELECT COALESCE(MAX(seq),0) sequence FROM events WHERE run_id=?").get(runId) as Row;
    return Number(row.sequence ?? 0) + 1;
  }
  overview(): Overview {
    const row = this.db.prepare("SELECT COUNT(*) total, SUM(CASE WHEN status='passed' THEN 1 ELSE 0 END) passed, SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) failed, AVG(duration_ms) average_duration FROM runs WHERE kind <> 'replay'").get() as Row;
    const replayRow = this.db.prepare("SELECT COUNT(*) replay_count FROM runs WHERE kind='replay'").get() as Row;
    const total = Number(row.total ?? 0); const passed = Number(row.passed ?? 0); const failed = Number(row.failed ?? 0);
    return { metrics: { totalRuns: total, passedRuns: passed, failedRuns: failed, replayRuns: Number(replayRow.replay_count ?? 0), passRate: total ? Number((passed / total * 100).toFixed(1)) : null, averageDurationMs: row.average_duration == null ? null : Math.round(Number(row.average_duration)) }, recentRuns: this.listRuns({ limit: 8 }) };
  }
  insertEvents(events: TraceEventCreate[]): TraceEvent[] {
    const statement = this.db.prepare(`INSERT INTO events (id,run_id,seq,at,kind,name,agent_id,input_json,output_json,error_json,duration_ms,parent_id,metadata_json,fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const event of events) statement.run(event.id ?? randomUUID(), event.runId, event.seq, event.at, event.kind, event.name, event.agentId, event.input === null ? null : encode(event.input), event.output === null ? null : encode(event.output), event.error === null ? null : encode(event.error), event.durationMs, event.parentId, encode(event.metadata), fingerprintEvent(event));
    return events.length ? this.getRunDetail(events[0].runId)?.events ?? [] : [];
  }
  createReport(input: FailureReportCreate, now: string, id: string = randomUUID()): FailureReport {
    this.db.prepare(`INSERT INTO failure_reports (id,run_id,title,summary,evidence_json,reproduction_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(run_id) DO UPDATE SET title=excluded.title,summary=excluded.summary,evidence_json=excluded.evidence_json,reproduction_json=excluded.reproduction_json,updated_at=excluded.updated_at`).run(id, input.runId, input.title, input.summary, encode(input.evidence), encode(input.reproduction), now, now); return this.getReport(input.runId)!;
  }
  getReport(runId: string): FailureReport | undefined {
    const row = this.db.prepare("SELECT * FROM failure_reports WHERE run_id=?").get(runId) as Row | undefined; if (!row) return undefined;
    return { id: String(row.id), runId: String(row.run_id), title: String(row.title), summary: String(row.summary), evidence: object(row.evidence_json), reproduction: object(row.reproduction_json), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
  }
  listReports(): FailureReport[] { return (this.db.prepare("SELECT run_id FROM failure_reports ORDER BY created_at DESC").all() as Row[]).map((row) => this.getReport(String(row.run_id))!).filter(Boolean); }
  createBranch(runId: string, overrides: BranchOverride[], now: string, name?: string, id: string = randomUUID()): Branch {
    this.db.prepare("INSERT INTO branches (id,run_id,name,overrides_json,created_at) VALUES (?,?,?,?,?)").run(id, runId, name ?? null, encode(overrides as unknown as JsonValue), now);
    return this.getBranch(id)!;
  }
  getBranch(id: string): Branch | undefined {
    const row = this.db.prepare("SELECT * FROM branches WHERE id=?").get(id) as Row | undefined;
    if (!row) return undefined;
    return { id: String(row.id), runId: String(row.run_id), ...(row.name == null ? {} : { name: String(row.name) }), overrides: decode(row.overrides_json, []) as unknown as BranchOverride[], createdAt: String(row.created_at) };
  }
  createReplay(input: { id: string; baseRunId: string; targetEventId: string; mode: "deterministic-fixture" | "projection"; status: RunStatus }, events: TraceEventCreate[], divergences: Divergence[], now: string): ReplayParts {
    const base = this.getRunDetail(input.baseRunId)!; this.createRun({ id: input.id, name: `${base.name} · replay`, kind: "replay", status: input.status, startedAt: base.startedAt, finishedAt: base.finishedAt, metadata: { ...base.metadata, replayOf: base.id }, parentRunId: base.id }, now); this.insertEvents(events);
    const record: ReplayRecord = { id: randomUUID(), baseRunId: base.id, resultRunId: input.id, targetEventId: input.targetEventId, mode: input.mode, status: input.status === "failed" ? "failed" : "completed", createdAt: now };
    this.db.prepare("INSERT INTO replay_sessions (id,base_run_id,result_run_id,target_event_id,override_json,mode,status,divergence_json,created_at) VALUES (?,?,?,?,'{}',?,?,?,?)").run(record.id, base.id, input.id, input.targetEventId, input.mode, record.status, encode(divergences as unknown as JsonValue), now);
    return { record, original: base, replayed: this.getRunDetail(input.id)!, divergences };
  }
  private toRun(row: Row): RunSummary { return { id: String(row.id), name: String(row.name), kind: String(row.kind) as RunKind, status: String(row.status) as RunStatus, startedAt: String(row.started_at), finishedAt: optional(row.finished_at), durationMs: row.duration_ms == null ? null : Number(row.duration_ms), eventCount: Number(row.event_count ?? 0), failureCount: Number(row.failure_count ?? 0), createdAt: String(row.created_at), metadata: object(row.metadata_json), parentRunId: optional(row.parent_run_id) }; }
  private toEvent(row: Row): TraceEvent { return { id: String(row.id), runId: String(row.run_id), seq: Number(row.seq), at: String(row.at), kind: String(row.kind) as TraceEvent["kind"], name: String(row.name), agentId: optional(row.agent_id), input: decode(row.input_json, null), output: decode(row.output_json, null), error: decode(row.error_json, null) as TraceError | null, durationMs: row.duration_ms == null ? null : Number(row.duration_ms), parentId: optional(row.parent_id), metadata: object(row.metadata_json) }; }
}
