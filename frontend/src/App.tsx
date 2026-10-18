import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { api } from "./services/api";
import { FailuresPage } from "./pages/FailuresPage";
import { ImportPage } from "./pages/ImportPage";
import { OverviewPage } from "./pages/OverviewPage";
import { ReplayPage } from "./pages/ReplayPage";
import { RunsPage } from "./pages/RunsPage";
import type { Divergence, FailureReport, OverviewMetrics, OverviewResponse, ReplayResponse, Route, RunDetail, RunSummary } from "./types/frontend";
import { useHashRoute } from "./hooks/useHashRoute";
import { eventInput, normalizeRun } from "./utils/trace-normalizer";
import { LandingPage } from "./pages/LandingPage";

interface HealthResponse {
  sqlite?: string;
}

interface RunsResponse {
  runs?: unknown[];
}

function divergenceList(baseline: RunDetail, replayed: RunDetail): Divergence[] {
  const count = Math.max(baseline.events.length, replayed.events.length);
  const divergences: Divergence[] = [];
  for (let index = 0; index < count; index += 1) {
    const before = baseline.events[index];
    const after = replayed.events[index];
    if (!before || !after) {
      divergences.push({ seq: index + 1, category: before ? "event-removed" : "event-added", path: "events", before: before ?? null, after: after ?? null, message: "The replay has a different number of trace events." });
      continue;
    }
    for (const field of ["name", "kind", "input", "output", "error"] as const) {
      if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
        divergences.push({ seq: before.seq, eventId: before.id, category: "value-changed", path: `events[${index}].${field}`, before: before[field], after: after[field], message: `The ${field} changed at the first divergent tool step.` });
        break;
      }
    }
  }
  return divergences;
}

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return !hash || hash === "#home" ? <LandingPage /> : <Workspace />;
}

function Workspace() {
  const { route, navigate } = useHashRoute();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);
  const [metrics, setMetrics] = useState<OverviewMetrics>({});
  const [reports, setReports] = useState<FailureReport[]>([]);
  const [replay, setReplay] = useState<{ response: ReplayResponse; original: RunDetail; replayed: RunDetail; divergences: Divergence[] } | null>(null);
  const [replayEventId, setReplayEventId] = useState<string | null>(null);
  const [replayOutput, setReplayOutput] = useState("null");
  const [replayPending, setReplayPending] = useState(false);
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [online, setOnline] = useState(false);
  const [connectionDetail, setConnectionDetail] = useState("localhost:3000");
  const [alert, setAlert] = useState<string | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState("");
  const [importError, setImportError] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    document.body.classList.toggle("sidebar-open", sidebarOpen);
    return () => document.body.classList.remove("sidebar-open");
  }, [sidebarOpen]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [route]);

  const refresh = useCallback(async () => {
    try {
      const [health, overview, runResponse] = await Promise.all([
        api<HealthResponse>("/api/healthz"),
        api<OverviewResponse>("/api/overview"),
        api<RunsResponse>("/api/runs"),
      ]);
      const nextRuns = (runResponse.runs ?? []).map(normalizeRun).reverse();
      setRuns(nextRuns);
      setMetrics(overview.metrics ?? {});
      setOnline(true);
      setConnectionDetail(health.sqlite === "ok" ? "SQLite connected" : "API connected");
      setAlert(null);

      setSelectedRun((current) => {
        if (!current) return current;
        const summary = nextRuns.find((run) => run.id === current.id);
        return summary ? { ...current, ...summary, events: current.events } : current;
      });

      const failedRuns = nextRuns.filter((run) => run.status === "failed");
      const nextReports = (await Promise.all(failedRuns.map(async (run) => {
        try {
          return await api<FailureReport>(`/api/runs/${encodeURIComponent(run.id)}/report`);
        } catch {
          return null;
        }
      }))).filter((report): report is FailureReport => Boolean(report));
      setReports(nextReports);
    } catch (error) {
      setOnline(false);
      setConnectionDetail("localhost:3000");
      if (!alertDismissed) setAlert(error instanceof Error ? error.message : "Could not reach the AgentTrace API.");
    }
  }, [alertDismissed]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectRun = useCallback(async (id: string) => {
    try {
      const run = normalizeRun(await api<unknown>(`/api/runs/${encodeURIComponent(id)}`));
      setSelectedRun(run);
      setRuns((current) => current.map((item) => item.id === id ? run : item));
      setReplay(null);
      setReplayEventId(null);
      navigate("runs");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to load the selected run.");
    }
  }, [navigate, showToast]);

  const tools = useMemo(() => selectedRun?.events.filter((event) => event.kind === "tool") ?? [], [selectedRun]);
  const selectedToolId = tools.some((tool) => tool.id === replayEventId) ? replayEventId : tools[0]?.id ?? null;
  const selectedTool = tools.find((tool) => tool.id === selectedToolId);
  const changeReplayEvent = useCallback((id: string) => { setReplayEventId(id); setReplay(null); }, []);
  const changeReplayOutput = useCallback((value: string) => { setReplayOutput(value); setReplay(null); }, []);

  useEffect(() => {
    if (!selectedTool) {
      setReplayEventId(null);
      setReplayOutput("null");
      return;
    }
    setReplayEventId(selectedTool.id);
    setReplayOutput(JSON.stringify(selectedTool.output, null, 2));
  }, [selectedRun?.id, selectedToolId]);

  const runReplay = useCallback(async () => {
    if (!selectedRun || !selectedTool) return;
    let output: unknown;
    try {
      output = JSON.parse(replayOutput);
    } catch {
      showToast("Replacement output must be valid JSON");
      return;
    }
    try {
      setReplayPending(true);
      const result = await api<ReplayResponse>("/api/v1/replays", {
        method: "POST",
        body: JSON.stringify({ runId: selectedRun.id, targetEventId: selectedTool.id, override: { output } }),
      });
      const original = normalizeRun(result.original);
      const replayed = normalizeRun(result.replayed);
      setReplay({ response: result, original, replayed, divergences: result.divergences ?? divergenceList(original, replayed) });
      showToast("Replay completed without executing external tools.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Replay failed.");
    } finally {
      setReplayPending(false);
    }
  }, [replayOutput, selectedRun, selectedTool, showToast]);

  const importFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setImportStatus("");
    setImportError(false);
    try {
      const parsed: any = JSON.parse(await file.text());
      const candidate = Array.isArray(parsed?.runs) ? parsed.runs[0] : Array.isArray(parsed?.traces) ? parsed.traces[0] : parsed;
      const events = Array.isArray(candidate) ? candidate : candidate?.events ?? candidate?.steps ?? candidate?.spans ?? [];
      const tracePayload = Array.isArray(candidate)
        ? events.map(eventInput)
        : { ...candidate, name: candidate?.name ?? file.name.replace(/\.json$/i, ""), events: events.map(eventInput) };
      const created = await api<{ id: string; name?: string }>("/api/runs/import", { method: "POST", body: JSON.stringify(tracePayload) });
      setImportStatus(`Imported ${created.name ?? file.name} with ${events.length} events.`);
      await refresh();
      await selectRun(created.id);
      showToast("Trace saved to the local SQLite workspace.");
    } catch (error) {
      setImportError(true);
      setImportStatus(error instanceof Error ? error.message : "Could not import the trace.");
    }
  }, [refresh, selectRun, showToast]);

  const page = route === "overview"
    ? <OverviewPage metrics={metrics} runs={runs} selectedId={selectedRun?.id} onSelectRun={selectRun} onNavigate={navigate} />
    : route === "runs"
      ? <RunsPage runs={runs} selectedRun={selectedRun} query={query} onQueryChange={setQuery} onSelectRun={selectRun} />
      : route === "replay"
        ? <ReplayPage run={selectedRun} tools={tools} replayEventId={selectedToolId} output={replayOutput} divergences={replay?.divergences ?? null} original={replay?.original ?? null} replayed={replay?.replayed ?? null} pending={replayPending} onEventChange={changeReplayEvent} onOutputChange={changeReplayOutput} onReplay={runReplay} />
        : route === "failures"
          ? <FailuresPage runs={runs} reports={reports} />
          : route === "import"
            ? <ImportPage status={importStatus} isError={importError} onImport={importFile} />
            : <OverviewPage metrics={metrics} runs={runs} selectedId={selectedRun?.id} onSelectRun={selectRun} onNavigate={navigate} />;

  return <AppShell route={route} sidebarOpen={sidebarOpen} onNavigate={navigate} onOpenSidebar={() => setSidebarOpen(true)} onCloseSidebar={() => setSidebarOpen(false)} onRefresh={() => void refresh()} online={online} connectionDetail={connectionDetail} alert={alert} onDismissAlert={() => { setAlertDismissed(true); setAlert(null); }} toast={toast}>{page}</AppShell>;
}
