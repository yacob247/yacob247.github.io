const $ = (id) => document.getElementById(id);

function esc(value) {
  return String(value || "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function profileUrl(profile) {
  return `profile.html?id=${encodeURIComponent(profile.id)}`;
}

function getProfiles() {
  return Array.isArray(window.PROFILES) ? window.PROFILES : PROFILES;
}

function categoryCounts() {
  return getProfiles().reduce((map, item) => {
    map[item.category] = (map[item.category] || 0) + 1;
    return map;
  }, {});
}

function searchProfiles(query = "", category = "All") {
  const q = query.toLowerCase().trim();
  return getProfiles().filter(item => {
    const categoryOk = category === "All" || item.category === category;
    const haystack = `${item.name} ${item.category} ${item.summary} ${(item.tags || []).join(" ")}`.toLowerCase();
    return categoryOk && (!q || haystack.includes(q));
  });
}

function renderProfileCards(id, items) {
  const el = $(id);
  if (!el) return;
  el.classList.remove("loading", "muted");
  el.innerHTML = items.map(item => `
    <article class="person-card">
      <a href="${esc(profileUrl(item))}">${esc(item.name)}</a>
      <p class="summary">${esc(item.summary)}</p>
      <div class="meta">
        <span class="chip">${esc(item.category)}</span>
        ${(item.tags || []).slice(0, 3).map(tag => `<span class="chip">${esc(tag)}</span>`).join("")}
      </div>
    </article>
  `).join("");
}

function renderList(id, items) {
  const el = $(id);
  if (!el) return;
  el.classList.remove("loading", "muted");
  el.innerHTML = items.map((item, index) => `
    <article class="item">
      <a href="${esc(profileUrl(item))}">${index + 1}. ${esc(item.name)}</a>
      <p class="summary">${esc(item.summary)}</p>
      <div class="meta">
        <span class="chip">${esc(item.category)}</span>
        ${(item.tags || []).slice(0, 4).map(tag => `<span class="chip">${esc(tag)}</span>`).join("")}
      </div>
    </article>
  `).join("");
}

function renderCategoryTabs(containerId, active = "All", onClick = () => {}) {
  const el = $(containerId);
  if (!el) return;
  const categories = ["All", ...Object.keys(categoryCounts()).sort()];
  el.innerHTML = categories.map(category => `<button type="button" class="${category === active ? "active" : ""}" data-category="${esc(category)}">${esc(category)}</button>`).join("");
  el.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    el.querySelectorAll("button").forEach(btn => btn.classList.toggle("active", btn === button));
    onClick(button.dataset.category);
  });
}

function bindSearch() {
  document.querySelectorAll("[data-topic-form]").forEach(form => {
    form.addEventListener("submit", event => {
      event.preventDefault();
      const q = new FormData(form).get("q") || "";
      location.href = `topics.html?q=${encodeURIComponent(q)}`;
    });
  });
}

function loadDashboard() {
  renderList("top-pages", getProfiles().slice(0, 16));
  renderList("news-stream", getProfiles().filter(p => ["YouTuber", "TikToker", "Celebrity", "Streamer"].includes(p.category)).slice(0, 12));
  renderProfileCards("people-stream", getProfiles().filter(p => p.category !== "Subject").slice(0, 24));
}

function loadPeople() {
  renderProfileCards("people-stream", getProfiles().filter(p => p.category !== "Subject"));
  renderList("news-stream", getProfiles().filter(p => ["Celebrity", "Athlete", "Historical Figure"].includes(p.category)).slice(0, 18));
}

function loadNews() {
  renderList("news-stream", getProfiles().filter(p => ["YouTuber", "TikToker", "Celebrity", "Streamer", "Athlete"].includes(p.category)).slice(0, 30));
  renderList("top-pages", getProfiles().filter(p => p.category === "Historical Figure" || p.category === "Subject").slice(0, 24));
}

function loadTopics() {
  const params = new URLSearchParams(location.search);
  let query = params.get("q") || "";
  let category = "All";
  const input = $("topic-input");
  if (input) input.value = query;
  const render = () => {
    const results = searchProfiles(query, category);
    renderList("topic-news", results.slice(0, 36));
    renderProfileCards("topic-context", results.slice(0, 12));
  };
  const form = document.querySelector("[data-topic-form]");
  if (form) {
    form.addEventListener("submit", event => {
      event.preventDefault();
      query = new FormData(form).get("q") || "";
      history.replaceState(null, "", `topics.html?q=${encodeURIComponent(query)}`);
      render();
    });
  }
  renderCategoryTabs("local-category-tabs", category, next => {
    category = next;
    render();
  });
  render();
}

function loadResearch() {
  const params = new URLSearchParams(location.search);
  const query = params.get("q") || "";
  const results = searchProfiles(query);
  const primary = results[0] || getProfiles()[0];
  $("research-title").textContent = query ? `Research: ${query}` : "Local research library";
  $("research-lead").textContent = "This page is built from your local profile data.";
  const input = $("research-input");
  if (input) input.value = query;
  renderList("topic-context", results.slice(0, 12));
  renderProfileCards("topic-news", results.slice(0, 12));
  renderList("top-pages", [primary, ...getProfiles().filter(item => item.category === primary.category && item.id !== primary.id).slice(0, 12)]);
}

function loadProfile() {
  const id = new URLSearchParams(location.search).get("id") || "";
  const item = getProfiles().find(profile => profile.id === id) || getProfiles()[0];
  document.title = `${item.name} - TrendScope Profile`;
  $("profile-title").textContent = item.name;
  $("profile-category").textContent = item.category;
  $("profile-summary").textContent = item.summary;
  $("profile-overview").textContent = item.overview;
  $("profile-why").textContent = item.why;
  $("profile-tags").innerHTML = (item.tags || []).map(tag => `<span class="chip">${esc(tag)}</span>`).join("");
  $("profile-angles").innerHTML = item.angles.map(angle => `<li>${esc(angle)}</li>`).join("");
  renderProfileCards("related-profiles", getProfiles().filter(profile => profile.category === item.category && profile.id !== item.id).slice(0, 12));
}

function pushAds() {
  if (!window.adsbygoogle) return;
  document.querySelectorAll(".adsbygoogle").forEach(() => {
    try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (error) {}
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindSearch();
  const page = document.body.dataset.page;
  if (page === "home") loadDashboard();
  if (page === "people") loadPeople();
  if (page === "news") loadNews();
  if (page === "topics") loadTopics();
  if (page === "research") loadResearch();
  if (page === "profile") loadProfile();
  pushAds();
});
