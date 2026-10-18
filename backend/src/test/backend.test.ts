import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp, type AgentTraceApp } from "../http/server.js";

const fixedTime = "2026-01-02T03:04:05.000Z";
let app: AgentTraceApp;
let baseUrl = "";
let temp = "";
let id = 0;

async function request(path: string, method = "GET", value?: unknown): Promise<{ status: number; body: any }> {
  const response = await fetch(`${baseUrl}${path}`, { method, headers: value === undefined ? undefined : { "content-type": "application/json" }, body: value === undefined ? undefined : JSON.stringify(value) });
  return { status: response.status, body: await response.json() };
}

const successfulTrace = {
  id: "run-success",
  name: "Support ticket routing",
  status: "passed",
  metadata: { replayMode: "deterministic-fixture" },
  events: [
    { id: "lookup", seq: 1, type: "tool", name: "lookup_customer", input: { id: "cus_1" }, output: { tier: "standard" } },
    { id: "route", seq: 2, type: "agent", name: "standard_queue", output: { queue: "standard" }, metadata: { replay: { afterTool: "lookup_customer", when: { tier: "vip" }, name: "priority_queue", output: { queue: "priority" } } } },
  ],
};

before(async () => {
  temp = mkdtempSync(join(tmpdir(), "agenttrace-test-"));
  app = createApp({ dbPath: join(temp, "trace.sqlite"), migrationsDir: join(process.cwd(), "migrations"), now: () => fixedTime, idFactory: () => `generated-${++id}` });
  await new Promise<void>((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  const address = app.server.address();
  assert.ok(address && typeof address === "object");
  baseUrl = `http://127.0.0.1:${address.port}`;
});
after(async () => { await new Promise<void>((resolve, reject) => app.server.close((error) => error ? reject(error) : resolve())); app.close(); rmSync(temp, { recursive: true, force: true }); });

test("imports a trace, persists events, and reports real overview metrics", async () => {
  const health = await request("/api/v1/healthz");
  assert.equal(health.status, 200);
  assert.equal(health.body.sqlite, "ok");
  const imported = await request("/api/v1/runs/import", "POST", successfulTrace);
  assert.equal(imported.status, 201);
  assert.equal(imported.body.id, "run-success");
  assert.equal(imported.body.events.length, 2);
  const detail = await request("/api/v1/runs/run-success");
  assert.equal(detail.status, 200);
  assert.deepEqual(detail.body.events.map((event: any) => event.seq), [1, 2]);
  assert.deepEqual(detail.body.events[0].output, { tier: "standard" });
  const overview = await request("/api/v1/overview");
  assert.equal(overview.body.metrics.totalRuns, 1);
  assert.equal(overview.body.metrics.passedRuns, 1);
  assert.equal(overview.body.metrics.passRate, 100);
});

test("successful fixture replay has no divergence and branch replay finds the first mismatch", async () => {
  const recorded = await request("/api/v1/replays", "POST", { runId: "run-success", targetEventId: "lookup", override: { output: { tier: "standard" } } });
  assert.equal(recorded.status, 201);
  assert.equal(recorded.body.replay.mode, "deterministic-fixture");
  assert.deepEqual(recorded.body.divergences, []);

  const branch = await request("/api/v1/runs/run-success/replay", "POST", { targetEventId: "lookup", override: { output: { tier: "vip" } } });
  assert.equal(branch.status, 201);
  assert.equal(branch.body.divergences[0].seq, 1);
  assert.equal(branch.body.divergences[0].path, "/output/tier");
  assert.equal(branch.body.divergences.some((item: any) => item.seq === 2 && item.path === "/output/queue"), true);

  const storedBranch = await request("/api/v1/runs/run-success/branches", "POST", { name: "vip branch", overrides: [{ sequence: 1, tool: "lookup_customer", response: { tier: "vip" } }] });
  assert.equal(storedBranch.status, 201);
  const comparison = await request("/api/v1/runs/run-success/compare", "POST", { branchId: storedBranch.body.id, actual: [{ tool: "lookup_customer", input: { id: "cus_1" }, response: { tier: "standard" } }] });
  assert.equal(comparison.status, 200);
  assert.equal(comparison.body.match, false);
  assert.equal(comparison.body.firstMismatch.reason, "response_mismatch");
});

test("failure replay stops at the overridden tool and invalid targets are rejected", async () => {
  const replay = await request("/api/v1/replays", "POST", { runId: "run-success", targetEventId: "lookup", override: { error: { code: "timeout", message: "fixture timeout" } } });
  assert.equal(replay.status, 201);
  assert.equal(replay.body.replayed.status, "failed");
  assert.equal(replay.body.replayed.events.length, 1);
  assert.equal(replay.body.replayed.events[0].error.code, "timeout");
  const invalid = await request("/api/v1/replays", "POST", { runId: "run-success", targetEventId: "missing", override: { output: {} } });
  assert.equal(invalid.status, 422);
  assert.equal(invalid.body.error.code, "replay_target_not_found");
});

test("failed imports generate evidence-backed reports and malformed traces stay at the HTTP boundary", async () => {
  const failed = await request("/api/v1/runs/import", "POST", { id: "run-failed", name: "Broken lookup", status: "failed", events: [{ id: "failure", seq: 1, type: "error", name: "lookup_customer", error: { code: "upstream_error", message: "fixture failure" } }] });
  assert.equal(failed.status, 201);
  const failures = await request("/api/v1/failures");
  assert.equal(failures.body.reports.length, 1);
  assert.equal(failures.body.reports[0].evidence.firstFailureEventId, "failure");
  const malformed = await request("/api/v1/runs/import", "POST", { id: "bad" });
  assert.equal(malformed.status, 422);
  assert.match(malformed.body.error.message, /events|steps/i);
  const missingToolResponse = await request("/api/v1/runs/import", "POST", { id: "missing-response", events: [{ type: "tool", name: "search", input: { q: "trace" } }] });
  assert.equal(missingToolResponse.status, 422);
  assert.match(missingToolResponse.body.error.message, /output|error/i);
});

test("validates schema versions and redacts secrets before persistence", async () => {
  const trace = { schemaVersion: "1", id: "run-redacted", status: "passed", metadata: { access_token: "secret-token" }, events: [{ id: "secret-tool", type: "tool", name: "call_api", input: { authorization: "Bearer abc.def.ghi", nested: { password: "hunter2" } }, output: { ok: true, api_key: "sk-test" } }] };
  const validation = await request("/api/v1/runs/validate", "POST", trace);
  assert.equal(validation.status, 200);
  assert.equal(validation.body.schemaVersion, "1");
  assert.deepEqual(validation.body.redactedPaths.sort(), ["/events/0/input/authorization", "/events/0/input/nested/password", "/events/0/output/api_key", "/metadata/access_token"].sort());
  const imported = await request("/api/v1/runs/import", "POST", trace);
  assert.equal(imported.body.metadata.access_token, "[REDACTED]");
  assert.equal(imported.body.events[0].input.authorization, "[REDACTED]");
  assert.equal(imported.body.events[0].input.nested.password, "[REDACTED]");
  assert.equal(imported.body.events[0].output.api_key, "[REDACTED]");
  const invalidVersion = await request("/api/v1/runs/validate", "POST", { ...trace, id: "invalid-version", schemaVersion: "2" });
  assert.equal(invalidVersion.status, 422);
  assert.match(invalidVersion.body.error.message, /schemaVersion/);
});

test("batch ingestion is atomic when one event is invalid", async () => {
  const created = await request("/api/v1/runs", "POST", { id: "batch-run", name: "Atomic batch" });
  assert.equal(created.status, 201);
  const rejected = await request("/api/v1/runs/batch-run/events", "POST", { events: [{ type: "log", name: "valid" }, { type: "tool", name: "invalid_without_result" }] });
  assert.equal(rejected.status, 422);
  const detail = await request("/api/v1/runs/batch-run");
  assert.equal(detail.body.events.length, 0);
});

test("trace import rejects duplicate event ids without leaving an orphan run", async () => {
  const rejected = await request("/api/v1/runs/import", "POST", { id: "duplicate-events", events: [{ id: "same", seq: 1, type: "log" }, { id: "same", seq: 2, type: "log" }] });
  assert.equal(rejected.status, 422);
  assert.match(rejected.body.error.message, /duplicate event id/i);
  const missing = await request("/api/v1/runs/duplicate-events");
  assert.equal(missing.status, 404);
});

test("invoice fixture reproduces failure, branches to success, and exports evidence", async () => {
  const fixture = JSON.parse(readFileSync(join(process.cwd(), "fixtures", "invoice-report.json"), "utf8"));
  const imported = await request("/api/v1/runs/import", "POST", fixture);
  assert.equal(imported.status, 201);
  const baseline = await request("/api/v1/runs/fixture-invoice-report/replay", "POST", { targetEventId: "fetch-invoice", override: { output: { amount: null, currency: "USD" } } });
  assert.equal(baseline.body.replayed.status, "failed");
  assert.deepEqual(baseline.body.divergences, []);
  const branch = await request("/api/v1/runs/fixture-invoice-report/replay", "POST", { targetEventId: "fetch-invoice", override: { output: { amount: 1250, currency: "USD" } } });
  assert.equal(branch.body.replayed.status, "passed");
  assert.equal(branch.body.replayed.events.find((event: any) => event.id.endsWith("-3")).error, null);
  assert.deepEqual(branch.body.replayed.events.find((event: any) => event.id.endsWith("-4")).output, { artifact: "monthly-report.json", generated: true });
  assert.equal(branch.body.divergences.some((item: any) => item.seq === 3 && item.path === "/error"), true);
  const replays = await request("/api/v1/replays?runId=fixture-invoice-report");
  assert.equal(replays.body.replays.length, 2);
  const replayDetail = await request(`/api/v1/replays/${branch.body.replay.id}`);
  assert.deepEqual(replayDetail.body.override.output, { amount: 1250, currency: "USD" });
  const exported = await request(`/api/v1/runs/fixture-invoice-report/report/export?replayId=${branch.body.replay.id}`);
  assert.equal(exported.status, 200);
  assert.equal(exported.body.schemaVersion, "1");
  assert.equal(exported.body.source.replay.id, branch.body.replay.id);
  assert.equal(exported.body.controlledModification.targetEventId, "fetch-invoice");
  assert.ok(exported.body.limitations.length >= 3);
  assert.match(exported.body.reproduction.replay.path, /fixture-invoice-report/);
});

test("rejects untrusted browser origins while allowing the local Vite app", async () => {
  const blocked = await fetch(`${baseUrl}/api/v1/runs`, { method: "OPTIONS", headers: { origin: "https://malicious.example" } });
  assert.equal(blocked.status, 403);
  const blockedMutation = await fetch(`${baseUrl}/api/v1/runs`, { method: "POST", headers: { origin: "https://malicious.example", "content-type": "application/json" }, body: JSON.stringify({ id: "cross-origin-run" }) });
  assert.equal(blockedMutation.status, 403);
  const missing = await request("/api/v1/runs/cross-origin-run");
  assert.equal(missing.status, 404);
  const allowed = await fetch(`${baseUrl}/api/v1/runs`, { method: "OPTIONS", headers: { origin: "http://localhost:5173" } });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get("access-control-allow-origin"), "http://localhost:5173");
});
