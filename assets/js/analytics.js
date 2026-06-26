/**
 * DropAnyConvert — Analytics Abstraction
 *
 * The runtime emits structured events through this layer.
 * No third-party SDK is called here — integrations are registered
 * via DAC.analytics.use(handler) and executed on each track() call.
 *
 * Standard events:
 *   tool_open            { toolId }
 *   file_added           { toolId, count }
 *   conversion_started   { toolId, files }
 *   conversion_completed { toolId, outputs, errors }
 *   conversion_failed    { toolId, error }
 *   download_completed   { toolId, type, files? }
 *
 * To integrate a provider (e.g. GA4):
 *   DAC.analytics.use((event, props) => {
 *     gtag('event', event, props);
 *   });
 */

(function () {
  'use strict';

  const handlers = [];

  const analytics = {
    /**
     * Register an analytics handler.
     * handler: (eventName: string, properties: object) => void
     */
    use(handler) {
      if (typeof handler === 'function') handlers.push(handler);
    },

    /**
     * Emit a named event with optional properties.
     * Called by the runtime — never call provider SDKs directly.
     */
    track(event, properties = {}) {
      for (const handler of handlers) {
        try {
          handler(event, { ...properties, _ts: Date.now() });
        } catch {
          // Individual handler failures must never affect the runtime
        }
      }
    },
  };

  // Expose on the global DAC namespace
  window.DAC = window.DAC || {};
  window.DAC.analytics = analytics;
})();
