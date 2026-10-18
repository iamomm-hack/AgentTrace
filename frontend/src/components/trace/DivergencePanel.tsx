import type { Divergence } from "../../types/frontend";
import { pretty } from "../../utils/formatters";
import { EmptyState } from "../common/EmptyState";

export function DivergencePanel({ divergences }: { divergences: Divergence[] | null }) {
  if (!divergences) return <EmptyState title="Comparison appears here">Run a branch to see original and replayed evidence side by side.</EmptyState>;
  return (
    <>
      <p className="eyebrow">recorded response replay</p>
      <h2>{divergences.length ? `${divergences.length} divergence${divergences.length === 1 ? "" : "s"} found` : "Replay matches recorded trace"}</h2>
      <p className="panel-lead">{divergences.length ? `First mismatch at step ${divergences[0].seq}.` : "The controlled replay matches the recorded trace."}</p>
      <div className="divergence-list">
        {divergences.length ? divergences.map((item, index) => (
          <article className="divergence-card" key={`${item.path}-${index}`}>
            <strong>Step {item.seq} · {item.category.replaceAll("-", " ")}</strong>
            <p>{item.message}</p>
            <span className="divergence-path">{item.path}</span>
            <div className="diff-values"><pre>{pretty(item.before)}</pre><pre>{pretty(item.after)}</pre></div>
          </article>
        )) : <EmptyState title="Deterministic replay confirmed">No meaningful divergence was found.</EmptyState>}
      </div>
    </>
  );
}
