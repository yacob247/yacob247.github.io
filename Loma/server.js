import express from 'express';
import cors    from 'cors';
import path    from 'path';
import { fileURLToPath } from 'url';

const app      = express();
const PORT     = 8085;
const GEMINI_MODEL = 'gemini-2.5-flash-preview-09-2025';

// ── KEY ROTATION POOL ─────────────────────────────────────────────────────────
// Add as many keys as you want. When one hits quota it auto-rotates to the next.
const GEMINI_KEYS = [
    'AIzaSyABCN1fCOAIZHFJBxEvqVpYzs3Qc1laUXc',
    'AIzaSyBny0Ij_a0cT2vky_lw3ocVfUsHvU5YgMU',
    'AIzaSyCsuKyVE2_f37JrBB3uRMXu45CBuPZ-BIE',
    'AQ.Ab8RN6IYruXCPEbN-T6HegHMFQY8Zt3hkx-KQfW_VQBgHAAJ8g',
    'AQ.Ab8RN6J0X8yi-Pvr3KBpekmyMrd6ky_PYAL9_muUKNcelLCAxg',
    'AQ.Ab8RN6IwI0yjNzkrIjA7lqfsVAkQOtuhj7P9ZyQuwoGAeq-UJA',
    
];

let _keyIndex = 0;
const _keyFailures = {}; // tracks which keys are exhausted
const _keyResetTime = {}; // reset exhausted keys after 24h

function getNextGeminiKey() {
    const now = Date.now();
    // Reset keys that have been cooling down for 24h
    for (const [i, t] of Object.entries(_keyResetTime)) {
        if (now - t > 24 * 60 * 60 * 1000) {
            delete _keyFailures[i];
            delete _keyResetTime[i];
        }
    }
    // Find next working key
    for (let i = 0; i < GEMINI_KEYS.length; i++) {
        const idx = (_keyIndex + i) % GEMINI_KEYS.length;
        if (!_keyFailures[idx]) {
            _keyIndex = (idx + 1) % GEMINI_KEYS.length;
            return { key: GEMINI_KEYS[idx], idx };
        }
    }
    // All keys exhausted — reset all and start over
    Object.keys(_keyFailures).forEach(k => delete _keyFailures[k]);
    _keyIndex = 0;
    return { key: GEMINI_KEYS[0], idx: 0 };
}

function markKeyExhausted(idx) {
    _keyFailures[idx] = true;
    _keyResetTime[idx] = Date.now();
    console.warn(`[KeyRotation] Key ${idx} exhausted, rotating. ${Object.keys(_keyFailures).length}/${GEMINI_KEYS.length} keys used.`);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// ─── PURE STREAMING PROXY ─────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
    const { messages, model, temperature = 0.5, stream = true, options = {} } = req.body;
    const useGemini = !model || model === 'gemini' || model.startsWith('gemini');

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages array required' });
    }

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform', 
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'                    
    });

    let onClientClose = () => {};

    try {
if (useGemini) {
            // ── GEMINI FLASH 2.5 ────────────────────────────────────────────
            const systemMsg = messages.find(m => m.role === 'system');
            const chatMsgs  = messages.filter(m => m.role !== 'system');

            const geminiBody = {
                system_instruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
                contents: chatMsgs.map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: m.images
                        ? [{ text: m.content || '' }, { inline_data: { mime_type: 'image/jpeg', data: m.images[0] } }]
                        : [{ text: m.content || '' }]
                })),
                generationConfig: {
                    temperature,
                    maxOutputTokens: 65536,
                    thinkingConfig: { thinkingBudget: 8192 }
                }
            };

           // Auto-rotate keys on quota errors
            let geminiRes, activeKeyIdx;
            for (let attempt = 0; attempt < GEMINI_KEYS.length; attempt++) {
                const { key, idx } = getNextGeminiKey();
                activeKeyIdx = idx;
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${key}`;
                geminiRes = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(geminiBody)
                });
                // 429 = quota hit, 403 = key invalid — rotate
                if (geminiRes.status === 429 || geminiRes.status === 403) {
                    markKeyExhausted(idx);
                    continue;
                }
                if (!geminiRes.ok) {
                    const errText = await geminiRes.text();
                    throw new Error(`Gemini responded with ${geminiRes.status}: ${errText}`);
                }
                break; // good key, proceed
            }
            if (!geminiRes.ok) {
                throw new Error('All Gemini API keys exhausted. Add more keys to GEMINI_KEYS array.');
            }
            

            const reader  = geminiRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            onClientClose = () => { try { reader.cancel(); } catch {} };
            req.on('close', onClientClose);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (!line.trim() || !line.startsWith('data:')) continue;
                    const raw = line.slice(5).trim();
                    if (raw === '[DONE]') continue;
                    try {
                        const parsed = JSON.parse(raw);
                        const parts  = parsed.candidates?.[0]?.content?.parts || [];
                        for (const part of parts) {
                            if (part.text) {
                                res.write(`data: ${JSON.stringify({ t: part.text })}\n\n`);
                            }
                        }
                        if (parsed.candidates?.[0]?.finishReason === 'STOP') {
                            res.write('data: [DONE]\n\n');
                            res.end();
                            return;
                        }
                    } catch {}
                }
            }

        } else {
            // ── OLLAMA FALLBACK ──────────────────────────────────────────────
            const ollamaRes = await fetch('http://127.0.0.1:11434/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    messages,
                    options: { temperature, ...options },
                    stream: true
                })
            });

            if (!ollamaRes.ok) {
                const errText = await ollamaRes.text();
                throw new Error(`Ollama responded with ${ollamaRes.status}: ${errText}`);
            }

            const reader  = ollamaRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            onClientClose = () => { try { reader.cancel(); } catch {} };
            req.on('close', onClientClose);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.message?.content) {
                            res.write(`data: ${JSON.stringify({ t: parsed.message.content })}\n\n`);
                        }
                        if (parsed.error) {
                            res.write(`data: ${JSON.stringify({ error: parsed.error })}\n\n`);
                            res.end(); return;
                        }
                        if (parsed.done === true) {
                            res.write('data: [DONE]\n\n');
                            res.end(); return;
                        }
                    } catch {}
                }
            }
        }
    } catch (streamErr) {
        if (!res.destroyed) {
            res.write(`data: ${JSON.stringify({ error: streamErr.message })}\n\n`);
        }
    } finally {
        req.off('close', onClientClose);
        if (!res.destroyed) res.end();
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server on explicit 127.0.0.1
const server = app.listen(PORT, HOST, () => {
    console.log(`\n🚀 Loma LIVE → http://${HOST}:${PORT}`);
    console.log(`🔗 Cloudflare Tunnel pointing to: api.envizion.work`);
});

// Prevent Cloudflare timeout for long AI streams
server.timeout = 0; 
server.keepAliveTimeout = 0;
