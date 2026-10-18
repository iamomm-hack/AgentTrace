import type { OverviewMetrics, RunSummary, Route } from "../types/frontend";
import { formatDuration } from "../utils/formatters";
import { EmptyState } from "../components/common/EmptyState";
import { MetricCard } from "../components/trace/MetricCard";
import { RunRow } from "../components/trace/RunRow";

interface OverviewPageProps {
  metrics: OverviewMetrics;
  runs: RunSummary[];
  selectedId?: string;
  onSelectRun: (id: string) => void;
  onNavigate: (route: Route) => void;
}

export function OverviewPage({ metrics, runs, selectedId, onSelectRun, onNavigate }: OverviewPageProps) {
  const hasMetrics = Object.keys(metrics).length > 0;
  const values = {
    runs: hasMetrics ? metrics.totalRuns ?? 0 : "—",
    passRate: !hasMetrics || metrics.passRate == null ? "—" : `${Number(metrics.passRate).toFixed(1)}%`,
    failed: hasMetrics ? metrics.failedRuns ?? 0 : "—",
    replays: hasMetrics ? metrics.replayRuns ?? 0 : "—",
    duration: hasMetrics ? formatDuration(metrics.averageDurationMs) : "—",
  };
  const notes = {
    runs: hasMetrics ? `${metrics.passedRuns ?? 0} passed` : "Awaiting API data",
    passRate: !hasMetrics || metrics.passRate == null ? "No completed runs" : "Based on persisted runs",
    failed: !hasMetrics ? "Awaiting API data" : metrics.failedRuns ? "Needs attention" : "No failures recorded",
    replays: !hasMetrics ? "Awaiting API data" : metrics.replayRuns ? "Persisted replay runs" : "No replays recorded",
    duration: !hasMetrics || metrics.averageDurationMs == null ? "No duration data" : "Across completed runs",
  };
  return (
    <section className="view" data-view="overview" aria-labelledby="overview-heading">
      <div className="page-heading"><div><p className="eyebrow">Trace observability</p><h1 id="overview-heading">Overview</h1><p className="page-description">See what your agents did, where they diverged, and why a run failed.</p></div><a className="button button-dark" href="#import" onClick={() => onNavigate("import")}><span aria-hidden="true">↑</span> Import trace</a></div>
      <div className="metric-grid" id="metric-grid" aria-label="Overview metrics">
        <MetricCard metricKey="runs" label="Runs" value={values.runs} note={notes.runs} />
        <MetricCard metricKey="passRate" label="Pass rate" value={values.passRate} note={notes.passRate} />
        <MetricCard metricKey="failed" label="Failed runs" value={values.failed} note={notes.failed} />
        <MetricCard metricKey="replays" label="Replay outcomes" value={values.replays} note={notes.replays} />
        <MetricCard metricKey="duration" label="Avg. duration" value={values.duration} note={notes.duration} />
      </div>
      <div className="section-heading"><div><h2>Recent runs</h2><p>Latest traces returned by the API.</p></div><a className="text-link" href="#runs" onClick={() => onNavigate("runs")}>View all runs <span aria-hidden="true">→</span></a></div>
      <div className="panel run-panel"><div className="run-list" data-run-list="overview">{runs.length ? runs.slice(0, 8).map((run) => <RunRow run={run} selected={run.id === selectedId} onSelect={onSelectRun} key={run.id} />) : <EmptyState title="No persisted runs yet">Import a trace to start inspecting executions.</EmptyState>}</div></div>
    </section>
  );
}
