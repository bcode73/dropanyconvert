/**
 * Screenshot AI — Cost Optimizer
 *
 * Estimates tokens, latency, and provider cost before committing to a request.
 * Supports provider comparison and monthly burn projection.
 *
 * All figures are estimates. Actual billing comes from the provider response.
 */

// ── Provider pricing table (per 1M tokens) ────────────────────────────────────

export const PROVIDER_PRICING = {
  deepseek: {
    inputPerM:  0.27,
    outputPerM: 1.10,
    model:      'deepseek-vl2',
    latencyMs:  { p50: 2500, p95: 8000 },
  },
  openai: {
    inputPerM:  2.50,
    outputPerM: 10.00,
    model:      'gpt-4o',
    latencyMs:  { p50: 3000, p95: 12000 },
  },
  anthropic: {
    inputPerM:  3.00,
    outputPerM: 15.00,
    model:      'claude-sonnet-4-6',
    latencyMs:  { p50: 3500, p95: 14000 },
  },
  gemini: {
    inputPerM:  0.10,
    outputPerM: 0.40,
    model:      'gemini-2.0-flash',
    latencyMs:  { p50: 2000, p95: 7000 },
  },
  openrouter: {
    inputPerM:  3.00,
    outputPerM: 15.00,
    model:      'auto',
    latencyMs:  { p50: 4000, p95: 15000 },
  },
  ollama: {
    inputPerM:  0,
    outputPerM: 0,
    model:      'llava',
    latencyMs:  { p50: 5000, p95: 20000 },
  },
};

// ── Token estimation ──────────────────────────────────────────────────────────

/** Approximate tokens for image by provider vision encoding scheme. */
export function estimateImageTokens(provider, width, height) {
  switch (provider) {
    case 'openai':
    case 'openrouter': {
      // GPT-4o tile formula: 512×512 tiles = 170 tokens each + 85 base
      const tiles = Math.ceil(width / 512) * Math.ceil(height / 512);
      return 85 + tiles * 170;
    }
    case 'anthropic': {
      // Claude: (w * h) / 750
      return Math.ceil((width * height) / 750);
    }
    case 'gemini': {
      // Gemini Flash: fixed 258 tokens per image
      return 258;
    }
    case 'deepseek': {
      // DeepSeek VL2: tile-based, similar to GPT-4o
      const tiles = Math.ceil(width / 448) * Math.ceil(height / 448);
      return 256 + tiles * 256;
    }
    default:
      return 1000; // conservative estimate
  }
}

/** Approximate expected output tokens by framework complexity. */
export function estimateOutputTokens(framework) {
  const OUTPUT_TOKENS = {
    // Simple markup
    html: 800, 'html-css': 1000, tailwind: 900, bootstrap: 900,
    alpine: 900, email: 1200, svg: 700, 'css-grid': 1000, wireframe: 600,
    // Component frameworks
    react: 1200, nextjs: 1400, vue: 1100, svelte: 1000, angular: 1400,
    blazor: 1100,
    // Mobile / native
    flutter: 1600, swiftui: 1400, 'react-native': 1200, 'jetpack-compose': 1500,
    // Structured data
    'component-tree': 500,
  };
  return OUTPUT_TOKENS[framework] ?? 1000;
}

// ── Cost estimation ───────────────────────────────────────────────────────────

/**
 * Estimate cost for a single generation.
 * @param {object} p
 * @param {string} p.provider
 * @param {string} p.framework
 * @param {number} p.imageWidth
 * @param {number} p.imageHeight
 * @param {number} [p.systemPromptTokens]  — default 200
 * @returns {{ inputTokens, outputTokens, imageTokens, totalInputTokens, estimatedCostUsd, p50LatencyMs, p95LatencyMs }}
 */
export function estimateCost({ provider, framework, imageWidth, imageHeight, systemPromptTokens = 200 }) {
  const pricing = PROVIDER_PRICING[provider];
  if (!pricing) throw new Error(`Unknown provider: "${provider}"`);

  const imageTokens  = estimateImageTokens(provider, imageWidth, imageHeight);
  const outputTokens = estimateOutputTokens(framework);
  const totalInput   = imageTokens + systemPromptTokens;

  const costUsd = (totalInput / 1_000_000) * pricing.inputPerM
                + (outputTokens / 1_000_000) * pricing.outputPerM;

  return {
    inputTokens:     systemPromptTokens,
    imageTokens,
    totalInputTokens: totalInput,
    outputTokens,
    estimatedCostUsd: +costUsd.toFixed(6),
    p50LatencyMs:    pricing.latencyMs.p50,
    p95LatencyMs:    pricing.latencyMs.p95,
    model:           pricing.model,
  };
}

// ── Provider comparison ───────────────────────────────────────────────────────

/**
 * Compare all providers for a given request.
 * Returns sorted by estimated cost (cheapest first).
 * @param {{ framework, imageWidth, imageHeight }} params
 * @returns {Array<{ provider, ...estimateCost result }>}
 */
export function compareProviders({ framework, imageWidth, imageHeight }) {
  return Object.keys(PROVIDER_PRICING)
    .map(provider => ({
      provider,
      ...estimateCost({ provider, framework, imageWidth, imageHeight }),
    }))
    .sort((a, b) => a.estimatedCostUsd - b.estimatedCostUsd);
}

// ── Monthly burn projection ───────────────────────────────────────────────────

/**
 * Project monthly cost given a daily request volume.
 * @param {object} p
 * @param {string} p.provider
 * @param {string} p.framework
 * @param {number} p.imageWidth
 * @param {number} p.imageHeight
 * @param {number} p.dailyRequests
 * @param {number} [p.cacheHitRate]  — fraction 0–1, default 0.3
 * @returns {{ dailyCostUsd, monthlyCostUsd, cachedRequests, billedRequests }}
 */
export function projectMonthlyBurn({ provider, framework, imageWidth, imageHeight, dailyRequests, cacheHitRate = 0.3 }) {
  const { estimatedCostUsd } = estimateCost({ provider, framework, imageWidth, imageHeight });
  const billedRequests = dailyRequests * (1 - cacheHitRate);
  const dailyCostUsd   = billedRequests * estimatedCostUsd;
  return {
    dailyCostUsd:    +dailyCostUsd.toFixed(4),
    monthlyCostUsd:  +(dailyCostUsd * 30).toFixed(2),
    cachedRequests:  +(dailyRequests * cacheHitRate).toFixed(0),
    billedRequests:  +billedRequests.toFixed(0),
    perRequestUsd:   +estimatedCostUsd.toFixed(6),
  };
}

// ── Real-time tracker (accumulates actuals) ───────────────────────────────────

export class CostTracker {
  constructor() {
    this._records = [];
  }

  record({ provider, framework, inputTokens, outputTokens, actualCostUsd, latencyMs }) {
    this._records.push({
      provider, framework, inputTokens, outputTokens,
      actualCostUsd, latencyMs, ts: Date.now(),
    });
  }

  summary() {
    if (this._records.length === 0) return null;
    const total = this._records.reduce((acc, r) => {
      acc.costUsd    += r.actualCostUsd ?? 0;
      acc.inputTokens  += r.inputTokens  ?? 0;
      acc.outputTokens += r.outputTokens ?? 0;
      acc.requests++;
      return acc;
    }, { costUsd: 0, inputTokens: 0, outputTokens: 0, requests: 0 });

    const byProvider = {};
    for (const r of this._records) {
      if (!byProvider[r.provider]) byProvider[r.provider] = { requests: 0, costUsd: 0 };
      byProvider[r.provider].requests++;
      byProvider[r.provider].costUsd += r.actualCostUsd ?? 0;
    }

    return {
      ...total,
      avgCostUsd:  total.requests ? total.costUsd / total.requests : 0,
      byProvider,
      projectedMonthlyUsd: total.costUsd / (this._records[this._records.length - 1].ts - this._records[0].ts) * 30 * 24 * 60 * 60 * 1000 || 0,
    };
  }

  reset() { this._records = []; }
}

export const defaultCostTracker = new CostTracker();
