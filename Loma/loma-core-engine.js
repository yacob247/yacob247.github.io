/* ════════════════════════════════════════════════════════════════════════
   LOMA CORE ENGINE v2
   — AI generation/inference pipeline
   — Canvas (live preview / code / console)
   — Python execution (Pyodide) + AI-driven analysis

   This file REPLACES every duplicate/overriding definition of:
     triggerInference, processInputMessage, onResponseComplete,
     getMemoryContext-injection, canvas tab/preview/console logic,
     loadPyodide / executePythonCode / runAIAnalysis
   with single, synchronised implementations. All three areas now share
   ONE streaming transport + ONE typewriter renderer, so output speed,
   ordering and rendering are identical everywhere.
   ════════════════════════════════════════════════════════════════════════ */

/* ───────────────────────────── 0. ENDPOINTS ───────────────────────────── */
const ENVIZION_API_REMOTE = 'https://api.envizion.work/api/chat';
const ENVIZION_API_LOCAL  = 'http://127.0.0.1:8085/api/chat';

/* ─────────────────────────── 1. SHARED TRANSPORT ───────────────────────
   Single resilient streaming call used by:
     - main chat inference
     - model-vote / planner / self-critique agents
     - Python-analysis code generation + interpretation
   Remote → local fallback, Cloudflare-safe SSE buffer, returns full text
   while invoking onToken(token, fullSoFar) as each chunk arrives.        */
window.streamLLM = async function streamLLM({
    messages, model, temperature = 0.5, maxTokens = null,
    onToken = null, signal = null
}) {
    const body = JSON.stringify({
        model: model || window._lomaActiveModel || 'qwen2.5-coder:7b',
        messages,
        temperature,
        stream: true,
        ...(maxTokens ? { options: { num_predict: maxTokens } } : {})
    });
    const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal };

    let response;
    try {
        response = await fetch(ENVIZION_API_REMOTE, opts);
        if (!response.ok) throw new Error('remote fail');
    } catch {
        response = await fetch(ENVIZION_API_LOCAL, opts);
    }
    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 300)}`);
    }

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let leftover = '', jsonBuf = '', full = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (signal?.aborted) break;

        leftover += decoder.decode(value, { stream: true });
        const lines = leftover.split('\n');
        leftover = lines.pop();

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            if (line.startsWith('data: ')) line = line.slice(6).trim();
            if (line === '[DONE]' || !line) continue;

            jsonBuf += line;
            let open = 0, closed = 0;
            for (const ch of jsonBuf) { if (ch === '{') open++; else if (ch === '}') closed++; }
            if (open > 0 && open === closed) {
                try {
                    const parsed = JSON.parse(jsonBuf);
                    if (parsed.error) {
                        console.error('Stream error:', parsed.error);
                    } else if (parsed.t) {
                        full += parsed.t;
                        onToken?.(parsed.t, full);
                    }
                } catch { /* malformed fragment dropped */ }
                jsonBuf = '';
            }
        }
    }
    if (jsonBuf.trim()) {
        try {
            const parsed = JSON.parse(jsonBuf);
            if (parsed.t) { full += parsed.t; onToken?.(parsed.t, full); }
        } catch {}
    }
    if (signal?.aborted) throw new DOMException('User aborted', 'AbortError');
    return full;
};

/* ─────────────────────────── 2. TYPEWRITER RENDERER ─────────────────────
   One requestAnimationFrame loop that batches tokens and renders via
   the markdown pipeline. Used by chat stream AND analysis interpretation
   so both feel identical and stay perfectly in sync with autoscroll.    */
window.createTypewriter = function createTypewriter(renderFn, { cursor = true } = {}) {
    let queue = [];
    let raw = '';
    let active = true;

    const tick = () => {
        if (queue.length) {
            raw += queue.join('');
            queue = [];
            renderFn(raw, false);
            if (window.autoScrollChat) {
                const cs = document.getElementById('chat-stream');
                if (cs) cs.scrollTop = cs.scrollHeight;
            }
        }
        if (active || queue.length) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    return {
        push(token) { queue.push(token); },
        async finish() {
            active = false;
            await new Promise(resolve => {
                const check = () => queue.length === 0 ? resolve() : requestAnimationFrame(check);
                requestAnimationFrame(check);
            });
            renderFn(raw.trim(), true);
            return raw.trim();
        },
        get raw() { return raw; }
    };
};

/* ─────────────────────────── 3. MARKDOWN / RENDERING ────────────────────── */
window.escapeHtmlString = (text) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

window.parseMarkdownResponse = function parseMarkdownResponse(text, isFinal = false) {
    let pre = text;

    // ━━━ SECTION ━━━ dividers
    pre = pre.replace(
        /^━+\s*([^━\n]+?)\s*━+$/gm,
        (_, title) => `\n<div class="flex items-center gap-3 my-5">
            <div class="flex-1 h-px bg-gemini-border/40"></div>
            <span class="text-[10px] font-bold text-gemini-accent uppercase tracking-widest whitespace-nowrap">${title.trim()}</span>
            <div class="flex-1 h-px bg-gemini-border/40"></div>
        </div>\n`
    );

    // [REMEMBER: fact] → memory pill
    pre = pre.replace(
        /\[REMEMBER:\s*([^\]]+)\]/gi,
        (_, fact) => `<div class="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] text-indigo-300 my-1"><i class="fa-solid fa-brain text-[8px]"></i> Saved: ${fact.trim()}</div>`
    );

    // strip [TOOL:key]
    pre = pre.replace(/\[TOOL:\w+\]/gi, '');

    // <think> blocks → collapsible thought container
    pre = pre.replace(/<think>([\s\S]*?)<\/think>/gi, (_, inner) =>
        window.renderThinkBlock ? window.renderThinkBlock(inner, null) : ''
    );
    if (!isFinal) {
        // strip an unterminated trailing <think> while streaming
        pre = pre.replace(/<think>[\s\S]*$/i, '');
    }

    // [VFS_FILE: ...] tags are handled separately by _parseVFSTags — strip from display
    pre = pre.replace(/\[VFS_FILE:[^\]]*\][\s\S]*?\[\/VFS_FILE\]/gi, (m) =>
        `<div class="text-[10px] text-indigo-300 my-1"><i class="fa-solid fa-folder-open mr-1"></i>Project file written</div>`
    );

    // fenced code blocks → syntax-highlighted via marked
    const html = (window.marked ? window.marked.parse(pre) : pre);

    return `<div class="output-response-zone">${html}</div>`;
};

window.renderThinkBlock = (thinkContent, targetEl) => {
    const html = `<div class="gemini-thought-container">
        <div class="text-[10px] font-bold text-gemini-accent uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <i class="fa-solid fa-sparkles text-[9px]"></i> Thinking
        </div>
        <div class="whitespace-pre-wrap">${window.escapeHtmlString(thinkContent.trim())}</div>
    </div>`;
    if (targetEl) targetEl.innerHTML = html;
    return html;
};

/* ─────────────────────────── 4. MODEL ROUTING ───────────────────────────── */
window.LOMA_MODEL_REGISTRY = {
    'qwen2.5-coder:7b':       { name: 'Qwen Coder',  tags: ['code','build','html','css','js','app','debug','script'] },
    'llava':          { name: 'LLaVA Vision', tags: ['image','photo','picture','vision','see','look','describe'] },
    'qwen2.5-coder:7b:1b':    { name: 'Llama 3.2',   tags: ['chat','explain','write','story','creative','general'] },
    'deepseek-r1:7b': { name: 'DeepSeek R1', tags: ['reason','math','logic','proof','solve','analyse','compare'] },
    'mistral:7b':     { name: 'Mistral',     tags: ['summarize','translate','email','document','draft'] },
};

window.intelligentAutoRoute = (userMsg) => {
    const m = userMsg.toLowerCase();
    if (window.attachedImageBase64 || /(image|photo|picture|screenshot|diagram|chart|look at)/i.test(m)) {
        return { model: 'llava', reason: 'Vision input detected — routing to LLaVA' };
    }
    if (/(prove|theorem|equation|calculus|derivative|integral|logic puzzle|step by step reasoning|think through|analyze carefully|math|statistics|probability)/i.test(m)) {
        return { model: 'deepseek-r1:7b', reason: 'Reasoning task — routing to DeepSeek R1' };
    }
    if (/(build|create|make|code|html|css|javascript|python|function|class|component|app|dashboard|script|debug|fix the bug|refactor|api|endpoint)/i.test(m)) {
        return { model: 'qwen2.5-coder:7b', reason: 'Code generation — routing to Qwen Coder' };
    }
    if (/(write|draft|summarize|translate|email|letter|essay|document|blog post|article|paragraph|rewrite)/i.test(m)) {
        return { model: 'mistral:7b', reason: 'Writing task — routing to Mistral' };
    }
    return { model: window._lomaActiveModel, reason: null };
};

window.toggleAutoRoute = () => {
    window._autoRouteEnabled = !(window._autoRouteEnabled !== false);
    triggerNotificationToast(
        'Smart Router',
        window._autoRouteEnabled !== false ? 'Auto-routing ON — best model selected per task' : 'Auto-routing OFF — using manual model',
        'fa-route',
        window._autoRouteEnabled !== false ? 'bg-emerald-600' : 'bg-slate-600'
    );
};

window.autoSelectTemperature = (userMsg) => {
    const m = (userMsg || '').toLowerCase();
    if (/(build|create|make|write|generate|implement|code|html|css|javascript|typescript|python|react|vue|svelte|node|app|tool|component|function|class|api|endpoint|script|page|dashboard|widget|game|animation|3d|three\.?js|canvas|chart|graph|visualis)/i.test(m)) {
        return { temp: 0.72, label: 'Code (0.72)' };
    }
    if (/(prove|theorem|calculus|derivative|integral|logic|step by step|reason|math|statistic|probability)/i.test(m)) {
        return { temp: 0.2, label: 'Reasoning (0.20)' };
    }
    return { temp: 0.5, label: 'General (0.50)' };
};

/* ─────────────────────────── 5. SYSTEM-PROMPT INJECTION ─────────────────── */
function _ensureSystemPrompt(session) {
    if (typeof window.getDynamicSystemPrompt !== 'function') return;
    const builtPrompt = window.getDynamicSystemPrompt();
    const existing = session.messages.find(m => m.role === 'system');
    if (existing) existing.content = builtPrompt;
    else session.messages.unshift({ role: 'system', content: builtPrompt });
}

/* ─────────────────────────── 6. MAIN INFERENCE ──────────────────────────── */
window.triggerInference = async function triggerInference() {
    const session = chatDatabase.sessions[currentSessionId];
    if (!session) return;

    const lastUser = [...session.messages].reverse().find(m => m.role === 'user');

    // Memory + domain context, computed once, fresh every call
    window._memoryContext     = await window.getMemoryContext(lastUser?.content || '');
    window._lastDetectedDomain = window.detectDomain(lastUser?.content || '');

    _ensureSystemPrompt(session);

    const chatStream = document.getElementById('chat-stream');
    currentAbortController = new AbortController();
    document.getElementById('generation-controls')?.classList.remove('hidden');

    const activeZone = appendChatBubble('assistant', null);
    activeZone.innerHTML = `<span class="answer-wrapper"><div class="flex gap-1 items-center h-6 my-2 px-2"><div class="gemini-loading-dot"></div><div class="gemini-loading-dot"></div><div class="gemini-loading-dot"></div></div></span>`;
    const answerWrapper = activeZone.querySelector('.answer-wrapper');

    const autoTemp = window.autoSelectTemperature(lastUser?.content || '').temp;

    const typewriter = window.createTypewriter((raw, isFinal) => {
        const html = raw.trim().length === 0
            ? `<div class="flex gap-1 items-center h-6 my-2 px-2"><div class="gemini-loading-dot"></div></div>`
            : (window._patchedParseMarkdown || window.parseMarkdownResponse)(raw, isFinal);
        const target = answerWrapper || activeZone;
        target.innerHTML = html + (isFinal ? '' : '<span class="streaming-cursor"></span>');
    });

    try {
        const fullText = await window.streamLLM({
            messages: session.messages,
            model: window._lomaActiveModel || 'qwen2.5-coder:7b',
            temperature: autoTemp,
            signal: currentAbortController.signal,
            onToken: (tok) => typewriter.push(tok)
        });
        await typewriter.finish();

        session.messages.push({ role: 'assistant', content: fullText });
        session.updated = Date.now();
        syncDatabaseToDrive();

        if (window._parseToolTags) window._parseToolTags(fullText);
        if (window._parseVFSTags)  window._parseVFSTags(fullText);

        const htmlMatch = fullText.match(/<!DOCTYPE html[\s\S]*<\/html>/i);
        if (htmlMatch) window.updateCanvasLive(htmlMatch[0], true);

        window.onResponseComplete?.(fullText);
    } catch (err) {
        if (err.name === 'AbortError') {
            activeZone.innerHTML += `<br><br><span class="text-orange-400 text-xs italic"><i class="fa-solid fa-hand mr-1"></i> Generation stopped by user.</span>`;
        } else {
            console.error('Inference error:', err);
            activeZone.innerHTML = `<span class="text-red-400"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Server error: <code class="text-xs ml-1 text-orange-300">${window.escapeHtmlString(err.message)}</code></span>`;
        }
    } finally {
        document.getElementById('generation-controls')?.classList.add('hidden');
        currentAbortController = null;
        if (window.autoScrollChat && chatStream) chatStream.scrollTop = chatStream.scrollHeight;
    }
};

window.abortInference = () => {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
        document.getElementById('generation-controls')?.classList.add('hidden');
        triggerNotificationToast('Generation Stopped', 'Inference was aborted by user.', 'fa-stop', 'bg-yellow-600');
    }
};

/* ─────────────────────────── 7. POST-RESPONSE HOOK ──────────────────────── */
window.onResponseComplete = (responseText) => {
    window.extractMemoryTags(responseText);
    window._lastDetectedDomain = window.detectDomain(responseText);

    rlhfDataset.push({
        id: generateStringCode(),
        ts: Date.now(),
        content: responseText.substring(0, 4000),
        rating: null,
        model: window._lomaActiveModel,
        domain: window._lastDetectedDomain
    });
    localStorage.setItem('envizion_rlhf', JSON.stringify(rlhfDataset.slice(-500)));
};

/* ─────────────────────────── 8. SEARCH INTENT ───────────────────────────── */
function classifySearchIntent(msg) {
    const m = msg.toLowerCase();
    const urlRef = m.match(/(?:like|similar to|from|of|source code)\s+([\w.-]+\.(?:com|io|dev|net|org|co))/);
    if (urlRef) return { search: true, crawl: true, crawlHint: urlRef[1] };
    if (/https?:\/\//.test(msg)) return { search: true, crawl: true, crawlHint: msg.match(/https?:\/\/[^\s]+/)?.[0] };
    if (/(latest|newest|news|update|price)/i.test(m)) return { search: true, crawl: false };
    const isBuild = /(build|make|create|generate|implement)/i.test(m);
    if (isBuild && /(stripe|firebase|react|vue|tailwind|three\.?js)/i.test(m)) return { search: true, crawl: true };
    return { search: false };
}

/* ─────────────────────────── 9. INPUT PIPELINE (single, unified) ────────── */
window.processInputMessage = async function processInputMessage() {
    const input = document.getElementById('user-prompt');
    const userMsg = (input?.value || '').trim();
    if (!userMsg) return;

    if (!isEngineReady) {
        triggerNotificationToast('Not Ready', 'Please sign in first.', 'fa-lock', 'bg-red-600');
        return;
    }

    // 1. Smart auto-route to best model for this request
    if (window._autoRouteEnabled !== false) {
        const route = window.intelligentAutoRoute(userMsg);
        if (route.reason && route.model !== window._lomaActiveModel) {
            window.selectModel(route.model, window.LOMA_MODEL_REGISTRY[route.model]?.name || route.model);
            appendStatusPill('fa-route', route.reason, 'text-emerald-400');
            setTimeout(removeStatusPill, 3000);
        }
    }

    // 2. Auto-open relevant Envizion tool if intent detected
    const detectedTool = window._classifyToolIntent ? window._classifyToolIntent(userMsg) : null;
    if (detectedTool) setTimeout(() => window.openEnvizionTool(detectedTool), 1200);

    // 3. Optional Qwen Code intercept for local coding requests
    if (window.claudeCodeMode && /(build|create|make|write|generate|code|html|app|tool|page|dashboard|widget)/i.test(userMsg)) {
        let preSession = chatDatabase.sessions[currentSessionId];
        const result = await window._claudeCodeIntercept(userMsg, preSession?.messages || []);
        if (result) {
            appendChatBubble('user', userMsg);
            const zone = appendChatBubble('assistant', null);
            zone.innerHTML = window.parseMarkdownResponse(result, true);
            window._parseVFSTags?.(result);
            const htmlMatch = result.match(/<!DOCTYPE html[\s\S]*<\/html>/i);
            if (htmlMatch) window.updateCanvasLive(htmlMatch[0], true);
            preSession?.messages?.push({ role: 'assistant', content: result });
            window.onResponseComplete?.(result);
            input.value = ''; input.style.height = 'auto'; input.dispatchEvent(new Event('input'));
            return;
        }
    }

    // Base64 auto-detect (utility, non-blocking)
    if (userMsg.length > 8 && userMsg.length < 50000 && !/\s{3,}/.test(userMsg)) {
        window._tryBase64AutoDecode?.(userMsg);
    }

    input.value = '';
    input.style.height = 'auto';
    input.dispatchEvent(new Event('input'));

    let finalUserMsg = userMsg;
    let hasImage = false;
    if (window.attachedFileContent) {
        finalUserMsg = `${window.attachedFileContent}\n\n${userMsg}`;
        if (window.attachedImageBase64) hasImage = true;
    }

    let session = chatDatabase.sessions[currentSessionId];
    if (!session) { initNewSessionInDB(); session = chatDatabase.sessions[currentSessionId]; }

    if (session.messages.length <= 1) {
        session.title = userMsg.length > 30 ? userMsg.substring(0, 30) + '...' : userMsg;
        if (document.getElementById('current-chat-title')) document.getElementById('current-chat-title').innerText = session.title;
    }

    const streamEl = document.getElementById('chat-stream');
    if (streamEl?.querySelector('.fade-in')) streamEl.innerHTML = '';

    window.autoScrollChat = true;
    appendChatBubble('user', userMsg);

    // 4. Web-grounding (search / page crawl)
    let contextualizedMsg = finalUserMsg;
    const extractHtmlIntent = /(extract|scrape|get the html|source code) (of|from) (http|www)/i.test(userMsg);
    const intent = classifySearchIntent(userMsg);
    const shouldSearch = intent.search || isWebSearchEnabled || extractHtmlIntent;

    if (shouldSearch) {
        appendStatusPill('fa-magnifying-glass', 'Crawling web data...');
        let grounding = '';

        if (intent.crawlHint) {
            const urlToCrawl = intent.crawlHint.startsWith('http') ? intent.crawlHint : `https://${intent.crawlHint}`;
            appendStatusPill('fa-code', `Extracting ${urlToCrawl}...`);
            const pageContent = await crawlPageContent(urlToCrawl, extractHtmlIntent);
            if (pageContent) grounding += `[Extracted Site Data: ${urlToCrawl}]\n\`\`\`html\n${pageContent}\n\`\`\`\n\n`;
        }

        const searchResult = await fetchSmartGrounding(userMsg, intent.crawl, extractHtmlIntent);
        if (searchResult) grounding += searchResult;

        removeStatusPill();
        if (grounding.trim()) {
            contextualizedMsg = `[LIVE WEB DATA / HTML SOURCE]:\n${grounding.trim()}\n\n[USER REQUEST]\n${finalUserMsg}`;
            appendStatusPill('fa-bolt', 'Web context injected.', 'text-emerald-400');
            setTimeout(removeStatusPill, 2500);
        }
    }

    // 5. Push user message into session
    const userMessageObj = { role: 'user', content: contextualizedMsg };
    if (hasImage) userMessageObj.images = [window.attachedImageBase64];

    session.messages.push(userMessageObj);
    session.updated = Date.now();
    syncDatabaseToDrive();
    renderSidebarChats();
    window.clearFileAttachment();

    // 6. Data/analysis requests route through the Python analysis engine
    const isAnalysisRequest = /(analys|calculat|comput|statistic|average|median|mean|outlier|dataset|data set|plot|chart|graph|predict|forecast|regression|correlat|distribut|variance|standard deviation|sum of|count of|how many|percentage of|math|equation|solve for|integrate|differentiate)/i.test(userMsg);

    if (isAnalysisRequest && window.runAIAnalysis) {
        const zone = appendChatBubble('assistant', null);
        const answerWrapper = zone.querySelector('.output-response-zone') || zone;
        const result = await window.runAIAnalysis(contextualizedMsg, answerWrapper, {
            model: window._lomaActiveModel,
            temperature: 0.3
        });
        session.messages.push({ role: 'assistant', content: '[Python Analysis Complete]' });
        window.onResponseComplete?.('[Python Analysis Complete]');
        return result;
    }

    // 7. Normal chat completion
    return window.triggerInference();
};

/* ═══════════════════════════════════════════════════════════════════════
   10. CANVAS ENGINE
   ═══════════════════════════════════════════════════════════════════════ */
let _canvasCode    = '';
let _canvasVisible = false;
let _canvasLogs    = [];
let liveCanvasTimeout = null;

function _setTabActive(id) {
    ['tab-preview', 'tab-code', 'tab-console'].forEach(t => {
        const el = document.getElementById(t);
        if (!el) return;
        const active = (t === id);
        el.style.background = active ? '#2a2a32' : 'transparent';
        el.style.color      = active ? '#e4e4e7' : '#71717a';
    });
}

function _showStatusDot(on) {
    const dot = document.getElementById('canvas-status-dot');
    if (dot) dot.style.display = on ? 'block' : 'none';
}

window.toggleCanvasVisibility = (force) => {
    const col  = document.getElementById('canvas-column');
    const chat = document.getElementById('chat-column');
    if (!col) return;
    _canvasVisible = (force === true) ? true : (force === false) ? false : !_canvasVisible;

    if (_canvasVisible) {
        col.style.width = '';
        col.classList.remove('w-0');
        col.classList.add('w-full', 'md:w-[48%]', 'min-w-0');
        chat?.classList.add('md:w-[52%]');
    } else {
        col.classList.remove('w-full', 'md:w-[48%]', 'min-w-0');
        col.classList.add('w-0');
        chat?.classList.remove('md:w-[52%]');
    }
};

window.switchCanvasTab = (tab) => {
    const frame     = document.getElementById('live-canvas-frame');
    const codeEl    = document.getElementById('live-canvas-code');
    const consoleEl = document.getElementById('canvas-console-panel');
    const runBtn    = document.getElementById('canvas-run-btn');

    if (frame)     frame.style.display     = tab === 'preview' ? 'block' : 'none';
    if (codeEl)    codeEl.style.display    = tab === 'code'    ? 'block' : 'none';
    if (consoleEl) {
        consoleEl.style.display      = tab === 'console' ? 'flex' : 'none';
        consoleEl.style.flexDirection = 'column';
    }
    if (runBtn) runBtn.style.display = tab === 'code' ? 'flex' : 'none';

    if (tab === 'code' && codeEl) codeEl.value = _canvasCode;
    if (tab === 'console') _refreshCanvasConsole();

    _setTabActive('tab-' + tab);
};

window.resizeCanvasFrame = (size) => {
    const frame = document.getElementById('live-canvas-frame');
    if (!frame) return;
    const map = { desktop: '100%', tablet: '768px', mobile: '390px' };
    frame.style.width    = map[size] || '100%';
    frame.style.maxWidth = map[size] || '100%';
    frame.style.margin   = size === 'desktop' ? '0' : '0 auto';
    ['desktop', 'tablet', 'mobile'].forEach(s => {
        const btn = document.querySelector(`[onclick="window.resizeCanvasFrame('${s}')"]`);
        if (btn) btn.style.color = s === size ? '#a78bfa' : '#71717a';
    });
};

window.applyCanvasEdit = () => {
    const codeEl = document.getElementById('live-canvas-code');
    if (!codeEl) return;
    _canvasCode = codeEl.value;
    _loadCodeIntoCanvas(_canvasCode);
    window.switchCanvasTab('preview');
    triggerNotificationToast('Applied', 'Code changes rendered.', 'fa-check', 'bg-emerald-600');
};

function _loadCodeIntoCanvas(html) {
    _canvasCode = html;
    const frame   = document.getElementById('live-canvas-frame');
    const empty   = document.getElementById('canvas-empty-state');
    const titleEl = document.getElementById('canvas-title');

    if (frame) { frame.srcdoc = html; frame.style.display = 'block'; }
    if (empty) empty.style.display = 'none';
    _showStatusDot(true);

    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    if (titleEl) titleEl.textContent = titleMatch ? titleMatch[1] : 'Canvas';

    const key = 'canvas_' + (window.currentSessionId || 'default');
    try { localStorage.setItem(key, btoa(encodeURIComponent(html))); } catch {}
    if (window.currentSessionId) {
        window.history.replaceState({}, '', `/Loma/${window.currentSessionId}?canvas=1`);
    }
    if (window.gDriveAccessToken && typeof syncCanvasToDrive === 'function') {
        syncCanvasToDrive(window.currentSessionId, html);
    }
}

window.downloadCanvasCode = () => {
    if (!_canvasCode.trim()) {
        triggerNotificationToast('Nothing to download', 'Generate a web app first.', 'fa-triangle-exclamation', 'bg-yellow-600');
        return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([_canvasCode], { type: 'text/html' }));
    a.download = `loma-canvas-${window.currentSessionId || Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
    triggerNotificationToast('Downloaded', 'canvas.html saved.', 'fa-download', 'bg-emerald-600');
};

window.generateShareLink = () => {
    const url = `${location.origin}/Loma/${window.currentSessionId || ''}`;
    navigator.clipboard.writeText(url)
        .then(() => triggerNotificationToast('Link copied!', url, 'fa-link', 'bg-indigo-600'))
        .catch(() => triggerNotificationToast('Share link', url, 'fa-link', 'bg-indigo-600'));
};

function _injectConsoleRelay(frame) {
    if (!frame) return;
    frame.addEventListener('load', () => {
        try {
            frame.contentWindow?.eval(`
                window.onerror = (msg,src,line,col,err) => {
                    window.parent.postMessage({type:'canvas-error',msg,src,line,col},'*');
                };
                window.addEventListener('unhandledrejection',e=>{
                    window.parent.postMessage({type:'canvas-error',msg:String(e.reason)},'*');
                });
                ['log','warn','error','info'].forEach(lvl=>{
                    const _o = console[lvl].bind(console);
                    console[lvl]=(...a)=>{ _o(...a); window.parent.postMessage({type:'canvas-log',level:lvl,msg:a.map(String).join(' ')},'*'); };
                });
            `);
        } catch {}
    });
}

window.addEventListener('message', e => {
    if (!e.data?.type?.startsWith('canvas-')) return;
    const entry = {
        level: e.data.type === 'canvas-error' ? 'error' : (e.data.level || 'log'),
        msg: e.data.msg + (e.data.line ? ` (line ${e.data.line})` : ''),
        ts: Date.now()
    };
    _canvasLogs.push(entry);
    if (_canvasLogs.length > 300) _canvasLogs.shift();
    _refreshCanvasConsole();
    if (entry.level === 'error') {
        const t = document.getElementById('tab-console');
        if (t) { t.style.color = '#f87171'; setTimeout(() => t.style.color = '#71717a', 3000); }
    }
});

function _refreshCanvasConsole() {
    const inner = document.getElementById('canvas-console-inner');
    if (!inner) return;
    if (_canvasLogs.length === 0) {
        inner.innerHTML = `<div style="font-size:11px;color:#3f3f46;font-style:italic;text-align:center;padding:16px 0;">No output yet.</div>`;
        return;
    }
    const colorMap = { log: '#a1a1aa', warn: '#fbbf24', error: '#f87171', info: '#60a5fa' };
    inner.innerHTML = [..._canvasLogs].reverse().map(({ level, msg, ts }) =>
        `<div style="display:flex;gap:10px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:11px;line-height:1.5;">
            <span style="color:#3f3f46;flex-shrink:0;">${new Date(ts).toLocaleTimeString()}</span>
            <span style="color:${colorMap[level] || '#a1a1aa'};word-break:break-all;">${window.escapeHtmlString(msg)}</span>
        </div>`
    ).join('');
}

window.clearCanvasConsole = () => { _canvasLogs = []; _refreshCanvasConsole(); };

window.updateCanvasLive = (htmlCode, isFinal) => {
    if (!isFinal) {
        clearTimeout(liveCanvasTimeout);
        liveCanvasTimeout = setTimeout(() => {
            _loadCodeIntoCanvas(htmlCode);
            if (!_canvasVisible) window.toggleCanvasVisibility(true);
            window.switchCanvasTab('preview');
        }, 600);
    } else {
        clearTimeout(liveCanvasTimeout);
        _loadCodeIntoCanvas(htmlCode);
        if (!_canvasVisible) window.toggleCanvasVisibility(true);
        window.switchCanvasTab('preview');
    }
};

window.renderToCanvas = (base64Content) => {
    try {
        _loadCodeIntoCanvas(decodeURIComponent(atob(base64Content)));
        if (!_canvasVisible) window.toggleCanvasVisibility(true);
        window.switchCanvasTab('preview');
    } catch {
        triggerNotificationToast('Canvas Error', 'Failed to decode app.', 'fa-triangle-exclamation', 'bg-red-600');
    }
};

window.initCanvasAutocomplete = () => {
    const codeEl = document.getElementById('live-canvas-code');
    if (!codeEl || codeEl._autocompleteInit) return;
    codeEl._autocompleteInit = true;
    codeEl.addEventListener('keydown', async (e) => {
        if (e.key !== 'Tab') return;
        e.preventDefault();
        const pos    = codeEl.selectionStart;
        const before = codeEl.value.slice(Math.max(0, pos - 300), pos);
        const after  = codeEl.value.slice(pos, pos + 100);
        const prompt = `Continue this code. Output ONLY the completion text, no explanation, no markdown.\n\nBEFORE CURSOR:\n${before}\n\nAFTER CURSOR:\n${after}\n\nCOMPLETION:`;
        codeEl.style.opacity = '0.6';
        try {
            const token = await window.streamLLM({
                messages: [{ role: 'user', content: prompt }],
                model: window._lomaActiveModel,
                temperature: 0.1
            });
            if (token.trim()) {
                const val = codeEl.value;
                codeEl.value = val.slice(0, pos) + token + val.slice(pos);
                codeEl.selectionStart = codeEl.selectionEnd = pos + token.length;
            }
        } catch {}
        codeEl.style.opacity = '1';
    });
};

const _collab = new BroadcastChannel('loma_canvas_collab');
window.enableCollabSync = () => {
    const codeEl = document.getElementById('live-canvas-code');
    if (!codeEl) return;
    codeEl.addEventListener('input', () => {
        _collab.postMessage({ type: 'canvas-edit', code: codeEl.value, from: currentSessionId });
    });
    _collab.onmessage = (e) => {
        if (e.data?.type === 'canvas-edit' && e.data.from !== currentSessionId) {
            const ta = document.getElementById('live-canvas-code');
            if (ta && !ta.matches(':focus')) ta.value = e.data.code;
        }
    };
    triggerNotificationToast('Collab', 'Multi-tab sync active.', 'fa-users', 'bg-indigo-600');
};

// Restore canvas on load + start console relay
window.addEventListener('DOMContentLoaded', () => {
    const frame = document.getElementById('live-canvas-frame');
    _injectConsoleRelay(frame);
    if (location.search.includes('canvas=1')) {
        const key = 'canvas_' + (window.currentSessionId || 'default');
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                _loadCodeIntoCanvas(decodeURIComponent(atob(saved)));
                window.toggleCanvasVisibility(true);
                window.switchCanvasTab('preview');
                triggerNotificationToast('Canvas restored', 'Previous app loaded.', 'fa-rotate-left', 'bg-indigo-600');
            } catch {}
        }
    }
    window.initCanvasAutocomplete();
}, { once: true });

/* ═══════════════════════════════════════════════════════════════════════
   11. PYTHON ENGINE (Pyodide WASM, in-browser, no server)
   ═══════════════════════════════════════════════════════════════════════ */
let pyodideInstance = null;
let pyodideLoading  = false;
window.pyExtraPackages = ['numpy', 'pandas', 'matplotlib', 'scipy', 'pillow', 'requests'];

window.loadPyodide = async () => {
    if (pyodideInstance) return pyodideInstance;
    if (pyodideLoading) {
        while (pyodideLoading) await new Promise(r => setTimeout(r, 100));
        return pyodideInstance;
    }
    pyodideLoading = true;
    try {
        if (!window.loadPyodide_lib) {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }
        triggerNotificationToast('Python', 'Loading Pyodide runtime...', 'fa-spinner', 'bg-indigo-600');
        pyodideInstance = await window.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/' });
        pyodideInstance.runPython(`
import sys, io
class CaptureIO(io.StringIO): pass
sys.stdout = CaptureIO()
sys.stderr = CaptureIO()
        `);
        triggerNotificationToast('Python Ready', 'Pyodide loaded.', 'fa-check', 'bg-emerald-600');
    } catch {
        triggerNotificationToast('Python Error', 'Failed to load Pyodide.', 'fa-triangle-exclamation', 'bg-red-600');
    } finally {
        pyodideLoading = false;
    }
    return pyodideInstance;
};

window.installPyPackage = async (pkg) => {
    const py = await window.loadPyodide();
    if (!py) return false;
    try {
        await py.loadPackage('micropip');
        await py.runPythonAsync(`import micropip; await micropip.install('${pkg}')`);
        triggerNotificationToast('Python', `${pkg} ready.`, 'fa-check', 'bg-emerald-600');
        return true;
    } catch (e) {
        triggerNotificationToast('Python Error', `Failed to install ${pkg}.`, 'fa-triangle-exclamation', 'bg-red-600');
        return false;
    }
};

// Reset stdout/stderr capture buffers
function _resetPyIO(py) {
    py.runPython(`
import sys, io
class CaptureIO(io.StringIO): pass
sys.stdout = CaptureIO()
sys.stderr = CaptureIO()
    `);
}

window.executePythonCode = async (code) => {
    const py = await window.loadPyodide();
    if (!py) return { output: '', error: 'Pyodide failed to load.' };
    try {
        _resetPyIO(py);
        await py.runPythonAsync(code);
        const output = py.runPython(`sys.stdout.getvalue()`);
        const error  = py.runPython(`sys.stderr.getvalue()`);
        return { output: output || '', error: error || '' };
    } catch (e) {
        let partial = '';
        try { partial = py.runPython(`sys.stdout.getvalue()`); } catch {}
        return { output: partial || '', error: e.message };
    }
};

// Live-streaming variant — calls onOutput(partialText) as stdout grows
window.executePythonCodeLive = async (code, onOutput, pollMs = 80) => {
    const py = await window.loadPyodide();
    if (!py) return { output: '', error: 'Pyodide failed to load.' };

    _resetPyIO(py);
    let output = '', error = '';
    const poll = setInterval(() => {
        try {
            const partial = py.runPython(`sys.stdout.getvalue()`);
            if (partial !== output) { output = partial; onOutput?.(output); }
        } catch {}
    }, pollMs);

    try {
        await py.runPythonAsync(code);
        output = py.runPython(`sys.stdout.getvalue()`);
        error  = py.runPython(`sys.stderr.getvalue()`);
    } catch (e) {
        try { output = py.runPython(`sys.stdout.getvalue()`); } catch {}
        error = e.message;
    } finally {
        clearInterval(poll);
        onOutput?.(output);
    }
    return { output: output || '', error: error || '' };
};

window.runPythonFromResponse = async (code, outputEl) => {
    if (outputEl) {
        outputEl.innerHTML = `<span class="text-yellow-400 text-xs"><i class="fa-solid fa-spinner fa-spin mr-1"></i>Running Python...</span>`;
    }
    const { output, error } = await window.executePythonCode(code);
    if (outputEl) {
        const hasError = error && error.trim().length > 0;
        const combined = [output, hasError ? '⚠ ' + error : ''].filter(Boolean).join('\n').trim();
        outputEl.innerHTML = combined
            ? `<pre class="text-xs font-mono text-emerald-300 whitespace-pre-wrap mt-2 bg-black/30 rounded p-2">${window.escapeHtmlString(combined)}</pre>`
            : `<span class="text-xs text-slate-400 italic">No output.</span>`;
    }
    return { output, error };
};

/* ─────────────────────────── AI PYTHON ANALYSIS ENGINE ──────────────────
   Generate code → execute (live) → interpret (streamed).
   Uses the SAME streamLLM transport + createTypewriter renderer as the
   main chat so output speed/order is identical everywhere.            */
window.runAIAnalysis = async (prompt, targetEl = null, options = {}) => {
    const model        = options.model        || window._lomaActiveModel || 'qwen2.5-coder:7b';
    const temperature  = options.temperature  ?? 0.3;
    const showThinking = options.showThinking !== false;
    const extraPkgs    = options.packages     || [];

    if (!targetEl) {
        targetEl = document.createElement('div');
        targetEl.className = 'ai-analysis-panel my-4 rounded-2xl border border-gemini-border bg-gemini-card p-4 text-sm text-gemini-textMain';
        const stream = document.getElementById('chat-stream');
        (stream || document.body).appendChild(targetEl);
    }

    const spinnerHTML = (msg) =>
        `<div class="flex items-center gap-3 text-slate-400 text-xs py-2">
            <i class="fa-solid fa-spinner fa-spin text-indigo-400"></i>
            <span>${msg}</span>
        </div>`;

    // ── Phase A: generate Python code (streamed) ──────────────────────
    const codeBlockId = 'analysis-code-' + Math.random().toString(36).slice(2, 7);
    targetEl.innerHTML = `
        <div class="mb-3">
            <div class="text-[10px] font-mono text-indigo-300 flex items-center gap-1 mb-1">
                <i class="fa-solid fa-spinner fa-spin text-[8px]"></i> Generating analysis code…
            </div>
            <pre id="${codeBlockId}" class="text-[10px] font-mono text-emerald-300 bg-black/40 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed min-h-[2rem]"></pre>
        </div>`;
    const codePreEl = document.getElementById(codeBlockId);

    const codeSystemPrompt = `You are a Python data analyst. Output ONLY a raw Python script. No markdown, no fences, no backticks, no explanations, no comments.
Rules:
- Each print() on its own line — never merge
- Import only: statistics, math, random, itertools, functools, collections, string
- No matplotlib, numpy, pandas, os, sys, open(), file I/O — use statistics module only
- No external packages, no file system access — Pyodide sandbox only
- Only compute and print results
- End with: print("__ANALYSIS_COMPLETE__") on its own line`;

    let aiPythonCode = '', thinkContent = '';
    try {
        const rawCode = await window.streamLLM({
            messages: [
                { role: 'system', content: codeSystemPrompt },
                { role: 'user',   content: prompt }
            ],
            model,
            temperature: 0.15,
            maxTokens: 300,
            onToken: (_, full) => {
                codePreEl.textContent = full;
                const cs = document.getElementById('chat-stream');
                if (window.autoScrollChat && cs) cs.scrollTop = cs.scrollHeight;
            }
        });

        let cleaned = rawCode;
        const thinkMatch = cleaned.match(/<think>([\s\S]*?)<\/think>/);
        if (thinkMatch) { thinkContent = thinkMatch[1]; cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/, '').trim(); }

        const fenceMatch = cleaned.match(/```(?:python)?\s*\n?([\s\S]*?)```/i);
        aiPythonCode = fenceMatch
            ? fenceMatch[1].trim()
            : cleaned.split('\n').filter(l => !/^```/.test(l.trim())).join('\n').trim();

        codePreEl.textContent = aiPythonCode;
        codePreEl.previousElementSibling.innerHTML = `<i class="fa-solid fa-code text-[8px]"></i> Generated code`;
    } catch (e) {
        targetEl.innerHTML = `<span class="text-red-400 text-xs"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Code generation failed: ${window.escapeHtmlString(e.message)}</span>`;
        return { error: e.message };
    }

    if (showThinking && thinkContent) {
        codePreEl.closest('.mb-3').insertAdjacentHTML('beforebegin', window.renderThinkBlock(thinkContent, null));
    }

    // ── Phase B: execute in Pyodide with live stdout ──────────────────
    const execStatusEl = document.createElement('div');
    execStatusEl.className = 'mt-2';
    targetEl.appendChild(execStatusEl);

    const liveOutId = 'live-out-' + Math.random().toString(36).slice(2, 7);
    execStatusEl.innerHTML = `<pre id="${liveOutId}" class="text-xs font-mono text-emerald-300 bg-black/30 rounded-xl p-3 whitespace-pre-wrap leading-relaxed mb-2 min-h-[1rem]"></pre>`;
    const liveOutEl = document.getElementById(liveOutId);
    liveOutEl.textContent = '…';

    let pythonOutput = '', pythonError = '';
    try {
        const py = await window.loadPyodide();
        if (extraPkgs.length > 0) {
            liveOutEl.textContent = `Installing: ${extraPkgs.join(', ')}…`;
            await py.loadPackagesFromImports(aiPythonCode);
            for (const pkg of extraPkgs) await window.installPyPackage(pkg);
        }

        const result = await window.executePythonCodeLive(aiPythonCode, (partial) => {
            liveOutEl.textContent = partial.replace('__ANALYSIS_COMPLETE__', '').trim() || ' ';
            const cs = document.getElementById('chat-stream');
            if (window.autoScrollChat && cs) cs.scrollTop = cs.scrollHeight;
        });
        pythonOutput = result.output || '';
        pythonError  = result.error  || '';
    } catch (e) {
        pythonError = e.message;
    }

    pythonOutput = pythonOutput.replace('__ANALYSIS_COMPLETE__', '').trim();
    liveOutEl.textContent = pythonOutput || ' ';
    if (pythonError) {
        execStatusEl.insertAdjacentHTML('beforeend',
            `<div class="text-xs font-mono text-red-400 bg-red-950/30 rounded-xl p-3 mb-3 whitespace-pre-wrap">${window.escapeHtmlString(pythonError)}</div>`);
    }
    if (!pythonOutput && pythonError) {
        targetEl.insertAdjacentHTML('beforeend',
            `<span class="text-red-400 text-xs"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Execution error — see above.</span>`);
        return { code: aiPythonCode, output: '', error: pythonError };
    }

    // ── Phase C: interpret results (streamed) ──────────────────────────
    const interpretDiv = document.createElement('div');
    interpretDiv.className = 'mt-3 border-t border-gemini-border/40 pt-3';
    targetEl.appendChild(interpretDiv);
    interpretDiv.innerHTML = spinnerHTML('Interpreting results…');

    const interpretSystemPrompt = `You are a senior data analyst. Interpret the Python output concisely. Use markdown. Be direct and insightful.`;
    const interpretUserMsg = `Question: ${prompt}\n\nPython output:\n${pythonOutput || '(no output)'}${pythonError ? '\nErrors:\n' + pythonError : ''}\n\nInterpret these results.`;

    const typewriter = window.createTypewriter((raw, isFinal) => {
        interpretDiv.innerHTML = (window._patchedParseMarkdown || window.parseMarkdownResponse)(raw, isFinal)
            + (isFinal ? '' : '<span class="streaming-cursor"></span>');
    });

    try {
        await window.streamLLM({
            messages: [
                { role: 'system', content: interpretSystemPrompt },
                { role: 'user',   content: interpretUserMsg }
            ],
            model,
            temperature: 0.4,
            maxTokens: 2048,
            onToken: (tok) => typewriter.push(tok)
        });
        await typewriter.finish();
    } catch (e) {
        await typewriter.finish();
        interpretDiv.innerHTML = `<span class="text-red-400 text-xs"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Interpretation failed: ${window.escapeHtmlString(e.message)}</span>`;
    }

    return { code: aiPythonCode, output: pythonOutput, error: pythonError };
};