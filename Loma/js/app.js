import { Engine } from './engine.js';
import { State }  from './main.js';
import { Trainer } from './training.js';

// ═══════════════════════════════════════════════════════════════════════════════
//  app.js — THE SINGLE DOM owner. All event binding lives here and ONLY here.
//  Handles: input submission, file/image attach (real base64 vision),
//           web search grounding, canvas helpers, tool bridge,
//           self-learning brain, toast, sidebar toggles, model selector.
//  Does NOT: bind events in main.js, duplicate API_URL, call btoa unsafely.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GLOBAL FLAGS ─────────────────────────────────────────────────────────────
window.autoScrollChat   = true;
window._lomaActiveModel = localStorage.getItem('loma_active_model') || 'qwen2.5-coder:7b';

let isWebSearchEnabled     = localStorage.getItem('loma_web_search') === 'true';
let attachedFileContent    = null;
let attachedFileName       = null;
let attachedImageDataUrl   = null;   // real image for vision
let liveCanvasTimeout      = null;
let _charCountTimer        = null;

// ─── API URL — single source of truth (engine.js uses Engine.API_URL) ─────────
const ENVIZION_API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? `http://${location.host}/api/chat`
    : 'https://api.envizion.work/api/chat';

// ═══════════════════════════════════════════════════════════════════════════════
//  1. MAIN INPUT HANDLER — the ONLY place that calls Engine.submitPrompt()
// ═══════════════════════════════════════════════════════════════════════════════
window.processInputMessage = async () => {
    const input   = document.getElementById('user-prompt') || document.getElementById('prompt-input');
    const userMsg = (input?.value || '').trim();

    // Allow submit if there's text OR an image attached
    if (!userMsg && !attachedImageDataUrl) return;

    const msgToSend = userMsg || '(image attached)';
    if (input) { input.value = ''; input.style.height = 'auto'; input.dispatchEvent(new Event('input')); }

    let finalMsg = msgToSend;

    // Prepend attached text file
    if (attachedFileContent) {
        finalMsg = `Attached File: "${attachedFileName}"\n\`\`\`\n${attachedFileContent}\n\`\`\`\n\n${msgToSend}`;
        attachedFileContent = null;
        attachedFileName    = null;
        document.getElementById('attached-file-pill')?.classList.replace('flex', 'hidden');
    }

    // Pass image to engine via window flag (engine reads and clears it)
    if (attachedImageDataUrl) {
        window._lomaAttachedImageDataUrl = attachedImageDataUrl;
        attachedImageDataUrl = null;
        document.getElementById('attached-image-preview')?.classList.add('hidden');
        _clearImagePreview();
    }

    // Smart search grounding
    const intent = _classifySearchIntent(userMsg);
    if (intent.search || isWebSearchEnabled) {
        _appendStatusPill('fa-magnifying-glass', 'Searching the web…');
        let grounding = '';

        if (intent.crawlHint) {
            const url = intent.crawlHint.startsWith('http') ? intent.crawlHint : `https://${intent.crawlHint}`;
            _appendStatusPill('fa-code', `Reading ${url.substring(0, 40)}…`);
            const page = await _crawlPageContent(url);
            if (page) grounding += `[Direct page read: ${url}]\n${page}\n\n`;
        }

        const webResult = await _fetchSmartGrounding(userMsg, !!intent.crawl);
        if (webResult) grounding += webResult;

        _removeStatusPill();
        if (grounding.trim()) {
            finalMsg = `[WEB CONTEXT — use this to produce a better answer than anything online]:\n${grounding.trim()}\n\n[USER REQUEST]\n${finalMsg}`;
            _appendStatusPill('fa-bolt', 'Web context ready.', 'text-emerald-400');
            setTimeout(_removeStatusPill, 2500);

            // Save to memory as web category (not mixed with personal facts)
            const entry = `[Web: ${userMsg.substring(0, 60)}] ${grounding.substring(0, 200)}`;
            if (window.State) {
                State.addMemory(entry, 'web');
            }
        } else {
            _removeStatusPill();
        }
    }

    Engine.submitPrompt(finalMsg);
};

// expose clear for engine.js
window._clearImagePreview = _clearImagePreview;
function _clearImagePreview() {
    attachedImageDataUrl = null;
    const prev = document.getElementById('attached-image-preview');
    if (prev) prev.classList.add('hidden');
    const img = document.getElementById('attached-image-thumb');
    if (img) img.src = '';
}

// ═══════════════════════════════════════════════════════════════════════════════
//  2. FILE & IMAGE ATTACHMENT
// ═══════════════════════════════════════════════════════════════════════════════
window.triggerProtectedFileAttachment = () => {
    document.getElementById('file-upload-input')?.click();
};

window.handleFileAttachment = async (input) => {
    const file = input.files[0];
    if (!file) return;
    input.value = '';

    if (file.size > 20 * 1024 * 1024) {
        _toast('File too large', 'Max 20 MB.', 'fa-triangle-exclamation', 'bg-red-600');
        return;
    }

    const textTypes  = /\.(txt|md|csv|json|js|ts|jsx|tsx|py|html|css|xml|yaml|yml|toml|sh|bash|c|cpp|h|java|go|rs|rb|php|sql|log|env|ini|cfg|conf|svg|vue|svelte|r|m|ipynb)$/i;
    const imageTypes = /\.(png|jpg|jpeg|gif|webp|bmp|ico|tiff)$/i;

    try {
        attachedFileName = file.name;

        if (imageTypes.test(file.name) || file.type.startsWith('image/')) {
            // Real image attachment — stored as data URL for vision
            const dataUrl = await _readFileAsDataURL(file);
            attachedImageDataUrl = dataUrl;

            // Show image preview below input
            const prev = document.getElementById('attached-image-preview');
            const img  = document.getElementById('attached-image-thumb');
            if (prev && img) {
                img.src = dataUrl;
                prev.classList.remove('hidden');
            } else {
                // Create inline preview if elements don't exist in HTML
                _showInlineImagePreview(dataUrl, file.name);
            }

            // Show file pill too
            document.getElementById('attached-file-pill')?.classList.replace('hidden', 'flex');
            const nameEl = document.getElementById('attached-file-name');
            if (nameEl) nameEl.innerText = `📷 ${file.name}`;
            _toast('Image attached', `${file.name} ready for vision analysis.`, 'fa-image', 'bg-indigo-600');

        } else if (textTypes.test(file.name) || file.type.startsWith('text/')) {
            attachedFileContent = await file.text();
            document.getElementById('attached-file-pill')?.classList.replace('hidden', 'flex');
            const nameEl = document.getElementById('attached-file-name');
            if (nameEl) nameEl.innerText = file.name;
            _toast('File attached', `${file.name} ready.`, 'fa-file-lines', 'bg-emerald-600');

        } else {
            // Binary — read as base64 excerpt
            const b64 = await _readFileAsB64(file);
            attachedFileContent = `[BINARY FILE: ${file.name} (${file.type || 'unknown'}, ${(file.size / 1024).toFixed(1)}KB)]\nBase64 excerpt: ${b64.substring(0, 1000)}`;
            document.getElementById('attached-file-pill')?.classList.replace('hidden', 'flex');
            const nameEl = document.getElementById('attached-file-name');
            if (nameEl) nameEl.innerText = file.name;
            _toast('File attached', `${file.name} ready.`, 'fa-file-lines', 'bg-emerald-600');
        }
    } catch {
        _toast('Read error', 'Could not read file.', 'fa-triangle-exclamation', 'bg-red-600');
    }
};

function _showInlineImagePreview(dataUrl, name) {
    // Remove existing
    document.getElementById('loma-inline-img-preview')?.remove();

    const inputArea = document.querySelector('.relative.bg-gemini-inputBg');
    if (!inputArea) return;

    const wrapper = document.createElement('div');
    wrapper.id        = 'loma-inline-img-preview';
    wrapper.className = 'flex items-center gap-2 px-4 pt-2';
    wrapper.innerHTML = `
        <div class="relative inline-block">
            <img src="${dataUrl}" class="h-16 w-16 object-cover rounded-xl border border-gemini-border/40">
            <button onclick="window.clearFileAttachment()"
                class="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <span class="text-[11px] text-slate-400 truncate max-w-[120px]">${name}</span>`;
    inputArea.prepend(wrapper);
}

window.clearFileAttachment = () => {
    attachedFileContent  = null;
    attachedFileName     = null;
    attachedImageDataUrl = null;
    window._lomaAttachedImageDataUrl = null;
    document.getElementById('attached-file-pill')?.classList.replace('flex', 'hidden');
    document.getElementById('attached-image-preview')?.classList.add('hidden');
    document.getElementById('loma-inline-img-preview')?.remove();
};

function _readFileAsDataURL(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}
function _readFileAsB64(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3. SMART SEARCH INTENT CLASSIFIER
// ═══════════════════════════════════════════════════════════════════════════════
function _classifySearchIntent(msg) {
    const m = msg.toLowerCase();

    const neverSearch = [
        /^(hi|hello|hey|sup|good (morning|afternoon|evening))/,
        /^\d[\d\s+\-*/()=]+$/,
        /^(write|compose|draft).{0,30}(poem|story|essay|song|haiku|letter|joke)/,
        /^(edit|fix|update|refactor|debug|improve) (this|my|the) (code|function|script|file|html)/,
        /^(translate|summarize|rewrite|paraphrase)/,
    ];
    for (const r of neverSearch) if (r.test(m)) return { search: false };

    const urlRef = m.match(/(?:like|similar to|inspired by|based on)\s+([\w.-]+\.(?:com|io|dev|net|org|co))/);
    if (urlRef) return { search: true, crawl: true, crawlHint: urlRef[1] };
    if (/https?:\/\//.test(msg)) return { search: true, crawl: true, crawlHint: msg.match(/https?:\/\/[^\s]+/)?.[0] };

    if (/(latest|newest|current|today|2024|2025|2026|this year|right now|news|trending|update|release|version|price|cost|how much|stock|weather|score)/i.test(m))
        return { search: true, crawl: false };

    const isBuild    = /(build|make|create|generate|implement|develop)/i.test(m);
    const hasRealTool = /(stripe|firebase|supabase|react|vue|next|tailwind|three\.?js|chart\.?js|gsap|shadcn|clerk|vercel|openai|api|sdk|library|framework|plugin|shopify|wordpress)/i.test(m);
    if (isBuild && hasRealTool) return { search: true, crawl: true };
    if (isBuild && /(tool|app|website|dashboard|landing page|portfolio|saas|clone|like|similar)/i.test(m))
        return { search: true, crawl: false };
    if (/(how (do|does|to)|best way to|tutorial|guide|example).{0,60}(ai|llm|gpt|claude|gemini|ollama|docker|kubernetes|rust|bun|deno|wasm|webgpu|webrtc)/i.test(m))
        return { search: true, crawl: false };

    return { search: false };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  4. WEB SEARCH + CRAWL
// ═══════════════════════════════════════════════════════════════════════════════
async function _fetchSmartGrounding(query, isBuildRequest = false) {
    const googleKey = localStorage.getItem('envizion_google_key');
    const googleCx  = localStorage.getItem('envizion_google_cx');

    if (googleKey && googleCx) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${googleKey}&cx=${googleCx}&q=${encodeURIComponent(query)}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.items?.length > 0) {
                    let out = `[Google Search: "${query}"]\n`;
                    const top = data.items.slice(0, 4);
                    top.forEach((item, i) => { out += `Result ${i + 1}: ${item.title}\nURL: ${item.link}\nSummary: ${item.snippet}\n\n`; });
                    if (isBuildRequest && top[0]?.link) {
                        const page = await _crawlPageContent(top[0].link);
                        if (page) out += `[Crawled: ${top[0].link}]\n${page}\n`;
                    }
                    if (window.lomaAutoCrawlSearchResults) {
                        window.lomaAutoCrawlSearchResults(top.map(i => i.link).filter(Boolean));
                    }
                    return out;
                }
            }
        } catch { /* fall through */ }
    }

    // Fallback: SearX
    const proxy = 'https://api.allorigins.win/get?url=';
    try {
        const searchUrl = `https://searx.be/search?q=${encodeURIComponent(query)}&format=json&categories=general`;
        const res  = await fetch(`${proxy}${encodeURIComponent(searchUrl)}`, { signal: AbortSignal.timeout(8000) });
        const data = JSON.parse((await res.json()).contents);
        if (!data.results?.length) return '';

        let out = `[Web Search: "${query}"]\n`;
        const top = data.results.slice(0, 4);
        top.forEach((item, i) => { out += `Result ${i + 1}: ${item.title}\nURL: ${item.url}\nSummary: ${item.content}\n\n`; });
        if (isBuildRequest && top[0]?.url) {
            const page = await _crawlPageContent(top[0].url);
            if (page) out += `[Crawled: ${top[0].url}]\n${page}\n`;
        }
        if (window.lomaAutoCrawlSearchResults) {
            window.lomaAutoCrawlSearchResults(top.map(i => i.url).filter(Boolean));
        }
        return out;
    } catch {
        // Last resort: Wikipedia
        try {
            const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.split(' ').slice(0, 3).join('_'))}`;
            const wRes = await fetch(wikiUrl, { signal: AbortSignal.timeout(6000) });
            if (wRes.ok) {
                const w = await wRes.json();
                return w.extract ? `[Wikipedia: ${w.title}]\n${w.extract}` : '';
            }
        } catch { /* silent */ }
        return '';
    }
}

async function _crawlPageContent(url) {
    const proxy = 'https://api.allorigins.win/get?url=';
    try {
        const res = await fetch(`${proxy}${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(10000) });
        const raw = (await res.json()).contents || '';
        const tmp = document.createElement('div');
        tmp.innerHTML = raw;
        tmp.querySelectorAll('script,style,nav,footer,header,aside,iframe,noscript').forEach(el => el.remove());
        const codeSamples = [];
        tmp.querySelectorAll('pre,code').forEach(el => {
            const t = (el.innerText || el.textContent || '').trim();
            if (t.length > 50) codeSamples.push(t.substring(0, 800));
        });
        const bodyText = (tmp.innerText || tmp.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 1200);
        let result = bodyText;
        if (codeSamples.length > 0) result += `\n\nCode found:\n${codeSamples.slice(0, 2).join('\n---\n')}`;
        return result.length > 100 ? result : '';
    } catch { return ''; }
}

window.toggleWebSearch = () => {
    isWebSearchEnabled = !isWebSearchEnabled;
    localStorage.setItem('loma_web_search', isWebSearchEnabled);
    const cb = document.getElementById('web-search-toggle');
    if (cb) cb.checked = isWebSearchEnabled;
    _toast('Web Search', isWebSearchEnabled ? 'Live grounding enabled.' : 'Grounding disabled.', 'fa-globe', 'bg-indigo-600');
};

// ═══════════════════════════════════════════════════════════════════════════════
//  5. CANVAS HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
window.updateCanvasLive = (code, isFinal) => {
    const codeView = document.getElementById('live-canvas-code');
    if (codeView) codeView.innerText = code;

    if (!isFinal) {
        window.toggleCanvasVisibility?.(true);
        clearTimeout(liveCanvasTimeout);
        liveCanvasTimeout = setTimeout(() => {
            const frame = document.getElementById('live-canvas-frame');
            if (frame) frame.srcdoc = code;
        }, 80);
    } else {
        window.UI?.updateCanvas?.(code);
    }
};

window.lomaOpenCodeInCanvas = (code, lang) => {
    const isHtml = (lang === 'html' || lang === 'html5') &&
        (code.includes('<html') || code.includes('<div') || code.includes('<body') || code.includes('<canvas'));
    if (isHtml) { window.UI?.updateCanvas?.(code); return; }

    const escaped  = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const canRunJS = lang === 'javascript' || lang === 'js';
    const renderable = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Loma · ${lang}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0d0e10;color:#e2e8f0;font-family:'Courier New',monospace;display:flex;flex-direction:column;height:100vh}
.hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#16181c;border-bottom:1px solid #2a2d33;font-size:11px;color:#6b7280;flex-shrink:0}
.badge{background:#a8c7fa22;color:#a8c7fa;border:1px solid #a8c7fa44;padding:2px 8px;border-radius:99px;font-weight:700;text-transform:uppercase;font-size:10px}
.run-btn{background:#4ade8022;color:#4ade80;border:1px solid #4ade8044;padding:4px 14px;border-radius:6px;font-size:11px;cursor:pointer;transition:.2s}
.run-btn:hover{background:#4ade8044}
pre{margin:0;padding:20px;font-size:13px;line-height:1.75;overflow:auto;flex:1;white-space:pre-wrap;word-break:break-word}
.out-zone{border-top:1px solid #2a2d33;padding:14px;background:#0a0b0d;font-size:12px;color:#4ade80;min-height:64px;display:none;flex-shrink:0}
.out-zone.on{display:block}
</style></head>
<body>
<div class="hdr">
  <span>loma · <span class="badge">${lang}</span></span>
  ${canRunJS ? '<button class="run-btn" onclick="runCode()">▶ Run</button>' : '<span style="color:#4b5563">read-only</span>'}
</div>
<pre id="code-el">${escaped}</pre>
<div class="out-zone" id="out"></div>
${canRunJS ? `<script>
function runCode(){
    const out = document.getElementById('out');
    out.classList.add('on');
    out.textContent = '';
    const origLog = console.log;
    console.log = (...a) => { out.textContent += a.join(' ') + '\\n'; origLog(...a); };
    try { eval(document.getElementById('code-el').textContent); }
    catch(e){ out.style.color='#f87171'; out.textContent = 'Error: '+e.message; }
    console.log = origLog;
}
<\/script>` : ''}
</body></html>`;
    window.UI?.updateCanvas?.(renderable);
};

// ═══════════════════════════════════════════════════════════════════════════════
//  6. MODEL SELECTOR
// ═══════════════════════════════════════════════════════════════════════════════
window.selectModel = (modelId, label) => {
    window._lomaActiveModel = modelId;
    localStorage.setItem('loma_active_model', modelId);
    const pill = document.getElementById('model-pill-label');
    if (pill) pill.textContent = label;
    // Update dots
    document.querySelectorAll('.model-dot').forEach(d => {
        const isActive = d.getAttribute('data-model') === modelId;
        d.className = `w-2 h-2 rounded-full flex-shrink-0 model-dot ${isActive ? 'bg-emerald-400' : 'bg-indigo-400/40'}`;
    });
    window.toggleModelDropdown(false);
    _toast('Model switched', `Now using: ${label}`, 'fa-microchip', 'bg-indigo-600');
};

window.toggleModelDropdown = (force) => {
    const dd = document.getElementById('model-dropdown');
    if (!dd) return;
    const shouldShow = force !== undefined ? force : dd.classList.contains('hidden');
    dd.classList.toggle('hidden', !shouldShow);
};

// Close dropdown on outside click
document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('model-selector-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        document.getElementById('model-dropdown')?.classList.add('hidden');
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  7. TOAST NOTIFICATION
// ═══════════════════════════════════════════════════════════════════════════════
function _toast(title, desc, icon = 'fa-bell', bg = 'bg-emerald-600') {
    const toast   = document.getElementById('alert-toast');
    const titleEl = document.getElementById('alert-title');
    const descEl  = document.getElementById('alert-desc');
    const iconEl  = document.getElementById('alert-icon');
    const iconWr  = document.getElementById('alert-icon-wrapper');
    if (!toast) return;

    if (titleEl) titleEl.textContent = title;
    if (descEl)  descEl.textContent  = desc;
    if (iconEl)  iconEl.className    = `fa-solid ${icon}`;
    if (iconWr)  iconWr.className    = `h-10 w-10 rounded-full flex items-center justify-center text-white text-lg ${bg}`;

    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}
window.triggerNotificationToast = _toast;

function _appendStatusPill(icon, text, colorClass = 'text-blue-400') {
    _removeStatusPill();
    const stream = document.getElementById('chat-stream');
    if (!stream) return;
    const pill = document.createElement('div');
    pill.id = 'loma-status-pill';
    pill.className = `flex items-center gap-2 text-xs ${colorClass} px-4 py-2 animate-pulse`;
    pill.innerHTML = `<i class="fa-solid ${icon} fa-spin"></i><span>${text}</span>`;
    stream.appendChild(pill);
    stream.scrollTop = stream.scrollHeight;
}
function _removeStatusPill() {
    document.getElementById('loma-status-pill')?.remove();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  8. TOOL BRIDGE (image gen, music gen via Pollinations iframe)
// ═══════════════════════════════════════════════════════════════════════════════
function _callTool(iframeId, requestType, responseType, payload) {
    return new Promise((resolve, reject) => {
        let iframe = document.getElementById(iframeId);
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = iframeId;
            iframe.style.cssText = 'position:fixed;bottom:-1px;right:-1px;width:1px;height:1px;opacity:0;pointer-events:none;border:none;';
            const src = iframeId === 'image-gen'
                ? './loma-tool-bridge.html?tool=image'
                : './loma-tool-bridge.html?tool=music';
            iframe.src = src;
            document.body.appendChild(iframe);
        }

        const timeout = setTimeout(() => reject(new Error('Tool timeout after 30s')), 30000);
        const handler = (e) => {
            if (e.data?.type === responseType) {
                clearTimeout(timeout);
                window.removeEventListener('message', handler);
                if (e.data.error) reject(new Error(e.data.error));
                else resolve(e.data);
            }
        };
        window.addEventListener('message', handler);
        iframe.contentWindow?.postMessage({ type: requestType, ...payload }, '*');
    });
}

window.lomaGenerateMusic = (prompt, opts = {}) =>
    _callTool('music-gen', 'LOMA_MUSIC_REQUEST', 'LOMA_MUSIC_RESULT', { prompt, ...opts });

window.lomaGenerateImage = (prompt, opts = {}) =>
    _callTool('image-gen', 'LOMA_IMAGE_REQUEST', 'LOMA_IMAGE_RESULT', { prompt, ...opts });

// ── Post-process tool tags after stream ends ──────────────────────────────────
const MUSIC_TAG_RE = /\[GENERATE_MUSIC:\s*([^\]]+)\]/gi;
const IMAGE_TAG_RE = /\[GENERATE_IMAGE:\s*([^\]]+)\]/gi;

function _parseTagAttrs(str) {
    const out = {};
    const re  = /(\w+)=(?:"([^"]*)"|([\w\d.\-]+))/g;
    let m;
    while ((m = re.exec(str)) !== null) out[m[1]] = m[2] !== undefined ? m[2] : m[3];
    return out;
}

window.lomaProcessToolTags = async (replyText, outputEl) => {
    let processed = replyText;
    const parseContent = text => window.UI?.processContent?.(text) ?? text;

    for (const match of [...replyText.matchAll(MUSIC_TAG_RE)]) {
        const attrs = _parseTagAttrs(match[1]);
        const placeholder = `<span class="loma-tool-pending"><i class="fa-solid fa-spinner fa-spin text-blue-400 mr-2"></i>Generating music: "${attrs.prompt}"…</span>`;
        processed = processed.replace(match[0], placeholder);
        if (outputEl) outputEl.innerHTML = parseContent(processed);
        try {
            const result = await window.lomaGenerateMusic(attrs.prompt, {
                style: attrs.style, bpm: parseInt(attrs.bpm) || 90,
                key: attrs.key || '', duration: parseInt(attrs.duration) || 30
            });
            const html = `<div class="my-3 p-3 bg-[#16181c] border border-[#2a2d33] rounded-xl text-xs">
                <div class="text-[10px] text-gray-500 uppercase mb-2">🎵 Generated Music</div>
                <audio controls class="w-full" src="${result.audioUrl}"></audio>
                <div class="text-[10px] text-gray-600 mt-2">${result.prompt} · ${result.duration}s</div>
            </div>`;
            processed = processed.replace(placeholder, html);
            if (window.lomaLearnFromMusic) window.lomaLearnFromMusic({ prompt: attrs.prompt, bpm: attrs.bpm, key: attrs.key, style: attrs.style });
        } catch (err) {
            processed = processed.replace(placeholder, `<span class="text-red-400 text-xs">⚠ Music failed: ${err.message}</span>`);
        }
        if (outputEl) outputEl.innerHTML = parseContent(processed);
    }

    for (const match of [...replyText.matchAll(IMAGE_TAG_RE)]) {
        const attrs = _parseTagAttrs(match[1]);
        // Apply prompt enhancement if available
        const enhancedPrompt = window.lomaBuildEnhancedImagePrompt?.(attrs.prompt) || attrs.prompt;
        const placeholder = `<span class="loma-tool-pending"><i class="fa-solid fa-spinner fa-spin text-blue-400 mr-2"></i>Generating image…</span>`;
        processed = processed.replace(match[0], placeholder);
        if (outputEl) outputEl.innerHTML = parseContent(processed);
        try {
            const result = await window.lomaGenerateImage(enhancedPrompt, {
                style: attrs.style || 'flux', ratio: attrs.ratio || '1024x1024',
                enhance: attrs.enhance !== 'false', nologo: true
            });
            // Save to session image gallery
            _saveImageToGallery(result.imageData || result.imageUrl, enhancedPrompt);

            const html = `<div class="my-4 max-w-lg">
                <div class="rounded-xl overflow-hidden border border-[#2e2f30] bg-[#0c0d12]">
                    <img src="${result.imageData || result.imageUrl}" alt="${enhancedPrompt}" class="w-full block" loading="lazy">
                </div>
                <div class="flex justify-between items-center mt-2">
                    <p class="text-[10px] text-gray-500 truncate flex-1 mr-2">${enhancedPrompt}</p>
                    <div class="flex gap-2 shrink-0">
                        <a href="${result.imageData || result.imageUrl}" download="loma-${Date.now()}.png"
                           class="text-[10px] text-blue-400 px-2 py-1 bg-[#1a1b1c] border border-[#2e2f30] rounded hover:bg-[#2a2d33] transition">Save</a>
                        <button onclick="window.lomaRegenerateImage(this, '${encodeURIComponent(enhancedPrompt)}')"
                            class="text-[10px] text-slate-400 px-2 py-1 bg-[#1a1b1c] border border-[#2e2f30] rounded hover:bg-[#2a2d33] transition">↻</button>
                    </div>
                </div>
            </div>`;
            processed = processed.replace(placeholder, html);
            if (window.lomaLearnFromImage) window.lomaLearnFromImage({ prompt: enhancedPrompt, style: attrs.style || 'flux' });
        } catch (err) {
            processed = processed.replace(placeholder, `<span class="text-red-400 text-xs">⚠ Image failed: ${err.message}</span>`);
        }
        if (outputEl) outputEl.innerHTML = parseContent(processed);
    }

    return processed;
};

// ── Image gallery (persists across reload) ────────────────────────────────────
const _IMG_GALLERY_KEY = 'loma_image_gallery';
function _saveImageToGallery(src, prompt) {
    try {
        const gallery = JSON.parse(localStorage.getItem(_IMG_GALLERY_KEY) || '[]');
        gallery.unshift({ src, prompt, ts: Date.now() });
        if (gallery.length > 50) gallery.pop();
        localStorage.setItem(_IMG_GALLERY_KEY, JSON.stringify(gallery));
    } catch { /* storage full */ }
}

window.lomaRegenerateImage = async (btn, encodedPrompt) => {
    const prompt = decodeURIComponent(encodedPrompt);
    const container = btn.closest('.my-4');
    if (!container) return;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    try {
        const result = await window.lomaGenerateImage(prompt, { style: 'flux', ratio: '1024x1024', nologo: true });
        const img = container.querySelector('img');
        if (img) img.src = result.imageData || result.imageUrl;
        _saveImageToGallery(result.imageData || result.imageUrl, prompt);
        btn.innerHTML = '↻';
    } catch (e) {
        btn.innerHTML = '⚠';
        btn.title = e.message;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  9. SELF-LEARNING BRAIN
// ═══════════════════════════════════════════════════════════════════════════════
const _MEM = {
    CODE:    'loma_code_patterns',
    IMAGE:   'loma_image_memory',
    MUSIC:   'loma_music_memory',
    CRAWL:   'loma_crawl_cache',
    IMPROVE: 'loma_improve_log',
};
const _loadMem = key => { try { return JSON.parse(localStorage.getItem(key) || 'null') || []; } catch { return []; } };
const _saveMem = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)); } catch {} };

let _codeMem    = _loadMem(_MEM.CODE);
let _imageMem   = _loadMem(_MEM.IMAGE);
let _musicMem   = _loadMem(_MEM.MUSIC);
let _crawlCache = _loadMem(_MEM.CRAWL);
let _improveLog = _loadMem(_MEM.IMPROVE);

function _detectLang(code) {
    if (/<(html|div|nav|section|header|button|canvas|svg)/i.test(code)) return 'html';
    if (/\{[^}]*:[^}]*\}/s.test(code) && !code.includes('function')) return 'css';
    if (/#include|std::|cout|int main|void |class \w+\s*\{/.test(code)) return 'cpp';
    if (/def |import |print\(|class \w+:/.test(code)) return 'python';
    if (/SELECT|INSERT|UPDATE|DELETE|FROM|WHERE/i.test(code)) return 'sql';
    if (/function |const |let |=>|async |await |\.then/.test(code)) return 'javascript';
    return 'text';
}
function _scoreCode(code) {
    let s = 0.4;
    const len = code.length;
    if (len > 200)  s += 0.1;
    if (len > 600)  s += 0.1;
    if (len > 1200) s += 0.1;
    if (/function|class|def |const /.test(code)) s += 0.1;
    if (code.includes('return'))  s += 0.05;
    if (/\/\/|\/\*|#/.test(code)) s += 0.05;
    if (/TODO|placeholder|lorem ipsum/i.test(code)) s -= 0.2;
    if (code.split('\n').length < 3) s -= 0.1;
    return Math.min(1, Math.max(0, s));
}

window.lomaLearnFromCode = (code, lang) => {
    if (!code || code.length < 30) return;
    const q    = _scoreCode(code);
    const tok  = Math.round(code.split(/\s+/).length * 1.3);
    const better = _codeMem.filter(p => p.lang === lang && (p.quality > q + 0.1 || p.tokens < tok * 0.7)).slice(0, 3);
    if (better.length > 0) {
        const note = `[LOMA LEARNING] Found ${better.length} better ${lang} patterns. Apply next time.`;
        _improveLog.push({ ts: Date.now(), lang, note, myQ: q, bestQ: Math.max(...better.map(p => p.quality)) });
        if (_improveLog.length > 500) _improveLog = _improveLog.slice(-500);
        _saveMem(_MEM.IMPROVE, _improveLog);
    }
    _codeMem.push({ lang, code: code.slice(0, 2000), quality: q, tokens: tok, source: 'self-generated', ts: Date.now() });
    if (_codeMem.length > 1000) _codeMem = _codeMem.slice(-1000);
    _saveMem(_MEM.CODE, _codeMem);
};

window.lomaLearnFromImage = imgData => {
    if (!imgData?.prompt) return;
    let q = 0.4;
    if (imgData.prompt.length > 50)  q += 0.1;
    if (imgData.prompt.length > 100) q += 0.1;
    if (/photorealistic|detailed|8k|cinematic|lighting|depth/.test(imgData.prompt)) q += 0.15;
    if (imgData.prompt.split(',').length > 4) q += 0.1;
    _imageMem.push({ ...imgData, quality: q, ts: Date.now() });
    if (_imageMem.length > 300) _imageMem = _imageMem.slice(-300);
    _saveMem(_MEM.IMAGE, _imageMem);
};

window.lomaLearnFromMusic = data => {
    if (!data?.prompt) return;
    let q = 0.4;
    if (data.bpm)   q += 0.1;
    if (data.key)   q += 0.1;
    if (data.style) q += 0.1;
    if (data.prompt.length > 30) q += 0.1;
    if (/melody|bass|reverb|delay/.test(data.prompt)) q += 0.1;
    _musicMem.push({ ...data, quality: q, ts: Date.now() });
    if (_musicMem.length > 200) _musicMem = _musicMem.slice(-200);
    _saveMem(_MEM.MUSIC, _musicMem);
};

window.lomaBuildEnhancedImagePrompt = raw => {
    if (_imageMem.length < 5) return raw;
    const top   = [..._imageMem].sort((a, b) => b.quality - a.quality).slice(0, 5);
    const terms = ['photorealistic','cinematic','detailed','8k','high resolution','sharp focus','professional lighting','depth of field'];
    const allW  = top.map(p => p.prompt).join(' ');
    const found = terms.filter(t => allW.toLowerCase().includes(t) && !raw.toLowerCase().includes(t));
    return found.length > 0 ? `${raw}, ${found.slice(0, 2).join(', ')}` : raw;
};

window.lomaBuildEnhancedMusicPrompt = (raw, style) => {
    if (_musicMem.length < 3) return raw;
    const similar = _musicMem.filter(m => !style || m.style === style).sort((a, b) => b.quality - a.quality).slice(0, 3);
    if (!similar.length) return raw;
    const richTerms = ['reverb','warm','layered','deep bass','high fidelity','melodic','harmonic','stereo','spacious','punchy'];
    const allBest   = similar.map(m => m.prompt).join(' ').toLowerCase();
    const found     = richTerms.filter(t => allBest.includes(t) && !raw.toLowerCase().includes(t));
    return found.length > 0 ? `${raw}, ${found.slice(0, 2).join(', ')}` : raw;
};

window.lomaGetLearningContext = () => {
    let ctx = '';
    if (_improveLog.length > 0) {
        ctx += '\n\n--- LOMA SELF-LEARNING NOTES ---\n';
        _improveLog.slice(-5).forEach(l => { ctx += `• ${l.note}\n`; });
    }
    const langCounts = {};
    _codeMem.forEach(p => { langCounts[p.lang] = (langCounts[p.lang] || 0) + 1; });
    const topLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([l]) => l);
    if (topLangs.length > 0) ctx += `\n• Studied ${_codeMem.length} code patterns (${topLangs.join(', ')}). Use most efficient patterns.`;
    if (_imageMem.length > 0) {
        const best = [..._imageMem].sort((a, b) => b.quality - a.quality)[0];
        if (best) ctx += `\n• Best image prompt so far: "${best.prompt.slice(0, 80)}"`;
    }
    if (_musicMem.length > 0) {
        const best = [..._musicMem].sort((a, b) => b.quality - a.quality)[0];
        if (best) ctx += `\n• Best music: "${best.prompt.slice(0, 60)}", ${best.bpm}bpm, ${best.key}`;
    }
    return ctx;
};

window.lomaAutoCrawlSearchResults = async urls => {
    if (!urls?.length) return;
    for (const url of urls.slice(0, 3)) {
        const patterns = await _crawlAndExtractPatterns(url);
        if (patterns.length > 0) {
            _codeMem.push(...patterns);
            if (_codeMem.length > 1000) _codeMem = _codeMem.slice(-1000);
            _saveMem(_MEM.CODE, _codeMem);
        }
    }
};

async function _crawlAndExtractPatterns(url) {
    const cached = _crawlCache.find(c => c.url === url && Date.now() - c.ts < 3_600_000);
    if (cached) return cached.patterns;
    try {
        const proxy = 'https://api.allorigins.win/raw?url=';
        const res   = await fetch(proxy + encodeURIComponent(url), { signal: AbortSignal.timeout(15000) });
        const html  = await res.text();
        const doc   = new DOMParser().parseFromString(html, 'text/html');
        const patterns = [];
        doc.querySelectorAll('pre,code,script[type="text/plain"]').forEach(el => {
            const text = el.textContent.trim();
            if (text.length < 40) return;
            const lang = _detectLang(text);
            const q    = _scoreCode(text);
            if (q > 0.3) patterns.push({ lang, code: text.slice(0, 2000), quality: q, source: url, ts: Date.now() });
        });
        _crawlCache.push({ url, patterns, ts: Date.now() });
        if (_crawlCache.length > 200) _crawlCache = _crawlCache.slice(-200);
        _saveMem(_MEM.CRAWL, _crawlCache);
        return patterns;
    } catch { return []; }
}

window.lomaGetStats = () => {
    const lc = {};
    _codeMem.forEach(p => { lc[p.lang] = (lc[p.lang] || 0) + 1; });
    return { codePatterns: _codeMem.length, imageMemory: _imageMem.length, musicMemory: _musicMem.length, improvements: _improveLog.length, byLang: lc };
};

// ═══════════════════════════════════════════════════════════════════════════════
//  10. DOMContentLoaded — SINGLE event binding hub. app.js owns ALL of this.
// ═══════════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

    // ── Restore model pill ──────────────────────────────────────────────────
    const active = window._lomaActiveModel;
    const modelLabels = {
        'qwen2.5-coder:7b': 'Loma Coder 7B',
        'llava':            'Loma Vision',
        'loma-lora':        'Loma Trained',
        'loma-trained':     'Loma Custom',
        'llama3.2:1b':      'Loma 1B',
    };
    const pill = document.getElementById('model-pill-label');
    if (pill) pill.textContent = modelLabels[active] || active;

    document.querySelectorAll('.model-dot').forEach(d => {
        d.className = `w-2 h-2 rounded-full flex-shrink-0 model-dot ${d.getAttribute('data-model') === active ? 'bg-emerald-400' : 'bg-indigo-400/40'}`;
    });

    // ── Restore settings inputs ─────────────────────────────────────────────
    const cfgModel  = document.getElementById('config-model');
    const cfgTokens = document.getElementById('config-tokens');
    const cfgDepth  = document.getElementById('config-reasoning-depth');
    const gKey      = document.getElementById('google-search-api-key');
    const gCx       = document.getElementById('google-search-cx');

    if (cfgModel)  cfgModel.value  = active;
    if (cfgTokens) cfgTokens.value = localStorage.getItem('envizion_tokens') || 32768;
    if (cfgDepth)  cfgDepth.value  = localStorage.getItem('envizion_reasoning_depth') || 2048;
    if (gKey)      gKey.value      = localStorage.getItem('envizion_google_key') || '';
    if (gCx)       gCx.value       = localStorage.getItem('envizion_google_cx') || '';

    const tokenVal = document.getElementById('token-val');
    if (cfgTokens && tokenVal) cfgTokens.addEventListener('input', () => {
        tokenVal.innerText = cfgTokens.value;
        localStorage.setItem('envizion_tokens', cfgTokens.value);
    });
    const depthVal = document.getElementById('reasoning-depth-val');
    if (cfgDepth && depthVal) cfgDepth.addEventListener('input', () => {
        depthVal.innerText = cfgDepth.value;
        localStorage.setItem('envizion_reasoning_depth', cfgDepth.value);
    });
    if (gKey) gKey.addEventListener('change', () => localStorage.setItem('envizion_google_key', gKey.value));
    if (gCx)  gCx.addEventListener('change',  () => localStorage.setItem('envizion_google_cx',  gCx.value));

    // ── Restore web search toggle state ────────────────────────────────────
    const cb = document.getElementById('web-search-toggle');
    if (cb) cb.checked = isWebSearchEnabled;

    // ── Auto-scroll detection ───────────────────────────────────────────────
    const stream = document.getElementById('chat-stream');
    if (stream) {
        stream.addEventListener('scroll', function () {
            window.autoScrollChat = (this.scrollHeight - this.scrollTop - this.clientHeight) < 80;
        });
    }

    // ── Keyboard submit + auto-resize + char counter ────────────────────────
    const input     = document.getElementById('user-prompt') || document.getElementById('prompt-input');
    const submitBtn = document.getElementById('submit-prompt-btn');
    const charCount = document.getElementById('char-count-label');

    if (input) {
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.processInputMessage(); }
        });
        input.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 200) + 'px';
            if (submitBtn) {
                const hasContent = !!this.value.trim() || !!attachedImageDataUrl;
                submitBtn.classList.toggle('text-slate-400', !hasContent);
                submitBtn.classList.toggle('text-white',     hasContent);
            }
            // Live char/token estimate
            if (charCount) {
                const len = this.value.length;
                const approxTok = Math.round(len / 4);
                charCount.textContent = len > 0 ? `~${approxTok} tokens` : '';
            }
        });
        input.addEventListener('paste', () => {
            // Check clipboard for images
            // handled by paste event on window below
        });
    }

    // ── Paste image from clipboard ──────────────────────────────────────────
    window.addEventListener('paste', async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    const dataUrl = await _readFileAsDataURL(file);
                    attachedImageDataUrl = dataUrl;
                    window._lomaAttachedImageDataUrl = dataUrl;
                    _showInlineImagePreview(dataUrl, 'pasted-image.png');
                    _toast('Image pasted', 'Ready for vision analysis.', 'fa-image', 'bg-indigo-600');
                    // Activate submit button
                    if (submitBtn) submitBtn.classList.replace('text-slate-400', 'text-white');
                }
                break;
            }
        }
    });

    if (submitBtn) submitBtn.onclick = window.processInputMessage;

    // ── Stop button — only the button itself, not the container ────────────
    const stopBtn = document.getElementById('stop-btn');
    if (stopBtn) stopBtn.onclick = (e) => { e.stopPropagation(); Engine.abort(); };

    // ── Sidebar mobile toggle ───────────────────────────────────────────────
    const sidebarBtn  = document.getElementById('sidebar-toggle') || document.getElementById('btn-menu');
    if (sidebarBtn) sidebarBtn.onclick = () => {
        const sidebar = document.getElementById('gemini-sidebar');
        const overlay = document.getElementById('mobile-overlay');
        if (!sidebar) return;
        sidebar.classList.toggle('-translate-x-full');
        if (overlay) {
            const isOpen = !sidebar.classList.contains('-translate-x-full');
            overlay.classList.toggle('hidden', !isOpen);
        }
    };

    window.toggleSidebarCollapse = () => {
        const sidebar = document.getElementById('gemini-sidebar');
        const overlay = document.getElementById('mobile-overlay');
        if (sidebar) sidebar.classList.add('-translate-x-full');
        if (overlay) overlay.classList.add('hidden');
    };

    // ── Responsive canvas resize ────────────────────────────────────────────
    window.addEventListener('resize', () => {
        const cv = document.getElementById('canvas-column');
        if (cv && cv.style.width && cv.style.width !== '0px') {
            cv.style.width = window.innerWidth < 768 ? '100%' : '50%';
        }
        if (window.innerWidth >= 768) {
            document.getElementById('mobile-overlay')?.classList.add('hidden');
        }
    });

    console.log('[app.js] ✅ Loma loaded. Model:', active, '| WebSearch:', isWebSearchEnabled);
    console.log('[app.js] Brain — code:', _codeMem.length, '| images:', _imageMem.length, '| music:', _musicMem.length);
    console.log('[app.js] Training pairs:', Trainer.rlhfData.length);
});