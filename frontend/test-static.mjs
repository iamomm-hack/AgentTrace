import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const read = (file) => readFile(new URL(`./${file}`, import.meta.url), "utf8");
const exists = (file) => access(new URL(`./${file}`, import.meta.url), constants.F_OK);
const [html, css, js, packageJson, readme] = await Promise.all([read("index.html"), read("styles.css"), read("main.js"), read("package.json"), read("README.md")]);

assert.match(html, /<title>AgentTrace — Trace observability<\/title>/);
assert.match(html, /class="metric-grid"/);
assert.match(html, /data-metric="passRate"/);
assert.match(html, /data-metric="replays"/);
for (const route of ["overview", "runs", "replay", "failures", "import"]) {
  assert.match(html, new RegExp(`data-route="${route}"`));
  assert.match(html, new RegExp(`data-view="${route}"`));
}
for (const element of ["run-inspector", "replay-controls", "divergence-panel", "failure-detail", "trace-file"]) assert.match(html, new RegExp(`id="${element}"`));
assert.match(html, /aria-label="Primary navigation"/);
assert.match(html, /assets\/logo\.webp/);
for (const file of ["assets/logo.webp", "fonts/GeistPixel-Circle.woff2"]) await exists(file);

for (const variable of ["--ink: #1d211d", "--surface", "--line", "--font-sans"]) assert.match(css, new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
for (const selector of [".metric-grid", ".run-row", ".timeline", ".status-badge", ".api-alert", ".empty-state", ".divergence-card"]) assert.match(css, new RegExp(selector.replace(".", "\\.")));
assert.match(css, /GeistPixel-Circle\.woff2/);
assert.match(css, /border-radius:\s*999px/);
assert.match(css, /@media\s*\(max-width:\s*650px\)/);
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);

assert.equal(JSON.parse(packageJson).scripts.test, "node test-static.mjs");
assert.match(readme, /localhost:3000.*API base/i);
assert.match(readme, /Import trace JSON/);
assert.match(js, /const API_BASE = "http:\/\/localhost:3000"/);
assert.match(js, /fetch\(`\$\{API_BASE\}\$\{path\}/);
assert.match(js, /\/api\/runs/);
assert.match(js, /Promise\.all/);
assert.match(js, /targetEventId/);
assert.match(js, /override/);
assert.match(js, /JSON\.parse/);
assert.match(js, /importFile/);
assert.match(js, /No persisted runs yet/);
assert.match(js, /API unavailable/);
assert.doesNotMatch(html, /cloudfront\.net|bg-video|font-awesome|Bubbledot|Trusted by 2000/);
console.log("AgentTrace frontend static checks passed.");
