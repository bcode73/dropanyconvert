/**
 * DropAnyConvert — Worker Adapter
 *
 * Provides a unified interface for running engine functions either:
 *   - directly on the main thread (current default)
 *   - inside a Web Worker (opt-in per engine via engineMeta.workerReady)
 *
 * The generator, templates, and runtime are never changed to support Workers —
 * only this adapter changes. When an engine sets workerReady: true, swap
 * runOnMainThread for runInWorker below.
 *
 * Usage (runtime.js already uses this pattern via dynamic import):
 *   const mod = await import(`/assets/js/engines/${engineName}.js`);
 *   const result = await WorkerAdapter.run(mod, engineFn, files, context);
 */

(function () {
  'use strict';

  /**
   * Run an engine function on the main thread.
   * This is the current execution path for all engines.
   */
  async function runOnMainThread(mod, fnName, files, context) {
    const fn = mod[fnName];
    if (typeof fn !== 'function') {
      throw new Error(`Engine function "${fnName}" not found`);
    }
    return fn(files, context);
  }

  /**
   * Run an engine function inside a dedicated Web Worker.
   * NOT YET ACTIVE — wired when engineMeta.workerReady is true.
   *
   * The Worker receives files as ArrayBuffers (transferable) and
   * reconstructs File objects on the other side. Results are transferred
   * back as Blobs via structured clone.
   *
   * Prerequisite: each engine ships a /assets/js/engines/{name}.worker.js
   * that imports the engine and handles the message protocol.
   */
  async function runInWorker(engineName, fnName, files, context) {
    return new Promise((resolve, reject) => {
      const workerUrl = `/assets/js/engines/${engineName}.worker.js`;
      const worker = new Worker(workerUrl, { type: 'module' });

      worker.onmessage = (e) => {
        if (e.data.type === 'progress') {
          context.onProgress?.(e.data.pct);
        } else if (e.data.type === 'result') {
          worker.terminate();
          resolve(e.data.result);
        } else if (e.data.type === 'error') {
          worker.terminate();
          reject(new Error(e.data.message));
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        reject(err);
      };

      // Transfer ArrayBuffers to avoid copying large image data
      const transferables = [];
      const fileData = files.map(f => {
        // Files cannot be transferred — read as ArrayBuffer first
        // This is async; the Worker protocol handles the sequencing
        return { name: f.name, type: f.type, size: f.size };
      });

      worker.postMessage({ fn: fnName, files: fileData, context: { toolId: context.toolId, quality: context.quality, outputFormat: context.outputFormat } }, transferables);
    });
  }

  const WorkerAdapter = {
    /**
     * Run an engine function, choosing main thread or Worker based on engineMeta.
     */
    async run(mod, fnName, files, context) {
      if (mod.engineMeta?.workerReady) {
        return runInWorker(mod.engineMeta.id, fnName, files, context);
      }
      return runOnMainThread(mod, fnName, files, context);
    },
  };

  window.DAC = window.DAC || {};
  window.DAC.WorkerAdapter = WorkerAdapter;
})();
