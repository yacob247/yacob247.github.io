import { Engine } from './engine.js';

// ─── TRAINING DATA STORE ───────────────────────────────────────────────────────
// Persists to localStorage. Exports to domain-separated .jsonl files.
// Domains: code | html | css | js | python | sql | cpp | csharp | rust |
//          java | swift | kotlin | go | cli | text | image | other

export const Trainer = {
    rlhfData: JSON.parse(localStorage.getItem('loma_rlhf') || '[]'),

    // ── Rate a response (thumbs up / down) ────────────────────────────────────
    rateResponse(msgId, isUpvote, bPrompt, bReply, domain = 'text', lang = '') {
        const prompt = decodeURIComponent(escape(atob(bPrompt)));
        const reply  = decodeURIComponent(escape(atob(bReply)));
        const box    = document.getElementById(`rlhf-${msgId}`);
        if (!box) return;

        if (isUpvote) {
            // Store as chosen — correct pair
            this._pushPair({
                prompt,
                chosen:   reply,
                rejected: '',
                feedback: '',
                domain,
                lang,
                ts: Date.now()
            });
            box.innerHTML = `<span class="text-emerald-400 text-xs">
                <i class="fa-solid fa-check mr-1"></i>Saved as correct.</span>`;
            this._save();
        } else {
            // Developer correction flow — inline textarea
            box.innerHTML = `
                <div class="w-full mt-1">
                    <textarea id="correction-input-${msgId}"
                        class="w-full bg-[#1a1b1c] border border-[#3c4043] focus:border-orange-400
                               rounded-xl px-3 py-2 text-xs text-gray-200 outline-none resize-none"
                        rows="2"
                        placeholder="What's wrong? Describe the fix needed…"></textarea>
                    <div class="flex gap-2 mt-1.5">
                        <button onclick="window.submitCorrection(${msgId}, '${bPrompt}', '${bReply}', '${domain}', '${lang}')"
                            class="text-xs bg-orange-500 hover:bg-orange-400 text-black font-bold
                                   px-3 py-1.5 rounded-lg transition">
                            <i class="fa-solid fa-rotate-right mr-1"></i>Regenerate
                        </button>
                        <button onclick="document.getElementById('rlhf-${msgId}').innerHTML=''"
                            class="text-xs text-gray-400 hover:text-white px-2 py-1 transition">
                            Cancel
                        </button>
                    </div>
                </div>`;
            setTimeout(() => document.getElementById(`correction-input-${msgId}`)?.focus(), 50);
        }
    },

    // ── Submit a developer correction ─────────────────────────────────────────
    submitCorrection(msgId, bPrompt, bReply, domain = 'text', lang = '') {
        const prompt   = decodeURIComponent(escape(atob(bPrompt)));
        const reply    = decodeURIComponent(escape(atob(bReply)));
        const input    = document.getElementById(`correction-input-${msgId}`);
        const feedback = input?.value?.trim();
        if (!feedback) return;

        const box = document.getElementById(`rlhf-${msgId}`);

        // Store rejected pair with feedback
        this._pushPair({
            prompt,
            chosen:   '',
            rejected: reply,
            feedback,
            domain,
            lang,
            ts: Date.now()
        });
        this._save();

        box.innerHTML = `<span class="text-orange-400 text-xs">
            <i class="fa-solid fa-rotate-right fa-spin mr-1"></i>Correcting…</span>`;

        // Tell engine to regenerate using the correction pipeline
        Engine.submitPrompt(
            prompt,
            true,
            { originalPrompt: prompt, rejectedReply: reply, feedback }
        );
    },

    // ── Push a pair and enforce uniqueness ────────────────────────────────────
    _pushPair(entry) {
        this.rlhfData.push(entry);
    },

    _save() {
        localStorage.setItem('loma_rlhf', JSON.stringify(this.rlhfData));
    },

    // ── Export ALL data as one JSON (for Colab combiner) ─────────────────────
    exportAll() {
        if (this.rlhfData.length === 0) {
            alert('No training data yet. Use 👍/👎 on responses to collect data.');
            return;
        }
        this._download(
            JSON.stringify(this._structured(this.rlhfData), null, 2),
            `loma_training_all_${Date.now()}.json`,
            'application/json'
        );
    },

    // ── Export domain-separated JSONL files ───────────────────────────────────
    // Produces: training_code.jsonl, training_text.jsonl, training_image.jsonl
    exportByDomain() {
        if (this.rlhfData.length === 0) {
            alert('No training data yet.');
            return;
        }

        const CODE_DOMAINS  = new Set(['code','html','css','js','python','sql','cpp','csharp','rust','java','swift','kotlin','go','cli']);
        const IMAGE_DOMAINS = new Set(['image']);

        const codePairs  = this.rlhfData.filter(p => CODE_DOMAINS.has(p.domain));
        const imagePairs = this.rlhfData.filter(p => IMAGE_DOMAINS.has(p.domain));
        const textPairs  = this.rlhfData.filter(p => !CODE_DOMAINS.has(p.domain) && !IMAGE_DOMAINS.has(p.domain));

        if (codePairs.length)  this._downloadJSONL(this._structured(codePairs),  `training_code_${Date.now()}.jsonl`);
        if (imagePairs.length) this._downloadJSONL(this._structured(imagePairs), `training_image_${Date.now()}.jsonl`);
        if (textPairs.length)  this._downloadJSONL(this._structured(textPairs),  `training_text_${Date.now()}.jsonl`);

        const counts = {
            code:  codePairs.length,
            text:  textPairs.length,
            image: imagePairs.length
        };
        console.log('[Trainer] Exported domain files:', counts);
        return counts;
    },

    // ── Structured output schema (matches Colab combiner) ─────────────────────
    _structured(pairs) {
        return pairs
            .filter(p => p.prompt && (p.chosen || p.rejected))
            .map(p => ({
                prompt:   p.prompt.trim(),
                chosen:   (p.chosen   || '').trim(),
                rejected: (p.rejected || '').trim(),
                feedback: (p.feedback || '').trim(),
                domain:   p.domain   || 'text',
                lang:     p.lang     || '',
                ts:       p.ts       || Date.now()
            }));
    },

    _download(content, filename, type = 'application/json') {
        const a  = document.createElement('a');
        a.href   = URL.createObjectURL(new Blob([content], { type }));
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    },

    _downloadJSONL(pairs, filename) {
        const content = pairs.map(p => JSON.stringify(p)).join('\n');
        this._download(content, filename, 'application/x-jsonlines');
    },

    // ── Stats ─────────────────────────────────────────────────────────────────
    getStats() {
        const byDomain = {};
        this.rlhfData.forEach(p => {
            byDomain[p.domain] = (byDomain[p.domain] || 0) + 1;
        });
        return {
            total:     this.rlhfData.length,
            chosen:    this.rlhfData.filter(p => p.chosen).length,
            rejected:  this.rlhfData.filter(p => p.rejected).length,
            byDomain
        };
    }
};

// ── Global handlers called from injected HTML ─────────────────────────────────
window.rateResponse    = (id, up, p, r, domain, lang) => Trainer.rateResponse(id, up, p, r, domain, lang);
window.submitCorrection = (id, p, r, domain, lang)    => Trainer.submitCorrection(id, p, r, domain, lang);

// ── Auto-train write hook (called from engine.js after every response) ────────
window.autoTrainWrite = (prompt, chosen, rejected = '', domain = 'text', lang = '') => {
    if (!prompt || !chosen) return;
    Trainer._pushPair({ prompt, chosen, rejected, feedback: '', domain, lang, ts: Date.now() });
    Trainer._save();
};