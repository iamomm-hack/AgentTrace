import { useMemo } from "react";
import type { RunDetail, TraceEvent } from "../../types/frontend";
import { pretty } from "../../utils/formatters";
import { EmptyState } from "../common/EmptyState";

interface ReplayControlsProps {
  run: RunDetail | null;
  tools: TraceEvent[];
  selectedEventId: string | null;
  output: string;
  onEventChange: (id: string) => void;
  onOutputChange: (output: string) => void;
  onReplay: () => void;
  pending: boolean;
}

export function ReplayControls({ run, tools, selectedEventId, output, onEventChange, onOutputChange, onReplay, pending }: ReplayControlsProps) {
  const selected = tools.find((tool) => tool.id === selectedEventId) ?? tools[0];
  const parseError = useMemo(() => {
    try { JSON.parse(output); return ""; }
    catch (error) { return error instanceof Error ? error.message : "Invalid JSON"; }
  }, [output]);

  if (!run) return <EmptyState icon="replay" title="Start with a recorded run" action={{ label: "Browse runs", href: "#runs" }}>Choose a run, then select the tool response you want to change.</EmptyState>;
  if (!tools.length) return <EmptyState title="No tool calls">The selected trace has no recorded tool response to control.</EmptyState>;

  return <>
    <div className="replay-run-context"><div><p className="eyebrow">Selected run</p><h2>{run.name}</h2></div><span className={`status-badge status-${run.status}`}>{run.status}</span></div>
    <p className="panel-lead">Recorded tool results are replayed locally. No external tool or model is executed.</p>
    <div className="form-field"><span className="field-label">Choose one tool step</span><div className="tool-step-list" role="listbox" aria-label="Tool step">{tools.map((tool) => <button type="button" role="option" aria-selected={tool.id === selected?.id} className={`tool-step${tool.id === selected?.id ? " is-selected" : ""}`} onClick={() => onEventChange(tool.id)} key={tool.id}><span className="tool-step-index">{tool.seq}</span><span><strong>{tool.name}</strong><small>{tool.error ? "Recorded error" : "Recorded output"}</small></span><span className="tool-step-arrow">›</span></button>)}</div></div>
    {selected && <div className="recorded-output"><div className="code-label"><span>Recorded output</span><span>read only</span></div><pre>{pretty(selected.error ?? selected.output)}</pre></div>}
    <div className={`form-field${parseError ? " has-error" : ""}`}><div className="field-heading"><label htmlFor="replay-output">Replacement output</label><button type="button" className="text-button" onClick={() => onOutputChange(JSON.stringify(selected?.output ?? null, null, 2))}>Reset</button></div><textarea id="replay-output" aria-invalid={Boolean(parseError)} aria-describedby={parseError ? "replay-json-error" : "replay-json-help"} spellCheck={false} value={output} onChange={(event) => onOutputChange(event.target.value)} /><span id={parseError ? "replay-json-error" : "replay-json-help"} className={parseError ? "field-error" : "form-hint"}>{parseError || "Valid JSON only. Exactly this tool response will be replaced."}</span></div>
    <div className="form-actions"><span className="form-hint">The first meaningful downstream change will be highlighted.</span><button className="button button-dark" type="button" data-action="run-replay" onClick={onReplay} disabled={Boolean(parseError) || pending}>{pending ? "Replaying…" : "Run controlled replay"}<span aria-hidden="true">→</span></button></div>
    <div className="replay-notice">Replay substitutes recorded tool responses only. It does not claim to reproduce arbitrary LLM reasoning.</div>
  </>;
}
