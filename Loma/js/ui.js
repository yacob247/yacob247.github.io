// ═══════════════════════════════════════════════════════════════════════════════
//  js/ui.js — Pure rendering, markdown compile, and state synchronization.
//  Bypasses iframe restrictions cleanly to support dynamic layout tests.
// ═══════════════════════════════════════════════════════════════════════════════

export const UI = {
    canvasCode: '',

    init() {
        this._setupMarkdown();
        this._setupConsoleListener();
        window._userForceClosedCanvas = false;
    },

    toggleCanvas(force) {
        const cv = document.getElementById('canvas-column');
        if (!cv) return;

        const isCurrentlyOpen = cv.style.width && cv.style.width !== '0px';
        const shouldOpen = force !== undefined ? force : !isCurrentlyOpen;

        if (force === false) window._userForceClosedCanvas = true;
        else if (force === true) window._userForceClosedCanvas = false;

        if (shouldOpen) {
            cv.style.width = window.innerWidth < 768 ? '100%' : '50%';
            cv.classList.add('open');
        } else {
            cv.style.width = '0px';
            cv.classList.remove('open');
        }
    },

    switchCanvasTab(tab) {
        const frame = document.getElementById('live-canvas-frame');
        const code  = document.getElementById('live-canvas-code');
        const tabP  = document.getElementById('tab-preview');
        const tabC  = document.getElementById('tab-code');

        if (!frame) return;

        const activeClass   = 'px-3 py-1 bg-claude-card text-white text-[11px] rounded-md shadow-sm font-semibold border border-claude-border';
        const inactiveClass = 'px-3 py-1 text-claude-textMuted hover:text-white text-[11px] rounded-md smooth-transition';

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
        const a    = document.createElement('a');
        a.href     = URL.createObjectURL(new Blob([this.canvasCode], { type: 'text/html' }));
        a.download = `loma_artifact_${Date.now()}.html`;
        a.click();
        URL.revokeObjectURL(a.href);
    },

    updateCanvas(htmlCode) {
        this.canvasCode = htmlCode;
        const frame = document.getElementById('live-canvas-frame');
        if (frame) {
            frame.srcdoc = this._injectConsoleHijack(htmlCode);
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
            })();
        <\/script>`;
        if (html.includes('<head>')) return html.replace('<head>', '<head>' + hijack);
        return hijack + html;
    },

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
                const panel = document.getElementById('canvas-console-panel');
                if (panel?.classList.contains('hidden')) {
                    panel.classList.remove('hidden');
                    panel.classList.add('flex');
                }
            } else if (e.data.level === 'warn') {
                colorClass = 'text-amber-400 bg-amber-950/20 px-2 py-0.5 rounded';
                icon = 'fa-circle-exclamation text-amber-500';
            }

            const line = document.createElement('div');
            line.className = `flex gap-2 items-start font-mono text-[11px] ${colorClass}`;
            line.innerHTML = `<i class="fa-solid ${icon} mt-0.5 shrink-0 text-[10px]"></i><span class="whitespace-pre-wrap break-all">${this.escapeHtml(e.data.msg)}</span>`;
            out.appendChild(line);
            out.scrollTop = out.scrollHeight;
        });
    },

    _setupMarkdown() {
        if (typeof marked === 'undefined') return;
        const renderer = new marked.Renderer();

        renderer.code = (code, lang) => {
            const isHtml = lang === 'html' || lang === 'html5';
            const looksLikeApp = code.includes('<!DOCTYPE') || code.includes('<html')
                              || (code.includes('<script') && code.includes('<style') && isHtml);

            if (looksLikeApp && isHtml) {
                this.updateCanvas(code);
                return `
                <div class="my-4 p-4 bg-claude-card rounded-xl border border-claude-accent/30 flex justify-between items-center shadow-lg">
                    <div class="flex items-center gap-3">
                        <div class="h-8 w-8 rounded-lg bg-claude-accent/10 flex items-center justify-center text-claude-accent">
                            <i class="fa-solid fa-cubes text-sm"></i>
                        </div>
                        <div>
                            <span class="text-slate-200 text-xs font-semibold block">Artifact Assembled</span>
                            <span class="text-[10px] text-claude-textMuted block mt-0.5">Application successfully deployed to sandboxed preview.</span>
                        </div>
                    </div>
                    <button onclick="window.switchCanvasTab && window.switchCanvasTab('preview')"
                        class="bg-claude-accent text-white hover:bg-[#b86d38] px-4 py-2 rounded-lg text-xs font-semibold smooth-transition">
                        View Live
                    </button>
                </div>`;
            }

            const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const encoded = encodeURIComponent(code);
            const displayLang = lang || 'code';

            return `
            <div class="my-4 rounded-xl border border-claude-border overflow-hidden text-xs shadow-xl">
                <div class="bg-[#121212] px-4 py-2 flex justify-between items-center border-b border-claude-border">
                    <span class="font-mono text-slate-300 uppercase tracking-wider text-[10px]">${displayLang}</span>
                    <button onclick="navigator.clipboard.writeText(decodeURIComponent('${encoded}')); this.textContent='Copied!'; setTimeout(()=>this.textContent='Copy',2000)"
                        class="text-slate-500 hover:text-white transition text-[10px] font-semibold">Copy</button>
                </div>
                <pre class="p-4 bg-claude-bg overflow-x-auto leading-relaxed"><code class="text-slate-200" style="font-family:'JetBrains Mono',monospace;">${escaped}</code></pre>
            </div>`;
        };

        renderer.codespan = code =>
            `<code class="bg-[#242424] px-1.5 py-0.5 rounded text-claude-accent font-mono text-[0.9em]">${code}</code>`;

        renderer.link = (href, title, text) =>
            `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener" class="text-claude-accent hover:underline font-medium">${text}</a>`;

        marked.setOptions({ renderer, breaks: true, gfm: true });
    },

    processContent(text) {
        let clean = text
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/<think>[\s\S]*/gi, '')
            .trim();

        if (typeof marked === 'undefined') {
            return `<div class="prose text-slate-200 text-sm leading-relaxed">${clean}</div>`;
        }
        return `<div class="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed">${marked.parse(clean)}</div>`;
    },

    appendBubble(role, html) {
        const stream = document.getElementById('chat-stream');
        if (!stream) return document.createElement('div');

        const empty = document.getElementById('empty-state');
        if (empty) empty.remove();

        const wrap   = document.createElement('div');
        const isUser = role === 'user';
        wrap.className = `flex gap-4 w-full ${isUser ? 'justify-end' : 'justify-start'} animate-[fadeIn_0.3s_ease-out]`;

        const avatar = isUser
            ? `<div class="h-8 w-8 rounded-lg bg-claude-sidebar flex items-center justify-center shrink-0 border border-claude-border text-slate-300 text-xs">
                   <i class="fa-solid fa-fingerprint"></i></div>`
            : `<div class="h-8 w-8 rounded-lg bg-claude-card flex items-center justify-center shrink-0 border border-claude-border text-claude-accent">
                   <i class="fa-solid fa-compass"></i></div>`;

        const bubbleClass = isUser
            ? 'bg-claude-card text-slate-200 px-5 py-3 rounded-2xl rounded-tr-none border border-claude-border max-w-[85%] text-left shadow-md'
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

    loading() {
        return `<div class="flex gap-1.5 items-center h-6 my-2 px-2">
            <div class="h-1.5 w-1.5 bg-claude-accent rounded-full animate-bounce" style="animation-delay: 0s"></div>
            <div class="h-1.5 w-1.5 bg-claude-accent rounded-full animate-bounce" style="animation-delay: 0.15s"></div>
            <div class="h-1.5 w-1.5 bg-claude-accent rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
        </div>`;
    },

    escapeHtml(text) {
        return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
};

window.UI                     = UI;
window.updateCanvasLive       = (html) => UI.updateCanvas(html);
window.toggleCanvasVisibility = (open) => UI.toggleCanvas(open);
window.switchCanvasTab        = (tab)  = UI.switchCanvasTab(tab);
window.downloadCanvasCode     = ()     => UI.downloadCanvas();
window.resizeCanvasFrame      = (mode) => UI.resizeCanvasFrame(mode);

window.toggleCanvasConsole = () => {
    const panel = document.getElementById('canvas-console-panel');
    if (panel) {
        panel.classList.toggle('hidden');
        panel.classList.toggle('flex');
    }
};