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

app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        
        const sanitizedOrigin = origin.replace(/\/$/, "");
        
        if (ALLOWED_ORIGINS.includes(sanitizedOrigin)) {
            return callback(null, true);
        }
        
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Handle OPTIONS preflight explicitly for all routes
app.options('*', cors());

app.use(express.json({ limit: '2mb' }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, model: 'llama3.2:1b' }));

// ── Root Path (Fixes "Cannot GET /" with a helpful check) ─────────────────────
app.get('/', (_, res) => res.json({ status: "online", service: "Loma Proxy Server", apiHealth: "https://envizion.work" }));

// ── Passthrough: browser → Ollama → browser ───────────────────────────────────
app.post('/api/chat', (req, res) => {
    const { messages, temperature = 0.9, max_tokens = 8192 } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages array required' });
    }

    // Build the payload Ollama expects — Explicitly optimized for llama3.2:1b on CPU
    const ollamaBody = JSON.stringify({
        model: 'llama3.2:1b', // <-- Updated to target your downloaded 1B model variant
        messages: messages
            .filter(m => m.role && typeof m.content === 'string' && m.content.trim())
            .map(m => ({ role: m.role, content: m.content.trim() })),
        options: {
            temperature: Math.min(Math.max(parseFloat(temperature), 0.1), 1.0),
            num_ctx: 2048,      // Caps context allocation window to prevent memory drops
            num_predict: 1024   // Caps output prediction length to eliminate socket timeouts
        },
        stream: true
    });

    // SSE headers so browser reads it as a live stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    // Support CORS preflight on SSE streams dynamically
    const reqOrigin = req.headers.origin || '';
    const safeOrigin = ALLOWED_ORIGINS.includes(reqOrigin.replace(/\/$/, "")) ? reqOrigin : 'https://envizion.work';
    res.setHeader('Access-Control-Allow-Origin', safeOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Forward to local Ollama via raw IPv4 address
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
                        // Send in OpenAI-compatible SSE format
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
        res.write(`data: ${JSON.stringify({ error: 'Ollama connection refused or model timed out.' })}\n\n`);
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
    console.log(`✅ Loma proxy server online on port ${PORT}`);
    console.log(`   Configured Target: Ollama engine via 127.0.0.1:11434 (Model: llama3.2:1b)`);
});
