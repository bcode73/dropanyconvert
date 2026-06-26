/**
 * DropAnyConvert — Browser Runtime
 *
 * Reads configuration from data-* attributes on #dac-dropzone.
 * Dynamically imports the engine module at /assets/js/engines/{engineName}.js.
 * Handles: drag-drop, click, clipboard paste, queue, progress, download, ZIP.
 */

(function () {
  'use strict';

  // ── Boot ──────────────────────────────────────────────────────────────────

  const dropzone = document.getElementById('dac-dropzone');
  if (!dropzone) return;

  const $ = id => document.getElementById(id);

  const fileInput     = $('dac-file-input');
  const batchQueue    = $('dac-batch-queue');
  const optionsPanel  = $('dac-options');
  const controls      = $('dac-controls');
  const convertBtn    = $('dac-convert-btn');
  const clearBtn      = $('dac-clear-btn');
  const progressWrap  = $('dac-progress-wrap');
  const progressBar   = $('dac-progress-bar');
  const progressLabel = $('dac-progress-label');
  const results       = $('dac-results');
  const qualityInput  = $('dac-quality');
  const qualityOutput = $('dac-quality-output');
  const formatSelect  = $('dac-output-format');
  const textInputEl   = $('dac-text-input');       // base64-to-image textarea
  const wmOpacityOut  = $('dac-wm-opacity-out');   // watermark opacity display

  const engineName = dropzone.dataset.engine;
  const engineFn   = dropzone.dataset.engineFn;
  const toolId     = dropzone.dataset.toolId || engineFn;
  const accept     = (dropzone.dataset.accept || '').split(',').map(s => s.trim()).filter(Boolean);
  const maxFiles   = parseInt(dropzone.dataset.maxFiles, 10) || 1;
  const isBatch    = dropzone.dataset.batch === 'true';

  // Notify the analytics layer that this tool page is active
  window.DAC?.analytics?.track('tool_open', { toolId });

  let selectedFiles = [];
  let objectUrls = [];        // preview URLs — tracked for cleanup
  let downloadUrls = [];      // result download URLs — tracked for cleanup
  let isConverting = false;

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('dac-dropzone--active');
  });

  ['dragleave', 'dragend'].forEach(ev =>
    dropzone.addEventListener(ev, () => dropzone.classList.remove('dac-dropzone--active'))
  );

  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dac-dropzone--active');
    handleFiles([...e.dataTransfer.files]);
  });

  // ── Click to browse ───────────────────────────────────────────────────────

  dropzone.addEventListener('click', e => {
    if (e.target === dropzone || e.target.classList.contains('dac-dropzone__label') ||
        e.target.classList.contains('dac-dropzone__icon') ||
        e.target.classList.contains('dac-dropzone__hint')) {
      fileInput.click();
    }
  });

  dropzone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });

  fileInput.addEventListener('change', () => {
    handleFiles([...fileInput.files]);
    fileInput.value = '';
  });

  // ── Clipboard Paste ───────────────────────────────────────────────────────

  document.addEventListener('paste', e => {
    const files = [...(e.clipboardData?.files || [])];
    if (files.length) {
      e.preventDefault();
      handleFiles(files);
    }
  });

  // ── Quality Slider ────────────────────────────────────────────────────────

  if (qualityInput && qualityOutput) {
    function updateQualitySlider() {
      qualityOutput.value = qualityInput.value;
      const pct = ((qualityInput.value - qualityInput.min) / (qualityInput.max - qualityInput.min)) * 100;
      qualityInput.style.setProperty('--pct', pct + '%');
    }
    qualityInput.addEventListener('input', updateQualitySlider);
    updateQualitySlider();
  }

  // ── Watermark opacity display ─────────────────────────────────────────────

  const wmOpacitySlider = document.getElementById('dac-opt-wm-opacity');
  if (wmOpacitySlider && wmOpacityOut) {
    wmOpacitySlider.addEventListener('input', () => { wmOpacityOut.value = wmOpacitySlider.value; });
  }

  // ── Text input (base64 textarea) — treat as synthetic File on convert ─────

  if (textInputEl) {
    // Show controls when textarea has content (no file needed)
    textInputEl.addEventListener('input', () => {
      if (textInputEl.value.trim()) syncUI(true);
    });
  }

  // ── File Handling ─────────────────────────────────────────────────────────

  function handleFiles(files) {
    const valid = files.filter(f => accept.length === 0 || accept.includes(f.type));
    if (!valid.length) return;

    if (isBatch) {
      selectedFiles = [...selectedFiles, ...valid].slice(0, maxFiles);
    } else {
      revokeAllPreviews();
      selectedFiles = [valid[0]];
    }

    window.DAC?.analytics?.track('file_added', { toolId, count: selectedFiles.length });
    renderQueue();
    syncUI();
  }

  function removeFile(index) {
    if (objectUrls[index]) {
      URL.revokeObjectURL(objectUrls[index]);
      objectUrls[index] = null;
    }
    selectedFiles.splice(index, 1);
    objectUrls.splice(index, 1);
    renderQueue();
    syncUI();
  }

  // ── Queue Rendering ───────────────────────────────────────────────────────

  function renderQueue() {
    if (!batchQueue) return;

    if (!selectedFiles.length) {
      batchQueue.hidden = true;
      batchQueue.innerHTML = '';
      return;
    }

    batchQueue.hidden = false;
    batchQueue.innerHTML = selectedFiles.map((f, i) =>
      `<div class="dac-queue-item" data-index="${i}" id="dac-qi-${i}">
        <div class="dac-queue-item__preview" id="dac-preview-${i}">
          <span class="dac-queue-item__thumb-placeholder" aria-hidden="true"></span>
        </div>
        <div class="dac-queue-item__info">
          <span class="dac-queue-item__name" title="${esc(f.name)}">${esc(f.name)}</span>
          <span class="dac-queue-item__size">${fmtSize(f.size)}</span>
        </div>
        <span class="dac-queue-item__status" id="dac-qi-status-${i}" aria-label="Waiting"></span>
        <button class="dac-queue-item__remove" data-remove="${i}" aria-label="Remove ${esc(f.name)}" title="Remove">×</button>
      </div>`
    ).join('');

    // Bind remove buttons
    batchQueue.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        removeFile(parseInt(btn.dataset.remove, 10));
      });
    });

    // Generate image previews asynchronously
    selectedFiles.forEach((f, i) => {
      if (f.type.startsWith('image/') && !objectUrls[i]) {
        objectUrls[i] = URL.createObjectURL(f);
        const container = document.getElementById(`dac-preview-${i}`);
        if (container) {
          const img = document.createElement('img');
          img.src = objectUrls[i];
          img.alt = '';
          img.className = 'dac-queue-item__thumb';
          container.innerHTML = '';
          container.appendChild(img);
        }
      }
    });
  }

  function setItemStatus(index, state) {
    const el = document.getElementById(`dac-qi-status-${index}`);
    if (!el) return;
    el.className = `dac-queue-item__status dac-queue-item__status--${state}`;
    el.setAttribute('aria-label', state);
  }

  // ── UI State Sync ─────────────────────────────────────────────────────────

  function syncUI(forceReady) {
    const hasFiles = selectedFiles.length > 0 || forceReady;
    if (controls)     controls.hidden = !hasFiles || isConverting;
    if (optionsPanel) optionsPanel.hidden = !hasFiles || isConverting;
    if (results && !hasFiles) { results.hidden = true; results.innerHTML = ''; }
  }

  // ── Conversion ────────────────────────────────────────────────────────────

  convertBtn?.addEventListener('click', () => runConversion());

  clearBtn?.addEventListener('click', () => {
    selectedFiles = [];
    revokeAllPreviews();
    revokeAllDownloads();
    renderQueue();
    syncUI();
    if (results) { results.hidden = true; results.innerHTML = ''; }
    setProgress(0, '');
    if (progressWrap) progressWrap.hidden = true;
  });

  async function runConversion() {
    // Support text-input mode: create a synthetic File from the textarea
    if (!selectedFiles.length && textInputEl?.value.trim()) {
      const text = textInputEl.value.trim();
      const syntheticFile = new File([text], 'input.txt', { type: 'text/plain' });
      selectedFiles = [syntheticFile];
    }
    if (!selectedFiles.length || isConverting) return;

    isConverting = true;
    if (controls)    controls.hidden = true;
    if (optionsPanel) optionsPanel.hidden = true;
    if (results)     { results.hidden = true; results.innerHTML = ''; }
    if (progressWrap) progressWrap.hidden = false;
    setProgress(0, 'Loading engine…');

    selectedFiles.forEach((_, i) => setItemStatus(i, 'pending'));

    try {
      const mod = await import(`/assets/js/engines/${engineName}.js`);
      if (typeof mod[engineFn] !== 'function') throw new Error(`Engine function "${engineFn}" not found.`);

      window.DAC?.analytics?.track('conversion_started', { toolId, files: selectedFiles.length });
      setProgress(5, 'Converting…');

      let completed = 0;
      const context = {
        toolId,
        quality: qualityInput ? parseInt(qualityInput.value, 10) : 85,
        outputFormat: formatSelect ? formatSelect.value : null,
        onProgress(pct) {
          const overall = 5 + Math.round((pct / 100) * 90);
          setProgress(overall, `Converting ${completed + 1} of ${selectedFiles.length}…`);
          if (pct === 100) {
            setItemStatus(completed, 'done');
            completed++;
          }
        },
      };

      // Collect generic context inputs — covers resize, rotate, flip, crop, watermark, etc.
      document.querySelectorAll('.dac-context-input').forEach(el => {
        const key = el.dataset.contextKey;
        if (!key) return;
        if (el.type === 'radio')     { if (el.checked) context[key] = el.value; }
        else if (el.type === 'checkbox') { context[key] = el.checked; }
        else if (el.value !== '')    { context[key] = el.value; }
      });

      const result = await mod[engineFn]([...selectedFiles], context);

      window.DAC?.analytics?.track('conversion_completed', { toolId, outputs: result.outputs.length, errors: result.errors.length });
      setProgress(100, 'Done!');

      // Small delay so "100%" is visible before hiding
      await sleep(300);
      if (progressWrap) progressWrap.hidden = true;

      renderResults(result.outputs, result.errors);
    } catch (err) {
      window.DAC?.analytics?.track('conversion_failed', { toolId, error: err.message });
      if (progressWrap) progressWrap.hidden = true;
      renderError(err.message);
    } finally {
      isConverting = false;
      syncUI();
    }
  }

  // ── Results ───────────────────────────────────────────────────────────────

  async function renderResults(outputs, errors) {
    if (!results) return;
    results.hidden = false;

    // Clean up any URLs from a previous conversion before creating new ones
    revokeAllDownloads();

    let html = '';

    if (outputs.length > 0) {
      html += `<div class="dac-results__success">
        <div class="dac-results__check" aria-hidden="true"></div>
        <p class="dac-results__done-label">${outputs.length === 1
          ? 'Conversion complete!'
          : `${outputs.length} files converted!`
        }</p>
      </div>`;

      // Text-output mode: show copyable textarea instead of download link
      if (outputs.length === 1 && outputs[0].blob.type === 'text/plain') {
        const out = outputs[0];
        const text = await out.blob.text();
        const safeText = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        html += `<div class="dac-text-output">
          <div class="dac-text-output__header">
            <span class="dac-text-output__label">Output</span>
            <button class="dac-btn dac-btn--ghost dac-text-output__copy" type="button">Copy</button>
          </div>
          <textarea class="dac-textarea dac-text-output__area" readonly rows="8">${safeText}</textarea>
        </div>`;
      } else if (outputs.length === 1) {
        const out = outputs[0];
        const url = URL.createObjectURL(out.blob);
        downloadUrls.push(url);
        html += `<div class="dac-results__downloads">
          <a class="dac-btn dac-btn--primary dac-download-btn"
             href="${url}"
             download="${esc(out.name)}">
            Download ${esc(out.name)} <span class="dac-download-size">(${fmtSize(out.sizeBytes)})</span>
          </a>
        </div>`;
      } else {
        const individualLinks = outputs.map(out => {
          const url = URL.createObjectURL(out.blob);
          downloadUrls.push(url);
          return `<a class="dac-btn dac-btn--ghost dac-download-btn"
              href="${url}"
              download="${esc(out.name)}">
            ${esc(out.name)} <span class="dac-download-size">(${fmtSize(out.sizeBytes)})</span>
          </a>`;
        }).join('');

        html += `<div class="dac-results__downloads">
          <button class="dac-btn dac-btn--primary dac-download-btn" id="dac-zip-btn">
            Download all ${outputs.length} files as ZIP
          </button>
          <div class="dac-results__individual">${individualLinks}</div>
        </div>`;
      }
    }

    if (errors.length > 0) {
      html += `<div class="dac-results__errors">
        ${errors.map(e => `<p class="dac-error"><span aria-hidden="true">⚠</span> ${esc(e)}</p>`).join('')}
      </div>`;
    }

    results.innerHTML = html;

    // Wire text-output copy button
    const copyBtn = results.querySelector('.dac-text-output__copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const area = results.querySelector('.dac-text-output__area');
        if (!area) return;
        navigator.clipboard?.writeText(area.value).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
        }).catch(() => {
          area.select();
          document.execCommand('copy');
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
        });
      });
    }

    // Wire ZIP button
    const zipBtn = document.getElementById('dac-zip-btn');
    if (zipBtn) {
      zipBtn.addEventListener('click', async () => {
        zipBtn.disabled = true;
        zipBtn.textContent = 'Building ZIP…';
        try {
          const zipBytes = await buildZip(outputs);
          const blob = new Blob([zipBytes], { type: 'application/zip' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'converted-files.zip';
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
          window.DAC?.analytics?.track('download_completed', { toolId, type: 'zip', files: outputs.length });
          zipBtn.textContent = 'Downloaded!';
        } catch {
          zipBtn.textContent = 'Download all as ZIP';
          zipBtn.disabled = false;
        }
      });
    }
  }

  function renderError(msg) {
    if (!results) return;
    results.hidden = false;
    results.innerHTML = `<div class="dac-results__errors">
      <p class="dac-error"><span aria-hidden="true">⚠</span> ${esc(msg)}</p>
      <p class="dac-error-hint">Check that your files are valid and try again.</p>
    </div>`;
  }

  // ── Progress ──────────────────────────────────────────────────────────────

  function setProgress(pct, label) {
    if (progressBar) progressBar.style.width = pct + '%';
    if (progressWrap) progressWrap.setAttribute('aria-valuenow', pct);
    if (progressLabel && label !== undefined) progressLabel.textContent = label;
  }

  // ── Minimal ZIP Creator (STORE method) ────────────────────────────────────
  // STORE = no compression. Images are already compressed, so this is fine.

  async function buildZip(outputs) {
    const CRC_TABLE = (() => {
      const t = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        t[i] = c;
      }
      return t;
    })();

    function crc32(data) {
      let c = 0xFFFFFFFF;
      for (let i = 0; i < data.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ data[i]) & 0xFF];
      return (c ^ 0xFFFFFFFF) >>> 0;
    }

    function u16le(n) { return [(n) & 0xff, (n >> 8) & 0xff]; }
    function u32le(n) { return [(n) & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]; }

    function concat(arrays) {
      const len = arrays.reduce((s, a) => s + a.length, 0);
      const out = new Uint8Array(len);
      let pos = 0;
      for (const a of arrays) { out.set(a, pos); pos += a.length; }
      return out;
    }

    const enc = new TextEncoder();
    const now = new Date();
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);

    const entries = [];
    const localParts = [];
    let localOffset = 0;

    for (const out of outputs) {
      const data = new Uint8Array(await out.blob.arrayBuffer());
      const nameBytes = enc.encode(out.name);
      const crc = crc32(data);

      const local = new Uint8Array([
        0x50, 0x4B, 0x03, 0x04,   // local file header signature
        20, 0,                      // version needed: 2.0
        0, 0,                       // general purpose bit flag
        0, 0,                       // compression: STORE
        ...u16le(dosTime),
        ...u16le(dosDate),
        ...u32le(crc),
        ...u32le(data.length),      // compressed size
        ...u32le(data.length),      // uncompressed size
        ...u16le(nameBytes.length),
        0, 0,                       // extra field length
        ...nameBytes,
      ]);

      entries.push({ nameBytes, crc, size: data.length, offset: localOffset, dosTime, dosDate });
      localParts.push(local, data);
      localOffset += local.length + data.length;
    }

    const cdParts = [];
    for (const e of entries) {
      cdParts.push(new Uint8Array([
        0x50, 0x4B, 0x01, 0x02,    // central directory signature
        20, 0,                       // version made by
        20, 0,                       // version needed
        0, 0,                        // flags
        0, 0,                        // compression: STORE
        ...u16le(e.dosTime),
        ...u16le(e.dosDate),
        ...u32le(e.crc),
        ...u32le(e.size),
        ...u32le(e.size),
        ...u16le(e.nameBytes.length),
        0, 0,                        // extra field length
        0, 0,                        // comment length
        0, 0,                        // disk number start
        0, 0,                        // internal file attributes
        0, 0, 0, 0,                  // external file attributes
        ...u32le(e.offset),
        ...e.nameBytes,
      ]));
    }

    const cdSize = cdParts.reduce((s, a) => s + a.length, 0);
    const eocd = new Uint8Array([
      0x50, 0x4B, 0x05, 0x06,      // end of central directory signature
      0, 0,                          // disk number
      0, 0,                          // disk with start of central directory
      ...u16le(entries.length),
      ...u16le(entries.length),
      ...u32le(cdSize),
      ...u32le(localOffset),
      0, 0,                          // comment length
    ]);

    return concat([...localParts, ...cdParts, eocd]);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function revokeAllPreviews() {
    objectUrls.forEach(u => u && URL.revokeObjectURL(u));
    objectUrls = [];
  }

  function revokeAllDownloads() {
    downloadUrls.forEach(u => u && URL.revokeObjectURL(u));
    downloadUrls = [];
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function esc(str) {
    const d = document.createElement('span');
    d.textContent = String(str);
    return d.innerHTML;
  }

})();
