import express from 'express';
import cors    from 'cors';
import path    from 'path';
import { fileURLToPath } from 'url';

const app      = express();
const PORT     = 8085;
const HOST     = '127.0.0.1'; // Force IPv4 to match Cloudflare Tunnel config
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// ─── PURE STREAMING PROXY ─────────────────────────────────────────────────────
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

function compressSystemPrompt(content) {
    return content
        .replace(/<knowledge:[\s\S]*?<\/knowledge:[^>]+>/g, '')
        .replace(/(<think:[^>]+>)([\s\S]*?)(<\/think:[^>]+>)/g,
            (_, open, body, close) => open + body.slice(0, 300) + '\n[...]\n' + close)
        .replace(/\n{4,}/g, '\n\n')
        .trim();
}

app.post('/api/chat', async (req, res) => {
    const { messages: rawMessages, model, temperature = 0.5, stream = true, options = {} } = req.body;
    const messages = compressMessages(rawMessages);
    const sysIdx = messages.findIndex(m => m.role === 'system');
    if (sysIdx !== -1) messages[sysIdx].content = compressSystemPrompt(messages[sysIdx].content);

if (!rawMessages || !Array.isArray(rawMessages)) {
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
                        res.write(`data: ${JSON.stringify({ t: parsed.message.content })}\n\n`); 
                    }

                    if (parsed.error) {
                        res.write(`data: ${JSON.stringify({ error: parsed.error })}\n\n`);
                        res.end();
                        return;
                    }

                    if (parsed.done === true) {
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
