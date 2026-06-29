/**
 * Screenshot AI Runtime — Browser UI scaffolding
 *
 * Handles: upload, drag-and-drop, clipboard paste, preview, zoom,
 * progress UI, streaming placeholder, code viewer, copy, download,
 * regenerate, compare, history hooks, premium badge hooks.
 *
 * No real AI calls are made here. All AI requests go through
 * POST /api/v1/convert/{slug} once the server runtime is active.
 * Until then, the UI renders a premium-gated placeholder state.
 */

(function () {
  'use strict';

  const DAC_AI = window.DAC_AI = {};

  // ── State ────────────────────────────────────────────────────────────────────

  const state = {
    imageData:     null,   // base64 data URI of uploaded screenshot
    imageWidth:    0,
    imageHeight:   0,
    framework:     null,   // target framework slug from page meta
    generating:    false,
    generationId:  null,
    history:       [],     // local generation history (max 10)
    currentCode:   '',
    provider:      null,   // provider used for last generation
    creditsLeft:   null,   // null = not loaded yet
    streamBuffer:  '',
  };

  // ── DOM refs ─────────────────────────────────────────────────────────────────

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function refs() {
    return {
      dropzone:      $('#dac-ai-dropzone'),
      fileInput:     $('#dac-ai-file-input'),
      preview:       $('#dac-ai-preview'),
      previewImg:    $('#dac-ai-preview-img'),
      previewClear:  $('#dac-ai-preview-clear'),
      zoomIn:        $('#dac-ai-zoom-in'),
      zoomOut:       $('#dac-ai-zoom-out'),
      generateBtn:   $('#dac-ai-generate'),
      regenerateBtn: $('#dac-ai-regenerate'),
      compareBtn:    $('#dac-ai-compare'),
      progressWrap:  $('#dac-ai-progress'),
      progressBar:   $('#dac-ai-progress-bar'),
      progressLabel: $('#dac-ai-progress-label'),
      outputWrap:    $('#dac-ai-output'),
      codeViewer:    $('#dac-ai-code'),
      copyBtn:       $('#dac-ai-copy'),
      downloadBtn:   $('#dac-ai-download'),
      premiumBadge:  $('#dac-ai-premium-badge'),
      loginPrompt:   $('#dac-ai-login-prompt'),
      creditsDisplay:$('#dac-ai-credits'),
      historyList:   $('#dac-ai-history'),
      errorMsg:      $('#dac-ai-error'),
      frameworkSel:  $('#dac-ai-framework'),
      providerLabel: $('#dac-ai-provider-label'),
    };
  }

  let _refs = null;
  function r() { return _refs || (_refs = refs()); }

  // ── Init ─────────────────────────────────────────────────────────────────────

  function init() {
    _detectFramework();
    _bindUpload();
    _bindClipboard();
    _bindButtons();
    _bindZoom();
    _loadCredits();
    _renderPremiumGate();
  }

  function _detectFramework() {
    // Framework is embedded in the page by the generator
    const meta = $('meta[name="dac-framework"]');
    state.framework = meta?.content || document.body.dataset.framework || 'html';
  }

  // ── Upload / Drag-drop / Clipboard ───────────────────────────────────────────

  function _bindUpload() {
    const dz = r().dropzone;
    const fi = r().fileInput;
    if (!dz) return;

    // File input change
    fi?.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (file) _loadFile(file);
    });

    // Click to open file picker
    dz.addEventListener('click', () => fi?.click());

    // Drag events
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dac-ai-dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dac-ai-dragover'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('dac-ai-dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) _loadFile(file);
    });
  }

  function _bindClipboard() {
    // Ctrl+V / Cmd+V to paste screenshot
    document.addEventListener('paste', e => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) { _loadFile(file); break; }
        }
      }
    });
  }

  function _loadFile(file) {
    if (!file.type.startsWith('image/')) {
      _showError('Please upload a PNG, JPG, WebP, or GIF screenshot.');
      return;
    }
    const maxBytes = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxBytes) {
      _showError('Image too large. Maximum size is 10 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      state.imageData = e.target.result;
      _getImageDimensions(state.imageData, (w, h) => {
        state.imageWidth = w;
        state.imageHeight = h;
      });
      _showPreview(state.imageData);
    };
    reader.readAsDataURL(file);
  }

  function _getImageDimensions(dataUri, cb) {
    const img = new Image();
    img.onload = () => cb(img.naturalWidth, img.naturalHeight);
    img.src = dataUri;
  }

  // ── Preview ───────────────────────────────────────────────────────────────────

  let _zoomLevel = 1;

  function _showPreview(src) {
    const { preview, previewImg, dropzone } = r();
    if (!preview) return;
    if (previewImg) previewImg.src = src;
    if (dropzone) dropzone.style.display = 'none';
    preview.style.display = '';
    _enableGenerateButton(true);
  }

  function _bindZoom() {
    r().zoomIn?.addEventListener('click', () => _setZoom(_zoomLevel + 0.25));
    r().zoomOut?.addEventListener('click', () => _setZoom(_zoomLevel - 0.25));
    r().previewClear?.addEventListener('click', _clearPreview);
  }

  function _setZoom(level) {
    _zoomLevel = Math.max(0.25, Math.min(4, level));
    const img = r().previewImg;
    if (img) img.style.transform = `scale(${_zoomLevel})`;
  }

  function _clearPreview() {
    state.imageData = null;
    state.imageWidth = 0;
    state.imageHeight = 0;
    const { preview, dropzone, fileInput } = r();
    if (preview) preview.style.display = 'none';
    if (dropzone) dropzone.style.display = '';
    if (fileInput) fileInput.value = '';
    _enableGenerateButton(false);
    _clearOutput();
    _zoomLevel = 1;
  }

  // ── Buttons ───────────────────────────────────────────────────────────────────

  function _bindButtons() {
    r().generateBtn?.addEventListener('click',   _handleGenerate);
    r().regenerateBtn?.addEventListener('click', _handleRegenerate);
    r().compareBtn?.addEventListener('click',    _handleCompare);
    r().copyBtn?.addEventListener('click',       _handleCopy);
    r().downloadBtn?.addEventListener('click',   _handleDownload);
    r().loginPrompt?.addEventListener('click',   _handleLoginClick);
  }

  function _enableGenerateButton(enabled) {
    const btn = r().generateBtn;
    if (btn) btn.disabled = !enabled;
  }

  // ── Generate ──────────────────────────────────────────────────────────────────

  function _handleGenerate() {
    if (!state.imageData) { _showError('Please upload a screenshot first.'); return; }
    if (!_isPremium()) { _showPremiumGate(); return; }
    _startGeneration();
  }

  function _handleRegenerate() {
    if (!state.imageData) { _showError('No screenshot loaded.'); return; }
    if (!_isPremium()) { _showPremiumGate(); return; }
    _startGeneration({ regenerate: true });
  }

  function _handleCompare() {
    // Compare two provider outputs — architecture hook, requires server runtime
    _showError('Compare feature requires the server runtime. Coming soon for premium users.');
  }

  function _startGeneration({ regenerate = false } = {}) {
    if (state.generating) return;
    state.generating = true;
    state.streamBuffer = '';

    _showProgress('Preparing your screenshot…', 5);
    _clearOutput();
    _clearError();
    _enableGenerateButton(false);

    // Simulate streaming progress while awaiting real AI (architecture stub)
    _simulateStreamingProgress(() => {
      _showProgress('AI is generating your code…', 50);
    }, () => {
      // When server runtime is active, replace this with real fetch:
      // fetch(`/api/v1/convert/${state.framework}`, { method: 'POST', body: JSON.stringify({ imageData, framework, stream: true }) })
      //   .then(res => _handleStreamResponse(res))
      //   .catch(_handleGenerationError);

      _handleGenerationError(new Error(
        'AI generation requires the premium server runtime. ' +
        'Sign in and upgrade to a Pro or Business plan to enable Screenshot → Code.'
      ));
    });
  }

  function _simulateStreamingProgress(onMid, onDone) {
    let pct = 5;
    const tick = () => {
      pct = Math.min(pct + 8, 45);
      _showProgress('Processing screenshot…', pct);
      if (pct < 45) setTimeout(tick, 300);
      else { onMid(); setTimeout(onDone, 500); }
    };
    setTimeout(tick, 200);
  }

  function _handleGenerationError(err) {
    state.generating = false;
    _hideProgress();
    _enableGenerateButton(true);
    _showError(err.message);
  }

  // ── Streaming code viewer ─────────────────────────────────────────────────────

  /**
   * Called with each streaming chunk from the server.
   * @param {string} chunk
   */
  DAC_AI.appendChunk = function (chunk) {
    state.streamBuffer += chunk;
    const viewer = r().codeViewer;
    if (viewer) {
      viewer.textContent = state.streamBuffer;
      // Syntax highlight hook — call highlighter if loaded (e.g. Prism, Highlight.js)
      if (window.Prism) Prism.highlightElement(viewer);
    }
    r().outputWrap?.style && (r().outputWrap.style.display = '');
  };

  /**
   * Called when streaming is complete.
   * @param {{ generationId: string, provider: string, usage: object }} meta
   */
  DAC_AI.onStreamComplete = function (meta) {
    state.generating = false;
    state.currentCode = state.streamBuffer;
    state.generationId = meta.generationId;
    state.provider = meta.provider;
    _hideProgress();
    _enableGenerateButton(true);
    _showProviderLabel(meta.provider);
    _addToHistory(meta);
    _updateCreditsDisplay(meta.usage?.creditsDeducted);
    r().regenerateBtn && (r().regenerateBtn.disabled = false);
    r().compareBtn    && (r().compareBtn.disabled = false);
  };

  // ── Copy / Download ───────────────────────────────────────────────────────────

  function _handleCopy() {
    if (!state.currentCode) return;
    navigator.clipboard?.writeText(state.currentCode).then(() => {
      const btn = r().copyBtn;
      if (btn) { btn.textContent = '✓ Copied'; setTimeout(() => { btn.textContent = 'Copy'; }, 2000); }
    }).catch(() => {});
  }

  function _handleDownload() {
    if (!state.currentCode) return;
    const ext = _frameworkExtension(state.framework);
    const blob = new Blob([state.currentCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screenshot-to-${state.framework}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function _frameworkExtension(framework) {
    const map = {
      react: 'jsx', nextjs: 'jsx', vue: 'vue', svelte: 'svelte',
      angular: 'ts', flutter: 'dart', swiftui: 'swift',
      'jetpack-compose': 'kt', blazor: 'razor',
      'component-tree': 'json',
    };
    return map[framework] || 'html';
  }

  // ── Premium gate ──────────────────────────────────────────────────────────────

  function _isPremium() {
    // Hook into platform.js user state
    return window.DAC?.user?.plan === 'pro' || window.DAC?.user?.plan === 'business';
  }

  function _renderPremiumGate() {
    if (!_isPremium()) {
      const badge = r().premiumBadge;
      if (badge) badge.style.display = '';
      _enableGenerateButton(false);
    }
  }

  function _showPremiumGate() {
    const prompt = r().loginPrompt;
    if (prompt) { prompt.style.display = ''; prompt.scrollIntoView({ behavior: 'smooth' }); }
  }

  function _handleLoginClick() {
    // Redirect to login/signup — URL set by platform.js
    window.location.href = window.DAC?.loginUrl || '/en/login';
  }

  // ── Credits display ───────────────────────────────────────────────────────────

  function _loadCredits() {
    // Placeholder — real implementation fetches from /api/v1/credits
    state.creditsLeft = null;
  }

  function _updateCreditsDisplay(deducted) {
    if (deducted && state.creditsLeft !== null) {
      state.creditsLeft = Math.max(0, state.creditsLeft - deducted);
      const el = r().creditsDisplay;
      if (el) el.textContent = `${state.creditsLeft} credits remaining`;
    }
  }

  // ── History ───────────────────────────────────────────────────────────────────

  function _addToHistory(meta) {
    state.history.unshift({ ...meta, timestamp: Date.now(), code: state.currentCode });
    if (state.history.length > 10) state.history.pop();
    _renderHistory();
  }

  function _renderHistory() {
    const list = r().historyList;
    if (!list) return;
    list.innerHTML = state.history.map((item, i) =>
      `<li data-idx="${i}" class="dac-ai-history-item">
        <span class="dac-ai-history-framework">${item.framework || state.framework}</span>
        <span class="dac-ai-history-provider">${item.provider || ''}</span>
        <button class="dac-ai-history-restore">Restore</button>
      </li>`
    ).join('');
    list.querySelectorAll('.dac-ai-history-restore').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = +btn.closest('[data-idx]').dataset.idx;
        _restoreFromHistory(idx);
      });
    });
  }

  function _restoreFromHistory(idx) {
    const item = state.history[idx];
    if (!item) return;
    state.currentCode = item.code;
    state.generationId = item.generationId;
    const viewer = r().codeViewer;
    if (viewer) {
      viewer.textContent = item.code;
      if (window.Prism) Prism.highlightElement(viewer);
    }
    r().outputWrap?.style && (r().outputWrap.style.display = '');
  }

  // ── Progress UI ───────────────────────────────────────────────────────────────

  function _showProgress(label, pct) {
    const { progressWrap, progressBar, progressLabel } = r();
    if (progressWrap) progressWrap.style.display = '';
    if (progressBar) progressBar.style.width = `${pct}%`;
    if (progressLabel) progressLabel.textContent = label;
  }

  function _hideProgress() {
    const { progressWrap, progressBar } = r();
    if (progressWrap) progressWrap.style.display = 'none';
    if (progressBar) progressBar.style.width = '0%';
  }

  // ── Output / Error helpers ────────────────────────────────────────────────────

  function _clearOutput() {
    state.currentCode = '';
    state.streamBuffer = '';
    const { outputWrap, codeViewer } = r();
    if (outputWrap) outputWrap.style.display = 'none';
    if (codeViewer) codeViewer.textContent = '';
  }

  function _showError(msg) {
    const el = r().errorMsg;
    if (el) { el.textContent = msg; el.style.display = ''; }
  }

  function _clearError() {
    const el = r().errorMsg;
    if (el) { el.textContent = ''; el.style.display = 'none'; }
  }

  function _showProviderLabel(provider) {
    const el = r().providerLabel;
    if (el) el.textContent = `Generated by ${provider || 'AI'}`;
  }

  // ── Boot ──────────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
