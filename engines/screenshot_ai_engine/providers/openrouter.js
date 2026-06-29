/**
 * OpenRouter Provider — Emergency fallback / model marketplace
 *
 * OpenRouter provides access to 200+ models through a single API,
 * making it ideal as an emergency fallback when primary providers
 * are unavailable, or for A/B testing alternative models.
 *
 * Architecture only. Activate with OPENROUTER_API_KEY at runtime.
 */

import { BaseAiProvider, FRAMEWORK_LABELS } from './base.js';

export class OpenRouterProvider extends BaseAiProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'openrouter';
    // Default to a reliable vision model; can be overridden per-request
    this.model = config.model || 'anthropic/claude-sonnet-4-6';
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    // Pricing varies by model — use a conservative estimate
    this._inputPricePer1M  = 3.00;
    this._outputPricePer1M = 15.00;
  }

  supportsStreaming()   { return true; }
  supportsVision()      { return true; }  // depends on selected model
  maxImageResolution()  { return 4096; }
  supportedFrameworks() { return Object.keys(FRAMEWORK_LABELS); }
  tokenLimits()         { return { input: 200_000, output: 8_192 }; }

  estimateImageTokens({ width, height }) {
    return Math.ceil((width * height) / 750);
  }

  estimateCost({ inputTokens, outputTokens }) {
    return +((inputTokens / 1_000_000) * this._inputPricePer1M + (outputTokens / 1_000_000) * this._outputPricePer1M).toFixed(6);
  }

  estimateTokens({ imageWidth = 1280, imageHeight = 720, framework = 'html', prompt = '' }) {
    const imageTokens = this.estimateImageTokens({ width: imageWidth, height: imageHeight });
    const inputTokens = imageTokens + 500;
    return { inputTokens, estimatedOutputTokens: 1500, totalEstimate: inputTokens + 1500 };
  }

  async generateCode({ imageData, framework, prompt, options = {} }) {
    return _notImplemented('generateCode', this.name);
  }

  async streamCode({ imageData, framework, prompt, options = {}, onChunk }) {
    return _notImplemented('streamCode', this.name);
  }

  validateResponse(response) {
    if (!response?.choices?.[0]?.message?.content) {
      return { valid: false, errors: ['Empty or malformed response from OpenRouter'] };
    }
    const code = response.choices[0].message.content.trim();
    return { valid: code.length >= 10, errors: [], code };
  }

  async healthCheck() {
    return _notImplemented('healthCheck', this.name);
  }
}

function _notImplemented(method, provider) {
  throw new Error(`${provider}.${method}() requires OPENROUTER_API_KEY and runtime activation.`);
}
