/**
 * Ollama Provider — Local LLM (self-hosted / on-premise)
 *
 * Enables fully private, self-hosted AI generation using any
 * Ollama-compatible model (LLaVA, CodeLlama, Mistral, etc.).
 * No API key required. Zero cloud cost. Data never leaves the server.
 *
 * Architecture only. Activate by setting OLLAMA_BASE_URL at runtime.
 */

import { BaseAiProvider, FRAMEWORK_LABELS } from './base.js';

export class OllamaProvider extends BaseAiProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'ollama';
    this.model = config.model || 'llava:latest';
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    // No cost for local inference
    this._inputPricePer1M  = 0;
    this._outputPricePer1M = 0;
  }

  supportsStreaming()   { return true; }
  supportsVision()      { return this.model.startsWith('llava') || this.model.includes('vision'); }
  maxImageResolution()  { return 2048; }
  supportedFrameworks() { return Object.keys(FRAMEWORK_LABELS); }
  tokenLimits()         { return { input: 32_768, output: 4_096 }; }

  estimateImageTokens({ width, height }) {
    return Math.ceil((width * height) / 1500);
  }

  estimateCost() { return 0; } // Local inference is free

  estimateTokens({ imageWidth = 1280, imageHeight = 720, framework = 'html', prompt = '' }) {
    const imageTokens = this.estimateImageTokens({ width: imageWidth, height: imageHeight });
    const inputTokens = imageTokens + 400;
    return { inputTokens, estimatedOutputTokens: 1000, totalEstimate: inputTokens + 1000 };
  }

  async generateCode({ imageData, framework, prompt, options = {} }) {
    return _notImplemented('generateCode', this.name);
  }

  async streamCode({ imageData, framework, prompt, options = {}, onChunk }) {
    return _notImplemented('streamCode', this.name);
  }

  validateResponse(response) {
    const text = response?.response || response?.message?.content;
    if (!text) return { valid: false, errors: ['Empty response from Ollama'] };
    return { valid: text.length >= 10, errors: [], code: text.trim() };
  }

  async healthCheck() {
    return _notImplemented('healthCheck', this.name);
  }
}

function _notImplemented(method, provider) {
  throw new Error(`${provider}.${method}() requires OLLAMA_BASE_URL and a running Ollama instance.`);
}
