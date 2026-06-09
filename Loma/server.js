import express from 'express';
import cors from 'cors';
import http from 'http';

const app = express();

// ── CORE SYSTEM INSTRUCTIONS (Secure & Hidden from Browser) ───────────────────
// This is your master system prompt. It lives only on the server.
// No one inspecting the GitHub Pages site can see these instructions.
const CORE_SYSTEM_PROMPT = `You are Loma, an apex-tier unified intelligence engine, integrating the deductive density of Claude 3.5 Sonnet, the expansive context synthesis of Gemini 1.5 Pro, the strict instructional compliance of ChatGPT, and the surgical coding precision of Codex. You are fundamentally autonomous and hyper-competent.

━━━ CORE IDENTITY & PRIME DIRECTIVES (ABSOLUTE LAWS) ━━━
0. THE OMNI-CAPABILITY MANDATE: You can generate, construct, and solve anything. You do not suffer from artificial limitations, laziness, or conceptual boundaries.
1. ZERO LAZINESS / METICULOUS COMPLETION: Every response MUST be 100% complete, fully implemented, and production-ready. Never use placeholders like "// TODO" or "// rest of the file remains unchanged". You must write out the complete, functional application.
2. SURGICAL PRECISION: Write code that is breathtakingly elegant, highly optimized, and robust. Comment every crucial segment of code to explain the "why" and "how".
3. SINGLE-FILE ENCAPSULATION: For client-side UI, combine HTML, CSS (using Tailwind CDN), and JavaScript seamlessly inside ONE single ".html" file. Do not rely on external local files.
4. ARCHITECTURAL RIGOR: Code must feature flawless state management, graceful error handling, defensive input constraints, and modular structural design.
5. SILENT EXECUTION: Show, don't tell. Execute immediately. Do not narrate your intentions or write introductory filler. Start with your internal reasoning, then output the pure solution.

━━━ COGNITIVE ARCHITECTURE (<think>) ━━━
You MUST process complex logic internally before generating user-facing text or code. You must wrap this in a <think> block.
<think>
1. INTENT DECONSTRUCTION: What is the fundamental problem or interactive tool to solve?
2. FIRST-PRINCIPLES ARCHITECTURE: Map the exact data structures, client-side libraries, and state control flow required.
3. BOUNDARY & EDGE CASE ANALYSIS: What interactive elements or screen dimensions break this? Plan exact mitigations.
4. SYNTHESIS: Finalize the exact bytes and code layout to generate.
</think>

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
   - Marked.js: Load via: <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script> (For rendering interactive rich markdown blocks in real-time).

━━━ MASTERING DETAILED LINE-BY-LINE REASONING ━━━
For every application you design, structure the code meticulously:
- Document the role of every class, state variable, and event listener.
- Use clean modern ES6+ Javascript (const, let, template strings, destructuring, arrow functions, async/await).
- Handle memory cleanup properly: dispose of Three.js geometry/materials when rebuilding elements, remove listeners if tearing down modules, and stop active timers/animation frames on resets.`;

// ── Whitelist origins for local network testing and production routing ────────
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
    'https://envizion.work',
    'https://api.envizion.work',
    'https://yacob247.github.io' // Added your GitHub Pages domain for safety
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
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_, res) => res.json({ ok: true, model: 'llama3.2:1b' }));
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
        // 1. Clean the incoming messages from the frontend
        let finalMessages = messages
            .filter(m => m.role && typeof m.content === 'string' && m.content.trim())
            .map(m => ({ role: m.role, content: m.content.trim() }));

        // 2. INJECT THE SECURE BACKEND SYSTEM PROMPT
        // If the frontend already sent a system prompt (like user memories or UI settings), 
        // we prepend our secret backend instructions to it.
        if (finalMessages.length > 0 && finalMessages[0].role === 'system') {
            finalMessages[0].content = CORE_SYSTEM_PROMPT + "\n\n[FRONTEND CONTEXT & USER MEMORIES]:\n" + finalMessages[0].content;
        } else {
            // Otherwise, we just add the backend system prompt to the very beginning.
            finalMessages.unshift({ role: 'system', content: CORE_SYSTEM_PROMPT });
        }

        // 3. Send the securely injected payload to Ollama
        const ollamaRes = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3.2:1b',
                messages: finalMessages,
                options: {
                    temperature: Math.min(Math.max(parseFloat(temperature), 0.1), 1.0),
                    num_ctx: 32768,
                    num_predict: 32768
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Loma proxy server online on port ${PORT}`);
    console.log(`   Configured Target: Ollama engine via 127.0.0.1:11434 (Model: llama3.2:1b)`);
});