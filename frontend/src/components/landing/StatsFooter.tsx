import { useCountUp } from "../../hooks/useCountUp";

const metrics = [
  { icon: "<", target: 120, suffix: "ms", decimals: 0, label: "Inference Time" },
  { icon: "%", target: 99.99, suffix: "%", decimals: 2, label: "Platform Uptime" },
  { icon: "*", target: 24, suffix: "/7", decimals: 0, label: "Autonomous Runtime" },
  { icon: "#", target: 2.4, suffix: "M", decimals: 1, label: "Context Windows" },
];

function Stat({ metric, index }: { metric: typeof metrics[number]; index: number }) {
  const counter = useCountUp(metric.target, metric.decimals, index);
  return <div className="landing-stat anim" style={{ "--d": `${0.5 + index * 0.08}s` }}>
    <span className="stat-icon" aria-hidden="true">{metric.icon}</span>
    <span className="stat-value" ref={counter.ref} aria-label={`${metric.target.toFixed(metric.decimals)}${metric.suffix}`}><span aria-hidden="true">{counter.value}{metric.suffix}</span></span>
    <span className="stat-label">{metric.label}</span>
  </div>;
}

export function StatsFooter() {
  return <footer className="landing-footer"><div className="landing-stats" aria-label="Demonstration statistics" aria-describedby="landing-demo-note">{metrics.map((metric, index) => <Stat key={metric.label} metric={metric} index={index} />)}</div>
    <p id="landing-demo-note" className="demo-note">Design preview · Enterprise claim and metrics are illustrative, not verified AgentTrace data.</p>
  </footer>;
}
