import type { RunSummary } from "../../types/frontend";
import { formatDate } from "../../utils/formatters";
import { StatusBadge } from "../common/StatusBadge";

export function RunRow({ run, selected, onSelect }: { run: RunSummary; selected: boolean; onSelect: (id: string) => void }) {
  return (
    <button className={`run-row${selected ? " is-selected" : ""}`} type="button" data-run-id={run.id} onClick={() => onSelect(run.id)}>
      <span className="run-primary"><strong className="run-name">{run.name}</strong><span className="run-id">{run.id}</span></span>
      <span><StatusBadge status={run.status} /></span>
      <span className="run-meta">{run.eventCount} {run.eventCount === 1 ? "step" : "steps"} · {formatDate(run.createdAt)}</span>
      <span className="run-arrow" aria-hidden="true">›</span>
    </button>
  );
}
