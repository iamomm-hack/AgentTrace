# AgentTrace frontend

AgentTrace is a React, TypeScript, and Vite interface for inspecting agent traces. It keeps the supplied black/white visual language, pill controls, responsive layout, local Geist display font, and logo while providing the observability workflow as typed React components.

## What works

- Public landing page at `/` and `#home`, with the specified background video, fonts, responsive menu, and animated demonstration counters.
- Product and Get Started open `#overview`. Existing `#runs`, `#replay`, `#failures`, and `#import` links remain compatible.
- Sign In explains that this local workspace has no authentication. Case Studies and Contact explain that no published destination is configured; they do not simulate those services.
- Enterprise copy and footer figures are explicitly marked as design-preview placeholders, not measured telemetry or verified customer claims. Verify or replace them before public deployment.

- Overview metrics and recent runs loaded from the backend API.
- Run search, run selection, and a trace timeline with tool input, output, and error details.
- Replay workspace with an editable controlled tool response.
- Divergence comparison that identifies the first mismatched step and field.
- Failure report list and detail view.
- Import trace JSON through the local backend so the run and its events are persisted in SQLite; no external service is contacted.
- Honest unavailable and empty states. The interface does not generate analytics when the API has not reported them.

## Setup

The runtime is pinned to Node `22.22.0` in `.nvmrc`. The frontend also supports Node 24. React is bundled into the production output, and the lockfile keeps the development and build toolchain reproducible.

```sh
nvm use
npm ci
```

React and Vite dependencies are pinned in `package-lock.json` for reproducible installs.

## API

The frontend uses relative `/api` requests by default. Vite proxies those requests to `http://localhost:3000` during development, and the unified backend serves the built application from the same origin in production. Set `VITE_API_BASE` when a separately hosted frontend needs a different API origin. It uses:

- `GET /api/v1/overview` for persisted overview metrics.
- `GET /api/v1/runs` and `GET /api/v1/runs/:id` for the run list and trace detail.
- `POST /api/v1/replays` for controlled replay. The request includes `runId`, `targetEventId`, and an output or error override.
- `GET /api/v1/failures` for evidence-backed failure reports.

The UI uses the backend's normalized run/event response shape and keeps API-unavailable, empty, malformed-import, and no-tool states explicit.

## Run

Start the Vite development server:

```sh
npm run dev
```

Open <http://localhost:5173>. Run the backend separately on port `3000` for live API data. When the API is unavailable, the dashboard shows an explicit warning.

Create a production bundle and preview it locally:

```sh
npm run build
npm run preview
```

The production backend serves `dist/` from the unified application at <http://localhost:3000>.

## Test

```sh
make test
```

This runs the offline frontend contract checks. The checks cover the React entry point, hash views, migrated page/component wiring, API wiring, responsive styling, local assets, and the no-fake-data empty-state contract.

Run `npm run test:landing` for DOM behavior checks covering hash routes, mobile-menu close actions, focus restoration, counters, reduced motion, blocked autoplay, StrictMode, and cleanup. Run `npm run typecheck` and `npm run build` for TypeScript and production validation.

The landing page requests the supplied CloudFront video, Inter from Google Fonts, BubbledotICG-FinePos from OnlineWebFonts, and Font Awesome 6.5.2 from cdnjs. Network access is needed for these resources. Local `/fonts/GeistPixel-Circle.woff2` is the display-font fallback; a black background remains when video playback is unavailable. Reduced-motion preferences pause the video and immediately display final counter values. Landing CSS tokens are scoped to `.landing-page` to preserve dashboard styling.

For visual QA, inspect 1440×900, 768×1024, 390×844, and 375×667 viewports. Check the mobile menu with Tab and Escape, resize an open menu above 720px, and enable reduced motion. Very short viewports allow vertical scrolling so controls remain accessible.

## Docker

```sh
docker build -t agenttrace-frontend .
docker run --rm -p 4173:4173 agenttrace-frontend
```

Open <http://localhost:4173>.

## Deploy

Deploy the contents of `dist/` to a static host. Configure the host to serve `index.html` and preserve the `assets/` and `fonts/` paths. Set `VITE_API_BASE` at build time, or configure the deployed page to reach the backend at the default same-origin `/api` paths.
