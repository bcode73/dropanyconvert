/**
 * DeepSeek Provider — Default AI Provider
 *
 * DeepSeek is the default provider for Screenshot → Code due to:
 * - Lowest inference cost among frontier models
 * - Excellent code generation quality
 * - Strong vision capabilities (DeepSeek-VL series)
 * - Competitive with GPT-4o on code benchmarks at ~10× lower cost
 *
 * Architecture only. No real API calls. Implement by injecting an API key
 * via environment variable DEEPSEEK_API_KEY at runtime.
 */

import { BaseAiProvider, FRAMEWORK_LABELS } from './base.js';

export class DeepSeekProvider extends BaseAiProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'deepseek';
    this.model = config.model || 'deepseek-vl2';
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com/v1';
    // Pricing (USD per 1M tokens) — approximate at time of writing
    this._inputPricePer1M  = 0.27;
    this._outputPricePer1M = 1.10;
    this._imagePricePer1K  = 0.002;
  }

  supportsStreaming()      { return true; }
  supportsVision()         { return true; }
  maxImageResolution()     { return 4096; }
  supportedFrameworks()    { return Object.keys(FRAMEWORK_LABELS); }
  tokenLimits()            { return { input: 128_000, output: 8_192 }; }

  estimateImageTokens({ width, height }) {
    // DeepSeek-VL2 encodes images at ~512 tokens per 512×512 tile
    const tiles = Math.ceil(width / 512) * Math.ceil(height / 512);
    return tiles * 512;
  }

  estimateCost({ inputTokens, outputTokens, imageCount = 0 }) {
    const inputCost  = (inputTokens  / 1_000_000) * this._inputPricePer1M;
    const outputCost = (outputTokens / 1_000_000) * this._outputPricePer1M;
    const imageCost  = (imageCount   / 1_000)     * this._imagePricePer1K;
    return +(inputCost + outputCost + imageCost).toFixed(6);
  }

  estimateTokens({ imageWidth = 1280, imageHeight = 720, framework = 'html', prompt = '' }) {
    const imageTokens  = this.estimateImageTokens({ width: imageWidth, height: imageHeight });
    const systemTokens = Math.ceil(this.buildSystemPrompt(framework).length / 4);
    const userTokens   = Math.ceil((this.buildUserMessage('', prompt, framework).length) / 4);
    const inputTokens  = imageTokens + systemTokens + userTokens;
    // Output estimate: frameworks vary widely. React/Flutter are verbose.
    const outputEstimates = {
      flutter: 3000, swiftui: 2500, 'jetpack-compose': 2800, blazor: 2200,
      react: 1800, nextjs: 2000, angular: 2200, vue: 1600, svelte: 1400,
      'html-css': 1200, tailwind: 1000, bootstrap: 1000,
      html: 800, email: 1500, svg: 600, 'css-grid': 900,
      wireframe: 600, 'component-tree': 500, 'react-native': 1800, alpine: 700,
    };
    const estimatedOutputTokens = outputEstimates[framework] || 1000;
    return { inputTokens, estimatedOutputTokens, totalEstimate: inputTokens + estimatedOutputTokens };
  }

  async generateCode({ imageData, framework, prompt, options = {} }) {
    // Architecture stub — real implementation injects fetch + API key
    return _notImplemented('generateCode', this.name);
  }

  async streamCode({ imageData, framework, prompt, options = {}, onChunk }) {
    // Architecture stub
    return _notImplemented('streamCode', this.name);
  }

  validateResponse(response) {
    if (!response?.choices?.[0]?.message?.content) {
      return { valid: false, errors: ['Empty or malformed response from DeepSeek'] };
    }
    const code = response.choices[0].message.content.trim();
    if (code.length < 10) {
      return { valid: false, errors: ['Response too short to be valid code'] };
    }
    return { valid: true, errors: [], code };
  }

  async healthCheck() {
    // Architecture stub
    return _notImplemented('healthCheck', this.name);
  }
}

function _notImplemented(method, provider) {
  throw new Error(
    `${provider}.${method}() is not yet implemented. ` +
    `Inject a real fetch + DEEPSEEK_API_KEY environment variable to activate.`
  );
}
