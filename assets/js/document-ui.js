/**
 * Document UI Foundation — components shared by all document tool pages.
 *
 * ABSTRACTION ONLY. No document tool pages exist yet (Phase 6+).
 *
 * This module provides reusable UI components for document tool pages:
 *   - Page thumbnail grid with checkbox selection
 *   - Page reorder UI (drag handles, keyboard support)
 *   - Password prompt overlay for encrypted documents
 *   - Metadata display panel
 *   - Preview panel
 *   - Multi-stage progress display
 *
 * All components are pure functions returning DOM elements.
 * They do not touch global state and do not import from runtime.js.
 *
 * Usage pattern (in a future document tool page script):
 *
 *   import {
 *     createPageGrid,
 *     createPasswordPrompt,
 *     createMetadataPanel,
 *     createProgressStages,
 *   } from '/assets/js/document-ui.js';
 *
 *   const grid = createPageGrid(manifest.thumbnails, { selectable: true });
 *   container.appendChild(grid.element);
 *   // Later: const selected = grid.getSelectedPages();
 */

// ── Page thumbnail grid ───────────────────────────────────────────────────────

/**
 * Create a grid of page thumbnails with optional checkbox selection.
 *
 * @param {Array<{pageIndex: number, dataUrl: string}>} thumbnails
 * @param {object} options
 * @param {boolean} [options.selectable=false]   — show checkboxes
 * @param {boolean} [options.reorderable=false]  — show drag handles
 * @param {function} [options.onSelect]          — (selectedIndices: number[]) => void
 * @param {function} [options.onReorder]         — (newOrder: number[]) => void
 * @returns {{ element: HTMLElement, getSelectedPages: () => number[], getOrder: () => number[] }}
 */
export function createPageGrid(thumbnails = [], options = {}) {
  const { selectable = false, reorderable = false, onSelect, onReorder } = options;

  const grid = document.createElement('div');
  grid.className = 'dac-page-grid';
  if (reorderable) grid.classList.add('dac-page-grid--reorderable');

  let order = thumbnails.map((_, i) => i);

  function render() {
    grid.innerHTML = '';
    order.forEach((originalIndex, position) => {
      const thumb = thumbnails[originalIndex];
      const cell = document.createElement('div');
      cell.className = 'dac-page-grid__cell';
      cell.dataset.originalIndex = String(originalIndex);
      cell.dataset.position = String(position);

      if (reorderable) {
        const handle = document.createElement('span');
        handle.className = 'dac-page-grid__handle';
        handle.setAttribute('aria-label', 'Drag to reorder');
        handle.innerHTML = '⠿';
        cell.appendChild(handle);
      }

      if (thumb?.dataUrl) {
        const img = document.createElement('img');
        img.className = 'dac-page-grid__thumb';
        img.src = thumb.dataUrl;
        img.alt = `Page ${originalIndex + 1}`;
        img.loading = 'lazy';
        cell.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'dac-page-grid__placeholder';
        placeholder.textContent = originalIndex + 1;
        cell.appendChild(placeholder);
      }

      const label = document.createElement('span');
      label.className = 'dac-page-grid__label';
      label.textContent = `Page ${originalIndex + 1}`;
      cell.appendChild(label);

      if (selectable) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'dac-page-grid__check';
        checkbox.value = String(originalIndex);
        checkbox.setAttribute('aria-label', `Select page ${originalIndex + 1}`);
        checkbox.addEventListener('change', () => onSelect?.(getSelectedPages()));
        cell.appendChild(checkbox);
        cell.addEventListener('click', (e) => {
          if (e.target !== checkbox) checkbox.checked = !checkbox.checked;
          onSelect?.(getSelectedPages());
        });
      }

      grid.appendChild(cell);
    });
  }

  function getSelectedPages() {
    return [...grid.querySelectorAll('.dac-page-grid__check:checked')]
      .map(cb => parseInt(cb.value, 10));
  }

  function getOrder() { return [...order]; }

  render();
  return { element: grid, getSelectedPages, getOrder };
}

// ── Password prompt overlay ───────────────────────────────────────────────────

/**
 * Create an overlay asking for a document password.
 *
 * @param {object} options
 * @param {string} [options.filename]   — shown in the prompt heading
 * @param {function} options.onSubmit   — (password: string) => void
 * @param {function} [options.onCancel]
 * @returns {HTMLElement}
 */
export function createPasswordPrompt(options = {}) {
  const { filename = 'document', onSubmit, onCancel } = options;

  const overlay = document.createElement('div');
  overlay.className = 'dac-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Password required');

  overlay.innerHTML = `
    <div class="dac-overlay__box">
      <h2 class="dac-overlay__title">Password required</h2>
      <p class="dac-overlay__desc">
        <strong>${escapeHtml(filename)}</strong> is password-protected.
        Enter the password to continue.
      </p>
      <input
        type="password"
        class="dac-input dac-overlay__pw"
        placeholder="Document password"
        autocomplete="current-password"
      />
      <p class="dac-overlay__error" hidden></p>
      <div class="dac-overlay__actions">
        <button type="button" class="dac-btn dac-btn--primary dac-overlay__submit">Unlock</button>
        <button type="button" class="dac-btn dac-btn--ghost dac-overlay__cancel">Cancel</button>
      </div>
    </div>
  `;

  const input  = overlay.querySelector('.dac-overlay__pw');
  const errEl  = overlay.querySelector('.dac-overlay__error');
  const submit = overlay.querySelector('.dac-overlay__submit');
  const cancel = overlay.querySelector('.dac-overlay__cancel');

  function showError(msg) {
    errEl.textContent = msg;
    errEl.hidden = false;
  }

  submit.addEventListener('click', () => {
    const pw = input.value;
    if (!pw) { showError('Please enter a password.'); return; }
    onSubmit?.(pw);
  });
  cancel.addEventListener('click', () => onCancel?.());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit.click();
  });

  // Expose showError for callers to signal a wrong password
  overlay.showError = showError;

  return overlay;
}

// ── Metadata panel ────────────────────────────────────────────────────────────

/**
 * Render a read-only metadata panel from a DocumentManifest.
 *
 * @param {object} manifest  — DocumentManifest (or subset)
 * @returns {HTMLElement}
 */
export function createMetadataPanel(manifest) {
  const panel = document.createElement('div');
  panel.className = 'dac-meta-panel';

  const rows = [
    ['Filename',  manifest.filename],
    ['Size',      manifest.sizeBytes != null ? formatBytes(manifest.sizeBytes) : null],
    ['Pages',     manifest.pageCount],
    ['Sheets',    manifest.sheetCount],
    ['Slides',    manifest.slideCount],
    ['Words',     manifest.wordCount != null ? manifest.wordCount.toLocaleString() : null],
    ['Title',     manifest.title],
    ['Author',    manifest.author],
    ['Created',   manifest.createdAt ? new Date(manifest.createdAt).toLocaleDateString() : null],
    ['Modified',  manifest.modifiedAt ? new Date(manifest.modifiedAt).toLocaleDateString() : null],
    ['Language',  manifest.language],
    ['Encrypted', manifest.encrypted ? 'Yes' : null],
    ['Scanned',   manifest.scanned   ? 'Yes (OCR recommended)' : null],
  ].filter(([, v]) => v != null);

  if (rows.length === 0) {
    panel.innerHTML = '<p class="dac-meta-panel__empty">No metadata available.</p>';
    return panel;
  }

  const dl = document.createElement('dl');
  dl.className = 'dac-meta-panel__list';
  for (const [key, value] of rows) {
    dl.innerHTML += `
      <div class="dac-meta-panel__row">
        <dt class="dac-meta-panel__key">${escapeHtml(String(key))}</dt>
        <dd class="dac-meta-panel__val">${escapeHtml(String(value))}</dd>
      </div>
    `;
  }
  panel.appendChild(dl);

  if (manifest.warnings?.length) {
    const warn = document.createElement('ul');
    warn.className = 'dac-meta-panel__warnings';
    for (const w of manifest.warnings) {
      warn.innerHTML += `<li>${escapeHtml(w)}</li>`;
    }
    panel.appendChild(warn);
  }

  return panel;
}

// ── Preview panel ─────────────────────────────────────────────────────────────

/**
 * Create a simple document preview panel.
 * Shows the first available thumbnail or a generic placeholder.
 *
 * @param {object} manifest
 * @returns {HTMLElement}
 */
export function createPreviewPanel(manifest) {
  const panel = document.createElement('div');
  panel.className = 'dac-preview-panel';

  const thumb = manifest.thumbnails?.[0];
  if (thumb?.dataUrl) {
    const img = document.createElement('img');
    img.className = 'dac-preview-panel__img';
    img.src = thumb.dataUrl;
    img.alt = `Preview of ${manifest.filename}`;
    panel.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'dac-preview-panel__placeholder';
    const ext = manifest.filename?.split('.').pop()?.toUpperCase() ?? 'DOC';
    placeholder.innerHTML = `
      <span class="dac-preview-panel__ext">.${escapeHtml(ext)}</span>
      <span class="dac-preview-panel__name">${escapeHtml(manifest.filename ?? '')}</span>
    `;
    panel.appendChild(placeholder);
  }

  return panel;
}

// ── Multi-stage progress ──────────────────────────────────────────────────────

/**
 * Create a multi-stage progress display.
 * Stages flow left-to-right with a progress bar and status labels.
 *
 * @param {string[]} stageNames   — e.g. ['Uploading', 'Processing', 'Downloading']
 * @returns {{ element: HTMLElement, setStage: (index: number) => void, setProgress: (pct: number) => void }}
 */
export function createProgressStages(stageNames = []) {
  const container = document.createElement('div');
  container.className = 'dac-progress-stages';

  const stageEls = stageNames.map((name, i) => {
    const el = document.createElement('div');
    el.className = 'dac-progress-stages__stage';
    el.dataset.index = String(i);
    el.innerHTML = `
      <span class="dac-progress-stages__dot"></span>
      <span class="dac-progress-stages__name">${escapeHtml(name)}</span>
    `;
    container.appendChild(el);
    return el;
  });

  const bar = document.createElement('div');
  bar.className = 'dac-progress-stages__bar';
  bar.innerHTML = '<div class="dac-progress-stages__fill"></div>';
  container.appendChild(bar);
  const fill = bar.querySelector('.dac-progress-stages__fill');

  function setStage(index) {
    stageEls.forEach((el, i) => {
      el.classList.toggle('is-active',   i === index);
      el.classList.toggle('is-complete', i < index);
    });
  }

  function setProgress(pct) {
    fill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  }

  return { element: container, setStage, setProgress };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatBytes(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1048576)     return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824)  return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}
