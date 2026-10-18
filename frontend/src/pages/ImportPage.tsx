import { useState } from "react";
import { Icon } from "../components/common/Icon";

interface ImportPageProps {
  status: string;
  isError: boolean;
  onImport: (file: File | undefined) => void;
}
export function ImportPage({ status, isError, onImport }: ImportPageProps) {
  const [dragging, setDragging] = useState(false);
  return <section className="view" data-view="import" aria-labelledby="import-heading">
    <div className="page-heading"><div><p className="eyebrow">Workspace / Data</p><h1 id="import-heading">Import trace</h1><p className="page-description">Bring an execution into your workspace. Inspect it step by step.</p></div></div>
    <div className="import-layout">
      <div className={`panel import-panel${dragging ? " is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); onImport(event.dataTransfer.files?.[0]); }}>
        <div className="import-icon"><Icon name="upload" width={25} height={25} /></div>
        <h2>{dragging ? "Release to import" : "Drop your trace here"}</h2>
        <p>Drag a JSON file into this area, or choose one from your computer.</p>
        <label className="button button-dark file-button" htmlFor="trace-file"><Icon name="file" width={15} height={15} />Choose JSON file<input id="trace-file" type="file" accept=".json,application/json" onChange={(event) => { onImport(event.target.files?.[0]); event.target.value = ""; }} /></label>
        <p className="import-footnote">.json · Stored in your local workspace</p>
        <p className={`import-status${isError ? " is-error" : ""}`} id="import-status" role="status">{status}</p>
      </div>
      <div className="panel import-help">
        <div className="panel-heading-label"><Icon name="code" /><h2>Trace format</h2></div>
        <p>A run object with an <code>events</code> or <code>steps</code> array, or an array of events. Keep the inputs and outputs to compare tool responses during replay.</p>
        <div className="code-label"><span>example-trace.json</span><span>JSON</span></div>
        <pre>{`{
  "id": "run-123",
  "name": "Research assistant",
  "status": "passed",
  "events": [
    {
      "type": "tool",
      "name": "search",
      "input": { "query": "agent tracing" },
      "output": { "results": [] }
    }
  ]
}`}</pre>
      </div>
    </div>
  </section>;
}
