export const UI = {
    canvasCode: '',

    init() {
        const btnSidebar  = document.getElementById('btn-toggle-sidebar');
        const btnCanvas   = document.getElementById('btn-toggle-canvas');
        const btnClose    = document.getElementById('btn-close-canvas');
        const btnDownload = document.getElementById('btn-download-canvas');
        const btnTabPreview = document.getElementById('tab-preview');
        const btnTabCode  = document.getElementById('tab-code');

        if (btnSidebar)  btnSidebar.onclick  = () => this.toggleSidebar();
        if (btnCanvas)   btnCanvas.onclick   = () => this.toggleCanvas();
        if (btnClose)    btnClose.onclick    = () => this.toggleCanvas(false);
        if (btnDownload) btnDownload.onclick = () => this.downloadCanvas();
        if (btnTabPreview) btnTabPreview.onclick = () => this.switchCanvasTab('preview');
        if (btnTabCode)    btnTabCode.onclick    = () => this.switchCanvasTab('code');

        this._setupMarkdown();
    },

    // ── Sidebar ────────────────────────────────────────────────────────────
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar') || document.getElementById('gemini-sidebar');
        if (sidebar) sidebar.classList.toggle('collapsed');
        if (sidebar) sidebar.classList.toggle('-translate-x-full');
    },

    // ── Canvas ────────────────────────────────────────────────────────────
    toggleCanvas(force) {
        // Support both old and new canvas panel IDs
        const cv = document.getElementById('canvas-panel')
                || document.getElementById('canvas-column');
        if (!cv) return;

        const isCurrentlyOpen = cv.classList.contains('open')
                             || (cv.style.width && cv.style.width !== '0px');
        const shouldOpen = force !== undefined ? force : !isCurrentlyOpen;

        if (cv.classList.contains('open') !== undefined && cv.style.width !== undefined) {
            // New-style width-based panel (index.html)
            if (shouldOpen) {
                cv.style.width = window.innerWidth < 768 ? '100%' : '50%';
                cv.style.borderLeftWidth = '1px';
            } else {
                cv.style.width = '0px';
                cv.style.borderLeftWidth = '0px';
            }
        } else {
            cv.classList.toggle('open', shouldOpen);
        }
    },

    switchCanvasTab(tab) {
        const frame = document.getElementById('live-canvas-frame') || document.getElementById('canvas-frame');
        const code  = document.getElementById('live-canvas-code');
        const tabP  = document.getElementById('tab-preview');
        const tabC  = document.getElementById('tab-code');

        if (!frame) return;

        const activeClass  = 'px-3 py-1 bg-gemini-card text-white text-xs rounded-md border border-gemini-border/50 shadow-sm font-semibold';
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

    // ── Update canvas iframe ──────────────────────────────────────────────
    updateCanvas(htmlCode) {
        this.canvasCode = htmlCode;
        const frame = document.getElementById('live-canvas-frame') || document.getElementById('canvas-frame');
        if (frame) {
            frame.srcdoc = htmlCode;
        }
        const codeView = document.getElementById('live-canvas-code');
        if (codeView) codeView.innerText = htmlCode;
        this.toggleCanvas(true);
        this.switchCanvasTab('preview');
    },

    // ── Resize canvas frame ───────────────────────────────────────────────
    resizeCanvasFrame(mode) {
        const frame = document.getElementById('live-canvas-frame') || document.getElementById('canvas-frame');
        if (!frame) return;
        const sizes = { desktop: '100%', tablet: '768px', mobile: '390px' };
        frame.style.width  = sizes[mode] || '100%';
        frame.style.margin = mode === 'desktop' ? '0' : '0 auto';
    },

    // ── Markdown + code renderer ─────────────────────────────────────────
    _setupMarkdown() {
        if (typeof marked === 'undefined') return;

        const renderer = new marked.Renderer();

        renderer.code = (code, lang) => {
            // ── Auto-deploy HTML apps to canvas ──────────────────────────
            const isHtml = (lang === 'html' || lang === 'html5' || !lang);
            const looksLikeApp = code.trim().toLowerCase().startsWith('<!doctype')
                              || (code.trim().startsWith('<html') && isHtml);

            if (looksLikeApp && isHtml) {
                // Deploy to canvas immediately
                this.updateCanvas(code);

                return `<div class="my-3 p-3 bg-[#0d1f12] rounded-xl border border-emerald-500/40
                              flex justify-between items-center">
                    <span class="text-emerald-400 text-xs font-bold">
                        <i class="fa-solid fa-circle-check mr-1"></i>Deployed to Canvas
                    </span>
                    <div class="flex gap-2">
                        <button onclick="window.switchCanvasTab && window.switchCanvasTab('preview')"
                            class="bg-[#1e3a27] text-emerald-300 px-3 py-1.5 rounded-lg
                                   hover:bg-emerald-600 hover:text-white text-xs font-bold transition">
                            Open
                        </button>
                        <button onclick="window.lomaOpenInNewTab && window.lomaOpenInNewTab(
                                    decodeURIComponent(atob('${btoa(encodeURIComponent(code))}')),'html')"
                            class="bg-[#1a1b1c] text-gray-300 px-3 py-1.5 rounded-lg
                                   hover:bg-[#2e2f30] text-xs font-bold transition">
                            New Tab
                        </button>
                    </div>
                </div>`;
            }

            // ── Regular code block ────────────────────────────────────────
            const escaped    = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const encoded    = encodeURIComponent(code);
            const displayLang = lang || 'code';

            // Language-specific syntax accent color
            const langColor = {
                javascript: '#f7df1e', typescript: '#3178c6', python:  '#3572a5',
                html:       '#e34c26', css:        '#563d7c',  rust:   '#dea584',
                cpp:        '#f34b7d', 'c++':      '#f34b7d',  java:   '#b07219',
                csharp:     '#178600', swift:      '#ffac45',  kotlin: '#a97bff',
                go:         '#00add8', sql:        '#e38c00',  bash:   '#89e051',
                powershell: '#012456', json:       '#292929',  default: '#a8c7fa'
            }[displayLang.toLowerCase()] || '#a8c7fa';

            // Determine if runnable in canvas
            const canRender = ['html','html5','javascript','js'].includes(displayLang.toLowerCase());

            return `<div class="my-3 rounded-xl border border-[#2e2f30] overflow-hidden text-xs">
                <div class="bg-[#1a1b1c] px-3 py-1.5 flex justify-between items-center border-b border-[#2e2f30]">
                    <span class="font-bold tracking-wider text-[10px] uppercase"
                          style="color:${langColor}">${displayLang}</span>
                    <div class="flex gap-2">
                        ${canRender ? `<button
                            onclick="window.lomaOpenCodeInCanvas && window.lomaOpenCodeInCanvas(
                                decodeURIComponent('${encoded}'),'${displayLang}')"
                            class="text-[10px] text-[#a8c7fa] hover:text-white transition">
                            Canvas
                        </button>` : ''}
                        <button
                            onclick="navigator.clipboard.writeText(decodeURIComponent('${encoded}'));
                                     this.textContent='Copied!';
                                     setTimeout(()=>this.textContent='Copy',2000)"
                            class="text-gray-400 hover:text-white transition text-[10px]">
                            Copy
                        </button>
                    </div>
                </div>
                <pre class="p-4 bg-[#0d0d0e] overflow-x-auto leading-relaxed"><code
                    class="text-[#a8c7fa]">${escaped}</code></pre>
            </div>`;
        };

        renderer.codespan = code =>
            `<code class="bg-[#1e1f20] px-1.5 py-0.5 rounded text-[#a8c7fa] text-[0.85em]">${code}</code>`;

        renderer.table = (header, body) =>
            `<div class="overflow-x-auto my-3">
               <table class="w-full text-sm border-collapse">
                 <thead class="bg-[#1e1f20]">${header}</thead>
                 <tbody>${body}</tbody>
               </table>
             </div>`;

        renderer.tablecell = (content, { header, align }) => {
            const tag   = header ? 'th' : 'td';
            const cls   = header
                ? 'px-4 py-2 text-left text-xs font-bold text-[#a8c7fa] border border-[#2e2f30]'
                : 'px-4 py-2 text-xs text-gray-300 border border-[#2e2f30]';
            const style = align ? ` style="text-align:${align}"` : '';
            return `<${tag} class="${cls}"${style}>${content}</${tag}>`;
        };

        renderer.link = (href, title, text) =>
            `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer"
               class="text-[#a8c7fa] hover:text-blue-400 hover:underline underline-offset-2 transition">
               ${text}</a>`;

        renderer.blockquote = quote =>
            `<blockquote class="border-l-2 border-[#a8c7fa]/40 pl-4 my-3 text-gray-400 italic">
               ${quote}</blockquote>`;

        marked.setOptions({ renderer, breaks: true, gfm: true });
    },

    // ── Process AI output — strip think blocks, render tags ──────────────
    processContent(text) {
        let clean = text
            .replace(/<think:[a-z_]+>[\s\S]*?<\/think:[a-z_]+>/gi, '')
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/<think:[a-z_]+>[\s\S]*/gi, '')
            .replace(/<think>[\s\S]*/gi, '')
            .trim();

        // ── Render [GENERATE_IMAGE: ...] tags ────────────────────────────
        clean = clean.replace(
            /\[GENERATE_IMAGE:\s*prompt="([^"]+)"(?:\s+(?:ratio|style)="[^"]*")*\s*\]/gi,
            (_, prompt) => {
                const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&enhance=true&model=flux`;
                return `<div class="my-4 max-w-lg">
                    <div class="relative rounded-xl overflow-hidden border border-[#2e2f30] bg-[#1a1b1c]">
                        <div class="absolute inset-0 flex items-center justify-center">
                            <div class="flex gap-1">
                                <span class="gemini-loading-dot"></span>
                                <span class="gemini-loading-dot"></span>
                                <span class="gemini-loading-dot"></span>
                            </div>
                        </div>
                        <img src="${url}" alt="${prompt}"
                             class="w-full block relative z-10"
                             loading="lazy"
                             onload="this.previousElementSibling.remove()"
                             onerror="this.parentElement.innerHTML='<div class=\\'p-4 text-red-400 text-xs\\'>Image generation failed.</div>'">
                    </div>
                    <div class="flex justify-between items-center mt-2">
                        <p class="text-[10px] text-gray-500 leading-relaxed flex-1 mr-2">
                            <i class="fa-solid fa-image text-[#a8c7fa] mr-1"></i>${prompt}
                        </p>
                        <a href="${url}" download="loma-image-${Date.now()}.jpg"
                           class="text-[10px] text-[#a8c7fa] hover:text-white transition px-2 py-1
                                  bg-[#1a1b1c] border border-[#2e2f30] rounded">
                            Save
                        </a>
                    </div>
                </div>`;
            }
        );

        // ── Render [GENERATE_MUSIC: ...] tags (placeholder until bridge processes) ──
        clean = clean.replace(
            /\[GENERATE_MUSIC:\s*([^\]]+)\]/gi,
            (match, attrs) => {
                const promptMatch = attrs.match(/prompt="([^"]+)"/);
                const prompt = promptMatch ? promptMatch[1] : 'music';
                return `<div class="my-3 p-3 bg-[#1a1b1c] border border-[#2e2f30] rounded-xl text-xs">
                    <div class="flex items-center gap-2 text-[#a8c7fa] mb-2">
                        <i class="fa-solid fa-music"></i> Generating music…
                    </div>
                    <p class="text-gray-400">"${prompt}"</p>
                    <div class="flex gap-1 mt-2">
                        <span class="gemini-loading-dot"></span>
                        <span class="gemini-loading-dot"></span>
                        <span class="gemini-loading-dot"></span>
                    </div>
                </div>`;
            }
        );

        if (typeof marked === 'undefined') {
            return `<div class="prose">${clean}</div>`;
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
        wrap.className = `flex gap-4 w-full ${isUser ? 'justify-end' : 'justify-start'}`;

        const avatar = isUser
            ? `<div class="h-8 w-8 rounded-full bg-gemini-sidebar flex items-center justify-center
                           shrink-0 border border-gemini-border/40 text-slate-300 text-xs">
                   <i class="fa-solid fa-user"></i></div>`
            : `<div class="h-8 w-8 rounded-full bg-gemini-card flex items-center justify-center
                           shrink-0 border border-gemini-border text-gemini-accent shadow-sm">
                   <i class="fa-solid fa-sparkles"></i></div>`;

        const bubbleClass = isUser
            ? 'bg-gemini-sidebar text-slate-200 px-5 py-3 rounded-3xl rounded-tr-sm border border-gemini-border/30 max-w-[85%] text-left'
            : 'text-slate-200 py-1 w-full max-w-full leading-relaxed';

        const bubble = document.createElement('div');
        bubble.className = `${bubbleClass} output-response-zone text-[15px]`;
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
        return `<div class="flex gap-1 items-center h-6 my-2 px-2">
            <div class="gemini-loading-dot"></div>
            <div class="gemini-loading-dot"></div>
            <div class="gemini-loading-dot"></div>
        </div>`;
    },

    // ── HTML escape ───────────────────────────────────────────────────────
    escapeHtml(text) {
        return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
};

// ── Expose canvas update globally (called from engine/tools) ──────────────────
window.updateCanvasLive      = (html, force) => UI.updateCanvas(html);
window.toggleCanvasVisibility = (open)       => UI.toggleCanvas(open);
window.switchCanvasTab        = (tab)        => UI.switchCanvasTab(tab);
window.downloadCanvasCode     = ()           => UI.downloadCanvas();
window.resizeCanvasFrame      = (mode)       => UI.resizeCanvasFrame(mode);