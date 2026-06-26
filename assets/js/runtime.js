/**
 * DropAnyConvert — Browser Runtime
 *
 * Wires up the dropzone UI to the appropriate engine function.
 * Reads configuration from data attributes on #dac-dropzone.
 * Phase 3 will replace the stubs below with real engine calls.
 */

(function () {
  'use strict';

  const dropzone = document.getElementById('dac-dropzone');
  if (!dropzone) return;

  const fileInput = document.getElementById('dac-file-input');
  const controls = document.getElementById('dac-controls');
  const convertBtn = document.getElementById('dac-convert-btn');
  const clearBtn = document.getElementById('dac-clear-btn');
  const batchQueue = document.getElementById('dac-batch-queue');
  const progressWrap = document.getElementById('dac-progress');
  const progressBar = document.getElementById('dac-progress-bar');
  const results = document.getElementById('dac-results');

  const toolId = dropzone.dataset.toolId;
  const engineName = dropzone.dataset.engine;
  const engineFn = dropzone.dataset.engineFn;
  const accept = dropzone.dataset.accept;
  const maxFiles = parseInt(dropzone.dataset.maxFiles, 10) || 1;
  const isBatch = dropzone.dataset.batch === 'true';

  let selectedFiles = [];

  // Drag & drop
  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('dac-dropzone--active');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dac-dropzone--active');
  });
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dac-dropzone--active');
    handleFiles([...e.dataTransfer.files]);
  });

  // Click to open
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    handleFiles([...fileInput.files]);
    fileInput.value = '';
  });

  // Clipboard paste
  document.addEventListener('paste', e => {
    const items = [...(e.clipboardData?.files || [])];
    if (items.length) handleFiles(items);
  });

  function handleFiles(files) {
    const capped = files.slice(0, maxFiles);
    selectedFiles = isBatch ? [...selectedFiles, ...capped].slice(0, maxFiles) : capped;
    renderQueue();
    if (controls) controls.hidden = selectedFiles.length === 0;
  }

  function renderQueue() {
    if (!batchQueue) return;
    if (selectedFiles.length === 0) {
      batchQueue.hidden = true;
      return;
    }
    batchQueue.hidden = false;
    batchQueue.innerHTML = selectedFiles.map((f, i) =>
      `<div class="dac-queue-item" data-index="${i}">
        <span class="dac-queue-item__name">${esc(f.name)}</span>
        <span class="dac-queue-item__size">${formatSize(f.size)}</span>
      </div>`
    ).join('');
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      selectedFiles = [];
      renderQueue();
      if (controls) controls.hidden = true;
      if (results) { results.hidden = true; results.innerHTML = ''; }
    });
  }

  if (convertBtn) {
    convertBtn.addEventListener('click', () => runConversion());
  }

  async function runConversion() {
    if (!selectedFiles.length) return;
    setProgress(0);
    if (progressWrap) progressWrap.hidden = false;

    try {
      // Dynamic import of the engine module
      const module = await import(`/assets/js/engines/${engineName}.js`).catch(() => null);
      if (!module || typeof module[engineFn] !== 'function') {
        showError('This tool is not yet available. Check back soon.');
        return;
      }

      const context = { toolId, quality: getQualitySetting() };
      const engineResult = await module[engineFn](selectedFiles, context);

      if (engineResult.errors?.length) {
        showError(engineResult.errors.join('\n'));
        return;
      }

      setProgress(100);
      renderResults(engineResult.outputs);
    } catch (err) {
      showError(err.message);
    } finally {
      if (progressWrap) progressWrap.hidden = true;
    }
  }

  function renderResults(outputs) {
    if (!results) return;
    results.hidden = false;
    if (outputs.length === 1) {
      const out = outputs[0];
      const url = URL.createObjectURL(out.blob);
      results.innerHTML = `<a class="dac-btn dac-btn--primary dac-download-btn" href="${url}" download="${esc(out.name)}">Download ${esc(out.name)}</a>`;
    } else {
      // Multiple files — offer individual downloads; ZIP is handled by engine
      results.innerHTML = outputs.map(out => {
        const url = URL.createObjectURL(out.blob);
        return `<a class="dac-btn dac-btn--ghost dac-download-btn" href="${url}" download="${esc(out.name)}">${esc(out.name)}</a>`;
      }).join('');
    }
  }

  function setProgress(pct) {
    if (!progressBar) return;
    progressBar.style.width = pct + '%';
    if (progressWrap) progressWrap.setAttribute('aria-valuenow', pct);
  }

  function showError(msg) {
    if (!results) return;
    results.hidden = false;
    results.innerHTML = `<p class="dac-error">${esc(msg)}</p>`;
  }

  function getQualitySetting() {
    const input = document.getElementById('dac-quality');
    return input ? parseInt(input.value, 10) : 85;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
})();
