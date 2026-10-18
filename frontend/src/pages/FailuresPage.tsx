import type { FailureReport, RunSummary } from "../types/frontend";
import { FailureReportPanel } from "../components/trace/FailureReportPanel";

export function FailuresPage({ runs, reports }: { runs: RunSummary[]; reports: FailureReport[] }) {
  return (
    <section className="view" data-view="failures" aria-labelledby="failures-heading">
      <div className="page-heading"><div><p className="eyebrow">Failure analysis</p><h1 id="failures-heading">Failure reports</h1><p className="page-description">Inspect reported errors without losing the surrounding trace context.</p></div></div>
      <div className="failure-layout"><FailureReportPanel runs={runs} reports={reports} /></div>
    </section>
  );
}
