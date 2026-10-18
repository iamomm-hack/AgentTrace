import assert from "node:assert/strict";
import test from "node:test";
import { AgentTrace, AgentTraceHttpError } from "../index.js";

test("captures tool calls in a batch before completing a run", async () => {
  const calls: Array<{ path: string; body: any }> = [];
  const mockedFetch: typeof fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ path, body });
    const payload = path === "/api/v1/runs" ? { id: "sdk-run", name: "SDK run", status: "running" } : { id: "sdk-run", name: "SDK run", status: "passed" };
    return new Response(JSON.stringify(payload), { status: path.endsWith("/events") ? 201 : 200, headers: { "content-type": "application/json" } });
  };
  const client = new AgentTrace({ fetch: mockedFetch, batchSize: 2 });
  const run = await client.startRun({ name: "SDK run" });
  const output = await run.tool("lookup_invoice", { id: "inv_1" }, async () => ({ amount: 1250 }));
  assert.deepEqual(output, { amount: 1250 });
  await run.record({ type: "agent", name: "render_report", output: { ok: true } });
  await run.complete();
  assert.deepEqual(calls.map((call) => call.path), ["/api/v1/runs", "/api/v1/runs/sdk-run/events", "/api/v1/runs/sdk-run/complete"]);
  assert.equal(calls[1].body.events[0].name, "lookup_invoice");
  assert.equal(calls[1].body.events[1].sequence, 2);
});

test("keeps a failed batch queued for a later flush", async () => {
  let attempts = 0;
  const mockedFetch: typeof fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    if (path === "/api/v1/runs") return Response.json({ id: "retry-run", name: "Retry", status: "running" });
    if (path.endsWith("/events") && attempts++ === 0) return Response.json({ error: { code: "offline", message: "offline" } }, { status: 503 });
    return Response.json(path.endsWith("/events") ? { events: [] } : { id: "retry-run", status: "passed" });
  };
  const run = await new AgentTrace({ fetch: mockedFetch, batchSize: 1 }).startRun({ name: "Retry" });
  await assert.rejects(run.record({ name: "queued", output: null }), AgentTraceHttpError);
  await run.flush();
  assert.equal(attempts, 2);
});
