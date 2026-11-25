const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://envizion.work';
const ROOT_DIR = process.cwd();

const EXCLUDED_DIRECTORIES = new Set([
    '.agents',
    '.codex',
    '.git',
    'node_modules'
]);

const EXCLUDED_PATH_PARTS = [
    '212',
    'Loma',
    'admin',
    'animator_studio',
    'copy',
    'draft',
    'EMAIL_',
    'indexcopy',
    'gamevaultoriginal',
    'Worldcup',
    'WorldCups',
    'game/',
    'Texts',
    'super_snake',
    'woodbury_getaway',
    'Gmail',
    'unsubscribe',
    '404',
    'envizion_playground',
    'luma_dashboard_clone',
    'login',
    'RREADME',
    'signup',
    'untitled'
];

function normalizeUrlPath(filePath) {
    let relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');

    if (relativePath.match(/^index\.(html|htm|md)$/i)) {
        return '';
    }

    const isDirectoryIndex = /\/index\.(html|htm|md)$/i.test(relativePath);
    relativePath = relativePath.replace(/\/index\.(html|htm|md)$/i, '');
    relativePath = relativePath.replace(/\.md$/i, '.html');

    return isDirectoryIndex ? `${relativePath}/` : relativePath;
}

function hasNoindex(filePath) {
    if (!filePath.match(/\.html?$/i)) return false;

    const html = fs.readFileSync(filePath, 'utf8');
    return /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html) ||
        /<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(html);
}

function shouldExcludeFromSitemap(filePath) {
    const urlPath = normalizeUrlPath(filePath);
    const lowerPath = urlPath.toLowerCase();

    if (hasNoindex(filePath)) return true;
    if (lowerPath.endsWith('reviews-blog/blog-post.html') || lowerPath.endsWith('reviews-blog/game.html')) return true;
    if (urlPath.includes(' ') || urlPath.includes('(') || urlPath.includes(')')) return true;
    if (urlPath.includes('#') || lowerPath.includes('404')) return true;

    return EXCLUDED_PATH_PARTS.some((part) => lowerPath.includes(part.toLowerCase()));
}

function getHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (file.startsWith('.') || EXCLUDED_DIRECTORIES.has(file)) continue;
            getHtmlFiles(filePath, fileList);
            continue;
        }

        const ext = path.extname(file).toLowerCase();
        if ((ext === '.html' || ext === '.htm' || ext === '.md') &&
            file.toLowerCase() !== 'readme.md' &&
            !shouldExcludeFromSitemap(filePath)) {
            fileList.push(filePath);
        }
    }

    return fileList;
}

function getDynamicContentUrls() {
    const urls = [];
    const blogDataPath = path.join(ROOT_DIR, 'reviews-blog', 'blog-data.js');
    const gameDataPath = path.join(ROOT_DIR, 'reviews-blog', 'gamevault.js');

    if (fs.existsSync(blogDataPath)) {
        const source = fs.readFileSync(blogDataPath, 'utf8');
        for (const match of source.matchAll(/"slug"\s*:\s*"([a-z0-9-]+)"/g)) {
            urls.push(`${BASE_URL}/reviews-blog/blog-post.html?id=${encodeURIComponent(match[1])}`);
        }
    }

    if (fs.existsSync(gameDataPath)) {
        const source = fs.readFileSync(gameDataPath, 'utf8');
        for (const match of source.matchAll(/\bid\s*:\s*"([a-z0-9-]+)"/g)) {
            urls.push(`${BASE_URL}/reviews-blog/game.html?id=${encodeURIComponent(match[1])}`);
        }
    }

    return [...new Set(urls)].sort();
}

function generateSitemap() {
    const htmlFiles = getHtmlFiles(ROOT_DIR).sort();
    // Editorial posts and reviews are generated as crawlable static pages.
    // Do not publish query-string template URLs as duplicate sitemap entries.
    const dynamicUrls = [];
    const today = new Date().toISOString().split('T')[0];

    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const file of htmlFiles) {
        const relativePath = normalizeUrlPath(file);
        const fullUrl = relativePath ? `${BASE_URL}/${relativePath}` : BASE_URL;

        sitemap += '  <url>\n';
        sitemap += `    <loc>${fullUrl}</loc>\n`;
        sitemap += `    <lastmod>${today}</lastmod>\n`;
        sitemap += '    <changefreq>weekly</changefreq>\n';
        sitemap += '  </url>\n';
    }

    for (const fullUrl of dynamicUrls) {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${fullUrl}</loc>\n`;
        sitemap += `    <lastmod>${today}</lastmod>\n`;
        sitemap += '    <changefreq>monthly</changefreq>\n';
        sitemap += '  </url>\n';
    }

    sitemap += '</urlset>\n';

    fs.writeFileSync('sitemap.xml', sitemap, 'utf8');
    console.log(`Successfully generated sitemap.xml with ${htmlFiles.length + dynamicUrls.length} pages (${htmlFiles.length} static, ${dynamicUrls.length} dynamic).`);
}

generateSitemap();
