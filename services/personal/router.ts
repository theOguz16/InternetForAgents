import { Router, type Response } from "express";
import { createHash, randomUUID } from "node:crypto";
import { profiles, validInput, type Specialist } from "../shared/contracts.js";
import { runChild, type Child } from "./orchestrator.js";

import { PersonalStore, type Job } from "./store.js";

export function personalRouter(registryUrl: string, allowedOrigins: Set<string>, store: PersonalStore = new PersonalStore(":memory:")) {
  const router = Router();
  const saved = store.load();
  const jobs = new Map(saved.jobs);
  const keys = new Map(saved.keys);
  const persist = () => store.save({ jobs: [...jobs], keys: [...keys] });
  for (const job of jobs.values()) if (job.status === "running") {
    // Uzak uzman çalışmaya devam etmiş olabilir. Yeni iş göndermeyiz; tamamlanan
    // çocukları koruyup yalnız yarım kalanları belirsiz olarak işaretleriz.
    for (const child of job.children) if (["discovering", "working"].includes(child.state)) {
      child.state = "unknown"; child.error = "personal_restarted";
    }
    const completed = job.children.filter(child => child.state === "completed").length;
    job.status = completed === job.children.length ? "completed" : completed > 0 ? "partial" : "unknown";
    job.revision++;
  }
  persist();
  const subscribers = new Map<string, Set<Response>>();
  let connections = 0;
  const publish = (job: Job) => {
    job.revision++;
    persist(); // Önce diske yazılır; sonra istemciye bildirilen revision kalıcıdır.
    for (const response of subscribers.get(job.id) ?? []) {
      // Yavaş okuyucunun sınırsız tampon biriktirmesine izin vermeyiz; yeniden bağlanınca snapshot alır.
      const writable = response.write(`id: ${job.revision}\nevent: snapshot\ndata: ${JSON.stringify(job)}\n\n`);
      if (!writable || job.status !== "running") response.end();
    }
  };
  router.post("/jobs", (req, res) => {
    const body = req.body;
    const key = req.header("Idempotency-Key");
    if (!key || !/^[\x21-\x7e]{1,128}$/.test(key)) { res.status(400).json({ error: "invalid_idempotency_key" }); return; }
    if (!body || Object.keys(body).some(name => !["text", "skills"].includes(name)) || !Array.isArray(body.skills)
      || body.skills.length < 1 || body.skills.length > 3 || new Set(body.skills).size !== body.skills.length
      || !body.skills.every((skill: unknown) => typeof skill === "string" && Object.hasOwn(profiles, skill))) {
      res.status(400).json({ error: "invalid_job" }); return;
    }
    const skills = [...body.skills].sort() as Specialist[];
    if (!validInput(profiles[skills[0]], { profile: profiles[skills[0]], text: body.text })) { res.status(422).json({ error: "invalid_text" }); return; }
    // Metni job snapshot'ında saklamayız; idempotency karşılaştırmasında yalnız hash tutulur.
    const hash = createHash("sha256").update(JSON.stringify({ text: body.text, skills })).digest("hex");
    // Süre sonu temizliği istek sırasında yapılır; arka planda sorgulama döngüsü gerekmez.
    for (const [id, job] of jobs) if (job.status !== "running" && Date.now() - Date.parse(job.createdAt) >= 86400000) {
      jobs.delete(id);
      for (const [storedKey, value] of keys) if (value.jobId === id) keys.delete(storedKey);
    }
    persist();
    const existing = keys.get(key);
    if (existing) {
      if (existing.hash !== hash) { res.status(409).json({ error: "idempotency_conflict" }); return; }
      res.status(200).json(jobs.get(existing.jobId)); return;
    }
    if (jobs.size >= 100 || [...jobs.values()].filter(job => job.status === "running").length >= 8) { res.status(429).json({ error: "job_capacity" }); return; }
    const job: Job = { id: randomUUID(), status: "running", revision: 0, createdAt: new Date().toISOString(), children: skills.map(skill => ({ skill, state: "discovering" })) };
    jobs.set(job.id, job); keys.set(key, { hash, jobId: job.id });
    persist(); // Kabul yanıtından önce iş ve anahtar birlikte kalıcılaştırılır.
    res.status(202).location(`/v1/jobs/${job.id}`).json(job);
    const signal = AbortSignal.timeout(60000);
    // Bağımsız uzmanlar paralel çalışır; birinin hatası diğerinin sonucunu silmez.
    void Promise.allSettled(job.children.map(child => runChild(child, body.text, registryUrl, allowedOrigins, signal, () => publish(job)))).then(() => {
      const completed = job.children.filter(child => child.state === "completed").length;
      job.status = completed === job.children.length ? "completed" : completed > 0 ? "partial" : job.children.some(child => child.state === "unknown") ? "unknown" : "failed";
      publish(job);
    });
  });
  router.get("/jobs/:id", (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) { res.status(404).json({ error: "job_not_found" }); return; }
    res.json(job);
  });
  router.get("/jobs/:id/events", (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) { res.status(404).json({ error: "job_not_found" }); return; }
    if (connections >= 20) { res.status(429).json({ error: "stream_capacity" }); return; }
    res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" });
    res.flushHeaders();
    // Bağlantı ne zaman açılırsa açılsın son durum gönderilir; olay geçmişine bağımlılık yoktur.
    res.write(`id: ${job.revision}\nevent: snapshot\ndata: ${JSON.stringify(job)}\n\n`);
    if (job.status !== "running") { res.end(); return; }
    const listeners = subscribers.get(job.id) ?? new Set<Response>();
    listeners.add(res); subscribers.set(job.id, listeners); connections++;
    const heartbeat = setInterval(() => { if (!res.write(": heartbeat\n\n")) res.end(); }, 15000);
    res.once("close", () => {
      clearInterval(heartbeat); listeners.delete(res); connections--;
      if (!listeners.size) subscribers.delete(job.id);
    });
  });
  return router;
}
