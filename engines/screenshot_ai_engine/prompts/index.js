/**
 * Screenshot AI — Prompt Engine
 *
 * Versioned prompt templates for every supported framework.
 * Templates are pure data — no AI calls here.
 *
 * Version scheme:  v{major}.{minor}
 * - Bump minor for wording tweaks that don't affect output format.
 * - Bump major for structural changes (new sections, different output schema).
 */

// ── Current versions ─────────────────────────────────────────────────────────

export const PROMPT_VERSIONS = {
  html:              'v1.0',
  'html-css':        'v1.0',
  tailwind:          'v1.0',
  bootstrap:         'v1.0',
  react:             'v1.0',
  nextjs:            'v1.0',
  vue:               'v1.0',
  svelte:            'v1.0',
  angular:           'v1.0',
  flutter:           'v1.0',
  swiftui:           'v1.0',
  'react-native':    'v1.0',
  'jetpack-compose': 'v1.0',
  blazor:            'v1.0',
  alpine:            'v1.0',
  email:             'v1.0',
  svg:               'v1.0',
  'css-grid':        'v1.0',
  wireframe:         'v1.0',
  'component-tree':  'v1.0',
};

// ── Shared preamble injected into every system prompt ─────────────────────────

const SHARED_RULES = `
Rules:
- Reproduce the layout, spacing, colors, and typography as faithfully as possible.
- Do not add placeholder text beyond what is visible.
- Do not invent content not present in the screenshot.
- Output only the requested code. No explanations, no markdown fences.
- Make the output production-ready and self-contained.
`.trim();

// ── System prompts ────────────────────────────────────────────────────────────

const SYSTEM = {
  html: `You are an expert front-end developer. Convert the provided UI screenshot into clean, semantic HTML5. Use only inline styles. ${SHARED_RULES}`,

  'html-css': `You are an expert front-end developer. Convert the provided UI screenshot into HTML5 with an accompanying <style> block. Use BEM class naming. ${SHARED_RULES}`,

  tailwind: `You are an expert Tailwind CSS developer. Convert the provided UI screenshot into HTML using Tailwind CSS utility classes (v3). Do not use custom CSS. ${SHARED_RULES}`,

  bootstrap: `You are an expert Bootstrap 5 developer. Convert the provided UI screenshot into HTML using Bootstrap 5 components and utility classes. Include Bootstrap CDN links. ${SHARED_RULES}`,

  react: `You are an expert React developer. Convert the provided UI screenshot into a React functional component using JSX and inline styles or CSS modules. Export the component as default. ${SHARED_RULES}`,

  nextjs: `You are an expert Next.js developer. Convert the provided UI screenshot into a Next.js 14 page component using the App Router. Use Tailwind CSS for styling. Export as default. ${SHARED_RULES}`,

  vue: `You are an expert Vue 3 developer. Convert the provided UI screenshot into a Vue 3 Single File Component using the Composition API and <script setup>. ${SHARED_RULES}`,

  svelte: `You are an expert Svelte developer. Convert the provided UI screenshot into a Svelte 4 component with <script>, <style>, and template sections. ${SHARED_RULES}`,

  angular: `You are an expert Angular developer. Convert the provided UI screenshot into an Angular 17 standalone component with TypeScript, template, and SCSS styles inline. ${SHARED_RULES}`,

  flutter: `You are an expert Flutter developer. Convert the provided UI screenshot into a Flutter widget tree using Material 3 widgets. Return a complete StatelessWidget. ${SHARED_RULES}`,

  swiftui: `You are an expert SwiftUI developer. Convert the provided UI screenshot into a SwiftUI View struct. Use SF Symbols where appropriate. Return a complete, compilable View. ${SHARED_RULES}`,

  'react-native': `You are an expert React Native developer. Convert the provided UI screenshot into a React Native functional component using StyleSheet. No third-party libraries. ${SHARED_RULES}`,

  'jetpack-compose': `You are an expert Android developer. Convert the provided UI screenshot into a Jetpack Compose composable function using Material 3. Return a complete, compilable composable. ${SHARED_RULES}`,

  blazor: `You are an expert Blazor developer. Convert the provided UI screenshot into a Blazor component (.razor). Use Bootstrap 5 for styling. Include @code block if needed. ${SHARED_RULES}`,

  alpine: `You are an expert Alpine.js developer. Convert the provided UI screenshot into HTML with Alpine.js directives (x-data, x-bind, etc.) and Tailwind CSS classes. ${SHARED_RULES}`,

  email: `You are an expert HTML email developer. Convert the provided UI screenshot into a table-based HTML email compatible with Gmail, Outlook, and Apple Mail. Use inline styles only. Max width 600px. ${SHARED_RULES}`,

  svg: `You are an expert SVG developer. Convert the provided UI screenshot into a clean SVG document with proper viewBox, groups, and semantic structure. ${SHARED_RULES}`,

  'css-grid': `You are an expert CSS Grid developer. Convert the provided UI screenshot into HTML with a CSS Grid layout. Include a <style> block. No frameworks. ${SHARED_RULES}`,

  wireframe: `You are a UX designer. Convert the provided UI screenshot into a low-fidelity wireframe as an SVG. Use only grays and simple shapes. Label all interactive elements. ${SHARED_RULES}`,

  'component-tree': `You are an expert UI architect. Analyze the provided UI screenshot and output a JSON component tree. Each node: { "name": string, "type": "container"|"input"|"text"|"image"|"button"|"list"|"nav", "children": [...] }. ${SHARED_RULES}`,
};

// ── User message template ─────────────────────────────────────────────────────

const USER_TEMPLATE = (framework, extraPrompt) =>
  `Convert this screenshot to ${FRAMEWORK_LABELS[framework] ?? framework} code.${extraPrompt ? `\n\nAdditional instructions: ${extraPrompt}` : ''}`;

const FRAMEWORK_LABELS = {
  html:              'HTML5',
  'html-css':        'HTML + CSS',
  tailwind:          'Tailwind CSS',
  bootstrap:         'Bootstrap 5',
  react:             'React JSX',
  nextjs:            'Next.js 14',
  vue:               'Vue 3',
  svelte:            'Svelte 4',
  angular:           'Angular 17',
  flutter:           'Flutter',
  swiftui:           'SwiftUI',
  'react-native':    'React Native',
  'jetpack-compose': 'Jetpack Compose',
  blazor:            'Blazor',
  alpine:            'Alpine.js',
  email:             'HTML Email',
  svg:               'SVG',
  'css-grid':        'CSS Grid',
  wireframe:         'Wireframe SVG',
  'component-tree':  'Component Tree JSON',
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get system prompt for a framework + version.
 * @param {string} framework
 * @param {string} [version] — defaults to current version for this framework
 * @returns {{ system: string, version: string }}
 */
export function getSystemPrompt(framework, version) {
  const currentVersion = PROMPT_VERSIONS[framework] ?? 'v1.0';
  const resolvedVersion = version ?? currentVersion;
  const prompt = SYSTEM[framework] ?? SYSTEM.html;
  return { system: prompt, version: resolvedVersion };
}

/**
 * Build the user message for a generation request.
 * @param {string} framework
 * @param {string} [extraPrompt]
 * @returns {string}
 */
export function buildUserMessage(framework, extraPrompt = '') {
  return USER_TEMPLATE(framework, extraPrompt);
}

/**
 * List all frameworks with their current prompt version.
 * @returns {Array<{ framework: string, version: string, label: string }>}
 */
export function listPromptVersions() {
  return Object.entries(PROMPT_VERSIONS).map(([framework, version]) => ({
    framework,
    version,
    label: FRAMEWORK_LABELS[framework] ?? framework,
  }));
}

/**
 * Check whether a given version is the current version for a framework.
 * Used by the cache layer to detect stale cached results.
 * @param {string} framework
 * @param {string} version
 * @returns {boolean}
 */
export function isCurrentVersion(framework, version) {
  return (PROMPT_VERSIONS[framework] ?? 'v1.0') === version;
}
