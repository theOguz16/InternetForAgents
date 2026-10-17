import { performance } from 'node:perf_hooks';
import { ModelBackend, ModelError, ModelReply, ModelRequest } from './port.js';
export interface TimedReply extends ModelReply { timing: { queueMs: number; executionMs: number; totalMs: number } }
interface Job {
  input: ModelRequest; start: number; controller: AbortController; running: boolean; done: boolean;
  timer: ReturnType<typeof setTimeout>; resolve: (value: TimedReply) => void; reject: (reason: ModelError) => void; cleanup: () => void;
}
export class ModelQueue {
  private waiting: Job[] = [];
  private active: Job | undefined;
  private poisoned = false;
  constructor(private backend: ModelBackend, private capacity = 8, private timeoutMs = 90000) {
    if (!Number.isInteger(capacity) || capacity < 0 || capacity > 20 || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300000) throw new Error('invalid_queue_config');
  }
  status() { return { active: Boolean(this.active), waiting: this.waiting.length, blocked: this.poisoned }; }
  submit(input: ModelRequest, signal?: AbortSignal): Promise<TimedReply> {
    if (this.poisoned) return Promise.reject(new ModelError('backend_reconciliation_required'));
    if (signal?.aborted) return Promise.reject(new ModelError('cancelled'));
    if (this.active && this.waiting.length >= this.capacity) return Promise.reject(new ModelError('queue_full'));
    return new Promise((resolve, reject) => {
      const cancel = () => this.stop(job, 'cancelled');
      const job: Job = { input, start: performance.now(), controller: new AbortController(), running: false, done: false,
        timer: setTimeout(() => this.stop(job, 'deadline_exceeded'), this.timeoutMs), resolve, reject,
        cleanup: () => signal?.removeEventListener('abort', cancel) };
      signal?.addEventListener('abort', cancel, { once: true });
      this.waiting.push(job); this.pump();
    });
  }
  private finish(job: Job) { job.done = true; clearTimeout(job.timer); job.cleanup(); }
  private stop(job: Job, code: string) {
    if (job.done) return;
    this.finish(job); job.controller.abort(); job.reject(new ModelError(code));
    this.waiting = this.waiting.filter(item => item !== job);
    if (job.running && !this.backend.cancellationCertain) {
      // Uzak iş sürüyor olabilir. Otomatik yeni dispatch/retry yerine operatör uzlaştırması gerekir.
      this.poisoned = true;
      for (const pending of this.waiting.splice(0)) { this.finish(pending); pending.reject(new ModelError('backend_reconciliation_required')); }
    }
  }
  private pump() {
    if (this.active || this.poisoned) return;
    const job = this.waiting.shift(); if (!job) return;
    this.active = job; job.running = true;
    const dispatched = performance.now();
    Promise.resolve().then(() => this.backend.generate(job.input, job.controller.signal)).then(result => {
      if (!job.done) { this.finish(job); job.resolve({ ...result, timing: { queueMs: dispatched - job.start, executionMs: performance.now() - dispatched, totalMs: performance.now() - job.start } }); }
    }, error => {
      // Bağlantı kaybında da uzak model işi hakkında kesin sonuç yoktur.
      if (!job.done) {
        if (error instanceof ModelError && error.code === 'backend_outcome_unknown') {
          this.poisoned = true;
          for (const pending of this.waiting.splice(0)) { this.finish(pending); pending.reject(new ModelError('backend_reconciliation_required')); }
        }
        this.finish(job); job.reject(error instanceof ModelError ? error : new ModelError('backend_failed'));
      }
    }).finally(() => { this.active = undefined; this.pump(); });
  }
}
