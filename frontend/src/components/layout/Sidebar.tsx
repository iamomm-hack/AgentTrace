import type { Route } from "../../types/frontend";
import logoUrl from "../../../assets/logo.webp";

interface SidebarProps {
  route: Route;
  open: boolean;
  onNavigate: (route: Route) => void;
  onClose: () => void;
  online: boolean;
  connectionDetail: string;
}

const navItems: Array<{ route: Route; icon: string; label: string }> = [
  { route: "overview", icon: "⌂", label: "Overview" },
  { route: "runs", icon: "≡", label: "Runs" },
  { route: "replay", icon: "↻", label: "Replay" },
  { route: "failures", icon: "!", label: "Failure reports" },
];

export function Sidebar({ route, open, onNavigate, onClose, online, connectionDetail }: SidebarProps) {
  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-top">
        <a className="brand" href="#overview" aria-label="AgentTrace overview" onClick={() => onNavigate("overview")}>
          <span className="brand-mark"><img src={logoUrl} alt="" width="36" height="36" /></span>
          <span className="brand-name">AgentTrace</span>
        </a>
        <button className="sidebar-close" type="button" data-action="close-sidebar" onClick={onClose} aria-label="Close navigation">×</button>
      </div>

      <nav className="primary-nav" aria-label="Primary navigation">
        <p className="nav-label">Workspace</p>
        {navItems.map((item) => (
          <a
            className={`nav-item${route === item.route ? " is-active" : ""}`}
            href={`#${item.route}`}
            data-route={item.route}
            aria-current={route === item.route ? "page" : undefined}
            key={item.route}
            onClick={() => onNavigate(item.route)}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
          </a>
        ))}
        <p className="nav-label nav-label-spaced">Tools</p>
        <a
          className={`nav-item${route === "import" ? " is-active" : ""}`}
          href="#import"
          data-route="import"
          aria-current={route === "import" ? "page" : undefined}
          onClick={() => onNavigate("import")}
        >
          <span className="nav-icon" aria-hidden="true">↑</span><span>Import trace</span>
        </a>
      </nav>

      <div className="sidebar-footer">
        <div className={`connection-card ${online ? "is-online" : "is-offline"}`} id="connection-card">
          <span className="connection-dot" aria-hidden="true"></span>
          <div><strong id="connection-label">{online ? "API connected" : "API unavailable"}</strong><span id="connection-detail">{connectionDetail}</span></div>
        </div>
        <span className="version-label">AgentTrace interface</span>
      </div>
    </aside>
  );
}
