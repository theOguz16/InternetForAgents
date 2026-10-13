import { DatabaseSync } from 'node:sqlite';
import { Task, type ListTasksRequest } from '@a2a-js/sdk';
import { InMemoryTaskStore, resolveUserScope, type ServerCallContext, type TaskStore } from '@a2a-js/sdk/server';

/** N01 için tek süreçli görev deposu; kayıtları kiracı ve çağıran kimliğiyle ayırır. */
export class SqliteTaskStore implements TaskStore {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`CREATE TABLE IF NOT EXISTS tasks (
      tenant TEXT NOT NULL, owner TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL,
      PRIMARY KEY (tenant, owner, id))`);
  }
  // SDK codec’i, görev nesnesini diske yazılabilen protokol JSON biçimine dönüştürür.
  async save(task: Task, context: ServerCallContext) {
    this.db.prepare('INSERT OR REPLACE INTO tasks VALUES (?, ?, ?, ?)').run(
      context.tenant ?? '', resolveUserScope(context), task.id, JSON.stringify(Task.toJSON(task)));
  }
  async load(id: string, context: ServerCallContext) {
    const row = this.db.prepare('SELECT body FROM tasks WHERE tenant=? AND owner=? AND id=?')
      .get(context.tenant ?? '', resolveUserScope(context), id);
    return row ? Task.fromJSON(JSON.parse(String(row.body))) : undefined;
  }
  async list(params: ListTasksRequest, context: ServerCallContext) {
    // SDK filtreleme ve sayfalama kurallarını kullanırız; tüm kayıtları belleğe almak yalnız bu küçük denemeye uygundur.
    const view = new InMemoryTaskStore();
    const rows = this.db.prepare('SELECT body FROM tasks WHERE tenant=? AND owner=?')
      .all(context.tenant ?? '', resolveUserScope(context));
    for (const row of rows) await view.save(Task.fromJSON(JSON.parse(String(row.body))), context);
    return view.list(params, context);
  }
  close() { this.db.close(); }
}
