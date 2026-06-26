/**
 * Renders AdSense snippet HTML for a given placement.
 * Templates call this; ads.json drives the configuration.
 * Legal pages never receive ads (enforced by template binding, not here).
 */

export function renderAdBlock(placement, adsConfig, langCode) {
  if (!adsConfig.enabled) return '';
  const p = adsConfig.placements[placement];
  if (!p) return '';

  const label = p.label?.[langCode] || p.label?.en || 'Advertisement';

  return `<div class="dac-ad dac-ad--${placement}" aria-label="${label}">
  <ins class="adsbygoogle"
       style="${p.style}"
       data-ad-client="${adsConfig.clientId}"
       data-ad-slot="${p.adSlot}"
       data-ad-format="${p.format}"
       ${p.responsive ? 'data-full-width-responsive="true"' : ''}></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>`;
}
