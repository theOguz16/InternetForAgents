import { DatabaseSync } from 'node:sqlite';
import { Task, TaskState, type ListTasksRequest } from '@a2a-js/sdk';
import { InMemoryTaskStore, resolveUserScope, type ServerCallContext, type TaskStore } from '@a2a-js/sdk/server';

/** Yerel uzman için tek süreçli görev deposu; kayıtları kiracı ve çağıran kimliğiyle ayırır. */
export class SqliteTaskStore implements TaskStore {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=3000;");
    this.db.exec(`CREATE TABLE IF NOT EXISTS tasks (
      tenant TEXT NOT NULL, owner TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL,
      PRIMARY KEY (tenant, owner, id))`);
    // Executor belleği yeniden başlatmada kaybolur. Aktif görünen görevleri başarılı
    // saymak yerine, yürütmenin kesildiğini belirten failed durumuna geçiririz.
    for (const row of this.db.prepare('SELECT tenant, owner, id, body FROM tasks').all()) {
      const task = Task.fromJSON(JSON.parse(String(row.body)));
      if ([TaskState.TASK_STATE_SUBMITTED, TaskState.TASK_STATE_WORKING, TaskState.TASK_STATE_INPUT_REQUIRED, TaskState.TASK_STATE_AUTH_REQUIRED].includes(task.status?.state ?? 0)) {
        task.status = { message: task.status?.message, timestamp: new Date().toISOString(), state: TaskState.TASK_STATE_FAILED };
        task.metadata = { ...task.metadata, recoveryReason: "executor_restarted" };
        this.db.prepare('UPDATE tasks SET body=? WHERE tenant=? AND owner=? AND id=?').run(
          JSON.stringify(Task.toJSON(task)), String(row.tenant), String(row.owner), String(row.id));
      }
    }
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
