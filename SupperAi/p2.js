
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
