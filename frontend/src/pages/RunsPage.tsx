import type { RunDetail, RunSummary } from "../types/frontend";
import { EmptyState } from "../components/common/EmptyState";
import { Icon } from "../components/common/Icon";
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
  return <section className="view" data-view="runs" aria-labelledby="runs-heading">
    <div className="page-heading"><div><p className="eyebrow">Workspace / Traces</p><h1 id="runs-heading">Runs</h1><p className="page-description">Every execution, with its inputs, outputs, and tool calls.</p></div><a className="button button-dark" href="#import"><Icon name="upload" width={15} height={15} />Import trace</a></div>
    <div className="runs-layout">
      <div className="panel all-runs-panel">
        <div className="panel-toolbar"><div className="panel-heading-label"><Icon name="runs" /><h2>All runs</h2><span className="panel-count" id="run-count-label">{filtered.length}</span></div><label className="search-field"><Icon name="search" width={14} height={14} /><input id="run-search" aria-label="Search runs" type="search" placeholder="Search runs..." autoComplete="off" value={query} onChange={(event) => onQueryChange(event.target.value)} /></label></div>
        <div className="run-list" data-run-list="runs">{filtered.length ? filtered.map((run) => <RunRow run={run} selected={run.id === selectedRun?.id} onSelect={onSelectRun} key={run.id} />) : query ? <EmptyState icon="search" title="No matching runs">Try another name, run ID, or status.</EmptyState> : <EmptyState title="Your traces will appear here" action={{ label: "Import your first trace", href: "#import" }}>Add a trace to explore the steps behind an agent execution.</EmptyState>}</div>
      </div>
      <div className="panel run-inspector" id="run-inspector">{!selectedRun && <div className="panel-caption"><Icon name="trace" width={15} height={15} />Run inspector</div>}<RunInspector run={selectedRun} /></div>
    </div>
  </section>;
}
