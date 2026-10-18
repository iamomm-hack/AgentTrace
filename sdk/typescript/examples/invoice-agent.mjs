import { AgentTrace } from "../dist/index.js";

const trace = new AgentTrace({ baseUrl: process.env.AGENTTRACE_URL ?? "http://localhost:3000" });
const run = await trace.startRun({
  id: `sdk-invoice-${Date.now()}`,
  name: "SDK invoice replay demo",
  metadata: { replayMode: "deterministic-fixture", source: "typescript-sdk-example" },
});

try {
  await run.record({ type: "agent", name: "start_report", output: { month: "2026-09" } });
  const invoice = await run.tool("fetch_invoice", { invoiceId: "inv-42" }, async () => ({ amount: null, currency: "USD" }));
  await run.record({
    type: "agent",
    name: "validate_invoice",
    input: invoice,
    error: { code: "required_value_missing", message: "Invoice amount is required", details: { field: "amount" } },
    metadata: { replay: { afterTool: "fetch_invoice", when: { amount: 1250 }, name: "invoice_valid", input: { amount: 1250 }, output: { valid: true }, error: null } },
  });
  await run.record({
    type: "agent",
    name: "report_not_generated",
    output: { generated: false },
    metadata: { replay: { afterTool: "fetch_invoice", when: { amount: 1250 }, name: "generate_report", output: { generated: true, artifact: "monthly-report.json" } } },
  });
  await run.fail(new Error("Invoice amount is required"), "The report stopped at invoice validation.");
  console.log(`Captured ${run.id}. Open http://localhost:5173/#runs and select “SDK invoice replay demo”.`);
} catch (error) {
  console.error("Could not capture the AgentTrace SDK example:", error);
  process.exitCode = 1;
}
