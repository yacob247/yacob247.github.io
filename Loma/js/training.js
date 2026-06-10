import { Engine } from './engine.js';

// ═══════════════════════════════════════════════════════════════════════════════
//  training.js — RLHF data collection
//  Fixed: no auto-save of every response as "chosen", deduplication,
//         edit/delete individual entries, real-time stats panel update.
// ═══════════════════════════════════════════════════════════════════════════════

export const Trainer = {
    rlhfData: JSON.parse(localStorage.getItem('loma_rlhf') || '[]'),

    // ── Rate a response (thumbs up / down) ────────────────────────────────
    rateResponse(msgId, isUpvote, bPrompt, bReply, domain = 'text', lang = '') {
        const prompt = Engine._safeDecode(bPrompt);
        const reply  = Engine._safeDecode(bReply);
        const box    = document.getElementById(`rlhf-${msgId}`);
        if (!box) return;

        if (isUpvote) {
            if (!this._isDuplicate(prompt, reply)) {
                this._pushPair({ prompt, chosen: reply, rejected: '', feedback: '', domain, lang, ts: Date.now() });
                this._save();
            }
            box.innerHTML = `<span class="text-emerald-400 text-xs"><i class="fa-solid fa-check mr-1"></i>Saved as correct.</span>`;
            this._updateStatsUI();
        } else {
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

    // ── Submit a correction ────────────────────────────────────────────────
    submitCorrection(msgId, bPrompt, bReply, domain = 'text', lang = '') {
        const prompt   = Engine._safeDecode(bPrompt);
        const reply    = Engine._safeDecode(bReply);
        const input    = document.getElementById(`correction-input-${msgId}`);
        const feedback = input?.value?.trim();
        if (!feedback) return;

        const box = document.getElementById(`rlhf-${msgId}`);

        if (!this._isDuplicate(prompt, reply)) {
            this._pushPair({ prompt, chosen: '', rejected: reply, feedback, domain, lang, ts: Date.now() });
            this._save();
        }

        box.innerHTML = `<span class="text-orange-400 text-xs">
            <i class="fa-solid fa-rotate-right fa-spin mr-1"></i>Correcting…</span>`;

        Engine.submitPrompt(prompt, true, { originalPrompt: prompt, rejectedReply: reply, feedback });
        this._updateStatsUI();
    },

    // ── Deduplication ─────────────────────────────────────────────────────
    _isDuplicate(prompt, reply) {
        return this.rlhfData.some(p =>
            p.prompt === prompt && (p.chosen === reply || p.rejected === reply)
        );
    },

    _pushPair(entry) {
        this.rlhfData.push(entry);
        // Cap at 5000 entries, keep most recent
        if (this.rlhfData.length > 5000) this.rlhfData = this.rlhfData.slice(-5000);
    },

    _save() {
        localStorage.setItem('loma_rlhf', JSON.stringify(this.rlhfData));
    },

    // ── Delete a specific training entry ──────────────────────────────────
    deleteEntry(idx) {
        this.rlhfData.splice(idx, 1);
        this._save();
        this._updateStatsUI();
    },

    // ── Edit a training entry ─────────────────────────────────────────────
    editEntry(idx, updates) {
        if (!this.rlhfData[idx]) return;
        Object.assign(this.rlhfData[idx], updates);
        this._save();
        this._updateStatsUI();
    },

    // ── Export ALL as JSON ────────────────────────────────────────────────
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

    // ── Export domain-separated JSONL ─────────────────────────────────────
    exportByDomain() {
        if (this.rlhfData.length === 0) {
            alert('No training data yet. Rate responses with 👍/👎 to collect data.');
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

        const counts = { code: codePairs.length, text: textPairs.length, image: imagePairs.length };
        console.log('[Trainer] Exported:', counts);
        return counts;
    },

    // ── Structured output schema ──────────────────────────────────────────
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

    // ── Stats ─────────────────────────────────────────────────────────────
    getStats() {
        const byDomain = {};
        this.rlhfData.forEach(p => {
            byDomain[p.domain] = (byDomain[p.domain] || 0) + 1;
        });
        return {
            total:    this.rlhfData.length,
            chosen:   this.rlhfData.filter(p => p.chosen).length,
            rejected: this.rlhfData.filter(p => p.rejected).length,
            byDomain
        };
    },

    // ── Update adaptive stats panel in real time ──────────────────────────
    _updateStatsUI() {
        const panel = document.getElementById('adaptive-stats-display');
        if (!panel) return;
        const s = this.getStats();
        const domainTags = Object.entries(s.byDomain)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([d, n]) => `<span class="px-2 py-0.5 bg-gemini-card/60 rounded-full text-[10px] text-slate-400 border border-gemini-border/30">${d}: ${n}</span>`)
            .join('');
        panel.innerHTML = `
            <div class="flex flex-wrap gap-1.5 items-center w-full">
                <span class="text-[10px] text-emerald-400 font-mono">✓ ${s.chosen}</span>
                <span class="text-[10px] text-orange-400 font-mono">✗ ${s.rejected}</span>
                <span class="text-[10px] text-slate-500 font-mono">Σ ${s.total}</span>
                ${domainTags}
            </div>`;
    },

    // ── Render training data management panel ─────────────────────────────
    renderDataPanel(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (this.rlhfData.length === 0) {
            container.innerHTML = `<p class="text-slate-500 text-xs italic text-center py-4">No training data collected yet.</p>`;
            return;
        }

        const recent = this.rlhfData.slice(-20).reverse();
        container.innerHTML = recent.map((entry, i) => {
            const realIdx = this.rlhfData.length - 1 - i;
            const isGood  = !!entry.chosen;
            return `<div class="flex items-start gap-2 p-2 bg-gemini-card/30 rounded-lg border border-gemini-border/20 text-[10px]">
                <span class="${isGood ? 'text-emerald-400' : 'text-orange-400'} shrink-0 mt-0.5">
                    <i class="fa-solid fa-${isGood ? 'thumbs-up' : 'thumbs-down'}"></i>
                </span>
                <div class="flex-1 min-w-0">
                    <p class="text-slate-300 truncate">${(entry.prompt || '').substring(0, 60)}</p>
                    ${entry.feedback ? `<p class="text-slate-500 truncate mt-0.5">Fix: ${entry.feedback.substring(0, 50)}</p>` : ''}
                    <p class="text-slate-600 mt-0.5">${entry.domain}${entry.lang ? ' · ' + entry.lang : ''}</p>
                </div>
                <button onclick="window.deleteTrainingEntry(${realIdx})"
                    class="text-slate-600 hover:text-red-400 smooth-transition shrink-0">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>`;
        }).join('');
    }
};

// ── Global handlers called from injected HTML ─────────────────────────────────
window.rateResponse     = (id, up, p, r, domain, lang) => Trainer.rateResponse(id, up, p, r, domain, lang);
window.submitCorrection = (id, p, r, domain, lang)     => Trainer.submitCorrection(id, p, r, domain, lang);
window.deleteTrainingEntry = (idx)                     => Trainer.deleteEntry(idx);

// ── NOTE: autoTrainWrite intentionally removed.
//    Only explicit thumbs-up saves "chosen" data now.
//    Automatic saving of every response was poisoning the RLHF dataset.

// ── Init stats display on load ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    Trainer._updateStatsUI();
});