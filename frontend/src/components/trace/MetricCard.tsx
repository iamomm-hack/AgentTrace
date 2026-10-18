interface MetricCardProps {
  metricKey: string;
  label: string;
  value: string | number;
  note: string;
}

export function MetricCard({ metricKey, label, value, note }: MetricCardProps) {
  return <article className="metric-card"><span className="metric-label">{label}</span><strong className="metric-value" data-metric={metricKey}>{value}</strong><span className="metric-note" data-metric-note={metricKey}>{note}</span></article>;
}
