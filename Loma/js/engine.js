import { APEX_PROMPT, buildCorrectionPrompt } from './prompts.js';
import { UI } from './ui.js';
import { State } from './main.js';

// ═══════════════════════════════════════════════════════════════════════════════
//  js/engine.js — Clean stream handler & processor.
//  Bypasses limits by offloading system parameters and dynamic models to client memory.
//  Integrates adaptive routing between Qwen Coder and Llava vision proxies.
// ═══════════════════════════════════════════════════════════════════════════════

export const Engine = {
    API_URL: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? `http://${location.host}/api/chat`
        : 'https://api.envizion.work/api/chat',

    abortCtrl: null,

    // Classifies temperature mapping precisely to prevent coding deterioration
    _autoTemp(msg) {
        const m = (msg || '').toLowerCase();
        if (/(debug|fix|error|traceback|solve|calculate|formula|broken)/i.test(m)) return 0.1;
        if (/(build|create|write|implement|develop|code|component|html|css|js)/i.test(m)) return 0.2;
        if (/(explain|research|analyze|compare|review|what is|why)/i.test(m)) return 0.4;
        return 0.6; // Creative planning
    },

    _detectDomain(msg) {
        const m = (msg || '').toLowerCase();
        if (/(html|css|javascript|three\.js|canvas|react|vue|chart)/i.test(m)) return { domain: 'html', lang: 'html' };
        if (/(python|numpy|pandas|scrypt|django|flask)/i.test(m)) return { domain: 'code', lang: 'python' };
        return { domain: 'text', lang: '' };
    },

    _safeEncode(str) {
        try { return btoa(unescape(encodeURIComponent(str || ''))); } catch { return btoa(''); }
    },
    _safeDecode(b64) {
        try { return decodeURIComponent(escape(atob(b64))); } catch { return ''; }
    },

    _buildUserContent(rawText, imageDataUrl) {
        if (!imageDataUrl) return rawText;
        return [
            {
                type: 'image_url',
                image_url: { url: imageDataUrl }
            },
            { type: 'text', text: rawText }
        ];
    },

    async submitPrompt(forcedPrompt = null, isCorrection = false, correctionMeta = null, retryCount = 0) {
        const input = document.getElementById('user-prompt');
        const raw   = forcedPrompt || input?.value?.trim();
        if (!raw) return;

        if (input && !forcedPrompt) { input.value = ''; input.style.height = 'auto'; }

        const session = State.db.sessions[State.currentId];
        if (!session) return;

        // Auto-title on first exchange
        if (!isCorrection && session.messages.length === 0) {
            session.title = raw.substring(0, 30);
            const titleEl = document.getElementById('current-chat-title');
            if (titleEl) titleEl.innerText = session.title;
            State.saveDb();
            State.renderSidebar();
        }

        const imageDataUrl = window._lomaAttachedImageDataUrl || null;
        window._lomaAttachedImageDataUrl = null;
        if (window._clearImagePreview) window._clearImagePreview();

        // Append UI bubbles
        const userHtml = isCorrection
            ? `<span class="text-amber-500 font-bold text-xs"><i class="fa-solid fa-rotate-right mr-1"></i>REVISION INITIATED</span><br>${UI.escapeHtml(raw)}`
            : (imageDataUrl
                ? `${UI.escapeHtml(raw)}<div class="mt-2"><img src="${imageDataUrl}" class="max-h-48 rounded-lg border border-claude-border" alt="payload-target"></div>`
                : UI.escapeHtml(raw));
        UI.appendBubble('user', userHtml);

        // Save target array to memory thread
        session.messages.push({ role: 'user', content: raw });

        const aiZone = UI.appendBubble('assistant', UI.loading());

        const stopBtn = document.getElementById('stop-btn');
        const genCtrl = document.getElementById('generation-controls');
        if (stopBtn) stopBtn.classList.remove('hidden');
        if (genCtrl) genCtrl.classList.remove('hidden');
        this.abortCtrl = new AbortController();

        // Assign adaptive routing & dynamic thresholds
        const modelTarget = imageDataUrl ? 'llava' : 'qwen2.5-coder:7b';
        const temp = isCorrection ? 0.2 : this._autoTemp(raw);

        let systemContent = isCorrection && correctionMeta
            ? buildCorrectionPrompt(correctionMeta.originalPrompt, correctionMeta.rejectedReply, correctionMeta.feedback)
            : APEX_PROMPT;

        if (!isCorrection) {
            const relevantMems = State.getRelevantMemories(raw, 10);
            if (relevantMems.length > 0) {
                systemContent += '\n\n━━━ PERSISTENT EMBEDDED CACHE ━━━\n' + relevantMems.map(m => `- ${m}`).join('\n');
            }
        }

        try {
            const userContent = this._buildUserContent(raw, imageDataUrl);
            const messagesForApi = [
                { role: 'system', content: systemContent },
                ...session.messages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: userContent }
            ];

            const res = await fetch(this.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelTarget,
                    messages: messagesForApi,
                    temperature: temp,
                    stream: true,
                    options: { num_ctx: 32768 }
                }),
                signal: this.abortCtrl.signal
            });

            if (!res.ok) throw new Error(`Status ${res.status}`);

            const reader  = res.body.getReader();
            const decoder = new TextDecoder();
            let fullText  = '';
            let tokenQueue = [];
            let streaming = true;
            let leftover  = '';

            const readLoop = async () => {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        streaming = false;
                        break;
                    }
                    const chunk = leftover + decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');
                    leftover = lines.pop();

                    for (const line of lines) {
                        if (!line.trim() || line === 'data: [DONE]') continue;
                        const text = line.startsWith('data: ') ? line.slice(6) : line;
                        try {
                            const parsed = JSON.parse(text);
                            if (parsed.error) {
                                aiZone.innerHTML = `<span class="text-red-400 text-xs">${parsed.error}</span>`;
                                streaming = false;
                                return;
                            }
                            const tok = parsed.t || parsed.message?.content || '';
                            if (tok) tokenQueue.push(tok);
                        } catch {
                            if (text) tokenQueue.push(text);
                        }
                    }
                }
            };

            const renderLoop = () => {
                if (tokenQueue.length > 0) {
                    fullText += tokenQueue.splice(0).join('');
                    aiZone.innerHTML = UI.processContent(fullText) + '<span class="streaming-cursor"></span>';
                    const stream = document.getElementById('chat-stream');
                    if (stream && window.autoScrollChat !== false) stream.scrollTop = stream.scrollHeight;
                }
                if (streaming || tokenQueue.length > 0) requestAnimationFrame(renderLoop);
            };

            requestAnimationFrame(renderLoop);
            await readLoop();

            aiZone.innerHTML = UI.processContent(fullText);

            if (fullText) {
                const cleanReply = fullText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                const msgId = Date.now();
                const bPrompt = this._safeEncode(raw);
                const bReply = this._safeEncode(cleanReply);
                const { domain, lang } = this._detectDomain(raw);

                const feedbackDiv = document.createElement('div');
                feedbackDiv.id = `rlhf-${msgId}`;
                feedbackDiv.className = 'mt-4 pt-2.5 border-t border-claude-border/50 flex gap-4 text-xs text-claude-textMuted items-center';
                feedbackDiv.innerHTML = `
                    <button onclick="window.rateResponse(${msgId}, true, '${bPrompt}', '${bReply}', '${domain}', '${lang}')"
                        class="hover:text-emerald-400 smooth-transition flex items-center gap-1">
                        <i class="fa-regular fa-thumbs-up"></i> Mark Correct
                    </button>
                    <button onclick="window.rateResponse(${msgId}, false, '${bPrompt}', '${bReply}', '${domain}', '${lang}')"
                        class="hover:text-amber-500 smooth-transition flex items-center gap-1">
                        <i class="fa-regular fa-thumbs-down"></i> Force Fix
                    </button>
                    <span class="ml-auto text-[10px] font-mono">${domain} · t=${temp}</span>`;
                aiZone.appendChild(feedbackDiv);

                session.messages.push({ role: 'assistant', content: fullText });
                State.saveDb();

                const autoTempLabel = document.getElementById('auto-temp-label');
                if (autoTempLabel) autoTempLabel.textContent = `routed to: ${modelTarget} (temp ${temp})`;
            }

        } catch (e) {
            if (e.name === 'AbortError') {
                aiZone.innerHTML += `<br><span class="text-amber-500 text-xs font-mono"><i class="fa-solid fa-hand mr-1"></i>Pipeline execution terminated.</span>`;
            } else if (retryCount < 2) {
                console.warn(`[Engine Failover] Retrying exchange (${retryCount + 1}/2)...`);
                aiZone.innerHTML = `<span class="text-amber-500 text-xs font-mono"><i class="fa-solid fa-rotate-right fa-spin mr-1"></i>Failover triggered. Re-establishing link…</span>`;
                await new Promise(r => setTimeout(r, 1500));
                aiZone.closest('.flex')?.remove();
                session.messages.pop();
                return this.submitPrompt(forcedPrompt, isCorrection, correctionMeta, retryCount + 1);
            } else {
                aiZone.innerHTML = `<span class="text-red-400 text-xs font-mono"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Ollama Connection Failed. Run: "ollama serve" & confirm qwen2.5-coder:7b is installed.</span>`;
            }
        } finally {
            if (stopBtn) stopBtn.classList.add('hidden');
            if (genCtrl) genCtrl.classList.add('hidden');
            this.abortCtrl = null;
        }
    },

    abort() {
        this.abortCtrl?.abort();
    }
};