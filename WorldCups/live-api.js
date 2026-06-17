// ============================================================================
// LIVE API INTEGRATION — football-data.org
// ============================================================================
// HOW TO SET THIS UP (free tier available):
//  1. Go to https://www.football-data.org/client/register
//  2. Register — you get a free API token instantly.
//  3. Paste your token into LIVE_API_TOKEN below.
//
// CORS NOTE: football-data.org does not send permissive CORS headers for
// browser requests on the free tier. If you hit a CORS error, set up a tiny
// proxy (Cloudflare Worker, Vercel function, etc.) and point PROXY_BASE_URL
// at it. Until then the UI shows an honest "not available" overlay.
// ============================================================================

const LIVE_API_TOKEN    = "227c450cee7b4d259492ca8e2c15d2a9";
const LIVE_API_IS_CONFIGURED = LIVE_API_TOKEN.length > 0;
const PROXY_BASE_URL    = ""; // e.g. "https://your-worker.name.workers.dev"
const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";
const CACHE_MS          = 60 * 1000; // 60 s — respect free-tier rate limits

const _cache = new Map();

function _baseUrl() {
  return PROXY_BASE_URL || FOOTBALL_DATA_BASE;
}

async function _liveFetch(path) {
  if (!LIVE_API_IS_CONFIGURED) return { ok: false, reason: "NOT_CONFIGURED" };

  const cached = _cache.get(path);
  if (cached && Date.now() - cached.ts < CACHE_MS) return { ok: true, data: cached.data, cached: true };

  try {
    const headers = PROXY_BASE_URL ? {} : { "X-Auth-Token": LIVE_API_TOKEN };
    const res = await fetch(_baseUrl() + path, { headers });
    if (!res.ok) return { ok: false, reason: "HTTP_" + res.status };
    const data = await res.json();
    _cache.set(path, { data, ts: Date.now() });
    return { ok: true, data };
  } catch (err) {
    return { ok: false, reason: "FETCH_FAILED", detail: err.message };
  }
}

/** Matches currently IN_PLAY or PAUSED (live right now). */
async function getLiveMatches() {
  const result = await _liveFetch("/matches?status=LIVE");
  if (!result.ok) return { ok: false, matches: [], reason: result.reason };
  return { ok: true, matches: (result.data.matches || []).map(_normalizeMatch) };
}

/** All matches for the 2026 World Cup on a specific ISO date (YYYY-MM-DD). */
async function getMatchesByDate(dateISO) {
  const result = await _liveFetch(`/competitions/WC/matches?dateFrom=${dateISO}&dateTo=${dateISO}`);
  if (!result.ok) return { ok: false, matches: [], reason: result.reason };
  return { ok: true, matches: (result.data.matches || []).map(_normalizeMatch) };
}

/** Current group standings for the 2026 World Cup. */
async function getStandings() {
  const result = await _liveFetch("/competitions/WC/standings");
  if (!result.ok) return { ok: false, groups: [], reason: result.reason };
  return { ok: true, groups: result.data.standings || [] };
}

function _normalizeMatch(m) {
  return {
    id: m.id,
    utcDate: m.utcDate,
    status: m.status,
    home: m.homeTeam?.name,
    away: m.awayTeam?.name,
    homeScore: m.score?.fullTime?.home,
    awayScore: m.score?.fullTime?.away,
    minute: m.minute,
    stage: m.stage,
    group: m.group,
  };
}

/** Render an honest "data not available" overlay into a container element. */
function renderUnavailableOverlay(container, context = "match") {
  if (!container) return;
  const reasonText = LIVE_API_IS_CONFIGURED
    ? "Couldn't reach the live data source right now (possible CORS restriction — see live-api.js for proxy setup)."
    : "Live data isn't connected yet. Add a football-data.org API key in live-api.js.";
  container.innerHTML = `
    <div class="data-block">
      <div class="overlay-block">
        <div class="icon">⚽</div>
        <div class="msg">
          <strong>${context === "live" ? "No live matches right now" : "Data not available"}</strong>
          ${reasonText}
        </div>
      </div>
    </div>`;
}

window.WCLiveAPI = {
  getLiveMatches,
  getMatchesByDate,
  getStandings,
  renderUnavailableOverlay,
  get isConfigured() { return LIVE_API_IS_CONFIGURED; },
};