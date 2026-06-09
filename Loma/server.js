import express from 'express';
import cors from 'cors';
import http from 'http';

const app = express();

// ── Whitelist origins for local network testing and production routing ────────
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
    'https://envizion.work',
    'https://api.envizion.work'
];

// Centralized CORS configuration to share between standard routes and preflight checks
const corsOptions = {
    origin: function(origin, callback) {
        // Allow server-to-server or curl requests (no origin)
        if (!origin) return callback(null, true);
        
        const sanitizedOrigin = origin.replace(/\/$/, "");
        
        if (ALLOWED_ORIGINS.includes(sanitizedOrigin)) {
            return callback(null, true);
        }
        
        // Pass false instead of throwing a hard Error. This blocks CORS cleanly 
        // without crashing Express or sending ugly 500 HTML stacks.
        return callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204 for OPTIONS
};

// Apply shared CORS configuration globally
app.use(cors(corsOptions));

// Explicitly handle all preflight OPTIONS requests using the EXACT same rules
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '2mb' }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, model: 'llama3.2:1b' }));

// ── Root Path (Fixes "Cannot GET /" with a helpful check) ─────────────────────
app.get('/', (_, res) => res.json({ status: "online", service: "Loma Proxy Server", apiHealth: "https://envizion.work" }));

// ── Passthrough: browser → Ollama → browser ───────────────────────────────────
app.post('/api/chat', async (req, res) => {
    const { messages, temperature = 0.9 } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages array required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const reqOrigin = req.headers.origin || '';
    const safeOrigin = ALLOWED_ORIGINS.includes(reqOrigin.replace(/\/$/, "")) ? reqOrigin : 'https://envizion.work';
    res.setHeader('Access-Control-Allow-Origin', safeOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    try {
        const ollamaRes = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3.2:1b',
                messages: messages
                    .filter(m => m.role && typeof m.content === 'string' && m.content.trim())
                    .map(m => ({ role: m.role, content: m.content.trim() })),
                options: {
                    temperature: Math.min(Math.max(parseFloat(temperature), 0.1), 1.0),
                    num_ctx: 2048,
                    num_predict: 1024
                },
                stream: true
            })
        });

        const reader = ollamaRes.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const lines = decoder.decode(value).split('\n').filter(l => l.trim());
            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    const token = parsed.message?.content;
                    if (token) {
                        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: token } }] })}\n\n`);
                    }
                    if (parsed.done) {
                        res.write('data: [DONE]\n\n');
                        res.end();
                        return;
                    }
                } catch { }
            }
        }
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (err) {
        console.error('[Ollama error]', err.message);
        res.write(`data: ${JSON.stringify({ error: 'Ollama connection refused or model timed out.' })}\n\n`);
        res.end();
    }
});
// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Loma proxy server online on port ${PORT}`);
    console.log(`   Configured Target: Ollama engine via 127.0.0.1:11434 (Model: llama3.2:1b)`);
});