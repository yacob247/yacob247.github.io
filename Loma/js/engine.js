import { APEX_PROMPT } from './prompts.js';
import { UI } from './ui.js';
import { State } from './main.js';

export const Engine = {
    API_URL: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? `http://${location.host}/api/chat`
        : 'https://api.envizion.work/api/chat',

    abortCtrl: null,

    async submitPrompt(forcedPrompt = null, isCorrection = false) {
        const input = document.getElementById('prompt-input');
        const raw = forcedPrompt || input.value.trim();
        if (!raw) return;

        input.value = '';
        input.style.height = 'auto';

        const session = State.db.sessions[State.currentId];

        // Auto-title first message
        if (!isCorrection && session.messages.length === 0) {
            session.title = raw.substring(0, 35);
            document.getElementById('chat-title').innerText = session.title;
            State.saveDb();
            State.renderSidebar();
        }

        // User bubble
        const userHtml = isCorrection
            ? `<span class="text-orange-400 font-bold text-xs"><i class="fa-solid fa-rotate-right mr-1"></i>CORRECTION</span><br>${raw}`
            : raw;
        UI.appendBubble('user', userHtml);

        session.messages.push({ role: 'user', content: raw });

        // AI bubble with loading indicator
        const aiZone = UI.appendBubble('assistant', UI.loading());

        // Controls
        const stopBtn = document.getElementById('stop-btn');
        stopBtn.classList.remove('hidden');
        this.abortCtrl = new AbortController();

        try {
            const payload = {
                messages: [
                    { role: 'system', content: APEX_PROMPT },
                    ...session.messages
                ],
                temperature: isCorrection ? 0.3 : 0.5
            };

            const res = await fetch(this.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: this.abortCtrl.signal
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            let fullText = '';
            let tokenQueue = [];
            let streaming = true;
            let leftover = '';

            // Read loop — purely accumulates tokens into queue
            const readLoop = async () => {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) { streaming = false; break; }

                    const chunk = leftover + decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');
                    leftover = lines.pop();

                    for (const line of lines) {
                        if (!line.trim() || line === 'data: [DONE]') continue;
                        try {
                            const payload = JSON.parse(line.slice(6)); // strip "data: "
                            if (payload.error) {
                                aiZone.innerHTML = `<span class="text-red-400 text-sm"><i class="fa-solid fa-triangle-exclamation mr-1"></i>${payload.error}</span>`;
                                streaming = false;
                                return;
                            }
                            if (payload.t) tokenQueue.push(payload.t);
                        } catch (_) {}
                    }
                }
            };

            // Render loop — RAF-based, batches tokens for maximum throughput
            const renderLoop = () => {
                if (tokenQueue.length > 0) {
                    // Drain the entire queue per frame for maximum speed
                    fullText += tokenQueue.splice(0).join('');
                    aiZone.innerHTML = UI.processContent(fullText) + '<span class="cursor"></span>';
                    document.getElementById('chat-stream').scrollTop = 9999999;
                }
                if (streaming || tokenQueue.length > 0) {
                    requestAnimationFrame(renderLoop);
                }
            };

            requestAnimationFrame(renderLoop);
            await readLoop();

            // Wait for render queue to drain
            await new Promise(resolve => {
                const check = () => tokenQueue.length === 0 ? resolve() : requestAnimationFrame(check);
                check();
            });

            // Final clean render
            aiZone.innerHTML = UI.processContent(fullText);

            // Thumbs up/down feedback (single button pair, no A/B variants)
            if (fullText) {
                const msgId = Date.now();
                const bPrompt = btoa(unescape(encodeURIComponent(raw)));
                const cleanReply = fullText.replace(/<think[^>]*>[\s\S]*?<\/think[^>]*>/g, '').trim();
                const bReply = btoa(unescape(encodeURIComponent(cleanReply)));

                const feedbackDiv = document.createElement('div');
                feedbackDiv.id = `rlhf-${msgId}`;
                feedbackDiv.className = 'mt-3 pt-2 border-t border-[#2e2f30]/50 flex gap-3 text-xs text-gray-500';
                feedbackDiv.innerHTML = `
                    <button onclick="window.rateResponse(${msgId}, true, '${bPrompt}', '${bReply}')" class="hover:text-emerald-400 transition flex items-center gap-1"><i class="fa-solid fa-thumbs-up"></i> Correct</button>
                    <button onclick="window.rateResponse(${msgId}, false, '${bPrompt}', '${bReply}')" class="hover:text-red-400 transition flex items-center gap-1"><i class="fa-solid fa-thumbs-down"></i> Fix it</button>`;
                aiZone.appendChild(feedbackDiv);

                session.messages.push({ role: 'assistant', content: fullText });
                State.saveDb();
            }

        } catch (e) {
            if (e.name === 'AbortError') {
                aiZone.innerHTML += `<br><span class="text-orange-400 text-xs"><i class="fa-solid fa-hand mr-1"></i>Stopped.</span>`;
            } else {
                aiZone.innerHTML = `<span class="text-red-400 text-sm"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Error: ${e.message}. Check server at localhost:8081.</span>`;
            }
        } finally {
            stopBtn.classList.add('hidden');
            this.abortCtrl = null;
        }
    },

    abort() {
        this.abortCtrl?.abort();
    }
};