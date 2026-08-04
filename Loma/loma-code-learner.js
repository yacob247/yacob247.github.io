(function() {
'use strict';

const STORAGE_KEY   = 'loma_code_learner_pairs';
const PATTERN_KEY   = 'loma_discovered_patterns';
const MAX_PAIRS     = 500;
const SCORE_THRESH  = 0.65;

// ── Pattern library — grows as new patterns are discovered ───────────────────
const KNOWN_PATTERNS = {
    'css-custom-properties':   { re: /--[\w-]+\s*:\s*[^;]+;/g,          bonus: 0.1 },
    'css-grid':                { re: /display\s*:\s*grid/gi,             bonus: 0.1 },
    'css-flexbox':             { re: /display\s*:\s*flex/gi,             bonus: 0.08 },
    'js-async-await':          { re: /async\s+\w+|await\s+/g,           bonus: 0.12 },
    'js-fetch':                { re: /fetch\s*\(/g,                      bonus: 0.08 },
    'js-arrow-fn':             { re: /=>\s*\{|=>\s*\w/g,                bonus: 0.06 },
    'js-destructuring':        { re: /const\s*\{|let\s*\{|const\s*\[/g, bonus: 0.07 },
    'js-template-literals':    { re: /`[^`]*\$\{[^}]+\}/g,              bonus: 0.06 },
    'html-semantic':           { re: /<(article|section|nav|aside|header|footer|main)/gi, bonus: 0.1 },
    'html-aria':               { re: /aria-\w+=/gi,                     bonus: 0.12 },
    'py-type-hints':           { re: /:\s*(int|str|float|bool|list|dict|Optional)\b/g, bonus: 0.1 },
    'py-dataclass':            { re: /@dataclass/g,                     bonus: 0.1 },
    'ts-generics':             { re: /<T(?:,\s*\w+)*>/g,                bonus: 0.12 },
    'intersection-observer':   { re: /IntersectionObserver/g,           bonus: 0.15 },
    'web-worker':              { re: /new Worker\(|Worker\.postMessage/g, bonus: 0.15 },
    'web-animation-api':       { re: /\.animate\(|animation.*Web Animation/g, bonus: 0.1 },
    'service-worker':          { re: /serviceWorker\.register|self\.addEventListener.*install/g, bonus: 0.15 },
    'css-container-queries':   { re: /@container\s/g,                   bonus: 0.18 },
    'css-layers':              { re: /@layer\s/g,                       bonus: 0.15 },
    'css-has-selector':        { re: /:has\s*\(/g,                      bonus: 0.12 },
};

// ── Anti-patterns (penalize) ──────────────────────────────────────────────────
const ANTI_PATTERNS = {
    'var-usage':     { re: /\bvar\s+/g,                        penalty: 0.08 },
    'inline-style':  { re: /style\s*=\s*"/g,                   penalty: 0.06 },
    'document-write':{ re: /document\.write\s*\(/g,            penalty: 0.15 },
    'eval-usage':    { re: /\beval\s*\(/g,                     penalty: 0.20 },
    'no-error-handling': { re: /fetch\s*\([^)]+\)\s*\.then\s*\([^)]+\)\s*(?!\.catch)/g, penalty: 0.08 },
};

// ── Load stored data ──────────────────────────────────────────────────────────
function loadPairs() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
}

function savePairs(pairs) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pairs.slice(-MAX_PAIRS)));
    } catch { /* storage full */ }
}

function loadPatterns() {
    try {
        return JSON.parse(localStorage.getItem(PATTERN_KEY) || '{}');
    } catch { return {}; }
}

function savePatterns(patterns) {
    try {
        localStorage.setItem(PATTERN_KEY, JSON.stringify(patterns));
    } catch { }
}

// ── Code scorer ───────────────────────────────────────────────────────────────
function scoreCode(code, lang) {
    let score = 0.5;
    const lower = code.toLowerCase();

    // Length bonus (more detailed = better, up to a point)
    const lenBonus = Math.min(0.15, code.length / 2000);
    score += lenBonus;

    // Pattern bonuses
    for (const [name, p] of Object.entries(KNOWN_PATTERNS)) {
        const matches = code.match(p.re);
        if (matches && matches.length > 0) {
            score += p.bonus * Math.min(matches.length, 3);
        }
    }

    // Anti-pattern penalties
    for (const [name, p] of Object.entries(ANTI_PATTERNS)) {
        const matches = code.match(p.re);
        if (matches) score -= p.penalty * matches.length;
    }

    // Comment quality
    const commentLines = (code.match(/\/\/.+|\/\*[\s\S]*?\*\//g) || []).length;
    if (commentLines > 0) score += Math.min(0.1, commentLines * 0.02);

    // Documentation
    if (code.includes('@param') || code.includes('@returns')) score += 0.08;
    if (code.includes('"""') || code.includes("'''"))         score += 0.06;

    return Math.min(Math.max(score, 0), 1.0);
}

// ── Discover new patterns not in the known library ────────────────────────────
function discoverNewPatterns(code, lang) {
    const discovered = loadPatterns();
    const newFindings = [];

    // Look for modern browser APIs
    const browserApis = code.match(/\b(ResizeObserver|MutationObserver|PerformanceObserver|ReportingObserver|AbortController|ReadableStream|WritableStream|TransformStream|CompressionStream|crypto\.subtle|navigator\.\w+)\b/g);
    if (browserApis) {
        for (const api of browserApis) {
            const key = 'api-' + api.toLowerCase().replace(/[^a-z]/g, '-');
            if (!discovered[key] && !KNOWN_PATTERNS[key]) {
                discovered[key] = { discovered: Date.now(), lang, example: api, count: 1 };
                newFindings.push({ api, key });
            } else if (discovered[key]) {
                discovered[key].count = (discovered[key].count || 0) + 1;
            }
        }
    }

    // Look for CSS custom functions
    const cssFunctions = code.match(/\b(min|max|clamp|calc|env|var|conic-gradient|color-mix|color-contrast|oklch|lch|lab|oklab)\s*\(/g);
    if (cssFunctions) {
        for (const fn of cssFunctions) {
            const key = 'css-fn-' + fn.replace(/[^a-z-]/g, '');
            if (!discovered[key] && !KNOWN_PATTERNS[key]) {
                discovered[key] = { discovered: Date.now(), lang, example: fn, count: 1 };
                newFindings.push({ api: fn, key });
            }
        }
    }

    savePatterns(discovered);
    return newFindings;
}

// ── Generate improvement suggestion from code ─────────────────────────────────
function generateImprovementSuggestion(code, lang, score) {
    const suggestions = [];

    if (code.match(/\bvar\s+/g))
        suggestions.push("Replace `var` with `const`/`let` for block-scoped, predictable variable declarations.");

    if (code.includes('fetch(') && !code.includes('.catch') && !code.includes('try'))
        suggestions.push("Add `.catch()` or try/catch around fetch() calls to handle network errors gracefully.");

    if (code.includes('document.querySelector') && !code.includes('?.'))
        suggestions.push("Use optional chaining (`?.`) when accessing DOM elements to prevent null reference errors.");

    if (lang === 'css' && !code.includes('--') && code.length > 200)
        suggestions.push("Extract repeated values into CSS custom properties (`--color-primary`, `--spacing-lg`) for maintainability.");

    if (lang === 'python' && !code.match(/:\s*(int|str|float|bool)\b/))
        suggestions.push("Add Python type hints to function signatures for better IDE support and documentation.");

    if (lang === 'javascript' && code.includes('function ') && !code.includes('async'))
        suggestions.push("Consider converting I/O-bound functions to `async/await` for non-blocking execution.");

    if (code.split('\n').length > 50 && !code.includes('//'))
        suggestions.push("Add inline comments explaining the 'why' behind non-obvious logic sections.");

    return suggestions;
}

// ── Core learning function — called from index.html ───────────────────────────
window.lomaLearnFromCode = function(code, lang) {
    if (!code || code.length < 50) return;

    const score     = scoreCode(code, lang);
    const newPats   = discoverNewPatterns(code, lang);
    const improvements = generateImprovementSuggestion(code, lang, score);

    // Only save high-quality code as training data
    if (score >= SCORE_THRESH) {
        const pairs = loadPairs();
        const prompt = `Write clean, production-ready ${lang.toUpperCase()} code using modern best practices.`;
        const chosen = `Here is an optimized ${lang.toUpperCase()} implementation:\n\n\`\`\`${lang}\n${code}\n\`\`\``;
        const rejected = `Here is a basic ${lang} implementation without modern patterns.`;

        pairs.push({
            prompt,
            chosen,
            rejected,
            score,
            domain: 'code',
            lang,
            source: 'loma_chat_learned',
            timestamp: Date.now(),
        });
        savePairs(pairs);
    }

    // Report new patterns discovered to the UI
    if (newPats.length > 0) {
        newPats.forEach(({ api, key }) => {
            console.log(`[LOMA Learner] Discovered new pattern: ${api} (${key})`);
        });
    }

    // Log to console for transparency
    console.log(`[LOMA Learner] Code analyzed: ${lang}, score: ${score.toFixed(2)}, patterns: ${Object.keys(KNOWN_PATTERNS).filter(k => code.match(KNOWN_PATTERNS[k].re)).join(', ')}`);

    return { score, improvements, newPatterns: newPats };
};

// ── Export learned pairs for training ─────────────────────────────────────────
window.lomaExportLearnedPairs = function() {
    const pairs = loadPairs();
    if (pairs.length === 0) {
        alert('No code has been learned yet. Chat with the model to generate code first.');
        return;
    }
    const blob = new Blob([JSON.stringify(pairs, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `loma_code_learned_${Date.now()}.json`;
    a.click();
    console.log(`[LOMA Learner] Exported ${pairs.length} learned pairs`);
};

// ── Get stats ─────────────────────────────────────────────────────────────────
window.lomaLearnerStats = function() {
    const pairs    = loadPairs();
    const patterns = loadPatterns();
    const byLang   = {};
    let totalScore = 0;

    pairs.forEach(p => {
        byLang[p.lang] = (byLang[p.lang] || 0) + 1;
        totalScore += p.score || 0.5;
    });

    return {
        totalPairs:       pairs.length,
        avgScore:         pairs.length > 0 ? totalScore / pairs.length : 0,
        byLanguage:       byLang,
        discoveredPatterns: Object.keys(patterns).length,
        topPatterns:      Object.entries(patterns).sort((a, b) => (b[1].count || 0) - (a[1].count || 0)).slice(0, 5),
    };
};

// ── Hook into index.html's open-in-new-tab and canvas functions ───────────────
// Wraps the existing functions to intercept code and learn from it
const _origNewTab = window.lomaOpenInNewTab;
window.lomaOpenInNewTab = function(code, lang) {
    window.lomaLearnFromCode(code, lang);
    if (typeof _origNewTab === 'function') return _origNewTab(code, lang);

    // Default: open in new tab
    const w = window.open('', '_blank');
    if (w) {
        if (lang === 'html') {
            w.document.write(code);
        } else {
            w.document.write(`<pre style="background:#131314;color:#e0e0e0;font-family:monospace;padding:20px;font-size:13px;">${code.replace(/</g,'&lt;')}</pre>`);
        }
        w.document.close();
    }
};

const _origCanvas = window.lomaOpenCodeInCanvas;
window.lomaOpenCodeInCanvas = function(code, lang) {
    window.lomaLearnFromCode(code, lang);
    if (typeof _origCanvas === 'function') return _origCanvas(code, lang);
};

// ── Auto-analyze code blocks already in the DOM (history replay) ──────────────
function analyzeExistingCodeBlocks() {
    const blocks = document.querySelectorAll('pre code, .hljs');
    blocks.forEach(block => {
        const code = block.textContent;
        const lang = block.className.replace(/language-|hljs-/g, '').trim() || 'code';
        if (code && code.length > 50) {
            window.lomaLearnFromCode(code, lang);
        }
    });
}

// Run once on load
setTimeout(analyzeExistingCodeBlocks, 2000);

// Observe new code blocks added to DOM
const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
                const blocks = node.querySelectorAll ? node.querySelectorAll('pre code') : [];
                blocks.forEach(b => {
                    const code = b.textContent;
                    const lang = (b.className || '').replace(/language-/g, '') || 'code';
                    if (code && code.length > 50) {
                        setTimeout(() => window.lomaLearnFromCode(code, lang), 100);
                    }
                });
            }
        });
    });
});

observer.observe(document.body, { childList: true, subtree: true });

console.log('[LOMA Code Learner] Active — analyzing all generated code for self-improvement');
console.log(`[LOMA Code Learner] ${loadPairs().length} pairs in memory | ${Object.keys(loadPatterns()).length} discovered patterns`);

})();