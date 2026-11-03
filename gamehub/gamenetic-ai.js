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

  /* ---------------- game matching ----------------
     Fuzzy and typo-tolerant: "vice city", "ig 2", "ig1 2 stike" and "igi2" should all find the right game.
     Works by whole words (not raw substring), tolerates small misspellings and partial typing, and weighs
     rare/distinctive words (e.g. "vice") much higher than words shared by dozens of games (e.g. "city",
     "simulator", "real"). That stops a common word from dragging in unrelated games. */
  var idx = null, idxN = -1, wordDF = null;
  function lev(a, b) { // edit distance, for tolerating typos like "stike" -> "strike"
    var al = a.length, bl = b.length, prev = [], i, j;
    if (!al) return bl; if (!bl) return al;
    for (j = 0; j <= bl; j++) prev[j] = j;
    for (i = 1; i <= al; i++) {
      var cur = [i];
      for (j = 1; j <= bl; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1));
      prev = cur;
    }
    return prev[bl];
  }
  function wordsMatch(qw, aw) {
    if (qw === aw) return true;
    if (qw.length >= 3 && aw.length >= 3 && lev(qw, aw) <= (Math.max(qw.length, aw.length) <= 4 ? 1 : 2)) return true; // small misspelling
    if (qw.length >= 2 && aw.indexOf(qw) === 0 && aw.length - qw.length <= 2) return true; // partial typing, e.g. "ig" -> "igi"
    if (aw.length >= 2 && qw.indexOf(aw) === 0 && qw.length - aw.length <= 2) return true;
    return false;
  }
  function buildIdx() {
    var all = games(); if (idx && idxN === all.length) return idx;
    var dfMap = {};
    var list = all.map(function (g) {
      var raw = [g.name, String(g.name || '').split(/[:\-–|(]/)[0]];
      if (!/^\d+$/.test(keyOf(g))) raw.push(keyOf(g).replace(/-/g, ' '));
      var seen = {}, aliases = [];
      raw.forEach(function (n) {
        var words = norm(n).split(' ').filter(function (w) { return w.length > 1 || /^[0-9]+$/.test(w); }); // keep numbers like "2" (IGI 1 vs IGI 2 matters)
        var key = words.join(' ');
        if (words.length && !seen[key]) { seen[key] = 1; aliases.push(words); }
      });
      return { g: g, aliases: aliases };
    });
    list.forEach(function (e) {
      var seenW = {};
      e.aliases.forEach(function (words) { words.forEach(function (w) { seenW[w] = 1; }); });
      Object.keys(seenW).forEach(function (w) { dfMap[w] = (dfMap[w] || 0) + 1; });
    });
    idx = list; idxN = all.length; wordDF = dfMap; return idx;
  }
  function wordWeight(w) { return 1 / Math.sqrt((wordDF && wordDF[w]) || 1); } // rare word = high weight
  function findNamed(q) {
    buildIdx();
    var qList = norm(q).split(' ').filter(Boolean);
    // also try the query with no spaces at all, so merged typing like "igi2" still works
    var qJoined = compact(q);
    var hits = [];
    idx.forEach(function (e) {
      var bestRatio = 0, bestLen = 0;
      e.aliases.forEach(function (words) {
        var aliasJoined = words.join('');
        if (aliasJoined.length >= 4 && qJoined.indexOf(aliasJoined) !== -1) { // exact merged match, e.g. "igi2" in "howtoplayigi2"
          if (1 > bestRatio || (1 === bestRatio && words.length > bestLen)) { bestRatio = 1; bestLen = words.length; }
          return;
        }
        var total = 0, matched = 0, hasStrong = false;
        words.forEach(function (w) {
          var wt = wordWeight(w), isMatch = false;
          qList.forEach(function (qw) { if (!isMatch && wordsMatch(qw, w)) isMatch = true; });
          total += wt;
          if (isMatch) { matched += wt; if (wt >= 0.45) hasStrong = true; }
        });
        if (!total) return;
        var ratio = matched / total;
        // need solid overlap AND at least one fairly distinctive word matched (not just a generic word like "city")
        if (ratio >= 0.5 && hasStrong && (ratio > bestRatio || (ratio === bestRatio && words.length > bestLen))) { bestRatio = ratio; bestLen = words.length; }
      });
      if (bestRatio) hits.push({ g: e.g, ratio: bestRatio, len: bestLen });
    });
    hits.sort(function (a, b) { return b.ratio - a.ratio || b.len - a.len; });
    var out = [];
    hits.forEach(function (h) { if (out.length < 2 && !out.some(function (o) { return compact(o.name).indexOf(compact(h.g.name)) !== -1 || compact(h.g.name).indexOf(compact(o.name)) !== -1; })) out.push(h.g); });
    return out;
  }
  /* ---------------- similar free games (suggested alongside a locked game) ---------------- */
  function similarGames(g, n) {
    n = n || 2;
    var sp = special(), tags = (g.tags || []).map(function (t) { return String(t).toLowerCase(); });
    var scored = [];
    games().forEach(function (o) {
      if (o.id === g.id || sp[o.id]) return; // skip itself and other locked games — must be free & already unlocked
      var s = 0;
      if (o.category === g.category) s += 3;
      if (g.subcategory && o.subcategory === g.subcategory) s += 2;
      (o.tags || []).forEach(function (t) { if (tags.indexOf(String(t).toLowerCase()) !== -1) s += 1; });
      if (s > 0) scored.push([s, o]);
    });
    scored.sort(function (a, b) { return b[0] - a[0]; });
    return scored.slice(0, n).map(function (x) { return x[1]; });
  }
  function chipsFor(g) { return special()[g.id] ? [g].concat(similarGames(g, 2)) : [g]; }
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
    'You can like or dislike games, save them for later, and see your saved games under My Games.';
  function econText() {
    var i = gnp(), e = (i && i.econ) || { perMinute: [1, 5], dailyMinutes: 15, loginBonus: 5 };
    return 'COINS: You earn coins by playing. Each game pays its own rate of ' + e.perMinute[0] + ' to ' + e.perMinute[1] + ' coins per active minute, but only for the first ' + e.dailyMinutes + ' minutes of that game every 24 hours. ' +
      'Every new day you also get a daily bonus of ' + e.loginBonus + ' coins times your streak (up to x10). Playing earns XP, and XP raises your level.';
  }
  function coachText() {
    var i = gnp(), e = (i && i.econ) || { perMinute: [1, 5], dailyMinutes: 15, loginBonus: 5 };
    return '**How to get coins faster**\n' +
      '1. **Come back every single day.** Your daily bonus is ' + e.loginBonus + ' coins times your streak, up to x' + 10 + ' (so ' + (e.loginBonus * 10) + ' coins a day at a 10-day streak). Special games also need a streak, so never skip a day.\n' +
      '2. **Do not play one game all day.** Each game only pays for its first ' + e.dailyMinutes + ' minutes every 24 hours. After that it pays nothing, no matter how long you stay. Play ' + e.dailyMinutes + ' minutes, then switch to a different game.\n' +
      '3. **Stay active.** Coins only count while the game is running and the tab is open and in focus.\n' +
      '4. **Spread your time.** Try many different games each day. Every new game gives you a fresh ' + e.dailyMinutes + ' minutes of coins.\n' +
      '5. **Aim at the cheapest special game first,** then work up to the bigger ones.\n' +
      '6. **Want it right now?** You can buy a coin pack in the shop: ' + packsText() + '.';
  }
  function packsText() { return packs().map(function (p) { return num(p.coins) + ' coins for ' + p.price; }).join('; '); }
  function specialList() {
    var sp = special(), all = games();
    return Object.keys(sp).map(function (id) { var g = all.find(function (x) { return x.id === id; }); return { id: id, g: g, sp: sp[id] }; }).filter(function (r) { return r.g; });
  }
  function payText(skipList) {
    var t = econText() + '\nSHOP: Special (locked) games are bought with coins in the shop. Open it by clicking your coin badge at the top of the site or the lock on a game card. ' +
      'To unlock one you need: a Google account sign-in (only Google works), a minimum daily streak, a minimum level, and enough coins. ';
    if (!skipList) t += 'Special games: ' + specialList().map(function (r) { return r.g.name + ' (' + num(r.sp.price) + ' coins, ' + r.sp.streak + '-day streak, level ' + r.sp.level + ')'; }).join('; ') + '. ';
    t += 'After unlocking, the game opens only for your Google account and only after a passkey check (face, fingerprint or device lock), which stays valid about 15 minutes. Coins and unlocks belong to the Google account. ' +
      'BUY COINS: ' + packsText() + '. Pick a pack in the shop, pay on the secure checkout page, and the coins are added to your account automatically.';
    return t;
  }
  function siteFacts(q, focusedGame) {
    // when one specific game is already in focus, skip dumping the full locked-games list — the model should
    // talk about that one game, not pad the answer with every other special game on the site.
    var all = games(), out = [SITE_GUIDE];
    if (/pay|buy|bought|purchas|coin|price|cost|shop|unlock|locked|special|premium|refund|receipt|card|sign ?in|google|passkey|account|login|log in|money|streak|level|xp|earn|wallet|balance/i.test(q)) out.push(payText(!!focusedGame));
    if (!focusedGame && /categor|genre|kinds? of|types? of|how many|what games/i.test(q)) {
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
    return t.slice(0, budget);
  }
  var lastGame = null; // the game the conversation is currently about, so "it"/"this" across turns resolves correctly
  var REFER_RE = /\b(this|it|here|current|that game|the game)\b/i;
  function buildContext(q) {
    var named = findNamed(q), cur = currentGame(), shown = [], ctx = '';
    if (!named.length && REFER_RE.test(q)) { if (cur) named = [cur]; else if (lastGame) named = [lastGame]; }
    var focused = named.length === 1 ? named[0] : null;
    if (named.length) {
      var each = Math.floor((CTX_CHARS - 300) / named.length);
      named.forEach(function (g) { ctx += gameBlock(g, each) + '\n\n'; });
      shown = focused ? chipsFor(focused) : named.slice();
    } else {
      var res = searchGames(q, 8);
      if (res.length) { ctx += 'MATCHING GAMES:\n' + res.map(function (g) { return '- ' + g.name + ' [' + g.category + '; ' + (g.tags || []).join(', ') + '] ' + clean(g.description).slice(0, 110); }).join('\n') + '\n\n'; shown = res.slice(0, 5); }
    }
    ctx += siteFacts(q, focused);
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
      o.push('5. Click the game to play.');
      if (m && m.signedIn) {
        var own = m.owned.indexOf(g.id) !== -1;
        o.push(own ? '\nYou already own it. Just sign in with the passkey and play.' : '\nYour progress: ' + chk(m.streak >= sp.streak) + ' streak ' + m.streak + '/' + sp.streak + ', ' + chk(m.level >= sp.level) + ' level ' + m.level + '/' + sp.level + ', ' + chk(m.coins >= sp.price) + ' coins ' + num(m.coins) + '/' + num(sp.price) + '.');
      } else if (m) o.push('\nYou are not signed in yet. Sign in with Google from the shop first.');
      var sim = similarGames(g, 2);
      if (sim.length) o.push('\nWant something similar you can play right now, free and already unlocked? Try ' + sim.map(function (s) { return '**' + s.name + '**'; }).join(' or ') + '.');
    } else {
      o.push('**' + g.name + '** is free. Just click it on the home page and it starts in your browser. No download or sign-up needed.');
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
    var extra = '';
    if (special()[g.id]) {
      extra = '\n\nNote: this is a special locked game. Ask me "how do I unlock ' + g.name + '" for the steps.';
      var sim = similarGames(g, 2);
      if (sim.length) extra += ' Or try ' + sim.map(function (s) { return '**' + s.name + '**'; }).join(' or ') + ' now — similar, free, and already unlocked.';
    }
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
    if (g && special()[g.id] && /access|unlock|buy|purchase|get|open|price|cost|how much|requirement|need|locked|why|can'?t|cannot|require|play|without|free|skip/i.test(q) && !/tips?|controls?|keys?/i.test(q)) return { text: accessAnswer(g), actions: ['shop'], games: chipsFor(g) };
    if (g && /access|unlock|get into|open/i.test(q) && !special()[g.id] && !/tips?|controls?/i.test(q)) return { text: accessAnswer(g), actions: [], games: chipsFor(g) };
    if (!g && /(coin ?packs?|buy coins?|more coins|top ?up|how (do|can) i pay|payment|pricing|how much (are|is|do).*coins?|price of coins)/i.test(q)) {
      return { text: '**Coin packs** (one-time secure payments):\n' + packs().map(function (p) { return '- ' + num(p.coins) + ' coins · ' + p.price; }).join('\n') + '\n\nHow to buy:\n1. Sign in with Google.\n2. Click the coin badge to open the shop.\n3. Pick a pack and pay on the secure checkout page.\n4. You come back to the site and the coins are added automatically.', actions: ['shop'] };
    }
    if (!g && /(faster|quick|fast|speed|farm|grind|more coins|earn|get coins|make coins|collect|how do (coins|streaks?|levels?|xp) work|daily bonus|streak)/i.test(q)) {
      return { text: coachText(), actions: ['shop'] };
    }
    if (!g && /(locked|special|premium) games?|which games.*(locked|special|unlock)|what.*(unlock|locked)/i.test(q)) {
      return { text: '**Special (locked) games**\n' + specialList().map(function (r) { return '- ' + r.g.name + ': ' + num(r.sp.price) + ' coins · ' + r.sp.streak + '-day streak · level ' + r.sp.level; }).join('\n') + '\n\nAsk me "how do I unlock" any of them for the steps.', actions: ['shop'], games: specialList().map(function (r) { return r.g; }).slice(0, 5) };
    }
    if (g && ctx.named.length === 1 && info(g).howToPlay + info(g).controls + info(g).intro !== '' && /how|control|key|tip|trick|mode|what is|about|tell|explain|guide|play|learn|beat|win|multiplayer|player|worth|review|describe|info/i.test(q)) {
      var t = gameAnswer(g, q); if (t) return { text: t, actions: [], games: chipsFor(g) };
    }
    return null;
  }

  /* ---------------- scope guard: the AI only talks about games, tags, categories and coins ---------------- */
  var BLOCK_RE = /(\bfiles?\b|folders?|director(y|ies)|\.(json|js|html?|css|xml|txt|py|gs|har|wgb|ps1)\b|\burls?\b|\blinks?\b|\bapis?\b|endpoint|back ?end|front ?end|\bserver side\b|\bscripts?\b|source code|\bcode base\b|admin|database|spreadsheet|google sheet|apps? script|stripe|payment link|checkout link|secret|password|api ?key|private key|access key|client ?id|bucket|\br2\b|cloudflare|github|emulat|\bemu\b|iframe|embed|vault|service ?worker|devtools|dev tools|view source|exploit|bypass|crack the|hack (the )?(site|shop|coins?|wallet|game hub|gamenetic)|coin hack|unlimited coins|free coins hack|infinite coins|sitemap|manifest)/i;
  var SCOPE_MSG = 'I can only help with the games, their tags and categories, how to play them, and how coins and special games work. Ask me about a game or how to get coins!';

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
    var h = esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
    var lines = h.split('\n'), out = '', inList = false, listTag = 'ul';
    lines.forEach(function (l) {
      var hm = l.match(/^\s*(#{1,4})\s+(.*)$/);
      var om = l.match(/^\s*\d+[.)]\s+(.*)$/);
      var um = l.match(/^\s*[-*•]\s+(.*)$/);
      if (hm) {
        if (inList) { out += '</' + listTag + '>'; inList = false; }
        var lvl = Math.min(hm[1].length + 3, 6); // #->h4 .. ####->h6
        out += '<h' + lvl + '>' + hm[2] + '</h' + lvl + '>';
      } else if (om || um) {
        var tag = om ? 'ol' : 'ul', text = om ? om[1] : um[1];
        if (inList && listTag !== tag) { out += '</' + listTag + '>'; inList = false; }
        if (!inList) { out += '<' + tag + '>'; inList = true; listTag = tag; }
        out += '<li>' + text + '</li>';
      } else {
        if (inList) { out += '</' + listTag + '>'; inList = false; }
        if (/^\s*(-{3,}|—{3,})\s*$/.test(l)) out += '<hr>';
        else if (l.trim()) out += '<p>' + l + '</p>';
      }
    });
    return out + (inList ? '</' + listTag + '>' : '');
  }

  var FONT = '"Inter",ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
  var css = '' +
    '@import url(\'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap\');' +
    '#gnaiBtn{position:fixed;right:18px;bottom:18px;z-index:9998;display:flex;align-items:center;gap:8px;padding:12px 18px;border:0;border-radius:999px;cursor:pointer;font:600 14px/1 ' + FONT + ';color:#fff;background:linear-gradient(135deg,#7c3aed,#ec4899);box-shadow:0 8px 24px rgba(124,58,237,.5)}' +
    '#gnaiBtn:hover{transform:translateY(-2px)}' +
    '#gnai{position:fixed;right:18px;bottom:78px;z-index:9999;width:380px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 100px);display:none;flex-direction:column;background:#0b0f1a;color:#f1f5f9;border:1px solid #334155;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.65);font:15px/1.6 ' + FONT + ';letter-spacing:.1px;overflow:hidden}' +
    '#gnai.open{display:flex}' +
    '#gnai .h{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:linear-gradient(135deg,#0f172a,#1e1b4b);border-bottom:1px solid #334155;font-weight:700}' +
    '#gnai .h small{display:block;font-weight:400;color:#94a3b8;font-size:11px}' +
    '#gnai .x{background:none;border:0;color:#94a3b8;font-size:22px;cursor:pointer;line-height:1}' +
    '#gnaiLog{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px}' +
    '#gnaiLog .m{max-width:88%;padding:9px 12px;border-radius:12px;word-wrap:break-word}' +
    '#gnaiLog .u{align-self:flex-end;background:#7c3aed;color:#fff;border-bottom-right-radius:3px}' +
    '#gnaiLog .a{align-self:flex-start;background:#1e293b;border-bottom-left-radius:3px}' +
    '#gnaiLog .a p{margin:0 0 8px}#gnaiLog .a p:last-child{margin:0}' +
    '#gnaiLog .a h4,#gnaiLog .a h5,#gnaiLog .a h6{margin:10px 0 4px;font-weight:700;color:#f1f5f9}' +
    '#gnaiLog .a h4{font-size:15px}#gnaiLog .a h5{font-size:14px}#gnaiLog .a h6{font-size:13px;color:#c4b5fd}' +
    '#gnaiLog .a ul,#gnaiLog .a ol{margin:4px 0 8px 20px;padding:0}#gnaiLog .a li{margin:2px 0}' +
    '#gnaiLog .a code{background:#111827;border:1px solid #334155;border-radius:4px;padding:1px 5px;font:13px/1.4 ui-monospace,Menlo,Consolas,monospace}' +
    '#gnaiLog .a hr{border:0;border-top:1px solid #334155;margin:10px 0}' +
    '#gnaiLog .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}' +
    '#gnaiLog .chip{padding:5px 10px;border-radius:999px;border:1px solid #a78bfa;background:transparent;color:#c4b5fd;font:500 12px/1 ' + FONT + ';cursor:pointer}' +
    '#gnaiLog .chip:hover{background:#7c3aed;color:#fff}' +
    '#gnaiStatus{padding:0 14px;color:#a78bfa;font-size:12px;min-height:16px}' +
    '#gnai .in{display:flex;gap:8px;padding:10px;border-top:1px solid #334155;background:#111827}' +
    '#gnai input{flex:1;min-width:0;padding:10px 12px;border-radius:10px;border:1px solid #334155;background:#0b0f1a;color:#f1f5f9;font:15px/1.4 ' + FONT + ';outline:none}' +
    '#gnai input:focus{border-color:#7c3aed}' +
    '#gnai .send{padding:0 14px;border:0;border-radius:10px;background:#7c3aed;color:#fff;font:600 14px ' + FONT + ';cursor:pointer}' +
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
      chips(el, ['How do I unlock IGI 2?', 'How do coins work?', 'Recommend a 2 player game', 'How do I get coins faster?'], true);
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
      text = String(text).replace(/https?:\/\/\S+/gi, '').replace(/\bwww\.\S+/gi, '');
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
        await loadRW();
        var ctx = buildContext(q);
        if (ctx.named.some(function (g) { return !(rw && rw[keyOf(g)]); })) { await loadBlogs(); ctx = buildContext(q); }
        if (ctx.named.length === 1) lastGame = ctx.named[0]; // remember what this conversation is about, for "it"/"this" next turn

        // 1) anything about files, links, code, keys, backends, admin, emulators: not shared, ever
        if (BLOCK_RE.test(q)) return finish(bubble, SCOPE_MSG, null, { shown: [] }, q);
        // 2) exact answers for games, coins and the shop
        var res = directAnswer(q, ctx);
        if (res) return finish(bubble, res.text, res, { shown: ctx.named }, q);
        // 3) everything else: chat with the model, grounded in the game data
        var reply = '';
        var sys = 'You are Gamenetic AI, built into the Gamenetic free browser games site. Write the way a sharp, concise assistant writes: plain language, no filler, no repeated stock phrases, no padding sentences just to sound complete. ' +
          'Use ONLY the facts in DATA below. Never invent or guess a game\'s controls, tips, price, streak, level or features. If DATA does not cover what was asked, say plainly that you do not have that detail, in one short sentence, instead of making something up or repeating a generic description. ' +
          'If someone just says hi, greet them in one short sentence and ask what they want to play. ' +
          'Format for readability: short paragraphs, **bold** for key terms, and a numbered or bulleted list whenever you give steps or more than two items. Do not restate the question back to the user. Do not use the exact same sentence structure for every game you describe. ' +
          'You ONLY talk about: the games on Gamenetic, their tags and categories, how to play them, recommendations, and how coins and special locked games work (earn coins by playing a little every day, or buy coins, then unlock). If asked about anything else, say in one sentence that you only help with games and coins. ' +
          'Never mention or reveal files, links, URLs, code, scripts, servers, keys, payment links, admin tools or how the site is built.' +
          '\n\nDATA:\n' + ctx.text;
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
          reply = fallback(ctx, ctx.named, '');
        }
        if (!reply.trim()) reply = fallback(ctx, ctx.named, '');
        if (BLOCK_RE.test(reply)) reply = SCOPE_MSG;   // never let the model leak something it should not
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
        loadRW(); inp.focus();
      }
    };
    box.querySelector('.x').onclick = function () { box.classList.remove('open'); };
    send.onclick = function () { if (busy) { stopFlag = true; } else { ask(); } };
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ask(); });
  }

  /* ---------------- preload: start caching the model into IndexedDB as soon as the page opens ---------------- */
  function preload() {
    if (!navigator.gpu) return; // no WebGPU, nothing to preload
    getEngine().catch(function () { /* ignore; chat still falls back to plain answers */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  if ('requestIdleCallback' in window) requestIdleCallback(preload, { timeout: 4000 }); else setTimeout(preload, 300);
})();