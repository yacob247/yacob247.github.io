const fs = require('fs');
const path = require('path');

const dir = __dirname;
const baseUrl = 'https://envizion.work/tools2/';
const adClient = 'ca-pub-5812524294035974';
const adSlot = '9312358743';

const data = {
  'index.html': ['Envizion Tools', 'Tools dashboard', 'Browse focused Envizion browser tools for PDFs, images, audio, video, 3D assets, creative editing, local conversion, and file preparation.', ['Browse focused tools from one dashboard.', 'Open direct local HTML tool pages.', 'Find tools by file type and workflow.'], ['Open the tools dashboard.', 'Choose the utility that matches the job.', 'Complete the task on the dedicated page.']],
  'about.html': ['About Envizion Tools', 'Publisher information', 'Learn what Envizion Tools is, why these browser utilities exist, and how the collection is maintained for practical local workflows.', ['Explains the site purpose.', 'Describes the local-first tool approach.', 'Gives visitors a clear publisher context.'], ['Read the publisher overview.', 'Review the tool philosophy.', 'Open the tool dashboard when ready.']],
  'contact.html': ['Contact Envizion Tools', 'Publisher contact', 'Find simple ways to report tool issues, request corrections, and send feedback about the Envizion browser tool collection.', ['Provides feedback routes.', 'Clarifies support expectations.', 'Helps report broken pages or inaccurate instructions.'], ['Read the contact notes.', 'Prepare the page name and issue details.', 'Use the listed contact route.']],
  'privacy.html': ['Privacy and Cookies', 'Privacy policy', 'Understand how Envizion Tools handles local browser processing, third-party advertising, cookies, and user privacy disclosures.', ['Explains local file processing.', 'Discloses advertising and cookie behavior.', 'Clarifies that files are not intentionally uploaded by local tools.'], ['Read the privacy overview.', 'Review the advertising disclosure.', 'Return to the tools when comfortable.']],
  'advanced_editor_converter.html': ['Advanced Paste, Edit and Convert', 'Creative converter', 'Paste, preview, edit, and convert local media assets in a browser workspace for fast creative cleanup and export preparation.', ['Paste or import files into a browser workspace.', 'Edit, preview, and convert assets from one page.', 'Prepare quick exports without a custom backend.'], ['Open the page.', 'Paste or choose source media.', 'Adjust settings, preview, and export.']],
  'animator_studio.html': ['Mixamo Animator Studio', '3D animation tool', 'Preview character animations, assign controls, organize motion clips, and export practical animation snippets for 3D workflows.', ['Preview uploaded character and animation files.', 'Bind motion clips to keys and gameplay slots.', 'Export snippets for interactive scenes.'], ['Upload character or animation files.', 'Preview and organize clips.', 'Export the generated setup.']],
  'bulk_webp_converter.html': ['Local WebP Converter', 'Image converter', 'Convert JPG and PNG images to WebP in bulk directly in the browser with adjustable quality and local downloads.', ['Batch convert JPG and PNG to WebP.', 'Tune output quality for size or detail.', 'Download optimized files locally.'], ['Drop images into the upload area.', 'Choose the WebP quality level.', 'Download each optimized file.']],
  'CodeWeb.html': ['Localhost Server Manager', 'Developer tool', 'Use a developer reference hub for localhost workflows, server commands, project setup notes, and repeatable local testing.', ['Organized local server instructions.', 'Copyable command blocks and deployment notes.', 'Helpful for repeatable localhost setup work.'], ['Choose a server workflow.', 'Copy the matching commands.', 'Run locally and return to the guide as needed.']],
  'envizion_editor.html': ['Envizion Studio Editor', 'Media editor', 'Edit video and image layers in a local timeline-style Envizion workspace for quick browser-based media composition.', ['Edit video and image layers locally.', 'Use timeline controls for creative assembly.', 'Preview media workflows in the browser.'], ['Import media files.', 'Arrange and edit them in the workspace.', 'Preview and export when ready.']],
  'envizion_playground.html': ['Envizion Playground', 'Creative canvas', 'Arrange images, videos, audio, notes, and references on a local creative canvas for planning and visual organization.', ['Drag media and notes onto a canvas.', 'Zoom and arrange assets freely.', 'Plan edits, boards, and visual concepts.'], ['Open the playground.', 'Add canvas elements.', 'Arrange and continue into an editor workflow.']],
  'envizion_pro_studio_editor.html': ['Envizion Pro Studio Editor', 'Pro media editor', 'Use a richer local studio editor layout for layered media work, previewing, organization, and export-focused production.', ['Professional editor-style controls.', 'Layered visual composition workflow.', 'Local media experimentation tools.'], ['Import source assets.', 'Build the composition.', 'Preview and export the finished result.']],
  'fbx_to_glb_converter.html': ['Local FBX to GLB Converter', '3D converter', 'Convert FBX assets into portable GLB files locally for web, game, Three.js, and modern 3D workflows.', ['Load FBX assets in the browser.', 'Prepare GLB output for modern 3D pipelines.', 'Useful for web and game prototypes.'], ['Choose an FBX file.', 'Wait for parsing and conversion.', 'Download the GLB output.']],
  'image_resizer.html': ['Local Image Resizer', 'Image tool', 'Resize images to exact pixel dimensions locally in the browser for thumbnails, uploads, previews, and quick design cleanup.', ['Set exact width and height.', 'Preview original dimensions.', 'Download a resized PNG locally.'], ['Drop or select an image.', 'Enter new dimensions.', 'Resize and download the result.']],
  'image_watermark.html': ['Local Image Watermarker', 'Image tool', 'Add text watermarks to images locally and download protected versions for sharing, listings, previews, or portfolio work.', ['Apply custom text watermarking.', 'Preview the watermarked image.', 'Download the finished image locally.'], ['Choose an image.', 'Enter watermark text and settings.', 'Generate and download the result.']],
  'local_glb_viewer.html': ['Local GLB and GLTF Viewer', '3D viewer', 'Preview GLB and GLTF models in a local Three.js-style viewer with lighting, orbit inspection, and practical asset review.', ['Open GLB and GLTF files locally.', 'Inspect models with orbit controls.', 'Review 3D assets before publishing.'], ['Select a GLB or GLTF file.', 'Inspect the model in the viewport.', 'Adjust or re-export the source if needed.']],
  'local_video_image_mask_merger.html': ['Local Video Image Mask Merger', 'Video compositor', 'Merge video, image, and mask layers in a local browser workspace for quick compositing and visual experiments.', ['Combine videos and image masks.', 'Preview layered media locally.', 'Test overlays and masking workflows.'], ['Import media layers.', 'Position and configure overlays.', 'Preview and export using the controls.']],
  'local_vocal_remover.html': ['SonicStrip Local Vocal Remover', 'Audio tool', 'Use a browser-based vocal remover interface for reducing vocals, previewing audio changes, and preparing karaoke-style edits.', ['Upload audio for local processing.', 'Preview vocal removal results.', 'Download processed audio when available.'], ['Choose an audio file.', 'Start vocal removal.', 'Preview and download the output.']],
  'luma_dashboard_clone.html': ['Envizion Dashboard', 'Project dashboard', 'Open a local Envizion-style project dashboard for boards, shortcuts, editor links, and creative workspace navigation.', ['Create local board entries.', 'Open playground and editor tools quickly.', 'Organize creative work from a dashboard.'], ['Create or open a board.', 'Choose a playground or editor workflow.', 'Continue editing on the linked page.']],
  'main...3d_model_viewer.html': ['Envizion 3D Model Viewer', '3D viewer', 'Inspect GLB, GLTF, OBJ, and sample 3D models in a rich local model viewer with practical format resources.', ['Inspect 3D assets in a browser viewport.', 'Load local and sample models.', 'Reference common 3D conversion resources.'], ['Open or choose a model.', 'Use viewport controls to inspect it.', 'Use export or resource links as needed.']],
  'mp3_editor_mp4_converter.html': ['Local MP3 Studio and MP4 Visualizer', 'Audio and video tool', 'Edit MP3 audio locally, trim or process sound, and create MP4-style visualizer output from audio workflows.', ['Waveform editing and playback controls.', 'Audio trimming and export-focused tools.', 'Turn audio into visual output.'], ['Import an audio file.', 'Edit or mark the section you need.', 'Export audio or generated visual output.']],
  'pdf_merger.html': ['Local PDF Merger', 'PDF tool', 'Merge multiple PDF files into one document directly in the browser with a simple private local workflow.', ['Combine multiple PDFs locally.', 'Remove files before export.', 'Download one merged PDF.'], ['Select two or more PDF files.', 'Review their order.', 'Merge and download the combined document.']],
  'secure_converter.html': ['Secure Document and Image to PDF', 'PDF converter', 'Convert documents and images into PDFs locally with privacy-aware browser processing and useful PDF handling tools.', ['Convert images and documents to PDF.', 'Use browser-based PDF libraries.', 'Prepare common scan and upload files.'], ['Choose the converter mode.', 'Upload files locally in the browser.', 'Generate and download your PDF output.']],
  'secure_pdf_compressor.html': ['Local PDF Compressor', 'PDF tool', 'Compress PDFs locally by re-rendering pages and reducing output size for sharing, email limits, and archiving.', ['Compress PDFs in the browser.', 'Reduce files for upload limits.', 'Keep the processing local where supported.'], ['Choose a PDF file.', 'Select compression settings.', 'Generate and download the smaller PDF.']],
  'superfast_video_compressor.html': ['Superfast Video Compressor', 'Video and audio compressor', 'Compress video and audio locally with browser media APIs, quality controls, and practical export settings.', ['Video compression with bitrate controls.', 'Audio compression mode for MP3-style output.', 'Local processing without a custom server.'], ['Choose video or audio mode.', 'Select a file and settings.', 'Start processing and download the result.']],
  'visual_level_builder.html': ['Woodbury Visual Level Builder', '3D level builder', 'Build and arrange 3D scene layouts locally, place models, save layouts, and export placement code.', ['Spawn and position 3D props.', 'Save and restore layouts locally.', 'Export generated scene placement code.'], ['Load or spawn a model.', 'Move, rotate, and scale it.', 'Save the layout or generate code.']]
};

const themes = {
  light: {
    accent: '#10a37f',
    accent2: '#0d8f6f',
    bg: '#212121',
    soft: 'rgba(16, 163, 127, 0.14)',
    border: 'rgba(16, 163, 127, 0.28)',
    surface: '#2f2f2f',
    text: '#ececec',
    muted: '#b4b4b4',
    line: 'rgba(255, 255, 255, 0.12)'
  },
  dark: {
    accent: '#10a37f',
    accent2: '#0d8f6f',
    bg: '#212121',
    soft: 'rgba(16, 163, 127, 0.14)',
    border: 'rgba(16, 163, 127, 0.28)',
    surface: '#2f2f2f',
    text: '#ececec',
    muted: '#b4b4b4',
    line: 'rgba(255, 255, 255, 0.12)'
  }
};

const darkFiles = new Set([
  'advanced_editor_converter.html',
  'animator_studio.html',
  'envizion_editor.html',
  'envizion_playground.html',
  'envizion_pro_studio_editor.html',
  'local_glb_viewer.html',
  'local_video_image_mask_merger.html',
  'local_vocal_remover.html',
  'luma_dashboard_clone.html',
  'main...3d_model_viewer.html',
  'mp3_editor_mp4_converter.html',
  'superfast_video_compressor.html',
  'visual_level_builder.html'
]);

const trustFiles = new Set(['about.html', 'contact.html', 'privacy.html']);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function titleFromHtml(html, file) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, ' ').trim() : file.replace(/\.html$/i, '').replace(/[_-]+/g, ' ');
}

function relatedFiles(file) {
  const preferred = Object.keys(data).filter((item) => item !== file && !trustFiles.has(item));
  return preferred.slice(0, 6);
}

function list(items, tag) {
  return `<${tag}>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</${tag}>`;
}

function paletteStyle(file) {
  const theme = darkFiles.has(file) ? themes.dark : themes.light;
  return [
    `--toolkit-seo-accent:${theme.accent}`,
    `--toolkit-seo-accent-2:${theme.accent2}`,
    `--toolkit-seo-bg:${theme.bg}`,
    `--toolkit-seo-accent-soft:${theme.soft}`,
    `--toolkit-seo-accent-border:${theme.border}`,
    `--toolkit-seo-surface:${theme.surface}`,
    `--toolkit-seo-text:${theme.text}`,
    `--toolkit-seo-muted:${theme.muted}`,
    `--toolkit-seo-line:${theme.line}`
  ].join(';');
}

function adEligible(file) {
  return !trustFiles.has(file);
}

function workflowNoun(category) {
  const lower = category.toLowerCase();
  if (lower.includes('pdf')) return 'document preparation';
  if (lower.includes('image')) return 'image cleanup';
  if (lower.includes('audio')) return 'audio preparation';
  if (lower.includes('video')) return 'media compression';
  if (lower.includes('3d')) return '3D asset review';
  if (lower.includes('developer')) return 'local development setup';
  if (lower.includes('dashboard')) return 'project navigation';
  if (lower.includes('canvas') || lower.includes('creative')) return 'creative planning';
  return 'browser-based file work';
}

function useCases(name, category) {
  const workflow = workflowNoun(category);
  return [
    `Use ${name} when you need a focused ${workflow} task without opening a large desktop suite.`,
    `Use it as a quick verification step before sending files to a client, teammate, upload portal, chat app, or production workflow.`,
    `Use the page for repeatable local work where privacy, speed, and predictable browser controls matter more than cloud storage.`
  ];
}

function qualityNotes(name, category) {
  const lower = category.toLowerCase();
  const notes = [
    `This page is intentionally centered on the working tool first, then the guide below documents what the tool does, what it does not promise, and how to verify the output.`,
    `The safest workflow is to keep original files, test settings on a small sample, and inspect the exported result before replacing anything important.`
  ];
  if (lower.includes('pdf')) {
    notes.push('PDF output can change text selection, metadata, page dimensions, or image sharpness depending on the operation, so compare the exported PDF against the source before sharing it.');
  } else if (lower.includes('image')) {
    notes.push('Image exports may change compression, transparency, dimensions, or metadata; compare the preview and downloaded file when exact visual fidelity matters.');
  } else if (lower.includes('audio') || lower.includes('video')) {
    notes.push('Media exports depend on browser codec support, hardware acceleration, memory, and file duration, so very large files may need a smaller test run or a desktop encoder.');
  } else if (lower.includes('3d')) {
    notes.push('3D previews depend on WebGL support, model scale, texture paths, and browser memory; inspect materials, animation clips, and orientation before using the asset elsewhere.');
  } else if (lower.includes('developer')) {
    notes.push('Developer commands can differ by operating system, shell, package manager, and project structure, so read each command before running it and adjust paths or ports as needed.');
  } else {
    notes.push('Because the tool runs in a browser page, performance can vary by browser, device memory, and file size.');
  }
  return notes;
}

function troubleshooting(category) {
  const lower = category.toLowerCase();
  if (lower.includes('pdf')) {
    return ['Try a smaller PDF first if the browser tab becomes slow.', 'Re-export source scans at a lower resolution if the final file is still too large.', 'Use a current Chromium, Firefox, or Safari build for best PDF library support.'];
  }
  if (lower.includes('image')) {
    return ['Check whether the source image has transparency before converting.', 'Use conservative quality settings when text or fine edges must stay sharp.', 'Reload the page if a very large image exhausts canvas memory.'];
  }
  if (lower.includes('audio') || lower.includes('video')) {
    return ['Close other heavy tabs before processing long media.', 'Use shorter clips to test the chosen bitrate or quality level.', 'If export fails, try a more common input format or a smaller resolution.'];
  }
  if (lower.includes('3d')) {
    return ['Confirm that textures are embedded or available beside the model file.', 'Reset the camera if a model opens very small, very large, or off-center.', 'Try GLB for the most portable web preview workflow.'];
  }
  if (lower.includes('developer')) {
    return ['Check that the command matches your shell before running it.', 'Prefer localhost bindings for private testing and expose ports only when you mean to.', 'Keep secrets out of copied examples and environment files.'];
  }
  return ['Refresh the page if browser state gets stuck.', 'Try a smaller input to confirm the workflow.', 'Use a current browser when a local API is unavailable.'];
}

function siteFooter() {
  return `
<!-- ENVIZION_TRUST_FOOTER_START -->
<footer class="envizion-trust-footer" aria-label="Envizion site links">
  <a href="${baseUrl}index.html">Tools</a>
  <a href="${baseUrl}about.html">About</a>
  <a href="${baseUrl}privacy.html">Privacy</a>
  <a href="${baseUrl}contact.html">Contact</a>
</footer>
<!-- ENVIZION_TRUST_FOOTER_END -->`;
}

function adBlock(file) {
  if (!adEligible(file)) return '';
  return `
<!-- ENVIZION_AD_SLOT_START -->
<section class="envizion-ad-slot" aria-label="Advertisement" style="${paletteStyle(file)}">
  <div class="envizion-ad-box">
    <span class="envizion-ad-label">Advertisement</span>
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="${adClient}"
         data-ad-slot="${adSlot}"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
  </div>
</section>
<!-- ENVIZION_AD_SLOT_END -->`;
}

function seoSection(file, item) {
  const [name, category, description, features, steps] = item;
  const cases = useCases(name, category);
  const notes = qualityNotes(name, category);
  const fixes = troubleshooting(category);
  const related = relatedFiles(file).map((relatedFile) => {
    const relatedName = data[relatedFile][0];
    return `<a class="envizion-static-seo__link" href="${baseUrl}${encodeURIComponent(relatedFile)}">${escapeHtml(relatedName)}</a>`;
  }).join('\n        ');

  return `
<!-- ENVIZION_STATIC_SEO_START -->
<section class="envizion-static-seo" id="envizion-page-guide" aria-label="${escapeHtml(name)} explanation" style="${paletteStyle(file)}">
  <div class="envizion-static-seo__shell">
    <div class="envizion-static-seo__hero">
      <div>
        <p class="envizion-static-seo__kicker">${escapeHtml(category)}</p>
        <h2>${escapeHtml(name)}</h2>
        <p>${escapeHtml(description)}</p>
      </div>
      <div class="envizion-static-seo__badges">
        <span class="envizion-static-seo__badge">Envizion Tools</span>
        <span class="envizion-static-seo__badge">Local browser workflow</span>
        <span class="envizion-static-seo__badge">Tool guide</span>
      </div>
    </div>
    <div class="envizion-static-seo__grid">
      <article class="envizion-static-seo__panel">
        <h3>What this tool does</h3>
        ${list(features, 'ul')}
      </article>
      <article class="envizion-static-seo__panel">
        <h3>How to use it</h3>
        ${list(steps, 'ol')}
      </article>
      <article class="envizion-static-seo__panel">
        <h3>Helpful notes</h3>
        ${list(notes.slice(0, 3), 'ul')}
      </article>
    </div>
    <div class="envizion-static-seo__body">
      <h3>Detailed explanation</h3>
      <div class="envizion-static-seo__article">
        <p>${escapeHtml(name)} is part of the Envizion Tools collection, a set of focused browser-based utilities for practical file preparation, editing, conversion, compression, previewing, and creative production.</p>
        <p>${escapeHtml(description)} The working controls stay at the top of the page, while this guide gives visitors and search engines clear context about what the tool does, when it is useful, and how to approach the workflow.</p>
        <p>The normal workflow is straightforward: ${escapeHtml(steps.join(' '))} For best results, test with a small file first, inspect the output, and then process larger or more important files once the settings look correct.</p>
        <p>Many Envizion tools run directly in the browser, which helps keep everyday work fast and private. Some tools still depend on browser APIs, local device performance, media encoders, canvas features, PDF handling, or WebGL support, so behavior can differ between browsers.</p>
      </div>
      <h3>Best use cases</h3>
      ${list(cases, 'ul')}
      <h3>Before you export</h3>
      ${list(notes, 'ul')}
      <h3>Troubleshooting</h3>
      ${list(fixes, 'ul')}
      <h3>Common questions</h3>
      <dl class="envizion-static-seo__faq">
        <div><dt>How do I use this tool?</dt><dd>${escapeHtml(steps.join(' '))}</dd></div>
        <div><dt>What is this page best for?</dt><dd>${escapeHtml(description)}</dd></div>
        <div><dt>Are my files uploaded?</dt><dd>These tools are designed around local browser workflows where supported. If a page uses a third-party library or browser API, review your browser permissions and keep sensitive originals until you have verified the output.</dd></div>
        <div><dt>Does this page include ads?</dt><dd>${adEligible(file) ? 'Yes. The page includes a restrained AdSense slot using the configured Envizion publisher client and shared ad styling.' : 'No ad unit is placed on this publisher information page.'}</dd></div>
        <div><dt>Where is the published page?</dt><dd>${baseUrl}${escapeHtml(file)}</dd></div>
      </dl>
      <h3>Publisher and privacy links</h3>
      <div class="envizion-static-seo__links">
        <a class="envizion-static-seo__link" href="${baseUrl}about.html">About Envizion Tools</a>
        <a class="envizion-static-seo__link" href="${baseUrl}privacy.html">Privacy and cookies</a>
        <a class="envizion-static-seo__link" href="${baseUrl}contact.html">Contact and corrections</a>
      </div>
      <h3>Related Envizion tools</h3>
      <div class="envizion-static-seo__links">
        ${related}
      </div>
    </div>
  </div>
</section>
<!-- ENVIZION_STATIC_SEO_END -->`;
}

function schema(file, item) {
  const [name, category, description] = item;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    applicationCategory: category,
    operatingSystem: 'Any modern browser',
    url: baseUrl + encodeURIComponent(file),
    description,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Envizion Tools'
    }
  };
}

function removeExisting(html) {
  return html
    .replace(/<!-- ENVIZION_STATIC_SEO_STYLE_START -->[\s\S]*?<!-- ENVIZION_STATIC_SEO_STYLE_END -->\s*/g, '')
    .replace(/<!-- ENVIZION_STATIC_SEO_START -->[\s\S]*?<!-- ENVIZION_STATIC_SEO_END -->\s*/g, '')
    .replace(/<!-- ENVIZION_AD_SLOT_START -->[\s\S]*?<!-- ENVIZION_AD_SLOT_END -->\s*/g, '')
    .replace(/<!-- ENVIZION_TRUST_FOOTER_START -->[\s\S]*?<!-- ENVIZION_TRUST_FOOTER_END -->\s*/g, '')
    .replace(/\s*<div class="ads-banner">[\s\S]*?<\/div>\s*/gi, '\n')
    .replace(/\s*<!-- IN-FEED AD -->\s*<div class="hub-ad-slot"[\s\S]*?<\/div>\s*/gi, '\n')
    .replace(/\s*<section class="toolkit-ad"[\s\S]*?<\/section>\s*/gi, '\n')
    .replace(/\s*<div class="(?:ad-container|min-h-\[90px\]|my-8 py-4)[^"]*"[^>]*>\s*[\s\S]*?<ins class="adsbygoogle[\s\S]*?<\/script>\s*<\/div>\s*/gi, '\n')
    .replace(/\s*\/<\\\/head>\/i\s*/g, '\n')
    .replace(/\s*\/<\\\/body>\/i\s*/g, '\n')
    .replace(/\s*<script src="toolkit-enhance\.js"><\/script>\s*/gi, '\n')
    .replace(/\s*<link rel="stylesheet" href="toolkit-common\.css">\s*/gi, '\n')
    .replace(/\s*<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-5812524294035974" crossorigin="anonymous"><\/script>\s*/gi, '\n')
    .replace(/\s*<script type="application\/ld\+json" id="envizion-tool-schema">[\s\S]*?<\/script>\s*/gi, '\n')
    .replace(/\s*<meta name="description" content="[^"]*">\s*/gi, '\n')
    .replace(/\s*<meta name="robots" content="[^"]*">\s*/gi, '\n')
    .replace(/\s*<meta property="og:title" content="[^"]*">\s*/gi, '\n')
    .replace(/\s*<meta property="og:description" content="[^"]*">\s*/gi, '\n')
    .replace(/\s*<meta property="og:type" content="[^"]*">\s*/gi, '\n')
    .replace(/\s*<meta name="twitter:card" content="[^"]*">\s*/gi, '\n')
    .replace(/\s*<link rel="canonical" href="[^"]*">\s*/gi, '\n');
}

function headInsert(file, item) {
  const [name, , description] = item;
  const adsScript = adEligible(file)
    ? `  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}" crossorigin="anonymous"></script>\n`
    : '';
  return `  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${baseUrl}${escapeHtml(file)}">
  <meta property="og:title" content="${escapeHtml(name)} - Envizion Tools">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="toolkit-common.css">
${adsScript}  <script type="application/ld+json" id="envizion-tool-schema">${JSON.stringify(schema(file, item))}</script>
`;
}

for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.html'))) {
  const fullPath = path.join(dir, file);
  let html = fs.readFileSync(fullPath, 'utf8');
  const fallback = [titleFromHtml(html, file), 'Local browser tool', `${titleFromHtml(html, file)} is part of Envizion Tools, a focused local browser toolkit for practical file workflows.`, ['Runs as a focused browser tool.', 'Keeps the task on its own page.', 'Supports practical local workflows.'], ['Open the tool page.', 'Add your local input.', 'Use the controls and export the result.']];
  const item = data[file] || fallback;

  html = removeExisting(html);
  const headMarkup = headInsert(file, item);
  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `${headMarkup}</head>`);
  } else if (/<body\b/i.test(html)) {
    html = html.replace(/<body\b/i, `${headMarkup}</head>\n<body`);
  }

  const endMarkup = `${adBlock(file)}\n${seoSection(file, item)}\n${siteFooter()}\n  <script src="toolkit-enhance.js"></script>`;
  if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, `${endMarkup}\n</body>`);
  } else if (/<\/html>/i.test(html)) {
    html = html.replace(/<\/html>/i, `${endMarkup}\n</body>\n</html>`);
  }
  fs.writeFileSync(fullPath, html, 'utf8');
  console.log(`updated ${file}`);
}
