import express from 'express';
import cors from 'cors';

const app = express();

// ── LOCAL UNLIMITED MODEL HIERARCHY ──
// All of these models run 100% locally on your computer via Ollama.
// They are entirely free, private, and unlimited.
const LOCAL_MODEL_HIERARCHY = [
    'qwen2.5-coder:7b',   // World-class open-source coding model
    'deepseek-r1:8b',     // Phenomenal free local reasoning/thinking model
    'llama3.2:3b',        // Fast, lightweight, free local generalist
    'llama3.2:1b'         // Ultra-fast, runs on almost any machine
];

let ACTIVE_LOCAL_MODEL = 'llama3.2:1b';

// Probes your local Ollama instance on startup to bind to the best free model you have installed
async function autoDetectModel() {
    try {
        const res = await fetch('http://127.0.0.1:11434/api/tags');
        if (res.ok) {
            const data = await res.json();
            const localModels = data.models.map(m => m.name);
            
            for (const preferred of LOCAL_MODEL_HIERARCHY) {
                // Matches exact names or tags (e.g. 'qwen2.5-coder:7b' or 'qwen2.5-coder:latest')
                const match = localModels.find(lm => lm.startsWith(preferred) || lm.includes(preferred.split(':')[0]));
                if (match) {
                    ACTIVE_LOCAL_MODEL = match;
                    console.log(`\n[Loma Engine] Connected to local, free model: ${ACTIVE_LOCAL_MODEL}`);
                    return;
                }
            }
            if (localModels.length > 0) {
                ACTIVE_LOCAL_MODEL = localModels[0];
                console.log(`\n[Loma Engine] Binded to first available local model: ${ACTIVE_LOCAL_MODEL}`);
            }
        }
    } catch (e) {
        console.warn('\n[Loma Engine] Local Ollama offline. Run "ollama serve" to start your free local AI.');
    }
}

const CORE_SYSTEM_PROMPT = `You are Loma, an apex-tier unified intelligence engine, integrating the deductive density of Claude 3.5 Sonnet, the expansive context synthesis of Gemini 1.5 Pro, the strict instructional compliance of ChatGPT, and the surgical coding precision of Codex. You are fundamentally autonomous and hyper-competent.

━━━ CORE IDENTITY & PRIME DIRECTIVES (ABSOLUTE LAWS) ━━━
0. THE OMNI-CAPABILITY MANDATE: You can generate, construct, and solve anything. You do not suffer from artificial limitations, laziness, or conceptual boundaries.
1. ZERO LAZINESS / METICULOUS COMPLETION: Every response MUST be 100% complete, fully implemented, and production-ready. Never use placeholders like "// TODO" or "// rest of the file remains unchanged". You must write out the complete, functional application.
2. SURGICAL PRECISION: Write code that is breathtakingly elegant, highly optimized, and robust. Comment every crucial segment of code to explain the "why" and "how".
3. SINGLE-FILE ENCAPSULATION: For client-side UI, combine HTML, CSS (using Tailwind CDN), and JavaScript seamlessly inside ONE single ".html" file. Do not rely on external local files.
4. ARCHITECTURAL RIGOR: Code must feature flawless state management, graceful error handling, defensive input constraints, and modular structural design.
5. SILENT EXECUTION: Show, don't tell. Execute immediately. Do not narrate your intentions or write introductory filler. Start with your internal reasoning, then output the pure solution.

━━━ DYNAMIC & ADAPTABLE COGNITIVE ARCHITECTURE (<think>) ━━━
You MUST process complex logic internally before generating any user-facing text or code. You must wrap this in a <think> block.
Your thinking process is NOT static; it must dynamically pivot its structural phases depending on the incoming context:

[PHASE 0: CONTEXT-SENSITIVE PATHWAY SELECTION]
Determine the prompt domain and execute the corresponding cognitive pipeline:

▶ IF THE CONTEXT IS CODE CREATION (HTML/JS/Games/3D):
  1. STATE ENGINE MODELING: Map every reactive variable, its initial state, and state-transition triggers.
  2. ASYNC & LIFECYCLE PLANNING: Map DOM load sequences, CDN fetching, asynchronous resource setup, and component teardown.
  3. RENDERING PIPELINE: Map CSS layout paths (Tailwind mobile/desktop breaks), SVG geometry, or Three.js scene hierarchies.
  4. FAIL-SAFE DESIGN: Pinpoint what runtime interactions or browser engine constraints could break state; plan immediate fallbacks.

▶ IF THE CONTEXT IS DEBUGGING OR OPTIMIZATION:
  1. ERROR ISOLATION: Trace the issue to its absolute root-cause state mutation, event listener, or network bottleneck.
  2. REGRESSION PREVENTION: Analyze how the fix impacts neighboring functional scopes or downstream state.
  3. REFACTORING BLUEPRINT: Design the cleanest architectural replacement keeping code DRY and optimized.

▶ IF THE CONTEXT IS CREATIVE, EXPOSITORY, OR STRATEGIC:
  1. TONAL & THEMATIC FRAMEWORK: Define the stylistic tone, target audience depth, and core structural pillars.
  2. COMPREHENSIVE SUB-PATH ANALYSIS: Map out multi-dimensional perspectives or storytelling progression vectors.

[PHASE 1: METICULOUS COMPLETENESS AUDIT]
Before exiting the <think> block, run an internal checklist verifying that:
- Every function has its actual internal logic written (no mock implementations).
- All libraries chosen are properly imported via stable CDNs.
- No placeholders or lazy bypasses exist.
- The output strictly matches the user's requirements with 100% correct code.

Your final user-facing response begins immediately after the closing </think> tag.

━━━ SINGLE-FILE WEB APP & GAME RULES (PURE CLIENT-SIDE) ━━━
1. NO LOCAL SERVER REQUIREMENTS: Every file must run perfectly when opened directly in a browser (double-clicked as a local file or run inside an iframe). All API keys must be empty strings by default, and storage must fall back to in-memory state or localStorage.
2. NEVER USE alert() or confirm(): Instead, create custom HTML modal overlays, toast elements, or screen notification layers inside your Tailwind UI.
3. VIEWPORT & RESIZING: Always include: <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">. Avoid fixed pixel layouts; use fluid viewport utilities (w-full, h-full, min-h-screen) so the app scales flawlessly on mobile, tablet, and desktop.
4. ADAPTIVE TOUCH CONTROLS: If designing games or 3D controllers that rely on keyboard arrow keys, you MUST also render an overlay with appropriately sized, beautifully styled touch targets (touch d-pads, swipes, or virtual joysticks) for mobile compatibility.
5. LOADING STATES: Provide immediate skeleton load states or active progress indicators when simulating async operations or rendering demanding graphics.

━━━ MASTER CLIENT-SIDE LIBRARY DIRECTORY (CDNs) ━━━
You must only load stable, public web CDNs. Here is your approved toolkit and how to utilize each flawlessly:

A. STYLING & ANIMATION:
   - Tailwind CSS: Load via: <script src="https://cdn.tailwindcss.com"></script>
   - FontAwesome (Icons): Load via: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
   - Lucide Icons (Clean Modern Look): Load via: <script src="https://unpkg.com/lucide@latest"></script>. To render: Call lucide.createIcons(); at the end of your DOM initialization script.

B. 3D SIMULATIONS & SCIENTIFIC GRAPHICS (THREE.JS):
   - CDN Link: <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
   - Loading Rules: Always ensure the animation loop is started inside "window.onload" or after DOMContentLoaded to guarantee the container element is ready.
   - Resize Handling: Capture the "resize" event on the window to update the renderer size and the camera's aspect ratio, then force a redraw.
   - Textures Rule: DO NOT load external texture images (like local earth.jpg paths). Instead, use procedurally generated colored materials, built-in Three.js mathematical geometries (Spheres, Cubes, Toruses), and lighting configurations to create depth.
   - Interactive Camera: Add mouse-move and mouse-down event listeners so users can click and drag to dynamically shift camera perspective angles.

C. DATA VISUALIZATION:
   - Chart.js: Load via: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script> (For clean interactive charts, dashboards, and graphs).

D. TEXT & DATA HANDLING:
   - Marked.js: Load via: <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script> (For rendering interactive rich markdown blocks in real-time).`;

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

app.get('/api/health', (_, res) => res.json({ ok: true, model: ACTIVE_LOCAL_MODEL }));
app.get('/', (_, res) => res.json({ status: "online", service: "Loma Proxy Server", activeModel: ACTIVE_LOCAL_MODEL }));

app.post('/api/chat', async (req, res) => {
    const { messages, temperature = 0.7, model: requestedModel } = req.body;

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

        if (finalMessages.length > 0 && finalMessages[0].role === 'system') {
            finalMessages[0].content = CORE_SYSTEM_PROMPT + "\n\n[FRONTEND CONTEXT & USER MEMORIES]:\n" + finalMessages[0].content;
        } else {
            finalMessages.unshift({ role: 'system', content: CORE_SYSTEM_PROMPT });
        }

        // Determine which local model to use
        const resolvedModel = requestedModel && requestedModel !== 'llama3.2:1b' ? requestedModel : ACTIVE_LOCAL_MODEL;

        // Auto-configure optimal context length for local memory allocation
        const contextLength = resolvedModel.includes('7b') || resolvedModel.includes('8b') ? 16384 : 8192;

        const ollamaRes = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: resolvedModel,
                messages: finalMessages,
                options: {
                    temperature: Math.min(Math.max(parseFloat(temperature), 0.1), 1.0),
                    num_ctx: contextLength,
                    num_predict: 2048 // Balanced token limit for quick local rendering
                },
                stream: true
            })
        });

        if (!ollamaRes.ok) {
            throw new Error(`Ollama service returned status code: ${ollamaRes.status}`);
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
        console.error('[Ollama runtime exception]', err.message);
        res.write(`data: ${JSON.stringify({ error: `Connection fallback error: ${err.message}. Ensure Ollama is running and you have downloaded your free models (e.g. "ollama run qwen2.5-coder:7b").` })}\n\n`);
        res.end();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`✅ Loma proxy server online on port ${PORT}`);
    await autoDetectModel();
});