// Node.js backend configured strictly for cloud-offloaded Base Model completions
if (typeof global.window === 'undefined') {
    global.window = {
        getDynamicSystemPrompt: function() { return ""; }
    };
}

import express from 'express';
import cors     from 'cors';
import path     from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require   = createRequire(import.meta.url);
const { buildSystemPrompt, detectTemperature } = require('./system-prompt.js');

const app       = express();
const PORT      = 8085;
const HOST      = '127.0.0.1'; // Force IPv4 to match Cloudflare Tunnel configurations
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── HUGGING FACE CLOUD INITIALIZATION ────────────────────────────────────
const HF_TOKEN   = process.env.HF_TOKEN || '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';
// FIXED: Point to the Inference API text-generation router
const HF_MODEL   = 'meta-llama/Llama-3.2-3B'; 
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`; 

// Local Fallback Config — Local Ollama options
const DEFAULT_MODEL       = 'llama3.2:1b'; 
const DEFAULT_NUM_CTX     = 65536; // Adjusted to safe real-world context limit
const DEFAULT_NUM_PREDICT = 4096;  

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// ─── MESSAGE HISTORY COMPRESSION ─────────────────────────────────────────
function compressMessages(messages) {
    const system = messages.filter(m => m.role === 'system');
    const chat    = messages.filter(m => m.role !== 'system');
    const KEEP_LAST = 6;
    if (chat.length <= KEEP_LAST) return messages;
    const old    = chat.slice(0, chat.length - KEEP_LAST);
    const recent = chat.slice(-KEEP_LAST);
    const compressed = old.map(m => ({
        ...m,
        content: (m.content || '')
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

// ─── SYSTEM PROMPT BUILDER ─────────────────────────────────────────────────
function buildTurnSystemPrompt(messages) {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    const userText     = lastUser?.content || '';
    const isCorrection = /👎/.test(userText);

    const promptBuilder = buildSystemPrompt || global.window.buildSystemPrompt;

    if (typeof promptBuilder === 'function') {
        return promptBuilder(userText, isCorrection, []);
    }

    return "You are a raw text completion assistant.";
}

// ─── ADAPTIVE TEMPERATURE ──────────────────────────────────────────────────
function resolveTemperature(messages, requestedTemperature) {
    if (typeof requestedTemperature === 'number' && !Number.isNaN(requestedTemperature)) {
        return requestedTemperature;
    }

    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    const userText = lastUser?.content || '';

    if (typeof detectTemperature === 'function') {
        return detectTemperature(userText);
    }

    return 0.3;
}

// ─── STREAM FROM HUGGING FACE CLOUD (Base Model Safe) ─────────────────────
async function streamFromHuggingFace(messages, resolvedTemp, options, res, req) {
    let onClientClose = () => {};
    let wroteAnything = false;

    if (!HF_TOKEN) {
        console.warn('>>> Warning: HF_TOKEN not set. Skipping Cloud Endpoint execution.');
        return false;
    }

    try {
        const systemPromptBlock = buildTurnSystemPrompt(messages);
        const continuousTextPrompt = `System instructions: ${systemPromptBlock}\n\n` + 
            messages.map(m => `${m.role}: ${m.content}`).join('\n') + '\nassistant:';

        // FIXED: Hit the standard serverless inputs pipeline with streaming flags active
        const hfRes = await fetch(HF_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HF_TOKEN}`
            },
            body: JSON.stringify({
                inputs: continuousTextPrompt,
                parameters: {
                    temperature: resolvedTemp || 0.3,
                    max_new_tokens: options.num_predict || 1024,
                    return_full_text: false
                },
                options: {
                    use_cache: false,
                    wait_for_model: true
                }
            })
        });

        if (!hfRes.ok) {
            const errText = await hfRes.text();
            throw new Error(`Hugging Face Cloud responded with status ${hfRes.status}: ${errText}`);
        }

        const reader  = hfRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        onClientClose = () => { try { reader.cancel(); } catch {} };
        req.on('close', onClientClose);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                const cleanedLine = line.trim();
                if (!cleanedLine) continue;
                
                // Serverless API streams chunks either as raw JSON objects per line or via text structures
                try {
                    const parsed = JSON.parse(cleanedLine);
                    const tokenDelta = parsed.token?.text || parsed[0]?.generated_text;

                    if (tokenDelta) {
                        res.write(`data: ${JSON.stringify({ t: tokenDelta })}\n\n`);
                        wroteAnything = true;
                    }
                } catch {
                    // Fallback to strip basic wrapper layouts if chunk contains standard EventSource fragments
                    if (cleanedLine.startsWith('data:')) {
                        try {
                            const rawJson = cleanedLine.replace(/^data:\s*/, '');
                            const parsed = JSON.parse(rawJson);
                            const tokenDelta = parsed.choices?.[0]?.delta?.content || parsed.token?.text;
                            if (tokenDelta) {
                                res.write(`data: ${JSON.stringify({ t: tokenDelta })}\n\n`);
                                wroteAnything = true;
                            }
                        } catch {}
                    }
                }
            }
        }

        if (!res.destroyed) {
            res.write('data: [DONE]\n\n');
            res.end();
        }
        return true;
    } catch (err) {
        console.error('>>> Hugging Face Cloud Execution Exception:', err.message);
        if (wroteAnything) {
            if (!res.destroyed) {
                res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
                res.end();
            }
            return true;
        }
        return false;
    } finally {
        req.off('close', onClientClose);
    }
}

// ─── STREAM FROM LOCAL OLLAMA FALLBACK ─────────────────────────────────────
async function streamFromOllama(messages, model, resolvedTemp, options, res, req) {
    let onClientClose = () => {};
    let wroteAnything = false;

    try {
        // FIXED: Corrected local loopback address endpoint to Ollama standard API
        const ollamaRes = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages,
                stream: true,
                options: {
                    temperature: resolvedTemp,
                    num_ctx: DEFAULT_NUM_CTX,
                    num_predict: DEFAULT_NUM_PREDICT,
                    ...options
                }
            })
        });

        if (!ollamaRes.ok) {
            const errText = await ollamaRes.text();
            throw new Error(`Ollama local node responded with status ${ollamaRes.status}: ${errText}`);
        }

        const reader  = ollamaRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        onClientClose = () => { try { reader.cancel(); } catch {} };
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
                        wroteAnything = true;
                    }

                    if (parsed.error) {
                        if (!wroteAnything) throw new Error(parsed.error);
                        res.write(`data: ${JSON.stringify({ error: parsed.error })}\n\n`);
                        res.end();
                        return true;
                    }

                    if (parsed.done === true) {
                        res.write('data: [DONE]\n\n');
                        res.end();
                        return true;
                    }
                } catch (innerErr) {
                    if (!wroteAnything) throw innerErr;
                }
            }
        }

        if (!res.destroyed) res.end();
        return true;
    } catch (err) {
        if (wroteAnything) {
            if (!res.destroyed) {
                // FIXED: Removed structural broken trailing syntax comma
                res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
                res.end();
            }
            return true;
        }
        console.error('>>> Local Ollama fallback error:', err.message);
        return false;
    } finally {
        req.off('close', onClientClose);
    }
}

// ─── ROUTE HANDLER ENTRYPOINT ──────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
    const { messages, temperature, options = {}, model = DEFAULT_MODEL } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid or missing messages array." });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const processedMessages = compressMessages(messages);
    const resolvedTemp = resolveTemperature(processedMessages, temperature);

    // Primary Execution Track: Cloud Offload
    let success = await streamFromHuggingFace(processedMessages, resolvedTemp, options, res, req);
    
    // Secondary Track Fallback: Local Compute
    if (!success) {
        console.log('>>> Offload failed or skipped. Transitioning fallback sequence to local engine...');
        success = await streamFromOllama(processedMessages, model, resolvedTemp, options, res, req);
    }

    if (!success && !res.destroyed) {
        res.status(500).write(`data: ${JSON.stringify({ error: "Both cloud engine and local fallback context channels failed." })}\n\n`);
        res.end();
    }
});

app.listen(PORT, HOST, () => {
    console.log(`[LOMA Matrix Engine] Orchestrator active across cloud/local contexts -> http://${HOST}:${PORT}`);
});