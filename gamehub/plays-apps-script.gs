/**
 * Gamenetic play counter  (a SEPARATE Apps Script from your ratings one - nothing there is touched)
 *
 * 1. Go to script.google.com -> New project -> paste this whole file.
 * 2. Deploy -> New deployment -> type "Web app"
 *      Execute as: Me      Who has access: Anyone
 * 3. Copy the Web app URL and paste it into index.html:   const PLAYS_API_URL = '...';
 *
 * It keeps a sheet called "Plays" with: gameId | total plays | per-day counts (last 7 days).
 * GET  -> { gameId: { t: totalPlays, r: playsInLast2Days } }   (used for Most Played / Trending)
 * POST -> gameId=...   adds one play
 */
const SHEET = 'Plays';

function sheet_() {
  const ss = SpreadsheetApp.getActive() || SpreadsheetApp.create('Gamenetic plays');
  let s = ss.getSheetByName(SHEET);
  if (!s) { s = ss.insertSheet(SHEET); s.appendRow(['gameId', 'total', 'days']); }
  return s;
}
function day_(offset) {
  return Utilities.formatDate(new Date(Date.now() - offset * 864e5), 'UTC', 'yyyy-MM-dd');
}
function json_(o) {
  return ContentService.createTextOutput(typeof o === 'string' ? o : JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('plays');
  if (hit) return json_(hit);
  const rows = sheet_().getDataRange().getValues().slice(1);
  const d0 = day_(0), d1 = day_(1), out = {};
  rows.forEach(r => {
    if (!r[0]) return;
    let d = {}; try { d = JSON.parse(r[2] || '{}'); } catch (e) {}
    out[r[0]] = { t: Number(r[1]) || 0, r: (d[d0] || 0) + (d[d1] || 0) };
  });
  const text = JSON.stringify(out);
  cache.put('plays', text, 120);
  return json_(text);
}

function doPost(e) {
  const id = String((e && e.parameter && e.parameter.gameId) || '').slice(0, 80);
  if (!id) return json_({ ok: false });
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const s = sheet_();
    const found = s.getRange(2, 1, Math.max(1, s.getLastRow() - 1), 1).createTextFinder(id).matchEntireCell(true).findNext();
    const today = day_(0), cutoff = day_(7);
    if (found) {
      const row = found.getRow();
      const vals = s.getRange(row, 2, 1, 2).getValues()[0];
      let d = {}; try { d = JSON.parse(vals[1] || '{}'); } catch (err) {}
      d[today] = (d[today] || 0) + 1;
      Object.keys(d).forEach(k => { if (k < cutoff) delete d[k]; });
      s.getRange(row, 2, 1, 2).setValues([[(Number(vals[0]) || 0) + 1, JSON.stringify(d)]]);
    } else {
      s.appendRow([id, 1, JSON.stringify({ [today]: 1 })]);
    }
    CacheService.getScriptCache().remove('plays');
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}
