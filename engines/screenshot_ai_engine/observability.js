/**
 * Screenshot AI — Observability & Metrics
 *
 * Collects generation metrics for admin dashboard and provider health.
 * In-memory accumulator — flush to your metrics store (Prometheus, Datadog, etc.)
 * at server runtime.
 */

// ── Metric types ──────────────────────────────────────────────────────────────

export const METRIC = {
  PROVIDER_LATENCY:    'provider_latency_ms',
  GENERATION_TIME:     'generation_time_ms',
  CACHE_HIT:           'cache_hit',
  CACHE_MISS:          'cache_miss',
  RETRY:               'retry',
  FAILURE:             'failure',
  CREDITS_CONSUMED:    'credits_consumed',
  IMAGE_SIZE_BYTES:    'image_size_bytes',
  FRAMEWORK_REQUEST:   'framework_request',
};

// ── Collector ─────────────────────────────────────────────────────────────────

export class MetricsCollector {
  constructor() {
    this._reset();
  }

  _reset() {
    this._latencies     = {};   // provider → number[]
    this._genTimes      = [];   // number[]
    this._cacheHits     = 0;
    this._cacheMisses   = 0;
    this._retries       = 0;
    this._failures      = 0;
    this._credits       = 0;
    this._imageSizes    = [];   // bytes
    this._frameworks    = {};   // framework → count
    this._startTs       = Date.now();
    this._eventCount    = 0;
  }

  /**
   * Record a completed generation event.
   * @param {object} e
   * @param {string} e.provider
   * @param {string} e.framework
   * @param {number} e.providerLatencyMs
   * @param {number} e.totalGenerationMs
   * @param {boolean} e.cacheHit
   * @param {boolean} e.wasRetry
   * @param {boolean} e.failed
   * @param {number} e.creditsConsumed
   * @param {number} e.imageSizeBytes
   */
  record(e) {
    this._eventCount++;

    if (e.providerLatencyMs) {
      if (!this._latencies[e.provider]) this._latencies[e.provider] = [];
      this._latencies[e.provider].push(e.providerLatencyMs);
    }

    if (e.totalGenerationMs) this._genTimes.push(e.totalGenerationMs);

    if (e.cacheHit)   this._cacheHits++;
    else              this._cacheMisses++;
    if (e.wasRetry)   this._retries++;
    if (e.failed)     this._failures++;

    this._credits += e.creditsConsumed ?? 0;
    if (e.imageSizeBytes) this._imageSizes.push(e.imageSizeBytes);
    if (e.framework) this._frameworks[e.framework] = (this._frameworks[e.framework] ?? 0) + 1;
  }

  /**
   * Compute a full metrics snapshot.
   * @returns {object}
   */
  snapshot() {
    const total = this._cacheHits + this._cacheMisses;
    return {
      window_ms:          Date.now() - this._startTs,
      total_requests:     this._eventCount,

      // Latency per provider (p50 / p95)
      provider_latency:   _summarizeByGroup(this._latencies),

      // Overall generation time
      generation_time:    _summarize(this._genTimes),

      // Cache
      cache_hit_rate:     total ? this._cacheHits / total : 0,
      cache_hits:         this._cacheHits,
      cache_misses:       this._cacheMisses,

      // Reliability
      retry_rate:         this._eventCount ? this._retries / this._eventCount : 0,
      failure_rate:       this._eventCount ? this._failures / this._eventCount : 0,
      retries:            this._retries,
      failures:           this._failures,

      // Usage
      total_credits:      this._credits,
      avg_credits:        this._eventCount ? this._credits / this._eventCount : 0,

      // Image
      avg_image_bytes:    _avg(this._imageSizes),
      max_image_bytes:    this._imageSizes.length ? Math.max(...this._imageSizes) : 0,

      // Framework popularity (sorted)
      framework_popularity: Object.entries(this._frameworks)
        .sort((a, b) => b[1] - a[1])
        .map(([framework, count]) => ({ framework, count })),
    };
  }

  /** Reset all counters (e.g. at midnight or on flush). */
  reset() { this._reset(); }
}

export const defaultMetrics = new MetricsCollector();

// ── Admin dashboard hooks ──────────────────────────────────────────────────────

/**
 * Build the admin dashboard metrics payload.
 * Combines observability snapshot with queue + cache stats.
 *
 * @param {object} p
 * @param {MetricsCollector} p.metrics
 * @param {object}           p.queueStatus   — from queue.status()
 * @param {object}           p.cacheStats    — from cache.cacheStats()
 * @param {object}           p.routerHealth  — from router.healthSummary()
 * @returns {object}
 */
export function buildAdminMetrics({ metrics, queueStatus, cacheStats, routerHealth }) {
  const snap = metrics.snapshot();
  return {
    generated_at:       new Date().toISOString(),

    // Requests
    ai_requests:        snap.total_requests,
    failure_rate_pct:   +(snap.failure_rate * 100).toFixed(2),
    retry_rate_pct:     +(snap.retry_rate   * 100).toFixed(2),

    // Provider health
    provider_health:    routerHealth ?? {},
    provider_latency:   snap.provider_latency,

    // Queue
    queue_depth:        queueStatus?.pending ?? 0,
    queue_running:      queueStatus?.running ?? 0,
    queue_metrics:      queueStatus?.metrics ?? {},

    // Credits
    monthly_credits:    snap.total_credits,
    avg_credits_per_req: +snap.avg_credits.toFixed(3),

    // Cache
    cache_hit_rate_pct: +(snap.cache_hit_rate * 100).toFixed(2),
    cache_entries:      cacheStats?.valid ?? 0,
    cache_total_hits:   cacheStats?.totalHits ?? 0,

    // Errors
    error_trends:       { total_failures: snap.failures, window_ms: snap.window_ms },

    // Framework popularity
    top_frameworks:     snap.framework_popularity.slice(0, 5),
  };
}

// ── Stat helpers ───────────────────────────────────────────────────────────────

function _summarize(arr) {
  if (!arr.length) return { p50: 0, p95: 0, avg: 0, count: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  return {
    p50:   sorted[Math.floor(sorted.length * 0.5)],
    p95:   sorted[Math.floor(sorted.length * 0.95)],
    avg:   +_avg(sorted).toFixed(1),
    count: sorted.length,
  };
}

function _summarizeByGroup(grouped) {
  return Object.fromEntries(
    Object.entries(grouped).map(([k, arr]) => [k, _summarize(arr)])
  );
}

function _avg(arr) {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}
