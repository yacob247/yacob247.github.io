import { Engine } from './engine.js';
import { State } from './main.js';// ═══════════════════════════════════════════════════════════════════════════════
//  app.js  —  Loma client glue
//  Handles: input submission, file attach, web search, canvas helpers,
//           tool bridge (image/music iframes), self-learning brain,
//           UI helpers (toast, status pill, sidebar toggles, share/download).
//  Does NOT duplicate: engine.js, main.js, ui.js, training.js, prompts.js
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GLOBAL FLAGS ─────────────────────────────────────────────────────────────
window.autoScrollChat   = true;
window._lomaActiveModel = localStorage.getItem('loma_active_model') || 'qwen2.5-coder:7b';

let isWebSearchEnabled  = false;
let attachedFileContent = null;
let attachedFileName    = null;
let liveCanvasTimeout   = null;

// ─── API URL (mirrors engine.js — used by search helpers) ─────────────────────
const ENVIZION_API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? `http://${location.host}/api/chat`
    : 'https://api.envizion.work/api/chat';

// ═══════════════════════════════════════════════════════════════════════════════
//  1. MAIN INPUT HANDLER
//     Reads the prompt, prepends any attached file, runs web search if needed,
//     then hands off to Engine.submitPrompt().
// ═══════════════════════════════════════════════════════════════════════════════
window.processInputMessage = async () => {
    const input  = document.getElementById('user-prompt') || document.getElementById('prompt-input');
    const userMsg = (input?.value || '').trim();
    if (!userMsg) return;

    input.value = '';
    input.style.height = 'auto';
    input.dispatchEvent(new Event('input'));

    let finalMsg = userMsg;

    // Prepend attached file
    if (attachedFileContent) {
        finalMsg = `Attached File: "${attachedFileName}"\n\`\`\`\n${attachedFileContent}\n\`\`\`\n\n${userMsg}`;
        window.clearFileAttachment();
    }

    // Smart search grounding
    const intent = _classifySearchIntent(userMsg);
    if (intent.search || isWebSearchEnabled) {
        _appendStatusPill('fa-magnifying-glass', 'Searching the web…');
        let grounding = '';

        if (intent.crawlHint) {
            const url = intent.crawlHint.startsWith('http')
                ? intent.crawlHint
                : `https://${intent.crawlHint}`;
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

            // Auto-save to personal memory
            if (window.State) {
                const entry = `[Web: ${userMsg.substring(0, 60)}] ${grounding.substring(0, 400)}`;
                if (!window.State.personalMemories.some(m => m.startsWith(`[Web: ${userMsg.substring(0, 30)}`))) {
                    window.State.personalMemories.push(entry);
                    if (window.State.personalMemories.length > 100) window.State.personalMemories.shift();
                    localStorage.setItem('envizion_memories', JSON.stringify(window.State.personalMemories));
                }
            }
        } else {
            _removeStatusPill();
        }
    }

    // Hand off to Engine — passes final (possibly grounded) message as forcedPrompt
    if (window.Engine) {
        window.Engine.submitPrompt(finalMsg);
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  2. FILE ATTACHMENT
// ═══════════════════════════════════════════════════════════════════════════════
window.triggerProtectedFileAttachment = () => {
    document.getElementById('file-upload-input')?.click();
};

window.handleFileAttachment = async (input) => {
    const file = input.files[0];
    if (!file) return;
    input.value = '';

    if (file.size > 10 * 1024 * 1024) {
        _toast('File too large', 'Max 10 MB.', 'fa-triangle-exclamation', 'bg-red-600');
        return;
    }

    const textTypes  = /\.(txt|md|csv|json|js|ts|jsx|tsx|py|html|css|xml|yaml|yml|toml|sh|bash|c|cpp|h|java|go|rs|rb|php|sql|log|env|ini|cfg|conf|svg|vue|svelte|r|m|ipynb)$/i;
    const imageTypes = /\.(png|jpg|jpeg|gif|webp|bmp|ico|tiff)$/i;

    try {
        attachedFileName = file.name;
        if (textTypes.test(file.name) || file.type.startsWith('text/')) {
            attachedFileContent = await file.text();
        } else if (imageTypes.test(file.name) || file.type.startsWith('image/')) {
            const b64 = await _readFileAsDataURL(file);
            attachedFileContent = `[IMAGE: ${file.name}]\nData URL: ${b64}`;
        } else {
            const b64 = await _readFileAsB64(file);
            attachedFileContent = `[BINARY FILE: ${file.name} (${file.type || 'unknown'}, ${(file.size / 1024).toFixed(1)}KB)]\nBase64: ${b64.substring(0, 2000)}`;
        }
        document.getElementById('attached-file-pill')?.classList.replace('hidden', 'flex');
        const nameEl = document.getElementById('attached-file-name');
        if (nameEl) nameEl.innerText = file.name;
        _toast('File attached', `${file.name} ready.`, 'fa-file-lines', 'bg-emerald-600');
    } catch {
        _toast('Read error', 'Could not read file.', 'fa-triangle-exclamation', 'bg-red-600');
    }
};

window.clearFileAttachment = () => {
    attachedFileContent = null;
    attachedFileName    = null;
    document.getElementById('attached-file-pill')?.classList.replace('flex', 'hidden');
};

function _readFileAsDataURL(file) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
    });
}
function _readFileAsB64(file) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
    });
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

    const isBuild   = /(build|make|create|generate|implement|develop)/i.test(m);
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
            const url  = `https://www.googleapis.com/customsearch/v1?key=${googleKey}&cx=${googleCx}&q=${encodeURIComponent(query)}`;
            const res  = await fetch(url);
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
                    return out;
                }
            }
        } catch { /* fall through */ }
    }

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
        return out;
    } catch {
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
    const cb = document.getElementById('web-search-toggle');
    if (cb) { cb.checked = !cb.checked; isWebSearchEnabled = cb.checked; }
    _toast('Web Search', isWebSearchEnabled ? 'Live grounding enabled.' : 'Grounding disabled.', 'fa-globe', 'bg-indigo-600');
};

// ═══════════════════════════════════════════════════════════════════════════════
//  5. CANVAS HELPERS
//     ui.js handles the core canvas. These helpers handle debounced live updates,
//     opening code in canvas, and opening in a new tab.
// ═══════════════════════════════════════════════════════════════════════════════
window.updateCanvasLive = (code, isFinal) => {
    const codeView = document.getElementById('live-canvas-code');
    if (codeView) codeView.innerText = code;

    if (!isFinal) {
        // Open panel if closed
        window.toggleCanvasVisibility?.(true);
        clearTimeout(liveCanvasTimeout);
        liveCanvasTimeout = setTimeout(() => {
            const frame = document.getElementById('live-canvas-frame');
            if (frame) frame.srcdoc = code;
        }, 80);
    } else {
        const encoded = btoa(unescape(encodeURIComponent(code)));
        window.renderToCanvas?.(encoded);
    }
};

window.renderToCanvas = (base64Content) => {
    const html  = decodeURIComponent(escape(atob(base64Content)));
    const frame = document.getElementById('live-canvas-frame');
    const code  = document.getElementById('live-canvas-code');
    if (frame) frame.srcdoc = html;
    if (code)  code.innerText = html;
    if (window.UI) window.UI.canvasCode = html;
    window.toggleCanvasVisibility?.(true);
    window.switchCanvasTab?.('preview');
};

window.lomaOpenCodeInCanvas = (code, lang) => {
    const isHtml = (lang === 'html' || lang === 'html5') &&
        (code.includes('<html') || code.includes('<div') || code.includes('<body') || code.includes('<canvas'));

    let renderable = code;
    if (!isHtml) {
        const escaped = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        const canRunJS = lang === 'javascript' || lang === 'js';
        renderable = `<!DOCTYPE html><html><head><meta charset="UTF-8">
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
<div class="out-zone" id="out-zone"><div style="font-size:10px;color:#6b7280;text-transform:uppercase;margin-bottom:6px">Output</div><div id="out-content"></div></div>
<script>
function runCode(){
  const oz=document.getElementById('out-zone');
  const oc=document.getElementById('out-content');
  oz.className='out-zone on';
  ${canRunJS ? `try{const logs=[];const ol=console.log;console.log=(...a)=>{logs.push(a.map(x=>typeof x==='object'?JSON.stringify(x,null,2):String(x)).join(' '));ol(...a)};eval(document.getElementById('code-el').textContent);console.log=ol;oc.textContent=logs.join('\\n')||'(no console output)';}catch(e){oc.textContent='Error: '+e.message;oc.style.color='#f87171';}` : `oc.textContent='Run in your environment.';`}
}
<\/script></body></html>`;
    }
    const encoded = btoa(unescape(encodeURIComponent(renderable)));
    window.renderToCanvas(encoded);
};

window.lomaOpenInNewTab = (code, lang) => {
    const isHtml = (lang === 'html' || lang === 'html5') && (code.includes('<html') || code.includes('<div') || code.includes('<body'));
    let content = code;
    if (!isHtml) {
        const escaped = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Loma · ${lang}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0d0e10;color:#e2e8f0;font-family:'Courier New',monospace}
.hdr{padding:12px 16px;background:#16181c;border-bottom:1px solid #2a2d33;font-size:11px;color:#6b7280}
pre{padding:20px;font-size:13px;line-height:1.75;white-space:pre-wrap;word-break:break-word}</style></head>
<body><div class="hdr">loma / ${lang}</div><pre>${escaped}</pre></body></html>`;
    }
    window.open(URL.createObjectURL(new Blob([content], { type: 'text/html' })), '_blank');
};

// ═══════════════════════════════════════════════════════════════════════════════
//  6. UI HELPERS  (toast, status pill, sidebar toggles, share, download chat)
// ═══════════════════════════════════════════════════════════════════════════════
function _toast(title, desc, icon, bgClass = 'bg-emerald-600') {
    const toast = document.getElementById('alert-toast');
    if (!toast) return;
    document.getElementById('alert-title').innerText  = title;
    document.getElementById('alert-desc').innerText   = desc;
    document.getElementById('alert-icon').className   = `fa-solid ${icon}`;
    document.getElementById('alert-icon-wrapper').className =
        `h-10 w-10 rounded-full ${bgClass}/20 flex items-center justify-center text-lg`;
    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 4000);
}
// Expose so engine.js / main.js can call it
window.triggerNotificationToast = _toast;

function _appendStatusPill(icon, text, colorClass = 'text-gemini-textMuted') {
    const stream = document.getElementById('chat-stream');
    if (!stream) return;
    const id = 'status-pill-' + Date.now();
    stream.insertAdjacentHTML('beforeend',
        `<div id="${id}" class="status-pill text-center my-2">
            <span class="inline-flex items-center gap-2 px-3 py-1 bg-gemini-card/30
                         rounded-full text-[10px] font-mono ${colorClass}">
                <i class="fa-solid ${icon}"></i> ${text}
            </span>
        </div>`);
    if (window.autoScrollChat) stream.scrollTop = stream.scrollHeight;
}
function _removeStatusPill() {
    document.querySelectorAll('.status-pill').forEach(p => p.remove());
}

window.toggleSidebarCollapse = () => {
    const sidebar  = document.getElementById('gemini-sidebar');
    const overlay  = document.getElementById('mobile-overlay');
    if (!sidebar) return;
    sidebar.classList.toggle('-translate-x-full');
    if (window.innerWidth < 768) {
        if (sidebar.classList.contains('-translate-x-full')) {
            overlay?.classList.add('hidden');
            overlay?.classList.remove('opacity-100');
        } else {
            overlay?.classList.remove('hidden');
            setTimeout(() => overlay?.classList.add('opacity-100'), 10);
        }
    }
};

window.toggleConfigSidebar = () => {
    document.getElementById('config-sidebar')?.classList.toggle('-translate-x-full');
};

window.applyNewConfig = () => {
    const model   = document.getElementById('config-model')?.value.trim();
    const tokens  = parseInt(document.getElementById('config-tokens')?.value);
    const depth   = parseInt(document.getElementById('config-reasoning-depth')?.value);
    const gKey    = document.getElementById('google-search-api-key')?.value.trim();
    const gCx     = document.getElementById('google-search-cx')?.value.trim();

    if (model)  { window._lomaActiveModel = model; localStorage.setItem('loma_active_model', model); }
    if (tokens) localStorage.setItem('envizion_tokens', tokens);
    if (depth)  localStorage.setItem('envizion_reasoning_depth', depth);
    if (gKey)   localStorage.setItem('envizion_google_key', gKey);
    if (gCx)    localStorage.setItem('envizion_google_cx', gCx);

    window.toggleConfigSidebar();
    _toast('Settings Saved', 'Intelligence preferences updated.', 'fa-check', 'bg-emerald-600');
};

window.selectModel = (modelId, label) => {
    window._lomaActiveModel = modelId;
    localStorage.setItem('loma_active_model', modelId);
    const pill = document.getElementById('model-pill-label');
    if (pill) pill.textContent = label;
    document.querySelectorAll('.model-dot').forEach(d => {
        d.className = d.getAttribute('data-model') === modelId
            ? 'w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 model-dot'
            : 'w-2 h-2 rounded-full bg-indigo-400/40 flex-shrink-0 model-dot';
    });
    const cfgModel = document.getElementById('config-model');
    if (cfgModel) cfgModel.value = modelId;
    window.toggleModelDropdown?.(false);
    _toast('Model Switched', `Now using: ${label}`, 'fa-microchip', 'bg-indigo-600');
};

window.toggleModelDropdown = (forceState) => {
    const dd = document.getElementById('model-dropdown');
    if (!dd) return;
    const open = forceState !== undefined ? forceState : dd.classList.contains('hidden');
    if (open) {
        dd.classList.remove('hidden');
        const close = e => {
            if (!document.getElementById('model-selector-wrapper')?.contains(e.target)) {
                dd.classList.add('hidden');
                document.removeEventListener('click', close);
            }
        };
        setTimeout(() => document.addEventListener('click', close), 0);
    } else {
        dd.classList.add('hidden');
    }
};

window.generateShareLink = () => {
    const id  = window.State?.currentId || '';
    const url = `https://envizion.work/Loma/${id}`;
    navigator.clipboard.writeText(url)
        .then(() => _toast('Link Copied', 'Shareable URL copied.', 'fa-link', 'bg-blue-600'))
        .catch(() => prompt('Copy this link:', url));
};

window.downloadChatHistory = () => {
    const session = window.State?.db?.sessions?.[window.State?.currentId];
    if (!session || session.messages.length <= 1) {
        _toast('Empty Chat', 'Nothing to download yet.', 'fa-xmark', 'bg-red-600');
        return;
    }
    let text = `Chat: ${session.title}\nExported: ${new Date().toLocaleString()}\n\n`;
    session.messages.forEach(m => {
        if (m.role !== 'system') text += `--- ${m.role.toUpperCase()} ---\n${m.content}\n\n`;
    });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = `chat_${window.State?.currentId || Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
};

// ═══════════════════════════════════════════════════════════════════════════════
//  7. TOOL BRIDGE  —  music-gen.html + image-gen.html (hidden iframe pool)
//     CPU stays on the USER's machine — the server only routes the API call.
// ═══════════════════════════════════════════════════════════════════════════════
const TOOL_BASE_URL       = 'https://envizion.work/Loma';
const _toolIframes        = {};
const _pendingToolRequests = {};

function _getToolIframe(name) {
    if (_toolIframes[name]) return _toolIframes[name];
    const iframe = document.createElement('iframe');
    iframe.src = `${TOOL_BASE_URL}/${name}.html`;
    iframe.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:-9999px;border:0';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
    document.body.appendChild(iframe);
    _toolIframes[name] = iframe;
    return iframe;
}

function _callTool(toolName, requestType, resultType, payload) {
    return new Promise((resolve, reject) => {
        const id      = Date.now() + Math.random();
        const iframe  = _getToolIframe(toolName);
        const timeout = setTimeout(() => {
            delete _pendingToolRequests[id];
            reject(new Error(`Tool "${toolName}" timed out after 90s`));
        }, 90_000);
        _pendingToolRequests[id] = { resolve, reject, timeout, resultType };
        const send = () => iframe.contentWindow?.postMessage({ type: requestType, payload, _id: id }, '*');
        if (iframe.contentDocument?.readyState === 'complete') send();
        else iframe.onload = send;
    });
}

window.addEventListener('message', e => {
    const msg = e.data;
    if (!msg || typeof msg !== 'object') return;

    // Tool bridge results
    for (const [id, entry] of Object.entries(_pendingToolRequests)) {
        if (msg.type === entry.resultType) {
            clearTimeout(entry.timeout);
            delete _pendingToolRequests[id];
            msg.error ? entry.reject(new Error(msg.error)) : entry.resolve(msg);
            break;
        }
    }

    // Learning from tool results
    if (msg.type === 'LOMA_IMAGE_RESULT' && msg.prompt)
        window.lomaLearnFromImage({ prompt: msg.prompt, style: msg.style });
    if (msg.type === 'LOMA_MUSIC_RESULT' && msg.prompt)
        window.lomaLearnFromMusic({ prompt: msg.prompt, style: msg.style, bpm: msg.bpm, key: msg.key });
});

window.lomaGenerateMusic = (prompt, opts = {}) =>
    _callTool('music-gen', 'LOMA_MUSIC_REQUEST', 'LOMA_MUSIC_RESULT', { prompt, ...opts });

window.lomaGenerateImage = (prompt, opts = {}) =>
    _callTool('image-gen', 'LOMA_IMAGE_REQUEST', 'LOMA_IMAGE_RESULT', { prompt, ...opts });

// Post-process tool tags in the final reply (called from engine.js after stream ends)
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
        const placeholder = `<span class="loma-tool-pending"><i class="fa-solid fa-spinner fa-spin text-[#a8c7fa] mr-2"></i>Generating music: "${attrs.prompt}"…</span>`;
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
        } catch (err) {
            processed = processed.replace(placeholder, `<span class="text-red-400 text-xs">⚠ Music failed: ${err.message}</span>`);
        }
        if (outputEl) outputEl.innerHTML = parseContent(processed);
    }

    for (const match of [...replyText.matchAll(IMAGE_TAG_RE)]) {
        const attrs = _parseTagAttrs(match[1]);
        const placeholder = `<span class="loma-tool-pending"><i class="fa-solid fa-spinner fa-spin text-[#a8c7fa] mr-2"></i>Generating image: "${attrs.prompt}"…</span>`;
        processed = processed.replace(match[0], placeholder);
        if (outputEl) outputEl.innerHTML = parseContent(processed);
        try {
            const result = await window.lomaGenerateImage(attrs.prompt, {
                style: attrs.style || 'flux', ratio: attrs.ratio || '1024x1024',
                enhance: attrs.enhance !== 'false', nologo: true
            });
            const html = `<div class="my-4 max-w-lg">
                <div class="rounded-xl overflow-hidden border border-[#2e2f30]">
                    <img src="${result.imageData}" alt="${attrs.prompt}" class="w-full block">
                </div>
                <div class="flex justify-between items-center mt-2">
                    <p class="text-[10px] text-gray-500">${result.prompt}</p>
                    <a href="${result.imageData}" download="loma-${Date.now()}.png"
                       class="text-[10px] text-[#a8c7fa] px-2 py-1 bg-[#1a1b1c] border border-[#2e2f30] rounded">Save</a>
                </div>
            </div>`;
            processed = processed.replace(placeholder, html);
        } catch (err) {
            processed = processed.replace(placeholder, `<span class="text-red-400 text-xs">⚠ Image failed: ${err.message}</span>`);
        }
        if (outputEl) outputEl.innerHTML = parseContent(processed);
    }

    return processed;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  8. SELF-LEARNING BRAIN
//     All computation here runs in the USER's browser — zero server CPU.
//     The server only receives/sends chat messages.
// ═══════════════════════════════════════════════════════════════════════════════
const _MEM = {
    CODE:    'loma_code_patterns',
    IMAGE:   'loma_image_memory',
    MUSIC:   'loma_music_memory',
    CRAWL:   'loma_crawl_cache',
    IMPROVE: 'loma_improve_log',
};
const _load = key => { try { return JSON.parse(localStorage.getItem(key) || 'null') || []; } catch { return []; } };
const _save = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)); } catch {} };

let _codeMem    = _load(_MEM.CODE);
let _imageMem   = _load(_MEM.IMAGE);
let _musicMem   = _load(_MEM.MUSIC);
let _crawlCache = _load(_MEM.CRAWL);
let _improveLog = _load(_MEM.IMPROVE);

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
        const note = `[LOMA LEARNING] Found ${better.length} better ${lang} patterns: ${
            better.map(p => p.tokens < tok * 0.7 ? `${Math.round((1 - p.tokens / tok) * 100)}% fewer tokens` : 'higher quality').join(', ')
        }. Apply next time.`;
        _improveLog.push({ ts: Date.now(), lang, note, myQ: q, bestQ: Math.max(...better.map(p => p.quality)) });
        if (_improveLog.length > 500) _improveLog = _improveLog.slice(-500);
        _save(_MEM.IMPROVE, _improveLog);
    }
    _codeMem.push({ lang, code: code.slice(0, 2000), quality: q, tokens: tok, source: 'self-generated', ts: Date.now() });
    if (_codeMem.length > 1000) _codeMem = _codeMem.slice(-1000);
    _save(_MEM.CODE, _codeMem);
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
    _save(_MEM.IMAGE, _imageMem);
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
    _save(_MEM.MUSIC, _musicMem);
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

// Injected into system prompt by engine.js via window.lomaGetLearningContext()
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
        if (best) ctx += `\n• Best image prompt: "${best.prompt.slice(0, 80)}"`;
    }
    if (_musicMem.length > 0) {
        const best = [..._musicMem].sort((a, b) => b.quality - a.quality)[0];
        if (best) ctx += `\n• Best music: "${best.prompt.slice(0, 60)}", ${best.bpm}bpm, ${best.key}`;
    }
    return ctx;
};

// Page crawl for learning (separate from search crawl — URL list from search results)
window.lomaAutoCrawlSearchResults = async urls => {
    if (!urls?.length) return;
    for (const url of urls.slice(0, 3)) {
        const patterns = await _crawlAndExtractPatterns(url);
        if (patterns.length > 0) {
            _codeMem.push(...patterns);
            if (_codeMem.length > 1000) _codeMem = _codeMem.slice(-1000);
            _save(_MEM.CODE, _codeMem);
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
        _save(_MEM.CRAWL, _crawlCache);
        return patterns;
    } catch { return []; }
}

window.lomaGetStats = () => {
    const lc = {};
    _codeMem.forEach(p => { lc[p.lang] = (lc[p.lang] || 0) + 1; });
    return { codePatterns: _codeMem.length, imageMemory: _imageMem.length, musicMemory: _musicMem.length, improvements: _improveLog.length, byLang: lc };
};

// ═══════════════════════════════════════════════════════════════════════════════
//  9. SETTINGS UI INIT  (runs on DOMContentLoaded)
// ═══════════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    // Restore model pill
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
        d.className = d.getAttribute('data-model') === active
            ? 'w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 model-dot'
            : 'w-2 h-2 rounded-full bg-indigo-400/40 flex-shrink-0 model-dot';
    });

    // Restore settings inputs
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

    // Token slider label
    const tokenVal = document.getElementById('token-val');
    if (cfgTokens && tokenVal) {
        cfgTokens.addEventListener('input', () => { tokenVal.innerText = cfgTokens.value; });
    }
    const depthVal = document.getElementById('reasoning-depth-val');
    if (cfgDepth && depthVal) {
        cfgDepth.addEventListener('input', () => { depthVal.innerText = cfgDepth.value; });
    }

    // Auto-scroll detection
    const stream = document.getElementById('chat-stream');
    if (stream) {
        stream.addEventListener('scroll', function () {
            window.autoScrollChat = (this.scrollHeight - this.scrollTop - this.clientHeight) < 80;
        });
    }

    // Keyboard submit (for id="user-prompt" in index.html)
    const input     = document.getElementById('user-prompt');
    const submitBtn = document.getElementById('submit-prompt-btn');
    if (input) {
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.processInputMessage(); }
        });
        input.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
            if (submitBtn) {
                submitBtn.classList.toggle('text-slate-400', !this.value.trim());
                submitBtn.classList.toggle('text-white',      !!this.value.trim());
            }
        });
    }
    if (submitBtn) submitBtn.onclick = window.processInputMessage;

    // Responsive canvas resize
    window.addEventListener('resize', () => {
        const cv = document.getElementById('canvas-column');
        if (cv && cv.style.width && cv.style.width !== '0px') {
            cv.style.width = window.innerWidth < 768 ? '100%' : '50%';
        }
        if (window.innerWidth >= 768) {
            document.getElementById('mobile-overlay')?.classList.add('hidden');
        }
    });

    console.log('[app.js] ✅ Loma client loaded. Model:', active);
    console.log('[app.js] Brain — code:', _codeMem.length, '| images:', _imageMem.length, '| music:', _musicMem.length);
});