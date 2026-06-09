/**
 * LOMA Adaptive Trainer
 * Watches every user reaction (thumbs, dual-mode picks, capability approvals)
 * and continuously improves the system — no manual export required.
 *
 * Load AFTER index.html's main <script> block.
 */
(function () {
    'use strict';

    const HF_SPACE     = 'https://yacob-okour14342-llama-engine.hf.space';
    const STORE_KEY    = 'loma_adaptive_pairs';
    const PUSH_THRESH  = 5;   // push after every N new pairs
    const MAX_STORED   = 500;

    // ── Storage helpers ────────────────────────────────────────────────────────
    function load() {
        try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
    }
    function save(pairs) {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(pairs.slice(-MAX_STORED))); } catch {}
    }

    // ── Signal quality scoring ─────────────────────────────────────────────────
    // Returns 0.0–1.0 based on heuristics in the chosen reply
    function scoreReply(text) {
        let s = 0.5;
        if (!text) return 0;
        s += Math.min(0.15, text.length / 3000);
        if (/```(html|css|js|javascript|python|typescript)/i.test(text)) s += 0.12;
        if (/(async|await|Promise|fetch)/i.test(text)) s += 0.06;
        if (/(--[\w-]+\s*:|@layer|@container|:has\()/i.test(text)) s += 0.08;
        if (/\*\*|##|```/.test(text)) s += 0.04;
        if (/(TODO|placeholder|\.\.\.)/i.test(text)) s -= 0.15;
        if (/\bvar\s+/.test(text)) s -= 0.05;
        return Math.min(Math.max(s, 0), 1);
    }

    // ── Core: record a reaction ────────────────────────────────────────────────
    function recordReaction(prompt, chosen, rejected, source, score) {
        if (!prompt || !chosen) return;
        const pairs = load();
        pairs.push({
            prompt:   prompt.trim(),
            chosen:   chosen.trim(),
            rejected: (rejected || '').trim(),
            score:    score !== undefined ? score : scoreReply(chosen),
            source,
            timestamp: Date.now(),
        });
        save(pairs);
        maybePush(pairs);
    }

    // ── Push to HF Space when threshold is reached ─────────────────────────────
    let _pushing = false;
    async function maybePush(pairs) {
        const unsent = pairs.filter(p => !p._sent);
        if (unsent.length < PUSH_THRESH || _pushing) return;
        _pushing = true;

        try {
            // Check if already training
            const statusRes = await fetch(`${HF_SPACE}/status`, { signal: AbortSignal.timeout(5000) }).catch(() => null);
            if (statusRes?.ok) {
                const s = await statusRes.json().catch(() => ({}));
                if (s.status === 'training') { _pushing = false; return; }
            }

            const payload = unsent.slice(0, 50);
            const res = await fetch(`${HF_SPACE}/train`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ training_data: payload }),
                signal:  AbortSignal.timeout(12000),
            });

            if (res.status === 202 || res.status === 200) {
                // Mark as sent
                const all = load();
                all.forEach(p => { if (!p._sent) p._sent = true; });
                save(all);
                console.log(`[Loma Adaptive] Pushed ${payload.length} pairs to HF Space.`);
                // Show toast if available
                if (typeof triggerNotificationToast === 'function') {
                    triggerNotificationToast('Adaptive Training', `${payload.length} reactions pushed to Loma brain.`, 'fa-brain', 'bg-violet-600');
                }
            }
        } catch (e) {
            console.log('[Loma Adaptive] HF push failed (will retry):', e.message);
        } finally {
            _pushing = false;
        }
    }

    // ── 1. INTERCEPT DUAL-MODE PICKS ──────────────────────────────────────────
    // The dual-mode picker calls autoTrainWrite() internally (already wired).
    // We additionally intercept window.autoTrainWrite to also record here.
    const _origAutoTrainWrite = window.autoTrainWrite;
    window.autoTrainWrite = function (prompt, chosen, rejected) {
        if (typeof _origAutoTrainWrite === 'function') _origAutoTrainWrite(prompt, chosen, rejected);
        recordReaction(prompt, chosen, rejected, 'dual_pick');
    };

    // ── 2. INTERCEPT THUMBS UP/DOWN (rateResponse) ───────────────────────────
    const _origRateResponse = window.rateResponse;
    window.rateResponse = function (msgId, isUpvote, b64Prompt, b64Reply) {
        if (typeof _origRateResponse === 'function') _origRateResponse(msgId, isUpvote, b64Prompt, b64Reply);
        try {
            const prompt = decodeURIComponent(atob(b64Prompt));
            const reply  = decodeURIComponent(atob(b64Reply));
            if (isUpvote) {
                recordReaction(prompt, reply, '', 'thumbs_up', scoreReply(reply) + 0.1);
            } else {
                // Thumbs down — record as rejected (no chosen yet, skip pair)
                const pairs = load();
                // Attach rejected tag to last matching prompt if exists
                const last = [...pairs].reverse().find(p => p.prompt === prompt.trim());
                if (last && !last.rejected) {
                    last.rejected = reply;
                    last.score    = Math.max(0, (last.score || 0.5) - 0.15);
                    save(pairs);
                }
            }
        } catch (e) { /* ignore decode errors */ }
    };

    // ── 3. INTERCEPT CAPABILITY APPROVALS ────────────────────────────────────
    const _origApprove = window.approveCapability;
    window.approveCapability = function (id, b64Title, b64Rule, b64Reason) {
        if (typeof _origApprove === 'function') _origApprove(id, b64Title, b64Rule, b64Reason);
        try {
            const title  = decodeURIComponent(atob(b64Title));
            const rule   = decodeURIComponent(atob(b64Rule));
            const reason = decodeURIComponent(atob(b64Reason));
            // Store as a capability instruction pair
            recordReaction(
                `Always follow this rule: ${title}`,
                `Rule: ${rule}\n\nRationale: ${reason}`,
                '',
                'capability_approved',
                0.95
            );
        } catch (e) {}
    };

    // ── 4. SESSION-END PUSH — push remaining on page unload ──────────────────
    window.addEventListener('beforeunload', () => {
        const pairs = load().filter(p => !p._sent);
        if (pairs.length === 0) return;
        // Use sendBeacon for reliability
        const blob = new Blob([JSON.stringify({ training_data: pairs })], { type: 'application/json' });
        navigator.sendBeacon(`${HF_SPACE}/train`, blob);
    });

    // ── 5. STATS ─────────────────────────────────────────────────────────────
    window.lomaAdaptiveStats = function () {
        const pairs   = load();
        const sent    = pairs.filter(p => p._sent).length;
        const pending = pairs.length - sent;
        const bySource = {};
        pairs.forEach(p => { bySource[p.source] = (bySource[p.source] || 0) + 1; });
        const avgScore = pairs.length
            ? (pairs.reduce((a, p) => a + (p.score || 0.5), 0) / pairs.length).toFixed(2)
            : 0;
        console.table({ total: pairs.length, sent, pending, avgScore, ...bySource });
        return { total: pairs.length, sent, pending, avgScore, bySource };
    };

    // ── 6. ADAPTIVE UI STATS DISPLAY ─────────────────────────────────────────
    // Updates the "Adaptive training stats" panel in settings after each interaction
    function refreshAdaptiveStatsUI() {
        const el = document.getElementById('adaptive-stats-display');
        if (!el) return;
        const pairs = load();
        if (pairs.length === 0) return;
        const sent    = pairs.filter(p => p._sent).length;
        const pending = pairs.length - sent;
        const avg     = pairs.length
            ? (pairs.reduce((a, p) => a + (p.score || 0.5), 0) / pairs.length).toFixed(2)
            : '—';
        el.innerHTML = `
            <span class="inline-flex items-center gap-1 px-2 py-1 bg-emerald-900/20 border border-emerald-500/20 text-emerald-300 rounded-full text-[9px] font-mono">
                <i class="fa-solid fa-brain text-[8px]"></i> ${pairs.length} pairs · avg ${avg}
            </span>
            <span class="inline-flex items-center gap-1 px-2 py-1 bg-violet-900/20 border border-violet-500/20 text-violet-300 rounded-full text-[9px] font-mono">
                <i class="fa-solid fa-upload text-[8px]"></i> ${sent} pushed · ${pending} pending
            </span>`;
    }

    // Hook into dual-mode finalize and rateResponse to refresh stats
    const _refreshOnEvents = ['loma:reaction', 'loma:rated'];
    document.addEventListener('loma:reaction', refreshAdaptiveStatsUI);
    document.addEventListener('loma:rated',    refreshAdaptiveStatsUI);
    // Also refresh every 10 seconds passively
    setInterval(refreshAdaptiveStatsUI, 10000);
    // Initial render
    setTimeout(refreshAdaptiveStatsUI, 1500);

    console.log('[Loma Adaptive Trainer] Active — watching reactions, thumbs, capability approvals.');
    console.log(`[Loma Adaptive Trainer] ${load().length} pairs in store | threshold: ${PUSH_THRESH}`);
})();