/* Gamenetic AI — chat assistant that knows every game, the coin economy, the shop and payments.
   Data: window.__getAllGames(), rewrites.json (guides), blogs.json (fallback), window.__gnpInfo() (live shop/wallet). */
(function () {
  'use strict';

  var R2 = 'https://pub-406a7f3fa4d44f41b5317520aa1aaf4a.r2.dev';
  var MODEL_ID = 'Qwen2-0.5B-Instruct-q4f16_1-MLC';
  var WASM = 'Qwen2-0.5B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm';
  var WEBLLM = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.84/+esm';
  var CTX_CHARS = 5200;

  var rw = null, rwLoading = null, blogs = null, blogsLoading = null;
  var engine = null, engineLoading = null, history = [], busy = false, stopFlag = false;

  /* ---------------- data ---------------- */
  function getJSON(u) { return fetch(u).then(function (r) { if (!r.ok) throw 0; return r.json(); }).catch(function () { return {}; }); }
  function loadRW() { if (rw) return Promise.resolve(rw); return rwLoading || (rwLoading = getJSON('rewrites.json').then(function (d) { rw = d || {}; return rw; })); }
  function loadBlogs() { if (blogs) return Promise.resolve(blogs); return blogsLoading || (blogsLoading = getJSON('blogs.json').then(function (d) { blogs = d || {}; return blogs; })); }
  function games() { try { return window.__getAllGames ? window.__getAllGames() : []; } catch (e) { return []; } }
  function keyOf(g) { return String(g.id || '').replace(/^gm-/, ''); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function compact(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
  function clean(s) { return String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
  function arr(a) { return Array.isArray(a) ? a.map(function (x) { return clean(typeof x === 'string' ? x : (x && (x.text || x.title || x.tip)) || ''); }).filter(Boolean) : []; }
  function faqs(a) { return Array.isArray(a) ? a.map(function (f) { return { q: clean(f.q || f.question), a: clean(f.a || f.answer) }; }).filter(function (f) { return f.q; }) : []; }

  var FALLBACK_SPECIAL = {
    'gta-san-andreas': { price: 2000, streak: 6, level: 5 }, 'gta-vice-city': { price: 1600, streak: 5, level: 4 },
    'mafia-1': { price: 1400, streak: 4, level: 4 }, 'igi-2': { price: 1200, streak: 4, level: 3 },
    'battlefield': { price: 1200, streak: 3, level: 3 }, 'minecraft-real': { price: 1000, streak: 3, level: 3 },
    'thebus-simulator-ultimate': { price: 800, streak: 2, level: 2 }
  };
  var FALLBACK_PACKS = [{ coins: 500, price: '$1.99' }, { coins: 1500, price: '$4.99' }, { coins: 4000, price: '$9.99' }, { coins: 10000, price: '$19.99' }];
  function gnp() { try { return window.__gnpInfo ? window.__gnpInfo() : null; } catch (e) { return null; } }
  function special() { var i = gnp(); return (i && i.special) || FALLBACK_SPECIAL; }
  function packs() { var i = gnp(); return (i && i.packs && i.packs.length) ? i.packs : FALLBACK_PACKS; }
  function me() { var i = gnp(); return i && i.me ? i.me : null; }
  function isEmu(g) { return !!g && (g.provider === 'BottleShip' || /^(igi-2|gta-san-andreas|mafia-1|battlefield)$/.test(g.id)); }
  function num(n) { return Number(n).toLocaleString('en-US'); }

  function info(g) {
    var r = rw && rw[keyOf(g)] || {}, b = blogs && blogs[keyOf(g)];
    var o = {
      intro: clean(r.intro) || clean(g.description), howToPlay: clean(r.howToPlay || g.howToPlay), modes: clean(r.modes || g.modes),
      controls: clean(r.controls), tips: arr(r.tips && r.tips.length ? r.tips : g.tips), features: arr(r.features && r.features.length ? r.features : g.features),
      faq: faqs(r.faq && r.faq.length ? r.faq : g.faq)
    };
    if (!o.howToPlay && b && b.intro) {
      var paras = String(b.intro).split(/\n{2,}/).filter(function (p) { return !/^(Beyond the surface|Overall,|Spending more time|This game suits)/.test(p.trim()); });
      o.howToPlay = clean(paras.slice(1, 3).join(' '));
      var kc = String(b.intro).match(/Keyboard Controls:[\s\S]*?(?=\n\n|$)/);
      if (kc) o.controls = clean(kc[0].replace(/Keyboard Controls:/, ''));
    }
    return o;
  }
  function currentGame() {
    var m = location.hash.match(/^#\/play\/(.+)$/); if (!m) return null;
    var id = decodeURIComponent(m[1]); return games().find(function (g) { return g.id === id; }) || null;
  }

  /* ---------------- game matching (fuzzy: "igi2" finds "IGI 2: Covert Strike") ---------------- */
  var idx = null, idxN = -1;
  function buildIdx() {
    var all = games(); if (idx && idxN === all.length) return idx;
    idx = all.map(function (g) {
      var al = [g.name, String(g.name || '').split(/[:\-–|(]/)[0]];
      if (!/^\d+$/.test(keyOf(g))) al.push(keyOf(g).replace(/-/g, ' '));
      var seen = {}, c = [];
      al.forEach(function (a) { var k = compact(a); if (k.length >= 4 && !seen[k]) { seen[k] = 1; c.push(k); } });
      return { g: g, c: c };
    }); idxN = all.length; return idx;
  }
  function findNamed(q) {
    var cq = compact(q), hits = [];
    buildIdx().forEach(function (e) { var best = 0; e.c.forEach(function (k) { if (cq.indexOf(k) !== -1 && k.length > best) best = k.length; }); if (best) hits.push({ g: e.g, len: best }); });
    hits.sort(function (a, b) { return b.len - a.len; });
    var out = [];
    hits.forEach(function (h) { if (out.length < 2 && !out.some(function (o) { return compact(o.name).indexOf(compact(h.g.name)) !== -1 || compact(h.g.name).indexOf(compact(o.name)) !== -1; })) out.push(h.g); });
    return out;
  }
  var STOP = {}; 'the a an of to in on is are and or for with how do does can i you me my what which who where when about tell game games play playing any all some good best give show find list please this that it its there want need like'.split(' ').forEach(function (w) { STOP[w] = 1; });
  function searchGames(q, n) {
    var toks = norm(q).split(' ').filter(function (t) { return t.length > 2 && !STOP[t]; }); if (!toks.length) return [];
    var sc = [];
    games().forEach(function (g) {
      var name = norm(g.name), tags = norm((g.tags || []).join(' ')), cat = norm(g.category + ' ' + (g.subcategory || '')), d = norm(g.description), s = 0;
      toks.forEach(function (t) { if (name.indexOf(t) !== -1) s += 3; if (tags.indexOf(t) !== -1) s += 2; if (cat.indexOf(t) !== -1) s += 2; if (d.indexOf(t) !== -1) s += 1; });
      if (s >= 3) sc.push([s, g]);
    });
    sc.sort(function (a, b) { return b[0] - a[0]; }); return sc.slice(0, n).map(function (x) { return x[1]; });
  }

  /* ---------------- knowledge blocks ---------------- */
  var SITE_GUIDE = 'ABOUT GAMENETIC: Gamenetic is a free site to play browser games instantly, no downloads. Find games with the search bar and category chips, click a game to play. ' +
    'You can like or dislike games, save them for later, leave comments, and see your saved games under My Games. Home has Most Played and Trending rows.';
  function econText() {
    var i = gnp(), e = (i && i.econ) || { perMinute: [1, 5], dailyMinutes: 15, loginBonus: 5 };
    return 'COINS: You earn coins by actually playing: each game pays its own fixed rate of ' + e.perMinute[0] + ' to ' + e.perMinute[1] + ' coins per active minute (the tab must be open, visible and focused with the game running). ' +
      'Each game pays for up to ' + e.dailyMinutes + ' minutes per 24 hours (it resets 24 hours after your first coins from that game). ' +
      'Every new day you also get a daily bonus of ' + e.loginBonus + ' coins times your streak (up to x10). Your streak grows by 1 for each day in a row you visit and play; missing a day resets it to 1. ' +
      'Playing also earns XP, and XP raises your level.';
  }
  function packsText() { return packs().map(function (p) { return num(p.coins) + ' coins for ' + p.price; }).join('; '); }
  function specialList() {
    var sp = special(), all = games();
    return Object.keys(sp).map(function (id) { var g = all.find(function (x) { return x.id === id; }); return { id: id, g: g, sp: sp[id] }; }).filter(function (r) { return r.g; });
  }
  function payText() {
    return econText() + '\nSHOP: Special (locked) games are bought with coins in the shop. Open it by clicking your coin badge at the top of the site or the lock on a game card. ' +
      'To unlock one you need: a Google account sign-in (only Google works), a minimum daily streak, a minimum level, and enough coins. ' +
      'Special games: ' + specialList().map(function (r) { return r.g.name + ' (' + num(r.sp.price) + ' coins, ' + r.sp.streak + '-day streak, level ' + r.sp.level + ')'; }).join('; ') + '. ' +
      'After unlocking, the game opens only for your Google account and only after a passkey check (face, fingerprint or device lock), which stays valid about 15 minutes. Coins and unlocks belong to the Google account. ' +
      'BUY COINS: ' + packsText() + '. Pick a pack in the shop, you go to Stripe secure checkout (Gamenetic never sees your card), and you return to the site where the coins are added automatically. Each payment is counted once. ' +
      'If coins are missing after paying, reopen the site in the same browser signed in with the same Google account and check the shop.';
  }
  function emuText() {
    return 'ABOUT SPECIAL PC GAMES (IGI 2, GTA San Andreas, Mafia, Battlefield): they run in the browser through an emulator. Use a desktop computer with a recent Chrome or Edge and WebGPU; they are not available on phones. ' +
      'The first load downloads the game to your browser (large, IGI 2 is about 1.5 GB) and later loads start fast from the cache. The page reloads once on the first visit to enable cross-origin isolation. ' +
      'Click inside the game for keyboard and mouse focus, use the Fullscreen button, and use Reload or Redeploy after you quit the game. For best speed make Chrome use your dedicated GPU and close other tabs.';
  }
  function siteFacts(q) {
    var all = games(), out = [SITE_GUIDE];
    if (/pay|buy|bought|purchas|coin|stripe|price|cost|shop|unlock|locked|special|premium|refund|receipt|card|sign ?in|google|passkey|account|login|log in|money|streak|level|xp|earn|wallet|balance/i.test(q)) out.push(payText());
    if (/categor|genre|kinds? of|types? of|how many|what games/i.test(q)) {
      var c = {}; all.forEach(function (g) { c[g.category] = (c[g.category] || 0) + 1; });
      out.push('Gamenetic has ' + num(all.length) + ' games. Categories: ' + Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).slice(0, 25).map(function (k) { return k + ' (' + c[k] + ')'; }).join(', ') + '.');
    }
    return out.join('\n\n');
  }
  function gameBlock(g, budget) {
    var o = info(g), sp = special()[g.id], t = 'GAME: ' + g.name + '\nCategory: ' + g.category + (g.subcategory ? ' / ' + g.subcategory : '') + '\nTags: ' + (g.tags || []).join(', ') + '\n';
    if (o.intro) t += 'About: ' + o.intro + '\n';
    if (o.howToPlay) t += 'How to play: ' + o.howToPlay + '\n';
    if (o.controls) t += 'Controls: ' + o.controls + '\n';
    if (o.modes) t += 'Modes: ' + o.modes + '\n';
    if (o.tips.length) t += 'Tips: ' + o.tips.join(' | ') + '\n';
    if (o.features.length) t += 'Features: ' + o.features.join(' | ') + '\n';
    if (o.faq.length) t += 'FAQ: ' + o.faq.map(function (f) { return f.q + ' ' + f.a; }).join(' | ') + '\n';
    if (sp) t += 'ACCESS: special locked game. Needs Google sign-in, ' + sp.streak + '-day streak, level ' + sp.level + ', ' + num(sp.price) + ' coins, then a passkey check.\n';
    if (isEmu(g)) t += emuText() + '\n';
    return t.slice(0, budget);
  }
  function buildContext(q) {
    var named = findNamed(q), cur = currentGame(), shown = [], ctx = '';
    if (!named.length && cur && /\b(this|it|here|current)\b/i.test(q)) named = [cur];
    if (named.length) { var each = Math.floor((CTX_CHARS - 300) / named.length); named.forEach(function (g) { ctx += gameBlock(g, each) + '\n\n'; shown.push(g); }); }
    else {
      var res = searchGames(q, 8);
      if (res.length) { ctx += 'MATCHING GAMES:\n' + res.map(function (g) { return '- ' + g.name + ' [' + g.category + '; ' + (g.tags || []).join(', ') + '] ' + clean(g.description).slice(0, 110); }).join('\n') + '\n\n'; shown = res.slice(0, 5); }
    }
    ctx += siteFacts(q);
    return { text: ctx.slice(0, CTX_CHARS + 1800), shown: shown, named: named };
  }

  /* ---------------- direct answers (exact, no model needed) ---------------- */
  function chk(ok) { return ok ? '✓' : '✗'; }
  function accessAnswer(g) {
    var sp = special()[g.id], m = me(), o = [];
    if (sp) {
      o.push('**' + g.name + '** is a special (locked) game. Here is how to get in:');
      o.push('1. Sign in with your Google account (only Google works).');
      o.push('2. Reach a **' + sp.streak + '-day streak** and **level ' + sp.level + '** by playing a bit every day.');
      o.push('3. Collect **' + num(sp.price) + ' coins** (earn them by playing, or buy a coin pack), then open the shop by clicking your coin badge or the 🔒 on the game and press Unlock.');
      o.push('4. Pass the passkey check (face, fingerprint or device lock). It stays valid about 15 minutes.');
      o.push('5. Click the game to play.' + (isEmu(g) ? ' The first load downloads it to your browser, so give it a few minutes. It is cached after that.' : ''));
      if (m && m.signedIn) {
        var own = m.owned.indexOf(g.id) !== -1;
        o.push(own ? '\nYou already own it. Just sign in with the passkey and play.' : '\nYour progress: ' + chk(m.streak >= sp.streak) + ' streak ' + m.streak + '/' + sp.streak + ', ' + chk(m.level >= sp.level) + ' level ' + m.level + '/' + sp.level + ', ' + chk(m.coins >= sp.price) + ' coins ' + num(m.coins) + '/' + num(sp.price) + '.');
      } else if (m) o.push('\nYou are not signed in yet. Sign in with Google from the shop first.');
      if (isEmu(g)) o.push('\nUse a desktop with Chrome or Edge (WebGPU). It is not available on phones.');
    } else {
      o.push('**' + g.name + '** is free. Just click it on the home page and it starts in your browser. No download or sign-up needed.');
      if (isEmu(g)) o.push(emuText());
    }
    return o.join('\n');
  }
  function gameAnswer(g, q) {
    var o = info(g), out = [], want = [];
    var sec = function (title, v) { if (v && v.length) out.push('**' + title + '**\n' + (Array.isArray(v) ? v.map(function (x) { return '- ' + x; }).join('\n') : v)); };
    if (/control|key|button|keyboard|mouse|move|wasd/i.test(q)) { sec('Controls', o.controls); sec('How to play', o.howToPlay); }
    else if (/tip|trick|strateg|advice|beat|win|better|cheat|hint/i.test(q)) { sec('Tips', o.tips.slice(0, 5)); }
    else if (/mode|multiplayer|co-?op|solo|2 ?player|two player|players|online/i.test(q)) { sec('Modes', o.modes); sec('Features', o.features.slice(0, 4)); }
    else if (/what is|about|tell me|describe|info|review|worth|good/i.test(q) && !/how (do|to|can)/i.test(q)) { sec('About', o.intro); sec('Modes', o.modes); sec('Features', o.features.slice(0, 4)); }
    else { sec('How to play', o.howToPlay); sec('Controls', o.controls); sec('Tips', o.tips.slice(0, 3)); }
    if (!out.length) return null;
    var head = '**' + g.name + '** (' + g.category + ')\n';
    var extra = special()[g.id] ? '\n\nNote: this is a special locked game. Ask me "how do I unlock ' + g.name + '" for the steps.' : '';
    return head + out.join('\n\n') + extra;
  }
  function walletAnswer() {
    var m = me(); if (!m) return 'I cannot see your wallet right now. Click the coin badge at the top of the site to open it.';
    if (!m.signedIn) return 'You are not signed in. Your coins show up in the shop (click the coin badge). Unlocking games needs a Google sign-in.\nCoins: ' + num(m.coins) + ' · streak: ' + m.streak + ' days · level: ' + m.level + '.';
    var names = m.owned.map(function (id) { var g = games().find(function (x) { return x.id === id; }); return g ? g.name : id; });
    return 'Signed in as **' + m.email + '**.\n- Coins: **' + num(m.coins) + '**\n- Streak: **' + m.streak + '** days\n- Level: **' + m.level + '**\n- Unlocked games: ' + (names.length ? names.join(', ') : 'none yet');
  }
  function directAnswer(q, ctx) {
    var named = ctx.named, g = named[0];
    if (/\b(my|i have|do i have)\b.*\b(coins?|balance|wallet|streak|level|unlocked|owned|games)\b|how many coins|am i signed|my account/i.test(q) && !g) return { text: walletAnswer(), actions: ['shop'] };
    if (g && special()[g.id] && /access|unlock|buy|purchase|get|open|price|cost|how much|requirement|need|locked|why|can'?t|cannot|require|play/i.test(q) && !/tips?|controls?|keys?/i.test(q)) return { text: accessAnswer(g), actions: ['shop'] };
    if (g && /access|unlock|get into|open/i.test(q) && !special()[g.id] && !/tips?|controls?/i.test(q)) return { text: accessAnswer(g), actions: [] };
    if (!g && /(coin ?packs?|buy coins?|more coins|top ?up|stripe|how (do|can) i pay|payment|pricing|how much (are|is|do).*coins?|price of coins)/i.test(q)) {
      return { text: '**Coin packs** (one-time payments through Stripe secure checkout):\n' + packs().map(function (p) { return '- ' + num(p.coins) + ' coins · ' + p.price; }).join('\n') + '\n\nHow to buy:\n1. Sign in with Google.\n2. Click the coin badge to open the shop.\n3. Pick a pack and pay on the Stripe page (Gamenetic never sees your card).\n4. You come back to the site and the coins are added automatically.\n\nIf coins do not appear, reopen the site in the same browser with the same Google account.', actions: ['shop'] };
    }
    if (!g && /(earn|get|make|collect|free).*(coins?)|how do (coins|streaks?|levels?|xp) work|daily bonus|streak/i.test(q)) {
      return { text: econText().replace('COINS: ', '**How coins work**\n').replace(/\. /g, '.\n- ').replace('.\n- ', '.\n- ') , actions: ['shop'] };
    }
    if (!g && /(locked|special|premium) games?|which games.*(locked|special|unlock)|what.*(unlock|locked)/i.test(q)) {
      return { text: '**Special (locked) games**\n' + specialList().map(function (r) { return '- ' + r.g.name + ': ' + num(r.sp.price) + ' coins · ' + r.sp.streak + '-day streak · level ' + r.sp.level; }).join('\n') + '\n\nAsk me "how do I unlock" any of them for the steps.', actions: ['shop'], games: specialList().map(function (r) { return r.g; }).slice(0, 5) };
    }
    if (g && ctx.named.length === 1 && info(g).howToPlay + info(g).controls + info(g).intro !== '' && /how|control|key|tip|trick|mode|what is|about|tell|explain|guide|play|learn|beat|win|multiplayer|player|worth|review|describe|info/i.test(q)) {
      var t = gameAnswer(g, q); if (t) return { text: t, actions: [] };
    }
    return null;
  }

  /* ---------------- site files: where everything is ---------------- */
  var SITE = 'https://envizion.work/gamehub/';
  var REPO_API = 'https://api.github.com/repos/yacob247/yacob247.github.io/contents/gamehub';
  var FILES = [
    { n: 'index.html', d: 'the home page: browse, search and play all games', g: 'Pages' },
    { n: 'blog.html', d: 'the blog with game reviews and guides', g: 'Pages' },
    { n: 'lite.html', d: 'the lite page', g: 'Pages' },
    { n: 'privacy-policy.html.html', d: 'the privacy policy', g: 'Policies' },
    { n: 'terms-of-use.html.html', d: 'the terms of use', g: 'Policies' },
    { n: 'catalog.json', d: 'the game catalog (id, title, category, tags, thumbnail, description for each game)', g: 'Game data' },
    { n: 'rewrites.json', d: 'the game guides: how to play, controls, modes, tips, features and FAQ for each game', g: 'Game data' },
    { n: 'blogs.json', d: 'the long review text for each game (used by the blog)', g: 'Game data' },
    { n: 'games-with-real-thumbnails.json', d: 'the featured games list with their thumbnails', g: 'Game data' },
    { n: 'sitemap.xml', d: 'the sitemap listing every game, category and tag page', g: 'Game data' },
    { n: 'all_entries.txt', d: 'a plain text list of game entries', g: 'Game data' },
    { n: 'glass-theme.css', d: 'the glass theme styles', g: 'Styles' },
    { n: 'seo-links.css', d: 'styles for the browse links', g: 'Styles' }
  ];
  var DIRS = [
    { n: 'games/', d: 'one page for every game, e.g. ' + SITE + 'games/bus-simulator-ultimate/' },
    { n: 'category/', d: 'one page per category, e.g. ' + SITE + 'category/puzzle/' },
    { n: 'tag/', d: 'one page per tag, e.g. ' + SITE + 'tag/2-player/' }
  ];
  // Internal files: the AI knows they exist for its own understanding, but never lists, reads, links or quotes them to visitors.
  var INTERNAL_RE = /(gn-admin|admin|zx9k|vault|seal\.py|generate_rewrites|rewrite-feed|fix\.js|node\.js|\.har\b|here\.har|feed-raw|add-game|addd\.html|plays-apps-script|coi-serviceworker|gamenetic-plus|gamenetic-ai|index_1|igi2\.html|gtasa\.html|mafia\.html|humanizer|\bemu\b|\.wgb|\br2\b|pub-[0-9a-f]{8}|secret|password|api ?key|client ?id|source code|apps? script|service ?worker|embed ?url|iframe url|cheat engine|bypass|crack|hack the (shop|coins)|free coins hack|10,?000,?000)/i;
  var sm = null, smLoading = null;
  function loadSitemap() {
    if (sm) return Promise.resolve(sm);
    return smLoading || (smLoading = fetch('sitemap.xml').then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; }).then(function (t) {
      sm = { games: [], category: [], tag: [] };
      (t.match(/<loc>[^<]+<\/loc>/g) || []).forEach(function (x) {
        var m = x.match(/\/(games|category|tag)\/([^\/<]+)\/?</); if (m) sm[m[1]].push(m[2]);
      });
      return sm;
    }));
  }
  function pageFor(g) {
    if (!sm || !g) return '';
    var al = [compact(g.name), compact(String(g.name || '').split(/[:\-–|(]/)[0]), compact(keyOf(g).replace(/-/g, ' '))].filter(function (a) { return a.length >= 3; });
    var hit = sm.games.find(function (sl) { var c = compact(sl); return al.indexOf(c) !== -1; }) ||
      sm.games.find(function (sl) { var c = compact(sl); return al.some(function (a) { return a.length >= 6 && (c.indexOf(a) === 0 || a.indexOf(c) === 0) && Math.abs(c.length - a.length) <= 6; }); });
    return hit ? SITE + 'games/' + hit + '/' : '';
  }
  function liveDir() {
    try { var c = JSON.parse(sessionStorage.getItem('gnai_dir') || 'null'); if (c && Date.now() - c.t < 6e5) return Promise.resolve(c.v); } catch (e) {}
    return fetch(REPO_API).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (a) {
      var v = a.map(function (f) { return { name: f.name, type: f.type, size: f.size }; });
      try { sessionStorage.setItem('gnai_dir', JSON.stringify({ t: Date.now(), v: v })); } catch (e) {}
      return v;
    }).catch(function () { return null; });
  }
  function isPublicName(n) { return !INTERNAL_RE.test(n); }
  async function filesAnswer(q) {
    var m, out = [];
    if (/(list|show|see|what|which|all).*(files?|folders?|directory|pages?)\b|site ?map|where is everything|what('?s| is) on (the )?site|how is (the )?site (organi[sz]ed|built|structured)/i.test(q) && !/game pages?\b.*how/i.test(q)) {
      await loadSitemap();
      var live = await liveDir(), imgs = 0, groups = {};
      if (live) live.forEach(function (f) { if (f.type === 'file' && /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(f.name)) imgs++; });
      FILES.forEach(function (f) { (groups[f.g] = groups[f.g] || []).push(f); });
      out.push('**Here is how the Gamenetic site is organised**');
      Object.keys(groups).forEach(function (k) { out.push('**' + k + '**\n' + groups[k].map(function (f) { return '- ' + f.n + ': ' + f.d; }).join('\n')); });
      out.push('**Folders**\n' + DIRS.map(function (f) { return '- ' + f.n + ': ' + f.d; }).join('\n'));
      if (sm) out.push('That is ' + num(sm.games.length) + ' game pages, ' + num(sm.category.length) + ' category pages and ' + num(sm.tag.length) + ' tag pages.' + (imgs ? ' Plus ' + imgs + ' game thumbnail images.' : ''));
      return out.join('\n\n');
    }
    if (/\b(privacy|data (we|you) collect|cookies?)\b/i.test(q) && /where|link|page|file|read|see/i.test(q)) return 'The privacy policy is here: ' + SITE + 'privacy-policy.html.html';
    if (/\b(terms|terms of (use|service)|tos)\b/i.test(q) && /where|link|page|file|read|see/i.test(q)) return 'The terms of use are here: ' + SITE + 'terms-of-use.html.html';
    if (/\b(blog|reviews?)\b/i.test(q) && /where|link|page|read|see|find/i.test(q) && !findNamed(q).length) return 'The blog with game reviews and guides is here: ' + SITE + 'blog.html';
    if (/\b(categor(y|ies) pages?|tag pages?|game pages?|sitemap)\b/i.test(q) && /where|link|how many|list|find/i.test(q)) {
      await loadSitemap(); if (!sm) return null;
      if (/sitemap/i.test(q)) return 'The sitemap is here: ' + SITE + 'sitemap.xml. It lists ' + num(sm.games.length) + ' game pages, ' + num(sm.category.length) + ' category pages and ' + num(sm.tag.length) + ' tag pages.';
      var kind = /tag/i.test(q) ? 'tag' : /game/i.test(q) ? 'games' : 'category', k2 = kind === 'games' ? 'games' : kind;
      return 'Gamenetic has ' + num(sm[k2].length) + ' ' + (kind === 'games' ? 'game' : kind) + ' pages at ' + SITE + (kind === 'games' ? 'games' : kind) + '/NAME/. For example: ' + sm[k2].slice(0, 5).map(function (x) { return SITE + (kind === 'games' ? 'games' : kind) + '/' + x + '/'; }).join(', ') + '.';
    }
    m = q.match(/([\w.\-]+\.(?:json|html|css|xml|txt))/i);
    if (m || /which file|what file|where (is|are|do i find|can i find).*(data|guides?|reviews?|catalog|descriptions?|thumbnails?)/i.test(q)) {
      var needle = m ? m[1].toLowerCase() : '', f = FILES.find(function (x) { return needle && x.n.toLowerCase() === needle; });
      if (!f && !m) {
        var t = norm(q); f = FILES.find(function (x) { return (/guide|how to play|controls|tips/.test(t) && x.n === 'rewrites.json') || (/review|blog/.test(t) && x.n === 'blogs.json') || (/catalog|list of games|descriptions?/.test(t) && x.n === 'catalog.json') || (/thumbnail/.test(t) && x.n === 'games-with-real-thumbnails.json'); });
      }
      if (f) return '**' + f.n + '** is ' + f.d + '. You can open it here: ' + SITE + f.n;
    }
    return null;
  }
  var polDocs = null;
  async function policyExcerpts(q) {
    if (!/privacy|personal (data|info)|cookies?|terms|rules|allowed|banned|age|children|kids|copyright|dmca|liability|refund policy|contact|delete my data/i.test(q)) return '';
    if (!polDocs) {
      polDocs = [];
      for (var f of ['privacy-policy.html.html', 'terms-of-use.html.html']) {
        try {
          var r = await fetch(f); if (!r.ok) continue; var h = await r.text();
          h = h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<\/(p|li|h\d|div|br)>/gi, '\n').replace(/<[^>]+>/g, ' ');
          h.split(/\n+/).map(clean).filter(function (x) { return x.length > 40; }).forEach(function (x) { polDocs.push({ f: f, t: x.slice(0, 420) }); });
        } catch (e) {}
      }
    }
    var toks = norm(q).split(' ').filter(function (t) { return t.length > 3 && !STOP[t]; });
    var sc = polDocs.map(function (d) { var n = norm(d.t), s = 0; toks.forEach(function (t) { if (n.indexOf(t) !== -1) s++; }); return [s, d]; }).filter(function (x) { return x[0] > 0; });
    sc.sort(function (a, b) { return b[0] - a[0]; });
    return sc.slice(0, 4).map(function (x) { return '[' + (/privacy/.test(x[1].f) ? 'Privacy policy' : 'Terms of use') + '] ' + x[1].t; }).join('\n');
  }

  /* ---------------- engine ---------------- */
  function setStatus(t) { var s = document.getElementById('gnaiStatus'); if (s) s.textContent = t || ''; }
  function getEngine() {
    if (engine) return Promise.resolve(engine);
    if (engineLoading) return engineLoading;
    if (!navigator.gpu) return Promise.reject(new Error('nogpu'));
    engineLoading = import(WEBLLM).then(function (w) {
      var cfg = { useIndexedDBCache: true, model_list: [{ model: R2 + '/?p=/resolve/main/', model_id: MODEL_ID, model_lib: R2 + '/' + WASM, overrides: { context_window_size: 4096 } }] };
      return w.CreateMLCEngine(MODEL_ID, { appConfig: cfg, initProgressCallback: function (r) { setStatus((r.text || 'Loading AI…').slice(0, 80)); } });
    }).then(function (e) { engine = e; setStatus(''); return e; })
      .finally(function () { engineLoading = null; });
    return engineLoading;
  }

  /* ---------------- UI ---------------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function md(s) {
    var h = esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(https?:\/\/[^\s<)]+[^\s<).,;])/g, '<a href="$1" target="_blank" rel="noopener" style="color:#c4b5fd">$1</a>');
    var lines = h.split('\n'), out = '', inList = false;
    lines.forEach(function (l) {
      var m = l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
      if (m) { if (!inList) { out += '<ul>'; inList = true; } out += '<li>' + m[1] + '</li>'; }
      else { if (inList) { out += '</ul>'; inList = false; } out += l.trim() ? '<p>' + l + '</p>' : ''; }
    });
    return out + (inList ? '</ul>' : '');
  }

  var css = '' +
    '#gnaiBtn{position:fixed;right:18px;bottom:18px;z-index:9998;display:flex;align-items:center;gap:8px;padding:12px 18px;border:0;border-radius:999px;cursor:pointer;font:600 14px/1 "Segoe UI",system-ui,sans-serif;color:#fff;background:linear-gradient(135deg,#7c3aed,#ec4899);box-shadow:0 8px 24px rgba(124,58,237,.5)}' +
    '#gnaiBtn:hover{transform:translateY(-2px)}' +
    '#gnai{position:fixed;right:18px;bottom:78px;z-index:9999;width:380px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 100px);display:none;flex-direction:column;background:#0b0f1a;color:#f1f5f9;border:1px solid #334155;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.65);font:14px/1.5 "Segoe UI",system-ui,sans-serif;overflow:hidden}' +
    '#gnai.open{display:flex}' +
    '#gnai .h{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:linear-gradient(135deg,#0f172a,#1e1b4b);border-bottom:1px solid #334155;font-weight:700}' +
    '#gnai .h small{display:block;font-weight:400;color:#94a3b8;font-size:11px}' +
    '#gnai .x{background:none;border:0;color:#94a3b8;font-size:22px;cursor:pointer;line-height:1}' +
    '#gnaiLog{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px}' +
    '#gnaiLog .m{max-width:88%;padding:9px 12px;border-radius:12px;word-wrap:break-word}' +
    '#gnaiLog .u{align-self:flex-end;background:#7c3aed;color:#fff;border-bottom-right-radius:3px}' +
    '#gnaiLog .a{align-self:flex-start;background:#1e293b;border-bottom-left-radius:3px}' +
    '#gnaiLog .a p{margin:0 0 6px}#gnaiLog .a p:last-child{margin:0}#gnaiLog .a ul{margin:4px 0 4px 18px;padding:0}' +
    '#gnaiLog .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}' +
    '#gnaiLog .chip{padding:5px 10px;border-radius:999px;border:1px solid #a78bfa;background:transparent;color:#c4b5fd;font-size:12px;cursor:pointer}' +
    '#gnaiLog .chip:hover{background:#7c3aed;color:#fff}' +
    '#gnaiStatus{padding:0 14px;color:#a78bfa;font-size:12px;min-height:16px}' +
    '#gnai .in{display:flex;gap:8px;padding:10px;border-top:1px solid #334155;background:#111827}' +
    '#gnai input{flex:1;min-width:0;padding:10px 12px;border-radius:10px;border:1px solid #334155;background:#0b0f1a;color:#f1f5f9;font:inherit;outline:none}' +
    '#gnai input:focus{border-color:#7c3aed}' +
    '#gnai .send{padding:0 14px;border:0;border-radius:10px;background:#7c3aed;color:#fff;font-weight:600;cursor:pointer}' +
    '#gnai .send:disabled{opacity:.5;cursor:default}' +
    '@media(max-width:520px){#gnai{right:8px;bottom:70px;height:calc(100vh - 90px)}#gnaiBtn{right:10px;bottom:10px}}';

  function build() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var btn = document.createElement('button');
    btn.id = 'gnaiBtn'; btn.type = 'button'; btn.innerHTML = '<span>✨</span> Ask AI';
    var box = document.createElement('div'); box.id = 'gnai';
    box.innerHTML = '<div class="h"><div>Gamenetic AI<small>Ask about any game: how to play, controls, tips</small></div><button class="x" type="button" aria-label="Close">×</button></div>' +
      '<div id="gnaiLog"></div><div id="gnaiStatus"></div>' +
      '<div class="in"><input id="gnaiIn" type="text" placeholder="Ask about any game…" autocomplete="off"><button class="send" id="gnaiSend" type="button">Send</button></div>';
    document.body.appendChild(btn); document.body.appendChild(box);

    var log = box.querySelector('#gnaiLog'), inp = box.querySelector('#gnaiIn'), send = box.querySelector('#gnaiSend');

    function add(cls, html) { var d = document.createElement('div'); d.className = 'm ' + cls; d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
    function chips(el, list, isAsk) {
      var c = document.createElement('div'); c.className = 'chips';
      list.forEach(function (it) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'chip';
        b.textContent = isAsk ? it : 'Open ' + it.name;
        b.onclick = function () { if (isAsk) { inp.value = it; ask(); } else { location.hash = '#/play/' + encodeURIComponent(it.id); box.classList.remove('open'); } };
        c.appendChild(b);
      });
      el.appendChild(c); log.scrollTop = log.scrollHeight;
    }
    function welcome() {
      var el = add('a', '<p>Hi! Ask me anything about Gamenetic or any game: how to play, controls, tips, or what to play next.</p>');
      chips(el, ['How do I unlock IGI 2?', 'How do coins work?', 'Recommend a 2 player game', 'What files are on the site?'], true);
    }

    function setBusy(b) { busy = b; send.textContent = b ? 'Stop' : 'Send'; inp.disabled = b; }

    function shopChip(el) {
      var c = document.createElement('div'); c.className = 'chips';
      var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = '🪙 Open shop';
      b.onclick = function () { box.classList.remove('open'); try { window.__gnpShop && window.__gnpShop(); } catch (e) {} };
      c.appendChild(b); el.appendChild(c);
    }
    function fallback(ctx, named, pol) {
      if (pol) return 'From our policies:\n' + pol.split('\n').map(function (x) { return '- ' + x; }).join('\n');
      if (named.length) return named.map(function (g) { return gameAnswer(g, '') || ('**' + g.name + '**\n' + clean(g.description)); }).join('\n\n');
      if (ctx.shown.length) return 'Here are some games that match:\n' + ctx.shown.map(function (g) { return '- ' + g.name + ' (' + g.category + ')'; }).join('\n');
      return 'I could not find a matching game. Try the name of a game or a type like "racing" or "2 player".';
    }
    function finish(bubble, text, res, ctx, q) {
      bubble.innerHTML = md(text);
      history.push({ role: 'user', content: q }, { role: 'assistant', content: text.slice(0, 600) });
      var list = (res && res.games) || ctx.shown;
      if (list && list.length) chips(bubble, list, false);
      if (res && res.actions && res.actions.indexOf('shop') !== -1) shopChip(bubble);
      log.scrollTop = log.scrollHeight;
    }

    async function ask() {
      var q = inp.value.trim();
      if (!q || busy) return;
      inp.value = ''; add('u', esc(q)); setBusy(true); stopFlag = false;
      var bubble = add('a', '<p>…</p>');
      try {
        await loadRW(); await loadSitemap();
        var ctx = buildContext(q);
        if (ctx.named.some(function (g) { return !(rw && rw[keyOf(g)]); })) { await loadBlogs(); ctx = buildContext(q); }

        // 1) private/internal things are never shared with visitors
        if (INTERNAL_RE.test(q)) {
          return finish(bubble, 'That one is internal, so I can not share it. I am happy to help with games, how to play them, coins, the shop and payments, or where to find things on the site.', null, { shown: [] }, q);
        }
        // 2) site files, pages and links
        var fa = await filesAnswer(q);
        if (fa) return finish(bubble, fa, null, { shown: [] }, q);
        // 3) exact answers for games, coins, shop and payments
        var res = directAnswer(q, ctx);
        if (res) {
          var link = ctx.named[0] ? pageFor(ctx.named[0]) : '';
          return finish(bubble, res.text + (link ? '\n\nGame page: ' + link : ''), res, { shown: ctx.named }, q);
        }
        // 4) everything else: chat with the model, grounded in the data
        var pol = await policyExcerpts(q), reply = '';
        var sys = 'You are Gamenetic AI, a friendly, relaxed chat assistant built into the Gamenetic website (a free browser games site). ' +
          'Chat naturally like a normal assistant: if someone says hi, say hi back warmly in one or two short sentences and ask what they want to play or know. ' +
          'Small talk is fine. Your main expertise is Gamenetic: every game on it, how to play each one, controls, tips, recommendations, the coins, shop, locked games, accounts and payments, and where things are on the site. ' +
          'Rules: Reply in the language the user writes in. Keep answers short and clear; use short numbered steps for how-to-play or payment steps. ' +
          'Use the DATA below for facts. If something is not in the DATA, say you do not have that detail instead of guessing. ' +
          'Never invent links, prices, game names, controls or features. Never share internal files, admin tools, keys, embed or storage URLs. Do not list categories or games unless asked.' +
          '\n\nDATA:\n' + ctx.text + (pol ? '\n\nPOLICY EXCERPTS:\n' + pol : '');
        var msgs = [{ role: 'system', content: sys }].concat(history.slice(-4)).concat([{ role: 'user', content: q }]);
        try {
          var eng = await getEngine();
          setStatus('');
          var stream = await eng.chat.completions.create({ messages: msgs, stream: true, temperature: 0.5, top_p: 0.9, repetition_penalty: 1.1, max_tokens: 380 });
          for await (var part of stream) {
            if (stopFlag) { eng.interruptGenerate(); break; }
            var d = part.choices[0] && part.choices[0].delta && part.choices[0].delta.content;
            if (d) { reply += d; bubble.innerHTML = md(reply); log.scrollTop = log.scrollHeight; }
          }
        } catch (e) {
          setStatus('');
          reply = fallback(ctx, ctx.named, pol);
          if (e && e.message === 'nogpu') reply += '\n\n(AI chat needs a WebGPU browser such as recent Chrome or Edge, so I showed the guide directly.)';
        }
        if (!reply.trim()) reply = fallback(ctx, ctx.named, pol);
        finish(bubble, reply, null, ctx, q);
      } catch (err) {
        bubble.innerHTML = '<p>Something went wrong. Please try again.</p>';
      } finally {
        setBusy(false); setStatus(''); inp.focus();
      }
    }

    btn.onclick = function () {
      box.classList.toggle('open');
      if (box.classList.contains('open')) {
        if (!log.children.length) welcome();
        loadRW(); loadSitemap(); inp.focus();
      }
    };
    box.querySelector('.x').onclick = function () { box.classList.remove('open'); };
    send.onclick = function () { if (busy) { stopFlag = true; } else { ask(); } };
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ask(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();