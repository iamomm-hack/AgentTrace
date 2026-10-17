# Shared contracts

`contracts.ts` is the JSON-safe boundary vocabulary for run summaries, trace events, replay requests/results, divergences, failure reports, and API errors. The runtime implementation currently keeps the backend's SQLite-facing models separate so persistence concerns do not leak into the browser contract.
