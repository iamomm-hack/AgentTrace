import type { Route } from "../../types/frontend";
import { Icon } from "../common/Icon";

const titles: Record<Route, string> = { overview: "Overview", runs: "Runs", replay: "Replay", failures: "Failure reports", import: "Import trace" };

export function Topbar({ route, onOpenSidebar, onRefresh, online }: { route: Route; onOpenSidebar: () => void; onRefresh: () => void; online: boolean }) {
  return <header className="topbar">
    <button className="mobile-menu-button" type="button" onClick={onOpenSidebar} aria-label="Open navigation" aria-controls="sidebar"><Icon name="menu" /></button>
    <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-separator">/</span><strong id="page-title">{titles[route]}</strong></div>
    <div className="topbar-actions"><span className={`api-pill ${online ? "is-online" : "is-offline"}`}><span className="status-dot" />{online ? "Connected" : "Offline"}</span><button className="icon-button" type="button" data-action="refresh" onClick={onRefresh} aria-label="Refresh data" title="Refresh data"><Icon name="refresh" width={16} height={16} /></button></div>
  </header>;
}
