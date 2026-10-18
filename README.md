# AgentTrace

AgentTrace is a local-first AI agent execution debugger. It persists structured execution traces, replays recorded tool responses without external side effects, creates controlled branches, identifies the first mismatch, and presents evidence-backed failure context in a browser workspace.

## Project layout

- `backend/` — Node.js 24 + TypeScript HTTP API and SQLite persistence.
- `frontend/` — React + TypeScript + Vite dashboard.
- `shared/contracts.ts` — JSON-safe contracts for runs, events, replay requests, divergences, and reports.
- `sdk/typescript/` — zero-runtime-dependency capture SDK for instrumenting TypeScript and JavaScript agents.

The original static marketing template was retained selectively: the logo, local Geist font, pill controls, responsive navigation, and restrained visual language remain. Generic trust claims and decorative analytics were removed.

## Requirements

- Node.js `24.22.0` (pinned in `.nvmrc`).
- SQLite through the built-in `node:sqlite` module.

## Setup

```sh
nvm use
cp .env.example .env
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix sdk/typescript ci
```

No external service is required. Network access is not needed for the backend test suite or the frontend contract checks after dependencies are installed.

## Test

Run the single repository check command:

```sh
make test
```

This runs backend TypeScript compilation and deterministic `node:test` scenarios for validation, redaction, atomic trace ingestion, successful and failed replay, controlled branches, first-divergence comparison, evidence export, origin checks, reports, API aliases, and the frontend checks.

## Run locally

Start the unified backend and built frontend server on the only supported application port:

```sh
npm --prefix backend run build
npm --prefix frontend run build
npm --prefix backend start
```

Open <http://localhost:3000>. The backend serves the frontend files and the API from the same origin. Data is stored at `backend/data/agenttrace.sqlite` by default.

The frontend can also be run by itself for development and visual work:

```sh
npm --prefix frontend run dev
```

Open <http://localhost:5173>. Vite proxies `/api` requests to the backend at `localhost:3000`; the dashboard honestly shows the API unavailable state until the backend is running.

## TypeScript SDK

The SDK records application-owned tool calls; AgentTrace still performs replay only from recorded or mocked responses.

```sh
npm --prefix sdk/typescript run build
npm install /absolute/path/to/agenttrace/sdk/typescript
```

```ts
import { AgentTrace } from "@agenttrace/sdk";

const trace = new AgentTrace({ baseUrl: "http://localhost:3000" });
const run = await trace.startRun({ name: "Invoice agent" });
const invoice = await run.tool("fetch_invoice", { id: "inv_42" }, () => fetchInvoice("inv_42"));
await run.record({ type: "agent", name: "render_report", input: invoice, output: { generated: true } });
await run.complete();
```

See `sdk/typescript/README.md` for failure capture, batching, and retry behavior.

## Docker

```sh
docker build -t agenttrace .
docker run --rm -p 3000:3000 -v "$PWD/data:/app/backend/data" agenttrace
```

Open <http://localhost:3000>. The image builds both the backend and frontend from this repository and persists SQLite data in the mounted volume.

## Core API

The same API is available with or without the `/api` prefix:

- `GET /healthz` — health check.
- `GET /api/overview` — persisted totals, pass rate, failed runs, average duration, and recent runs.
- `GET /api/runs` / `POST /api/runs` — list or create runs.
- `POST /api/runs/validate` and `POST /api/runs/import` — validate/preview or atomically persist a versioned trace with secret redaction.
- `GET /api/runs/:id` — retrieve a run and ordered events.
- `POST /api/runs/:id/events` — append one event or `{ "events": [...] }` as a transaction-shaped batch.
- `POST /api/runs/:id/complete` — complete or fail a run.
- `POST /api/runs/:id/replay` — replay a selected tool event with `{ "targetEventId": "...", "override": { "output": {} } }` or an error override.
- `GET /api/replays?runId=:id` and `GET /api/replays/:replayId` — inspect persisted replay provenance and divergences.
- `GET /api/failures` and `GET /api/failures/:runId` — list or retrieve evidence-backed reports.
- `GET|POST /api/runs/:id/report` — retrieve or create a failure report.
- `GET /api/runs/:id/report/export?replayId=:replayId` — export a versioned JSON evidence bundle.

Replay substitutes recorded responses only. It does not reproduce arbitrary LLM reasoning, network state, wall-clock behavior, or hidden external side effects. The UI labels this boundary directly.

## Limitations

- This MVP is local-first and has no authentication or multi-user access control.
- The browser import flow sends the trace to the local backend so it can be persisted; it does not contact external services.
- SQLite uses Node's experimental built-in `node:sqlite` API and therefore requires Node 22.5+; the supported/reproducible runtime is Node 24.22.0.
- There is no claim of deterministic replay for arbitrary model generation. Only recorded tool responses and controlled branches are deterministic.
