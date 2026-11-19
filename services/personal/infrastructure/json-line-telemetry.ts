import { profiles } from "../../shared/contracts.js";
import type { MetricLabels, MetricName, MetricSample, Telemetry, TraceEvent } from "../application/ports.js";

// E10 maskeleme henüz yok; TH06 koruması için log satırına yalnız açıkça izinli 10 alan girer.
const ALLOWED_EVENT_STRINGS = [
  "at",
  "event",
  "traceId",
  "jobId",
  "childId",
  "agentId",
  "remoteTaskId",
  "outcome",
  "errorCode",
] as const;

// Uzak ajan kaynaklı kimliklerin (agentId/remoteTaskId) log satırını şişirmesini önler.
const MAX_FIELD_LENGTH = 256;

const DEFAULT_BUCKETS_MS = [10, 50, 100, 250, 500, 1000, 2500, 5000, 15000, 60000] as const;

const ALLOWED_SKILLS = new Set<string>(Object.keys(profiles));
const ALLOWED_OUTCOMES = new Set<string>([
  "accepted",
  "existing",
  "rejected",
  "completed",
  "partial",
  "failed",
  "unknown",
]);
const ALLOWED_ERROR_CODES = new Set<string>([
  "none",
  // SubmitError
  "forbidden",
  "invalid_idempotency_key",
  "invalid_job",
  "invalid_text",
  "idempotency_conflict",
  "job_capacity",
  // DiscoveryCode
  "discovery_failed",
  "invalid_registry_response",
  "no_provider",
  // Yürütme ve kurtarma kodları
  "provider_failed",
  "terminal_result_unavailable",
  "deadline_exceeded",
  "execution_unknown",
  "personal_restarted",
]);

export interface CounterSnapshot {
  name: MetricName;
  labels: Readonly<Record<string, string>>;
  value: number;
}
export interface HistogramSnapshot {
  name: MetricName;
  labels: Readonly<Record<string, string>>;
  count: number;
  sum: number;
  buckets: Readonly<Record<string, number>>;
}
export interface GaugeSnapshot {
  name: MetricName;
  labels: Readonly<Record<string, string>>;
  value: number;
}
export interface MetricsSnapshot {
  counters: CounterSnapshot[];
  histograms: HistogramSnapshot[];
  gauges: GaugeSnapshot[];
}

export interface JsonLineTelemetryOptions {
  /** Varsayılan stdout'a tek satır NDJSON yazar; testler diziye yönlendirip sessiz çalışır. */
  write?: (line: string) => void;
  bucketsMs?: readonly number[];
}

interface CounterEntry { name: MetricName; labels: Record<string, string>; value: number }
interface GaugeEntry { name: MetricName; labels: Record<string, string>; value: number }
interface HistogramEntry {
  name: MetricName;
  labels: Record<string, string>;
  count: number;
  sum: number;
  buckets: Record<string, number>;
}

/**
 * Telemetry portunun JSON-satır loglayıcı ve bellek içi metrik uygulaması.
 * Olaylarda sıkı allowlist, metriklerde kapalı etiket kümesi (sınırlı cardinality) zorlar.
 */
export class JsonLineTelemetry implements Telemetry {
  private readonly write: (line: string) => void;
  private readonly bucketsMs: readonly number[];
  private readonly counters = new Map<string, CounterEntry>();
  private readonly histograms = new Map<string, HistogramEntry>();
  private readonly gauges = new Map<string, GaugeEntry>();

  constructor(options: JsonLineTelemetryOptions = {}) {
    this.write = options.write ?? (line => { process.stdout.write(`${line}\n`); });
    this.bucketsMs = [...(options.bucketsMs ?? DEFAULT_BUCKETS_MS)]
      .filter(value => Number.isFinite(value) && value >= 0)
      .sort((a, b) => a - b);
  }

  event(entry: TraceEvent): void {
    try {
      const source = entry as unknown as Record<string, unknown>;
      const sanitized: Record<string, string | number> = {};
      // Yalnız açıkça izinli anahtarlar kopyalanır; fazladan geçilen gizli alanlar hiç okunmaz.
      for (const field of ALLOWED_EVENT_STRINGS) {
        const value = source[field];
        if (typeof value === "string" && value.length > 0) {
          sanitized[field] = value.length > MAX_FIELD_LENGTH ? value.slice(0, MAX_FIELD_LENGTH) : value;
        }
      }
      const duration = source.durationMs;
      if (typeof duration === "number" && Number.isFinite(duration) && duration >= 0) {
        sanitized.durationMs = duration;
      }
      this.write(JSON.stringify(sanitized));
    } catch {
      // Yazım/serileştirme hatası iş yürütmesini hiçbir koşulda kesmemelidir.
    }
  }

  metric(sample: MetricSample): void {
    try {
      if (typeof sample.value !== "number" || !Number.isFinite(sample.value)) return;
      const labels = normalizeLabels(sample.labels);
      const key = seriesKey(sample.name, labels);
      if (sample.kind === "counter") {
        if (sample.value < 0) return;
        const current = this.counters.get(key) ?? { name: sample.name, labels, value: 0 };
        current.value += sample.value;
        this.counters.set(key, current);
      } else if (sample.kind === "gauge") {
        this.gauges.set(key, { name: sample.name, labels, value: sample.value });
      } else if (sample.kind === "histogram") {
        if (sample.value < 0) return;
        const current = this.histograms.get(key) ?? createHistogram(sample.name, labels, this.bucketsMs);
        current.count += 1;
        current.sum += sample.value;
        for (const bound of this.bucketsMs) {
          if (sample.value <= bound) current.buckets[String(bound)] += 1;
        }
        current.buckets["+Inf"] += 1;
        this.histograms.set(key, current);
      }
    } catch {
      // Metrik kaydı hatası iş yürütmesini hiçbir koşulda kesmemelidir.
    }
  }

  /** Test ve doğrulama için iç durumu dış mutasyona kapatan bellek görünümü. */
  metricsSnapshot(): MetricsSnapshot {
    return {
      counters: [...this.counters.values()].map(c => ({ name: c.name, labels: { ...c.labels }, value: c.value })),
      histograms: [...this.histograms.values()].map(h => ({
        name: h.name,
        labels: { ...h.labels },
        count: h.count,
        sum: h.sum,
        buckets: { ...h.buckets },
      })),
      gauges: [...this.gauges.values()].map(g => ({ name: g.name, labels: { ...g.labels }, value: g.value })),
    };
  }
}

function normalizeValue(value: unknown, allowed: ReadonlySet<string>): string {
  return typeof value === "string" && allowed.has(value) ? value : "other";
}

/**
 * Yalnız üç sınırlı etiket anahtarı (skill, outcome, errorCode) kabul edilir.
 * Yüksek cardinality alanlar (jobId, agentId vb.) atılır; bilinmeyen değerler "other" olur.
 */
function normalizeLabels(raw?: MetricLabels): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const result: Record<string, string> = {};
  if (raw.skill !== undefined) result.skill = normalizeValue(raw.skill, ALLOWED_SKILLS);
  if (raw.outcome !== undefined) result.outcome = normalizeValue(raw.outcome, ALLOWED_OUTCOMES);
  if (raw.errorCode !== undefined) result.errorCode = normalizeValue(raw.errorCode, ALLOWED_ERROR_CODES);
  return result;
}

function seriesKey(name: MetricName, labels: Record<string, string>): string {
  return `${name}|skill=${labels.skill ?? ""}|outcome=${labels.outcome ?? ""}|errorCode=${labels.errorCode ?? ""}`;
}

function createHistogram(name: MetricName, labels: Record<string, string>, bucketsMs: readonly number[]): HistogramEntry {
  const buckets: Record<string, number> = {};
  for (const bound of bucketsMs) buckets[String(bound)] = 0;
  buckets["+Inf"] = 0;
  return { name, labels, count: 0, sum: 0, buckets };
}
