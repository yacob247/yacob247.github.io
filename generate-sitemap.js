const fs = require('fs');
const path = require('path');

// Your live website URL
const BASE_URL = 'https://envizion.work';

// Run this in the root of your yacob247.github.io directory
const ROOT_DIR = process.cwd(); 

// Recursive function to get all HTML files
function getHtmlFiles(dir, fileList = []) {
    // Show exactly which folder is currently being scanned
    console.log(`📂 Looking inside: ${dir}`);
    
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        
        // Skip hidden files/directories (like .git)
        if (file.startsWith('.')) {
            continue;
        }

        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Dive into the subfolder
            getHtmlFiles(filePath, fileList);
        } else {
            const ext = path.extname(file).toLowerCase();
            // Count HTML, HTM, and Markdown files
            if (ext === '.html' || ext === '.htm' || ext === '.md') {
                if (file.toLowerCase() !== 'readme.md') {
                    fileList.push(filePath);
                }
            }
        }
    }
    return fileList;
}

function generateSitemap() {
    console.log("Starting deep scan of all folders...");
    const htmlFiles = getHtmlFiles(ROOT_DIR);
    
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    const today = new Date().toISOString().split('T')[0];
    let pageCount = 0;

    htmlFiles.forEach(file => {
        // Convert to relative path and normalize slashes for URLs
        let relativePath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');

        // Clean up file extensions for the sitemap URLs
        if (relativePath.match(/^index\.(html|htm|md)$/i)) {
            relativePath = '';
        } else {
            // Remove trailing /index.html or /index.md
            relativePath = relativePath.replace(/\/index\.(html|htm|md)$/i, '');
            
            // Convert .md paths to .html (how GitHub pages usually serves them)
            relativePath = relativePath.replace(/\.md$/i, '.html');
        }

        // Optional: Skip your 404 error page
        if (relativePath.includes('404')) return; 

        // Construct the full URL
        const fullUrl = relativePath ? `${BASE_URL}/${relativePath}` : BASE_URL;

        // Append to sitemap
        sitemap += '  <url>\n';
        sitemap += `    <loc>${fullUrl}</loc>\n`;
        sitemap += `    <lastmod>${today}</lastmod>\n`;
        sitemap += `    <changefreq>weekly</changefreq>\n`;
        sitemap += '  </url>\n';
        
        pageCount++;
    });

    sitemap += '</urlset>\n';

    // Output the file
    fs.writeFileSync('sitemap.xml', sitemap, 'utf8');
    console.log(`✅ Successfully generated sitemap.xml with ${pageCount} pages!`);
}

generateSitemap();