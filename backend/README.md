# AgentTrace backend

AgentTrace is a small, dependency-free-at-runtime HTTP backend for recording agent runs, replaying recorded tool fixtures, creating deterministic branches, comparing a replay with actual tool responses, and retrieving failure reports.

## Requirements

- Node.js `24.22.0` (pinned in `.nvmrc` and the Docker image).
- SQLite through the built-in `node:sqlite` module.

`node:sqlite` is available in Node 22.5 and later as an experimental built-in, so the current project test environment's Node `22.23.3` can run the backend too. The supported/pinned runtime is Node `24.22.0`. There is no third-party SQLite fallback because persistence is a core requirement; on a Node version without `node:sqlite`, startup fails with the runtime's module error. The runtime has no production npm dependencies.

## Setup and checks

```sh
nvm use
npm ci
make typecheck
make test
```

`make test` builds the TypeScript sources and runs the deterministic `node:test` suite against temporary SQLite databases. It does not contact external services. `npm ci` only installs the pinned development tools from `package-lock.json`; the server itself uses Node built-ins. Reusable success, failure, and branch-outcome fixtures are in `fixtures/`.

## Run

```sh
cp .env.example .env
npm run build
npm start
```

Configuration is read from the environment. The defaults are `PORT=3000`, `HOST=0.0.0.0`, and `AGENTTRACE_DB_PATH=./data/agenttrace.sqlite`. Browser origins are restricted by the comma-separated `AGENTTRACE_ALLOWED_ORIGINS`; local Vite origins are allowed by default. The server applies files in `migrations/` on startup.

Docker: build from the repository root with the root `Dockerfile`; it includes both the backend and frontend.

## HTTP API

All responses are JSON. Errors have the stable shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "..."
  }
}
```

### Health and runs

- `GET /api/v1/healthz` returns `{ "status": "ok", "service": "agenttrace", "sqlite": "ok" }`. `/healthz` is also accepted.
- `POST /api/v1/runs` creates a run. Body: `{ "name"?: string, "metadata"?: JSON }`.
- `POST /api/v1/runs/validate` validates and previews a versioned trace without persisting it. Schema version `"1"` is supported; omitted versions are treated as legacy v1 input with a warning.
- `POST /api/v1/runs/import` validates, redacts secrets, and atomically persists a trace. Imports accept an object with `events`/`steps`, or a raw event array, up to 10,000 events and 5 MiB per request.
- `GET /api/v1/runs` lists runs in creation order.
- `GET /api/v1/runs/:runId` returns a run and its ordered events.
- `POST /api/v1/runs/:runId/events` ingests one event or `{ "events": [...] }`. Body:

  ```json
  {
    "type": "tool_call",
    "tool": "search",
    "input": { "query": "agent trace" },
    "response": { "hits": ["a"] },
    "sequence": 1,
    "timestamp": "2026-01-02T03:04:05.000Z",
    "payload": { "attempt": 1 }
  }
  ```

  `sequence` and `timestamp` are assigned when omitted. `tool_call` events require `tool` and `response`; those recorded responses are the replay fixture.
- `POST /api/v1/runs/:runId/complete` completes a run. Body: `{ "status": "completed" | "failed", "summary"?, "error"? }`. A failed completion creates or updates the run's failure report.

### Replay, branches, and comparison

- `POST /api/v1/replays` or `POST /api/v1/runs/:runId/replay` replays a selected recorded tool event with `{ "runId": "...", "targetEventId": "...", "override": { "output": {} } }`.
- `GET /api/v1/replays?runId=:runId` lists replay provenance; `GET /api/v1/replays/:replayId` retrieves one replay record including its controlled override and divergences.
- `POST /api/v1/runs/:runId/branches` persists selected tool response overrides. Body: `{ "name"?, "overrides": [{ "sequence"?, "tool", "input"?, "response" }] }`.
- `POST /api/v1/runs/:runId/compare` compares actual responses with recorded or branched responses and returns the first mismatch. Body: `{ "branchId"?, "actual": [{ "tool", "input"?, "response" }] }`.

The HTTP MVP uses a selected event so the UI can show the exact original and replayed timelines. Replay substitutes recorded tool responses only; no real external tool is called and arbitrary LLM reasoning is not reproduced.

### Failure reports

- `GET /api/v1/failures` lists persisted failure reports.
- `GET /api/v1/failures/:runId` retrieves a report for a failed run.
- `POST /api/v1/runs/:runId/report` creates or replaces a report.
- `GET /api/v1/runs/:runId/report/export?replayId=:replayId` downloads a versioned JSON evidence bundle with observations, the controlled modification, divergences, reproduction instructions, and explicit replay limitations.

Sensitive key names (tokens, authorization, passwords, secrets, cookies, private keys) and common credential strings are replaced with `[REDACTED]` before persistence. Redaction is defensive, not a substitute for avoiding secrets in traces.

## Deploy

Build the image with the Dockerfile and run it with a persistent volume mounted at `/app/data`. No external service, authentication provider, or secret is required for this MVP. Keep deployment-specific values in environment variables; `.env.example` contains the local defaults.
