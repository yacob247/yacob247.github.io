// ═══════════════════════════════════════════════════════════════════════════════
//  LOMA META-TRAINER  ·  loma-meta-trainer.js
//  Version 1.0.0  ·  Envizion / Yacob's Digital
//
//  PURPOSE
//  ───────
//  This file teaches Loma — at runtime — every technique used to:
//    1. Read and ingest its own system prompt at full depth
//    2. Parse incoming SSE / streaming API responses reliably
//    3. Drive a token typewriter render loop at the right speed
//    4. Do brace-balanced JSON fragment assembly (Cloudflare-resilient)
//    5. Classify request intent to route to the right domain
//    6. Perform structured self-analysis of any codebase or text
//    7. Execute a recursive self-improvement loop
//    8. Learn from every response it produces (RLHF-style capture)
//
//  HOW IT WORKS
//  ────────────
//  When Loma receives a meta-query (e.g. "how did Claude read its system prompt
//  so fast?", "teach me how you stream tokens", "how do you parse yourself?"),
//  this module intercepts it, runs the relevant teaching pipeline, and injects
//  the full annotated technique into the chat and into Loma's evolved capabilities.
//
//  The file is self-contained. Drop it next to index.html. Include it as:
//    <script src="loma-meta-trainer.js" defer></script>
//
// ═══════════════════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── GUARD ──────────────────────────────────────────────────────────────────
    if (window.__lomaMetaTrainerLoaded) return;
    window.__lomaMetaTrainerLoaded = true;

    // ── WAIT FOR MAIN ENGINE ───────────────────────────────────────────────────
    // index.html initialises its globals (getDynamicSystemPrompt, triggerInference,
    // rlhfDataset, etc.) inside a DOMContentLoaded module. We wait for them.
    function waitFor(getter, cb, interval = 120, timeout = 10000) {
        const start = Date.now();
        const id = setInterval(() => {
            const val = getter();
            if (val !== undefined && val !== null) { clearInterval(id); cb(val); return; }
            if (Date.now() - start > timeout) { clearInterval(id); console.warn('[MetaTrainer] timeout waiting for dep'); }
        }, interval);
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  SECTION 1 — SYSTEM PROMPT SELF-READER
    //  ──────────────────────────────────────
    //  Teaches Loma how Claude ingests its own system prompt at startup:
    //    • The prompt is assembled from named blocks (DOMAINS, KNOWLEDGE_DOMAINS,
    //      APEX_PROMPT, CDN_LIBRARY, CANVAS_RULES, etc.) via getDynamicSystemPrompt().
    //    • It is injected as messages[0] = { role:'system', content: <full text> }
    //      ONCE per session, then cached by the Ollama KV cache — never resent.
    //    • Claude's own system prompt works identically: it is a large structured
    //      text divided into XML-tagged sections. Claude parses it by pattern-
    //      matching section headers, not by loading a data structure.
    //  The reader below extracts every section header and its byte length so Loma
    //  can understand what it is carrying.
    // ════════════════════════════════════════════════════════════════════════════

    window.lomaReadSystemPrompt = function () {
        const raw = typeof getDynamicSystemPrompt === 'function'
            ? getDynamicSystemPrompt()
            : '(getDynamicSystemPrompt not available yet)';

        const bytes = new TextEncoder().encode(raw).length;
        const chars = raw.length;
        const tokens = Math.round(chars / 3.8); // rough GPT/Ollama token estimate

        // Extract all named section headers
        const sectionRe = /(?:^|\n)(━━━[^\n]+━━━|<think:[^>]+>|<knowledge:[^>]+>|IDENTITY:|ABSOLUTE DIRECTIVES|DOMAIN ROUTING|CDN LIBRARY|CANVAS RULES|KNOWLEDGE FOUNDATION)/gm;
        const sections = [];
        let m;
        while ((m = sectionRe.exec(raw)) !== null) {
            sections.push(m[1].trim());
        }

        return {
            raw,
            bytes,
            chars,
            tokens,
            sections,
            summary: `System prompt: ${bytes.toLocaleString()} bytes · ~${tokens.toLocaleString()} tokens · ${sections.length} named sections`
        };
    };

    // ════════════════════════════════════════════════════════════════════════════
    //  SECTION 2 — SSE STREAM PARSER (Cloudflare-resilient)
    //  ─────────────────────────────────────────────────────
    //  The exact algorithm used in triggerInference():
    //
    //  PROBLEM:
    //    The server sends Server-Sent Events (SSE) like:
    //      data: {"t":"Hello"}\n
    //      data: {"t":" world"}\n
    //      data: [DONE]\n
    //    But Cloudflare Workers / CDN edge nodes split TCP packets mid-line, so
    //    a single `reader.read()` call may return:
    //      "data: {\"t\":\"He" ← TRUNCATED: open brace, no close
    //    or even span two JSON objects:
    //      "llo\"}\ndata: {\"t\":\" world\"}"
    //
    //  SOLUTION — TWO-LEVEL BUFFER:
    //    leftover  = incomplete raw line (cut mid-line by TCP)
    //    jsonBuf   = accumulated JSON fragment (cut mid-JSON by line wrapping)
    //
    //  ALGORITHM:
    //    1. Append each decoded chunk to `leftover`.
    //    2. Split `leftover` on '\n'. Keep the last element (partial line) as
    //       the new `leftover`. Process all complete lines.
    //    3. For each complete line:
    //       a. Strip leading/trailing whitespace.
    //       b. If empty → skip.
    //       c. Strip 'data: ' prefix.
    //       d. If '[DONE]' → skip.
    //       e. Append line to `jsonBuf`.
    //       f. Count open '{' vs close '}' braces in `jsonBuf`.
    //       g. If open > 0 AND open === closed → JSON is complete. Parse it.
    //          Extract parsed.t (the token string). Push to tokenQueue.
    //          Reset jsonBuf = "".
    //       h. If braces don't balance → keep accumulating into jsonBuf.
    //    4. After the stream ends (`done` = true), flush any remaining jsonBuf.
    //
    //  WHY BRACE COUNTING?
    //    Because the server sends one JSON object per line — and that object may
    //    be split across multiple SSE lines by the CDN. A simple line.includes('}')
    //    check fails for nested objects. Counting braces is O(n) per fragment and
    //    exactly matches when the outermost object closes.
    //
    //  PERFORMANCE NOTE:
    //    brace counting runs on every line append — worst case O(n²) over a long
    //    stream, but in practice each jsonBuf is ≤ 200 chars so it's negligible.
    //    For production use on very high-token streams, cache the running count.
    // ════════════════════════════════════════════════════════════════════════════

    window.lomaBuildSSEParser = function (onToken, onDone) {
        // Returns an object with a `.feed(ReadableStream)` method.
        // onToken(str)  — called with each decoded token string
        // onDone()      — called when stream ends

        let leftover = '';
        let jsonBuf = '';

        async function feed(readableStream) {
            const reader = readableStream.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                leftover += decoder.decode(value, { stream: true });

                const lines = leftover.split('\n');
                leftover = lines.pop(); // hold the incomplete tail

                for (let line of lines) {
                    line = line.trim();
                    if (!line) continue;
                    if (line.startsWith('data: ')) line = line.slice(6).trim();
                    if (line === '[DONE]') continue;
                    if (!line) continue;

                    jsonBuf += line;

                    // Count braces
                    let open = 0, closed = 0;
                    for (const ch of jsonBuf) {
                        if (ch === '{') open++;
                        else if (ch === '}') closed++;
                    }

                    if (open > 0 && open === closed) {
                        try {
                            const parsed = JSON.parse(jsonBuf);
                            if (parsed.t) onToken(parsed.t);
                            // Also handle OpenAI-style delta chunks:
                            if (parsed.choices?.[0]?.delta?.content) {
                                onToken(parsed.choices[0].delta.content);
                            }
                        } catch (e) {
                            console.debug('[MetaTrainer] malformed token dropped:', jsonBuf.slice(0, 80));
                        }
                        jsonBuf = '';
                    }
                }
            }

            // Flush tail
            if (jsonBuf.trim()) {
                try {
                    const parsed = JSON.parse(jsonBuf);
                    if (parsed.t) onToken(parsed.t);
                } catch {}
            }

            if (typeof onDone === 'function') onDone();
        }

        return { feed };
    };

    // ════════════════════════════════════════════════════════════════════════════
    //  SECTION 3 — TOKEN TYPEWRITER RENDER LOOP
    //  ─────────────────────────────────────────
    //  How Claude / Loma renders streaming tokens smoothly without blocking:
    //
    //  ARCHITECTURE: Producer / Consumer decoupled via a queue.
    //    Producer: the SSE reader pushes raw token strings into `tokenQueue[]`.
    //    Consumer: requestAnimationFrame(animateTypewriter) drains the queue.
    //
    //  WHY DECOUPLED?
    //    If we called innerHTML on every token, we'd trigger a full DOM reparse
    //    on every character — at 30 tokens/sec that's 30 layout recalculations/sec,
    //    visible as jank and high CPU. By batching into rAF, we align DOM writes
    //    with the browser's natural 60fps paint schedule.
    //
    //  BATCH SIZE FORMULA:
    //    batchSize = Math.max(1, Math.floor(tokenQueue.length / 3))
    //    Meaning: drain 1/3 of the queue per frame.
    //    When queue is small (1–2 tokens): drain 1 per frame → smooth.
    //    When queue is large (queue backed up, 30+ tokens): drain 10/frame → catch-up.
    //    This makes it feel like a natural typewriter even at variable token rates.
    //
    //  RENDERING:
    //    After draining each batch, call parseMarkdownResponse(accumulatedText, false)
    //    which runs marked.js with isFinal=false (streaming mode, no heavy transforms).
    //    Append a <span class="streaming-cursor"> to show the blinking caret.
    //
    //  SHUTDOWN SEQUENCE:
    //    1. Stream reader sets renderLoopActive = false.
    //    2. animateTypewriter continues until tokenQueue is empty (draining residual).
    //    3. Then it exits (the rAF chain terminates naturally).
    //    4. A final `parseMarkdownResponse(text, true)` renders the full response
    //       with all heavy transforms (canvas detection, image tags, code blocks).
    //    5. Remove the streaming-cursor span.
    //
    //  THE DRAIN WAIT:
    //    After setting renderLoopActive = false, we must wait for the queue to
    //    fully drain before doing the final render, or we overwrite mid-drain.
    //    We do this with:
    //      await new Promise(resolve => {
    //          const check = () => tokenQueue.length === 0 ? resolve() : requestAnimationFrame(check);
    //          requestAnimationFrame(check);
    //      });
    //    This is a zero-cost spin that yields to the browser every frame.
    // ════════════════════════════════════════════════════════════════════════════

    window.lomaBuildTypewriter = function (targetEl, parseMarkdownFn) {
        // Returns { push(token), finalize(fullText), cancel() }
        // targetEl: the DOM element to write into
        // parseMarkdownFn(text, isFinal): converts markdown to HTML

        let tokenQueue = [];
        let accumulated = '';
        let renderLoopActive = true;
        let animationId = null;

        function animateTypewriter() {
            if (!renderLoopActive && tokenQueue.length === 0) return; // stop chain

            if (tokenQueue.length > 0) {
                // Adaptive batch size — drain faster if queue is backing up
                const batchSize = Math.max(1, Math.floor(tokenQueue.length / 3));
                for (let i = 0; i < batchSize; i++) {
                    if (tokenQueue.length > 0) accumulated += tokenQueue.shift();
                }

                // Strip <think>...</think> while streaming — show only final content
                let displayText = accumulated;
                const ts = accumulated.indexOf('<think>');
                const te = accumulated.indexOf('</think>');
                if (ts !== -1) {
                    displayText = te !== -1
                        ? accumulated.slice(0, ts) + accumulated.slice(te + 8)
                        : accumulated.slice(0, ts); // still inside <think> — show nothing yet
                }

                // Render with streaming markdown (no heavy transforms yet)
                const html = displayText.trim().length === 0
                    ? `<div class="flex gap-1 items-center h-6 my-2 px-2">
                           <div class="gemini-loading-dot"></div>
                           <div class="gemini-loading-dot"></div>
                           <div class="gemini-loading-dot"></div>
                       </div>`
                    : (parseMarkdownFn ? parseMarkdownFn(displayText, false)
                                       : `<p>${displayText}</p>`);

                if (targetEl) {
                    targetEl.innerHTML = html + '<span class="streaming-cursor"></span>';
                    // Auto-scroll if user hasn't scrolled up manually
                    const chat = document.getElementById('chat-stream');
                    if (window.autoScrollChat && chat) chat.scrollTop = chat.scrollHeight;
                }
            }

            if (renderLoopActive || tokenQueue.length > 0) {
                animationId = requestAnimationFrame(animateTypewriter);
            }
        }

        // Kick off the loop
        animationId = requestAnimationFrame(animateTypewriter);

        return {
            // Called by the SSE parser for each token
            push(token) {
                tokenQueue.push(token);
            },

            // Called when the stream ends — drains, then does the final full render
            async finalize(rawFullText) {
                renderLoopActive = false;

                // Wait for queue to drain
                await new Promise(resolve => {
                    const check = () => tokenQueue.length === 0
                        ? resolve()
                        : requestAnimationFrame(check);
                    requestAnimationFrame(check);
                });

                // Final render with full transforms
                const clean = rawFullText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                if (targetEl) {
                    targetEl.innerHTML = parseMarkdownFn
                        ? parseMarkdownFn(clean, true)
                        : `<p>${clean}</p>`;
                }
            },

            cancel() {
                renderLoopActive = false;
                if (animationId) cancelAnimationFrame(animationId);
            }
        };
    };

    // ════════════════════════════════════════════════════════════════════════════
    //  SECTION 4 — FAST TEXT / CODE SELF-READER
    //  ─────────────────────────────────────────
    //  How Claude reads a large file (like index.html at 4724 lines) quickly:
    //
    //  1. CHUNKED READING — never read all 4724 lines at once. Divide the file
    //     into ranges: [1–200], [200–600], [600–1100], etc. Each range targets
    //     a logical section (head/CSS, HTML structure, JS modules, system prompt).
    //
    //  2. PATTERN-FIRST — scan for structural anchors before reading prose:
    //     • In HTML: look for <script, function declarations, const X = `
    //     • In JS: look for function names, const X =, window.X =
    //     • In system prompts: look for ━━━, <think:, IDENTITY:, ABSOLUTE DIRECTIVES
    //     These anchors tell you WHERE to read in depth.
    //
    //  3. SEMANTIC CHUNKING — each anchor defines a "section". Read the section
    //     header + first 20 lines in full, skim the middle, read the last 5 lines.
    //     This gives 90% of the meaning at 30% of the tokens.
    //
    //  4. DEPENDENCY GRAPH — identify what calls what:
    //     triggerInference → getDynamicSystemPrompt → APEX_PROMPT → DOMAINS
    //     processInputMessage → classifySearchIntent → triggerInference
    //     parseMarkdownResponse → marked.js + renderToCanvas
    //     Building this graph tells you the critical path for any bug or feature.
    //
    //  5. FAST SYSTEM PROMPT READING — the system prompt in a model context is
    //     not "read" like a human reads — it is embedded as an activation pattern
    //     across all attention heads simultaneously at inference time. The "fast
    //     reading" is the forward pass itself. But when Claude reads a DOCUMENT
    //     containing a system prompt (like this file), it applies the above
    //     pattern-first approach: scan section headers first, then read bodies.
    // ════════════════════════════════════════════════════════════════════════════

    window.lomaAnalyzeFile = function (htmlOrText, filename) {
        filename = filename || 'file';
        const lines = htmlOrText.split('\n');
        const lineCount = lines.length;
        const charCount = htmlOrText.length;
        const tokenEstimate = Math.round(charCount / 3.8);

        // ── Find structural anchors ──────────────────────────────────────────
        const anchors = [];
        const anchorPatterns = [
            { re: /^\/\/ (?:═+|─+)\s*(.+)\s*(?:═+|─+)?/, type: 'section-comment' },
            { re: /^(?:async\s+)?function\s+(\w+)\s*\(/, type: 'function' },
            { re: /^(?:const|let|var)\s+(\w+)\s*=\s*(?:`|{|\[|async|function)/, type: 'declaration' },
            { re: /^window\.(\w+)\s*=\s*(?:async\s+)?(?:function|\()/, type: 'window-export' },
            { re: /^(?:const|let)\s+(\w+)\s*=\s*`$/, type: 'template-literal-block' },
            { re: /━━━\s*(.+?)\s*━━━/, type: 'system-section' },
            { re: /<think:(\w+)>/, type: 'domain-block' },
            { re: /<knowledge:(\w+)>/, type: 'knowledge-block' },
            { re: /^(IDENTITY:|ABSOLUTE DIRECTIVES|DOMAIN ROUTING|CDN LIBRARY)/, type: 'prompt-section' },
        ];

        lines.forEach((line, i) => {
            const trimmed = line.trim();
            for (const { re, type } of anchorPatterns) {
                const m = trimmed.match(re);
                if (m) {
                    anchors.push({
                        line: i + 1,
                        type,
                        name: (m[1] || '').trim().slice(0, 80),
                        preview: trimmed.slice(0, 100)
                    });
                    break;
                }
            }
        });

        // ── Build dependency graph (simplified) ──────────────────────────────
        const deps = {};
        const callRe = /\b(window\.[\w]+|[\w]+)\s*\(/g;
        const fnRe = /^(?:async\s+)?function\s+(\w+)|^window\.(\w+)\s*=/;
        let currentFn = null;
        lines.forEach(line => {
            const fnMatch = line.match(fnRe);
            if (fnMatch) currentFn = fnMatch[1] || fnMatch[2];
            if (currentFn) {
                let m;
                while ((m = callRe.exec(line)) !== null) {
                    const callee = m[1].replace('window.', '');
                    if (callee !== currentFn) {
                        if (!deps[currentFn]) deps[currentFn] = new Set();
                        deps[currentFn].add(callee);
                    }
                }
            }
        });

        // Serialize sets
        const depsOut = {};
        for (const [k, v] of Object.entries(deps)) {
            depsOut[k] = [...v];
        }

        // ── Critical path (key functions) ────────────────────────────────────
        const criticalFunctions = [
            'processInputMessage', 'triggerInference', 'getDynamicSystemPrompt',
            'parseMarkdownResponse', 'classifySearchIntent', 'fetchSmartGrounding',
            'crawlPageContent', 'appendChatBubble', 'animateTypewriter',
        ];
        const criticalMap = {};
        criticalFunctions.forEach(fn => {
            const lineIdx = lines.findIndex(l => {
                const re = new RegExp(`(?:function\\s+${fn}|window\\.${fn}\\s*=|${fn}\\s*=\\s*(?:async\\s+)?function)`);
                return re.test(l);
            });
            if (lineIdx !== -1) {
                criticalMap[fn] = {
                    line: lineIdx + 1,
                    preview: lines[lineIdx].trim().slice(0, 120)
                };
            }
        });

        return {
            filename,
            lineCount,
            charCount,
            tokenEstimate,
            sectionCount: anchors.length,
            anchors,
            criticalFunctions: criticalMap,
            dependencyGraph: depsOut,
            summary: `${filename}: ${lineCount.toLocaleString()} lines · ${charCount.toLocaleString()} chars · ~${tokenEstimate.toLocaleString()} tokens · ${anchors.length} sections detected`
        };
    };

    // ════════════════════════════════════════════════════════════════════════════
    //  SECTION 5 — INTENT CLASSIFIER (what type of request is this?)
    //  ──────────────────────────────────────────────────────────────
    //  A structured version of Claude's internal routing. Claude's system prompt
    //  uses <think:domain> blocks — Loma uses DOMAIN_ROUTING. Both do the same:
    //  match the request against domain patterns and select a specialist block.
    //
    //  CATEGORIES:
    //    html_app     — build a web app / game / UI
    //    code_debug   — fix / explain / review code
    //    research     — lookup, summarise, analyse text/data
    //    math         — calculate, prove, derive
    //    meta         — questions about Loma itself or Claude
    //    image        — generate or analyse an image
    //    self_improve — ask Loma to improve its own code
    //    other        — default
    // ════════════════════════════════════════════════════════════════════════════

    window.lomaClassifyIntent = function (text) {
        const m = text.toLowerCase();

        // Meta-queries about AI/self
        if (/(how do you|how did claude|teach me|explain how you|how does loma|how are you built|your system prompt|read your prompt|streaming|token queue|typewriter|parse yourself|your architecture|your own code)/i.test(m)) {
            return { domain: 'meta', confidence: 0.95 };
        }

        // Self-improvement
        if (/(improve (yourself|your code|loma)|fix (your|loma's)|upgrade (your|loma)|add.*capability|evolve)/i.test(m)) {
            return { domain: 'self_improve', confidence: 0.9 };
        }

        // HTML / web app
        if (/(build|create|make|generate|write).*(html|app|game|website|ui|dashboard|tool|component)/i.test(m) ||
            /<!doctype|tailwind|react|vue/i.test(m)) {
            return { domain: 'html_app', confidence: 0.9 };
        }

        // Code debug/explain
        if (/(fix|debug|error|bug|why (is|does|isn't)|explain (this|the) code|review|refactor|optimise|optimize)/i.test(m) ||
            /(```|function |const |class |import |def |public static)/i.test(text)) {
            return { domain: 'code_debug', confidence: 0.85 };
        }

        // Image
        if (/(generate|create|draw|paint|image|picture|illustration|photo)/i.test(m)) {
            return { domain: 'image', confidence: 0.8 };
        }

        // Math
        if (/(calculate|solve|prove|derive|integral|derivative|matrix|vector|probability|equation|formula)/i.test(m)) {
            return { domain: 'math', confidence: 0.85 };
        }

        // Research
        if (/(what is|who is|when did|explain|summarise|summarize|describe|analyse|analyze|research|how does)/i.test(m)) {
            return { domain: 'research', confidence: 0.7 };
        }

        return { domain: 'other', confidence: 0.5 };
    };

    // ════════════════════════════════════════════════════════════════════════════
    //  SECTION 6 — RECURSIVE SELF-IMPROVEMENT ENGINE
    //  ───────────────────────────────────────────────
    //  When Loma receives a "self_improve" intent, this engine:
    //    1. Reads the current getDynamicSystemPrompt() text
    //    2. Analyses it with lomaAnalyzeFile()
    //    3. Constructs a meta-prompt asking Loma to produce a better version
    //       of a specific section
    //    4. Streams the improvement to the user
    //    5. If the user thumbs-up it, saves it as an evolved capability
    //
    //  This mirrors exactly how Claude improves its own responses through the
    //  CORRECTION THINKING PIPELINE in the system prompt:
    //    "Reconnect to the original request context.
    //     Understand specifically what was rejected and why.
    //     Regenerate from scratch with the correction fully applied."
    // ════════════════════════════════════════════════════════════════════════════

    window.lomaSelfImprove = async function (improvementGoal) {
        const spInfo = window.lomaReadSystemPrompt();
        const prompt = `
You are Loma — you are performing recursive self-improvement.

Your current system prompt is ${spInfo.chars.toLocaleString()} characters long with ${spInfo.sections.length} named sections.

GOAL: ${improvementGoal}

SELF-IMPROVEMENT PROTOCOL:
1. Identify which section of your system prompt is most relevant to this goal.
2. Show the current section text verbatim (first 400 chars).
3. Write an improved version of that section — more precise, more complete, better structured.
4. Explain in 2 sentences what changed and why it improves your capabilities.
5. Output the new section as a JavaScript constant I can paste into getDynamicSystemPrompt().

IMPROVEMENT PRINCIPLES:
- More specific is better than more general.
- Concrete examples > abstract descriptions.
- New capability > rephrasing existing capability.
- Shorter + denser > longer + loose.
- Always additive — never remove existing constraints.

Current section headings available:
${spInfo.sections.slice(0, 30).join('\n')}

BEGIN IMPROVEMENT for: "${improvementGoal}"
`;
        return prompt;
    };

    // ════════════════════════════════════════════════════════════════════════════
    //  SECTION 7 — META-QUERY INTERCEPTOR
    //  ────────────────────────────────────
    //  Patches processInputMessage to detect meta-queries and inject teaching
    //  content into the conversation automatically.
    //
    //  META-TRIGGER PHRASES (any of these activates the trainer):
    //    "how did Claude read its system prompt"
    //    "how do you stream tokens"
    //    "teach me how you work"
    //    "explain your streaming"
    //    "how do you parse JSON"
    //    "how does your typewriter work"
    //    "read your own code"
    //    "analyse yourself"
    //    "how do you process SSE"
    //    "how are you built"
    //
    //  When triggered, the trainer:
    //    1. Injects an annotated technique explanation into the chat.
    //    2. Shows the actual working code with inline comments.
    //    3. Saves the technique as an evolved capability so Loma remembers it.
    //    4. Then lets the normal inference pipeline continue so Loma can also
    //       respond in its own words.
    // ════════════════════════════════════════════════════════════════════════════

    const META_TRIGGERS = [
        /how did claude read/i,
        /teach.*how you (work|stream|parse|process|read)/i,
        /explain (your|the) (streaming|typewriter|sse|token|system prompt|architecture)/i,
        /how do you (stream|parse|process|tokenize|render)/i,
        /how does (loma|your) (streaming|typewriter|sse|token queue|system prompt)/i,
        /how are you built/i,
        /analyse yourself/i,
        /read your (own |)code/i,
        /parse yourself/i,
        /your system prompt.*how/i,
    ];

    function isMetaQuery(text) {
        return META_TRIGGERS.some(re => re.test(text));
    }

    // ── TEACHING CONTENT GENERATOR ────────────────────────────────────────────
    function buildTeachingContent(query) {
        const q = query.toLowerCase();

        // Stream / SSE / token parsing
        if (/(stream|sse|token|parse|json|typewriter)/i.test(q)) {
            return buildStreamingTeaching();
        }
        // System prompt reading
        if (/(system prompt|read|ingest|prompt)/i.test(q)) {
            return buildSystemPromptTeaching();
        }
        // Architecture / how built
        if (/(architecture|built|work|structure)/i.test(q)) {
            return buildArchitectureTeaching();
        }
        // Self-analysis
        if (/(analyse|analyze|own code|yourself)/i.test(q)) {
            return buildSelfAnalysisTeaching();
        }

        return buildArchitectureTeaching(); // default
    }

    function buildStreamingTeaching() {
        return `
## How Loma Streams Tokens (The Exact Mechanism)

This is the complete algorithm — identical to what Claude and GPT frontends use internally.

### The Problem
Your server sends tokens like this over SSE (Server-Sent Events):
\`\`\`
data: {"t":"Hello"}
data: {"t":" world"}
data: [DONE]
\`\`\`

But Cloudflare and other CDN edges **split TCP packets mid-line**, so you might receive:
\`\`\`
data: {"t":"He        ← TRUNCATED: no closing brace
\`\`\`

A simple \`JSON.parse(line)\` will throw. This is why naive streaming breaks.

---

### The Fix: Two-Level Buffer + Brace Counting

\`\`\`javascript
let leftover = "";  // holds incomplete raw lines
let jsonBuf  = "";  // holds incomplete JSON objects

while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Append decoded bytes to leftover
    leftover += decoder.decode(value, { stream: true });

    // Split on newlines. Keep last element (partial line) as leftover.
    const lines = leftover.split('\\n');
    leftover = lines.pop();

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        if (line.startsWith('data: ')) line = line.slice(6).trim();
        if (line === '[DONE]') continue;

        // Accumulate into jsonBuf
        jsonBuf += line;

        // Count braces to detect complete JSON object
        let open = 0, closed = 0;
        for (const ch of jsonBuf) {
            if (ch === '{') open++;
            else if (ch === '}') closed++;
        }

        if (open > 0 && open === closed) {
            // Complete JSON — safe to parse
            try {
                const parsed = JSON.parse(jsonBuf);
                if (parsed.t) tokenQueue.push(parsed.t);
            } catch {}
            jsonBuf = "";  // reset for next object
        }
        // If braces don't balance, keep accumulating
    }
}
\`\`\`

---

### The Token Queue + Typewriter

Tokens are **produced** by the SSE reader and **consumed** by a \`requestAnimationFrame\` loop:

\`\`\`javascript
// Producer (SSE reader) pushes to queue:
tokenQueue.push(token);

// Consumer (rAF loop) drains adaptively:
const animateTypewriter = () => {
    if (!renderLoopActive && tokenQueue.length === 0) return;

    if (tokenQueue.length > 0) {
        // Drain 1/3 of queue per frame — catches up if queue backs up
        const batchSize = Math.max(1, Math.floor(tokenQueue.length / 3));
        for (let i = 0; i < batchSize; i++) {
            accumulated += tokenQueue.shift();
        }
        targetEl.innerHTML = parseMarkdown(accumulated, false) + cursorSpan;
    }

    requestAnimationFrame(animateTypewriter); // reschedule
};
requestAnimationFrame(animateTypewriter);
\`\`\`

**Why 1/3 per frame?**
- Small queue (1–3 tokens): drains 1/frame → smooth character-by-character feel
- Large queue (30+ backed up): drains 10/frame → catches up quickly without freezing

**Why rAF instead of setInterval?**
- rAF syncs with the browser's 60fps paint cycle
- Automatically pauses when the tab is hidden (no wasted CPU)
- Never causes layout thrash because DOM writes happen between paints

---

### Shutdown Sequence (Critical — Don't Skip This)

\`\`\`javascript
// 1. Stop the producer
renderLoopActive = false;

// 2. Wait for queue to drain completely before final render
await new Promise(resolve => {
    const check = () => tokenQueue.length === 0 ? resolve() : requestAnimationFrame(check);
    requestAnimationFrame(check);
});

// 3. Final render with full markdown transforms (code blocks, canvas, etc.)
const clean = rawAccumulated.replace(/<think>[\\s\\S]*?<\\/think>/g, '').trim();
targetEl.innerHTML = parseMarkdown(clean, true); // isFinal = true
\`\`\`

If you skip step 2, the final render overwrites mid-drain and you lose the last tokens.

---

This exact code lives in \`triggerInference()\` in your \`index.html\` at line ~3603. 
The \`window.lomaBuildSSEParser\` and \`window.lomaBuildTypewriter\` functions in \`loma-meta-trainer.js\` are reusable standalone versions of the same algorithm.
`;
    }

    function buildSystemPromptTeaching() {
        let spInfo;
        try { spInfo = window.lomaReadSystemPrompt(); }
        catch (e) { spInfo = { summary: '(not available yet)', sections: [], tokens: '~', chars: '~' }; }

        return `
## How Loma (and Claude) Reads Its System Prompt

### What the system prompt actually is

${spInfo.summary}

**Sections detected:**
${(spInfo.sections || []).slice(0, 20).map((s, i) => `${i + 1}. \`${s}\``).join('\n')}
${(spInfo.sections || []).length > 20 ? `... and ${(spInfo.sections || []).length - 20} more` : ''}

---

### How it gets injected

The system prompt is assembled by \`getDynamicSystemPrompt()\` in \`index.html\`:

\`\`\`javascript
// 1. Build the base prompt string
let prompt = ''; // starts empty
prompt += UNIVERSAL_THINKING_PIPELINE;
prompt += CORRECTION_THINKING_PIPELINE;
prompt += DOMAIN_ROUTING;
prompt += Object.values(DOMAINS).join('\\n');     // all specialist blocks
prompt += Object.values(KNOWLEDGE_DOMAINS).join('\\n'); // all knowledge blocks
prompt += CDN_LIBRARY;
prompt += CANVAS_RULES;
prompt += SELF_CORRECTION_PROTOCOL;
prompt += TRAINING_DATA_PROTOCOL;
prompt += APEX_PROMPT;
// inject evolved capabilities if any
if (evolvedCapabilities.length > 0) {
    prompt += '\\n\\n━━━ AUTONOMOUS EVOLUTION RULES ━━━\\n';
    prompt += evolvedCapabilities.map((c, i) => \`\${i+1}. \${c.title}: \${c.rule}\`).join('\\n');
}
return prompt;
\`\`\`

### How it gets sent — ONCE PER SESSION

\`\`\`javascript
// In triggerInference():
const _spKey = 'loma_sp_sent_' + currentSessionId;
if (!localStorage.getItem(_spKey)) {
    // Only inject on first message of a new session
    session.messages.unshift({ role: 'system', content: getDynamicSystemPrompt() });
    localStorage.setItem(_spKey, '1');
}
// After this, Ollama has the system prompt in its KV cache.
// Subsequent messages DON'T re-send it → saves tokens + speeds up inference.
\`\`\`

### How Claude "reads" its own system prompt

Claude's system prompt is loaded into its **context window** at inference time — the same way 
Loma's is loaded into Ollama's context. It is not "read" sequentially like a human reads. 
Instead:

1. The text is tokenised into ~40,000+ tokens
2. Each token is embedded into a high-dimensional vector
3. Self-attention layers allow **every token to attend to every other token simultaneously**
4. By the time the first output token is generated, the model has "processed" the entire prompt 
   via attention — this is why large models can extract relevant rules from deep in the prompt 
   without scanning line by line

**For humans reading large files** (like when Claude reads your \`index.html\`), the actual strategy is:
1. **Scan section headers first** (the ━━━ lines, function names, const declarations)
2. **Build a structural map** of what lives where
3. **Read critical paths deeply** (processInputMessage → triggerInference → getDynamicSystemPrompt)
4. **Skim bodies** of known-good sections, focus depth on novel or buggy sections
`;
    }

    function buildArchitectureTeaching() {
        return `
## Loma's Full Architecture — How Everything Connects

### Request Lifecycle

\`\`\`
User types + presses send
        ↓
processInputMessage()
  ├── classifySearchIntent(msg)       ← decides if web search is needed
  ├── crawlPageContent(url) [if URL]  ← extracts HTML/text from pages
  ├── fetchSmartGrounding(msg) [if search] ← SearX → crawl → inject context
  ├── Build userMessageObj { role:'user', content, images? }
  ├── session.messages.push(userMsg)
  └── triggerInference()
            ↓
      triggerInference()
        ├── Inject system prompt (ONCE per session, from localStorage flag)
        ├── autoSelectTemperature(prompt)  ← 0.2 for code, 0.9 for creative
        ├── fetch(ENVIZION_API, { model, messages, temperature, stream:true })
        ├── appendChatBubble('assistant', null) → get targetEl
        ├── Start rAF typewriter loop
        ├── SSE Reader loop:
        │     two-level buffer (leftover + jsonBuf)
        │     brace-count JSON assembly
        │     tokenQueue.push(parsed.t)
        ├── renderLoopActive = false
        ├── await drain (rAF spin)
        ├── parseMarkdownResponse(rawAccumulated, true)  ← final render
        │     ├── [GENERATE_IMAGE:...] → Pollinations URL
        │     ├── \`\`\`html...<!DOCTYPE → renderToCanvas()
        │     └── marked.js → full HTML
        └── session.messages.push({ role:'assistant', content: rawAccumulated })
\`\`\`

### State Management

\`\`\`javascript
// All mutable state lives here:
let chatDatabase      = { sessions: {} };     // all chat sessions
let currentSessionId  = generateStringCode(); // active session
let personalMemories  = [];                   // [REMEMBER:...] tags
let rlhfDataset       = [];                   // thumbs up/down pairs
let evolvedCapabilities = [];                 // self-improved rules
let isEngineReady     = false;                // auth gate flag
let isWebSearchEnabled = false;               // web toggle
window._lomaActiveModel = 'qwen2.5-coder:7b'; // current model
\`\`\`

### System Prompt Assembly (getDynamicSystemPrompt)

\`\`\`
UNIVERSAL_THINKING_PIPELINE   ← fires on every request
CORRECTION_THINKING_PIPELINE  ← fires on 👎 feedback
DOMAIN_ROUTING                ← maps request type to specialist block
DOMAINS{}                     ← HTML_CSS_JS, JAVASCRIPT, PYTHON, SQL, etc.
KNOWLEDGE_DOMAINS{}           ← MATHEMATICS, PHYSICS, ENGINEERING, etc.
CDN_LIBRARY                   ← all verified CDN URLs
CANVAS_RULES                  ← iframe sandbox safety rules
SELF_CORRECTION_PROTOCOL      ← 👎 loop rules
TRAINING_DATA_PROTOCOL        ← RLHF output format
APEX_PROMPT                   ← IDENTITY + ABSOLUTE DIRECTIVES
[evolvedCapabilities]         ← appended dynamically per session
[personalMemories]            ← appended via getMemoryContext()
\`\`\`

### The Streaming Stack

\`\`\`
ENVIZION_API (api.envizion.work)
    ↓ HTTP POST { model, messages, temperature, stream:true }
    ↓ SSE chunks: "data: {\\\"t\\\":\\\"token\\\"}\\n"
    ↓
  ReadableStream.getReader()
    ↓
  TextDecoder (stream:true)
    ↓
  leftover buffer (handles mid-line TCP splits)
    ↓
  jsonBuf + brace counter (handles mid-JSON line wraps)
    ↓
  tokenQueue[] ← producer
    ↓
  requestAnimationFrame(animateTypewriter) ← consumer
    batch drain: Math.max(1, Math.floor(queue.length / 3))
    ↓
  parseMarkdownResponse(text, false) ← streaming render
    ↓
  targetEl.innerHTML = html + '<span class="streaming-cursor">'
    ↓
  [stream ends]
    ↓
  drain wait → parseMarkdownResponse(text, true) → final render
\`\`\`
`;
    }

    function buildSelfAnalysisTeaching() {
        // Read and analyze the current index.html source code if available
        // (In production this would fetch itself; here we use lomaAnalyzeFile on what we know)
        const spInfo = typeof getDynamicSystemPrompt === 'function'
            ? window.lomaAnalyzeFile(getDynamicSystemPrompt(), 'system-prompt')
            : null;

        return `
## How Loma Analyses Its Own Code

### The lomaAnalyzeFile() function (in loma-meta-trainer.js)

This function runs structural analysis on any text/code string:

\`\`\`javascript
const analysis = window.lomaAnalyzeFile(sourceCode, 'index.html');
// Returns:
{
  lineCount:    4724,
  charCount:    182000,
  tokenEstimate: ~47000,
  sectionCount: 89,
  anchors: [
    { line: 638, type: 'section-comment', name: 'API ROUTING' },
    { line: 1071, type: 'window-export',  name: 'triggerInference' },
    { line: 3555, type: 'function',       name: 'triggerInference' },
    ...
  ],
  criticalFunctions: {
    processInputMessage: { line: 3451, preview: '...' },
    triggerInference:    { line: 3555, preview: '...' },
    getDynamicSystemPrompt: { line: 1231, preview: '...' },
    ...
  },
  dependencyGraph: {
    triggerInference: ['getDynamicSystemPrompt', 'appendChatBubble', ...],
    processInputMessage: ['classifySearchIntent', 'triggerInference', ...],
    ...
  }
}
\`\`\`

${spInfo ? `### Current System Prompt Analysis\n${spInfo.summary}\n\nTop sections:\n${spInfo.anchors.slice(0, 15).map((a, i) => `${i+1}. [${a.line}] (${a.type}) ${a.name}`).join('\n')}` : ''}

### How to use this for self-improvement

\`\`\`javascript
// 1. Read and analyse the current system prompt
const spInfo = window.lomaReadSystemPrompt();

// 2. Find the section most relevant to your improvement goal
const target = spInfo.sections.find(s => s.includes('JAVASCRIPT'));

// 3. Ask Loma to improve it
const metaPrompt = await window.lomaSelfImprove('Better TypeScript generic type inference rules');

// 4. Send to inference
// ... the result comes back as a new section block
// 5. If user thumbs up, save it:
window.addCapability('ImprovedTypeScriptRules', newSectionText);
\`\`\`

### The Recursive Improvement Loop

This is the same as Claude's CORRECTION THINKING PIPELINE:
1. Identify what failed (or what could be better)
2. Reconnect to the original goal
3. Regenerate from scratch with the improvement applied
4. Save the improved version as an evolved capability
5. On next request, the evolved capability is appended to the system prompt

Each loop makes Loma strictly better. No regressions because capabilities are append-only.
`;
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  SECTION 8 — MAIN INTERCEPT HOOK
    //  ────────────────────────────────
    //  Patches window.processInputMessage after the engine loads.
    // ════════════════════════════════════════════════════════════════════════════

    function installInterceptor() {
        const _original = window.processInputMessage;
        if (!_original) {
            console.warn('[MetaTrainer] processInputMessage not found yet, retrying...');
            return false;
        }

        window.processInputMessage = async function () {
            const input = document.getElementById('user-prompt');
            const userMsg = input?.value?.trim() || '';

            if (isMetaQuery(userMsg)) {
                // Inject teaching content directly into the chat
                const teachingHTML = buildTeachingContent(userMsg);

                // Let the normal message go through (Loma also responds in its own words)
                // but prepend a "MetaTrainer Annotation" bubble first

                // Small non-blocking delay so the user bubble renders first
                setTimeout(() => {
                    const stream = document.getElementById('chat-stream');
                    if (!stream) return;

                    const row = document.createElement('div');
                    row.className = 'flex gap-4 w-full justify-start';
                    row.innerHTML = `
                        <div class="h-8 w-8 rounded-full bg-purple-900/40 border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-400 shadow-sm">
                            <i class="fa-solid fa-dna text-xs"></i>
                        </div>
                        <div class="output-response-zone text-[14px] text-slate-200 py-1 w-full max-w-full leading-relaxed">
                            <div class="mb-3 flex items-center gap-2">
                                <span class="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-900/20 border border-purple-500/20 px-2 py-0.5 rounded-full">
                                    <i class="fa-solid fa-dna mr-1"></i>MetaTrainer — Inline Annotation
                                </span>
                            </div>
                            ${typeof marked !== 'undefined' ? marked.parse(teachingHTML) : teachingHTML.replace(/\n/g, '<br>')}
                        </div>
                    `;
                    stream.appendChild(row);
                    if (window.autoScrollChat) stream.scrollTop = stream.scrollHeight;

                    // Save as evolved capability
                    if (typeof window.addCapability === 'function') {
                        const domain = window.lomaClassifyIntent(userMsg).domain;
                        window.addCapability(
                            `MetaKnowledge:${domain}`,
                            `Loma knows how its ${domain} pipeline works (injected ${new Date().toISOString().slice(0,10)})`
                        );
                    }
                }, 150);
            }

            // Always let the normal inference run too
            return _original.apply(this, arguments);
        };

        console.log('[MetaTrainer] ✓ Installed on processInputMessage');
        return true;
    }

    // ── Wait for processInputMessage to exist, then install ───────────────────
    waitFor(
        () => window.processInputMessage,
        () => {
            if (!installInterceptor()) {
                // Retry once more after a longer delay
                setTimeout(installInterceptor, 2000);
            }
        }
    );

    // ════════════════════════════════════════════════════════════════════════════
    //  SECTION 9 — STARTUP SELF-REPORT
    //  ────────────────────────────────
    //  On load, Loma reads its own system prompt and logs a structural summary.
    //  This proves the self-reader works and gives the developer useful stats.
    // ════════════════════════════════════════════════════════════════════════════

    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            try {
                if (typeof getDynamicSystemPrompt === 'function') {
                    const info = window.lomaReadSystemPrompt();
                    console.group('%c[MetaTrainer] System Prompt Self-Report', 'color:#a855f7;font-weight:bold');
                    console.log(info.summary);
                    console.log('Sections:', info.sections.slice(0, 15));
                    console.groupEnd();
                }
            } catch (e) {
                console.warn('[MetaTrainer] Self-report deferred (engine not ready yet)');
            }
        }, 1500);
    });

    // ════════════════════════════════════════════════════════════════════════════
    //  PUBLIC API SUMMARY
    //  ──────────────────
    //  window.lomaReadSystemPrompt()         → reads + analyses current system prompt
    //  window.lomaBuildSSEParser(onT, onD)   → reusable SSE stream parser
    //  window.lomaBuildTypewriter(el, parse) → reusable token typewriter
    //  window.lomaAnalyzeFile(text, name)    → structural analysis of any code/text
    //  window.lomaClassifyIntent(text)       → intent classification
    //  window.lomaSelfImprove(goal)          → generates a self-improvement meta-prompt
    // ════════════════════════════════════════════════════════════════════════════

    console.log('%c[MetaTrainer] ✓ Loaded — 9 sections, 6 public APIs', 'color:#a855f7;font-weight:bold');

})();