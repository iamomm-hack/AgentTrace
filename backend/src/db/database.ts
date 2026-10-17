import { readFileSync, readdirSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export class SqliteDatabase {
  readonly raw: DatabaseSync;

  constructor(filePath: string, migrationsDir: string) {
    if (filePath !== ":memory:") {
      mkdirSync(dirname(filePath), { recursive: true });
    }

    this.raw = new DatabaseSync(filePath);
    this.raw.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    if (filePath !== ":memory:") {
      this.raw.exec("PRAGMA journal_mode = WAL;");
    }
    this.applyMigrations(migrationsDir);
  }

  close(): void {
    this.raw.close();
  }

  private applyMigrations(migrationsDir: string): void {
    const migrations = readdirSync(migrationsDir)
      .filter((fileName) => /^\d+_.+\.sql$/.test(fileName))
      .sort();

    this.raw.exec(
      "CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);",
    );

    const applied = new Set(
      (this.raw.prepare("SELECT id FROM schema_migrations ORDER BY id").all() as Array<{ id: string }>).map(
        (row) => row.id,
      ),
    );

    for (const migration of migrations) {
      if (applied.has(migration)) {
        continue;
      }
      this.raw.exec(readFileSync(join(migrationsDir, migration), "utf8"));
      this.raw
        .prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)")
        .run(migration, new Date().toISOString());
    }
  }
}
