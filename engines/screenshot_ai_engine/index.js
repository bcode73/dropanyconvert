/**
 * Screenshot AI Engine — Public API
 *
 * Entry point for the Screenshot → Code AI engine.
 * Re-exports the router, provider interface, usage accounting,
 * and runtime interface for use by the server runtime layer.
 *
 * This engine is deliberately isolated from all other DropAnyConvert engines:
 * - No shared state with image_engine, pdf_engine, etc.
 * - No direct dependency on any specific AI provider
 * - All provider communication goes through the router
 * - All cost tracking goes through UsageAccounting
 *
 * Architecture only. Activate by injecting API keys at runtime.
 */

export { AiProviderRouter, defaultRouter, DEFAULT_STRATEGY, PREMIUM_STRATEGY } from './router.js';
export { BaseAiProvider, FRAMEWORK_LABELS } from './providers/base.js';
export { DeepSeekProvider }  from './providers/deepseek.js';
export { OpenAiProvider }    from './providers/openai.js';
export { AnthropicProvider } from './providers/anthropic.js';
export { GeminiProvider }    from './providers/gemini.js';
export { OpenRouterProvider }from './providers/openrouter.js';
export { OllamaProvider }    from './providers/ollama.js';
export { UsageAccounting, CREDIT_TIERS, OPERATION_COSTS, operationCost } from './usage-accounting.js';
export * from './runtime-interface.js';

// ── Phase 29: Execution layer ─────────────────────────────────────────────────
export { ExecutionPipeline, defaultPipeline, createContext, STAGE_NAMES, DEFAULT_STAGES } from './pipeline.js';
export { getSystemPrompt, buildUserMessage, listPromptVersions, isCurrentVersion, PROMPT_VERSIONS } from './prompts/index.js';
export { validateOutput, listValidatedFrameworks } from './validators/index.js';
export { buildCacheKey, hashString, hashImage, cacheGet, cacheSet, cacheInvalidate, cacheInvalidateFramework, cachePurgeExpired, cacheStats, CACHE_TTL_MS } from './cache.js';
export { estimateCost, compareProviders, projectMonthlyBurn, CostTracker, defaultCostTracker, PROVIDER_PRICING, estimateImageTokens, estimateOutputTokens } from './cost-optimizer.js';
export { AiJobQueue, defaultQueue, createJob, enqueueBatch, PRIORITY, PLAN_PRIORITY, JOB_STATE } from './queue.js';
export { validateMimeType, validateImageSize, validateImageDimensions, validateSvgSafety, filterPromptInjection, sanitizeGeneratedCode, checkRateLimit, validateUpload } from './security.js';
export { MetricsCollector, defaultMetrics, buildAdminMetrics, METRIC } from './observability.js';
export {
  generateCode,
  generateHtml,
  generateHtmlCss,
  generateTailwind,
  generateBootstrap,
  generateReactJsx,
  generateNextJs,
  generateVue,
  generateSvelte,
  generateAngular,
  generateFlutter,
  generateSwiftUI,
  generateEmail,
  generateSvg,
  generateCssGrid,
  generateWireframe,
  generateComponentTree,
  generateReactNative,
  generateJetpackCompose,
  generateBlazor,
  generateAlpine,
  generateEmailTemplate,
} from './framework-stubs.js';

// ── Engine metadata (read by generator for API docs + dataset) ────────────────

export const ENGINE_META = {
  id:          'screenshot_ai_engine',
  version:     '1.0.0-architecture',
  category:    'ai-development',
  runtime:     'cloud',
  providers:   ['deepseek', 'openai', 'anthropic', 'gemini', 'openrouter', 'ollama'],
  defaultProvider: 'deepseek',
  frameworks:  [
    'html', 'html-css', 'tailwind', 'bootstrap', 'react', 'nextjs', 'vue',
    'svelte', 'angular', 'flutter', 'swiftui', 'email', 'svg', 'css-grid',
    'wireframe', 'component-tree', 'react-native', 'jetpack-compose', 'blazor', 'alpine',
  ],
  capabilities: [
    'streaming',
    'vision',
    'multi-provider',
    'automatic-fallback',
    'cost-aware-routing',
    'latency-aware-routing',
    'health-checking',
    'retry-strategy',
    'usage-accounting',
    'credit-system',
    'version-history',
    'prompt-templates',
    'design-annotations',
    'partial-regeneration',
    'multi-turn-conversation',
    'compare-generations',
  ],
  premiumRequired: true,
  status:      'architecture', // 'architecture' | 'beta' | 'stable'
  phase:       29,
  execution: {
    pipeline_stages: 13,
    prompt_versions: 20,
    validators:      ['html', 'css', 'react', 'vue', 'svelte', 'angular', 'flutter', 'swiftui', 'jetpack-compose', 'blazor', 'svg', 'component-tree'],
    cache:           'in-memory (swap Redis at runtime)',
    queue:           'priority + retry + timeout + webhook',
    security:        ['mime', 'size', 'dimensions', 'svg-safety', 'prompt-injection', 'code-sanitization', 'rate-limit'],
    observability:   ['latency', 'generation-time', 'cache-hit-rate', 'retry-rate', 'failure-rate', 'credits', 'image-size', 'framework-popularity'],
  },
};
