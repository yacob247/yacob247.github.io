lucide.createIcons();

        const dashboardPage = document.getElementById('dashboard-page');
        const boardDetailPage = document.getElementById('board-detail-page');
        const backBtn = document.getElementById('back-btn');
        const detailTitle = document.getElementById('detail-title');
        const detailTitleLarge = document.getElementById('detail-title-large');
        const detailHeroImage = document.getElementById('detail-hero-image');
        const modalOverlay = document.getElementById('modal-overlay');
        const pageTitle = document.getElementById('page-title');
        const pageSubtitle = document.getElementById('page-subtitle');
        const primaryActionBtn = document.getElementById('primary-action-btn');

        const DB_NAME = 'envizion_workspace_db';
        const DB_VER = 1;
        const STORAGE_KEYS = {
            recents: 'envizion_recents',
            notifications: 'envizion_notifications',
            appsScript: 'envizion_apps_script_url',
            extensions: 'envizion_extensions'
        };
        const gradients = [
            'from-neutral-800 to-neutral-700',
            'from-neutral-900 to-neutral-700',
            'from-stone-800 to-neutral-700',
            'from-zinc-800 to-neutral-600'
        ];
        const icons = ['layout-grid', 'folder-open', 'link', 'image', 'box', 'layers', 'star'];

        let db = null;
        let projects = [];
        let currentPage = 'boards';

        function openDB() {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open(DB_NAME, DB_VER);
                req.onupgradeneeded = e => {
                    const d = e.target.result;
                    if (!d.objectStoreNames.contains('projects')) d.createObjectStore('projects', { keyPath: 'id' });
                };
                req.onsuccess = e => { db = e.target.result; resolve(db); };
                req.onerror = e => reject(e.target.error);
            });
        }
        function idbGetAll(store) {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(store, 'readonly');
                const req = tx.objectStore(store).getAll();
                req.onsuccess = e => resolve(e.target.result);
                req.onerror = e => reject(e.target.error);
            });
        }
        function idbPut(store, val) {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(store, 'readwrite');
                tx.objectStore(store).put(val);
                tx.oncomplete = resolve;
                tx.onerror = e => reject(e.target.error);
            });
        }
        function idbDelete(store, key) {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(store, 'readwrite');
                tx.objectStore(store).delete(key);
                tx.oncomplete = resolve;
                tx.onerror = e => reject(e.target.error);
            });
        }

        function readJSON(key, fallback) {
            try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
            catch { return fallback; }
        }
        function writeJSON(key, value) {
            localStorage.setItem(key, JSON.stringify(value));
        }
        function escapeHTML(value) {
            return String(value ?? '').replace(/[&<>"']/g, ch => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
            }[ch]));
        }
        function getTimeAgo(ts) {
            const diff = Date.now() - (typeof ts === 'number' ? ts : new Date(ts).getTime());
            const mins = Math.floor(diff / 60000);
            if (mins < 1) return 'Just now';
            if (mins < 60) return `${mins}m ago`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return `${hrs}h ago`;
            return `${Math.floor(hrs / 24)}d ago`;
        }

        function openModal() {
            modalOverlay.classList.remove('hidden');
            document.getElementById('board-name-input').focus();
        }
        function closeModal() {
            modalOverlay.classList.add('hidden');
            document.getElementById('board-name-input').value = '';
        }
        async function createBoard() {
            const name = document.getElementById('board-name-input').value.trim() || 'Untitled Board';
            const record = {
                id: 'board-' + Date.now().toString(36),
                name,
                created: Date.now(),
                updated: Date.now(),
                type: 'playground',
                source: 'local',
                starred: false,
                gradient: gradients[Math.floor(Math.random() * gradients.length)],
                icon: icons[Math.floor(Math.random() * icons.length)]
            };
            await idbPut('projects', record);
            projects.unshift(record);
            closeModal();
            renderBoards();
            await pushNotification('Board created', `${name} is ready in the Playground.`, 'board');
            showPage('boards');
        }

        function projectCard(proj, listContext = 'boards') {
            const card = document.createElement('div');
            card.className = 'board-card h-[200px] bg-card rounded-[16px] overflow-hidden flex flex-col border border-neutral-600/5 hover:border-neutral-600/20 cursor-pointer group';
            card.dataset.boardId = proj.id;
            card.innerHTML = `
                <div class="flex-1 relative overflow-hidden">
                    <div class="w-full h-full bg-gradient-to-br ${proj.gradient || 'from-neutral-800 to-neutral-700'} opacity-70"></div>
                    <div class="absolute left-4 bottom-4 text-xs text-neutral-100/80 flex items-center gap-2">
                        <i data-lucide="${proj.icon || 'layout-grid'}" class="w-4 h-4"></i>
                        ${proj.type === 'playground' ? 'Playground board' : 'Workspace source'}
                    </div>
                </div>
                <div class="p-3 bg-card flex items-center gap-2">
                    <div class="flex-1 min-w-0">
                        <h3 class="text-xs font-semibold text-neutral-100 truncate">${escapeHTML(proj.name)}</h3>
                        <p class="text-[10px] text-dim">${getTimeAgo(proj.updated || proj.created)}</p>
                    </div>
                    <button title="Star" class="p-1 hover:text-neutral-300 text-dim rounded ${proj.starred ? 'text-neutral-100' : ''}" onclick="event.stopPropagation(); toggleStar('${proj.id}')">
                        <i data-lucide="star" class="w-3.5 h-3.5"></i>
                    </button>
                    ${listContext === 'boards' ? `
                    <button title="Delete" class="opacity-0 group-hover:opacity-100 transition p-1 hover:text-neutral-300 text-dim rounded" onclick="event.stopPropagation(); deleteBoard('${proj.id}')">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>` : ''}
                </div>
            `;
            card.addEventListener('click', () => openBoard(proj));
            return card;
        }
        function renderCards(targetId, items, emptyText) {
            const target = document.getElementById(targetId);
            target.innerHTML = '';
            if (!items.length) {
                target.innerHTML = `<div class="col-span-full text-center py-16 border border-dashed border-neutral-600/10 rounded-2xl text-sm text-dim">${emptyText}</div>`;
                lucide.createIcons();
                return;
            }
            items.forEach(item => target.appendChild(projectCard(item, targetId === 'boards-grid' ? 'boards' : 'list')));
            lucide.createIcons();
        }
        function renderBoards() {
            document.querySelectorAll('#boards-grid [data-board-id]').forEach(card => card.remove());
            const createBtn = document.getElementById('create-board-btn');
            projects
                .slice()
                .sort((a, b) => (b.updated || b.created) - (a.updated || a.created))
                .forEach(project => createBtn.insertAdjacentElement('afterend', projectCard(project)));
            lucide.createIcons();
        }
        async function toggleStar(id) {
            const proj = projects.find(p => p.id === id);
            if (!proj) return;
            proj.starred = !proj.starred;
            proj.updated = Date.now();
            await idbPut('projects', proj);
            renderCurrentPage();
        }
        async function deleteBoard(id) {
            await idbDelete('projects', id);
            projects = projects.filter(p => p.id !== id);
            writeJSON(STORAGE_KEYS.recents, readJSON(STORAGE_KEYS.recents, []).filter(recentId => recentId !== id));
            renderCurrentPage();
        }

        function addRecent(id) {
            const next = [id, ...readJSON(STORAGE_KEYS.recents, []).filter(item => item !== id)].slice(0, 16);
            writeJSON(STORAGE_KEYS.recents, next);
        }
        async function openBoard(proj) {
            addRecent(proj.id);
            proj.updated = Date.now();
            await idbPut('projects', proj);
            detailTitle.textContent = proj.name;
            detailTitleLarge.textContent = proj.name;
            detailHeroImage.className = `w-full h-56 rounded-2xl border border-neutral-600/10 mb-8 shadow-2xl overflow-hidden relative bg-gradient-to-br ${proj.gradient || 'from-neutral-800 to-neutral-700'}`;
            dashboardPage.style.opacity = '0';
            dashboardPage.style.pointerEvents = 'none';
            setTimeout(() => {
                dashboardPage.classList.add('hidden');
                boardDetailPage.classList.remove('hidden');
                void boardDetailPage.offsetWidth;
                boardDetailPage.classList.add('fade-in');
                lucide.createIcons();
            }, 180);
        }
        backBtn.addEventListener('click', () => {
            boardDetailPage.classList.remove('fade-in');
            boardDetailPage.classList.add('hidden');
            dashboardPage.classList.remove('hidden');
            void dashboardPage.offsetWidth;
            dashboardPage.style.opacity = '1';
            dashboardPage.style.pointerEvents = 'auto';
            renderCurrentPage();
        });

        function showPage(page) {
            currentPage = page;
            document.querySelectorAll('.dashboard-section').forEach(section => section.classList.add('hidden'));
            document.getElementById(`section-${page}`)?.classList.remove('hidden');
            document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === page));
            const labels = {
                boards: ['Boards', '- Personal Workspace'],
                recents: ['Recents', '- Opened by you'],
                starred: ['Starred', '- Saved by you'],
                notifications: ['Notifications', '- Google Apps Script ready'],
                playground: ['Playground', '- Files, links, Drive previews'],
                discover: ['Discover', '- Add sources to the playground'],
                extensions: ['Extensions', '- Local settings'],
                usage: ['Usage', '- Browser storage overview']
            };
            pageTitle.textContent = labels[page]?.[0] || 'Boards';
            pageSubtitle.textContent = labels[page]?.[1] || '- Personal Workspace';
            primaryActionBtn.innerHTML = page === 'playground'
                ? '<i data-lucide="arrow-right" class="w-3.5 h-3.5"></i> Open Playground'
                : '<i data-lucide="plus" class="w-3.5 h-3.5"></i> New Board';
            primaryActionBtn.onclick = page === 'playground' ? () => { window.location.href = 'envizion_playground.html'; } : openModal;
            renderCurrentPage();
        }
        function renderCurrentPage() {
            if (currentPage === 'boards') renderBoards();
            if (currentPage === 'recents') renderRecents();
            if (currentPage === 'starred') renderStarred();
            if (currentPage === 'notifications') renderNotifications();
            if (currentPage === 'discover') renderDiscover();
            if (currentPage === 'extensions') renderExtensions();
            if (currentPage === 'usage') renderUsage();
            lucide.createIcons();
        }
        function renderRecents() {
            const recentIds = readJSON(STORAGE_KEYS.recents, []);
            renderCards('recents-list', recentIds.map(id => projects.find(p => p.id === id)).filter(Boolean), 'No recent boards yet. Open a board and it will appear here.');
        }
        function renderStarred() {
            renderCards('starred-list', projects.filter(p => p.starred), 'Nothing starred yet. Use the star on any board to keep it here.');
        }
        function renderDiscover() {
            document.getElementById('discover-list').innerHTML = [
                discoverCard('infinity', 'Playground', 'Open the single environment for local files, links, Google Drive previews, notes, media, and planning.', 'Open Playground', "window.location.href='envizion_playground.html'"),
                discoverCard('folder-open', 'Local files', 'Use the Playground to add files from a laptop, desktop, PC folders, or removable storage without a server.', 'Open Playground', "window.location.href='envizion_playground.html'"),
                discoverCard('cloud', 'Drive and Docs links', 'Paste Google Drive, Docs, Sheets, Slides, or any URL into the Playground so it presents there while staying stored in Drive.', 'Open Playground', "window.location.href='envizion_playground.html'")
            ].join('');
        }
        function discoverCard(icon, title, body, action, onclick) {
            return `<div class="bg-card border border-neutral-600/10 rounded-2xl p-5 flex flex-col min-h-[210px]">
                <div class="w-10 h-10 rounded-xl bg-neutral-600/20 flex items-center justify-center mb-4"><i data-lucide="${icon}" class="w-5 h-5"></i></div>
                <h3 class="text-sm font-semibold text-neutral-100 mb-2">${title}</h3>
                <p class="text-xs text-dim leading-relaxed mb-5">${body}</p>
                <button onclick="${onclick}" class="mt-auto text-left text-xs text-neutral-300 font-semibold">${action}</button>
            </div>`;
        }
        function renderExtensions() {
            const ext = readJSON(STORAGE_KEYS.extensions, { previews: true, drive: true, appScript: true });
            const item = (key, icon, title, body) => `<label class="bg-card border border-neutral-600/10 rounded-2xl p-5 flex flex-col gap-4 cursor-pointer">
                <div class="flex items-center justify-between">
                    <i data-lucide="${icon}" class="w-5 h-5"></i>
                    <input type="checkbox" ${ext[key] ? 'checked' : ''} onchange="setExtension('${key}', this.checked)">
                </div>
                <div><h3 class="text-sm font-semibold text-neutral-100 mb-2">${title}</h3><p class="text-xs text-dim leading-relaxed">${body}</p></div>
            </label>`;
            document.getElementById('extensions-list').innerHTML = [
                item('previews', 'eye', 'Preview cards', 'Show files, URLs, documents, media, and models as visual cards inside the Playground.'),
                item('drive', 'cloud', 'Drive presentation', 'Allow Google Drive and Google Docs links to appear as preview sources inside the Playground.'),
                item('appScript', 'bell', 'Apps Script notifications', 'Send notification events to the saved Google Apps Script web app URL.')
            ].join('');
        }
        function setExtension(key, value) {
            const ext = readJSON(STORAGE_KEYS.extensions, { previews: true, drive: true, appScript: true });
            ext[key] = value;
            writeJSON(STORAGE_KEYS.extensions, ext);
        }
        function renderUsage() {
            const notifications = readJSON(STORAGE_KEYS.notifications, []);
            const stats = [
                ['layout-grid', projects.length, 'Boards'],
                ['star', projects.filter(p => p.starred).length, 'Starred'],
                ['clock', readJSON(STORAGE_KEYS.recents, []).length, 'Recents'],
                ['bell', notifications.length, 'Notifications']
            ];
            document.getElementById('usage-list').innerHTML = stats.map(([icon, count, label]) => `
                <div class="bg-card border border-neutral-600/10 rounded-2xl p-5">
                    <i data-lucide="${icon}" class="w-5 h-5 mb-5"></i>
                    <p class="text-3xl font-bold text-neutral-100">${count}</p>
                    <p class="text-xs text-dim mt-1">${label}</p>
                </div>
            `).join('');
        }

        async function pushNotification(title, message, kind = 'workspace') {
            const note = { id: 'note-' + Date.now().toString(36), title, message, kind, created: Date.now() };
            const notifications = [note, ...readJSON(STORAGE_KEYS.notifications, [])].slice(0, 50);
            writeJSON(STORAGE_KEYS.notifications, notifications);
            document.getElementById('notification-count').textContent = notifications.length;
            const ext = readJSON(STORAGE_KEYS.extensions, { appScript: true });
            const url = localStorage.getItem(STORAGE_KEYS.appsScript);
            if (ext.appScript && url) {
                try {
                    await fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(note) });
                } catch (err) {
                    console.warn('Apps Script notification failed', err);
                }
            }
            if (currentPage === 'notifications') renderNotifications();
        }
        function renderNotifications() {
            const input = document.getElementById('apps-script-url');
            if (input) input.value = localStorage.getItem(STORAGE_KEYS.appsScript) || '';
            const notifications = readJSON(STORAGE_KEYS.notifications, []);
            document.getElementById('notification-count').textContent = notifications.length;
            document.getElementById('notifications-list').innerHTML = notifications.length ? notifications.map(note => `
                <div class="bg-card border border-neutral-600/10 rounded-2xl p-4 flex gap-3">
                    <div class="w-9 h-9 rounded-xl bg-neutral-600/20 flex items-center justify-center shrink-0"><i data-lucide="bell" class="w-4 h-4"></i></div>
                    <div>
                        <p class="text-sm font-semibold text-neutral-100">${escapeHTML(note.title)}</p>
                        <p class="text-xs text-dim mt-1">${escapeHTML(note.message)}</p>
                        <p class="text-[10px] text-neutral-100/30 mt-2">${getTimeAgo(note.created)}</p>
                    </div>
                </div>
            `).join('') : '<div class="text-center py-16 border border-dashed border-neutral-600/10 rounded-2xl text-sm text-dim">No notifications yet.</div>';
        }
        function saveAppsScriptUrl() {
            const input = document.getElementById('apps-script-url');
            localStorage.setItem(STORAGE_KEYS.appsScript, input.value.trim());
            pushNotification('Apps Script saved', 'Notification webhook is stored locally in this browser.', 'settings');
        }
        function sendTestNotification() {
            pushNotification('Test notification', 'Envizion sent this through the local notification system.', 'test');
        }
        function clearNotifications() {
            writeJSON(STORAGE_KEYS.notifications, []);
            renderNotifications();
        }

        function setBoardType(type) {
            document.getElementById('type-playground').className = type === 'playground'
                ? 'flex items-center gap-2 p-3 rounded-xl border border-neutral-600/40 bg-neutral-700/10 text-neutral-300 text-xs font-medium transition-all'
                : 'flex items-center gap-2 p-3 rounded-xl border border-neutral-600/10 bg-neutral-800/5 text-dim text-xs font-medium transition-all hover:border-neutral-600/20 hover:text-neutral-100';
        }
        async function createBoardAndOpen() { await createBoard(); }

        function openURLModal() {
            const ov = document.getElementById('url-modal-overlay');
            ov.style.display = 'flex';
            setTimeout(() => document.getElementById('url-modal-input').focus(), 50);
        }
        function closeURLModal() {
            document.getElementById('url-modal-overlay').style.display = 'none';
            document.getElementById('url-modal-input').value = '';
        }
        function openURLInPlayground() {
            const url = document.getElementById('url-modal-input').value.trim();
            if (!url) return;
            closeURLModal();
            const encoded = encodeURIComponent(url);
            window.location.href = `envizion_playground.html?openurl=${encoded}`;
        }
        function openLocalFilePicker() {
            document.getElementById('local-file-input').click();
        }
        function handleLocalFileOpen(input) {
            if (!input.files || !input.files.length) return;
            // Store file names in sessionStorage as hint; Playground reads them via its own file input
            window.location.href = 'envizion_playground.html?action=openfile';
        }

        modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
        document.getElementById('url-modal-overlay').addEventListener('click', e => { if (e.target === document.getElementById('url-modal-overlay')) closeURLModal(); });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') { closeModal(); closeURLModal(); }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
                e.preventDefault();
                openModal();
            }
        });
        document.getElementById('board-search').addEventListener('input', e => {
            const q = e.target.value.toLowerCase();
            document.querySelectorAll('#boards-grid [data-board-id]').forEach(card => {
                const name = card.querySelector('h3').textContent.toLowerCase();
                card.style.display = name.includes(q) ? '' : 'none';
            });
        });

        (async () => {
            await openDB();
            projects = await idbGetAll('projects');
            projects.sort((a, b) => (b.updated || b.created) - (a.updated || a.created));
            document.getElementById('notification-count').textContent = readJSON(STORAGE_KEYS.notifications, []).length;
            showPage('boards');
        })();

(function() {
    const upBtn = document.getElementById('envizion-scroll-up-btn');
    const folderBtn = document.getElementById('envizion-folder-nav-btn');

    function checkScrollPosition() {
        // Calculate document coordinates and viewport dimensions
        const windowHeight = window.innerHeight;
        const scrollY = window.scrollY || window.pageYOffset;
        const documentHeight = document.documentElement.scrollHeight;

        // Triggers visibility when user is within 40px of the absolute page bottom
        if ((windowHeight + scrollY) >= (documentHeight - 40)) {
            upBtn.classList.add('visible-at-bottom');
            folderBtn.classList.add('visible-at-bottom');
        } else {
            upBtn.classList.remove('visible-at-bottom');
            folderBtn.classList.remove('visible-at-bottom');
        }
    }

    window.addEventListener('scroll', checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);
    // Initial run to verify height state on short pages
    document.addEventListener('DOMContentLoaded', checkScrollPosition);
    checkScrollPosition();
})();

(function(){
  // ── VAST TAG URLs ─────────────────────────────────────────────
  var VAST_MONETAG = "https://subtle-injury.com/dSmuFnz.dgGMNbvuZHGRUK/Perm/9kubZVUelxkEPhTOc/zoNBD/A/wAMfDHkLtTN_zgMO0YMiDwADxqMDwE";
  var VAST_HILLTOP = "//relieved-understanding.com/b.XuVVsydZGnl/0IYZWtcM/telmk9/udZhUml/kSPeTIcGzzMnzIkB5/OJTRMkt-N_zkMoz/O/Tmkr5MNEwH";
  var VAST = VAST_HILLTOP || VAST_MONETAG;
  // ─────────────────────────────────────────────────────────────

  /* ── Inline outstream player ── */
  var outstreamReady = false, outstreamPlayer;
  var outSkip  = document.getElementById('evz-outstream-skip');
  var outTimer, outElapsed = 0;

  function initOutstream(){
    if(typeof videojs==='undefined'||typeof google==='undefined'){setTimeout(initOutstream,400);return;}
    if(outstreamReady) return;
    outstreamPlayer = videojs('evz-outstream-vid',{controls:false,muted:true,autoplay:true,fluid:false,width:640,height:360});
    outstreamPlayer.ima({adTagUrl:VAST});
    outstreamPlayer.on('adstart',function(){
      outElapsed=0; outSkip.style.display='none';
      outTimer=setInterval(function(){
        outElapsed++;
        if(outElapsed>=10){outSkip.style.display='block';clearInterval(outTimer);}
      },1000);
    });
    outstreamPlayer.on('adend',function(){clearInterval(outTimer);collapseOutstream();});
    outstreamPlayer.on('aderror',function(){clearInterval(outTimer);collapseOutstream();});
    outstreamPlayer.ready(function(){outstreamPlayer.play().catch(function(){});});
    outstreamReady=true;
  }

  function collapseOutstream(){
    var wrap=document.getElementById('evz-outstream-inline');
    if(wrap) wrap.classList.add('collapsed');
    try{ outstreamPlayer.pause(); }catch(e){}
  }
  outSkip.addEventListener('click',collapseOutstream);
  document.getElementById('evz-outstream-close').addEventListener('click',collapseOutstream);

  /* ── Rewarded gate player ── */
  var rewardedReady=false, rewardedPlayer;
  var rewardedOverlay = document.getElementById('evz-rewarded-overlay');
  var rewardedCountdown = document.getElementById('evz-rewarded-countdown');
  var rewardedSkipBtn = document.getElementById('evz-rewarded-skip-btn');
  var pendingDownloadHref = null;
  var rewardTimer, rewardElapsed;

  function initRewarded(){
    if(typeof videojs==='undefined'||typeof google==='undefined'){setTimeout(initRewarded,400);return;}
    if(rewardedReady) return;
    rewardedPlayer = videojs('evz-rewarded-vid',{controls:false,muted:true,autoplay:false,fluid:false,width:520,height:292});
    rewardedPlayer.ima({adTagUrl:VAST});
    rewardedPlayer.on('adstart',function(){
      rewardElapsed=0; rewardedSkipBtn.style.display='none';
      rewardTimer=setInterval(function(){
        rewardElapsed++;
        var left=30-rewardElapsed;
        rewardedCountdown.textContent=left>0?left+'s':'';
        if(rewardElapsed>=30){
          clearInterval(rewardTimer);
          rewardedSkipBtn.style.display='block';
          rewardedCountdown.textContent='';
          rewardedSkipBtn.textContent='Download Now ↓';
        }
      },1000);
    });
    rewardedPlayer.on('adend',function(){
      clearInterval(rewardTimer);
      closeRewarded();
    });
    rewardedPlayer.on('aderror',function(){clearInterval(rewardTimer);closeRewarded();});
    rewardedReady=true;
  }

  function openRewarded(href){
    pendingDownloadHref=href;
    rewardedOverlay.classList.add('active');
    rewardedCountdown.textContent='30s';
    rewardedSkipBtn.style.display='none';
    if(rewardedReady){
      try{rewardedPlayer.ima.requestAds();rewardedPlayer.play();}catch(e){closeRewarded();}
    }
  }

  function closeRewarded(){
    rewardedOverlay.classList.remove('active');
    try{rewardedPlayer.pause();}catch(e){}
    if(pendingDownloadHref){window.location.href=pendingDownloadHref;pendingDownloadHref=null;}
  }

  rewardedSkipBtn.addEventListener('click',closeRewarded);

  /* ── Hook download triggers ── */
  window.addEventListener('load',function(){
    initOutstream();
    initRewarded();

    var dlSelectors=[
      'a[download]','a[href*="download"]','a[href*=".zip"]',
      'a[href*=".exe"]','a[href*=".pdf"]',
      'button[id*="download"]','button[class*="download"]',
      '.download-btn','#download-btn','[data-action="download"]'
    ];
    document.querySelectorAll(dlSelectors.join(',')).forEach(function(el){
      el.addEventListener('click',function(e){
        e.preventDefault();
        var href=(el.tagName==='A'&&el.href)?el.href:null;
        openRewarded(href);
      });
    });
  });
})();

(function(){
  setInterval(function(){
    if(document.hidden)return;
    document.querySelectorAll('.evz-col-box iframe').forEach(function(f){
      f.src=f.src.split('?')[0]+'?_t='+Date.now();
    });
  },45000);
})();

(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement,document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function() {
  var INDEX = null, LOADING = false;

  function loadIndex(cb) {
    if (INDEX) { cb(); return; }
    if (LOADING) { setTimeout(function() { loadIndex(cb); }, 100); return; }
    LOADING = true;
    fetch('/search-index.json')
      .then(function(r) { return r.json(); })
      .then(function(d) { INDEX = d; LOADING = false; cb(); })
      .catch(function() {
        INDEX = [];
        LOADING = false;
        var s = document.getElementById('ez-search-status');
        if (s) s.textContent = 'Search index not found.';
      });
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function highlight(text, query) {
    if (!text) return '';
    var words = query.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    var CONTEXT = 60, found = [];
    words.forEach(function(w) {
      var wl = w.toLowerCase(), tl = text.toLowerCase(), i = 0;
      while ((i = tl.indexOf(wl, i)) !== -1) {
        found.push({ start: i, end: i + wl.length });
        i += wl.length;
      }
    });
    if (!found.length) return '';
    found.sort(function(a, b) { return a.start - b.start; });
    var wins = [];
    found.forEach(function(f) {
      var ws = Math.max(0, f.start - CONTEXT), we = Math.min(text.length, f.end + CONTEXT);
      if (wins.length && ws <= wins[wins.length-1].end) {
        wins[wins.length-1].end = Math.max(wins[wins.length-1].end, we);
        wins[wins.length-1].matches.push(f);
      } else {
        wins.push({ start: ws, end: we, matches: [f] });
      }
    });
    var parts = [];
    wins.slice(0, 3).forEach(function(win) {
      var slice = text.slice(win.start, win.end), off = win.start, h = '', cur = 0;
      win.matches.forEach(function(f) {
        var ls = f.start - off, le = f.end - off;
        if (ls < 0 || le > slice.length) return;
        h += escHtml(slice.slice(cur, ls));
        h += '<mark style="background:#4f8ef7;color:#fff;border-radius:2px;padding:0 2px;">' + escHtml(slice.slice(ls, le)) + '</mark>';
        cur = le;
      });
      h += escHtml(slice.slice(cur));
      parts.push((win.start > 0 ? '...' : '') + h + (win.end < text.length ? '...' : ''));
    });
    return parts.join(' | ');
  }

  function score(page, words) {
    var s = 0;
    var tl = (page.title || '').toLowerCase();
    var hl = (page.headings || []).join(' ').toLowerCase();
    var bl = (page.body || '').toLowerCase();
    var dl = (page.desc || '').toLowerCase();
    words.forEach(function(w) {
      var wl = w.toLowerCase();
      if (tl.indexOf(wl) > -1) s += 10;
      if (dl.indexOf(wl) > -1) s += 5;
      if (hl.indexOf(wl) > -1) s += 4;
      if (bl.indexOf(wl) > -1) s += 1;
    });
    return s;
  }

  window.ezSearch = function(q) {
    var status = document.getElementById('ez-search-status');
    var results = document.getElementById('ez-search-results');
    if (!q.trim()) { status.textContent = 'Type to search...'; results.innerHTML = ''; return; }
    status.textContent = 'Searching...';
    results.innerHTML = '';
    loadIndex(function() {
      var words = q.trim().split(/\s+/).filter(Boolean);
      var hits = INDEX.map(function(p) { return { page: p, s: score(p, words) }; })
        .filter(function(x) { return x.s > 0; })
        .sort(function(a, b) { return b.s - a.s; })
        .slice(0, 12);
      if (!hits.length) { status.textContent = 'No results for "' + escHtml(q) + '"'; return; }
      status.textContent = hits.length + ' result' + (hits.length === 1 ? '' : 's') + ' for "' + q + '"';
      results.innerHTML = hits.map(function(h) {
        var p = h.page, snippet = highlight(p.body, q) || highlight(p.desc, q) || '';
        return '<a href="' + p.url + '" style="display:block;padding:12px 14px;border-radius:8px;background:#1c1c30;border:1px solid #2a2a4a;text-decoration:none;color:inherit;">'
          + '<div style="font-weight:600;color:#7eb3ff;font-size:14px;margin-bottom:4px;">' + escHtml(p.title) + '</div>'
          + (snippet ? '<div style="font-size:12px;color:#aaa;line-height:1.6;">' + snippet + '</div>' : '')
          + '<div style="font-size:11px;color:#444;margin-top:4px;">' + p.url + '</div>'
          + '</a>';
      }).join('');
    });
  };

  window.ezOpen = function() {
    var ov = document.getElementById('ez-search-overlay');
    ov.style.display = 'flex';
    document.body.style.overflow = 'visible';
    loadIndex(function() {});
    setTimeout(function() { document.getElementById('ez-search-input').focus(); }, 60);
  };

  window.ezClose = function() {
    document.getElementById('ez-search-overlay').style.display = 'none';
    document.body.style.overflow = '';
  };

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') ezClose();
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); ezOpen(); }
  });

  document.getElementById('ez-search-overlay').addEventListener('click', function(e) {
    if (e.target === this) ezClose();
  });
}());

(function() {
  var toggle = document.getElementById('info-panel-toggle');
  var drawer = document.getElementById('info-panel-drawer');
  if (!toggle || !drawer) return;
  toggle.addEventListener('click', function() {
    var open = drawer.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.querySelector('.ipt-label').textContent = open ? 'Hide Info' : 'Page Info';
  });
})();

(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function() {
  if (window.innerWidth <= 768) return;

  // Left Sidebar with Direct Links
  const leftSidebar = document.createElement('div');
  leftSidebar.className = 'ad-sidebar ad-sidebar-left';
  leftSidebar.innerHTML = `
    <button class="ad-sidebar-toggle" aria-label="Toggle Left Ad">Hide Ad</button>
    <div class="ad-sidebar-content">
      <iframe class="ad-sidebar-iframe" src="https://omg10.com/4/11638044" loading="lazy" scrolling="no"></iframe>
      <iframe class="ad-sidebar-iframe" src="https://omg10.com/4/11638043" loading="lazy" scrolling="no"></iframe>
      <iframe class="ad-sidebar-iframe" src="https://omg10.com/4/11638042" loading="lazy" scrolling="no"></iframe>
    </div>
  `;

  // Right Sidebar with Direct Links
  const rightSidebar = document.createElement('div');
  rightSidebar.className = 'ad-sidebar ad-sidebar-right';
  rightSidebar.innerHTML = `
    <button class="ad-sidebar-toggle" aria-label="Toggle Right Ad">Hide Ad</button>
    <div class="ad-sidebar-content">
      <iframe class="ad-sidebar-iframe" src="https://omg10.com/4/11638041" loading="lazy" scrolling="no"></iframe>
      <iframe class="ad-sidebar-iframe" src="https://omg10.com/4/11638040" loading="lazy" scrolling="no"></iframe>
    </div>
  `;

  document.body.appendChild(leftSidebar);
  document.body.appendChild(rightSidebar);

  function setupToggle(sidebar) {
    const btn = sidebar.querySelector('.ad-sidebar-toggle');
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const isCollapsed = sidebar.classList.toggle('collapsed');
      btn.textContent = isCollapsed ? 'Show Ad' : 'Hide Ad';
    });
  }

  setupToggle(leftSidebar);
  setupToggle(rightSidebar);
})();

(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11649331',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11649335',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))
