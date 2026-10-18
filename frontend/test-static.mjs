import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const read = (file) => readFile(new URL(`./${file}`, import.meta.url), "utf8");
const exists = (file) => access(new URL(`./${file}`, import.meta.url), constants.F_OK);
const [html, css, app, sidebar, routeSource, ui, api, packageJson, readme] = await Promise.all([
  read("index.html"),
  read("styles.css"),
  read("src/App.tsx"),
  read("src/components/layout/Sidebar.tsx"),
  read("src/hooks/useHashRoute.ts"),
  Promise.all(["src/pages/OverviewPage.tsx", "src/pages/RunsPage.tsx", "src/pages/ReplayPage.tsx", "src/pages/FailuresPage.tsx", "src/pages/ImportPage.tsx", "src/components/trace/ReplayControls.tsx", "src/components/trace/FailureReportPanel.tsx"].map(read)).then((parts) => parts.join("\n")),
  read("src/services/api.ts"),
  read("package.json"),
  read("README.md"),
]);

assert.match(html, /<title>AgentTrace — Trace observability<\/title>/);
assert.match(html, /id="root"/);
assert.match(html, /src="\/src\/main\.tsx"/);
for (const route of ["overview", "runs", "replay", "failures", "import"]) assert.match(routeSource, new RegExp(`"${route}"`));
for (const file of ["src/main.tsx", "src/App.tsx", "src/hooks/useHashRoute.ts", "src/services/api.ts", "src/pages/OverviewPage.tsx", "src/pages/RunsPage.tsx", "src/pages/ReplayPage.tsx", "src/pages/FailuresPage.tsx", "src/pages/ImportPage.tsx"]) await exists(file);
for (const file of ["assets/logo.webp", "fonts/GeistPixel-Circle.woff2"]) await exists(file);
assert.match(sidebar, /aria-label="Primary navigation"/);
assert.match(ui, /run-inspector/);
assert.match(ui, /replay-controls/);
assert.match(ui, /divergence-panel/);
assert.match(ui, /failure-detail/);
assert.match(ui, /trace-file/);
assert.match(sidebar, /logo\.webp/);
for (const metric of ["runs", "passRate", "failed", "replays", "duration"]) assert.match(ui, new RegExp(`metricKey="${metric}"`));

for (const variable of ["--ink: #1d211d", "--surface", "--line", "--font-sans"]) assert.match(css, new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
for (const selector of [".metric-grid", ".run-row", ".timeline", ".status-badge", ".api-alert", ".empty-state", ".divergence-card"]) assert.match(css, new RegExp(selector.replace(".", "\\.")));
assert.match(css, /GeistPixel-Circle\.woff2/);
assert.match(css, /border-radius:\s*999px/);
assert.match(css, /@media\s*\(max-width:\s*650px\)/);
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);

const packageData = JSON.parse(packageJson);
assert.equal(packageData.scripts.test, "node test-static.mjs");
assert.equal(packageData.scripts.build, "tsc -b && vite build");
assert.match(readme, /localhost:3000.*VITE_API_BASE/i);
assert.match(readme, /Import trace JSON/);
assert.match(api, /VITE_API_BASE/);
assert.match(api, /fetch\(/);
assert.match(app, /\/api\/runs/);
assert.match(app, /Promise\.all/);
assert.match(app, /targetEventId/);
assert.match(app, /override/);
assert.match(app, /JSON\.parse/);
assert.match(app, /importFile/);
assert.match(ui, /No persisted runs yet/);
assert.match(sidebar, /API unavailable/);
assert.doesNotMatch(html, /cloudfront\.net|bg-video|font-awesome|Bubbledot|Trusted by 2000/);
console.log("AgentTrace React frontend static checks passed.");
