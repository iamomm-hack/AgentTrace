import type { Route } from "../../types/frontend";

const titles: Record<Route, string> = {
  overview: "Overview",
  runs: "Runs",
  replay: "Replay workspace",
  failures: "Failure reports",
  import: "Import trace",
};

export function Topbar({ route, onOpenSidebar, onRefresh, online }: { route: Route; onOpenSidebar: () => void; onRefresh: () => void; online: boolean }) {
  return (
    <header className="topbar">
      <button className="mobile-menu-button" type="button" data-action="open-sidebar" onClick={onOpenSidebar} aria-label="Open navigation" aria-controls="sidebar"><span></span><span></span><span></span></button>
      <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-separator">/</span><strong id="page-title">{titles[route]}</strong></div>
      <div className="topbar-actions"><span className={`api-pill ${online ? "is-online" : "is-offline"}`}><span className="status-dot" aria-hidden="true"></span> API <code>localhost:3000</code></span><button className="icon-button" type="button" data-action="refresh" onClick={onRefresh} aria-label="Refresh data" title="Refresh data">↻</button></div>
    </header>
  );
}
