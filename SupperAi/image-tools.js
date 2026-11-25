/*!
 * image-tools.js — Envizion image processing & vision tool pack (90 tools)
 *
 * ES module. Plug into ai-tool-runtime.js:
 *   import { imageToolDefinitions, isImageTool, runImageTool, configureImageTools } from "./image-tools.js";
 *   export const toolDefinitions = [...existingDefs, ...imageToolDefinitions];
 *   // in runTool(name,args): if (isImageTool(name)) return runImageTool(name, args);
 *   configureImageTools({ getFile, saveOutput, vision, llm });   // see README block at the bottom
 *
 * Honesty policy: every tool performs the real operation or throws a ToolError with
 * code "UNAVAILABLE" naming the missing engine. Nothing returns fake success.
 */

/* ───────────────────────── errors & small utils ───────────────────────── */
export class ToolError extends Error { constructor(m, code = "INVALID") { super(m); this.name = "ToolError"; this.code = code; } }
const bad = m => { throw new ToolError(m); };
const unavailable = m => { throw new ToolError(m, "UNAVAILABLE"); };
const failed = m => { throw new ToolError(m, "FAILED"); };
const num = (v, d, min = -Infinity, max = Infinity) => {
  if (v === undefined || v === null || v === "") return d;
  const n = Number(v); if (!Number.isFinite(n)) bad(`"${v}" is not a valid number`);
  return Math.min(max, Math.max(min, n));
};
const bool = (v, d = false) => v === undefined || v === null || v === "" ? d : (v === true || /^(true|1|yes|on)$/i.test(String(v)));
const clamp8 = v => v < 0 ? 0 : v > 255 ? 255 : v;
const enc8 = new TextEncoder();
const qual = (v, d) => { if (v === undefined || v === null || v === "") return d; let q = Number(v); if (!Number.isFinite(q)) bad("quality must be a number"); if (q > 1) q /= 100; return Math.min(1, Math.max(0.01, q)); };
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const hex2 = n => Math.round(n).toString(16).padStart(2, "0");
const toHex = (r, g, b) => "#" + hex2(r) + hex2(g) + hex2(b);
const fmtBytes = n => n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1) + " KB" : (n / 1048576).toFixed(2) + " MB";

const MIME = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp", avif: "image/avif", bmp: "image/bmp", gif: "image/gif", svg: "image/svg+xml", ico: "image/x-icon", tiff: "image/tiff", heic: "image/heic" };
const normFmt = f => { f = String(f || "").toLowerCase().replace(/^image\//, "").replace(/^\./, "").replace("svg+xml", "svg").replace("x-icon", "ico"); return f === "jpg" ? "jpeg" : f; };
const extOf = f => f === "jpeg" ? "jpg" : f;

function sniff(u8) {
  const s = (a, b) => String.fromCharCode(...u8.subarray(a, b));
  if (u8.length < 4) return null;
  if (u8[0] === 0x89 && s(1, 4) === "PNG") return "png";
  if (u8[0] === 0xFF && u8[1] === 0xD8) return "jpeg";
  if (s(0, 3) === "GIF") return "gif";
  if (u8.length > 12 && s(0, 4) === "RIFF" && s(8, 12) === "WEBP") return "webp";
  if (s(0, 2) === "BM") return "bmp";
  if (u8.length > 12 && s(4, 8) === "ftyp") { const b = s(8, 12); if (/avif|avis/.test(b)) return "avif"; if (/heic|heix|mif1|msf1|hevc/.test(b)) return "heic"; }
  if ((u8[0] === 0x49 && u8[1] === 0x49 && u8[2] === 42 && u8[3] === 0) || (u8[0] === 0x4D && u8[1] === 0x4D && u8[2] === 0 && u8[3] === 42)) return "tiff";
  if (u8[0] === 0 && u8[1] === 0 && u8[2] === 1 && u8[3] === 0) return "ico";
  const head = new TextDecoder().decode(u8.subarray(0, Math.min(u8.length, 1024)));
  if (/<svg[\s>]/i.test(head)) return "svg";
  return null;
}

/* ───────────────────────── host adapter & file store ───────────────────────── */
let HOST = {};
const store = new Map(); let seq = 0;
/** Wire the pack into Envizion. All keys optional except getFile/saveOutput if your store isn't mirrored via registerImageFile.
 *  getFile(id)->File|Blob|{blob,name,type}   saveOutput(blob,filename)->{id?,url}
 *  vision({images:[dataUrl],prompt,max_tokens})->string     llm(prompt)->string (used for translation)
 *  visionEndpoint:{url,model,apiKey?} (OpenAI-compatible, e.g. a local Qwen2.5-VL server)   createCanvas(w,h) (tests) */
export function configureImageTools(h = {}) { HOST = { ...HOST, ...h }; }
export function registerImageFile(file, id) { id = id || `img_${++seq}`; store.set(id, { id, name: file.name || id, type: file.type || "", size: file.size, blob: file }); return id; }
const safeName = n => String(n || "image").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/^\.+/, "").trim().slice(0, 120) || "image";
const baseName = n => safeName(n).replace(/\.[A-Za-z0-9]{1,5}$/, "");
const fid = (a, k = "file_id") => a[k] || a.fileId || a.id || a.file || a.source || (Array.isArray(a.file_ids) && a.file_ids[0]) || (Array.isArray(a.files) && a.files[0]);
const fids = a => { const l = a.file_ids || a.ids || a.files; if (Array.isArray(l) && l.length) return l.map(x => typeof x === "object" ? x.id : x); if (typeof l === "string") return l.split(/[,\s]+/).filter(Boolean); const one = fid(a); return one ? [one] : []; };

async function getFile(id) {
  if (!id || typeof id !== "string") bad("file_id is required (use the id of an uploaded file).");
  if (HOST.getFile) { let r = null; try { r = await HOST.getFile(id); } catch (_) { } if (r) return normFile(r, id); }
  const s = store.get(id); if (s) return s;
  bad(`Unknown file id "${id}". Use one of the uploaded file ids.`);
}
function normFile(r, id) {
  let blob = r instanceof Blob ? r : (r.blob || r.file || r.data || r.content);
  if (blob && !(blob instanceof Blob)) blob = new Blob([blob], { type: r.type || "" });
  if (!blob) bad(`File "${id}" has no readable content.`);
  return { id, name: r.name || r.filename || blob.name || id, type: blob.type || r.type || "", size: blob.size, blob };
}
async function save(blob, filename, validation) {
  filename = safeName(filename);
  const rec = (HOST.saveOutput && await HOST.saveOutput(blob, filename)) || {};
  const id = rec.id || `out_${++seq}`;
  const url = rec.url || (typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(blob) : undefined);
  store.set(id, { id, name: filename, type: blob.type, size: blob.size, blob });
  return { id, filename, size: blob.size, type: blob.type || "application/octet-stream", url, validation: validation || "created" };
}
const outName = (a, file, suffix, ext) => {
  const e = extOf(ext);
  if (a.output_name) { const n = safeName(a.output_name); return /\.[A-Za-z0-9]{1,5}$/.test(n) ? n.replace(/\.[A-Za-z0-9]{1,5}$/, "." + e) : n + "." + e; }
  return `${baseName(file.name)}${suffix}.${e}`;
};
const outInfo = f => ({ file_id: f.id, filename: f.filename, size: f.size, type: f.type });
const bytesOf = async f => new Uint8Array(await f.blob.arrayBuffer());

/* ───────────────────────── canvas layer ───────────────────────── */
const MAXPX = 1.6e8;
function mk(w, h) {
  w = Math.round(w); h = Math.round(h);
  if (!(w > 0 && h > 0)) bad(`Invalid image size ${w}x${h}`);
  if (w > 32767 || h > 32767 || w * h > MAXPX) bad(`Image too large (${w}x${h}); the browser canvas limit would be exceeded.`);
  if (HOST.createCanvas) return HOST.createCanvas(w, h);
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  if (typeof document !== "undefined") { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  unavailable("No canvas implementation is available in this environment.");
}
const ctx2 = c => c.getContext("2d", { willReadFrequently: true });
const mkImageData = (data, w, h) => typeof ImageData !== "undefined" ? new ImageData(data, w, h) : { data, width: w, height: h };
const getPx = c => ctx2(c).getImageData(0, 0, c.width, c.height);
function cvFromPx(d) { const c = mk(d.width, d.height); ctx2(c).putImageData(mkImageData(d.data, d.width, d.height), 0, 0); return c; }
function clonePx(d) { return { data: new Uint8ClampedArray(d.data), width: d.width, height: d.height }; }
async function toBlob(c, type, q) {
  if (c.convertToBlob) return c.convertToBlob({ type, quality: q });
  return new Promise(r => c.toBlob(r, type, q));
}
function flatten(c, color = "#ffffff") {
  const o = mk(c.width, c.height), x = ctx2(o); x.fillStyle = color; x.fillRect(0, 0, o.width, o.height); x.drawImage(c, 0, 0); return o;
}
function hasAlpha(d) { const p = d.data; for (let i = 3; i < p.length; i += 4) if (p[i] < 255) return true; return false; }

async function decodeBlob(blob, fmt) {
  const typed = blob.type && blob.type.startsWith("image/") ? blob : new Blob([blob], { type: MIME[fmt] || "" });
  if (HOST.decode) return HOST.decode(typed);
  if (fmt !== "svg" && typeof createImageBitmap === "function") {
    try { const b = await createImageBitmap(typed, { imageOrientation: "from-image" }); return { src: b, width: b.width, height: b.height }; } catch (_) { /* fall through */ }
  }
  if (typeof Image !== "undefined" && typeof URL !== "undefined") {
    const url = URL.createObjectURL(typed);
    try {
      const img = new Image(); img.decoding = "async"; img.src = url; await img.decode();
      let w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) { w = 1024; h = 1024; }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return { src: img, width: w, height: h };
    } catch (_) { URL.revokeObjectURL(url); }
  }
  failed("The image could not be decoded (corrupt file or a format this browser cannot read).");
}
async function openImage(a, key) {
  const file = await getFile(fid(a, key)), u8 = await bytesOf(file), fmt = sniff(u8);
  if (!fmt) bad(`"${file.name}" is not a recognised image file.`);
  const dec = await decodeBlob(file.blob, fmt);
  return { file, u8, fmt, ...dec };
}
function toCanvas(img) { const c = mk(img.width, img.height); ctx2(c).drawImage(img.src, 0, 0, img.width, img.height); return c; }
function scaleTo(src, sw, sh, tw, th, smooth = true) {
  tw = Math.max(1, Math.round(tw)); th = Math.max(1, Math.round(th));
  let cur = src, cw = sw, ch = sh;
  while (smooth && cw / 2 >= tw && ch / 2 >= th) {
    const nw = Math.max(tw, Math.floor(cw / 2)), nh = Math.max(th, Math.floor(ch / 2)), c = mk(nw, nh), x = ctx2(c);
    x.imageSmoothingQuality = "high"; x.drawImage(cur, 0, 0, cw, ch, 0, 0, nw, nh); cur = c; cw = nw; ch = nh;
  }
  const c = mk(tw, th), x = ctx2(c);
  x.imageSmoothingEnabled = !!smooth; if (smooth) x.imageSmoothingQuality = "high";
  x.drawImage(cur, 0, 0, cw, ch, 0, 0, tw, th); return c;
}
const resizeCv = (c, w, h, smooth = true) => scaleTo(c, c.width, c.height, w, h, smooth);

async function encode(c, fmt, o = {}) {
  fmt = normFmt(fmt); const q = qual(o.quality, fmt === "jpeg" ? 0.9 : 0.92);
  if (["png", "jpeg", "webp", "avif"].includes(fmt)) {
    const src = fmt === "jpeg" ? flatten(c, o.background || "#ffffff") : c;
    const blob = await toBlob(src, MIME[fmt], q);
    if (!blob || blob.type !== MIME[fmt]) unavailable(`This browser cannot encode ${fmt.toUpperCase()} (it returned ${blob?.type || "nothing"}). Choose another format.`);
    return blob;
  }
  if (fmt === "bmp") return new Blob([encodeBMP(getPx(c))], { type: "image/bmp" });
  if (fmt === "gif") return encodeGIF([getPx(c)], { dither: bool(o.dither) });
  if (fmt === "ico") return encodeICO(c, o.sizes);
  if (fmt === "svg") bad("Use convert_image_svg to produce SVG.");
  bad(`Unsupported output format "${fmt}". Supported: png, jpeg, webp, avif, bmp, gif, ico.`);
}
const defaultFmt = f => ["png", "jpeg", "webp"].includes(f) ? f : "png";
async function emit(a, img, suffix, cv, extra = {}, o = {}) {
  const fmt = normFmt(o.format || a.output_format || a.format || defaultFmt(img.fmt));
  const blob = await encode(cv, fmt, { quality: a.quality ?? o.quality, background: a.background_color, dither: a.dither, sizes: a.sizes });
  const f = await save(blob, outName(a, img.file, suffix, fmt));
  const result = { ok: true, ...outInfo(f), format: fmt, width: cv.width, height: cv.height, input_size: img.file.size, ...extra };
  if (img.fmt === "gif" && !o.keepNote) result.note = "Input GIF: only the first frame was processed.";
  return { result, files: [f] };
}

/* ───────────────────────── binary codecs ───────────────────────── */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8, init = 0xFFFFFFFF, fin = true) { let c = init; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8); return fin ? (c ^ 0xFFFFFFFF) >>> 0 : c; }

function makeZip(entries) {
  const chunks = [], central = []; let off = 0; const now = new Date(), seen = new Set();
  const dt = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1), dd = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const e of entries) {
    let nm = safeName(e.name), k = 1; while (seen.has(nm)) nm = nm.replace(/(\.[^.]*)?$/, `_${k++}$1`); seen.add(nm);
    const name = enc8.encode(nm), crc = crc32(e.data), sz = e.data.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(10, dt, true); lh.setUint16(12, dd, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true); lh.setUint16(26, name.length, true);
    chunks.push(new Uint8Array(lh.buffer), name, e.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(12, dt, true); ch.setUint16(14, dd, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true); ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
    central.push(new Uint8Array(ch.buffer), name); off += 30 + name.length + sz;
  }
  const cd = central.reduce((s, c) => s + c.length, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true); end.setUint32(12, cd, true); end.setUint32(16, off, true);
  return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: "application/zip" });
}

function encodeBMP(d) {
  const { width: w, height: h, data } = d, alpha = hasAlpha(d), rowSize = alpha ? w * 4 : (w * 3 + 3) & ~3, hdr = alpha ? 122 : 54, size = hdr + rowSize * h;
  const buf = new ArrayBuffer(size), dv = new DataView(buf), u = new Uint8Array(buf);
  u[0] = 0x42; u[1] = 0x4D; dv.setUint32(2, size, true); dv.setUint32(10, hdr, true);
  dv.setUint32(14, alpha ? 108 : 40, true); dv.setInt32(18, w, true); dv.setInt32(22, h, true); dv.setUint16(26, 1, true); dv.setUint16(28, alpha ? 32 : 24, true);
  dv.setUint32(30, alpha ? 3 : 0, true); dv.setUint32(34, rowSize * h, true); dv.setInt32(38, 2835, true); dv.setInt32(42, 2835, true);
  if (alpha) { dv.setUint32(54, 0x00FF0000, true); dv.setUint32(58, 0x0000FF00, true); dv.setUint32(62, 0x000000FF, true); dv.setUint32(66, 0xFF000000, true); dv.setUint32(70, 0x73524742, true); }
  for (let y = 0; y < h; y++) {
    let o = hdr + (h - 1 - y) * rowSize, s = y * w * 4;
    for (let x = 0; x < w; x++, s += 4) { u[o++] = data[s + 2]; u[o++] = data[s + 1]; u[o++] = data[s]; if (alpha) u[o++] = data[s + 3]; }
  }
  return u;
}

async function encodeICO(c, sizes) {
  let list = Array.isArray(sizes) ? sizes : String(sizes || "16,32,48,64,128,256").split(/[,\s]+/);
  list = [...new Set(list.map(Number).filter(n => n >= 1 && n <= 256))]; if (!list.length) bad("ICO sizes must be between 1 and 256.");
  const pngs = [];
  for (const s of list) { const sq = mk(s, s), x = ctx2(sq), sc = Math.min(s / c.width, s / c.height), w = c.width * sc, h = c.height * sc; x.imageSmoothingQuality = "high"; x.drawImage(c, (s - w) / 2, (s - h) / 2, w, h); pngs.push(new Uint8Array(await (await toBlob(sq, "image/png")).arrayBuffer())); }
  const hd = new DataView(new ArrayBuffer(6 + 16 * list.length)); hd.setUint16(2, 1, true); hd.setUint16(4, list.length, true);
  let off = 6 + 16 * list.length;
  list.forEach((s, i) => { const p = 6 + i * 16; hd.setUint8(p, s === 256 ? 0 : s); hd.setUint8(p + 1, s === 256 ? 0 : s); hd.setUint16(p + 4, 1, true); hd.setUint16(p + 6, 32, true); hd.setUint32(p + 8, pngs[i].length, true); hd.setUint32(p + 12, off, true); off += pngs[i].length; });
  return new Blob([new Uint8Array(hd.buffer), ...pngs], { type: "image/x-icon" });
}

/* median-cut quantiser (shared by GIF, palette extraction, segmentation helpers) */
function medianCut(rgb, k) {
  const n = rgb.length / 3; if (!n) return [];
  const idx = new Int32Array(n); for (let i = 0; i < n; i++) idx[i] = i;
  let boxes = [{ s: 0, e: n }];
  const range = b => { let mn = [255, 255, 255], mx = [0, 0, 0]; for (let i = b.s; i < b.e; i++) { const p = idx[i] * 3; for (let c = 0; c < 3; c++) { const v = rgb[p + c]; if (v < mn[c]) mn[c] = v; if (v > mx[c]) mx[c] = v; } } const r = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]]; const ch = r[0] >= r[1] && r[0] >= r[2] ? 0 : r[1] >= r[2] ? 1 : 2; return { ch, r: r[ch] }; };
  while (boxes.length < k) {
    let best = -1, bs = 0, bch = 0;
    boxes.forEach((b, i) => { if (b.e - b.s < 2) return; const { ch, r } = range(b), score = r * Math.sqrt(b.e - b.s); if (r > 0 && score > bs) { bs = score; best = i; bch = ch; } });
    if (best < 0) break;
    const b = boxes[best], sub = Array.from(idx.subarray(b.s, b.e)).sort((x, y) => rgb[x * 3 + bch] - rgb[y * 3 + bch]);
    idx.set(sub, b.s); const mid = b.s + (b.e - b.s >> 1);
    boxes.splice(best, 1, { s: b.s, e: mid }, { s: mid, e: b.e });
  }
  return boxes.map(b => { let r = 0, g = 0, bl = 0; const c = b.e - b.s; for (let i = b.s; i < b.e; i++) { const p = idx[i] * 3; r += rgb[p]; g += rgb[p + 1]; bl += rgb[p + 2]; } return { r: Math.round(r / c), g: Math.round(g / c), b: Math.round(bl / c), count: c }; }).sort((x, y) => y.count - x.count);
}
function samplePixels(d, max = 40000, skipTransparent = true) {
  const n = d.width * d.height, step = Math.max(1, Math.floor(n / max)), out = [];
  for (let i = 0; i < n; i += step) { const p = i * 4; if (skipTransparent && d.data[p + 3] < 128) continue; out.push(d.data[p], d.data[p + 1], d.data[p + 2]); }
  return Uint8Array.from(out);
}
function makeMapper(pal) {
  const cache = new Map();
  return (r, g, b) => {
    const key = (r >> 3) << 10 | (g >> 3) << 5 | (b >> 3); let v = cache.get(key); if (v !== undefined) return v;
    let best = 0, bd = Infinity; for (let i = 0; i < pal.length; i++) { const dr = r - pal[i].r, dg = g - pal[i].g, db = b - pal[i].b, dd = dr * dr * 2 + dg * dg * 4 + db * db * 3; if (dd < bd) { bd = dd; best = i; } }
    cache.set(key, best); return best;
  };
}
function quantizeFrame(d, dither, k = 256) {
  const { width: w, height: h, data } = d, trans = hasAlpha(d) && (() => { for (let i = 3; i < data.length; i += 4) if (data[i] < 128) return true; return false; })();
  let pal = medianCut(samplePixels(d, 60000), trans ? k - 1 : k); if (!pal.length) pal = [{ r: 0, g: 0, b: 0, count: 1 }];
  const off = trans ? 1 : 0, map = makeMapper(pal), idx = new Uint8Array(w * h);
  if (dither) {
    const err = new Float32Array(w * 3 * 2); let cur = 0;
    for (let y = 0; y < h; y++) {
      const nxt = 1 - cur; err.fill(0, nxt * w * 3, (nxt + 1) * w * 3);
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4; if (trans && data[p + 3] < 128) { idx[y * w + x] = 0; continue; }
        const e = (cur * w + x) * 3, r = clamp8(data[p] + err[e]), g = clamp8(data[p + 1] + err[e + 1]), b = clamp8(data[p + 2] + err[e + 2]);
        const k = map(r, g, b), c = pal[k]; idx[y * w + x] = k + off;
        const dr = r - c.r, dg = g - c.g, db = b - c.b;
        const spread = (xx, yy, f) => { if (xx < 0 || xx >= w) return; const q = ((yy === 0 ? cur : nxt) * w + xx) * 3; err[q] += dr * f; err[q + 1] += dg * f; err[q + 2] += db * f; };
        spread(x + 1, 0, 7 / 16); spread(x - 1, 1, 3 / 16); spread(x, 1, 5 / 16); spread(x + 1, 1, 1 / 16);
      }
      cur = nxt;
    }
  } else for (let i = 0; i < w * h; i++) { const p = i * 4; idx[i] = trans && data[p + 3] < 128 ? 0 : map(data[p], data[p + 1], data[p + 2]) + off; }
  const total = pal.length + off; let bits = 1; while ((1 << bits) < total) bits++;
  const table = new Uint8Array((1 << bits) * 3); pal.forEach((c, i) => { const q = (i + off) * 3; table[q] = c.r; table[q + 1] = c.g; table[q + 2] = c.b; });
  return { idx, table, bits, trans };
}
function lzwEncode(indices, minCode) {
  const clear = 1 << minCode, eoi = clear + 1; let size = minCode + 1, next = eoi + 1, cur = 0, nb = 0; const out = []; let dict = new Map();
  const emit = c => { cur |= c << nb; nb += size; while (nb >= 8) { out.push(cur & 255); cur >>>= 8; nb -= 8; } };
  emit(clear); let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i], key = prefix * 256 + k, v = dict.get(key);
    if (v !== undefined) { prefix = v; continue; }
    emit(prefix);
    if (next === 4096) { emit(clear); dict = new Map(); next = eoi + 1; size = minCode + 1; }
    else { if (next >= (1 << size)) size++; dict.set(key, next++); }
    prefix = k;
  }
  emit(prefix); emit(eoi); if (nb > 0) out.push(cur & 255);
  return out;
}
function encodeGIF(frames, { delay = 100, loop = 0, dither = false } = {}) {
  const { width: w, height: h } = frames[0], out = [];
  const w16 = n => out.push(n & 255, (n >> 8) & 255), str = s => { for (const c of s) out.push(c.charCodeAt(0)); };
  str("GIF89a"); w16(w); w16(h); out.push(0, 0, 0);
  if (frames.length > 1) { out.push(0x21, 0xFF, 11); str("NETSCAPE2.0"); out.push(3, 1); w16(loop); out.push(0); }
  const delays = Array.isArray(delay) ? delay : null;
  frames.forEach((f, fi) => {
    if (f.width !== w || f.height !== h) bad("All GIF frames must have the same size.");
    const q = quantizeFrame(f, dither), cs = Math.round((delays ? delays[fi] ?? 100 : delay) / 10);
    out.push(0x21, 0xF9, 4, (q.trans ? 1 : 0) | (2 << 2) | 0, cs & 255, (cs >> 8) & 255, 0, 0);
    out.push(0x2C); w16(0); w16(0); w16(w); w16(h); out.push(0x80 | (q.bits - 1));
    for (const b of q.table) out.push(b);
    const minCode = Math.max(2, q.bits); out.push(minCode);
    const data = lzwEncode(q.idx, minCode);
    for (let i = 0; i < data.length; i += 255) { const n = Math.min(255, data.length - i); out.push(n); for (let j = 0; j < n; j++) out.push(data[i + j]); }
    out.push(0);
  });
  out.push(0x3B);
  return new Blob([Uint8Array.from(out)], { type: "image/gif" });
}

/* Minimal PDF writer: JPEG (DCT) pages */
function buildPdf(pages, title) {
  const parts = [], offs = []; let pos = 0;
  const push = b => { const u = typeof b === "string" ? Uint8Array.from(b, c => c.charCodeAt(0) & 255) : b; parts.push(u); pos += u.length; };
  const obj = (n, body) => { offs[n] = pos; push(`${n} 0 obj\n`); push(body); push("\nendobj\n"); };
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const N = pages.length, kids = pages.map((_, i) => `${5 + i * 3} 0 R`).join(" ");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${N} >>`);
  obj(3, `<< /Title (${String(title || "Images").replace(/[()\\]/g, "").replace(/[^\x20-\x7E]/g, "?")}) /Producer (Envizion image-tools) >>`);
  obj(4, "<< /ProcSet [/PDF /ImageC] >>");
  pages.forEach((p, i) => {
    const pn = 5 + i * 3, cn = pn + 1, im = pn + 2;
    obj(pn, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.pw.toFixed(2)} ${p.ph.toFixed(2)}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${cn} 0 R >>`);
    const content = `q ${p.w.toFixed(2)} 0 0 ${p.h.toFixed(2)} ${p.x.toFixed(2)} ${p.y.toFixed(2)} cm /Im0 Do Q`;
    obj(cn, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    offs[im] = pos; push(`${im} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.iw} /Height ${p.ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`); push(p.jpeg); push("\nendstream\nendobj\n");
  });
  const total = 5 + N * 3, xref = pos; push(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let n = 1; n < total; n++) push(String(offs[n]).padStart(10, "0") + " 00000 n \n");
  push(`trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: "application/pdf" });
}

/* ───────────────────────── JPEG / PNG structure, EXIF, header sizes ───────────────────────── */
function jpegSegments(u8) {
  if (u8[0] !== 0xFF || u8[1] !== 0xD8) throw new Error("Missing JPEG SOI marker");
  const segs = [{ m: 0xD8, start: 0, end: 2 }]; let p = 2;
  while (p < u8.length) {
    const s = p; if (u8[p] !== 0xFF) throw new Error(`Expected marker at byte ${p}`);
    while (u8[p] === 0xFF && p < u8.length) p++;
    const m = u8[p++]; if (m === undefined) throw new Error("Truncated marker");
    if (m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { segs.push({ m, start: s, end: p }); continue; }
    if (m === 0xD9) { segs.push({ m, start: s, end: p }); break; }
    if (p + 2 > u8.length) throw new Error("Truncated segment header");
    const len = (u8[p] << 8) | u8[p + 1]; let end = p + len;
    if (len < 2 || end > u8.length) throw new Error(`Segment 0x${m.toString(16)} overruns file`);
    if (m === 0xDA) { let q = end; while (q < u8.length - 1) { if (u8[q] === 0xFF && u8[q + 1] !== 0 && !(u8[q + 1] >= 0xD0 && u8[q + 1] <= 0xD7) && u8[q + 1] !== 0xFF) break; q++; } if (q >= u8.length - 1) q = u8.length; end = q; }
    segs.push({ m, start: s, end, len, hdr: p }); p = end;
  }
  return segs;
}
function* pngChunks(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let p = 8;
  while (p + 12 <= u8.length) { const len = dv.getUint32(p), type = String.fromCharCode(u8[p + 4], u8[p + 5], u8[p + 6], u8[p + 7]); yield { type, start: p, end: p + 12 + len, len, dv }; p += 12 + len; }
}
function parseTiff(u8, base) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), le = u8[base] === 0x49;
  const u16 = o => dv.getUint16(o, le), u32 = o => dv.getUint32(o, le), SZ = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
  const readIfd = off => {
    const out = {}; if (off + 2 > u8.length) return out; const n = u16(base + off);
    for (let i = 0; i < n; i++) {
      const e = base + off + 2 + i * 12; if (e + 12 > u8.length) break;
      const tag = u16(e), type = u16(e + 2), cnt = u32(e + 4), sz = (SZ[type] || 1) * cnt, vo = sz <= 4 ? e + 8 : base + u32(e + 8);
      if (vo + sz > u8.length) continue; let v;
      if (type === 2) v = String.fromCharCode(...u8.subarray(vo, vo + cnt)).replace(/\0.*$/, "").trim();
      else { const arr = []; for (let k = 0; k < Math.min(cnt, 8); k++) { if (type === 3) arr.push(u16(vo + k * 2)); else if (type === 4) arr.push(u32(vo + k * 4)); else if (type === 5) { const d = u32(vo + k * 8 + 4); arr.push(d ? u32(vo + k * 8) / d : 0); } else if (type === 1 || type === 7) arr.push(u8[vo + k]); } v = arr.length === 1 ? arr[0] : arr; }
      out[tag] = v;
    }
    return out;
  };
  const i0 = readIfd(u32(base + 4)), ex = i0[0x8769] ? readIfd(i0[0x8769]) : {}, gp = i0[0x8825] ? readIfd(i0[0x8825]) : {};
  const dms = v => Array.isArray(v) && v.length === 3 ? v[0] + v[1] / 60 + v[2] / 3600 : null;
  const r = { make: i0[0x010F], model: i0[0x0110], software: i0[0x0131], datetime: ex[0x9003] || i0[0x0132], orientation: i0[0x0112], exposure_time: ex[0x829A], f_number: ex[0x829D], iso: ex[0x8827], focal_length_mm: ex[0x920A], width: ex[0xA002], height: ex[0xA003] };
  const lat = dms(gp[2]), lon = dms(gp[4]);
  if (lat !== null && lon !== null) r.gps = { lat: +(lat * (gp[1] === "S" ? -1 : 1)).toFixed(6), lon: +(lon * (gp[3] === "W" ? -1 : 1)).toFixed(6) };
  Object.keys(r).forEach(k => r[k] === undefined && delete r[k]); return r;
}
function readExif(u8, fmt) {
  try {
    if (fmt === "jpeg") { for (const s of jpegSegments(u8)) if (s.m === 0xE1 && String.fromCharCode(...u8.subarray(s.hdr + 2, s.hdr + 8)) === "Exif\0\0") return parseTiff(u8, s.hdr + 8); }
    else if (fmt === "png") { for (const c of pngChunks(u8)) if (c.type === "eXIf") return parseTiff(u8, c.start + 8); }
  } catch (_) { }
  return null;
}
function headerDims(u8, fmt) {
  try {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    if (fmt === "png") return { width: dv.getUint32(16), height: dv.getUint32(20) };
    if (fmt === "gif") return { width: dv.getUint16(6, true), height: dv.getUint16(8, true) };
    if (fmt === "bmp") return { width: dv.getInt32(18, true), height: Math.abs(dv.getInt32(22, true)) };
    if (fmt === "jpeg") { for (const s of jpegSegments(u8)) if (s.m >= 0xC0 && s.m <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(s.m)) return { width: dv.getUint16(s.hdr + 5), height: dv.getUint16(s.hdr + 3) }; }
    if (fmt === "webp") {
      const t = String.fromCharCode(...u8.subarray(12, 16));
      if (t === "VP8 ") return { width: dv.getUint16(26, true) & 0x3FFF, height: dv.getUint16(28, true) & 0x3FFF };
      if (t === "VP8L") return { width: 1 + (((u8[22] & 0x3F) << 8) | u8[21]), height: 1 + (((u8[24] & 0xF) << 10) | (u8[23] << 2) | ((u8[22] & 0xC0) >> 6)) };
      if (t === "VP8X") return { width: 1 + (u8[24] | u8[25] << 8 | u8[26] << 16), height: 1 + (u8[27] | u8[28] << 8 | u8[29] << 16) };
    }
  } catch (_) { }
  return null;
}
const PNG_KEEP = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "gAMA", "cHRM", "sRGB", "iCCP", "sBIT", "bKGD", "hIST", "pHYs", "sPLT", "acTL", "fcTL", "fdAT"]);
function stripJpeg(u8, keepIcc) {
  const segs = jpegSegments(u8), keep = [], removed = [];
  for (const s of segs) {
    const isApp = s.m >= 0xE1 && s.m <= 0xEF, icc = s.m === 0xE2 && String.fromCharCode(...u8.subarray(s.hdr + 2, s.hdr + 13)) === "ICC_PROFILE";
    if ((isApp && s.m !== 0xEE && !(icc && keepIcc)) || s.m === 0xFE) { removed.push(s.m === 0xFE ? "COM" : s.m === 0xE1 ? "EXIF/XMP" : "APP" + (s.m - 0xE0)); continue; }
    keep.push(u8.subarray(s.start, s.end));
  }
  return { blob: new Blob(keep, { type: "image/jpeg" }), removed };
}
function stripPng(u8) {
  const keep = [u8.subarray(0, 8)], removed = [];
  for (const c of pngChunks(u8)) { if (PNG_KEEP.has(c.type)) keep.push(u8.subarray(c.start, c.end)); else removed.push(c.type); }
  return { blob: new Blob(keep, { type: "image/png" }), removed };
}

/* ───────────────────────── pixel engine (RGBA buffers, no canvas needed) ───────────────────────── */
function lut(d, fn) { const L = new Uint8ClampedArray(256); for (let i = 0; i < 256; i++) L[i] = fn(i); const p = d.data; for (let i = 0; i < p.length; i += 4) { p[i] = L[p[i]]; p[i + 1] = L[p[i + 1]]; p[i + 2] = L[p[i + 2]]; } }
const PX = {
  brightness(d, a) { const o = a * 2.55; lut(d, v => v + o); },
  contrast(d, c) { const k = c * 2.55, f = (259 * (k + 255)) / (255 * (259 - k)); lut(d, v => f * (v - 128) + 128); },
  gamma(d, g) { lut(d, v => 255 * Math.pow(v / 255, 1 / g)); },
  exposure(d, e) { const k = 2 ** e; lut(d, v => 255 * Math.pow(Math.min(1, Math.pow(v / 255, 2.2) * k), 1 / 2.2)); },
  saturation(d, s) { const k = 1 + s / 100, p = d.data; for (let i = 0; i < p.length; i += 4) { const g = .299 * p[i] + .587 * p[i + 1] + .114 * p[i + 2]; p[i] = clamp8(g + (p[i] - g) * k); p[i + 1] = clamp8(g + (p[i + 1] - g) * k); p[i + 2] = clamp8(g + (p[i + 2] - g) * k); } },
  grayscale(d, amt = 1) { const p = d.data; for (let i = 0; i < p.length; i += 4) { const g = .299 * p[i] + .587 * p[i + 1] + .114 * p[i + 2]; p[i] = p[i] + (g - p[i]) * amt; p[i + 1] = p[i + 1] + (g - p[i + 1]) * amt; p[i + 2] = p[i + 2] + (g - p[i + 2]) * amt; } },
  sepia(d, amt = 1) { const p = d.data; for (let i = 0; i < p.length; i += 4) { const r = p[i], g = p[i + 1], b = p[i + 2]; p[i] = clamp8(r + (.393 * r + .769 * g + .189 * b - r) * amt); p[i + 1] = clamp8(g + (.349 * r + .686 * g + .168 * b - g) * amt); p[i + 2] = clamp8(b + (.272 * r + .534 * g + .131 * b - b) * amt); } },
  invert(d) { lut(d, v => 255 - v); },
  threshold(d, t) { const p = d.data; for (let i = 0; i < p.length; i += 4) { const v = .299 * p[i] + .587 * p[i + 1] + .114 * p[i + 2] >= t ? 255 : 0; p[i] = p[i + 1] = p[i + 2] = v; } },
  posterize(d, n) { n = Math.max(2, Math.min(32, Math.round(n))); lut(d, v => Math.round(v / 255 * (n - 1)) / (n - 1) * 255); },
  hue(d, deg) { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), p = d.data; const m = [.213 + c * .787 - s * .213, .715 - c * .715 - s * .715, .072 - c * .072 + s * .928, .213 - c * .213 + s * .143, .715 + c * .285 + s * .140, .072 - c * .072 - s * .283, .213 - c * .213 - s * .787, .715 - c * .715 + s * .715, .072 + c * .928 + s * .072]; for (let i = 0; i < p.length; i += 4) { const r = p[i], g = p[i + 1], b = p[i + 2]; p[i] = clamp8(m[0] * r + m[1] * g + m[2] * b); p[i + 1] = clamp8(m[3] * r + m[4] * g + m[5] * b); p[i + 2] = clamp8(m[6] * r + m[7] * g + m[8] * b); } },
  vignette(d, amt = .5) { const { width: w, height: h, data: p } = d, cx = w / 2, cy = h / 2, mx = Math.hypot(cx, cy); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const f = 1 - amt * Math.pow(Math.hypot(x - cx, y - cy) / mx, 2), i = (y * w + x) * 4; p[i] *= f; p[i + 1] *= f; p[i + 2] *= f; } },
  pixelate(d, size) { size = Math.max(2, Math.round(size)); const { width: w, height: h, data: p } = d; for (let by = 0; by < h; by += size) for (let bx = 0; bx < w; bx += size) { let r = 0, g = 0, b = 0, a = 0, n = 0; const ye = Math.min(h, by + size), xe = Math.min(w, bx + size); for (let y = by; y < ye; y++) for (let x = bx; x < xe; x++) { const i = (y * w + x) * 4; r += p[i]; g += p[i + 1]; b += p[i + 2]; a += p[i + 3]; n++; } for (let y = by; y < ye; y++) for (let x = bx; x < xe; x++) { const i = (y * w + x) * 4; p[i] = r / n; p[i + 1] = g / n; p[i + 2] = b / n; p[i + 3] = a / n; } } },
  blur(d, sigma) {
    if (sigma < 0.3) return; const { width: w, height: h, data } = d; let a = Float32Array.from(data), b = new Float32Array(data.length);
    const n = 3, wi = Math.sqrt(12 * sigma * sigma / n + 1); let wl = Math.floor(wi); if (wl % 2 === 0) wl--; const wu = wl + 2, m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
    for (let i = 0; i < n; i++) { const r = ((i < m ? wl : wu) - 1) >> 1; if (r < 1) continue; boxPass(a, b, w, h, r, true); boxPass(b, a, w, h, r, false); }
    for (let i = 0; i < data.length; i++) data[i] = a[i];
  },
  unsharp(d, amount, sigma = 1.2, threshold = 0) { const o = new Uint8ClampedArray(d.data), b = clonePx(d); PX.blur(b, sigma); const p = d.data; for (let i = 0; i < p.length; i += 4) for (let c = 0; c < 3; c++) { const diff = o[i + c] - b.data[i + c]; if (Math.abs(diff) >= threshold) p[i + c] = clamp8(o[i + c] + amount * diff); } },
  median(d, radius = 1) { radius = Math.min(2, Math.max(1, Math.round(radius))); const { width: w, height: h } = d, src = new Uint8ClampedArray(d.data), p = d.data, win = new Uint8Array((2 * radius + 1) ** 2); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) { let n = 0; for (let dy = -radius; dy <= radius; dy++) { const yy = Math.min(h - 1, Math.max(0, y + dy)); for (let dx = -radius; dx <= radius; dx++) { const xx = Math.min(w - 1, Math.max(0, x + dx)); win[n++] = src[(yy * w + xx) * 4 + c]; } } for (let i = 1; i < n; i++) { const v = win[i]; let j = i - 1; while (j >= 0 && win[j] > v) { win[j + 1] = win[j]; j--; } win[j + 1] = v; } p[(y * w + x) * 4 + c] = win[n >> 1]; } },
  convolve(d, k, div = 1, bias = 0) { const { width: w, height: h } = d, src = new Uint8ClampedArray(d.data), p = d.data; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) { let s = 0, q = 0; for (let dy = -1; dy <= 1; dy++) { const yy = Math.min(h - 1, Math.max(0, y + dy)); for (let dx = -1; dx <= 1; dx++) { const xx = Math.min(w - 1, Math.max(0, x + dx)); s += src[(yy * w + xx) * 4 + c] * k[q++]; } } p[(y * w + x) * 4 + c] = clamp8(s / div + bias); } },
  autoLevels(d, clip = 0.005) { const p = d.data, n = d.width * d.height; for (let c = 0; c < 3; c++) { const hist = new Uint32Array(256); for (let i = 0; i < p.length; i += 4) hist[p[i + c]]++; let lo = 0, hi = 255, acc = 0; for (; lo < 255; lo++) { acc += hist[lo]; if (acc > n * clip) break; } acc = 0; for (; hi > 0; hi--) { acc += hist[hi]; if (acc > n * clip) break; } if (hi <= lo) continue; const s = 255 / (hi - lo); for (let i = 0; i < p.length; i += 4) p[i + c] = clamp8((p[i + c] - lo) * s); } },
  grayWorld(d) { const p = d.data, n = d.width * d.height; let r = 0, g = 0, b = 0; for (let i = 0; i < p.length; i += 4) { r += p[i]; g += p[i + 1]; b += p[i + 2]; } r /= n; g /= n; b /= n; const m = (r + g + b) / 3 || 1, kr = m / (r || 1), kg = m / (g || 1), kb = m / (b || 1); for (let i = 0; i < p.length; i += 4) { p[i] = clamp8(p[i] * kr); p[i + 1] = clamp8(p[i + 1] * kg); p[i + 2] = clamp8(p[i + 2] * kb); } }
};
function boxPass(src, dst, w, h, r, horiz) {
  const len = horiz ? w : h, lines = horiz ? h : w, step = horiz ? 4 : w * 4, lstep = horiz ? w * 4 : 4, inv = 1 / (2 * r + 1);
  for (let l = 0; l < lines; l++) for (let c = 0; c < 4; c++) {
    const b = l * lstep + c; let acc = (r + 1) * src[b]; for (let j = 1; j <= r; j++) acc += src[b + Math.min(j, len - 1) * step];
    dst[b] = acc * inv;
    for (let i = 1; i < len; i++) { acc += src[b + Math.min(i + r, len - 1) * step] - src[b + Math.max(i - r - 1, 0) * step]; dst[b + i * step] = acc * inv; }
  }
}
function grayOf(d) { const n = d.width * d.height, g = new Float32Array(n), p = d.data; for (let i = 0; i < n; i++) g[i] = .299 * p[i * 4] + .587 * p[i * 4 + 1] + .114 * p[i * 4 + 2]; return g; }
function shrinkGray(g, w, h, tw, th) { const o = new Float32Array(tw * th); for (let y = 0; y < th; y++) { const y0 = Math.floor(y * h / th), y1 = Math.max(y0 + 1, Math.floor((y + 1) * h / th)); for (let x = 0; x < tw; x++) { const x0 = Math.floor(x * w / tw), x1 = Math.max(x0 + 1, Math.floor((x + 1) * w / tw)); let s = 0, n = 0; for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { s += g[yy * w + xx]; n++; } o[y * tw + x] = s / n; } } return o; }
function otsu(g) { const hist = new Uint32Array(256); for (let i = 0; i < g.length; i++) hist[Math.max(0, Math.min(255, Math.round(g[i])))]++; const total = g.length; let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i]; let sb = 0, wb = 0, best = 0, th = 127; for (let t = 0; t < 256; t++) { wb += hist[t]; if (!wb) continue; const wf = total - wb; if (!wf) break; sb += t * hist[t]; const mb = sb / wb, mf = (sum - sb) / wf, v = wb * wf * (mb - mf) ** 2; if (v > best) { best = v; th = t; } } return th; }
function gaussGray(g, w, h, sigma) { const d = { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; for (let i = 0; i < w * h; i++) { d.data[i * 4] = g[i]; d.data[i * 4 + 3] = 255; } PX.blur(d, sigma); const o = new Float32Array(w * h); for (let i = 0; i < w * h; i++) o[i] = d.data[i * 4]; return o; }
function canny(g, w, h, lo, hi, sigma = 1.2) {
  const s = gaussGray(g, w, h, sigma), mag = new Float32Array(w * h), dir = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, gx = -s[i - w - 1] - 2 * s[i - 1] - s[i + w - 1] + s[i - w + 1] + 2 * s[i + 1] + s[i + w + 1], gy = -s[i - w - 1] - 2 * s[i - w] - s[i - w + 1] + s[i + w - 1] + 2 * s[i + w] + s[i + w + 1];
    mag[i] = Math.hypot(gx, gy); let a = Math.atan2(gy, gx) * 180 / Math.PI; if (a < 0) a += 180; dir[i] = a < 22.5 || a >= 157.5 ? 0 : a < 67.5 ? 1 : a < 112.5 ? 2 : 3;
  }
  const nms = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, m = mag[i], o = dir[i] === 0 ? [1, -1] : dir[i] === 1 ? [w + 1, -w - 1] : dir[i] === 2 ? [w, -w] : [w - 1, -w + 1]; if (m >= mag[i + o[0]] && m >= mag[i + o[1]]) nms[i] = m; }
  const out = new Uint8Array(w * h), stack = [];
  for (let i = 0; i < nms.length; i++) if (nms[i] >= hi) { out[i] = 255; stack.push(i); }
  while (stack.length) { const i = stack.pop(), x = i % w, y = (i / w) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const j = yy * w + xx; if (!out[j] && nms[j] >= lo) { out[j] = 255; stack.push(j); } } }
  return out;
}
function sobelMag(g, w, h) { const m = new Float32Array(w * h); let mx = 1; for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, gx = -g[i - w - 1] - 2 * g[i - 1] - g[i + w - 1] + g[i - w + 1] + 2 * g[i + 1] + g[i + w + 1], gy = -g[i - w - 1] - 2 * g[i - w] - g[i - w + 1] + g[i + w - 1] + 2 * g[i + w] + g[i + w + 1]; m[i] = Math.hypot(gx, gy); if (m[i] > mx) mx = m[i]; } return { m, mx }; }

/* analysis helpers */
function dHash(g, w, h) { const s = shrinkGray(g, w, h, 9, 8); let bits = ""; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += s[y * 9 + x] > s[y * 9 + x + 1] ? "1" : "0"; return bits; }
function aHash(g, w, h) { const s = shrinkGray(g, w, h, 8, 8), m = s.reduce((a, b) => a + b, 0) / 64; return Array.from(s, v => v > m ? "1" : "0").join(""); }
const hamming = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
function histogramVec(d) { const h = new Float32Array(48), p = d.data, n = d.width * d.height; for (let i = 0; i < p.length; i += 4) { h[p[i] >> 4]++; h[16 + (p[i + 1] >> 4)]++; h[32 + (p[i + 2] >> 4)]++; } for (let i = 0; i < 48; i++) h[i] /= n; return h; }
const histIntersect = (a, b) => { let s = 0; for (let i = 0; i < 48; i++) s += Math.min(a[i], b[i]); return s / 3; };
function ssimGray(a, b, w, h) {
  const C1 = (0.01 * 255) ** 2, C2 = (0.03 * 255) ** 2, win = 8, step = 4; let tot = 0, n = 0;
  for (let y = 0; y + win <= h; y += step) for (let x = 0; x + win <= w; x += step) {
    let ma = 0, mb = 0; for (let j = 0; j < win; j++) for (let i = 0; i < win; i++) { const k = (y + j) * w + x + i; ma += a[k]; mb += b[k]; } ma /= win * win; mb /= win * win;
    let va = 0, vb = 0, cv = 0; for (let j = 0; j < win; j++) for (let i = 0; i < win; i++) { const k = (y + j) * w + x + i, da = a[k] - ma, db = b[k] - mb; va += da * da; vb += db * db; cv += da * db; } va /= win * win - 1; vb /= win * win - 1; cv /= win * win - 1;
    tot += ((2 * ma * mb + C1) * (2 * cv + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2)); n++;
  }
  return n ? tot / n : 1;
}
function psnr(a, b) { let s = 0, n = 0; for (let i = 0; i < a.length; i += 4) for (let c = 0; c < 3; c++) { const d = a[i + c] - b[i + c]; s += d * d; n++; } const mse = s / n; return mse === 0 ? 99 : 10 * Math.log10(255 * 255 / mse); }
const NAMES = [["black", 0, 0, 0], ["white", 255, 255, 255], ["gray", 128, 128, 128], ["silver", 192, 192, 192], ["red", 220, 30, 30], ["maroon", 128, 0, 0], ["orange", 255, 140, 0], ["yellow", 250, 220, 30], ["olive", 128, 128, 0], ["lime", 90, 220, 40], ["green", 0, 140, 50], ["teal", 0, 128, 128], ["cyan", 0, 220, 230], ["blue", 30, 70, 220], ["navy", 0, 0, 128], ["purple", 128, 0, 150], ["magenta", 230, 30, 200], ["pink", 255, 160, 190], ["brown", 130, 80, 40], ["beige", 235, 220, 190]];
const colorName = (r, g, b) => NAMES.reduce((best, n) => { const d = (r - n[1]) ** 2 + (g - n[2]) ** 2 + (b - n[3]) ** 2; return d < best.d ? { d, n: n[0] } : best; }, { d: Infinity }).n;
function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; }
function hsl2rgb(h, s, l) { h = ((h % 360) + 360) % 360 / 360; const f = (p, q, t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; if (!s) return [l * 255, l * 255, l * 255].map(Math.round); const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; return [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)].map(v => Math.round(v * 255)); }
const lumin = (r, g, b) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const contrastRatio = (a, b) => { const l1 = lumin(...a), l2 = lumin(...b); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); };
function parseColor(s, d = [255, 255, 255, 255]) {
  if (s === undefined || s === null || s === "") return d; s = String(s).trim().toLowerCase();
  const named = { white: [255, 255, 255], black: [0, 0, 0], red: [255, 0, 0], green: [0, 128, 0], blue: [0, 0, 255], yellow: [255, 255, 0], gray: [128, 128, 128], grey: [128, 128, 128], orange: [255, 165, 0], purple: [128, 0, 128], pink: [255, 192, 203], cyan: [0, 255, 255], magenta: [255, 0, 255] };
  if (s === "transparent") return [0, 0, 0, 0]; if (named[s]) return [...named[s], 255];
  let m = s.match(/^#([0-9a-f]{3,8})$/); if (m) { let h = m[1]; if (h.length === 3 || h.length === 4) h = [...h].map(c => c + c).join(""); if (h.length === 6) h += "ff"; if (h.length === 8) return [0, 2, 4, 6].map(i => parseInt(h.substr(i, 2), 16)); }
  m = s.match(/^rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)(?:[ ,/]+([\d.]+))?\s*\)$/); if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 255 : Math.round(+m[4] * 255)];
  bad(`Unrecognised colour "${s}". Use #rrggbb, rgb(r,g,b) or a basic colour name.`);
}
const cssColor = (s, d) => { const c = parseColor(s, d); return `rgba(${c[0]},${c[1]},${c[2]},${c[3] / 255})`; };

/* ───────────────────────── registry & engine loaders ───────────────────────── */
const DEFS = [], H = {};
const FILE = { file_id: "string (uploaded file id)" };
const OUT = { output_format: "png|jpeg|webp|avif|bmp|gif", quality: "1-100", output_name: "string" };
function tool(group, name, description, params, fn) { DEFS.push({ name, description, parameters: params, group }); H[name] = fn; }

const CDN = {
  tesseract: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",
  tf: "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js",
  cocoSsd: "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js",
  mobilenet: "https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js",
  blazeface: "https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.1.0/dist/blazeface.min.js",
  pdfjs: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  pdfjsWorker: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  bgremoval: "https://esm.sh/@imgly/background-removal@1.5.5"
};
const scripts = new Map();
function loadScript(url) {
  if (scripts.has(url)) return scripts.get(url);
  const p = new Promise((res, rej) => {
    if (typeof document === "undefined") return rej(new ToolError("Loading this engine requires a browser.", "UNAVAILABLE"));
    const s = document.createElement("script"); s.src = url; s.async = true; s.onload = () => res(); s.onerror = () => rej(new ToolError(`Could not load engine from ${url} (offline or blocked).`, "UNAVAILABLE")); document.head.appendChild(s);
  });
  scripts.set(url, p); p.catch(() => scripts.delete(url)); return p;
}
const domCanvas = cv => {
  if (typeof HTMLCanvasElement !== "undefined" && cv instanceof HTMLCanvasElement) return cv;
  if (typeof document === "undefined") return cv;
  const c = document.createElement("canvas"); c.width = cv.width; c.height = cv.height; c.getContext("2d").drawImage(cv, 0, 0); return c;
};
const fitCanvas = (cv, maxDim) => { const m = Math.max(cv.width, cv.height); return m <= maxDim ? cv : resizeCv(cv, cv.width * maxDim / m, cv.height * maxDim / m); };
async function blobToDataUrl(blob) {
  const u8 = new Uint8Array(await blob.arrayBuffer()); let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return `data:${blob.type || "application/octet-stream"};base64,${btoa(s)}`;
}
const hasVision = () => !!(HOST.vision || HOST.visionEndpoint);
async function callVision(canvases, prompt, max_tokens = 700) {
  if (!hasVision()) unavailable("No vision model is connected. The models currently loaded in Envizion are text-only. Provide configureImageTools({ vision }) or { visionEndpoint } (e.g. a local OpenAI-compatible Qwen-VL server).");
  const urls = []; for (const c of canvases) urls.push(await blobToDataUrl(await encode(fitCanvas(c, 1024), "jpeg", { quality: 0.85 })));
  if (HOST.vision) { const r = await HOST.vision({ images: urls, prompt, max_tokens }); const t = typeof r === "string" ? r : r?.text; if (!t) failed("The vision model returned no text."); return String(t).trim(); }
  const { url, model, apiKey } = HOST.visionEndpoint;
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) }, body: JSON.stringify({ model, max_tokens, temperature: 0.2, messages: [{ role: "user", content: [{ type: "text", text: prompt }, ...urls.map(u => ({ type: "image_url", image_url: { url: u } }))] }] }) });
  if (!res.ok) failed(`Vision endpoint returned HTTP ${res.status}.`);
  const j = await res.json(), t = j.choices?.[0]?.message?.content; if (!t) failed("The vision endpoint returned no text."); return String(t).trim();
}

/* OCR (Tesseract.js) */
const workers = new Map();
const LANG_ALIAS = { en: "eng", es: "spa", fr: "fra", de: "deu", it: "ita", pt: "por", nl: "nld", ru: "rus", ar: "ara", zh: "chi_sim", ja: "jpn", ko: "kor", hi: "hin", tr: "tur", pl: "pol", sv: "swe", el: "ell", he: "heb", th: "tha", vi: "vie", uk: "ukr" };
const normLang = l => String(l || "eng").split(/[+,\s]+/).filter(Boolean).map(x => LANG_ALIAS[x.toLowerCase()] || x).map(x => { if (!/^[A-Za-z_]{2,12}$/.test(x)) bad(`Invalid OCR language "${x}"`); return x; }).join("+") || "eng";
async function tessWorker(lang) {
  if (!globalThis.Tesseract) await loadScript(CDN.tesseract);
  if (!globalThis.Tesseract) unavailable("Tesseract.js did not load.");
  if (!workers.has(lang)) workers.set(lang, Promise.resolve(globalThis.Tesseract.createWorker(lang)).catch(e => { workers.delete(lang); throw new ToolError(`OCR engine failed to start for "${lang}": ${e.message || e}`, "UNAVAILABLE"); }));
  return workers.get(lang);
}
export async function disposeImageTools() { for (const p of workers.values()) { try { (await p).terminate(); } catch (_) { } } workers.clear(); }
function wordsToRows(words) {
  if (!words.length) return { rows: [], mh: 10 };
  const hs = words.map(w => w.bbox[3] - w.bbox[1]).sort((a, b) => a - b), mh = hs[hs.length >> 1] || 10, rows = [];
  [...words].sort((a, b) => a.bbox[1] + a.bbox[3] - b.bbox[1] - b.bbox[3]).forEach(w => {
    const cy = (w.bbox[1] + w.bbox[3]) / 2, r = rows[rows.length - 1];
    if (r && Math.abs(cy - r.cy) < mh * 0.6) { r.words.push(w); r.cy = (r.cy * (r.words.length - 1) + cy) / r.words.length; } else rows.push({ cy, words: [w] });
  });
  rows.forEach(r => r.words.sort((a, b) => a.bbox[0] - b.bbox[0])); return { rows, mh };
}
function groupLines(words) {
  const { rows } = wordsToRows(words);
  return rows.map(r => ({ text: r.words.map(w => w.text).join(" "), conf: Math.round(r.words.reduce((s, w) => s + w.conf, 0) / r.words.length), bbox: [Math.min(...r.words.map(w => w.bbox[0])), Math.min(...r.words.map(w => w.bbox[1])), Math.max(...r.words.map(w => w.bbox[2])), Math.max(...r.words.map(w => w.bbox[3]))], words: r.words }));
}
async function runOcr(img, { lang = "eng", psm, mode = "auto" } = {}) {
  lang = normLang(lang); const cv = toCanvas(img), maxSide = Math.max(cv.width, cv.height); let scale = 1;
  if (mode !== "none") { if (maxSide < 1600) scale = Math.min(3, 1600 / maxSide); else if (maxSide > 4500) scale = 4500 / maxSide; }
  let work = scale !== 1 ? resizeCv(cv, cv.width * scale, cv.height * scale) : cv;
  if (mode !== "none") { const d = getPx(work); PX.grayscale(d); PX.autoLevels(d, 0.01); if (mode === "binarize" || mode === "handwriting") PX.threshold(d, otsu(grayOf(d))); work = cvFromPx(d); }
  const w = await tessWorker(lang);
  if (psm !== undefined && psm !== null && w.setParameters) await w.setParameters({ tessedit_pageseg_mode: String(psm) });
  const r = await w.recognize(await toBlob(work, "image/png")), data = r.data || r, S = 1 / scale;
  const box = b => b ? [b.x0 * S, b.y0 * S, b.x1 * S, b.y1 * S].map(Math.round) : [0, 0, 0, 0];
  const mapW = w => ({ text: w.text, conf: Math.round(w.confidence ?? 0), bbox: box(w.bbox) });
  const words = (data.words || []).filter(w => w.text && w.text.trim()).map(mapW);
  let lines = (data.lines || []).filter(l => l.text && l.text.trim()).map(l => ({ text: l.text.trim(), conf: Math.round(l.confidence ?? 0), bbox: box(l.bbox), words: (l.words || []).filter(x => x.text.trim()).map(mapW) }));
  if (!lines.length && words.length) lines = groupLines(words);
  const paragraphs = (data.paragraphs || []).filter(p => p.text && p.text.trim()).map(p => ({ text: p.text.trim(), conf: Math.round(p.confidence ?? 0), bbox: box(p.bbox) }));
  const blocks = (data.blocks || []).filter(b => b.text && b.text.trim()).map(b => ({ text: b.text.trim(), conf: Math.round(b.confidence ?? 0), bbox: box(b.bbox) }));
  return { text: (data.text || "").trim(), confidence: Math.round(data.confidence ?? 0), words, lines, paragraphs, blocks, width: cv.width, height: cv.height, lang };
}
const ocrArgs = a => ({ lang: a.lang || a.language || "eng", psm: a.psm, mode: ["none", "binarize", "handwriting"].includes(a.preprocess) ? a.preprocess : "auto" });
async function textResult(a, img, suffix, extra = {}) {
  const r = await runOcr(img, ocrArgs(a)), text = r.text, min = num(a.min_confidence, 0, 0, 100);
  const kept = min ? r.words.filter(w => w.conf >= min) : r.words;
  const out = { ok: true, language: r.lang, confidence: r.confidence, word_count: kept.length, characters: text.length, text: text.slice(0, 8000), truncated: text.length > 8000, ...extra };
  if (!text) out.warning = "No text was recognised. Try preprocess:\"binarize\", a different psm, or check the language code.";
  const files = [];
  if (text && (bool(a.save_file, text.length > 3000))) { const f = await save(new Blob([text], { type: "text/plain" }), outName(a, img.file, suffix, "txt")); files.push(f); out.output_file_id = f.id; }
  return { result: out, files, ocr: r };
}
function drawBoxes(cv, boxes, color = "#ff2d55") {
  const x = ctx2(cv), lw = Math.max(2, Math.round(Math.max(cv.width, cv.height) / 400)); x.lineWidth = lw; x.strokeStyle = color; x.fillStyle = color; x.font = `${Math.max(12, lw * 6)}px sans-serif`;
  boxes.forEach(b => { x.strokeRect(b.x, b.y, b.w, b.h); if (b.label) x.fillText(b.label, b.x + 2, Math.max(lw * 6, b.y - 3)); });
}
async function annotated(a, img, suffix, boxes, color) { const cv = toCanvas(img); drawBoxes(cv, boxes, color); const blob = await encode(cv, "png"); return save(blob, outName(a, img.file, suffix, "png")); }

/* tables / receipts / MRZ / language heuristics */
function rowCells(row, mh) {
  const cells = []; let cur = null;
  for (const w of row.words) { if (cur && w.bbox[0] - cur.x1 < mh * 1.2) { cur.text += " " + w.text; cur.x1 = Math.max(cur.x1, w.bbox[2]); } else { cur = { text: w.text, x0: w.bbox[0], x1: w.bbox[2] }; cells.push(cur); } }
  return cells;
}
function buildTable(words) {
  const { rows, mh } = wordsToRows(words), cellRows = rows.map(r => rowCells(r, mh));
  const spans = cellRows.flat().map(c => [c.x0, c.x1]).sort((a, b) => a[0] - b[0]), cols = [];
  for (const s of spans) { const l = cols[cols.length - 1]; if (l && s[0] <= l[1]) l[1] = Math.max(l[1], s[1]); else cols.push([...s]); }
  const table = cellRows.map(cs => { const row = Array(cols.length).fill(""); cs.forEach(c => { const mid = (c.x0 + c.x1) / 2; let k = cols.findIndex(b => mid >= b[0] && mid <= b[1]); if (k < 0) k = 0; row[k] = row[k] ? row[k] + " " + c.text : c.text; }); return row; }).filter(r => r.some(Boolean));
  return { table, columns: cols.length };
}
const csvCell = v => /[",\n\r]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
const toCsv = t => t.map(r => r.map(csvCell).join(",")).join("\r\n");
const toMdTable = t => { if (!t.length) return ""; const w = t[0].length, row = r => "| " + r.map(c => String(c).replace(/\|/g, "\\|")).join(" | ") + " |"; return [row(t[0]), "| " + Array(w).fill("---").join(" | ") + " |", ...t.slice(1).map(row)].join("\n"); };
function parseAmount(s) { s = String(s).replace(/[^\d.,-]/g, ""); if (!s) return null; const lc = s.lastIndexOf(","), ld = s.lastIndexOf("."); s = lc > ld ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, ""); const n = parseFloat(s); return Number.isFinite(n) ? n : null; }
const AMT = /(-?[$€£¥]?\s?\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|-?[$€£¥]?\s?\d+[.,]\d{2})\s*[A-Za-z]{0,3}\s*$/;
function parseReceipt(text) {
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean), r = { merchant: null, date: null, time: null, currency: null, items: [], subtotal: null, tax: null, tip: null, discount: null, total: null, payment_method: null, totals_inferred: false };
  r.merchant = lines.find(l => (l.match(/[A-Za-z]/g) || []).length >= 3 && !AMT.test(l) && !/\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/.test(l)) || null;
  const dm = text.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\b/); r.date = dm ? dm[1] : null;
  const tm = text.match(/\b\d{1,2}:\d{2}(?::\d{2})?\s?(?:[AaPp][Mm])?\b/); r.time = tm ? tm[0] : null;
  const cm = text.match(/[$€£¥]|\b(USD|EUR|GBP|AUD|CAD|NZD|JPY)\b/); r.currency = cm ? cm[0] : null;
  const pm = text.match(/\b(visa|mastercard|amex|american express|debit|credit|cash|eftpos|paypal|apple pay|google pay)\b/i); r.payment_method = pm ? pm[1].toLowerCase() : null;
  const amounts = [];
  for (const line of lines) {
    const m = line.match(AMT); if (!m) continue; const amt = parseAmount(m[1]); if (amt === null) continue; const label = line.slice(0, m.index).trim(), l = label.toLowerCase(); amounts.push(amt);
    if (/sub\s*-?\s*total/.test(l)) r.subtotal = amt;
    else if (/\b(grand\s*)?total\b|amount\s*due|balance\s*due/.test(l) && !/sub/.test(l)) r.total = amt;
    else if (/\b(tax|vat|gst|hst)\b/.test(l)) r.tax = (r.tax || 0) + amt;
    else if (/\b(tip|gratuity)\b/.test(l)) r.tip = amt;
    else if (/discount|savings|coupon|promo/.test(l)) r.discount = amt;
    else if (/\b(change|cash|visa|mastercard|amex|card|debit|credit|tender|paid)\b/.test(l)) { /* payment line, not an item */ }
    else if (/[A-Za-z]{2}/.test(label)) { const q = label.match(/^(\d+)\s*[xX@]?\s+(.*)$/); r.items.push({ description: q ? q[2] : label, quantity: q ? +q[1] : 1, amount: amt }); }
  }
  if (r.total === null && amounts.length) { r.total = Math.max(...amounts); r.totals_inferred = true; }
  if (r.items.length && r.subtotal !== null) { const s = r.items.reduce((t, i) => t + i.amount, 0); r.items_sum = +s.toFixed(2); r.items_match_subtotal = Math.abs(s - r.subtotal) < 0.02; }
  return r;
}
const mrzCheck = s => { const w = [7, 3, 1]; let t = 0; for (let i = 0; i < s.length; i++) { const c = s[i], v = c === "<" ? 0 : /\d/.test(c) ? +c : c.charCodeAt(0) - 55; t += v * w[i % 3]; } return t % 10; };
const fixNum = s => s.replace(/O/g, "0").replace(/[IL]/g, "1").replace(/B/g, "8").replace(/S/g, "5").replace(/Z/g, "2");
const mrzDate = (s, future) => { s = fixNum(s); if (!/^\d{6}$/.test(s)) return null; let y = +s.slice(0, 2); const cy = new Date().getFullYear() % 100; y = future ? 2000 + y : (y > cy ? 1900 + y : 2000 + y); return `${y}-${s.slice(2, 4)}-${s.slice(4, 6)}`; };
function parseMRZ(rawLines) {
  const c = rawLines.map(l => l.replace(/\s/g, "").toUpperCase()).filter(l => /^[A-Z0-9<]{28,46}$/.test(l) && l.includes("<"));
  const ok = (v, ch) => mrzCheck(v) === +fixNum(ch);
  const names = s => { const [sur, ...g] = s.replace(/<+$/, "").split("<<"); return { surname: sur.replace(/</g, " ").trim(), given_names: g.join(" ").replace(/</g, " ").trim() }; };
  for (let i = 0; i + 1 < c.length; i++) {
    if (c[i].length === 44 && c[i + 1].length === 44) { const a = c[i], b = c[i + 1]; return { format: "TD3 (passport)", document_type: a.slice(0, 2).replace(/</g, ""), issuing_country: a.slice(2, 5), ...names(a.slice(5)), document_number: b.slice(0, 9).replace(/</g, ""), nationality: b.slice(10, 13), date_of_birth: mrzDate(b.slice(13, 19), false), sex: b[20], date_of_expiry: mrzDate(b.slice(21, 27), true), checks: { document_number: ok(b.slice(0, 9), b[9]), date_of_birth: ok(fixNum(b.slice(13, 19)), b[19]), date_of_expiry: ok(fixNum(b.slice(21, 27)), b[27]) } }; }
    if (c[i].length === 36 && c[i + 1].length === 36) { const a = c[i], b = c[i + 1]; return { format: "TD2", document_type: a.slice(0, 2).replace(/</g, ""), issuing_country: a.slice(2, 5), ...names(a.slice(5)), document_number: b.slice(0, 9).replace(/</g, ""), nationality: b.slice(10, 13), date_of_birth: mrzDate(b.slice(13, 19), false), sex: b[20], date_of_expiry: mrzDate(b.slice(21, 27), true), checks: { document_number: ok(b.slice(0, 9), b[9]), date_of_birth: ok(fixNum(b.slice(13, 19)), b[19]), date_of_expiry: ok(fixNum(b.slice(21, 27)), b[27]) } }; }
  }
  for (let i = 0; i + 2 < c.length; i++) if (c[i].length === 30 && c[i + 1].length === 30 && c[i + 2].length === 30) { const a = c[i], b = c[i + 1]; return { format: "TD1 (ID card)", document_type: a.slice(0, 2).replace(/</g, ""), issuing_country: a.slice(2, 5), document_number: a.slice(5, 14).replace(/</g, ""), date_of_birth: mrzDate(b.slice(0, 6), false), sex: b[7], date_of_expiry: mrzDate(b.slice(8, 14), true), nationality: b.slice(15, 18), ...names(c[i + 2]), checks: { document_number: ok(a.slice(5, 14), a[14]), date_of_birth: ok(fixNum(b.slice(0, 6)), b[6]), date_of_expiry: ok(fixNum(b.slice(8, 14)), b[14]) } }; }
  return null;
}
const SCRIPTS = [["Latin", /[A-Za-z\u00C0-\u024F]/g], ["Cyrillic", /[\u0400-\u04FF]/g], ["Greek", /[\u0370-\u03FF]/g], ["Arabic", /[\u0600-\u06FF]/g], ["Hebrew", /[\u0590-\u05FF]/g], ["Devanagari", /[\u0900-\u097F]/g], ["Thai", /[\u0E00-\u0E7F]/g], ["Han (Chinese/Kanji)", /[\u4E00-\u9FFF]/g], ["Japanese kana", /[\u3040-\u30FF]/g], ["Hangul (Korean)", /[\uAC00-\uD7AF]/g]];
const STOP = { English: "the and of to in is that for with on are this was as be it", Spanish: "el la de que y en los las del se por con para una un es", French: "le la les de des et en un une du que est pour dans qui", German: "der die das und ist nicht ein eine den mit zu von auf für", Italian: "il lo la di che e un una per con non sono del della è", Portuguese: "o a os as de que e do da em um uma para com não é", Dutch: "de het een en van ik te dat die in is niet op voor met" };
function detectLanguages(text) {
  const tot = SCRIPTS.map(([n, re]) => [n, (text.match(re) || []).length]), sum = tot.reduce((s, x) => s + x[1], 0);
  const scripts = tot.filter(x => x[1]).map(([script, n]) => ({ script, share: +(n / sum).toFixed(3) })).sort((a, b) => b.share - a.share);
  let likely = []; const words = text.toLowerCase().match(/[a-z\u00e0-\u00ff]+/g) || [];
  if (scripts[0]?.script === "Latin" && words.length >= 5) { likely = Object.entries(STOP).map(([lang, s]) => { const set = new Set(s.split(" ")); return { language: lang, score: words.filter(w => set.has(w)).length / words.length }; }).filter(x => x.score > 0.03).sort((a, b) => b.score - a.score).slice(0, 3).map(x => ({ language: x.language, confidence: +Math.min(1, x.score * 4).toFixed(2) })); }
  else if (scripts[0]) { const m = { Cyrillic: "Russian/Ukrainian/Bulgarian (Cyrillic)", Greek: "Greek", Arabic: "Arabic/Persian/Urdu (Arabic script)", Hebrew: "Hebrew", Devanagari: "Hindi/Marathi/Nepali (Devanagari)", Thai: "Thai", "Han (Chinese/Kanji)": scripts.some(s => s.script === "Japanese kana") ? "Japanese" : "Chinese", "Japanese kana": "Japanese", "Hangul (Korean)": "Korean" }[scripts[0].script]; if (m) likely = [{ language: m, confidence: 0.6 }]; }
  return { scripts, likely_languages: likely, method: "script ranges + stop-word frequency (heuristic, not a trained language-ID model)" };
}

/* ═════════════ GROUP 1 — Image understanding & AI vision (1–10) ═════════════ */
const lapVar = (g, w, h) => { let s = 0, s2 = 0, n = 0; for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, v = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w]; s += v; s2 += v * v; n++; } return n ? s2 / n - (s / n) ** 2 : 0; };
function localStats(cv, img) {
  const small = fitCanvas(cv, 512), d = getPx(small), g = grayOf(d), n = g.length;
  let m = 0; for (const v of g) m += v; m /= n; let sd = 0; for (const v of g) sd += (v - m) ** 2; sd = Math.sqrt(sd / n);
  let sat = 0, p = d.data; for (let i = 0; i < p.length; i += 4) { const mx = Math.max(p[i], p[i + 1], p[i + 2]), mn = Math.min(p[i], p[i + 1], p[i + 2]); sat += mx ? (mx - mn) / mx : 0; } sat /= n;
  const sharp = lapVar(g, small.width, small.height), pal = medianCut(samplePixels(d, 20000), 5), tot = pal.reduce((s, c) => s + c.count, 0);
  return {
    width: img.width, height: img.height, megapixels: +(img.width * img.height / 1e6).toFixed(2), orientation: img.width > img.height * 1.05 ? "landscape" : img.height > img.width * 1.05 ? "portrait" : "square",
    format: img.fmt, file_size: img.file.size, has_transparency: hasAlpha(d), mean_brightness: +(m / 255).toFixed(3), contrast_std: +(sd / 255).toFixed(3), mean_saturation: +sat.toFixed(3),
    exposure: m < 60 ? "underexposed/dark" : m > 200 ? "overexposed/bright" : "balanced", sharpness_score: +sharp.toFixed(1), sharpness: sharp < 40 ? "likely blurry" : sharp < 150 ? "moderate" : "sharp",
    dominant_colors: pal.map(c => ({ hex: toHex(c.r, c.g, c.b), name: colorName(c.r, c.g, c.b), share: +(c.count / tot).toFixed(3) }))
  };
}
tool("understand", "analyze_image", "Analyse an image: measurable stats plus an AI description if a vision model is connected.", { ...FILE, focus: "string", include_ocr: "boolean" }, async a => {
  const img = await openImage(a), cv = toCanvas(img), out = { ok: true, ...localStats(cv, img), vision_model_connected: hasVision() };
  const ex = readExif(img.u8, img.fmt); if (ex) out.exif = ex;
  if (hasVision()) out.ai_analysis = await callVision([cv], `Analyse this image${a.focus ? ` with focus on: ${a.focus}` : ""}. Cover: what it shows, notable objects and people (do not identify real individuals), setting, text visible, colours/mood, and any quality problems. Be factual and concise.`);
  else out.note = "No vision model is connected, so I can report measurable properties only; I cannot say what the image depicts.";
  if (bool(a.include_ocr)) { try { const r = await runOcr(img, ocrArgs(a)); out.ocr_text = r.text.slice(0, 3000); out.ocr_confidence = r.confidence; } catch (e) { out.ocr_error = e.message; } }
  return { result: out };
});
tool("understand", "describe_image", "Generate a detailed description (needs a vision model).", { ...FILE, detail: "brief|detailed|alt_text", language: "string" }, async a => {
  const img = await openImage(a), kind = { brief: "one or two sentences", alt_text: "concise alt text under 125 characters", detailed: "a detailed multi-paragraph description covering subjects, composition, colours, lighting, text and setting" }[a.detail] || "a detailed description";
  const text = await callVision([toCanvas(img)], `Describe this image in ${kind}${a.language ? `, written in ${a.language}` : ""}. Describe only what is visible; do not name real people.`, a.detail === "brief" || a.detail === "alt_text" ? 200 : 900);
  return { result: { ok: true, detail: a.detail || "detailed", description: text } };
});
tool("understand", "answer_image_question", "Answer a question about an image (needs a vision model).", { ...FILE, question: "string", use_ocr: "boolean" }, async a => {
  if (!a.question) bad("question is required."); const img = await openImage(a); let ctxText = "";
  if (bool(a.use_ocr)) { try { ctxText = `\n\nOCR text found in the image:\n${(await runOcr(img, ocrArgs(a))).text.slice(0, 3000)}`; } catch (_) { } }
  const text = await callVision([toCanvas(img)], `Answer the question about this image. If the answer is not visible, say so.\nQuestion: ${String(a.question).slice(0, 1000)}${ctxText}`);
  return { result: { ok: true, question: a.question, answer: text } };
});
let cocoP, mobileP, blazeP;
const tfModel = (cache, key, ...urls) => cache || (async () => { for (const u of urls) await loadScript(u); })();
async function getCoco() { if (!cocoP) cocoP = (async () => { await loadScript(CDN.tf); await loadScript(CDN.cocoSsd); if (!globalThis.cocoSsd) unavailable("coco-ssd did not load."); return globalThis.cocoSsd.load({ base: "lite_mobilenet_v2" }); })().catch(e => { cocoP = null; throw e instanceof ToolError ? e : new ToolError(`Object-detection engine failed: ${e.message || e}`, "UNAVAILABLE"); }); return cocoP; }
async function getMobilenet() { if (!mobileP) mobileP = (async () => { await loadScript(CDN.tf); await loadScript(CDN.mobilenet); if (!globalThis.mobilenet) unavailable("MobileNet did not load."); return globalThis.mobilenet.load({ version: 2, alpha: 1.0 }); })().catch(e => { mobileP = null; throw e instanceof ToolError ? e : new ToolError(`Classification engine failed: ${e.message || e}`, "UNAVAILABLE"); }); return mobileP; }
async function getBlaze() { if (!blazeP) blazeP = (async () => { await loadScript(CDN.tf); await loadScript(CDN.blazeface); if (!globalThis.blazeface) unavailable("BlazeFace did not load."); return globalThis.blazeface.load(); })().catch(e => { blazeP = null; throw e instanceof ToolError ? e : new ToolError(`Face-detection engine failed: ${e.message || e}`, "UNAVAILABLE"); }); return blazeP; }
tool("understand", "detect_image_objects", "Detect and locate objects (COCO-SSD, 80 classes) with boxes.", { ...FILE, min_score: "0-1", annotate: "boolean" }, async a => {
  const img = await openImage(a), cv = toCanvas(img), min = num(a.min_score, 0.4, 0, 1);
  let preds;
  try { const m = await getCoco(); preds = (await m.detect(domCanvas(cv))).filter(p => p.score >= min).map(p => ({ label: p.class, score: +p.score.toFixed(3), box: { x: Math.round(p.bbox[0]), y: Math.round(p.bbox[1]), w: Math.round(p.bbox[2]), h: Math.round(p.bbox[3]) } })); }
  catch (e) {
    if (!hasVision()) throw e;
    const t = await callVision([cv], "List the distinct objects clearly visible in this image as a JSON array of strings, nothing else.");
    let list = []; try { list = JSON.parse(t.slice(t.indexOf("["), t.lastIndexOf("]") + 1)); } catch (_) { failed("The vision model did not return a parsable object list."); }
    return { result: { ok: true, engine: "vision-model", boxes_available: false, objects: list.map(String), note: "Local detector unavailable; names come from the vision model and have no coordinates." } };
  }
  const res = { ok: true, engine: "coco-ssd (TensorFlow.js)", count: preds.length, objects: preds }, files = [];
  if (bool(a.annotate, true) && preds.length) { const f = await annotated(a, img, "-objects", preds.map(p => ({ ...p.box, label: `${p.label} ${Math.round(p.score * 100)}%` }))); files.push(f); res.annotated_file_id = f.id; }
  return { result: res, files };
});
tool("understand", "detect_faces", "Detect face locations (not identity).", { ...FILE, annotate: "boolean" }, async a => {
  const img = await openImage(a), cv = toCanvas(img); let faces, engine;
  if (typeof globalThis.FaceDetector === "function") { try { const fd = new globalThis.FaceDetector({ fastMode: false, maxDetectedFaces: 50 }); faces = (await fd.detect(domCanvas(cv))).map(f => ({ box: { x: Math.round(f.boundingBox.x), y: Math.round(f.boundingBox.y), w: Math.round(f.boundingBox.width), h: Math.round(f.boundingBox.height) } })); engine = "browser FaceDetector API"; } catch (_) { faces = null; } }
  if (!faces) { const m = await getBlaze(); faces = (await m.estimateFaces(domCanvas(cv), false)).map(f => { const [x0, y0] = f.topLeft, [x1, y1] = f.bottomRight; return { box: { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) }, probability: +(Array.isArray(f.probability) ? f.probability[0] : f.probability).toFixed(3) }; }); engine = "BlazeFace (TensorFlow.js)"; }
  const res = { ok: true, engine, face_count: faces.length, faces, note: "Detection only; no identification is performed." }, files = [];
  if (bool(a.annotate, true) && faces.length) { const f = await annotated(a, img, "-faces", faces.map(x => x.box)); files.push(f); res.annotated_file_id = f.id; }
  return { result: res, files };
});
tool("understand", "detect_image_text_regions", "Locate text regions (boxes) via OCR layout analysis.", { ...FILE, level: "word|line|paragraph|block", lang: "string", annotate: "boolean" }, async a => {
  const img = await openImage(a), r = await runOcr(img, ocrArgs(a)), level = ["word", "line", "paragraph", "block"].includes(a.level) ? a.level : "line";
  const src = level === "word" ? r.words : level === "line" ? r.lines : level === "paragraph" ? (r.paragraphs.length ? r.paragraphs : r.lines) : (r.blocks.length ? r.blocks : r.lines);
  const regions = src.map(x => ({ box: { x: x.bbox[0], y: x.bbox[1], w: x.bbox[2] - x.bbox[0], h: x.bbox[3] - x.bbox[1] }, text: x.text.slice(0, 80), confidence: x.conf }));
  const res = { ok: true, level, region_count: regions.length, regions: regions.slice(0, 200), truncated: regions.length > 200 }, files = [];
  if (bool(a.annotate, true) && regions.length) { const f = await annotated(a, img, "-text-regions", regions.map(x => x.box), "#00c853"); files.push(f); res.annotated_file_id = f.id; }
  return { result: res, files };
});
tool("understand", "classify_image", "Classify image content (MobileNet ImageNet labels, or custom labels via vision model).", { ...FILE, top_k: "number", labels: "string[] custom labels (needs vision model)" }, async a => {
  const img = await openImage(a), cv = toCanvas(img), k = num(a.top_k, 5, 1, 20);
  if (Array.isArray(a.labels) && a.labels.length) {
    const t = await callVision([cv], `Classify this image into exactly one of these labels: ${a.labels.map(String).join(", ")}. Reply with only the label.`, 30);
    const pick = a.labels.map(String).find(l => t.toLowerCase().includes(l.toLowerCase())); if (!pick) failed(`Vision model answered "${t.slice(0, 60)}", which is not one of the labels.`);
    return { result: { ok: true, engine: "vision-model", label: pick } };
  }
  try { const m = await getMobilenet(), r = await m.classify(domCanvas(cv), k); return { result: { ok: true, engine: "MobileNetV2 (ImageNet 1000 classes)", predictions: r.map(p => ({ label: p.className, probability: +p.probability.toFixed(4) })) } }; }
  catch (e) { if (!hasVision()) throw e; const t = await callVision([cv], "Give a short category label (2-4 words) for this image, nothing else.", 30); return { result: { ok: true, engine: "vision-model", label: t } }; }
});
function normPx(canvas, w, h) { return getPx(resizeCv(canvas, w, h)); }
function similarityOf(dA, dB) {
  const gA = grayOf(dA), gB = grayOf(dB), w = dA.width, h = dA.height, ss = ssimGray(gA, gB, w, h);
  const dh = hamming(dHash(gA, w, h), dHash(gB, w, h)), ah = hamming(aHash(gA, w, h), aHash(gB, w, h)), hi = histIntersect(histogramVec(dA), histogramVec(dB));
  const score = Math.max(0, Math.min(1, .35 * Math.max(0, ss) + .25 * (1 - dh / 64) + .2 * (1 - ah / 64) + .2 * hi));
  return { similarity_percent: +(score * 100).toFixed(1), ssim: +ss.toFixed(4), dhash_distance: dh, ahash_distance: ah, histogram_overlap: +hi.toFixed(3), verdict: score > .97 ? "visually identical / near-duplicate" : score > .85 ? "very similar" : score > .65 ? "somewhat similar" : "different" };
}
tool("understand", "compare_images", "Compare 2+ images: pixel diff, SSIM, changed region, diff image output.", { file_ids: "string[] (first is the reference)", threshold: "0-255 per-channel tolerance", describe_differences: "boolean (vision model)" }, async a => {
  const ids = fids(a); if (ids.length < 2) bad("compare_images needs at least two file ids in file_ids.");
  const ref = await openImage({ file_id: ids[0] }), refCv = toCanvas(ref), s = Math.min(1, 1024 / Math.max(ref.width, ref.height)), W = Math.max(1, Math.round(ref.width * s)), Hh = Math.max(1, Math.round(ref.height * s)), thr = num(a.threshold, 24, 0, 255);
  const dRef = normPx(refCv, W, Hh), results = [], files = [];
  for (const id of ids.slice(1, 9)) {
    const o = await openImage({ file_id: id }), dO = normPx(toCanvas(o), W, Hh), n = W * Hh, p = dRef.data, q = dO.data;
    let changed = 0, sumAbs = 0, x0 = W, y0 = Hh, x1 = -1, y1 = -1; const diff = new Uint8ClampedArray(p.length);
    for (let i = 0; i < n; i++) { const k = i * 4, dr = Math.abs(p[k] - q[k]), dg = Math.abs(p[k + 1] - q[k + 1]), db = Math.abs(p[k + 2] - q[k + 2]), m = Math.max(dr, dg, db); sumAbs += (dr + dg + db) / 3; const ch = m > thr; if (ch) { changed++; const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; diff[k] = 255; diff[k + 1] = 40; diff[k + 2] = 60; diff[k + 3] = 255; } else { const g = (p[k] * .299 + p[k + 1] * .587 + p[k + 2] * .114) * .35 + 150 * .65 * 0 + 0; diff[k] = diff[k + 1] = diff[k + 2] = g; diff[k + 3] = 255; } }
    const sim = similarityOf(dRef, dO), r = { file_id: id, same_dimensions: o.width === ref.width && o.height === ref.height, ...sim, mean_abs_diff_percent: +(sumAbs / n / 255 * 100).toFixed(2), changed_pixels_percent: +(changed / n * 100).toFixed(2), changed_region: changed ? { x: Math.round(x0 / s), y: Math.round(y0 / s), w: Math.round((x1 - x0 + 1) / s), h: Math.round((y1 - y0 + 1) / s) } : null };
    const f = await save(await encode(cvFromPx({ data: diff, width: W, height: Hh }), "png"), `${baseName(ref.file.name)}-vs-${baseName(o.file.name)}-diff.png`); files.push(f); r.diff_file_id = f.id;
    if (bool(a.describe_differences) && hasVision()) { try { r.ai_difference_summary = await callVision([refCv, toCanvas(o)], "The first image is the reference, the second is the comparison. Describe the visible differences concisely."); } catch (e) { r.ai_error = e.message; } }
    results.push(r);
  }
  return { result: { ok: true, reference: ids[0], comparisons: results, note: "Diff images: red = pixels differing by more than the threshold." }, files };
});
tool("understand", "image_similarity", "Calculate visual similarity (SSIM, perceptual hashes, colour histogram).", { file_ids: "string[] (>=2)" }, async a => {
  const ids = fids(a); if (ids.length < 2) bad("image_similarity needs at least two file ids in file_ids.");
  const px = []; for (const id of ids.slice(0, 10)) { const i = await openImage({ file_id: id }); px.push({ id, d: normPx(toCanvas(i), 256, 256) }); }
  const pairs = []; for (let i = 0; i < px.length; i++) for (let j = i + 1; j < px.length; j++) pairs.push({ a: px[i].id, b: px[j].id, ...similarityOf(px[i].d, px[j].d) });
  return { result: { ok: true, compared_at: "256x256 (aspect ratio ignored)", pairs } };
});
tool("understand", "image_to_base64", "Encode an image as base64 for model input (full data saved to a .txt file).", { ...FILE, max_dimension: "number (downscale)", format: "jpeg|png|webp", include_data: "boolean (inline up to 20000 chars)" }, async a => {
  const img = await openImage(a); let cv = toCanvas(img); const md = num(a.max_dimension, 0, 0, 16384); if (md) cv = fitCanvas(cv, md);
  const fmt = normFmt(a.format || (img.fmt === "png" ? "png" : "jpeg")), blob = ["png", "jpeg", "webp"].includes(fmt) ? await encode(cv, fmt, { quality: a.quality }) : bad("format must be png, jpeg or webp."), url = await blobToDataUrl(blob), b64 = url.slice(url.indexOf(",") + 1);
  const f = await save(new Blob([b64], { type: "text/plain" }), outName(a, img.file, "-base64", "txt")), res = { ok: true, mime: blob.type, width: cv.width, height: cv.height, bytes: blob.size, base64_length: b64.length, output_file_id: f.id, base64_preview: b64.slice(0, 60) + "…" };
  if (bool(a.include_data) && b64.length <= 20000) res.base64 = b64; else if (bool(a.include_data)) res.warning = "Base64 exceeds 20000 characters; use max_dimension to shrink it, or read the .txt file.";
  return { result: res, files: [f] };
});

/* ═════════════ GROUP 2 — OCR & text extraction (11–20) ═════════════ */
tool("ocr", "extract_image_text", "Extract text from an image with OCR (Tesseract.js).", { ...FILE, lang: "string e.g. eng, eng+fra", psm: "number 0-13", preprocess: "auto|none|binarize", min_confidence: "0-100", save_file: "boolean" }, async a => {
  const img = await openImage(a), r = await textResult(a, img, "-text"); return { result: r.result, files: r.files };
});
tool("ocr", "extract_handwriting", "Recognise handwritten text (vision model preferred; Tesseract is weak on handwriting).", { ...FILE, engine: "auto|vision|tesseract", lang: "string" }, async a => {
  const img = await openImage(a), eng = a.engine || "auto";
  if ((eng === "auto" || eng === "vision") && hasVision()) { const t = await callVision([toCanvas(img)], "Transcribe all handwritten text in this image exactly as written. Output only the transcription; mark illegible words as [illegible].", 1200); return { result: { ok: true, engine: "vision-model", text: t } }; }
  if (eng === "vision") unavailable("engine \"vision\" requested but no vision model is connected.");
  const r = await textResult({ ...a, preprocess: "handwriting" }, img, "-handwriting"); r.result.engine = "tesseract.js (printed-text engine)"; r.result.warning = "Tesseract is trained for printed text; handwriting accuracy is typically poor. Check the result or connect a vision model."; return { result: r.result, files: r.files };
});
async function pdfDoc(blob) {
  if (!globalThis.pdfjsLib) await loadScript(CDN.pdfjs); const L = globalThis.pdfjsLib; if (!L) unavailable("pdf.js did not load.");
  L.GlobalWorkerOptions.workerSrc = CDN.pdfjsWorker; return L.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
}
tool("ocr", "extract_document_text", "Extract text from a document image or PDF (PDF text layer, OCR fallback).", { ...FILE, lang: "string", max_pages: "number" }, async a => {
  const file = await getFile(fid(a)), u8 = await bytesOf(file);
  if (String.fromCharCode(...u8.subarray(0, 5)) === "%PDF-") {
    const doc = await pdfDoc(file.blob), n = Math.min(doc.numPages, num(a.max_pages, 30, 1, 200)), pages = []; let ocrPages = 0;
    for (let i = 1; i <= n; i++) {
      const page = await doc.getPage(i), tc = await page.getTextContent(); let t = tc.items.map(x => x.str).join(" ").replace(/\s+/g, " ").trim();
      if (t.length < 20) { const vp = page.getViewport({ scale: 2 }), c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height; await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise; t = (await runOcr({ src: c, width: c.width, height: c.height, file }, ocrArgs(a))).text; ocrPages++; }
      pages.push(t);
    }
    const full = pages.map((t, i) => `--- Page ${i + 1} ---\n${t}`).join("\n\n"), f = await save(new Blob([full], { type: "text/plain" }), outName(a, file, "-text", "txt"));
    return { result: { ok: true, type: "pdf", pages_total: doc.numPages, pages_read: n, pages_via_ocr: ocrPages, characters: full.length, text: full.slice(0, 6000), truncated: full.length > 6000, output_file_id: f.id }, files: [f] };
  }
  const img = await openImage(a), r = await textResult({ ...a, save_file: true }, img, "-document"); return { result: { ...r.result, type: "image" }, files: r.files };
});
tool("ocr", "extract_table_from_image", "Extract a table from an image into CSV/JSON/XLSX/Markdown (layout heuristics over OCR).", { ...FILE, lang: "string", formats: "csv,json,xlsx,markdown" }, async a => {
  const img = await openImage(a), r = await runOcr(img, ocrArgs(a)); if (!r.words.length) failed("No text was recognised, so no table could be built.");
  const { table, columns } = buildTable(r.words); if (table.length < 2 || columns < 2) failed(`Could not find a multi-column table (found ${table.length} rows × ${columns} columns). The image may not be tabular or the OCR was too noisy.`);
  const want = String(a.formats || "csv,json,xlsx").toLowerCase().split(/[,\s]+/), files = [];
  if (want.includes("csv")) files.push(await save(new Blob([toCsv(table)], { type: "text/csv" }), outName(a, img.file, "-table", "csv")));
  if (want.includes("json")) files.push(await save(new Blob([JSON.stringify(table)], { type: "application/json" }), outName(a, img.file, "-table", "json")));
  if (want.includes("markdown") || want.includes("md")) files.push(await save(new Blob([toMdTable(table)], { type: "text/markdown" }), outName(a, img.file, "-table", "md")));
  let xlsxNote; if (want.includes("xlsx")) { if (globalThis.XLSX) { const wb = globalThis.XLSX.utils.book_new(); globalThis.XLSX.utils.book_append_sheet(wb, globalThis.XLSX.utils.aoa_to_sheet(table), "Table"); files.push(await save(new Blob([globalThis.XLSX.write(wb, { type: "array", bookType: "xlsx" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), outName(a, img.file, "-table", "xlsx"))); } else xlsxNote = "XLSX library not loaded; CSV/JSON provided instead."; }
  return { result: { ok: true, rows: table.length, columns, ocr_confidence: r.confidence, preview: table.slice(0, 30), xlsx_note: xlsxNote, method: "OCR word boxes → row/column clustering (best for tables with clear gutters; borders are not detected)", output_files: files.map(outInfo) }, files };
});
tool("ocr", "extract_receipt_data", "Read receipt fields: merchant, date, items, subtotal, tax, total.", { ...FILE, lang: "string" }, async a => {
  const img = await openImage(a), r = await runOcr(img, ocrArgs(a)); if (!r.text) failed("No text was recognised on the receipt.");
  const data = parseReceipt(r.text), f = await save(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), outName(a, img.file, "-receipt", "json"));
  return { result: { ok: true, ocr_confidence: r.confidence, receipt: data, output_file_id: f.id, warning: r.confidence < 70 ? "Low OCR confidence; verify amounts manually." : undefined }, files: [f] };
});
tool("ocr", "extract_id_document_text", "Extract visible text and MRZ fields from an ID/passport image (processed locally).", { ...FILE, lang: "string" }, async a => {
  const img = await openImage(a), r = await runOcr(img, ocrArgs(a)); if (!r.text) failed("No text was recognised on the document.");
  const lines = r.text.split(/\r?\n/).map(s => s.trim()).filter(Boolean), mrz = parseMRZ(lines), fields = {};
  const KV = [["document_number", /(?:document|passport|licen[sc]e|id)\s*(?:no\.?|number|#)\s*[:.]?\s*([A-Z0-9-]{5,})/i], ["date_of_birth", /(?:date of birth|dob|born)\s*[:.]?\s*([\d/.\- A-Za-z]{6,14})/i], ["expiry", /(?:expiry|expires|exp\.?|valid until)\s*(?:date)?\s*[:.]?\s*([\d/.\- A-Za-z]{6,14})/i], ["surname", /(?:surname|last name|family name)\s*[:.]?\s*([A-Za-zÀ-ÿ' -]{2,})/i], ["given_names", /(?:given names?|first names?|forenames?)\s*[:.]?\s*([A-Za-zÀ-ÿ' -]{2,})/i], ["nationality", /nationality\s*[:.]?\s*([A-Za-z ]{3,})/i], ["sex", /\b(?:sex|gender)\s*[:.]?\s*([MFX])\b/i]];
  for (const [k, re] of KV) { const m = r.text.match(re); if (m) fields[k] = m[1].trim(); }
  return { result: { ok: true, ocr_confidence: r.confidence, text_lines: lines.slice(0, 80), labelled_fields: fields, mrz: mrz || null, mrz_note: mrz ? (Object.values(mrz.checks).every(Boolean) ? "All MRZ check digits valid." : "Some MRZ check digits failed — OCR errors likely; verify manually.") : "No machine-readable zone detected.", privacy: "Processed locally in the browser; nothing is uploaded. Output contains personal data — handle accordingly.", note: "Text extraction only; this does not verify authenticity." } };
});
tool("ocr", "extract_image_text_coordinates", "Return recognised text with bounding boxes (words or lines).", { ...FILE, level: "word|line", lang: "string", annotate: "boolean" }, async a => {
  const img = await openImage(a), r = await runOcr(img, ocrArgs(a)), level = a.level === "word" ? "word" : "line", items = (level === "word" ? r.words : r.lines).map(x => ({ text: x.text, confidence: x.conf, x: x.bbox[0], y: x.bbox[1], w: x.bbox[2] - x.bbox[0], h: x.bbox[3] - x.bbox[1] }));
  const j = await save(new Blob([JSON.stringify({ image: { width: r.width, height: r.height }, level, items }, null, 1)], { type: "application/json" }), outName(a, img.file, "-text-boxes", "json")), files = [j], res = { ok: true, level, count: items.length, image_size: { width: r.width, height: r.height }, items: items.slice(0, 150), truncated: items.length > 150, output_file_id: j.id };
  if (bool(a.annotate)) { const f = await annotated(a, img, "-text-boxes", items.map(i => ({ x: i.x, y: i.y, w: i.w, h: i.h })), "#2979ff"); files.push(f); res.annotated_file_id = f.id; }
  return { result: res, files };
});
tool("ocr", "detect_language_in_image", "Identify the writing systems/languages of text in an image.", { ...FILE, lang: "string OCR languages to try, e.g. eng+rus" }, async a => {
  const img = await openImage(a), r = await runOcr(img, ocrArgs({ ...a, lang: a.lang || "eng" })); if (!r.text) failed("No text recognised. Pass lang with the OCR languages to try (e.g. \"eng+rus+ara\").");
  return { result: { ok: true, ocr_languages_used: r.lang, ...detectLanguages(r.text), sample: r.text.slice(0, 120) } };
});
tool("ocr", "translate_image_text", "OCR then translate text in an image (needs a connected LLM).", { ...FILE, target_language: "string", source_lang: "string OCR code" }, async a => {
  if (!a.target_language) bad("target_language is required (e.g. \"French\").");
  if (!HOST.llm && !HOST.translate) unavailable("No translation engine is connected. Provide configureImageTools({ llm }) or { translate }. (OCR alone is available via extract_image_text.)");
  const img = await openImage(a), r = await runOcr(img, ocrArgs({ ...a, lang: a.source_lang || a.lang })); if (!r.text) failed("No text recognised to translate.");
  const src = r.text.slice(0, 6000), tr = HOST.translate ? await HOST.translate(src, a.target_language) : await HOST.llm(`Translate the following text into ${a.target_language}. Output only the translation, preserving line breaks.\n\n${src}`);
  const f = await save(new Blob([String(tr)], { type: "text/plain" }), outName(a, img.file, `-${String(a.target_language).slice(0, 12).toLowerCase()}`, "txt"));
  return { result: { ok: true, source_text: src.slice(0, 1500), translation: String(tr).slice(0, 4000), ocr_confidence: r.confidence, truncated_input: r.text.length > 6000, output_file_id: f.id }, files: [f] };
});
tool("ocr", "image_to_markdown", "Convert image text and layout (headings, lists, tables) into Markdown.", { ...FILE, lang: "string" }, async a => {
  const img = await openImage(a), r = await runOcr(img, ocrArgs(a)); if (!r.lines.length) failed("No text was recognised.");
  const hs = r.lines.map(l => l.bbox[3] - l.bbox[1]).sort((x, y) => x - y), mh = hs[hs.length >> 1] || 10, md = []; let prevBottom = null, i = 0;
  const cellsOf = l => rowCells({ words: l.words.length ? l.words : [{ text: l.text, bbox: l.bbox }] }, mh);
  while (i < r.lines.length) {
    const l = r.lines[i], cs = cellsOf(l);
    if (cs.length >= 2) { let j = i; const rows = []; while (j < r.lines.length && cellsOf(r.lines[j]).length >= 2) { rows.push(cellsOf(r.lines[j])); j++; } if (rows.length >= 3) { const w = Math.max(...rows.map(x => x.length)); md.push("", toMdTable(rows.map(x => [...x.map(c => c.text), ...Array(w - x.length).fill("")])), ""); prevBottom = r.lines[j - 1].bbox[3]; i = j; continue; } }
    const h = l.bbox[3] - l.bbox[1], gap = prevBottom === null ? 0 : l.bbox[1] - prevBottom; let t = l.text;
    if (gap > mh * 0.9) md.push("");
    if (h >= mh * 1.6 && t.length < 90) t = "# " + t; else if (h >= mh * 1.3 && t.length < 90) t = "## " + t; else if (/^[•·●▪◦*-]\s+/.test(t)) t = "- " + t.replace(/^[•·●▪◦*-]\s+/, ""); else if (/^(?:\d+|[a-z])[.)]\s+/.test(t)) t = t;
    md.push(t); prevBottom = l.bbox[3]; i++;
  }
  const out = md.join("\n").replace(/\n{3,}/g, "\n\n").trim(), f = await save(new Blob([out], { type: "text/markdown" }), outName(a, img.file, "", "md"));
  return { result: { ok: true, ocr_confidence: r.confidence, markdown: out.slice(0, 6000), truncated: out.length > 6000, output_file_id: f.id, method: "OCR line heights/gaps → headings, lists, tables (heuristic)" }, files: [f] };
});

/* ═════════════ PART 3 — shared helpers + GROUP 3: Image conversion (21–30) ═════════════ */
const ENC_PROBE = new Map();
async function canEncode(fmt) {
  fmt = normFmt(fmt); if (["bmp", "gif", "ico"].includes(fmt)) return true;
  if (!MIME[fmt]) return false; if (ENC_PROBE.has(fmt)) return ENC_PROBE.get(fmt);
  let ok = false; try { const c = mk(2, 2); ctx2(c).fillRect(0, 0, 2, 2); const b = await toBlob(c, MIME[fmt], 0.8); ok = !!b && b.type === MIME[fmt]; } catch (_) { }
  ENC_PROBE.set(fmt, ok); return ok;
}
async function forEachImage(a, fn, max = 40) {
  const ids = fids(a); if (!ids.length) bad("file_id is required (or file_ids to process several files).");
  if (ids.length > max) bad(`Too many files (${ids.length}); the limit is ${max} per call.`);
  const multi = ids.length > 1, results = [], files = [], errors = [];
  for (const id of ids) {
    try {
      const img = await openImage({ file_id: id }), a2 = multi ? { ...a, output_name: undefined } : a;
      const r = await fn(img, a2, id); results.push({ source_file_id: id, ...r.result }); files.push(...(r.files || []));
    } catch (e) { if (!multi) throw e; errors.push({ source_file_id: id, error: e.message, code: e.code || "FAILED" }); }
  }
  if (!multi) { const { source_file_id, ...rest } = results[0]; return { result: rest, files }; }
  if (!results.length) failed(`All ${ids.length} files failed. First error: ${errors[0].error}`);
  return { result: { ok: !errors.length, processed: results.length, failed: errors.length, results, errors }, files };
}
const MULTI = { file_ids: "string[] optional — process several files in one call" };
const outBlobOf = f => store.get(f.id)?.blob;
async function verifyOut(f, fmt) {
  const blob = outBlobOf(f); if (!blob) return null; const det = sniff(await bytesOf({ blob }));
  if (fmt && det !== fmt) failed(`Encoder produced ${det || "unrecognised"} data instead of ${fmt}.`);
  return det;
}
const pct = (a, b) => b ? +((a - b) / b * 100).toFixed(1) : 0;
async function sizedBlobFor(img, a, defFmt) {
  let cv = toCanvas(img); const md = num(a.max_dimension, 0, 0, 32767); if (md) cv = fitCanvas(cv, md);
  const fmt = normFmt(a.format || a.output_format || defFmt || img.fmt);
  if (fmt === "svg") bad("SVG output is only available through convert_image_svg.");
  return { cv, fmt, blob: await encode(cv, fmt, { quality: a.quality, background: a.background_color, dither: a.dither, sizes: a.sizes }) };
}

async function convertImage(img, a, fmt) {
  fmt = normFmt(fmt); if (fmt === "svg") return svgConvert(img, a);
  const cv = toCanvas(img), px = getPx(cv), alpha = hasAlpha(px), notes = [];
  const { result, files } = await emit(a, img, img.fmt === fmt ? "-converted" : "", cv, {}, { format: fmt, quality: a.quality });
  await verifyOut(files[0], fmt);
  if (alpha && fmt === "jpeg") notes.push(`Transparency was flattened onto ${a.background_color || "#ffffff"} (JPEG has no alpha).`);
  if (alpha && fmt === "gif") notes.push("GIF supports only 1-bit transparency; semi-transparent pixels were thresholded.");
  if (fmt === "gif") notes.push("GIF is limited to 256 colours; the palette was quantised (median-cut" + (bool(a.dither) ? " + Floyd–Steinberg dithering" : "") + ").");
  if (fmt === "ico") notes.push("ICO contains PNG-compressed icons at sizes " + (a.sizes || "16,32,48,64,128,256") + " (never upscaled beyond the source aspect box).");
  const out = { ...result, input_format: img.fmt, output_format: fmt, lossless: ["png", "bmp"].includes(fmt), input_bytes: img.file.size, output_bytes: files[0].size, size_change_percent: pct(files[0].size, img.file.size) };
  delete out.input_size; if (notes.length) out.notes = notes; return { result: out, files };
}
const convParams = { ...FILE, ...MULTI, quality: "1-100 (lossy formats)", background_color: "#rrggbb used when flattening transparency", output_name: "string" };
for (const [name, fmt, extra] of [["convert_image_webp", "webp", {}], ["convert_image_png", "png", {}], ["convert_image_jpeg", "jpeg", {}], ["convert_image_avif", "avif", {}], ["convert_image_bmp", "bmp", {}], ["convert_image_gif", "gif", { dither: "boolean" }]])
  tool("convert", name, `Convert an image to ${fmt.toUpperCase()} (real re-encode; verified by reading the output's signature).`, { ...convParams, ...extra }, a => forEachImage(a, (img, a2) => convertImage(img, a2, fmt)));
tool("convert", "convert_image_format", "Convert to any supported output format (png, jpeg, webp, avif, bmp, gif, ico, svg).", { ...convParams, format: "png|jpeg|webp|avif|bmp|gif|ico|svg", sizes: "ICO sizes e.g. 16,32,48", dither: "boolean", mode: "svg only: trace|embed" }, a => {
  if (!a.format && !a.output_format) bad("format is required (png, jpeg, webp, avif, bmp, gif, ico, svg)."); return forEachImage(a, (img, a2) => convertImage(img, a2, a2.format || a2.output_format));
});

/* raster → SVG: colour-quantised contour tracing (a real vectoriser) or raster embedding */
function dpSimplify(pts, eps) {
  const n = pts.length; if (n < 4 || eps <= 0) return pts;
  let far = 0, fd = -1; for (let i = 1; i < n; i++) { const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2; if (d > fd) { fd = d; far = i; } }
  const keep = new Uint8Array(n); keep[0] = keep[far] = 1; const stack = [[0, far], [far, n]];
  while (stack.length) {
    const [s, e] = stack.pop(), A = pts[s], B = pts[e % n], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1; let mx = -1, mi = -1;
    for (let i = s + 1; i < e; i++) { const P = pts[i], d = Math.abs(dy * (P[0] - A[0]) - dx * (P[1] - A[1])) / L; if (d > mx) { mx = d; mi = i; } }
    if (mx > eps && mi > 0) { keep[mi] = 1; stack.push([s, mi], [mi, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function traceMask(mask, W, H, eps, minArea) {
  const VW = W + 1, out = new Map(), add = (x0, y0, x1, y1) => { const k = y0 * VW + x0; let l = out.get(k); if (!l) out.set(k, l = []); l.push(y1 * VW + x1); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[y * W + x]) {
    if (y === 0 || !mask[(y - 1) * W + x]) add(x, y, x + 1, y);
    if (x === W - 1 || !mask[y * W + x + 1]) add(x + 1, y, x + 1, y + 1);
    if (y === H - 1 || !mask[(y + 1) * W + x]) add(x + 1, y + 1, x, y + 1);
    if (x === 0 || !mask[y * W + x - 1]) add(x, y + 1, x, y);
  }
  const rings = [];
  for (const [start, l] of out) while (l.length) {
    let cur = l.pop(); const ring = [start]; let guard = 0;
    while (cur !== start && guard++ < 5e6) { ring.push(cur); const nl = out.get(cur); if (!nl || !nl.length) break; cur = nl.pop(); }
    let pts = ring.map(v => [v % VW, (v / VW) | 0]);
    pts = pts.filter((p, i) => { const a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length]; return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1])); });
    if (pts.length < 3) continue; let area = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; area += p[0] * q[1] - q[0] * p[1]; }
    if (Math.abs(area) / 2 < minArea) continue;
    pts = dpSimplify(pts, eps); if (pts.length >= 3) rings.push(pts);
  }
  return rings.map(r => "M" + r.map(p => p[0] + " " + p[1]).join("L") + "Z").join("");
}
async function svgConvert(img, a) {
  if (img.fmt === "svg") bad("The input is already SVG.");
  const mode = String(a.mode || "trace").toLowerCase(), cv = toCanvas(img); let svg, info;
  if (mode === "embed") {
    const url = await blobToDataUrl(await encode(cv, "png"));
    svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${cv.width}" height="${cv.height}" viewBox="0 0 ${cv.width} ${cv.height}"><image width="${cv.width}" height="${cv.height}" xlink:href="${url}"/></svg>`;
    info = { mode: "embed", vectorized: false, note: "The raster was embedded inside an SVG wrapper. It is a valid SVG file but the pixels are NOT vectorised; use mode:\"trace\" for real vector shapes." };
  } else if (mode === "trace") {
    const colors = num(a.colors, 8, 2, 32), maxDim = num(a.trace_max_dimension, 400, 32, 1200), minArea = num(a.min_area, 3, 0, 1e5), eps = num(a.smoothing, 1, 0.2, 6);
    const s = Math.min(1, maxDim / Math.max(cv.width, cv.height)), W = Math.max(1, Math.round(cv.width * s)), Hh = Math.max(1, Math.round(cv.height * s)), d = getPx(s < 1 ? resizeCv(cv, W, Hh) : cv), alpha = (() => { for (let i = 3; i < d.data.length; i += 4) if (d.data[i] < 128) return true; return false; })();
    const pal = medianCut(samplePixels(d, 60000), colors); if (!pal.length) failed("The image is fully transparent; there is nothing to trace.");
    const map = makeMapper(pal), labels = new Int16Array(W * Hh), area = new Array(pal.length).fill(0);
    for (let i = 0; i < W * Hh; i++) { const p = i * 4; if (d.data[p + 3] < 128) labels[i] = -1; else { const k = map(d.data[p], d.data[p + 1], d.data[p + 2]); labels[i] = k; area[k]++; } }
    const order = pal.map((_, i) => i).filter(i => area[i]).sort((x, y) => area[y] - area[x]), shapes = []; let paths = 0;
    order.forEach((k, rank) => {
      const c = pal[k], fill = toHex(c.r, c.g, c.b);
      if (rank === 0 && !alpha) { shapes.push(`<rect width="${W}" height="${Hh}" fill="${fill}"/>`); return; }
      const mask = new Uint8Array(W * Hh); for (let i = 0; i < mask.length; i++) if (labels[i] === k) mask[i] = 1;
      const dd = traceMask(mask, W, Hh, eps, minArea); if (dd) { paths++; shapes.push(`<path d="${dd}" fill="${fill}" stroke="${fill}" stroke-width="0.6" stroke-linejoin="round" fill-rule="evenodd"/>`); }
    });
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cv.width}" height="${cv.height}" viewBox="0 0 ${W} ${Hh}">${shapes.join("")}</svg>`;
    info = { mode: "trace", vectorized: true, colors_used: order.length, paths, traced_at: `${W}x${Hh}`, note: "Posterised vector approximation (colour quantisation + contour tracing). Photographs lose gradients and fine detail; logos, icons and flat artwork trace best." };
  } else bad("mode must be \"trace\" or \"embed\".");
  if (svg.length > 40e6) failed("The generated SVG is too large; lower colors or trace_max_dimension.");
  if (typeof DOMParser !== "undefined") { const doc = new DOMParser().parseFromString(svg, "image/svg+xml"); if (doc.querySelector("parsererror")) failed("Generated SVG failed XML validation."); }
  const f = await save(new Blob([svg], { type: "image/svg+xml" }), outName(a, img.file, "-vector", "svg"));
  return { result: { ok: true, ...outInfo(f), format: "svg", width: cv.width, height: cv.height, input_format: img.fmt, input_bytes: img.file.size, output_bytes: f.size, ...info }, files: [f] };
}
tool("convert", "convert_image_svg", "Convert a raster image to SVG: real colour-region vector tracing (mode trace) or embedding (mode embed).", { ...FILE, ...MULTI, mode: "trace|embed", colors: "2-32 (trace)", smoothing: "0.2-6 simplification tolerance px", min_area: "speckle removal px²", trace_max_dimension: "number", output_name: "string" }, a => forEachImage(a, (img, a2) => svgConvert(img, a2), 20));

tool("convert", "image_to_data_url", "Encode an image as a data: URL (original bytes unless format/max_dimension is given). Full URL saved to a .txt file.", { ...FILE, format: "png|jpeg|webp (omit to keep original bytes)", quality: "1-100", max_dimension: "number", include_data: "boolean", max_inline_chars: "number" }, async a => {
  const img = await openImage(a); let blob, reencoded = false, w = img.width, h = img.height;
  if (a.format || a.output_format || a.max_dimension) { const r = await sizedBlobFor(img, a, img.fmt === "svg" ? "png" : img.fmt); blob = r.blob; w = r.cv.width; h = r.cv.height; reencoded = true; }
  else blob = new Blob([img.u8], { type: MIME[img.fmt] || img.file.type || "application/octet-stream" });
  const url = await blobToDataUrl(blob), f = await save(new Blob([url], { type: "text/plain" }), outName(a, img.file, "-dataurl", "txt")), lim = num(a.max_inline_chars, 20000, 100, 200000);
  const res = { ok: true, mime: blob.type, width: w, height: h, reencoded, image_bytes: blob.size, data_url_length: url.length, output_file_id: f.id, html_img_tag_length: url.length + 40 };
  if (bool(a.include_data)) { if (url.length <= lim) res.data_url = url; else res.warning = `Data URL has ${url.length} characters (limit ${lim}); read the .txt file or shrink with max_dimension/quality.`; }
  return { result: res, files: [f] };
});
tool("convert", "image_to_blob", "Re-encode an image into a downloadable binary Blob file (optionally resized) and return its blob URL, MIME type and size.", { ...FILE, format: "png|jpeg|webp|avif|bmp|gif", quality: "1-100", max_dimension: "number", output_name: "string" }, async a => {
  const img = await openImage(a), r = await sizedBlobFor(img, a, img.fmt === "svg" ? "png" : img.fmt), f = await save(r.blob, outName(a, img.file, "-blob", r.fmt));
  await verifyOut(f, r.fmt);
  return { result: { ok: true, ...outInfo(f), blob_type: r.blob.type, blob_bytes: r.blob.size, width: r.cv.width, height: r.cv.height, blob_url: f.url, note: "blob_url is an object URL valid only in the current browser session; file_id/url is the downloadable output." }, files: [f] };
});

/* ═════════════ PART 4 — GROUP 4: Resizing & dimensions (31–40) ═════════════ */
function dpiOf(u8, fmt) {
  try {
    if (fmt === "png") { for (const c of pngChunks(u8)) if (c.type === "pHYs") { const x = c.dv.getUint32(c.start + 8), y = c.dv.getUint32(c.start + 12), unit = u8[c.start + 16]; if (unit === 1) return { x: +(x * 0.0254).toFixed(1), y: +(y * 0.0254).toFixed(1) }; } }
    if (fmt === "jpeg") { for (const s of jpegSegments(u8)) if (s.m === 0xE0 && String.fromCharCode(...u8.subarray(s.hdr + 2, s.hdr + 7)) === "JFIF\0") { const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), unit = u8[s.hdr + 9], x = dv.getUint16(s.hdr + 10), y = dv.getUint16(s.hdr + 12); if (unit === 1) return { x, y }; if (unit === 2) return { x: +(x * 2.54).toFixed(1), y: +(y * 2.54).toFixed(1) }; } }
    if (fmt === "bmp") { const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), x = dv.getInt32(38, true), y = dv.getInt32(42, true); if (x > 0 && y > 0) return { x: +(x * 0.0254).toFixed(1), y: +(y * 0.0254).toFixed(1) }; }
  } catch (_) { }
  return null;
}
const ratioStr = (w, h) => { const g = gcd(Math.round(w), Math.round(h)) || 1; return `${Math.round(w) / g}:${Math.round(h) / g}`; };
const STD_RATIOS = [["1:1", 1], ["5:4", 1.25], ["4:3", 4 / 3], ["3:2", 1.5], ["16:10", 1.6], ["16:9", 16 / 9], ["1.91:1", 1.91], ["2:1", 2], ["21:9", 21 / 9], ["4:5", .8], ["3:4", .75], ["2:3", 2 / 3], ["10:16", .625], ["9:16", 9 / 16]];
const nearestRatio = r => STD_RATIOS.reduce((b, s) => Math.abs(s[1] - r) < Math.abs(b[1] - r) ? s : b);
const dimArg = (v, name) => v === undefined || v === null || v === "" ? null : Math.round(num(v, 0, 1, 32767));

tool("resize", "resize_image", "Resize to exact pixel dimensions (width and/or height). One dimension keeps aspect ratio; both stretch unless maintain_aspect is true.", { ...FILE, ...MULTI, width: "px", height: "px", maintain_aspect: "boolean (with both dims: fit inside the box)", allow_upscale: "boolean (default true)", smooth: "boolean (false = nearest-neighbour)", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const W = dimArg(a2.width), H = dimArg(a2.height), w = img.width, h = img.height; if (!W && !H) bad("width and/or height is required.");
  let tw, th; if (W && H) { if (bool(a2.maintain_aspect)) { const s = Math.min(W / w, H / h); tw = w * s; th = h * s; } else { tw = W; th = H; } } else if (W) { tw = W; th = h * W / w; } else { th = H; tw = w * H / h; }
  tw = Math.max(1, Math.round(tw)); th = Math.max(1, Math.round(th));
  if (!bool(a2.allow_upscale, true) && (tw > w || th > h)) { tw = Math.min(tw, w); th = Math.min(th, h); }
  const cv = resizeCv(toCanvas(img), tw, th, bool(a2.smooth, true));
  return emit(a2, img, `-${tw}x${th}`, cv, { original: { width: w, height: h }, scale_x: +(tw / w).toFixed(4), scale_y: +(th / h).toFixed(4), aspect_ratio_changed: Math.abs(tw / th - w / h) > 0.01 });
}));
tool("resize", "resize_image_percentage", "Resize by percentage of the original size.", { ...FILE, ...MULTI, percent: "1-1000 (uniform)", percent_x: "optional", percent_y: "optional", smooth: "boolean", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const px = num(a2.percent_x ?? a2.percent, NaN, 0.1, 1000), py = num(a2.percent_y ?? a2.percent, NaN, 0.1, 1000); if (Number.isNaN(px) || Number.isNaN(py)) bad("percent (or percent_x and percent_y) is required.");
  const tw = Math.max(1, Math.round(img.width * px / 100)), th = Math.max(1, Math.round(img.height * py / 100));
  return emit(a2, img, `-${Math.round(px)}pct`, resizeCv(toCanvas(img), tw, th, bool(a2.smooth, true)), { original: { width: img.width, height: img.height }, percent_x: px, percent_y: py });
}));
tool("resize", "resize_image_fit", "Fit an image inside a width×height box preserving aspect ratio; optional padding to exactly the box.", { ...FILE, ...MULTI, width: "px box width", height: "px box height", pad: "boolean pad to exact box size", pad_color: "#rrggbb|transparent", allow_upscale: "boolean (default false)", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const W = dimArg(a2.width), H = dimArg(a2.height); if (!W && !H) bad("width and/or height is required.");
  let s = Math.min(W ? W / img.width : Infinity, H ? H / img.height : Infinity); if (!bool(a2.allow_upscale)) s = Math.min(1, s);
  const tw = Math.max(1, Math.round(img.width * s)), th = Math.max(1, Math.round(img.height * s)); let cv = resizeCv(toCanvas(img), tw, th);
  if (bool(a2.pad) && W && H) { const o = mk(W, H), x = ctx2(o), pc = a2.pad_color ?? "transparent"; if (pc !== "transparent") { x.fillStyle = cssColor(pc); x.fillRect(0, 0, W, H); } x.drawImage(cv, Math.round((W - tw) / 2), Math.round((H - th) / 2)); cv = o; }
  return emit(a2, img, `-fit${cv.width}x${cv.height}`, cv, { original: { width: img.width, height: img.height }, fitted_content: { width: tw, height: th }, padded: bool(a2.pad) && !!(W && H) });
}));
function smartOffset(cv, sw, sh, tw, th) {
  const small = fitCanvas(cv, 256), d = getPx(small), g = grayOf(d), { m } = sobelMag(g, small.width, small.height), W = small.width, H = small.height, horiz = sw > tw + 1;
  const len = horiz ? W : H, e = new Float64Array(len); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) e[horiz ? x : y] += m[y * W + x];
  const win = Math.max(1, Math.round((horiz ? tw / sw : th / sh) * len)), cs = new Float64Array(len + 1); for (let i = 0; i < len; i++) cs[i + 1] = cs[i] + e[i];
  let best = 0, bv = -1; for (let o = 0; o + win <= len; o++) { const v = (cs[o + win] - cs[o]) * (1 - 0.15 * Math.abs((o + win / 2) / len - 0.5)); if (v > bv) { bv = v; best = o; } }
  const frac = len - win > 0 ? best / (len - win) : 0.5; return horiz ? { fx: frac, fy: .5 } : { fx: .5, fy: frac };
}
tool("resize", "resize_image_fill", "Resize to fill an exact width×height (cover) and crop the overflow by focus point (centre, edges, or content-aware 'smart').", { ...FILE, ...MULTI, width: "px", height: "px", focus: "center|top|bottom|left|right|top-left|top-right|bottom-left|bottom-right|smart", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const W = dimArg(a2.width), H = dimArg(a2.height); if (!W || !H) bad("Both width and height are required.");
  const focus = String(a2.focus || "center").toLowerCase(), src = toCanvas(img), s = Math.max(W / img.width, H / img.height), sw = img.width * s, sh = img.height * s;
  let fx = .5, fy = .5; if (focus === "smart") ({ fx, fy } = smartOffset(src, sw, sh, W, H)); else { if (/left/.test(focus)) fx = 0; if (/right/.test(focus)) fx = 1; if (/top/.test(focus)) fy = 0; if (/bottom/.test(focus)) fy = 1; if (!/^(center|top|bottom|left|right|top-left|top-right|bottom-left|bottom-right)$/.test(focus)) bad("Unknown focus \"" + focus + "\"."); }
  const cw = Math.min(img.width, W / s), ch = Math.min(img.height, H / s), sx = (img.width - cw) * fx, sy = (img.height - ch) * fy, crop = mk(Math.max(1, Math.round(cw)), Math.max(1, Math.round(ch)));
  ctx2(crop).drawImage(src, sx, sy, cw, ch, 0, 0, crop.width, crop.height);
  return emit(a2, img, `-fill${W}x${H}`, resizeCv(crop, W, H), { original: { width: img.width, height: img.height }, crop_box_in_original: { x: Math.round(sx), y: Math.round(sy), w: Math.round(cw), h: Math.round(ch) }, focus, upscaled: s > 1 });
}));
tool("resize", "scale_image", "Scale by a factor (uniform or per-axis) or to a target megapixel count.", { ...FILE, ...MULTI, factor: "number e.g. 0.5 or 2", scale_x: "number", scale_y: "number", target_megapixels: "number", method: "smooth|nearest", ...OUT }, a => forEachImage(a, async (img, a2) => {
  let sx, sy; if (a2.target_megapixels !== undefined) { const f = Math.sqrt(num(a2.target_megapixels, 1, 0.001, 150) * 1e6 / (img.width * img.height)); sx = sy = f; } else { sx = num(a2.scale_x ?? a2.factor ?? a2.scale, NaN, 0.001, 100); sy = num(a2.scale_y ?? a2.factor ?? a2.scale, NaN, 0.001, 100); }
  if (Number.isNaN(sx) || Number.isNaN(sy)) bad("factor (or scale_x and scale_y, or target_megapixels) is required.");
  const tw = Math.max(1, Math.round(img.width * sx)), th = Math.max(1, Math.round(img.height * sy));
  return emit(a2, img, `-x${+sx.toFixed(3)}`, resizeCv(toCanvas(img), tw, th, String(a2.method || "smooth") !== "nearest"), { original: { width: img.width, height: img.height }, scale_x: +sx.toFixed(4), scale_y: +sy.toFixed(4) });
}));
async function dimsInfo(file) {
  const u8 = await bytesOf(file), fmt = sniff(u8); if (!fmt) bad(`"${file.name}" is not a recognised image file.`);
  const stored = headerDims(u8, fmt), exif = readExif(u8, fmt), ori = exif?.orientation; let w = stored?.width, h = stored?.height, source = "file header";
  if (!w || !h) { const dec = await decodeBlob(file.blob, fmt); w = dec.width; h = dec.height; source = "decoded image"; }
  const swap = [5, 6, 7, 8].includes(Number(ori)), dw = swap ? h : w, dh = swap ? w : h, dpi = dpiOf(u8, fmt);
  const r = { file_id: file.id, name: file.name, format: fmt, width: dw, height: dh, megapixels: +(dw * dh / 1e6).toFixed(3), orientation: dw > dh * 1.02 ? "landscape" : dh > dw * 1.02 ? "portrait" : "square", aspect_ratio: ratioStr(dw, dh), aspect_decimal: +(dw / dh).toFixed(4), source };
  if (swap) { r.stored_width = w; r.stored_height = h; r.note = `EXIF orientation ${ori} swaps the displayed dimensions.`; }
  if (dpi) { r.dpi = dpi; r.print_size_inches = { width: +(dw / dpi.x).toFixed(2), height: +(dh / dpi.y).toFixed(2) }; }
  return r;
}
tool("resize", "get_image_dimensions", "Report width, height, megapixels, orientation, aspect ratio and DPI for one or more images.", { ...FILE, ...MULTI }, async a => {
  const ids = fids(a); if (!ids.length) bad("file_id (or file_ids) is required."); const out = [];
  for (const id of ids.slice(0, 100)) { try { out.push(await dimsInfo(await getFile(id))); } catch (e) { out.push({ file_id: id, error: e.message }); } }
  if (out.length === 1) { if (out[0].error) bad(out[0].error); return { result: { ok: true, ...out[0] } }; } return { result: { ok: true, images: out } };
});

function gifInfo(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let p = 13, frames = 0, delay = 0, loop = null; const flags = u8[10];
  if (flags & 0x80) p += 3 * (1 << ((flags & 7) + 1));
  while (p < u8.length) {
    const b = u8[p++]; if (b === 0x3B) break;
    if (b === 0x21) { const label = u8[p++]; if (label === 0xF9) delay += dv.getUint16(p + 2, true) * 10; if (label === 0xFF && String.fromCharCode(...u8.subarray(p + 1, p + 12)) === "NETSCAPE2.0") loop = dv.getUint16(p + 14, true); while (u8[p]) p += u8[p] + 1; p++; }
    else if (b === 0x2C) { frames++; const f = u8[p + 8]; p += 9; if (f & 0x80) p += 3 * (1 << ((f & 7) + 1)); p++; while (u8[p]) p += u8[p] + 1; p++; }
    else break;
  }
  return { frames, animated: frames > 1, total_duration_ms: delay, loop_count: loop === null ? "none" : loop === 0 ? "infinite" : loop };
}
function riffChunks(u8) { const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), out = []; let p = 12; while (p + 8 <= u8.length) { const t = String.fromCharCode(...u8.subarray(p, p + 4)), n = dv.getUint32(p + 4, true); out.push({ type: t, start: p, size: n, end: p + 8 + n + (n & 1) }); p += 8 + n + (n & 1); } return out; }
tool("resize", "get_image_metadata", "Read format-level metadata: colour/bit depth, EXIF (camera, GPS), ICC/XMP presence, DPI, animation, PNG text chunks, JPEG type.", { ...FILE }, async a => {
  const file = await getFile(fid(a)), u8 = await bytesOf(file), fmt = sniff(u8); if (!fmt) bad(`"${file.name}" is not a recognised image file.`);
  const dims = await dimsInfo(file), m = { ok: true, file_id: file.id, name: file.name, format: fmt, mime: MIME[fmt], file_bytes: file.size, width: dims.width, height: dims.height, dpi: dims.dpi || null }, dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  try {
    if (fmt === "png") { const ct = { 0: "grayscale", 2: "RGB", 3: "indexed", 4: "grayscale+alpha", 6: "RGBA" }, text = {}; const ch = []; for (const c of pngChunks(u8)) { ch.push(c.type); if (c.type === "IHDR") { m.bit_depth = u8[c.start + 16]; m.color_type = ct[u8[c.start + 17]]; m.interlaced = u8[c.start + 20] === 1; } if (c.type === "tEXt") { const s = String.fromCharCode(...u8.subarray(c.start + 8, c.start + 8 + Math.min(c.len, 400))), i = s.indexOf("\0"); text[s.slice(0, i)] = s.slice(i + 1).slice(0, 200); } if (c.type === "acTL") m.animation_frames = c.dv.getUint32(c.start + 8); } m.has_icc = ch.includes("iCCP"); m.has_exif = ch.includes("eXIf"); m.chunks = [...new Set(ch)]; if (Object.keys(text).length) m.text_chunks = text; }
    else if (fmt === "jpeg") { const segs = jpegSegments(u8); const sof = segs.find(s => s.m >= 0xC0 && s.m <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(s.m)); if (sof) { m.jpeg_type = sof.m === 0xC2 ? "progressive" : sof.m === 0xC0 ? "baseline" : "SOF" + (sof.m - 0xC0); m.bit_depth = u8[sof.hdr + 2]; const nc = u8[sof.hdr + 7]; m.components = nc; if (nc === 3) { const hv = u8[sof.hdr + 9]; m.chroma_subsampling = hv === 0x22 ? "4:2:0" : hv === 0x21 ? "4:2:2" : hv === 0x11 ? "4:4:4" : "0x" + hv.toString(16); } } m.has_icc = segs.some(s => s.m === 0xE2 && String.fromCharCode(...u8.subarray(s.hdr + 2, s.hdr + 13)) === "ICC_PROFILE"); m.has_exif = segs.some(s => s.m === 0xE1 && String.fromCharCode(...u8.subarray(s.hdr + 2, s.hdr + 8)) === "Exif\0\0"); m.has_xmp = segs.some(s => s.m === 0xE1 && String.fromCharCode(...u8.subarray(s.hdr + 2, s.hdr + 31)).startsWith("http://ns.adobe.com/xap")); m.comments = segs.filter(s => s.m === 0xFE).length; }
    else if (fmt === "gif") Object.assign(m, gifInfo(u8), { version: String.fromCharCode(...u8.subarray(0, 6)) });
    else if (fmt === "bmp") { m.bit_depth = dv.getUint16(28, true); m.compression = dv.getUint32(30, true); m.dib_header = dv.getUint32(14, true); }
    else if (fmt === "webp") { const ch = riffChunks(u8); m.chunks = ch.map(c => c.type.trim()); const x = ch.find(c => c.type === "VP8X"); m.encoding = ch.some(c => c.type === "VP8L") ? "lossless" : ch.some(c => c.type === "VP8 ") ? "lossy" : "extended"; if (x) { const f = u8[x.start + 8]; m.animated = !!(f & 2); m.has_alpha = !!(f & 0x10); m.has_icc = !!(f & 0x20); m.has_exif = !!(f & 8); m.has_xmp = !!(f & 4); if (m.animated) m.animation_frames = ch.filter(c => c.type === "ANMF").length; } }
    else if (fmt === "svg") { const t = new TextDecoder().decode(u8.subarray(0, Math.min(u8.length, 4000))); m.view_box = (t.match(/viewBox="([^"]+)"/) || [])[1] || null; m.vector = true; }
  } catch (e) { m.parse_warning = "Part of the structure could not be parsed: " + e.message; }
  const ex = readExif(u8, fmt); if (ex) m.exif = ex; if (ex?.gps) m.privacy_warning = "This image contains GPS coordinates."; m.exif_orientation = ex?.orientation ?? null;
  return { result: m };
});
tool("resize", "calculate_image_aspect_ratio", "Compute the aspect ratio of an image or width/height pair, nearest standard ratio, and the missing dimension for a target size.", { ...FILE, width: "px (if no file)", height: "px (if no file)", target_width: "px → returns matching height", target_height: "px → returns matching width", ratio: "e.g. 16:9 to compute from" }, async a => {
  let w = a.width !== undefined ? num(a.width, 0, 1) : null, h = a.height !== undefined ? num(a.height, 0, 1) : null;
  if ((!w || !h) && fid(a)) { const d = await dimsInfo(await getFile(fid(a))); w = d.width; h = d.height; }
  let r = w && h ? w / h : null; if (a.ratio) { const m = String(a.ratio).match(/^(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)$/); if (!m) bad("ratio must look like 16:9."); r = +m[1] / +m[2]; if (!w && !h && !a.target_width && !a.target_height) bad("Give a target_width or target_height with ratio."); }
  if (!r) bad("Provide a file_id, or width and height, or ratio with a target size.");
  const out = { ok: true, ratio: w && h ? ratioStr(w, h) : String(a.ratio), decimal: +r.toFixed(4), orientation: r > 1.02 ? "landscape" : r < 0.98 ? "portrait" : "square" }, [nm, nv] = nearestRatio(r); out.nearest_standard = { ratio: nm, difference_percent: +((r / nv - 1) * 100).toFixed(2), exact: Math.abs(r / nv - 1) < 0.005 };
  if (w && h) { out.width = w; out.height = h; }
  if (a.target_width) { const tw = num(a.target_width, 0, 1); out.for_target_width = { width: tw, height: Math.round(tw / r) }; } if (a.target_height) { const th = num(a.target_height, 0, 1); out.for_target_height = { height: th, width: Math.round(th * r) }; }
  return { result: out };
});
tool("resize", "generate_image_thumbnail", "Generate thumbnail(s): square-crop (cover) or contain, one or many sizes (many → also a ZIP).", { ...FILE, ...MULTI, size: "px longest side / square side (default 150)", sizes: "number[] several sizes", mode: "cover|contain", format: "jpeg|png|webp", quality: "1-100", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const sizes = (Array.isArray(a2.sizes) ? a2.sizes : String(a2.sizes ?? a2.size ?? 150).split(/[,\s]+/)).map(Number).filter(n => n >= 8 && n <= 4096); if (!sizes.length) bad("size must be between 8 and 4096.");
  const mode = a2.mode === "contain" ? "contain" : "cover", src = toCanvas(img), alpha = hasAlpha(getPx(fitCanvas(src, 256))), fmt = normFmt(a2.format || a2.output_format || (alpha ? "png" : "jpeg")), files = [], list = [];
  for (const s of [...new Set(sizes)].slice(0, 12)) {
    let cv; if (mode === "cover") { const side = Math.min(img.width, img.height), crop = mk(side, side); ctx2(crop).drawImage(src, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, side, side); cv = resizeCv(crop, s, s); } else { const k = Math.min(s / img.width, s / img.height, 1) || 1; cv = resizeCv(src, Math.max(1, Math.round(img.width * k)), Math.max(1, Math.round(img.height * k))); }
    const blob = await encode(cv, fmt, { quality: a2.quality ?? 0.82, background: a2.background_color }), f = await save(blob, sizes.length === 1 && a2.output_name ? outName(a2, img.file, "", fmt) : `${baseName(img.file.name)}-thumb${s}.${extOf(fmt)}`); files.push(f); list.push({ size: s, ...outInfo(f), width: cv.width, height: cv.height });
  }
  const res = { ok: true, mode, format: fmt, thumbnails: list }; if (list.length === 1) Object.assign(res, list[0]);
  if (files.length > 1) { const z = await save(makeZip(await Promise.all(files.map(async f => ({ name: f.filename, data: await bytesOf({ blob: outBlobOf(f) }) })))), `${baseName(img.file.name)}-thumbnails.zip`); files.push(z); res.zip_file_id = z.id; }
  return { result: res, files };
}));
tool("resize", "generate_image_preview", "Generate a lightweight web preview (downscaled, compressed) plus an optional tiny blurred placeholder data URL.", { ...FILE, ...MULTI, max_dimension: "px (default 1024)", quality: "1-100 (default 70)", format: "jpeg|webp|png", lqip: "boolean tiny placeholder (default true)", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const md = num(a2.max_dimension, 1024, 16, 8192), src = toCanvas(img), cv = fitCanvas(src, md), alpha = hasAlpha(getPx(fitCanvas(src, 256))), fmt = normFmt(a2.format || a2.output_format || (alpha ? "png" : "jpeg"));
  const blob = await encode(cv, fmt, { quality: a2.quality ?? 0.7, background: a2.background_color }), f = await save(blob, outName(a2, img.file, "-preview", fmt)), res = { ok: true, ...outInfo(f), format: fmt, width: cv.width, height: cv.height, original: { width: img.width, height: img.height, bytes: img.file.size }, size_change_percent: pct(f.size, img.file.size) };
  if (bool(a2.lqip, true)) { const k = 24 / Math.max(cv.width, cv.height), t = resizeCv(cv, Math.max(1, Math.round(cv.width * k)), Math.max(1, Math.round(cv.height * k))), d = getPx(t); PX.blur(d, 1); res.lqip_data_url = await blobToDataUrl(await encode(cvFromPx(d), "jpeg", { quality: 0.5 })); }
  return { result: res, files: [f] };
}));

/* ═════════════ PART 5 — GROUP 5: Image editing (41–60) ═════════════ */
function pxTool(name, desc, params, suffix, op) {
  tool("edit", name, desc, { ...FILE, ...MULTI, ...params, ...OUT }, a => forEachImage(a, async (img, a2) => {
    const d = getPx(toCanvas(img)), extra = (await op(d, a2, img)) || {}; return emit(a2, img, suffix, cvFromPx(d), extra);
  }));
}
const cleanFont = s => String(s || "sans-serif").replace(/[;{}<>\\]/g, "").slice(0, 80);
const POS = ["top-left", "top-center", "top-right", "center-left", "center", "center-right", "bottom-left", "bottom-center", "bottom-right"];
function posXY(pos, W, H, w, h, m) {
  pos = String(pos || "bottom-right").toLowerCase().replace(/^(top|bottom|center)$/, (s) => s === "center" ? "center" : s + "-center"); if (!POS.includes(pos)) bad(`position must be one of ${POS.join(", ")}${pos ? "" : ""}.`);
  const [v, hz] = pos === "center" ? ["center", "center"] : pos.split("-"); return { x: hz === "left" ? m : hz === "right" ? W - w - m : (W - w) / 2, y: v === "top" ? m : v === "bottom" ? H - h - m : (H - h) / 2 };
}
const needBox = (x, y, w, h, W, H) => { if (!(w > 0 && h > 0)) bad("width and height must be positive."); if (x < 0 || y < 0 || x + w > W || y + h > H) bad(`The crop box (${x},${y},${w}x${h}) falls outside the image (${W}x${H}).`); };

tool("edit", "crop_image", "Crop by pixel/percent rectangle, to an aspect ratio (with gravity), or auto-trim uniform/transparent borders.", { ...FILE, ...MULTI, mode: "rect|aspect|trim (default rect)", x: "px", y: "px", width: "px", height: "px", unit: "px|percent", aspect: "e.g. 16:9", gravity: "center|top|bottom|left|right", tolerance: "trim colour tolerance 0-255", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const W = img.width, H = img.height, mode = String(a2.mode || (a2.aspect ? "aspect" : "rect")), src = toCanvas(img); let x, y, w, h;
  if (mode === "rect") { const k = a2.unit === "percent"; const f = (v, t) => k ? v / 100 * t : v; x = Math.round(f(num(a2.x, 0, 0), W)); y = Math.round(f(num(a2.y, 0, 0), H)); if (a2.width === undefined && a2.height === undefined) bad("width and height are required for rect mode."); w = Math.round(f(num(a2.width, W - x, 1), W)); h = Math.round(f(num(a2.height, H - y, 1), H)); needBox(x, y, w, h, W, H); }
  else if (mode === "aspect") { const m = String(a2.aspect || "").match(/^(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)$/); if (!m) bad("aspect must look like 16:9."); const r = +m[1] / +m[2]; if (W / H > r) { h = H; w = Math.round(H * r); } else { w = W; h = Math.round(W / r); } const g = String(a2.gravity || "center"); x = /left/.test(g) ? 0 : /right/.test(g) ? W - w : Math.round((W - w) / 2); y = /top/.test(g) ? 0 : /bottom/.test(g) ? H - h : Math.round((H - h) / 2); }
  else if (mode === "trim") {
    const d = getPx(src), p = d.data, tol = num(a2.tolerance, 12, 0, 255), tr = p[3] < 10, ref = [p[0], p[1], p[2]];
    const same = (i) => tr ? p[i + 3] < 10 : p[i + 3] > 10 && Math.abs(p[i] - ref[0]) <= tol && Math.abs(p[i + 1] - ref[1]) <= tol && Math.abs(p[i + 2] - ref[2]) <= tol;
    const rowBg = yy => { for (let xx = 0; xx < W; xx++) if (!same((yy * W + xx) * 4)) return false; return true; }, colBg = xx => { for (let yy = 0; yy < H; yy++) if (!same((yy * W + xx) * 4)) return false; return true; };
    let t = 0, b = H - 1, l = 0, r = W - 1; while (t < H && rowBg(t)) t++; if (t >= H) failed("The whole image is a single colour; nothing to keep after trimming."); while (b > t && rowBg(b)) b--; while (l < W && colBg(l)) l++; while (r > l && colBg(r)) r--; x = l; y = t; w = r - l + 1; h = b - t + 1;
    if (w === W && h === H) return emit(a2, img, "-trimmed", src, { trimmed: false, note: "No uniform border found; image unchanged." });
  } else bad("mode must be rect, aspect or trim.");
  const o = mk(w, h); ctx2(o).drawImage(src, x, y, w, h, 0, 0, w, h);
  return emit(a2, img, "-cropped", o, { crop_box: { x, y, w, h }, original: { width: W, height: H }, mode });
}));
tool("edit", "rotate_image", "Rotate by any angle (clockwise degrees); 90° multiples are lossless; arbitrary angles expand the canvas by default.", { ...FILE, ...MULTI, angle: "degrees clockwise", expand: "boolean (default true)", background_color: "#rrggbb|transparent for exposed corners", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const ang = num(a2.angle, NaN); if (Number.isNaN(ang)) bad("angle (degrees) is required."); const src = toCanvas(img), W = img.width, H = img.height, n = ((ang % 360) + 360) % 360, th = n * Math.PI / 180;
  let o; if (n === 0) o = src; else if (n === 90 || n === 270) { o = mk(H, W); const x = ctx2(o); x.translate(H / 2, W / 2); x.rotate(th); x.drawImage(src, -W / 2, -H / 2); }
  else if (n === 180) { o = mk(W, H); const x = ctx2(o); x.translate(W / 2, H / 2); x.rotate(Math.PI); x.drawImage(src, -W / 2, -H / 2); }
  else { const ex = bool(a2.expand, true), nw = ex ? Math.ceil(Math.abs(W * Math.cos(th)) + Math.abs(H * Math.sin(th))) : W, nh = ex ? Math.ceil(Math.abs(W * Math.sin(th)) + Math.abs(H * Math.cos(th))) : H; o = mk(nw, nh); const x = ctx2(o); if (a2.background_color && a2.background_color !== "transparent") { x.fillStyle = cssColor(a2.background_color); x.fillRect(0, 0, nw, nh); } x.imageSmoothingQuality = "high"; x.translate(nw / 2, nh / 2); x.rotate(th); x.drawImage(src, -W / 2, -H / 2); }
  return emit(a2, img, `-rot${Math.round(n)}`, o, { angle: n, lossless_rotation: n % 90 === 0, expanded_canvas: n % 90 !== 0 && bool(a2.expand, true), original: { width: W, height: H } });
}));
tool("edit", "flip_image", "Mirror an image horizontally, vertically or both.", { ...FILE, ...MULTI, direction: "horizontal|vertical|both", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const dir = String(a2.direction || a2.axis || "horizontal").toLowerCase(); if (!["horizontal", "vertical", "both"].includes(dir)) bad("direction must be horizontal, vertical or both.");
  const o = mk(img.width, img.height), x = ctx2(o); x.translate(dir === "vertical" ? 0 : img.width, dir === "horizontal" ? 0 : img.height); x.scale(dir === "vertical" ? 1 : -1, dir === "horizontal" ? 1 : -1); x.drawImage(img.src, 0, 0, img.width, img.height);
  return emit(a2, img, `-flip-${dir}`, o, { direction: dir });
}));
pxTool("adjust_image_brightness", "Adjust brightness (-100 darker … +100 brighter).", { amount: "-100 to 100" }, "-brightness", (d, a) => { const v = num(a.amount ?? a.value, NaN, -100, 100); if (Number.isNaN(v)) bad("amount (-100..100) is required."); PX.brightness(d, v); return { amount: v }; });
pxTool("adjust_image_contrast", "Adjust contrast (-100 … +100).", { amount: "-100 to 100" }, "-contrast", (d, a) => { const v = num(a.amount ?? a.value, NaN, -100, 100); if (Number.isNaN(v)) bad("amount (-100..100) is required."); PX.contrast(d, v); return { amount: v }; });
pxTool("adjust_image_saturation", "Adjust colour saturation (-100 greyscale … +100 vivid).", { amount: "-100 to 100" }, "-saturation", (d, a) => { const v = num(a.amount ?? a.value, NaN, -100, 100); if (Number.isNaN(v)) bad("amount (-100..100) is required."); PX.saturation(d, v); return { amount: v }; });
pxTool("adjust_image_exposure", "Adjust exposure in stops (EV -4 … +4), applied in linear light; optional gamma.", { stops: "EV -4 to 4", gamma: "0.2-5 optional" }, "-exposure", (d, a) => { const v = num(a.stops ?? a.amount ?? a.value, NaN, -4, 4); if (Number.isNaN(v) && a.gamma === undefined) bad("stops (-4..4) or gamma is required."); if (!Number.isNaN(v)) PX.exposure(d, v); if (a.gamma !== undefined) PX.gamma(d, num(a.gamma, 1, 0.2, 5)); return { stops: Number.isNaN(v) ? 0 : v, gamma: a.gamma !== undefined ? num(a.gamma, 1) : undefined }; });
pxTool("adjust_image_sharpness", "Adjust sharpness: positive sharpens (unsharp mask), negative softens.", { amount: "-100 to 100", radius: "px sigma (default 1.2)" }, "-sharpness", (d, a) => { const v = num(a.amount ?? a.value, NaN, -100, 100); if (Number.isNaN(v)) bad("amount (-100..100) is required."); if (v >= 0) PX.unsharp(d, v / 40, num(a.radius, 1.2, 0.3, 10)); else PX.blur(d, -v / 100 * 3); return { amount: v }; });
pxTool("apply_image_grayscale", "Convert to greyscale (luma-weighted), optionally partially.", { amount: "0-1 (default 1)" }, "-grayscale", (d, a) => { const v = num(a.amount, 1, 0, 1); PX.grayscale(d, v); return { amount: v }; });
pxTool("apply_image_sepia", "Apply a sepia tone.", { amount: "0-1 (default 1)" }, "-sepia", (d, a) => { const v = num(a.amount, 1, 0, 1); PX.sepia(d, v); return { amount: v }; });
function motionBlur(d, len, angleDeg) {
  const { width: w, height: h } = d, src = new Uint8ClampedArray(d.data), p = d.data, a = angleDeg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), n = Math.max(2, Math.round(len));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let r = 0, g = 0, b = 0, al = 0, c = 0; for (let i = 0; i < n; i++) { const t = i - (n - 1) / 2, xx = Math.round(x + dx * t), yy = Math.round(y + dy * t); if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const q = (yy * w + xx) * 4; r += src[q]; g += src[q + 1]; b += src[q + 2]; al += src[q + 3]; c++; } const o = (y * w + x) * 4; p[o] = r / c; p[o + 1] = g / c; p[o + 2] = b / c; p[o + 3] = al / c; }
}
pxTool("apply_image_blur", "Blur: gaussian (default) or motion, optionally only inside a region.", { radius: "gaussian sigma px (default 4)", type: "gaussian|motion", angle: "motion angle degrees", x: "region x", y: "region y", width: "region width", height: "region height" }, "-blur", (d, a) => {
  const r = num(a.radius ?? a.sigma ?? a.amount, 4, 0.3, 200), type = a.type === "motion" ? "motion" : "gaussian"; let target = d, rect = null;
  if (a.width !== undefined && a.height !== undefined) { const x = Math.round(num(a.x, 0, 0)), y = Math.round(num(a.y, 0, 0)), w = Math.round(num(a.width, 1, 1)), h = Math.round(num(a.height, 1, 1)); needBox(x, y, w, h, d.width, d.height); rect = { x, y, w, h }; target = { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; for (let j = 0; j < h; j++) target.data.set(d.data.subarray(((y + j) * d.width + x) * 4, ((y + j) * d.width + x + w) * 4), j * w * 4); }
  if (type === "motion") motionBlur(target, r * 2, num(a.angle, 0)); else PX.blur(target, r);
  if (rect) for (let j = 0; j < rect.h; j++) d.data.set(target.data.subarray(j * rect.w * 4, (j + 1) * rect.w * 4), ((rect.y + j) * d.width + rect.x) * 4);
  return { type, radius: r, region: rect };
});
pxTool("apply_image_sharpen", "Sharpen with an unsharp mask.", { amount: "0-5 strength (default 1)", radius: "px sigma (default 1.2)", threshold: "0-255 (default 0)" }, "-sharpen", (d, a) => { const am = num(a.amount, 1, 0, 5), r = num(a.radius, 1.2, 0.3, 10), t = num(a.threshold, 0, 0, 255); PX.unsharp(d, am, r, t); return { amount: am, radius: r, threshold: t }; });
const KERNELS = { emboss: [[-2, -1, 0, -1, 1, 1, 0, 1, 2], 1, 128], edge_enhance: [[0, -1, 0, -1, 5, -1, 0, -1, 0], 1, 0], outline: [[-1, -1, -1, -1, 8, -1, -1, -1, -1], 1, 0], box_blur: [[1, 1, 1, 1, 1, 1, 1, 1, 1], 9, 0], sobel_h: [[-1, 0, 1, -2, 0, 2, -1, 0, 1], 1, 128] };
const PRESETS = { vintage: [["sepia", .6], ["contrast", -10], ["vignette", .4]], noir: [["grayscale", 1], ["contrast", 35], ["vignette", .3]], warm: [["hue", -8], ["saturation", 15], ["brightness", 4]], cool: [["hue", 12], ["saturation", 8]], vivid: [["saturation", 35], ["contrast", 15]], fade: [["contrast", -25], ["brightness", 10], ["saturation", -15]] };
const FILTER_NAMES = ["grayscale", "sepia", "invert", "threshold", "posterize", "hue", "vignette", "pixelate", "blur", "sharpen", "brightness", "contrast", "saturation", "exposure", "gamma", "median", "auto_levels", "gray_world", ...Object.keys(KERNELS), ...Object.keys(PRESETS)];
function applyFilter(d, name, v) {
  name = String(name).toLowerCase().replace(/[\s-]/g, "_"); const n = v === undefined || v === null || v === "" ? undefined : Number(v);
  if (n !== undefined && !Number.isFinite(n)) bad(`Filter "${name}" has a non-numeric value "${v}".`);
  switch (name) {
    case "grayscale": case "greyscale": PX.grayscale(d, n ?? 1); break; case "sepia": PX.sepia(d, n ?? 1); break; case "invert": PX.invert(d); break;
    case "threshold": PX.threshold(d, n ?? 128); break; case "posterize": PX.posterize(d, n ?? 4); break; case "hue": PX.hue(d, n ?? 30); break; case "vignette": PX.vignette(d, n ?? .5); break;
    case "pixelate": PX.pixelate(d, n ?? 8); break; case "blur": PX.blur(d, n ?? 2); break; case "sharpen": PX.unsharp(d, n ?? 1); break; case "brightness": PX.brightness(d, n ?? 10); break; case "contrast": PX.contrast(d, n ?? 10); break;
    case "saturation": PX.saturation(d, n ?? 20); break; case "exposure": PX.exposure(d, n ?? .5); break; case "gamma": PX.gamma(d, n ?? 1.2); break; case "median": PX.median(d, n ?? 1); break;
    case "auto_levels": PX.autoLevels(d); break; case "gray_world": PX.grayWorld(d); break;
    default:
      if (KERNELS[name]) { const [k, div, bias] = KERNELS[name]; PX.convolve(d, k, div, bias); break; }
      if (PRESETS[name]) { for (const [f, val] of PRESETS[name]) applyFilter(d, f, val); break; }
      bad(`Unknown filter "${name}". Available: ${FILTER_NAMES.join(", ")}.`);
  }
}
tool("edit", "apply_image_filters", "Apply an ordered chain of filters/presets (grayscale, sepia, invert, threshold, posterize, hue, vignette, pixelate, blur, sharpen, brightness, contrast, saturation, exposure, gamma, median, emboss, outline, edge_enhance, vintage, noir, warm, cool, vivid, fade …).", { ...FILE, ...MULTI, filters: "array of names or {name,value} e.g. [\"sepia\",{\"name\":\"blur\",\"value\":2}]", ...OUT }, a => forEachImage(a, async (img, a2) => {
  let list = a2.filters; if (typeof list === "string") { try { list = JSON.parse(list); } catch (_) { list = list.split(/[,\s]+/).filter(Boolean); } }
  if (!Array.isArray(list) || !list.length) bad(`filters is required (array). Available: ${FILTER_NAMES.join(", ")}.`); if (list.length > 30) bad("At most 30 filters per call.");
  const items = list.map(f => typeof f === "string" ? { name: f.split(":")[0], value: f.includes(":") ? f.split(":")[1] : undefined } : { name: f.name || f.filter, value: f.value ?? f.amount ?? f.radius ?? f.level }); items.forEach(i => { if (!i.name) bad("Every filter needs a name."); });
  const d = getPx(toCanvas(img)); for (const i of items) applyFilter(d, i.name, i.value);
  return emit(a2, img, "-filtered", cvFromPx(d), { applied: items.map(i => i.value === undefined ? i.name : `${i.name}(${i.value})`) });
}));
function wrapLines(x, text, maxW) { const out = []; for (const para of String(text).split(/\r?\n/)) { let line = ""; for (const word of para.split(/(\s+)/)) { const t = line + word; if (line && x.measureText(t).width > maxW && word.trim()) { out.push(line.trimEnd()); line = word.trimStart(); } else line = t; } out.push(line.trimEnd()); } return out; }
function drawTextBlock(x, text, o) {
  x.font = `${o.italic ? "italic " : ""}${o.bold ? "bold " : ""}${o.size}px ${o.font}`; x.textBaseline = "top";
  const lines = o.maxWidth ? wrapLines(x, text, o.maxWidth) : String(text).split(/\r?\n/), lh = o.size * o.lineHeight, widths = lines.map(l => x.measureText(l).width), bw = Math.max(...widths, 1), bh = lh * lines.length;
  return { lines, lh, widths, bw, bh };
}
tool("edit", "add_image_text", "Draw text (multi-line, wrapped, styled, with optional background box/outline/shadow/rotation) onto an image.", { ...FILE, ...MULTI, text: "string (\\n for new lines)", x: "px", y: "px", position: "top-left|…|center|bottom-right", font_size: "px (default 5% of width)", font_family: "string", bold: "boolean", italic: "boolean", color: "#rrggbb", opacity: "0-1", stroke_color: "string", stroke_width: "px", background_color: "box colour", padding: "px", align: "left|center|right", max_width_percent: "wrap at % of image width", line_height: "multiplier", rotation: "degrees", shadow: "boolean", margin: "px", ...OUT }, a => forEachImage(a, async (img, a2) => {
  if (a2.text === undefined || String(a2.text) === "") bad("text is required."); const cv = toCanvas(img), x = ctx2(cv), size = num(a2.font_size, Math.max(12, Math.round(img.width * 0.05)), 4, 2000), pad = num(a2.padding, a2.background_color ? Math.round(size * 0.3) : 0, 0, 1000);
  const o = { size, font: cleanFont(a2.font_family), bold: bool(a2.bold), italic: bool(a2.italic), lineHeight: num(a2.line_height, 1.25, 0.8, 4), maxWidth: a2.max_width_percent ? img.width * num(a2.max_width_percent, 90, 5, 100) / 100 - 2 * pad : 0 };
  const m = drawTextBlock(x, String(a2.text).slice(0, 5000), o), bw = m.bw + 2 * pad, bh = m.bh + 2 * pad, margin = num(a2.margin, Math.round(size * 0.6), 0, 5000);
  const at = a2.x !== undefined || a2.y !== undefined ? { x: num(a2.x, 0), y: num(a2.y, 0) } : posXY(a2.position || "bottom-center", img.width, img.height, bw, bh, margin), align = ["left", "center", "right"].includes(a2.align) ? a2.align : "left";
  x.save(); x.globalAlpha = num(a2.opacity, 1, 0, 1); x.translate(at.x + bw / 2, at.y + bh / 2); x.rotate(num(a2.rotation, 0) * Math.PI / 180); x.translate(-bw / 2, -bh / 2);
  if (a2.background_color) { x.fillStyle = cssColor(a2.background_color); x.fillRect(0, 0, bw, bh); }
  x.font = `${o.italic ? "italic " : ""}${o.bold ? "bold " : ""}${o.size}px ${o.font}`; x.textBaseline = "top"; x.fillStyle = cssColor(a2.color, [255, 255, 255, 255]);
  if (bool(a2.shadow)) { x.shadowColor = "rgba(0,0,0,.6)"; x.shadowBlur = size * 0.15; x.shadowOffsetY = size * 0.04; }
  m.lines.forEach((l, i) => { const lx = pad + (align === "left" ? 0 : align === "center" ? (m.bw - m.widths[i]) / 2 : m.bw - m.widths[i]), ly = pad + i * m.lh; if (a2.stroke_width) { x.lineWidth = num(a2.stroke_width, 2, 0, 100); x.lineJoin = "round"; x.strokeStyle = cssColor(a2.stroke_color, [0, 0, 0, 255]); x.strokeText(l, lx, ly); } x.fillText(l, lx, ly); });
  x.restore(); return emit(a2, img, "-text", cv, { text_box: { x: Math.round(at.x), y: Math.round(at.y), w: Math.round(bw), h: Math.round(bh) }, lines: m.lines.length, font_size: size });
}));
tool("edit", "add_image_watermark", "Add a text or image watermark (single position or tiled) with opacity, scale and rotation.", { ...FILE, ...MULTI, text: "watermark text", watermark_file_id: "uploaded image id for an image watermark", position: "top-left|…|center|bottom-right|tile", opacity: "0-1 (default 0.5)", scale_percent: "image watermark width as % of base (default 20)", font_size: "px for text", color: "#rrggbb", rotation: "degrees", margin: "px", tile_gap: "px between tiles", ...OUT }, a => forEachImage(a, async (img, a2) => {
  if (!a2.text && !a2.watermark_file_id) bad("Provide text or watermark_file_id."); const cv = toCanvas(img), x = ctx2(cv), W = img.width, H = img.height, op = num(a2.opacity, 0.5, 0, 1), rot = num(a2.rotation, 0) * Math.PI / 180, margin = num(a2.margin, Math.round(Math.min(W, H) * 0.03), 0, 5000);
  let wm; if (a2.watermark_file_id) { const w = await openImage({ file_id: a2.watermark_file_id }), sc = num(a2.scale_percent, 20, 1, 100) / 100, ww = Math.max(1, Math.round(W * sc)), wh = Math.max(1, Math.round(w.height * ww / w.width)); wm = resizeCv(toCanvas(w), ww, wh); }
  else { const size = num(a2.font_size, Math.max(14, Math.round(W * 0.05)), 4, 1000), t = mk(8, 8), tx = ctx2(t); const o = { size, font: cleanFont(a2.font_family), bold: true, italic: false, lineHeight: 1.2, maxWidth: 0 }, mm = drawTextBlock(tx, a2.text, o), pw = Math.ceil(mm.bw + size * 0.4), ph = Math.ceil(mm.bh + size * 0.4); wm = mk(pw, ph); const wx = ctx2(wm); wx.font = `bold ${size}px ${o.font}`; wx.textBaseline = "top"; wx.shadowColor = "rgba(0,0,0,.55)"; wx.shadowBlur = size * 0.12; wx.fillStyle = cssColor(a2.color, [255, 255, 255, 255]); mm.lines.forEach((l, i) => wx.fillText(l, size * 0.2, size * 0.2 + i * mm.lh)); }
  x.save(); x.globalAlpha = op; let placed = 0;
  if (String(a2.position) === "tile") { const gap = num(a2.tile_gap, Math.round(wm.width * 0.6), 0, 5000), sx = wm.width + gap, sy = wm.height + gap; if ((W / sx + 2) * (H / sy + 2) > 3000) bad("Tiles would be too dense; increase tile_gap or font_size."); x.translate(W / 2, H / 2); x.rotate(rot || -Math.PI / 6); for (let yy = -H; yy < H; yy += sy) for (let xx = -W; xx < W; xx += sx) { x.drawImage(wm, xx, yy); placed++; } }
  else { const p = posXY(a2.position || "bottom-right", W, H, wm.width, wm.height, margin); x.translate(p.x + wm.width / 2, p.y + wm.height / 2); x.rotate(rot); x.drawImage(wm, -wm.width / 2, -wm.height / 2); placed = 1; }
  x.restore(); return emit(a2, img, "-watermarked", cv, { type: a2.watermark_file_id ? "image" : "text", opacity: op, position: a2.position || "bottom-right", placements: placed });
}));

/* background removal: ML (@imgly/background-removal) or classical border flood-fill */
async function mlCutout(cv) {
  const png = await toBlob(cv, "image/png");
  if (HOST.removeBackground) { const out = await HOST.removeBackground(png); const dec = await decodeBlob(out instanceof Blob ? out : new Blob([out], { type: "image/png" }), "png"); return toCanvas({ src: dec.src, width: dec.width, height: dec.height }); }
  if (typeof document === "undefined") unavailable("The ML background-removal engine needs a browser (it was not provided via configureImageTools({ removeBackground })).");
  let mod; try { mod = await import(/* @vite-ignore */ CDN.bgremoval); } catch (e) { unavailable(`Could not load @imgly/background-removal from the CDN (${e.message || e}). It needs internet access and a modern browser.`); }
  const fn = mod.removeBackground || mod.default; if (typeof fn !== "function") unavailable("@imgly/background-removal loaded but exposed no removeBackground function.");
  const out = await fn(png, { output: { format: "image/png" } }), dec = await decodeBlob(out, "png"); return toCanvas({ src: dec.src, width: dec.width, height: dec.height });
}
function borderStats(d) {
  const { width: w, height: h, data: p } = d, pts = []; const take = (x, y) => { const i = (y * w + x) * 4; pts.push([p[i], p[i + 1], p[i + 2], p[i + 3]]); };
  const step = Math.max(1, Math.floor((w + h) / 400)); for (let x = 0; x < w; x += step) { take(x, 0); take(x, h - 1); } for (let y = 0; y < h; y += step) { take(0, y); take(w - 1, y); }
  const med = c => { const v = pts.map(q => q[c]).sort((a, b) => a - b); return v[v.length >> 1]; }, m = [med(0), med(1), med(2)];
  const dev = pts.reduce((s, q) => s + Math.hypot(q[0] - m[0], q[1] - m[1], q[2] - m[2]), 0) / pts.length; return { color: m, mean_deviation: dev, uniform: dev < 22 };
}
function colorCutout(cv, a) {
  const d = getPx(cv), { width: w, height: h, data: p } = d, st = borderStats(d), bg = a.background_hint ? parseColor(a.background_hint).slice(0, 3) : st.color, tol = num(a.tolerance, 32, 1, 255) * 1.732, contig = bool(a.contiguous, true), feather = num(a.feather, 1, 0, 20);
  const near = i => Math.hypot(p[i] - bg[0], p[i + 1] - bg[1], p[i + 2] - bg[2]) <= tol || p[i + 3] === 0, isBg = new Uint8Array(w * h);
  if (contig) { const stack = new Int32Array(w * h); let sp = 0; const push = (x, y) => { const k = y * w + x; if (!isBg[k] && near(k * 4)) { isBg[k] = 1; stack[sp++] = k; } }; for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); } for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); } while (sp) { const k = stack[--sp], x = k % w, y = (k / w) | 0; if (x > 0) push(x - 1, y); if (x < w - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < h - 1) push(x, y + 1); } }
  else for (let k = 0; k < w * h; k++) if (near(k * 4)) isBg[k] = 1;
  const m = { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; let fg = 0; for (let k = 0; k < w * h; k++) { const v = isBg[k] ? 0 : 255; if (v) fg++; m.data[k * 4] = v; m.data[k * 4 + 3] = 255; }
  if (feather > 0) PX.blur(m, feather); const out = new Uint8ClampedArray(p); for (let k = 0; k < w * h; k++) out[k * 4 + 3] = Math.round(p[k * 4 + 3] * m.data[k * 4] / 255);
  return { canvas: cvFromPx({ data: out, width: w, height: h }), foreground_percent: +(fg / (w * h) * 100).toFixed(1), background_color: toHex(...bg), border_uniform: st.uniform, border_deviation: +st.mean_deviation.toFixed(1) };
}
async function cutout(cv, a) {
  const method = String(a.method || "auto").toLowerCase(); if (!["auto", "ml", "color"].includes(method)) bad("method must be auto, ml or color.");
  let mlErr = null;
  if (method !== "color") { try { return { canvas: await mlCutout(cv), engine: "ml: @imgly/background-removal (ISNet, runs in-browser)" }; } catch (e) { if (method === "ml" || !(e instanceof ToolError) || e.code !== "UNAVAILABLE") throw e; mlErr = e.message; } }
  const r = colorCutout(cv, a);
  if (method === "auto" && !r.border_uniform) unavailable(`${mlErr} The classical fallback only works on a plain, uniform background, and this image's border varies too much (deviation ${r.border_deviation}). Use method:"color" with a tolerance/background_hint to try anyway, or provide the ML engine.`);
  return { ...r, engine: "classical: border flood-fill on a uniform background (not ML)", note: (mlErr ? mlErr + " " : "") + "Used the classical colour-based method; it removes a plain background but cannot separate a subject from a busy scene." };
}
tool("edit", "remove_image_background", "Remove the background → transparent PNG/WebP. Uses an in-browser ML model when available, else a classical flood-fill that only works on plain backgrounds (engine reported honestly).", { ...FILE, ...MULTI, method: "auto|ml|color", tolerance: "color method 1-255 (default 32)", feather: "edge softening px (default 1)", contiguous: "boolean (default true)", background_hint: "colour to remove (color method)", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const r = await cutout(toCanvas(img), a2), { canvas, engine, ...rest } = r; return emit(a2, img, "-nobg", canvas, { engine, ...rest }, { format: normFmt(a2.output_format || a2.format || "png") });
}, 10));
tool("edit", "change_image_background", "Replace the background with a colour, gradient, blurred original or another image (cut-out via existing transparency, ML, or plain-background detection).", { ...FILE, ...MULTI, background_color: "#rrggbb", gradient: "{from,to,angle}", background_file_id: "uploaded image id", blur_background: "sigma px (blurs the original background)", method: "auto|ml|color", tolerance: "number", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const src = toCanvas(img), W = img.width, H = img.height, d0 = getPx(fitCanvas(src, 256)); let fg = src, engine = "existing transparency", extra = {}, tcount = 0; for (let i = 3; i < d0.data.length; i += 4) if (d0.data[i] < 250) tcount++;
  if (tcount / (d0.data.length / 4) < 0.02) { const r = await cutout(src, a2); fg = r.canvas; engine = r.engine; extra = { foreground_percent: r.foreground_percent }; }
  const o = mk(W, H), x = ctx2(o); let kind;
  if (a2.background_file_id) { const b = await openImage({ file_id: a2.background_file_id }), s = Math.max(W / b.width, H / b.height); x.drawImage(toCanvas(b), (W - b.width * s) / 2, (H - b.height * s) / 2, b.width * s, b.height * s); kind = "image"; }
  else if (a2.gradient) { let g = a2.gradient; if (typeof g === "string") { try { g = JSON.parse(g); } catch (_) { bad("gradient must be {from,to,angle}."); } } const ang = num(g.angle, 90) * Math.PI / 180, cx = W / 2, cy = H / 2, r = Math.hypot(W, H) / 2, gr = x.createLinearGradient(cx - Math.cos(ang) * r, cy - Math.sin(ang) * r, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); gr.addColorStop(0, cssColor(g.from, [255, 255, 255, 255])); gr.addColorStop(1, cssColor(g.to, [0, 0, 0, 255])); x.fillStyle = gr; x.fillRect(0, 0, W, H); kind = "gradient"; }
  else if (a2.blur_background !== undefined) { const bd = getPx(src); PX.blur(bd, num(a2.blur_background, 12, 1, 100)); x.drawImage(cvFromPx(bd), 0, 0); kind = "blurred-original"; }
  else { x.fillStyle = cssColor(a2.background_color, [255, 255, 255, 255]); x.fillRect(0, 0, W, H); kind = "color"; }
  x.drawImage(fg, 0, 0); return emit(a2, img, "-newbg", o, { background: kind, engine, ...extra });
}, 10));
function rrPath(x, r, w, h) { x.beginPath(); x.moveTo(r[0], 0); x.lineTo(w - r[1], 0); x.arcTo(w, 0, w, r[1], r[1]); x.lineTo(w, h - r[2]); x.arcTo(w, h, w - r[2], h, r[2]); x.lineTo(r[3], h); x.arcTo(0, h, 0, h - r[3], r[3]); x.lineTo(0, r[0]); x.arcTo(0, 0, r[0], 0, r[0]); x.closePath(); }
tool("edit", "round_image_corners", "Round the corners (px or %), or crop to a circle/ellipse. Output keeps transparency (PNG/WebP).", { ...FILE, ...MULTI, radius: "px", radius_percent: "0-50 % of the shorter side", shape: "rounded|circle|ellipse", corners: "[TL,TR,BR,BL] booleans", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const shape = String(a2.shape || "rounded"), src = toCanvas(img); let W = img.width, H = img.height, base = src, o, extra = {};
  if (shape === "circle") { const s = Math.min(W, H); base = mk(s, s); ctx2(base).drawImage(src, (W - s) / 2, (H - s) / 2, s, s, 0, 0, s, s); W = H = s; }
  o = mk(W, H); const x = ctx2(o);
  if (shape === "circle" || shape === "ellipse") { x.beginPath(); x.ellipse(W / 2, H / 2, W / 2, H / 2, 0, 0, Math.PI * 2); x.closePath(); extra.shape = shape; }
  else if (shape === "rounded") { const lim = Math.min(W, H) / 2, r = a2.radius_percent !== undefined ? num(a2.radius_percent, 10, 0, 50) / 100 * Math.min(W, H) : num(a2.radius, NaN, 0); if (Number.isNaN(r)) bad("radius or radius_percent is required."); const on = Array.isArray(a2.corners) && a2.corners.length === 4 ? a2.corners.map(Boolean) : [true, true, true, true], rr = on.map(v => v ? Math.min(r, lim) : 0); rrPath(x, rr, W, H); extra = { shape, radius_px: Math.round(Math.min(r, lim)) }; }
  else bad("shape must be rounded, circle or ellipse.");
  x.clip(); x.drawImage(base, 0, 0); const fmt = normFmt(a2.output_format || a2.format || "png"); if (fmt === "jpeg" || fmt === "bmp") extra.warning = `${fmt.toUpperCase()} cannot store transparency; the rounded corners were filled with ${a2.background_color || "white"}.`;
  return emit(a2, img, "-rounded", o, extra, { format: fmt });
}));
tool("edit", "add_image_border", "Add a border (all sides or per side), solid or double, outside the image or painted over its edge, with optional rounded outer corners.", { ...FILE, ...MULTI, width: "px (all sides)", top: "px", right: "px", bottom: "px", left: "px", color: "#rrggbb", style: "solid|double", color2: "inner line colour (double)", mode: "expand|overlay", radius: "outer corner radius px", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const bw = num(a2.width, 0, 0, 2000), t = num(a2.top, bw, 0, 2000), r = num(a2.right, bw, 0, 2000), b = num(a2.bottom, bw, 0, 2000), l = num(a2.left, bw, 0, 2000); if (!(t || r || b || l)) bad("A border width greater than 0 is required.");
  const mode = a2.mode === "overlay" ? "overlay" : "expand", W = img.width, H = img.height, nw = mode === "expand" ? W + l + r : W, nh = mode === "expand" ? H + t + b : H, o = mk(nw, nh), x = ctx2(o), col = cssColor(a2.color, [0, 0, 0, 255]), rad = num(a2.radius, 0, 0, 5000);
  if (rad) { rrPath(x, [rad, rad, rad, rad].map(v => Math.min(v, Math.min(nw, nh) / 2)), nw, nh); x.save(); x.clip(); }
  if (mode === "expand") { x.fillStyle = col; x.fillRect(0, 0, nw, nh); x.drawImage(img.src, l, t, W, H); } else { x.drawImage(img.src, 0, 0, W, H); x.fillStyle = col; x.fillRect(0, 0, nw, t); x.fillRect(0, nh - b, nw, b); x.fillRect(0, 0, l, nh); x.fillRect(nw - r, 0, r, nh); }
  if (String(a2.style) === "double") { x.lineWidth = Math.max(1, Math.round(Math.max(t, r, b, l) / 3)); x.strokeStyle = cssColor(a2.color2, [255, 255, 255, 255]); x.strokeRect(l / 2, t / 2, nw - (l + r) / 2, nh - (t + b) / 2); }
  if (rad) x.restore(); const fmt = normFmt(a2.output_format || a2.format || (rad ? "png" : undefined) || ""); return emit(a2, img, "-bordered", o, { border: { top: t, right: r, bottom: b, left: l }, mode, new_size: { width: nw, height: nh } }, fmt ? { format: fmt } : {});
}));
tool("edit", "merge_images", "Combine 2+ images: horizontal, vertical, grid or overlay, with gap, alignment, size normalisation and background.", { file_ids: "string[] (>=2)", layout: "horizontal|vertical|grid|overlay", columns: "grid columns", gap: "px", normalize: "first|smallest|largest|none", fit: "contain|cover (grid cells)", align: "start|center|end", background_color: "#rrggbb|transparent", opacity: "overlay opacity 0-1", max_total_pixels: "number", ...OUT }, async a => {
  const ids = fids(a); if (ids.length < 2) bad("merge_images needs at least two ids in file_ids."); if (ids.length > 36) bad("At most 36 images can be merged at once.");
  const imgs = []; for (const id of ids) imgs.push(await openImage({ file_id: id })); const layout = String(a.layout || "horizontal"), gap = num(a.gap, 0, 0, 2000), norm = String(a.normalize || (layout === "overlay" ? "none" : "first")), align = String(a.align || "center");
  const ref = norm === "smallest" ? imgs.reduce((s, i) => i.width * i.height < s.width * s.height ? i : s) : norm === "largest" ? imgs.reduce((s, i) => i.width * i.height > s.width * s.height ? i : s) : imgs[0];
  const items = imgs.map(i => { let w = i.width, h = i.height; if (norm !== "none") { if (layout === "horizontal") { w = Math.round(i.width * ref.height / i.height); h = ref.height; } else if (layout === "vertical") { h = Math.round(i.height * ref.width / i.width); w = ref.width; } } return { img: i, w, h }; });
  let W, Hh, place = [];
  if (layout === "horizontal") { W = items.reduce((s, i) => s + i.w, 0) + gap * (items.length - 1); Hh = Math.max(...items.map(i => i.h)); let x = 0; items.forEach(i => { place.push({ ...i, x, y: align === "start" ? 0 : align === "end" ? Hh - i.h : (Hh - i.h) / 2 }); x += i.w + gap; }); }
  else if (layout === "vertical") { Hh = items.reduce((s, i) => s + i.h, 0) + gap * (items.length - 1); W = Math.max(...items.map(i => i.w)); let y = 0; items.forEach(i => { place.push({ ...i, y, x: align === "start" ? 0 : align === "end" ? W - i.w : (W - i.w) / 2 }); y += i.h + gap; }); }
  else if (layout === "grid") { const cols = Math.round(num(a.columns, Math.ceil(Math.sqrt(items.length)), 1, 12)), rows = Math.ceil(items.length / cols), cw = ref.width, ch = ref.height; W = cols * cw + gap * (cols - 1); Hh = rows * ch + gap * (rows - 1); items.forEach((it, k) => { const c = k % cols, r = Math.floor(k / cols), cover = a.fit === "cover", s = cover ? Math.max(cw / it.img.width, ch / it.img.height) : Math.min(cw / it.img.width, ch / it.img.height), w = it.img.width * s, h = it.img.height * s; place.push({ img: it.img, w, h, x: c * (cw + gap) + (cw - w) / 2, y: r * (ch + gap) + (ch - h) / 2, clip: cover ? { x: c * (cw + gap), y: r * (ch + gap), w: cw, h: ch } : null }); }); }
  else if (layout === "overlay") { W = Math.max(...items.map(i => i.w)); Hh = Math.max(...items.map(i => i.h)); items.forEach(i => place.push({ ...i, x: (W - i.w) / 2, y: (Hh - i.h) / 2 })); }
  else bad("layout must be horizontal, vertical, grid or overlay.");
  W = Math.round(W); Hh = Math.round(Hh); const maxPx = num(a.max_total_pixels, 6e7, 1e4, MAXPX); if (W * Hh > maxPx) bad(`The merged image would be ${W}x${Hh} (${(W * Hh / 1e6).toFixed(1)} MP), above the ${(maxPx / 1e6).toFixed(0)} MP limit. Use normalize:"smallest" or downscale inputs first.`);
  const o = mk(W, Hh), x = ctx2(o); if (a.background_color && a.background_color !== "transparent") { x.fillStyle = cssColor(a.background_color); x.fillRect(0, 0, W, Hh); } x.imageSmoothingQuality = "high";
  place.forEach((p, k) => { x.save(); if (layout === "overlay") x.globalAlpha = k === 0 ? 1 : num(a.opacity, 1, 0, 1); if (p.clip) { x.beginPath(); x.rect(p.clip.x, p.clip.y, p.clip.w, p.clip.h); x.clip(); } x.drawImage(p.img.src, p.x, p.y, p.w, p.h); x.restore(); });
  const first = imgs[0], { result, files } = await emit({ ...a, file_id: ids[0] }, first, "-merged", o, { layout, images_merged: imgs.length, canvas: { width: W, height: Hh } }, { format: normFmt(a.output_format || a.format || (a.background_color && a.background_color !== "transparent" ? "jpeg" : "png")) });
  return { result, files };
});

/* ═════════════ PART 6 — GROUP 6: Compression & optimisation (61–68) ═════════════ */
async function deflateZlib(u8) {
  if (typeof CompressionStream === "undefined") unavailable("CompressionStream is not available in this environment, so palette-PNG compression cannot run.");
  const cs = new CompressionStream("deflate"), w = cs.writable.getWriter(); w.write(u8); w.close(); return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}
async function inflateZlib(u8) {
  if (typeof DecompressionStream === "undefined") unavailable("DecompressionStream is not available in this environment.");
  const ds = new DecompressionStream("deflate"), w = ds.writable.getWriter(); w.write(u8).catch(() => { }); w.close().catch(() => { }); return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}
function pngChunk(type, data) {
  const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer); dv.setUint32(0, data.length); for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i); out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length))); return out;
}
/** Indexed (palette) PNG: median-cut to <=colors, optional dithering, bit-packed, zlib-compressed. Real lossy PNG compression. */
async function encodeIndexedPng(d, colors = 256, dither = false) {
  const { width: w, height: h } = d, q = quantizeFrame(d, dither, Math.max(2, Math.min(256, colors))), depth = q.bits <= 1 ? 1 : q.bits <= 2 ? 2 : q.bits <= 4 ? 4 : 8, rowBytes = Math.ceil(w * depth / 8), raw = new Uint8Array((rowBytes + 1) * h);
  for (let y = 0; y < h; y++) { const o = y * (rowBytes + 1) + 1; raw[o - 1] = 0; if (depth === 8) raw.set(q.idx.subarray(y * w, (y + 1) * w), o); else for (let x = 0; x < w; x++) raw[o + ((x * depth) >> 3)] |= q.idx[y * w + x] << (8 - depth - ((x * depth) & 7)); }
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer); dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = depth; ihdr[9] = 3;
  const plte = q.table.subarray(0, (1 << q.bits) * 3), parts = [Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk("IHDR", ihdr), pngChunk("PLTE", plte)];
  if (q.trans) parts.push(pngChunk("tRNS", Uint8Array.of(0))); parts.push(pngChunk("IDAT", await deflateZlib(raw)), pngChunk("IEND", new Uint8Array(0)));
  return { blob: new Blob(parts, { type: "image/png" }), colors: (q.table.length / 3) | 0 };
}
async function roundTripPx(blob, w, h) { const u8 = new Uint8Array(await blob.arrayBuffer()), dec = await decodeBlob(blob, sniff(u8)), c = toCanvas(dec); return getPx(c.width === w && c.height === h ? c : resizeCv(c, w, h)); }
async function qualityMetrics(origCv, blob) {
  const s = Math.min(1, 512 / Math.max(origCv.width, origCv.height)), W = Math.max(8, Math.round(origCv.width * s)), Hh = Math.max(8, Math.round(origCv.height * s)), a = getPx(s < 1 ? resizeCv(origCv, W, Hh) : origCv), bc = await roundTripPx(blob, origCv.width, origCv.height), b = getPx(s < 1 ? resizeCv(cvFromPx(bc), W, Hh) : cvFromPx(bc));
  return { ssim: +ssimGray(grayOf(a), grayOf(b), a.width, a.height).toFixed(4), psnr_db: +psnr(a.data, b.data).toFixed(2) };
}
const LOSSY = new Set(["jpeg", "webp", "avif"]);
async function encodeToTarget(cv, fmt, target, o = {}) {
  const minQ = qual(o.min_quality, 0.2), minDim = num(o.min_dimension, 64, 8, 4096), bg = o.background_color; let scale = 1, cur = cv, last = null, steps = 0;
  const attempt = async c => {
    if (LOSSY.has(fmt)) {
      const hi = await encode(c, fmt, { quality: 0.95, background: bg }); if (hi.size <= target) return { blob: hi, quality: 0.95 };
      const lo = await encode(c, fmt, { quality: minQ, background: bg }); if (lo.size > target) return { blob: lo, quality: minQ, over: true };
      let l = minQ, h = 0.95, best = { blob: lo, quality: minQ }; for (let i = 0; i < 8; i++) { const m = (l + h) / 2, b = await encode(c, fmt, { quality: m, background: bg }); if (b.size <= target) { best = { blob: b, quality: m }; l = m; } else h = m; } return best;
    }
    if (fmt === "png") {
      const plain = await encode(c, "png"); if (plain.size <= target) return { blob: plain, colors: "full (lossless)" }; const d = getPx(c); let r;
      for (const k of [256, 128, 64, 32, 16]) { r = await encodeIndexedPng(d, k, true); if (r.blob.size <= target) return { blob: r.blob, colors: k }; } return { blob: r.blob, colors: 16, over: true };
    }
    bad(`Target-size compression supports jpeg, webp, avif and png (got ${fmt}).`);
  };
  for (; steps < 14; steps++) { last = await attempt(cur); if (!last.over) return { ...last, width: cur.width, height: cur.height, scale: +scale.toFixed(3), downscaled: scale < 1, reached: true }; scale *= 0.85; if (Math.min(cv.width, cv.height) * scale < minDim) break; cur = resizeCv(cv, Math.round(cv.width * scale), Math.round(cv.height * scale)); }
  return { ...last, width: cur.width, height: cur.height, scale: +scale.toFixed(3), downscaled: scale < 1, reached: false };
}
const keepFmt = (img, a) => { let f = normFmt(a.output_format || a.format || img.fmt); if (f === "bmp" || f === "gif" || f === "ico" || f === "tiff" || f === "heic" || f === "svg") f = hasAlpha(getPx(fitCanvas(toCanvas(img), 128))) ? "png" : "jpeg"; return f; };
async function compressCore(img, a, fmt, quality, opts = {}) {
  let cv = toCanvas(img); const md = num(a.max_dimension, 0, 0, 32767); if (md) cv = fitCanvas(cv, md); const d = getPx(cv); let blob, detail = {};
  if (fmt === "png") { const colors = Math.round(num(a.png_colors ?? opts.png_colors, 0, 0, 256)); if (colors >= 2) { const r = await encodeIndexedPng(d, colors, bool(a.dither, true)); blob = r.blob; detail = { png_mode: `palette (${colors} colours max, dithered)`, lossy: true }; } else { blob = await encode(cv, "png"); detail = { png_mode: "lossless re-encode", lossy: false }; } }
  else { blob = await encode(cv, fmt, { quality, background: a.background_color }); detail = { quality: Math.round(quality * 100), lossy: true }; }
  return { cv, blob, detail };
}
async function finishCompress(a, img, cv, blob, fmt, suffix, extra = {}) {
  let usedOriginal = false, outBlob = blob; const orig = img.file.size;
  if (fmt === img.fmt && blob.size >= orig && cv.width === img.width && cv.height === img.height && !extra.force_reencode) { outBlob = new Blob([img.u8], { type: MIME[img.fmt] }); usedOriginal = true; }
  const f = await save(outBlob, outName(a, img.file, suffix, fmt));
  const result = { ok: true, ...outInfo(f), format: fmt, width: cv.width, height: cv.height, original_bytes: orig, output_bytes: f.size, saved_bytes: orig - f.size, saved_percent: +((1 - f.size / orig) * 100).toFixed(1), ...(usedOriginal ? { used_original: true, note: "Re-encoding would have made the file larger, so the original bytes were kept." } : {}), ...extra };
  delete result.force_reencode; return { result, files: [f] };
}
tool("compress", "compress_image", "Compress an image: lossy quality for JPEG/WebP/AVIF, or palette quantisation (png_colors) / lossless re-encode for PNG. Strips metadata. Never returns a larger file than the original of the same format.", { ...FILE, ...MULTI, quality: "1-100 (default 75)", format: "jpeg|webp|png|avif (default: keep)", png_colors: "2-256 palette size for lossy PNG (0 = lossless)", max_dimension: "px", dither: "boolean", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const fmt = keepFmt(img, a2), q = qual(a2.quality, 0.75), { cv, blob, detail } = await compressCore(img, a2, fmt, q); return finishCompress(a2, img, cv, blob, fmt, "-compressed", detail);
}));
tool("compress", "optimize_image", "Try several encoders/formats and keep the smallest result that still meets a visual-quality floor (SSIM). Reports every candidate.", { ...FILE, ...MULTI, formats: "string[] candidates e.g. [\"jpeg\",\"webp\",\"png\"] (default: auto)", quality: "1-100 for lossy candidates (default 80)", min_ssim: "0-1 quality floor (default 0.95)", max_dimension: "px", ...OUT }, a => forEachImage(a, async (img, a2) => {
  let cv = toCanvas(img); const md = num(a2.max_dimension, 0, 0, 32767); if (md) cv = fitCanvas(cv, md); const d = getPx(cv), alpha = hasAlpha(d), q = qual(a2.quality, 0.8), floor = num(a2.min_ssim, 0.95, 0, 1);
  let cands = a2.formats ? (Array.isArray(a2.formats) ? a2.formats : String(a2.formats).split(/[,\s]+/)).map(normFmt) : (alpha ? ["webp", "png", "png-palette"] : ["jpeg", "webp", "avif", "png", "png-palette"]);
  const table = []; let best = null;
  for (const c of [...new Set(cands)]) {
    try {
      let blob, label = c; if (c === "png-palette") { blob = (await encodeIndexedPng(d, 256, true)).blob; label = "png (256-colour palette)"; } else { if (c === "jpeg" && alpha) { table.push({ candidate: c, skipped: "image has transparency" }); continue; } if (!(await canEncode(c))) { table.push({ candidate: c, skipped: "this browser cannot encode it" }); continue; } blob = await encode(cv, c, { quality: q, background: a2.background_color }); }
      const m = (LOSSY.has(c) || c === "png-palette") ? await qualityMetrics(cv, blob) : { ssim: 1, psnr_db: 99 }, ok = m.ssim >= floor, row = { candidate: label, bytes: blob.size, ...m, meets_quality_floor: ok }; table.push(row);
      if (ok && (!best || blob.size < best.blob.size)) best = { blob, fmt: c === "png-palette" ? "png" : c, label };
    } catch (e) { table.push({ candidate: c, skipped: e.message }); }
  }
  if (!best) failed(`No candidate reached SSIM ${floor}. Lower min_ssim or raise quality. Tried: ${JSON.stringify(table)}`);
  const r = await finishCompress(a2, img, cv, best.blob, best.fmt, "-optimized", { chosen: best.label, candidates: table, min_ssim: floor }); return r;
}));
tool("compress", "reduce_image_file_size", "Reduce file size by a percentage (e.g. 50) or to a ratio: lowers quality first, then dimensions, until reached.", { ...FILE, ...MULTI, reduce_by_percent: "1-95", format: "jpeg|webp|png|avif (default keep)", min_quality: "1-100 (default 20)", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const p = num(a2.reduce_by_percent ?? a2.percent, NaN, 1, 95); if (Number.isNaN(p)) bad("reduce_by_percent (1-95) is required."); const fmt = keepFmt(img, a2), target = Math.floor(img.file.size * (1 - p / 100)), cv = toCanvas(img);
  const r = await encodeToTarget(cv, fmt, target, a2), f = await save(r.blob, outName(a2, img.file, "-smaller", fmt));
  const res = { ok: true, ...outInfo(f), format: fmt, width: r.width, height: r.height, original_bytes: img.file.size, target_bytes: target, output_bytes: f.size, achieved_reduction_percent: +((1 - f.size / img.file.size) * 100).toFixed(1), quality: r.quality !== undefined ? Math.round(r.quality * 100) : undefined, png_colors: r.colors, downscaled: r.downscaled, scale: r.scale, reached_target: r.reached };
  if (!r.reached) res.warning = "The target could not be reached without going below min_quality/min_dimension; this is the smallest result produced."; return { result: res, files: [f] };
}));
tool("compress", "compress_image_to_target_size", "Compress to fit under a target size (KB/MB). Binary-searches quality, then downscales, and reports honestly if the target is unreachable.", { ...FILE, ...MULTI, target_kb: "number", target_mb: "number", target_bytes: "number", format: "jpeg|webp|png|avif (default keep)", min_quality: "1-100", min_dimension: "px (default 64)", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const tb = a2.target_bytes !== undefined ? num(a2.target_bytes, 0, 1) : a2.target_kb !== undefined ? num(a2.target_kb, 0, 0.01) * 1024 : a2.target_mb !== undefined ? num(a2.target_mb, 0, 0.001) * 1048576 : NaN;
  if (!(tb > 0)) bad("target_kb, target_mb or target_bytes is required."); const fmt = keepFmt(img, a2), cv = toCanvas(img), r = await encodeToTarget(cv, fmt, Math.floor(tb), a2), f = await save(r.blob, outName(a2, img.file, "-target", fmt));
  const res = { ok: r.reached, ...outInfo(f), format: fmt, width: r.width, height: r.height, original_bytes: img.file.size, target_bytes: Math.floor(tb), output_bytes: f.size, quality: r.quality !== undefined ? Math.round(r.quality * 100) : undefined, png_colors: r.colors, downscaled: r.downscaled, scale: r.scale, reached_target: r.reached };
  if (!r.reached) res.warning = `Could not get under ${fmt === "png" ? "the target with a PNG" : "the target"} without dropping below min_quality/min_dimension; output is ${fmtBytes(f.size)} vs target ${fmtBytes(tb)}.`; return { result: res, files: [f] };
}));
tool("compress", "optimize_image_for_web", "Web-optimise: cap width, strip metadata, pick WebP/JPEG/PNG automatically, optionally build a responsive srcset (+ HTML snippet).", { ...FILE, ...MULTI, max_width: "px (default 1920)", quality: "1-100 (default 80)", format: "auto|webp|jpeg|png|avif", widths: "number[] responsive widths e.g. [480,960,1920]", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const src = toCanvas(img), alpha = hasAlpha(getPx(fitCanvas(src, 256))), q = qual(a2.quality, 0.8), maxW = num(a2.max_width, 1920, 16, 16384); let fmt = String(a2.format || a2.output_format || "auto").toLowerCase();
  if (fmt === "auto") fmt = (await canEncode("webp")) ? "webp" : alpha ? "png" : "jpeg"; fmt = normFmt(fmt); const widths = (Array.isArray(a2.widths) ? a2.widths : String(a2.widths || "").split(/[,\s]+/)).map(Number).filter(n => n >= 16 && n <= 16384), list = widths.length ? [...new Set(widths)].sort((x, y) => x - y).slice(0, 8) : [Math.min(maxW, img.width)], files = [], rows = [];
  for (const w of list) { const tw = Math.min(w, img.width), cv = tw < img.width ? resizeCv(src, tw, Math.round(img.height * tw / img.width)) : src, blob = await encode(cv, fmt, { quality: q, background: a2.background_color }), f = await save(blob, list.length === 1 && a2.output_name ? outName(a2, img.file, "", fmt) : `${baseName(img.file.name)}-${cv.width}w.${extOf(fmt)}`); files.push(f); rows.push({ width: cv.width, height: cv.height, ...outInfo(f) }); }
  const res = { ok: true, format: fmt, original: { width: img.width, height: img.height, bytes: img.file.size }, variants: rows, metadata_stripped: true }; if (rows.length === 1) { Object.assign(res, rows[0]); res.saved_percent = +((1 - rows[0].size / img.file.size) * 100).toFixed(1); if (rows[0].size > img.file.size) res.warning = "The optimised file is larger than the original (the source was already well compressed); consider keeping the original."; }
  else { res.srcset = rows.map(r => `${r.filename} ${r.width}w`).join(", "); res.html = `<img src="${rows[rows.length - 1].filename}" srcset="${res.srcset}" sizes="(max-width: ${rows[rows.length - 1].width}px) 100vw, ${rows[rows.length - 1].width}px" width="${rows[rows.length - 1].width}" height="${rows[rows.length - 1].height}" loading="lazy" alt="">`; }
  return { result: res, files };
}));
const SOCIAL = { instagram_square: [1080, 1080, 8], instagram_portrait: [1080, 1350, 8], instagram_landscape: [1080, 566, 8], instagram_story: [1080, 1920, 8], facebook_post: [1200, 630, 8], facebook_cover: [1640, 624, 8], twitter_post: [1600, 900, 5], twitter_header: [1500, 500, 5], linkedin_post: [1200, 627, 8], linkedin_cover: [1584, 396, 8], youtube_thumbnail: [1280, 720, 2], pinterest_pin: [1000, 1500, 20], tiktok_cover: [1080, 1920, 8] };
tool("compress", "optimize_image_for_social_media", "Resize/crop and compress for a social platform preset (or custom size), keeping under the platform size limit. Presets are commonly published sizes — verify against the platform's current specs.", { ...FILE, ...MULTI, platform: `preset: ${Object.keys(SOCIAL).join("|")}|all`, width: "custom px", height: "custom px", fit: "cover|contain", focus: "center|smart", max_mb: "size cap override", format: "jpeg|png|webp", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const pl = String(a2.platform || "").toLowerCase(), custom = a2.width && a2.height; if (!pl && !custom) bad(`platform is required: ${Object.keys(SOCIAL).join(", ")}, or all (or give width and height).`); if (pl && pl !== "all" && !SOCIAL[pl]) bad(`Unknown platform "${pl}". Available: ${Object.keys(SOCIAL).join(", ")}, all.`);
  const targets = pl === "all" ? Object.entries(SOCIAL) : custom ? [["custom", [dimArg(a2.width), dimArg(a2.height), 8]]] : [[pl, SOCIAL[pl]]], src = toCanvas(img), fmt = normFmt(a2.format || a2.output_format || "jpeg"), files = [], rows = [];
  for (const [name, [W, H, mb]] of targets) {
    let cv; if (a2.fit === "contain") { cv = mk(W, H); const x = ctx2(cv), s = Math.min(W / img.width, H / img.height), bd = getPx(resizeCv(src, Math.max(1, Math.round(img.width * Math.max(W / img.width, H / img.height) / 4)), Math.max(1, Math.round(img.height * Math.max(W / img.width, H / img.height) / 4)))); PX.blur(bd, 6); const bgc = cvFromPx(bd), cs = Math.max(W / bgc.width, H / bgc.height); x.drawImage(bgc, (W - bgc.width * cs) / 2, (H - bgc.height * cs) / 2, bgc.width * cs, bgc.height * cs); x.drawImage(src, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s); }
    else { const s = Math.max(W / img.width, H / img.height); let fx = .5, fy = .5; if (a2.focus === "smart") ({ fx, fy } = smartOffset(src, img.width * s, img.height * s, W, H)); const cw = Math.min(img.width, W / s), ch = Math.min(img.height, H / s), crop = mk(Math.max(1, Math.round(cw)), Math.max(1, Math.round(ch))); ctx2(crop).drawImage(src, (img.width - cw) * fx, (img.height - ch) * fy, cw, ch, 0, 0, crop.width, crop.height); cv = resizeCv(crop, W, H); }
    const limit = Math.floor(num(a2.max_mb, mb, 0.05, 100) * 1048576); let blob = await encode(cv, fmt, { quality: 0.9, background: a2.background_color || "#ffffff" }), q = 90;
    if (blob.size > limit) { const r = await encodeToTarget(cv, fmt, limit, a2); blob = r.blob; q = r.quality !== undefined ? Math.round(r.quality * 100) : undefined; }
    const f = await save(blob, pl === "all" || !a2.output_name ? `${baseName(img.file.name)}-${name}.${extOf(fmt)}` : outName(a2, img.file, "", fmt)); files.push(f); rows.push({ platform: name, width: cv.width, height: cv.height, size_limit_mb: limit / 1048576, ...outInfo(f), quality: q, within_limit: f.size <= limit });
  }
  const res = { ok: true, format: fmt, fit: a2.fit === "contain" ? "contain (blurred backdrop)" : "cover", outputs: rows, note: "Dimensions/limits are widely published values and may change; check the platform's current guidance." }; if (rows.length === 1) Object.assign(res, rows[0]);
  if (files.length > 1) { const z = await save(makeZip(await Promise.all(files.map(async f => ({ name: f.filename, data: await bytesOf({ blob: outBlobOf(f) }) })))), `${baseName(img.file.name)}-social.zip`); files.push(z); res.zip_file_id = z.id; }
  return { result: res, files };
}, 10));

function stripGif(u8) {
  const out = [u8.subarray(0, 13)], removed = []; let p = 13; const flags = u8[10]; if (flags & 0x80) { const n = 3 * (1 << ((flags & 7) + 1)); out.push(u8.subarray(p, p + n)); p += n; }
  while (p < u8.length) {
    const s = p, b = u8[p++]; if (b === 0x3B) { out.push(u8.subarray(s, p)); break; }
    if (b === 0x21) { const label = u8[p++]; let q = p; while (u8[q]) q += u8[q] + 1; q++; const keep = label === 0xF9 || label === 0x01 || (label === 0xFF && String.fromCharCode(...u8.subarray(p + 1, p + 12)) === "NETSCAPE2.0"); if (keep) out.push(u8.subarray(s, q)); else removed.push(label === 0xFE ? "comment" : "application extension"); p = q; }
    else if (b === 0x2C) { let q = p + 9; const f = u8[p + 8]; if (f & 0x80) q += 3 * (1 << ((f & 7) + 1)); q++; while (u8[q]) q += u8[q] + 1; q++; out.push(u8.subarray(s, q)); p = q; } else throw new Error("Corrupt GIF block structure");
  }
  return { blob: new Blob(out, { type: "image/gif" }), removed };
}
function stripWebp(u8) {
  const ch = riffChunks(u8), parts = [], removed = []; let size = 4;
  for (const c of ch) { if (c.type === "EXIF" || c.type === "XMP ") { removed.push(c.type.trim()); continue; } let seg = u8.slice(c.start, Math.min(c.end, u8.length)); if (c.type === "VP8X") seg[8] &= ~(0x08 | 0x04); parts.push(seg); size += seg.length; }
  const head = new Uint8Array(12); head.set(u8.subarray(0, 12)); new DataView(head.buffer).setUint32(4, size, true); return { blob: new Blob([head, ...parts], { type: "image/webp" }), removed };
}
tool("compress", "strip_image_metadata", "Remove EXIF/GPS/XMP/comments. Lossless (no re-encode) for JPEG, PNG, GIF and WebP; other formats need reencode:true. Reports what was removed.", { ...FILE, ...MULTI, keep_icc: "boolean keep colour profile", reencode: "boolean re-render pixels (drops everything; bakes EXIF orientation)", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const ex = readExif(img.u8, img.fmt), ori = Number(ex?.orientation || 1), found = { had_exif: !!ex, had_gps: !!ex?.gps, camera: ex ? [ex.make, ex.model].filter(Boolean).join(" ") || undefined : undefined }; let blob, removed = [], method;
  if (bool(a2.reencode)) { const fmt = img.fmt === "jpeg" ? "jpeg" : defaultFmt(img.fmt); blob = await encode(toCanvas(img), fmt, { quality: a2.quality ?? 0.95 }); method = `re-encoded as ${fmt} (pixels re-rendered, orientation applied)`; removed = ["all metadata"]; }
  else if (img.fmt === "jpeg") { const r = stripJpeg(img.u8, bool(a2.keep_icc)); blob = r.blob; removed = r.removed; method = "lossless segment removal (pixels untouched)"; }
  else if (img.fmt === "png") { const r = stripPng(img.u8); blob = r.blob; removed = r.removed; method = "lossless chunk removal (pixels untouched)"; }
  else if (img.fmt === "gif") { const r = stripGif(img.u8); blob = r.blob; removed = r.removed; method = "lossless block removal (animation preserved)"; }
  else if (img.fmt === "webp") { const r = stripWebp(img.u8); blob = r.blob; removed = r.removed; method = "lossless RIFF chunk removal"; }
  else unavailable(`Lossless metadata removal is not implemented for ${img.fmt.toUpperCase()}. Pass reencode:true to re-render the pixels (this drops all metadata but is not lossless for lossy formats).`);
  const fmt = sniff(new Uint8Array(await blob.arrayBuffer())); const f = await save(blob, outName(a2, img.file, "-clean", fmt)), after = readExif(new Uint8Array(await blob.arrayBuffer()), fmt);
  const res = { ok: true, ...outInfo(f), format: fmt, method, removed: [...new Set(removed)], ...found, original_bytes: img.file.size, output_bytes: f.size, exif_remaining: !!after, verified_decodable: true };
  try { await decodeBlob(blob, fmt); } catch (e) { failed("The stripped file no longer decodes: " + e.message); }
  if (ori > 1 && !bool(a2.reencode) && !after) res.warning = `The image had EXIF orientation ${ori}; without it some viewers will show it rotated. Re-run with reencode:true to bake the rotation into the pixels.`;
  if (found.had_gps) res.privacy_note = "GPS coordinates were present and have been removed."; return { result: res, files: [f] };
}));
tool("compress", "preserve_image_quality_compression", "Compress as far as possible while guaranteeing a measured quality floor (SSIM/PSNR checked on the real decoded output). PNG stays lossless.", { ...FILE, ...MULTI, min_ssim: "0.5-1 (default 0.98)", format: "jpeg|webp|avif|png (default keep)", max_dimension: "px", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const fmt = keepFmt(img, a2), floor = num(a2.min_ssim, 0.98, 0.5, 1); let cv = toCanvas(img); const md = num(a2.max_dimension, 0, 0, 32767); if (md) cv = fitCanvas(cv, md);
  if (!LOSSY.has(fmt)) { const blob = await encode(cv, "png"), r = await finishCompress(a2, img, cv, blob, "png", "-lossless", { mode: "lossless", ssim: 1, psnr_db: "infinite (identical pixels)", quality_guarantee: "pixel-identical" }); return r; }
  if (!(await canEncode(fmt))) unavailable(`This browser cannot encode ${fmt.toUpperCase()}.`);
  let lo = 0.3, hi = 0.99, best = null; const test = async q => { const blob = await encode(cv, fmt, { quality: q, background: a2.background_color }), m = await qualityMetrics(cv, blob); return { blob, q, ...m }; };
  const top = await test(hi); if (top.ssim < floor) failed(`Even quality ${Math.round(hi * 100)} gives SSIM ${top.ssim}, below the requested ${floor}. Choose a lower min_ssim or a lossless format (png).`); best = top;
  for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2, t = await test(mid); if (t.ssim >= floor) { best = t; hi = mid; } else lo = mid; }
  return finishCompress(a2, img, cv, best.blob, fmt, "-q", { mode: "lossy, quality-bounded", quality: Math.round(best.q * 100), ssim: best.ssim, psnr_db: best.psnr_db, min_ssim: floor, force_reencode: false });
}));

/* ═════════════ PART 7 — GROUP 7: Segmentation & advanced processing (69–80) ═════════════ */
const smallPx = (cv, maxDim) => { const c = fitCanvas(cv, maxDim); return { cv: c, d: getPx(c), s: c.width / cv.width }; };
function kmeansPx(d, k, iters = 10) {
  const pal = medianCut(samplePixels(d, 30000, false), k); let cen = pal.map(c => [c.r, c.g, c.b]); if (cen.length < 2) cen = [[0, 0, 0], [255, 255, 255]]; const n = d.width * d.height, lab = new Uint8Array(n), p = d.data;
  for (let it = 0; it < iters; it++) {
    const sum = cen.map(() => [0, 0, 0, 0]); let moved = 0;
    for (let i = 0; i < n; i++) { const q = i * 4; let b = 0, bd = Infinity; for (let c = 0; c < cen.length; c++) { const dr = p[q] - cen[c][0], dg = p[q + 1] - cen[c][1], db = p[q + 2] - cen[c][2], dd = dr * dr + dg * dg + db * db; if (dd < bd) { bd = dd; b = c; } } if (lab[i] !== b) moved++; lab[i] = b; const s = sum[b]; s[0] += p[q]; s[1] += p[q + 1]; s[2] += p[q + 2]; s[3]++; }
    cen = cen.map((c, i) => sum[i][3] ? [sum[i][0] / sum[i][3], sum[i][1] / sum[i][3], sum[i][2] / sum[i][3]] : c); if (!moved) break;
  }
  return { centers: cen, labels: lab };
}
tool("advanced", "segment_image", "Unsupervised colour segmentation (k-means or Otsu threshold): segment map, per-segment stats and optional transparent cut-outs (ZIP). Not semantic segmentation.", { ...FILE, method: "kmeans|threshold", k: "2-16 segments (default 5)", cutouts: "boolean save each segment as a transparent PNG (ZIP)", max_dimension: "analysis size px (default 512)", ...OUT }, async a => {
  const img = await openImage(a), cv = toCanvas(img), method = String(a.method || "kmeans"), { d } = smallPx(cv, num(a.max_dimension, 512, 64, 2048)); let centers, k = Math.round(num(a.k, 5, 2, 16));
  if (method === "threshold") { const g = grayOf(d), t = otsu(g); let s0 = [0, 0, 0, 0], s1 = [0, 0, 0, 0]; for (let i = 0; i < g.length; i++) { const s = g[i] >= t ? s1 : s0, q = i * 4; s[0] += d.data[q]; s[1] += d.data[q + 1]; s[2] += d.data[q + 2]; s[3]++; } centers = [s0, s1].map(s => s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : [0, 0, 0]); k = 2; }
  else if (method === "kmeans") centers = kmeansPx(d, k).centers; else bad("method must be kmeans or threshold.");
  const full = getPx(cv), n = full.width * full.height, labels = new Uint8Array(n), map = makeMapper(centers.map(c => ({ r: c[0], g: c[1], b: c[2] }))), stat = centers.map(() => ({ count: 0, x0: Infinity, y0: Infinity, x1: -1, y1: -1, r: 0, g: 0, b: 0 }));
  for (let i = 0; i < n; i++) { const q = i * 4, c = map(full.data[q], full.data[q + 1], full.data[q + 2]); labels[i] = c; const s = stat[c], x = i % full.width, y = (i / full.width) | 0; s.count++; if (x < s.x0) s.x0 = x; if (x > s.x1) s.x1 = x; if (y < s.y0) s.y0 = y; if (y > s.y1) s.y1 = y; s.r += full.data[q]; s.g += full.data[q + 1]; s.b += full.data[q + 2]; }
  const out = new Uint8ClampedArray(full.data.length); for (let i = 0; i < n; i++) { const c = centers[labels[i]]; out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = full.data[i * 4 + 3]; }
  const segs = stat.map((s, i) => s.count ? { segment: i, area_percent: +(s.count / n * 100).toFixed(2), mean_color: toHex(s.r / s.count, s.g / s.count, s.b / s.count), name: colorName(s.r / s.count, s.g / s.count, s.b / s.count), bbox: { x: s.x0, y: s.y0, w: s.x1 - s.x0 + 1, h: s.y1 - s.y0 + 1 } } : null).filter(Boolean).sort((x, y) => y.area_percent - x.area_percent);
  const { result, files } = await emit(a, img, "-segments", cvFromPx({ data: out, width: full.width, height: full.height }), { method: method === "kmeans" ? "k-means colour clustering" : "Otsu threshold", segments: segs, note: "Segments are colour clusters, not semantic objects (no model identifies what they are)." }, { format: "png" });
  if (bool(a.cutouts)) { const entries = []; for (const sg of segs.slice(0, 16)) { const o = new Uint8ClampedArray(full.data); for (let i = 0; i < n; i++) if (labels[i] !== sg.segment) o[i * 4 + 3] = 0; entries.push({ name: `${baseName(img.file.name)}-segment${sg.segment}.png`, data: new Uint8Array(await (await encode(cvFromPx({ data: o, width: full.width, height: full.height }), "png")).arrayBuffer()) }); } const z = await save(makeZip(entries), `${baseName(img.file.name)}-segments.zip`); files.push(z); result.cutouts_zip_file_id = z.id; }
  return { result, files };
});
tool("advanced", "detect_image_edges", "Edge detection (Canny or Sobel) with auto thresholds; output edge map or overlay.", { ...FILE, method: "canny|sobel", low: "canny low threshold", high: "canny high threshold", sigma: "canny blur (default 1.2)", invert: "boolean black edges on white", overlay: "boolean draw edges on the original", color: "overlay colour", max_dimension: "analysis px (default 4096)", ...OUT }, async a => {
  const img = await openImage(a); let cv = toCanvas(img); const md = num(a.max_dimension, 4096, 64, 8192), scaled = Math.max(cv.width, cv.height) > md; if (scaled) cv = fitCanvas(cv, md); const d = getPx(cv), g = grayOf(d), w = d.width, h = d.height, method = String(a.method || "canny"), { m, mx } = sobelMag(g, w, h);
  const sg = num(a.sigma, 1.2, 0.3, 5), { m: ms, mx: mxs } = sobelMag(gaussGray(g, w, h, sg), w, h), sample = Array.from(ms).filter((v, i) => i % 5 === 0 && v > 1).sort((x, y) => x - y), pctl = p => sample.length ? sample[Math.min(sample.length - 1, Math.floor(sample.length * p))] : mxs, hi = a.high !== undefined ? num(a.high, 100, 1, 2000) : Math.min(mxs * 0.5, Math.max(15, pctl(0.85))), lo = a.low !== undefined ? num(a.low, 40, 0, 2000) : hi * 0.4; let edge;
  if (method === "canny") edge = canny(g, w, h, lo, hi, sg); else if (method === "sobel") { edge = new Uint8Array(w * h); const t = a.high !== undefined ? hi : Math.max(20, Math.min(mx * 0.5, Math.max(20, (() => { const sm = Array.from(m).filter((v, i) => i % 5 === 0 && v > 1).sort((x, y) => x - y); return sm.length ? sm[Math.floor(sm.length * 0.8)] : mx; })()))); for (let i = 0; i < edge.length; i++) edge[i] = m[i] >= t ? 255 : 0; } else bad("method must be canny or sobel.");
  let cnt = 0; for (const v of edge) if (v) cnt++; const out = new Uint8ClampedArray(w * h * 4), inv = bool(a.invert), ov = bool(a.overlay), col = parseColor(a.color, [255, 40, 80, 255]);
  for (let i = 0; i < w * h; i++) { const q = i * 4, e = edge[i] > 0; if (ov) { out[q] = e ? col[0] : d.data[q]; out[q + 1] = e ? col[1] : d.data[q + 1]; out[q + 2] = e ? col[2] : d.data[q + 2]; } else { const v = (e ? 255 : 0) ^ (inv ? 255 : 0); out[q] = out[q + 1] = out[q + 2] = v; } out[q + 3] = 255; }
  return emit(a, img, "-edges", cvFromPx({ data: out, width: w, height: h }), { method, thresholds: method === "canny" ? { low: +lo.toFixed(1), high: +hi.toFixed(1), auto: a.high === undefined } : undefined, edge_pixel_percent: +(cnt / (w * h) * 100).toFixed(2), analysed_at: scaled ? `${w}x${h} (downscaled)` : `${w}x${h}` }, { format: "png" });
});
const rgbInfo = (r, g, b) => { const [hh, s, l] = rgb2hsl(r, g, b); return { hex: toHex(r, g, b), rgb: [Math.round(r), Math.round(g), Math.round(b)], hsl: [Math.round(hh), Math.round(s * 100), Math.round(l * 100)], name: colorName(r, g, b) }; };
async function swatchImage(colors, labelFn) {
  const sw = 160, hgt = 200, cv = mk(sw * colors.length, hgt), x = ctx2(cv); x.font = "bold 18px sans-serif"; x.textBaseline = "middle";
  colors.forEach((c, i) => { x.fillStyle = c.hex; x.fillRect(i * sw, 0, sw, hgt); const lum = lumin(...c.rgb); x.fillStyle = lum > 0.45 ? "#111" : "#fff"; x.textAlign = "center"; x.fillText(c.hex.toUpperCase(), i * sw + sw / 2, hgt - 30); if (labelFn) { x.font = "14px sans-serif"; x.fillText(labelFn(c, i), i * sw + sw / 2, hgt - 10); x.font = "bold 18px sans-serif"; } });
  return cv;
}
tool("advanced", "extract_image_colors", "Extract dominant colours (median-cut) with hex/RGB/HSL, names and share, plus average colour; optional swatch image.", { ...FILE, count: "1-32 (default 6)", ignore_white: "boolean", ignore_black: "boolean", swatch: "boolean (default true)", ...OUT }, async a => {
  const img = await openImage(a), d = getPx(fitCanvas(toCanvas(img), 640)), k = Math.round(num(a.count, 6, 1, 32)), raw = samplePixels(d, 80000), keep = []; for (let i = 0; i < raw.length; i += 3) { const r = raw[i], g = raw[i + 1], b = raw[i + 2]; if (bool(a.ignore_white) && r > 245 && g > 245 && b > 245) continue; if (bool(a.ignore_black) && r < 12 && g < 12 && b < 12) continue; keep.push(r, g, b); }
  if (!keep.length) failed("No pixels left to analyse (all transparent or ignored)."); const pal = medianCut(Uint8Array.from(keep), k), tot = pal.reduce((s, c) => s + c.count, 0); let ar = 0, ag = 0, ab = 0; for (let i = 0; i < keep.length; i += 3) { ar += keep[i]; ag += keep[i + 1]; ab += keep[i + 2]; } const nn = keep.length / 3;
  const colors = pal.map(c => ({ ...rgbInfo(c.r, c.g, c.b), percent: +(c.count / tot * 100).toFixed(1) })), res = { ok: true, count: colors.length, colors, average: rgbInfo(ar / nn, ag / nn, ab / nn), method: "median-cut quantisation on a ≤640px sample" }, files = [];
  if (bool(a.swatch, true)) { const f = await save(await encode(await swatchImage(colors, c => c.percent + "%"), "png"), outName(a, img.file, "-colors", "png")); files.push(f); res.swatch_file_id = f.id; }
  return { result: res, files };
});
const hslHex = (h, s, l) => { const [r, g, b] = hsl2rgb(h, Math.max(0, Math.min(1, s)), Math.max(0, Math.min(1, l))); return rgbInfo(r, g, b); };
tool("advanced", "generate_color_palette", "Generate a colour palette from an image or a base colour: image, complementary, split_complementary, analogous, triadic, tetradic, monochromatic. Includes WCAG contrast ratios, CSS variables and a swatch PNG.", { file_id: "optional image id", base_color: "#rrggbb (if no image)", scheme: "image|complementary|split_complementary|analogous|triadic|tetradic|monochromatic", count: "2-12", ...OUT }, async a => {
  const scheme = String(a.scheme || (fid(a) ? "image" : "analogous")), n = Math.round(num(a.count, 5, 2, 12)); let base, img = null;
  if (fid(a)) { img = await openImage(a); const pal = medianCut(samplePixels(getPx(fitCanvas(toCanvas(img), 480)), 50000), Math.max(n, 6)); if (!pal.length) failed("No opaque pixels to build a palette from."); const vivid = [...pal].sort((x, y) => rgb2hsl(y.r, y.g, y.b)[1] * Math.sqrt(y.count) - rgb2hsl(x.r, x.g, x.b)[1] * Math.sqrt(x.count))[0]; base = a.base_color ? parseColor(a.base_color).slice(0, 3) : [vivid.r, vivid.g, vivid.b]; if (scheme === "image") { const colors = pal.slice(0, n).map(c => rgbInfo(c.r, c.g, c.b)); return finishPalette(a, img, colors, "image"); } }
  else { if (!a.base_color) bad("Provide file_id or base_color."); if (scheme === "image") bad("scheme \"image\" needs a file_id."); base = parseColor(a.base_color).slice(0, 3); }
  const [h, s, l] = rgb2hsl(...base); let cols;
  switch (scheme) {
    case "complementary": cols = [[h, s, l], [h + 180, s, l], [h, s, Math.min(.9, l + .2)], [h + 180, s, Math.max(.1, l - .2)], [h, s * .4, .5]]; break;
    case "split_complementary": cols = [[h, s, l], [h + 150, s, l], [h + 210, s, l], [h, s * .5, Math.min(.92, l + .25)], [h, s * .5, Math.max(.1, l - .25)]]; break;
    case "analogous": cols = [-60, -30, 0, 30, 60].map(o => [h + o, s, l]); break;
    case "triadic": cols = [[h, s, l], [h + 120, s, l], [h + 240, s, l], [h, s * .5, Math.min(.9, l + .25)], [h + 240, s * .5, Math.max(.12, l - .25)]]; break;
    case "tetradic": cols = [0, 90, 180, 270].map(o => [h + o, s, l]).concat([[h, s * .3, .92]]); break;
    case "monochromatic": cols = [.15, .3, .5, .7, .88].map(v => [h, s, v]); break; default: bad("scheme must be image, complementary, split_complementary, analogous, triadic, tetradic or monochromatic.");
  }
  return finishPalette(a, img, cols.slice(0, Math.max(2, Math.min(n, cols.length))).map(c => hslHex(...c)), scheme, rgbInfo(...base));
});
async function finishPalette(a, img, colors, scheme, base) {
  const white = [255, 255, 255], black = [0, 0, 0], contrast = colors.map(c => { const w = contrastRatio(c.rgb, white), b = contrastRatio(c.rgb, black), best = w >= b ? "white" : "black", r = Math.max(w, b); return { hex: c.hex, best_text_color: best, contrast_ratio: +r.toFixed(2), wcag: r >= 7 ? "AAA" : r >= 4.5 ? "AA" : r >= 3 ? "AA large text only" : "fails" }; });
  const css = ":root {\n" + colors.map((c, i) => `  --color-${i + 1}: ${c.hex};`).join("\n") + "\n}", f = await save(await encode(await swatchImage(colors), "png"), img ? outName(a, img.file, `-palette-${scheme}`, "png") : safeName(a.output_name || `palette-${scheme}.png`).replace(/(?<!\.png)$/, m => /\.png$/i.test(a.output_name || "") || !a.output_name ? "" : ".png")), files = [f];
  const j = await save(new Blob([JSON.stringify({ scheme, colors, contrast }, null, 2)], { type: "application/json" }), f.filename.replace(/\.png$/i, ".json")); files.push(j);
  return { result: { ok: true, scheme, base: base || undefined, colors, accessibility: contrast, css_variables: css, swatch_file_id: f.id, json_file_id: j.id }, files };
}
function labelRegions(label, W, H, minArea) {
  const seen = new Int32Array(W * H), regs = [], stack = new Int32Array(W * H); let id = 0;
  for (let s = 0; s < W * H; s++) { if (seen[s] || label[s] < 0) continue; const lv = label[s]; let sp = 0, cnt = 0, x0 = W, y0 = H, x1 = -1, y1 = -1, sx = 0, sy = 0; stack[sp++] = s; seen[s] = ++id;
    while (sp) { const k = stack[--sp], x = k % W, y = (k / W) | 0; cnt++; sx += x; sy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) { if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const q = ny * W + nx; if (!seen[q] && label[q] === lv) { seen[q] = id; stack[sp++] = q; } } }
    if (cnt >= minArea) regs.push({ label: lv, count: cnt, x0, y0, x1, y1, cx: sx / cnt, cy: sy / cnt, start: s }); }
  return regs;
}
tool("advanced", "detect_image_regions", "Find distinct regions via connected components over colour clusters or a foreground threshold; returns boxes, areas, centroids and colours (+ annotated image).", { ...FILE, mode: "color|foreground", k: "colour clusters (default 6)", min_area_percent: "default 0.5", max_regions: "default 50", max_dimension: "analysis px (default 512)", annotate: "boolean (default true)", ...OUT }, async a => {
  const img = await openImage(a), cv = toCanvas(img), { d, s } = smallPx(cv, num(a.max_dimension, 512, 64, 2048)), W = d.width, H = d.height, mode = String(a.mode || "color"), minA = Math.max(1, Math.round(W * H * num(a.min_area_percent, 0.5, 0, 50) / 100)); let label = new Int16Array(W * H), centers = null;
  if (mode === "color") { const r = kmeansPx(d, Math.round(num(a.k, 6, 2, 16))); centers = r.centers; for (let i = 0; i < label.length; i++) label[i] = d.data[i * 4 + 3] < 128 ? -1 : r.labels[i]; }
  else if (mode === "foreground") { const g = grayOf(d), t = otsu(g); let dark = 0; for (const v of g) if (v < t) dark++; const fgDark = dark < g.length / 2; for (let i = 0; i < label.length; i++) label[i] = (g[i] < t) === fgDark ? 1 : -1; } else bad("mode must be color or foreground.");
  const regs = labelRegions(label, W, H, minA).sort((x, y) => y.count - x.count).slice(0, Math.round(num(a.max_regions, 50, 1, 500))), out = regs.map((r, i) => { let sr = 0, sg = 0, sb = 0, c = 0; for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) if (label[y * W + x] === r.label) { const q = (y * W + x) * 4; sr += d.data[q]; sg += d.data[q + 1]; sb += d.data[q + 2]; c++; } const inv = 1 / s; return { id: i + 1, bbox: { x: Math.round(r.x0 * inv), y: Math.round(r.y0 * inv), w: Math.round((r.x1 - r.x0 + 1) * inv), h: Math.round((r.y1 - r.y0 + 1) * inv) }, area_percent: +(r.count / (W * H) * 100).toFixed(2), centroid: { x: Math.round(r.cx * inv), y: Math.round(r.cy * inv) }, mean_color: toHex(sr / c, sg / c, sb / c), color_name: colorName(sr / c, sg / c, sb / c) }; });
  const res = { ok: true, mode, region_count: out.length, regions: out, analysed_at: `${W}x${H}`, note: "Regions are connected areas of similar colour/foreground, not recognised objects." }, files = []; if (!out.length) res.warning = "No region exceeded the minimum area; lower min_area_percent.";
  if (bool(a.annotate, true) && out.length) { const f = await annotated(a, img, "-regions", out.map(r => ({ ...r.bbox, label: String(r.id) })), "#ff9100"); files.push(f); res.annotated_file_id = f.id; }
  return { result: res, files };
});
function noiseSigma(d) {
  const cx = Math.max(0, (d.width - 1024) >> 1), cy = Math.max(0, (d.height - 1024) >> 1), w = Math.min(1024, d.width), h = Math.min(1024, d.height), g = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const q = ((cy + y) * d.width + cx + x) * 4; g[y * w + x] = .299 * d.data[q] + .587 * d.data[q + 1] + .114 * d.data[q + 2]; }
  if (w < 5 || h < 5) return 0; let s = 0; for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; s += Math.abs(g[i - w - 1] - 2 * g[i - w] + g[i - w + 1] - 2 * g[i - 1] + 4 * g[i] - 2 * g[i + 1] + g[i + w - 1] - 2 * g[i + w] + g[i + w + 1]); }
  return Math.sqrt(Math.PI / 2) * s / (6 * (w - 2) * (h - 2));
}
function bilateral(d, radius, sigS, sigR) {
  const { width: w, height: h } = d, src = new Uint8ClampedArray(d.data), p = d.data, sp = []; for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) sp.push([dx, dy, Math.exp(-(dx * dx + dy * dy) / (2 * sigS * sigS))]);
  const rl = new Float32Array(766 * 3); for (let i = 0; i < rl.length; i++) rl[i] = Math.exp(-((i / 3) ** 2) / (2 * sigR * sigR));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const q = (y * w + x) * 4; let r = 0, g = 0, b = 0, ws = 0; for (const [dx, dy, wsp] of sp) { const xx = Math.min(w - 1, Math.max(0, x + dx)), yy = Math.min(h - 1, Math.max(0, y + dy)), o = (yy * w + xx) * 4, diff = Math.abs(src[o] - src[q]) + Math.abs(src[o + 1] - src[q + 1]) + Math.abs(src[o + 2] - src[q + 2]), wt = wsp * rl[diff]; r += src[o] * wt; g += src[o + 1] * wt; b += src[o + 2] * wt; ws += wt; } p[q] = r / ws; p[q + 1] = g / ws; p[q + 2] = b / ws; }
}
tool("advanced", "remove_image_noise", "Denoise with a bilateral (edge-preserving), median or gaussian filter; auto mode estimates noise (Immerkær) and tunes strength. Reports noise before/after.", { ...FILE, ...MULTI, method: "auto|bilateral|median|gaussian", strength: "1-10 (auto if omitted)", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const d = getPx(toCanvas(img)), before = noiseSigma(d), method = String(a2.method || "auto"); if (!["auto", "bilateral", "median", "gaussian"].includes(method)) bad("method must be auto, bilateral, median or gaussian.");
  const strength = a2.strength !== undefined ? num(a2.strength, 4, 1, 10) : Math.max(1, Math.min(10, before / 2.2)), m = method === "auto" ? "bilateral" : method;
  if (m === "bilateral") { if (d.width * d.height > 12e6) bad("Bilateral denoising is limited to 12 megapixels in-browser; downscale first or use method:\"median\"."); bilateral(d, Math.min(4, Math.max(1, Math.round(strength / 2.5))), 2 + strength * .6, 8 + strength * 7); }
  else if (m === "median") PX.median(d, strength > 5 ? 2 : 1); else PX.blur(d, 0.4 + strength * .25);
  const after = noiseSigma(d); return emit(a2, img, "-denoised", cvFromPx(d), { method: m, strength: +strength.toFixed(1), estimated_noise_before: +before.toFixed(2), estimated_noise_after: +after.toFixed(2), note: before < 2 ? "The image was already very clean (estimated noise σ<2); only a light filter was applied." : undefined });
}));
/* Lanczos-3 resampling on premultiplied RGBA */
function lanczosResize(d, nw, nh) {
  const sw = d.width, sh = d.height, A = 3, L = x => x === 0 ? 1 : Math.abs(x) >= A ? 0 : A * Math.sin(Math.PI * x) * Math.sin(Math.PI * x / A) / (Math.PI * Math.PI * x * x);
  const weights = (sn, tn) => { const sc = tn / sn, fs = Math.max(1, 1 / sc), sup = A * fs, out = []; for (let i = 0; i < tn; i++) { const c = (i + .5) / sc - .5, a0 = Math.max(0, Math.floor(c - sup)), a1 = Math.min(sn - 1, Math.ceil(c + sup)), ix = [], w = []; let t = 0; for (let j = a0; j <= a1; j++) { const v = L((j - c) / fs); ix.push(j); w.push(v); t += v; } for (let j = 0; j < w.length; j++) w[j] /= t || 1; out.push({ ix, w }); } return out; };
  const wx = weights(sw, nw), wy = weights(sh, nh), tmp = new Float32Array(nw * sh * 4), src = d.data;
  for (let y = 0; y < sh; y++) for (let x = 0; x < nw; x++) { let r = 0, g = 0, b = 0, al = 0; const { ix, w } = wx[x]; for (let k = 0; k < ix.length; k++) { const q = (y * sw + ix[k]) * 4, a = src[q + 3] / 255, wt = w[k]; r += src[q] * a * wt; g += src[q + 1] * a * wt; b += src[q + 2] * a * wt; al += a * wt; } const o = (y * nw + x) * 4; tmp[o] = r; tmp[o + 1] = g; tmp[o + 2] = b; tmp[o + 3] = al; }
  const out = new Uint8ClampedArray(nw * nh * 4);
  for (let y = 0; y < nh; y++) { const { ix, w } = wy[y]; for (let x = 0; x < nw; x++) { let r = 0, g = 0, b = 0, al = 0; for (let k = 0; k < ix.length; k++) { const q = (ix[k] * nw + x) * 4, wt = w[k]; r += tmp[q] * wt; g += tmp[q + 1] * wt; b += tmp[q + 2] * wt; al += tmp[q + 3] * wt; } const o = (y * nw + x) * 4, a = Math.max(0, Math.min(1, al)); out[o] = a > 0.001 ? r / a : 0; out[o + 1] = a > 0.001 ? g / a : 0; out[o + 2] = a > 0.001 ? b / a : 0; out[o + 3] = a * 255; } }
  return { data: out, width: nw, height: nh };
}
tool("advanced", "upscale_image", "Upscale 1.1×–8× with a real Lanczos-3 resampler (+ optional sharpening). This is classical interpolation: it does not invent new detail. AI super-resolution is used only if a host engine is connected.", { ...FILE, ...MULTI, scale: "1.1-8 (default 2)", method: "lanczos|nearest|ai", sharpen: "0-2 post-sharpen (default 0.4)", max_output_megapixels: "default 64", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const sc = num(a2.scale ?? a2.factor, 2, 1.1, 8), method = String(a2.method || "lanczos"), nw = Math.round(img.width * sc), nh = Math.round(img.height * sc), cap = num(a2.max_output_megapixels, 64, 1, 160);
  if (nw * nh > cap * 1e6) bad(`Output would be ${nw}x${nh} (${(nw * nh / 1e6).toFixed(1)} MP), above the ${cap} MP cap. Use a smaller scale.`); const src = toCanvas(img); let cv, engine;
  if (method === "ai") { if (!HOST.superResolution) unavailable("No AI super-resolution engine is connected (provide configureImageTools({ superResolution(canvas, scale) → canvas })). Use method:\"lanczos\" for classical upscaling."); cv = await HOST.superResolution(src, sc); engine = "host AI super-resolution"; }
  else if (method === "nearest") { cv = resizeCv(src, nw, nh, false); engine = "nearest-neighbour (pixel art)"; }
  else if (method === "lanczos") { if (img.width * img.height > 40e6) bad("Input is too large for in-browser Lanczos upscaling."); const d = lanczosResize(getPx(src), nw, nh), sh = num(a2.sharpen, 0.4, 0, 2); if (sh > 0) PX.unsharp(d, sh, 1.0); cv = cvFromPx(d); engine = "Lanczos-3 resampling (classical; no AI detail synthesis)"; } else bad("method must be lanczos, nearest or ai.");
  return emit(a2, img, `-x${+sc.toFixed(2)}`, cv, { engine, original: { width: img.width, height: img.height }, scale: sc });
}, 10));
function cast(d) { const p = d.data, n = d.width * d.height; let r = 0, g = 0, b = 0; for (let i = 0; i < p.length; i += 4) { r += p[i]; g += p[i + 1]; b += p[i + 2]; } r /= n; g /= n; b /= n; return Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b)); }
function qMetrics(d) { const sm = fitCanvas(cvFromPx(d), 512), sd = getPx(sm), g = grayOf(sd); let m = 0; for (const v of g) m += v; m /= g.length; let sdv = 0; for (const v of g) sdv += (v - m) ** 2; return { brightness: +(m / 255).toFixed(3), contrast: +(Math.sqrt(sdv / g.length) / 255).toFixed(3), sharpness: +lapVar(g, sm.width, sm.height).toFixed(1), noise: +noiseSigma(d).toFixed(2), colour_cast: +cast(sd).toFixed(1) }; }
tool("advanced", "enhance_image_quality", "Automatic enhancement pipeline: denoise (if noisy) → auto levels → white-balance (if colour cast) → vibrance → sharpen. Reports before/after metrics and exactly which steps ran.", { ...FILE, ...MULTI, denoise: "auto|true|false", auto_levels: "boolean (default true)", white_balance: "auto|true|false", saturation: "-50..50 (default 8)", sharpen: "0-2 (default 0.6)", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const d = getPx(toCanvas(img)), before = qMetrics(d), applied = [], tri = (v, auto) => v === undefined || v === "auto" ? auto : bool(v);
  if (tri(a2.denoise, before.noise > 3) && d.width * d.height <= 12e6) { const st = Math.max(2, Math.min(8, before.noise / 2.2)); bilateral(d, 2, 2 + st * .6, 8 + st * 7); applied.push(`bilateral denoise (σ≈${before.noise})`); }
  if (bool(a2.auto_levels, true)) { PX.autoLevels(d, 0.005); applied.push("auto levels"); } if (tri(a2.white_balance, before.colour_cast > 18)) { PX.grayWorld(d); applied.push("gray-world white balance"); }
  const sat = num(a2.saturation, 8, -50, 50); if (sat) { PX.saturation(d, sat); applied.push(`saturation ${sat > 0 ? "+" : ""}${sat}`); } const sh = num(a2.sharpen, 0.6, 0, 2); if (sh > 0) { PX.unsharp(d, sh, 1.1, 2); applied.push(`unsharp mask ${sh}`); }
  return emit(a2, img, "-enhanced", cvFromPx(d), { applied, before, after: qMetrics(d), note: "Classical, parameter-driven enhancement (no AI models)." });
}));
function inpaint(d, mask, iters = 60) {
  const { width: w, height: h, data: p } = d, known = new Uint8Array(mask.map(v => v ? 0 : 1)), q = [], dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let i = 0; i < w * h; i++) if (!known[i]) { const x = i % w, y = (i / w) | 0; if (dirs.some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < w && ny < h && known[ny * w + nx]; })) q.push(i); }
  let front = q, guard = 0; const filled = new Uint8Array(known);
  while (front.length && guard++ < w + h) { const next = []; for (const i of front) { if (filled[i] && !known[i] && p[i * 4 + 3] === 255 && false) continue; const x = i % w, y = (i / w) | 0; let r = 0, g = 0, b = 0, c = 0; for (const [dx, dy] of dirs) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const k = ny * w + nx; if (filled[k]) { r += p[k * 4]; g += p[k * 4 + 1]; b += p[k * 4 + 2]; c++; } } if (c) { p[i * 4] = r / c; p[i * 4 + 1] = g / c; p[i * 4 + 2] = b / c; filled[i] = 1; for (const [dx, dy] of dirs) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h && !filled[ny * w + nx] && !known[ny * w + nx]) next.push(ny * w + nx); } } } front = [...new Set(next)]; }
  const unk = []; for (let i = 0; i < w * h; i++) if (!known[i]) unk.push(i);
  for (let it = 0; it < iters; it++) for (const i of unk) { const x = i % w, y = (i / w) | 0; let r = 0, g = 0, b = 0, c = 0; for (const [dx, dy] of dirs) { const nx = Math.min(w - 1, Math.max(0, x + dx)), ny = Math.min(h - 1, Math.max(0, y + dy)), k = ny * w + nx; r += p[k * 4]; g += p[k * 4 + 1]; b += p[k * 4 + 2]; c++; } p[i * 4] = r / c; p[i * 4 + 1] = g / c; p[i * 4 + 2] = b / c; }
  return unk.length;
}
tool("advanced", "restore_image", "Classical photo restoration: dust/scratch spot repair, optional mask inpainting (white = damaged), faded-colour correction and light denoise. Not AI/generative restoration.", { ...FILE, ...MULTI, mask_file_id: "optional mask image (white = repair)", spot_repair: "boolean (default true)", spot_threshold: "10-120 (default 45)", fix_fading: "auto|true|false", denoise: "boolean (default true)", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const d = getPx(toCanvas(img)), before = qMetrics(d), applied = [], w = d.width, h = d.height;
  if (a2.mask_file_id) { const mi = await openImage({ file_id: a2.mask_file_id }), md = getPx(resizeCv(toCanvas(mi), w, h)), mask = new Uint8Array(w * h); let c = 0; for (let i = 0; i < w * h; i++) if (.299 * md.data[i * 4] + .587 * md.data[i * 4 + 1] + .114 * md.data[i * 4 + 2] > 128 && md.data[i * 4 + 3] > 128) { mask[i] = 1; c++; } if (!c) bad("The mask has no white pixels (nothing to repair)."); const grown = new Uint8Array(mask); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (mask[y * w + x]) { grown[y * w + x - 1] = grown[y * w + x + 1] = grown[(y - 1) * w + x] = grown[(y + 1) * w + x] = 1; } const n = inpaint(d, grown, Math.min(200, 40 + Math.round(Math.sqrt(c)))); applied.push(`diffusion inpainting of ${n} masked pixels`); }
  if (bool(a2.spot_repair, true)) { const src = new Uint8ClampedArray(d.data), th = num(a2.spot_threshold, 45, 10, 120); let fixed = 0; for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const q = (y * w + x) * 4; for (let c = 0; c < 3; c++) { const win = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) win.push(src[((y + dy) * w + x + dx) * 4 + c]); win.sort((p, r) => p - r); const med = (win[3] + win[4]) / 2; if (Math.abs(src[q + c] - med) > th && Math.abs(win[6] - win[1]) < th * 1.5) { d.data[q + c] = med; fixed++; } } } applied.push(`spot repair (${fixed} channel samples corrected)`); }
  const fade = a2.fix_fading === undefined || a2.fix_fading === "auto" ? before.contrast < 0.16 : bool(a2.fix_fading); if (fade) { PX.autoLevels(d, 0.003); if (cast(d) > 12) PX.grayWorld(d); PX.saturation(d, 12); applied.push("faded-colour correction (auto levels, white balance, saturation)"); }
  if (bool(a2.denoise, true) && w * h <= 12e6) { bilateral(d, 1, 1.5, 14); applied.push("light bilateral denoise"); }
  return emit(a2, img, "-restored", cvFromPx(d), { applied, before, after: qMetrics(d), limits: "No generative inpainting, face restoration or colourisation; large damaged areas need a mask and will look smoothed." });
}, 10));
function skewAngle(cv) {
  const { d } = smallPx(cv, 900), g = grayOf(d), w = d.width, h = d.height, t = otsu(g); let dark = 0; for (const v of g) if (v < t) dark++; const fgDark = dark < g.length / 2, pts = []; const stride = Math.max(1, Math.floor((w * h) / 200000));
  for (let i = 0; i < g.length; i += stride) if ((g[i] < t) === fgDark) pts.push(i % w - w / 2, ((i / w) | 0) - h / 2); if (pts.length < 200) return { angle: 0, confidence: 0, reason: "too little foreground content" };
  const score = deg => { const th = deg * Math.PI / 180, c = Math.cos(th), s = Math.sin(th), off = Math.ceil(Math.hypot(w, h) / 2), hist = new Float64Array(2 * off + 2); for (let i = 0; i < pts.length; i += 2) hist[Math.round(pts[i + 1] * c - pts[i] * s) + off]++; let sc = 0; for (let i = 1; i < hist.length; i++) sc += (hist[i] - hist[i - 1]) ** 2; return sc; };
  let best = 0, bs = -1, base = score(0); for (let d0 = -20; d0 <= 20; d0 += 0.5) { const sc = score(d0); if (sc > bs) { bs = sc; best = d0; } } const c0 = best; for (let d0 = c0 - .5; d0 <= c0 + .5; d0 += 0.05) { const sc = score(d0); if (sc > bs) { bs = sc; best = d0; } }
  return { angle: +best.toFixed(2), confidence: +Math.min(1, Math.max(0, (bs / (base || 1) - 1) / 1.5)).toFixed(2) };
}
tool("advanced", "deskew_image", "Detect and correct small rotation (±20°) of scanned documents/photos via projection-profile analysis; reports detected angle and confidence.", { ...FILE, ...MULTI, max_angle: "default 20", expand: "boolean (default false)", background_color: "#rrggbb|auto", min_angle: "skip below this (default 0.1)", ...OUT }, a => forEachImage(a, async (img, a2) => {
  const cv = toCanvas(img), r = skewAngle(cv), ang = r.angle, maxA = num(a2.max_angle, 20, 1, 45), minA = num(a2.min_angle, 0.1, 0, 5);
  if (Math.abs(ang) > maxA) failed(`Detected skew ${ang}° exceeds max_angle ${maxA}°; the content may not be text-like. Rotate manually with rotate_image.`);
  if (Math.abs(ang) < minA) return emit(a2, img, "-deskewed", cv, { detected_angle: ang, confidence: r.confidence, corrected: false, note: "Skew is below min_angle; image left unchanged." });
  const th = -ang * Math.PI / 180, W = img.width, H = img.height, ex = bool(a2.expand), nw = ex ? Math.ceil(Math.abs(W * Math.cos(th)) + Math.abs(H * Math.sin(th))) : W, nh = ex ? Math.ceil(Math.abs(W * Math.sin(th)) + Math.abs(H * Math.cos(th))) : H, o = mk(nw, nh), x = ctx2(o);
  let bg = a2.background_color; if (!bg || bg === "auto") { const st = borderStats(getPx(fitCanvas(cv, 256))); bg = toHex(...st.color); } x.fillStyle = cssColor(bg); x.fillRect(0, 0, nw, nh); x.imageSmoothingQuality = "high"; x.translate(nw / 2, nh / 2); x.rotate(th); x.drawImage(cv, -W / 2, -H / 2);
  return emit(a2, img, "-deskewed", o, { detected_angle: ang, rotated_by: +(-ang).toFixed(2), confidence: r.confidence, corrected: true, fill: bg, warning: r.confidence < 0.15 ? "Low confidence: the content has weak line structure, so the angle may be unreliable." : undefined });
}));
function solveHomography(src, dst) {
  const A = [], b = []; for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = dst[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
  const n = 8; for (let i = 0; i < n; i++) { let m = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r; if (Math.abs(A[m][i]) < 1e-10) bad("The four corners are degenerate (collinear or duplicated); cannot compute a perspective transform."); [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]]; for (let r = i + 1; r < n; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } }
  const x = new Array(n); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; } return [...x, 1];
}
function orderCorners(p) { const sum = p.map(q => q[0] + q[1]), diff = p.map(q => q[0] - q[1]); return [p[sum.indexOf(Math.min(...sum))], p[diff.indexOf(Math.max(...diff))], p[sum.indexOf(Math.max(...sum))], p[diff.indexOf(Math.min(...diff))]]; }
function findDocQuad(cv) {
  const { d, s } = smallPx(cv, 500), g = gaussGray(grayOf(d), d.width, d.height, 2), w = d.width, h = d.height, t = otsu(g); let ci = 0, cn = 0, bi = 0, bn = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = g[y * w + x]; if (x > w * .3 && x < w * .7 && y > h * .3 && y < h * .7) { ci += v; cn++; } else { bi += v; bn++; } }
  const brightDoc = ci / cn >= bi / bn, label = new Int16Array(w * h); for (let i = 0; i < w * h; i++) label[i] = (g[i] >= t) === brightDoc ? 1 : -1; const regs = labelRegions(label, w, h, w * h * 0.1).sort((x, y) => y.count - x.count); if (!regs.length) return null;
  const R = regs[0], seen = new Uint8Array(w * h), st = [R.start]; seen[R.start] = 1; const pts = []; while (st.length) { const k = st.pop(), x = k % w, y = (k / w) | 0; pts.push([x, y]); for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) { if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const q = ny * w + nx; if (!seen[q] && label[q] === 1) { seen[q] = 1; st.push(q); } } }
  const pick = f => pts.reduce((b, p) => f(p) > f(b) ? p : b), tl = pick(p => -p[0] - p[1]), tr = pick(p => p[0] - p[1]), br = pick(p => p[0] + p[1]), bl = pick(p => -p[0] + p[1]), area = R.count / (w * h);
  return { corners: [tl, tr, br, bl].map(p => [p[0] / s, p[1] / s]), area_fraction: +area.toFixed(3) };
}
tool("advanced", "perspective_correct_image", "Straighten a photographed document/sign: give 4 corners ([[x,y]×4], px or percent) or let it auto-detect a bright/dark rectangular page. Applies a true homography with bilinear sampling.", { ...FILE, corners: "[[x,y],[x,y],[x,y],[x,y]] any order", unit: "px|percent", width: "output width px (default: from corners)", height: "output height px", auto_detect: "boolean", ...OUT }, async a => {
  const img = await openImage(a), cv = toCanvas(img), W = img.width, H = img.height; let quad, how = "supplied corners", extra = {};
  if (Array.isArray(a.corners) && a.corners.length === 4) { quad = a.corners.map(c => { if (!Array.isArray(c) || c.length < 2) bad("corners must be four [x,y] pairs."); const f = a.unit === "percent"; return [num(c[0], 0) * (f ? W / 100 : 1), num(c[1], 0) * (f ? H / 100 : 1)]; }); }
  else { const r = findDocQuad(cv); if (!r) failed("Could not find a page-like quadrilateral. Pass corners explicitly."); if (r.area_fraction < 0.2) failed(`The detected region covers only ${Math.round(r.area_fraction * 100)}% of the image, so it is probably not the page. Pass corners explicitly.`); quad = r.corners; how = "auto-detected (brightness segmentation + extreme corners; heuristic)"; extra.detected_area_percent = Math.round(r.area_fraction * 100); }
  const [tl, tr, br, bl] = orderCorners(quad), ow = a.width ? Math.round(num(a.width, 1, 1, 16000)) : Math.round(Math.max(Math.hypot(tr[0] - tl[0], tr[1] - tl[1]), Math.hypot(br[0] - bl[0], br[1] - bl[1]))), oh = a.height ? Math.round(num(a.height, 1, 1, 16000)) : Math.round(Math.max(Math.hypot(bl[0] - tl[0], bl[1] - tl[1]), Math.hypot(br[0] - tr[0], br[1] - tr[1])));
  if (ow < 8 || oh < 8) bad("The corners produce an output smaller than 8px."); const Hm = solveHomography([[0, 0], [ow, 0], [ow, oh], [0, oh]], [tl, tr, br, bl]), sd = getPx(cv), out = new Uint8ClampedArray(ow * oh * 4);
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) { const den = Hm[6] * x + Hm[7] * y + Hm[8], sx = (Hm[0] * x + Hm[1] * y + Hm[2]) / den, sy = (Hm[3] * x + Hm[4] * y + Hm[5]) / den, o = (y * ow + x) * 4; if (sx < -.5 || sy < -.5 || sx > W - .5 || sy > H - .5) continue; const x0 = Math.max(0, Math.min(W - 2, Math.floor(sx))), y0 = Math.max(0, Math.min(H - 2, Math.floor(sy))), fx = Math.min(1, Math.max(0, sx - x0)), fy = Math.min(1, Math.max(0, sy - y0)), i00 = (y0 * W + x0) * 4, i10 = i00 + 4, i01 = i00 + W * 4, i11 = i01 + 4; for (let c = 0; c < 4; c++) out[o + c] = (sd.data[i00 + c] * (1 - fx) + sd.data[i10 + c] * fx) * (1 - fy) + (sd.data[i01 + c] * (1 - fx) + sd.data[i11 + c] * fx) * fy; }
  return emit(a, img, "-corrected", cvFromPx({ data: out, width: ow, height: oh }), { corners_source: how, corners: [tl, tr, br, bl].map(p => p.map(Math.round)), output_size: { width: ow, height: oh }, ...extra });
});
const PAGES = { a4: [595.28, 841.89], a3: [841.89, 1190.55], a5: [419.53, 595.28], letter: [612, 792], legal: [612, 1008] };
tool("advanced", "image_to_pdf", "Combine one or more images into a PDF (one per page): A4/Letter/A3/A5/Legal/fit sizing, margins, orientation, JPEG-embedded.", { file_ids: "string[] (page order)", page_size: "a4|a3|a5|letter|legal|fit", orientation: "auto|portrait|landscape", margin: "pt (default 24)", fit: "contain|cover", quality: "1-100 (default 90)", title: "string", ...OUT }, async a => {
  const ids = fids(a); if (!ids.length) bad("file_ids is required."); if (ids.length > 200) bad("At most 200 pages."); const size = String(a.page_size || "a4").toLowerCase(); if (size !== "fit" && !PAGES[size]) bad(`page_size must be one of ${Object.keys(PAGES).join(", ")}, fit.`);
  const margin = num(a.margin, size === "fit" ? 0 : 24, 0, 200), pages = []; let first = null;
  for (const id of ids) {
    const img = await openImage({ file_id: id }); first = first || img; let cv = toCanvas(img); const long = Math.max(img.width, img.height); if (long > 5000) cv = fitCanvas(cv, 5000);
    const jb = await encode(cv, "jpeg", { quality: a.quality ?? 0.9, background: "#ffffff" }), jpeg = new Uint8Array(await jb.arrayBuffer()); let pw, ph, w, h, x, y;
    if (size === "fit") { pw = img.width * .75; ph = img.height * .75; w = pw; h = ph; x = y = 0; } else {
      let [bw, bh] = PAGES[size]; const o = String(a.orientation || "auto"); if (o === "landscape" || (o === "auto" && img.width > img.height)) [bw, bh] = [bh, bw]; pw = bw; ph = bh; const aw = pw - 2 * margin, ah = ph - 2 * margin; if (aw <= 10 || ah <= 10) bad("margin is too large for the page size.");
      const s = a.fit === "cover" ? Math.max(aw / img.width, ah / img.height) : Math.min(aw / img.width, ah / img.height); w = img.width * s; h = img.height * s; x = (pw - w) / 2; y = (ph - h) / 2; if (a.fit === "cover") { w = Math.min(w, pw); h = Math.min(h, ph); }
    }
    pages.push({ pw, ph, w, h, x, y, jpeg, iw: cv.width, ih: cv.height });
  }
  const blob = buildPdf(pages, a.title || baseName(first.file.name)), f = await save(blob, outName(a, first.file, ids.length > 1 ? "-combined" : "", "pdf")), head = String.fromCharCode(...new Uint8Array(await blob.slice(0, 5).arrayBuffer()));
  if (head !== "%PDF-") failed("Generated PDF has an invalid header.");
  return { result: { ok: true, ...outInfo(f), pages: pages.length, page_size: size, images_embedded_as: "JPEG (alpha flattened onto white)", note: pages.some(p => p.iw < 100) ? undefined : undefined }, files: [f] };
});

/* ═════════════ PART 8 — GROUP 8: Image file management (81–90) ═════════════ */
async function sha256Hex(u8) { if (typeof crypto === "undefined" || !crypto.subtle) return null; return [...new Uint8Array(await crypto.subtle.digest("SHA-256", u8))].map(b => b.toString(16).padStart(2, "0")).join(""); }
const EXT_FMT = { png: "png", jpg: "jpeg", jpeg: "jpeg", jfif: "jpeg", gif: "gif", webp: "webp", bmp: "bmp", avif: "avif", svg: "svg", ico: "ico", tif: "tiff", tiff: "tiff", heic: "heic", heif: "heic" };
const extFmt = name => EXT_FMT[(String(name).match(/\.([A-Za-z0-9]+)$/) || [])[1]?.toLowerCase()] || null;
tool("files", "get_image_file_info", "File-level facts: name, extension vs detected format, MIME, bytes, SHA-256, dimensions, alpha, EXIF/GPS presence, animation and mismatch warnings.", { ...FILE, ...MULTI }, async a => {
  const ids = fids(a); if (!ids.length) bad("file_id (or file_ids) is required."); const out = [];
  for (const id of ids.slice(0, 50)) {
    try {
      const file = await getFile(id), u8 = await bytesOf(file), fmt = sniff(u8), r = { file_id: id, name: file.name, size_bytes: file.size, size: fmtBytes(file.size), claimed_mime: file.type || null, detected_format: fmt, detected_mime: fmt ? MIME[fmt] : null, extension_format: extFmt(file.name), sha256: await sha256Hex(u8), warnings: [] };
      if (!fmt) { r.is_image = false; r.warnings.push("Content is not a recognised image format."); } else {
        r.is_image = true; if (r.extension_format && r.extension_format !== fmt) r.warnings.push(`Extension says ${r.extension_format} but the content is ${fmt}.`); if (file.type && MIME[fmt] && file.type !== MIME[fmt] && !(fmt === "ico")) r.warnings.push(`Declared MIME ${file.type} differs from detected ${MIME[fmt]}.`);
        try { const d = await dimsInfo(file); Object.assign(r, { width: d.width, height: d.height, megapixels: d.megapixels, aspect_ratio: d.aspect_ratio, dpi: d.dpi }); } catch (e) { r.warnings.push("Could not read dimensions: " + e.message); }
        const ex = readExif(u8, fmt); r.has_exif = !!ex; r.has_gps = !!ex?.gps; if (fmt === "gif") r.animated = gifInfo(u8).animated; if (file.lastModified) r.last_modified = new Date(file.lastModified).toISOString();
        if (["jpeg", "png", "webp", "gif", "avif", "bmp", "ico"].includes(fmt)) { try { const dec = await decodeBlob(file.blob, fmt); r.has_alpha = hasAlpha(getPx(fitCanvas(toCanvas(dec), 256))); } catch (_) { } }
      }
      if (!r.warnings.length) delete r.warnings; out.push(r);
    } catch (e) { out.push({ file_id: id, error: e.message }); }
  }
  if (out.length === 1) { if (out[0].error) bad(out[0].error); return { result: { ok: true, ...out[0] } }; } return { result: { ok: true, files: out } };
});
tool("files", "duplicate_image", "Create one or more byte-identical copies of an image as new downloadable files.", { ...FILE, copies: "1-20 (default 1)", output_name: "base name for the copies" }, async a => {
  const file = await getFile(fid(a)), n = Math.round(num(a.copies, 1, 1, 20)), u8 = await bytesOf(file), fmt = sniff(u8), ext = (String(file.name).match(/\.([A-Za-z0-9]+)$/) || [])[1] || (fmt ? extOf(fmt) : "bin"), base = a.output_name ? baseName(a.output_name) : baseName(file.name), files = [];
  for (let i = 1; i <= n; i++) files.push(await save(new Blob([u8], { type: file.type || MIME[fmt] || "application/octet-stream" }), `${base}${a.output_name && n === 1 ? "" : n === 1 ? "-copy" : `-copy${i}`}.${ext}`));
  for (const f of files) { const b = new Uint8Array(await outBlobOf(f).arrayBuffer()); if (b.length !== u8.length || crc32(b) !== crc32(u8)) failed("A copy did not match the original bytes."); }
  return { result: { ok: true, source_file_id: file.id, copies: files.map(outInfo), byte_identical: true }, files };
});
tool("files", "rename_image", "Rename an image (creates a renamed file; also updates the display name where the host supports it). Sanitises the name and can fix a wrong extension.", { ...FILE, new_name: "string", fix_extension: "boolean (default true: make extension match the real format)" }, async a => {
  if (!a.new_name) bad("new_name is required."); const file = await getFile(fid(a)), u8 = await bytesOf(file), fmt = sniff(u8); let name = safeName(a.new_name); const warn = []; if (name !== String(a.new_name).trim()) warn.push("Unsafe characters were replaced.");
  const m = name.match(/\.([A-Za-z0-9]{1,5})$/), have = m ? extFmt(name) : null;
  if (fmt && bool(a.fix_extension, true)) { if (!m) { name += "." + extOf(fmt); warn.push(`Added the .${extOf(fmt)} extension.`); } else if (have !== fmt) { const fixed = name.replace(/\.[A-Za-z0-9]{1,5}$/, "." + extOf(fmt)); warn.push(`Extension .${m[1]} does not match the ${fmt} content; changed to .${extOf(fmt)}.`); name = fixed; } }
  let renamedInPlace = false; if (HOST.renameFile) { try { renamedInPlace = !!(await HOST.renameFile(file.id, name)); } catch (_) { } } const rec = store.get(file.id); if (rec && !HOST.getFile) { rec.name = name; renamedInPlace = true; }
  const f = await save(new Blob([u8], { type: file.type || MIME[fmt] || "application/octet-stream" }), name);
  return { result: { ok: true, old_name: file.name, new_name: f.filename, ...outInfo(f), renamed_in_place: renamedInPlace, warnings: warn.length ? warn : undefined, note: renamedInPlace ? undefined : "The original upload record cannot be renamed by this host; a renamed copy was created (use file_id of the copy)." }, files: [f] };
});
tool("files", "export_image", "Export an image in one or several formats and sizes, with optional metadata stripping; multiple outputs are bundled into a ZIP.", { ...FILE, formats: "string[] e.g. [\"png\",\"webp\",\"jpeg\"]", format: "single format", sizes: "number[] max-dimension variants e.g. [512,1024]", quality: "1-100", background_color: "#rrggbb for flattening", output_name: "base name", zip: "boolean (default true if >1 output)" }, async a => {
  const img = await openImage(a), fmts = (a.formats ? (Array.isArray(a.formats) ? a.formats : String(a.formats).split(/[,\s]+/)) : [a.format || a.output_format || img.fmt]).map(normFmt).filter(Boolean), sizes = a.sizes ? (Array.isArray(a.sizes) ? a.sizes : String(a.sizes).split(/[,\s]+/)).map(Number).filter(n => n >= 1 && n <= 32767) : [0];
  if (fmts.length * sizes.length > 36) bad("Too many variants (max 36)."); const src = toCanvas(img), base = a.output_name ? baseName(a.output_name) : baseName(img.file.name), files = [], rows = [], skipped = [];
  for (const f of [...new Set(fmts)]) for (const s of [...new Set(sizes)]) {
    try {
      let cv = s ? fitCanvas(src, s) : src; if (f === "svg") { const r = await svgConvert(img, { ...a, mode: a.mode || "embed", output_name: `${base}${s ? "-" + s : ""}` }); files.push(...r.files); rows.push({ format: "svg", ...outInfo(r.files[0]) }); continue; }
      const blob = await encode(cv, f, { quality: a.quality, background: a.background_color, sizes: a.ico_sizes }), o = await save(blob, `${base}${s ? "-" + cv.width + "w" : ""}.${extOf(f)}`); await verifyOut(o, f); files.push(o); rows.push({ format: f, width: cv.width, height: cv.height, ...outInfo(o) });
    } catch (e) { skipped.push({ format: f, size: s || "original", reason: e.message }); }
  }
  if (!files.length) failed("No variant could be exported: " + JSON.stringify(skipped)); const res = { ok: !skipped.length, outputs: rows, skipped: skipped.length ? skipped : undefined, metadata_stripped: true };
  if (files.length > 1 && bool(a.zip, true)) { const z = await save(makeZip(await Promise.all(files.map(async f => ({ name: f.filename, data: await bytesOf({ blob: outBlobOf(f) }) })))), `${base}-export.zip`); files.push(z); res.zip_file_id = z.id; } else if (files.length === 1) Object.assign(res, rows[0]);
  return { result: res, files };
});
tool("files", "download_image", "Prepare an image (original or converted) for download: returns a download URL and, in a browser, can trigger the save dialog.", { ...FILE, format: "optional conversion", quality: "1-100", filename: "download name", trigger: "boolean trigger a browser download now" }, async a => {
  const img = await openImage(a); let blob = new Blob([img.u8], { type: MIME[img.fmt] || img.file.type }), fmt = img.fmt, converted = false;
  if (a.format && normFmt(a.format) !== img.fmt) { fmt = normFmt(a.format); blob = await encode(toCanvas(img), fmt, { quality: a.quality, background: a.background_color }); converted = true; }
  const name = a.filename ? (/\.[A-Za-z0-9]{1,5}$/.test(a.filename) ? safeName(a.filename) : safeName(a.filename) + "." + extOf(fmt)) : converted ? `${baseName(img.file.name)}.${extOf(fmt)}` : safeName(img.file.name), f = await save(blob, name); let triggered = false;
  if (bool(a.trigger) && typeof document !== "undefined" && f.url) { const el = document.createElement("a"); el.href = f.url; el.download = f.filename; document.body.appendChild(el); el.click(); el.remove(); triggered = true; }
  const res = { ok: true, ...outInfo(f), converted, download_url: f.url || null, download_triggered: triggered };
  if (bool(a.trigger) && !triggered) res.note = "No browser document available, so the save dialog could not be opened; use download_url / the returned file."; if (!f.url) res.warning = "This environment cannot create download URLs (no URL.createObjectURL); the file is available via file_id."; return { result: res, files: [f] };
});

/* structure checks shared by validate_image and check_image_integrity */
function inspectStructure(u8, fmt) {
  const issues = [], dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), info = {};
  try {
    if (fmt === "png") {
      let p = 8, sawIHDR = false, sawIDAT = false, sawIEND = false; const crcBad = [];
      while (p + 12 <= u8.length) { const len = dv.getUint32(p), type = String.fromCharCode(...u8.subarray(p + 4, p + 8)); if (p + 12 + len > u8.length) { issues.push({ severity: "error", message: `Chunk ${type} overruns the file (truncated).` }); break; } const stored = dv.getUint32(p + 8 + len), calc = crc32(u8.subarray(p + 4, p + 8 + len)); if (stored !== calc) crcBad.push(type); if (type === "IHDR") sawIHDR = true; if (type === "IDAT") sawIDAT = true; if (type === "IEND") { sawIEND = true; if (p + 12 + len < u8.length) issues.push({ severity: "warning", message: `${u8.length - (p + 12 + len)} trailing bytes after IEND.` }); break; } p += 12 + len; }
      if (!sawIHDR) issues.push({ severity: "error", message: "Missing IHDR chunk." }); if (!sawIDAT) issues.push({ severity: "error", message: "Missing IDAT (no pixel data)." }); if (!sawIEND) issues.push({ severity: "error", message: "Missing IEND (file truncated)." }); if (crcBad.length) issues.push({ severity: "error", message: `CRC mismatch in chunk(s): ${[...new Set(crcBad)].join(", ")}.` }); info.checked = "PNG chunk structure and CRC-32 of every chunk";
    } else if (fmt === "jpeg") {
      const segs = jpegSegments(u8); const last = segs[segs.length - 1]; if (last.m !== 0xD9) issues.push({ severity: "error", message: "Missing EOI marker (file truncated)." }); if (!segs.some(s => s.m === 0xDA)) issues.push({ severity: "error", message: "No scan data (SOS)." }); if (!segs.some(s => s.m >= 0xC0 && s.m <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(s.m))) issues.push({ severity: "error", message: "No frame header (SOF)." }); if (!segs.some(s => s.m === 0xDB)) issues.push({ severity: "warning", message: "No quantisation table (DQT)." }); if (last.m === 0xD9 && last.end < u8.length) issues.push({ severity: "warning", message: `${u8.length - last.end} trailing bytes after EOI.` }); info.checked = "JPEG marker/segment structure, SOF/SOS/EOI presence";
    } else if (fmt === "gif") {
      const g = gifInfo(u8); info.frames = g.frames; if (u8[u8.length - 1] !== 0x3B) issues.push({ severity: "error", message: "Missing GIF trailer (file truncated)." }); if (!g.frames) issues.push({ severity: "error", message: "No image frames." }); info.checked = "GIF block structure and trailer";
    } else if (fmt === "bmp") { const sz = dv.getUint32(2, true), off = dv.getUint32(10, true), w = dv.getInt32(18, true), h = Math.abs(dv.getInt32(22, true)), bpp = dv.getUint16(28, true), need = off + Math.ceil(w * bpp / 32) * 4 * h; if (sz !== u8.length) issues.push({ severity: "warning", message: `Header size ${sz} ≠ actual ${u8.length}.` }); if (u8.length < need && dv.getUint32(30, true) === 0) issues.push({ severity: "error", message: `Pixel data truncated (need ${need} bytes, have ${u8.length}).` }); info.checked = "BMP header vs pixel-data size";
    } else if (fmt === "webp") { const riff = dv.getUint32(4, true) + 8; if (riff !== u8.length) issues.push({ severity: riff > u8.length ? "error" : "warning", message: riff > u8.length ? `RIFF declares ${riff} bytes but the file has ${u8.length} (truncated).` : `${u8.length - riff} trailing bytes after the RIFF container.` }); const ch = riffChunks(u8); if (!ch.some(c => ["VP8 ", "VP8L", "VP8X"].includes(c.type))) issues.push({ severity: "error", message: "No VP8/VP8L/VP8X image chunk." }); info.checked = "WebP RIFF container size and chunk walk";
    } else if (fmt === "svg") { const t = new TextDecoder().decode(u8); if (!/<\/svg>\s*$/i.test(t.trim())) issues.push({ severity: "error", message: "SVG is not closed with </svg>." }); if (/<script[\s>]/i.test(t) || /\son\w+\s*=/i.test(t)) issues.push({ severity: "warning", message: "SVG contains script or event-handler attributes (unsafe to embed)." }); info.checked = "SVG closing tag and active-content scan";
    } else info.checked = "signature only (no structural validator for " + fmt + ")";
  } catch (e) { issues.push({ severity: "error", message: "Structure could not be parsed: " + e.message }); }
  return { issues, info };
}
tool("files", "validate_image", "Validate an image against rules: real format vs extension, structure, decodability, size/pixel/format limits. Returns valid true/false with itemised issues.", { ...FILE, ...MULTI, allowed_formats: "string[] e.g. [\"png\",\"jpeg\"]", max_bytes: "number", max_pixels: "number", min_width: "px", min_height: "px", max_width: "px", max_height: "px", require_exact_dimensions: "{width,height}" }, async a => {
  const ids = fids(a); if (!ids.length) bad("file_id (or file_ids) is required."); const out = [], allow = a.allowed_formats ? (Array.isArray(a.allowed_formats) ? a.allowed_formats : String(a.allowed_formats).split(/[,\s]+/)).map(normFmt) : null;
  for (const id of ids.slice(0, 100)) {
    const issues = []; let r = { file_id: id };
    try {
      const file = await getFile(id), u8 = await bytesOf(file), fmt = sniff(u8); r = { file_id: id, name: file.name, size_bytes: file.size, detected_format: fmt };
      if (!file.size) issues.push({ severity: "error", message: "File is empty." }); else if (!fmt) issues.push({ severity: "error", message: "Not a recognised image format." }); else {
        const ef = extFmt(file.name); if (ef && ef !== fmt) issues.push({ severity: "warning", message: `Extension suggests ${ef} but content is ${fmt}.` }); const st = inspectStructure(u8, fmt); issues.push(...st.issues);
        let w, h; try { const dec = await decodeBlob(file.blob, fmt); w = dec.width; h = dec.height; r.width = w; r.height = h; } catch (e) { issues.push({ severity: "error", message: "The image does not decode: " + e.message }); }
        if (allow && !allow.includes(fmt)) issues.push({ severity: "error", message: `Format ${fmt} is not allowed (allowed: ${allow.join(", ")}).` }); if (a.max_bytes !== undefined && file.size > num(a.max_bytes, 0)) issues.push({ severity: "error", message: `File is ${fmtBytes(file.size)}, over the ${fmtBytes(num(a.max_bytes, 0))} limit.` });
        if (w) { if (a.max_pixels !== undefined && w * h > num(a.max_pixels, 0)) issues.push({ severity: "error", message: `${w * h} pixels exceeds max_pixels ${a.max_pixels}.` }); if (a.min_width !== undefined && w < num(a.min_width, 0)) issues.push({ severity: "error", message: `Width ${w} is below ${a.min_width}.` }); if (a.min_height !== undefined && h < num(a.min_height, 0)) issues.push({ severity: "error", message: `Height ${h} is below ${a.min_height}.` }); if (a.max_width !== undefined && w > num(a.max_width, 0)) issues.push({ severity: "error", message: `Width ${w} exceeds ${a.max_width}.` }); if (a.max_height !== undefined && h > num(a.max_height, 0)) issues.push({ severity: "error", message: `Height ${h} exceeds ${a.max_height}.` }); const ex = a.require_exact_dimensions; if (ex && (w !== Number(ex.width) || h !== Number(ex.height))) issues.push({ severity: "error", message: `Dimensions ${w}x${h} are not the required ${ex.width}x${ex.height}.` }); }
      }
    } catch (e) { issues.push({ severity: "error", message: e.message }); }
    out.push({ ...r, valid: !issues.some(i => i.severity === "error"), issues }); }
  if (out.length === 1) return { result: { ok: true, ...out[0] } }; return { result: { ok: true, all_valid: out.every(o => o.valid), results: out } };
});
tool("files", "check_image_integrity", "Detect corruption: PNG chunk CRCs and IDAT inflate test, JPEG/GIF/BMP/WebP structure, full pixel decode, optional SHA-256 comparison and blank-image check.", { ...FILE, expected_sha256: "optional hex digest to compare" }, async a => {
  const file = await getFile(fid(a)), u8 = await bytesOf(file), fmt = sniff(u8); if (!fmt) return { result: { ok: true, intact: false, file_id: file.id, issues: [{ severity: "error", message: "Not a recognised image format; cannot verify." }] } };
  const st = inspectStructure(u8, fmt), issues = [...st.issues], checks = [st.info.checked]; const sha = await sha256Hex(u8);
  if (fmt === "png" && !issues.some(i => /IDAT|CRC|truncated|overruns/.test(i.message))) { try { const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), parts = []; let p = 8; while (p + 12 <= u8.length) { const len = dv.getUint32(p), type = String.fromCharCode(...u8.subarray(p + 4, p + 8)); if (type === "IDAT") parts.push(u8.subarray(p + 8, p + 8 + len)); p += 12 + len; } const tot = parts.reduce((s, x) => s + x.length, 0), cat = new Uint8Array(tot); let o = 0; for (const x of parts) { cat.set(x, o); o += x.length; } const raw = await inflateZlib(cat), w = dv.getUint32(16), h = dv.getUint32(20); checks.push(`IDAT zlib stream inflated cleanly (${raw.length} bytes)`); const interlaced = u8[28] === 1; if (!interlaced) { const ct = u8[25], bd = u8[24], ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct] || 1, need = (Math.ceil(w * ch * bd / 8) + 1) * h; if (raw.length < need) issues.push({ severity: "error", message: `Pixel data is short: ${raw.length} bytes inflated, ${need} expected (truncated image).` }); else checks.push("decompressed size matches IHDR dimensions"); } } catch (e) { issues.push({ severity: "error", message: "IDAT stream is corrupt: " + (e.message || e) }); } }
  let blank = null; try { const dec = await decodeBlob(file.blob, fmt), cv = toCanvas(dec); checks.push(`full pixel decode succeeded (${dec.width}x${dec.height})`); const d = getPx(fitCanvas(cv, 256)), p = d.data; let mn = 255, mx = 0, al = 0; for (let i = 0; i < p.length; i += 4) { const v = (p[i] + p[i + 1] + p[i + 2]) / 3; if (v < mn) mn = v; if (v > mx) mx = v; al = Math.max(al, p[i + 3]); } blank = mx - mn < 2 || al === 0; if (blank) issues.push({ severity: "warning", message: al === 0 ? "The image is fully transparent." : "The image is a single flat colour (blank or wiped)." }); } catch (e) { issues.push({ severity: "error", message: "Full decode failed: " + e.message }); }
  let hashMatch = null; if (a.expected_sha256) { hashMatch = sha ? sha === String(a.expected_sha256).toLowerCase() : null; if (hashMatch === false) issues.push({ severity: "error", message: "SHA-256 does not match expected_sha256 (file was modified or corrupted)." }); if (hashMatch === null) issues.push({ severity: "warning", message: "SHA-256 is unavailable in this environment." }); else if (hashMatch) checks.push("SHA-256 matches"); }
  return { result: { ok: true, file_id: file.id, name: file.name, format: fmt, intact: !issues.some(i => i.severity === "error"), checks_performed: checks, issues, sha256: sha, hash_match: hashMatch } };
});
tool("files", "get_supported_image_formats", "Probe what this runtime can really decode/encode (via test images and canvas encoders) and which engines (OCR, TF.js, vision, PDF) are connected.", {}, async () => {
  const fmts = {}, tiny = mk(2, 2); ctx2(tiny).fillStyle = "#f00"; ctx2(tiny).fillRect(0, 0, 2, 2);
  const SAMPLES = { webp: "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA", avif: "AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=" };
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  for (const f of ["png", "jpeg", "webp", "avif", "bmp", "gif", "ico", "svg", "tiff", "heic"]) {
    const r = { encode: false, decode: "unknown", via: "" };
    try { r.encode = f === "svg" ? false : await canEncode(f); } catch (_) { }
    try {
      let sample = null; if (["png", "jpeg"].includes(f) && r.encode) sample = await encode(tiny, f); else if (f === "bmp") sample = new Blob([encodeBMP(getPx(tiny))], { type: "image/bmp" }); else if (f === "gif") sample = encodeGIF([getPx(tiny)]); else if (f === "svg") sample = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="red"/></svg>'], { type: "image/svg+xml" }); else if (f === "ico") sample = await encodeICO(tiny, [16]); else if (SAMPLES[f]) sample = new Blob([b64(SAMPLES[f])], { type: MIME[f] });
      if (sample) { try { await decodeBlob(sample, f); r.decode = true; r.via = "decoded a generated test image"; } catch (_) { r.decode = f === "ico" ? "unsupported by this decoder (ICO export still works)" : r.encode && ["webp", "avif"].includes(f) ? true : false; r.via = r.decode === true ? "inferred from encoder support" : "test image failed to decode"; } } else r.via = "no test sample; decode support not probed (the browser may or may not read it)";
    } catch (e) { r.via = "probe error: " + e.message; }
    if (["tiff", "heic"].includes(f)) r.note = f === "heic" ? "Usually only Safari decodes HEIC; this module cannot encode it." : "Browsers generally cannot decode TIFF; this module cannot encode it."; if (f === "svg") r.note = "Input rasterised via the browser; SVG output via convert_image_svg (trace/embed)."; fmts[f] = r;
  }
  return { result: { ok: true, formats: fmts, engines: { tesseract_ocr: { loaded: !!globalThis.Tesseract, loadable_from_cdn: typeof document !== "undefined" }, tensorflow_js: { loaded: !!globalThis.tf }, coco_ssd_objects: { loaded: !!globalThis.cocoSsd }, mobilenet_classify: { loaded: !!globalThis.mobilenet }, blazeface_faces: { loaded: !!globalThis.blazeface, native_FaceDetector: typeof globalThis.FaceDetector === "function" }, pdfjs: { loaded: !!globalThis.pdfjsLib }, vision_model: { connected: hasVision() }, llm_translation: { connected: !!(HOST.llm || HOST.translate) }, ml_background_removal: { host_provided: !!HOST.removeBackground, loadable_from_cdn: typeof document !== "undefined" }, ai_super_resolution: { host_provided: !!HOST.superResolution }, compression_streams: { available: typeof CompressionStream !== "undefined" }, webcodecs_ImageDecoder: { available: typeof ImageDecoder !== "undefined" }, runtime: typeof document !== "undefined" ? "browser" : "non-browser" }, note: "Probed live in this runtime." } };
});

/* batch / sequence */
const NOT_BATCHABLE = new Set(["batch_process_images", "process_image_sequence", "get_supported_image_formats"]);
async function mapLimit(items, limit, fn) { const out = new Array(items.length); let i = 0; await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } })); return out; }
const isImgFile = f => /^image\//.test(f?.type || "");
tool("files", "batch_process_images", "Run any single-image tool over many files (continues past individual failures) and bundle outputs into a ZIP.", { file_ids: "string[]", operation: "tool name e.g. compress_image, resize_image, convert_image_webp", params: "object of arguments for that tool", concurrency: "1-4 (default 2)", zip: "boolean (default true)", stop_on_error: "boolean" }, async a => {
  const ids = fids(a); if (!ids.length) bad("file_ids is required."); if (ids.length > 100) bad("At most 100 files per batch."); const op = String(a.operation || a.tool || ""); if (!op) bad("operation (a tool name) is required."); if (!H[op]) bad(`Unknown operation "${op}".`); if (NOT_BATCHABLE.has(op)) bad(`"${op}" cannot be used inside a batch.`);
  let params = a.params || {}; if (typeof params === "string") { try { params = JSON.parse(params); } catch (_) { bad("params must be a JSON object."); } } if ("file_id" in params || "file_ids" in params) bad("Do not put file ids in params; use file_ids.");
  const stop = bool(a.stop_on_error); let halted = false;
  const rows = await mapLimit(ids, Math.round(num(a.concurrency, 2, 1, 4)), async id => { if (halted) return { file_id: id, status: "skipped" }; try { const args = { ...params, file_id: id }; delete args.output_name; const r = await H[op](args); return { file_id: id, status: "ok", result: r.result, files: r.files || [] }; } catch (e) { if (stop) halted = true; return { file_id: id, status: "failed", error: e.message, code: e.code || "FAILED" }; } });
  const files = rows.flatMap(r => r.files || []), okN = rows.filter(r => r.status === "ok").length, failedN = rows.filter(r => r.status === "failed").length, res = { ok: failedN === 0, operation: op, requested: ids.length, succeeded: okN, failed: failedN, skipped: rows.filter(r => r.status === "skipped").length, results: rows.map(r => ({ file_id: r.file_id, status: r.status, error: r.error, outputs: (r.files || []).map(outInfo) })) };
  if (!okN) failed(`Every file failed. First error: ${rows.find(r => r.error)?.error}`);
  if (bool(a.zip, true) && files.length > 1) { const z = await save(makeZip(await Promise.all(files.map(async f => ({ name: f.filename, data: await bytesOf({ blob: outBlobOf(f) }) })))), `batch-${op}.zip`); files.push(z); res.zip_file_id = z.id; } return { result: res, files };
});
tool("files", "process_image_sequence", "Three modes — pipeline: chain tools on one image (each step's output feeds the next); animation: combine images into an animated GIF; extract_frames: split an animated GIF/WebP into frames (needs WebCodecs ImageDecoder).", { mode: "pipeline|animation|extract_frames", file_id: "source image (pipeline, extract_frames)", steps: "pipeline: [{tool, params}]", file_ids: "animation: frame ids in order", delay_ms: "animation frame delay (default 200)", loop: "animation loops (0 = forever)", fit: "animation: first|smallest (frame size)", dither: "boolean", max_frames: "extract limit (default 60)" }, async a => {
  const mode = String(a.mode || (Array.isArray(a.steps) ? "pipeline" : a.file_ids ? "animation" : ""));
  if (mode === "pipeline") {
    let steps = a.steps; if (typeof steps === "string") { try { steps = JSON.parse(steps); } catch (_) { bad("steps must be a JSON array."); } } if (!Array.isArray(steps) || !steps.length) bad("steps is required: [{tool, params}, …]."); if (steps.length > 20) bad("At most 20 steps."); let cur = fid(a); if (!cur) bad("file_id is required for pipeline mode.");
    for (const s of steps) { const nm = s.tool || s.name; if (!H[nm]) bad(`Unknown tool "${nm}" in steps.`); if (NOT_BATCHABLE.has(nm)) bad(`"${nm}" cannot be used as a pipeline step.`); }
    const log = [], all = []; let lastFile = null;
    for (let i = 0; i < steps.length; i++) { const nm = steps[i].tool || steps[i].name; try { const args = { ...(steps[i].params || steps[i].args || {}), file_id: cur }; delete args.file_ids; const r = await H[nm](args), outF = (r.files || []).find(isImgFile); log.push({ step: i + 1, tool: nm, status: "ok", output_file_id: outF?.id, summary: pickSummary(r.result) }); all.push(...(r.files || [])); if (outF) { cur = outF.id; lastFile = outF; } else if (i < steps.length - 1) failed(`Step ${i + 1} (${nm}) produced no image output to feed the next step.`); } catch (e) { log.push({ step: i + 1, tool: nm, status: "failed", error: e.message }); return { result: { ok: false, mode, failed_at_step: i + 1, steps: log, last_good_file_id: lastFile?.id || null, error: e.message }, files: all }; } }
    return { result: { ok: true, mode, steps: log, final: lastFile ? outInfo(lastFile) : null }, files: all };
  }
  if (mode === "animation") {
    const ids = fids(a); if (ids.length < 2) bad("animation mode needs at least two file_ids."); if (ids.length > 200) bad("At most 200 frames."); const imgs = []; for (const id of ids) imgs.push(await openImage({ file_id: id }));
    const ref = a.fit === "smallest" ? imgs.reduce((s, i) => i.width * i.height < s.width * s.height ? i : s) : imgs[0], W = ref.width, Hh = ref.height; if (W * Hh * imgs.length > 4e8) bad("Animation is too large; reduce frame size or count.");
    const frames = imgs.map(i => { const o = mk(W, Hh), x = ctx2(o), s = Math.min(W / i.width, Hh / i.height); x.drawImage(i.src, (W - i.width * s) / 2, (Hh - i.height * s) / 2, i.width * s, i.height * s); return getPx(o); }), delay = num(a.delay_ms, 200, 20, 10000), blob = encodeGIF(frames, { delay, loop: num(a.loop, 0, 0, 65535), dither: bool(a.dither) }), f = await save(blob, safeName(a.output_name || `${baseName(ref.file.name)}-animation.gif`).replace(/(\.gif)?$/i, ".gif")), g = gifInfo(new Uint8Array(await blob.arrayBuffer()));
    if (g.frames !== imgs.length) failed(`Encoder wrote ${g.frames} frames instead of ${imgs.length}.`); return { result: { ok: true, mode, ...outInfo(f), frames: g.frames, width: W, height: Hh, frame_delay_ms: delay, total_duration_ms: g.total_duration_ms, loop: g.loop_count, note: "Frames were letterboxed to the first frame's size; GIF uses a per-frame 256-colour palette." }, files: [f] };
  }
  if (mode === "extract_frames") {
    if (typeof ImageDecoder === "undefined") unavailable("Frame extraction needs the WebCodecs ImageDecoder API (Chrome/Edge/Safari 17+). It is not available in this runtime."); const file = await getFile(fid(a)), u8 = await bytesOf(file), fmt = sniff(u8); if (!["gif", "webp", "png", "avif"].includes(fmt)) bad("extract_frames supports animated gif, webp, png (APNG) and avif."); const dec = new ImageDecoder({ data: u8, type: MIME[fmt] }); await dec.tracks.ready; const n = Math.min(dec.tracks.selectedTrack.frameCount, Math.round(num(a.max_frames, 60, 1, 500))), entries = [], files = [];
    for (let i = 0; i < n; i++) { const { image } = await dec.decode({ frameIndex: i }), cv = mk(image.displayWidth, image.displayHeight); ctx2(cv).drawImage(image, 0, 0); image.close(); const blob = await encode(cv, "png"); entries.push({ name: `${baseName(file.name)}-frame${String(i + 1).padStart(3, "0")}.png`, data: new Uint8Array(await blob.arrayBuffer()) }); }
    const z = await save(makeZip(entries), `${baseName(file.name)}-frames.zip`); files.push(z); if (n <= 5) for (const e of entries) files.push(await save(new Blob([e.data], { type: "image/png" }), e.name)); return { result: { ok: true, mode, frames_extracted: n, frames_in_file: dec.tracks.selectedTrack.frameCount, zip_file_id: z.id }, files };
  }
  bad("mode must be pipeline, animation or extract_frames.");
});
function pickSummary(r) { if (!r || typeof r !== "object") return r; const o = {}; for (const k of ["width", "height", "format", "output_bytes", "size", "saved_percent", "engine", "detected_angle", "applied", "warning"]) if (r[k] !== undefined) o[k] = r[k]; return o; }

/* ═════════════ PUBLIC API ═════════════ */
/** Tool definitions in Envizion's { name, description, parameters } shape (plus `group`). Append to toolDefinitions. */
export const imageToolDefinitions = DEFS.map(d => ({ ...d }));
export const imageToolNames = DEFS.map(d => d.name);
export const isImageTool = name => Object.prototype.hasOwnProperty.call(H, name);
const fileView = f => ({ file_id: f.id, filename: f.filename, size: f.size, type: f.type, url: f.url });
/** Execute a tool. Never throws: failures return { ok:false, error, code } where code is INVALID | UNAVAILABLE | FAILED. */
export async function runImageTool(name, args = {}) {
  if (!isImageTool(name)) return { ok: false, error: `Unknown image tool "${name}".`, code: "INVALID" };
  try {
    const r = await H[name](args && typeof args === "object" ? args : {}), res = r?.result || {}, files = (r?.files || []).map(fileView);
    return { ...res, ok: res.ok === undefined ? true : res.ok, ...(files.length ? { output_files: files } : {}) };
  } catch (e) {
    const code = e instanceof ToolError ? e.code : "FAILED";
    return { ok: false, tool: name, error: e && e.message ? e.message : String(e), code, ...(code === "UNAVAILABLE" ? { unavailable: true } : {}) };
  }
}
export function getImageToolStatus() { return { tools: DEFS.length, groups: [...new Set(DEFS.map(d => d.group))], vision_connected: hasVision(), translation_connected: !!(HOST.llm || HOST.translate) }; }

/* ──────────────────────────────── README ────────────────────────────────
 * import { imageToolDefinitions, isImageTool, runImageTool, configureImageTools, registerImageFile } from "./image-tools.js";
 *
 * 1. Wire storage (your existing upload store / output saver):
 *      configureImageTools({
 *        getFile: id => aiTools.getUploadedFile(id),                 // → File | Blob | { blob, name, type }
 *        saveOutput: async (blob, filename) => ({ id, url }),        // store the result, return its file id / download url
 *        vision: async ({ images, prompt, max_tokens }) => text,     // OR visionEndpoint: { url, model, apiKey }
 *        llm: async prompt => text,                                  // used by translate_image_text
 *        removeBackground: async pngBlob => pngBlobWithAlpha,        // optional custom ML engine
 *        superResolution: async (canvas, scale) => canvas,           // optional AI upscaler
 *      });
 * 2. Add the definitions:  toolDefinitions.push(...imageToolDefinitions);
 * 3. Dispatch in runTool:  if (isImageTool(name)) return runImageTool(name, args);
 *
 * Without a `getFile` hook, call registerImageFile(file, id) for each upload.
 * Honesty: a tool either performs the real operation or returns { ok:false, code:"UNAVAILABLE", error } naming the missing engine.
 */
