interface ImportPageProps {
  status: string;
  isError: boolean;
  onImport: (file: File | undefined) => void;
}

export function ImportPage({ status, isError, onImport }: ImportPageProps) {
  return (
    <section className="view" data-view="import" aria-labelledby="import-heading">
      <div className="page-heading"><div><p className="eyebrow">Bring your own trace</p><h1 id="import-heading">Import trace JSON</h1><p className="page-description">Load a captured trace locally to inspect it and replay a controlled tool response.</p></div></div>
      <div className="import-layout">
        <div className="panel import-panel" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onImport(event.dataTransfer.files?.[0]); }}>
          <div className="import-icon" aria-hidden="true">↑</div>
          <h2>Drop a trace file here</h2>
          <p>JSON only. The file is sent to the local backend and persisted in SQLite.</p>
          <label className="button button-dark file-button" htmlFor="trace-file">Choose JSON file<input id="trace-file" type="file" accept=".json,application/json" onChange={(event) => onImport(event.target.files?.[0])} /></label>
          <p className={`import-status${isError ? " is-error" : ""}`} id="import-status" role="status">{status}</p>
        </div>
        <div className="panel import-help">
          <p className="eyebrow">Expected shape</p>
          <h2>Keep the useful context</h2>
          <p>AgentTrace accepts a run object, a trace object with <code>events</code> or <code>steps</code>, or an array of events.</p>
          <pre>{`{
  "id": "run-123",
  "status": "failed",
  "events": [
    { "type": "tool", "name": "search", "input": {}, "output": {} }
  ]
}`}</pre>
        </div>
      </div>
    </section>
  );
}
