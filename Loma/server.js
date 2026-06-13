// Node.js backend configured strictly for cloud-offloaded Base Model completions
if (typeof global.window === 'undefined') {
    global.window = {
        getDynamicSystemPrompt: function() { return ""; }
    };
}

import express from 'express';
import cors    from 'cors';
import path    from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require   = createRequire(import.meta.url);
const { buildSystemPrompt, detectTemperature } = require('./system-prompt.js');

const app       = express();
const PORT      = 8085;
const HOST      = '127.0.0.1'; // Force IPv4 to match Cloudflare Tunnel configurations
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── HUGGING FACE CLOUD INITIALIZATION ────────────────────────────────────
// Sets up your authorization token and the endpoint path for Meta's Base model.
// Set HF_TOKEN in your environment before executing.
const HF_TOKEN   = process.env.HF_TOKEN || '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';
const HF_API_URL = 'https://huggingface.co'; //

// 🚀 CRITICAL: Points strictly to the raw Base model (no instruct tuning applied)
const HF_MODEL   = 'meta-llama/Llama-3.2-3B'; 

// Local Fallback Config — Local Ollama options
const DEFAULT_MODEL       = 'llama3.2'; 
const DEFAULT_NUM_CTX     = 9999999; // 64K context window allocation
const DEFAULT_NUM_PREDICT = 999999;  // Long structured code prediction limit

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
        // 🔥 BASE MODEL COMPATIBILITY TRANSLATION:
        // Converts separate chat histories and system guidelines into a unified text continuous sequence.
        // This isolates the prompt payload to pass to the Hugging Face Serverless endpoint.
        const systemPromptBlock = buildTurnSystemPrompt(messages);
        const continuousTextPrompt = `System instructions: ${systemPromptBlock}\n\n` + 
            messages.map(m => `${m.role}: ${m.content}`).join('\n') + '\nassistant:';

        const hfRes = await fetch(HF_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HF_TOKEN}`
            },
            body: JSON.stringify({
                model: HF_MODEL,
                // Wrapping your sequence into a clean user array tricks the Chat Completion router 
                // into accepting raw base completion text blocks seamlessly.
                messages: [{ role: 'user', content: continuousTextPrompt }],
                stream: true,
                temperature: resolvedTemp,
                max_tokens: options.num_predict || DEFAULT_NUM_PREDICT
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
                if (!cleanedLine || !cleanedLine.startsWith('data:')) continue;
                if (cleanedLine === 'data: [DONE]') {
                    res.write('data: [DONE]\n\n');
                    res.end();
                    return true;
                }

                try {
                    const rawJson = cleanedLine.replace(/^data:\s*/, '');
                    const parsed = JSON.parse(rawJson);
                    const tokenDelta = parsed.choices?.[0]?.delta?.content;

                    if (tokenDelta) {
                        res.write(`data: ${JSON.stringify({ t: tokenDelta })}\n\n`);
                        wroteAnything = true;
                    }
                } catch (innerErr) {
                    // Ignore broken streaming chunks gracefully
                }
            }
        }

        if (!res.destroyed) res.end();
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
        const ollamaRes = await fetch('http://127.0.0', {
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
res.write(`data: ${JSON.stringify({ error: err.message })},\n\n`);
res.end();}return true;}console.error('>>> Local Ollama fallback error:', err.message);return false;} finally {req.off('close', onClientClose);}}// ─── CHAT COMPLETIONS ENDPOINT ROUTING ─────────────────────────────────────app.post('/v1/chat/completions', async (req, res) => {res.setHeader('Content-Type', 'text/event-stream');res.setHeader('Cache-Control', 'no-cache');res.setHeader('Connection', 'keep-alive');let { messages = [], model = DEFAULT_MODEL, temperature, options = {} } = req.body;if (!Array.isArray(messages) || messages.length === 0) {res.write(data: ${JSON.stringify({ error: "Missing or blank 'messages' context array structure." })}\n\n);res.end();return;}const compressed = compressMessages(messages);const resolvedTemp = resolveTemperature(compressed, temperature);console.log(\n[Routing Request] Dispatching pipeline token compilation...);// 🌟 PRIMARY STRATEGY: Execute over Hugging Face Cloud to eliminate local computer CPU strainconst hfSuccess = await streamFromHuggingFace(compressed, resolvedTemp, options, res, req);if (hfSuccess) return;// 💤 LOCAL FALLBACK METHOD: Runs over local Ollama service if Cloud credentials are missingconsole.log(>>> Falling back to local network Ollama instance...);const ollamaSuccess = await streamFromOllama(compressed, model, resolvedTemp, options, res, req);if (!ollamaSuccess && !res.destroyed) {res.write(data: ${JSON.stringify({ error: "Both Hugging Face Cloud cluster and local Ollama targets failed to execute." })}\n\n);res.end();}});// Start Server Listen Execution Loopapp.listen(PORT, HOST, () => {console.log(========================================================================);console.log(🚀 Base Completion Execution Router online at: http://${HOST}:${PORT});console.log(🤖 Targeting Cloud Base Pipeline Model Repository: ${HF_MODEL});console.log(🔒 Status check: HF_TOKEN is ${HF_TOKEN ? 'CONFIGURED ✔️' : 'MISSING ❌'});console.log(========================================================================);});