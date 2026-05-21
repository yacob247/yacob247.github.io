// ─── Blog Configuration & State ──────────────────────────────
const BLOG_PATH = 'reviews-blog/blog-data.js';
let blogEntries = [];
let currentBlogSlug = null;
let adminMode = 'games'; // 'games' or 'blog'

// ─── Monkey-Patch Hooks (Integrates with admin1.js safely) ──
const originalNewEntry = window.newEntry;
window.handleNewEntry = function() {
    if (adminMode === 'blog') {
        newBlogEntry();
    } else {
        originalNewEntry();
    }
};

const originalShowEmpty = window.showEmpty;
window.showEmpty = function() {
    currentBlogSlug = null;
    if (originalShowEmpty) originalShowEmpty();
};

// ─── Tab Switcher ────────────────────────────────────────────
function setAdminMode(mode) {
    adminMode = mode;
    document.getElementById('tab-games').classList.toggle('active', mode === 'games');
    document.getElementById('tab-blog').classList.toggle('active', mode === 'blog');

    if (mode === 'blog') {
        document.getElementById('stat-games-container').style.display = 'none';
        document.getElementById('stat-tools-container').style.display = 'none';
        document.getElementById('stat-blog-container').style.display = 'block';
        syncBlogFromGitHub();
    } else {
        document.getElementById('stat-games-container').style.display = 'block';
        document.getElementById('stat-tools-container').style.display = 'block';
        document.getElementById('stat-blog-container').style.display = 'none';
        
        // Return to admin1.js functionality
        if (typeof refreshSidebar === 'function') refreshSidebar(); 
        showEmpty();
    }
}

// ─── GitHub Fetch (Blog Specific) ────────────────────────────
async function syncBlogFromGitHub() {
    const token = typeof getGitHubToken === 'function' ? getGitHubToken() : sessionStorage.getItem('envizion_github_token');
    if (!token) return;

    showToast("Syncing Blog from GitHub...");
    try {
        const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${BLOG_PATH}?cb=${Date.now()}`, {
            headers: { 'Authorization': `token ${token}` }
        });
        if (!res.ok) throw new Error(`Failed to fetch blog file: ${res.statusText}`);

        const fileData = await res.json();
        const currentContent = decodeURIComponent(escape(atob(fileData.content)));

        // Safely extract the POSTS array from reviews-blog/blog-data.js
        const extractData = new Function(`${currentContent}; return typeof POSTS !== 'undefined' ? POSTS : [];`);
        blogEntries = extractData();

        showToast("✓ Synced Blog with GitHub!");
        refreshBlogSidebar();
        showEmpty();
    } catch (err) {
        showToast("Blog Sync Error: " + err.message, true);
        console.error(err);
    }
}

// Quiet fetch to populate total stats on boot without disrupting the Games tab
document.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('envizion_github_token');
    if (token) {
        fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${BLOG_PATH}?cb=${Date.now()}`, {
            headers: { 'Authorization': `token ${token}` }
        }).then(res => res.json()).then(fileData => {
            const content = decodeURIComponent(escape(atob(fileData.content)));
            const extract = new Function(`${content}; return typeof POSTS !== 'undefined' ? POSTS : [];`);
            blogEntries = extract();
            document.getElementById('stat-blog').textContent = blogEntries.length;
            
            // Adjust total count
            const currentTotal = parseInt(document.getElementById('stat-total').textContent) || 0;
            document.getElementById('stat-total').textContent = currentTotal + blogEntries.length;
        }).catch(() => {});
    }
});

// ─── Blog Sidebar Render ─────────────────────────────────────
function refreshBlogSidebar() {
    const list = document.getElementById('entry-list');
    
    // Setup bulk actions specific for blogs
    const bulkActions = `
        <div style="padding: 10px; border-bottom: 1px solid var(--border); margin-bottom: 10px; display: flex; gap: 5px;">
            <button class="btn btn-danger" style="width: 100%; font-size: 0.7rem; padding: 6px;" onclick="deleteSelectedBlogs()">🗑️ Delete Selected</button>
            <button class="btn btn-ghost" style="width: auto; font-size: 0.7rem; padding: 6px;" onclick="syncBlogFromGitHub()" title="Sync Fresh Copy">🔄</button>
        </div>
    `;

    document.getElementById('stat-blog').textContent = blogEntries.length;
    document.getElementById('stat-total').textContent = (typeof entries !== 'undefined' ? entries.length : 0) + blogEntries.length;

    list.innerHTML = bulkActions;

    if (blogEntries.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.style.cssText = "padding:1rem 1.5rem;font-size:0.8rem;color:var(--muted);";
        emptyLi.textContent = "No posts found. Try syncing.";
        list.appendChild(emptyLi);
        return;
    }

    const sectionLabel = document.createElement('div');
    sectionLabel.className = 'nav-section-label';
    sectionLabel.textContent = 'Blog Posts';
    list.appendChild(sectionLabel);

    // Render list items
    blogEntries.forEach(e => {
        const li = document.createElement('li');
        li.className = 'entry-item' + (currentBlogSlug === e.slug ? ' active' : '');
        li.innerHTML = `
            <input type="checkbox" class="batch-delete-blog-check" data-slug="${e.slug}" onclick="event.stopPropagation()" style="margin-right: 10px; cursor: pointer;">
            <div class="entry-dot" style="background:${e.tagColor || 'var(--gemini-purple)'}"></div>
            <div style="display: flex; flex-direction: column; flex-grow: 1; overflow: hidden;" onclick="editBlogEntry('${e.slug}')">
                <span class="entry-name">${e.title || e.slug}</span>
                <span class="entry-type-badge" style="background:rgba(155,81,224,0.15);color:var(--gemini-purple)">${e.tag || 'Post'}</span>
            </div>
        `;
        list.appendChild(li);
    });
}

// ─── Blog Form Engine ────────────────────────────────────────
function newBlogEntry() {
    currentBlogSlug = null;
    renderBlogForm(null);
    refreshBlogSidebar();
}

function editBlogEntry(slug) {
    const e = blogEntries.find(x => x.slug === slug);
    if (!e) return;
    currentBlogSlug = slug;
    renderBlogForm(e);
    refreshBlogSidebar();
}

function renderBlogForm(e) {
    const isNew = !e;
    
    document.getElementById('topbar-title').textContent = isNew ? 'New Blog Post' : `Editing Post: ${e.title}`;
    document.getElementById('topbar-actions').innerHTML = `
        <button class="btn btn-ghost" onclick="showEmpty()">Cancel</button>
        ${!isNew ? `<button class="btn btn-danger" onclick="confirmDeleteBlog('${e.slug}')">Delete</button>` : ''}
        <button class="btn btn-success" onclick="saveBlogForm()">Save Post</button>
    `;

    document.getElementById('view-area').innerHTML = `
        <div class="form-content">
            <div class="delete-confirm" id="delete-blog-confirm">
                <span>⚠️ Delete this post permanently?</span>
                <button class="btn btn-danger" onclick="deleteBlogEntry('${e?.slug}')">Yes, Delete</button>
                <button class="btn btn-ghost" onclick="document.getElementById('delete-blog-confirm').classList.remove('show')">Cancel</button>
            </div>

            <div class="section-label">Post Metadata</div>
            <div class="form-grid">
                <div class="field">
                    <label>URL Slug <span class="required">*</span></label>
                    <input id="b-slug" type="text" placeholder="e.g. top-5-rpgs" value="${e?.slug || ''}" oninput="this.value=this.value.toLowerCase().replace(/\\s+/g,'-').replace(/[^a-z0-9-]/g,'')">
                    <span class="field-hint">Must be URL-safe (lowercase, hyphens only).</span>
                </div>
                <div class="field">
                    <label>Title <span class="required">*</span></label>
                    <input id="b-title" type="text" placeholder="The Best RPGs Right Now..." value="${escHtml(e?.title || '')}">
                </div>
                <div class="field">
                    <label>Published Date <span class="required">*</span></label>
                    <input id="b-date" type="text" placeholder="May 12, 2025" value="${escHtml(e?.date || '')}">
                </div>
                <div class="field" style="display:flex; flex-direction:row; gap:1rem;">
                    <div style="flex:1">
                        <label>Category Tag</label>
                        <input id="b-tag" type="text" placeholder="e.g. RPG" value="${escHtml(e?.tag || '')}">
                    </div>
                    <div style="width:70px">
                        <label>Color</label>
                        <input id="b-tagColor" type="color" value="${e?.tagColor || '#4285F4'}" style="padding:0.2rem; height:41px; cursor:pointer;">
                    </div>
                </div>
                <div class="field span2">
                    <label>Excerpt / Description <span class="required">*</span></label>
                    <textarea id="b-excerpt" rows="2" oninput="autoResize(this)">${escHtml(e?.excerpt || '')}</textarea>
                    <span class="field-hint">Short summary shown on the blog list page and in SEO meta tags.</span>
                </div>
            </div>

            <hr class="section-divider">

            <div class="section-label" style="display:flex; justify-content:space-between; align-items:center;">
                Article Body Blocks
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn-add-row" style="margin:0" onclick="addBlogBlock('intro')">+ Intro</button>
                    <button class="btn-add-row" style="margin:0" onclick="addBlogBlock('entry')">+ Ranked Entry</button>
                    <button class="btn-add-row" style="margin:0" onclick="addBlogBlock('outro')">+ Outro</button>
                </div>
            </div>

            <div id="blog-blocks-container"></div>
            
            <div style="height:3rem"></div>
        </div>
    `;

    // Render existing body blocks if any
    const blocksContainer = document.getElementById('blog-blocks-container');
    if (e && e.body && Array.isArray(e.body)) {
        e.body.forEach(block => {
            blocksContainer.insertAdjacentHTML('beforeend', generateBlogBlockHTML(block));
        });
    }
    
    // Auto resize textareas naturally
    setTimeout(() => {
        document.querySelectorAll('.form-content textarea').forEach(txt => autoResize(txt));
    }, 50);
}

// ─── Dynamic Block Architecture ──────────────────────────────
let _blockCounter = 0;

function generateBlogBlockHTML(block) {
    const id = 'bblock-' + Date.now() + '-' + (++_blockCounter);
    let innerFields = '';

    if (block.type === 'intro' || block.type === 'outro') {
        innerFields = `
            <div class="field">
                <label>Paragraph Text</label>
                <textarea class="block-text" oninput="autoResize(this)" style="min-height:90px">${escHtml(block.text || '')}</textarea>
            </div>
        `;
    } else if (block.type === 'entry') {
        innerFields = `
            <div class="form-grid">
                <div class="field">
                    <label>Target Game ID (Optional link to review)</label>
                    <input type="text" class="block-gameId" placeholder="e.g. rdr2" value="${escHtml(block.gameId || '')}">
                </div>
                <div class="field">
                    <label>Rank (Optional number)</label>
                    <input type="number" class="block-rank" placeholder="e.g. 5" value="${block.rank || ''}">
                </div>
                <div class="field span2">
                    <label>Entry Title <span class="required">*</span></label>
                    <input type="text" class="block-title" placeholder="Game Name or Entry Title" value="${escHtml(block.title || '')}">
                </div>
                <div class="field span2">
                    <label>Entry Review Text <span class="required">*</span></label>
                    <textarea class="block-text" oninput="autoResize(this)" style="min-height:100px">${escHtml(block.text || '')}</textarea>
                </div>
            </div>
        `;
    }

    const typeColor = block.type === 'entry' ? 'var(--google-blue)' : (block.type === 'intro' ? 'var(--accent2)' : 'var(--accent)');

    return `
        <div class="blog-block-card" id="${id}" data-type="${block.type}">
            <div class="blog-block-header">
                <span style="color:${typeColor}">${block.type.toUpperCase()} BLOCK</span>
                <div class="blog-block-actions">
                    <button class="btn-remove" onclick="moveBlockUp('${id}')" title="Move Up" style="font-size:0.8rem;height:26px;width:26px">↑</button>
                    <button class="btn-remove" onclick="moveBlockDown('${id}')" title="Move Down" style="font-size:0.8rem;height:26px;width:26px">↓</button>
                    <button class="btn-remove" onclick="removeRow('${id}')" title="Delete" style="height:26px;width:26px">×</button>
                </div>
            </div>
            ${innerFields}
        </div>
    `;
}

function addBlogBlock(type) {
    const container = document.getElementById('blog-blocks-container');
    container.insertAdjacentHTML('beforeend', generateBlogBlockHTML({ type: type }));
}

function moveBlockUp(id) {
    const el = document.getElementById(id);
    if (el && el.previousElementSibling) el.parentNode.insertBefore(el, el.previousElementSibling);
}

function moveBlockDown(id) {
    const el = document.getElementById(id);
    if (el && el.nextElementSibling) el.parentNode.insertBefore(el.nextElementSibling, el);
}

function collectBlogForm() {
    const slug = document.getElementById('b-slug')?.value.trim();
    if (!slug) return null;

    const bodyBlocks = Array.from(document.querySelectorAll('.blog-block-card')).map(card => {
        const type = card.dataset.type;
        const text = card.querySelector('.block-text')?.value.trim() || '';
        
        if (type === 'intro' || type === 'outro') {
            return { type, text };
        } else if (type === 'entry') {
            const gameId = card.querySelector('.block-gameId')?.value.trim();
            const rankVal = card.querySelector('.block-rank')?.value;
            const rank = rankVal ? parseInt(rankVal) : null;
            const title = card.querySelector('.block-title')?.value.trim();
            
            return { type, rank, gameId, title, text };
        }
    });

    return {
        slug: slug,
        title: document.getElementById('b-title')?.value.trim() || '',
        date: document.getElementById('b-date')?.value.trim() || '',
        tag: document.getElementById('b-tag')?.value.trim() || '',
        tagColor: document.getElementById('b-tagColor')?.value || '#4285F4',
        excerpt: document.getElementById('b-excerpt')?.value.trim() || '',
        body: bodyBlocks
    };
}

// ─── Save & Delete via GitHub ────────────────────────────────
function getBlogDataTemplate(postsArray) {
    return `// ─────────────────────────────────────────────
//  reviews-blog/blog-data.js  —  All blog post content
//  To add a post: push a new object into POSTS.
//  slug must be URL-safe (lowercase, hyphens only).
// ─────────────────────────────────────────────

const POSTS = ${JSON.stringify(postsArray, null, 2)};
`;
}

async function saveBlogForm() {
    const data = collectBlogForm();
    if (!data) { showToast('Slug is required', true); return; }

    const token = getGitHubToken();
    if (!token) return;

    showToast(`Publishing post "${data.title}"...`);

    try {
        const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${BLOG_PATH}?cb=${Date.now()}`, {
            headers: { 'Authorization': `token ${token}` }
        });

        let sha = null;
        let livePosts = [];

        if (res.ok) {
            const fileData = await res.json();
            sha = fileData.sha;
            const currentContent = decodeURIComponent(escape(atob(fileData.content)));
            const extractData = new Function(`${currentContent}; return typeof POSTS !== 'undefined' ? POSTS : [];`);
            livePosts = extractData();
        } else if (res.status === 404) {
            // File does not exist yet, we will create it
            livePosts = [];
        } else {
            throw new Error("Could not pull existing reviews-blog/blog-data.js.");
        }

        // Add or Update
        const idx = livePosts.findIndex(p => p.slug === data.slug);
        const isNewBlogPost = idx === -1;
        if (idx > -1) livePosts[idx] = data; else livePosts.push(data);

        const newFileContent = getBlogDataTemplate(livePosts);
        const payload = {
            message: `Admin: Updated blog post ${data.slug}`,
            content: btoa(unescape(encodeURIComponent(newFileContent)))
        };
        if (sha) payload.sha = sha;

        const putRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${BLOG_PATH}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (putRes.ok) {
            showToast(`✓ Published ${data.title} successfully!`);
            
            // Sync local memory
            const existingIdx = blogEntries.findIndex(e => e.slug === data.slug);
            if (existingIdx > -1) blogEntries[existingIdx] = data; else blogEntries.push(data);

            currentBlogSlug = data.slug;
            refreshBlogSidebar();
            renderBlogForm(data); // Re-render to clear any dirty state

            if (isNewBlogPost && window.EnvizionNotifications) {
                window.EnvizionNotifications.queueContentNotification({
                    type: 'blog',
                    slug: data.slug,
                    title: data.title,
                    excerpt: data.excerpt,
                    url: `blog-post.html?id=${encodeURIComponent(data.slug)}`
                }).then((result) => {
                    if (result.skipped) {
                        showToast('Post published. Notification was already sent or queued.');
                    } else {
                        const count = result.submitted ?? result.queued;
                        showToast(`Post published. Submitted ${count} email notification${count === 1 ? '' : 's'} to MailApp.`);
                    }
                }).catch((error) => {
                    console.error(error);
                    showToast('Post published, but email notifications could not be sent: ' + error.message, true);
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

function confirmDeleteBlog() {
    const el = document.getElementById('delete-blog-confirm');
    if (el) el.classList.add('show');
}

async function deleteBlogEntry(slug) {
    const token = getGitHubToken();
    if (!token) return;

    try {
        showToast(`Deleting post "${slug}"...`);
        const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${BLOG_PATH}?cb=${Date.now()}`, {
            headers: { 'Authorization': `token ${token}` }
        });
        const fileData = await res.json();
        const currentContent = decodeURIComponent(escape(atob(fileData.content)));
        
        const extractData = new Function(`${currentContent}; return typeof POSTS !== 'undefined' ? POSTS : [];`);
        let remotePosts = extractData();

        const finalPosts = remotePosts.filter(e => e.slug !== slug);
        const newFileContent = getBlogDataTemplate(finalPosts);

        const putRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${BLOG_PATH}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `Admin Delete: blog post ${slug}`,
                content: btoa(unescape(encodeURIComponent(newFileContent))),
                sha: fileData.sha
            })
        });

        if (putRes.ok) {
            blogEntries = finalPosts;
            showToast('✓ Post deleted from GitHub successfully!');
            refreshBlogSidebar();
            showEmpty();
        } else {
            const err = await putRes.json();
            throw new Error(err.message);
        }
    } catch (err) {
        showToast('Delete Error: ' + err.message, true);
    }
}

async function deleteSelectedBlogs() {
    const checkboxes = document.querySelectorAll('.batch-delete-blog-check:checked');
    const slugsToDelete = Array.from(checkboxes).map(cb => cb.dataset.slug);

    if (slugsToDelete.length === 0) {
        showToast("No posts selected", true);
        return;
    }
    if (!confirm(`Are you sure you want to delete ${slugsToDelete.length} posts from GitHub?`)) return;

    const token = getGitHubToken();
    if (!token) return;

    try {
        showToast("Processing bulk deletion...");
        const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${BLOG_PATH}?cb=${Date.now()}`, {
            headers: { 'Authorization': `token ${token}` }
        });
        const fileData = await res.json();
        const currentContent = decodeURIComponent(escape(atob(fileData.content)));

        const extractData = new Function(`${currentContent}; return typeof POSTS !== 'undefined' ? POSTS : [];`);
        let remotePosts = extractData();

        const finalPosts = remotePosts.filter(e => !slugsToDelete.includes(e.slug));
        const newFileContent = getBlogDataTemplate(finalPosts);

        const putRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${BLOG_PATH}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `Admin Bulk Delete: ${slugsToDelete.length} blog posts`,
                content: btoa(unescape(encodeURIComponent(newFileContent))),
                sha: fileData.sha
            })
        });

        if (putRes.ok) {
            blogEntries = finalPosts;
            showToast(`✓ Successfully deleted ${slugsToDelete.length} posts`);
            refreshBlogSidebar();
            showEmpty();
        } else {
            const err = await putRes.json();
            showToast('GitHub Error: ' + err.message, true);
        }
    } catch (err) {
        showToast('Error: ' + err.message, true);
    }
}
