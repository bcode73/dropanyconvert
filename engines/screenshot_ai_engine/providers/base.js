/**
 * Screenshot AI Engine — Base Provider Interface
 *
 * All AI providers MUST extend this class and implement every method.
 * The router interacts exclusively with this interface — never with
 * provider-specific APIs directly.
 *
 * Architecture only. No real API calls are made here.
 */

export class BaseAiProvider {
  constructor(config = {}) {
    if (new.target === BaseAiProvider) {
      throw new Error('BaseAiProvider is abstract — extend it with a concrete provider');
    }
    this.config = config;
    this.name = 'base';
    this.healthy = true;
    this._lastHealthCheck = 0;
  }

  // ── Capability Discovery ──────────────────────────────────────────────────

  /** @returns {boolean} Whether this provider supports streaming output */
  supportsStreaming() { throw new Error(`${this.name}.supportsStreaming() not implemented`); }

  /** @returns {boolean} Whether this provider accepts image inputs */
  supportsVision() { throw new Error(`${this.name}.supportsVision() not implemented`); }

  /** @returns {number} Maximum image resolution (px on longest side) */
  maxImageResolution() { throw new Error(`${this.name}.maxImageResolution() not implemented`); }

  /** @returns {string[]} Supported output frameworks e.g. ['html','react','tailwind'] */
  supportedFrameworks() { throw new Error(`${this.name}.supportedFrameworks() not implemented`); }

  /** @returns {{ input: number, output: number }} Token limits */
  tokenLimits() { throw new Error(`${this.name}.tokenLimits() not implemented`); }

  // ── Cost Estimation ───────────────────────────────────────────────────────

  /**
   * Estimate total cost in USD for a given request.
   * @param {{ inputTokens: number, outputTokens: number, imageCount: number }} params
   * @returns {number} Estimated cost in USD
   */
  estimateCost({ inputTokens, outputTokens, imageCount }) {
    throw new Error(`${this.name}.estimateCost() not implemented`);
  }

  /**
   * Estimate token count for an image at given dimensions.
   * @param {{ width: number, height: number }} dims
   * @returns {number} Estimated token count
   */
  estimateImageTokens({ width, height }) {
    throw new Error(`${this.name}.estimateImageTokens() not implemented`);
  }

  /**
   * Estimate total tokens for a code generation request.
   * @param {{ imageWidth: number, imageHeight: number, framework: string, prompt?: string }} params
   * @returns {{ inputTokens: number, estimatedOutputTokens: number, totalEstimate: number }}
   */
  estimateTokens({ imageWidth, imageHeight, framework, prompt }) {
    throw new Error(`${this.name}.estimateTokens() not implemented`);
  }

  // ── Code Generation ───────────────────────────────────────────────────────

  /**
   * Generate code from a screenshot (non-streaming).
   * @param {{ imageData: string, framework: string, prompt?: string, options?: object }} params
   * @returns {Promise<GenerationResult>}
   */
  async generateCode({ imageData, framework, prompt, options }) {
    throw new Error(`${this.name}.generateCode() not implemented`);
  }

  /**
   * Generate code from a screenshot with streaming output.
   * @param {{ imageData: string, framework: string, prompt?: string, options?: object, onChunk: function }} params
   * @returns {Promise<GenerationResult>}
   */
  async streamCode({ imageData, framework, prompt, options, onChunk }) {
    throw new Error(`${this.name}.streamCode() not implemented`);
  }

  // ── Response Validation ───────────────────────────────────────────────────

  /**
   * Validate that a provider response is well-formed and usable.
   * @param {object} response Raw provider API response
   * @returns {{ valid: boolean, errors: string[], code?: string }}
   */
  validateResponse(response) {
    throw new Error(`${this.name}.validateResponse() not implemented`);
  }

  // ── Health ────────────────────────────────────────────────────────────────

  /**
   * Check if this provider is currently reachable.
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    throw new Error(`${this.name}.healthCheck() not implemented`);
  }

  // ── Shared Helpers ────────────────────────────────────────────────────────

  /** Build the system prompt for a given framework */
  buildSystemPrompt(framework) {
    return SYSTEM_PROMPTS[framework] || SYSTEM_PROMPTS.html;
  }

  /** Build the user message combining image + text prompt */
  buildUserMessage(imageData, prompt, framework) {
    const base = `Convert this UI screenshot to ${FRAMEWORK_LABELS[framework] || framework} code. Output only the code, no explanations.`;
    return prompt ? `${base}\n\nAdditional instructions: ${prompt}` : base;
  }
}

// ── Framework labels ──────────────────────────────────────────────────────────

export const FRAMEWORK_LABELS = {
  html:             'semantic HTML5',
  'html-css':       'HTML5 + CSS3',
  tailwind:         'HTML with Tailwind CSS utility classes',
  bootstrap:        'HTML with Bootstrap 5',
  react:            'React JSX',
  nextjs:           'Next.js with App Router JSX',
  vue:              'Vue 3 Single File Component',
  svelte:           'Svelte component',
  angular:          'Angular component',
  flutter:          'Flutter Dart widget tree',
  swiftui:          'SwiftUI View',
  email:            'HTML email template (MJML-compatible)',
  svg:              'SVG layout',
  'css-grid':       'CSS Grid layout',
  wireframe:        'wireframe HTML with placeholder classes',
  'component-tree': 'component hierarchy (JSON)',
  'react-native':   'React Native JSX',
  'jetpack-compose':'Jetpack Compose Kotlin',
  blazor:           'Blazor Razor component',
  alpine:           'HTML with Alpine.js directives',
};

// ── System prompts per framework ──────────────────────────────────────────────

const SYSTEM_PROMPTS = {
  html: 'You are an expert front-end developer. Convert UI screenshots to clean, semantic HTML5. Output only valid HTML, no markdown fences.',
  'html-css': 'You are an expert front-end developer. Convert UI screenshots to clean HTML5 + CSS3. Use a <style> block and semantic HTML. Output only code.',
  tailwind: 'You are an expert Tailwind CSS developer. Convert UI screenshots to HTML using only Tailwind utility classes. No custom CSS. Output only code.',
  bootstrap: 'You are an expert Bootstrap developer. Convert UI screenshots to HTML using Bootstrap 5 classes. Output only code.',
  react: 'You are an expert React developer. Convert UI screenshots to a single React functional component with JSX. Use Tailwind for styling. Output only code.',
  nextjs: 'You are an expert Next.js developer. Convert UI screenshots to a Next.js App Router page component with JSX. Output only code.',
  vue: 'You are an expert Vue 3 developer. Convert UI screenshots to a Vue 3 Single File Component with <template>, <script setup>, and <style scoped>. Output only code.',
  svelte: 'You are an expert Svelte developer. Convert UI screenshots to a Svelte component with <script>, markup, and <style>. Output only code.',
  angular: 'You are an expert Angular developer. Convert UI screenshots to an Angular component class + template. Output only TypeScript and HTML.',
  flutter: 'You are an expert Flutter developer. Convert UI screenshots to a Flutter Dart widget tree. Use Material 3. Output only Dart code.',
  swiftui: 'You are an expert SwiftUI developer. Convert UI screenshots to a SwiftUI View struct. Output only Swift code.',
  email: 'You are an expert HTML email developer. Convert UI screenshots to a table-based HTML email template compatible with major clients. Output only HTML.',
  svg: 'You are an expert SVG developer. Convert UI screenshots to a clean SVG layout with semantic groups. Output only SVG code.',
  'css-grid': 'You are an expert CSS Grid developer. Convert UI screenshots to HTML + CSS using CSS Grid. Output only code.',
  wireframe: 'Convert UI screenshots to a low-fidelity HTML wireframe with placeholder classes and semantic structure. Output only HTML.',
  'component-tree': 'Convert UI screenshots to a JSON component hierarchy describing the UI structure, nesting, and props. Output only valid JSON.',
  'react-native': 'You are an expert React Native developer. Convert UI screenshots to React Native JSX using StyleSheet. Output only code.',
  'jetpack-compose': 'You are an expert Android developer. Convert UI screenshots to Jetpack Compose Kotlin. Output only Kotlin code.',
  blazor: 'You are an expert Blazor developer. Convert UI screenshots to a Blazor Razor component with @code block. Output only code.',
  alpine: 'You are an expert Alpine.js developer. Convert UI screenshots to HTML with Alpine.js x-data directives. Output only HTML.',
};

/**
 * @typedef {Object} GenerationResult
 * @property {boolean} success
 * @property {string} code Generated code string
 * @property {string} framework Framework used
 * @property {string} provider Provider name
 * @property {number} inputTokens Tokens consumed (input)
 * @property {number} outputTokens Tokens consumed (output)
 * @property {number} costUsd Estimated cost in USD
 * @property {number} latencyMs Time to complete
 * @property {string[]} warnings Any non-fatal warnings
 */
