import type { Divergence, RunDetail, TraceEvent } from "../../types/frontend";
import { pretty } from "../../utils/formatters";
import { EmptyState } from "../common/EmptyState";

interface DivergencePanelProps { original: RunDetail | null; replayed: RunDetail | null; divergences: Divergence[] | null; }

function EventCell({ event, side }: { event?: TraceEvent; side: "before" | "after" }) {
  if (!event) return <div className="comparison-event is-missing"><span>Event not present</span></div>;
  return <div className="comparison-event"><div className="comparison-event-title"><strong>{event.name}</strong><span>{event.kind}</span></div><pre>{pretty({ input: event.input, output: event.output, error: event.error })}</pre><small>{side === "before" ? "Recorded event" : "Replayed event"}</small></div>;
}

export function DivergencePanel({ original, replayed, divergences }: DivergencePanelProps) {
  if (!divergences || !original || !replayed) return <EmptyState icon="compare" title="Compare the complete trace">Run a controlled replay to see the recorded and replayed timelines aligned step by step.</EmptyState>;
  const eventSequences = [...new Set([...original.events.map((event) => event.seq), ...replayed.events.map((event) => event.seq)])].sort((a, b) => a - b);
  const changed = new Set(divergences.map((item) => item.seq));
  const first = divergences[0];

  return <>
    <div className={`comparison-outcome${replayed.status !== original.status ? " has-outcome-change" : ""}`}><div><p className="eyebrow">Replay outcome</p><h2>{divergences.length ? `${divergences.length} controlled change${divergences.length === 1 ? "" : "s"}` : "Trace matched exactly"}</h2><p>{first ? `First divergence: step ${first.seq}, ${first.path}.` : "No meaningful difference from the recorded trace."}</p></div><div className="outcome-transition"><span className={`status-badge status-${original.status}`}>{original.status}</span><b aria-hidden="true">→</b><span className={`status-badge status-${replayed.status}`}>{replayed.status}</span></div></div>
    <div className="comparison-legend"><span><i className="legend-recorded" />Recorded</span><span><i className="legend-replayed" />Replayed</span><span><i className="legend-changed" />Changed step</span></div>
    <div className="comparison-table"><div className="comparison-head"><span>Recorded trace</span><span>Controlled replay</span></div>{eventSequences.map((seq) => { const before = original.events.find((event) => event.seq === seq); const after = replayed.events.find((event) => event.seq === seq); const isFirst = first?.seq === seq; return <article className={`comparison-row${changed.has(seq) ? " is-changed" : ""}${isFirst ? " is-first" : ""}`} key={seq}><div className="comparison-step"><span>Step {seq}</span>{isFirst && <strong>First divergence</strong>}</div><div className="comparison-cells"><EventCell event={before} side="before" /><EventCell event={after} side="after" /></div></article>; })}</div>
    {divergences.length > 0 && <div className="divergence-list" aria-label="Field-level changes">{divergences.map((item, index) => <details className="divergence-card" open={index === 0} key={`${item.eventId ?? item.seq}-${item.path}-${index}`}><summary><span>Step {item.seq} / {item.category.replaceAll("-", " ")}</span><code>{item.path}</code></summary><p>{item.message}</p><div className="diff-labels"><span>Before</span><span>After</span></div><div className="diff-values"><pre>{pretty(item.before)}</pre><pre>{pretty(item.after)}</pre></div></details>)}</div>}
  </>;
}
