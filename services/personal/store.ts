import { DatabaseSync } from "node:sqlite";
import type { Child } from "./orchestrator.js";
export interface Job {
  id: string;
  status: "running" | "completed" | "partial" | "failed" | "unknown";
  revision: number;
  createdAt: string;
  children: Child[];
}
export interface SavedState {
  jobs: [string, Job][];
  keys: [string, { hash: string; jobId: string }][];
}
export class PersonalStore {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=3000;");
    this.db.exec("CREATE TABLE IF NOT EXISTS personal_state (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL)");
  }
  load(): SavedState {
    const row = this.db.prepare("SELECT body FROM personal_state WHERE id=1").get();
    return row ? JSON.parse(String(row.body)) : { jobs: [], keys: [] };
  }
  save(state: SavedState) {
    // En fazla 100 işlik yerel demoda snapshot yeterlidir. İş ve idempotency anahtarı
    // tek SQLite yazımıyla birlikte kaydedilir; anahtarın işten kopması engellenir.
    this.db.prepare("INSERT INTO personal_state VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET body=excluded.body")
      .run(JSON.stringify(state));
  }
  close() { this.db.close(); }
}
