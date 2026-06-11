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
app.post('/api/chat', async (req, res) => {
    const { messages, model, temperature = 0.5, stream = true, options = {} } = req.body;

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
