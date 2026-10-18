import { useEffect, useState } from "react";
import type { FailureReport, RunSummary } from "../../types/frontend";
import { formatDate, pretty } from "../../utils/formatters";
import { EmptyState } from "../common/EmptyState";

interface FailureReportPanelProps {
  runs: RunSummary[];
  reports: FailureReport[];
}

export function FailureReportPanel({ runs, reports }: FailureReportPanelProps) {
  const failures = runs.filter((run) => run.status === "failed");
  const [selectedId, setSelectedId] = useState<string | null>(failures[0]?.id ?? null);
  useEffect(() => {
    if (!selectedId || !failures.some((run) => run.id === selectedId)) setSelectedId(failures[0]?.id ?? null);
  }, [failures, selectedId]);

  if (!failures.length) {
    return <div className="panel failure-empty" id="failure-detail"><div className="panel-toolbar"><h2>Failure reports</h2><span className="panel-count">0</span></div><EmptyState icon="check" title={runs.length ? "No failures recorded" : "No failure reports yet"} action={{ label: runs.length ? "View all runs" : "Import a trace", href: runs.length ? "#runs" : "#import" }}>{runs.length ? "Your recorded runs have no failed status. Reports will appear here when a run fails." : "Import a run to inspect errors, their surrounding context, and the steps that led to them."}</EmptyState></div>;
  }

  const selected = failures.find((run) => run.id === selectedId) ?? failures[0];
  const report = reports.find((item) => item.runId === selected.id);
  return (
    <>
      <div className="panel failure-list" id="failure-list"><h2>Reports</h2>{failures.map((run) => {
        const item = reports.find((candidate) => candidate.runId === run.id);
        return <button className={`failure-row${run.id === selected.id ? " is-selected" : ""}`} type="button" data-report-id={run.id} key={run.id} onClick={() => setSelectedId(run.id)}><strong>{item?.title ?? "Run failed"}</strong><span>{item?.summary ?? "Failure evidence is attached to this run."}</span><span>{formatDate(run.createdAt)}</span></button>;
      })}</div>
      <div className="panel failure-detail" id="failure-detail"><p className="eyebrow">Evidence-backed report</p><h2>{report?.title ?? "Run failed"}</h2><p className="report-summary">{report?.summary ?? "The run completed with a failure status."}</p><div className="evidence-block"><h3>Evidence</h3><pre>{pretty(report?.evidence ?? selected.metadata)}</pre></div><div className="evidence-block"><h3>Reproduction</h3><pre>{pretty(report?.reproduction ?? { runId: selected.id, events: selected.eventCount })}</pre></div></div>
    </>
  );
}
