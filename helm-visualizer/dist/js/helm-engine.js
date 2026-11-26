// Main-thread client for the Helm WebAssembly worker.
//
// Each call sends the chart files along, so a worker that had to be stopped (a template stuck
// in a loop, say) can be replaced without the page losing anything.

const RENDER_TIMEOUT_MS = 90_000;
const LOAD_TIMEOUT_MS = 180_000;

export function createHelmEngine({ onProgress } = {}) {
  let worker = null;
  let seq = 0;
  let info = null;
  let loading = null;
  const pending = new Map();

  function spawn() {
    worker = new Worker(new URL('./helm-worker.js', import.meta.url));
    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'progress') { onProgress?.(msg); return; }
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.ok) p.resolve(msg.result);
      else p.reject(new Error(msg.error));
    };
    worker.onerror = (e) => {
      e.preventDefault?.();
      reset(new Error(`The Helm engine stopped: ${e.message || 'unknown error'}`));
    };
  }

  function reset(err) {
    worker?.terminate();
    worker = null;
    loading = null;
    info = null;
    for (const p of pending.values()) { clearTimeout(p.timer); p.reject(err); }
    pending.clear();
  }

  function call(op, payload, timeout) {
    if (!worker) spawn();
    const id = ++seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reset(new Error(op === 'load'
          ? 'Loading the Helm engine took too long. Check your connection and try again.'
          : `Helm did not finish within ${timeout / 1000} s. A template may be looping; it was stopped.`));
      }, timeout);
      pending.set(id, { resolve, reject, timer });
      worker.postMessage({ id, op, ...payload });
    });
  }

  function load() {
    if (info) return Promise.resolve(info);
    if (!loading) loading = call('load', {}, LOAD_TIMEOUT_MS).then((r) => { info = r; return r; }).catch((e) => { loading = null; throw e; });
    return loading;
  }

  async function inspect(files) {
    await load();
    return call('inspect', { files }, RENDER_TIMEOUT_MS);
  }

  async function render(files, options) {
    await load();
    return call('render', { files, options }, RENDER_TIMEOUT_MS);
  }

  return { load, inspect, render, info: () => info };
}
