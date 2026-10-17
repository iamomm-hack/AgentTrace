import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
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
