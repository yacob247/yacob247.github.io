const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://envizion.work';
const SKIP_DIRS = new Set(['.git', '.agents', '.codex', 'node_modules']);

function walk(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(filePath, result);
    else if (/\.html?$/i.test(entry.name)) result.push(filePath);
  }
  return result;
}

function routeForFile(filePath) {
  const relative = path.relative(ROOT, filePath).replace(/\\/g, '/');
  if (/^index\.html?$/i.test(relative)) return '/';
  if (/\/index\.html?$/i.test(relative)) return `/${relative.replace(/\/index\.html?$/i, '')}/`;
  return `/${relative}`;
}

function stripTags(value) {
  return value
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<template\b[\s\S]*?<\/template>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<head\b[\s\S]*?<\/head>/i, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function metaContent(html, attribute, value) {
  const forward = new RegExp(`<meta\\b[^>]*${attribute}=["']${value}["'][^>]*content=["']([^"']+)`, 'i');
  const reverse = new RegExp(`<meta\\b[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${value}["']`, 'i');
  return (html.match(forward) || html.match(reverse) || ['', ''])[1].trim();
}

function canonicalHref(html) {
  const forward = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i);
  const reverse = html.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  return (forward || reverse || ['', ''])[1];
}

function pageInfo(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const body = stripTags(html);
  const title = (html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || ['', ''])[1].replace(/\s+/g, ' ').trim();
  const description = metaContent(html, 'name', 'description') || metaContent(html, 'property', 'og:description');
  const h1 = (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || ['', ''])[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const noindex = /<meta\b[^>]*(?:name=["']robots["'][^>]*content=["'][^"']*noindex|content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots["'])/i.test(html);
  const canonical = canonicalHref(html);
  const adsLoader = (html.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g) || []).length;
  const renderedHtml = html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ');
  const adUnits = (renderedHtml.match(/class=["'][^"']*adsbygoogle[^"']*["']/gi) || []).length;
  const consent = (html.match(/ad-consent-bootstrap\.js/g) || []).length;
  const links = [];
  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) links.push(match[1]);
  return {
    file: path.relative(ROOT, filePath).replace(/\\/g, '/'),
    route: routeForFile(filePath),
    title,
    description,
    h1,
    words: body ? body.split(/\s+/).length : 0,
    noindex,
    canonical,
    adsLoader,
    adUnits,
    consent,
    links
  };
}

function internalRoute(raw, fromFile) {
  if (!raw || /^(?:#|mailto:|tel:|javascript:|data:|blob:)/i.test(raw)) return null;
  if (/^https?:\/\//i.test(raw)) return raw.startsWith(BASE) ? new URL(raw).pathname : null;
  const clean = raw.split('#')[0].split('?')[0];
  if (!clean) return null;
  const relative = clean.startsWith('/') ? clean.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(routeForFile(fromFile)), clean));
  return `/${relative.replace(/^\.\//, '')}`;
}

function parseSitemap() {
  const source = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  return [...source.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
}

function parseRobots() {
  const source = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
  return source.split(/\r?\n/).map((line) => line.trim()).filter((line) => /^Disallow:/i.test(line)).map((line) => line.replace(/^Disallow:\s*/i, ''));
}

function isBlocked(route, rules) {
  return rules.some((rule) => {
    if (!rule) return false;
    if (rule.endsWith('*')) return route.startsWith(rule.slice(0, -1));
    if (rule.startsWith('*')) return route.endsWith(rule.slice(1));
    return route.startsWith(rule);
  });
}

const files = walk(ROOT);
const pages = files.map(pageInfo);
const byRoute = new Map(pages.map((page) => [page.route, page]));
const sitemap = parseSitemap();
const robotRules = parseRobots();
const navReachable = new Set(['/']);
const queue = ['/'];

while (queue.length) {
  const route = queue.shift();
  const page = byRoute.get(route);
  if (!page) continue;
  for (const raw of page.links) {
    const next = internalRoute(raw, path.join(ROOT, page.file));
    if (!next || !byRoute.has(next) || navReachable.has(next)) continue;
    navReachable.add(next);
    queue.push(next);
  }
}

const lowContent = pages.filter((page) => page.words < 120 && !page.noindex);
const missingEssentials = pages.filter((page) => !page.noindex && (!page.title || !page.description || !page.h1));
const missingCanonical = pages.filter((page) => !page.noindex && !page.canonical);
const noindexWithAds = pages.filter((page) => page.noindex && (page.adsLoader || page.adUnits));
const duplicateDescriptions = [...new Set(pages.filter((page) => !page.noindex && page.description).map((page) => page.description))]
  .map((description) => pages.filter((page) => page.description === description && !page.noindex).map((page) => page.route))
  .filter((routes) => routes.length > 1);
const sitemapProblems = sitemap.filter((route) => !byRoute.has(route) || isBlocked(route, robotRules) || byRoute.get(route).noindex);
const notInSitemap = pages.filter((page) => !page.noindex && !isBlocked(page.route, robotRules) && !sitemap.includes(page.route));
const staleRefs = pages.flatMap((page) => page.links.filter((link) => /(?:Worldcup\.html|woodbury_getaway|Gmail - Share Request)/i.test(link)).map((link) => `${page.route} -> ${link}`));

console.log(JSON.stringify({
  files: pages.length,
  sitemap: sitemap.length,
  robotsRules: robotRules,
  navReachable: navReachable.size,
  sitemapProblems,
  lowContent,
  missingEssentials,
  missingCanonical,
  noindexWithAds,
  duplicateDescriptions,
  notInSitemap,
  staleRefs,
  keyPages: pages.filter((page) => ['/','/main.html','/website-envizion.html'].includes(page.route))
}, null, 2));
