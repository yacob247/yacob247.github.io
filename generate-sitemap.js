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
    'login',
    'luma_dashboard_clone',
    'main...',
    'RREADME',
    'signup',
    'unsubscribe',
    'untitled',
    'woodbury_getaway'
];

function normalizeUrlPath(filePath) {
    let relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');

    if (relativePath.match(/^index\.(html|htm|md)$/i)) {
        return '';
    }

    relativePath = relativePath.replace(/\/index\.(html|htm|md)$/i, '');
    relativePath = relativePath.replace(/\.md$/i, '.html');

    return relativePath;
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

function generateSitemap() {
    const htmlFiles = getHtmlFiles(ROOT_DIR).sort();
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

    sitemap += '</urlset>\n';

    fs.writeFileSync('sitemap.xml', sitemap, 'utf8');
    console.log(`Successfully generated sitemap.xml with ${htmlFiles.length} pages.`);
}

generateSitemap();
