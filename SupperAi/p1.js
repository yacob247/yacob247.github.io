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
  const blob = await encode(cv, fmt, { quality: a.quality ?? o.quality, background: a.background_color });
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
function quantizeFrame(d, dither) {
  const { width: w, height: h, data } = d, trans = hasAlpha(d) && (() => { for (let i = 3; i < data.length; i += 4) if (data[i] < 128) return true; return false; })();
  let pal = medianCut(samplePixels(d, 60000), trans ? 255 : 256); if (!pal.length) pal = [{ r: 0, g: 0, b: 0, count: 1 }];
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
