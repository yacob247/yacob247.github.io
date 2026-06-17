// ============================================================================
// SHARED APP SHELL — header, footer, ticker, team-card grid, navigation
// ============================================================================

function renderHeader(activePage) {
  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <div class="shell">
      <a href="index.html" class="brand"><span class="dot"></span> WORLD CUP HUB</a>
      <nav class="nav-links">
        <a href="index.html" data-page="home">Live Now</a>
        <a href="archive2022.html" data-page="archive">2022 Archive</a>
        <a href="trivia.html" data-page="trivia">Trivia</a>
      </nav>
      <div class="auth-slot" id="auth-slot"></div>
      <div id="user-chip"></div>
    </div>`;
  document.body.prepend(header);
  const link = header.querySelector(`[data-page="${activePage}"]`);
  if (link) link.classList.add("active");
}

function renderFooter() {
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="shell">
      <p>World Cup Hub — 2022 data is real historical record, verified against ESPN, FIFA.com, and Olympics.com.
      2026 data is live where a data source is connected, and clearly marked when it isn't.
      Not affiliated with FIFA. Built for fans.</p>
    </div>`;
  document.body.appendChild(footer);
}

function teamSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function renderTicker(containerId, matches) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!matches || matches.length === 0) {
    el.innerHTML = "";
    return;
  }
  const items = matches.map(m => {
    const scoreStr = (m.homeScore != null && m.awayScore != null)
      ? `${m.home} ${m.homeScore} – ${m.awayScore} ${m.away}`
      : `${m.home} vs ${m.away}`;
    return `<div class="ticker-item"><span class="live-pulse"></span><span class="score">${scoreStr}</span><span style="color:var(--sage)">${m.stage || ""}</span></div>`;
  }).join("");
  // Wrap in .ticker-wrap so CSS scroll animation kicks in; duplicate for seamless loop
  el.innerHTML = `<div class="ticker-wrap"><div class="ticker-track">${items}${items}</div></div>`;
}

function teamCardHTML(name, profile) {
  const p = profile || {};
  return `
    <a class="card team-card" href="team.html?team=${encodeURIComponent(name)}">
      <span class="flag">${p.flag || "🏳️"}</span>
      <span>
        <span class="name">${name}</span><br>
        <span class="meta">${p.group ? "Group " + p.group + " · " : ""}${p.finalPlacing || ""}</span>
      </span>
    </a>`;
}

// Firebase is initialised by firebase-auth.js itself on DOMContentLoaded.
// Do NOT call initFirebase() here — that caused a double-init and auth race.