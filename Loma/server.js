import express from 'express';
import cors    from 'cors';
import path    from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Load the function-schema system prompt builder
// (uses createRequire so the CJS export from system-prompt.js works with ESM server)
const require           = createRequire(import.meta.url);
const { buildSystemPrompt } = require('./system-prompt.js');

const app      = express();
const PORT     = 8085;
const HOST     = '127.0.0.1'; // Force IPv4 to match Cloudflare Tunnel config
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// ─── PURE STREAMING PROXY ─────────────────────────────────────────────────────
// ─── MESSAGE HISTORY COMPRESSION ─────────────────────────────────────────────
// Keeps last 6 turns verbatim; older turns are compressed to ~400 chars each.
function compressMessages(messages) {
    const system = messages.filter(m => m.role === 'system');
    const chat   = messages.filter(m => m.role !== 'system');
    const KEEP_LAST = 6;
    if (chat.length <= KEEP_LAST) return messages;
    const old    = chat.slice(0, chat.length - KEEP_LAST);
    const recent = chat.slice(-KEEP_LAST);
    const compressed = old.map(m => ({
        ...m,
        content: m.content
            .replace(/```[\s\S]*?```/g, '[code]')
            .replace(/<!DOCTYPE[\s\S]*?<\/html>/gi, '[html]')
            .replace(/\n{3,}/g, '\n')
            .replace(/\s{4,}/g, ' ')
            .slice(0, 400)
    }));
    const historyBlock = {
        role: 'system',
        content: `[PRIOR CONTEXT — ${old.length} messages]\n` +
            compressed.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')
    };
    return [...system, historyBlock, ...recent];
}

// ─── FUNCTION-SCHEMA SYSTEM PROMPT ────────────────────────────────────────────
// Replaces the old prose blob (~15k tokens) with a domain-targeted prompt
// (~800–1200 tokens) built per-request from system-prompt.js.
// 
// HOW IT WORKS:
//   1. Extract the last user message from the chat history.
//   2. detectToolDomain() picks the ONE specialist block that matches.
//   3. detectKnowledgeDomains() injects compact knowledge hints only when relevant.
//   4. The resulting prompt is ~10x smaller than the old prose system prompt.
//
// isCorrectionMode: set to true when the user message contains 👎 feedback.
// evolvedCaps: pass [] here; the browser injects evolved caps client-side.
function buildTurnSystemPrompt(messages) {
    // Find last user message for domain detection
    const lastUser = [...messages]
        .reverse()
        .find(m => m.role === 'user');
    const userText       = lastUser?.content || '';
    const isCorrection   = /👎/.test(userText);

    return buildSystemPrompt(userText, isCorrection, []);
}

app.post('/api/chat', async (req, res) => {
    const { messages: rawMessages, model, temperature = 0.5, stream = true, options = {} } = req.body;

    if (!rawMessages || !Array.isArray(rawMessages)) {
        return res.status(400).json({ error: 'messages array required' });
    }

    // 1. Compress old message history (keeps last 6 turns verbatim)
    const compressedHistory = compressMessages(rawMessages);

    // 2. Build a domain-targeted system prompt (~800-1200 tokens vs old ~15k)
    //    Strips any client-sent system messages and replaces with our function-schema prompt.
    const builtSystemPrompt = buildTurnSystemPrompt(rawMessages);
    const chatMessages      = compressedHistory.filter(m => m.role !== 'system');
    const messages = [
        { role: 'system', content: builtSystemPrompt },
        ...chatMessages,
    ];

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform', 
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'                    
    });

    let onClientClose = () => {};

    try {
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

        const reader = ollamaRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let wordBatch = '';
        let wordCount = 0;
        const BATCH_SIZE = 100; // flush every 100 words

        const flushBatch = () => {
            if (wordBatch) {
                res.write(`data: ${JSON.stringify({ t: wordBatch })}\n\n`);
                wordBatch = '';
                wordCount = 0;
            }
        };

        onClientClose = () => {
            try { reader.cancel(); } catch {}
        };
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

                    if (parsed.message && parsed.message.content) {
                        const chunk = parsed.message.content;
                        wordBatch += chunk;
                        // count words by spaces as a cheap heuristic
                        wordCount += (chunk.match(/\s+/g) || []).length;
                        if (wordCount >= BATCH_SIZE) flushBatch();
                    }

                    if (parsed.error) {
                        flushBatch();
                        res.write(`data: ${JSON.stringify({ error: parsed.error })}\n\n`);
                        res.end();
                        return;
                    }

                    if (parsed.done === true) {
                        flushBatch(); // send whatever remains
                        res.write('data: [DONE]\n\n');
                        res.end();
                        return;
                    }
                } catch { }
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