/**
 * DropAnyConvert — Service Worker Registration Hook
 *
 * Registers /sw.js when it exists.
 * No offline conversion is implemented yet — this is a PWA foundation hook.
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
