import express from 'express';
import cors    from 'cors';
import path    from 'path';
import { fileURLToPath } from 'url';

const app      = express();
const PORT     = 8085;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Model routing ─────────────────────────────────────────────────────────────
// All model selection happens on the CLIENT.
// Server reads the model field from the request body and forwards it verbatim.
// Server never selects or overrides the model.

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// ─── PURE STREAMING PROXY ─────────────────────────────────────────────────────
// The server does EXACTLY one thing: receive a request and forward the raw
// Ollama stream back to the client as SSE.
// Zero CPU processing on the server.
// Zero JSON parsing of content on the server.
// All token rendering, markdown parsing, image tag handling, think-block
// stripping, and training data writing happen entirely on the CLIENT's CPU.
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
    const { messages, model, temperature = 0.5, stream = true, options = {} } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages array required' });
    }

    // Write SSE Headers with explicit flags preventing Cloudflare/Proxy buffering
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform', // "no-transform" prevents Cloudflare from compression/gzipping streaming frames
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'                    // Disables buffering in reverse proxies (like Cloudflare & Nginx)
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
                        if (typeof res.flush === "function") res.flush();
                    }

                    // Forward Ollama errors to client
                    if (parsed.error) {
                        res.write(`data: ${JSON.stringify({ error: parsed.error })}\n\n`);
                        res.end();
                        return;
                    }

                    // Stream done
                    if (parsed.done === true) {
                        res.write('data: [DONE]\n\n');
                        res.end();
                        return;
                    }
                } catch {
                    // Malformed line — skip silently
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

// ── Static fallback ───────────────────────────────────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🚀 Loma → http://localhost:${PORT}\n`);
    console.log('   Models available: qwen2.5-coder, llama3, etc.');
});