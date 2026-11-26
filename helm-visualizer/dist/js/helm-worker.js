// Web Worker that hosts Helm (compiled to WebAssembly) so rendering never blocks the page.
/* global Go */
importScripts('../helm/wasm_exec.js');

let ready = null;

function load() {
  if (ready) return ready;
  ready = (async () => {
    const res = await fetch(new URL('../helm/helm.wasm.gz', self.location.href));
    if (!res.ok || !res.body) throw new Error(`Could not download the Helm engine (HTTP ${res.status}).`);
    const total = Number(res.headers.get('content-length')) || 0;
    let loaded = 0;
    let last = 0;
    const progress = new TransformStream({
      transform(chunk, ctl) {
        loaded += chunk.byteLength;
        const now = Date.now();
        if (now - last > 150) { last = now; postMessage({ type: 'progress', loaded, total }); }
        ctl.enqueue(chunk);
      },
      flush() { postMessage({ type: 'progress', loaded, total, done: true }); },
    });
    // The engine is shipped gzipped so it is small on every static host, compressed or not.
    // Some servers add "Content-Encoding: gzip" for .gz files and the browser unpacks it already,
    // so look at the first bytes before decompressing.
    const reader = res.body.pipeThrough(progress).getReader();
    const first = await reader.read();
    const stream = new ReadableStream({
      start(c) { if (!first.done) c.enqueue(first.value); },
      async pull(c) {
        const { done, value } = await reader.read();
        if (done) c.close(); else c.enqueue(value);
      },
    });
    const gz = first.value?.[0] === 0x1f && first.value?.[1] === 0x8b;
    const wasm = new Response(gz ? stream.pipeThrough(new DecompressionStream('gzip')) : stream, {
      headers: { 'Content-Type': 'application/wasm' },
    });
    const go = new Go();
    let instance;
    try {
      ({ instance } = await WebAssembly.instantiateStreaming(wasm, go.importObject));
    } catch (e) {
      throw new Error(`The Helm engine could not start: ${e.message}`);
    }
    const started = new Promise((resolve) => { self.onHelmWasmReady = resolve; });
    go.run(instance).then(() => { ready = null; });
    await started;
    return self.helmWasm;
  })();
  ready.catch(() => { ready = null; });
  return ready;
}

self.onmessage = async (e) => {
  const { id, op, files, options } = e.data;
  try {
    const helm = await load();
    let result;
    if (op === 'load') result = { version: helm.version, kubeVersion: helm.kubeVersion };
    else if (op === 'inspect') result = JSON.parse(helm.inspect(files));
    else if (op === 'render') result = JSON.parse(helm.render(files, JSON.stringify(options || {})));
    else throw new Error(`unknown operation ${op}`);
    postMessage({ id, ok: true, result });
  } catch (err) {
    postMessage({ id, ok: false, error: String(err?.message || err) });
  }
};
