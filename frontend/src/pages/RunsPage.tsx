import type { RunDetail, RunSummary } from "../types/frontend";
import { EmptyState } from "../components/common/EmptyState";
import { RunInspector } from "../components/trace/RunInspector";
import { RunRow } from "../components/trace/RunRow";

interface RunsPageProps {
  runs: RunSummary[];
  selectedRun: RunDetail | null;
  query: string;
  onQueryChange: (query: string) => void;
  onSelectRun: (id: string) => void;
}

export function RunsPage({ runs, selectedRun, query, onQueryChange, onSelectRun }: RunsPageProps) {
  const filtered = runs.filter((run) => !query || `${run.name} ${run.id} ${run.status}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="view" data-view="runs" aria-labelledby="runs-heading">
      <div className="page-heading"><div><p className="eyebrow">Workspace</p><h1 id="runs-heading">Runs</h1><p className="page-description">Select a run to inspect every agent and tool step.</p></div><a className="button button-dark" href="#import"><span aria-hidden="true">↑</span> Import trace</a></div>
      <div className="runs-layout">
        <div className="panel all-runs-panel"><div className="panel-toolbar"><div><h2>All runs</h2><p id="run-count-label">{filtered.length} persisted {filtered.length === 1 ? "run" : "runs"}</p></div><label className="search-field"><span aria-hidden="true">⌕</span><input id="run-search" type="search" placeholder="Search runs" autoComplete="off" value={query} onChange={(event) => onQueryChange(event.target.value)} /></label></div><div className="run-list" data-run-list="runs">{filtered.length ? filtered.map((run) => <RunRow run={run} selected={run.id === selectedRun?.id} onSelect={onSelectRun} key={run.id} />) : <EmptyState title="No matching runs">Try a different search or import a trace.</EmptyState>}</div></div>
        <div className="panel run-inspector" id="run-inspector"><RunInspector run={selectedRun} /></div>
      </div>
    </section>
  );
}
