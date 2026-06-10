import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { UI }      from './ui.js';
import { Engine }  from './engine.js';
import { Trainer } from './training.js';

// ═══════════════════════════════════════════════════════════════════════════════
//  main.js — State, Firebase, Drive sync, session management, capabilities UI
//  DOES NOT bind any DOM events — that is app.js's job exclusively.
// ═══════════════════════════════════════════════════════════════════════════════

const firebaseConfig = {
    apiKey:            "AIzaSyDLeM4MrsA1Q8zq7_QcQfTJKk049vOVOO4",
    authDomain:        "envizionwork.firebaseapp.com",
    projectId:         "envizionwork",
    storageBucket:     "envizionwork.firebasestorage.app",
    messagingSenderId: "706251024837",
    appId:             "1:706251024837:web:4c931733d3a9f430a703ac"
};

const generateId = () => Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

export const State = {
    db:                  JSON.parse(localStorage.getItem('loma_db') || '{"sessions":{}}'),
    currentId:           generateId(),
    personalMemories:    JSON.parse(localStorage.getItem('envizion_memories')      || '[]'),
    evolvedCapabilities: JSON.parse(localStorage.getItem('envizion_capabilities')  || '[]'),
    memoryIndex:         {},   // category -> string[] for structured memory
    gDriveToken:         null,
    driveFileId:         null,
    isEngineReady:       false,

    // ── Initialise ─────────────────────────────────────────────────────────
    init() {
        UI.init();

        if (!this.db.sessions) this.db.sessions = {};
        if (!this.db.sessions[this.currentId]) {
            this.db.sessions[this.currentId] = { title: 'New Session', messages: [], updated: Date.now() };
        }

        // Load structured memory index
        try {
            this.memoryIndex = JSON.parse(localStorage.getItem('loma_memory_index') || '{}');
        } catch { this.memoryIndex = {}; }

        this._initFirebase();
        this.renderSidebar();
        this._updateCapabilitiesUI();

        // Restore active model display
        const active = window._lomaActiveModel || localStorage.getItem('loma_active_model') || 'qwen2.5-coder:7b';
        window._lomaActiveModel = active;
        const pill = document.getElementById('model-pill-label');
        if (pill) pill.textContent = this._modelLabel(active);
    },

    _modelLabel(modelId) {
        const map = {
            'qwen2.5-coder:7b': 'Loma Coder 7B',
            'llava':            'Loma Vision',
            'loma-lora':        'Loma Trained',
            'loma-trained':     'Loma Custom',
            'llama3.2:1b':      'Loma 1B',
        };
        return map[modelId] || modelId;
    },

    // ── Structured memory: add with category ───────────────────────────────
    addMemory(text, category = 'general') {
        if (!text?.trim()) return;
        const entry = text.trim();
        // Avoid duplicates
        if (this.personalMemories.includes(entry)) return;

        this.personalMemories.push(entry);
        if (this.personalMemories.length > 200) {
            // Summarize oldest 50 into a single entry rather than deleting raw
            const oldest = this.personalMemories.splice(0, 50);
            this.personalMemories.unshift(`[Summary of earlier context]: ${oldest.slice(0, 10).join(' | ')}`);
        }

        if (!this.memoryIndex[category]) this.memoryIndex[category] = [];
        this.memoryIndex[category].push(entry);
        if (this.memoryIndex[category].length > 50) this.memoryIndex[category].shift();

        localStorage.setItem('envizion_memories', JSON.stringify(this.personalMemories));
        localStorage.setItem('loma_memory_index', JSON.stringify(this.memoryIndex));
    },

    // ── Get relevant memories for a query (by category or keyword) ─────────
    getRelevantMemories(query, maxItems = 10) {
        const q = (query || '').toLowerCase();
        const isCode    = /(code|function|class|script|html|css|js|python|sql)/i.test(q);
        const isWeb     = /\[web:/i.test(q);
        const isPref    = /(prefer|always|never|style|format|like|dislike)/i.test(q);

        let pool = [...this.personalMemories];

        // Deprioritize web search noise for non-web queries
        if (!isWeb) pool = pool.filter(m => !m.startsWith('[Web:'));
        // Prioritize preference memories
        if (isPref) {
            pool = [
                ...pool.filter(m => /prefer|always|never|style/i.test(m)),
                ...pool.filter(m => !/prefer|always|never|style/i.test(m))
            ];
        }
        // For code queries pull code memories first
        if (isCode && this.memoryIndex.code?.length) {
            pool = [...this.memoryIndex.code, ...pool.filter(m => !this.memoryIndex.code?.includes(m))];
        }

        return pool.slice(0, maxItems);
    },

    // ── Session management ─────────────────────────────────────────────────
    startNewChat() {
        this.currentId = generateId();
        this.db.sessions[this.currentId] = { title: 'New Session', messages: [], updated: Date.now() };

        const stream = document.getElementById('chat-stream');
        if (stream) {
            stream.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-center px-4" id="empty-state">
                <div class="h-16 w-16 bg-gemini-card rounded-full flex items-center justify-center text-3xl mb-6 shadow-xl border border-gemini-border/30">
                    <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-emerald-400">
                        <i class="fa-solid fa-sparkles"></i>
                    </span>
                </div>
                <h1 class="text-2xl font-semibold text-white mb-3">Autonomous Evolution Workspace</h1>
                <p class="text-sm text-gemini-textMuted max-w-md leading-relaxed mb-8">
                    Running locally. Propose complex capabilities, research live web events, and evolve your engine!
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg">
                    <button onclick="document.getElementById('user-prompt').value='Find the latest top performing JavaScript web frameworks and propose a custom capabilities upgrade so you remember to always use them for Canvas Apps!'; window.processInputMessage();" class="p-4 bg-gemini-card hover:bg-[#323639] border border-gemini-border/50 rounded-2xl text-left smooth-transition">
                        <i class="fa-solid fa-dna text-emerald-400 mb-2 block text-lg"></i>
                        <span class="text-sm text-slate-200 font-medium block">Propose Evolution</span>
                        <span class="text-[11px] text-slate-400">Upgrade your prompt using live custom search!</span>
                    </button>
                    <button onclick="document.getElementById('user-prompt').value='Build a canvas interactive space simulator app using three.js!'; window.processInputMessage();" class="p-4 bg-gemini-card hover:bg-[#323639] border border-gemini-border/50 rounded-2xl text-left smooth-transition">
                        <i class="fa-brands fa-html5 text-orange-400 mb-2 block text-lg"></i>
                        <span class="text-sm text-slate-200 font-medium block">Code Three.js App</span>
                        <span class="text-[11px] text-slate-400">Renders beautiful 3D Canvas instantly</span>
                    </button>
                </div>
            </div>`;
        }

        this.renderSidebar();
        this.saveDb();
    },

    loadChat(id) {
        if (!this.db.sessions[id]) return;
        this.currentId = id;
        const session = this.db.sessions[id];

        const stream = document.getElementById('chat-stream');
        if (!stream) return;
        stream.innerHTML = '';

        session.messages.forEach(m => {
            if (m.role === 'user') {
                UI.appendBubble('user', UI.escapeHtml(m.content));
            } else if (m.role === 'assistant') {
                UI.appendBubble('assistant', UI.processContent(m.content));
            }
        });

        const titleEl = document.getElementById('chat-title') || document.getElementById('current-chat-title');
        if (titleEl) titleEl.innerText = session.title || 'Chat';

        this.renderSidebar();
    },

    deleteChat(e, id) {
        e?.stopPropagation();
        delete this.db.sessions[id];
        this.saveDb();
        if (this.currentId === id) this.startNewChat();
        else this.renderSidebar();
    },

    saveDb() {
        localStorage.setItem('loma_db', JSON.stringify(this.db));
        // Debounced Drive sync
        clearTimeout(this._syncTimer);
        this._syncTimer = setTimeout(() => this.syncToDrive(), 3000);
    },

    renderSidebar() {
        const list = document.getElementById('recent-chats-list');
        if (!list) return;

        const sessions = Object.entries(this.db.sessions)
            .sort(([, a], [, b]) => (b.updated || 0) - (a.updated || 0))
            .slice(0, 40);

        if (sessions.length === 0) {
            list.innerHTML = `<div class="p-3 text-gemini-textMuted text-xs italic bg-gemini-card/20 rounded-xl text-center border border-dashed border-gemini-border/30">Start typing to save local threads</div>`;
            return;
        }

        list.innerHTML = sessions.map(([id, s]) => {
            const isActive = id === this.currentId;
            return `<div onclick="window.loadChat('${id}')"
                class="group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer smooth-transition text-xs
                       ${isActive ? 'bg-gemini-accent/10 border border-gemini-accent/20 text-white' : 'hover:bg-gemini-card/40 text-gemini-textMain border border-transparent'}">
                <span class="truncate flex-1 mr-2">${UI.escapeHtml(s.title || 'New Session')}</span>
                <button onclick="window.deleteChat(event,'${id}')"
                    class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 rounded smooth-transition shrink-0">
                    <i class="fa-solid fa-xmark text-[10px]"></i>
                </button>
            </div>`;
        }).join('');
    },

    // ── Capabilities UI ────────────────────────────────────────────────────
    _updateCapabilitiesUI() {
        const list  = document.getElementById('learned-capabilities-list');
        const count = document.getElementById('capability-count');
        const caps  = this.evolvedCapabilities || [];

        if (count) count.innerText = `${caps.length} Active`;
        if (!list) return;

        if (caps.length === 0) {
            list.innerHTML = `<span class="italic text-slate-500 block text-center py-1">No custom capabilities evolved yet.</span>`;
            return;
        }
        list.innerHTML = caps.map((c, i) => `
            <div class="flex items-center justify-between gap-2 group">
                <div class="flex items-center gap-2 min-w-0">
                    <i class="fa-solid fa-circle-check text-emerald-400 text-[9px] shrink-0"></i>
                    <span class="truncate">${UI.escapeHtml(c.title)}</span>
                </div>
                <button onclick="window.deleteCapability(${i})"
                    class="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 smooth-transition text-[9px] shrink-0">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>`).join('');
    },

    // ── Memory panel UI ────────────────────────────────────────────────────
    renderMemoryPanel() {
        const panel = document.getElementById('memory-panel-list');
        if (!panel) return;
        const mems = this.personalMemories.filter(m => !m.startsWith('[Web:'));
        if (mems.length === 0) {
            panel.innerHTML = `<span class="italic text-slate-500 text-[10px]">No personal memories yet.</span>`;
            return;
        }
        panel.innerHTML = mems.slice(-20).reverse().map((m, i) => `
            <div class="flex items-start gap-2 group text-[10px] text-slate-400">
                <span class="shrink-0 text-slate-600 mt-0.5">•</span>
                <span class="flex-1 truncate">${UI.escapeHtml(m.substring(0, 100))}</span>
                <button onclick="window.deleteMemory(${this.personalMemories.length - 1 - i})"
                    class="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 smooth-transition shrink-0">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>`).join('');
    },

    // ── Firebase / Google Auth ─────────────────────────────────────────────
    _initFirebase() {
        const fbApp  = initializeApp(firebaseConfig);
        const auth   = getAuth(fbApp);
        const prov   = new GoogleAuthProvider();
        prov.addScope('https://www.googleapis.com/auth/drive.file');

        const signIn = async () => {
            try {
                const result = await signInWithPopup(auth, prov);
                const cred   = GoogleAuthProvider.credentialFromResult(result);
                if (cred?.accessToken) {
                    this.gDriveToken = cred.accessToken;
                    await this.loadFromDrive();
                }
            } catch (err) {
                console.error('Sign-in failed', err);
            }
        };

        document.querySelectorAll('#google-login-btn, #auth-gate-btn').forEach(btn => {
            if (btn) btn.onclick = signIn;
        });
        window.signInWithGoogle      = signIn;
        window.signInAndConnectDrive = signIn;

        onAuthStateChanged(auth, async user => {
            if (!user) {
                this.isEngineReady = false;
                return;
            }

            this.isEngineReady = true;

            const nameEl   = document.getElementById('user-display-name');
            const statusEl = document.getElementById('user-display-status');
            const avatarEl = document.getElementById('user-avatar');
            const dot      = document.getElementById('connection-dot');
            const label    = document.getElementById('connection-label');

            if (nameEl)   nameEl.innerText   = user.displayName || user.email;
            if (statusEl) statusEl.innerText = '✓ Connected';
            if (dot)   dot.className   = 'h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
            if (label) label.innerText = 'Loma Live';

            if (avatarEl && user.photoURL) {
                avatarEl.innerHTML = `<img src="${user.photoURL}" class="w-full h-full object-cover rounded-full">`;
            }

            const driveBtn  = document.getElementById('drive-status-label');
            const driveIcon = document.getElementById('drive-status-icon');
            const loginBtn  = document.getElementById('google-login-btn');
            if (driveIcon) driveIcon.className   = 'fa-brands fa-google-drive text-emerald-400 text-sm';
            if (driveBtn)  driveBtn.innerHTML     = `Synced as <span class="text-white">${user.displayName || user.email}</span>`;
            if (loginBtn)  loginBtn.style.display = 'none';

            if (!this.gDriveToken) {
                try {
                    const r    = await signInWithPopup(auth, prov);
                    const cred = GoogleAuthProvider.credentialFromResult(r);
                    if (cred?.accessToken) this.gDriveToken = cred.accessToken;
                } catch { /* silent */ }
            }

            await this.loadFromDrive();
        });
    },

    async loadFromDrive() {
        if (!this.gDriveToken) return;
        try {
            const q      = encodeURIComponent("name='loma_workspace.json' and trashed=false");
            const search = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive`, {
                headers: { Authorization: `Bearer ${this.gDriveToken}` }
            });
            const data = await search.json();

            if (data.files && data.files.length > 0) {
                this.driveFileId = data.files[0].id;
                const fileRes    = await fetch(
                    `https://www.googleapis.com/drive/v3/files/${this.driveFileId}?alt=media`,
                    { headers: { Authorization: `Bearer ${this.gDriveToken}` } }
                );
                if (fileRes.ok) {
                    const remote = await fileRes.json();
                    // Remote wins for sessions that don't exist locally
                    if (remote.sessions) {
                        Object.keys(remote.sessions).forEach(id => {
                            if (!this.db.sessions[id]) this.db.sessions[id] = remote.sessions[id];
                        });
                    }
                    if (remote.memories)  { this.personalMemories = remote.memories; localStorage.setItem('envizion_memories', JSON.stringify(remote.memories)); }
                    if (remote.memIdx)    { this.memoryIndex = remote.memIdx; localStorage.setItem('loma_memory_index', JSON.stringify(remote.memIdx)); }
                    if (remote.caps)      { this.evolvedCapabilities = remote.caps; localStorage.setItem('envizion_capabilities', JSON.stringify(remote.caps)); this._updateCapabilitiesUI(); }
                    if (remote.rlhf)      { Trainer.rlhfData = remote.rlhf; localStorage.setItem('loma_rlhf', JSON.stringify(remote.rlhf)); }
                }
            } else {
                await this.syncToDrive();
            }
            this.renderSidebar();
        } catch (err) { console.warn('Drive load error', err); }
    },

    async syncToDrive() {
        localStorage.setItem('loma_db', JSON.stringify(this.db));
        if (!this.gDriveToken) return;
        try {
            const payload = JSON.stringify({
                sessions:  this.db.sessions,
                memories:  this.personalMemories,
                memIdx:    this.memoryIndex,
                caps:      this.evolvedCapabilities,
                rlhf:      Trainer.rlhfData,
                savedAt:   Date.now()
            });

            if (this.driveFileId) {
                await fetch(
                    `https://upload.googleapis.com/upload/drive/v3/files/${this.driveFileId}?uploadType=media`,
                    { method: 'PATCH', headers: { Authorization: `Bearer ${this.gDriveToken}`, 'Content-Type': 'application/json' }, body: payload }
                );
            } else {
                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify({ name: 'loma_workspace.json' })], { type: 'application/json' }));
                form.append('file',     new Blob([payload], { type: 'application/json' }));
                const res = await fetch(
                    'https://upload.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                    { method: 'POST', headers: { Authorization: `Bearer ${this.gDriveToken}` }, body: form }
                );
                this.driveFileId = (await res.json()).id;
            }
        } catch (err) { console.warn('Drive sync error', err); }
    }
};

// ── Expose on window so app.js and inline handlers can reach it ───────────────
window.State = State;

// ── Globals for HTML onclick handlers ─────────────────────────────────────────
window.loadChat                = id       => State.loadChat(id);
window.deleteChat              = (e, id)  => State.deleteChat(e, id);
window.startNewChatSession     = ()       => State.startNewChat();
window.loadHistoricalSession   = id       => State.loadChat(id);
window.deleteHistoricalSession = (e, id)  => State.deleteChat(e, id);
window.exportRLHFDataset       = ()       => Trainer.exportAll();

window.clearPersonalMemory = () => {
    State.personalMemories = [];
    State.memoryIndex = {};
    localStorage.removeItem('envizion_memories');
    localStorage.removeItem('loma_memory_index');
    State.renderMemoryPanel?.();
};

window.deleteMemory = (idx) => {
    State.personalMemories.splice(idx, 1);
    localStorage.setItem('envizion_memories', JSON.stringify(State.personalMemories));
    State.renderMemoryPanel();
};

window.deleteCapability = (idx) => {
    State.evolvedCapabilities.splice(idx, 1);
    localStorage.setItem('envizion_capabilities', JSON.stringify(State.evolvedCapabilities));
    State._updateCapabilitiesUI();
};

window.toggleConfigSidebar = () => {
    const sidebar = document.getElementById('config-sidebar');
    if (!sidebar) return;
    const isOpen = !sidebar.classList.contains('-translate-x-full');
    sidebar.classList.toggle('-translate-x-full', isOpen);
    if (!isOpen) State.renderMemoryPanel();
};

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => State.init());