import type { RunDetail } from "../../types/frontend";
import { formatDate, formatDuration } from "../../utils/formatters";
import { EmptyState } from "../common/EmptyState";
import { StatusBadge } from "../common/StatusBadge";
import { Timeline } from "./Timeline";

export function RunInspector({ run }: { run: RunDetail | null }) {
  if (!run) return <EmptyState title="Select a run">Select an execution from the list to explore its timeline, tool calls, and outputs.</EmptyState>;
  return (
    <>
      <div className="inspector-heading"><div><h2>{run.name}</h2><span className="inspector-id">{run.id}</span></div><StatusBadge status={run.status} /></div>
      <div className="detail-grid">
        <div className="detail-item"><span>Events</span><strong>{run.events.length}</strong></div>
        <div className="detail-item"><span>Duration</span><strong>{formatDuration(run.durationMs)}</strong></div>
        <div className="detail-item"><span>Started</span><strong>{formatDate(run.startedAt)}</strong></div>
        <div className="detail-item"><span>Run kind</span><strong>{run.kind}</strong></div>
      </div>
      <Timeline events={run.events} />
    </>
  );
}
