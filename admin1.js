// ─── Token & Config Management ──────────────────────────────
const OWNER = 'yacob247';
const REPO = 'yacob247.github.io';
const PATH = 'reviews-blog/app.js';
const TOKEN_KEY = 'envizion_github_token';

// Retrieve token from sessionStorage or prompt the user
function getGitHubToken() {
  let token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = prompt("Please enter your GitHub Personal Access Token to manage live files:");
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
      updateTokenUI();
    }
  }
  return token;
}

function updateTokenUI() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const statusEl = document.getElementById('token-status');
  if (statusEl) {
    if (token) {
      statusEl.innerHTML = `<span style="color:var(--accent2)">● Connected</span> <button class="btn-add-row" style="margin:0;padding:2px 6px;font-size:0.55rem;" onclick="clearToken()">Disconnect</button>`;
    } else {
      statusEl.innerHTML = `<span style="color:var(--danger)">● Offline</span> <button class="btn-add-row" style="margin:0;padding:2px 6px;font-size:0.55rem;" onclick="promptNewToken()">Connect</button>`;
    }
  }
}

function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  entries = [];
  updateTokenUI();
  refreshSidebar();
  showEmpty();
  showToast("Disconnected from GitHub");
}

function promptNewToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  if (getGitHubToken()) {
    showToast("✓ Connected successfully!");
    syncFromGitHub();
  }
}

// ─── State ─────────────────────────────────────────────────
let entries = [];        // Absolute source of truth (fetched from GitHub)
let currentId = null;    // ID of entry being edited (null = new)
let currentType = 'game'; // 'game' | 'tool'

// ─── Fetch Data directly from GitHub ─────────────────────────
async function syncFromGitHub() {
  const token = getGitHubToken();
  if (!token) {
    showToast("GitHub Token is required to fetch files", true);
    return;
  }

  showToast("Syncing with GitHub...");
  try {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}?cb=${Date.now()}`, {
      headers: { 'Authorization': `token ${token}` }
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch file: ${res.statusText}`);
    }

    const fileData = await res.json();
    const currentContent = decodeURIComponent(escape(atob(fileData.content)));

    // Extract Arrays cleanly using the protection marker
    const marker = "// --- DO NOT EDIT BELOW THIS LINE ---";
    let dataSection = currentContent;
    if (currentContent.includes(marker)) {
      dataSection = currentContent.substring(0, currentContent.indexOf(marker));
    }

    const extractData = new Function(`${dataSection}; return { remoteGames: typeof GAMES !== 'undefined' ? GAMES : [], remoteTools: typeof TOOLS !== 'undefined' ? TOOLS : [] };`);
    const { remoteGames, remoteTools } = extractData();

    // Map types consistently and store in memory
    const formattedGames = remoteGames.map(g => ({ ...g, type: 'game' }));
    const formattedTools = remoteTools.map(t => ({ ...t, type: 'tool' }));

    entries = [...formattedGames, ...formattedTools];
    
    showToast("✓ Synced with GitHub!");
    refreshSidebar();
    showEmpty();
  } catch (err) {
    showToast("Sync Error: " + err.message, true);
    console.error(err);
  }
}

// ─── Sidebar ───────────────────────────────────────────────
function refreshSidebar() {
  const list = document.getElementById('entry-list');
  const bulkActions = `
    <div style="padding: 10px; border-bottom: 1px solid var(--border); margin-bottom: 10px; display: flex; gap: 5px;">
        <button class="btn btn-danger" style="width: 100%; font-size: 0.7rem; padding: 6px;" onclick="deleteSelected()">🗑️ Delete Selected</button>
        <button class="btn btn-ghost" style="width: auto; font-size: 0.7rem; padding: 6px;" onclick="syncFromGitHub()" title="Sync Fresh Copy">🔄</button>
    </div>
  `;
  const games = entries.filter(e => e.type !== 'tool');
  const tools = entries.filter(e => e.type === 'tool');

  document.getElementById('stat-games').textContent = games.length;
  document.getElementById('stat-tools').textContent = tools.length;
  document.getElementById('stat-total').textContent = entries.length;

  list.innerHTML = bulkActions;

  if (entries.length === 0) {
    const emptyLi = document.createElement('li');
    emptyLi.style.cssText = "padding:1rem 1.5rem;font-size:0.8rem;color:var(--muted);";
    emptyLi.textContent = "No entries found. Try syncing.";
    list.appendChild(emptyLi);
    return;
  }

  if (games.length) {
    const gl = document.createElement('div');
    gl.className = 'nav-section-label';
    gl.textContent = 'Games';
    list.appendChild(gl);
    games.forEach(e => list.appendChild(makeSidebarItem(e)));
  }
  if (tools.length) {
    const tl = document.createElement('div');
    tl.className = 'nav-section-label';
    tl.textContent = 'Tools';
    list.appendChild(tl);
    tools.forEach(e => list.appendChild(makeSidebarItem(e)));
  }
}

function makeSidebarItem(e) {
  const li = document.createElement('li');
  li.className = 'entry-item' + (currentId === e.id ? ' active' : '');
  
  const isTool = e.type === 'tool';
  li.innerHTML = `
    <input type="checkbox" class="batch-delete-check" data-id="${e.id}" onclick="event.stopPropagation()" style="margin-right: 10px; cursor: pointer;">
    <div class="entry-dot" style="background:${isTool ? 'var(--accent2)' : 'var(--accent)'}"></div>
    <div style="display: flex; flex-direction: column; flex-grow: 1; overflow: hidden;" onclick="editEntry('${e.id}')">
        <span class="entry-name">${e.title || e.id}</span>
        <span class="entry-type-badge ${isTool ? 'badge-tool' : 'badge-game'}">${isTool ? 'Tool' : 'Game'}</span>
    </div>
  `;
  return li;
}

// ─── Bulk Deletions ──────────────────────────────────────────
async function performBulkDelete(ids, token) {
  try {
    showToast("Processing bulk deletion...");
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}?cb=${Date.now()}`, {
      headers: { 'Authorization': `token ${token}` }
    });
    const fileData = await res.json();
    const currentContent = decodeURIComponent(escape(atob(fileData.content)));

    const marker = "// --- DO NOT EDIT BELOW THIS LINE ---";
    let dataSection = currentContent;
    let logicSection = "\n" + marker + "\n// Logic was missing!";
    
    if (currentContent.includes(marker)) {
        dataSection = currentContent.substring(0, currentContent.indexOf(marker));
        logicSection = currentContent.substring(currentContent.indexOf(marker));
    }

    const extractData = new Function(`${dataSection}; return { remoteGames: typeof GAMES !== 'undefined' ? GAMES : [], remoteTools: typeof TOOLS !== 'undefined' ? TOOLS : [] };`);
    let { remoteGames, remoteTools } = extractData();

    // Filter out the items to delete
    const finalGames = remoteGames.filter(e => !ids.includes(e.id));
    const finalTools = remoteTools.filter(e => !ids.includes(e.id));

    const newDataText = `const GAMES = ${JSON.stringify(finalGames, null, 2)};\n\nconst TOOLS = ${JSON.stringify(finalTools, null, 2)};\n\n`;
    const newFileContent = newDataText + logicSection;

    const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Admin Bulk Delete: ${ids.length} items`,
        content: btoa(unescape(encodeURIComponent(newFileContent))),
        sha: fileData.sha
      })
    });

    if (response.ok) {
      // Synchronize state immediately
      entries = [...finalGames.map(g => ({...g, type: 'game'})), ...finalTools.map(t => ({...t, type: 'tool'}))];
      showToast(`✓ Successfully deleted ${ids.length} items from GitHub`);
      refreshSidebar();
      showEmpty();
    } else {
       const err = await response.json();
       showToast('GitHub Error: ' + err.message, true);
    }
  } catch (err) {
    showToast('Error: ' + err.message, true);
  }
}

async function deleteSelected() {
  const checkboxes = document.querySelectorAll('.batch-delete-check:checked');
  const idsToDelete = Array.from(checkboxes).map(cb => cb.dataset.id);

  if (idsToDelete.length === 0) {
    showToast("No entries selected", true);
    return;
  }

  const confirmMsg = `Are you sure you want to delete ${idsToDelete.length} selected entries from GitHub?`;
  if (!confirm(confirmMsg)) return;

  const token = getGitHubToken();
  if (!token) return;

  await performBulkDelete(idsToDelete, token);
}

// ─── Toast ─────────────────────────────────────────────────
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  if (t) {
    t.textContent = msg;
    t.className = 'toast show' + (isError ? ' error' : '');
    setTimeout(() => t.className = 'toast', 2500);
  }
}

// ─── Empty state ───────────────────────────────────────────
function showEmpty() {
  currentId = null;
  document.getElementById('topbar-title').textContent = 'Admin Panel';
  document.getElementById('topbar-actions').innerHTML = '';
  document.getElementById('view-area').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🗂</div>
      <div class="empty-title">No entry selected</div>
      <div class="empty-sub">Click "+ New Entry" to add a game or tool, or select an existing entry from the sidebar.</div>
    </div>
  `;
}

// ─── New Entry ─────────────────────────────────────────────
function newEntry() {
  currentId = null;
  currentType = 'game';
  renderForm(null);
  refreshSidebar();
}

// ─── Edit Entry ────────────────────────────────────────────
function editEntry(id) {
  const e = entries.find(x => x.id === id);
  if (!e) return;
  currentId = id;
  currentType = e.type === 'tool' ? 'tool' : 'game';
  renderForm(e);
  refreshSidebar();
}

// ─── Form Rendering ────────────────────────────────────────
const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C', ''];
const GRADE_COLORS = {
  'A+': '#eab308', 'A': '#22c55e', 'A-': '#10b981',
  'B+': '#3b82f6', 'B': '#8b5cf6', 'B-': '#d946ef', 'C': '#ef4444'
};

function renderForm(e) {
  const isNew = !e;
  const isTool = currentType === 'tool';

  document.getElementById('topbar-title').textContent = isNew ? 'New Entry' : `Editing: ${e.title || e.id}`;
  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-ghost" onclick="showEmpty()">Cancel</button>
    ${!isNew ? `<button class="btn btn-danger" onclick="confirmDelete('${e.id}')">Delete</button>` : ''}
    <button class="btn btn-success" onclick="saveForm()">Save Entry</button>
  `;

  const reviewParagraphs = e?.review || [''];
  const pros = e?.pros || [''];
  const cons = e?.cons || [''];
  const features = e?.features || [''];

  document.getElementById('view-area').innerHTML = `
    <div class="form-content">

      <!-- Delete confirm -->
      <div class="delete-confirm" id="delete-confirm">
        <span>⚠️ Delete this entry permanently?</span>
        <button class="btn btn-danger" onclick="deleteEntry('${e?.id}')">Yes, Delete</button>
        <button class="btn btn-ghost" onclick="document.getElementById('delete-confirm').classList.remove('show')">Cancel</button>
      </div>

      <!-- Type toggle -->
      <div class="type-toggle">
        <button class="type-btn ${!isTool ? 'active-game' : ''}" onclick="switchType('game')">🎮 Game</button>
        <button class="type-btn ${isTool ? 'active-tool' : ''}" onclick="switchType('tool')">🔧 Tool</button>
      </div>

      <!-- Core fields -->
      <div class="section-label">Core Info</div>
      <div class="form-grid">
        <div class="field">
          <label>ID <span class="required">*</span></label>
          <input id="f-id" type="text" placeholder="e.g. my-game" value="${e?.id || ''}" oninput="this.value=this.value.toLowerCase().replace(/\\s+/g,'-').replace(/[^a-z0-9-]/g,'')">
          <span class="field-hint">URL-safe slug. No spaces.</span>
        </div>
        <div class="field">
          <label>Title <span class="required">*</span></label>
          <input id="f-title" type="text" placeholder="Display name" value="${escHtml(e?.title || '')}">
        </div>
      </div>

      <div class="form-grid full">
        <div class="field">
          <label>Tagline</label>
          <input id="f-tagline" type="text" placeholder="One-line description" value="${escHtml(e?.tagline || '')}">
        </div>
      </div>

      ${!isTool ? `
      <!-- Game-specific fields -->
      <div class="form-grid triple">
        <div class="field">
          <label>Developer</label>
          <input id="f-dev" type="text" placeholder="Studio name" value="${escHtml(e?.dev || '')}">
        </div>
        <div class="field">
          <label>Year</label>
          <input id="f-year" type="number" placeholder="2024" value="${e?.year || ''}">
        </div>
        <div class="field">
          <label>Genre</label>
          <input id="f-genre" type="text" placeholder="Action-Adventure" value="${escHtml(e?.genre || '')}">
        </div>
      </div>
      <div class="form-grid">
        <div class="field">
          <label>Price</label>
          <input id="f-price" type="text" placeholder="~$30 / Free-to-Play" value="${escHtml(e?.price || '')}">
        </div>
        <div class="field">
          <label>Grade</label>
          <div class="grade-select" id="grade-select">
            ${GRADES.map(g => `
              <button type="button" class="grade-btn ${e?.grade === g ? 'selected' : ''}"
                data-grade="${g}"
                style="${GRADE_COLORS[g] ? `background:${e?.grade === g ? GRADE_COLORS[g] : 'transparent'};${e?.grade === g ? 'border-color:'+GRADE_COLORS[g] : 'color:var(--muted)'};` : ''}"
                onclick="selectGrade(this, '${g}')">
                ${g || 'None'}
              </button>
            `).join('')}
          </div>
          <input type="hidden" id="f-grade" value="${e?.grade || ''}">
        </div>
      </div>
      ` : `
      <!-- Tool-specific fields -->
      <div class="form-grid">
        <div class="field">
          <label>Category</label>
          <input id="f-category" type="text" placeholder="Utilities / AI / Design..." value="${escHtml(e?.category || '')}">
        </div>
        <div class="field">
          <label>Grade (optional)</label>
          <div class="grade-select" id="grade-select">
            ${GRADES.map(g => `
              <button type="button" class="grade-btn ${e?.grade === g ? 'selected' : ''}"
                data-grade="${g}"
                style="${GRADE_COLORS[g] ? `background:${e?.grade === g ? GRADE_COLORS[g] : 'transparent'};${e?.grade === g ? 'border-color:'+GRADE_COLORS[g] : 'color:var(--muted)'};` : ''}"
                onclick="selectGrade(this, '${g}')">
                ${g || 'None'}
              </button>
            `).join('')}
          </div>
          <input type="hidden" id="f-grade" value="${e?.grade || ''}">
        </div>
      </div>
      `}

      <hr class="section-divider">

      <!-- Review paragraphs -->
      <div class="section-label">Review / Description</div>
      <div class="field">
        <label>Paragraphs <span class="field-hint" style="margin-left:.5rem">(one per block)</span></label>
        <div class="dynamic-list" id="review-list">
          ${reviewParagraphs.map((p, i) => reviewRow(p, i)).join('')}
        </div>
        <button class="btn-add-row" onclick="addRow('review-list', reviewRow, reviewIdx)">+ Add Paragraph</button>
      </div>

      <hr class="section-divider">

      ${!isTool ? `
      <!-- Pros & Cons -->
      <div class="section-label">Verdict</div>
      <div class="form-grid">
        <div class="field">
          <label>Strengths (pros)</label>
          <div class="dynamic-list" id="pros-list">
            ${pros.map((p, i) => simpleRow(p, i, 'pro')).join('')}
          </div>
          <button class="btn-add-row" onclick="addRow('pros-list', (v,i)=>simpleRow(v,i,'pro'), prosIdx)">+ Add Pro</button>
        </div>
        <div class="field">
          <label>Weaknesses (cons)</label>
          <div class="dynamic-list" id="cons-list">
            ${cons.map((c, i) => simpleRow(c, i, 'con')).join('')}
          </div>
          <button class="btn-add-row" onclick="addRow('cons-list', (v,i)=>simpleRow(v,i,'con'), consIdx)">+ Add Con</button>
        </div>
      </div>
      ` : `
      <!-- Features -->
      <div class="section-label">Features</div>
      <div class="field">
        <label>Key Features</label>
        <div class="dynamic-list" id="features-list">
          ${features.map((f, i) => simpleRow(f, i, 'feat')).join('')}
        </div>
        <button class="btn-add-row" onclick="addRow('features-list', (v,i)=>simpleRow(v,i,'feat'), featIdx)">+ Add Feature</button>
      </div>
      `}

      <hr class="section-divider">

      <!-- Links -->
      <div class="section-label">Links</div>
      <div class="links-grid">
        ${!isTool ? `
        <div class="field">
          <label>Steam URL</label>
          <input id="f-steam" type="url" placeholder="https://store.steampowered.com/app/..." value="${escHtml(e?.steam || '')}">
        </div>
        <div class="field">
          <label>Epic Games URL</label>
          <input id="f-epic" type="url" placeholder="https://store.epicgames.com/..." value="${escHtml(e?.epic || '')}">
        </div>
        <div class="field">
          <label>GOG URL</label>
          <input id="f-gog" type="url" placeholder="https://www.gog.com/game/..." value="${escHtml(e?.gog || '')}">
        </div>
        ` : ''}
        <div class="field">
          <label>${isTool ? 'Launch / Website URL' : 'Mobile / Website URL'}</label>
          <input id="f-mobile" type="url" placeholder="https://..." value="${escHtml(e?.mobile || '')}">
        </div>
        ${isTool ? `
        <div class="field" style="display:flex;align-items:center;gap:.5rem;padding-top:1.5rem;">
          <input id="f-launch" type="checkbox" style="width:auto;" ${e?.launch ? 'checked' : ''}>
          <label style="margin:0;text-transform:none;font-size:.82rem;color:var(--text)">Show "Launch" button</label>
        </div>
        ` : ''}
      </div>

      <div style="height:3rem"></div>
    </div>
  `;
}

// ─── Dynamic row helpers ────────────────────────────────────
let _reviewIdx = 0, _prosIdx = 0, _consIdx = 0, _featIdx = 0;
function reviewIdx() { return ++_reviewIdx; }
function prosIdx() { return ++_prosIdx; }
function consIdx() { return ++_consIdx; }
function featIdx() { return ++_featIdx; }

function reviewRow(val = '', i = 0) {
  const id = 'rev-' + i + '-' + Date.now();
  return `<div class="dynamic-row" id="${id}">
    <textarea oninput="autoResize(this)" style="min-height:70px">${escHtml(val)}</textarea>
    <button class="btn-remove" onclick="removeRow('${id}')">×</button>
  </div>`;
}

function simpleRow(val = '', i = 0, prefix = '') {
  const id = prefix + '-' + i + '-' + Date.now();
  return `<div class="dynamic-row" id="${id}">
    <input type="text" value="${escHtml(val)}">
    <button class="btn-remove" onclick="removeRow('${id}')">×</button>
  </div>`;
}

function addRow(listId, rowFn, idxFn) {
  const list = document.getElementById(listId);
  const div = document.createElement('div');
  div.innerHTML = rowFn('', typeof idxFn === 'function' ? idxFn() : Date.now());
  list.appendChild(div.firstElementChild);
}

function removeRow(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

// ─── Grade selector ─────────────────────────────────────────
function selectGrade(btn, grade) {
  document.querySelectorAll('#grade-select .grade-btn').forEach(b => {
    b.classList.remove('selected');
    const g = b.dataset.grade;
    if (GRADE_COLORS[g]) {
      b.style.background = 'transparent';
      b.style.borderColor = 'var(--border)';
      b.style.color = 'var(--muted)';
    }
  });
  btn.classList.add('selected');
  if (GRADE_COLORS[grade]) {
    btn.style.background = GRADE_COLORS[grade];
    btn.style.borderColor = GRADE_COLORS[grade];
    btn.style.color = '#000';
  }
  document.getElementById('f-grade').value = grade;
}

// ─── Type switch ────────────────────────────────────────────
function switchType(type) {
  currentType = type;
  const snapshot = collectForm();
  renderForm(snapshot.id ? snapshot : null);
}

// ─── Collect form data ──────────────────────────────────────
function collectForm() {
  const isTool = currentType === 'tool';

  function getList(listId) {
    return [...document.querySelectorAll(`#${listId} .dynamic-row`)]
      .map(row => {
        const inp = row.querySelector('input, textarea');
        return inp ? inp.value.trim() : '';
      })
      .filter(Boolean);
  }

  const obj = {
    id: document.getElementById('f-id')?.value.trim() || '',
    title: document.getElementById('f-title')?.value.trim() || '',
    tagline: document.getElementById('f-tagline')?.value.trim() || '',
    grade: document.getElementById('f-grade')?.value || '',
    review: getList('review-list'),
    mobile: document.getElementById('f-mobile')?.value.trim() || '',
  };

  if (isTool) {
    obj.type = 'tool';
    obj.category = document.getElementById('f-category')?.value.trim() || '';
    obj.features = getList('features-list');
    obj.launch = document.getElementById('f-launch')?.checked || false;
  } else {
    obj.dev = document.getElementById('f-dev')?.value.trim() || '';
    obj.year = parseInt(document.getElementById('f-year')?.value) || '';
    obj.genre = document.getElementById('f-genre')?.value.trim() || '';
    obj.price = document.getElementById('f-price')?.value.trim() || '';
    obj.pros = getList('pros-list');
    obj.cons = getList('cons-list');
    obj.steam = document.getElementById('f-steam')?.value.trim() || '';
    obj.epic = document.getElementById('f-epic')?.value.trim() || '';
    obj.gog = document.getElementById('f-gog')?.value.trim() || '';
  }

  return obj;
}

// ─── Save to GitHub ──────────────────────────────────────────
async function saveForm() {
  const data = collectForm();

  if (!data.id) { showToast('ID is required', true); return; }
  
  const token = getGitHubToken();
  if (!token) return;

  showToast(`Publishing changes for "${data.title}"...`);

  try {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}?cb=${Date.now()}`, {
        headers: { 'Authorization': `token ${token}` }
    });
    if (!res.ok) throw new Error("Could not pull existing reviews-blog/app.js to safely patch.");
    const fileData = await res.json();
    const currentContent = decodeURIComponent(escape(atob(fileData.content)));

    const marker = "// --- DO NOT EDIT BELOW THIS LINE ---";
    let dataSection = currentContent;
    let logicSection = "\n" + marker + "\n// Logic was missing!";
    
    if (currentContent.includes(marker)) {
        dataSection = currentContent.substring(0, currentContent.indexOf(marker));
        logicSection = currentContent.substring(currentContent.indexOf(marker));
    }

    const extractData = new Function(`${dataSection}; return { liveGames: typeof GAMES !== 'undefined' ? GAMES : [], liveTools: typeof TOOLS !== 'undefined' ? TOOLS : [] };`);
    let { liveGames, liveTools } = extractData();
    
    let isNewGameReview = false;

    // Merge target changes directly
    if (data.type === 'tool') {
        // Strip temporary 'type' property from JSON outputs to preserve the standard schema structure on disk
        const cleanTool = { ...data };
        delete cleanTool.type;

        const idx = liveTools.findIndex(t => t.id === cleanTool.id);
        if (idx > -1) liveTools[idx] = cleanTool; else liveTools.push(cleanTool);
    } else {
        const cleanGame = { ...data };
        delete cleanGame.type;

        const idx = liveGames.findIndex(g => g.id === cleanGame.id);
        isNewGameReview = idx === -1;
        if (idx > -1) liveGames[idx] = cleanGame; else liveGames.push(cleanGame);
    }

    // Build finalized content
    const newDataText = `const GAMES = ${JSON.stringify(liveGames, null, 2)};\n\nconst TOOLS = ${JSON.stringify(liveTools, null, 2)};\n\n`;
    const newFileContent = newDataText + logicSection;

    const putRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Admin: Updated entry ${data.id}`,
        content: btoa(unescape(encodeURIComponent(newFileContent))),
        sha: fileData.sha
      })
    });

    if (putRes.ok) {
      showToast(`✓ Published ${data.title} successfully!`);
      // Update in-memory local state
      const updatedItem = { ...data };
      const existingIdx = entries.findIndex(e => e.id === updatedItem.id);
      if (existingIdx > -1) {
        entries[existingIdx] = updatedItem;
      } else {
        entries.push(updatedItem);
      }
      
      currentId = data.id;
      refreshSidebar();
      renderForm(updatedItem);

      if (isNewGameReview && window.EnvizionNotifications) {
        window.EnvizionNotifications.queueContentNotification({
          type: 'review',
          id: data.id,
          title: data.title,
          excerpt: data.tagline,
          url: `reviews-blog/game.html?id=${encodeURIComponent(data.id)}`
        }).then((result) => {
          if (result.skipped) {
            showToast('Review published. Notification was already sent or queued.');
          } else {
            const count = result.submitted ?? result.queued;
            showToast(`Review published. Submitted ${count} email notification${count === 1 ? '' : 's'} to MailApp.`);
          }
        }).catch((error) => {
          console.error(error);
          showToast('Review published, but email notifications could not be sent: ' + error.message, true);
        });
      }
    } else {
      const err = await putRes.json();
      throw new Error(err.message);
    }
  } catch (err) {
    showToast('Save Error: ' + err.message, true);
  }
}

// ─── Delete ─────────────────────────────────────────────────
function confirmDelete(id) {
  const el = document.getElementById('delete-confirm');
  if (el) el.classList.add('show');
}

async function deleteEntry(id) {
  const token = getGitHubToken();
  if (!token) return;

  try {
    showToast(`Deleting "${id}"...`);
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}?cb=${Date.now()}`, {
      headers: { 'Authorization': `token ${token}` }
    });
    const fileData = await res.json();
    const currentContent = decodeURIComponent(escape(atob(fileData.content)));

    const marker = "// --- DO NOT EDIT BELOW THIS LINE ---";
    let dataSection = currentContent;
    let logicSection = "\n" + marker + "\n// Logic was missing!";
    
    if (currentContent.includes(marker)) {
        dataSection = currentContent.substring(0, currentContent.indexOf(marker));
        logicSection = currentContent.substring(currentContent.indexOf(marker));
    }

    const extractData = new Function(`${dataSection}; return { remoteGames: typeof GAMES !== 'undefined' ? GAMES : [], remoteTools: typeof TOOLS !== 'undefined' ? TOOLS : [] };`);
    let { remoteGames, remoteTools } = extractData();

    // Filter out target item
    const finalGames = remoteGames.filter(e => e.id !== id);
    const finalTools = remoteTools.filter(e => e.id !== id);

    const newDataText = `const GAMES = ${JSON.stringify(finalGames, null, 2)};\n\nconst TOOLS = ${JSON.stringify(finalTools, null, 2)};\n\n`;
    const newFileContent = newDataText + logicSection;

    const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Admin Delete: ${id}`,
        content: btoa(unescape(encodeURIComponent(newFileContent))),
        sha: fileData.sha
      })
    });

    if (response.ok) {
      // Synchronize in-memory model directly
      entries = [
        ...finalGames.map(g => ({...g, type: 'game'})), 
        ...finalTools.map(t => ({...t, type: 'tool'}))
      ];
      showToast('✓ Deleted from GitHub successfully!');
      refreshSidebar();
      showEmpty();
    } else {
      const err = await response.json();
      throw new Error(err.message);
    }
  } catch (err) {
    showToast('Delete Error: ' + err.message, true);
  }
}

// ─── Utility ────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Add a nice token status container dynamically to the sidebar header
  const sidebarHeader = document.querySelector('.sidebar-header');
  if (sidebarHeader) {
    const statusContainer = document.createElement('div');
    statusContainer.id = 'token-status';
    statusContainer.style.cssText = "font-size:0.68rem; color:var(--muted); margin-top:0.4rem; display:flex; align-items:center; gap:0.5rem;";
    sidebarHeader.appendChild(statusContainer);
  }

  updateTokenUI();
  
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    syncFromGitHub();
  } else {
    // Gracefully show empty state on initial boot before connecting
    refreshSidebar();
    showEmpty();
    setTimeout(() => {
      if (confirm("Would you like to connect to GitHub to view and modify live entries now?")) {
        promptNewToken();
      }
    }, 400);
  }
});
