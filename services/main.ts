import express from "express";
import { registryGateway } from "./personal/registry-gateway.js";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { PersonalStore } from "./personal/store.js";
import { SqliteTaskStore } from "./shared/task-store.js";
import { personalRouter } from "./personal/router.js";
import { mountSpecialist } from "./shared/a2a.js";
import { schemas, type Specialist } from "./shared/contracts.js";
import { RegistryStore } from "./registry/store.js";
import { registryRouter } from "./registry/router.js";
import { handler as language } from "./language/handler.js";
import { handler as keywords } from "./keywords/handler.js";
import { handler as summary } from "./summary/handler.js";

const roles = ["registry", "personal", "language", "keywords", "summary"] as const;
const service = process.env.SERVICE_NAME ?? "registry";
if (!roles.some((role) => role === service)) throw new Error("Geçersiz SERVICE_NAME");
const port = Number(process.env.PORT ?? 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Geçersiz PORT");
const specialists = { language, keywords, summary };
const specialist = service in specialists;
const dataDir = process.env.DATA_DIR ?? join(process.cwd(), ".data", service);
mkdirSync(dataDir, { recursive: true });
let storage: { close(): void } | undefined;
const app = express();
app.use(express.json({ limit: "64kb" }));
app.get("/profiles", (_req, res) => { res.json(schemas); });
if (service === "registry") {
  const origins = new Set((process.env.ALLOWED_AGENT_ORIGINS ?? "http://127.0.0.1:4101,http://127.0.0.1:4102,http://127.0.0.1:4103").split(",").map(value => new URL(value.trim()).origin));
  const store = new RegistryStore(join(dataDir, "registry.sqlite"));
  storage = store;
  app.use("/v1", registryRouter(origins, store));
}
if (service === "personal") {
  const registry = new URL(process.env.REGISTRY_URL ?? "http://127.0.0.1:4001");
  if (!["http:", "https:"].includes(registry.protocol) || registry.username || registry.password || registry.pathname !== "/" || registry.search || registry.hash) throw new Error("Geçersiz REGISTRY_URL");
  const origins = new Set((process.env.ALLOWED_AGENT_ORIGINS ?? "http://127.0.0.1:4101,http://127.0.0.1:4102,http://127.0.0.1:4103").split(",").map(value => new URL(value.trim()).origin));
  const store = new PersonalStore(join(dataDir, "personal.sqlite"));
  storage = store;
  app.use("/v1", personalRouter(registry.origin, origins, store));
  app.use("/registry", registryGateway(registry.origin));
  app.use(express.static(join(process.cwd(), "dist", "web")));
}
if (specialist) {
  const role = service as Specialist;
  const publicUrl = new URL(process.env.PUBLIC_BASE_URL ?? `http://127.0.0.1:${port}`);
  if (!["http:", "https:"].includes(publicUrl.protocol) || publicUrl.username || publicUrl.password || publicUrl.pathname !== "/" || publicUrl.search || publicUrl.hash) throw new Error("Geçersiz PUBLIC_BASE_URL");
  const store = new SqliteTaskStore(join(dataDir, "tasks.sqlite"));
  storage = store;
  mountSpecialist(app, role, publicUrl.origin, specialists[role], store);
}
app.disable("x-powered-by");
// Sağlık uç noktası yalnızca süreç durumunu bildirir; agent hazır olduğu anlamına gelmez.
app.get("/health", (_request, response) => {
  response.json({ service, status: "ok", implementation: "local-prototype", a2aReady: specialist });
});
app.use((_request, response) => {
  response.status(404).json({ error: "not_implemented", service });
});
const server = app.listen(port, process.env.HOST ?? "127.0.0.1", () => {
  console.log(JSON.stringify({ service, port, event: "listening" }));
});
// Container kapanırken yeni bağlantıları kesip mevcut isteklerin bitmesini bekleriz.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close(() => { storage?.close(); process.exit(0); });
    setTimeout(() => process.exit(1), 5000).unref();
  });
}
