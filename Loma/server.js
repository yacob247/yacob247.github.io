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

    // SSE headers
    res.setHeader('Content-Type',      'text/event-stream');
    res.setHeader('Cache-Control',     'no-cache, no-transform');
    res.setHeader('Connection',        'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');         // nginx / Cloudflare tunnel
    res.setHeader('Content-Encoding',  'identity');   // prevent Cloudflare gzip buffering
    res.setHeader('Transfer-Encoding', 'chunked');    // force chunked stream through CF
    res.flushHeaders();

    let ollamaRes;
    try {
        ollamaRes = await fetch('http://127.0.0.1:11434/api/chat', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                model:      model || 'qwen2.5-coder:7b',
                messages,
                keep_alive: '2h',
                stream:     true,
                options: {
                    temperature:  parseFloat(temperature),
                    num_ctx:      options.num_ctx || 8192,
                    num_predict:  options.num_predict || -1,
                    top_p:        options.top_p    || 0.9,
                    repeat_penalty: options.repeat_penalty || 1.1,
                    ...options
                }
            })
        });
    } catch (connErr) {
        res.write(`data: ${JSON.stringify({ error: 'Cannot connect to Ollama. Start it with: ollama serve' })}\n\n`);
        res.end();
        return;
    }

    if (!ollamaRes.ok) {
        res.write(`data: ${JSON.stringify({
            error: `Ollama returned HTTP ${ollamaRes.status}. Is the model loaded? Run: ollama run ${model || 'qwen2.5-coder:7b'}`
        })}\n\n`);
        res.end();
        return;
    }

    // ── RAW PIPE — no JSON content parsing, no string ops ────────────────────
    // We only extract the token field (parsed.message.content) and forward it.
    // Everything else is left to the client.
    const reader  = ollamaRes.body.getReader();
    const decoder = new TextDecoder();
    let   buf     = '';

    const onClientClose = () => {
        reader.cancel().catch(() => {});
    };
    req.on('close', onClientClose);

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (res.destroyed) break;

            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop(); // keep incomplete line in buffer

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const parsed = JSON.parse(line);

                    // Forward only the token — client does all rendering
                    if (parsed.message?.content) {
                        res.write(`data: ${JSON.stringify({ t: parsed.message.content })}\n\n`);
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
    console.log('   Models available: qwen2.5-coder:7b (code), llava (vision)');
    console.log('   Start Ollama:     ollama serve\n');
});