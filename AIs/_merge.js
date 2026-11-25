const fs = require('fs');
const text = fs.readFileSync('c:/Users/youse/Downloads/AIs/text.html', 'utf8');
let studio = fs.readFileSync('c:/Users/youse/Downloads/AIs/aistudio.html', 'utf8');

// ---- Extract chat pieces ----
const styleM = text.match(/<style>[\s\S]*?<\/style>/);
if (!styleM) throw new Error('chat style not found');
const chatStyle = styleM[0];

const bodyStart = text.indexOf('<!-- Mobile Overlay for Sidebar -->');
const bodyEnd = text.indexOf('<!-- MAIN LOGIC (WebLLM & DB) -->');
if (bodyStart < 0 || bodyEnd < 0) throw new Error('chat body markers not found');
let chatBody = text.slice(bodyStart, bodyEnd).trim();

const scriptStart = text.indexOf('// Store messages in IndexedDB');
const scriptEnd = text.lastIndexOf('</script>');
if (scriptStart < 0 || scriptEnd < 0) throw new Error('chat script markers not found');
let chatScript = text.slice(scriptStart, scriptEnd);

// ---- Transform chat script: prefer in-page tool runner ----
const rnt = 'function requestNexusTool(id, argsJson, imageDataUrl) {';
if (!chatScript.includes(rnt)) throw new Error('requestNexusTool not found');
chatScript = chatScript.replace(rnt,
    'function requestNexusTool(id, argsJson, imageDataUrl) {\n            if (window.nexusRunTool) return window.nexusRunTool(id, argsJson, imageDataUrl);');

// ---- Transform studio ----
// 1. tailwind gemini colors
const twOld = "colors: { dark: { base: '#050507', card: '#0f0f13', border: '#1f1f26', muted: '#8b8b99', accent: '#6366f1' } }";
if (!studio.includes(twOld)) throw new Error('tailwind config not found');
const twNew = "colors: { dark: { base: '#050507', card: '#0f0f13', border: '#1f1f26', muted: '#8b8b99', accent: '#6366f1' }, gemini: { bg: '#131314', sidebar: '#1e1f20', panel: '#131314', card: '#282a2c', border: '#3c4043', accent: '#a8c7fa', textMain: '#e3e3e3', textMuted: '#9e9e9e', inputBg: '#1e1f20', thinking: '#1a1f2c' } }";
studio = studio.replace(twOld, twNew);

// ---- write parts for step 2 ----
fs.writeFileSync('c:/Users/youse/Downloads/AIs/_parts_style.html', chatStyle);
fs.writeFileSync('c:/Users/youse/Downloads/AIs/_parts_body.html', chatBody);
fs.writeFileSync('c:/Users/youse/Downloads/AIs/_parts_script.js', chatScript);
console.log('EXTRACT OK — style:', chatStyle.length, 'body:', chatBody.length, 'script:', chatScript.length);

// STEP 2: apply to studio

const headAdd = `
    <!-- Merged Gemini Local Chat: styles & libs (was text.html iframe) -->
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/marked@4.3.0/marked.min.js"></script>
    <script>
        const _r2Base = "https://pub-406a7f3fa4d44f41b5317520aa1aaf4a.r2.dev/";
        const _origFetch = window.fetch.bind(window);
        window.fetch = (input, init) => {
            let url = (input instanceof Request) ? input.url : String(input);
            if (url.startsWith(_r2Base)) { url = url.replace("/resolve/main/", "/"); input = (input instanceof Request) ? new Request(url, input) : url; }
            return _origFetch(input, init);
        };
    </script>
    <script type="module">
        import * as webllm from "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm/+esm";
        window.webllm = webllm;
    </script>
    ${chatStyle}
</head>`;
if (!studio.includes('</head>')) throw new Error('head close not found');
studio = studio.replace('</head>', headAdd);

// 3. replace iframe with inlined chat body
const iframeTag = `<iframe src="text.html" class="w-full h-full border-0" allow="cross-origin-isolated" sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads"></iframe>`;
if (!studio.includes(iframeTag)) throw new Error('iframe tag not found');
studio = studio.replace(iframeTag, `<div id="chat-root" class="absolute inset-0 flex overflow-hidden antialiased selection:bg-gemini-accent selection:text-black">\n${chatBody}\n</div>`);

fs.writeFileSync('c:/Users/youse/Downloads/AIs/aistudio.html', studio);
console.log('MERGE STEP 2 OK (head + body). size:', studio.length);


// 4. shared in-page tool runner: refactor the message listener
const listenerStart = studio.indexOf("window.addEventListener('message', async e => {");
const listenerEnd = studio.indexOf('// ---------- Local AI Chat ----------', listenerStart);
if (listenerStart < 0 || listenerEnd < 0) throw new Error('bridge listener markers not found');
const sharedRunner = `    // Shared in-page tool runner — used by the message bridge AND the merged chat directly
    async function runNexusTool(id, args, image, image2, video, audio, options) {
        let out;
        if (id === 'bg-remove') {
            if (!image) throw new Error('Please attach an image in the chat first.');
            out = { type: 'image', dataUrl: await bridgeBgRemove(image), name: 'isolated.png' };
        } else if (id === 'img-gen' || id === 't2i') {
            if (!args) throw new Error('Please describe the image you want.');
            out = { type: 'image', dataUrl: await bridgeImgGen(args), name: 'generated.png' };
        } else {
            const t = findToolById(id);
            if (!t) throw new Error('Unknown tool: ' + id);
            out = await IMPL[id]({ tool: t, prompt: args || '', options: options || {}, url1: image, url2: image2, videoUrl: video, audioUrl: audio, setProgress: () => {}, mask: null });
        }
        const payload = { ok: true, kind: out.type, name: out.name || 'output' };
        if (out.type === 'text') payload.text = out.text;
        else payload.dataUrl = out.blob ? (await blobToDataUrl(out.blob)) : (out.dataUrl || out.url);
        return payload;
    }
    window.nexusRunTool = (id, argsJson, image) => {
        let prompt = argsJson;
        if (typeof argsJson === 'string') { try { prompt = JSON.parse(argsJson).prompt || argsJson; } catch (e) {} }
        return runNexusTool(id, prompt, image)
            .then(p => ({ type: 'nexus-tool-result', ...p }))
            .catch(err => ({ type: 'nexus-tool-result', ok: false, error: (err && err.message) || String(err) }));
    };

    window.addEventListener('message', async e => {
        const d = e.data;
        if (!d || typeof d.type !== 'string' || !d.type.startsWith('nexus-')) return;
        const reply = payload => { try { (e.source || window).postMessage({ ...payload, reqId: d.reqId }, '*'); } catch (err) { console.warn('bridge reply failed', err); } };
        try {
            if (d.type === 'nexus-list-tools') {
                return reply({ type: 'nexus-tools-list', tools: Object.values(DB).flatMap(c => c.tools.map(t => ({ id: t.id, name: t.name, input: t.input }))) });
            }
            if (d.type === 'nexus-tool') {
                const r = await runNexusTool(d.id, d.prompt, d.image, d.image2, d.video, d.audio, d.options);
                return reply({ type: 'nexus-tool-result', ...r });
            }
        } catch (err) {
            return reply({ type: 'nexus-tool-result', ok: false, error: (err && err.message) || String(err) });
        }
    });

`;
studio = studio.slice(0, listenerStart) + sharedRunner + studio.slice(listenerEnd);

// 5. insert chat script before </body>
const bodyClose = studio.lastIndexOf('</body>');
if (bodyClose < 0) throw new Error('body close not found');
const chatScriptTag = `<!-- Merged Gemini Local Chat logic (was text.html) -->\n<script>\n${chatScript}\n</script>\n`;
studio = studio.slice(0, bodyClose) + chatScriptTag + studio.slice(bodyClose);

fs.writeFileSync('c:/Users/youse/Downloads/AIs/aistudio.html', studio);
console.log('MERGE COMPLETE — new size:', studio.length, 'chars');

