import type { ReactNode } from "react";
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
  return (
    <div className="app-shell">
      <Sidebar route={props.route} open={props.sidebarOpen} onNavigate={props.onNavigate} onClose={props.onCloseSidebar} online={props.online} connectionDetail={props.connectionDetail} />
      <div className="app-content">
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
