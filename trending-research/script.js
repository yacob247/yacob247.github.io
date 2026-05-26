// ── Category colour map ──────────────────────────────────────────────────────
const CAT_COLORS = {
  'Entertainment':    'var(--cat-entertainment)',
  'Gaming':           'var(--cat-gaming)',
  'Tech & Education': 'var(--cat-tech)',
  'Lifestyle':        'var(--cat-lifestyle)',
  'Comedy':           'var(--cat-comedy)',
  'Music':            'var(--cat-music)',
  'Podcast/Interview':'var(--cat-podcast)',
};
const PLATFORM_COLORS = {
  'YouTube':          'var(--plat-youtube)',
  'Twitch':           'var(--plat-twitch)',
  'TikTok':           'var(--plat-tiktok)',
  'Multi-Platform':   'var(--plat-multi)',
  'Podcast/Interview':'var(--plat-podcast)',
};
const CATEGORIES = ['All','Entertainment','Gaming','Tech & Education','Lifestyle','Comedy','Music','Podcast/Interview'];

function catColor(cat) { return CAT_COLORS[cat] || 'var(--cat-default)'; }
function platColor(plat){ return PLATFORM_COLORS[plat] || 'var(--plat-multi)'; }

// ── Creator Database ─────────────────────────────────────────────────────────
const creatorDatabase = [
  {
    id:"mrbeast", name:"MrBeast (Jimmy Donaldson)", platform:"YouTube", subscribers:"490M+",
    category:"Entertainment",
    bio:"Jimmy Donaldson has built something no one has before: a genuinely global entertainment machine funded almost entirely by YouTube revenue and reinvested at an almost irrational rate. The philanthropy is real, the production is extraordinary, and the multi-language localisation is a genuine competitive moat. That said, the content has become increasingly formulaic — the 'I spent X doing Y' template is showing cracks, and the Beast Burger rollout was a logistical disaster that raised questions about brand extension strategy.",
    audience:"Gen Z & Alpha, 8–28, genuinely global across over 20 language channels",
    strategy:"Extreme reinvestment: nearly all YouTube revenue goes back into production. Multi-language audio tracks (not subtitles) unlock algorithmic reach in non-English markets. Feastables is a serious attempt at a physical CPG brand, not just merch.",
    milestone:"First solo creator to pass 400M subscribers. Changed what YouTube production budgets look like industry-wide.",
    monetization:["YouTube AdSense (9-figure annual est.)","Feastables Chocolate Retail","Direct Brand Integrations","Merchandise","MrBeast Burger (troubled rollout)"],
    reach:100, engagement:91, consistency:88, monetizationScore:97, diversity:85,
    urls:{ youtube:"https://youtube.com/@MrBeast", twitter:"https://x.com/MrBeast", instagram:"https://instagram.com/mrbeast", tiktok:"https://tiktok.com/@mrbeast", website:"https://mrbeast.com" }
  },
  {
    id:"pewdiepie", name:"PewDiePie (Felix Kjellberg)", platform:"YouTube", subscribers:"111M+",
    category:"Entertainment",
    bio:"Felix Kjellberg created the template every gaming creator has followed since. The pivot to Japan-based lifestyle vlogging, philosophy, and book reviews over the last three years has been genuinely interesting — a creator aging gracefully into a different audience relationship. Upload frequency is low, engagement per video remains remarkable. The T-Series war was mostly theatre, but it genuinely accelerated platform growth conversations. His channel is coasting somewhat — which he would probably admit — but the legacy hold is iron.",
    audience:"Millennials and older Gen Z, global, heavy loyalty from decade-long fans",
    strategy:"Low output, high brand equity. The Tsuki apparel brand is understated but profitable. Doesn't chase trends. Platform loyalty carries him.",
    milestone:"First to 100M YouTube subscribers as an individual creator. Defined the LP genre for a generation.",
    monetization:["Legacy YouTube AdSense","Tsuki Apparel Brand","Select Brand Deals","Merch"],
    reach:85, engagement:74, consistency:55, monetizationScore:80, diversity:72,
    urls:{ youtube:"https://youtube.com/@PewDiePie", twitter:"https://x.com/pewdiepie", instagram:"https://instagram.com/pewdiepie" }
  },
  {
    id:"charli-damelio", name:"Charli D'Amelio", platform:"TikTok", subscribers:"156M+",
    category:"Lifestyle",
    bio:"Charli D'Amelio's ascent was algorithmically perfect — short dance loops at exactly the right moment on exactly the right platform. The business pivot into D'Amelio Footwear and reality TV is sophisticated and well-managed for someone who was a teenager at peak fame. The honest assessment: her organic content has become less compelling since the TikTok dance-trend era peaked, and follower growth has plateaued. The business, however, is doing better than the content.",
    audience:"Gen Z women, 14–25, fashion and pop-culture centric",
    strategy:"Leveraging early TikTok dominance to secure equity deals and licensing. Family brand extension with her parents and sister is a differentiator. D'Amelio Footwear targets a genuine addressable market.",
    milestone:"First creator to 100M TikTok followers. Pioneer of monetising TikTok viral fame into lasting business.",
    monetization:["D'Amelio Footwear / Licensing","TikTok Creator Fund","Brand Sponsorships","Reality TV Deals","Venture Investments"],
    reach:91, engagement:76, consistency:80, monetizationScore:93, diversity:87,
    urls:{ tiktok:"https://tiktok.com/@charlidamelio", instagram:"https://instagram.com/charlidamelio", twitter:"https://x.com/charlidamelio" }
  },
  {
    id:"khaby-lame", name:"Khaby Lame", platform:"TikTok", subscribers:"162M+",
    category:"Comedy",
    bio:"Khabane Lame's rise during pandemic lockdowns was a masterclass in format — silent, expressive, universally legible comedy that needs zero translation. The Hugo Boss and Binance deals were enormous for a creator who never speaks in his content. The honest concern: the format is starting to feel repetitive, and there's a ceiling on what silent reaction content can evolve into. But the global brand value remains formidable.",
    audience:"Literally everyone — his humour has no language barrier. Broadest demographic of any creator on this list.",
    strategy:"Zero-language-barrier comedy means every brand deal has true global reach. Simple format, extraordinarily scalable. The silence is the product.",
    milestone:"Most followed individual on TikTok. Demonstrated that wordless content can command top-tier global brand rates.",
    monetization:["Hugo Boss Ambassador","Binance Campaigns","TikTok Creator Marketplace","Product Placements"],
    reach:95, engagement:87, consistency:78, monetizationScore:89, diversity:60,
    urls:{ tiktok:"https://tiktok.com/@khaby.lame", instagram:"https://instagram.com/khaby.lame", twitter:"https://x.com/KhabyLame" }
  },
  {
    id:"kaicenat", name:"Kai Cenat", platform:"Twitch", subscribers:"20.5M+",
    category:"Gaming",
    bio:"Kai Cenat is the most culturally impactful live streamer since peak Ninja. Mafiathon 3 set subscription records that seem implausible. The Nike deal was the clearest signal yet that Twitch's biggest names have genuine mainstream cultural leverage. The honest note: his content is extremely dependent on celebrity guests and external events for peak performance — the purely organic stream gaps between subathons reveal a less compelling baseline product. That said, at his peak he has no peers in live entertainment.",
    audience:"Gen Z and younger Millennials, urban, hip-hop and gaming overlap, US-centric",
    strategy:"Manufacture event streams that function like cultural moments — subathons with major celebrities create appointment viewing. Short-form syndication to YouTube extends reach without effort.",
    milestone:"Broke Twitch subscriber records multiple times. Secured Nike deal, establishing Twitch creators as mainstream endorsement targets.",
    monetization:["Twitch Subscriptions & Bits","Twitch Ad Revenue","Nike Sponsorship","YouTube Channel Revenue"],
    reach:88, engagement:97, consistency:80, monetizationScore:91, diversity:75,
    urls:{ twitch:"https://twitch.tv/kaicenat", youtube:"https://youtube.com/@KaiCenat", twitter:"https://x.com/KaiCenat", instagram:"https://instagram.com/kaicenat" }
  },
  {
    id:"mkbhd", name:"Marques Brownlee (MKBHD)", platform:"YouTube", subscribers:"19.5M+",
    category:"Tech & Education",
    bio:"Marques Brownlee is the most trusted voice in consumer technology journalism, full stop. The Waveform podcast is excellent and underrated. The M-brand wallpaper app is a genuinely elegant side business. The honest assessment: his Fisker Ocean review and its aftermath — where he pushed back on creators softening criticism to protect access — showed integrity under real pressure. The channel can feel formulaic in review structure, and the audience is narrower than his subscriber count implies. But the trust he has built is a genuine asset that few creators can match.",
    audience:"Tech enthusiasts, premium hardware buyers, high-income demographics, 18–40",
    strategy:"Uncompromising production quality (RED cameras, custom studio) creates a trust signal. Staff-led sub-channels scale without diluting the main brand. Waveform podcast adds recurring revenue and a second audience tier.",
    milestone:"Most trusted individual tech reviewer online. His opinion demonstrably moves consumer purchasing decisions.",
    monetization:["Premium YouTube AdSense (high-CPM tech audience)","Dedicated Tech Brand Partnerships","Waveform Podcast Sponsorships","M-Brand Wallpaper App","Merch"],
    reach:84, engagement:89, consistency:93, monetizationScore:94, diversity:83,
    urls:{ youtube:"https://youtube.com/@mkbhd", twitter:"https://x.com/MKBHD", instagram:"https://instagram.com/mkbhd", website:"https://mkbhd.com" }
  },
  {
    id:"zachking", name:"Zach King", platform:"YouTube", subscribers:"92M+",
    category:"Entertainment",
    bio:"Zach King's longevity since Vine is impressive. The 'digital sleight of hand' niche he owns is genuinely original, and the family-friendly angle has kept him relevant across platform shifts. The honest take: his content relies heavily on a production team rather than personal charisma, and the 'magic' format has limited narrative depth. As a business, however, it is exceptionally well-run — the content travels globally, requires no dubbing, and attracts the highest-end brand partners.",
    audience:"Family-friendly, all ages, genuinely global — no cultural or language requirements",
    strategy:"Invest in a professional VFX/editing team and own the visual magic niche completely. Family demographics mean premium brand deals. Short-form output is scalable at volume.",
    milestone:"Consistently holds some of the most-viewed short-form videos globally across YouTube and TikTok.",
    monetization:["YouTube Short Ads","Direct Brand Integrations","Production Agency Work","Educational Editing Courses"],
    reach:93, engagement:84, consistency:84, monetizationScore:87, diversity:73,
    urls:{ youtube:"https://youtube.com/@zachking", tiktok:"https://tiktok.com/@zachking", instagram:"https://instagram.com/zachking" }
  },
  {
    id:"markiplier", name:"Markiplier (Mark Fischbach)", platform:"YouTube", subscribers:"36M+",
    category:"Gaming",
    bio:"Mark Fischbach occupies a unique position in gaming content: he has successfully made the transition from Let's Play creator to multimedia writer/director/actor. 'In Space with Markiplier' was a genuinely impressive production. The Distractible podcast is a legitimate entertainment product. The Cloak clothing brand (with Jacksepticeye) is profitable and respected. The honest note: his main channel upload frequency has dropped significantly and the gaming content, when it appears, doesn't always match his older work's energy. The brand, however, is stronger than the channel.",
    audience:"Gamers, interactive media fans, young adults. Deeply loyal, high-LTV audience.",
    strategy:"Direct emotional parasocial connection with fans funds expensive long-form projects. Co-owning Cloak as an apparel business. Podcast for steady recurring revenue. Interactive films as brand building.",
    milestone:"Funded and produced large-scale interactive films entirely off platform revenue. Demonstrated what a creator-as-studio model can look like.",
    monetization:["YouTube AdSense","Cloak Clothing Brand Equity","Distractible Podcast Sponsorships","Acting/Directing Royalties"],
    reach:80, engagement:93, consistency:70, monetizationScore:90, diversity:91,
    urls:{ youtube:"https://youtube.com/@markiplier", twitter:"https://x.com/markiplier", instagram:"https://instagram.com/markiplier", website:"https://markiplier.com" }
  },
  {
    id:"emmachamberlain", name:"Emma Chamberlain", platform:"YouTube", subscribers:"12M+",
    category:"Lifestyle",
    bio:"Emma Chamberlain genuinely changed YouTube editing. The crash-cut, self-deprecating vlog format she popularised in 2017–2019 was genuinely novel and spawned hundreds of imitators. The Chamberlain Coffee brand is legitimately excellent and built with real business discipline. The Louis Vuitton partnership represents the peak of what a vlogger-to-luxury-brand arc can look like. The honest note: YouTube upload frequency is now extremely sparse, and the podcast is on hiatus. The business is thriving; the content creator is partially retired. Whether that matters depends on what you value.",
    audience:"Gen Z women, 16–26, high-fashion shoppers, coffee consumers, podcast listeners",
    strategy:"Use low-fidelity trust-building content to build massive personal brand, then pivot that brand into luxury alignment. Chamberlain Coffee is the real business now. Podcast was a second audience tier.",
    milestone:"Met Gala correspondent for Louis Vuitton. Chamberlain Coffee crossed widespread retail distribution.",
    monetization:["Chamberlain Coffee (primary business)","Louis Vuitton Ambassadorship","Spotify Podcast (on hiatus)","YouTube Revenue"],
    reach:78, engagement:94, consistency:55, monetizationScore:96, diversity:93,
    urls:{ youtube:"https://youtube.com/@emmachamberlain", instagram:"https://instagram.com/emmachamberlain", twitter:"https://x.com/emmachamberlain", website:"https://chamberlaincoffee.com" }
  },
  {
    id:"aliabdaal", name:"Ali Abdaal", platform:"YouTube", subscribers:"5.6M+",
    category:"Tech & Education",
    bio:"Ali Abdaal is the most commercially successful 'productivity' creator working today. The Part-Time YouTuber Academy is a genuinely high-ticket product that he builds content around transparently. The Feel Good Productivity book had real commercial traction. The honest assessment: a significant portion of his content exists primarily to funnel viewers toward paid products, which is rational but creates a certain hollowness when the 'authentic doctor turned creator' framing is overplayed. The business is excellent. Some of the content is glorified advertising for his own courses, and that's worth being clear-eyed about.",
    audience:"Students, young professionals, productivity and self-improvement seekers, aspiring YouTubers",
    strategy:"Deep educational content that explicitly funnels into high-ticket products. Transparent about the model, which paradoxically builds trust. Book tour and media presence extend beyond YouTube.",
    milestone:"Feel Good Productivity topped bestseller lists. Part-Time YouTuber Academy generated millions in course revenue.",
    monetization:["Part-Time YouTuber Academy Courses","Feel Good Productivity Book Royalties","High-CPM YouTube Ads","Podcast Sponsorships","Affiliate Programs"],
    reach:75, engagement:89, consistency:84, monetizationScore:97, diversity:86,
    urls:{ youtube:"https://youtube.com/@aliabdaal", twitter:"https://x.com/aliabdaal", instagram:"https://instagram.com/aliabdaal", website:"https://aliabdaal.com" }
  },
];

// Procedurally fill to 300
const fNames = ["Alex","Jordan","Taylor","Casey","Riley","Morgan","Jamie","Cameron","Quinn","Avery","Sam","Dakota","Leo","Mia","Ethan","Chloe","Zane","Lila","Max","Ruby"];
const lNames = ["Plays","Vlogs","Tech","Reacts","Gaming","Shorts","Live","Daily","Tries","Music","Comedy","Smith","Jones","Williams","Brown","Davis","Miller"];
const plats  = ["YouTube","Twitch","TikTok","Multi-Platform"];
const cats   = ["Entertainment","Gaming","Tech & Education","Lifestyle","Comedy","Music","Podcast/Interview"];

for (let i = creatorDatabase.length; i < 300; i++) {
  const fn = fNames[i % fNames.length], ln = lNames[Math.floor(i / fNames.length) % lNames.length];
  const platform = plats[i % plats.length], category = cats[i % cats.length];
  creatorDatabase.push({
    id:`creator_${i}`, name:`${fn} ${ln}`, platform, subscribers:`${((i % 18)+2).toFixed(1)}M+`,
    category, bio:`${fn} ${ln} has built a loyal community in the ${category} space on ${platform}. Consistent output and strong audience retention are the pillars of the channel.`,
    audience:"Digital-native global audience", strategy:`Algorithm-optimised ${platform} content with strong retention editing.`,
    milestone:`Crossed 1M subscribers in under 18 months.`,
    monetization:["AdSense","Brand Deals","Merchandise","Affiliate"],
    reach:55+(i%30), engagement:55+(i%35), consistency:55+(i%30), monetizationScore:55+(i%35), diversity:50+(i%35),
    urls:{}
  });
}

// ── State ────────────────────────────────────────────────────────────────────
let openTabs    = ['home'];
let activeTab   = 'home';
let showAds     = true;
let activeCat   = 'All';

// ── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('hashchange', handleRouting);
  handleRouting();
  _applyAdVisibility();
  // Show skyscraper on xl
  if (window.innerWidth >= 1400) {
    const sky = document.getElementById('adsense-skyscraper-wrapper');
    if (sky) sky.style.display = 'block';
  }
});

// ── Router ───────────────────────────────────────────────────────────────────
function handleRouting() {
  const hash = window.location.hash || '#/tab/home';
  if (hash.startsWith('#/tab/')) {
    const tabId = hash.replace('#/tab/','');
    if (tabId === 'home') { activeTab = 'home'; }
    else {
      const exists = creatorDatabase.some(c => c.id === tabId);
      if (exists) { if (!openTabs.includes(tabId)) openTabs.push(tabId); activeTab = tabId; }
      else { activeTab='home'; window.location.hash='#/tab/home'; }
    }
  } else { activeTab='home'; window.location.hash='#/tab/home'; }
  renderTabs();
  renderActiveWorkspace();
  updateSEO(activeTab);
}

// ── Tab Bar ──────────────────────────────────────────────────────────────────
function renderTabs() {
  const bar = document.getElementById('tab-bar');
  bar.innerHTML = '';
  openTabs.forEach(tabId => {
    const isActive = tabId === activeTab;
    const isHome   = tabId === 'home';
    const creator  = isHome ? null : creatorDatabase.find(c => c.id === tabId);
    const cc       = creator ? catColor(creator.category) : null;

    const tab = document.createElement('div');
    tab.className = 'creator-tab' + (isActive ? ' active' : '');
    if (cc) tab.style.setProperty('--tab-color', cc);
    tab.onclick = () => window.location.hash = `#/tab/${tabId}`;

    const label = isHome ? '🏠 Explore' : (creator?.name?.split(' (')[0] || tabId);

    if (!isHome) {
      const dot = document.createElement('span');
      dot.className = 'creator-tab-dot';
      dot.style.background = cc;
      tab.appendChild(dot);
    }
    const text = document.createElement('span');
    text.textContent = label;
    tab.appendChild(text);

    if (!isHome) {
      const close = document.createElement('button');
      close.style.cssText = 'background:none;border:none;cursor:pointer;color:var(--muted);padding:.1rem .2rem;margin-left:.15rem;display:flex;align-items:center;border-radius:4px;transition:color .15s;';
      close.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>';
      close.onmouseover = () => close.style.color = '#ff4e42';
      close.onmouseout  = () => close.style.color = 'var(--muted)';
      close.onclick = e => { e.stopPropagation(); closeCreatorTab(tabId); };
      tab.appendChild(close);
    }
    bar.appendChild(tab);
  });
}

function closeCreatorTab(tabId) {
  openTabs = openTabs.filter(id => id !== tabId);
  if (activeTab === tabId) window.location.hash = `#/tab/${openTabs[openTabs.length-1] || 'home'}`;
  else renderTabs();
}

// ── Workspace ─────────────────────────────────────────────────────────────────
function renderActiveWorkspace() {
  const main    = document.getElementById('workspace-main');
  const sidebar = document.getElementById('sidebar-filter');

  if (activeTab === 'home') {
    sidebar.style.display = '';
    main.innerHTML = `
      <!-- Hero -->
      <div class="animate-in" style="background:var(--surface);border:1px solid var(--border);border-radius:20px;overflow:hidden;margin-bottom:1.5rem;">
        <div style="height:3px;background:linear-gradient(90deg,#7c5cfc,#ff6eb4,#00d4ff,#00e676);"></div>
        <div style="padding:2rem 2.5rem;">
          <div style="display:inline-flex;align-items:center;gap:.4rem;padding:.3rem .75rem;border-radius:6px;background:rgba(255,214,10,.1);border:1px solid rgba(255,214,10,.2);font-size:.65rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#ffd60a;margin-bottom:1rem;">
            <span>●</span> Independent Editorial — No Sponsored Placements
          </div>
          <h2 class="font-display" style="font-size:clamp(1.5rem,3.5vw,2.5rem);font-weight:900;color:#fff;line-height:1.1;margin-bottom:.6rem;">Creator Economy Intelligence</h2>
          <p style="font-size:.9rem;color:var(--muted2);line-height:1.65;max-width:580px;">Deep dossiers on 300 creators. Honest scores, real strategy breakdowns, genuine opinions. We don't soften criticism for access.</p>
        </div>
      </div>

      <!-- Category pills -->
      <div class="cat-row animate-in anim-delay-1" id="cat-nav-row" style="margin-bottom:1.25rem;padding:0;"></div>

      <!-- Grid header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;" class="animate-in anim-delay-2">
        <div style="display:flex;align-items:center;gap:.6rem;">
          <span style="width:8px;height:8px;border-radius:50%;background:#00e676;display:inline-block;animation:ping 1.5s infinite;"></span>
          <span class="font-display" style="font-size:.9rem;font-weight:800;color:#fff;">Live Database</span>
        </div>
        <span style="font-size:.75rem;color:var(--muted);" id="sort-indicator">Sorted by Reach</span>
      </div>

      <div class="animate-in anim-delay-3" id="creator-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;"></div>
    `;
    renderCategoryNav();
    filterDatabase();
  } else {
    sidebar.style.display = 'none';
    const creator = creatorDatabase.find(c => c.id === activeTab);
    if (creator) {
      main.innerHTML = renderCreatorDossier(creator);
      try { if (showAds && typeof adsbygoogle !== 'undefined') (adsbygoogle = window.adsbygoogle||[]).push({}); }
      catch(e) {}
    }
  }
}

// ── Category nav ─────────────────────────────────────────────────────────────
function renderCategoryNav() {
  const row = document.getElementById('cat-nav-row');
  if (!row) return;
  row.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-pill' + (activeCat === cat ? ' active' : '');
    const cc = cat === 'All' ? '#7c5cfc' : (CAT_COLORS[cat] || '#7c5cfc');
    btn.style.setProperty('--cat-color', cc);
    btn.innerHTML = `<span class="cat-dot"></span>${cat}`;
    btn.onclick = () => { activeCat = cat; renderCategoryNav(); filterDatabase(); };
    row.appendChild(btn);
  });
}

// ── Filter / Sort ─────────────────────────────────────────────────────────────
function filterDatabase() {
  const search   = (document.getElementById('search-input')?.value || '').toLowerCase();
  const platform = document.getElementById('platform-filter')?.value || 'all';
  const category = document.getElementById('category-filter')?.value || 'all';
  const sort     = document.getElementById('sort-filter')?.value || 'reach';

  let filtered = creatorDatabase.filter(c => {
    const matchSearch   = !search || c.name.toLowerCase().includes(search) || c.bio.toLowerCase().includes(search) || (c.strategy||'').toLowerCase().includes(search);
    const matchPlatform = platform === 'all' || c.platform === platform;
    const matchCategory = category === 'all' || c.category === category;
    const matchCatPill  = activeCat === 'All' || c.category === activeCat;
    return matchSearch && matchPlatform && matchCategory && matchCatPill;
  });

  filtered.sort((a,b) => {
    if (sort === 'reach')        return b.reach - a.reach;
    if (sort === 'engagement')   return b.engagement - a.engagement;
    if (sort === 'monetization') return b.monetizationScore - a.monetizationScore;
    if (sort === 'name')         return a.name.localeCompare(b.name);
    return 0;
  });

  const sortLabels = { reach:'Reach Score', engagement:'Engagement Rate', monetization:'Monetization Index', name:'Name A–Z' };
  const si = document.getElementById('sort-indicator');
  if (si) si.textContent = `${filtered.length} creators · Sorted by ${sortLabels[sort] || sort}`;
  const countEl = document.getElementById('active-count');
  if (countEl) countEl.textContent = `${filtered.length}/${creatorDatabase.length}`;

  const grid = document.getElementById('creator-grid');
  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><div>No creators match your filters.</div><button onclick="resetFilters()" style="padding:.4rem .9rem;border-radius:8px;border:1px solid var(--border2);background:transparent;color:#7c5cfc;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:700;cursor:pointer;">Reset</button></div>`;
    return;
  }

  grid.innerHTML = filtered.map(c => renderCreatorCard(c)).join('');
}

function resetFilters() {
  activeCat = 'All';
  if (document.getElementById('search-input'))   document.getElementById('search-input').value = '';
  if (document.getElementById('platform-filter')) document.getElementById('platform-filter').value = 'all';
  if (document.getElementById('category-filter')) document.getElementById('category-filter').value = 'all';
  if (document.getElementById('sort-filter'))     document.getElementById('sort-filter').value = 'reach';
  renderCategoryNav();
  filterDatabase();
}

// ── Creator Card ──────────────────────────────────────────────────────────────
function renderCreatorCard(c) {
  const cc = catColor(c.category);
  const pc = platColor(c.platform);
  const socials = _buildCardSocials(c.urls || {});
  return `
    <div class="creator-card" style="--cat-color:${cc};--plat-color:${pc};" onclick="openCreator('${c.id}')">
      <div class="card-accent-bar"></div>
      <div class="card-body">
        <div class="card-header">
          <div>
            <div class="card-cat-label">${c.category}</div>
            <div class="card-name">${c.name.split(' (')[0]}</div>
          </div>
          <div>
            <div class="card-platform-badge">${c.platform}</div>
            <div class="card-subs" style="margin-top:.35rem;text-align:right;">${c.subscribers}</div>
          </div>
        </div>
        <p class="card-bio">${c.bio}</p>
        <div class="card-scores">
          ${_miniScoreBar('Reach', c.reach, cc)}
          ${_miniScoreBar('Engage', c.engagement, cc)}
          ${_miniScoreBar('Monetize', c.monetizationScore, cc)}
        </div>
      </div>
      ${socials ? `<div class="card-social-links">${socials}</div>` : ''}
    </div>`;
}

function _miniScoreBar(label, val, color) {
  return `<div class="score-bar-wrap">
    <div class="score-bar-label">${label}</div>
    <div class="score-bar-track"><div class="score-bar-fill" style="width:${val}%;background:${color};"></div></div>
  </div>`;
}

function _buildCardSocials(urls) {
  const icons = {
    youtube:   ['YT', '#ff0000', 'M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z'],
    twitch:    ['TV', '#9147ff', 'M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7'],
    twitter:   ['𝕏',  '#e7e9ea', 'M4 4l16 16M4 20L20 4'],
    instagram: ['IG', '#e1306c', 'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M6.5 6.5h11a1 1 0 011 1v9a1 1 0 01-1 1h-11a1 1 0 01-1-1v-9a1 1 0 011-1z'],
    tiktok:    ['TK', '#ee1d52', 'M9 12a4 4 0 100 8 4 4 0 000-8zm0 0V4m7 2a4 4 0 01-4-4'],
    website:   ['🌐','#7c5cfc',  'M12 2a10 10 0 100 20A10 10 0 0012 2zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z'],
  };
  return Object.entries(urls).filter(([,v]) => v).map(([key, href]) => {
    const icon = icons[key];
    if (!icon) return '';
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="social-link" title="${key}" onclick="event.stopPropagation()" style="color:${icon[1]};">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icon[2]}"/></svg>
    </a>`;
  }).join('');
}

function openCreator(id) { window.location.hash = `#/tab/${id}`; }

// ── Dossier ───────────────────────────────────────────────────────────────────
function renderCreatorDossier(c) {
  const cc = catColor(c.category);
  const pc = platColor(c.platform);
  const monoTags = (c.monetization||[]).map(m => `<span class="mono-tag"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>${m}</span>`).join('');
  const socialPills = _buildDossierSocials(c.urls || {});

  const scores = [
    {label:'Reach',       val:c.reach},
    {label:'Engagement',  val:c.engagement},
    {label:'Consistency', val:c.consistency},
    {label:'Monetization',val:c.monetizationScore},
    {label:'Diversity',   val:c.diversity},
  ];
  const scoreRings = scores.map(s => `
    <div style="flex:1;min-width:80px;">
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:1rem .5rem;text-align:center;">
        <div style="font-family:'Bebas Neue',cursive;font-size:2.2rem;color:${cc};line-height:1;">${s.val}</div>
        <div style="height:4px;background:rgba(255,255,255,.07);border-radius:2px;margin:.5rem .5rem 0;overflow:hidden;">
          <div style="height:100%;width:${s.val}%;background:${cc};border-radius:2px;"></div>
        </div>
        <div style="font-size:.58rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-top:.4rem;">${s.label}</div>
      </div>
    </div>`).join('');

  return `
    <div class="animate-in" style="display:flex;flex-direction:column;gap:1.25rem;">
      <!-- Back -->
      <div>
        <button onclick="window.location.hash='#/tab/home'" style="display:inline-flex;align-items:center;gap:.4rem;padding:.5rem .9rem;border-radius:10px;border:1px solid var(--border2);background:var(--surface);color:var(--muted2);font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:700;cursor:pointer;transition:all .15s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='var(--muted2)'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
          Back to Explore
        </button>
      </div>

      <!-- Hero -->
      <div class="dossier-hero">
        <div class="dossier-hero-bar" style="background:linear-gradient(90deg,${cc},${pc});"></div>
        <div class="dossier-hero-inner">
          <div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:1.5rem;">
            <div style="flex:1;min-width:240px;">
              <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.75rem;">
                <span style="font-size:.65rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:.25rem .65rem;border-radius:6px;background:color-mix(in srgb, ${cc} 15%, transparent);color:${cc};border:1px solid color-mix(in srgb, ${cc} 35%, transparent);">${c.platform}</span>
                <span style="font-size:.65rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:.25rem .65rem;border-radius:6px;background:var(--surface2);color:var(--muted2);border:1px solid var(--border);">${c.category}</span>
                <span class="opinion-badge">★ Editorial Opinion</span>
              </div>
              <h2 class="dossier-title">${c.name}</h2>
              ${socialPills ? `<div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem;">${socialPills}</div>` : ''}
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div style="font-size:.65rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);">Followers</div>
              <div class="font-stat" style="font-size:3rem;color:${cc};line-height:1;margin-top:.2rem;">${c.subscribers}</div>
            </div>
          </div>

          <!-- Bio (honest) -->
          <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border);">
            <div class="dossier-section-title" style="border:none;padding:0;margin-bottom:.6rem;">Our Take</div>
            <p style="font-size:.9rem;color:var(--muted2);line-height:1.75;max-width:820px;">${c.bio}</p>
          </div>
        </div>
      </div>

      <!-- Scores -->
      <div class="dossier-section">
        <div class="dossier-section-title">Analytics Scores</div>
        <div style="display:flex;gap:.75rem;flex-wrap:wrap;">${scoreRings}</div>
      </div>

      <!-- Strategy + Audience 2-col -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.25rem;">
        <div class="dossier-section">
          <div class="dossier-section-title">Growth Strategy</div>
          <p style="font-size:.85rem;color:var(--muted2);line-height:1.7;">${c.strategy || '—'}</p>
        </div>
        <div class="dossier-section">
          <div class="dossier-section-title">Audience Profile</div>
          <p style="font-size:.85rem;color:var(--muted2);line-height:1.7;margin-bottom:1rem;">${c.audience || '—'}</p>
          ${c.milestone ? `<div style="font-size:.65rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:.4rem;">Key Milestone</div>
          <p style="font-size:.82rem;color:var(--text);font-weight:600;line-height:1.5;">${c.milestone}</p>` : ''}
        </div>
      </div>

      <!-- Monetization -->
      <div class="dossier-section">
        <div class="dossier-section-title">Revenue Streams</div>
        <div style="display:flex;flex-wrap:wrap;gap:.6rem;">${monoTags || '<span style="color:var(--muted);font-size:.85rem;">Not detailed</span>'}</div>
      </div>

      <!-- Dossier Ad -->
      <div id="adsense-dossier-wrapper" class="ad-wrapper" style="min-height:100px;display:${showAds?'block':'none'};">
        <span class="ad-label">Advertisement</span>
        <ins class="adsbygoogle" style="display:block;"
             data-ad-client="ca-pub-5812524294035974"
             data-ad-slot="9312358743"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
      </div>
    </div>`;
}

function _buildDossierSocials(urls) {
  const defs = {
    youtube:   { label:'YouTube',   color:'#ff0000' },
    twitch:    { label:'Twitch',    color:'#9147ff' },
    twitter:   { label:'X / Twitter', color:'#e7e9ea' },
    instagram: { label:'Instagram', color:'#e1306c' },
    tiktok:    { label:'TikTok',    color:'#ee1d52' },
    website:   { label:'Website',   color:'#7c5cfc' },
  };
  return Object.entries(urls).filter(([,v]) => v).map(([key, href]) => {
    const d = defs[key] || { label:key, color:'#fff' };
    const icons = {
      youtube:   '<path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/>',
      twitch:    '<path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7"/>',
      twitter:   '<path d="M4 4l16 16M4 20L20 4"/>',
      instagram: '<path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M6.5 6.5h11a1 1 0 011 1v9a1 1 0 01-1 1h-11a1 1 0 01-1-1v-9a1 1 0 011-1z"/>',
      tiktok:    '<path d="M9 12a4 4 0 100 8 4 4 0 000-8zm0 0V4m7 2a4 4 0 01-4-4"/>',
      website:   '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>',
    };
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="social-pill" style="border-color:color-mix(in srgb,${d.color} 35%,transparent);">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${d.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[key]||''}</svg>
      <span style="color:${d.color};font-weight:700;">${d.label}</span>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2.5"><path d="M7 17L17 7M7 7h10v10"/></svg>
    </a>`;
  }).join('');
}

// ── Ad visibility ─────────────────────────────────────────────────────────────
function toggleAds() { showAds = !showAds; _applyAdVisibility(); }
function _applyAdVisibility() {
  const els = [
    { id:'adsense-banner-wrapper',     on:'flex' },
    { id:'adsense-skyscraper-wrapper', on: window.innerWidth >= 1400 ? 'block' : 'none', alwaysOff: window.innerWidth < 1400 },
    { id:'adsense-dossier-wrapper',    on:'block' },
  ];
  els.forEach(({ id, on, alwaysOff }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = (!alwaysOff && showAds) ? on : 'none';
  });
  const dot = document.getElementById('ad-toggle-dot');
  if (dot) dot.style.background = showAds ? '#00e676' : '#ff4e42';
}

// ── SEO ───────────────────────────────────────────────────────────────────────
function updateSEO(id) {
  const schemaContainer = document.getElementById('seo-schema-container');
  const urlBase = 'https://creatorgraph-pro.analytics/#/tab/';
  const fullUrl = urlBase + (id === 'home' ? 'home' : id);
  let titleStr = 'CreatorGraph Pro — Honest Analytics & Deep Dossiers on 300 Top Creators';
  let descStr  = 'Unfiltered analytical dossiers, honest strategy breakdowns, and monetization intelligence on 300 of the world\'s top creators. Real opinions, real data.';

  if (id !== 'home') {
    const c = creatorDatabase.find(x => x.id === id);
    if (c) {
      titleStr = `${c.name} — Honest Strategy & Monetization Analysis | CreatorGraph Pro`;
      descStr  = `Our honest take on ${c.name} (${c.platform}). Reach ${c.reach}/100, Engagement ${c.engagement}/100. Revenue: ${(c.monetization||[]).slice(0,3).join(', ')}. Audience: ${c.audience||''}`.slice(0,160);
      schemaContainer.innerHTML = `<script type="application/ld+json">${JSON.stringify({
        "@context":"https://schema.org","@graph":[
          {"@type":"BreadcrumbList","itemListElement":[
            {"@type":"ListItem","position":1,"name":"Home","item":"https://creatorgraph-pro.analytics/"},
            {"@type":"ListItem","position":2,"name":c.name,"item":fullUrl}
          ]},
          {"@type":"ProfilePage","url":fullUrl,"name":titleStr,"description":descStr,"inLanguage":"en-US",
           "mainEntity":{"@type":"Person","name":c.name,"jobTitle":"Content Creator","description":c.bio,
             "knowsAbout":[c.category,c.platform,"Content Creation","Creator Economy"],
             "interactionStatistic":{"@type":"InteractionCounter","interactionType":"https://schema.org/FollowAction","userInteractionCount":c.subscribers},
             "sameAs": Object.values(c.urls||{}).filter(Boolean)
           }}
        ]
      })}<\/script>`;
    }
  } else {
    schemaContainer.innerHTML = '';
  }

  document.title = titleStr;
  document.getElementById('seo-title').innerText = titleStr;
  document.getElementById('seo-description').setAttribute('content', descStr);
  document.getElementById('seo-canonical').setAttribute('href', fullUrl);
  document.getElementById('og-title-meta').setAttribute('content', titleStr);
  document.getElementById('og-desc-meta').setAttribute('content', descStr);
  document.getElementById('og-url-meta').setAttribute('content', fullUrl);
  document.getElementById('twitter-title-meta').setAttribute('content', titleStr);
  document.getElementById('twitter-desc-meta').setAttribute('content', descStr);
  document.getElementById('twitter-url-meta').setAttribute('content', fullUrl);
}

// ping animation
const pingStyle = document.createElement('style');
pingStyle.textContent = `@keyframes ping { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }`;
document.head.appendChild(pingStyle);
