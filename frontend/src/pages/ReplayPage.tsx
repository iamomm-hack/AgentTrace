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
  onEventChange: (id: string) => void;
  onOutputChange: (value: string) => void;
  onReplay: () => void;
}

export function ReplayPage(props: ReplayPageProps) {
  return (
    <section className="view" data-view="replay" aria-labelledby="replay-heading">
      <div className="page-heading"><div><p className="eyebrow">Workspace / Replay</p><h1 id="replay-heading">Replay</h1><p className="page-description">Change one tool response and compare the resulting trace.</p></div></div>
      <ol className="replay-steps" aria-label="Replay workflow"><li className={!props.run ? "is-current" : ""}><b>1</b>Select a run</li><li className={props.run && !props.divergences ? "is-current" : ""}><b>2</b>Change a response</li><li className={props.divergences ? "is-current" : ""}><b>3</b>Compare outputs</li></ol>
      <div className="replay-layout"><div className="panel replay-controls" id="replay-controls">{!props.run && <div className="panel-caption"><Icon name="replay" width={15} height={15} />Replay configuration</div>}<ReplayControls run={props.run} tools={props.tools} selectedEventId={props.replayEventId} output={props.output} onEventChange={props.onEventChange} onOutputChange={props.onOutputChange} onReplay={props.onReplay} /></div><div className="panel divergence-panel" id="divergence-panel">{!props.divergences && <div className="panel-caption"><Icon name="compare" width={15} height={15} />Output comparison</div>}<DivergencePanel divergences={props.divergences} /></div></div>
    </section>
  );
}
