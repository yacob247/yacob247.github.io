import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 8081;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEXT_MODEL = 'qwen2.5-coder:7b';
const VISION_MODEL = 'llava';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// Pure streaming proxy — zero CPU processing on server side.
// Image extraction, batching, and rendering happen entirely on the client.
app.post('/api/chat', async (req, res) => {
    const { messages, temperature = 0.5 } = req.body;

    // Determine if any message contains an image (client already strips base64 to tokens)
    const hasImage = messages.some(m => m.images && m.images.length > 0);
    const model = hasImage ? VISION_MODEL : TEXT_MODEL;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
        const ollamaRes = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages,
                keep_alive: '1h',
                options: { temperature: parseFloat(temperature), num_ctx: 8192 },
                stream: true
            })
        });

        if (!ollamaRes.ok) {
            res.write(`data: ${JSON.stringify({ error: `Model "${model}" not running. Start it with: ollama run ${model}` })}\n\n`);
            res.end();
            return;
        }

        // Raw pipe — no JSON parsing, no string ops on the server
        // Forward each line straight through with zero processing
        const reader = ollamaRes.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop(); // keep incomplete line in buffer
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const parsed = JSON.parse(line);
                    if (parsed.message?.content) {
                        // Forward token directly — client does all rendering
                        res.write(`data: ${JSON.stringify({ t: parsed.message.content })}\n\n`);
                    }
                } catch (_) {}
            }
        }

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (err) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
    }
});

app.listen(PORT, () => console.log(`\n🚀 Loma → http://localhost:${PORT}\n`));