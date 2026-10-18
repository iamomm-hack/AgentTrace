export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type RunStatus = "running" | "passed" | "failed" | "cancelled" | "unknown";
export type RunKind = "recorded" | "imported" | "replay" | string;

export interface TraceError {
  code?: string;
  message?: string;
  details?: JsonValue | null;
  [key: string]: unknown;
}

export interface TraceEvent {
  id: string;
  runId?: string;
  seq: number;
  at?: string | null;
  kind: string;
  name: string;
  input: unknown;
  output: unknown;
  error: TraceError | null;
  durationMs: number | null;
  raw?: Record<string, unknown>;
}

export interface RunSummary {
  id: string;
  name: string;
  kind: RunKind;
  status: RunStatus;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs: number | null;
  eventCount: number;
  failureCount?: number;
  createdAt?: string | null;
  metadata?: JsonObject;
  parentRunId?: string | null;
}

export interface RunDetail extends RunSummary {
  events: TraceEvent[];
}

export interface OverviewMetrics {
  totalRuns?: number;
  passedRuns?: number;
  failedRuns?: number;
  replayRuns?: number;
  passRate?: number | null;
  averageDurationMs?: number | null;
}

export interface OverviewResponse {
  metrics?: OverviewMetrics;
  recentRuns?: RunSummary[];
}

export interface Divergence {
  seq: number;
  eventId?: string;
  category: string;
  path: string;
  before: unknown;
  after: unknown;
  message: string;
}

export interface ReplayResponse {
  replay: Record<string, unknown>;
  original: unknown;
  replayed: unknown;
  divergences?: Divergence[];
}

export interface FailureReport {
  id?: string;
  runId: string;
  title: string;
  summary: string;
  evidence?: JsonObject;
  reproduction?: JsonObject;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceState {
  runs: RunSummary[];
  selectedRun: RunDetail | null;
  reports: FailureReport[];
  replay: {
    response: ReplayResponse;
    original: RunDetail;
    replayed: RunDetail;
    divergences: Divergence[];
  } | null;
  replayEventId: string | null;
  alertDismissed: boolean;
}

export type Route = "overview" | "runs" | "replay" | "failures" | "import";
