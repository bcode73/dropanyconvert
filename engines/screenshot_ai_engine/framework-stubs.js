/**
 * Framework-specific generation stubs.
 *
 * Each function is an architecture placeholder. Real implementations are
 * activated at runtime by injecting API keys into the AiProviderRouter.
 * All functions throw until the server runtime is active.
 */

function _notImplemented(framework) {
  throw new Error(
    `Screenshot → ${framework} generation requires the premium server runtime. ` +
    'Sign in and upgrade to activate.'
  );
}

export async function generateCode()           { _notImplemented('HTML'); }
export async function generateHtml()           { _notImplemented('HTML'); }
export async function generateHtmlCss()        { _notImplemented('HTML + CSS'); }
export async function generateTailwind()       { _notImplemented('Tailwind CSS'); }
export async function generateBootstrap()      { _notImplemented('Bootstrap'); }
export async function generateReactJsx()       { _notImplemented('React JSX'); }
export async function generateNextJs()         { _notImplemented('Next.js'); }
export async function generateVue()            { _notImplemented('Vue'); }
export async function generateSvelte()         { _notImplemented('Svelte'); }
export async function generateAngular()        { _notImplemented('Angular'); }
export async function generateFlutter()        { _notImplemented('Flutter'); }
export async function generateSwiftUI()        { _notImplemented('SwiftUI'); }
export async function generateEmail()          { _notImplemented('HTML Email'); }
export async function generateSvg()            { _notImplemented('SVG'); }
export async function generateCssGrid()        { _notImplemented('CSS Grid'); }
export async function generateWireframe()      { _notImplemented('Wireframe'); }
export async function generateComponentTree()  { _notImplemented('Component Tree'); }
export async function generateReactNative()    { _notImplemented('React Native'); }
export async function generateJetpackCompose() { _notImplemented('Jetpack Compose'); }
export async function generateBlazor()         { _notImplemented('Blazor'); }
export async function generateAlpine()         { _notImplemented('Alpine.js'); }
