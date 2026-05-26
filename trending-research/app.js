// app.js — TrendScope main application (ES module)
import { fetchAll, fetchCategory, fetchSources, fetchSource, searchNews,
         getTickerItems, timeAgo, SOURCES, CATEGORIES, PEOPLE_CATEGORIES, CAT_SOURCES }
  from './news-feeds.js';
import { saveNewsItems, getCachedNews, logPageView, saveSubscription,
         logSearch, getTrendingSearches, saveResearch, getResearch, watchNews }
  from './firebase-app.js';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyYsr03oyOeBTaI2wImBWVjbsVwR0LHYT_6o0R6-vUuZVb9VmjtWiYFZgSduppvPhpj/exec';
const ADSENSE_PID   = 'ca-pub-5812524294035974';
const AD_SLOT_TOP   = '1079715089';
const AD_SLOT_MID   = '1187710073';

/* ── utils ─────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const esc = v => String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const profileUrl = p => `profile.html?id=${encodeURIComponent(p.id)}`;

function getProfiles() {
  return Array.isArray(window.PROFILES) ? window.PROFILES : [];
}

function searchProfiles(q='', category='All') {
  const lq = q.toLowerCase().trim();
  return getProfiles().filter(p => {
    const catOk = category === 'All' || p.category === category;
    const hay = `${p.name} ${p.category} ${p.summary} ${(p.tags||[]).join(' ')}`.toLowerCase();
    return catOk && (!lq || hay.includes(lq));
  });
}

function categoryCounts() {
  return getProfiles().reduce((m,p)=>{ m[p.category]=(m[p.category]||0)+1; return m; },{});
}

/* ── renderers ─────────────────────────────────────── */
function renderNewsCards(containerId, items, maxItems = 30) {
  const el = $(containerId);
  if (!el) return;
  if (!items.length) {
    el.innerHTML = `<div class="empty-state"><span class="es-icon">📰</span><p>No articles found.</p></div>`;
    return;
  }
  el.innerHTML = items.slice(0, maxItems).map((item, i) => `
    <article class="news-card fade-up" style="animation-delay:${i*0.05}s">
      <div class="nc-source">
        <span class="cat-badge ${esc(item.sourceCls)}">${esc(item.source)}</span>
        <span style="margin-left:auto;font-size:.7rem;color:var(--muted)">${timeAgo(item.pubDate)}</span>
      </div>
      <h3>${esc(item.title)}</h3>
      ${item.description ? `<p class="nc-desc">${esc(item.description)}</p>` : ''}
      <div class="nc-meta">
        <span>${item.categories?.[0]||''}</span>
        <a href="${esc(item.link)}" target="_blank" rel="noopener" class="nc-read">Read →</a>
      </div>
    </article>
  `).join('');
}

function renderPersonCards(containerId, profiles, maxItems = 24) {
  const el = $(containerId);
  if (!el) return;
  if (!profiles.length) {
    el.innerHTML = `<div class="empty-state"><span class="es-icon">👤</span><p>No profiles found.</p></div>`;
    return;
  }
  el.innerHTML = profiles.slice(0, maxItems).map((p, i) => `
    <article class="person-card fade-up" style="animation-delay:${i*0.05}s">
      <span class="pc-cat">${esc(p.category)}</span>
      <a href="${esc(profileUrl(p))}" class="pc-name">${esc(p.name)}</a>
      <p class="pc-summary">${esc(p.summary)}</p>
      <div class="chips">
        ${(p.tags||[]).slice(0,4).map(t=>`<span class="chip">${esc(t)}</span>`).join('')}
      </div>
    </article>
  `).join('');
}

function renderListItems(containerId, profiles, maxItems = 20) {
  const el = $(containerId);
  if (!el) return;
  el.innerHTML = profiles.slice(0, maxItems).map((p, i) => `
    <div class="list-item fade-up" style="animation-delay:${i*0.04}s">
      <div class="li-num">${i+1}</div>
      <div class="li-body">
        <h3><a href="${esc(profileUrl(p))}">${esc(p.name)}</a></h3>
        <p>${esc(p.summary)}</p>
        <div class="chips" style="margin-top:.4rem">
          <span class="chip accent">${esc(p.category)}</span>
          ${(p.tags||[]).slice(0,3).map(t=>`<span class="chip">${esc(t)}</span>`).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

function renderCategoryTabs(containerId, active='All', onClick=()=>{}) {
  const el = $(containerId);
  if (!el) return;
  const cats = ['All', ...Object.keys(categoryCounts()).sort()];
  el.innerHTML = cats.map(c =>
    `<button type="button" class="${c===active?'active':''}" data-cat="${esc(c)}">${esc(c)}</button>`
  ).join('');
  el.addEventListener('click', e => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    el.querySelectorAll('button').forEach(b => b.classList.toggle('active', b===btn));
    onClick(btn.dataset.cat);
  });
}

function renderSourceTabs(containerId, active='All', onClick=()=>{}) {
  const el = $(containerId);
  if (!el) return;
  const sources = ['All', ...SOURCES.map(s=>s.name)];
  el.innerHTML = sources.map(s =>
    `<button type="button" class="${s===active?'active':''}" data-src="${esc(s)}">${esc(s)}</button>`
  ).join('');
  el.addEventListener('click', e => {
    const btn = e.target.closest('[data-src]');
    if (!btn) return;
    el.querySelectorAll('button').forEach(b => b.classList.toggle('active', b===btn));
    onClick(btn.dataset.src);
  });
}

/* ── ticker ─────────────────────────────────────────── */
function startTicker(items) {
  const track = document.querySelector('.ticker-track');
  if (!track || !items.length) return;
  const html = items.map(i =>
    `<span class="ticker-item" onclick="window.open('${esc(i.link)}','_blank')">${esc(i.source)}: ${esc(i.title)}</span>`
  ).join('');
  // duplicate for seamless loop
  track.innerHTML = html + html;
}

/* ── newsletter / email ─────────────────────────────── */
async function subscribeEmail(email, name='') {
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    alert('Please enter a valid email address.');
    return false;
  }
  try {
    await saveSubscription(email, name);
    // Ping Google Apps Script
    await fetch(GAS_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'subscribe', email, name, timestamp: new Date().toISOString() })
    });
    return true;
  } catch(e) {
    console.error('Subscribe error', e);
    return false;
  }
}

function bindNewsletterForms() {
  document.querySelectorAll('[data-newsletter-form]').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const fd  = new FormData(form);
      const btn = form.querySelector('button[type=submit]');
      const msg = form.querySelector('.nl-msg');
      btn.disabled = true;
      btn.textContent = 'Subscribing…';
      const ok = await subscribeEmail(fd.get('email')||'', fd.get('name')||'');
      btn.disabled = false;
      if (ok) {
        btn.textContent = '✓ Subscribed!';
        form.reset();
        if (msg) { msg.textContent = 'You\'re subscribed! Check your inbox.'; msg.style.color='var(--green)'; }
      } else {
        btn.textContent = 'Subscribe';
        if (msg) { msg.textContent = 'Something went wrong. Please try again.'; msg.style.color='var(--red)'; }
      }
    });
  });
}

/* ── AI research via Claude API ─────────────────────── */
async function claudeResearch(topic, newsContext = '') {
  // Check cache first
  const cached = await getResearch(topic).catch(()=>null);
  if (cached && cached.content) return cached.content;

  const apiKey = window.__CLAUDE_KEY || sessionStorage.getItem('ts_claude_key');
  if (!apiKey) {
    return '⚠ Enter your Anthropic API key in Settings to enable AI research.';
  }

  const systemPrompt = `You are a comprehensive research analyst for TrendScope, a news and research platform.
You synthesize information from multiple global news sources including BBC, Al Jazeera, Reuters, The Guardian, AP, NPR, CNN, and others.
When given a topic or person, provide:
1. A comprehensive overview of who/what this is and why it matters NOW
2. Key developments in the last 30 days
3. Analysis from different perspectives (geopolitical, cultural, economic)
4. What analysts and experts are saying
5. Predictions and what to watch for
6. Related topics and people

Be thorough, factual, multi-perspective, and insightful. Format with clear sections using markdown-style headers.`;

  const userMsg = newsContext
    ? `Research topic: "${topic}"\n\nRecent news context:\n${newsContext}\n\nProvide a comprehensive research briefing.`
    : `Research topic: "${topic}"\n\nProvide a comprehensive, current research briefing covering all major angles.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1800,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }]
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      throw new Error(err.error?.message || res.statusText);
    }
    const data = await res.json();
    const content = data.content?.[0]?.text || '';
    await saveResearch(topic, content).catch(()=>{});
    return content;
  } catch(e) {
    return `⚠ AI research error: ${e.message}`;
  }
}

function formatResearchOutput(text) {
  return text
    .replace(/^### (.+)$/gm,'<h4 style="color:var(--accent);font-family:\'Playfair Display\',serif;margin:.8rem 0 .3rem;font-size:.95rem">$1</h4>')
    .replace(/^## (.+)$/gm,'<h3 style="color:#fff;font-family:\'Playfair Display\',serif;margin:1rem 0 .4rem;font-size:1.05rem">$1</h3>')
    .replace(/^# (.+)$/gm,'<h2 style="color:#fff;font-family:\'Playfair Display\',serif;margin:1rem 0 .5rem;font-size:1.2rem">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^- (.+)$/gm,'<li style="margin:.25rem 0;color:var(--text)">$1</li>')
    .replace(/(<li.*<\/li>(\n|$))+/g, m => `<ul style="padding-left:1.2rem;margin:.4rem 0">${m}</ul>`)
    .replace(/\n\n/g,'</p><p style="margin:.5rem 0;color:var(--muted);line-height:1.7">')
    .replace(/^(?!<)(.+)$/gm, '<p style="margin:.4rem 0;color:var(--muted);line-height:1.7">$1</p>');
}

/* ── adSense push ────────────────────────────────────── */
function pushAds() {
  if (!window.adsbygoogle) return;
  document.querySelectorAll('.adsbygoogle').forEach(() => {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
  });
}

/* ── PAGES ───────────────────────────────────────────── */

async function loadDashboard() {
  // Fetch news from top sources
  const newsItems = await fetchAll(80);
  startTicker(getTickerItems(newsItems));
  renderNewsCards('featured-news', newsItems.filter(i=>i.thumbnail).slice(0,6));
  renderNewsCards('world-news', newsItems.filter(i=>i.categories?.includes('World')).slice(0,12));
  renderNewsCards('us-news', newsItems.filter(i=>i.categories?.includes('US')).slice(0,8));
  renderNewsCards('finance-news', newsItems.filter(i=>i.categories?.includes('Finance')).slice(0,8));

  // People from profiles
  renderPersonCards('trending-people', getProfiles().slice(0,12));
  renderListItems('top-profiles', getProfiles().slice(0,10));

  // Save to Firestore cache
  saveNewsItems(newsItems.slice(0,60)).catch(()=>{});

  // Trending searches
  const trending = await getTrendingSearches(10).catch(()=>[]);
  const trendEl = $('trending-searches');
  if (trendEl && trending.length) {
    trendEl.innerHTML = trending.map(t =>
      `<a href="topics.html?q=${encodeURIComponent(t.query)}" class="chip accent">${esc(t.query)}</a>`
    ).join('');
  }
}

async function loadNewsPage() {
  let activeSrc = 'All';
  let allItems = [];

  const render = (items) => {
    renderNewsCards('news-main', items, 40);
    renderNewsCards('news-sidebar', items.slice(10,20), 10);
  };

  // Load major sources
  allItems = await fetchAll(100);
  startTicker(getTickerItems(allItems));
  render(allItems);

  renderSourceTabs('source-tabs', 'All', async src => {
    activeSrc = src;
    const $c = $('news-main');
    if ($c) $c.innerHTML = '<div class="empty-state"><span class="spinner"></span></div>';
    if (src === 'All') {
      render(allItems);
    } else {
      const src_obj = SOURCES.find(s => s.name === src);
      if (!src_obj) return;
      const items = await fetchSource(src_obj.id);
      render(items);
    }
  });

  // Search
  const searchForm = document.querySelector('[data-news-search]');
  if (searchForm) {
    searchForm.addEventListener('submit', e => {
      e.preventDefault();
      const q = new FormData(searchForm).get('q') || '';
      const filtered = allItems.filter(i =>
        i.title.toLowerCase().includes(q.toLowerCase()) ||
        i.description.toLowerCase().includes(q.toLowerCase())
      );
      render(filtered);
    });
  }
}

async function loadPeople() {
  let activeCat = 'All';
  let query = '';

  const render = () => {
    const results = searchProfiles(query, activeCat);
    renderPersonCards('people-grid', results, 48);
    renderListItems('people-list', results.filter(p => ['Celebrity','Athlete','Historical Figure'].includes(p.category)).slice(0,20));
  };

  renderCategoryTabs('people-tabs', 'All', cat => { activeCat = cat; render(); });
  render();

  const form = document.querySelector('[data-people-search]');
  if (form) {
    form.addEventListener('input', e => { query = e.target.value; render(); });
    form.addEventListener('submit', e => e.preventDefault());
  }

  // Load news about celebrities
  const newsItems = await fetchSources(['bbc','ap','guardian']).catch(()=>[]);
  startTicker(getTickerItems(newsItems));
}

async function loadTopics() {
  const params   = new URLSearchParams(location.search);
  let query      = params.get('q') || '';
  let activeCat  = 'All';

  const inp = $('topic-input');
  if (inp) inp.value = query;

  let newsItems = await fetchAll(80).catch(()=>[]);
  startTicker(getTickerItems(newsItems));

  const render = async () => {
    const profileResults = searchProfiles(query, activeCat);
    renderListItems('topic-profiles', profileResults, 20);
    const filtered = await searchNews(query, newsItems);
    renderNewsCards('topic-news', filtered, 30);
    if (query) {
      logSearch(query).catch(()=>{});
    }
  };

  renderCategoryTabs('local-category-tabs', 'All', cat => { activeCat = cat; render(); });

  const form = document.querySelector('[data-topic-form]');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      query = new FormData(form).get('q') || '';
      if (inp) inp.value = query;
      history.replaceState(null,'',`topics.html?q=${encodeURIComponent(query)}`);
      render();
    });
  }
  render();
}

async function loadResearch() {
  const params  = new URLSearchParams(location.search);
  let topic     = params.get('q') || '';

  const inp = $('research-input');
  if (inp) inp.value = topic;

  const titleEl = $('research-title');
  const leadEl  = $('research-lead');

  if (topic) {
    if (titleEl) titleEl.textContent = topic;
    if (leadEl)  leadEl.textContent  = `Comprehensive research briefing on "${topic}" from global sources.`;
    document.title = `${topic} — TrendScope Research`;
    logSearch(topic).catch(()=>{});
  } else {
    if (titleEl) titleEl.textContent = 'Research Lab';
    if (leadEl)  leadEl.textContent  = 'Enter any topic, person, company or event for a full briefing.';
  }

  // Load news for context
  let newsItems = await fetchAll(80).catch(()=>[]);
  startTicker(getTickerItems(newsItems));

  const render = async (t) => {
    if (!t) return;
    const relevant = (await searchNews(t, newsItems)).slice(0,10);
    renderNewsCards('research-news', relevant, 10);

    // Profile results
    renderListItems('research-profiles', searchProfiles(t), 8);

    // Related profiles
    renderPersonCards('research-related', searchProfiles(t, 'All'), 8);

    // AI research
    const aiOut = $('ai-output');
    if (aiOut) {
      aiOut.innerHTML = '<div class="ai-output loading"><span class="spinner"></span> Generating comprehensive briefing…</div>';
      const newsContext = relevant.map(i => `${i.source}: ${i.title} — ${i.description}`).join('\n');
      const result = await claudeResearch(t, newsContext);
      aiOut.innerHTML = `<div class="ai-output" style="font-size:.88rem;line-height:1.75;white-space:normal">${formatResearchOutput(result)}</div>`;
    }
  };

  // Key setting
  const keyBtn = $('set-api-key');
  if (keyBtn) {
    keyBtn.addEventListener('click', () => {
      const k = prompt('Enter your Anthropic API key (starts with sk-ant-):');
      if (k && k.startsWith('sk-')) {
        window.__CLAUDE_KEY = k;
        sessionStorage.setItem('ts_claude_key', k);
        keyBtn.textContent = '✓ Key saved';
      }
    });
  }
  // Restore key
  const saved = sessionStorage.getItem('ts_claude_key');
  if (saved) window.__CLAUDE_KEY = saved;

  const form = document.querySelector('[data-research-form]');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      topic = new FormData(form).get('q') || '';
      if (inp) inp.value = topic;
      if (titleEl) titleEl.textContent = topic;
      history.replaceState(null,'',`research.html?q=${encodeURIComponent(topic)}`);
      render(topic);
    });
  }

  if (topic) render(topic);
}

async function loadProfile() {
  const id   = new URLSearchParams(location.search).get('id') || '';
  const item = getProfiles().find(p => p.id === id) || getProfiles()[0];
  if (!item) return;

  document.title = `${item.name} — TrendScope`;
  if ($('profile-title'))    $('profile-title').textContent    = item.name;
  if ($('profile-category')) $('profile-category').textContent = item.category;
  if ($('profile-summary'))  $('profile-summary').textContent  = item.summary;
  if ($('profile-overview')) $('profile-overview').textContent = item.overview||'';
  if ($('profile-why'))      $('profile-why').textContent      = item.why||'';
  if ($('profile-tags'))     $('profile-tags').innerHTML = (item.tags||[]).map(t=>`<span class="chip">${esc(t)}</span>`).join('');
  if ($('profile-angles'))   $('profile-angles').innerHTML = (item.angles||[]).map(a=>`<li style="margin:.4rem 0;color:var(--muted)">${esc(a)}</li>`).join('');
  if ($('profile-meta'))     $('profile-meta').textContent = item.category;

  logPageView(item.id).catch(()=>{});

  // Load news about this person
  const newsItems = await fetchAll(60).catch(()=>[]);
  startTicker(getTickerItems(newsItems));
  const personNews = await searchNews(item.name, newsItems);
  renderNewsCards('profile-news', personNews.length ? personNews : newsItems.slice(0,6), 8);

  // Related profiles
  renderPersonCards('related-profiles', getProfiles().filter(p => p.category===item.category && p.id!==item.id).slice(0,8));

  // AI overview
  const aiEl = $('profile-ai');
  if (aiEl) {
    const key = window.__CLAUDE_KEY || sessionStorage.getItem('ts_claude_key');
    if (key) {
      window.__CLAUDE_KEY = key;
      aiEl.innerHTML = '<span class="spinner"></span> Generating AI profile…';
      const nc = personNews.slice(0,5).map(i=>`${i.source}: ${i.title}`).join('\n');
      const result = await claudeResearch(`${item.name} (${item.category})`, nc);
      aiEl.innerHTML = `<div style="font-size:.85rem;line-height:1.75">${formatResearchOutput(result)}</div>`;
    } else {
      aiEl.innerHTML = '<p style="color:var(--muted);font-size:.85rem">Go to the <a href="research.html" style="color:var(--accent)">Research Lab</a> and set your API key to enable AI profiles.</p>';
    }
  }
}

async function loadTrending() {
  const newsItems = await fetchAll(100).catch(()=>[]);
  startTicker(getTickerItems(newsItems));

  // Render trending news by recency
  renderNewsCards('trending-now', newsItems.slice(0,20), 20);
  renderNewsCards('trending-world', newsItems.filter(i=>i.categories?.includes('World')).slice(0,10), 10);
  renderNewsCards('trending-finance', newsItems.filter(i=>i.categories?.includes('Finance')).slice(0,10), 10);
  renderNewsCards('trending-tech', newsItems.filter(i=>i.categories?.includes('Tech')||i.categories?.includes('Science')).slice(0,10), 10);

  // Trending people
  renderPersonCards('trending-people', getProfiles().slice(0,12), 12);

  // Trending searches
  const searches = await getTrendingSearches(10).catch(()=>[]);
  const searchEl = $('trending-searches');
  if (searchEl && searches.length) {
    searchEl.innerHTML = searches.map((t,i) => `
      <div class="trend-card" onclick="location.href='topics.html?q=${encodeURIComponent(t.query)}'">
        <div class="trend-rank">${i+1}</div>
        <span class="trend-badge trend-hot">🔥 Hot</span>
        <h3>${esc(t.query)}</h3>
        <p style="font-size:.78rem;color:var(--muted)">${t.count} searches</p>
      </div>
    `).join('');
  }
}

async function loadCategories() {
  const newsItems = await fetchAll(40).catch(()=>[]);
  startTicker(getTickerItems(newsItems));

  // Profile categories
  const catGrid = $('profile-cats');
  if (catGrid) {
    const icons = {
      'Celebrities':'🌟','Sports':'⚽','Tech & Business':'💼','Politics':'🏛️',
      'History':'📜','Education':'📚','Entertainment':'🎬','Science':'🔬',
    };
    catGrid.innerHTML = Object.entries(PEOPLE_CATEGORIES).map(([cat, subs]) => `
      <div class="cat-nav-item" onclick="location.href='people.html?cat=${encodeURIComponent(cat)}'">
        <span class="cat-icon">${icons[cat]||'📌'}</span>
        <div class="cat-name">${esc(cat)}</div>
        <div class="cat-count">${subs.length} types • ${getProfiles().filter(p=>subs.includes(p.category)).length} profiles</div>
      </div>
    `).join('');
  }

  // News categories
  const newsGrid = $('news-cats');
  if (newsGrid) {
    const ncIcons = {
      'World':'🌍','US Politics':'🇺🇸','Finance':'💰','Tech':'💻',
      'Science':'🔭','Sports':'🏆','Entertainment':'🎭','Middle East':'🕌','All':'📰',
    };
    newsGrid.innerHTML = CATEGORIES.filter(c=>c!=='All').map(cat => `
      <div class="cat-nav-item" onclick="location.href='news.html?cat=${encodeURIComponent(cat)}'">
        <span class="cat-icon">${ncIcons[cat]||'📌'}</span>
        <div class="cat-name">${esc(cat)}</div>
        <div class="cat-count">${CAT_SOURCES[cat]?.length||0} sources</div>
      </div>
    `).join('');
  }
}

/* ── bind search forms that go to topics.html ───────── */
function bindGlobalSearch() {
  document.querySelectorAll('[data-topic-form]').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const q = new FormData(form).get('q') || '';
      if (q) logSearch(q).catch(()=>{});
      location.href = `topics.html?q=${encodeURIComponent(q)}`;
    });
  });
}

/* ── init ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  bindGlobalSearch();
  bindNewsletterForms();

  const page = document.body.dataset.page;
  if (page === 'home')       loadDashboard();
  if (page === 'news')       loadNewsPage();
  if (page === 'people')     loadPeople();
  if (page === 'topics')     loadTopics();
  if (page === 'research')   loadResearch();
  if (page === 'profile')    loadProfile();
  if (page === 'trending')   loadTrending();
  if (page === 'categories') loadCategories();

  setTimeout(pushAds, 1500);
});

// Expose for inline onclick
window.TS = { searchProfiles, renderNewsCards, renderPersonCards };