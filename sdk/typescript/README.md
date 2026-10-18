# AgentTrace TypeScript SDK

Capture an application-owned agent run and send structured events to a local AgentTrace server. The SDK never executes tools during replay; `run.tool()` only wraps the operation your application already chose to execute and records its result.

Build it and install it into a local agent project:

```sh
npm run build
npm install /absolute/path/to/agenttrace/sdk/typescript
```

```ts
import { AgentTrace } from "@agenttrace/sdk";

const trace = new AgentTrace({ baseUrl: "http://localhost:3000" });
const run = await trace.startRun({ name: "Monthly invoice report" });

try {
  const invoice = await run.tool("fetch_invoice", { invoiceId: "inv_42" }, () =>
    billing.getInvoice("inv_42")
  );
  await run.record({ type: "agent", name: "compose_report", input: invoice, output: { generated: true } });
  await run.complete();
} catch (error) {
  await run.fail(error);
  throw error;
}
```

Events are buffered and written as ordered batches. A failed batch is restored to the queue so the application can retry `flush()`. Call `complete()` or `fail()` to flush remaining events and close the run.

With the AgentTrace backend running, create a complete replay-ready demo trace:

```sh
npm run example
```

Open the run named **SDK invoice replay demo**, select `fetch_invoice`, replace its output with `{ "amount": 1250, "currency": "USD" }`, and run the controlled replay.
