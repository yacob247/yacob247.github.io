import { APEX_PROMPT, buildCorrectionPrompt } from './prompts.js';
import { UI } from './ui.js';
import { State } from './main.js';

export const Engine = {
    API_URL: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? `http://${location.host}/api/chat`
        : 'https://api.envizion.work/api/chat',

    abortCtrl: null,

    // ── Auto-temperature: deterministic to creative ──────────────────────────
    _autoTemp(msg) {
        const m = (msg || '').toLowerCase();
        if (/(debug|fix|error|syntax|compile|traceback|calculate|formula|convert|parse)/i.test(m))
            return 0.1;
        if (/(build|create|write|generate|implement|make|develop|code|function|class|component|html|css|javascript|python|sql|api)/i.test(m))
            return 0.25;
        if (/(explain|research|analyze|compare|summarize|review|evaluate|pros|cons|difference)/i.test(m))
            return 0.45;
        if (/(ideas|brainstorm|suggest|recommend|strategy|plan|approach|how can)/i.test(m))
            return 0.65;
        if (/(story|poem|song|creative|imagine|fantasy|narrative|character)/i.test(m))
            return 0.9;
        return 0.5;
    },

    // ── Detect domain for training data tagging ──────────────────────────────
    _detectDomain(msg) {
        const m = (msg || '').toLowerCase();
        if (/\[generate_image/i.test(msg) || /(draw|generate image|create image|image of|picture of)/i.test(m))
            return { domain: 'image', lang: '' };
        if (/(html|css|javascript|typescript|python|sql|c\+\+|csharp|rust|java|swift|kotlin|golang|powershell|bash|three\.js|webgl|canvas)/i.test(m))  {
            const lang = m.match(/(html|css|javascript|typescript|python|sql|c\+\+|csharp|rust|java|swift|kotlin|go|powershell|bash)/)?.[0] || 'code';
            return { domain: 'code', lang };
        }
        return { domain: 'text', lang: '' };
    },

    async submitPrompt(forcedPrompt = null, isCorrection = false, correctionMeta = null) {
        const input   = document.getElementById('prompt-input');
        const raw     = forcedPrompt || input?.value?.trim();
        if (!raw) return;

        if (input) { input.value = ''; input.style.height = 'auto'; }

        const session = State.db.sessions[State.currentId];

        // Auto-title on first real message
        if (!isCorrection && session.messages.length === 0) {
            session.title = raw.substring(0, 40);
            const titleEl = document.getElementById('chat-title') || document.getElementById('current-chat-title');
            if (titleEl) titleEl.innerText = session.title;
            State.saveDb();
            State.renderSidebar();
        }

        // User bubble
        const userHtml = isCorrection
            ? `<span class="text-orange-400 font-bold text-xs"><i class="fa-solid fa-rotate-right mr-1"></i>CORRECTION APPLIED</span><br>${UI.escapeHtml(raw)}`
            : UI.escapeHtml(raw);
        UI.appendBubble('user', userHtml);
        session.messages.push({ role: 'user', content: raw });

        // AI bubble with loading dots
        const aiZone = UI.appendBubble('assistant', UI.loading());

        // Show stop button
        const stopBtn = document.getElementById('stop-btn') || document.getElementById('generation-controls');
        if (stopBtn) stopBtn.classList.remove('hidden');
        this.abortCtrl = new AbortController();

        const temp = isCorrection ? 0.3 : this._autoTemp(raw);

        // Build system prompt — correction mode gets a tighter prompt
        let systemContent;
        if (isCorrection && correctionMeta) {
            systemContent = buildCorrectionPrompt(
                correctionMeta.originalPrompt,
                correctionMeta.rejectedReply,
                correctionMeta.feedback
            );
        } else {
            systemContent = APEX_PROMPT;
            // Inject evolution rules + personal memory from State
            if (State.evolvedCapabilities?.length > 0) {
                systemContent += '\n\n━━━ USER-DEFINED RULES ━━━\n' +
                    State.evolvedCapabilities.map((c, i) => `${i + 1}. ${c.title}: ${c.rule}`).join('\n');
            }
            if (State.personalMemories?.length > 0) {
                systemContent += '\n\n━━━ PERSONAL MEMORY ━━━\n' +
                    State.personalMemories.map(m => `- ${m}`).join('\n');
            }
            // Inject self-learning context if available
            if (window.lomaGetLearningContext) {
                systemContent += window.lomaGetLearningContext();
            }
        }

        try {
            const payload = {
                model: window._lomaActiveModel || 'qwen2.5-coder:7b',
                messages: [
                    { role: 'system', content: systemContent },
                    ...session.messages.filter(m => m.role !== 'system')
                ],
                temperature: temp,
                stream: true,
                options: { num_ctx: 8192 }
            };

            const res = await fetch(this.API_URL, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
                signal:  this.abortCtrl.signal,
                credentials: 'include'
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const reader  = res.body.getReader();
            const decoder = new TextDecoder();

            let fullText   = '';
            let tokenQueue = [];
            let streaming  = true;
            let leftover   = '';

            // ── Read loop: pure accumulation into queue (no blocking UI ops) ─
            const readLoop = async () => {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) { streaming = false; break; }

                    const chunk = leftover + decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');
                    leftover    = lines.pop();

                    for (const line of lines) {
                        if (!line.trim() || line === 'data: [DONE]') continue;
                        const text = line.startsWith('data: ') ? line.slice(6) : line;
                        if (text === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(text);
                            if (parsed.error) {
                                aiZone.innerHTML = `<span class="text-red-400 text-sm">
                                    <i class="fa-solid fa-triangle-exclamation mr-1"></i>${parsed.error}</span>`;
                                streaming = false; return;
                            }
                            // Support multiple server token formats
                            const tok = parsed.t
                                     || parsed.choices?.[0]?.delta?.content
                                     || parsed.choices?.[0]?.text
                                     || parsed.message?.content
                                     || parsed.content
                                     || '';
                            if (tok) tokenQueue.push(tok);
                        } catch {
                            // Plain text fallback
                            if (text) tokenQueue.push(text);
                        }
                    }
                }
            };

            // ── Render loop: RAF-based, drains entire queue per frame ─────────
            // Processes ALL queued tokens per frame — fastest possible rendering.
            const renderLoop = () => {
                if (tokenQueue.length > 0) {
                    fullText += tokenQueue.splice(0).join('');
                    aiZone.innerHTML = UI.processContent(fullText) + '<span class="streaming-cursor"></span>';
                    const stream = document.getElementById('chat-stream');
                    if (stream && window.autoScrollChat !== false) stream.scrollTop = 9999999;
                }
                if (streaming || tokenQueue.length > 0) requestAnimationFrame(renderLoop);
            };

            requestAnimationFrame(renderLoop);
            await readLoop();

            // Drain remaining queue
            await new Promise(resolve => {
                const check = () => tokenQueue.length === 0 ? resolve() : requestAnimationFrame(check);
                check();
            });

            // Final clean render (no cursor)
            aiZone.innerHTML = UI.processContent(fullText);

            // Process tool tags (image generation, music, etc.)
            if (window.lomaProcessToolTags) {
                await window.lomaProcessToolTags(fullText, aiZone);
            }

            if (fullText) {
                // Strip thinking blocks for training data
                const cleanReply = fullText
                    .replace(/<think[^>]*>[\s\S]*?<\/think[^>]*>/g, '')
                    .replace(/<think>[\s\S]*/g, '')
                    .trim();

                // ── Thumbs up/down feedback ──────────────────────────────────
                const msgId   = Date.now();
                const bPrompt = btoa(unescape(encodeURIComponent(raw)));
                const bReply  = btoa(unescape(encodeURIComponent(cleanReply)));
                const { domain, lang } = this._detectDomain(raw);

                const feedbackDiv         = document.createElement('div');
                feedbackDiv.id            = `rlhf-${msgId}`;
                feedbackDiv.className     = 'mt-3 pt-2 border-t border-[#2e2f30]/50 flex gap-3 text-xs text-gray-500';
                feedbackDiv.innerHTML     = `
                    <button onclick="window.rateResponse(${msgId}, true, '${bPrompt}', '${bReply}', '${domain}', '${lang}')"
                        class="hover:text-emerald-400 transition flex items-center gap-1">
                        <i class="fa-regular fa-thumbs-up"></i> Correct
                    </button>
                    <button onclick="window.rateResponse(${msgId}, false, '${bPrompt}', '${bReply}', '${domain}', '${lang}')"
                        class="hover:text-red-400 transition flex items-center gap-1">
                        <i class="fa-regular fa-thumbs-down"></i> Fix it
                    </button>`;
                aiZone.appendChild(feedbackDiv);

                // Save to session
                session.messages.push({ role: 'assistant', content: fullText });
                State.saveDb();

                // Auto-train write for adaptive trainer
                if (window.autoTrainWrite) {
                    window.autoTrainWrite(raw, cleanReply, '', domain, lang);
                }

                // Update auto-temp display
                const autoTempLabel = document.getElementById('auto-temp-label');
                if (autoTempLabel) autoTempLabel.textContent = `${domain} (${temp}) — auto-calibrated`;
            }

        } catch (e) {
            if (e.name === 'AbortError') {
                aiZone.innerHTML += `<br><span class="text-orange-400 text-xs">
                    <i class="fa-solid fa-hand mr-1"></i>Stopped.</span>`;
            } else {
                aiZone.innerHTML = `<span class="text-red-400 text-sm">
                    <i class="fa-solid fa-triangle-exclamation mr-1"></i>
                    Error: ${e.message}. Is Ollama running? Try: <code>ollama serve</code></span>`;
            }
        } finally {
            if (stopBtn) stopBtn.classList.add('hidden');
            this.abortCtrl = null;
        }
    },

    abort() {
        this.abortCtrl?.abort();
    }
};