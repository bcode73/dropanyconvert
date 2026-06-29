/**
 * Screenshot AI — Queue System
 *
 * Priority queue with retries, cancellation, timeout, concurrency limits,
 * batch execution, and webhook completion hooks.
 *
 * Architecture only. Job execution delegates to the pipeline at server runtime.
 */

// ── Priority levels ───────────────────────────────────────────────────────────

export const PRIORITY = { HIGH: 0, NORMAL: 1, LOW: 2 };

// Plan → default priority
export const PLAN_PRIORITY = {
  business: PRIORITY.HIGH,
  pro:      PRIORITY.NORMAL,
  free:     PRIORITY.LOW,
};

// ── Job states ────────────────────────────────────────────────────────────────

export const JOB_STATE = {
  PENDING:    'pending',
  RUNNING:    'running',
  COMPLETE:   'complete',
  FAILED:     'failed',
  CANCELLED:  'cancelled',
  TIMED_OUT:  'timed_out',
};

// ── Job factory ───────────────────────────────────────────────────────────────

let _seq = 0;

/**
 * @typedef {object} Job
 * @property {string}   id
 * @property {string}   userId
 * @property {string}   framework
 * @property {number}   priority         — PRIORITY constant
 * @property {number}   maxRetries
 * @property {number}   retryCount
 * @property {number}   timeoutMs
 * @property {number}   createdAt
 * @property {number}   startedAt
 * @property {number}   completedAt
 * @property {string}   state            — JOB_STATE constant
 * @property {string}   webhookUrl       — optional completion callback
 * @property {Function} cancelFn         — internal cancel handle
 * @property {object}   result
 * @property {string}   error
 */

export function createJob({
  userId,
  framework,
  imageData,
  promptVersion,
  options = {},
  priority,
  plan = 'free',
  webhookUrl = null,
  maxRetries = 2,
  timeoutMs  = 60_000,
}) {
  return {
    id:          `job_${Date.now().toString(36)}_${(++_seq).toString(36)}`,
    userId,
    framework,
    imageData,
    promptVersion,
    options,
    priority:    priority ?? PLAN_PRIORITY[plan] ?? PRIORITY.LOW,
    plan,
    maxRetries,
    retryCount:  0,
    timeoutMs,
    webhookUrl,
    createdAt:   Date.now(),
    startedAt:   null,
    completedAt: null,
    state:       JOB_STATE.PENDING,
    cancelFn:    null,
    result:      null,
    error:       null,
  };
}

// ── Queue ─────────────────────────────────────────────────────────────────────

export class AiJobQueue {
  /**
   * @param {object} opts
   * @param {number} opts.concurrency    — max simultaneous jobs
   * @param {number} opts.maxQueueDepth  — reject new jobs when full
   */
  constructor({ concurrency = 5, maxQueueDepth = 100 } = {}) {
    this._concurrency    = concurrency;
    this._maxQueueDepth  = maxQueueDepth;
    this._pending        = [];   // sorted by priority then createdAt
    this._running        = new Map();  // id → job
    this._completed      = new Map();  // id → job (capped at 1000)
    this._executor       = null; // set at runtime
    this._webhookFn      = null; // set at runtime
    this._metrics        = { enqueued: 0, completed: 0, failed: 0, cancelled: 0, timedOut: 0 };
  }

  /** Inject the execution function (pipeline.run) at server runtime. */
  setExecutor(fn) { this._executor = fn; return this; }

  /** Inject webhook dispatcher at server runtime. */
  setWebhookDispatcher(fn) { this._webhookFn = fn; return this; }

  /**
   * Enqueue a job.
   * @param {Job} job
   * @returns {{ accepted: boolean, jobId: string|null, reason: string|null }}
   */
  enqueue(job) {
    if (this._pending.length >= this._maxQueueDepth) {
      return { accepted: false, jobId: null, reason: 'Queue is full — try again later' };
    }
    this._pending.push(job);
    this._pending.sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt);
    this._metrics.enqueued++;
    this._tick();
    return { accepted: true, jobId: job.id, reason: null };
  }

  /**
   * Cancel a pending or running job.
   * @param {string} jobId
   * @returns {boolean}
   */
  cancel(jobId) {
    // Cancel pending
    const pendingIdx = this._pending.findIndex(j => j.id === jobId);
    if (pendingIdx !== -1) {
      const [job] = this._pending.splice(pendingIdx, 1);
      job.state = JOB_STATE.CANCELLED;
      job.completedAt = Date.now();
      this._complete(job);
      this._metrics.cancelled++;
      return true;
    }
    // Cancel running
    const running = this._running.get(jobId);
    if (running?.cancelFn) {
      running.cancelFn();
      running.state = JOB_STATE.CANCELLED;
      running.completedAt = Date.now();
      this._running.delete(jobId);
      this._complete(running);
      this._metrics.cancelled++;
      this._tick();
      return true;
    }
    return false;
  }

  /**
   * Get job status by ID.
   * @param {string} jobId
   * @returns {Job|null}
   */
  getJob(jobId) {
    return this._running.get(jobId)
      ?? this._completed.get(jobId)
      ?? this._pending.find(j => j.id === jobId)
      ?? null;
  }

  /** Queue depth and running count. */
  status() {
    return {
      pending:     this._pending.length,
      running:     this._running.size,
      concurrency: this._concurrency,
      metrics:     { ...this._metrics },
    };
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  _tick() {
    while (this._running.size < this._concurrency && this._pending.length > 0) {
      const job = this._pending.shift();
      this._startJob(job);
    }
  }

  async _startJob(job) {
    job.state     = JOB_STATE.RUNNING;
    job.startedAt = Date.now();
    this._running.set(job.id, job);

    if (!this._executor) {
      job.state       = JOB_STATE.FAILED;
      job.error       = 'No executor registered — server runtime not active';
      job.completedAt = Date.now();
      this._running.delete(job.id);
      this._complete(job);
      this._metrics.failed++;
      this._tick();
      return;
    }

    // Timeout race
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      cancelled = true;
      job.state       = JOB_STATE.TIMED_OUT;
      job.error       = `Timed out after ${job.timeoutMs}ms`;
      job.completedAt = Date.now();
      this._running.delete(job.id);
      this._complete(job);
      this._metrics.timedOut++;
      this._tick();
    }, job.timeoutMs);

    job.cancelFn = () => { cancelled = true; clearTimeout(timeoutId); };

    try {
      const result = await this._executor(job);
      if (cancelled) return;
      clearTimeout(timeoutId);
      job.state       = JOB_STATE.COMPLETE;
      job.result      = result;
      job.completedAt = Date.now();
      this._running.delete(job.id);
      this._complete(job);
      this._metrics.completed++;
    } catch (err) {
      if (cancelled) return;
      clearTimeout(timeoutId);
      job.retryCount++;
      if (job.retryCount <= job.maxRetries) {
        const delay = 1000 * Math.pow(2, job.retryCount - 1);
        job.state = JOB_STATE.PENDING;
        this._running.delete(job.id);
        setTimeout(() => { this._pending.unshift(job); this._tick(); }, delay);
      } else {
        job.state       = JOB_STATE.FAILED;
        job.error       = err.message;
        job.completedAt = Date.now();
        this._running.delete(job.id);
        this._complete(job);
        this._metrics.failed++;
      }
    }
    this._tick();
  }

  _complete(job) {
    this._completed.set(job.id, job);
    // Cap completed history at 1000
    if (this._completed.size > 1000) {
      const firstKey = this._completed.keys().next().value;
      this._completed.delete(firstKey);
    }
    // Fire webhook
    if (job.webhookUrl && this._webhookFn) {
      this._webhookFn(job.webhookUrl, { jobId: job.id, state: job.state, result: job.result, error: job.error })
        .catch(() => {});
    }
  }
}

export const defaultQueue = new AiJobQueue({ concurrency: 5, maxQueueDepth: 200 });

// ── Batch execution ───────────────────────────────────────────────────────────

/**
 * Enqueue multiple jobs and return their IDs.
 * @param {AiJobQueue} queue
 * @param {Job[]}      jobs
 * @returns {{ jobId: string, accepted: boolean, reason: string|null }[]}
 */
export function enqueueBatch(queue, jobs) {
  return jobs.map(job => ({ job, ...queue.enqueue(job) }))
    .map(({ job, accepted, jobId, reason }) => ({ jobId: jobId ?? job.id, accepted, reason }));
}
