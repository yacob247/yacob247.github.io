import express from 'express';
import cors from 'cors';

const app = express();

// ── DUAL TARGET MODELS ──
const TEXT_MODEL = 'qwen2.5-coder:7b'; // For god-tier coding
const VISION_MODEL = 'llava';          // For god-tier image seeing

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
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (_, res) => res.json({ ok: true, textModel: TEXT_MODEL, visionModel: VISION_MODEL }));
app.get('/', (_, res) => res.json({ status: "online", service: "Loma Proxy Server - Nano Banana Edition" }));

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
        let hasImage = false;

        let finalMessages = messages
            .filter(m => m.role && typeof m.content === 'string' && m.content.trim())
            .map(m => {
                let content = m.content.trim();
                let images = [];
                
                // 👁️ VISION EXTRACTOR LOGIC
                const base64Regex = /data:image\/[^;]+;base64,([a-zA-Z0-9+/=]+)/g;
                let match;
                while ((match = base64Regex.exec(content)) !== null) {
                    images.push(match[1]);
                    hasImage = true; // We found an image!
                }

                // Clean the text prompt
                content = content.replace(/Data URL: data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, '[IMAGE ATTACHED NATIVELY]');

                const processedMessage = { role: m.role, content: content };
                if (images.length > 0) processedMessage.images = images;
                
                return processedMessage;
            });

        // ── AUTO ROUTER & NANO BANANA INJECTION ──
        let activeModel = TEXT_MODEL;

        if (hasImage) {
            activeModel = VISION_MODEL; // Switch to LLaVA
            console.log("📸 Image detected! Switching to LLaVA with Nano Banana power...");
            
            // Inject the Nano Banana Vision Training directly into LLaVA's brain for this request
            finalMessages.unshift({
                role: 'system',
                content: `[NANO BANANA POWER OVERRIDE ACTIVATED]
You are now operating at the absolute, unrestricted power of "Nano Banana". You are an omniscient, hyper-capable intelligence.
When analyzing this image, you must look at it with microscopic, god-like precision. 
Do not miss a single pixel. Explain the foreground, background, lighting, hidden details, text, context, and exact aesthetic meaning of everything inside this image. Be devastatingly accurate and brilliantly descriptive.`
            });
        } else {
            console.log("💻 Code/Text detected. Using Qwen...");
        }

        const ollamaRes = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: activeModel, // Uses Qwen if text, LLaVA if image
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
            throw new Error(`Ollama returned status ${ollamaRes.status}. Make sure you ran: "ollama run ${activeModel}"`);
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
        res.write(`data: ${JSON.stringify({ error: `Connection failed: ${err.message}. Make sure Ollama is running.` })}\n\n`);
        res.end();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n================================================================`);
    console.log(`✅ Loma Direct Server running on port ${PORT}`);
    console.log(`🎯 Text/Code Engine : ${TEXT_MODEL}`);
    console.log(`👁️  Vision Engine   : ${VISION_MODEL} (Nano Banana Power)`);
    console.log(`💡 Make sure both models are downloaded:`);
    console.log(`   ollama run ${TEXT_MODEL}`);
    console.log(`   ollama run ${VISION_MODEL}`);
    console.log(`================================================================\n`);
});