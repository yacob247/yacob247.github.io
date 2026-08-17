/*
 * Keep interactive tools available while keeping thin execution surfaces out
 * of the AdSense review surface. These pages remain linked and usable; they
 * are simply not presented as standalone search/ad landing pages.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const EXCLUDED_TOOL_PAGES = [
  'reviews-blog/blog-post.html',
  'reviews-blog/game.html',
  'tools/Image-Text-Extractor.html',
  'tools/InstantDictionary.html',
  'tools/advanced-video-watermarker.html',
  'tools/background-remover.html',
  'tools/envizionomniconvertpro.html',
  'tools/htmlviewer.html',
  'tools/image-optimizer-pro.html',
  'tools/imagesupscaler.html',
  'tools/life-tools.html',
  'tools/local_video_image_mask_merger.html',
  'tools/media-library.html',
  'tools/mediaforge.html',
  'tools/mediaplayer.html',
  'tools/mp4tomp3.html',
  'tools/pdfmerger.html',
  'tools/pdfstotxt.html',
  'tools/steganovault.html',
  'tools/teleprompter.html',
  'tools/the-new-project.html',
  'tools/u8.html',
  'tools/universal-file-encryption.html',
  'tools/velolink.html',
  'tools/vocal-music-separator.html',
  'tools/voice-recorder.html',
  'tools2/bulk_webp_converter.html',
  'tools2/animator_studio.html',
  'tools2/fbx_to_glb_converter.html',
  'tools2/image_resizer.html',
  'tools2/local_glb_viewer.html',
  'tools2/local_video_image_mask_merger.html',
  'tools2/local_vocal_remover.html',
  'tools2/mp3_editor_mp4_converter.html',
  'tools2/pdf_merger.html',
  'tools2/secure_converter.html',
  'tools2/secure_pdf_compressor.html',
  'tools2/superfast_video_compressor.html',
  'tools2/visual_level_builder.html'
];

function removeAds(html, stripUnits = true) {
  html = html.replace(/<script\b[^>]*src=["'][^"']*pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^"']*["'][^>]*>\s*<\/script>\s*/gi, '');
  html = html.replace(/<meta\b[^>]*(?:name=["']google-adsense-account["'][^>]*|content=["']ca-pub-[^"']+["'][^>]*name=["']google-adsense-account["'])[^>]*>\s*/gi, '');
  if (!stripUnits) return html;
  html = html.replace(/<!--\s*ENVIZION_AD_SLOT_START\s*-->[\s\S]*?<!--\s*ENVIZION_AD_SLOT_END\s*-->\s*/gi, '');
  html = html.replace(/<section\b[^>]*class=["'][^"']*envizion-ad-slot[^"']*["'][^>]*>[\s\S]*?<\/section>\s*/gi, '');
  html = html.replace(/<ins\b[^>]*class=["'][^"']*adsbygoogle[^"']*["'][^>]*>[\s\S]*?<\/ins>\s*/gi, '');
  html = html.replace(/<script\b[^>]*>\s*\(\s*adsbygoogle\s*=\s*window\.adsbygoogle[\s\S]*?<\/script>\s*/gi, '');
  return html;
}

function removeRepeatedEducationalPanel(html) {
  return html.replace(/<!--\s*KNOW MORE PANEL[\s\S]*?<!--\s*END KNOW MORE PANEL\s*-->\s*/gi, '');
}

function removeLegacyCookieBanner(html) {
  return html.replace(/<!--[\s\S]{0,120}Cookie Consent Banner[\s\S]*?<!--[\s\S]{0,120}End Cookie Consent Banner[\s\S]*?-->\s*/gi, '');
}

function repairDeletedProductLinks(html) {
  return html;
}

for (const relativePath of EXCLUDED_TOOL_PAGES) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) throw new Error(`Missing curation target: ${relativePath}`);

  let html = fs.readFileSync(filePath, 'utf8');
  html = html.replace(/<meta\b[^>]*(?:name=["']robots["'][^>]*|content=["'][^"']*noindex[^"']*["'][^>]*)[^>]*>\s*/gi, '');
  html = html.replace(/(<head\b[^>]*>)/i, '$1\n  <meta name="robots" content="noindex, follow"/>');
  const preserveDynamicTemplateMarkup = relativePath === 'reviews-blog/blog-post.html' || relativePath === 'reviews-blog/game.html';
  html = removeAds(html, !preserveDynamicTemplateMarkup);
  fs.writeFileSync(filePath, html, 'utf8');
}

function walkHtml(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walkHtml(filePath);
    else if (/\.html?$/i.test(entry.name)) {
      const original = fs.readFileSync(filePath, 'utf8');
      const cleaned = repairDeletedProductLinks(removeLegacyCookieBanner(removeRepeatedEducationalPanel(original)));
      if (cleaned !== original) fs.writeFileSync(filePath, cleaned, 'utf8');
    }
  }
}

walkHtml(ROOT);

console.log(`Curated ${EXCLUDED_TOOL_PAGES.length} thin or duplicate execution pages.`);
