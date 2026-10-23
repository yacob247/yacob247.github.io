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
  let S = { streak: 0, last: 0, xp: 0, plays: {}, cats: {}, week: {}, badges: {}, react: {}, seen: {} };
  try { S = { ...S, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

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

  /* ---------- daily streak ---------- */
  (function streak() {
    const d = dayNum(), prev = S.last;
    if (prev === d) return;
    S.streak = prev === d - 1 ? S.streak + 1 : 1; S.last = d; save();
    if (S.streak >= 7) award('streak7', '7-day streak');
    if (S.streak > 1) addXP(10, 'Day ' + S.streak + ' streak');
  })();

  function paintBadge() {
    let b = $('#gnpBadge');
    if (!b) { const nav = $('#nav'); if (!nav) return; b = el('a', { id: 'gnpBadge', class: 'gnp-badge', href: '#', title: 'Your progress' }); nav.append(b); b.onclick = e => { e.preventDefault(); showProfile(); }; }
    b.textContent = '🔥 ' + S.streak + '  ·  Lv ' + level();
  }

  const ACH = [
    ['streak7', '7-day streak', () => S.streak >= 7],
    ['cats10', 'Played 10 different categories', () => Object.keys(S.cats).length >= 10],
    ['new5', 'Tried 5 new games this week', () => Object.keys(S.week).length >= 5],
    ['plays50', 'Played 50 games', () => Object.keys(S.plays).length >= 50],
  ];
  function showProfile() {
    const o = el('div', { class: 'gnp-modal' });
    const card = el('div', { class: 'gnp-card' }, el('h3', { text: 'Level ' + level() + ' · ' + S.xp + ' XP' }),
      el('p', { text: '🔥 ' + S.streak + '-day streak · ' + Object.keys(S.plays).length + ' games played' }));
    ACH.forEach(([id, label]) => card.append(el('div', { class: 'gnp-ach' + (S.badges[id] ? ' on' : ''), text: (S.badges[id] ? '🏆 ' : '🔒 ') + label })));
    card.append(el('button', { text: 'Close', class: 'gnp-btn' }));
    o.append(card); o.onclick = e => { if (e.target === o || e.target.tagName === 'BUTTON') o.remove(); };
    document.body.append(o);
  }

  /* ---------- track plays ---------- */
  function onPlay(id) {
    const g = games().find(x => x.id === id); if (!g) return;
    const isNew = !S.plays[id];
    S.plays[id] = Date.now();
    if (g.category) S.cats[g.category] = 1;
    const wk = Math.floor(dayNum() / 7);
    if (S.weekId !== wk) { S.weekId = wk; S.week = {}; }
    if (isNew) S.week[id] = 1;
    save(); addXP(isNew ? 5 : 1);
    ACH.forEach(([aid, label, test]) => test() && award(aid, label));
    startBreakTimer(); decoratePlayer(g);
  }

  /* ---------- home: game of the day + recently played ---------- */
  function railCard(g, sub) {
    const a = el('a', { class: 'gnp-card-g', href: '#/play/' + encodeURIComponent(g.id) });
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
    const rep = el('a', { class: 'gnp-btn', href: 'mailto:envizionupdates@gmail.com?subject=' + encodeURIComponent('Broken game: ' + g.name + ' (' + g.id + ')'), text: '⚠ Broken? Report it' });
    row.append(rep); box.append(row);
    const sim = similar(g);
    if (sim.length) { const r = el('div', { class: 'gnp-rail' }); sim.forEach(x => r.append(railCard(x))); box.append(el('h2', { class: 'gnp-h', text: 'Games like this' }), r); }
    host.after(box);
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
    else if (e.key === 'Escape' && location.hash) location.hash = '';
  });

  /* ---------- styles ---------- */
  document.head.append(el('style', { text: `
.gnp-badge{margin-left:12px;padding:6px 12px;border-radius:99px;background:var(--surface,#1e293b);border:1px solid var(--border,#334155);color:var(--text,#f1f5f9);font:600 13px system-ui;text-decoration:none;white-space:pre}
.gnp-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,30px);opacity:0;transition:.35s;background:var(--accent,#7c3aed);color:#fff;padding:10px 18px;border-radius:12px;font:600 14px system-ui;z-index:99999;box-shadow:var(--shadow,0 10px 30px #0008)}
.gnp-toast.show{opacity:1;transform:translate(-50%,0)}
#gnpHome,#gnpPlayer{padding:0 16px;max-width:1400px;margin:16px auto;color:var(--text,#f1f5f9)}
.gnp-h{font-size:20px;margin:18px 0 10px}
.gnp-rail{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;scrollbar-width:thin}
.gnp-card-g{flex:0 0 150px;text-decoration:none;color:inherit}
.gnp-card-g img{width:150px;height:112px;object-fit:cover;border-radius:var(--radius,14px);background:var(--surface,#1e293b);display:block}
.gnp-card-g .t{font:600 13px system-ui;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gnp-card-g .s{font:12px system-ui;opacity:.65}
.gnp-gotd{display:flex;gap:16px;align-items:center;background:var(--surface,#1e293b);border:1px solid var(--border,#334155);border-radius:var(--radius,14px);padding:14px}
.gnp-gotd h2{margin:0 0 6px;font-size:18px}.gnp-gotd p{margin:0;opacity:.85;line-height:1.5}
.gnp-btn{display:inline-block;margin:12px 8px 0 0;padding:8px 14px;border-radius:10px;border:1px solid var(--border,#334155);background:var(--surface,#1e293b);color:inherit;font:600 13px system-ui;cursor:pointer;text-decoration:none}
.gnp-react{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.gnp-emo{font-size:20px;padding:4px 10px;border-radius:10px;border:1px solid var(--border,#334155);background:var(--surface,#1e293b);cursor:pointer}
.gnp-emo.on{border-color:var(--accent,#7c3aed);box-shadow:0 0 12px var(--accent-glow,#7c3aed66)}
.gnp-modal{position:fixed;inset:0;background:#000a;display:grid;place-items:center;z-index:99998}
.gnp-card{background:var(--surface,#1e293b);color:var(--text,#f1f5f9);padding:22px;border-radius:var(--radius,14px);width:min(360px,90vw);font-family:system-ui}
.gnp-ach{padding:8px 0;opacity:.5}.gnp-ach.on{opacity:1}` }));

  /* ---------- wire up ---------- */
  const boot = () => { paintBadge(); paintHome(); };
  addEventListener('hashchange', () => {
    const m = location.hash.match(/^#\/play\/(.+)$/);
    if (m) onPlay(decodeURIComponent(m[1])); else { clearTimeout(breakT); paintHome(); }
  });
  const m0 = location.hash.match(/^#\/play\/(.+)$/);
  let tries = 0;
  const wait = setInterval(() => {           // wait until the game list has loaded
    if (games().length || ++tries > 60) {
      clearInterval(wait); boot();
      if (m0) onPlay(decodeURIComponent(m0[1]));
    }
  }, 250);
})();
