import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const read = (file) => readFile(new URL(`./${file}`, import.meta.url), "utf8");
const exists = (file) => access(new URL(`./${file}`, import.meta.url), constants.F_OK);

const [html, css, js] = await Promise.all([read("index.html"), read("styles.css"), read("main.js")]);

assert.match(html, /<title>Intelligence Designed To Evolve<\/title>/);
assert.match(html, /class="bg-video" autoplay muted loop playsinline/);
assert.match(html, /https:\/\/d8j0ntlcm91z4\.cloudfront\.net\/user_38xzZboKViGWJOttwIXH07lWA1P\/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7\.mp4/);
assert.match(html, /family=BubbledotICG-FinePos/);
assert.match(html, /fa-microsoft/);
assert.match(html, /fa-amazon/);
assert.match(html, /fa-google/);
assert.match(html, /aria-controls="mobile-menu"/);
assert.match(html, /tabindex="-1" aria-label="Close navigation menu"/);
assert.match(html, /role="dialog" aria-label="Mobile navigation" aria-modal="true"/);
assert.match(html, /data-target="99\.99"/);

for (const file of ["assets/logo.webp", "fonts/GeistPixel-Circle.woff2"]) {
  await exists(file);
}

for (const variable of ["--bg: #000000", "--font-sans", "--font-display", "--trust-border"]) {
  assert.match(css, new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

assert.match(css, /GeistPixel-Circle\.woff2/);
assert.match(css, /object-fit:\s*cover/);
assert.match(css, /overflow:\s*hidden/);
assert.match(css, /@media\s*\(max-width:\s*720px\)/);
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
assert.match(css, /animation-name:\s*revealPulse/);
assert.match(js, /aria-expanded/);
assert.match(js, /\.focus\(\)/);
assert.match(js, /page\.inert = isOpen/);
assert.match(js, /bgVideo\.pause\(\)/);
assert.match(js, /IntersectionObserver/);
assert.match(js, /Math\.pow\(1 - progress, 3\)/);

console.log("Static landing page checks passed.");
