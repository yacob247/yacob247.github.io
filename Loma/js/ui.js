// ═══════════════════════════════════════════════════════════════════════════════
//  ui.js — Pure rendering, canvas management, markdown, bubble output.
//  Fixed: canvas sandbox includes allow-same-origin so fetch/localStorage work,
//         processContent handles vision image blocks,
//         no event binding (app.js owns that).
// ═══════════════════════════════════════════════════════════════════════════════

export const UI = {
    canvasCode: '',

    init() {
        this._setupMarkdown();
        this._setupConsoleListener();
        window._userForceClosedCanvas = false;
    },

    // ── Sidebar ───────────────────────────────────────────────────────────
    toggleSidebar() {
        const sidebar = document.getElementById('gemini-sidebar');
        if (sidebar) sidebar.classList.toggle('-translate-x-full');
    },

    // ── Canvas toggling ───────────────────────────────────────────────────
    toggleCanvas(force) {
        const cv = document.getElementById('canvas-column');
        if (!cv) return;

        const isCurrentlyOpen = cv.style.width && cv.style.width !== '0px';
        const shouldOpen = force !== undefined ? force : !isCurrentlyOpen;

        if (force === false) window._userForceClosedCanvas = true;
        else if (force === true) window._userForceClosedCanvas = false;

        if (shouldOpen) {
            cv.style.width = window.innerWidth < 768 ? '100%' : '50%';
            cv.style.borderLeftWidth = '1px';
            cv.classList.add('open');
        } else {
            cv.style.width = '0px';
            cv.style.borderLeftWidth = '0px';
            cv.classList.remove('open');
        }
    },

    // ── Canvas tab switching ──────────────────────────────────────────────
    switchCanvasTab(tab) {
        const frame = document.getElementById('live-canvas-frame');
        const code  = document.getElementById('live-canvas-code');
        const tabP  = document.getElementById('tab-preview');
        const tabC  = document.getElementById('tab-code');

        if (!frame) return;

        const activeClass   = 'px-3 py-1 bg-gemini-card text-white text-xs rounded-md border border-gemini-border/50 shadow-sm font-semibold';
        const inactiveClass = 'px-3 py-1 text-gemini-textMuted hover:text-white text-xs rounded-md smooth-transition';

        if (tab === 'preview') {
            frame.classList.remove('hidden');
            if (code) code.classList.add('hidden');
            if (tabP) tabP.className = activeClass;
            if (tabC) tabC.className = inactiveClass;
        } else {
            frame.classList.add('hidden');
            if (code) { code.classList.remove('hidden'); code.innerText = this.canvasCode; }
            if (tabC) tabC.className = activeClass;
            if (tabP) tabP.className = inactiveClass;
        }
    },

    downloadCanvas() {
        if (!this.canvasCode) return;
        const a   = document.createElement('a');
        a.href    = URL.createObjectURL(new Blob([this.canvasCode], { type: 'text/html' }));
        a.download = `loma_app_${Date.now()}.html`;
        a.click();
        URL.revokeObjectURL(a.href);
    },

    // ── Update canvas — fixed sandbox ─────────────────────────────────────
    // allow-same-origin is required so fetch(), localStorage, and most APIs
    // work inside the canvas. The frame still can't access parent DOM.
    updateCanvas(htmlCode) {
        this.canvasCode = htmlCode;
        const frame = document.getElementById('live-canvas-frame');
        if (frame) {
            // Inject console hijack then set srcdoc
            frame.srcdoc = this._injectConsoleHijack(htmlCode);

            // Ensure correct sandbox: scripts + forms + same-origin + modals
            frame.sandbox = 'allow-scripts allow-forms allow-same-origin allow-modals';
        }
        const codeView = document.getElementById('live-canvas-code');
        if (codeView) codeView.innerText = htmlCode;

        if (!window._userForceClosedCanvas) {
            this.toggleCanvas(true);
            this.switchCanvasTab('preview');
        }
    },

    resizeCanvasFrame(mode) {
        const frame = document.getElementById('live-canvas-frame');
        if (!frame) return;
        const sizes = { desktop: '100%', tablet: '768px', mobile: '390px' };
        frame.style.width  = sizes[mode] || '100%';
        frame.style.margin = mode === 'desktop' ? '0' : '0 auto';
    },

    // ── Console hijack injection ──────────────────────────────────────────
    _injectConsoleHijack(html) {
        const hijack = `
        <script>
            (function() {
                const ol = console.log, oe = console.error, ow = console.warn;
                function emit(level, args) {
                    window.parent.postMessage({
                        type: 'LOMA_CONSOLE_OUT',
                        level: level,
                        msg: Array.from(args).map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' ')
                    }, '*');
                }
                console.log   = function(...a) { emit('log',   a); ol.apply(console, a); };
                console.error = function(...a) { emit('error', a); oe.apply(console, a); };
                console.warn  = function(...a) { emit('warn',  a); ow.apply(console, a); };
                window.onerror = function(msg, src, line) {
                    emit('error', [msg + ' (line ' + line + ')']);
                    return false;
                };
                window.addEventListener('unhandledrejection', e => {
                    emit('error', ['Unhandled promise rejection: ' + (e.reason?.message || e.reason)]);
                });
            })();
        <\/script>`;
        if (html.includes('<head>')) return html.replace('<head>', '<head>' + hijack);
        return hijack + html;
    },

    // ── Console listener ──────────────────────────────────────────────────
    _setupConsoleListener() {
        window.addEventListener('message', (e) => {
            if (!e.data || e.data.type !== 'LOMA_CONSOLE_OUT') return;
            const out = document.getElementById('canvas-console-output');
            if (!out) return;

            let colorClass = 'text-slate-300';
            let icon = 'fa-chevron-right text-slate-500';

            if (e.data.level === 'error') {
                colorClass = 'text-red-400 bg-red-950/20 px-2 py-0.5 rounded';
                icon = 'fa-triangle-exclamation text-red-500';
                // Auto-open console on errors
                const panel = document.getElementById('canvas-console-panel');
                if (panel?.classList.contains('hidden')) {
                    panel.classList.remove('hidden');
                    panel.classList.add('flex');
                }
            } else if (e.data.level === 'warn') {
                colorClass = 'text-yellow-400 bg-yellow-950/20 px-2 py-0.5 rounded';
                icon = 'fa-circle-exclamation text-yellow-500';
            }

            const line = document.createElement('div');
            line.className = `flex gap-2 items-start font-mono text-[11px] ${colorClass}`;
            line.innerHTML = `<i class="fa-solid ${icon} mt-0.5 shrink-0 text-[10px]"></i><span class="whitespace-pre-wrap break-all">${this.escapeHtml(e.data.msg)}</span>`;
            out.appendChild(line);
            out.scrollTop = out.scrollHeight;
        });
    },

    // ── Markdown setup ────────────────────────────────────────────────────
    _setupMarkdown() {
        if (typeof marked === 'undefined') return;

        const renderer = new marked.Renderer();

        renderer.code = (code, lang) => {
            const isHtml = lang === 'html' || lang === 'html5';
            const looksLikeApp = code.includes('<!DOCTYPE') || code.includes('<html')
                              || (code.includes('<script') && code.includes('<style') && isHtml)
                              || (code.trim().startsWith('<html') && isHtml);

            if (looksLikeApp && isHtml) {
                this.updateCanvas(code);
                return `
                <div class="my-4 p-4 bg-[#0a1215] rounded-xl border border-emerald-500/20 flex justify-between items-center shadow-lg">
                    <div class="flex items-center gap-3">
                        <div class="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <i class="fa-solid fa-cloud-arrow-up text-sm"></i>
                        </div>
                        <div>
                            <span class="text-emerald-400 text-xs font-bold block">Canvas Deployed</span>
                            <span class="text-[10px] text-slate-400 block mt-0.5">App running in sandbox workspace.</span>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.switchCanvasTab && window.switchCanvasTab('preview')"
                            class="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-[#070709] px-4 py-2 rounded-lg text-xs font-semibold smooth-transition">
                            View Live
                        </button>
                        <button onclick="window.lomaOpenCodeInCanvas && window.lomaOpenCodeInCanvas(decodeURIComponent('${encodeURIComponent(code)}'), '${lang || 'html'}')"
                            class="bg-gemini-card text-slate-400 hover:text-white px-3 py-2 rounded-lg text-xs smooth-transition border border-gemini-border/30">
                            Edit
                        </button>
                    </div>
                </div>`;
            }

            const escaped     = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const encoded     = encodeURIComponent(code);
            const displayLang = lang || 'code';

            const langColors = {
                javascript: '#f7df1e', typescript: '#3178c6', python: '#3572a5',
                html: '#ff5a36', css: '#7a82ff', rust: '#ce412b', go: '#00acd7',
                default: '#8a99ff'
            };
            const accent = langColors[displayLang.toLowerCase()] || langColors.default;
            const canOpen = ['html','html5','javascript','js','css'].includes(displayLang.toLowerCase());

            return `
            <div class="my-4 rounded-xl border border-[#1f212d] overflow-hidden text-xs shadow-xl">
                <div class="bg-[#0c0d12] px-4 py-2 flex justify-between items-center border-b border-[#1f212d]/80">
                    <div class="flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full" style="background-color:${accent}"></span>
                        <span class="font-bold tracking-wider text-[10px] uppercase text-slate-300">${displayLang}</span>
                    </div>
                    <div class="flex gap-3 items-center">
                        ${canOpen ? `<button onclick="window.lomaOpenCodeInCanvas(decodeURIComponent('${encoded}'),'${displayLang}')"
                            class="text-slate-500 hover:text-blue-400 transition text-[10px] font-semibold">Open in Canvas</button>` : ''}
                        <button onclick="navigator.clipboard.writeText(decodeURIComponent('${encoded}')); this.textContent='Copied!'; setTimeout(()=>this.textContent='Copy',2000)"
                            class="text-slate-500 hover:text-white transition text-[10px] font-semibold">Copy</button>
                    </div>
                </div>
                <pre class="p-4 bg-[#070709] overflow-x-auto leading-relaxed"><code class="text-slate-200" style="font-family:'JetBrains Mono',monospace;">${escaped}</code></pre>
            </div>`;
        };

        renderer.codespan = code =>
            `<code class="bg-[#0f111a] px-2 py-0.5 rounded border border-[#1f212d]/60 text-[#8a99ff] font-mono text-[0.88em]">${code}</code>`;

        renderer.table = (header, body) =>
            `<div class="overflow-x-auto my-4 rounded-xl border border-[#1f212d]/80">
               <table class="w-full text-sm border-collapse">
                 <thead class="bg-[#0c0d12] border-b border-[#1f212d]/80">${header}</thead>
                 <tbody class="divide-y divide-[#1f212d]/30">${body}</tbody>
               </table>
             </div>`;

        renderer.tablecell = (content, { header, align }) => {
            const tag = header ? 'th' : 'td';
            const cls = header
                ? 'px-4 py-3 text-left text-xs font-bold text-[#8a99ff] uppercase tracking-wider'
                : 'px-4 py-3 text-xs text-slate-300';
            const style = align ? ` style="text-align:${align}"` : '';
            return `<${tag} class="${cls}"${style}>${content}</${tag}>`;
        };

        renderer.link = (href, title, text) =>
            `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer"
               class="text-[#8a99ff] hover:text-[#a4b3ff] hover:underline underline-offset-4 font-medium smooth-transition">${text}</a>`;

        renderer.blockquote = quote =>
            `<blockquote class="border-l-2 border-[#d09cff] pl-4 my-4 text-slate-400 italic bg-[#0f111a]/40 py-1 pr-2 rounded-r-lg">${quote}</blockquote>`;

        renderer.heading = (text, level) => {
            const sizes = ['text-xl font-bold', 'text-lg font-bold', 'text-base font-semibold', 'text-sm font-semibold'];
            const cls = sizes[level - 1] || 'text-sm font-semibold';
            return `<h${level} class="${cls} text-white mt-4 mb-2">${text}</h${level}>`;
        };

        renderer.list = (body, ordered) => {
            const tag = ordered ? 'ol' : 'ul';
            const cls = ordered ? 'list-decimal' : 'list-disc';
            return `<${tag} class="${cls} pl-5 my-2 space-y-1 text-slate-300">${body}</${tag}>`;
        };

        renderer.listitem = text =>
            `<li class="text-sm leading-relaxed">${text}</li>`;

        marked.setOptions({ renderer, breaks: true, gfm: true });
    },

    // ── Process AI stream replies ─────────────────────────────────────────
    processContent(text) {
        let clean = text
            .replace(/<think:[a-z_]+>[\s\S]*?<\/think:[a-z_]+>/gi, '')
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/<think:[a-z_]+>[\s\S]*/gi, '')
            .replace(/<think>[\s\S]*/gi, '')
            // Strip [REMEMBER: ...] tags from visible output
            .replace(/\[REMEMBER:[^\]]+\]/gi, '')
            .trim();

        if (typeof marked === 'undefined') {
            return `<div class="prose text-slate-200 text-sm leading-relaxed">${clean}</div>`;
        }
        return `<div class="prose prose-invert prose-sm max-w-none">${marked.parse(clean)}</div>`;
    },

    // ── Append chat bubble ────────────────────────────────────────────────
    appendBubble(role, html) {
        const stream = document.getElementById('chat-stream');
        if (!stream) return document.createElement('div');

        const empty = document.getElementById('empty-state');
        if (empty) empty.remove();

        const wrap   = document.createElement('div');
        const isUser = role === 'user';
        wrap.className = `flex gap-4 w-full ${isUser ? 'justify-end' : 'justify-start'} animate-[fadeIn_0.3s_ease-out]`;

        const avatar = isUser
            ? `<div class="h-8 w-8 rounded-full bg-gemini-sidebar flex items-center justify-center shrink-0 border border-gemini-border/40 text-slate-300 text-xs">
                   <i class="fa-solid fa-user text-[11px]"></i></div>`
            : `<div class="h-8 w-8 rounded-full bg-gemini-card flex items-center justify-center shrink-0 border border-[#1f212d] text-gemini-accent shadow-lg shadow-indigo-500/5">
                   <i class="fa-solid fa-sparkles text-[11px]"></i></div>`;

        const bubbleClass = isUser
            ? 'bg-gemini-sidebar text-slate-200 px-5 py-3 rounded-3xl rounded-tr-sm border border-[#1f212d]/30 max-w-[85%] text-left shadow-md'
            : 'text-slate-200 py-1 w-full max-w-full leading-relaxed';

        const bubble = document.createElement('div');
        bubble.className = `${bubbleClass} output-response-zone text-[14px] md:text-[15px]`;
        bubble.innerHTML = html;

        wrap.innerHTML = !isUser ? avatar : '';
        wrap.appendChild(bubble);
        if (isUser) wrap.insertAdjacentHTML('beforeend', avatar);

        stream.appendChild(wrap);
        if (window.autoScrollChat !== false) stream.scrollTop = stream.scrollHeight;
        return bubble;
    },

    // ── Loading dots ──────────────────────────────────────────────────────
    loading() {
        return `<div class="flex gap-1.5 items-center h-6 my-2 px-2">
            <div class="gemini-loading-dot"></div>
            <div class="gemini-loading-dot"></div>
            <div class="gemini-loading-dot"></div>
        </div>`;
    },

    // ── Safe HTML escape ──────────────────────────────────────────────────
    escapeHtml(text) {
        return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
};

// ── Expose global hooks ───────────────────────────────────────────────────────
window.UI                     = UI;
window.updateCanvasLive       = (html) => UI.updateCanvas(html);
window.toggleCanvasVisibility = (open) => UI.toggleCanvas(open);
window.switchCanvasTab        = (tab)  => UI.switchCanvasTab(tab);
window.downloadCanvasCode     = ()     => UI.downloadCanvas();
window.resizeCanvasFrame      = (mode) => UI.resizeCanvasFrame(mode);

window.toggleCanvasConsole = () => {
    const panel = document.getElementById('canvas-console-panel');
    if (panel) {
        panel.classList.toggle('hidden');
        panel.classList.toggle('flex');
    }
};