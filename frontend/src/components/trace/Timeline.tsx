import type { TraceEvent } from "../../types/frontend";
import { pretty } from "../../utils/formatters";

export function Timeline({ events }: { events: TraceEvent[] }) {
  if (!events.length) return <div className="empty-state"><strong>No trace steps</strong>This run does not contain events yet.</div>;
  return (
    <div className="timeline">
      {events.map((event) => (
        <article className={`timeline-event${event.error ? " is-error" : ""}`} key={event.id}>
          <span className="event-index">{event.seq}</span>
          <div className="event-content">
            <div className="event-title"><span>{event.name}</span><span className="event-kind">{event.kind}</span></div>
            {event.error ? <p className="event-error">{event.error.message ?? JSON.stringify(event.error)}</p> : <pre className="event-code">{pretty({ input: event.input, output: event.output })}</pre>}
          </div>
        </article>
      ))}
    </div>
  );
}
