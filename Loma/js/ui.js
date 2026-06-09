export const UI = {
    canvasCode: '',

    init() {
        document.getElementById('btn-toggle-sidebar').onclick = () => this.toggleSidebar();
        document.getElementById('btn-toggle-canvas').onclick = () => this.toggleCanvas();
        document.getElementById('btn-close-canvas').onclick = () => this.toggleCanvas(false);
        document.getElementById('btn-download-canvas').onclick = () => this.downloadCanvas();
        this._setupMarkdown();
    },

    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('collapsed');
    },

    toggleCanvas(force) {
        const cv = document.getElementById('canvas-panel');
        const shouldOpen = force !== undefined ? force : !cv.classList.contains('open');
        cv.classList.toggle('open', shouldOpen);
    },

    downloadCanvas() {
        if (!this.canvasCode) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([this.canvasCode], { type: 'text/html' }));
        a.download = 'loma_app.html';
        a.click();
    },

    _setupMarkdown() {
        const renderer = new marked.Renderer();

        renderer.code = (code, lang) => {
            // Auto-deploy HTML to canvas
            if ((lang === 'html' || lang === 'html5') && code.trim().toLowerCase().includes('<!doctype') || (code.trim().startsWith('<html') && (lang === 'html' || lang === 'html5'))) {
                this.canvasCode = code;
                // Use srcdoc for full isolation — supports all scripts, no src issues
                const frame = document.getElementById('canvas-frame');
                frame.srcdoc = code;
                this.toggleCanvas(true);
                return `<div class="my-3 p-3 bg-[#0d1f12] rounded-xl border border-emerald-500/40 flex justify-between items-center">
                    <span class="text-emerald-400 text-xs font-bold"><i class="fa-solid fa-circle-check mr-1"></i>Deployed to Canvas</span>
                    <button onclick="document.getElementById('btn-toggle-canvas').click()" class="bg-[#1e3a27] text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-600 hover:text-white text-xs font-bold transition">Open</button>
                </div>`;
            }

            const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const encForCopy = encodeURIComponent(code);
            const displayLang = lang || 'code';
            return `<div class="my-3 rounded-xl border border-[#2e2f30] overflow-hidden text-xs">
                <div class="bg-[#1a1b1c] px-3 py-1.5 flex justify-between items-center border-b border-[#2e2f30]">
                    <span class="uppercase text-gray-500 font-bold tracking-wider">${displayLang}</span>
                    <button onclick="navigator.clipboard.writeText(decodeURIComponent('${encForCopy}'));this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',2000)" class="text-gray-400 hover:text-white transition">Copy</button>
                </div>
                <pre class="p-4 bg-[#0d0d0e] overflow-x-auto leading-relaxed"><code class="text-[#a8c7fa]">${escaped}</code></pre>
            </div>`;
        };

        renderer.codespan = (code) => `<code class="bg-[#1e1f20] px-1.5 py-0.5 rounded text-[#a8c7fa] text-[0.85em]">${code}</code>`;

        marked.setOptions({ renderer, breaks: true, gfm: true });
    },

    processContent(text) {
        // Strip thinking blocks
        let clean = text
            .replace(/<think>[\s\S]*?<\/think>/g, '')
            .replace(/<think:[a-z]+>[\s\S]*?<\/think:[a-z]+>/g, '')
            .replace(/<think>[\s\S]*/g, '')
            .trim();

        // Render [GENERATE_IMAGE: ...] tags
        clean = clean.replace(
            /\[GENERATE_IMAGE:\s*prompt="([^"]+)"(?:\s+ratio="([^"]*)")?\]/gi,
            (_, prompt, ratio) => {
                const size = ratio || '1024x1024';
                const [w, h] = size.split('x').map(Number);
                const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w||1024}&height=${h||1024}&nologo=true&enhance=true&model=flux`;
                return `<div class="my-4 max-w-md">
                    <div class="relative rounded-xl overflow-hidden border border-[#2e2f30] bg-[#1a1b1c]">
                        <img src="${url}" alt="${prompt}" class="w-full block" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'p-4 text-red-400 text-xs\\'>Image generation failed. Check Pollinations API.</div>'">
                    </div>
                    <p class="text-[10px] text-gray-500 mt-1.5 leading-relaxed"><i class="fa-solid fa-image text-[#a8c7fa] mr-1"></i>${prompt}</p>
                </div>`;
            }
        );

        return `<div class="prose">${marked.parse(clean)}</div>`;
    },

    appendBubble(role, html) {
        const stream = document.getElementById('chat-stream');
        const empty = document.getElementById('empty-state');
        if (empty) empty.remove();

        const wrap = document.createElement('div');
        wrap.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;

        const bubble = document.createElement('div');
        bubble.className = role === 'user'
            ? 'max-w-[80%] px-4 py-3 text-sm bg-[#1e1f20] rounded-2xl rounded-br-sm text-gray-200 border border-[#2e2f30]'
            : 'text-sm text-gray-200 w-full max-w-full';

        bubble.innerHTML = html;
        wrap.appendChild(bubble);
        stream.appendChild(wrap);
        stream.scrollTop = stream.scrollHeight;
        return bubble;
    },

    loading() {
        return '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    }
};