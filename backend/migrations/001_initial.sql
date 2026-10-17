CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('recorded','imported','replay')),
  status TEXT NOT NULL CHECK (status IN ('running','passed','failed','cancelled','unknown')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  duration_ms INTEGER,
  parent_run_id TEXT REFERENCES runs(id),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE, seq INTEGER NOT NULL, at TEXT NOT NULL,
  kind TEXT NOT NULL, name TEXT NOT NULL, agent_id TEXT, input_json TEXT, output_json TEXT, error_json TEXT, duration_ms INTEGER,
  parent_id TEXT, metadata_json TEXT NOT NULL DEFAULT '{}', fingerprint TEXT NOT NULL, UNIQUE(run_id,seq)
);
CREATE TABLE IF NOT EXISTS replay_sessions (
  id TEXT PRIMARY KEY, base_run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE, result_run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  target_event_id TEXT NOT NULL, override_json TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('deterministic-fixture','projection')),
  status TEXT NOT NULL CHECK(status IN ('completed','failed')), divergence_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS failure_reports (
  id TEXT PRIMARY KEY, run_id TEXT NOT NULL UNIQUE REFERENCES runs(id) ON DELETE CASCADE, title TEXT NOT NULL, summary TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '{}', reproduction_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS runs_created_idx ON runs(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS runs_status_idx ON runs(status,created_at DESC);
CREATE INDEX IF NOT EXISTS events_run_seq_idx ON events(run_id,seq);
CREATE INDEX IF NOT EXISTS events_run_kind_idx ON events(run_id,kind);
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  name TEXT, overrides_json TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS branches_run_idx ON branches(run_id,created_at DESC);
