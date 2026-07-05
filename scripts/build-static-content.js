const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const SITE = "https://envizion.work";
const TODAY = "2026-05-28";

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function write(rel, text) {
  const target = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text, "utf8");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripTags(value = "") {
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function words(value = "") {
  return stripTags(value).split(/\s+/).filter(Boolean).length;
}

function excerpt(value = "", max = 158) {
  const clean = stripTags(value);
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}...` : clean;
}

function evaluateConst(source, globalName) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${source}\nglobalThis.__result = ${globalName};`, sandbox);
  return sandbox.__result;
}

function loadPosts() {
  const raw = read("reviews-blog/blog-data.js");
  const source = raw.split("/* Disabled for AdSense quality review:")[0].split("(function addExpandedBlogPosts()")[0];
  return evaluateConst(source, "POSTS");
}

function loadGames() {
  const source = read("reviews-blog/app.js").split("const TOOLS = [];")[0];
  return evaluateConst(source, "GAMES");
}

function loadCreators() {
  const source = read("trending-research/script.js").split("// Procedurally fill to 300")[0];
  return evaluateConst(source, "creatorDatabase");
}

function patchGeneratedInventory() {
  const blogPath = "reviews-blog/blog-data.js";
  const blog = read(blogPath);
  if (!blog.includes("/* Disabled for AdSense quality review:") && blog.includes("(function addExpandedBlogPosts()")) {
    write(
      blogPath,
      blog.replace(
        "(function addExpandedBlogPosts()",
        "/* Disabled for AdSense quality review: auto-expanded draft posts are kept out of published inventory.\n(function addExpandedBlogPosts()"
      ).replace(/\}\)\(\);\s*$/, "})();\n*/\n")
    );
  }

  const appPath = "reviews-blog/app.js";
  const app = read(appPath);
  if (!app.includes("// Disabled for AdSense quality review: publish hand-written reviews first.")) {
    write(
      appPath,
      app.replace(
        "addExpandedGameReviews();",
        "// Disabled for AdSense quality review: publish hand-written reviews first.\n// addExpandedGameReviews();"
      )
    );
  }

  const creatorPath = "trending-research/script.js";
  const creator = read(creatorPath);
  write(
    creatorPath,
    creator
      .replace("CreatorGraph Pro — Honest Analytics & Deep Dossiers on 300 Top Creators", "TrendScope — Independent Research Notes on Featured Creators")
      .replace("Unfiltered analytical dossiers, honest strategy breakdowns, and monetization intelligence on 300 of the world's top content creators. Real opinions, real data.", "Independent, human-edited research notes on featured creators, platform strategy, audience fit, and monetization patterns.")
      .replace("Unfiltered deep dossiers on 300 top creators. No PR fluff — just honest breakdowns of strategy, audience, and money.", "Human-edited creator research with practical notes on strategy, audience, and monetization.")
      .replace("const urlBase = 'https://creatorgraph-pro.analytics/#/tab/';", "const urlBase = 'https://envizion.work/trending-research/creators/';")
      .replace("const fullUrl = urlBase + (id === 'home' ? 'home' : id);", "const fullUrl = id === 'home' ? 'https://envizion.work/trending-research/' : urlBase + id + '.html';")
      .replace("for (let i = creatorDatabase.length; i < 300; i++) {", "for (let i = creatorDatabase.length; i < creatorDatabase.length; i++) {")
      .replace("300/300", "10/10")
      .replace("300 Content Creators", "Featured Content Creators")
      .replace(/<div class="creator-card" style="--cat-color:\$\{cc\};--plat-color:\$\{pc\};" onclick="openCreator\('\$\{c\.id\}'\)">/g, '<a class="creator-card" style="--cat-color:${cc};--plat-color:${pc};text-decoration:none;color:inherit;" href="creators/${c.id}.html">')
      .replace("</div>`;\n}\n\nfunction _miniScoreBar", "</a>`;\n}\n\nfunction _miniScoreBar")
      .replace("function openCreator(id) { window.location.hash = `#/tab/${id}`; }", "function openCreator(id) { window.location.href = `creators/${id}.html`; }")
  );
}

function patchCanonical(rel, canonical, description) {
  let html = read(rel);
  html = html.replace(/<link rel="canonical"[^>]*>\s*/i, "");
  html = html.replace(/<meta property="og:url"[^>]*>\s*/i, "");
  html = html.replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${escapeHtml(description)}">`);
  html = html.replace("</title>", `</title>\n  <link rel="canonical" href="${canonical}">\n  <meta property="og:url" content="${canonical}">`);
  write(rel, html);
}

function patchIndexes() {
  patchCanonical("index.html", `${SITE}/`, "Yacob Digital is the parent company page for launched and upcoming websites and apps, starting with Envizion.");
  patchCanonical("main.html", `${SITE}/main.html`, "Envizion hub for local browser tools, hand-written game reviews, practical blog guides, and creator research pages.");
  patchCanonical("about.html", `${SITE}/about.html`, "About Yacob Digital, the company site for launched and upcoming websites and apps.");
  patchCanonical("contact.html", `${SITE}/contact.html`, "Contact Yacob Digital about company websites, apps, support, corrections, and product enquiries.");
  patchCanonical("privacy.html", `${SITE}/privacy.html`, "Privacy information for the Yacob Digital company website and linked products.");
  patchCanonical("terms.html", `${SITE}/terms.html`, "Terms for the Yacob Digital company website and linked product pages.");
  patchCanonical("tools/index.html", `${SITE}/tools/`, "Open the Envizion tools guide for local browser utilities, spreadsheet workbooks, media tools, file converters, image tools, and writing helpers.");
  patchCanonical("reviews-blog/index.html", `${SITE}/reviews-blog/`, "GameVault publishes hand-written game reviews, player-fit assessments, practical buying notes, and gaming guides from Envizion.");
  patchCanonical("reviews-blog/blog.html", `${SITE}/reviews-blog/blog.html`, "Game reviews, rankings, buying guides, and gaming opinion from GameVault with static article pages for readers and crawlers.");
  patchCanonical("trending-research/index.html", `${SITE}/trending-research/`, "TrendScope publishes human-edited creator research notes, platform strategy analysis, and monetization observations.");

  let trend = read("trending-research/index.html");
  trend = trend
    .replace(/<title id="seo-title">[\s\S]*?<\/title>/, '<title id="seo-title">TrendScope - Featured Creator Research | Envizion</title>')
    .replace(/<meta name="description" id="seo-description" content="[^"]*">/, '<meta name="description" id="seo-description" content="Human-edited creator research notes from Envizion, with static pages for featured creators, strategy observations, audience fit, and monetization context.">')
    .replace(/<meta name="author" content="[^"]*">/, '<meta name="author" content="Envizion Editorial Desk">')
    .replace(/<meta property="og:site_name" content="[^"]*">/, '<meta property="og:site_name" content="Envizion TrendScope">')
    .replace(/<meta property="og:title" id="og-title-meta" content="[^"]*">/, '<meta property="og:title" id="og-title-meta" content="TrendScope - Featured Creator Research">')
    .replace(/<meta property="og:description" id="og-desc-meta" content="[^"]*">/, '<meta property="og:description" id="og-desc-meta" content="Human-edited creator research with permanent pages, original local visuals, and clear editorial context.">')
    .replace(/<meta property="og:image:alt" content="[^"]*">/, '<meta property="og:image:alt" content="Envizion TrendScope original research cover">')
    .replace(/<meta name="twitter:site" content="[^"]*">/, '<meta name="twitter:site" content="@envizion">')
    .replace(/<meta name="twitter:url" id="twitter-url-meta" content="[^"]*">/, `<meta name="twitter:url" id="twitter-url-meta" content="${SITE}/trending-research/">`)
    .replace(/<meta name="twitter:title" id="twitter-title-meta" content="[^"]*">/, '<meta name="twitter:title" id="twitter-title-meta" content="TrendScope - Featured Creator Research">')
    .replace(/<meta name="twitter:description" id="twitter-desc-meta" content="[^"]*">/, '<meta name="twitter:description" id="twitter-desc-meta" content="Human-edited creator research with permanent pages and original local visuals.">')
    .replace(/<meta name="twitter:image:alt" content="[^"]*">/, '<meta name="twitter:image:alt" content="Envizion TrendScope">')
    .replace(/CreatorGraph Pro/g, "Envizion TrendScope")
    .replace(/Creator Analytics/g, "Creator Research")
    .replace(/https:\/\/creatorgraph-pro\.analytics/g, `${SITE}/trending-research`)
    .replace(/300 Top Creators/g, "Featured Creators")
    .replace(/300 top creators/g, "featured creators")
    .replace(/300\/300/g, "10/10")
    .replace(/https:\/\/images\.unsplash\.com\/photo-1611162617213-7d7a39e9b1d7\?w=1200&auto=format&fit=crop&q=80/g, `${SITE}/assets/content/creator-mrbeast.svg`);
  write("trending-research/index.html", trend);

  let blog = read("reviews-blog/blog.html");
  blog = blog.replace(/href="articles\/\$\{p\.slug\}\.html"/g, 'href="blog-post.html?id=${p.slug}"');
  blog = blog.replace(/href=" signup\.html"/g, 'href="signup.html"');
  blog = blog.replace(
    "<p>Top-5 lists, buying guides, genre deep-dives, and honest opinion â€” no hype.</p>",
    "<p>Hand-written guides, rankings, and player-fit essays. Every published article has its own permanent URL, local artwork, and clear editorial context.</p>"
  );
  write("reviews-blog/blog.html", blog);

  let reviews = read("reviews-blog/index.html");
  reviews = reviews.replace(/href=" blog\.html"/g, 'href="blog.html"');
  reviews = reviews.replace(/src=" firebase-config\.js"/g, 'src="firebase-config.js"');
  reviews = reviews.replace(/src=" auth-nav\.js"/g, 'src="auth-nav.js"');
  write("reviews-blog/index.html", reviews);

  let app = read("reviews-blog/app.js");
  app = app.replace("const cardNav = isTool ? `onclick=\"openModal('${e.id}')\"` : `href=\"games/${e.id}.html`;", "const cardNav = isTool ? `onclick=\"openModal('${e.id}')\"` : `href=\"game.html?id=${e.id}\"`;");
  app = app.replace("const cardNav = isTool ? `onclick=\"openModal('${e.id}')\"` : `href=\"games/${e.id}.html\"`;", "const cardNav = isTool ? `onclick=\"openModal('${e.id}')\"` : `href=\"game.html?id=${e.id}\"`;");
  write("reviews-blog/app.js", app);

  let game = read("reviews-blog/game.html");
  game = game
    .replace(/href=" index\.html"/g, 'href="index.html"')
    .replace(/href=" blog\.html"/g, 'href="blog.html"')
    .replace(/href=" game\.html\?id=/g, 'href="game.html?id=');
  write("reviews-blog/game.html", game);

  let blogPost = read("reviews-blog/blog-post.html");
  blogPost = blogPost
    .replace(/href=" index\.html"/g, 'href="index.html"')
    .replace(/href=" blog\.html"/g, 'href="blog.html"')
    .replace(/href=" game\.html\?id=/g, 'href="game.html?id=')
    .replace(/href=" blog-post\.html\?id=/g, 'href="blog-post.html?id=');
  write("reviews-blog/blog-post.html", blogPost);

  addLegalFooter("reviews-blog/index.html", "..");
  addLegalFooter("reviews-blog/blog.html", "..");
  addLegalFooter("reviews-blog/game.html", "..");
  addLegalFooter("trending-research/index.html", "..");

  addEditorialBlock("reviews-blog/index.html", "GameVault review index", "This index now points readers toward permanent review pages instead of relying only on a JavaScript modal. The goal is to make the review library useful even before a visitor searches or filters: each published game review has a stable URL, a local original cover image, a grade, a practical reader-fit note, and enough written context to explain the recommendation. Draft-scale review briefs are kept out of the sitemap until they have the same editorial care as the stronger reviews. That gives visitors a smaller but more trustworthy library, and gives crawlers a clear path to real publisher content.");
  addEditorialBlock("tools/life-tools.html", "Envizion Workbench editorial note", "Envizion Workbench is a practical local tool surface for common planning, writing, creator, finance, and daily decision tasks. This page is published as a utility, but it also needs to explain why the tool exists: the workbench is meant for quick private calculations and structured thinking without forcing a user into an account or upload flow. Some outputs are estimates and should be checked before serious legal, medical, or financial use. The useful value is speed, privacy, and organization: a visitor can open a browser, run a small task, and leave with a clearer next step.");
  addEditorialBlock("tools/InstantDictionary.html", "Instant Dictionary editorial note", "Instant Dictionary is designed for a simple reader problem: a word appears in homework, writing, research, or a message, and the visitor needs meaning, spelling support, pronunciation context, or a quick usage check without leaving the page. The tool is not a replacement for a full academic dictionary, but it is useful for fast language work and everyday comprehension. Envizion keeps this page in the sitemap because the tool has a clear purpose, a direct workflow, and a practical audience: students, writers, creators, and anyone trying to understand or polish English text.");
  addEditorialBlock("tools/envizionomniconvertpro.html", "OmniConvert Pro editorial note", "OmniConvert Pro is a local-first conversion workspace for documents, media, and image tasks that people often handle through scattered upload sites. The editorial reason for publishing it is privacy and convenience: visitors can try common format workflows from one page and understand the limits before relying on the result. Browser-based conversion depends on device memory, browser support, and file complexity, so large or professional files should be tested carefully. The page is kept as a resource because it solves a real task and gives visitors a safer starting point than random anonymous converters.");
}

function patchTrendIndexLinks(creators) {
  let html = read("trending-research/index.html");
  const marker = "<!-- STATIC FEATURED RESEARCH LINKS -->";
  const links = creators.map((creator) => `
      <a href="creators/${creator.id}.html" style="display:block;text-decoration:none;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1rem;color:var(--text);">
        <strong style="display:block;color:#fff;margin-bottom:.35rem;">${escapeHtml(creator.name)}</strong>
        <span style="display:block;color:var(--muted2);font-size:.82rem;line-height:1.55;">${escapeHtml(creator.platform)} / ${escapeHtml(creator.category)}. Static research page with editorial notes, audience fit, strategy, and monetization context.</span>
      </a>`).join("");
  const section = `${marker}
<section id="featured-static-research" style="max-width:1600px;width:100%;margin:0 auto 2rem;padding:0 1.25rem;">
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:1.25rem;margin-bottom:1rem;">
    <h2 class="font-display" style="font-size:1.25rem;font-weight:900;color:#fff;margin-bottom:.45rem;">Featured Static Research Pages</h2>
    <p style="color:var(--muted2);font-size:.88rem;line-height:1.65;max-width:780px;">These are the human-edited creator dossiers currently published as permanent, crawlable pages. Draft or generated entries are intentionally kept out of the sitemap until they have enough original editorial work to stand alone.</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:.8rem;">${links}
  </div>
</section>`;
  if (html.includes(marker)) {
    html = html.replace(new RegExp(`${marker}[\\s\\S]*?<\\/section>`), section);
  } else {
    html = html.replace("<!-- ═══════════════════════════════════ FOOTER", `${section}\n\n<!-- ═══════════════════════════════════ FOOTER`);
  }
  write("trending-research/index.html", html);
}

function buildTrendIndex(creators) {
  const cards = creators.map((creator, index) => {
    const colors = ["blue", "teal", "rose", "amber", "indigo", "emerald"];
    return `          <a class="card" href="creators/${creator.id}.html">
            <div class="card-top">
              <span class="icon ${colors[index % colors.length]}">${escapeHtml(creator.name.trim()[0] || "C")}</span>
              <h3>${escapeHtml(creator.name)}</h3>
              <p>${escapeHtml(creator.platform)} / ${escapeHtml(creator.category)}. Research notes on audience fit, creator strategy, monetization, and editorial risk.</p>
            </div>
            <div class="card-bottom"><span>${escapeHtml(creator.subscribers)} audience note</span><span>-></span></div>
          </a>`;
  }).join("\n");

  write("trending-research/index.html", `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TrendScope - Featured Creator Research | Envizion</title>
  <meta name="description" content="Human-edited creator research notes from Envizion, with static pages for featured creators, strategy observations, audience fit, and monetization context.">
  <link rel="canonical" href="${SITE}/trending-research/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Envizion TrendScope">
  <meta property="og:title" content="TrendScope - Featured Creator Research">
  <meta property="og:description" content="Permanent creator research pages with original local visuals, clear editorial notes, and no generated filler inventory.">
  <meta property="og:url" content="${SITE}/trending-research/">
  <meta property="og:image" content="${SITE}/assets/content/creator-mrbeast.svg">
  <link rel="icon" type="image/png" href="..logo.png" sizes="32x32">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../site-home.css">
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "TrendScope - Featured Creator Research",
    url: `${SITE}/trending-research/`,
    description: "Human-edited creator research notes from Envizion.",
    publisher: { "@type": "Organization", name: "Envizion" },
    hasPart: creators.map((creator) => ({
      "@type": "Article",
      headline: `${creator.name} Research Notes`,
      url: `${SITE}/trending-research/creators/${creator.id}.html`
    }))
  })}</script>
</head>
<body>
  <header class="topbar">
    <div class="shell">
      <a class="brand" href="../main.html" aria-label="Envizion Hub home">
        <span class="brand-mark">E</span>
        <span>Envizion TrendScope</span>
      </a>
      <nav class="nav" aria-label="Primary">
        <a href="../main.html">Hub</a>
        <a href="../tools/index.html">Tools</a>
        <a href="../reviews-blog/index.html">Reviews</a>
        <a href="../about.html">About</a>
        <a href="../privacy.html">Privacy</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="shell hero-grid">
        <div>
          <p class="eyebrow"><span class="pulse"></span> Featured creator research</p>
          <h1>Creator research pages with real URLs.</h1>
          <p class="lead">TrendScope now opens each featured creator as a permanent HTML page instead of a hash tab. The published set is intentionally smaller, human-edited, and easier for visitors and search engines to inspect. Draft or generated entries stay out of the sitemap until they have enough original editorial work.</p>
          <div class="hero-actions">
            <a class="button primary" href="#creators">Browse creators</a>
            <a class="button secondary" href="../editorial-policy.html">Editorial policy</a>
          </div>
        </div>
        <aside class="command-panel" aria-label="Research principles">
          <div class="panel-head">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <div class="panel-body">
            <div class="route"><span class="icon blue">S</span><span><strong>Static pages</strong><span>Every creator card links to a real HTML dossier.</span></span><span class="arrow">-></span></div>
            <div class="route"><span class="icon teal">E</span><span><strong>Editorial notes</strong><span>Audience, strategy, monetization, and limitations are visible.</span></span><span class="arrow">-></span></div>
            <div class="route"><span class="icon amber">O</span><span><strong>Original visuals</strong><span>Local Envizion cover artwork, not remote stock images.</span></span><span class="arrow">-></span></div>
          </div>
        </aside>
      </div>
    </section>

    <section class="section" id="creators">
      <div class="shell">
        <div class="section-head">
          <h2>Featured Creators</h2>
          <p>These are the current published creator dossiers. Each page uses the same Envizion layout system as the homepage and has a canonical URL.</p>
        </div>
        <div class="cards">
${cards}
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="shell footer-links">
      <span>Envizion TrendScope <span data-year></span></span>
      <span>
        <a href="../about.html">About</a>
        <a href="../contact.html">Contact</a>
        <a href="../privacy.html">Privacy</a>
        <a href="../terms.html">Terms</a>
        <a href="../editorial-policy.html">Editorial Policy</a>
      </span>
    </div>
  </footer>
  <script>
    (function () {
      var match = (window.location.hash || "").match(/^#\\/tab\\/([a-z0-9-]+)$/);
      if (match && match[1] !== "home") {
        window.location.replace("creators/" + match[1] + ".html");
      }
    })();
  </script>
  <script src="../site-home.js" defer></script>
</body>
</html>
`);
}

function addLegalFooter(rel, prefix) {
  let html = read(rel);
  if (html.includes("data-envizion-legal-footer")) return;
  const footer = `
<footer data-envizion-legal-footer style="border-top:1px solid rgba(15,23,42,.08);padding:1.5rem;margin-top:2rem;text-align:center;font-size:.85rem;color:#64748b;">
  <a href="${prefix}/about.html" style="color:#2563eb;text-decoration:none;font-weight:800;margin:0 .45rem;">About</a>
  <a href="${prefix}/contact.html" style="color:#2563eb;text-decoration:none;font-weight:800;margin:0 .45rem;">Contact</a>
  <a href="${prefix}/privacy.html" style="color:#2563eb;text-decoration:none;font-weight:800;margin:0 .45rem;">Privacy</a>
  <a href="${prefix}/terms.html" style="color:#2563eb;text-decoration:none;font-weight:800;margin:0 .45rem;">Terms</a>
  <a href="${prefix}/editorial-policy.html" style="color:#2563eb;text-decoration:none;font-weight:800;margin:0 .45rem;">Editorial Policy</a>
</footer>
`;
  html = html.replace("</body>", `${footer}\n</body>`);
  write(rel, html);
}

function addEditorialBlock(rel, heading, text) {
  let html = read(rel);
  if (html.includes("data-envizion-editorial-block")) return;
  const block = `
<section data-envizion-editorial-block style="max-width:980px;margin:2rem auto;padding:1.25rem;border:1px solid rgba(15,23,42,.08);border-radius:8px;background:#fff;color:#334155;line-height:1.7;">
  <h2 style="font-size:1.15rem;color:#0f172a;margin:0 0 .55rem;">${escapeHtml(heading)}</h2>
  <p style="margin:0;">${escapeHtml(text)}</p>
</section>
`;
  html = html.replace("</body>", `${block}\n</body>`);
  write(rel, html);
}

function imageSvg(kind, slug, title, meta, colorA, colorB) {
  const safeTitle = escapeHtml(title);
  const safeMeta = escapeHtml(meta);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${safeTitle}</title>
  <desc id="desc">Original Envizion editorial cover image for ${safeTitle}.</desc>
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${colorA}"/>
      <stop offset="1" stop-color="${colorB}"/>
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)" opacity=".7"/>
  <circle cx="1020" cy="120" r="210" fill="rgba(255,255,255,.11)"/>
  <circle cx="170" cy="520" r="180" fill="rgba(0,0,0,.12)"/>
  <rect x="88" y="88" width="1024" height="454" rx="34" fill="rgba(255,255,255,.91)"/>
  <text x="128" y="154" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="800" letter-spacing="4" fill="#475569">${kind.toUpperCase()}</text>
  <foreignObject x="128" y="184" width="850" height="190">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Inter,Arial,sans-serif;font-size:54px;line-height:1.03;font-weight:900;color:#0f172a;letter-spacing:0;">
      ${safeTitle}
    </div>
  </foreignObject>
  <text x="128" y="432" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="700" fill="#334155">${safeMeta}</text>
  <g transform="translate(128 470)">
    <rect width="260" height="44" rx="12" fill="#0f172a"/>
    <text x="22" y="29" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="800" fill="#fff">Original Envizion visual</text>
  </g>
  <text x="1034" y="498" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="72" font-weight="900" fill="rgba(15,23,42,.16)">E</text>
</svg>`;
}

function pageShell({ title, description, canonical, image, section, body, schema }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE}/${image}">
  <link rel="icon" type="image/png" href="../..logo.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../site-home.css">
  <style>
    .article-shell { padding: clamp(2.5rem, 6vw, 4.5rem) 0 4rem; }
    .article-cover { width:100%; border:1px solid var(--line); border-radius:20px; aspect-ratio:1200/630; display:block; object-fit:cover; background:#e2e8f0; box-shadow:var(--shadow); margin-bottom:2rem; }
    .article-inner { max-width: 860px; }
    .crumbs { display:flex; flex-wrap:wrap; gap:.45rem; margin-bottom:1rem; color:#64748b; font-size:.9rem; font-weight:700; }
    .crumbs a { color:#2563eb; text-decoration:none; }
    .label { color:var(--blue); text-transform:uppercase; letter-spacing:.14em; font-size:.78rem; font-weight:900; }
    .article-inner h1 { font-size:clamp(2.6rem, 7vw, 5rem); line-height:.95; letter-spacing:-.07em; margin:.65rem 0 1rem; }
    .article-inner h2 { font-size:clamp(1.35rem, 3vw, 2rem); line-height:1.15; letter-spacing:-.04em; margin:2.4rem 0 .75rem; }
    .article-inner p, .article-inner li { font-size:1.04rem; color:var(--muted); font-weight:600; }
    .article-inner .lead { font-size:clamp(1rem, 2vw, 1.22rem); color:var(--muted); max-width:760px; font-weight:650; line-height:1.75; }
    .meta { display:flex; flex-wrap:wrap; gap:.65rem; margin:1.25rem 0 2rem; }
    .meta span { border:1px solid var(--line); background:rgba(255,255,255,.7); border-radius:999px; padding:.42rem .78rem; font-size:.86rem; color:#475569; font-weight:800; }
    .note, .method { background:rgba(255,255,255,.72); border:1px solid var(--line); border-radius:20px; padding:1.2rem; margin:1.4rem 0; box-shadow:0 14px 36px rgba(15,23,42,.06); }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:1rem; }
    .box { border:1px solid var(--line); border-radius:20px; padding:1rem; background:rgba(255,255,255,.72); box-shadow:0 14px 36px rgba(15,23,42,.06); }
    .box strong { display:block; margin-bottom:.4rem; color:var(--ink); }
    footer.local { margin-top:2rem; padding-top:1.3rem; border-top:1px solid var(--line); display:flex; flex-wrap:wrap; gap:1rem; justify-content:space-between; color:var(--muted); font-weight:700; }
    footer.local a { color:#2563eb; text-decoration:none; font-weight:800; }
  </style>
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
  <header class="topbar">
    <div class="shell">
      <a class="brand" href="../../main.html"><span class="brand-mark">E</span><span>Envizion</span></a>
      <nav class="nav" aria-label="Primary">
        <a href="../../reviews-blog/index.html">Reviews</a>
        <a href="../../reviews-blog/blog.html">Blog</a>
        <a href="../../trending-research/index.html">Research</a>
        <a href="../../tools/index.html">Tools</a>
        <a href="../../about.html">About</a>
      </nav>
    </div>
  </header>
  <main class="article-shell">
    <article class="shell">
      <img class="article-cover" src="../../${image}" alt="Original Envizion cover for ${escapeHtml(title)}">
      <div class="article-inner content-wrap">
        ${section}
        ${body}
        <footer class="local">
          <span>Envizion editorial page, updated ${TODAY}</span>
          <span><a href="../../privacy.html">Privacy</a> <a href="../../contact.html">Contact</a> <a href="../../editorial-policy.html">Editorial policy</a></span>
        </footer>
      </div>
    </article>
  </main>
</body>
</html>
`;
}

function renderParagraphs(items) {
  return items.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n");
}

function buildArticlePages(posts) {
  const urls = [];
  posts.forEach((post, index) => {
    const slug = post.slug;
    const image = `assets/content/article-${slug}.svg`;
    const colorA = ["#2563eb", "#7c3aed", "#0f766e", "#e11d48"][index % 4];
    const colorB = ["#f59e0b", "#06b6d4", "#84cc16", "#6366f1"][index % 4];
    write(image, imageSvg("article", slug, post.title, `${post.tag} / ${post.date}`, colorA, colorB));

    const bodyBlocks = post.body.map((block) => {
      if (block.type === "intro") return `<p class="lead">${escapeHtml(block.text)}</p>`;
      if (block.type === "outro") return `<div class="note"><strong>Bottom line:</strong><p>${escapeHtml(block.text)}</p></div>`;
      if (block.type === "entry") {
        const localReview = block.gameId
          ? `<p><a class="button secondary" href="../game.html?id=${encodeURIComponent(block.gameId)}">Read my ${escapeHtml(block.title)} review</a></p>`
          : "";
        return `<section class="box"><strong>${block.rank ? `#${block.rank} ` : ""}${escapeHtml(block.title)}</strong><p>${escapeHtml(block.text)}</p>${localReview}</section>`;
      }
      return "";
    }).join("\n");

    const body = `
      <div class="meta"><span>${escapeHtml(post.tag)}</span><span>${escapeHtml(post.date)}</span><span>${Math.max(words(bodyBlocks), 100)}+ words</span></div>
      ${bodyBlocks}
      `;
    const canonical = `${SITE}/reviews-blog/articles/${slug}.html`;
    const page = pageShell({
      title: `${post.title} | Envizion GameVault`,
      description: post.excerpt || excerpt(bodyBlocks),
      canonical,
      image,
      section: `<nav class="crumbs"><a href="../../main.html">Home</a><span>/</span><a href="../blog.html">Blog</a><span>/</span><span>${escapeHtml(post.title)}</span></nav><div class="label">GameVault Article</div><h1>${escapeHtml(post.title)}</h1><p class="lead">${escapeHtml(post.excerpt || "")}</p>`,
      body,
      schema: articleSchema(canonical, post.title, post.excerpt, image, post.date)
    });
    write(`reviews-blog/articles/${slug}.html`, page);
    urls.push({ loc: canonical, priority: "0.74" });
  });
  return urls;
}

function articleSchema(url, title, description, image, date) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: `${SITE}/${image}`,
    datePublished: date || TODAY,
    dateModified: TODAY,
    author: { "@type": "Organization", name: "Envizion Editorial Desk" },
    publisher: { "@type": "Organization", name: "Envizion", logo: { "@type": "ImageObject", url: `${SITE}logo.png` } },
    mainEntityOfPage: url
  };
}

function buildGamePages(games) {
  const urls = [];
  games.forEach((game, index) => {
    const slug = game.id || slugify(game.title);
    const image = `assets/content/game-${slug}.svg`;
    write(image, imageSvg("review", slug, game.title, `${game.genre || "Game"} / Grade ${game.grade || "Review"}`, "#0f766e", ["#2563eb", "#7c3aed", "#ea580c"][index % 3]));
    const pros = (game.pros || []).map((p) => `<li>${escapeHtml(p)}</li>`).join("");
    const cons = (game.cons || []).map((p) => `<li>${escapeHtml(p)}</li>`).join("");
    const links = ["steam", "epic", "gog", "mobile"].filter((key) => game[key]).map((key) => `<a href="${escapeHtml(game[key])}" rel="noopener noreferrer" target="_blank">${key.toUpperCase()}</a>`).join(" ");
    const body = `
      <div class="meta"><span>${escapeHtml(game.genre || "Game")}</span><span>${escapeHtml(game.dev || "Developer listed in review")}</span><span>${escapeHtml(String(game.year || "Current"))}</span><span>Grade ${escapeHtml(game.grade || "Review")}</span></div>
      <h2>Review</h2>
      ${renderParagraphs(game.review || [])}
      <h2>Strengths and Limits</h2>
      <div class="grid"><div class="box"><strong>Strengths</strong><ul>${pros}</ul></div><div class="box"><strong>Watch-outs</strong><ul>${cons}</ul></div></div>
      <h2>Reader Fit</h2>
      <p>This review is written around fit: who should play it, what kind of session it rewards, and what friction might make it wrong for another reader. A high grade does not mean every player should buy it immediately. It means the game has a clear identity, a strong reason to exist, and enough craft to justify attention from the right audience.</p>
      ${links ? `<h2>Official Store Links</h2><p>${links}</p>` : ""}
      `;
    const canonical = `${SITE}/reviews-blog/games/${slug}.html`;
    write(`reviews-blog/games/${slug}.html`, pageShell({
      title: `${game.title} Review | Envizion GameVault`,
      description: game.tagline || excerpt((game.review || []).join(" ")),
      canonical,
      image,
      section: `<nav class="crumbs"><a href="../../main.html">Home</a><span>/</span><a href="../main.html">Reviews</a><span>/</span><span>${escapeHtml(game.title)}</span></nav><div class="label">Game Review</div><h1>${escapeHtml(game.title)}</h1><p class="lead">${escapeHtml(game.tagline || "")}</p>`,
      body,
      schema: articleSchema(canonical, `${game.title} Review`, game.tagline || "", image, TODAY)
    }));
    urls.push({ loc: canonical, priority: "0.78" });
  });
  return urls;
}

function buildCreatorPages(creators) {
  const urls = [];
  creators.forEach((creator, index) => {
    const slug = creator.id || slugify(creator.name);
    const image = `assets/content/creator-${slug}.svg`;
    write(image, imageSvg("research", slug, creator.name, `${creator.platform} / ${creator.category}`, "#111827", ["#7c3aed", "#be123c", "#0f766e"][index % 3]));
    const revenue = (creator.monetization || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    const socials = Object.entries(creator.urls || {}).filter(([, href]) => href).map(([key, href]) => `<a href="${escapeHtml(href)}" rel="noopener noreferrer" target="_blank">${escapeHtml(key)}</a>`).join(" ");
    const body = `
      <div class="meta"><span>${escapeHtml(creator.platform)}</span><span>${escapeHtml(creator.category)}</span><span>${escapeHtml(creator.subscribers)} approximate audience</span></div>
      <h2>Editorial Take</h2>
      <p>${escapeHtml(creator.bio)}</p>
      <h2>Audience and Strategy</h2>
      <div class="grid"><div class="box"><strong>Audience profile</strong><p>${escapeHtml(creator.audience || "Audience profile is noted qualitatively.")}</p></div><div class="box"><strong>Growth strategy</strong><p>${escapeHtml(creator.strategy || "Strategy note pending editorial expansion.")}</p></div></div>
      <h2>Milestone and Monetization</h2>
      <p>${escapeHtml(creator.milestone || "Milestone note pending editorial expansion.")}</p>
      <div class="box"><strong>Revenue streams noted</strong><ul>${revenue}</ul></div>
      <h2>Profile Links</h2>
      <p>${socials}</p>
      <section class="note"><strong>Research note:</strong><p>Follower counts and creator businesses change quickly. This page is an editorial snapshot, not a live database. Before quoting a number, check the creator's current official profile or company page.</p></section>
      `;
    const canonical = `${SITE}/trending-research/creators/${slug}.html`;
    write(`trending-research/creators/${slug}.html`, pageShell({
      title: `${creator.name} Research Notes | Envizion TrendScope`,
      description: excerpt(`${creator.name} research notes covering platform strategy, audience profile, monetization, and editorial take.`),
      canonical,
      image,
      section: `<nav class="crumbs"><a href="../../main.html">Home</a><span>/</span><a href="../main.html">Research</a><span>/</span><span>${escapeHtml(creator.name)}</span></nav><div class="label">Creator Research</div><h1>${escapeHtml(creator.name)}</h1><p class="lead">Independent creator-economy notes on platform position, audience fit, monetization, and strategic risk.</p>`,
      body,
      schema: articleSchema(canonical, `${creator.name} Research Notes`, `${creator.name} creator research notes from Envizion TrendScope.`, image, TODAY)
    }));
    urls.push({ loc: canonical, priority: "0.72" });
  });
  return urls;
}

function buildEditorialPolicy() {
  write("editorial-policy.html", `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Editorial Policy | Envizion</title>
  <meta name="description" content="Envizion editorial policy for reviews, creator research, original visuals, corrections, and advertising separation.">
  <link rel="canonical" href="${SITE}/editorial-policy.html">
  <meta property="og:url" content="${SITE}/editorial-policy.html">
  <link rel="icon" type="image/png" href="logo.png">
  <link rel="stylesheet" href="site-home.css">
</head>
<body>
  <header class="topbar"><div class="shell"><a class="brand" href="main.html"><span class="brand-mark">E</span><span>Envizion Hub</span></a><nav class="nav" aria-label="Primary"><a href="tools/index.html">Tools</a><a href="reviews-blog/index.html">Reviews</a><a href="trending-research/index.html">Research</a><a href="about.html">About</a><a href="contact.html">Contact</a></nav></div></header>
  <main class="content-page"><article class="shell content-wrap">
    <p class="eyebrow"><span class="pulse"></span> Editorial Policy</p>
    <h1>How Envizion publishes reviews, research, and visuals.</h1>
    <p class="lead">Envizion is built as a practical resource, not a placeholder site. This page explains how public pages are selected, written, illustrated, corrected, and separated from advertising.</p>
    <h2>Published Content Standard</h2>
    <p>Pages should help a visitor make a decision, complete a task, or understand a subject more clearly than a bare list or summary would. Drafts, generated filler, duplicate pages, and short entries without a real reader purpose are kept out of the sitemap until they have enough original context to stand alone.</p>
    <h2>Original Visuals</h2>
    <p>Static article, review, and research pages use local Envizion-created SVG cover images. They are not pulled from stock-photo libraries or copied from another website. Product names, games, and creator names may be referenced for commentary and review, but the surrounding visual presentation is created inside this project.</p>
    <h2>Advertising Separation</h2>
    <p>Ads, if enabled, are labeled and kept separate from the main article or tool content. Editorial opinions, grades, and creator notes are not written as paid placements. If sponsored content is ever published, it should be labeled clearly.</p>
    <h2>Corrections</h2>
    <p>Games, software, platforms, and creator statistics change. Visitors can send corrections to <a href="mailto:envizionupdates@gmail.com">envizionupdates@gmail.com</a> with the page URL and the issue. Substantive corrections should be reviewed and reflected in the page rather than hidden in a comment thread.</p>
  </article></main>
  <footer class="footer"><div class="shell footer-links"><span>Envizion Hub <span data-year></span></span><span><a href="about.html">About</a><a href="contact.html">Contact</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a></span></div></footer>
  <script src="site-home.js" defer></script>
</body>
</html>
`);
}

function buildRobotsAndSitemap(extraUrls) {
  const base = [
    { loc: `${SITE}/`, priority: "1.00" },
    { loc: `${SITE}/main.html`, priority: "0.70" },
    { loc: `${SITE}/website-envizion.html`, priority: "0.80" },
    { loc: `${SITE}/app-creator-suite.html`, priority: "0.50" },
    { loc: `${SITE}/app-study-workspace.html`, priority: "0.50" },
    { loc: `${SITE}/app-business-tools.html`, priority: "0.50" },
    { loc: `${SITE}/about.html`, priority: "0.65" },
    { loc: `${SITE}/contact.html`, priority: "0.65" },
    { loc: `${SITE}/privacy.html`, priority: "0.55" },
    { loc: `${SITE}/terms.html`, priority: "0.55" },
    { loc: `${SITE}/editorial-policy.html`, priority: "0.60" },
    { loc: `${SITE}/tools/`, priority: "0.82" },
    { loc: `${SITE}/tools/tools-guide.html`, priority: "0.80" },
    { loc: `${SITE}/tools/life-tools-home.html`, priority: "0.74" },
    { loc: `${SITE}/tools/life-tools.html`, priority: "0.72" },
    { loc: `${SITE}/tools/background-remover-home.html`, priority: "0.70" },
    { loc: `${SITE}/tools/background-remover.html`, priority: "0.72" },
    { loc: `${SITE}/tools/mp4tomp3-home.html`, priority: "0.68" },
    { loc: `${SITE}/tools/mp4tomp3.html`, priority: "0.70" },
    { loc: `${SITE}/tools/mediaplayer-home.html`, priority: "0.68" },
    { loc: `${SITE}/tools/mediaplayer.html`, priority: "0.70" },
    { loc: `${SITE}/tools/mediaforge-home.html`, priority: "0.68" },
    { loc: `${SITE}/tools/mediaforge.html`, priority: "0.70" },
    { loc: `${SITE}/tools/instant-dictionary-home.html`, priority: "0.68" },
    { loc: `${SITE}/tools/InstantDictionary.html`, priority: "0.70" },
    { loc: `${SITE}/tools/omniconvert-home.html`, priority: "0.68" },
    { loc: `${SITE}/tools/envizionomniconvertpro.html`, priority: "0.70" },
    { loc: `${SITE}/tools/pdf-to-text-home.html`, priority: "0.66" },
    { loc: `${SITE}/tools/pdfstotxt.html`, priority: "0.66" },
    { loc: `${SITE}/reviews-blog/`, priority: "0.88" },
    { loc: `${SITE}/reviews-blog/blog.html`, priority: "0.86" },
    { loc: `${SITE}/trending-research/`, priority: "0.80" }
  ];
  const urls = [...base, ...extraUrls];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;
  write("sitemap.xml", xml);
  write("robots.txt", `User-agent: *
Allow: /

# Keep login/admin/draft surfaces out of search while allowing public content.
Disallow: /reviews-blog/login.html
Disallow: /reviews-blog/signup.html
Disallow: /reviews-blog/BlOg-PoSts---admin.html
Disallow: /reviews-blog/3029-43987395439453enviz474666-(8-ion34525indexa34532dmin.html
Disallow: /electroni/admin.html
Disallow: /electroni/login.html
Disallow: /electroni/signup.html

Sitemap: ${SITE}/sitemap.xml
`);
}

function main() {
  const posts = loadPosts();
  const games = loadGames();
  const creators = loadCreators();

  patchGeneratedInventory();
  patchIndexes();
  buildTrendIndex(creators);
  buildEditorialPolicy();

  const urls = [
    ...buildArticlePages(posts),
    ...buildGamePages(games),
    ...buildCreatorPages(creators)
  ];

  buildRobotsAndSitemap(urls);

  console.log(`Static content built: ${posts.length} articles, ${games.length} game reviews, ${creators.length} creator research pages.`);
}

main();
