/**
 * CloudAdapter — abstract interface for cloud document processing providers.
 *
 * ABSTRACTION ONLY. No cloud provider is integrated.
 *
 * Design contract:
 *   - Every cloud provider ships a subclass that implements all abstract methods.
 *   - The document pipeline calls only the public submit() method — provider
 *     internals (auth, endpoints, retry logic) are invisible to the pipeline.
 *   - The runtime (worker-adapter.js) selects the adapter based on engineMeta.runtime:
 *       'browser'  → no adapter used
 *       'hybrid'   → adapter used only if browser processing fails
 *       'cloud'    → adapter always used
 *   - No adapter is instantiated on tool pages whose engineMeta.runtime is 'browser'.
 *     This means zero cloud code is ever loaded for image tools.
 *
 * Future implementation path:
 *   1. Create /engines/document_engine/providers/ilovepdf-adapter.js (extends CloudAdapter)
 *   2. Register it in /engines/document_engine/index.js
 *   3. Set engineMeta.cloudProvider = 'ilovepdf' in the PDF engine
 *   4. worker-adapter.js reads engineMeta.cloudProvider and loads the adapter
 *
 * Error handling contract:
 *   - All methods must throw a PipelineError (not a raw Error) on failure.
 *   - normalizeError() converts provider-specific errors to PipelineError.
 *   - The pipeline wraps errors from submit() into engine result errors[], not throws.
 *
 * Security contract:
 *   - API keys must never appear in engine source or tool JSON files.
 *   - The adapter fetches credentials from a config endpoint or environment variable.
 *   - Files must be cleaned up after download even if download fails (finally block).
 */

import { PipelineError } from './pipeline.js';

// ── CloudAdapter base class ───────────────────────────────────────────────────

export class CloudAdapter {
  /**
   * @param {CloudAdapterConfig} config
   */
  constructor(config = {}) {
    if (new.target === CloudAdapter) {
      throw new Error(
        'CloudAdapter is abstract. Extend it in a provider-specific subclass.'
      );
    }
    this.config = {
      timeoutMs:  config.timeoutMs  ?? 120_000,
      maxRetries: config.maxRetries ?? 3,
      pollIntervalMs: config.pollIntervalMs ?? 2_000,
      ...config,
    };
  }

  // ── Abstract methods — subclasses must implement all of these ───────────────

  /**
   * Upload a File to the provider's staging area.
   *
   * @param {File} file
   * @param {UploadOptions} options
   * @returns {Promise<UploadResult>}
   */
  async upload(file, options = {}) {
    throw new Error(`${this.constructor.name}.upload() not implemented`);
  }

  /**
   * Create a processing job.
   *
   * @param {string} uploadId
   * @param {JobSpec} spec
   * @returns {Promise<JobResult>}
   */
  async createJob(uploadId, spec) {
    throw new Error(`${this.constructor.name}.createJob() not implemented`);
  }

  /**
   * Poll a job for its current status.
   * Implementations must use exponential backoff.
   *
   * @param {string} jobId
   * @returns {Promise<JobStatus>}
   */
  async pollJob(jobId) {
    throw new Error(`${this.constructor.name}.pollJob() not implemented`);
  }

  /**
   * Download the completed output.
   *
   * @param {string} jobId
   * @returns {Promise<Blob>}
   */
  async download(jobId) {
    throw new Error(`${this.constructor.name}.download() not implemented`);
  }

  /**
   * Release all server-side resources for a job.
   * Must be called in a finally block — must not throw.
   *
   * @param {string} jobId
   * @returns {Promise<void>}
   */
  async cleanup(jobId) {
    throw new Error(`${this.constructor.name}.cleanup() not implemented`);
  }

  /**
   * Convert a provider-specific error into a PipelineError.
   * Subclasses inspect HTTP status codes, provider error objects, etc.
   *
   * @param {any} err
   * @param {string} [context]   — which operation failed, e.g. 'upload'
   * @returns {PipelineError}
   */
  normalizeError(err, context = '') {
    throw new Error(`${this.constructor.name}.normalizeError() not implemented`);
  }

  // ── Concrete orchestration — subclasses do NOT override submit() ────────────

  /**
   * Full upload → create → poll → download → cleanup cycle.
   *
   * The pipeline calls only this method; provider details stay in the subclass.
   * Progress is reported to context.onProgress in the range 5–95.
   *
   * @param {File} file
   * @param {JobSpec} spec
   * @param {ToolContext} context
   * @returns {Promise<Blob>}
   */
  async submit(file, spec, context) {
    let uploadId = null;
    let jobId    = null;

    try {
      // Upload phase (5–15%)
      context.onProgress?.(5);
      let uploadResult;
      try {
        uploadResult = await this._withTimeout(this.upload(file, {}), 'upload');
      } catch (err) {
        throw this.normalizeError(err, 'upload');
      }
      uploadId = uploadResult.uploadId;
      context.onProgress?.(15);

      // Job creation (15–20%)
      let jobResult;
      try {
        jobResult = await this._withTimeout(this.createJob(uploadId, spec), 'createJob');
      } catch (err) {
        throw this.normalizeError(err, 'createJob');
      }
      jobId = jobResult.jobId;
      context.onProgress?.(20);

      // Poll until terminal state (20–90%)
      const result = await this._poll(jobId, context);

      // Download (90–95%)
      context.onProgress?.(90);
      let blob;
      try {
        blob = await this._withTimeout(this.download(jobId), 'download');
      } catch (err) {
        throw this.normalizeError(err, 'download');
      }
      context.onProgress?.(95);

      return blob;

    } finally {
      // Cleanup must always run — errors here are swallowed
      if (jobId) {
        await this.cleanup(jobId).catch(() => {});
      }
    }
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  /**
   * Poll until job reaches a terminal state.
   * Uses fixed interval (config.pollIntervalMs) up to maxRetries polling rounds
   * before giving up. Subclasses may override for adaptive backoff.
   */
  async _poll(jobId, context) {
    const maxWaitMs = this.config.timeoutMs;
    const interval  = this.config.pollIntervalMs;
    const start     = Date.now();

    while (Date.now() - start < maxWaitMs) {
      await sleep(interval);

      let status;
      try {
        status = await this.pollJob(jobId);
      } catch (err) {
        throw this.normalizeError(err, 'pollJob');
      }

      // Map progress: 20 + progress%*0.7 → 20–90
      context.onProgress?.(20 + Math.round((status.progress ?? 0) * 0.7));

      if (status.state === 'done')   return status;
      if (status.state === 'failed') {
        throw new PipelineError(
          'CLOUD_JOB_FAILED',
          status.error ?? `Cloud job ${jobId} failed`
        );
      }
      // 'pending' | 'running' → continue polling
    }

    throw new PipelineError(
      'CLOUD_TIMEOUT',
      `Cloud job ${jobId} timed out after ${this.config.timeoutMs / 1000}s`
    );
  }

  /**
   * Wrap a promise with a timeout.
   */
  async _withTimeout(promise, operation) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new PipelineError('CLOUD_TIMEOUT', `${operation} timed out`));
      }, this.config.timeoutMs);

      promise.then(
        (v) => { clearTimeout(timer); resolve(v); },
        (e) => { clearTimeout(timer); reject(e); }
      );
    });
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Cloud Adapter Registry ────────────────────────────────────────────────────

/**
 * Central registry for cloud adapter instances.
 * Engines register their adapter here; worker-adapter.js resolves by providerId.
 *
 * Example (in a future provider file):
 *   import { adapterRegistry } from '../document_engine/cloud-adapter.js';
 *   adapterRegistry.register('ilovepdf', new ILovePdfAdapter({ ... }));
 *
 * Example (in worker-adapter.js):
 *   const adapter = adapterRegistry.resolve(engineMeta.cloudProvider);
 *   const blob = await adapter.submit(file, spec, context);
 */
export const adapterRegistry = {
  _adapters: new Map(),

  /**
   * @param {string} providerId
   * @param {CloudAdapter} adapter
   */
  register(providerId, adapter) {
    if (!(adapter instanceof CloudAdapter)) {
      throw new Error(`adapterRegistry.register: "${providerId}" must extend CloudAdapter`);
    }
    this._adapters.set(providerId, adapter);
  },

  /**
   * @param {string} providerId
   * @returns {CloudAdapter}
   */
  resolve(providerId) {
    const adapter = this._adapters.get(providerId);
    if (!adapter) {
      throw new PipelineError(
        'NO_CLOUD_ADAPTER',
        `No cloud adapter registered for provider "${providerId}". ` +
        `Register one with adapterRegistry.register('${providerId}', adapter).`
      );
    }
    return adapter;
  },

  has(providerId) {
    return this._adapters.has(providerId);
  },
};

/**
 * Type documentation:
 *
 * @typedef {object} CloudAdapterConfig
 * @property {string}  [apiKey]            — loaded from secure config, never hardcoded
 * @property {string}  [endpoint]          — provider API base URL
 * @property {number}  [timeoutMs=120000]  — per-operation timeout
 * @property {number}  [maxRetries=3]      — max retry attempts
 * @property {number}  [pollIntervalMs=2000]
 *
 * @typedef {object} UploadOptions
 * @property {function} [onProgress]       — (pct: number) => void
 *
 * @typedef {object} UploadResult
 * @property {string} uploadId
 * @property {string} [url]               — signed URL if provider uses direct upload
 * @property {string} [expiresAt]         — ISO 8601
 *
 * @typedef {object} JobSpec
 * @property {string} operation           — e.g. 'compress', 'merge', 'ocr'
 * @property {object} [params]            — operation-specific parameters
 * @property {string} [outputFormat]      — desired output MIME or extension
 *
 * @typedef {object} JobResult
 * @property {string} jobId
 * @property {string} [statusUrl]
 * @property {number} [estimatedSeconds]
 *
 * @typedef {object} JobStatus
 * @property {'pending'|'running'|'done'|'failed'} state
 * @property {number} progress            — 0–100
 * @property {string} [error]             — only when state === 'failed'
 */
