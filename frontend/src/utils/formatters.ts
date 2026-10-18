export function formatDuration(value: unknown): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  const duration = Number(value);
  if (duration < 1000) return `${Math.round(duration)} ms`;
  return `${(duration / 1000).toFixed(duration >= 10000 ? 1 : 2)} s`;
}

export function formatDate(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

export function pretty(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2);
}

export function statusName(status: unknown): "passed" | "failed" | "running" | "cancelled" | "unknown" {
  const normalized = String(status ?? "unknown").toLowerCase();
  if (["completed", "passed", "success"].includes(normalized)) return "passed";
  if (["failed", "error"].includes(normalized)) return "failed";
  if (normalized === "running") return "running";
  if (normalized === "cancelled") return "cancelled";
  return "unknown";
}
