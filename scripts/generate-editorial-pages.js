const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const REVIEWS = path.join(ROOT, 'reviews-blog');
const POSTS_DIR = path.join(REVIEWS, 'posts');
const GAMES_DIR = path.join(REVIEWS, 'games');

function readArray(filePath, declaration, endDeclaration) {
  const source = fs.readFileSync(filePath, 'utf8');
  const start = source.indexOf(declaration);
  if (start < 0) throw new Error(`Could not find ${declaration} in ${filePath}`);
  const end = endDeclaration ? source.indexOf(endDeclaration, start) : source.length;
  const code = source.slice(start, end < 0 ? source.length : end) + `\nthis.__DATA = ${declaration.split(' ')[1]};`;
  const context = {};
  vm.runInNewContext(code, context, { filename: filePath });
  return context.__DATA;
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeHref(value) {
  return /^https:\/\//i.test(String(value || '')) ? esc(value) : '';
}

const CSS = `
:root{color-scheme:light;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a;background:#f8fafc}
*{box-sizing:border-box}body{margin:0;line-height:1.75;background:linear-gradient(180deg,#eef5ff 0,#f8fafc 24rem);color:#1e293b}
a{color:#2563eb;text-decoration:none}a:hover{text-decoration:underline}.site-nav{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem max(1.25rem,calc((100% - 1060px)/2));background:#fff;border-bottom:1px solid #dbe3ef;position:sticky;top:0;z-index:5}.brand{font-weight:900;letter-spacing:-.04em;color:#0f172a}.nav-links{display:flex;gap:1rem;flex-wrap:wrap;font-size:.9rem;font-weight:700}.page{max-width:860px;margin:0 auto;padding:3rem 1.25rem 5rem}.crumbs{font-size:.85rem;font-weight:700;color:#64748b;margin-bottom:2rem}.crumbs span{margin:0 .35rem;color:#94a3b8}.meta{display:flex;gap:.65rem;flex-wrap:wrap;align-items:center;color:#64748b;font-size:.85rem;font-weight:700}.tag,.grade{padding:.25rem .7rem;border-radius:999px;color:#fff;background:#2563eb}.title{font-size:clamp(2rem,5vw,3.6rem);line-height:1.08;letter-spacing:-.05em;margin:.75rem 0 1rem;color:#0f172a}.lead{font-size:1.15rem;color:#475569;border-left:4px solid #2563eb;padding-left:1rem;margin:0 0 2rem}.article{font-size:1.06rem}.article h2{margin:2.5rem 0 .8rem;font-size:1.4rem;line-height:1.2;color:#0f172a}.article p{margin:0 0 1.25rem}.entry,.assessment,.related{background:#fff;border:1px solid #dbe3ef;border-radius:16px;padding:1.35rem;margin:1rem 0}.entry h2{margin-top:0}.entry-title{font-size:1.15rem;font-weight:800;color:#0f172a}.ad-slot{margin:2.5rem 0;padding:1rem;border:1px solid #dbe3ef;border-radius:14px;background:#fff}.ad-label{margin:0 0 .5rem;text-align:center;color:#64748b;font-size:.7rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.ad-slot ins{display:block;min-height:90px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.columns h3{margin:0 0 .6rem}.columns ul{margin:.2rem 0 0;padding-left:1.25rem}.related-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:.75rem}.related-card{display:block;background:#f8fafc;border:1px solid #dbe3ef;border-radius:12px;padding:1rem}.related-card strong{display:block;color:#0f172a}.site-footer{max-width:860px;margin:0 auto;padding:1.5rem 1.25rem 3rem;border-top:1px solid #dbe3ef;color:#64748b;font-size:.85rem}.site-footer a{margin-right:.75rem}@media(max-width:640px){.site-nav{align-items:flex-start;flex-direction:column}.nav-links{gap:.6rem}.page{padding-top:2rem}.columns{grid-template-columns:1fr}}
`;

function head(title, description, canonical, type, data) {
  const schema = type === 'article'
    ? { '@context': 'https://schema.org', '@type': 'Article', headline: title, description, datePublished: data.date, author: { '@type': 'Organization', name: 'Envizion Editorial' }, publisher: { '@type': 'Organization', name: 'Yacob Digital', url: 'https://envizion.work/' }, mainEntityOfPage: canonical }
    : { '@context': 'https://schema.org', '@type': 'Review', name: title, description, author: { '@type': 'Organization', name: 'Envizion Editorial' }, publisher: { '@type': 'Organization', name: 'Yacob Digital', url: 'https://envizion.work/' }, itemReviewed: { '@type': 'VideoGame', name: data.title, genre: data.genre, dateCreated: data.year ? String(data.year) : undefined } };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index, follow, max-image-preview:large"><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(canonical)}"><title>${esc(title)}</title><meta name="google-adsense-account" content="ca-pub-5812524294035974"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5812524294035974" crossorigin="anonymous"></script><script defer src="/ad-consent-bootstrap.js"></script><style>${CSS}</style><script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script></head><body>`;
}

function footer() {
  return `<footer class="site-footer"><a href="/">Home</a><a href="/reviews-blog/">Reviews</a><a href="/reviews-blog/blog.html">Blog</a><a href="/about.html">About</a><a href="/editorial-policy.html">Editorial policy</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/contact.html">Contact</a><p>© <span data-envizion-year></span> Yacob Digital · Envizion Editorial</p></footer></body></html>`;
}

function adSlot() {
  return `<section class="ad-slot" aria-label="Advertisement"><p class="ad-label">Advertisement</p><ins class="adsbygoogle" data-ad-client="ca-pub-5812524294035974" data-ad-slot="9312358743" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script></section>`;
}

function blogBody(post) {
  return post.body.map((block) => {
    if (block.type === 'intro') return `<p>${esc(block.text)}</p>`;
    if (block.type === 'outro') return `<div class="entry"><strong>Bottom line:</strong> ${esc(block.text)}</div>`;
    if (block.type === 'entry') return `<section class="entry"><div class="entry-title">${block.rank ? `#${esc(block.rank)} ` : ''}${esc(block.title)}</div><p>${esc(block.text)}</p>${block.gameId ? `<a href="../games/${esc(block.gameId)}.html">Read the full review →</a>` : ''}</section>`;
    return '';
  }).join('\n');
}

function renderPost(post, posts) {
  const canonical = `https://envizion.work/reviews-blog/posts/${post.slug}.html`;
  const title = `${post.title} | Envizion Editorial`;
  const more = posts.filter((item) => item.slug !== post.slug).slice(0, 4);
  const moreHtml = more.map((item) => `<a class="related-card" href="${esc(item.slug)}.html"><strong>${esc(item.title)}</strong><span>${esc(item.tag)} · ${esc(item.date)}</span></a>`).join('');
  return `${head(title, post.excerpt, canonical, 'article', post)}<nav class="site-nav"><a class="brand" href="/reviews-blog/">Envizion Editorial</a><div class="nav-links"><a href="/reviews-blog/">Reviews</a><a href="/reviews-blog/blog.html">Blog</a><a href="/tools/">Tools</a></div></nav><main class="page"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/reviews-blog/blog.html">Blog</a><span>›</span>${esc(post.title)}</nav><header><div class="meta"><span class="tag" style="background:${esc(post.tagColor || '#2563eb')}">${esc(post.tag)}</span><time datetime="${esc(post.date)}">${esc(post.date)}</time></div><h1 class="title">${esc(post.title)}</h1><p class="lead">${esc(post.excerpt)}</p></header>${adSlot()}<article class="article"><h2>Editorial analysis</h2>${blogBody(post)}</article>${adSlot()}<section class="related"><h2>More from Envizion Editorial</h2><div class="related-grid">${moreHtml}</div></section></main>${footer()}`;
}

function gameBody(game) {
  const review = (game.review || []).map((paragraph) => `<p>${esc(paragraph)}</p>`).join('');
  const pros = (game.pros || []).map((item) => `<li>${esc(item)}</li>`).join('');
  const cons = (game.cons || []).map((item) => `<li>${esc(item)}</li>`).join('');
  const links = [['Steam', game.steam], ['Epic Games', game.epic], ['GOG', game.gog], ['Official site', game.mobile]].filter(([, href]) => href).map(([label, href]) => `<a href="${safeHref(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`).join(' · ');
  return `<h2>Review</h2>${review}<h2>Assessment</h2><div class="columns"><section class="assessment"><h3>Strengths</h3><ul>${pros}</ul></section><section class="assessment"><h3>Limitations</h3><ul>${cons}</ul></section></div>${links ? `<h2>Official and store links</h2><p>${links}</p>` : ''}`;
}

function renderGame(game, games) {
  const canonical = `https://envizion.work/reviews-blog/games/${game.id}.html`;
  const title = `${game.title} Review${game.grade ? ` — Grade ${game.grade}` : ''} | Envizion Editorial`;
  const related = games.filter((item) => item.genre === game.genre && item.id !== game.id).slice(0, 3);
  const relatedHtml = related.map((item) => `<a class="related-card" href="${esc(item.id)}.html"><strong>${esc(item.title)}</strong><span>${esc(item.genre)} · Grade ${esc(item.grade || '—')}</span></a>`).join('');
  return `${head(title, game.tagline, canonical, 'review', game)}<nav class="site-nav"><a class="brand" href="/reviews-blog/">Envizion Editorial</a><div class="nav-links"><a href="/reviews-blog/">Reviews</a><a href="/reviews-blog/blog.html">Blog</a><a href="/tools/">Tools</a></div></nav><main class="page"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/reviews-blog/">Reviews</a><span>›</span>${esc(game.title)}</nav><header><div class="meta"><span class="grade">Grade ${esc(game.grade || '—')}</span><span>${esc(game.dev || '')}</span><span>${esc(game.year || '')}</span><span>${esc(game.genre || '')}</span></div><h1 class="title">${esc(game.title)}</h1><p class="lead">${esc(game.tagline)}</p></header>${adSlot()}<article class="article">${gameBody(game)}</article>${adSlot()}<section class="related"><h2>More ${esc(game.genre || '')} reviews</h2><div class="related-grid">${relatedHtml}</div></section></main>${footer()}`;
}

const posts = readArray(path.join(REVIEWS, 'blog-data.js'), 'const POSTS');
const games = readArray(path.join(REVIEWS, 'gamevault.js'), 'const GAMES', 'const TOOLS');
fs.mkdirSync(POSTS_DIR, { recursive: true });
fs.mkdirSync(GAMES_DIR, { recursive: true });
for (const post of posts) fs.writeFileSync(path.join(POSTS_DIR, `${post.slug}.html`), renderPost(post, posts), 'utf8');
for (const game of games) fs.writeFileSync(path.join(GAMES_DIR, `${game.id}.html`), renderGame(game, games), 'utf8');
console.log(`Generated ${posts.length} editorial posts and ${games.length} game reviews.`);
