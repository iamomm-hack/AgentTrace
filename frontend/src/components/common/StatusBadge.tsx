import type { RunStatus } from "../../types/frontend";

export function StatusBadge({ status }: { status: RunStatus | string }) {
  return <span className={`status-badge status-${status}`}>{status}</span>;
}
