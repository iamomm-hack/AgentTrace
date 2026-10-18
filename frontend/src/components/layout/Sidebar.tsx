import type { Route } from "../../types/frontend";
import logoUrl from "../../../assets/logo.webp";
import { Icon, type IconName } from "../common/Icon";

interface SidebarProps {
  route: Route;
  open: boolean;
  onNavigate: (route: Route) => void;
  onClose: () => void;
  online: boolean;
  connectionDetail: string;
}
const navItems: Array<{ route: Route; icon: IconName; label: string }> = [
  { route: "overview", icon: "overview", label: "Overview" },
  { route: "runs", icon: "runs", label: "Runs" },
  { route: "replay", icon: "replay", label: "Replay" },
  { route: "failures", icon: "failures", label: "Failure reports" },
];

export function Sidebar({ route, open, onNavigate, onClose, online, connectionDetail }: SidebarProps) {
  return <aside className="sidebar" id="sidebar" role={open ? "dialog" : undefined} aria-modal={open || undefined} aria-label={open ? "Workspace navigation" : undefined}>
    <div className="sidebar-top">
      <a className="brand" href="#overview" aria-label="AgentTrace overview" onClick={() => onNavigate("overview")}><span className="brand-mark"><img src={logoUrl} alt="" /></span><span className="brand-name">AgentTrace<span className="brand-caption">TRACE WORKSPACE</span></span></a>
      <button className="sidebar-close" onClick={onClose} aria-label="Close navigation"><Icon name="close" /></button>
    </div>
    <div className="workspace-label"><span className="workspace-initial">L</span><div>Local workspace<span>Personal environment</span></div></div>
    <nav className="primary-nav" aria-label="Primary navigation"><p className="nav-label">Workspace</p>
      {navItems.map((item) => <a className={`nav-item${route === item.route ? " is-active" : ""}`} href={`#${item.route}`} data-route={item.route} aria-current={route === item.route ? "page" : undefined} key={item.route} onClick={() => onNavigate(item.route)}><Icon name={item.icon} /><span>{item.label}</span></a>)}
      <p className="nav-label nav-label-spaced">Data</p><a className={`nav-item${route === "import" ? " is-active" : ""}`} href="#import" data-route="import" aria-current={route === "import" ? "page" : undefined} onClick={() => onNavigate("import")}><Icon name="upload" /><span>Import trace</span></a>
    </nav>
    <div className="sidebar-footer"><a className="sidebar-home" href="#home">Back to home<Icon name="arrow" width={14} height={14} /></a><div className={`connection-card ${online ? "is-online" : "is-offline"}`} id="connection-card"><span className="connection-dot" /><div><strong id="connection-label">{online ? "API connected" : "API unavailable"}</strong><span id="connection-detail">{connectionDetail}</span></div></div></div>
  </aside>;
}
