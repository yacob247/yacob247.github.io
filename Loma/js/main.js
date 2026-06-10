import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { UI }      from './ui.js';
import { Engine }  from './engine.js';
import { Trainer } from './training.js';

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
    gDriveToken:         null,
    driveFileId:         null,
    isEngineReady:       false,

    // ── Initialise ────────────────────────────────────────────────────────
    init() {
        UI.init();

        // Ensure current session exists
        if (!this.db.sessions) this.db.sessions = {};
        if (!this.db.sessions[this.currentId]) {
            this.db.sessions[this.currentId] = { title: 'New Session', messages: [], updated: Date.now() };
        }

        this._bindEvents();
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
            'loma-trained':     'Loma Custom'
        };
        return map[modelId] || modelId;
    },

    // ── Bind all UI events ────────────────────────────────────────────────
    _bindEvents() {
        const input    = document.getElementById('prompt-input') || document.getElementById('user-prompt');
        const submitBtn = document.getElementById('submit-prompt-btn');
        const stopBtn   = document.getElementById('stop-btn')
                       || document.getElementById('generation-controls');
        const newChat   = document.getElementById('btn-new-chat');
        const exportBtn = document.getElementById('btn-export-dpo') || document.getElementById('btn-export-domain');
        const sidebarBtn = document.getElementById('btn-toggle-sidebar');
        const menuBtn   = document.getElementById('btn-menu');

        if (input) {
            input.addEventListener('input', function () {
                this.style.height = 'auto';
                this.style.height = this.scrollHeight + 'px';
                if (submitBtn) {
                    submitBtn.classList.toggle('text-slate-400', !this.value.trim());
                    submitBtn.classList.toggle('text-white',      !!this.value.trim());
                }
            });
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); Engine.submitPrompt(); }
            });
        }

        if (submitBtn)  submitBtn.onclick  = () => Engine.submitPrompt();
        if (stopBtn)    stopBtn.onclick    = () => Engine.abort();
        if (newChat)    newChat.onclick    = () => this.startNewChat();
        if (exportBtn)  exportBtn.onclick  = () => Trainer.exportByDomain();
        if (sidebarBtn) sidebarBtn.onclick = () => UI.toggleSidebar();
        if (menuBtn)    menuBtn.onclick    = () => UI.toggleSidebar();

        // Export all button
        const exportAllBtn = document.getElementById('btn-export-all');
        if (exportAllBtn) exportAllBtn.onclick = () => Trainer.exportAll();

        // File attachment
        const fileInput = document.getElementById('file-upload-input');
        if (fileInput) fileInput.addEventListener('change', e => this._handleFile(e.target));

        // Auto-scroll detection
        const stream = document.getElementById('chat-stream');
        if (stream) {
            stream.addEventListener('scroll', function () {
                const dist = this.scrollHeight - this.scrollTop - this.clientHeight;
                window.autoScrollChat = dist < 80;
            });
        }
    },

    // ── File attachment handler ───────────────────────────────────────────
    _handleFile(input) {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            this._toast('File too large', 'Max 10MB.', 'fa-triangle-exclamation', 'bg-red-600');
            return;
        }
        const textTypes  = /\.(txt|md|csv|json|js|ts|jsx|tsx|py|html|css|xml|yaml|yml|sh|bash|c|cpp|h|java|go|rs|rb|php|sql|log|env|ini|cfg|conf|svg)$/i;
        const imageTypes = /\.(png|jpg|jpeg|gif|webp|bmp|ico|tiff)$/i;
        const reader     = new FileReader();

        if (textTypes.test(file.name) || file.type.startsWith('text/')) {
            reader.onload = e => {
                this._attachedContent = e.target.result;
                this._attachedName    = file.name;
                this._showFilePill(file.name);
            };
            reader.readAsText(file);
        } else if (imageTypes.test(file.name) || file.type.startsWith('image/')) {
            reader.onload = e => {
                this._attachedContent = `[IMAGE: ${file.name}]\nData URL: ${e.target.result}`;
                this._attachedName    = file.name;
                this._showFilePill(file.name);
            };
            reader.readAsDataURL(file);
        }
        input.value = '';
    },

    _showFilePill(name) {
        const pill = document.getElementById('attached-file-pill');
        const nameEl = document.getElementById('attached-file-name');
        if (pill)   pill.classList.replace('hidden', 'flex');
        if (nameEl) nameEl.innerText = name;
    },

    _toast(title, desc, icon, bg = 'bg-emerald-600') {
        if (window.triggerNotificationToast) {
            window.triggerNotificationToast(title, desc, icon, bg);
        } else {
            console.log(`[Toast] ${title}: ${desc}`);
        }
    },

    // ── Session management ────────────────────────────────────────────────
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
                <h1 class="text-2xl font-semibold text-white mb-2">Loma Unified Intelligence</h1>
                <p class="text-xs text-slate-500">Engineering · Vision · Creative · Research</p>
            </div>`;
        }

        const titleEl = document.getElementById('chat-title') || document.getElementById('current-chat-title');
        if (titleEl) titleEl.innerText = 'New Session';

        this.saveDb();
        this.renderSidebar();

        if (window.innerWidth < 768) UI.toggleSidebar();
        if (window.history) window.history.pushState({}, '', `/Loma/${this.currentId}`);
    },

    loadChat(id) {
        if (!this.db.sessions[id]) return;
        this.currentId = id;
        const session  = this.db.sessions[id];

        const titleEl = document.getElementById('chat-title') || document.getElementById('current-chat-title');
        if (titleEl) titleEl.innerText = session.title;

        const stream = document.getElementById('chat-stream');
        if (stream) stream.innerHTML = '';

        session.messages.forEach(m => {
            if (m.role === 'system') return;
            if (m.role === 'user')      UI.appendBubble('user', UI.escapeHtml(m.content));
            else UI.appendBubble('assistant', UI.processContent(m.content));
        });

        if (window.innerWidth < 768) UI.toggleSidebar();
        if (window.history) window.history.pushState({}, '', `/Loma/${id}`);
    },

    deleteChat(e, id) {
        e.stopPropagation();
        delete this.db.sessions[id];
        if (this.currentId === id) this.startNewChat();
        else { this.saveDb(); this.renderSidebar(); }
    },

    renderSidebar() {
        const list = document.getElementById('chat-list') || document.getElementById('recent-chats-list');
        if (!list) return;

        const sessions = Object.entries(this.db.sessions || {})
            .filter(([, s]) => s && s.messages && s.messages.length > 0)
            .sort((a, b) => (b[1].updated || 0) - (a[1].updated || 0));

        if (sessions.length === 0) {
            list.innerHTML = `<div class="p-3 text-gemini-textMuted text-xs italic bg-gemini-card/20
                                          rounded-xl text-center border border-dashed border-gemini-border/30">
                Start typing to save local threads</div>`;
            return;
        }

        list.innerHTML = sessions.map(([id, s]) => `
            <div class="group flex items-center justify-between w-full px-3 py-2.5 rounded-full
                         hover:bg-gemini-card/80 smooth-transition cursor-pointer"
                 onclick="window.loadChat('${id}')">
                <div class="flex items-center text-slate-300 group-hover:text-white text-sm font-medium truncate">
                    <i class="fa-regular fa-message mr-2 text-slate-500"></i>
                    <span class="truncate">${(s.title || 'Session').replace(/</g,'&lt;')}</span>
                </div>
                <button onclick="window.deleteChat(event,'${id}')"
                    class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400
                           p-1.5 rounded-md smooth-transition">
                    <i class="fa-solid fa-trash text-xs"></i>
                </button>
            </div>`).join('');
    },

    saveDb() {
        localStorage.setItem('loma_db', JSON.stringify(this.db));
        this.syncToDrive();
    },

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
        list.innerHTML = caps.map(c => `
            <div class="flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-emerald-400 text-[9px]"></i>
                <span class="truncate">${c.title}</span>
            </div>`).join('');
    },

    // ── Firebase / Google Auth ────────────────────────────────────────────
    _initFirebase() {
        const fbApp  = initializeApp(firebaseConfig);
        const auth   = getAuth(fbApp);
        const prov   = new GoogleAuthProvider();
        prov.addScope('https://www.googleapis.com/auth/drive.file');

        // Sign-in buttons (multiple entry points)
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
        window.signInWithGoogle        = signIn;
        window.signInAndConnectDrive   = signIn;

        onAuthStateChanged(auth, async user => {
            if (!user) {
                this.isEngineReady = false;
                const gate = document.getElementById('auth-gate');
                if (gate) gate.classList.remove('hidden');
                return;
            }

            this.isEngineReady = true;

            const gate = document.getElementById('auth-gate');
            if (gate) gate.classList.add('hidden');

            // Update UI
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

            // Drive sync
            const driveBtn   = document.getElementById('drive-status-label');
            const driveIcon  = document.getElementById('drive-status-icon');
            const loginBtn   = document.getElementById('google-login-btn');
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
                    if (remote.sessions)  this.db.sessions = { ...remote.sessions, ...this.db.sessions };
                    if (remote.memories)  { this.personalMemories = remote.memories; localStorage.setItem('envizion_memories', JSON.stringify(remote.memories)); }
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

// ── Globals for HTML onclick handlers ────────────────────────────────────────
window.loadChat         = id          => State.loadChat(id);
window.deleteChat       = (e, id)     => State.deleteChat(e, id);
window.startNewChatSession = ()       => State.startNewChat();
window.loadHistoricalSession = id     => State.loadChat(id);
window.deleteHistoricalSession = (e, id) => State.deleteChat(e, id);
window.clearPersonalMemory = ()       => {
    State.personalMemories = [];
    localStorage.removeItem('envizion_memories');
};
window.exportRLHFDataset = () => Trainer.exportAll();

// ── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => State.init());