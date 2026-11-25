// rewrite-feed.js (v2)
const fs = require('fs');
const FEED = 'https://gamemonetize.com/feed.php?format=0&num=200&page=';
const OPENAI_KEY = process.env.OPENAI_KEY;
const LIMIT = Number(process.env.LIMIT || 0);

// Skip these — they'll be filtered out by index.html's BLOCKED regex anyway
const BLOCKED = /brain\s*-?rot|skibidi|\bsigma\b|\brizz|gyatt|fanum|tung\s*tung|sahur|tralal|bombardiro|crocodilo|cappuccin[oa]|lirili|larila|chimpanzini|bananini|patapim|\bohio\b|steal\s+a\b|mewing|looksmax|italian\s+meme|\bmeme\s+(rot|game)/i;

function clean(s) {
  return String(s || '')
    .replace(/<[^>]*>/g, ' ')                                 // HTML tags
    .replace(/https?:\/\/\S+/gi, ' ')                          // http/https URLs
    .replace(/\b(?:www\.)?[a-z0-9-]+\.(?:com|es|org|io|net|co|org\.es|com\.es)\S*/gi, ' ') // bare domains
    .replace(/web\s*dev\s*$/i, ' ')                            // "Web Dev" footer
    .replace(/&[a-z]+;/gi, ' ')                                // &amp; etc
    .replace(/\s+([.,!?;:])/g, '$1')                           // spaces before punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchAll() {
  const out = [];
  for (let p = 1; p < 300; p++) {
    const r = await fetch(FEED + p);
    if (!r.ok) break;
    const data = await r.json();
    if (!Array.isArray(data) || !data.length) break;
    for (const it of data) {
      if (!it || !it.id || !it.title) continue;
      out.push({ id: String(it.id), title: clean(it.title), description: clean(it.description) });
    }
    console.log('page', p, '→ total', out.length);
  }
  return out;
}

async function aiRewrite(title, description) {
  const prompt =
`You are writing for an arcade game portal called Gamenetic.
Return JSON only, keys "title" and "description".

Rules:
- "title": rewrite the title in your own words, 60 characters max, keep the game name recognizable, no clickbait, no ALL CAPS.
- "description": 90–140 words, natural English, describe gameplay and controls as implied by the original. Do not invent features, do not add URLs, do not add marketing tags like "Web Dev" or website names.
- Fix any encoding errors (e.g. "caf " -> "café", "s " -> "s", "s " -> "'s").
- Do not copy the original sentences verbatim.

Original title: ${title}
Original description: ${description}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + OPENAI_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7
    })
  });
  if (!res.ok) throw new Error('OpenAI ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const j = await res.json();
  return JSON.parse(j.choices[0].message.content);
}

(async () => {
  const games = await fetchAll();
  fs.writeFileSync('feed-raw.json', JSON.stringify(games, null, 2));
  console.log('feed-raw.json saved —', games.length, 'games');

  if (!OPENAI_KEY) { console.log('Set OPENAI_KEY to run AI rewrites.'); return; }

  const keep = games.filter(g => !BLOCKED.test(g.title + ' ' + g.description));
  console.log('Skipping', games.length - keep.length, 'blocked games. Rewriting', keep.length, '.');

  const todo = LIMIT ? keep.slice(0, LIMIT) : keep;
  const rewrites = {};

  for (let i = 0; i < todo.length; i++) {
    const g = todo[i];
    try {
      const rw = await aiRewrite(g.title, g.description);
      rewrites[g.id] = { title: rw.title, description: rw.description };
    } catch (e) {
      console.error('FAIL', g.id, e.message);
    }
    if (i % 25 === 0) fs.writeFileSync('rewrites.json', JSON.stringify(rewrites, null, 2));
    await new Promise(r => setTimeout(r, 150));
  }
  fs.writeFileSync('rewrites.json', JSON.stringify(rewrites, null, 2));
  console.log('DONE. rewrites.json has', Object.keys(rewrites).length, 'entries.');
})();