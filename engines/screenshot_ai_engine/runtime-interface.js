/**
 * Screenshot AI Engine — Runtime Interface
 *
 * Defines the contract between the browser-side UI (screenshot-ai-runtime.js)
 * and the server-side AI execution layer. All methods here are architecture
 * stubs — the browser calls these via fetch() once a server runtime is active.
 *
 * Future AI features are listed as interface definitions even before
 * implementation, so the browser UI can be built against a stable contract.
 */

// ── Request / Response schemas ─────────────────────────────────────────────────

/**
 * @typedef {Object} GenerateRequest
 * @property {string}  imageData       Base64-encoded image (data URI)
 * @property {string}  framework       Target framework slug
 * @property {string}  [prompt]        Optional user instruction
 * @property {string}  [provider]      Force a specific provider (optional)
 * @property {boolean} [stream]        Enable streaming response
 * @property {object}  [options]       Provider-specific options
 */

/**
 * @typedef {Object} GenerateResponse
 * @property {boolean} success
 * @property {string}  code            Generated code
 * @property {string}  framework
 * @property {string}  provider        Provider that produced the result
 * @property {object}  usage           { inputTokens, outputTokens, costUsd, creditsDeducted }
 * @property {number}  latencyMs
 * @property {string}  generationId    Unique ID for history/version tracking
 * @property {string[]} warnings
 */

// ── API endpoint map (matches OpenAPI spec) ────────────────────────────────────

export const ENDPOINTS = {
  generate:          'POST /api/v1/convert/{slug}',
  regenerate:        'POST /api/v1/convert/{slug}/regenerate',
  stream:            'POST /api/v1/convert/{slug}/stream',
  partialRegenerate: 'POST /api/v1/convert/{slug}/partial',
  history:           'GET  /api/v1/history',
  historyItem:       'GET  /api/v1/history/{id}',
  compare:           'POST /api/v1/compare',
  credits:           'GET  /api/v1/credits',
  providers:         'GET  /api/v1/providers',
  providerHealth:    'GET  /api/v1/providers/health',
};

// ── Future AI feature interfaces ───────────────────────────────────────────────

/**
 * Streaming tokens — interface for incremental rendering.
 * The browser attaches an EventSource or ReadableStream to receive
 * code tokens as they are generated.
 *
 * @param {GenerateRequest} request
 * @param {function(chunk: string): void} onChunk
 * @param {function(result: GenerateResponse): void} onDone
 * @param {function(error: Error): void} onError
 */
export function streamGeneration(request, onChunk, onDone, onError) {
  // Architecture stub — implement with EventSource or fetch ReadableStream
  throw new Error('streamGeneration() requires an active server runtime');
}

/**
 * Incremental rendering — applies code chunks to a live preview as they arrive.
 *
 * @param {string}   containerId  DOM element to render into
 * @param {string}   framework
 * @param {function} getChunk
 */
export function incrementalPreview(containerId, framework, getChunk) {
  throw new Error('incrementalPreview() requires an active server runtime');
}

/**
 * Edit prompt — refine generated code with a follow-up instruction.
 *
 * @param {{ generationId: string, editInstruction: string }} params
 * @returns {Promise<GenerateResponse>}
 */
export async function editWithPrompt({ generationId, editInstruction }) {
  throw new Error('editWithPrompt() requires an active server runtime');
}

/**
 * Multi-turn conversation — maintain context across multiple generations.
 *
 * @param {{ conversationId: string, message: string, imageData?: string }} params
 * @returns {Promise<GenerateResponse>}
 */
export async function continueConversation({ conversationId, message, imageData }) {
  throw new Error('continueConversation() requires an active server runtime');
}

/**
 * Version history — retrieve past generations for a session.
 *
 * @param {{ userId: string, limit?: number, offset?: number }} params
 * @returns {Promise<{ items: GenerateResponse[], total: number }>}
 */
export async function getHistory({ userId, limit = 10, offset = 0 }) {
  throw new Error('getHistory() requires an active server runtime');
}

/**
 * Regenerate section — re-generate only a named section of output.
 *
 * @param {{ generationId: string, section: string, instruction?: string }} params
 * @returns {Promise<GenerateResponse>}
 */
export async function regenerateSection({ generationId, section, instruction }) {
  throw new Error('regenerateSection() requires an active server runtime');
}

/**
 * Compare generations — return two side-by-side outputs for the same input.
 *
 * @param {{ imageData: string, framework: string, providers: [string, string] }} params
 * @returns {Promise<{ a: GenerateResponse, b: GenerateResponse }>}
 */
export async function compareGenerations({ imageData, framework, providers }) {
  throw new Error('compareGenerations() requires an active server runtime');
}

/**
 * AI memory — store user preferences to improve future generation prompts.
 *
 * @param {{ userId: string, preferences: object }} params
 * @returns {Promise<void>}
 */
export async function saveUserPreferences({ userId, preferences }) {
  throw new Error('saveUserPreferences() requires an active server runtime');
}

/**
 * Prompt templates — return curated system prompt templates by framework.
 *
 * @param {string} framework
 * @returns {Promise<Array<{ id: string, name: string, prompt: string }>>}
 */
export async function getPromptTemplates(framework) {
  throw new Error('getPromptTemplates() requires an active server runtime');
}

/**
 * Design annotations — overlay component boundaries on the original screenshot.
 *
 * @param {string} imageData Base64 image
 * @returns {Promise<{ annotatedImage: string, components: object[] }>}
 */
export async function annotateDesign(imageData) {
  throw new Error('annotateDesign() requires an active server runtime');
}
