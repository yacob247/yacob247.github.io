# -*- coding: utf-8 -*-
# PATCH 1E-2: library IndexedDB + overlay panel (module scope)
text = open(r'index.html', 'r', encoding='utf-8').read()
anchor = '// ---------- Tool Database ----------'
assert text.count(anchor) == 1
lib_js = '''    // ---------- FILE LIBRARY: IndexedDB store + panel ----------
    const LIB_DB = 'nexus-library';
    function openLibDB() {
        return new Promise((resolve) => {
            const req = indexedDB.open(LIB_DB, 1);
            req.onupgradeneeded = e => { const db = e.target.result; if (!db.objectStoreNames.contains('items')) db.createObjectStore('items', { keyPath: 'id' }); };
            req.onsuccess = e => resolve(e.target.result);
        });
    }
    window.nexusLibrarySave = async (rec) => {
        const db = await openLibDB();
        rec.id = rec.id || ('lib-' + Date.now() + '-' + Math.floor(Math.random() * 1e6));
        rec.date = rec.date || new Date().toISOString();
        return new Promise(r => { const tx = db.transaction('items', 'readwrite'); tx.objectStore('items').put(rec); tx.oncomplete = r; });
    };
    window.nexusLibraryList = async () => {
        const db = await openLibDB();
        return new Promise(r => { const q = db.transaction('items').objectStore('items').getAll(); q.onsuccess = () => r(q.result || []); });
    };
    window.nexusLibraryDelete = async (id) => {
        const db = await openLibDB();
        return new Promise(r => { const tx = db.transaction('items', 'readwrite'); tx.objectStore('items').delete(id); tx.oncomplete = r; });
    };
    let _libPanel = null;
    async function renderLibraryPanel() {
        const list = _libPanel.querySelector('#lib-list');
        const items = (await window.nexusLibraryList()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        list.innerHTML = '';
        if (!items.length) { list.innerHTML = '<div class="text-center text-sm text-neutral-500 py-10">No files yet. Everything you attach in chat is saved here automatically.</div>'; return; }
        for (const it of items) {
            const icon = it.kind === 'image' ? 'fa-image text-purple-400' : it.kind === 'audio' ? 'fa-music text-orange-400' : it.kind === 'video' ? 'fa-film text-pink-400' : 'fa-file-lines text-slate-400';
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between gap-3 bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3';
            row.innerHTML = '<div class="flex items-center gap-3 min-w-0"><i class="fa-solid ' + icon + '"></i>' +
                '<div class="min-w-0"><div class="text-sm text-white truncate">' + String(it.name).replace(/</g, '&lt;') + '</div>' +
                '<div class="text-[11px] text-neutral-500">' + it.kind + ' · ' + ((it.size || 0) / 1048576).toFixed(2) + ' MB · ' + new Date(it.date).toLocaleString() + '</div></div></div>' +
                '<div class="flex items-center gap-2 shrink-0"><button class="lib-attach px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">Attach</button>' +
                '<button class="lib-del px-2.5 py-1.5 rounded-lg bg-neutral-700 hover:bg-red-600 text-white text-xs">✕</button></div>';
            row.querySelector('.lib-attach').onclick = async () => { await window.nexusAttachFromLibrary(it); _libPanel.classList.add('hidden'); _libPanel.classList.remove('flex'); };
            row.querySelector('.lib-del').onclick = async () => { await window.nexusLibraryDelete(it.id); renderLibraryPanel(); };
            list.appendChild(row);
        }
    }
    document.getElementById('nav-library').addEventListener('click', async () => {
        if (!_libPanel) {
            _libPanel = document.createElement('div');
            _libPanel.className = 'fixed inset-0 z-[100] hidden bg-black/80 backdrop-blur-sm items-center justify-center p-4';
            _libPanel.innerHTML = '<div class="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">' +
                '<div class="flex items-center justify-between px-5 py-4 border-b border-neutral-700/70"><div><h2 class="text-lg font-bold text-white">📚 File Library</h2>' +
                '<p class="text-xs text-neutral-400 mt-0.5">Every file you attach is saved here — click Attach to use it again anytime.</p></div>' +
                '<button id="lib-close" class="px-3 py-1.5 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-semibold">✕</button></div>' +
                '<div id="lib-list" class="overflow-y-auto p-5 space-y-2"></div></div>';
            document.body.appendChild(_libPanel);
            _libPanel.querySelector('#lib-close').onclick = () => { _libPanel.classList.add('hidden'); _libPanel.classList.remove('flex'); };
            _libPanel.addEventListener('click', e => { if (e.target === _libPanel) { _libPanel.classList.add('hidden'); _libPanel.classList.remove('flex'); } });
        }
        _libPanel.classList.remove('hidden'); _libPanel.classList.add('flex');
        await renderLibraryPanel();
    });

'''
text = text.replace(anchor, lib_js + anchor, 1)
open(r'index.html', 'w', encoding='utf-8', newline='').write(text)
print('PATCH 1E-2 OK')
