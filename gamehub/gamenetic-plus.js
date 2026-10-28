/* gamenetic-plus.js — retention + discovery features, all client-side.
 * Hooks into the existing page (window.__getAllGames, #/play/ID routing). */
(() => {
  const KEY = 'gn_plus', DAY = 864e5;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) k === 'class' ? n.className = v : k === 'text' ? n.textContent = v : n.setAttribute(k, v);
    kids.forEach(k => n.append(k));
    return n;
  };
  const games = () => (window.__getAllGames ? window.__getAllGames() : []);
  const thumb = g => (window.__getThumbnail ? window.__getThumbnail(g) : g.thumbnail || '');
  const dayNum = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / DAY);

  /* ---------- state ---------- */
  // light integrity signature: stops casual edits of localStorage (not a substitute for a server)
  const SALT = 'gn\u2022v1';
  const sig = str => { let h = 5381; const t = str + SALT; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  let tamperMsg = '';
  const S0 = { streak: 0, last: 0, xp: 0, plays: {}, cats: {}, week: {}, badges: {}, react: {} };
  let S = { ...S0 };
  try {
    const raw = localStorage.getItem(KEY) || '{}', sg = localStorage.getItem(KEY + '_s');
    if (sg && sg !== sig(raw)) tamperMsg = 'Progress data was edited, so it was reset.';
    else S = { ...S0, ...JSON.parse(raw) };
  } catch (e) {}
  const save = () => { try { const j = JSON.stringify(S); localStorage.setItem(KEY, j); localStorage.setItem(KEY + '_s', sig(j)); } catch (e) {} };

  /* ---------- trusted clock: server time, immune to device clock/timezone changes ---------- */
  const Clock = (() => {
    let srv = 0, perf = 0, ok = false, busy = null;
    async function fetchTime() {
      try {
        const r = await fetch(location.pathname + '?_t=' + Date.now() + Math.random().toString(36).slice(2), { method: 'HEAD', cache: 'no-store' });
        const t = Date.parse(r.headers.get('date') || ''); if (t) return t;
      } catch (e) {}
      try {
        const r = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=UTC', { cache: 'no-store' });
        const j = await r.json(), t = Date.parse(String(j.dateTime).slice(0, 19) + 'Z'); if (t) return t;
      } catch (e) {}
      return 0;
    }
    const sync = () => busy || (busy = fetchTime().then(t => {
      busy = null;
      if (t) { srv = t; perf = performance.now(); ok = true; onSynced(t); }
      return t;
    }));
    return {
      sync,
      ok: () => ok,
      // performance.now() is monotonic, so changing the system clock mid-session does nothing
      now: () => ok ? srv + (performance.now() - perf) : 0,
    };
  })();
  setInterval(() => Clock.sync(), 5 * 6e4);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) Clock.sync(); });
  const onSynced = t => { streakInit(t); paintBadge(); };

  function toast(msg) {
    const t = el('div', { class: 'gnp-toast', text: msg });
    document.body.append(t);
    setTimeout(() => t.classList.add('show'), 20);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3500);
  }
  const level = () => Math.floor(Math.sqrt(S.xp / 20)) + 1;
  function addXP(n, why) {
    const before = level(); S.xp += n; save(); paintBadge();
    if (level() > before) toast('Level up! You are now level ' + level() + ' 🎉');
    else if (why) toast('+' + n + ' XP — ' + why);
  }
  function award(id, label) {
    if (S.badges[id]) return;
    S.badges[id] = Date.now(); save(); toast('🏆 Achievement: ' + label); addXP(50);
  }

  /* ---------- coins & special games ---------- */
  const ECON = {
    perMinute: [1, 5],     // each game pays its own fixed rate (coins per active minute) in this range
    dailyMinutes: 15,      // paid minutes per game per 24 h (cap = rate x this)
    loginBonus: 5,         // coins x streak (max x10) on each new day
  };
  const RATES = {};        // override a game's rate, e.g. { 'minecraft-real': 4 }
  // Special games: price in coins + minimum streak + minimum level to unlock. Edit freely.
  const SPECIAL = {
    'gta-san-andreas':         { price: 500, streak: 6, level: 5 },
    'gta-vice-city':           { price: 400, streak: 5, level: 4 },
    'mafia-1':                 { price: 350, streak: 4, level: 4 },
    'igi-2':                   { price: 300, streak: 4, level: 3 },
    'battlefield':             { price: 300, streak: 3, level: 3 },
    'minecraft-real':          { price: 250, streak: 3, level: 3 },
    'bus-simulator-ultimate':  { price: 200, streak: 2, level: 2 },
  };
  const hashId = id => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return h; };
  const rateOf = g => RATES[g.id] || g.coins || (ECON.perMinute[0] + hashId(g.id) % (ECON.perMinute[1] - ECON.perMinute[0] + 1));
  const EK = 'gn_eco';
  const ecoDef = () => ({ c: 0, tot: 0, g: {}, own: {}, bonusDay: 0 });
  function ecoLoad() {
    try {
      const raw = localStorage.getItem(EK); if (!raw) return ecoDef();
      const i = raw.indexOf('|'), js = raw.slice(i + 1);
      if (sig(js) !== raw.slice(0, i)) { tamperMsg = 'Wallet data was edited, so it was reset.'; return ecoDef(); }
      return { ...ecoDef(), ...JSON.parse(js) };
    } catch (e) { return ecoDef(); }
  }
  const ecoSave = e => { try { const js = JSON.stringify(e); localStorage.setItem(EK, sig(js) + '|' + js); } catch (x) {} };
  const eco = fn => { const e = ecoLoad(); const r = fn(e); ecoSave(e); return r; };   // read-modify-write (multi-tab safe)
  const isLocked = id => !!SPECIAL[id] && !ecoLoad().own[id];
  window.__gnpIsLocked = isLocked;
  window.__gnpShop = id => showShop(id);

  function coinify(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), hits = []; let n;
    while ((n = w.nextNode())) if (n.nodeValue.includes('🪙')) hits.push(n);
    hits.forEach(t => {
      const f = document.createDocumentFragment();
      t.nodeValue.split('🪙').forEach((part, i) => { if (i) f.append(el('span', { class: 'gnp-coin', text: '🪙' })); if (part) f.append(part); });
      t.replaceWith(f);
    });
  }
  function paintWallet(gain) {
    const w = $('#gnpWallet'); if (!w) return;
    let bal = w.querySelector('.gnp-bal');
    if (!bal) {
      bal = el('span', { class: 'gnp-bal' });
      const gift = el('span', { class: 'gnp-gift' }, el('i', { class: 'gnp-box' }, el('b', { class: 'gnp-lid' })),
        el('span', { class: 'gnp-coin', text: '🪙' }), el('em', { class: 'gnp-spark', text: '✨' }));
      w.prepend(gift, ' ', bal);
    }
    bal.textContent = ecoLoad().c;
    if (gain) { const p = el('span', { class: 'gnp-pop', text: '+' + gain }); w.append(p); setTimeout(() => p.remove(), 1200); }
  }
  function dailyBonus(d) {
    const n = eco(e => { if (e.bonusDay >= d) return 0; const n = ECON.loginBonus * Math.min(S.streak, 10); e.bonusDay = d; e.c += n; e.tot += n; return n; });
    if (n) { toast('🪙 Daily bonus: +' + n + ' coins'); paintWallet(n); }
  }

  // earning: only while a game is actually running in a visible, focused tab; paid per game, capped per rolling 24 h
  let curId = null, secAcc = 0, lastTick = performance.now();
  const capNote = {};
  function earn(g, now) {
    const rate = rateOf(g), cap = rate * ECON.dailyMinutes;
    const got = eco(e => {
      let r = e.g[g.id];
      if (!r || now - r.t >= DAY) r = e.g[g.id] = { t: now, c: 0 };
      const add = Math.min(rate, cap - r.c); if (add <= 0) return 0;
      r.c += add; e.c += add; e.tot += add; return add;
    });
    if (got) { capNote[g.id] = 0; paintWallet(got); }
    else if (!capNote[g.id]) { capNote[g.id] = 1; toast('Daily coin limit reached for ' + g.name + ' — it resets 24 h after your first coins'); }
    updateEarn();
  }
  setInterval(() => {
    const t = performance.now(), dt = Math.min(10, (t - lastTick) / 1000); lastTick = t;
    if (!curId) return;
    if (!Clock.ok()) { Clock.sync(); return; }                       // no verified time = no coins
    const f = $('#gameFrame');
    if (document.visibilityState !== 'visible' || !document.hasFocus() || !f || !f.src || /about:blank$/.test(f.src)) return;
    secAcc += dt; if (secAcc < 60) return; secAcc -= 60;
    const g = games().find(x => x.id === curId); if (g) earn(g, Clock.now());
  }, 5000);

  function updateEarn() {
    const box = $('#gnpEarn'); if (!box || !curId) return;
    const g = games().find(x => x.id === curId); if (!g) return;
    const rate = rateOf(g), cap = rate * ECON.dailyMinutes, now = Clock.now();
    if (!now) { box.textContent = '⏱ Verifying time… coins are paused until your connection confirms it.'; return; }
    const r = ecoLoad().g[g.id], live = r && now - r.t < DAY;
    const got = live ? r.c : 0, left = live ? Math.ceil((DAY - (now - r.t)) / 6e4) : 0;
    box.textContent = '🪙 ' + rate + ' coins/min · ' + got + '/' + cap + ' today' + (live ? ' · resets in ' + Math.floor(left / 60) + 'h ' + (left % 60) + 'm' : ' · 24 h timer starts at your first coins');
  }
  setInterval(updateEarn, 15000);

  /* ---------- special games shop ---------- */
  function showShop(focus) {
    document.querySelectorAll('.gnp-modal').forEach(m => m.remove());
    const e = ecoLoad(), list = games(), lv = level();
    const o = el('div', { class: 'gnp-modal' });
    const card = el('div', { class: 'gnp-card gnp-wide' },
      el('h3', { text: '🪙 ' + e.c + ' coins · Special games' }),
      el('p', { text: 'Earn coins by playing (each game pays its own rate, limited every 24 h). Reach the streak and level, then buy a game to unlock it forever.  🔥 ' + S.streak + '-day streak · Level ' + lv }));
    const box = el('div', { class: 'gnp-shop' });
    const rows = Object.entries(SPECIAL).map(([id, sp]) => [id, sp, list.find(x => x.id === id)]).filter(r => r[2])
      .sort((a, b) => (b[0] === focus) - (a[0] === focus));
    if (!rows.length) box.append(el('p', { text: 'No special games available yet.' }));
    rows.forEach(([id, sp, g]) => {
      const own = !!e.own[id], okS = S.streak >= sp.streak, okL = lv >= sp.level, okC = e.c >= sp.price;
      const chip = (ok, t) => el('span', { class: 'gnp-chip ' + (ok ? 'ok' : 'no'), text: (ok ? '✓ ' : '✗ ') + t });
      const info = el('div', { class: 'gnp-shop-info' }, el('div', { class: 'gnp-shop-t', text: g.name }),
        own ? el('div', { class: 'gnp-req' }, el('span', { class: 'gnp-chip ok', text: '🔓 Unlocked' }))
            : el('div', { class: 'gnp-req' }, chip(okS, sp.streak + '-day streak'), chip(okL, 'Level ' + sp.level), chip(okC, sp.price + ' 🪙')));
      let btn;
      if (own) btn = el('a', { class: 'gnp-btn', href: '#/play/' + encodeURIComponent(id), text: '▶ Play' });
      else {
        btn = el('button', { class: 'gnp-btn', text: 'Unlock · ' + sp.price + ' 🪙' });
        if (!(okS && okL && okC)) { btn.disabled = true; btn.title = !okS ? 'Keep your daily streak going' : !okL ? 'Play more to level up' : 'Earn more coins'; }
        btn.onclick = () => {
          const res = eco(x => {
            if (x.own[id]) return 'own'; if (S.streak < sp.streak) return 'streak'; if (level() < sp.level) return 'level'; if (x.c < sp.price) return 'coins';
            x.c -= sp.price; x.own[id] = 1; return 'ok';
          });
          if (res === 'ok') { toast('🔓 Unlocked ' + g.name + '!'); addXP(25); paintWallet(); paintLocks(); showShop(id); }
          else toast('Not yet: ' + ({ streak: 'streak too low', level: 'level too low', coins: 'not enough coins', own: 'already unlocked' }[res]));
        };
      }
      box.append(el('div', { class: 'gnp-shop-row' + (id === focus ? ' focus' : '') }, el('img', { src: thumb(g), alt: '' }), info, btn));
    });
    card.append(box, el('button', { class: 'gnp-btn gnp-x', text: 'Close' }));
    coinify(card);
    o.append(card); o.onclick = ev => { if (ev.target === o || ev.target.classList.contains('gnp-x')) o.remove(); };
    document.body.append(o);
  }

  // lock chips on every game tile that is still locked
  function paintLocks() {
    const e = ecoLoad();
    document.querySelectorAll('.pcard[data-id],.nx[data-id],.gnp-card-g[data-id]').forEach(c => {
      const id = c.dataset.id, sp = SPECIAL[id], chip = c.querySelector(':scope > .gnp-lock');
      if (sp && !e.own[id]) { c.classList.add('gnp-locked'); if (!chip) { const lk = el('span', { class: 'gnp-lock', text: '🔒 ' + sp.price + ' 🪙' }); coinify(lk); c.append(lk); } }
      else { c.classList.remove('gnp-locked'); chip && chip.remove(); }
    });
  }
  let lockT; new MutationObserver(() => { clearTimeout(lockT); lockT = setTimeout(paintLocks, 120); }).observe(document.documentElement, { childList: true, subtree: true });

  /* ---------- daily streak (uses trusted server day, UTC) ---------- */
  function streakInit(t) {
    const d = Math.floor(t / DAY);
    if (!S.tz) { S.tz = 1; if (S.last > d) S.last = d; save(); }   // one-time migration from local-day numbers
    const prev = S.last;
    if (prev >= d) return;                                          // same day, or a rolled-back clock: no reward
    S.streak = prev === d - 1 ? S.streak + 1 : 1; S.last = d; save();
    if (S.streak >= 7) award('streak7', '7-day streak');
    if (S.streak > 1) addXP(10, 'Day ' + S.streak + ' streak');
    dailyBonus(d);
  }

  function paintBadge() {
    let b = $('#gnpBadge');
    if (!b) {
      const nav = $('#nav'); if (!nav) return;
      const host = nav.querySelector('.nav-r') || nav.querySelector('.nav-in') || nav;
      b = el('a', { id: 'gnpBadge', class: 'gnp-badge', href: '#', title: 'Your progress' });
      host.prepend(b);
      b.onclick = e => { e.preventDefault(); showProfile(); };
      const r = el('a', { id: 'gnpRecent', class: 'gnp-badge', href: '#', title: 'Recently played', text: '🕒 Recent' });
      r.onclick = e => { e.preventDefault(); showRecent(); };
      host.prepend(r);
      const w = el('a', { id: 'gnpWallet', class: 'gnp-badge', href: '#', title: 'Your coins & special games' });
      w.onclick = e => { e.preventDefault(); showShop(); };
      host.prepend(w);
    }
    b.style.display = (S.xp > 0 || Object.keys(S.plays).length > 0) ? '' : 'none';
    b.textContent = '🔥 ' + S.streak + '  ·  Lv ' + level();
    paintWallet();
  }

  const ACH = [
    ['streak7', '7-day streak', () => S.streak >= 7],
    ['cats10', 'Played 10 different categories', () => Object.keys(S.cats).length >= 10],
    ['new5', 'Tried 5 new games this week', () => Object.keys(S.week).length >= 5],
    ['plays50', 'Played 50 games', () => Object.keys(S.plays).length >= 50],
  ];
  function showProfile() {
    const o = el('div', { class: 'gnp-modal' });
    const lv = level(), base = 20 * (lv - 1) * (lv - 1), next = 20 * lv * lv;
    const pct = Math.max(0, Math.min(100, Math.round((S.xp - base) / (next - base) * 100)));
    const card = el('div', { class: 'gnp-card' }, el('h3', { text: 'Level ' + lv + ' · ' + S.xp + ' XP' }),
      el('p', { text: '🔥 ' + S.streak + '-day streak · ' + Object.keys(S.plays).length + ' games played' }),
      el('div', { class: 'gnp-bar' }, el('i', { style: 'width:' + pct + '%' })),
      el('div', { class: 'gnp-barnote', text: (next - S.xp) + ' XP to level ' + (lv + 1) }));
    ACH.forEach(([id, label]) => card.append(el('div', { class: 'gnp-ach' + (S.badges[id] ? ' on' : ''), text: (S.badges[id] ? '🏆 ' : '🔒 ') + label })));
    card.append(el('button', { text: 'Close', class: 'gnp-btn' }));
    o.append(card); o.onclick = e => { if (e.target === o || e.target.tagName === 'BUTTON') o.remove(); };
    document.body.append(o);
  }

  /* ---------- recently played tab ---------- */
  function showRecent() {
    const list = games();
    const rows = Object.entries(S.plays).sort((a, b) => b[1] - a[1]).slice(0, 40)
      .map(([id, ts]) => [list.find(g => g.id === id), ts]).filter(([g]) => g);
    const o = el('div', { class: 'gnp-modal' });
    const card = el('div', { class: 'gnp-card gnp-wide' }, el('h3', { text: '🕒 Recently played' }));
    if (!rows.length) card.append(el('p', { text: 'Games you play will show up here.' }));
    else {
      const grid = el('div', { class: 'gnp-grid' });
      rows.forEach(([g, ts]) => grid.append(railCard(g, since(ts))));
      card.append(grid);
      const clr = el('button', { class: 'gnp-btn', text: 'Clear history' });
      clr.onclick = () => { S.plays = {}; save(); paintHome(); };
      card.append(clr);
    }
    card.append(el('button', { class: 'gnp-btn', text: 'Close' }));
    o.append(card);
    o.onclick = e => { if (e.target === o || e.target.tagName === 'BUTTON') o.remove(); };
    document.body.append(o);
  }

  /* ---------- track plays ---------- */
  function onPlay(id) {
    const g = games().find(x => x.id === id); if (!g) return;
    curId = id; secAcc = 0; lastTick = performance.now();
    const isNew = !S.plays[id];
    S.plays[id] = Date.now();
    if (g.category) S.cats[g.category] = 1;
    const wk = Math.floor((Clock.ok() ? Clock.now() : Date.now()) / DAY / 7);
    if (S.weekId !== wk) { S.weekId = wk; S.week = {}; }
    if (isNew) S.week[id] = 1;
    save(); addXP(isNew ? 5 : 1); paintBadge();
    ACH.forEach(([aid, label, test]) => test() && award(aid, label));
    startBreakTimer(); decoratePlayer(g);
  }

  /* ---------- home: game of the day + recently played ---------- */
  function railCard(g, sub) {
    const a = el('a', { class: 'gnp-card-g', href: '#/play/' + encodeURIComponent(g.id), 'data-id': g.id });
    const img = el('img', { src: thumb(g), alt: '', loading: 'lazy' });
    a.append(img, el('div', { class: 't', text: g.name }), el('div', { class: 's', text: sub || g.category || '' }));
    return a;
  }
  const since = ts => { const m = Math.max(1, Math.round((Date.now() - ts) / 6e4)); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };

  function paintHome() {
    const list = games(), rows = $('#home .rows'); if (!rows || !list.length) return;
    $('#gnpHome')?.remove();
    const wrap = el('div', { id: 'gnpHome' });
    // Game of the Day: same pick all day for everyone, changes at midnight
    const pool = list.filter(g => g.description && g.description.length > 60);
    const gotd = pool[(dayNum() * 2654435761 >>> 0) % pool.length];
    if (gotd) {
      const blurb = (gotd.description.match(/[^.!?]+[.!?]/g) || [gotd.description]).slice(0, 2).join(' ').trim();
      wrap.append(el('div', { class: 'gnp-gotd' }, railCard(gotd, 'Game of the Day'), el('div', {}, el('h2', { text: '⭐ Game of the Day' }), el('p', { text: blurb }))));
    }
    // Continue playing: last 10 by last played
    const recent = Object.entries(S.plays).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([id, ts]) => [list.find(g => g.id === id), ts]).filter(([g]) => g);
    if (recent.length) {
      const rail = el('div', { class: 'gnp-rail' }); recent.forEach(([g, ts]) => rail.append(railCard(g, since(ts))));
      wrap.append(el('h2', { class: 'gnp-h', text: 'Continue playing' }), rail);
    }
    const surprise = el('button', { class: 'gnp-btn', text: '🎲 Surprise me' });
    surprise.onclick = () => { const fresh = list.filter(g => !S.plays[g.id]); const p = fresh.length ? fresh : list; location.hash = '#/play/' + encodeURIComponent(p[Math.floor(Math.random() * p.length)].id); };
    wrap.append(surprise);
    rows.before(wrap);
  }

  /* ---------- player page: similar games + reactions + report ---------- */
  function similar(g) {
    const tags = new Set((g.tags || []).map(String));
    return games().filter(x => x.id !== g.id).map(x => {
      let sc = x.category === g.category ? 3 : 0;
      (x.tags || []).forEach(t => tags.has(String(t)) && sc++);
      return [sc, x];
    }).filter(([sc]) => sc > 0).sort((a, b) => b[0] - a[0]).slice(0, 6).map(([, x]) => x);
  }
  function decoratePlayer(g) {
    $('#gnpPlayer')?.remove();
    const host = $('#pvDesc'); if (!host) return;
    const box = el('div', { id: 'gnpPlayer' });
    const mine = S.react[g.id] || '';
    const row = el('div', { class: 'gnp-react' });
    ['🔥', '😴', '💀', '🎯'].forEach(e => {
      const b = el('button', { class: 'gnp-emo' + (mine === e ? ' on' : ''), text: e });
      b.onclick = () => { S.react[g.id] = S.react[g.id] === e ? '' : e; save(); decoratePlayer(g); };
      row.append(b);
    });
    const REPORT_EMAIL = 'envizionupdates@gmail.com';
    const body = 'Hi, this game is not working.\n\nGame: ' + g.name + '\nGame ID: ' + g.id +
      '\nLink: ' + location.href + '\nBrowser: ' + navigator.userAgent + '\n\nWhat went wrong:\n';
    const rep = el('a', {
      class: 'gnp-btn', target: '_blank', rel: 'noopener noreferrer', text: '⚠ Broken? Report it',
      href: 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(REPORT_EMAIL) +
        '&su=' + encodeURIComponent('Broken game: ' + g.name + ' (' + g.id + ')') +
        '&body=' + encodeURIComponent(body)
    });
    row.append(rep); box.append(row);
    box.append(el('div', { id: 'gnpEarn', class: 'gnp-earn' }));
    const sim = similar(g);
    if (sim.length) { const r = el('div', { class: 'gnp-rail' }); sim.forEach(x => r.append(railCard(x))); box.append(el('h2', { class: 'gnp-h', text: 'Games like this' }), r); }
    host.after(box); updateEarn();
  }

  /* ---------- gentle break reminder ---------- */
  let breakT;
  function startBreakTimer() {
    clearTimeout(breakT);
    breakT = setTimeout(() => toast('You have been playing for 45 min — take a stretch? 💧'), 45 * 6e4);
  }

  /* ---------- keyboard shortcuts ---------- */
  addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA/.test(e.target.tagName) || e.ctrlKey || e.metaKey) return;
    if (e.key === '/') { e.preventDefault(); $('#heroSearch')?.focus() || $('#navSearch')?.focus(); }
    else if (e.key === 'f' && $('#fsBtn')) $('#fsBtn').click();
    else if (e.key === 'Escape') { const md = $('.gnp-modal'); if (md) md.remove(); else if (location.hash) location.hash = ''; }
  });

  /* ---------- styles ---------- */
  document.head.append(el('style', { text: `
.gnp-badge{--c:#00d4ff;--cg:rgba(0,212,255,.55);position:relative;display:inline-flex;align-items:center;gap:6px;margin-left:12px;padding:7px 15px;border-radius:99px;
background:rgba(10,20,42,.5);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid color-mix(in srgb,var(--c) 40%,transparent);
box-shadow:0 4px 16px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.07);color:#e8f1ff;font:700 13px system-ui;text-decoration:none;white-space:pre;cursor:pointer;
transition:transform .18s cubic-bezier(.2,.9,.3,1.4),box-shadow .18s,border-color .18s,background .18s}
#gnpBadge{--c:#ff7a1a;--cg:rgba(255,122,26,.6)}
.gnp-badge:hover{border-color:var(--c);background:linear-gradient(135deg,color-mix(in srgb,var(--c) 40%,transparent),color-mix(in srgb,var(--c) 10%,transparent));transform:translateY(-2px) scale(1.05);box-shadow:0 0 0 1px var(--c),0 6px 22px var(--cg)}
.gnp-badge:active{transform:scale(.96)}
.gnp-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,30px);opacity:0;transition:.35s;padding:11px 20px;border-radius:14px;color:#fff;font:700 14px system-ui;z-index:99999;
background:linear-gradient(135deg,rgba(255,122,26,.28),rgba(0,212,255,.22)),rgba(10,20,42,.7);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
border:1px solid rgba(255,122,26,.55);box-shadow:0 10px 30px rgba(0,0,0,.5),0 0 24px rgba(255,122,26,.35)}
.gnp-toast.show{opacity:1;transform:translate(-50%,0)}
#gnpHome,#gnpPlayer{padding:0 16px;max-width:1360px;margin:16px auto;color:var(--text,#f1f5f9)}
#home.filtering #gnpHome{display:none}
.gnp-modal{position:fixed;inset:0;background:rgba(3,8,20,.55);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);display:grid;place-items:center;z-index:99998;animation:gnpFade .2s ease}
.gnp-card{position:relative;width:min(380px,92vw);padding:24px;border-radius:20px;color:#e8f1ff;font-family:system-ui;
background:linear-gradient(135deg,rgba(255,122,26,.08),rgba(0,212,255,.07)),rgba(10,20,42,.72);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);
border:1px solid rgba(0,212,255,.3);box-shadow:0 20px 60px rgba(0,0,0,.6),0 0 40px rgba(0,212,255,.12),inset 0 1px 0 rgba(255,255,255,.08);animation:gnpPop .25s cubic-bezier(.2,.9,.3,1.3)}
.gnp-card::before{content:"";position:absolute;inset:0;padding:1.5px;border-radius:inherit;pointer-events:none;background:linear-gradient(120deg,#00d4ff,transparent 45%,#ff7a1a);
-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)}
.gnp-card h3{margin:0 0 6px;font-size:1.3rem;font-weight:800;color:#fff;text-shadow:0 0 18px rgba(0,212,255,.45)}
.gnp-card p{margin:0 0 12px;color:#b9c9e8}
.gnp-wide{width:min(760px,94vw)}
.gnp-bar{height:10px;margin:4px 0 4px;border-radius:99px;background:rgba(255,255,255,.08);border:1px solid rgba(0,212,255,.25);overflow:hidden}
.gnp-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#00d4ff,#ff7a1a);box-shadow:0 0 12px rgba(255,122,26,.7);transition:width .6s ease}
.gnp-barnote{font:600 12px system-ui;color:#9fb4d9;margin-bottom:14px}
.gnp-ach{margin:8px 0;padding:10px 14px;border-radius:12px;background:rgba(10,20,42,.45);border:1px solid rgba(255,255,255,.1);color:#9fb4d9;font:600 14px system-ui;opacity:.75;transition:transform .15s,border-color .2s}
.gnp-ach:hover{border-color:rgba(0,212,255,.5)}
.gnp-ach.on{opacity:1;color:#fff;border-color:rgba(255,122,26,.55);background:linear-gradient(135deg,rgba(255,122,26,.2),rgba(0,212,255,.08));box-shadow:0 0 18px rgba(255,122,26,.3)}
.gnp-grid{display:grid;grid-template-columns:repeat(auto-fill,150px);gap:14px;max-height:58vh;overflow:auto;margin-top:12px;padding:4px;justify-content:center;scrollbar-width:thin;scrollbar-color:#00d4ff55 transparent}
.gnp-h{font-size:1.35rem;font-weight:800;margin:20px 0 10px;color:#fff;text-shadow:0 0 18px rgba(0,212,255,.4)}
.gnp-rail{display:flex;gap:12px;overflow-x:auto;padding:6px 4px 10px;scrollbar-width:thin;scrollbar-color:#00d4ff55 transparent}
.gnp-card-g{flex:0 0 150px;text-decoration:none;color:inherit;transition:transform .2s}
.gnp-card-g img{width:150px;height:112px;object-fit:cover;border-radius:14px;background:rgba(10,20,42,.6);display:block;border:1px solid rgba(0,212,255,.25);transition:box-shadow .2s,border-color .2s}
.gnp-card-g:hover{transform:translateY(-4px)}
.gnp-card-g:hover img{border-color:#ff7a1a;box-shadow:0 10px 24px rgba(0,0,0,.6),0 0 22px rgba(255,122,26,.6)}
.gnp-card-g .t{font:700 13px system-ui;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff}
.gnp-card-g .s{font:600 12px system-ui;color:#9fb4d9}
.gnp-gotd{display:flex;gap:16px;align-items:center;padding:16px;border-radius:18px;background:linear-gradient(135deg,rgba(255,122,26,.07),rgba(0,212,255,.06)),rgba(10,20,42,.5);
-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(0,212,255,.22);box-shadow:0 8px 32px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.06)}
.gnp-gotd h2{margin:0 0 6px;font-size:1.2rem;color:#fff}.gnp-gotd p{margin:0;color:#b9c9e8;line-height:1.5}
.gnp-btn{display:inline-block;margin:12px 8px 0 0;padding:9px 16px;border-radius:99px;border:1px solid rgba(0,212,255,.4);background:rgba(10,20,42,.5);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
color:#fff;font:700 13px system-ui;cursor:pointer;text-decoration:none;transition:transform .15s,box-shadow .2s,border-color .2s,background .2s}
.gnp-btn:hover{border-color:#00d4ff;background:rgba(0,212,255,.16);transform:translateY(-2px);box-shadow:0 0 20px rgba(0,212,255,.5)}
.gnp-card .gnp-btn:last-child{border:0;background:linear-gradient(135deg,#ff7a1a,#ea3333);box-shadow:0 4px 16px rgba(255,122,26,.45)}
.gnp-card .gnp-btn:last-child:hover{box-shadow:0 8px 24px rgba(255,122,26,.75)}
.gnp-react{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.gnp-emo{font-size:20px;padding:5px 12px;border-radius:99px;border:1px solid rgba(0,212,255,.3);background:rgba(10,20,42,.5);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);cursor:pointer;transition:transform .15s,box-shadow .2s,border-color .2s}
.gnp-emo:hover{transform:translateY(-3px) scale(1.12);border-color:#00d4ff;box-shadow:0 0 18px rgba(0,212,255,.5)}
.gnp-emo.on{border-color:#ff7a1a;background:rgba(255,122,26,.2);box-shadow:0 0 18px rgba(255,122,26,.6)}
.gnp-badge{overflow:visible}
#gnpWallet{--c:#ffc233;--cg:rgba(255,194,51,.6)}
.gnp-pop{position:absolute;right:10px;top:-4px;font:800 12px system-ui;color:#ffc233;text-shadow:0 0 8px rgba(255,194,51,.8);animation:gnpUp 1.1s ease forwards;pointer-events:none}
@keyframes gnpUp{to{transform:translateY(-24px);opacity:0}}
.gnp-card-g{position:relative}
.gnp-lock{position:absolute;top:8px;right:8px;z-index:6;padding:4px 10px;border-radius:99px;font:800 11px system-ui;color:#fff;background:rgba(10,20,42,.72);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border:1px solid #ff7a1a;box-shadow:0 0 14px rgba(255,122,26,.6);pointer-events:none}
.gnp-locked img{filter:saturate(.45) brightness(.7)}
.gnp-earn{margin-top:12px;padding:8px 14px;border-radius:99px;display:inline-block;font:700 13px system-ui;color:#ffe3b8;background:rgba(10,20,42,.5);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(255,194,51,.4);box-shadow:0 0 16px rgba(255,194,51,.15)}
.gnp-shop{display:grid;gap:10px;max-height:56vh;overflow:auto;margin:6px 0 4px;padding:2px;scrollbar-width:thin;scrollbar-color:#00d4ff55 transparent}
.gnp-shop-row{display:flex;gap:12px;align-items:center;padding:10px;border-radius:16px;background:rgba(10,20,42,.45);border:1px solid rgba(255,255,255,.1);transition:border-color .2s,box-shadow .2s}
.gnp-shop-row:hover,.gnp-shop-row.focus{border-color:rgba(255,122,26,.6);box-shadow:0 0 20px rgba(255,122,26,.25)}
.gnp-shop-row img{width:64px;height:64px;border-radius:12px;object-fit:cover;flex:0 0 auto;border:1px solid rgba(0,212,255,.3)}
.gnp-shop-info{flex:1;min-width:0}.gnp-shop-t{font:800 15px system-ui;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gnp-req{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.gnp-chip{padding:2px 10px;border-radius:99px;font:700 11px system-ui;border:1px solid rgba(255,255,255,.2);color:#9fb4d9}
.gnp-chip.ok{color:#fff;border-color:#00d4ff;background:rgba(0,212,255,.18)}
.gnp-chip.no{border-color:rgba(255,122,26,.6);color:#ffb066}
.gnp-shop-row .gnp-btn{margin:0;white-space:nowrap}
.gnp-btn[disabled]{opacity:.55;cursor:not-allowed;pointer-events:auto}
.gnp-card .gnp-btn[disabled]:last-child{background:rgba(10,20,42,.5);box-shadow:none;border:1px solid rgba(255,255,255,.18)}
.gnp-card .gnp-btn[disabled]:last-child:hover{transform:none;box-shadow:none}
.gnp-coin{display:inline-block;transform-origin:50% 55%}
.gnp-badge:hover .gnp-coin,.gnp-btn:hover:not([disabled]) .gnp-coin,.gnp-btn[disabled]:hover .gnp-coin,.gnp-chip:hover .gnp-coin,.gnp-shop-row:hover .gnp-coin,.gnp-lock .gnp-coin,.pcard:hover .gnp-lock .gnp-coin,.gnp-card h3:hover .gnp-coin{animation:gnpSpin .9s linear infinite}
.gnp-lock .gnp-coin{animation:none}
.pcard:hover .gnp-lock .gnp-coin,.gnp-card-g:hover .gnp-lock .gnp-coin,.nx:hover .gnp-lock .gnp-coin{animation:gnpSpin .9s linear infinite}
@keyframes gnpSpin{to{transform:rotateY(360deg)}}
#nav .nav-r{align-items:center}
.gnp-badge{box-sizing:border-box;height:36px;padding-top:0;padding-bottom:0;line-height:1;align-self:center;vertical-align:middle}
.gnp-badge .gnp-coin,.gnp-gift{line-height:1}
.gnp-gift{position:relative;display:inline-block;width:18px;height:18px;text-align:center;font-size:16px}
.gnp-gift .gnp-coin{position:relative;z-index:2}
.gnp-box{position:absolute;left:50%;top:50%;width:18px;height:12px;margin:-1px 0 0 -9px;border-radius:3px;z-index:1;opacity:0;pointer-events:none;transform-origin:50% 100%;
background:linear-gradient(#ff7a1a,#ea3333);box-shadow:inset 0 0 0 1px rgba(255,255,255,.4),0 3px 8px rgba(0,0,0,.55)}
.gnp-box::after{content:"";position:absolute;left:50%;top:-4px;width:7px;height:7px;margin-left:-3.5px;border:2px solid #ffd76a;border-radius:50%;box-shadow:0 0 6px #ffc233}
.gnp-lid{position:absolute;left:-1px;right:-1px;top:-5px;height:6px;border-radius:3px 3px 0 0;z-index:3;transform-origin:50% 100%;
background:linear-gradient(90deg,#ea3333 42%,#ffc233 42% 58%,#ea3333 58%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.35);transform:perspective(40px) rotateX(-115deg)}
.gnp-spark{position:absolute;left:50%;top:-8px;margin-left:-6px;font:normal 11px system-ui;opacity:0;z-index:4;pointer-events:none}
#gnpWallet:hover .gnp-coin{animation:gnpFlick 2.8s ease-in-out forwards}
#gnpWallet:hover .gnp-box{animation:gnpBox 2.8s ease-in-out forwards}
#gnpWallet:hover .gnp-lid{animation:gnpLid 2.8s ease-in-out forwards}
#gnpWallet:hover .gnp-spark{animation:gnpSpark 2.8s ease-in-out forwards}
@keyframes gnpFlick{
 0%{transform:translateY(0) rotateY(0) scale(1);opacity:1}
 16%{transform:translateY(-22px) rotateY(540deg) scale(1.3)}
 36%{transform:translateY(-26px) rotateY(1080deg) scale(1.3)}
 54%{transform:translateY(4px) rotateY(1440deg) scale(.7);opacity:1}
 60%,100%{transform:translateY(6px) scale(.2);opacity:0}}
@keyframes gnpBox{
 0%,10%{opacity:0;transform:translateY(12px) scale(.3)}
 26%{opacity:1;transform:translateY(5px) scale(1)}
 66%{opacity:1;transform:translateY(5px) scale(1)}
 82%,100%{opacity:1;transform:translateY(-9px) scale(1.55) rotate(-5deg);filter:drop-shadow(0 0 8px #ffc233)}}
@keyframes gnpLid{
 0%,56%{transform:perspective(40px) rotateX(-115deg)}
 68%,100%{transform:perspective(40px) rotateX(0)}}
@keyframes gnpSpark{
 0%,78%{opacity:0;transform:scale(.3)}
 88%{opacity:1;transform:scale(1.3) translateY(-2px)}
 100%{opacity:1;transform:scale(1)}}
@keyframes gnpFade{from{opacity:0}to{opacity:1}}
@keyframes gnpPop{from{opacity:0;transform:translateY(14px) scale(.95)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){#gnpWallet:hover .gnp-box,#gnpWallet:hover .gnp-lid,#gnpWallet:hover .gnp-spark{animation:none}.gnp-coin{animation:none!important}.gnp-badge,.gnp-btn,.gnp-card,.gnp-modal,.gnp-card-g{animation:none;transition:none}}
` }));

  /* ---------- wire up ---------- */
  Clock.sync();
  const boot = () => { paintBadge(); paintHome(); };
  addEventListener('hashchange', () => {
    const m = location.hash.match(/^#\/play\/(.+)$/);
    if (m && isLocked(decodeURIComponent(m[1]))) return;          // the page itself shows the unlock shop
    document.querySelectorAll('.gnp-modal').forEach(x => x.remove());
    if (m) onPlay(decodeURIComponent(m[1])); else { curId = null; clearTimeout(breakT); paintHome(); }
  });
  const m0 = location.hash.match(/^#\/play\/(.+)$/);
  let tries = 0;
  const wait = setInterval(() => {           // wait until the game list has loaded
    if (games().length || ++tries > 60) {
      clearInterval(wait); boot(); paintLocks();
      if (tamperMsg) toast('⚠ ' + tamperMsg);
      if (m0 && isLocked(decodeURIComponent(m0[1]))) { const id0 = decodeURIComponent(m0[1]); location.hash = ''; setTimeout(() => showShop(id0), 80); }
      else if (m0) onPlay(decodeURIComponent(m0[1]));
    }
  }, 250);
})();