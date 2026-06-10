import { APEX_PROMPT, buildCorrectionPrompt } from './prompts.js';
import { UI } from './ui.js';
import { State } from './main.js';

// ═══════════════════════════════════════════════════════════════════════════════
//  engine.js — Pure fetch/stream. No DOM event binding. No duplicated globals.
//  Fixed: ctx tokens from settings, SSE leftover flush, retry on failure,
//         btoa safety for Unicode, real vision (multimodal) payload, model fallback.
// ═══════════════════════════════════════════════════════════════════════════════

export const Engine = {
    API_URL: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? `http://${location.host}/api/chat`
        : 'https://api.envizion.work/api/chat',

    abortCtrl: null,

    // ── Auto-temperature: context-aware, not just keyword ───────────────────
    _autoTemp(msg) {
        const m = (msg || '').toLowerCase();
        // Fix/debug first — most deterministic
        if (/(debug|fix|error|syntax|compile|traceback|calculate|formula|convert|parse|why (is|does|isn't|doesn't)|not working|broken)/i.test(m))
            return 0.1;
        // Code generation — still low, needs accuracy
        if (/(build|create|write|generate|implement|make|develop|code|function|class|component|html|css|javascript|python|sql|api)/i.test(m))
            return 0.25;
        // Analysis/research — mid range
        if (/(explain|research|analyze|compare|summarize|review|evaluate|pros|cons|difference|what is|how does|why)/i.test(m))
            return 0.45;
        // Strategy/planning — needs creativity
        if (/(ideas|brainstorm|suggest|recommend|strategy|plan|approach|how can|improve|optimize)/i.test(m))
            return 0.65;
        // Pure creative
        if (/(story|poem|song|creative|imagine|fantasy|narrative|character|write a|design a)/i.test(m))
            return 0.9;
        return 0.5;
    },

    // ── Detect domain for training data tagging ─────────────────────────────
    _detectDomain(msg) {
        const m = (msg || '').toLowerCase();
        if (/\[generate_image/i.test(msg) || /(draw|generate image|create image|image of|picture of)/i.test(m))
            return { domain: 'image', lang: '' };
        if (/(html|css|javascript|typescript|python|sql|c\+\+|csharp|rust|java|swift|kotlin|golang|powershell|bash|three\.js|webgl|canvas)/i.test(m)) {
            const lang = m.match(/(html|css|javascript|typescript|python|sql|c\+\+|csharp|rust|java|swift|kotlin|go|powershell|bash)/)?.[0] || 'code';
            return { domain: 'code', lang };
        }
        return { domain: 'text', lang: '' };
    },

    // ── Safe base64 encode for any Unicode string ───────────────────────────
    _safeEncode(str) {
        try { return btoa(unescape(encodeURIComponent(str || ''))); } catch { return btoa(''); }
    },
    _safeDecode(b64) {
        try { return decodeURIComponent(escape(atob(b64))); } catch { return ''; }
    },

    // ── Build multimodal message array if image is attached ─────────────────
    _buildUserContent(rawText, imageDataUrl) {
        if (!imageDataUrl) return rawText;
        // Extract base64 and mime type from data URL: data:image/jpeg;base64,....
        const match = imageDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (!match) return rawText;
        return [
            {
                type:   'image_url',
                image_url: { url: imageDataUrl }
            },
            { type: 'text', text: rawText }
        ];
    },

    // ── Context window size from user settings or default ───────────────────
    _getCtxSize() {
        const stored = parseInt(localStorage.getItem('envizion_tokens'));
        return isNaN(stored) ? 8192 : Math.min(stored, 131072);
    },

    // ── Main submit with retry ───────────────────────────────────────────────
    async submitPrompt(forcedPrompt = null, isCorrection = false, correctionMeta = null, retryCount = 0) {
        const input = document.getElementById('prompt-input') || document.getElementById('user-prompt');
        const raw   = forcedPrompt || input?.value?.trim();
        if (!raw) return;

        if (input && !forcedPrompt) { input.value = ''; input.style.height = 'auto'; }

        const session = State.db.sessions[State.currentId];
        if (!session) return;

        // Auto-title on first real message
        if (!isCorrection && session.messages.length === 0) {
            session.title = raw.substring(0, 40);
            const titleEl = document.getElementById('chat-title') || document.getElementById('current-chat-title');
            if (titleEl) titleEl.innerText = session.title;
            State.saveDb();
            State.renderSidebar();
        }

        // ── Consume pending image attachment from app.js ────────────────────
        const imageDataUrl = window._lomaAttachedImageDataUrl || null;
        window._lomaAttachedImageDataUrl = null;
        if (window._clearImagePreview) window._clearImagePreview();

        // User bubble
        const userHtml = isCorrection
            ? `<span class="text-orange-400 font-bold text-xs"><i class="fa-solid fa-rotate-right mr-1"></i>CORRECTION APPLIED</span><br>${UI.escapeHtml(raw)}`
            : (imageDataUrl
                ? `${UI.escapeHtml(raw)}<div class="mt-2"><img src="${imageDataUrl}" class="max-h-48 rounded-xl border border-gemini-border/40" alt="attached"></div>`
                : UI.escapeHtml(raw));
        UI.appendBubble('user', userHtml);

        // Save to history — store the text only (not the image data URL in history to save space)
        session.messages.push({ role: 'user', content: raw });

        // AI bubble with loading dots
        const aiZone = UI.appendBubble('assistant', UI.loading());

        // Show stop button
        const stopBtn = document.getElementById('stop-btn');
        const genCtrl = document.getElementById('generation-controls');
        if (stopBtn) stopBtn.classList.remove('hidden');
        if (genCtrl) genCtrl.classList.remove('hidden');
        this.abortCtrl = new AbortController();

        const temp = isCorrection ? 0.3 : this._autoTemp(raw);

        // ── Build system prompt ─────────────────────────────────────────────
        let systemContent;
        if (isCorrection && correctionMeta) {
            systemContent = buildCorrectionPrompt(
                correctionMeta.originalPrompt,
                correctionMeta.rejectedReply,
                correctionMeta.feedback
            );
        } else {
            systemContent = APEX_PROMPT;
            // Inject evolved rules
            if (State.evolvedCapabilities?.length > 0) {
                systemContent += '\n\n━━━ USER-DEFINED RULES ━━━\n' +
                    State.evolvedCapabilities.map((c, i) => `${i + 1}. ${c.title}: ${c.rule}`).join('\n');
            }
            // Inject relevant memories only (not all of them)
            const relevantMems = State.getRelevantMemories(raw, 12);
            if (relevantMems.length > 0) {
                systemContent += '\n\n━━━ PERSONAL MEMORY ━━━\n' +
                    relevantMems.map(m => `- ${m}`).join('\n');
            }
            // Inject self-learning context
            if (window.lomaGetLearningContext) {
                systemContent += window.lomaGetLearningContext();
            }
        }

        // ── Summarize context if it's getting long ──────────────────────────
        let historyMessages = session.messages.filter(m => m.role !== 'system');
        const totalChars = historyMessages.reduce((s, m) => s + (m.content?.length || 0), 0);
        const ctxLimit = this._getCtxSize();
        // Rough estimate: 1 token ≈ 4 chars. If history > 60% of ctx, summarize middle
        if (totalChars > ctxLimit * 4 * 0.6 && historyMessages.length > 10) {
            const keep    = 4; // keep first 2 and last 2 exchanges
            const head    = historyMessages.slice(0, keep);
            const tail    = historyMessages.slice(-keep);
            const middle  = historyMessages.slice(keep, -keep);
            const summary = `[Earlier conversation summarized — ${middle.length} messages covering: ${
                middle.filter(m => m.role === 'user').map(m => m.content.substring(0, 40)).join(', ')
            }]`;
            historyMessages = [...head, { role: 'system', content: summary }, ...tail];
        }

        try {
            const userContent = this._buildUserContent(raw, imageDataUrl);
            // Replace last user message with multimodal version if image attached
            const messagesForApi = [
                { role: 'system', content: systemContent },
                ...historyMessages.slice(0, -1),
                { role: 'user', content: userContent }
            ];

            const payload = {
                model:    window._lomaActiveModel || 'qwen2.5-coder:7b',
                messages: messagesForApi,
                temperature: temp,
                stream:   true,
                options:  { num_ctx: ctxLimit }
            };

            const res = await fetch(this.API_URL, {
                method:  'POST',
                headers: {
                    'Content-Type':      'application/json',
                    'Cache-Control':     'no-cache',
                    'X-Accel-Buffering': 'no',
                },
                body:    JSON.stringify(payload),
                signal:  this.abortCtrl.signal,
                credentials: 'omit'
            });

            // ── Model fallback ──────────────────────────────────────────────
            if (res.status === 404 && window._lomaActiveModel !== 'llama3.2:1b') {
                console.warn('[Engine] Primary model not found, falling back to llama3.2:1b');
                window._lomaActiveModel = 'llama3.2:1b';
                const pill = document.getElementById('model-pill-label');
                if (pill) pill.textContent = 'Loma 1B (fallback)';
                return this.submitPrompt(forcedPrompt, isCorrection, correctionMeta, retryCount);
            }

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const reader  = res.body.getReader();
            const decoder = new TextDecoder();

            let fullText   = '';
            let tokenQueue = [];
            let streaming  = true;
            let leftover   = '';

            // ── SSE Read loop ───────────────────────────────────────────────
            const readLoop = async () => {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        // Flush any leftover partial line
                        if (leftover.trim() && leftover !== 'data: [DONE]') {
                            const text = leftover.startsWith('data: ') ? leftover.slice(6) : leftover;
                            if (text && text !== '[DONE]') {
                                try {
                                    const parsed = JSON.parse(text);
                                    const tok = parsed.t
                                             || parsed.choices?.[0]?.delta?.content
                                             || parsed.choices?.[0]?.text
                                             || parsed.message?.content
                                             || parsed.content || '';
                                    if (tok) tokenQueue.push(tok);
                                } catch { if (text) tokenQueue.push(text); }
                            }
                        }
                        streaming = false;
                        break;
                    }

                    const chunk = leftover + decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');
                    leftover    = lines.pop(); // save incomplete line for next iteration

                    for (const line of lines) {
                        if (!line.trim() || line === 'data: [DONE]') continue;
                        const text = line.startsWith('data: ') ? line.slice(6) : line;
                        if (text === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(text);
                            if (parsed.error) {
                                aiZone.innerHTML = `<span class="text-red-400 text-sm"><i class="fa-solid fa-triangle-exclamation mr-1"></i>${parsed.error}</span>`;
                                streaming = false; return;
                            }
                            const tok = parsed.t
                                     || parsed.choices?.[0]?.delta?.content
                                     || parsed.choices?.[0]?.text
                                     || parsed.message?.content
                                     || parsed.content || '';
                            if (tok) tokenQueue.push(tok);
                        } catch {
                            if (text) tokenQueue.push(text);
                        }
                    }
                }
            };

            // ── RAF render loop ─────────────────────────────────────────────
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

            // Drain remaining
            await new Promise(resolve => {
                const check = () => tokenQueue.length === 0 ? resolve() : requestAnimationFrame(check);
                check();
            });

            // Final clean render
            aiZone.innerHTML = UI.processContent(fullText);

            // Process tool tags
            if (window.lomaProcessToolTags) {
                await window.lomaProcessToolTags(fullText, aiZone);
            }

            if (fullText) {
                const cleanReply = fullText
                    .replace(/<think[^>]*>[\s\S]*?<\/think[^>]*>/g, '')
                    .replace(/<think>[\s\S]*/g, '')
                    .trim();

                // ── Parse [REMEMBER: ...] tags from reply ───────────────────
                const rememberRe = /\[REMEMBER:\s*([^\]]+)\]/gi;
                let remMatch;
                while ((remMatch = rememberRe.exec(fullText)) !== null) {
                    State.addMemory(remMatch[1].trim(), 'ai-extracted');
                }

                // ── Thumbs feedback ─────────────────────────────────────────
                const msgId   = Date.now();
                const bPrompt = this._safeEncode(raw);
                const bReply  = this._safeEncode(cleanReply);
                const { domain, lang } = this._detectDomain(raw);

                const feedbackDiv     = document.createElement('div');
                feedbackDiv.id        = `rlhf-${msgId}`;
                feedbackDiv.className = 'mt-3 pt-2 border-t border-[#2e2f30]/50 flex gap-3 text-xs text-gray-500 items-center';
                feedbackDiv.innerHTML = `
                    <button onclick="window.rateResponse(${msgId}, true, '${bPrompt}', '${bReply}', '${domain}', '${lang}')"
                        class="hover:text-emerald-400 transition flex items-center gap-1">
                        <i class="fa-regular fa-thumbs-up"></i> Correct
                    </button>
                    <button onclick="window.rateResponse(${msgId}, false, '${bPrompt}', '${bReply}', '${domain}', '${lang}')"
                        class="hover:text-red-400 transition flex items-center gap-1">
                        <i class="fa-regular fa-thumbs-down"></i> Fix it
                    </button>
                    <span class="ml-auto text-[10px] text-slate-600 font-mono" id="temp-label-${msgId}">${domain} · t=${temp}</span>`;
                aiZone.appendChild(feedbackDiv);

                // Save to session
                session.messages.push({ role: 'assistant', content: fullText });
                State.saveDb();

                // Self-learning (code patterns only, not poisoning RLHF)
                if (domain === 'code' && window.lomaLearnFromCode) {
                    const codeBlocks = fullText.match(/```[\s\S]*?```/g) || [];
                    codeBlocks.forEach(b => window.lomaLearnFromCode(b.replace(/```\w*\n?/, '').replace(/```$/, ''), lang));
                }

                // Update auto-temp display
                const autoTempLabel = document.getElementById('auto-temp-label');
                if (autoTempLabel) autoTempLabel.textContent = `${domain}${lang ? ' · ' + lang : ''} (temp ${temp}) — auto-calibrated`;

                // Update token counter if visible
                const tokenCounter = document.getElementById('token-counter-display');
                if (tokenCounter) {
                    const approxTokens = Math.round(fullText.length / 4);
                    tokenCounter.textContent = `~${approxTokens} tokens`;
                }
            }

        } catch (e) {
            if (e.name === 'AbortError') {
                aiZone.innerHTML += `<br><span class="text-orange-400 text-xs"><i class="fa-solid fa-hand mr-1"></i>Stopped.</span>`;
            } else if (retryCount < 2) {
                // Auto-retry up to 2 times with backoff
                console.warn(`[Engine] Stream error, retrying (${retryCount + 1}/2):`, e.message);
                aiZone.innerHTML = `<span class="text-orange-400 text-xs"><i class="fa-solid fa-rotate-right fa-spin mr-1"></i>Retrying… (${retryCount + 1}/2)</span>`;
                await new Promise(r => setTimeout(r, 1200 * (retryCount + 1)));
                // Remove the retry bubble and re-submit
                aiZone.closest('.flex')?.remove();
                session.messages.pop(); // remove the user message we added, it'll be re-added
                return this.submitPrompt(forcedPrompt, isCorrection, correctionMeta, retryCount + 1);
            } else {
                aiZone.innerHTML = `<span class="text-red-400 text-sm">
                    <i class="fa-solid fa-triangle-exclamation mr-1"></i>
                    Error: ${e.message}. Is the server running?</span>`;
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