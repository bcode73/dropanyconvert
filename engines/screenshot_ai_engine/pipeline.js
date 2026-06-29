/**
 * Screenshot AI — Execution Pipeline
 *
 * 13-stage linear pipeline. Each stage is independently replaceable:
 * pass a custom stages map to override any stage without touching others.
 *
 * Architecture only. No AI calls, no I/O, no secrets.
 */

// ── Stage registry ───────────────────────────────────────────────────────────

export const STAGE_NAMES = [
  'upload-validation',
  'image-optimization',
  'vision-preprocessing',
  'ai-router',
  'provider-adapter',
  'response-validator',
  'code-formatter',
  'security-sanitizer',
  'framework-validator',
  'output-optimizer',
  'result-cache',
  'usage-accounting',
  'history-storage',
];

/**
 * Default no-op stage factory.
 * Real implementations are injected at server runtime.
 */
function _stub(name) {
  return async (ctx) => {
    ctx.trace.push({ stage: name, status: 'stub', ts: Date.now() });
    return ctx;
  };
}

export const DEFAULT_STAGES = Object.fromEntries(
  STAGE_NAMES.map(n => [n, _stub(n)])
);

// ── Pipeline context ─────────────────────────────────────────────────────────

/**
 * @typedef {object} PipelineContext
 * @property {string}   requestId
 * @property {string}   imageData       — base64 data URI
 * @property {string}   framework       — target framework slug
 * @property {string}   promptVersion   — prompt template version used
 * @property {string}   userId
 * @property {string}   plan            — free | pro | business
 * @property {object}   options         — per-request overrides
 * @property {object}   image           — populated by image-optimization stage
 * @property {string}   systemPrompt    — populated by vision-preprocessing stage
 * @property {string}   userMessage     — populated by vision-preprocessing stage
 * @property {object}   routerDecision  — populated by ai-router stage
 * @property {object}   providerResult  — populated by provider-adapter stage
 * @property {string}   rawCode         — populated by response-validator stage
 * @property {string}   formattedCode   — populated by code-formatter stage
 * @property {string}   sanitizedCode   — populated by security-sanitizer stage
 * @property {object}   validation      — populated by framework-validator stage
 * @property {string}   outputCode      — final output, populated by output-optimizer stage
 * @property {boolean}  cacheHit        — populated by result-cache stage
 * @property {object}   usage           — populated by usage-accounting stage
 * @property {object}   historyEntry    — populated by history-storage stage
 * @property {Array}    trace           — per-stage execution log
 * @property {Array}    errors          — non-fatal per-stage errors
 * @property {boolean}  aborted         — set true to short-circuit pipeline
 */

export function createContext(params = {}) {
  return {
    requestId:      params.requestId    ?? _uuid(),
    imageData:      params.imageData    ?? null,
    framework:      params.framework    ?? 'html',
    promptVersion:  params.promptVersion ?? 'v1',
    userId:         params.userId       ?? null,
    plan:           params.plan         ?? 'free',
    options:        params.options      ?? {},
    image:          null,
    systemPrompt:   null,
    userMessage:    null,
    routerDecision: null,
    providerResult: null,
    rawCode:        null,
    formattedCode:  null,
    sanitizedCode:  null,
    validation:     null,
    outputCode:     null,
    cacheHit:       false,
    usage:          null,
    historyEntry:   null,
    trace:          [],
    errors:         [],
    aborted:        false,
  };
}

// ── Pipeline executor ─────────────────────────────────────────────────────────

export class ExecutionPipeline {
  /**
   * @param {object} stages — map of stage-name → async function(ctx) → ctx
   */
  constructor(stages = {}) {
    this._stages = { ...DEFAULT_STAGES, ...stages };
  }

  /**
   * Replace a single stage without rebuilding the pipeline.
   * @param {string}   name
   * @param {Function} fn   async (ctx) => ctx
   */
  replaceStage(name, fn) {
    if (!STAGE_NAMES.includes(name)) {
      throw new Error(`Unknown pipeline stage: "${name}". Valid stages: ${STAGE_NAMES.join(', ')}`);
    }
    this._stages[name] = fn;
    return this;
  }

  /**
   * Execute the full pipeline sequentially.
   * Any stage may set ctx.aborted = true to halt execution.
   * @param {PipelineContext} ctx
   * @returns {Promise<PipelineContext>}
   */
  async run(ctx) {
    const start = Date.now();
    for (const name of STAGE_NAMES) {
      if (ctx.aborted) break;
      const stage = this._stages[name];
      const stageStart = Date.now();
      try {
        ctx = await stage(ctx);
        const entry = ctx.trace.find(t => t.stage === name && !t.durationMs);
        if (entry) entry.durationMs = Date.now() - stageStart;
      } catch (err) {
        ctx.errors.push({ stage: name, error: err.message });
        ctx.aborted = true;
        break;
      }
    }
    ctx.trace.push({ stage: 'pipeline', status: 'complete', totalMs: Date.now() - start });
    return ctx;
  }

  /** Inspect stage list without running. */
  describe() {
    return STAGE_NAMES.map(name => ({
      name,
      implemented: this._stages[name] !== DEFAULT_STAGES[name],
    }));
  }
}

export const defaultPipeline = new ExecutionPipeline();

// ── Helpers ───────────────────────────────────────────────────────────────────

function _uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
