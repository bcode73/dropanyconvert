/**
 * DropAnyConvert — Developer Runtime
 *
 * Handles the text-editor UI for all developer tools (uiGroup: 'developer').
 * Loaded only on developer tool pages — not on image/PDF tool pages.
 *
 * Reads configuration from #dac-dev-tool data attributes:
 *   data-tool-id, data-engine, data-engine-fn
 *   data-output-type  ('text' | 'image' | 'image-svg' | 'validation' | 'color' | 'regex' | 'dual')
 *   data-input-type   ('text' | 'image' | 'none')
 *   data-live-preview ('true' | 'false')
 *   data-download-ext
 *   data-download-mime
 *   data-sample       (JSON-encoded sample input)
 */

(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────────────────────

  let engine   = null;
  let engineFn = null;
  let config   = {};
  let debounceTimer = null;

  // ── Elements ──────────────────────────────────────────────────────────────

  const root       = () => document.getElementById('dac-dev-tool');
  const inputEl    = () => document.getElementById('dac-dev-input');
  const testEl     = () => document.getElementById('dac-dev-test');   // regex tester secondary
  const outputEl   = () => document.getElementById('dac-dev-output');
  const outputImgEl= () => document.getElementById('dac-dev-output-img');
  const outputWrap = () => document.getElementById('dac-dev-output-wrap');
  const colorPreview = () => document.getElementById('dac-dev-color-preview');
  const runBtn     = () => document.getElementById('dac-dev-run');
  const sampleBtn  = () => document.getElementById('dac-dev-sample');
  const clearBtn   = () => document.getElementById('dac-dev-clear');
  const copyBtn    = () => document.getElementById('dac-dev-copy');
  const downloadBtn= () => document.getElementById('dac-dev-download');
  const dropZone   = () => document.getElementById('dac-dev-drop');
  const status     = () => document.getElementById('dac-dev-status');

  // ── Engine Loader ─────────────────────────────────────────────────────────

  async function loadEngine(engineId) {
    if (engine) return;
    const url = `/assets/js/engines/${engineId}.js`;
    try {
      const mod = await import(url);
      engine   = mod;
      engineFn = mod[config.engineFn];
      if (!engineFn) throw new Error(`Engine function '${config.engineFn}' not found in ${engineId}.`);
    } catch (e) {
      showStatus(`Failed to load engine: ${e.message}`, 'error');
    }
  }

  // ── Read options from the page ────────────────────────────────────────────

  function readOptions() {
    const opts = {};
    document.querySelectorAll('[data-opt-key]').forEach(el => {
      const key = el.dataset.optKey;
      if (el.type === 'checkbox') opts[key] = el.checked;
      else opts[key] = el.value;
    });
    return opts;
  }

  // ── Status display ────────────────────────────────────────────────────────

  function showStatus(msg, type = 'info') {
    const el = status();
    if (!el) return;
    el.textContent = msg;
    el.className = `dac-dev-status dac-dev-status--${type}`;
    el.hidden = false;
  }

  function hideStatus() {
    const el = status();
    if (el) el.hidden = true;
  }

  // ── Run ───────────────────────────────────────────────────────────────────

  async function run() {
    if (!engine) await loadEngine(config.engine);
    if (!engineFn) return;

    const inputType = config.inputType || 'text';
    let input = '';

    if (inputType === 'text' || inputType === 'dual') {
      input = inputEl()?.value || '';
      if (!input.trim() && inputType !== 'none') {
        if (config.inputType !== 'none') { showStatus('Please enter some input.', 'warn'); return; }
      }
    } else if (inputType === 'image') {
      input = inputEl()?.dataset.dataUrl || '';
      if (!input) { showStatus('Please drop or select an image file.', 'warn'); return; }
    }

    const opts = readOptions();
    if (config.inputType === 'dual' || config.outputType === 'regex') {
      opts.testInput = testEl()?.value || '';
    }

    showStatus('Processing…', 'info');
    runBtn()?.setAttribute('disabled', '');

    try {
      const result = await Promise.resolve(engineFn(input, opts));
      renderResult(result);
      hideStatus();

      // Record in analytics
      window.DAC?.analytics?.track('conversion_completed', { toolId: config.toolId, outputs: 1, errors: 0 });
    } catch (e) {
      showError(e.message || String(e));
      window.DAC?.analytics?.track('conversion_failed', { toolId: config.toolId, error: e.message });
    } finally {
      runBtn()?.removeAttribute('disabled');
    }
  }

  // ── Result rendering ──────────────────────────────────────────────────────

  function renderResult(result) {
    const outputType = config.outputType || 'text';
    const wrap = outputWrap();
    if (wrap) wrap.hidden = false;

    if (outputType === 'image' && result.output?.startsWith('data:')) {
      const img = outputImgEl();
      const textarea = outputEl();
      if (img) { img.src = result.output; img.hidden = false; }
      if (textarea) textarea.hidden = true;
      storeDownload(result.output, result.outputExt || 'png', result.outputMime || 'image/png');
    } else if (outputType === 'image-svg' && typeof result.output === 'string') {
      const img = outputImgEl();
      const textarea = outputEl();
      if (img) {
        if (_svgBlobUrl) { URL.revokeObjectURL(_svgBlobUrl); _svgBlobUrl = null; }
        const blob = new Blob([result.output], { type: 'image/svg+xml' });
        _svgBlobUrl = URL.createObjectURL(blob);
        img.src = _svgBlobUrl;
        img.hidden = false;
      }
      if (textarea) { textarea.value = result.output; textarea.hidden = false; }
      storeDownload(result.output, 'svg', 'image/svg+xml', true);
    } else if (outputType === 'color' && result.meta) {
      const textarea = outputEl();
      if (textarea) { textarea.value = result.output; textarea.hidden = false; }
      const preview = colorPreview();
      if (preview) {
        preview.style.background = result.meta.hex;
        preview.title = result.meta.hex;
        preview.hidden = false;
      }
      storeDownload(result.output, 'txt', 'text/plain');
    } else {
      // text / validation / regex — always use textarea
      const img = outputImgEl();
      const textarea = outputEl();
      if (img) img.hidden = true;
      if (textarea) { textarea.value = result.output || ''; textarea.hidden = false; }
      storeDownload(result.output || '', result.outputExt || config.downloadExt || 'txt', result.outputMime || config.downloadMime || 'text/plain');
    }

    if (copyBtn()) copyBtn().disabled = false;
    if (downloadBtn()) downloadBtn().disabled = false;
  }

  // ── Error rendering ───────────────────────────────────────────────────────

  function showError(msg) {
    const textarea = outputEl();
    const img = outputImgEl();
    const wrap = outputWrap();
    if (img) img.hidden = true;
    if (wrap) wrap.hidden = false;
    if (textarea) { textarea.value = ''; textarea.hidden = false; }
    showStatus('✗ ' + msg, 'error');
    if (copyBtn()) copyBtn().disabled = true;
    if (downloadBtn()) downloadBtn().disabled = true;
  }

  // ── Download helpers ──────────────────────────────────────────────────────

  let _downloadData = null;
  let _downloadExt  = 'txt';
  let _downloadMime = 'text/plain';
  let _isSvg        = false;
  let _svgBlobUrl   = null;   // tracked so we can revoke on next render / clear

  function storeDownload(data, ext, mime, isSvg = false) {
    _downloadData = data;
    _downloadExt  = ext;
    _downloadMime = mime;
    _isSvg = isSvg;
  }

  function doDownload() {
    if (!_downloadData) return;
    let blob;
    if (_isSvg) blob = new Blob([_downloadData], { type: 'image/svg+xml' });
    else if (_downloadData.startsWith?.('data:')) {
      // Convert data URL to blob
      const [meta, b64] = _downloadData.split(',');
      const mime = meta.match(/:(.*?);/)?.[1] || _downloadMime;
      const bytes = atob(b64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      blob = new Blob([arr], { type: mime });
    } else {
      blob = new Blob([_downloadData], { type: _downloadMime });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.toolId || 'output'}.${_downloadExt}`;
    a.click();
    URL.revokeObjectURL(url);
    window.DAC?.analytics?.track('download_completed', { toolId: config.toolId, type: 'dev' });
  }

  function doCopy() {
    const textarea = outputEl();
    const img = outputImgEl();
    if (textarea && !textarea.hidden && textarea.value) {
      navigator.clipboard?.writeText(textarea.value).then(() => {
        const btn = copyBtn();
        if (btn) { btn.textContent = '✓ Copied'; setTimeout(() => { btn.textContent = 'Copy'; }, 2000); }
      }).catch(() => {});
    } else if (img && !img.hidden) {
      showStatus('Right-click the image to copy or save.', 'info');
    }
  }

  // ── Live preview ──────────────────────────────────────────────────────────

  function onInputChange() {
    if (!config.livePreview) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(run, 500);
  }

  // ── File drop (text files & image files) ──────────────────────────────────

  function setupFileDrop() {
    const drop = dropZone();
    if (!drop) return;

    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dac-dev-drop--over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dac-dev-drop--over'));
    drop.addEventListener('drop', e => {
      e.preventDefault();
      drop.classList.remove('dac-dev-drop--over');
      const file = e.dataTransfer.files[0];
      if (!file) return;
      handleFile(file);
    });

    drop.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      if (config.inputType === 'image') input.accept = 'image/*';
      else input.accept = '.txt,.json,.xml,.yaml,.yml,.csv,.html,.css,.js,.ts,.md';
      input.onchange = () => { if (input.files[0]) handleFile(input.files[0]); };
      input.click();
    });
  }

  function handleFile(file) {
    const maxBytes = config.inputType === 'image' ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      showStatus(`File is too large (${(file.size/1048576).toFixed(1)} MB). Max ${maxBytes/1048576} MB for in-browser processing.`, 'error');
      return;
    }
    if (config.inputType === 'image') {
      const reader = new FileReader();
      reader.onerror = () => showStatus('Failed to read file.', 'error');
      reader.onload = e => {
        const inp = inputEl();
        if (inp) inp.dataset.dataUrl = e.target.result;
        const drop = dropZone();
        if (drop) drop.querySelector('.dac-dev-drop__label').textContent = file.name;
        run();
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onerror = () => showStatus('Failed to read file.', 'error');
      reader.onload = e => {
        const inp = inputEl();
        if (inp) { inp.value = e.target.result; inp.dispatchEvent(new Event('input')); }
      };
      reader.readAsText(file);
    }
  }

  // ── Sample data ───────────────────────────────────────────────────────────

  function loadSample() {
    const sample = config.sample;
    if (!sample) return;
    const inp = inputEl();
    if (inp) { inp.value = sample; inp.dispatchEvent(new Event('input')); }
    const testInp = testEl();
    if (testInp && config.testInput) testInp.value = config.testInput;
    if (config.livePreview) run();
  }

  // ── Clear ─────────────────────────────────────────────────────────────────

  function clearAll() {
    const inp = inputEl();
    if (inp) { inp.value = ''; delete inp.dataset.dataUrl; }
    const testInp = testEl();
    if (testInp) testInp.value = '';
    const out = outputEl();
    if (out) { out.value = ''; out.hidden = true; }
    const img = outputImgEl();
    if (img) {
      if (_svgBlobUrl) { URL.revokeObjectURL(_svgBlobUrl); _svgBlobUrl = null; }
      img.src = ''; img.hidden = true;
    }
    const preview = colorPreview();
    if (preview) preview.hidden = true;
    const wrap = outputWrap();
    if (wrap) wrap.hidden = true;
    if (copyBtn()) copyBtn().disabled = true;
    if (downloadBtn()) downloadBtn().disabled = true;
    hideStatus();
    _downloadData = null;
    const drop = dropZone();
    const lbl = drop?.querySelector('.dac-dev-drop__label');
    if (lbl) lbl.textContent = 'Drop a file here or click to browse';
  }

  // ── Option panels ─────────────────────────────────────────────────────────

  function buildOptionPanels() {
    const container = document.getElementById('dac-dev-options');
    if (!container) return;
    const optDefs = config.extraOptions || [];
    if (!optDefs.length) { container.hidden = true; return; }

    container.innerHTML = optDefs.map(opt => {
      switch (opt.type) {
        case 'select':
          return `<div class="dac-dev-opt">
            <label class="dac-label" for="opt-${opt.id}">${esc(opt.label)}</label>
            <select id="opt-${opt.id}" class="dac-select" data-opt-key="${esc(opt.id)}">
              ${opt.options.map(o => `<option value="${esc(o.value)}"${o.value===(opt.default||opt.options[0]?.value)?' selected':''}>${esc(o.label)}</option>`).join('')}
            </select>
          </div>`;
        case 'number':
          return `<div class="dac-dev-opt">
            <label class="dac-label" for="opt-${opt.id}">${esc(opt.label)}</label>
            <input type="number" id="opt-${opt.id}" class="dac-input" data-opt-key="${esc(opt.id)}"
                   min="${opt.min||1}" max="${opt.max||999}" value="${opt.default||1}">
          </div>`;
        case 'checkbox':
          return `<div class="dac-dev-opt dac-dev-opt--check">
            <label class="dac-checkbox-label">
              <input type="checkbox" id="opt-${opt.id}" data-opt-key="${esc(opt.id)}"${opt.default !== false?' checked':''}>
              ${esc(opt.label)}
            </label>
          </div>`;
        case 'checkboxGroup':
          return `<div class="dac-dev-opt">
            <span class="dac-label">${esc(opt.label)}</span>
            <div class="dac-dev-opt-checks">
              ${opt.options.map(o =>
                `<label class="dac-checkbox-label">
                  <input type="checkbox" name="opt-${esc(opt.id)}" value="${esc(o.value)}"
                         data-opt-key="${esc(opt.id)}-${esc(o.value)}"${o.default?' checked':''}>
                  ${esc(o.label)}
                </label>`).join('')}
            </div>
          </div>`;
        case 'text':
          return `<div class="dac-dev-opt">
            <label class="dac-label" for="opt-${opt.id}">${esc(opt.label)}</label>
            <input type="text" id="opt-${opt.id}" class="dac-input" data-opt-key="${esc(opt.id)}"
                   placeholder="${esc(opt.placeholder||'')}" value="${esc(opt.default||'')}">
          </div>`;
        case 'color':
          return `<div class="dac-dev-opt">
            <label class="dac-label" for="opt-${opt.id}">${esc(opt.label)}</label>
            <input type="color" id="opt-${opt.id}" class="dac-color-input" data-opt-key="${esc(opt.id)}"
                   value="${esc(opt.default||'#000000')}">
          </div>`;
        default:
          return '';
      }
    }).join('');

    // Handle checkboxGroup — collect all checked values for a flag key
    container.querySelectorAll('[name^="opt-"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const name = cb.name.replace('opt-', '');
        const checked = [...container.querySelectorAll(`[name="opt-${name}"]:checked`)].map(el => el.value).join('');
        cb.closest('.dac-dev-opt-checks').dataset.flagValue = checked;
      });
    });

    container.hidden = false;
  }

  // Override readOptions for checkboxGroups:
  function readOptions() {
    const opts = {};
    document.querySelectorAll('[data-opt-key]').forEach(el => {
      const key = el.dataset.optKey;
      if (el.type === 'checkbox') {
        // If this belongs to a checkboxGroup, collect flags string
        if (el.name && el.name.startsWith('opt-')) {
          const groupKey = el.name.replace('opt-', '');
          opts[groupKey] = (opts[groupKey] || '') + (el.checked ? el.value : '');
        } else {
          opts[key] = el.checked;
        }
      } else {
        opts[key] = el.value;
      }
    });
    return opts;
  }

  // ── HTML escape ───────────────────────────────────────────────────────────

  function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', async () => {
    const el = root();
    if (!el) return;

    config = {
      toolId:       el.dataset.toolId       || '',
      engine:       el.dataset.engine       || 'developer_engine',
      engineFn:     el.dataset.engineFn     || '',
      outputType:   el.dataset.outputType   || 'text',
      inputType:    el.dataset.inputType    || 'text',
      livePreview:  el.dataset.livePreview  === 'true',
      downloadExt:  el.dataset.downloadExt  || 'txt',
      downloadMime: el.dataset.downloadMime || 'text/plain',
      sample:       (() => { try { return JSON.parse(el.dataset.sample || 'null'); } catch { return el.dataset.sample || ''; } })(),
      testInput:    el.dataset.testInput    || '',
      extraOptions: (() => { try { return JSON.parse(el.dataset.extraOptions || '[]'); } catch { return []; } })(),
    };

    // Pre-load engine so first run is instant
    await loadEngine(config.engine);

    // Build option panels
    buildOptionPanels();

    // Wire file drop for image-input tools
    setupFileDrop();

    // Wire textarea input for live preview / text tools
    const inp = inputEl();
    if (inp) inp.addEventListener('input', onInputChange);
    const testInp = testEl();
    if (testInp) testInp.addEventListener('input', onInputChange);

    // Buttons
    runBtn()?.addEventListener('click', run);
    sampleBtn()?.addEventListener('click', loadSample);
    clearBtn()?.addEventListener('click', clearAll);
    copyBtn()?.addEventListener('click', doCopy);
    downloadBtn()?.addEventListener('click', doDownload);

    // For generator tools (no input), auto-run on page load with defaults
    if (config.inputType === 'none') run();

    // Track tool open
    window.DAC?.analytics?.track('tool_open', { toolId: config.toolId });
  });

})();
