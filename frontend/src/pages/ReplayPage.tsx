import type { Divergence, RunDetail, TraceEvent } from "../types/frontend";
import { DivergencePanel } from "../components/trace/DivergencePanel";
import { ReplayControls } from "../components/trace/ReplayControls";

interface ReplayPageProps {
  run: RunDetail | null;
  tools: TraceEvent[];
  replayEventId: string | null;
  output: string;
  divergences: Divergence[] | null;
  onEventChange: (id: string) => void;
  onOutputChange: (value: string) => void;
  onReplay: () => void;
}

export function ReplayPage(props: ReplayPageProps) {
  return (
    <section className="view" data-view="replay" aria-labelledby="replay-heading">
      <div className="page-heading"><div><p className="eyebrow">Controlled execution</p><h1 id="replay-heading">Replay workspace</h1><p className="page-description">Change one tool response and compare the resulting trace.</p></div></div>
      <div className="replay-layout"><div className="panel replay-controls" id="replay-controls"><ReplayControls run={props.run} tools={props.tools} selectedEventId={props.replayEventId} output={props.output} onEventChange={props.onEventChange} onOutputChange={props.onOutputChange} onReplay={props.onReplay} /></div><div className="panel divergence-panel" id="divergence-panel"><DivergencePanel divergences={props.divergences} /></div></div>
    </section>
  );
}
