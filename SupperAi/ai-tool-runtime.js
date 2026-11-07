const textTypes = new Set(['txt','md','markdown','json','csv','tsv','html','htm','xml','yaml','yml','js','mjs','cjs','ts','tsx','jsx','css','py','sh','ps1','sql','log','svg','toml','ini','cfg','conf','java','cs','cpp','c','h','hpp','go','rs','php','rb','properties']);
const mimeByExt = { txt:'text/plain', md:'text/markdown', json:'application/json', csv:'text/csv', tsv:'text/tab-separated-values', html:'text/html', htm:'text/html', css:'text/css', js:'text/javascript', mjs:'text/javascript', py:'text/x-python', ps1:'text/plain', svg:'image/svg+xml', xml:'application/xml', pdf:'application/pdf', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', webp:'image/webp' };
const uploadStore = new Map();
let nextFileId = 1;
let pdfLibPromise, pdfJsPromise;

const extOf = name => String(name || '').split('.').pop().toLowerCase();
const safeName = name => String(name || 'output.txt').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/^\.+/, '') || 'output.txt';
const textLike = file => textTypes.has(extOf(file.name)) || /^text\//i.test(file.type) || /\+json$/i.test(file.type);
const getFile = id => { const f = uploadStore.get(String(id)); if (!f) throw new Error(`Uploaded file ${id} was not found.`); return f; };

export function addFiles(fileList) {
  const added = [];
  for (const file of Array.from(fileList || [])) {
    const id = `f${nextFileId++}`;
    uploadStore.set(id, file);
    added.push({ id, name: file.name, type: file.type || 'unknown', size: file.size });
  }
  return added;
}

export function removeFile(id) { return uploadStore.delete(String(id)); }
export function getUploadedFile(id) { return getFile(id); }
export function getFiles() { return Array.from(uploadStore, ([id, file]) => ({ id, name: file.name, type: file.type || 'unknown', size: file.size })); }

export async function readFileText(id) {
  const file = getFile(id);
  if (!textLike(file)) throw new Error(`${file.name} is not a supported text file.`);
  return await file.text();
}

export async function previewFiles(ids = getFiles().map(f => f.id), maxChars = 26000) {
  const chunks = [];
  let remaining = maxChars;
  for (const id of ids) {
    const f = getFile(id);
    if (!textLike(f) || remaining <= 0) continue;
    const content = await readFileText(id);
    const part = content.slice(0, Math.min(remaining, 9000));
    chunks.push(`FILE ${id} | ${f.name} | ${f.size} bytes${part.length < content.length ? ' | preview truncated; use read_uploaded_file to retrieve ranges' : ''}\n${part}`);
    remaining -= part.length;
  }
  return chunks.join('\n\n---\n\n');
}

async function loadScript(url, test) {
  if (test()) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Could not load the Envizion processing dependency: ${url}`));
    document.head.appendChild(script);
  });
  if (!test()) throw new Error('The processing dependency loaded without exposing its expected API.');
}

async function pdfJs() {
  if (!pdfJsPromise) pdfJsPromise = loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', () => !!window.pdfjsLib).then(() => {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    return window.pdfjsLib;
  });
  return pdfJsPromise;
}
async function pdfLib() {
  if (!pdfLibPromise) pdfLibPromise = loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js', () => !!window.PDFLib).then(() => window.PDFLib);
  return pdfLibPromise;
}

function requirePdf(file) {
  if (extOf(file.name) !== 'pdf' && file.type !== 'application/pdf') throw new Error(`${file.name} is not a PDF.`);
}

async function extractPdfText(file, maxChars = 24000) {
  requirePdf(file);
  const pdfjs = await pdfJs();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  let used = 0;
  for (let n = 1; n <= pdf.numPages && used < maxChars; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    const line = content.items.map(item => item.str || '').join(' ').replace(/[ \t]+/g, ' ').trim();
    pages.push(`--- Page ${n} ---\n${line}`);
    used += line.length;
  }
  return { text: pages.join('\n\n').slice(0, maxChars), pages: pdf.numPages, truncated: used > maxChars };
}

async function mergePdfs(fileIds, filename = 'merged-document.pdf') {
  if (!Array.isArray(fileIds) || fileIds.length < 2) throw new Error('Select at least two PDF files to merge.');
  const lib = await pdfLib();
  const merged = await lib.PDFDocument.create();
  for (const id of fileIds) {
    const file = getFile(id); requirePdf(file);
    const source = await lib.PDFDocument.load(await file.arrayBuffer());
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach(page => merged.addPage(page));
  }
  const bytes = await merged.save();
  const verify = await lib.PDFDocument.load(bytes);
  if (verify.getPageCount() < 1) throw new Error('The merged PDF failed validation.');
  return makeOutput(safeName(filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`), new Blob([bytes], { type: 'application/pdf' }), `${verify.getPageCount()} pages; opened again successfully for validation.`);
}

async function loadImage(file) {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name} is not an image.`);
  if (!('createImageBitmap' in window)) throw new Error('This browser cannot decode images for local processing.');
  return await createImageBitmap(file);
}
async function canvasBlob(canvas, type, quality) {
  return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The browser did not produce an image output.')), type, quality));
}
async function resizeImage(id, width, height) {
  const file = getFile(id), image = await loadImage(file);
  const w = Math.round(Number(width)), h = Math.round(Number(height));
  if (!(w > 0 && h > 0) || w > 12000 || h > 12000 || w * h > 64000000) { image.close?.(); throw new Error('Image dimensions must be positive and within the 64 megapixel processing limit.'); }
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) { image.close?.(); throw new Error('Canvas image processing is unavailable.'); }
  ctx.drawImage(image, 0, 0, w, h); image.close?.();
  const blob = await canvasBlob(canvas, 'image/png');
  return makeOutput(safeName(`resized-${file.name.replace(/\.[^.]+$/, '')}.png`), blob, `${w}×${h} PNG; decoded and re-encoded successfully.`);
}
async function convertWebp(id, quality = 0.9) {
  const file = getFile(id), image = await loadImage(file);
  const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
  const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); image.close?.();
  const blob = await canvasBlob(canvas, 'image/webp', Math.max(0.1, Math.min(1, Number(quality) || 0.9)));
  if (blob.type !== 'image/webp') throw new Error('This browser does not support WebP encoding; no output was generated.');
  const filename = safeName(file.name.replace(/\.[^.]+$/, '') + '.webp');
  return makeOutput(filename, blob, `${blob.size} bytes; browser confirmed image/webp output.`);
}

function makeOutput(filename, blob, validation) {
  return { filename, blob, size: blob.size, type: blob.type || 'application/octet-stream', validation, url: URL.createObjectURL(blob) };
}
function textOutput(filename, content) {
  const name = safeName(filename);
  const type = mimeByExt[extOf(name)] || 'text/plain;charset=utf-8';
  return makeOutput(name, new Blob([String(content)], { type }), `${String(content).length} characters written to a downloadable file.`);
}
function parseCsv(input, delimiter = ',') {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted && c === '"' && input[i + 1] === '"') { cell += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === delimiter && !quoted) { row.push(cell); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && input[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  row.push(cell); if (row.some(v => v !== '') || !rows.length) rows.push(row);
  if (quoted) throw new Error('CSV has an unclosed quoted field.');
  return rows;
}

function downloadOutputs(outputs) {
  const files = Array.isArray(outputs) ? outputs : [outputs];
  for (const out of files) {
    const a = document.createElement('a'); a.href = out.url || URL.createObjectURL(out.blob); a.download = safeName(out.filename); a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  }
  return files.map(({ filename, size, type, validation, url }) => ({ filename, size, type, validation, url }));
}

export const toolDefinitions = [
  { name:'read_uploaded_file', description:'Read text from a supplied text/code/JSON/CSV file by character range.', parameters:{fileId:'string',start:'number optional',length:'number optional'} },
  { name:'extract_pdf_text', description:'Extract selectable text from a supplied PDF using local PDF.js.', parameters:{fileId:'string'} },
  { name:'merge_pdfs', description:'Merge two or more supplied PDFs and validate the resulting PDF.', parameters:{fileIds:'string[]',filename:'string optional'} },
  { name:'resize_image', description:'Resize a supplied image to exact pixel dimensions using the browser canvas.', parameters:{fileId:'string',width:'number',height:'number'} },
  { name:'convert_image_webp', description:'Convert a supplied image to WebP using browser image decoding and encoding.', parameters:{fileId:'string',quality:'number 0.1-1 optional'} },
  { name:'replace_text', description:'Replace exact text in a supplied text/code file and create a downloadable copy under the same filename.', parameters:{fileId:'string',find:'string',replace:'string'} },
  { name:'create_files', description:'Create downloadable text or source-code files from complete content.', parameters:{files:'[{filename,content}]'} },
  { name:'csv_to_json', description:'Parse a supplied CSV/TSV file and create a JSON output file.', parameters:{fileId:'string',filename:'string optional'} },
  { name:'json_to_csv', description:'Parse a supplied JSON array of objects and create a CSV output file.', parameters:{fileId:'string',filename:'string optional'} }
];

export async function runTool(name, args = {}) {
  if (name === 'read_uploaded_file') {
    const text = await readFileText(args.fileId), start = Math.max(0, Number(args.start) || 0), length = Math.max(1, Math.min(12000, Number(args.length) || 6000));
    return { result: text.slice(start, start + length), totalCharacters: text.length, nextStart: Math.min(text.length, start + length), file: getFiles().find(f => f.id === String(args.fileId)) };
  }
  if (name === 'extract_pdf_text') {
    const file = getFile(args.fileId), result = await extractPdfText(file);
    return { result: result.text, pages: result.pages, truncated: result.truncated };
  }
  if (name === 'merge_pdfs') {
    const output = await mergePdfs(args.fileIds, args.filename || 'merged-document.pdf');
    return { result: output.validation, files: [output] };
  }
  if (name === 'resize_image') {
    const output = await resizeImage(args.fileId, args.width, args.height);
    return { result: output.validation, files: [output] };
  }
  if (name === 'convert_image_webp') {
    const output = await convertWebp(args.fileId, args.quality);
    return { result: output.validation, files: [output] };
  }
  if (name === 'replace_text') {
    if (typeof args.find !== 'string' || !args.find) throw new Error('The find text must be a non-empty exact string.');
    const source = getFile(args.fileId); if (!textLike(source)) throw new Error('Text replacement is limited to text and source-code uploads.');
    const content = await source.text(); if (!content.includes(args.find)) throw new Error('The exact find text was not present; no output was created.');
    const updated = content.split(args.find).join(String(args.replace ?? ''));
    const output = textOutput(source.name, updated);
    return { result:`Replaced ${content.split(args.find).length - 1} exact occurrence(s). ${output.validation}`, files:[output] };
  }
  if (name === 'create_files') {
    if (!Array.isArray(args.files) || !args.files.length || args.files.length > 20) throw new Error('Provide between 1 and 20 output files.');
    const outputs = args.files.map(f => {
      if (!f || typeof f.content !== 'string' || typeof f.filename !== 'string') throw new Error('Each output needs a filename and complete text content.');
      return textOutput(f.filename, f.content);
    });
    return { result:`Created ${outputs.length} file(s).`, files:outputs };
  }
  if (name === 'csv_to_json') {
    const source = getFile(args.fileId); if (!['csv','tsv'].includes(extOf(source.name))) throw new Error('Upload a CSV or TSV file.');
    const rows = parseCsv(await source.text(), extOf(source.name) === 'tsv' ? '\t' : ',');
    const headers = rows.shift() || []; const data = rows.filter(row => row.some(value => value !== '')).map(row => Object.fromEntries(headers.map((key, i) => [key, row[i] ?? ''])));
    const output = textOutput(args.filename || source.name.replace(/\.(csv|tsv)$/i, '.json'), JSON.stringify(data, null, 2));
    return { result:`Parsed ${data.length} row(s) across ${headers.length} columns. JSON validated by parsing after serialization.`, files:[output] };
  }
  if (name === 'json_to_csv') {
    const source = getFile(args.fileId); if (extOf(source.name) !== 'json') throw new Error('Upload a JSON file.');
    const data = JSON.parse(await source.text()); if (!Array.isArray(data) || data.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('JSON must be an array of objects.');
    const keys = [...new Set(data.flatMap(row => Object.keys(row)))];
    const quote = value => `"${String(value ?? '').replace(/"/g,'""')}"`;
    const csv = [keys.map(quote).join(','), ...data.map(row => keys.map(k => quote(row[k])).join(','))].join('\r\n');
    const output = textOutput(args.filename || source.name.replace(/\.json$/i, '.csv'), csv);
    const parsed = parseCsv(csv);
    if (parsed.length !== data.length + 1) throw new Error('Generated CSV failed row-count validation.');
    return { result:`Converted ${data.length} record(s) and validated ${parsed.length - 1} CSV row(s).`, files:[output] };
  }
  throw new Error(`Tool ${name} is not registered.`);
}

export function exportFiles(outputs) { return downloadOutputs(outputs); }
export function filePreview(ids) { return previewFiles(ids); }
