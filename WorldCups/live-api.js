// ============================================================================
// LIVE API INTEGRATION — football-data.org
// ----------------------------------------------------------------------------
// HOW TO SET THIS UP (takes about 2 minutes, free tier available):
//  1. Go to https://www.football-data.org/client/register
//  2. Register with an email — you get a free API token instantly.
//  3. Paste your token into LIVE_API_TOKEN below.
//  4. football-data.org's free tier has a request-per-minute limit, so this
//     module caches responses for CACHE_MS and only refetches after that.
//
// IMPORTANT — HONESTY RULE:
//  This module NEVER fabricates scores, fixtures, or stats. If no token is
//  configured, or a request fails, or the tournament data for a given date
//  isn't available yet, every function returns null/[] and the calling UI
//  code is responsible for showing the "not available" overlay defined in
//  css/style.css (.overlay-block). Nothing here is allowed to invent a
//  plausible-looking score.
//
// NOTE ON CORS: football-data.org's API does not set permissive CORS headers
// for browser-side requests on most plans, so direct fetch() calls from this
// static page may be blocked by the browser. The most reliable way to use a
// live API from a static HTML site is a tiny proxy (a few lines of Node, a
// Cloudflare Worker, or a Vercel/Netlify function) that adds your token
// server-side and forwards the JSON. PROXY_BASE_URL below is where you'd
// point this at that proxy once you've set one up. Until then, this module
// will try a direct request, and if the browser blocks it (CORS error), the
// UI will show the same honest "data not available" overlay rather than
// silently failing or faking data.
// ============================================================================

const LIVE_API_TOKEN = "227c450cee7b4d259492ca8e2c15d2a9";
// FIX: Checks if a token actually exists and isn't just an empty string
const LIVE_API_IS_CONFIGURED = LIVE_API_TOKEN !== ""; 
const PROXY_BASE_URL = ""; // e.g. "https://your-worker.yourname.workers.dev" — leave blank to call football-data.org directly
const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";
const CACHE_MS = 60 * 1000; // 60s cache to respect free-tier rate limits

const _cache = new Map();

function _baseUrl() {
  return PROXY_BASE_URL || FOOTBALL_DATA_BASE;
}

async function _liveFetch(path) {
  if (!LIVE_API_IS_CONFIGURED) {
    return { ok: false, reason: "NOT_CONFIGURED" };
  }
  const cacheKey = path;
  const cached = _cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return { ok: true, data: cached.data, cached: true };
  }

  try {
    const headers = PROXY_BASE_URL ? {} : { "X-Auth-Token": LIVE_API_TOKEN };
    const res = await fetch(_baseUrl() + path, { headers });
    if (!res.ok) {
      return { ok: false, reason: "HTTP_" + res.status };
    }
    const data = await res.json();
    _cache.set(cacheKey, { data, ts: Date.now() });
    return { ok: true, data };
  } catch (err) {
    // Almost certainly CORS if no proxy is set up — fail honestly.
    return { ok: false, reason: "FETCH_FAILED", detail: err.message };
  }
}

/**
 * Get matches that are LIVE right now (in-play).
 * Returns { ok, matches: [...] , reason }
 */
async function getLiveMatches() {
  const result = await _liveFetch("/matches?status=LIVE");
  if (!result.ok) return { ok: false, matches: [], reason: result.reason };
  const matches = (result.data.matches || []).map(_normalizeMatch);
  return { ok: true, matches };
}

/**
 * Get matches for a specific competition code on a specific date.
 * For the 2026 World Cup, football-data.org's competition code is typically "WC".
 */
async function getMatchesByDate(dateISO) {
  const result = await _liveFetch(`/competitions/WC/matches?dateFrom=${dateISO}&dateTo=${dateISO}`);
  if (!result.ok) return { ok: false, matches: [], reason: result.reason };
  const matches = (result.data.matches || []).map(_normalizeMatch);
  return { ok: true, matches };
}

/**
 * Get current standings/groups for the 2026 World Cup from the live API.
 */
async function getStandings() {
  const result = await _liveFetch("/competitions/WC/standings");
  if (!result.ok) return { ok: false, groups: [], reason: result.reason };
  return { ok: true, groups: result.data.standings || [] };
}

function _normalizeMatch(m) {
  return {
    id: m.id,
    utcDate: m.utcDate,
    status: m.status, // SCHEDULED, LIVE, IN_PLAY, PAUSED, FINISHED, POSTPONED, CANCELLED
    home: m.homeTeam?.name,
    away: m.awayTeam?.name,
    homeScore: m.score?.fullTime?.home,
    awayScore: m.score?.fullTime?.away,
    minute: m.minute,
    stage: m.stage,
    group: m.group,
  };
}

/**
 * Render an honest overlay into a container when live data isn't available,
 * with a specific reason so users (and you, debugging) know exactly why.
 */
function renderUnavailableOverlay(container, context = "match") {
  if (!container) return;
  let reasonText = "Live data isn't connected yet.";
  if (LIVE_API_IS_CONFIGURED) {
    reasonText = "Couldn't reach the live data source right now.";
  }
  container.innerHTML = `
    <div class="data-block">
      <div class="overlay-block">
        <div class="icon">⚽</div>
        <div class="msg">
          <strong>${context === "live" ? "Game hasn't started or isn't live right now" : "Data not available"}</strong>
          ${reasonText} ${LIVE_API_IS_CONFIGURED ? "" : "The site owner needs to add a football-data.org API key in js/live-api.js."}
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