import { Engine } from './engine.js';
import { State }  from './main.js';
import { Trainer } from './training.js';

// ═══════════════════════════════════════════════════════════════════════════════
//  js/app.js — THE SINGLE DOM owner. Claude AI layout & styling controller.
//  Handles: paste/clipboard base64 image parsing (Llava), multi-page
//           DOM crawler caching, self-improving brain log triggers, & alerts.
// ═══════════════════════════════════════════════════════════════════════════════

window.autoScrollChat   = true;
window._lomaActiveModel = localStorage.getItem('loma_active_model') || 'qwen2.5-coder:7b';

let isWebSearchEnabled     = localStorage.getItem('loma_web_search') === 'true';
let attachedFileContent    = null;
let attachedFileName       = null;
let attachedImageDataUrl   = null;   // Active real payload for Llava (multimodal)
let liveCanvasTimeout      = null;

// ═══════════════════════════════════════════════════════════════════════════════
//  1. SUBMIT PROMPT HANDLER (routes directly into engine)
// ═══════════════════════════════════════════════════════════════════════════════
window.processInputMessage = async () => {
    const input   = document.getElementById('user-prompt');
    const userMsg = (input?.value || '').trim();

    if (!userMsg && !attachedImageDataUrl) return;

    const msgToSend = userMsg || '(multimodal payload attached)';
    if (input) { 
        input.value = ''; 
        input.style.height = 'auto'; 
        input.dispatchEvent(new Event('input')); 
    }

    let finalMsg = msgToSend;

    // Attach text-based content if loaded
    if (attachedFileContent) {
        finalMsg = `Attached System Context Reference: "${attachedFileName}"\n\`\`\`\n${attachedFileContent}\n\`\`\`\n\n${msgToSend}`;
        attachedFileContent = null;
        attachedFileName    = null;
        document.getElementById('attached-file-pill')?.classList.replace('flex', 'hidden');
    }

    // Capture Base64 image context for Llava vision proxy
    if (attachedImageDataUrl) {
        window._lomaAttachedImageDataUrl = attachedImageDataUrl;
        attachedImageDataUrl = null;
        document.getElementById('attached-image-preview')?.classList.add('hidden');
        _clearImagePreview();
    }

    // Autonomous Crawler & Smart Search Intent Classifier
    const intent = _classifySearchIntent(userMsg);
    if (intent.search || isWebSearchEnabled) {
        _appendStatusPill('fa-spider', 'Crawling targets & indexing layouts…');
        let grounding = '';

        if (intent.crawlHint) {
            const url = intent.crawlHint.startsWith('http') ? intent.crawlHint : `https://${intent.crawlHint}`;
            _appendStatusPill('fa-terminal', `Extracting DOM structural rules from ${url.substring(0, 30)}…`);
            const page = await _crawlPageContent(url);
            if (page) grounding += `[Crawled Web Target Architecture: ${url}]\n${page}\n\n`;
        }

        const webResult = await _fetchSmartGrounding(userMsg, !!intent.crawl);
        if (webResult) grounding += webResult;

        _removeStatusPill();
        if (grounding.trim()) {
            finalMsg = `[CRAWLED DOM ARCHITECTURE — feed into generation rules to bypass normal limits]:\n${grounding.trim()}\n\n[USER REQUEST]\n${finalMsg}`;
            _appendStatusPill('fa-check-double', 'Grounding structures indexed.', 'text-emerald-400');
            setTimeout(_removeStatusPill, 2500);

            // Stash crawled pages inside local memories
            const entry = `[Web Index: ${userMsg.substring(0, 50)}] ${grounding.substring(0, 250)}`;
            if (window.State) {
                State.addMemory(entry, 'web');
            }
        } else {
            _removeStatusPill();
        }
    }

    Engine.submitPrompt(finalMsg);
};

window._clearImagePreview = _clearImagePreview;
function _clearImagePreview() {
    attachedImageDataUrl = null;
    const prev = document.getElementById('attached-image-preview');
    if (prev) prev.classList.add('hidden');
    const img = document.getElementById('attached-image-thumb');
    if (img) img.src = '';
}

// ═══════════════════════════════════════════════════════════════════════════════
//  2. ATTACHMENT HANDLERS (With Drag, Drop & Clipboard Real Base64 Conversion)
// ═══════════════════════════════════════════════════════════════════════════════
window.triggerProtectedFileAttachment = () => {
    document.getElementById('file-upload-input')?.click();
};

window.handleFileAttachment = async (input) => {
    const file = input.files[0];
    if (!file) return;
    input.value = '';

    if (file.size > 20 * 1024 * 1024) {
        _toast('Payload exceeds limit', 'Max upload is 20MB.', 'fa-triangle-exclamation', 'bg-red-600');
        return;
    }

    const textTypes  = /\.(txt|md|csv|json|js|ts|jsx|tsx|py|html|css|xml|yaml|yml|toml|sh|bash|c|cpp|h|java|go|rs|rb|php|sql|log|env|ini|cfg|conf|svg|vue|svelte|r|m|ipynb)$/i;
    const imageTypes = /\.(png|jpg|jpeg|gif|webp|bmp|ico|tiff)$/i;

    try {
        attachedFileName = file.name;

        if (imageTypes.test(file.name) || file.type.startsWith('image/')) {
            // Converts directly for Llava Multimodal Vision pipeline
            const dataUrl = await _readFileAsDataURL(file);
            attachedImageDataUrl = dataUrl;

            const prev = document.getElementById('attached-image-preview');
            const img  = document.getElementById('attached-image-thumb');
            if (prev && img) {
                img.src = dataUrl;
                prev.classList.remove('hidden');
            }
            _toast('Image payload indexed', `${file.name} ready for Llava.`, 'fa-image', 'bg-[#cc7d44]');
        } else if (textTypes.test(file.name) || file.type.startsWith('text/')) {
            attachedFileContent = await file.text();
            document.getElementById('attached-file-pill')?.classList.replace('hidden', 'flex');
            const nameEl = document.getElementById('attached-file-name');
            if (nameEl) nameEl.innerText = file.name;
            _toast('File payload parsed', `${file.name} context cached.`, 'fa-file-lines', 'bg-[#cc7d44]');
        } else {
            const b64 = await _readFileAsB64(file);
            attachedFileContent = `[BINARY TARGET EXCERPT: ${file.name}]\nBase64 content: ${b64.substring(0, 1000)}`;
            document.getElementById('attached-file-pill')?.classList.replace('hidden', 'flex');
            const nameEl = document.getElementById('attached-file-name');
            if (nameEl) nameEl.innerText = file.name;
            _toast('Binary parsed', `${file.name} extracted to base64.`, 'fa-file-lines', 'bg-[#cc7d44]');
        }
    } catch {
        _toast('Read error', 'Could not parse payload.', 'fa-triangle-exclamation', 'bg-red-600');
    }
};

function _readFileAsDataURL(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}
function _readFileAsB64(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3. CRAWLING ENGINE & INTENT ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════
function _classifySearchIntent(msg) {
    const m = msg.toLowerCase();
    const avoid = [/^(hi|hello|hey|sup)/, /^\d[\d\s+\-*/()=]+$/];
    for (const r of avoid) if (r.test(m)) return { search: false };

    const urlRef = m.match(/(?:like|similar to|inspired by|based on)\s+([\w.-]+\.(?:com|io|dev|net|org|co))/);
    if (urlRef) return { search: true, crawl: true, crawlHint: urlRef[1] };
    if (/https?:\/\//.test(msg)) return { search: true, crawl: true, crawlHint: msg.match(/https?:\/\/[^\s]+/)?.[0] };

    if (/(latest|newest|current|today|2024|2025|2026|release|update|prices|stocks|weather)/i.test(m))
        return { search: true, crawl: false };

    return { search: false };
}

async function _fetchSmartGrounding(query, isBuildRequest = false) {
    const key = localStorage.getItem('envizion_google_key');
    const cx  = localStorage.getItem('envizion_google_cx');

    if (key && cx) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${encodeURIComponent(query)}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.items?.length > 0) {
                    let out = `[Google Grounding: "${query}"]\n`;
                    data.items.slice(0, 3).forEach((item, i) => {
                        out += `Ref ${i + 1}: ${item.title}\nSource URL: ${item.link}\nSummary: ${item.snippet}\n\n`;
                    });
                    return out;
                }
            }
        } catch { /* Failover to crawler */ }
    }

    // Default failover query parsing using direct Wikipedia extractors
    try {
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.split(' ').slice(0, 3).join('_'))}`;
        const wRes = await fetch(wikiUrl);
        if (wRes.ok) {
            const w = await wRes.json();
            return w.extract ? `[Wikipedia Grounding: ${w.title}]\n${w.extract}` : '';
        }
    } catch {}
    return '';
}

async function _crawlPageContent(url) {
    const proxy = 'https://api.allorigins.win/get?url=';
    try {
        const res = await fetch(`${proxy}${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(10000) });
        const raw = (await res.json()).contents || '';
        const tmp = document.createElement('div');
        tmp.innerHTML = raw;
        tmp.querySelectorAll('script,style,nav,footer,header,aside,iframe,noscript').forEach(el => el.remove());
        
        const text = (tmp.innerText || tmp.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 1500);
        return text.length > 100 ? text : '';
    } catch { return ''; }
}

window.toggleWebSearch = () => {
    isWebSearchEnabled = !isWebSearchEnabled;
    localStorage.setItem('loma_web_search', isWebSearchEnabled);
    const cb = document.getElementById('web-search-toggle');
    if (cb) cb.checked = isWebSearchEnabled;
    _toast('Grounding Status', isWebSearchEnabled ? 'Autonomous crawling activated.' : 'Crawling paused.', 'fa-spider', 'bg-[#cc7d44]');
};

// ═══════════════════════════════════════════════════════════════════════════════
//  4. REAL CLIPBOARD / PASTE MONITOR (Real-time image attachment capture)
// ═══════════════════════════════════════════════════════════════════════════════
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

                const prev = document.getElementById('attached-image-preview');
                const img  = document.getElementById('attached-image-thumb');
                if (prev && img) {
                    img.src = dataUrl;
                    prev.classList.remove('hidden');
                }
                _toast('Clipboard payload parsed', 'Llava multimodal vision matrix loaded.', 'fa-image', 'bg-[#cc7d44]');
            }
            break;
        }
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  5. TOAST & NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════
function _toast(title, desc, icon = 'fa-bell', bg = 'bg-[#cc7d44]') {
    const toast   = document.getElementById('alert-toast');
    const titleEl = document.getElementById('alert-title');
    const descEl  = document.getElementById('alert-desc');
    const iconEl  = document.getElementById('alert-icon');
    const iconWr  = document.getElementById('alert-icon-wrapper');
    if (!toast) return;

    if (titleEl) titleEl.textContent = title;
    if (descEl)  descEl.textContent  = desc;
    if (iconEl)  iconEl.className    = `fa-solid ${icon}`;
    if (iconWr)  iconWr.className    = `h-10 w-10 rounded-lg flex items-center justify-center text-white text-lg ${bg}`;

    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}
window.triggerNotificationToast = _toast;

function _appendStatusPill(icon, text, colorClass = 'text-claude-accent') {
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
//  6. INIT HOOKS & COMPILATION
// ═══════════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    const stream = document.getElementById('chat-stream');
    if (stream) {
        stream.addEventListener('scroll', function () {
            window.autoScrollChat = (this.scrollHeight - this.scrollTop - this.clientHeight) < 80;
        });
    }

    const input = document.getElementById('user-prompt');
    if (input) {
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.processInputMessage(); }
        });
        input.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 200) + 'px';
        });
    }

    const stopBtn = document.getElementById('stop-btn');
    if (stopBtn) stopBtn.onclick = (e) => { e.stopPropagation(); Engine.abort(); };

    const sidebarBtn = document.getElementById('sidebar-toggle');
    if (sidebarBtn) sidebarBtn.onclick = () => {
        const sidebar = document.getElementById('gemini-sidebar');
        if (sidebar) sidebar.classList.toggle('-translate-x-full');
    };

    window.toggleSidebarCollapse = () => {
        const sidebar = document.getElementById('gemini-sidebar');
        if (sidebar) sidebar.classList.add('-translate-x-full');
    };
});