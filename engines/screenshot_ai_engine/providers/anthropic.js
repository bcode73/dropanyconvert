/**
 * Anthropic Provider — Complex reasoning tier
 *
 * Claude models excel at understanding UI structure, accessibility,
 * and generating well-commented, maintainable component code.
 * Best for multi-component outputs and annotation-heavy outputs.
 *
 * Architecture only. Activate with ANTHROPIC_API_KEY env var at runtime.
 */

import { BaseAiProvider, FRAMEWORK_LABELS } from './base.js';

export class AnthropicProvider extends BaseAiProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'anthropic';
    this.model = config.model || 'claude-sonnet-4-6';
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    this._inputPricePer1M  = 3.00;
    this._outputPricePer1M = 15.00;
  }

  supportsStreaming()   { return true; }
  supportsVision()      { return true; }
  maxImageResolution()  { return 8000; }
  supportedFrameworks() { return Object.keys(FRAMEWORK_LABELS); }
  tokenLimits()         { return { input: 200_000, output: 8_192 }; }

  estimateImageTokens({ width, height }) {
    // Claude: image tokens ≈ (width * height) / 750
    return Math.ceil((width * height) / 750);
  }

  estimateCost({ inputTokens, outputTokens }) {
    const inputCost  = (inputTokens  / 1_000_000) * this._inputPricePer1M;
    const outputCost = (outputTokens / 1_000_000) * this._outputPricePer1M;
    return +(inputCost + outputCost).toFixed(6);
  }

  estimateTokens({ imageWidth = 1280, imageHeight = 720, framework = 'html', prompt = '' }) {
    const imageTokens  = this.estimateImageTokens({ width: imageWidth, height: imageHeight });
    const systemTokens = Math.ceil(this.buildSystemPrompt(framework).length / 4);
    const userTokens   = Math.ceil(this.buildUserMessage('', prompt, framework).length / 4);
    const inputTokens  = imageTokens + systemTokens + userTokens;
    return { inputTokens, estimatedOutputTokens: 2000, totalEstimate: inputTokens + 2000 };
  }

  async generateCode({ imageData, framework, prompt, options = {} }) {
    return _notImplemented('generateCode', this.name);
  }

  async streamCode({ imageData, framework, prompt, options = {}, onChunk }) {
    return _notImplemented('streamCode', this.name);
  }

  validateResponse(response) {
    if (!response?.content?.[0]?.text) {
      return { valid: false, errors: ['Empty or malformed response from Anthropic'] };
    }
    const code = response.content[0].text.trim();
    return { valid: code.length >= 10, errors: code.length < 10 ? ['Response too short'] : [], code };
  }

  async healthCheck() {
    return _notImplemented('healthCheck', this.name);
  }
}

function _notImplemented(method, provider) {
  throw new Error(`${provider}.${method}() requires ANTHROPIC_API_KEY and runtime activation.`);
}
