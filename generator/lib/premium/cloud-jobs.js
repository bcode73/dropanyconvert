/**
 * Phase 21 — Cloud Job Architecture
 *
 * Model for server-side file processing jobs.
 * State machine, job schema, and transition rules.
 * No queue implementation — architecture only.
 */

// ── Job states ────────────────────────────────────────────────────────────

export const JOB_STATE = {
  QUEUED:     'queued',
  UPLOADING:  'uploading',
  PROCESSING: 'processing',
  COMPLETED:  'completed',
  FAILED:     'failed',
  EXPIRED:    'expired',
  CANCELLED:  'cancelled',
  RETRY:      'retry',
};

// ── Valid state transitions ────────────────────────────────────────────────

export const STATE_TRANSITIONS = {
  [JOB_STATE.QUEUED]:     [JOB_STATE.UPLOADING,  JOB_STATE.CANCELLED],
  [JOB_STATE.UPLOADING]:  [JOB_STATE.PROCESSING, JOB_STATE.FAILED, JOB_STATE.CANCELLED],
  [JOB_STATE.PROCESSING]: [JOB_STATE.COMPLETED,  JOB_STATE.FAILED,  JOB_STATE.RETRY],
  [JOB_STATE.FAILED]:     [JOB_STATE.RETRY,      JOB_STATE.CANCELLED],
  [JOB_STATE.RETRY]:      [JOB_STATE.QUEUED],
  [JOB_STATE.COMPLETED]:  [JOB_STATE.EXPIRED],
  [JOB_STATE.CANCELLED]:  [],
  [JOB_STATE.EXPIRED]:    [],
};

export function canTransition(from, to) {
  return (STATE_TRANSITIONS[from] || []).includes(to);
}

// ── Job priority ──────────────────────────────────────────────────────────

export const JOB_PRIORITY = {
  HIGH:   'high',    // Pro/Business + priority queue flag
  NORMAL: 'normal',  // Free/Pro without priority
  LOW:    'low',     // background reprocessing
};

// ── Job model ─────────────────────────────────────────────────────────────

export function createCloudJob({
  userId,
  toolSlug,
  inputFile,
  outputFormat,
  options = {},
  priority = JOB_PRIORITY.NORMAL,
}) {
  const now = new Date().toISOString();
  return {
    id:           `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    toolSlug,

    // Input
    input: {
      fileName:    inputFile.name,
      mimeType:    inputFile.mimeType,
      sizeBytes:   inputFile.sizeBytes,
      storageRef:  null,   // filled after upload
      checksum:    null,   // filled after upload (SHA-256)
    },

    // Output request
    output: {
      format:      outputFormat,
      options,
      fileName:    null,   // filled after completion
      sizeBytes:   null,
      storageRef:  null,
      downloadUrl: null,
      expiresAt:   null,
    },

    // Execution
    state:       JOB_STATE.QUEUED,
    priority,
    attempts:    0,
    maxAttempts: 3,
    workerId:    null,   // assigned when processing starts

    // Timing
    queuedAt:    now,
    startedAt:   null,
    completedAt: null,
    expiresAt:   null,  // set on completion (download window)

    // Error info
    error: null,  // { code, message, retryable }

    // Audit
    createdAt: now,
    updatedAt: now,
  };
}

// ── Job progress event model ──────────────────────────────────────────────

export function createJobEvent(jobId, state, meta = {}) {
  return {
    jobId,
    state,
    at:      new Date().toISOString(),
    percent: meta.percent ?? null,
    message: meta.message ?? null,
    error:   meta.error   ?? null,
  };
}

// ── Error model ───────────────────────────────────────────────────────────

export const JOB_ERROR = {
  UPLOAD_FAILED:       { code: 'upload_failed',       retryable: true  },
  FILE_TOO_LARGE:      { code: 'file_too_large',      retryable: false },
  UNSUPPORTED_FORMAT:  { code: 'unsupported_format',  retryable: false },
  PROCESSING_FAILED:   { code: 'processing_failed',   retryable: true  },
  TIMEOUT:             { code: 'timeout',             retryable: true  },
  QUOTA_EXCEEDED:      { code: 'quota_exceeded',      retryable: false },
  WORKER_UNAVAILABLE:  { code: 'worker_unavailable',  retryable: true  },
  STORAGE_ERROR:       { code: 'storage_error',       retryable: true  },
  CORRUPTED_FILE:      { code: 'corrupted_file',      retryable: false },
};

// ── Job queue interface ───────────────────────────────────────────────────
// Concrete implementations (BullMQ, Inngest, Upstash…) implement this.

export const JOB_QUEUE_INTERFACE = {
  enqueue:    async (job) => { throw new Error('not implemented'); },
  cancel:     async (jobId) => { throw new Error('not implemented'); },
  getStatus:  async (jobId) => { throw new Error('not implemented'); },
  listByUser: async (userId, opts) => { throw new Error('not implemented'); },
  retry:      async (jobId) => { throw new Error('not implemented'); },
  expire:     async (jobId) => { throw new Error('not implemented'); },
};
