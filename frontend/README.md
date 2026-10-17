# AgentTrace frontend

AgentTrace is a plain HTML, CSS, and vanilla JavaScript interface for inspecting agent traces. It keeps the supplied black/white visual language, pill controls, responsive layout, local Geist display font, and logo while replacing the static landing page with an observability workflow.

## What works

- Overview metrics and recent runs loaded from the backend API.
- Run search, run selection, and a trace timeline with tool input, output, and error details.
- Replay workspace with an editable controlled tool response.
- Divergence comparison that identifies the first mismatched step and field.
- Failure report list and detail view.
- Import trace JSON through the local backend so the run and its events are persisted in SQLite; no external service is contacted.
- Honest unavailable and empty states. The interface does not generate analytics when the API has not reported them.

## Setup

The runtime is pinned to Node `24.22.0` in `.nvmrc`. There are no runtime npm dependencies; the lockfile is kept for reproducible setup.

```sh
nvm use
npm ci
```

## API

The frontend uses the same-origin `/api/v1` API in the unified server. When served as a standalone static page, it expects the development backend at `http://localhost:3000`. It uses:

- `GET /api/v1/overview` for persisted overview metrics.
- `GET /api/v1/runs` and `GET /api/v1/runs/:id` for the run list and trace detail.
- `POST /api/v1/replays` for controlled replay. The request includes `runId`, `targetEventId`, and an output or error override.
- `GET /api/v1/failures` for evidence-backed failure reports.

The UI uses the backend's normalized run/event response shape and keeps API-unavailable, empty, malformed-import, and no-tool states explicit.

## Run

The page has no build step. Serve this folder with the existing static-server workflow:

```sh
python3 -m http.server 3000
```

Open <http://localhost:3000>. If the backend is also running on port `3000`, serve the static files through that backend or use its static-file configuration. When the API is unavailable, the dashboard shows an explicit warning.

## Test

```sh
make test
```

This runs `node test-static.mjs` offline. The checks cover dashboard routes, metrics/timeline/replay/import markup, API wiring, responsive styling, local assets, and the no-fake-data empty-state contract.

## Docker

```sh
docker build -t agenttrace-frontend .
docker run --rm -p 3000:3000 agenttrace-frontend
```

Open <http://localhost:3000>.

## Deploy

Deploy the contents of this folder to a static host. Configure the host to serve `index.html` for `/` and preserve the `assets/` and `fonts/` paths. The deployed page must be able to reach the API at the configured `localhost:3000` base, or the API base in `main.js` must be changed within this frontend folder.
