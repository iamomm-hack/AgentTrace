import type { RunDetail, TraceEvent } from "../../types/frontend";
import { EmptyState } from "../common/EmptyState";

interface ReplayControlsProps {
  run: RunDetail | null;
  tools: TraceEvent[];
  selectedEventId: string | null;
  output: string;
  onEventChange: (id: string) => void;
  onOutputChange: (output: string) => void;
  onReplay: () => void;
}

export function ReplayControls({ run, tools, selectedEventId, output, onEventChange, onOutputChange, onReplay }: ReplayControlsProps) {
  if (!run) return <EmptyState icon="replay" title="Start with a recorded run" action={{ label: "Browse runs", href: "#runs" }}>Choose a run, then select the tool response you want to change.</EmptyState>;
  if (!tools.length) return <EmptyState title="No tool calls">The selected trace has no recorded tool response to control.</EmptyState>;
  return (
    <>
      <p className="eyebrow">{run.name}</p>
      <h2>Change a controlled response</h2>
      <p className="panel-lead">Recorded tool results are replayed locally. No external tool or model is executed.</p>
      <div className="form-field"><label htmlFor="replay-event">Tool step</label><select id="replay-event" value={selectedEventId ?? tools[0].id} onChange={(event) => onEventChange(event.target.value)}>{tools.map((tool) => <option value={tool.id} key={tool.id}>Step {tool.seq} · {tool.name}</option>)}</select></div>
      <div className="form-field"><label htmlFor="replay-output">Replacement output (JSON)</label><textarea id="replay-output" spellCheck={false} value={output} onChange={(event) => onOutputChange(event.target.value)} /></div>
      <div className="form-actions"><span className="form-hint">The comparison highlights the first meaningful mismatch.</span><button className="button button-dark" type="button" data-action="run-replay" onClick={onReplay}>Run replay ↗</button></div>
      <div className="replay-notice">Replay substitutes recorded tool responses only. It does not claim to reproduce arbitrary LLM reasoning.</div>
    </>
  );
}
