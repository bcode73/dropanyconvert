/**
 * Gemini Provider — Multimodal fallback
 *
 * Google Gemini is the designated multimodal fallback. Gemini 2.0 Flash
 * offers fast inference at low cost; Gemini 1.5 Pro handles long outputs.
 *
 * Architecture only. Activate with GEMINI_API_KEY env var at runtime.
 */

import { BaseAiProvider, FRAMEWORK_LABELS } from './base.js';

export class GeminiProvider extends BaseAiProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'gemini';
    this.model = config.model || 'gemini-2.0-flash';
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    this._inputPricePer1M  = 0.10;
    this._outputPricePer1M = 0.40;
  }

  supportsStreaming()   { return true; }
  supportsVision()      { return true; }
  maxImageResolution()  { return 3072; }
  supportedFrameworks() { return Object.keys(FRAMEWORK_LABELS); }
  tokenLimits()         { return { input: 1_000_000, output: 8_192 }; }

  estimateImageTokens({ width, height }) {
    return Math.ceil((width * height) / 1000);
  }

  estimateCost({ inputTokens, outputTokens }) {
    return +((inputTokens / 1_000_000) * this._inputPricePer1M + (outputTokens / 1_000_000) * this._outputPricePer1M).toFixed(6);
  }

  estimateTokens({ imageWidth = 1280, imageHeight = 720, framework = 'html', prompt = '' }) {
    const imageTokens  = this.estimateImageTokens({ width: imageWidth, height: imageHeight });
    const systemTokens = Math.ceil(this.buildSystemPrompt(framework).length / 4);
    const inputTokens  = imageTokens + systemTokens;
    return { inputTokens, estimatedOutputTokens: 1200, totalEstimate: inputTokens + 1200 };
  }

  async generateCode({ imageData, framework, prompt, options = {} }) {
    return _notImplemented('generateCode', this.name);
  }

  async streamCode({ imageData, framework, prompt, options = {}, onChunk }) {
    return _notImplemented('streamCode', this.name);
  }

  validateResponse(response) {
    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { valid: false, errors: ['Empty response from Gemini'] };
    return { valid: text.length >= 10, errors: [], code: text.trim() };
  }

  async healthCheck() {
    return _notImplemented('healthCheck', this.name);
  }
}

function _notImplemented(method, provider) {
  throw new Error(`${provider}.${method}() requires GEMINI_API_KEY and runtime activation.`);
}
