import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { act, createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";

// DOM behavior checks; layout and media playback still require a real browser.
const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost/" });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
const media = new Map();
globalThis.matchMedia = window.matchMedia = (query) => {
  if (!media.has(query)) {
    const events = new dom.window.EventTarget();
    media.set(query, { matches: false, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), dispatchEvent: events.dispatchEvent.bind(events) });
  }
  return media.get(query);
};
const changeMedia = (query, matches) => { const entry = matchMedia(query); entry.matches = matches; entry.dispatchEvent(new dom.window.Event("change")); };
const observers = new Set();
globalThis.IntersectionObserver = class {
  constructor(callback, options) { this.callback = callback; assert.equal(options.threshold, .25); }
  observe() { observers.add(this); }
  disconnect() { observers.delete(this); }
};
const frames = new Map();
let frameId = 0;
globalThis.requestAnimationFrame = (callback) => { frames.set(++frameId, callback); return frameId; };
globalThis.cancelAnimationFrame = (id) => frames.delete(id);
window.HTMLMediaElement.prototype.play = () => Promise.reject(new Error("Autoplay blocked"));
window.HTMLMediaElement.prototype.pause = () => {};
window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
window.HTMLDialogElement.prototype.close = function () { this.open = false; };
let requests = 0;
let reachable = true;
let mockRuns = [];
globalThis.fetch = async (url) => {
  requests++;
  if (!reachable) throw new Error("Connection refused");
  const body = url.endsWith("/report") ? { runId: "failed-test", title: "Tool timed out", summary: "The search tool did not respond." }
    : url.endsWith("/api/runs/passed-test") ? mockRuns[0]
    : { runs: mockRuns, metrics: {}, sqlite: "ok" };
  return { ok: true, text: async () => JSON.stringify(body) };
};
const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
const root = createRoot(document.getElementById("root"));
const click = async (element) => { assert.ok(element); await act(async () => element.click()); };
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const navigate = async (hash) => { await act(async () => { window.location.hash = hash; await tick(); }); };
const byText = (selector, text) => [...document.querySelectorAll(selector)].find((el) => el.textContent === text);
try {
  const { default: App } = await vite.ssrLoadModule("/src/App.tsx");
  await act(async () => root.render(createElement(StrictMode, null, createElement(App))));
  assert.ok(document.querySelector(".landing-page"));
  assert.equal(requests, 0, "Landing page must not fetch workspace data");
  assert.equal(document.querySelectorAll("h1 span").length, 2);
  assert.equal(document.querySelector("video").loop, true);
  assert.equal(document.querySelector("video").muted, true);
  assert.equal(document.querySelectorAll(".landing-stat").length, 4);
  assert.equal(observers.size, 4, "StrictMode must not duplicate observers");
  await act(async () => { for (const observer of [...observers]) observer.callback([{ isIntersecting: true }]); await new Promise((resolve) => setTimeout(resolve, 800)); });
  assert.equal(frames.size, 4, "One animation frame per counter");
  await act(async () => { for (const [id, callback] of [...frames]) { frames.delete(id); callback(performance.now() + 2500); } });
  assert.deepEqual([...document.querySelectorAll(".stat-value")].map((el) => el.textContent), ["120ms", "99.99%", "24/7", "2.4M"]);
  assert.equal(frames.size, 0);
  const toggle = document.querySelector(".menu-toggle");
  await click(toggle);
  assert.equal(toggle.getAttribute("aria-expanded"), "true");
  assert.ok(document.querySelector(".landing-content").hasAttribute("inert"));
  assert.equal(document.activeElement.textContent, "Home");
  await act(async () => document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape" })));
  assert.equal(toggle.getAttribute("aria-expanded"), "false");
  assert.equal(document.activeElement, toggle);
  await click(toggle);
  await click(document.querySelector(".menu-overlay"));
  assert.equal(toggle.getAttribute("aria-expanded"), "false");
  await click(toggle);
  await act(async () => changeMedia("(min-width: 721px)", true));
  assert.equal(toggle.getAttribute("aria-expanded"), "false");
  await click(toggle);
  await click(document.querySelector(".mobile-menu a"));
  await act(tick);
  assert.equal(toggle.getAttribute("aria-expanded"), "false");
  await click(byText(".desktop-sign-in", "Sign In"));
  assert.equal(document.querySelector("dialog").open, true);
  assert.match(document.querySelector("dialog").textContent, /does not have authentication/);
  await click(byText("dialog button", "Close"));
  assert.equal(document.querySelector("dialog").open, false);
  for (const route of ["overview", "runs", "replay", "failures", "import"]) {
    await navigate(route);
    assert.ok(document.querySelector(`[data-view="${route}"]`), `${route} route must be preserved`);
    assert.ok(!document.querySelector(".api-alert"), "Connected workspace must not render an API unavailable banner");
    assert.equal(document.querySelector(".landing-page"), null);
  }
  assert.ok(requests > 0);
  await click(document.querySelector(".mobile-menu-button"));
  assert.ok(document.querySelector(".app-content").hasAttribute("inert"));
  await act(async () => document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape" })));
  assert.ok(!document.querySelector(".sidebar-backdrop"));
  await click(document.querySelector(".mobile-menu-button"));
  await click(document.querySelector(".sidebar-backdrop"));
  assert.ok(!document.querySelector(".app-content").hasAttribute("inert"));
  reachable = false;
  await click(document.querySelector('[data-action="refresh"]'));
  assert.match(document.querySelector(".api-alert").textContent, /Connection refused/);
  assert.match(document.querySelector(".api-pill").textContent, /Offline/);
  reachable = true;
  mockRuns = [
    { id: "passed-test", name: "Search agent", status: "passed", events: [{ id: "tool-1", type: "tool", name: "search", input: {}, output: { results: [] } }] },
    { id: "failed-test", name: "Failed agent", status: "failed", events: [] },
  ];
  await click(document.querySelector('[data-action="refresh"]'));
  assert.ok(!document.querySelector(".api-alert"));
  await navigate("runs");
  assert.equal(document.querySelectorAll(".run-row").length, 2);
  await click(document.querySelector('[data-run-id="passed-test"]'));
  assert.equal(document.querySelectorAll(".timeline-event").length, 1);
  await navigate("replay");
  assert.equal(document.querySelector("#replay-event").value, "tool-1");
  await navigate("failures");
  assert.match(document.querySelector(".failure-detail").textContent, /Tool timed out/);
  mockRuns = [];
  await act(async () => changeMedia("(prefers-reduced-motion: reduce)", true));
  await navigate("home");
  assert.deepEqual([...document.querySelectorAll(".stat-value")].map((el) => el.textContent), ["120ms", "99.99%", "24/7", "2.4M"]);
  assert.equal(observers.size, 0);
  assert.equal(frames.size, 0);
  await act(async () => changeMedia("(prefers-reduced-motion: reduce)", false));
  await navigate("overview");
  await navigate("home");
  await act(async () => { for (const observer of [...observers]) observer.callback([{ isIntersecting: true }]); });
  await navigate("overview");
  await new Promise((resolve) => setTimeout(resolve, 800));
  assert.equal(frames.size, 0, "Unmount must cancel delayed animations");
  assert.equal(observers.size, 0);
  console.log("UI checks passed: landing, workspace routes, populated runs/replay/failures, connection recovery, mobile navigation, counters, reduced motion, and cleanup.");
} finally {
  await act(async () => root.unmount());
  await vite.close();
  dom.window.close();
}
