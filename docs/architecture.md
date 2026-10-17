# AgentTrace architecture

AgentTrace is intentionally a local-first, single-process application. The backend owns persisted workspace state; the browser only edits a selected replay response and renders API results.

```text
HTTP routes (backend/src/http/server.ts)
  -> RunService (backend/src/services/run-service.ts)
      -> normalization + validation (backend/src/domain/normalize.ts)
      -> replay + divergence planning (backend/src/domain/replay.ts)
      -> repository (backend/src/repositories/run-repository.ts)
          -> SQLite migrations (backend/migrations/)
```

## Contracts

`shared/contracts.ts` is the wire-level contract for runs, trace events, replay requests/responses, divergences, and failure reports. `backend/src/domain/models.ts` contains the backend's runtime validation shapes and compatibility aliases for older event names such as `tool_call`.

## Persistence

SQLite stores runs, ordered events, replay sessions, and generated failure reports. JSON payloads are stored as text at the repository boundary. Event fingerprints hash only meaningful event content, not generated IDs or timestamps. SQLite files live under `backend/data/`, which is ignored by git.

## Replay boundary

Replay never calls a real tool, model provider, network, or arbitrary imported code. It replaces the selected recorded tool output or error and compares the resulting projection with the original trace. Imported traces use projection mode: downstream agent/LLM events remain carried-forward evidence and are marked `not-recomputed`. A fixture can opt into deterministic downstream rules with `metadata.replayMode = "deterministic-fixture"` and per-event `metadata.replay` rules; `backend/fixtures/support-ticket.json` demonstrates the branch.

## HTTP surface

The server supports both the concise `/api/*` paths and `/api/v1/*` paths for the stable contract. It also serves `frontend/` from the same origin in the unified root Docker image. Errors return a JSON error code/message and request ID; trace validation is bounded to a 5 MiB request body and 10,000 events. Branch creation and first-mismatch comparison are persisted at `/runs/:id/branches` and `/runs/:id/compare`.

## Deliberate MVP limits

- No authentication or multi-user authorization.
- No real agent executor: deterministic replay covers recorded tool responses, not arbitrary LLM reasoning.
- SQLite is appropriate for a local/single-process workspace, not a horizontally scaled service.
