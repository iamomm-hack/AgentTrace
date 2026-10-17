(() => {
  "use strict";

  const API_BASE = "http://localhost:3000";
  const API_PATH = "/api/v1";
  const ROUTES = new Set(["overview", "runs", "replay", "failures", "import"]);
  const state = {
    runs: [],
    selectedRun: null,
    reports: [],
    replay: null,
    replayEventId: null,
    alertDismissed: false,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const isObject = (value) => value !== null && typeof value === "object";
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]);
  const pretty = (value) => escapeHtml(JSON.stringify(value ?? null, null, 2));

  const statusName = (status) => {
    const normalized = String(status ?? "unknown").toLowerCase();
    if (normalized === "completed" || normalized === "passed" || normalized === "success") return "passed";
    if (normalized === "failed" || normalized === "error") return "failed";
    if (normalized === "running") return "running";
    return normalized;
  };

  const formatDuration = (value) => {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
    const duration = Number(value);
    if (duration < 1000) return `${Math.round(duration)} ms`;
    return `${(duration / 1000).toFixed(duration >= 10000 ? 1 : 2)} s`;
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
  };

  const reportError = (body, status) => new Error(body?.error?.message || body?.message || `Request failed (${status})`);

  async function api(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) },
    });
    const text = await response.text();
    let body = {};
    if (text) {
      try { body = JSON.parse(text); } catch { body = { message: text }; }
    }
    if (!response.ok) throw reportError(body, response.status);
    return body;
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 3500);
  }

  function setConnection(online, detail = "localhost:3000") {
    const card = $("#connection-card");
    const label = $("#connection-label");
    const detailElement = $("#connection-detail");
    const pill = $(".api-pill");
    card?.classList.toggle("is-online", online);
    card?.classList.toggle("is-offline", !online);
    pill?.classList.toggle("is-online", online);
    pill?.classList.toggle("is-offline", !online);
    if (label) label.textContent = online ? "API connected" : "API unavailable";
    if (detailElement) detailElement.textContent = detail;
  }

  function showAlert(message) {
    if (state.alertDismissed) return;
    const alert = $("#api-alert");
    if (!alert) return;
    $("#api-alert-message").textContent = message;
    alert.hidden = false;
  }

  function statusBadge(status) {
    const normalized = statusName(status);
    return `<span class="status-badge status-${escapeHtml(normalized)}">${escapeHtml(normalized)}</span>`;
  }

  function normalizeEvent(raw, index, runId) {
    const source = isObject(raw) ? raw : { output: raw };
    const tool = isObject(source.tool) ? source.tool.name : source.tool;
    const type = String(source.type ?? source.kind ?? (tool ? "tool_call" : "step"));
    const output = source.response !== undefined ? source.response : source.output !== undefined ? source.output : source.result;
    const error = source.error ?? (type === "error" ? source.payload ?? output : null);
    return {
      id: String(source.id ?? source.eventId ?? `${runId}-event-${index + 1}`),
      seq: Number(source.sequence ?? source.seq ?? index + 1),
      kind: type.includes("tool") || tool ? "tool" : type === "error" ? "error" : type,
      name: String(source.name ?? source.toolName ?? tool ?? type.replaceAll("_", " ")),
      input: source.input ?? source.arguments ?? source.params ?? null,
      output: output ?? null,
      error: isObject(error) ? error : error ? { code: "execution_error", message: String(error), details: null } : null,
      durationMs: source.durationMs ?? source.duration ?? null,
      at: source.timestamp ?? source.startedAt ?? source.createdAt ?? null,
      raw: source,
    };
  }

  function normalizeRun(raw) {
    const source = isObject(raw?.run) ? raw.run : raw;
    const events = Array.isArray(source?.events) ? source.events.map((event, index) => normalizeEvent(event, index, source.id)) : [];
    const startedAt = source?.startedAt ?? source?.createdAt;
    const finishedAt = source?.completedAt ?? source?.finishedAt;
    const durationMs = source?.durationMs ?? (startedAt && finishedAt ? Date.parse(finishedAt) - Date.parse(startedAt) : null);
    return {
      ...source,
      id: String(source?.id ?? "unknown-run"),
      name: String(source?.name ?? "Untitled run"),
      status: statusName(source?.status),
      createdAt: source?.createdAt ?? startedAt ?? null,
      startedAt,
      finishedAt,
      durationMs,
      eventCount: Number(source?.eventCount ?? events.length),
      events,
      kind: source?.kind ?? "recorded",
    };
  }

  function renderMetrics(metrics) {
    const values = {
      runs: metrics.totalRuns ?? 0,
      passRate: metrics.passRate === null || metrics.passRate === undefined ? "—" : `${Number(metrics.passRate).toFixed(1)}%`,
      failed: metrics.failedRuns ?? 0,
      replays: metrics.replayRuns ?? 0,
      duration: formatDuration(metrics.averageDurationMs),
    };
    Object.entries(values).forEach(([key, value]) => { const element = $(`[data-metric="${key}"]`); if (element) element.textContent = value; });
    const notes = {
      runs: `${metrics.passedRuns ?? 0} passed`,
      passRate: metrics.passRate == null ? "No completed runs" : "Based on persisted runs",
      failed: metrics.failedRuns ? "Needs attention" : "No failures recorded",
      replays: metrics.replayRuns ? "Persisted replay runs" : "No replays recorded",
      duration: metrics.averageDurationMs == null ? "No duration data" : "Across completed runs",
    };
    Object.entries(notes).forEach(([key, value]) => { const element = $(`[data-metric-note="${key}"]`); if (element) element.textContent = value; });
  }

  function runRow(run, selected = false) {
    return `<button class="run-row ${selected ? "is-selected" : ""}" type="button" data-run-id="${escapeHtml(run.id)}">
      <span class="run-primary"><strong class="run-name">${escapeHtml(run.name)}</strong><span class="run-id">${escapeHtml(run.id)}</span></span>
      <span>${statusBadge(run.status)}</span><span class="run-meta">${run.eventCount} ${run.eventCount === 1 ? "step" : "steps"} · ${formatDate(run.createdAt)}</span><span class="run-arrow" aria-hidden="true">›</span>
    </button>`;
  }

  function renderRunLists() {
    const recent = $("[data-run-list='overview']");
    const all = $("[data-run-list='runs']");
    const query = $("#run-search")?.value.trim().toLowerCase() || "";
    const filtered = state.runs.filter((run) => !query || `${run.name} ${run.id} ${run.status}`.toLowerCase().includes(query));
    if (recent) recent.innerHTML = state.runs.length ? state.runs.slice(0, 8).map((run) => runRow(run, run.id === state.selectedRun?.id)).join("") : `<div class="empty-state"><strong>No persisted runs yet</strong>Import a trace to start inspecting executions.</div>`;
    if (all) all.innerHTML = filtered.length ? filtered.map((run) => runRow(run, run.id === state.selectedRun?.id)).join("") : `<div class="empty-state"><strong>No matching runs</strong>Try a different search or import a trace.</div>`;
    const count = $("#run-count-label");
    if (count) count.textContent = `${filtered.length} persisted ${filtered.length === 1 ? "run" : "runs"}`;
    $$(`[data-run-id]`).forEach((element) => element.addEventListener("click", () => selectRun(element.dataset.runId)));
  }

  function renderInspector() {
    const container = $("#run-inspector");
    if (!container) return;
    const run = state.selectedRun;
    if (!run) { container.innerHTML = `<div class="empty-state"><strong>Select a run</strong>Choose a persisted run to inspect its execution timeline.</div>`; return; }
    const timeline = run.events.length ? run.events.map((event) => `<article class="timeline-event ${event.error ? "is-error" : ""}"><span class="event-index">${event.seq}</span><div class="event-content"><div class="event-title"><span>${escapeHtml(event.name)}</span><span class="event-kind">${escapeHtml(event.kind)}</span></div>${event.error ? `<p class="event-error">${escapeHtml(event.error.message ?? JSON.stringify(event.error))}</p>` : `<pre class="event-code">${pretty({ input: event.input, output: event.output })}</pre>`}</div></article>`).join("") : `<div class="empty-state"><strong>No trace steps</strong>This run does not contain events yet.</div>`;
    container.innerHTML = `<div class="inspector-heading"><div><h2>${escapeHtml(run.name)}</h2><span class="inspector-id">${escapeHtml(run.id)}</span></div>${statusBadge(run.status)}</div><div class="detail-grid"><div class="detail-item"><span>Events</span><strong>${run.events.length}</strong></div><div class="detail-item"><span>Duration</span><strong>${formatDuration(run.durationMs)}</strong></div><div class="detail-item"><span>Started</span><strong>${formatDate(run.startedAt)}</strong></div><div class="detail-item"><span>Run kind</span><strong>${escapeHtml(run.kind)}</strong></div></div><div class="timeline">${timeline}</div>`;
  }

  function selectedTools() {
    return state.selectedRun?.events.filter((event) => event.kind === "tool") ?? [];
  }

  function renderReplayControls() {
    const container = $("#replay-controls");
    if (!container) return;
    const tools = selectedTools();
    if (!state.selectedRun) { container.innerHTML = `<div class="empty-state"><strong>Select a run first</strong>Open a run from the Runs view, then choose a tool event to branch.</div>`; return; }
    const selected = tools.find((tool) => tool.id === state.replayEventId) ?? tools[0];
    if (!selected) { container.innerHTML = `<div class="empty-state"><strong>No tool calls</strong>The selected trace has no recorded tool response to control.</div>`; return; }
    state.replayEventId = selected.id;
    container.innerHTML = `<p class="eyebrow">${escapeHtml(state.selectedRun.name)}</p><h2>Change a controlled response</h2><p class="panel-lead">Recorded tool results are replayed locally. No external tool or model is executed.</p><div class="form-field"><label for="replay-event">Tool step</label><select id="replay-event">${tools.map((tool) => `<option value="${escapeHtml(tool.id)}" ${tool.id === selected.id ? "selected" : ""}>Step ${tool.seq} · ${escapeHtml(tool.name)}</option>`).join("")}</select></div><div class="form-field"><label for="replay-output">Replacement output (JSON)</label><textarea id="replay-output" spellcheck="false">${escapeHtml(JSON.stringify(selected.output, null, 2))}</textarea></div><div class="form-actions"><span class="form-hint">The comparison highlights the first meaningful mismatch.</span><button class="button button-dark" type="button" data-action="run-replay">Run replay ↗</button></div><div class="replay-notice">Replay substitutes recorded tool responses only. It does not claim to reproduce arbitrary LLM reasoning.</div>`;
    $("#replay-event")?.addEventListener("change", (event) => { state.replayEventId = event.target.value; renderReplayControls(); });
  }

  function divergenceList(baseline, replayed) {
    const count = Math.max(baseline.events.length, replayed.events.length);
    const divergences = [];
    for (let index = 0; index < count; index += 1) {
      const before = baseline.events[index];
      const after = replayed.events[index];
      if (!before || !after) {
        divergences.push({ seq: index + 1, category: before ? "event-removed" : "event-added", path: "events", before: before ?? null, after: after ?? null, message: "The replay has a different number of trace events." });
        continue;
      }
      for (const field of ["name", "kind", "input", "output", "error"]) {
        if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
          divergences.push({ seq: before.seq, category: "value-changed", path: `events[${index}].${field}`, before: before[field], after: after[field], message: `The ${field} changed at the first divergent tool step.` });
          break;
        }
      }
    }
    return divergences;
  }

  function renderDivergences() {
    const container = $("#divergence-panel");
    if (!container) return;
    if (!state.replay) { container.innerHTML = `<div class="empty-state"><strong>Comparison appears here</strong>Run a branch to see original and replayed evidence side by side.</div>`; return; }
    const divergences = state.replay.divergences;
    container.innerHTML = `<p class="eyebrow">recorded response replay</p><h2>${divergences.length ? `${divergences.length} divergence${divergences.length === 1 ? "" : "s"} found` : "Replay matches recorded trace"}</h2><p class="panel-lead">${divergences.length ? `First mismatch at step ${divergences[0].seq}.` : "The controlled replay matches the recorded trace."}</p><div class="divergence-list">${divergences.length ? divergences.map((item) => `<article class="divergence-card"><strong>Step ${item.seq} · ${escapeHtml(item.category.replaceAll("-", " "))}</strong><p>${escapeHtml(item.message)}</p><span class="divergence-path">${escapeHtml(item.path)}</span><div class="diff-values"><pre>${pretty(item.before)}</pre><pre>${pretty(item.after)}</pre></div></article>`).join("") : `<div class="empty-state"><strong>Deterministic replay confirmed</strong>No meaningful divergence was found.</div>`}</div>`;
  }

  async function runReplay() {
    if (!state.selectedRun) return;
    const tool = selectedTools().find((event) => event.id === state.replayEventId) ?? selectedTools()[0];
    if (!tool) return;
    let response;
    try { response = JSON.parse($("#replay-output")?.value ?? "null"); } catch { showToast("Replacement output must be valid JSON"); return; }
    try {
      const result = await api(`${API_PATH}/replays`, { method: "POST", body: JSON.stringify({ runId: state.selectedRun.id, targetEventId: tool.id, override: { output: response } }) });
      const original = normalizeRun(result.original);
      const replayed = normalizeRun(result.replayed);
      state.replay = { replay: result.replay, original, replayed, divergences: result.divergences ?? divergenceList(original, replayed) };
      renderDivergences();
      showToast("Replay completed without executing external tools.");
    } catch (error) { showToast(error.message); }
  }

  function renderFailures() {
    const list = $("#failure-list");
    const detail = $("#failure-detail");
    if (!list || !detail) return;
    const failures = state.runs.filter((run) => run.status === "failed");
    if (!failures.length) { list.innerHTML = `<div class="empty-state"><strong>No failure reports</strong>Failed runs will produce evidence-backed reports here.</div>`; detail.innerHTML = `<div class="empty-state"><strong>Nothing selected</strong></div>`; return; }
    list.innerHTML = `<h2>Reports</h2>${failures.map((run) => { const report = state.reports.find((item) => item.runId === run.id); return `<button class="failure-row ${run.id === failures[0].id ? "is-selected" : ""}" type="button" data-report-id="${escapeHtml(run.id)}"><strong>${escapeHtml(report?.title ?? "Run failed")}</strong><span>${escapeHtml(report?.summary ?? "Failure evidence is attached to this run.")}</span><span>${formatDate(run.createdAt)}</span></button>`; }).join("")}`;
    const show = (runId) => {
      const run = failures.find((item) => item.id === runId) ?? failures[0];
      const report = state.reports.find((item) => item.runId === run.id);
      detail.innerHTML = `<p class="eyebrow">Evidence-backed report</p><h2>${escapeHtml(report?.title ?? "Run failed")}</h2><p class="report-summary">${escapeHtml(report?.summary ?? "The run completed with a failure status.")}</p><div class="evidence-block"><h3>Evidence</h3><pre>${pretty(report?.evidence ?? run.metadata)}</pre></div><div class="evidence-block"><h3>Reproduction</h3><pre>${pretty(report?.reproduction ?? { runId: run.id, events: run.events.length, recordedResponses: run.events.filter((event) => event.kind === "tool").length })}</pre></div>`;
      $$(`[data-report-id]`).forEach((item) => item.classList.toggle("is-selected", item.dataset.reportId === run.id));
    };
    show(failures[0].id);
    $$(`[data-report-id]`).forEach((item) => item.addEventListener("click", () => show(item.dataset.reportId)));
  }

  async function selectRun(id) {
    try {
      state.selectedRun = normalizeRun(await api(`/api/runs/${encodeURIComponent(id)}`));
      state.runs = state.runs.map((run) => run.id === id ? state.selectedRun : run);
      state.replay = null;
      state.replayEventId = null;
      renderRunLists(); renderInspector(); renderReplayControls();
      if (location.hash !== "#runs") location.hash = "#runs";
    } catch (error) { showToast(error.message); }
  }

  function eventInput(raw, index) {
    const source = isObject(raw) ? raw : { output: raw };
    const tool = isObject(source.tool) ? source.tool.name : source.tool;
    const output = source.response !== undefined ? source.response : source.output !== undefined ? source.output : source.result;
    const type = source.type ?? source.kind ?? (tool ? "tool_call" : "step");
    return { type, sequence: index + 1, ...(source.timestamp ? { timestamp: source.timestamp } : {}), ...(tool ? { tool } : {}), ...(source.input !== undefined ? { input: source.input } : {}), ...(tool ? { response: output ?? null } : { payload: source.payload ?? { input: source.input ?? null, output: output ?? null } }) };
  }

  async function importFile(file) {
    const status = $("#import-status");
    try {
      const parsed = JSON.parse(await file.text());
      const candidate = Array.isArray(parsed?.runs) ? parsed.runs[0] : Array.isArray(parsed?.traces) ? parsed.traces[0] : parsed;
      const events = Array.isArray(candidate) ? candidate : candidate.events ?? candidate.steps ?? candidate.spans ?? [];
      const tracePayload = Array.isArray(candidate) ? events : { ...candidate, name: candidate.name ?? file.name.replace(/\.json$/i, ""), events: events.map(eventInput) };
      const created = await api("/api/runs/import", { method: "POST", body: JSON.stringify(tracePayload) });
      if (status) { status.textContent = `Imported ${created.name ?? file.name} with ${events.length} events.`; status.classList.remove("is-error"); }
      await refresh();
      await selectRun(created.id);
      showToast("Trace saved to the local SQLite workspace.");
    } catch (error) {
      if (status) { status.textContent = error.message; status.classList.add("is-error"); }
    }
  }

  async function refresh() {
    try {
      const [health, overview, runs] = await Promise.all([api("/api/healthz"), api("/api/overview"), api("/api/runs")]);
      state.runs = (runs.runs ?? []).map(normalizeRun).reverse();
      if (state.selectedRun) {
        const fresh = state.runs.find((run) => run.id === state.selectedRun.id);
        if (fresh) state.selectedRun = fresh;
      }
      renderMetrics(overview.metrics ?? {});
      renderRunLists(); renderInspector(); renderReplayControls(); renderDivergences(); renderFailures();
      setConnection(true, health.sqlite === "ok" ? "SQLite connected" : "API connected");
      $("#api-alert").hidden = true;
      const failedRuns = state.runs.filter((run) => run.status === "failed");
      state.reports = (await Promise.all(failedRuns.map(async (run) => { try { return await api(`/api/runs/${encodeURIComponent(run.id)}/report`); } catch { return null; } }))).filter(Boolean);
      renderFailures();
    } catch (error) {
      setConnection(false);
      showAlert(error.message || "Could not reach the AgentTrace API.");
      renderRunLists(); renderInspector(); renderReplayControls(); renderDivergences(); renderFailures();
    }
  }

  function navigate() {
    const requested = location.hash.slice(1) || "overview";
    const route = ROUTES.has(requested) ? requested : "overview";
    $$(`[data-view]`).forEach((view) => { view.hidden = view.dataset.view !== route; });
    $$(`[data-route]`).forEach((link) => { const active = link.dataset.route === route; link.classList.toggle("is-active", active); link.toggleAttribute("aria-current", active); });
    const title = $("#page-title");
    if (title) title.textContent = route === "import" ? "Import trace" : route === "replay" ? "Replay workspace" : route === "failures" ? "Failure reports" : route[0].toUpperCase() + route.slice(1);
    document.body.classList.remove("sidebar-open");
    if (route === "replay") { renderReplayControls(); renderDivergences(); }
    if (route === "failures") renderFailures();
  }

  $$('[data-action="open-sidebar"]').forEach((button) => button.addEventListener("click", () => document.body.classList.add("sidebar-open")));
  $$('[data-action="close-sidebar"]').forEach((button) => button.addEventListener("click", () => document.body.classList.remove("sidebar-open")));
  $("[data-action='refresh']")?.addEventListener("click", refresh);
  $("[data-action='dismiss-alert']")?.addEventListener("click", () => { state.alertDismissed = true; $("#api-alert").hidden = true; });
  $("#run-search")?.addEventListener("input", renderRunLists);
  $("#trace-file")?.addEventListener("change", (event) => importFile(event.target.files?.[0]));
  $(".import-panel")?.addEventListener("dragover", (event) => event.preventDefault());
  $(".import-panel")?.addEventListener("drop", (event) => { event.preventDefault(); importFile(event.dataTransfer.files?.[0]); });
  document.addEventListener("click", (event) => { const action = event.target.closest("[data-action]")?.dataset.action; if (action === "run-replay") runReplay(); });
  window.addEventListener("hashchange", navigate);

  navigate();
  setConnection(false);
  refresh();
})();
