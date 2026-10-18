import { useEffect, type ReactNode } from "react";
import type { Route } from "../../types/frontend";
import { ApiAlert } from "../common/ApiAlert";
import { Toast } from "../common/Toast";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface AppShellProps {
  route: Route;
  children: ReactNode;
  sidebarOpen: boolean;
  onNavigate: (route: Route) => void;
  onOpenSidebar: () => void;
  onCloseSidebar: () => void;
  onRefresh: () => void;
  online: boolean;
  connectionDetail: string;
  alert: string | null;
  onDismissAlert: () => void;
  toast: string | null;
}

export function AppShell(props: AppShellProps) {
  useEffect(() => {
    if (!props.sidebarOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const sidebar = document.getElementById("sidebar");
    sidebar?.querySelector<HTMLElement>("a")?.focus();
    const desktop = matchMedia("(min-width: 651px)");
    const resize = () => { if (desktop.matches) props.onCloseSidebar(); };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onCloseSidebar();
      if (event.key !== "Tab") return;
      const items = Array.from(sidebar?.querySelectorAll<HTMLElement>("a, button") ?? []).filter((item) => item.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    desktop.addEventListener("change", resize);
    document.addEventListener("keydown", keydown);
    return () => {
      desktop.removeEventListener("change", resize);
      document.removeEventListener("keydown", keydown);
      if (previous?.isConnected) previous.focus();
    };
  }, [props.sidebarOpen, props.onCloseSidebar]);
  return (
    <div className="app-shell">
      {props.sidebarOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={props.onCloseSidebar} tabIndex={-1} />}
      <Sidebar route={props.route} open={props.sidebarOpen} onNavigate={props.onNavigate} onClose={props.onCloseSidebar} online={props.online} connectionDetail={props.connectionDetail} />
      <div className="app-content" inert={props.sidebarOpen}>
        <Topbar route={props.route} onOpenSidebar={props.onOpenSidebar} onRefresh={props.onRefresh} online={props.online} />
        <div className="content-wrap">
          <ApiAlert message={props.alert} onDismiss={props.onDismissAlert} />
          <main>{props.children}</main>
        </div>
      </div>
      <Toast message={props.toast} />
    </div>
  );
}
