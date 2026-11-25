/*
 * parallel-fetch.js
 * Speeds up big .wgb downloads by fetching many byte ranges at once,
 * then handing the emulator ONE normal, in-order stream.
 * BottleShip itself needs no changes: it still thinks it is doing one fetch().
 *
 * Install: put this file next to the service worker in bottleship-main/ and add
 *   importScripts('parallel-fetch.js');
 * as the VERY FIRST line of that service worker file.
 */
(() => {
  const CHUNK = 16 * 1024 * 1024; // size of each range request
  const CONCURRENCY = 8;          // ranges downloaded at the same time
  const RETRIES = 3;              // tries per range before giving up

  // Only touch big game files on your R2 domain
  const isTarget = (url) =>
    url.pathname.toLowerCase().endsWith('.wgb') &&
    (url.hostname === 'files.envizion.work' || url.hostname.endsWith('.r2.dev'));

  const sizeCache = new Map();

  async function getSize(url, signal) {
    if (sizeCache.has(url)) return sizeCache.get(url);
    const r = await fetch(url, { method: 'HEAD', mode: 'cors', credentials: 'omit', signal });
    const n = parseInt(r.headers.get('content-length') || '0', 10);
    if (!r.ok || !n) throw new Error('could not read file size');
    sizeCache.set(url, n);
    return n;
  }

  async function fetchRange(url, start, end, signal) {
    let lastErr;
    for (let attempt = 0; attempt < RETRIES; attempt++) {
      try {
        const r = await fetch(url, {
          mode: 'cors',
          credentials: 'omit',
          signal,
          headers: { Range: `bytes=${start}-${end}` },
        });
        if (r.status !== 206) throw new Error('server ignored range request: ' + r.status);
        const buf = await r.arrayBuffer();
        if (buf.byteLength !== end - start + 1) throw new Error('short chunk');
        return buf;
      } catch (e) {
        if (signal.aborted) throw e;
        lastErr = e;
        await new Promise((res) => setTimeout(res, 500 * (attempt + 1)));
      }
    }
    throw lastErr;
  }

  function makeStream(url, size, firstChunk, ac) {
    const total = Math.ceil(size / CHUNK);
    const jobs = new Map();
    let nextStart = 1; // chunk 0 is already downloaded
    let nextEmit = 0;
    jobs.set(0, Promise.resolve(firstChunk));

    // Keep up to CONCURRENCY chunks downloading ahead of what the game has read
    const fill = () => {
      while (nextStart < total && nextStart - nextEmit < CONCURRENCY) {
        const i = nextStart++;
        const s = i * CHUNK;
        const e = Math.min(s + CHUNK, size) - 1;
        const p = fetchRange(url, s, e, ac.signal);
        p.catch(() => {}); // real error is handled when this chunk is awaited
        jobs.set(i, p);
      }
    };

    return new ReadableStream(
      {
        async pull(ctrl) {
          if (nextEmit >= total) { ctrl.close(); return; }
          fill();
          try {
            const buf = await jobs.get(nextEmit);
            jobs.delete(nextEmit);
            nextEmit++;
            ctrl.enqueue(new Uint8Array(buf));
            fill();
          } catch (e) {
            ctrl.error(e);
          }
        },
        cancel() { ac.abort(); },
      },
      new CountQueuingStrategy({ highWaterMark: 1 })
    );
  }

  async function handle(request) {
    const url = request.url;
    const ac = new AbortController();
    try {
      const size = await getSize(url, ac.signal);
      if (size < CHUNK * 2) return fetch(request); // small file: normal download
      // Fetch the first chunk now. If ranges don't work, fall back to a normal fetch.
      const first = await fetchRange(url, 0, CHUNK - 1, ac.signal);
      return new Response(makeStream(url, size, first, ac), {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(size),
          'Cross-Origin-Resource-Policy': 'cross-origin',
        },
      });
    } catch (e) {
      return fetch(request);
    }
  }

  self.addEventListener('fetch', (event) => {
    const req = event.request;
    // Leave alone: non-GET, requests that already ask for a range, opaque requests
    if (req.method !== 'GET' || req.headers.has('range') || req.mode === 'no-cors') return;
    if (!isTarget(new URL(req.url))) return;
    event.stopImmediatePropagation(); // stop the coi worker from also answering
    event.respondWith(handle(req));
  });
})();