import express from 'express';
import cors from 'cors';
import http from 'http';

const app = express();

// ── Allow requests from your site ────────────────────────────────────────────
// ── Allow requests from your site ────────────────────────────────────────────
app.use(cors({
    origin: [
        'https://envizion.work',
        'https://envizion.work', // explicitly added your sub-route
        'http://localhost:3000',
        'http://127.0.0.1:5500',
        'http://localhost:5500'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));


app.use(express.json({ limit: '2mb' }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, model: 'llama3.2' }));

// ── Passthrough: browser → Ollama → browser ───────────────────────────────────
app.post('/api/chat', (req, res) => {
    const { messages, temperature = 0.9, max_tokens = 8192 } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages array required' });
    }

    // Build the payload Ollama expects
    const ollamaBody = JSON.stringify({
        model: 'llama3.2',
        messages: messages
            .filter(m => m.role && typeof m.content === 'string' && m.content.trim())
            .map(m => ({ role: m.role, content: m.content.trim() })),
        options: {
            temperature: Math.min(Math.max(parseFloat(temperature), 0.1), 1.0),
            num_predict: Math.min(parseInt(max_tokens) || 8192, 32768)
        },
        stream: true
    });

    // SSE headers so browser reads it as a live stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Forward to local Ollama
    const ollamaReq = http.request({
        hostname: '127.0.0.1',
        port: 11434,
        path: '/api/chat',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(ollamaBody)
        }
    }, (ollamaRes) => {
        let buffer = '';

        ollamaRes.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep incomplete line for next chunk

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const parsed = JSON.parse(line);
                    const token = parsed.message?.content;
                    if (token) {
                        // Send in OpenAI-compatible SSE format — client already parses this
                        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: token } }] })}\n\n`);
                    }
                    if (parsed.done) {
                        res.write('data: [DONE]\n\n');
                        res.end();
                    }
                } catch {
                    // skip malformed line
                }
            }
        });

        ollamaRes.on('end', () => {
            res.write('data: [DONE]\n\n');
            res.end();
        });
    });

    ollamaReq.on('error', (err) => {
        console.error('[Ollama error]', err.message);
        res.write(`data: ${JSON.stringify({ error: 'Ollama not reachable. Is it running?' })}\n\n`);
        res.end();
    });

    // If browser disconnects, kill the Ollama request too
    req.on('close', () => ollamaReq.destroy());

    ollamaReq.write(ollamaBody);
    ollamaReq.end();
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Loma proxy server on port ${PORT}`);
    console.log(`   Forwarding to Ollama at localhost:11434`);
});