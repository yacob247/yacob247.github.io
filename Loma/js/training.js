import { Engine } from './engine.js';

export const Trainer = {
    rlhfData: JSON.parse(localStorage.getItem('loma_rlhf') || '[]'),

    rateResponse(msgId, isUpvote, bPrompt, bReply) {
        const prompt = decodeURIComponent(escape(atob(bPrompt)));
        const reply = decodeURIComponent(escape(atob(bReply)));
        const box = document.getElementById(`rlhf-${msgId}`);
        if (!box) return;

        if (isUpvote) {
            // Mark as correct — store chosen pair
            this.rlhfData.push({ prompt, chosen: reply, rejected: '', ts: Date.now() });
            box.innerHTML = `<span class="text-emerald-400 text-xs"><i class="fa-solid fa-check mr-1"></i>Saved as correct.</span>`;
            this._save();
        } else {
            // Developer correction flow
            // Use a clean inline prompt instead of browser prompt() for UX
            box.innerHTML = `
                <div class="w-full mt-1">
                    <textarea id="correction-input-${msgId}" class="w-full bg-[#1a1b1c] border border-[#3c4043] focus:border-orange-400 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none resize-none" rows="2" placeholder="What's wrong? Describe the fix needed..."></textarea>
                    <div class="flex gap-2 mt-1.5">
                        <button onclick="window.submitCorrection(${msgId}, '${bPrompt}', '${bReply}')" class="text-xs bg-orange-500 hover:bg-orange-400 text-black font-bold px-3 py-1.5 rounded-lg transition">
                            <i class="fa-solid fa-rotate-right mr-1"></i>Regenerate
                        </button>
                        <button onclick="document.getElementById('rlhf-${msgId}').innerHTML=''" class="text-xs text-gray-400 hover:text-white px-2 py-1 transition">Cancel</button>
                    </div>
                </div>`;
            setTimeout(() => document.getElementById(`correction-input-${msgId}`)?.focus(), 50);
        }
    },

    submitCorrection(msgId, bPrompt, bReply) {
        const prompt = decodeURIComponent(escape(atob(bPrompt)));
        const reply = decodeURIComponent(escape(atob(bReply)));
        const feedbackInput = document.getElementById(`correction-input-${msgId}`);
        const feedback = feedbackInput?.value?.trim();
        if (!feedback) return;

        const box = document.getElementById(`rlhf-${msgId}`);

        // Save rejected pair with developer feedback
        this.rlhfData.push({ prompt, chosen: '', rejected: reply, feedback, ts: Date.now() });
        this._save();

        box.innerHTML = `<span class="text-orange-400 text-xs"><i class="fa-solid fa-rotate-right fa-spin mr-1"></i>Correcting...</span>`;

        // Trigger engine correction — it will regenerate and attach new thumbs up/down
        Engine.submitPrompt(
            `Original request: "${prompt}"\n\nPrevious output was rejected by the developer.\nDeveloper correction: "${feedback}"\n\nRegenerate the complete, correct solution applying this correction exactly.`,
            true
        );
    },

    _save() {
        localStorage.setItem('loma_rlhf', JSON.stringify(this.rlhfData));
    },

    exportDPO() {
        if (this.rlhfData.length === 0) {
            alert('No training data yet. Use 👍/👎 on responses to collect data.');
            return;
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(this.rlhfData, null, 2)], { type: 'application/json' }));
        a.download = `loma_training_${Date.now()}.json`;
        a.click();
    }
};

// Global handlers called from injected HTML
window.rateResponse = (id, up, p, r) => Trainer.rateResponse(id, up, p, r);
window.submitCorrection = (id, p, r) => Trainer.submitCorrection(id, p, r);