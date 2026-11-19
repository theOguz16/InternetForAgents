import { Router } from "express";
import type { JobService, SubmitError } from "./application/job-service.js";
import type { Job } from "./domain/job.js";

// Presentation katmanı: yalnız HTTP/SSE çevirisi. İş kuralları JobService'tedir.
const statusOf: Record<SubmitError, number> = {
  invalid_idempotency_key: 400, invalid_job: 400, invalid_text: 422, idempotency_conflict: 409, job_capacity: 429,
};
const snapshot = (job: Job) => `id: ${job.revision}\nevent: snapshot\ndata: ${JSON.stringify(job)}\n\n`;

export function personalRouter(jobs: JobService) {
  const router = Router();
  let connections = 0;
  router.post("/jobs", (req, res) => {
    const outcome = jobs.submit(req.header("Idempotency-Key"), req.body);
    if (outcome.kind === "error") { res.status(statusOf[outcome.code]).json({ error: outcome.code }); return; }
    if (outcome.kind === "existing") { res.status(200).json(outcome.job); return; }
    res.status(202).location(`/v1/jobs/${outcome.job.id}`).json(outcome.job);
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
    res.write(snapshot(job));
    if (job.status !== "running") { res.end(); return; }
    connections++;
    const unsubscribe = jobs.subscribe(job.id, current => {
      // Yavaş okuyucunun sınırsız tampon biriktirmesine izin vermeyiz; yeniden bağlanınca snapshot alır.
      if (!res.write(snapshot(current)) || current.status !== "running") res.end();
    });
    const heartbeat = setInterval(() => { if (!res.write(": heartbeat\n\n")) res.end(); }, 15000);
    res.once("close", () => { clearInterval(heartbeat); unsubscribe(); connections--; });
  });
  return router;
}
