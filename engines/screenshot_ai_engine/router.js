/**
 * Screenshot AI Engine — Provider Router
 *
 * Handles provider selection, fallback, weighted routing, health checking,
 * cost-aware routing, latency-aware routing, and retry strategy.
 *
 * Architecture only. All methods are defined but AI calls are stubs.
 * Activate providers by injecting API keys at runtime.
 */

import { DeepSeekProvider }  from './providers/deepseek.js';
import { OpenAiProvider }    from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { GeminiProvider }    from './providers/gemini.js';
import { OpenRouterProvider }from './providers/openrouter.js';
import { OllamaProvider }    from './providers/ollama.js';

// ── Default routing strategy ──────────────────────────────────────────────────
// Priority order: DeepSeek (cost-efficient default) → OpenAI (premium accuracy)
// → Anthropic (complex reasoning) → Gemini (multimodal) → OpenRouter (emergency)
// Local/Ollama is only used when explicitly configured.

export const DEFAULT_STRATEGY = {
  primary:   'deepseek',
  fallbacks: ['openai', 'anthropic', 'gemini', 'openrouter'],
  weights:   { deepseek: 70, openai: 15, anthropic: 10, gemini: 5 },
  timeout:   30_000,   // ms per provider attempt
  maxRetries: 2,
  retryDelay: 1_000,   // ms, doubled on each retry (exponential)
};

// Premium tier overrides (higher accuracy, higher cost)
export const PREMIUM_STRATEGY = {
  primary:   'openai',
  fallbacks: ['anthropic', 'deepseek', 'gemini'],
  weights:   { openai: 60, anthropic: 30, deepseek: 10 },
  timeout:   60_000,
  maxRetries: 3,
  retryDelay: 2_000,
};

// ── Provider registry ─────────────────────────────────────────────────────────

const PROVIDER_CLASSES = {
  deepseek:   DeepSeekProvider,
  openai:     OpenAiProvider,
  anthropic:  AnthropicProvider,
  gemini:     GeminiProvider,
  openrouter: OpenRouterProvider,
  ollama:     OllamaProvider,
};

export class AiProviderRouter {
  constructor(strategy = DEFAULT_STRATEGY, providerConfigs = {}) {
    this.strategy = strategy;
    this._providers = new Map();
    this._health    = new Map();
    this._latency   = new Map();
    this._errorCounts = new Map();

    // Instantiate all configured providers
    for (const [name, Cls] of Object.entries(PROVIDER_CLASSES)) {
      const cfg = providerConfigs[name] || {};
      this._providers.set(name, new Cls(cfg));
      this._health.set(name, true);
      this._latency.set(name, 0);
      this._errorCounts.set(name, 0);
    }
  }

  // ── Provider Selection ────────────────────────────────────────────────────

  /**
   * Select the best provider for a request using routing strategy.
   * @param {{ framework?: string, requireAccuracy?: boolean, forceProvider?: string }} opts
   * @returns {import('./providers/base.js').BaseAiProvider}
   */
  selectProvider(opts = {}) {
    if (opts.forceProvider) {
      const p = this._providers.get(opts.forceProvider);
      if (!p) throw new Error(`Unknown provider: ${opts.forceProvider}`);
      return p;
    }

    const strategy = opts.requireAccuracy ? PREMIUM_STRATEGY : this.strategy;
    const candidates = [strategy.primary, ...strategy.fallbacks]
      .filter(name => this._health.get(name) !== false)
      .filter(name => this._providers.has(name));

    if (!candidates.length) throw new Error('No healthy providers available');
    return this._providers.get(candidates[0]);
  }

  /**
   * Select provider via weighted random selection (for A/B testing).
   * @param {Record<string, number>} weights
   * @returns {import('./providers/base.js').BaseAiProvider}
   */
  selectWeighted(weights = this.strategy.weights) {
    const entries = Object.entries(weights)
      .filter(([name]) => this._health.get(name) !== false && this._providers.has(name));
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let rand = Math.random() * total;
    for (const [name, w] of entries) {
      rand -= w;
      if (rand <= 0) return this._providers.get(name);
    }
    return this._providers.get(entries[0][0]);
  }

  // ── Generation with Fallback ──────────────────────────────────────────────

  /**
   * Generate code with automatic fallback across providers.
   * @param {{ imageData: string, framework: string, prompt?: string, options?: object }} params
   * @returns {Promise<import('./providers/base.js').GenerationResult>}
   */
  async generateWithFallback(params) {
    const strategy = this.strategy;
    const chain = [strategy.primary, ...strategy.fallbacks].filter(n => this._providers.has(n));

    let lastError;
    for (const name of chain) {
      if (this._health.get(name) === false) continue;
      const provider = this._providers.get(name);
      if (!provider.supportsVision()) continue;

      for (let attempt = 0; attempt <= strategy.maxRetries; attempt++) {
        try {
          const result = await _withTimeout(
            provider.generateCode(params),
            strategy.timeout,
            name
          );
          this._recordSuccess(name);
          return result;
        } catch (err) {
          lastError = err;
          this._recordError(name);
          if (attempt < strategy.maxRetries) {
            await _sleep(strategy.retryDelay * Math.pow(2, attempt));
          }
        }
      }
    }
    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  // ── Cost-Aware Routing ────────────────────────────────────────────────────

  /**
   * Select the cheapest healthy provider that supports a framework.
   * @param {{ imageWidth: number, imageHeight: number, framework: string }} params
   * @returns {{ provider: BaseAiProvider, estimatedCost: number }}
   */
  selectCheapest(params) {
    let cheapest = null;
    let cheapestCost = Infinity;

    for (const [name, provider] of this._providers) {
      if (this._health.get(name) === false) continue;
      if (!provider.supportsVision()) continue;
      if (!provider.supportedFrameworks().includes(params.framework)) continue;

      const estimate = provider.estimateTokens(params);
      const cost = provider.estimateCost({
        inputTokens: estimate.inputTokens,
        outputTokens: estimate.estimatedOutputTokens,
        imageCount: 1,
      });

      if (cost < cheapestCost) {
        cheapestCost = cost;
        cheapest = { provider, estimatedCost: cost };
      }
    }
    if (!cheapest) throw new Error('No suitable provider found for cost-aware routing');
    return cheapest;
  }

  // ── Health Management ─────────────────────────────────────────────────────

  async runHealthChecks() {
    const results = {};
    for (const [name, provider] of this._providers) {
      try {
        const ok = await provider.healthCheck();
        this._health.set(name, ok);
        results[name] = ok;
      } catch {
        this._health.set(name, false);
        results[name] = false;
      }
    }
    return results;
  }

  getHealthStatus() {
    return Object.fromEntries(this._health);
  }

  // ── Capability Detection ──────────────────────────────────────────────────

  /** Find all providers that support a given framework */
  providersForFramework(framework) {
    return [...this._providers.entries()]
      .filter(([name, p]) => this._health.get(name) !== false && p.supportedFrameworks().includes(framework))
      .map(([name]) => name);
  }

  /** Get cost estimates from all healthy providers */
  getAllCostEstimates(params) {
    const estimates = {};
    for (const [name, provider] of this._providers) {
      if (this._health.get(name) === false) continue;
      try {
        const tokens = provider.estimateTokens(params);
        estimates[name] = {
          ...tokens,
          cost: provider.estimateCost({
            inputTokens: tokens.inputTokens,
            outputTokens: tokens.estimatedOutputTokens,
            imageCount: 1,
          }),
        };
      } catch { /* provider can't estimate for this framework */ }
    }
    return estimates;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  _recordSuccess(name) {
    this._errorCounts.set(name, 0);
    this._health.set(name, true);
  }

  _recordError(name) {
    const count = (this._errorCounts.get(name) || 0) + 1;
    this._errorCounts.set(name, count);
    // Circuit breaker: mark unhealthy after 3 consecutive failures
    if (count >= 3) this._health.set(name, false);
  }
}

function _withTimeout(promise, ms, providerName) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${providerName} timed out after ${ms}ms`)), ms);
    promise.then(r => { clearTimeout(t); resolve(r); }, e => { clearTimeout(t); reject(e); });
  });
}

function _sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Default router instance (singleton) ────────────────────────────────────────
export const defaultRouter = new AiProviderRouter();
