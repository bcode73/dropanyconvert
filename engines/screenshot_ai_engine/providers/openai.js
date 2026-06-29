/**
 * OpenAI Provider — Premium accuracy tier
 *
 * Used when maximum output quality is required (e.g. premium plan tier 2).
 * Higher cost than DeepSeek; preferred for SwiftUI, Jetpack Compose, Flutter.
 *
 * Architecture only. Activate with OPENAI_API_KEY env var at runtime.
 */

import { BaseAiProvider, FRAMEWORK_LABELS } from './base.js';

export class OpenAiProvider extends BaseAiProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'openai';
    this.model = config.model || 'gpt-4o';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this._inputPricePer1M  = 2.50;
    this._outputPricePer1M = 10.00;
    this._imagePricePer1K  = 0.00765; // gpt-4o vision detail:auto ~765 tokens per image
  }

  supportsStreaming()   { return true; }
  supportsVision()      { return true; }
  maxImageResolution()  { return 2048; }
  supportedFrameworks() { return Object.keys(FRAMEWORK_LABELS); }
  tokenLimits()         { return { input: 128_000, output: 16_384 }; }

  estimateImageTokens({ width, height }) {
    // GPT-4o vision: 85 base + 170 per 512px tile (detail: auto)
    const tiles = Math.ceil(Math.min(width, 2048) / 512) * Math.ceil(Math.min(height, 2048) / 512);
    return 85 + tiles * 170;
  }

  estimateCost({ inputTokens, outputTokens, imageCount = 0 }) {
    const inputCost  = (inputTokens  / 1_000_000) * this._inputPricePer1M;
    const outputCost = (outputTokens / 1_000_000) * this._outputPricePer1M;
    return +(inputCost + outputCost).toFixed(6);
  }

  estimateTokens({ imageWidth = 1280, imageHeight = 720, framework = 'html', prompt = '' }) {
    const imageTokens  = this.estimateImageTokens({ width: imageWidth, height: imageHeight });
    const systemTokens = Math.ceil(this.buildSystemPrompt(framework).length / 4);
    const userTokens   = Math.ceil(this.buildUserMessage('', prompt, framework).length / 4);
    const inputTokens  = imageTokens + systemTokens + userTokens;
    const estimatedOutputTokens = 1500;
    return { inputTokens, estimatedOutputTokens, totalEstimate: inputTokens + estimatedOutputTokens };
  }

  async generateCode({ imageData, framework, prompt, options = {} }) {
    return _notImplemented('generateCode', this.name);
  }

  async streamCode({ imageData, framework, prompt, options = {}, onChunk }) {
    return _notImplemented('streamCode', this.name);
  }

  validateResponse(response) {
    if (!response?.choices?.[0]?.message?.content) {
      return { valid: false, errors: ['Empty or malformed response from OpenAI'] };
    }
    const code = response.choices[0].message.content.trim();
    return { valid: code.length >= 10, errors: code.length < 10 ? ['Response too short'] : [], code };
  }

  async healthCheck() {
    return _notImplemented('healthCheck', this.name);
  }
}

function _notImplemented(method, provider) {
  throw new Error(`${provider}.${method}() requires OPENAI_API_KEY and runtime activation.`);
}
