import { Icon } from "../components/common/Icon";
import type { Divergence, RunDetail, TraceEvent } from "../types/frontend";
import { DivergencePanel } from "../components/trace/DivergencePanel";
import { ReplayControls } from "../components/trace/ReplayControls";

interface ReplayPageProps {
  run: RunDetail | null;
  tools: TraceEvent[];
  replayEventId: string | null;
  output: string;
  divergences: Divergence[] | null;
  original: RunDetail | null;
  replayed: RunDetail | null;
  pending: boolean;
  onEventChange: (id: string) => void;
  onOutputChange: (value: string) => void;
  onReplay: () => void;
}

export function ReplayPage(props: ReplayPageProps) {
  return <section className="view" data-view="replay" aria-labelledby="replay-heading">
    <div className="page-heading"><div><p className="eyebrow">Workspace / Replay</p><h1 id="replay-heading">Controlled replay</h1><p className="page-description">Replace one recorded tool response, then inspect the first divergence and downstream outcome.</p></div></div>
    <ol className="replay-steps" aria-label="Replay workflow"><li className={!props.run ? "is-current" : "is-complete"}><b>{props.run ? "✓" : "1"}</b>Select a run</li><li className={props.run && !props.divergences ? "is-current" : props.divergences ? "is-complete" : ""}><b>{props.divergences ? "✓" : "2"}</b>Change one response</li><li className={props.divergences ? "is-current" : ""}><b>3</b>Compare traces</li></ol>
    <div className="replay-layout"><div className="panel replay-controls" id="replay-controls">{!props.run && <div className="panel-caption"><Icon name="replay" width={15} height={15} />Replay configuration</div>}<ReplayControls run={props.run} tools={props.tools} selectedEventId={props.replayEventId} output={props.output} onEventChange={props.onEventChange} onOutputChange={props.onOutputChange} onReplay={props.onReplay} pending={props.pending} /></div><div className="panel divergence-panel" id="divergence-panel">{!props.divergences && <div className="panel-caption"><Icon name="compare" width={15} height={15} />Trace comparison</div>}<DivergencePanel original={props.original} replayed={props.replayed} divergences={props.divergences} /></div></div>
  </section>;
}
