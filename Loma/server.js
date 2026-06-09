import express from 'express';
import cors from 'cors';

const app = express();

// ── DIRECT LOCAL MODEL TARGET ──
// This directs your proxy server straight to the local, free Qwen model.
const TARGET_MODEL = 'qwen2.5-coder:7b';

const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
    'https://envizion.work',
    'https://api.envizion.work',
    'https://yacob247.github.io'
];

const corsOptions = {
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        const sanitizedOrigin = origin.replace(/\/$/, "");
        if (ALLOWED_ORIGINS.includes(sanitizedOrigin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200 
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_, res) => res.json({ ok: true, model: TARGET_MODEL }));
app.get('/', (_, res) => res.json({ status: "online", service: "Loma Proxy Server", activeModel: TARGET_MODEL }));

app.post('/api/chat', async (req, res) => {
    const { messages, temperature = 0.1 } = req.body; 

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages array is required' });
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
        let finalMessages = messages
            .filter(m => m.role && typeof m.content === 'string' && m.content.trim())
            .map(m => ({ role: m.role, content: m.content.trim() }));

        // 🚨 System prompt logic is now handled fully by index.html on the frontend!
        // We just pass finalMessages straight through to Ollama.

        const ollamaRes = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: TARGET_MODEL,
                messages: finalMessages,
                options: {
                    temperature: parseFloat(temperature),
                    num_ctx: 16384,   
                    num_predict: 4096 
                },
                stream: true
            })
        });

        if (!ollamaRes.ok) {
            throw new Error(`Ollama returned status ${ollamaRes.status}. Make sure you ran: ollama run ${TARGET_MODEL}`);
        }

        const reader = ollamaRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

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
                    const token = parsed.message?.content;
                    if (token) {
                        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: token } }] })}\n\n`);
                    }
                    if (parsed.done) {
                        res.write('data: [DONE]\n\n');
                        res.end();
                        return;
                    }
                } catch (e) {}
            }
        }

        if (buffer.trim()) {
            try {
                const parsed = JSON.parse(buffer);
                const token = parsed.message?.content;
                if (token) {
                    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: token } }] })}\n\n`);
                }
            } catch (e) {}
        }

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (err) {
        console.error('[Ollama Direct Engine Error]', err.message);
        res.write(`data: ${JSON.stringify({ error: `Connection failed: ${err.message}. Please run: "ollama run ${TARGET_MODEL}" inside your command prompt.` })}\n\n`);
        res.end();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n================================================================`);
    console.log(`✅ Loma Direct Server running on port ${PORT}`);
    console.log(`🎯 Targeted Engine: ${TARGET_MODEL} (100% Free & Local)`);
    console.log(`💡 Remember to open your command prompt and run:`);
    console.log(`   ollama run ${TARGET_MODEL}`);
    console.log(`================================================================\n`);
});