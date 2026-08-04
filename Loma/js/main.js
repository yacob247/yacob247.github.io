import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { UI } from './ui.js';
import { Engine } from './engine.js';
import { Trainer } from './training.js';

export const State = {
    db: JSON.parse(localStorage.getItem('loma_db') || '{"sessions":{}}'),
    currentId: Date.now().toString(),
    useWeb: false,
    gDriveToken: null,
    driveFileId: null,

    init() {
        UI.init();
        if(!this.db.sessions[this.currentId]) this.db.sessions[this.currentId] = { title: "New Session", messages: [] };
        this.renderSidebar();
        this.bindEvents();
        this.initFirebase();
    },

    bindEvents() {
        const input = document.getElementById('prompt-input');
        input.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'; });
        input.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); Engine.submitPrompt(); }});
        
        document.getElementById('submit-prompt-btn').onclick = () => Engine.submitPrompt();
        document.getElementById('stop-btn').onclick = () => Engine.abort();
        document.getElementById('btn-new-chat').onclick = () => this.startNewChat();
        document.getElementById('btn-export-dpo').onclick = () => Trainer.exportDPO();
        
        document.getElementById('web-toggle').onclick = (e) => {
            this.useWeb = !this.useWeb;
            e.currentTarget.innerHTML = this.useWeb ? '<i class="fa-solid fa-globe text-[#a8c7fa]"></i> Web On' : '<i class="fa-solid fa-globe"></i> Web Off';
            e.currentTarget.className = this.useWeb ? "text-xs text-[#a8c7fa] px-2 py-1 rounded border border-[#a8c7fa]" : "text-xs text-gray-400 hover:text-white px-2 py-1 rounded";
        };
    },

    startNewChat() {
        this.currentId = Date.now().toString(); 
        this.db.sessions[this.currentId] = {title: "New Session", messages: []}; 
        document.getElementById('chat-stream').innerHTML = `<div class="text-center text-gray-500 mt-20" id="empty-state"><i class="fa-solid fa-bolt text-4xl text-[#a8c7fa] mb-4 opacity-50"></i><p>Omnipotent Engine Online. Awaiting commands.</p></div>`; 
        document.getElementById('chat-title').innerText = "New Session"; 
        this.saveDb(); 
        this.renderSidebar(); 
    },

    loadChat(id) {
        this.currentId = id; 
        document.getElementById('chat-title').innerText = this.db.sessions[id].title; 
        document.getElementById('chat-stream').innerHTML = ''; 
        this.db.sessions[id].messages.forEach(m => { 
            if(m.role === 'user') UI.appendBubble('user', m.content); 
            else UI.appendBubble('assistant', UI.processContent(m.content)); 
        }); 
    },

    deleteChat(e, id) {
        e.stopPropagation(); delete this.db.sessions[id]; 
        if(this.currentId === id) this.startNewChat(); else { this.saveDb(); this.renderSidebar(); }
    },

    renderSidebar() {
        document.getElementById('chat-list').innerHTML = Object.entries(this.db.sessions).reverse().map(([id, s]) => s.messages.length ? `<div class="group flex justify-between items-center p-2 hover:bg-[#3c4043] rounded-lg cursor-pointer text-gray-300" onclick="window.loadChat('${id}')"><span class="truncate"><i class="fa-regular fa-message mr-2"></i>${s.title}</span><button onclick="window.deleteChat(event, '${id}')" class="opacity-0 group-hover:opacity-100 text-red-400 px-1"><i class="fa-solid fa-trash"></i></button></div>` : '').join('');
    },

    saveDb() {
        localStorage.setItem('loma_db', JSON.stringify(this.db));
        this.syncDbToDrive();
    },

    initFirebase() {
        const app = initializeApp({ apiKey: "AIzaSyDLeM4MrsA1Q8zq7_QcQfTJKk049vOVOO4", authDomain: "envizionwork.firebaseapp.com", projectId: "envizionwork" });
        const auth = getAuth(app);
        const provider = new GoogleAuthProvider(); provider.addScope('https://www.googleapis.com/auth/drive.file');

        document.getElementById('google-login-btn').onclick = async () => {
            try {
                const res = await signInWithPopup(auth, provider);
                const cred = GoogleAuthProvider.credentialFromResult(res);
                if(cred?.accessToken) { this.gDriveToken = cred.accessToken; this.loadDbFromDrive(); }
            } catch(e) { alert("Auth failed."); }
        };

        onAuthStateChanged(auth, async (user) => {
            if(user) {
                document.getElementById('google-login-btn').classList.add('hidden');
                document.getElementById('drive-status').classList.remove('hidden');
                this.loadDbFromDrive();
            }
        });
    },

    async loadDbFromDrive() {
        if(!this.gDriveToken) return;
        try {
            const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("name='loma_db.json' and trashed=false")}`, { headers: { Authorization: `Bearer ${this.gDriveToken}` } });
            const data = await res.json();
            if(data.files && data.files.length > 0) {
                this.driveFileId = data.files[0].id;
                const fRes = await fetch(`https://www.googleapis.com/drive/v3/files/${this.driveFileId}?alt=media`, { headers: { Authorization: `Bearer ${this.gDriveToken}` } });
                const remoteDb = await fRes.json();
                this.db.sessions = { ...remoteDb.sessions, ...this.db.sessions };
            } else { this.syncDbToDrive(); }
            this.renderSidebar();
        } catch(e) {}
    },

    async syncDbToDrive() {
        if(!this.gDriveToken) return;
        try {
            const body = JSON.stringify({ sessions: this.db.sessions, rlhf: Trainer.rlhfData });
            if(this.driveFileId) {
                await fetch(`https://upload.googleapis.com/upload/drive/v3/files/${this.driveFileId}?uploadType=media`, { method: 'PATCH', headers: { Authorization: `Bearer ${this.gDriveToken}`, 'Content-Type': 'application/json' }, body });
            } else {
                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify({name: 'loma_db.json'})], {type: 'application/json'}));
                form.append('file', new Blob([body], {type: 'application/json'}));
                const res = await fetch('https://upload.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: { Authorization: `Bearer ${this.gDriveToken}` }, body: form });
                this.driveFileId = (await res.json()).id;
            }
        } catch(e) {}
    }
};

// Expose Globals for HTML Onclick handlers
window.loadChat = (id) => State.loadChat(id);
window.deleteChat = (e, id) => State.deleteChat(e, id);

document.addEventListener('DOMContentLoaded', () => State.init());