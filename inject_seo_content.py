"""
inject_seo_content.py
---------------------
Replaces the <!-- ENVIZION_STATIC_SEO_START --> ... <!-- ENVIZION_STATIC_SEO_END -->
block in each listed HTML file with unique, 600+ word content specific to that tool.

Run from your repo root:
    python3 inject_seo_content.py
    python3 inject_seo_content.py --dry-run
"""

import os, re, argparse

START_MARKER = "<!-- ENVIZION_STATIC_SEO_START -->"
END_MARKER   = "<!-- ENVIZION_STATIC_SEO_END -->"

SEO_STYLE = ('style="--toolkit-seo-accent:#10a37f;--toolkit-seo-accent-2:#0d8f6f;'
             '--toolkit-seo-bg:#212121;--toolkit-seo-accent-soft:rgba(16,163,127,0.14);'
             '--toolkit-seo-accent-border:rgba(16,163,127,0.28);--toolkit-seo-surface:#2f2f2f;'
             '--toolkit-seo-text:#ececec;--toolkit-seo-muted:#b4b4b4;'
             '--toolkit-seo-line:rgba(255,255,255,0.12)"')

def build_block(folder, filename, title, kicker, tagline, badges,
                what_it_does, how_to_use, helpful_notes,
                detail_paras, best_uses, before_export, troubleshooting,
                faq, related_links):

    page_url = f"https://envizion.work/{folder}/{filename}"
    about_url = f"https://envizion.work/{folder}/about.html"
    privacy_url = f"https://envizion.work/{folder}/privacy.html"
    contact_url = f"https://envizion.work/{folder}/contact.html"
    index_url = f"https://envizion.work/{folder}/index.html"

    badge_html = "".join(f'<span class="envizion-static-seo__badge">{b}</span>' for b in badges)
    what_html  = "".join(f"<li>{x}</li>" for x in what_it_does)
    how_html   = "".join(f"<li>{x}</li>" for x in how_to_use)
    notes_html = "".join(f"<li>{x}</li>" for x in helpful_notes)
    detail_html= "".join(f"<p>{p}</p>" for p in detail_paras)
    uses_html  = "".join(f"<li>{x}</li>" for x in best_uses)
    export_html= "".join(f"<li>{x}</li>" for x in before_export)
    trouble_html="".join(f"<li>{x}</li>" for x in troubleshooting)
    faq_html   = "".join(f"<div><dt>{q}</dt><dd>{a}</dd></div>" for q,a in faq)
    related_html="".join(f'<a class="envizion-static-seo__link" href="{u}">{t}</a>' for t,u in related_links)

    return f"""{START_MARKER}
<section aria-label="{title} explanation" class="envizion-static-seo" id="envizion-page-guide" {SEO_STYLE}>
<div class="envizion-static-seo__shell">
<div class="envizion-static-seo__hero">
<div>
<p class="envizion-static-seo__kicker">{kicker}</p>
<h2>{title}</h2>
<p>{tagline}</p>
</div>
<div class="envizion-static-seo__badges">{badge_html}</div>
</div>
<div class="envizion-static-seo__grid">
<article class="envizion-static-seo__panel">
<h3>What this tool does</h3>
<ul>{what_html}</ul>
</article>
<article class="envizion-static-seo__panel">
<h3>How to use it</h3>
<ol>{how_html}</ol>
</article>
<article class="envizion-static-seo__panel">
<h3>Helpful notes</h3>
<ul>{notes_html}</ul>
</article>
</div>
<div class="envizion-static-seo__body">
<h3>Detailed explanation</h3>
<div class="envizion-static-seo__article">{detail_html}</div>
<h3>Best use cases</h3>
<ul>{uses_html}</ul>
<h3>Before you export</h3>
<ul>{export_html}</ul>
<h3>Troubleshooting</h3>
<ul>{trouble_html}</ul>
<h3>Common questions</h3>
<dl class="envizion-static-seo__faq">{faq_html}</dl>
<h3>Publisher and privacy links</h3>
<div class="envizion-static-seo__links">
<a class="envizion-static-seo__link" href="{about_url}">About Envizion</a>
<a class="envizion-static-seo__link" href="{privacy_url}">Privacy and cookies</a>
<a class="envizion-static-seo__link" href="{contact_url}">Contact and corrections</a>
</div>
<h3>Related Envizion tools</h3>
<div class="envizion-static-seo__links">{related_html}</div>
</div>
</div>
</section>
{END_MARKER}"""


# ── PAGE DEFINITIONS ────────────────────────────────────────────────────────────
# Each entry: (folder, filename, title, kicker, tagline, badges[],
#              what[], how[], notes[], detail_paras[], best_uses[],
#              before_export[], troubleshooting[], faq[(q,a)], related[(title,url)])

PAGES = [

# ── TOOLS FOLDER ────────────────────────────────────────────────────────────────

("tools","advanced-video-watermarker.html",
 "Advanced Video Watermarker","Browser video tool","Burn custom text or image watermarks directly onto video files — no software install, no upload to a server.",
 ["Video Watermarking","Browser-based","No Upload Required","Envizion Tools"],
 ["Overlay text or a logo image onto any video file without leaving the browser.","Choose position, opacity, font size, and colour of the watermark before applying.","Export the watermarked video in its original quality."],
 ["Load your video file using the file picker.","Configure the watermark — text content, position (corner or centre), opacity, and size.","Click Apply and wait for the browser encoder to process the frames.","Download the finished file when the export button appears."],
 ["Processing time depends on video length and your device CPU — longer videos take longer.","The output stays on your device; no frames are sent to any server.","If the video is very large, use a shorter test clip first to confirm the watermark position looks correct before processing the full file."],
 ["The Advanced Video Watermarker is a browser-based tool for adding persistent text or image overlays to video files. It is designed for content creators, educators, small business owners, and anyone who needs to protect or brand video output without paying for desktop video software or uploading footage to a cloud service.",
  "Watermarking is a standard practice for protecting intellectual property. When a creator shares a tutorial, product demo, or recorded session, a visible watermark prevents the content from being redistributed without clear attribution. This tool makes that step fast and accessible without requiring Final Cut Pro, Adobe Premiere, or FFmpeg on the command line.",
  "The tool uses the browser Canvas API and the MediaRecorder API to decode each video frame, draw the overlay, and re-encode the result into a downloadable video file. Because everything runs in the tab, the process is private. Your footage is never transmitted to a remote server, which matters when the video contains sensitive meetings, proprietary product footage, or personal content.",
  "Text watermarks support custom font size, colour in hex, opacity as a percentage, and four corner positions plus centre. Image watermarks accept PNG files with transparency, which allows logo overlays with a natural look against any background. The tool scales the image watermark relative to the video frame so that the overlay looks proportional regardless of video resolution.",
  "Output quality depends on the browser MediaRecorder settings and the codec available in the user's browser. Chrome and Edge generally produce the best results on desktop. Firefox uses a slightly different codec path. On iOS Safari, recording capabilities are more limited, so desktop is recommended for longer or higher-resolution files.",
  "This tool is part of the Envizion Tools collection, a set of focused browser utilities for media, file, and creative workflows available at envizion.work."],
 ["Brand tutorial videos before publishing to YouTube or educational platforms.","Protect product demo recordings from being reused without credit.","Add client name watermarks to draft video deliverables for review rounds.","Overlay a website URL onto short promotional clips for social sharing."],
 ["Keep the original unwatermarked file in case the position or style needs changing later.","Test with a 10-second clip at the exact resolution of the final video before committing.","Check the transparency of PNG image watermarks against both light and dark areas of the video."],
 ["If the export button does not appear, refresh and try a shorter clip — some browsers have memory limits for large MediaRecorder sessions.","If the watermark looks blurry, reduce the canvas scaling by choosing a lower output resolution setting.","If the file picker does not open, check browser permissions for file access in site settings."],
 [("Does this tool upload my video?","No. The entire watermarking process runs inside your browser tab using the Canvas and MediaRecorder APIs. Nothing is transmitted to a server."),
  ("What video formats are supported?","The input accepts MP4, WebM, and MOV files. Output format depends on the browser codec — Chrome typically outputs WebM or MP4."),
  ("Can I watermark a 4K video?","Yes, but processing will be slower on lower-spec devices. Use a test clip first."),
  ("Is the tool free?","Yes. The Advanced Video Watermarker is free to use on Envizion with no account required.")],
 [("Image Optimizer Pro","https://envizion.work/tools/image-optimizer-pro.html"),
  ("Vocal Music Separator","https://envizion.work/tools/vocal-music-separator.html"),
  ("Media Library","https://envizion.work/tools/media-library.html"),
  ("MediaForge","https://envizion.work/tools/mediaforge.html")]),

("tools","background-remover.html",
 "Background Remover","Image editing tool","Remove backgrounds from photos and images entirely in the browser — no API key, no server, no subscription.",
 ["Background Removal","AI-Assisted","Privacy First","Envizion Tools"],
 ["Detect and remove the background from any image using on-device processing.","Export a clean PNG with transparency ready for compositing or design work.","No file is sent to any external server."],
 ["Load your image using the file picker or drag and drop.","Wait for the on-device model to segment the foreground subject.","Review the result in the preview panel and adjust the threshold if edges need refinement.","Download the transparent PNG."],
 ["Best results come from images with clear contrast between the subject and background.","Very complex backgrounds with similar colours to the subject may need manual refinement.","The tool uses a lightweight segmentation model that runs in WebAssembly — the first load may take a moment while the model initialises."],
 ["The Background Remover uses a machine learning segmentation model that runs entirely inside the browser using WebAssembly and the Canvas API. It does not send image data to any server. This makes it a strong choice for images containing personal information, client work, or proprietary product photography.",
  "Background removal has become a standard requirement for e-commerce product images, profile photos, presentation graphics, and social media content. Traditionally this required either a paid cloud API such as remove.bg or a desktop application such as Photoshop. This tool removes both the cost and the privacy concern by running the model locally.",
  "The segmentation model identifies the primary subject in the image and generates a mask that separates foreground pixels from background pixels. The mask is applied to the original image, and the background pixels are set to fully transparent. The result is exported as a PNG file, which is the standard format for images with transparency.",
  "Performance varies by image size and device. On a modern laptop or desktop, a standard 1080p photo processes in two to five seconds. Very large images — above 4000 pixels wide — may take longer or require the browser to use more memory. If performance is slow, resize the image to a more manageable size before processing.",
  "The tool works best on portrait photos, product shots against simple backgrounds, logos, and illustrations. Images with complex scenes, motion blur, transparent objects such as glass, or fine details such as hair in front of busy backgrounds will produce less accurate results. For those cases, the output can be downloaded and refined in a dedicated editor.",
  "Background Remover is part of the Envizion Tools collection available at envizion.work."],
 ["Remove backgrounds from product photos for e-commerce listings on marketplaces.","Create transparent logo versions from photographs for use on different background colours.","Prepare profile photos for professional use without paying for Photoshop.","Extract subject images for presentation slides, thumbnails, and social media posts."],
 ["Save the original image before processing in case you need to retry with different settings.","PNG transparency may appear as white in applications that do not support alpha channels — check compatibility.","For hair or fur detail, try processing a slightly smaller crop centred on the subject."],
 ["If the preview shows no change, the model may not have loaded yet — wait for the initialisation message and try again.","If edges look jagged, adjust the mask threshold slider toward a softer setting.","If the download produces a black image, try in Chrome or Edge which have the most complete Canvas export support."],
 [("Does the image get uploaded anywhere?","No. Everything runs in the browser. No image data is transmitted to a server."),
  ("What output format does it produce?","The tool exports a PNG file with transparent background."),
  ("Does it work on logos?","Yes, especially logos on plain white or solid colour backgrounds."),
  ("Is it free?","Yes. No account, no subscription, no usage limit on Envizion.")],
 [("Image Optimizer Pro","https://envizion.work/tools/image-optimizer-pro.html"),
  ("Image Upscaler","https://envizion.work/tools/imagesupscaler.html"),
  ("Universal File Encryption","https://envizion.work/tools/universal-file-encryption.html"),
  ("Media Library","https://envizion.work/tools/media-library.html")]),

("tools","envizionomniconvertpro.html",
 "Envizion OmniConvert Pro","All-in-one converter","Convert images, audio files, and documents between formats in one place — fast, local, and free.",
 ["File Conversion","Multi-Format","No Upload","Envizion Tools"],
 ["Convert between dozens of file formats for images, audio, and documents without leaving the browser.","Batch convert multiple files at once.","All processing happens locally on your device."],
 ["Select one or more files using the file picker.","Choose the output format from the dropdown for that file type category.","Adjust any format-specific settings such as image quality or audio bitrate.","Click Convert and download the results."],
 ["Supported input and output formats are listed in the format selector — not all combinations are available in every browser.","Audio conversion uses the Web Audio API and may produce slightly different quality across browsers.","For document conversion, some formatting may shift depending on font support in the browser environment."],
 ["OmniConvert Pro is the multi-format conversion hub in the Envizion Tools collection. Rather than opening a separate tool for each conversion job, OmniConvert Pro handles image format changes, audio re-encoding, and document conversions from a single interface.",
  "File conversion is one of the most common practical computing tasks. A client sends a HEIC photo from an iPhone that Windows cannot open. A recording comes back as OGG and needs to be MP3 for a podcast host. A Word document needs to become a plain text file for a system that cannot parse DOCX. OmniConvert Pro addresses all of these without requiring the user to install separate desktop applications or upload files to cloud services.",
  "For images, the tool supports conversion between JPEG, PNG, WebP, BMP, GIF, and TIFF. JPEG quality is adjustable from 1 to 100 to allow size versus quality trade-offs. PNG exports support transparency. WebP conversion is particularly useful for web developers preparing image assets for production sites where file size affects page load performance.",
  "For audio, the tool uses the browser Web Audio API to decode incoming files and re-encode them in the target format. Supported audio formats include MP3, OGG, WAV, and WebM. Bitrate options are available for lossy formats. Note that lossless-to-lossy conversion permanently discards audio data — always keep originals.",
  "Document conversion handles common plain text formats and basic structured documents. Full layout-preserving conversion of complex PDFs or richly formatted Word documents is outside the scope of a browser-based tool, but simple text extraction and format changes work reliably.",
  "OmniConvert Pro is part of the Envizion Tools collection at envizion.work, alongside dedicated tools for specific workflows such as PDF merging, image optimisation, and video watermarking."],
 ["Convert HEIC iPhone photos to JPEG for Windows and web compatibility.","Convert WAV recordings to MP3 for podcast submission or sharing.","Batch convert a folder of PNGs to WebP for web development asset pipelines.","Convert OGG audio from recordings to a format compatible with video editing software."],
 ["Conversion is lossy for formats like JPEG and MP3 — keep originals and only convert copies.","Test with one file before batch converting a large set to confirm the output meets expectations.","Check the output file size — some format combinations produce larger files than the original."],
 ["If a format does not appear in the dropdown, it is not supported in the current browser — try Chrome or Edge.","If batch conversion stalls partway through, reduce the batch size and retry.","If the audio output sounds distorted, lower the bitrate setting and reconvert."],
 [("Does this upload my files?","No. Conversion runs entirely in the browser. Files stay on your device."),
  ("How many files can I convert at once?","Batch size depends on device memory. Start with 20 files or fewer for large media files."),
  ("Is it free?","Yes. OmniConvert Pro is free to use at envizion.work with no account required."),
  ("Can I convert videos?","Video conversion is handled by dedicated tools such as MP4 to MP3 and MediaForge — OmniConvert focuses on images, audio, and documents.")],
 [("Image Optimizer Pro","https://envizion.work/tools/image-optimizer-pro.html"),
  ("MP4 to MP3","https://envizion.work/tools/mp4tomp3.html"),
  ("PDF to Text","https://envizion.work/tools/pdf-to-text.html"),
  ("Universal File Encryption","https://envizion.work/tools/universal-file-encryption.html")]),

("tools","htmlviewer.html",
 "HTML Viewer","Browser preview tool","Paste or load any HTML file and preview it live in a sandboxed frame — no server required.",
 ["HTML Preview","Sandbox","Developer Tool","Envizion Tools"],
 ["Paste raw HTML or load an HTML file and see it rendered instantly.","Preview is sandboxed so scripts cannot access the parent page.","Inspect rendered output without spinning up a local server."],
 ["Paste your HTML into the code panel, or load a file using the file picker.","The preview panel updates automatically as you type or after loading.","Use the refresh button if the preview does not update.","Copy or download the HTML from the editor panel when finished."],
 ["The sandbox attribute on the preview frame limits script execution for security — some complex JS-heavy pages may behave differently than in a full browser tab.","External resources such as CDN-hosted CSS or fonts will still load if the browser allows cross-origin requests.","This tool is for quick preview and inspection, not for full browser compatibility testing."],
 ["The HTML Viewer is a lightweight developer and content tool that renders HTML markup in a sandboxed iframe alongside a code editor panel. It is designed for web developers who want to quickly test a snippet, content writers who need to verify HTML email formatting, and students learning HTML who want instant visual feedback without setting up a development environment.",
  "A common frustration when working with raw HTML is the absence of an instant preview. Opening a file in a browser requires saving it to disk first. Online code editors often require accounts or have rate limits. The HTML Viewer solves this by providing a zero-setup preview environment that lives entirely in the browser tab.",
  "The editor panel supports syntax highlighting for HTML. The preview frame uses the srcdoc attribute to render content directly without navigating to a new URL. A sandbox attribute restricts the rendered page from accessing parent page storage, executing unrestricted scripts, or making form submissions that could interfere with the tool itself.",
  "The tool is useful for previewing HTML email templates, which are notoriously finicky. Email clients render HTML differently from browsers, but checking the basic layout and inline styles in a live preview catches most structural issues before sending to an email testing service.",
  "For developers, the HTML Viewer doubles as a quick snippet tester. Copying a component from a framework documentation page, pasting it into the viewer, and seeing it render immediately is faster than creating a new file, saving it, and opening it in a browser tab.",
  "HTML Viewer is part of the Envizion Tools collection at envizion.work."],
 ["Preview HTML email templates before testing in dedicated email clients.","Test small HTML snippets from documentation or Stack Overflow without creating a project.","Verify the structure of HTML exported from content management systems before pasting into a live site.","Teach HTML to beginners by showing live results alongside the code."],
 ["The sandbox may block certain scripts — if a feature does not render, it may be a sandbox restriction rather than a code error.","External images and fonts load fine if the host allows cross-origin requests — check the browser console if they do not appear.","Styles applied in the code panel persist across sessions in the editor state."],
 ["If the preview is blank, check that the HTML has a body element with visible content.","If external resources do not load, the host server may not allow cross-origin embedding — this is a server restriction, not a tool issue.","If the preview and code panel are out of sync, click the refresh button to force re-render."],
 [("Does it support CSS and JavaScript?","Yes. CSS is rendered fully. JavaScript runs in the sandbox with some restrictions on storage and navigation."),
  ("Can I load a full HTML page with a head and body?","Yes. Paste the full document and it renders correctly inside the frame."),
  ("Is it free?","Yes. The HTML Viewer is free at envizion.work with no account."),
  ("Can I save my work?","You can download the current HTML from the editor panel as a file.")],
 [("Envizion Editor","https://envizion.work/tools2/envizion_editor.html"),
  ("CodeWeb","https://envizion.work/tools2/CodeWeb.html"),
  ("Universal File Encryption","https://envizion.work/tools/universal-file-encryption.html"),
  ("Tools Guide","https://envizion.work/tools/tools-guide.html")]),

("tools","image-optimizer-pro.html",
 "Image Optimizer Pro","Image compression tool","Compress and resize images in bulk in the browser — reduce file size without visible quality loss.",
 ["Image Compression","Batch Processing","WebP Export","Envizion Tools"],
 ["Compress JPEG and PNG images with adjustable quality settings.","Resize images to specific pixel dimensions or percentage of original.","Export as JPEG, PNG, or WebP for web-optimised delivery."],
 ["Add one or more image files using the file picker or drag and drop.","Set the target quality level and optional resize dimensions.","Choose the output format.","Click Compress and download individual files or a ZIP of the batch."],
 ["WebP output typically produces 25 to 35 percent smaller files than JPEG at the same perceived quality.","Resizing is proportional by default — enter a width and the height adjusts automatically to preserve aspect ratio.","Very high batch counts may slow down on lower-powered devices — process in sets of 50 or fewer."],
 ["Image Optimizer Pro is a browser-based bulk image compression and resizing tool aimed at web developers, bloggers, e-commerce managers, and anyone who regularly handles image assets. Unoptimised images are one of the most common causes of slow web page load times, and large image file sizes negatively affect Core Web Vitals scores, which in turn affects search rankings.",
  "The tool uses the browser Canvas API to decode each image, apply the resize transformation if specified, and re-encode the result at the chosen quality level. For JPEG output, quality is adjustable from 1 to 100 — values between 75 and 85 typically produce an excellent trade-off between visual quality and file size for photographic images. For PNG, the tool applies lossless compression. For WebP, it uses the browser's native WebP encoder which is available in all modern browsers.",
  "Batch processing allows multiple images to be queued and compressed in sequence. Each processed file can be downloaded individually or the entire batch can be packaged into a ZIP file for a single download. This is particularly useful when preparing a batch of product images for an e-commerce site or compressing a folder of blog post images before upload.",
  "The resize feature accepts target width in pixels, with height calculated automatically to maintain the aspect ratio. A custom aspect ratio mode is also available for use cases such as generating square thumbnails. Resizing happens before compression in the processing pipeline, which means the compression quality setting applies to the resized dimensions.",
  "Because everything runs in the browser, no images are sent to any server. This matters for commercial photography, client work, and any images containing personal information. Image Optimizer Pro gives the same compression capability as server-side tools while keeping all data on the device.",
  "Image Optimizer Pro is part of the Envizion Tools collection at envizion.work."],
 ["Compress product images before uploading to Shopify, WooCommerce, or similar platforms.","Resize and optimise blog post featured images to improve page load speed.","Convert a batch of PNG screenshots to WebP for use in web documentation.","Reduce image file sizes before attaching to emails where attachment size is limited."],
 ["Save originals before compressing — lossy compression cannot be reversed.","Check the output preview before batch downloading to confirm quality is acceptable at the chosen setting.","For transparent images, use PNG or WebP output — JPEG does not support transparency."],
 ["If output files look pixelated, increase the quality setting — values below 60 are very aggressive.","If the batch stalls, reduce the number of files per batch and try again.","If WebP output is not available, the browser may be outdated — update or switch to Chrome or Edge."],
 [("Does it upload images to a server?","No. All compression and resizing runs in the browser using the Canvas API."),
  ("What formats can I export to?","JPEG, PNG, and WebP."),
  ("Can I compress a batch of files at once?","Yes. Add multiple files and they are processed in sequence with a batch download option."),
  ("Is it free?","Yes. Image Optimizer Pro is free at envizion.work.")],
 [("Background Remover","https://envizion.work/tools/background-remover.html"),
  ("Image Upscaler","https://envizion.work/tools/imagesupscaler.html"),
  ("Advanced Video Watermarker","https://envizion.work/tools/advanced-video-watermarker.html"),
  ("Bulk WebP Converter","https://envizion.work/tools2/bulk_webp_converter.html")]),

("tools","imagesupscaler.html",
 "Image Upscaler","AI upscaling tool","Increase image resolution up to 4x using on-device AI super-resolution — no cloud API, no upload.",
 ["AI Upscaling","Super Resolution","Privacy First","Envizion Tools"],
 ["Upscale images to 2x or 4x their original dimensions using a super-resolution model.","Processing runs entirely in the browser — no image data leaves the device.","Output is a high-resolution PNG ready for print or large-format display."],
 ["Load your image using the file picker.","Choose the upscaling factor — 2x or 4x.","Wait for the model to process the image.","Download the upscaled PNG."],
 ["4x upscaling on large images is memory-intensive — a 1000x1000 pixel image at 4x produces a 4000x4000 pixel output which requires significant browser memory.","The AI model works best on photographs, illustrations, and artwork — it is less effective on screenshots of text or diagrams with sharp edges.","First load initialises the model which may take a few seconds depending on connection speed."],
 ["The Image Upscaler uses a super-resolution machine learning model to increase the pixel dimensions of an image while preserving and enhancing perceived sharpness. Traditional upscaling — simply stretching pixels — produces blurry results because the algorithm has no information about what the missing pixels should look like. Super-resolution models are trained on millions of image pairs and learn to predict realistic detail when enlarging.",
  "This is useful for a range of practical situations: printing a photo at a larger size than the original resolution supports, recovering usable detail from a low-resolution source image, improving the quality of a compressed JPEG before using it in a presentation, or preparing an image for a large-format banner or poster.",
  "The model runs using TensorFlow.js or a similar browser-compatible inference runtime, which means the model weights are downloaded once and then run on the device's CPU or GPU. On devices with a dedicated GPU, inference is significantly faster because the browser can use WebGL acceleration. On CPU-only devices the process is slower but still produces good results.",
  "2x upscaling is appropriate for most use cases and is faster to process. 4x upscaling produces dramatically larger output files and is intended for cases where the source image is genuinely low resolution — such as a 400x300 pixel photo that needs to be used at 1600x1200.",
  "Because no image data is sent to a server, the tool is suitable for private photographs, client assets, medical images, and any other content where privacy is a concern. Commercial super-resolution APIs charge per image and send data to cloud servers — this tool has no cost and no data transmission.",
  "Image Upscaler is part of the Envizion Tools collection at envizion.work."],
 ["Upscale old family photos before printing at large sizes.","Improve the quality of low-resolution product images for e-commerce listings.","Prepare small source images for use in large presentations or banner designs.","Recover detail from compressed JPEG images before editing in a design tool."],
 ["Test with a small image first to confirm the output quality meets expectations before processing a large file.","4x upscaling of already large images may cause the browser tab to run out of memory — use 2x for images above 2000px wide.","The output PNG is uncompressed — run it through Image Optimizer Pro if you need a smaller file size."],
 ["If the page freezes during 4x processing, the device ran out of memory — use 2x or reduce the input image dimensions first.","If the output looks the same as the input, the upscaling factor may not have been applied — confirm the setting and retry.","If the model does not initialise, check your internet connection — the model weights are downloaded on first use."],
 [("Does this upload my image?","No. The super-resolution model runs entirely in your browser."),
  ("What upscaling factors are available?","2x and 4x."),
  ("Does it work on screenshots?","It works on screenshots but produces better results on photographs and artwork."),
  ("Is it free?","Yes. Image Upscaler is free at envizion.work with no account.")],
 [("Image Optimizer Pro","https://envizion.work/tools/image-optimizer-pro.html"),
  ("Background Remover","https://envizion.work/tools/background-remover.html"),
  ("Bulk WebP Converter","https://envizion.work/tools2/bulk_webp_converter.html"),
  ("Media Library","https://envizion.work/tools/media-library.html")]),

("tools","instantDictionary.html",
 "Instant Dictionary","Word reference tool","Look up definitions, synonyms, etymology, and usage examples instantly — works offline after first load.",
 ["Dictionary","Offline Capable","Fast Lookup","Envizion Tools"],
 ["Search any English word and get definitions, part of speech, synonyms, and example sentences.","Works offline after the first visit — the word data is cached locally.","No tracking, no ads in the lookup results."],
 ["Type a word in the search box.","Press Enter or click Search.","Browse the results — definitions are grouped by part of speech.","Click a synonym to look up that word immediately."],
 ["The dictionary database covers common English words and many technical terms — highly specialised jargon may not be included.","Offline mode requires the browser to have cached the page and data on a prior visit.","Etymology information is available for most words but coverage varies."],
 ["The Instant Dictionary is a fast, clean word reference tool built for students, writers, and professionals who need quick definitions and synonym suggestions without opening a new browser tab or navigating a cluttered online dictionary filled with advertisements and popups.",
  "The tool draws from an open English dictionary dataset that covers definitions, part of speech classifications, example sentences, synonym lists, and where available, etymology — the historical origin and evolution of the word. This is particularly useful for writers trying to understand the precise shade of meaning between two similar words, or for students encountering unfamiliar vocabulary in an academic text.",
  "After the first load, the dictionary data is cached in the browser using the Cache API or IndexedDB, which means subsequent lookups do not require an internet connection. This is valuable in study environments where connectivity may be unreliable, or when using the tool on a device that moves in and out of Wi-Fi coverage.",
  "The lookup interface is designed for speed. Results appear in under a second for most queries. Definitions are grouped by part of speech — noun, verb, adjective, adverb — so the correct meaning for a specific usage context is easy to identify. Synonyms appear as clickable links so that a writer looking for a word can chain through related words quickly without re-typing.",
  "The tool does not collect search queries. Words looked up remain private to the local browser session. There is no account, no search history stored on a server, and no personalisation tracking. It is a reference tool, not a data collection service.",
  "Instant Dictionary is part of the Envizion Tools collection at envizion.work."],
 ["Look up unfamiliar words while reading academic papers or literature.","Find synonyms quickly while writing to avoid repetition.","Check etymology when studying vocabulary or preparing for standardised tests.","Use offline in a study session without needing an internet connection."],
 ["The dictionary covers standard English — highly technical, regional, or newly coined terms may return no results.","Synonym suggestions are not ranked by similarity — review all options before choosing one for a specific context.","Etymology sections indicate approximate historical period and language origin, not a complete linguistic history."],
 ["If a search returns no results, check spelling or try the root form of the word.","If the offline mode does not work, the cache may not have been built — visit the page with an internet connection first.","If synonyms are not showing, the word may be in the database without synonym data — try a broader search."],
 [("Does it work without internet?","Yes, after the first visit the data is cached locally and lookups work offline."),
  ("Is it free?","Yes. Instant Dictionary is free at envizion.work."),
  ("Does it cover British English spelling?","The dataset covers both common US and UK spellings for most words."),
  ("How current is the dictionary?","The dataset covers established English vocabulary. Neologisms and very recent slang may not be included.")],
 [("Tools Guide","https://envizion.work/tools/tools-guide.html"),
  ("Life Tools","https://envizion.work/tools/life-tools.html"),
  ("CodeWeb","https://envizion.work/tools2/CodeWeb.html"),
  ("Envizion Playground","https://envizion.work/tools2/envizion_playground.html")]),

("tools","life-tools.html",
 "Life Tools","Everyday calculators","A collection of practical everyday calculators and planners — BMI, age, unit converters, finance basics, and more.",
 ["Life Calculators","Unit Converters","Finance Tools","Envizion Tools"],
 ["Access a set of everyday calculators covering health, finance, time, and unit conversion.","All calculations run locally — no data is sent anywhere.","No account or sign-in needed."],
 ["Open the Life Tools dashboard.","Choose the calculator category that matches your task.","Enter the values and get the result instantly.","Switch between categories without reloading the page."],
 ["Financial calculators provide estimates — consult a qualified professional for advice on actual financial decisions.","Health metric calculators such as BMI are general reference tools — interpret results in context with professional guidance.","Unit converters cover the most commonly used measurement systems — highly specialised unit systems may not be included."],
 ["Life Tools is a collection of practical everyday calculators grouped into categories covering health metrics, personal finance basics, time and date calculations, and unit conversion. It is designed as a quick-access reference for the kind of calculations that come up frequently in daily life but are tedious to do manually or difficult to remember the formula for.",
  "Health calculators in the collection include BMI (Body Mass Index) using both metric and imperial inputs, estimated calorie needs based on activity level and weight, and basic hydration guidelines. These tools present calculated values as reference figures — they are not medical advice, and the results should be interpreted alongside professional guidance for any health decision.",
  "Finance calculators include loan repayment estimators, compound interest calculators, savings goal planners, and currency conversion using approximate rates. The loan repayment calculator takes principal, interest rate, and term as inputs and shows the monthly payment and total interest paid over the life of the loan. This is useful for quickly comparing different loan scenarios before approaching a bank or lender.",
  "Time and date tools include age calculators that give exact age in years, months, and days from a birth date, day-of-week finders for any date, and duration calculators that compute the number of days, weeks, or months between two dates. These are practical for everything from checking contract deadlines to calculating the exact age of a child for a school enrollment form.",
  "Unit converters cover length (metric and imperial), weight, temperature, volume, area, and speed. All conversions are instant and require no internet connection because the conversion factors are built into the tool. The interface is tabbed by category so the most-used converter is always one click away.",
  "Life Tools is part of the Envizion Tools collection at envizion.work."],
 ["Calculate a loan repayment schedule before applying for a car loan or personal loan.","Convert units for a recipe that uses different measurement systems.","Check how many days remain until a deadline or event.","Calculate BMI as a baseline health reference point."],
 ["Financial estimates are approximate — fees, variable rates, and taxes are not factored in.","Health metrics are reference values only — they are not diagnostic tools.","Currency conversion rates are approximate and not suitable for live trading or commercial transactions."],
 ["If a calculation returns an unexpected result, double-check the input units — mixing metric and imperial inputs is a common source of errors.","If the calculator page does not load correctly, try clearing the browser cache.","If a specific calculator is not available, check the Tools Guide for other Envizion tools that may cover the specific use case."],
 [("Is this free?","Yes. Life Tools is free at envizion.work with no account required."),
  ("Are the financial calculations accurate?","They are accurate estimates based on standard formulas. They do not account for fees, variable rates, or taxes."),
  ("Does it work offline?","Most calculators work offline because they use built-in formulas. Currency rates require a connection to refresh."),
  ("Can I suggest a new calculator?","Use the Contact page at envizion.work to suggest additions.")],
 [("Instant Dictionary","https://envizion.work/tools/instantDictionary.html"),
  ("Tools Guide","https://envizion.work/tools/tools-guide.html"),
  ("PDF to Text","https://envizion.work/tools/pdf-to-text.html"),
  ("U8","https://envizion.work/tools/u8.html")]),

("tools","local_video_image_mask_merger.html",
 "Video & Image Mask Merger","Compositor tool","Layer video and image tracks with masking, chroma key, z-index control, and MediaRecorder export — all in the browser.",
 ["Video Compositor","Chroma Key","Mask Layers","Envizion Tools"],
 ["Stack video and image layers on a canvas with per-layer opacity and z-index controls.","Apply chroma key (green screen) removal to any video layer.","Draw manual mask shapes to isolate regions.","Export the composited output using the browser MediaRecorder API."],
 ["Add video or image assets using the file pickers.","Arrange layers using the z-index controls — higher values sit on top.","Apply chroma key to a layer and set the key colour by sampling from the video.","Draw mask regions on layers that need to be isolated.","Click Export to record the canvas output and download."],
 ["Export quality depends on the browser MediaRecorder codec — Chrome and Edge produce the best results.","Chroma key works best with evenly lit, saturated green or blue screens — shadows and mixed lighting reduce accuracy.","Long composite recordings may produce large files — monitor available disk space before exporting."],
 ["The Video and Image Mask Merger is a multi-layer compositor that runs entirely in the browser. It allows users to stack video and image layers on a shared canvas, apply compositing operations such as chroma key and manual masking, and record the output as a video file using the browser MediaRecorder API.",
  "This type of tool is normally the domain of professional video editing software such as Adobe Premiere, DaVinci Resolve, or Final Cut Pro. Those applications require powerful hardware, significant storage, and either large upfront costs or subscription fees. The Video and Image Mask Merger brings the core compositing workflow — layer stacking, transparency, chroma key — into a browser tab with no installation and no cost.",
  "Chroma key, commonly called green screen, works by identifying pixels in a specified colour range and setting them to transparent. The tool allows the user to click a point on the video frame to sample the key colour automatically. A tolerance slider controls how aggressively nearby colours are included in the key — higher tolerance removes more of the background but may also affect foreground subjects that share hues with the key colour.",
  "Z-index controls determine layer order. A video layer with a higher z-index appears in front of layers below it. This allows a foreground subject — keyed out from a green screen — to appear in front of a background image or video layer, creating the appearance of a composite scene.",
  "Manual masking allows the user to draw a shape on a layer to define the visible region. This is useful when the background cannot be cleanly keyed because it shares colours with the subject, or when a specific rectangular region of a layer needs to be isolated. The mask is drawn on a canvas overlay and applied in real time.",
  "Video and Image Mask Merger is part of the Envizion Tools collection at envizion.work."],
 ["Composite a talking-head video onto a custom background for YouTube or educational content.","Overlay an image logo onto a video track for branding.","Test chroma key settings before investing in professional post-production software.","Create simple multi-layer video compositions for social media content."],
 ["Export the raw layers separately before compositing in case the output needs to be redone.","Test chroma key settings on a short clip before recording a full composited export.","Keep source files available — the exported video cannot be decomposed back into separate layers."],
 ["If chroma key leaves a green fringe, reduce the tolerance slightly and increase the edge feather.","If layers are out of order, check the z-index values — higher numbers appear on top.","If the export is blank or black, the MediaRecorder may have failed to start — refresh and try on a shorter duration."],
 [("Does this tool upload video?","No. Everything runs locally in the browser using Canvas and MediaRecorder APIs."),
  ("What export format does it produce?","Output format depends on the browser codec — typically WebM or MP4."),
  ("Does chroma key work on non-green backgrounds?","Yes. You can sample any colour as the key colour — blue screen and other colours work."),
  ("Is it free?","Yes. Free at envizion.work with no account.")],
 [("Advanced Video Watermarker","https://envizion.work/tools/advanced-video-watermarker.html"),
  ("MediaForge","https://envizion.work/tools/mediaforge.html"),
  ("Vocal Music Separator","https://envizion.work/tools/vocal-music-separator.html"),
  ("Pro Studio Editor","https://envizion.work/tools2/envizion_pro_studio_editor.html")]),

("tools","media-library.html",
 "Media Library","Local media browser","Browse and manage local media files in a visual gallery — images, audio, and video in one organised interface.",
 ["Media Manager","Local Files","Gallery View","Envizion Tools"],
 ["Load a folder of local media files into a visual gallery interface.","Browse images, audio, and video files with previews.","Organise and filter by file type."],
 ["Open the Media Library and load a folder using the folder picker.","Browse the gallery — images show as thumbnails, audio shows waveforms, video shows frame previews.","Use the filter tabs to view only images, only audio, or only video.","Click any item to open a full preview."],
 ["The File System Access API is used for folder browsing — this is supported in Chrome and Edge but not in Firefox or Safari.","Very large folders with thousands of files may take a moment to index — progress is shown during loading.","No files are moved, copied, or modified — the library is read-only."],
 ["The Media Library is a browser-based local file browser that generates a visual gallery from a folder of media files on your device. It gives a fast, organised view of images, audio recordings, and video files without opening File Explorer, Finder, or a dedicated media management application.",
  "The tool uses the File System Access API, which allows the browser to request read access to a folder. The user grants permission through a system dialog, and the browser then indexes the folder contents and generates previews. Image files are displayed as thumbnails. Audio files show basic metadata such as duration and format. Video files show a frame capture for quick identification.",
  "Filter tabs allow the user to narrow the view to a single media type. This is useful when a folder contains mixed content — for example, a project folder that has both reference photos and audio recordings. Switching to the image filter shows only the photos, and switching to audio shows only the recordings.",
  "Clicking any item in the gallery opens a full-size preview panel. For images, the full resolution file renders in the panel. For audio, a player controls let the user play, pause, and scrub the recording. For video, a player with playback controls allows review of the content without opening a separate application.",
  "Because the tool operates with read-only access to the folder, it cannot modify, delete, move, or rename any file. It is a viewer only. This makes it safe to use on important folders without risk of accidental file changes.",
  "Media Library is part of the Envizion Tools collection at envizion.work."],
 ["Review a folder of photos from a shoot before selecting files for editing.","Listen through audio recordings from a session before choosing takes.","Get a quick visual inventory of all media assets in a project folder.","Locate a specific video file in a large folder without opening each one manually."],
 ["Grant folder access only to directories you are comfortable sharing with a browser tab — the browser requests read-only access.","Very large folders may cause slow initial loading — start with a smaller test folder if the count is in the thousands.","The tool is a viewer — any editing or organisation must be done in a file manager or media application."],
 ["If the folder picker does not open, the browser may not support the File System Access API — use Chrome or Edge.","If thumbnails do not load, the files may be in an unsupported format — check the supported formats list in the tool.","If the gallery appears empty, confirm the folder contains image, audio, or video files."],
 [("Does this upload my files?","No. The browser reads files locally using the File System Access API. Nothing is transmitted."),
  ("Does it work in Firefox?","Firefox does not support the File System Access API — use Chrome or Edge."),
  ("Can I delete files from the gallery?","No. The tool is read-only. Files can only be viewed."),
  ("Is it free?","Yes. Media Library is free at envizion.work.")],
 [("Image Optimizer Pro","https://envizion.work/tools/image-optimizer-pro.html"),
  ("Voice Recorder","https://envizion.work/tools/voice-recorder.html"),
  ("MediaForge","https://envizion.work/tools/mediaforge.html"),
  ("MP4 to MP3","https://envizion.work/tools/mp4tomp3.html")]),

("tools","mediaforge.html",
 "MediaForge","Advanced media processor","Trim, merge, convert, compress, and export audio and video files entirely in the browser.",
 ["Media Processing","Trim & Merge","Browser-based","Envizion Tools"],
 ["Trim video and audio files to specific start and end points.","Merge multiple clips into a single output file.","Convert between common media formats with quality controls."],
 ["Load one or more media files using the file picker.","Set trim points using the timeline controls.","Add additional files to merge in sequence.","Choose the output format and quality.","Export and download."],
 ["Processing speed depends on file size and device performance — test on short clips first.","The merge feature joins clips in sequence — it does not mix audio tracks from separate files simultaneously.","Some format conversions require codec support in the browser — Chrome and Edge have the broadest support."],
 ["MediaForge is the general-purpose media processing tool in the Envizion Tools collection. It combines trimming, merging, format conversion, and basic compression into a single interface for handling common audio and video editing tasks without installing desktop software.",
  "Video trimming is the most frequently used feature. A timeline shows the full duration of the loaded clip. The user sets an in-point and an out-point by dragging handles on the timeline or entering specific timecode values. The trimmed section is then exported as a new file. This workflow is faster than opening a full non-linear editor for a simple cut.",
  "The merge feature allows multiple clips to be queued and joined end-to-end in the order they appear in the queue. This is useful for combining multiple recordings of the same event, stitching together separate segments of a tutorial, or assembling clips from different takes into a single file for review. The merged output is a single downloadable file in the chosen format.",
  "Format conversion in MediaForge supports the most common container and codec combinations available in browser environments. MP4 with H.264 video and AAC audio is the most broadly compatible output for sharing. WebM with VP9 is smaller and suited for web embedding. MP3 is available for audio-only exports.",
  "Compression settings allow the user to trade file size against quality. A quality slider from 1 to 100 controls the target encoding quality. For video, values between 70 and 85 produce good results for most sharing and archiving purposes. Values below 50 produce noticeably reduced quality but significantly smaller files.",
  "MediaForge is part of the Envizion Tools collection at envizion.work."],
 ["Trim a long screen recording down to the relevant section before sharing.","Merge daily video log clips into a single weekly file.","Convert a MOV recording from an iPhone to MP4 for Windows compatibility.","Compress a large video file before emailing or uploading to a platform with file size limits."],
 ["Keep originals before trimming or converting — the output is a new file but the original is not automatically preserved.","Test trim points on a short preview before exporting the full file.","Check the output file in a media player before deleting the source files."],
 ["If the timeline does not load, the file format may not be supported — try converting to MP4 first.","If the merge output has audio sync issues, check that all input clips have the same frame rate.","If export stalls at 99%, the file may be very large — wait, or reduce the output quality setting."],
 [("Does it upload my files?","No. Processing happens entirely in the browser."),
  ("What formats are supported?","Input: MP4, WebM, MOV, MP3, WAV, OGG. Output: MP4, WebM, MP3."),
  ("Can I merge audio and video tracks?","MediaForge merges clips sequentially — for mixing separate audio and video tracks, use the Video and Image Mask Merger."),
  ("Is it free?","Yes. MediaForge is free at envizion.work.")],
 [("MP4 to MP3","https://envizion.work/tools/mp4tomp3.html"),
  ("Advanced Video Watermarker","https://envizion.work/tools/advanced-video-watermarker.html"),
  ("Vocal Music Separator","https://envizion.work/tools/vocal-music-separator.html"),
  ("Voice Recorder","https://envizion.work/tools/voice-recorder.html")]),

("tools","mediaplayer.html",
 "Media Player","Local media player","Play video and audio files directly in the browser — no plugins, no codec packs, no upload.",
 ["Video Player","Audio Player","Local Playback","Envizion Tools"],
 ["Play local video and audio files in a clean browser-based player.","Supports MP4, WebM, MP3, WAV, OGG, and more.","Keyboard shortcuts for play, pause, seek, and volume."],
 ["Load a file using the file picker or drag and drop.","Use the on-screen controls or keyboard shortcuts to play, pause, seek, and adjust volume.","Use the fullscreen button to expand video to full screen.","Load another file without refreshing the page."],
 ["Supported formats depend on the browser codec support — MP4 and MP3 work in all modern browsers.","Fullscreen mode is standard browser fullscreen — press Escape to exit.","Very large video files load progressively — playback can begin before the full file is in memory."],
 ["The Envizion Media Player is a simple, clean browser-based player for local video and audio files. It is designed for situations where the user needs to quickly review a media file without the overhead of opening a dedicated media application such as VLC, Windows Media Player, or QuickTime.",
  "The player accepts files through the browser file picker or via drag and drop. Once loaded, the file plays in a standard HTML5 video or audio element with a custom control bar covering play/pause, seek, volume, playback speed, and fullscreen. No file is uploaded anywhere — the browser reads it directly from local storage.",
  "Keyboard shortcuts make the player fast to operate: Space bar toggles play/pause, left and right arrow keys seek backward and forward by five seconds, up and down arrows adjust volume, and F toggles fullscreen. These shortcuts work while the player has focus, which is the default after a file loads.",
  "Playback speed can be adjusted from 0.5x to 2x. This is useful for reviewing recordings at 1.5x or 2x speed to check content quickly, or for slowing audio to 0.75x to transcribe speech more accurately. The speed control is available in the control bar.",
  "The player supports multiple file formats subject to browser codec availability. MP4 with H.264 video is supported universally. WebM with VP8 or VP9 is supported in Chrome and Firefox. MOV files play in Safari. MP3, WAV, and OGG audio formats play in all modern browsers.",
  "Media Player is part of the Envizion Tools collection at envizion.work."],
 ["Review a downloaded video recording before sharing or editing.","Listen through audio interview recordings with speed control for faster transcription.","Play a local music file without opening a full media library application.","Check the audio sync and quality of a freshly exported video file."],
 ["Close other browser tabs if playback stutters on large video files — memory availability affects performance.","If a video plays without audio, check the system volume and the player volume control separately.","Files are not saved or cached by the player — the file picker must be used again after refreshing."],
 ["If the file does not play, the format may not be supported in the current browser — try Chrome or VLC for unsupported formats.","If video plays but audio is missing, the audio codec may not be supported — MP4 with AAC audio has the broadest support.","If fullscreen does not work, the browser may be blocking the fullscreen API — check site permissions."],
 [("Does it upload my files?","No. Files are read locally. Nothing is transmitted to a server."),
  ("What formats are supported?","MP4, WebM, MOV, MP3, WAV, OGG, and other formats supported by the browser codec."),
  ("Can I play playlists?","The player handles one file at a time — load the next file when the current one finishes."),
  ("Is it free?","Yes. Media Player is free at envizion.work.")],
 [("Media Library","https://envizion.work/tools/media-library.html"),
  ("MediaForge","https://envizion.work/tools/mediaforge.html"),
  ("MP4 to MP3","https://envizion.work/tools/mp4tomp3.html"),
  ("Voice Recorder","https://envizion.work/tools/voice-recorder.html")]),

("tools","mp4tomp3.html",
 "MP4 to MP3","Audio extractor","Extract the audio track from any MP4 video file and download it as an MP3 — entirely in the browser.",
 ["Audio Extraction","MP4 to MP3","No Upload","Envizion Tools"],
 ["Load an MP4 video file and extract the audio track as an MP3.","Choose the output bitrate for file size versus quality balance.","Download the MP3 without any server involvement."],
 ["Load an MP4 file using the file picker.","Choose the output bitrate — 128kbps for voice, 192kbps or 320kbps for music.","Click Extract and wait for processing.","Download the MP3 file."],
 ["Processing time is proportional to the video file duration and the device CPU speed.","The tool extracts the existing audio track — it does not mix or edit multiple audio streams.","If the MP4 has no audio track, the output will be silent or the tool will indicate no audio was found."],
 ["The MP4 to MP3 tool extracts the audio track from a video file and saves it as an MP3 audio file. This is one of the most commonly needed media conversion tasks — a video recording contains a lecture, podcast, interview, or piece of music, and the user needs just the audio in a format compatible with audio players, podcast apps, or audio editors.",
  "The conversion runs using the Web Audio API and the browser MediaRecorder or an FFmpeg WebAssembly module depending on implementation. The video file is decoded in the browser, the audio stream is isolated, and the audio data is re-encoded at the chosen bitrate as an MP3. The resulting file is offered as a download with no server upload required.",
  "Bitrate selection affects both output quality and file size. A bitrate of 128 kilobits per second is sufficient for speech — phone calls, lectures, podcasts, and audiobooks. Higher quality audio content such as music benefits from 192 or 320 kilobits per second, which preserves more of the frequency range and dynamic range of the original recording. Very high bitrates above 320 do not meaningfully improve quality for typical source material.",
  "The tool handles standard MP4 files. MP4 is a container format that can hold different video and audio codecs inside — H.264 video with AAC audio is the most common combination and is fully supported. Other audio codecs inside MP4 containers such as AC-3 may require additional processing steps in some browsers.",
  "A common use case is extracting audio from recorded video meetings. Video conferencing applications such as Zoom and Microsoft Teams produce MP4 recordings. If the meeting contains a lecture, presentation, or interview that only the audio is needed for, the MP4 to MP3 tool handles the extraction in under a minute for most meeting lengths.",
  "MP4 to MP3 is part of the Envizion Tools collection at envizion.work."],
 ["Extract the audio from a recorded lecture or webinar for listening on a commute.","Pull the audio track from a music video for use in a playlist.","Convert a recorded podcast video to audio for distribution on podcast platforms.","Extract interview audio from a video recording for transcription."],
 ["Choose the lowest bitrate that meets the quality need — smaller files are easier to share.","Keep the original MP4 if the extracted audio is needed again later.","Check the output length matches the source video to confirm the full audio was extracted."],
 ["If the output is silent, the MP4 may not have an audio track — check the source file in Media Player first.","If extraction stalls, the file may be very long or large — try a shorter clip first.","If the output sounds distorted, the browser codec may not handle the specific audio format in the MP4 — try Chrome."],
 [("Does it upload the video?","No. Extraction runs entirely in the browser."),
  ("What bitrates are available?","Common options: 96kbps, 128kbps, 192kbps, 320kbps."),
  ("Does it work with MOV files?","MOV extraction may work depending on browser codec support — try with an MP4 first."),
  ("Is it free?","Yes. MP4 to MP3 is free at envizion.work.")],
 [("MediaForge","https://envizion.work/tools/mediaforge.html"),
  ("Vocal Music Separator","https://envizion.work/tools/vocal-music-separator.html"),
  ("Voice Recorder","https://envizion.work/tools/voice-recorder.html"),
  ("Media Player","https://envizion.work/tools/mediaplayer.html")]),

("tools","pdf-to-text.html",
 "PDF to Text","Text extraction tool","Extract readable text from any PDF file locally — no upload, no OCR service subscription, no data transmitted.",
 ["PDF Text Extraction","Local Processing","No Upload","Envizion Tools"],
 ["Load a PDF file and extract all readable text from it.","Text is displayed in a copyable panel and can be downloaded as a plain text file.","Everything runs in the browser — no file is sent to a server."],
 ["Load a PDF using the file picker.","Wait for the text extraction to complete.","Copy the text from the output panel, or click Download to save as a .txt file.","Use the page selector to extract text from specific pages only if needed."],
 ["Text extraction works on digitally created PDFs — scanned documents that are image-only require OCR software which is outside the scope of this tool.","Formatting such as columns, tables, and headers may not be preserved in the plain text output.","Very large PDFs with hundreds of pages may take a moment to process."],
 ["The PDF to Text tool extracts the text content from PDF files and presents it in a copyable, plain-text format. It is designed for researchers, students, writers, and professionals who need to access the text inside a PDF without the formatting constraints of the PDF viewer, and without uploading the document to a cloud service.",
  "PDFs are a universal document format, but they present a challenge when the text inside needs to be reused. Copying text from a PDF reader often produces formatting artefacts — broken line breaks, hyphenated words split across lines, or scrambled column order. Dedicated text extraction handles the document structure more cleanly and produces output that is easier to paste into a word processor, text editor, or database.",
  "The tool uses PDF.js, Mozilla's open source PDF rendering library, which runs entirely in the browser. PDF.js parses the PDF file structure, identifies the text content objects within each page, and assembles them into readable output. Because PDF.js is a well-maintained library used in Firefox's built-in PDF viewer, it has broad format support and handles most standard PDF variants correctly.",
  "Digitally created PDFs — those produced by Word, Google Docs, LaTeX, or a PDF printer — contain actual text data in the file structure and extract cleanly. Scanned documents that were photographed or scanned as images and then saved as PDF contain no text data — they are images of text, not text itself. Extracting from those files requires optical character recognition software, which is a different tool class.",
  "The extracted text is displayed in a scrollable panel. The user can select all and copy, or click the Download button to save the output as a .txt file named after the original PDF. A page range selector allows extraction of specific page ranges for large documents where only a section is needed.",
  "PDF to Text is part of the Envizion Tools collection at envizion.work."],
 ["Extract text from a research paper PDF to paste into a notes document.","Pull contract text from a PDF for searching and cross-referencing.","Extract text from an e-book PDF for reading in a plain text environment.","Convert PDF documentation to text for processing in a script or analysis tool."],
 ["Scanned PDFs require OCR — check if the PDF was digitally created before attempting extraction.","Formatting will not be preserved — the output is plain text without columns, tables, or styling.","For legal or official documents, verify the extracted text matches the original before relying on it."],
 ["If the output is empty, the PDF may be a scanned image — open the file in a PDF viewer and check if you can select text.","If the text appears scrambled, the PDF may use non-standard encoding — try copying directly from a PDF viewer for that file.","If the tool is slow, the PDF has many pages — use the page range selector to extract a specific section."],
 [("Does it upload the PDF?","No. PDF.js runs in the browser and reads the file locally."),
  ("Does it work on scanned PDFs?","No. Scanned documents are images — text extraction requires OCR software."),
  ("Can I extract text from specific pages?","Yes. Use the page range selector to choose the start and end pages."),
  ("Is it free?","Yes. PDF to Text is free at envizion.work.")],
 [("PDF Merger","https://envizion.work/tools/pdfmerger.html"),
  ("PDF to Text Pro","https://envizion.work/tools/pdftotext.html"),
  ("Universal File Encryption","https://envizion.work/tools/universal-file-encryption.html"),
  ("Secure PDF Compressor","https://envizion.work/tools2/secure_pdf_compressor.html")]),

("tools","pdfmerger.html",
 "PDF Merger","PDF combining tool","Combine multiple PDF files into one in the browser — drag to reorder pages, then download the merged result.",
 ["PDF Merge","Page Reorder","No Upload","Envizion Tools"],
 ["Add multiple PDF files and merge them into a single PDF.","Drag to reorder the files before merging.","Download the merged PDF with no server upload."],
 ["Add two or more PDF files using the file picker.","Drag the file thumbnails to set the order they will appear in the merged output.","Click Merge and wait for processing.","Download the combined PDF."],
 ["All PDF files must be valid — corrupt or password-protected files will cause errors.","Very large PDFs with many pages increase processing time.","The output PDF combines the pages in the order shown — check the order before merging."],
 ["The PDF Merger combines multiple PDF documents into a single file. It is a frequently needed task in professional, academic, and personal contexts — assembling chapters of a report, combining invoices for a submission, joining scanned documents, or merging reference materials into a single readable file.",
  "The tool uses pdf-lib, a browser-compatible PDF manipulation library, to load each source PDF, read its pages, and write them in sequence into a new PDF document. The new document is generated entirely in the browser without any server-side processing, which means files containing sensitive information — financial documents, legal contracts, medical records — are handled privately.",
  "The reorder interface allows files to be dragged into the correct sequence before merging. For example, if a report has a cover page as one PDF, a body as another, and an appendix as a third, they can be placed in the correct order in the merge queue. The merged output will contain the pages of each file in the sequence they appear in the queue.",
  "Each source file is shown as a queue item with its filename and page count. This allows quick verification that the correct files have been loaded and that the expected number of pages is present before the merge runs.",
  "After merging, the output PDF can be downloaded with a filename that combines the source filenames or uses a user-specified name. The output is a standard PDF that opens in any PDF viewer.",
  "PDF Merger is part of the Envizion Tools collection at envizion.work."],
 ["Merge monthly invoice PDFs into a single document for accounting submission.","Combine chapters of a report into a single submission file.","Join scanned pages that were saved as separate PDF files into one document.","Assemble a portfolio from individual PDF files for a single downloadable version."],
 ["Check the page order in the queue before merging — the order cannot be changed after the output is generated.","Password-protected PDFs cannot be merged — unlock them first in a PDF reader.","Keep the original files in case the merge needs to be redone with a different order."],
 ["If a file fails to load, it may be corrupt or password-protected — check the file in a PDF reader first.","If the merged output has missing pages, one of the source files may have been a scanned image — check each source file individually.","If the download does not start, try a different browser."],
 [("Does it upload the PDFs?","No. pdf-lib runs in the browser and processes files locally."),
  ("Can I reorder pages within a single PDF?","This version reorders whole files — for page-level reordering, use the PDF Merger Pro tool."),
  ("Is it free?","Yes. PDF Merger is free at envizion.work."),
  ("What is the maximum number of files?","There is no hard limit — practical limits depend on device memory and the total page count.")],
 [("PDF to Text","https://envizion.work/tools/pdf-to-text.html"),
  ("Secure PDF Compressor","https://envizion.work/tools2/secure_pdf_compressor.html"),
  ("PDF Merger Pro","https://envizion.work/tools2/pdf_merger.html"),
  ("Universal File Encryption","https://envizion.work/tools/universal-file-encryption.html")]),

("tools","steganavault.html",
 "SteganaVault","Steganography tool","Hide secret text messages inside image files and retrieve them later — entirely in the browser with no server.",
 ["Steganography","Hidden Messages","Privacy Tool","Envizion Tools"],
 ["Embed a secret text message invisibly into a PNG image file.","Retrieve the hidden message from a SteganaVault image by loading it and decoding.","No server, no account, no transmission of data."],
 ["To hide a message: load a PNG image, type your message, click Encode, and download the output image.","To retrieve a message: load a SteganaVault-encoded image and click Decode — the hidden text appears in the output panel.","The output image looks identical to the input to the naked eye."],
 ["The carrier image must be a PNG — JPEG compression destroys the hidden data because it alters pixel values.","Message length is limited by the image dimensions — larger images can carry more data.","Anyone with access to SteganaVault and the encoded image can retrieve the message — this is obscurity, not encryption. Combine with encrypted text for secure communication."],
 ["SteganaVault is a browser-based steganography tool. Steganography is the practice of hiding information inside other data — in this case, hiding a text message inside the pixel data of an image file. The technique is different from encryption: encryption scrambles data so it cannot be read, while steganography hides data so that its existence is not obvious.",
  "The tool uses the least significant bit technique. In a standard RGB image, each pixel is defined by three colour channel values — red, green, and blue — each ranging from 0 to 255. The least significant bit of each channel value contributes the smallest amount to the final colour. Modifying only these bits produces changes so minor that they are visually imperceptible, but they are detectable programmatically.",
  "To encode a message, the tool converts the text to binary. Each bit of the message is stored in the least significant bit of successive pixel channel values. A termination sequence marks the end of the message so the decoder knows where to stop reading. The resulting image is saved as a new PNG — JPEG cannot be used because its lossy compression would alter the pixel values and destroy the hidden data.",
  "To decode, the tool reads the least significant bits from the pixel channels in sequence, reconstructs the binary data, and converts it back to text. The original message is displayed in the output panel.",
  "SteganaVault is designed for privacy-conscious users who want a simple way to embed notes or messages in images without obvious indicators. It is useful for watermarking ownership information into image files, passing information through channels that only accept images, and learning about steganographic techniques in a hands-on way.",
  "SteganaVault is part of the Envizion Tools collection at envizion.work."],
 ["Embed ownership information into an image as a hidden watermark.","Send a private note hidden in a publicly shareable image.","Learn about steganographic encoding techniques interactively.","Store a small amount of reference data inside a related image file."],
 ["Use PNG as the carrier image — any JPEG processing of the output will destroy the hidden data.","For sensitive messages, encrypt the text before encoding — steganography alone is not a security guarantee.","Keep a copy of the original image in case the encoded version needs to be re-examined."],
 ["If decoding returns garbled text, the image may have been re-saved as JPEG after encoding — JPEG destroys the LSB data.","If the encode fails, the message may be too long for the image dimensions — use a larger image or a shorter message.","If the output image looks visibly different from the input, there may be a processing error — reload and try again."],
 [("Is steganography the same as encryption?","No. Steganography hides the existence of the message. Encryption scrambles it. Combine both for best security."),
  ("What image formats are supported?","PNG for both input and output. JPEG is not supported as a carrier."),
  ("How long can the hidden message be?","Message capacity depends on the image dimensions — a 1000x1000 pixel image can hold approximately 375,000 characters."),
  ("Is it free?","Yes. SteganaVault is free at envizion.work.")],
 [("Universal File Encryption","https://envizion.work/tools/universal-file-encryption.html"),
  ("Secure Converter","https://envizion.work/tools2/secure_converter.html"),
  ("Background Remover","https://envizion.work/tools/background-remover.html"),
  ("Image Optimizer Pro","https://envizion.work/tools/image-optimizer-pro.html")]),

("tools","teleprompter.html",
 "Teleprompter","Scrolling script tool","A clean auto-scrolling teleprompter for recording videos, presentations, or speeches — adjustable speed, large text, browser-based.",
 ["Teleprompter","Auto Scroll","Presentation Tool","Envizion Tools"],
 ["Paste your script and it scrolls automatically at a controlled speed.","Adjust text size and scroll speed to match your reading pace.","Use in fullscreen mode for an uncluttered reading surface."],
 ["Paste your script text into the input panel.","Set the font size and scroll speed using the sliders.","Click Start to begin auto-scrolling.","Use the pause button or spacebar to pause mid-script."],
 ["Scroll speed is adjustable in real time while the script is running — use the slider to slow down or speed up without stopping.","Mirror mode flips the text horizontally for use with physical teleprompter mirror hardware.","The tool works best in fullscreen on a secondary monitor or tablet propped near the camera."],
 ["The Teleprompter is a browser-based auto-scrolling script reader designed for video creators, public speakers, educators, and presenters who need to deliver spoken content accurately without reading from a paper or looking away from the camera. A teleprompter keeps the script at eye level and scrolls at the speaker's reading pace.",
  "Professional teleprompter hardware costs hundreds to thousands of dollars and requires dedicated equipment. Software teleprompters on desktop require installation. The Envizion Teleprompter runs in any browser tab on any device — a laptop propped next to a camera, a tablet mounted beside a monitor, or a phone held below a webcam all work as effective teleprompter setups.",
  "The interface shows the script text in large, high-contrast letters on a dark background. The default styling is optimised for easy reading at a distance — white text on black at a large default font size. Font size and scroll speed are both adjustable. The speed adjustment is a continuous slider so the presenter can slow down for complex content and speed up for familiar sections without stopping the scroll.",
  "Pause and resume are available via an on-screen button or the spacebar. This allows the presenter to pause for a question, take a breath, or recover from a misspoken line without losing their place in the script.",
  "Mirror mode reverses the text horizontally. Physical teleprompter rigs use a beam-splitter mirror that reflects the screen image toward the speaker while the camera shoots through it from behind. The mirrored text on the screen appears correctly oriented when reflected in the mirror. This mode is only needed with physical mirror hardware — standard on-screen use does not require mirroring.",
  "Teleprompter is part of the Envizion Tools collection at envizion.work."],
 ["Read a prepared speech or presentation to camera without losing eye contact.","Record YouTube video content with a scripted voiceover delivered naturally.","Practice a presentation at home with adjustable pacing.","Use with mirror hardware for a professional broadcast-style setup."],
 ["Rehearse the script at least once to identify sections that need slower scrolling.","Set the speed slightly slower than comfortable — nerves during recording often cause faster reading than practice.","Use fullscreen mode to eliminate distractions from the browser UI."],
 ["If scrolling jumps instead of flowing smoothly, reduce the scroll speed setting.","If the text is hard to read at distance, increase the font size and reduce the viewing distance.","If the spacebar pause does not respond, click the teleprompter panel to give it keyboard focus first."],
 [("Can I adjust the speed while recording?","Yes. The speed slider is live and adjusts scrolling without stopping."),
  ("Does mirror mode work for all setups?","Mirror mode is for physical mirror hardware only — standard recording setups should leave it off."),
  ("Is it free?","Yes. Teleprompter is free at envizion.work with no account."),
  ("Can I load a script file?","You can paste text directly — file loading from TXT or DOCX depends on the current version.")],
 [("Voice Recorder","https://envizion.work/tools/voice-recorder.html"),
  ("Life Tools","https://envizion.work/tools/life-tools.html"),
  ("Tools Guide","https://envizion.work/tools/tools-guide.html"),
  ("Envizion Playground","https://envizion.work/tools2/envizion_playground.html")]),

("tools","universal-file-encryption.html",
 "Universal File Encryption","Browser encryption tool","Encrypt and decrypt any file using AES-256 in the browser — no server, no key storage, fully local.",
 ["AES Encryption","File Security","No Upload","Envizion Tools"],
 ["Encrypt any file with a password using AES-256.","Decrypt previously encrypted files using the same password.","Nothing leaves the device — the entire process runs in the browser."],
 ["Load the file you want to encrypt using the file picker.","Enter a strong password.","Click Encrypt and download the encrypted output file.","To decrypt: load the encrypted file, enter the same password, and click Decrypt."],
 ["The password is not stored anywhere — if it is forgotten, the file cannot be decrypted.","Encrypted files are not compressed — the output will be approximately the same size as the input.","AES-256 is a strong, industry-standard cipher — the security depends entirely on the strength of the password chosen."],
 ["Universal File Encryption uses the AES-256 encryption standard implemented via the Web Crypto API in the browser. It allows any file — documents, images, archives, executables, or any other format — to be encrypted with a user-supplied password. The encrypted output can only be decrypted with the same password. No encryption key or file data is transmitted to any server.",
  "AES-256 (Advanced Encryption Standard with a 256-bit key) is one of the most widely used and trusted symmetric encryption algorithms. It is used by governments, financial institutions, and security-conscious organisations worldwide. A 256-bit key means there are 2 to the power of 256 possible keys — a number so large that brute force attacks are not computationally feasible with any foreseeable hardware.",
  "The Web Crypto API, which is built into all modern browsers, provides a native implementation of AES-256 that does not require any external library. The browser handles key derivation from the password using PBKDF2 with a random salt, and then encrypts the file data using AES-GCM mode. The salt and the initialisation vector are stored in the header of the encrypted file so that decryption can reconstruct the key correctly.",
  "The encrypted output file is a binary file with a custom extension or the same extension with an encryption marker appended. It looks like random data to any program that tries to open it without the correct password. The file can be stored anywhere — cloud storage, USB drives, email attachments — without exposing its contents.",
  "Decryption requires loading the encrypted file and entering the same password. The tool derives the key from the password using the salt stored in the file header, decrypts the data, and offers the original file as a download. If the wrong password is entered, decryption fails and no file is produced.",
  "Universal File Encryption is part of the Envizion Tools collection at envizion.work."],
 ["Encrypt sensitive documents before storing them on cloud storage services.","Protect confidential files before sending via email.","Secure personal records such as identification documents, financial records, or medical files.","Encrypt files on a USB drive before sharing it physically."],
 ["Store the password in a password manager — it cannot be recovered if lost.","Keep an unencrypted backup in a separate secure location before encrypting the only copy.","Use a strong password — at least 12 characters with numbers, symbols, and mixed case."],
 ["If decryption fails, confirm the exact password — even a single character difference produces a completely different key.","If the encrypted file appears corrupted, it may have been modified after encryption — encrypted files must not be altered.","If the browser reports a crypto error, the file may not be a valid encrypted output from this tool."],
 [("Is the password sent to a server?","No. The password is used only locally by the Web Crypto API."),
  ("What encryption standard is used?","AES-256 in GCM mode with PBKDF2 key derivation."),
  ("Can I encrypt any file type?","Yes. Any file format can be encrypted."),
  ("Is it free?","Yes. Universal File Encryption is free at envizion.work.")],
 [("Secure Converter","https://envizion.work/tools2/secure_converter.html"),
  ("Secure PDF Compressor","https://envizion.work/tools2/secure_pdf_compressor.html"),
  ("SteganaVault","https://envizion.work/tools/steganavault.html"),
  ("PDF Merger","https://envizion.work/tools/pdfmerger.html")]),

("tools","vocal-music-separator.html",
 "Vocal & Music Separator","Audio stem separator","Separate vocals from instrumental music in the browser using an on-device AI model — no upload, no subscription.",
 ["Vocal Separation","Stem Splitting","AI Audio","Envizion Tools"],
 ["Load an audio file and separate the vocal track from the instrumental background.","Download vocals and instrumentals as separate audio files.","Entirely on-device — nothing is transmitted to a server."],
 ["Load an MP3, WAV, or OGG audio file.","Click Separate and wait for the model to process.","Download the isolated vocal track and/or the instrumental track."],
 ["Processing time depends on track length and device performance — longer tracks take proportionally longer.","The AI model works best on popular music with a clear lead vocal — heavily layered or distorted audio produces less accurate separation.","Model initialisation on first use may take a moment as weights are downloaded."],
 ["The Vocal and Music Separator uses an on-device audio source separation model to isolate the vocal track from the instrumental background of a music recording. This process, technically known as music source separation or demixing, was historically only possible with professional audio workstations or expensive cloud APIs. Running it in the browser on consumer hardware makes it accessible without cost or data sharing.",
  "The technique uses a neural network trained on paired vocal and instrumental audio data. The model learns to identify the acoustic characteristics of human voices — frequency range, formant patterns, temporal dynamics — and separate them from background instrumentation. The result is two audio streams: one containing primarily vocal content, and one containing primarily the instrumental accompaniment.",
  "Practical uses include creating karaoke tracks from regular music recordings, isolating vocals for remix and production work, studying melodic lines without instrumental interference, extracting clean instrumental beds for use as background music in video productions, and practicing singing along to an a cappella version of a song.",
  "The separation is not perfect. High-frequency consonants in vocals can share frequency ranges with instruments such as cymbals and hi-hats, causing some bleed. Very dense mixes where vocals are heavily layered with close harmonics present a harder problem. The output is best described as a high-quality estimate rather than a perfect split.",
  "Because the model runs in the browser using WebAssembly and an audio processing library, no audio data is sent to any server. This matters for producers working with unreleased material, users with licensed music they do not want transmitted, and anyone with privacy concerns about cloud audio processing services.",
  "Vocal and Music Separator is part of the Envizion Tools collection at envizion.work."],
 ["Create karaoke versions of songs for practice or entertainment.","Extract instrumentals from recordings for use as royalty-considered background music in video projects.","Isolate vocals for pitch correction, analysis, or remix production.","Study the melodic content of a recording without the distraction of the full mix."],
 ["The separated tracks will have some residual bleed — this is expected and is not a bug.","For best results use high-quality source audio (320kbps MP3 or WAV) rather than heavily compressed files.","Keep the original mixed audio — the separated tracks cannot be recombined to the exact original."],
 ["If the vocal track contains heavy instrumental bleed, the source mix may be too dense — simpler arrangements separate more cleanly.","If processing stalls, the track may be very long — try with a shorter excerpt first.","If the model fails to initialise, check the internet connection — model weights are downloaded on first use."],
 [("Does it upload my audio?","No. The separation model runs entirely in the browser."),
  ("What audio formats are supported?","MP3, WAV, and OGG as input. Output is WAV or MP3 depending on implementation."),
  ("Is the separation perfect?","No. There will be some bleed in both output tracks — this is a limitation of the technology."),
  ("Is it free?","Yes. Vocal and Music Separator is free at envizion.work.")],
 [("MP4 to MP3","https://envizion.work/tools/mp4tomp3.html"),
  ("MediaForge","https://envizion.work/tools/mediaforge.html"),
  ("Voice Recorder","https://envizion.work/tools/voice-recorder.html"),
  ("Advanced Video Watermarker","https://envizion.work/tools/advanced-video-watermarker.html")]),

("tools","voice-recorder.html",
 "Voice Recorder","Browser microphone tool","Record audio from your microphone, play it back, and download it — directly in the browser with no app install.",
 ["Voice Recording","Microphone","Audio Download","Envizion Tools"],
 ["Record audio from the device microphone directly in the browser.","Play back the recording immediately after stopping.","Download as a WAV or WebM audio file."],
 ["Click the Record button and grant microphone permission when prompted.","Speak, record, or capture audio as needed.","Click Stop to end the recording.","Play back using the on-screen controls, then Download to save the file."],
 ["Browser microphone access requires HTTPS — the page serves over HTTPS so this is handled automatically.","Recording quality depends on the device microphone and the browser audio API settings.","Very long recordings may produce large files — consider stopping and starting new recordings for long sessions."],
 ["The Voice Recorder is a simple in-browser audio recording tool that uses the browser MediaRecorder API and the getUserMedia function to capture audio from the device microphone. It requires no application install, no account, and no external service — just a browser and microphone permission.",
  "Common use cases include recording quick voice memos, capturing interview audio during a remote session, recording a rough demo for a song or podcast episode, capturing ambient sounds for use in a project, and creating voiceover audio for video editing without opening a dedicated recording application.",
  "The MediaRecorder API records audio as a stream of audio chunks. When recording stops, the chunks are assembled into a single audio blob. The tool saves this as a WAV file for maximum compatibility, or WebM in browsers where WAV encoding is not available. WAV is an uncompressed format, so the file will be larger than a compressed MP3 — but it is lossless and suitable for further editing.",
  "After recording, the audio plays back in an on-screen audio player so the user can review the capture before downloading. If the recording is not usable, a new recording can be started without downloading the current one. The interface shows the recording duration in real time so the user knows how long the current take is.",
  "Microphone permission is requested once per origin in the browser. After granting permission, the tool can start new recordings without prompting again in the same browser session. The microphone is only active while recording is in progress — between recordings, the device microphone is released.",
  "Voice Recorder is part of the Envizion Tools collection at envizion.work."],
 ["Record a quick voice memo to capture a thought or idea.","Capture an interview or conversation for later transcription.","Record a rough vocal demo for a song or podcast pilot.","Create a voiceover audio file for a video editing project."],
 ["Test the recording level with a short clip before committing to a long session.","Download the recording immediately after stopping — closing the tab without downloading loses the session data.","For long recordings, pause and resume rather than recording continuously to manage file size."],
 ["If the Record button does not respond, microphone permission may have been denied — check browser site settings and allow microphone access.","If the recording is silent, the wrong input device may be selected — check the system audio input settings.","If the download produces a file that will not play, try WebM format if WAV is the default, or vice versa."],
 [("Does it access the microphone without permission?","No. The browser prompts for microphone permission before recording starts."),
  ("What format is the output?","WAV where available, WebM as a fallback depending on browser codec support."),
  ("Is the recording stored on a server?","No. Recordings exist only in the browser session until downloaded."),
  ("Is it free?","Yes. Voice Recorder is free at envizion.work.")],
 [("MP4 to MP3","https://envizion.work/tools/mp4tomp3.html"),
  ("Vocal Music Separator","https://envizion.work/tools/vocal-music-separator.html"),
  ("MediaForge","https://envizion.work/tools/mediaforge.html"),
  ("Media Player","https://envizion.work/tools/mediaplayer.html")]),

# ── TOOLS2 FOLDER ───────────────────────────────────────────────────────────────

("tools2","CodeWeb.html",
 "CodeWeb — Localhost Server Manager","Developer reference","100-guide macOS-style developer terminal reference covering servers, frameworks, databases, and deployment workflows.",
 ["Developer Reference","Terminal Commands","Localhost Setup","Envizion Tools"],
 ["Browse 100 practical developer guides covering server setup, framework commands, database management, and deployment.","Search by keyword or browse by category.","Each guide includes copy-ready terminal commands."],
 ["Open CodeWeb and use the search bar to find a specific topic.","Browse categories: servers, frameworks, databases, version control, deployment.","Click any guide to expand it and read the full command set with explanations.","Copy commands directly from the guide panel."],
 ["Commands are written for macOS terminal and are compatible with most Linux environments.","Windows users will need WSL or equivalent for most commands.","Commands are reference examples — always verify version compatibility with your specific project before running."],
 ["CodeWeb is a developer terminal reference tool covering 100 practical guides for common local development tasks. It is styled as a macOS terminal window and is designed to be a fast, searchable reference for developers who need specific commands without googling through Stack Overflow threads or official documentation pages that are often too verbose for quick reference use.",
  "The 100 guides are organised into categories that follow a typical development workflow. Server setup guides cover Apache, Nginx, Node.js HTTP servers, Python's built-in server, PHP built-in server, and Ruby on Rails. Framework guides cover commands for React, Vue, Angular, Next.js, Nuxt, SvelteKit, Django, Flask, FastAPI, Laravel, and Spring Boot.",
  "Database guides cover PostgreSQL, MySQL, MariaDB, SQLite, MongoDB, and Redis — covering installation, starting and stopping the service, creating databases and users, running queries, and common maintenance commands. Version control guides cover Git workflows: initialising repositories, branching, merging, rebasing, resolving conflicts, and working with remote repositories.",
  "Deployment guides cover common hosting environments: pushing to a VPS with SSH, deploying to Heroku, Vercel, Netlify, and Railway, managing environment variables, setting up reverse proxies with Nginx, and configuring SSL certificates with Let's Encrypt. Process management guides cover pm2 for Node.js applications and systemd for Linux services.",
  "Each guide is structured as a titled section with an explanation of when the commands are needed, followed by the commands themselves in a code block with inline comments explaining each line. Commands are copy-ready — clicking the copy icon copies the full command without the comment text, so it can be pasted directly into a terminal.",
  "CodeWeb is part of the Envizion Tools2 collection at envizion.work."],
 ["Look up the exact Nginx config syntax for a reverse proxy to a Node.js application.","Find the correct psql commands to create a new database user with limited permissions.","Check the Git commands for squashing commits before a pull request.","Reference the pm2 startup command for a persistent Node.js service on a VPS."],
 ["Commands are reference examples — test in a safe environment before running on a production server.","Version numbers in commands may be outdated — always check the current version of the tool or package.","Linux commands assume a Debian/Ubuntu base — adapt package manager commands for other distributions."],
 ["If a command is not found, the required tool may not be installed — check the installation guide at the top of the relevant category.","If the search returns no results, try a broader term — for example 'postgres' instead of 'postgresql create user'.","If the guide panel does not expand, try refreshing the page."],
 [("How many guides are there?","100 guides covering servers, frameworks, databases, version control, and deployment."),
  ("Does it work for Windows?","Commands are macOS and Linux oriented — Windows users should use WSL."),
  ("Is it updated regularly?","Guides are reviewed periodically — check the version note in each guide for currency."),
  ("Is it free?","Yes. CodeWeb is free at envizion.work.")],
 [("Envizion Editor","https://envizion.work/tools2/envizion_editor.html"),
  ("Envizion Playground","https://envizion.work/tools2/envizion_playground.html"),
  ("HTML Viewer","https://envizion.work/tools/htmlviewer.html"),
  ("Tools Guide","https://envizion.work/tools/tools-guide.html")]),

("tools2","bulk_webp_converter.html",
 "Bulk WebP Converter","Batch image converter","Convert entire batches of images to WebP format in the browser — faster loading, smaller files, no upload.",
 ["WebP Conversion","Batch Processing","Web Optimisation","Envizion Tools"],
 ["Convert multiple image files to WebP in one batch.","Set quality level for each conversion.","Download all converted files as a ZIP."],
 ["Add image files using the file picker or drag and drop.","Set the WebP quality level (75-85 recommended for photos, 90+ for graphics).","Click Convert All.","Download the ZIP containing all converted WebP files."],
 ["WebP is supported by all modern browsers — check compatibility if images will be used in contexts targeting legacy browsers.","Transparent PNG files convert to WebP with transparency preserved.","Animated GIFs can be converted to animated WebP which is typically significantly smaller."],
 ["The Bulk WebP Converter is a batch image conversion tool specifically for producing WebP output from standard image formats. WebP is a modern image format developed by Google that achieves significantly smaller file sizes than JPEG and PNG at comparable quality levels. For web developers and content managers, switching to WebP can reduce page image payload by 25 to 40 percent, improving page load speed and Core Web Vitals scores.",
  "The converter uses the browser Canvas API to decode each source image and re-encode it in WebP format at the specified quality level. This runs entirely in the browser — no images are transmitted to any server. Batch processing allows hundreds of images to be converted in a single session without manual repetition.",
  "Quality level selection is a key decision in WebP conversion. A quality setting of 75 to 85 produces excellent results for photographic images — the visual difference from the source is imperceptible to most viewers, but the file size reduction is dramatic. For graphics with flat colours, text, or sharp edges, a higher quality setting of 90 to 95 preserves the crispness of the content.",
  "PNG images with alpha channel transparency convert to WebP with the transparency preserved. WebP supports both lossy and lossless compression, and the tool selects lossless mode automatically for transparency-bearing images to avoid artefacts around transparent edges. For opaque images, lossy mode is used with the configured quality setting.",
  "Animated GIF files are also supported. Animated GIFs are notoriously large — a short looping animation can be several megabytes as a GIF. The same animation converted to animated WebP is typically 50 to 70 percent smaller. The frame timing and loop settings are preserved in the conversion.",
  "Bulk WebP Converter is part of the Envizion Tools2 collection at envizion.work."],
 ["Convert all images in a web project to WebP before deployment to improve page load performance.","Reduce image file sizes for an e-commerce product catalogue.","Convert PNG screenshots to WebP for a documentation site.","Batch convert a photography portfolio for faster gallery loading."],
 ["Test the output quality with a sample before converting the full batch.","Keep originals — WebP files cannot be losslessly converted back to JPEG or PNG.","For very high-quality graphic design work, use lossless WebP (quality 100) to preserve all detail."],
 ["If WebP output is not supported, the browser may be outdated — Chrome and Edge have full WebP encode support.","If transparent areas appear as black, enable lossless mode for transparency-bearing files.","If the ZIP download is empty, the conversion may have failed — retry with fewer files."],
 [("Does it upload images?","No. Conversion uses the Canvas API locally."),
  ("Do all browsers support WebP?","All modern browsers support WebP. IE11 does not."),
  ("Can I convert GIFs?","Yes. Animated GIFs convert to animated WebP."),
  ("Is it free?","Yes. Bulk WebP Converter is free at envizion.work.")],
 [("Image Optimizer Pro","https://envizion.work/tools/image-optimizer-pro.html"),
  ("Background Remover","https://envizion.work/tools/background-remover.html"),
  ("Image Upscaler","https://envizion.work/tools/imagesupscaler.html"),
  ("Media Library","https://envizion.work/tools/media-library.html")]),

("tools2","local_vocal_remover.html",
 "Local Vocal Remover","Offline vocal isolation","Remove vocals from music tracks entirely offline using on-device audio processing — no cloud API required.",
 ["Vocal Removal","Offline AI","Karaoke","Envizion Tools"],
 ["Load an audio file and remove the vocal track to produce a clean instrumental.","Runs entirely offline after model initialisation.","Download the vocal-removed instrumental file."],
 ["Load your audio file.","Click Remove Vocals and wait for the model to process.","Preview the instrumental output.","Download the result."],
 ["Best results come from studio-recorded music with a clear centre-panned vocal — live recordings with room reverb are harder to separate.","The model runs offline after the initial weight download.","Output quality varies by input quality and mix complexity."],
 ["The Local Vocal Remover is an offline audio processing tool that uses an on-device machine learning model to remove the vocal track from music recordings. Unlike the Vocal and Music Separator which produces both vocal and instrumental outputs, the Local Vocal Remover is optimised specifically for producing a clean instrumental with minimal vocal residue.",
  "The tool is designed for users who need karaoke-style instrumentals, background music for video projects, or instrumental versions of songs for practice or arrangement study. Because it runs entirely offline after the model weights are downloaded on the first use, it is suitable for use without an internet connection and does not transmit audio data anywhere.",
  "The separation technique uses a neural network trained on a large dataset of music recordings. The model has learned the acoustic signature of human voices — the frequency patterns, the temporal envelope, the formant structure — and is able to estimate a mask that suppresses those components in the output. The underlying approach is similar to the short-time Fourier transform masking technique, enhanced with learned parameters.",
  "The limitation of any vocal removal tool is that instruments and vocals often share frequency ranges. A piano playing a note at the same pitch as a sung note will produce energy at the same frequency. The model must decide which energy belongs to the vocal and which to the instrument, and it cannot always get this right. The result is an instrumental that may have some vocal ghosting, particularly during melodic passages where pitch alignment between voice and instrument is common.",
  "Despite these limitations, the output is useful for a wide range of practical purposes. For karaoke use, a slight vocal ghost is acceptable because the performer's own voice dominates the listening mix. For background music in video, the vocal reduction is typically sufficient. For detailed production work, the output can be taken into an audio editor for further processing.",
  "Local Vocal Remover is part of the Envizion Tools2 collection at envizion.work."],
 ["Create karaoke tracks for personal use or practice.","Produce instrumental beds for background music in video projects.","Study the harmonic and melodic structure of a song without the vocal layer.","Generate an instrumental version for arrangement transcription."],
 ["Source quality matters — use high-bitrate files for the cleanest output.","Expect some vocal residue — this is a characteristic of the technology, not a bug.","Keep the original for comparison and for re-processing if needed."],
 ["If there is heavy vocal residue, the mix may be too complex — simpler arrangements separate more cleanly.","If processing is very slow, the audio file may be very long — try a shorter excerpt.","If the output sounds hollow or has phasing artefacts, the model may be struggling with the specific mix — this is a known limitation."],
 [("Is it the same as the Vocal Music Separator?","Related but different — the Local Vocal Remover is optimised for clean instrumental output; the Separator produces both tracks."),
  ("Does it work offline?","Yes, after the model downloads on first use."),
  ("What formats are supported?","MP3, WAV, and OGG."),
  ("Is it free?","Yes. Local Vocal Remover is free at envizion.work.")],
 [("Vocal Music Separator","https://envizion.work/tools/vocal-music-separator.html"),
  ("MP4 to MP3","https://envizion.work/tools/mp4tomp3.html"),
  ("MediaForge","https://envizion.work/tools/mediaforge.html"),
  ("Voice Recorder","https://envizion.work/tools/voice-recorder.html")]),

("tools2","secure_converter.html",
 "Secure Converter","Privacy-first converter","Convert sensitive files with zero network transmission — all conversion logic runs locally in your browser.",
 ["Secure Conversion","Zero Upload","Privacy First","Envizion Tools"],
 ["Convert documents and files without any data leaving your device.","Supports common format conversions for text, image, and document files.","Uses the same local processing as all Envizion secure tools."],
 ["Load the file to be converted.","Select the target format.","Click Convert.","Download the output file."],
 ["The secure label refers to the fact that no network transmission occurs — the tool itself does not add encryption to the output.","Use Universal File Encryption if you need the output to be encrypted.","Format support is the same as OmniConvert Pro — the Secure Converter is the privacy-emphasised entry point."],
 ["The Secure Converter is a file format conversion tool with an explicit focus on privacy. It is functionally similar to OmniConvert Pro but is the recommended entry point for users who are converting files that contain personal, financial, medical, or legally sensitive information and want to be certain that nothing is transmitted over the network during conversion.",
  "Many online file conversion services upload the user's file to a server, process it there, and return the result. This is convenient but creates a data privacy risk. The user's file — which might be a bank statement, a medical record, a legal document, a confidential business file, or personal correspondence — is transmitted to a third-party server, stored temporarily, and potentially logged. Some services have vague privacy policies about how they handle uploaded data.",
  "The Secure Converter eliminates this risk entirely. All conversion logic uses browser APIs — the Canvas API for image format changes, the File API for text format adjustments, and where available the Web Crypto API for format-level transformations. The file is read locally, transformed locally, and the output is offered as a download. The only network requests the page makes are for loading the tool itself on the first visit.",
  "Supported conversions cover the most commonly needed format changes: images between JPEG, PNG, and WebP; text files between plain text, CSV, and simple structured formats; and basic document format adjustments. The tool is not a replacement for a full-featured desktop converter for complex or proprietary formats.",
  "For users who need both conversion and encryption in a single workflow, the recommended approach is to convert using the Secure Converter and then encrypt the output using Universal File Encryption. This produces a converted file that is also protected by AES-256 encryption for storage or transmission.",
  "Secure Converter is part of the Envizion Tools2 collection at envizion.work."],
 ["Convert a PDF extract containing financial data to text without uploading to an online converter.","Change the format of a medical image file before sharing with a healthcare provider.","Convert a confidential document to a different format for a software system that requires it.","Process personal identification documents locally without cloud service involvement."],
 ["The Secure Converter handles format conversion only — it does not encrypt the output. Use Universal File Encryption if the output needs to be secured.","Verify the output file is correct before deleting the source.","Complex proprietary formats may not convert cleanly — test with a non-sensitive version of the file first."],
 ["If the conversion fails, the format combination may not be supported — check the supported formats list.","If the output file is corrupt, the source file may have been partially unreadable — open the source in its native application first to confirm it is intact.","If performance is slow, close other tabs to free browser memory."],
 [("Does this upload my file?","No. All conversion runs locally in the browser."),
  ("Is the output encrypted?","No. The Secure Converter only converts format. Use Universal File Encryption for encryption."),
  ("What makes it different from OmniConvert Pro?","Same conversion engine — the Secure Converter is positioned for privacy-sensitive workflows and has clearer guidance on the no-upload guarantee."),
  ("Is it free?","Yes. Secure Converter is free at envizion.work.")],
 [("Universal File Encryption","https://envizion.work/tools/universal-file-encryption.html"),
  ("Secure PDF Compressor","https://envizion.work/tools2/secure_pdf_compressor.html"),
  ("OmniConvert Pro","https://envizion.work/tools/envizionomniconvertpro.html"),
  ("PDF Merger","https://envizion.work/tools/pdfmerger.html")]),

("tools2","secure_pdf_compressor.html",
 "Secure PDF Compressor","Private PDF compression","Compress PDF files to reduce size without transmitting them to any server — local processing, no cloud.",
 ["PDF Compression","Zero Upload","Privacy First","Envizion Tools"],
 ["Compress PDF files to reduce file size locally in the browser.","No file is uploaded to any server.","Download the compressed PDF directly."],
 ["Load the PDF file.","Choose the compression level.","Click Compress.","Download the smaller PDF."],
 ["PDF compression is most effective when the PDF contains high-resolution embedded images — text-only PDFs see smaller gains.","Very aggressive compression may reduce image quality inside the PDF noticeably.","Password-protected PDFs cannot be compressed — unlock them first."],
 ["The Secure PDF Compressor reduces the file size of PDF documents using browser-side processing. It is designed for users who regularly deal with large PDF files — scanned documents, image-heavy reports, brochures, and portfolios — and need to reduce their size for email attachment limits, upload portals with file size caps, or simply more efficient storage.",
  "PDF file size is dominated by the images embedded within the document. A text-only PDF is typically small regardless of page count. A PDF containing scanned pages — each page an embedded JPEG or PNG image — can be tens of megabytes. Compressing the embedded images at a reduced quality level dramatically reduces the total file size.",
  "The tool uses pdf-lib and the Canvas API to process the PDF in the browser. Pages are decoded, embedded images are identified and re-encoded at the chosen compression level, and a new PDF is assembled with the compressed images. Text content and vector graphics are not affected by compression and remain sharp regardless of the quality setting.",
  "Three compression levels are typically offered: light, standard, and aggressive. Light compression applies moderate image quality reduction and typically achieves 20 to 40 percent size reduction. Standard compression is suitable for most sharing purposes and achieves 40 to 60 percent reduction. Aggressive compression maximises size reduction but reduces embedded image quality noticeably — suitable for archiving purposes or situations where exact image fidelity is not required.",
  "Because the process runs locally, files containing personal documents, financial records, legal contracts, or medical information are not transmitted anywhere. This is the key distinction from online PDF compression services such as ILovePDF, Smallpdf, or Adobe's online tools, which all require file upload.",
  "Secure PDF Compressor is part of the Envizion Tools2 collection at envizion.work."],
 ["Compress a scanned document PDF before emailing it as an attachment.","Reduce a portfolio PDF to fit within a job application upload limit.","Compress a large report PDF for storage without losing readable quality.","Reduce brochure PDFs before uploading to a website."],
 ["Check the output quality by reviewing the compressed PDF in a PDF viewer before sending.","Very aggressively compressed PDFs may look poor when printed — standard compression is suitable for most use cases.","Text and vector content in the PDF is not compressed — only embedded images are affected."],
 ["If the file size barely changes after compression, the PDF is likely text-only with no embedded images.","If the compressed PDF looks too pixelated, use a lighter compression level.","If the PDF fails to load, it may be password-protected or corrupt."],
 [("Does it upload the PDF?","No. All processing runs in the browser using pdf-lib."),
  ("Does compression affect text quality?","No. Only embedded images are compressed — text and vectors remain sharp."),
  ("Can I compress password-protected PDFs?","No. Unlock the PDF first in a PDF reader that supports it."),
  ("Is it free?","Yes. Secure PDF Compressor is free at envizion.work.")],
 [("PDF Merger","https://envizion.work/tools/pdfmerger.html"),
  ("PDF to Text","https://envizion.work/tools/pdf-to-text.html"),
  ("Secure Converter","https://envizion.work/tools2/secure_converter.html"),
  ("Universal File Encryption","https://envizion.work/tools/universal-file-encryption.html")]),

("tools2","superfast_video_compressor.html",
 "Superfast Video Compressor","Browser video compression","Compress large video files directly in the browser using WebAssembly-based FFmpeg — no upload, no wait for cloud processing.",
 ["Video Compression","WebAssembly FFmpeg","No Upload","Envizion Tools"],
 ["Compress large video files to reduce size for sharing, storing, or uploading.","Uses FFmpeg compiled to WebAssembly — runs entirely in the browser.","Choose compression level and output format."],
 ["Load your video file.","Choose the target quality or file size.","Select output format (MP4, WebM).","Click Compress and wait for processing.","Download the compressed video."],
 ["FFmpeg WebAssembly processing is CPU-intensive — compression is slower than native FFmpeg on the command line.","Very long videos may take several minutes to compress — the progress indicator shows completion percentage.","Close other browser tabs to give the compression process as much CPU as possible."],
 ["The Superfast Video Compressor uses FFmpeg compiled to WebAssembly (ffmpeg.wasm) to compress video files entirely within the browser. FFmpeg is the industry-standard open-source multimedia framework used by professional video tools worldwide. Compiling it to WebAssembly allows it to run in a browser tab without any server involvement.",
  "Video file sizes are a frequent practical problem. A ten-minute screen recording can be 500MB. A smartphone video shot at 4K can be several gigabytes. Most file sharing services, email clients, and upload portals impose file size limits that these files exceed. Compression reduces the file to a manageable size while preserving acceptable quality for the intended use.",
  "The compression workflow uses the H.264 codec for MP4 output and VP9 for WebM output. The quality is controlled by the CRF (Constant Rate Factor) setting. Lower CRF values produce higher quality and larger files. Higher CRF values produce smaller files with more compression artefacts. The tool presents this as a simple quality slider from maximum to minimum rather than exposing the raw CRF number.",
  "Processing speed depends heavily on the device CPU. A modern multi-core desktop processor compresses a five-minute video in approximately two to five minutes. A mobile device will be significantly slower. The WebAssembly implementation runs single-threaded by default, which is slower than native FFmpeg but produces identical output quality.",
  "Because FFmpeg processes the video locally, no footage is transmitted to a server. This matters for videos containing personal content, proprietary footage, confidential meeting recordings, or any material the user does not want to share with a cloud service. The entire compression operation happens inside the browser tab.",
  "Superfast Video Compressor is part of the Envizion Tools2 collection at envizion.work."],
 ["Compress a screen recording before uploading to Google Drive or Dropbox.","Reduce a smartphone video to fit within an email attachment limit.","Compress a meeting recording for long-term archive storage.","Prepare a video file for upload to a platform with strict file size limits."],
 ["Processing time is proportional to video length — plan for longer waits with long videos.","Keep the original — compression is lossy and cannot be reversed.","Test with a short clip first to confirm the quality setting is acceptable before processing the full video."],
 ["If processing is very slow, close other browser tabs to free CPU resources.","If the output quality is poor, reduce the compression level (lower CRF / higher quality setting).","If the browser tab crashes during processing, the video may be too large for available memory — try splitting it into shorter sections first."],
 [("Does it upload my video?","No. FFmpeg WebAssembly runs entirely in the browser."),
  ("How long does compression take?","Depends on video length and device CPU — a 5-minute video typically takes 2 to 5 minutes on a modern desktop."),
  ("What formats are supported?","Input: MP4, MOV, WebM. Output: MP4, WebM."),
  ("Is it free?","Yes. Superfast Video Compressor is free at envizion.work.")],
 [("Advanced Video Watermarker","https://envizion.work/tools/advanced-video-watermarker.html"),
  ("MediaForge","https://envizion.work/tools/mediaforge.html"),
  ("MP4 to MP3","https://envizion.work/tools/mp4tomp3.html"),
  ("Video Mask Merger","https://envizion.work/tools/local_video_image_mask_merger.html")]),

# ── REVIEWS-BLOG FOLDER ─────────────────────────────────────────────────────────

("reviews-blog","index.html",
 "Envizion Reviews & Blog","Editorial hub","Articles, game reviews, tool guides, and developer commentary from the Envizion team.",
 ["Blog","Reviews","Articles","Envizion"],
 ["Browse the latest articles, game reviews, and tool commentary from Envizion.","Posts cover browser tools, indie games, web development, and productivity.","New content added regularly."],
 ["Browse the homepage for the most recent posts.","Use the category filters to find reviews, articles, or guides.","Click any post card to read the full article."],
 ["The blog covers Envizion tools, browser technology, game reviews, and web development topics.","Posts are written to be useful independently — no account is needed to read.","Comments and feedback can be submitted via the Contact page."],
 ["The Envizion Reviews and Blog is the editorial section of the Envizion platform. It publishes articles, game reviews, tool guides, and commentary on browser technology, web development practices, productivity software, and indie gaming. The content is written to be genuinely useful to readers who care about browser-based tools, practical web workflows, and quality independent game coverage.",
  "The blog exists to give Envizion a voice beyond the tools themselves. A browser tool directory is useful but static. A blog creates ongoing content that gives readers reasons to return, provides context for the tools in the collection, and allows the team to share opinions, recommendations, and discoveries that do not fit neatly into a tool description.",
  "Game reviews on the blog cover browser-accessible games and indie titles. The review format is opinionated and personal — not a numerical score system, but a structured discussion of what the game does well, what it does not, who it is for, and whether it is worth the time. Reviews are written after significant playtime and aim to represent the experience of a player who encounters the game with no prior knowledge.",
  "Tool guides explain how to use Envizion tools in depth beyond the in-page documentation. They cover real-world workflows — for example, a guide on combining the Background Remover with Image Optimizer Pro for e-commerce product photography preparation, or a walkthrough of using the Video and Image Mask Merger for a specific compositing scenario.",
  "Development commentary covers the decisions, technical challenges, and design thinking behind building browser-based tools. These posts are aimed at developers and curious users who want to understand why tools are built the way they are — why certain browser APIs were chosen, what the limitations of a particular approach are, and what the roadmap looks like.",
  "The Reviews and Blog is part of the Envizion platform at envizion.work."],
 ["Find a game review before deciding to try a new browser or indie game.","Read a tool guide for a deeper walkthrough of a specific Envizion tool workflow.","Follow development commentary to understand the technical decisions behind the tools.","Browse articles for browser technology news and web development insights."],
 ["Posts reflect the opinion and knowledge of the author at the time of writing — check dates and verify technical details in official documentation.","Game reviews are based on personal playtime and may not reflect every player's experience.","Tool guides are kept up to date but tools update frequently — check the in-tool documentation for the latest behaviour."],
 ["If a post link returns a 404, it may have been moved — use the blog homepage to search for the title.","If comments are not loading, the comments system may require JavaScript — ensure scripts are enabled.","For corrections or factual updates, use the Contact page."],
 [("How often is new content posted?","New posts are added regularly — subscribe or bookmark the blog homepage for updates."),
  ("Can I submit a guest post?","Use the Contact page to reach out with guest post proposals."),
  ("Are the game reviews spoiler-free?","Reviews are written to give useful context without major plot spoilers."),
  ("Is the blog free to read?","Yes. All content is free with no subscription or account required.")],
 [("Game Reviews","https://envizion.work/reviews-blog/game.html"),
  ("Blog Posts","https://envizion.work/reviews-blog/blog.html"),
  ("Envizion Tools","https://envizion.work/tools/index.html"),
  ("About Envizion","https://envizion.work/tools2/about.html")]),

("reviews-blog","blog.html",
 "Envizion Blog","Articles and commentary","In-depth articles on browser tools, web development, productivity, and the Envizion platform.",
 ["Blog","Web Development","Productivity","Envizion"],
 ["Read long-form articles on browser technology, tool development, and productivity workflows.","Posts are written by the Envizion team and guest contributors.","No account needed to read."],
 ["Browse the article list on the blog homepage.","Click an article to read the full post.","Use the tag filters to find articles on specific topics."],
 ["Articles vary in length from short commentaries to in-depth technical guides.","Technical articles assume basic familiarity with web development concepts.","All posts are free to read without registration."],
 ["The Envizion Blog publishes long-form articles on browser-based tools, web development techniques, productivity software, and the ongoing development of the Envizion platform. It is the primary text publishing channel for commentary, opinion, and practical guidance from the Envizion team.",
  "Articles cover a range of depth levels. Some are short opinion pieces on a particular browser feature or tool design decision. Others are detailed technical walkthroughs — for example, how the Background Remover implements ML-based segmentation in the browser, or how MediaRecorder API limitations affect the quality ceiling of browser-based video tools.",
  "Productivity articles address how individual tools fit into broader workflows. A developer might use CodeWeb for terminal reference, the HTML Viewer for quick snippet testing, and the Secure Converter for format changes on client files — a blog post can connect those dots and suggest how to use them together efficiently.",
  "Web development articles cover topics relevant to people building browser-based applications — the state of browser APIs, new CSS features, JavaScript performance patterns, WebAssembly use cases, and the practical trade-offs of different approaches to building local-first software. These posts draw on the experience of building the Envizion tool collection.",
  "Platform update posts document changes to the Envizion tool collection — new tools added, existing tools updated, performance improvements, and plans for upcoming features. These are useful for regular users who want to know what has changed and what is coming.",
  "The Envizion Blog is part of the Envizion platform at envizion.work."],
 ["Read about how a specific Envizion tool works under the hood.","Follow platform updates to know when new tools are added.","Find productivity workflow guides combining multiple Envizion tools.","Read web development commentary and opinion relevant to browser-based application building."],
 ["Technical articles reflect the state of browser APIs at the time of writing — APIs evolve and some details may be outdated.","Opinion pieces represent the author's view — reader disagreement and discussion is welcome via the Contact page.","Article length varies widely — use the reading time estimate to decide how to approach longer pieces."],
 ["If an article link is broken, search for the title on the blog homepage.","If code examples in an article do not work, check that the browser API is supported in the current browser version.","For corrections or updates, contact via the Contact page."],
 [("How technical are the articles?","It varies — some are beginner-friendly, others assume web development background."),
  ("Can I share articles?","Yes. All blog content is freely shareable — link to the original URL."),
  ("How do I get notified of new posts?","Bookmark the blog homepage and check back, or use the Contact page to ask about update notifications."),
  ("Is it free to read?","Yes. All blog content is free.")],
 [("Game Reviews","https://envizion.work/reviews-blog/game.html"),
  ("Blog Post Template","https://envizion.work/reviews-blog/blog-post.html"),
  ("Envizion Tools","https://envizion.work/tools/index.html"),
  ("Reviews Home","https://envizion.work/reviews-blog/index.html")]),

("reviews-blog","game.html",
 "Envizion Game Reviews","Game coverage","Honest, in-depth reviews of browser games and indie titles — written after real playtime, no sponsored content.",
 ["Game Reviews","Indie Games","Browser Games","Envizion"],
 ["Read reviews of browser-accessible and indie games.","Reviews cover gameplay, design, and who the game is for.","No numerical scores — structured written assessments."],
 ["Browse the game reviews list.","Click any review to read the full writeup.","Use the genre filter to find reviews relevant to your taste."],
 ["Reviews are written after significant playtime — not based on press previews or early access snapshots.","Coverage focuses on browser-playable and indie titles — AAA console games are outside scope.","No sponsored or paid-for reviews — all coverage is independent."],
 ["The Envizion Game Reviews section covers browser-playable games and indie titles with structured, opinionated written reviews. The format is inspired by the traditions of long-form games criticism rather than summary review scores — each review discusses what the game is, what it does well, where it falls short, and who is most likely to find it worthwhile.",
  "Browser games occupy a unique position in gaming. They are immediately accessible — no download, no installation, no platform purchase required. They often represent creative experiments, game jam projects, experimental mechanics, or polished casual experiences that thrive in the zero-friction format. Reviewing them requires understanding the constraints of the medium: browser performance limits, control scheme adaptations for mouse and keyboard, and the different design priorities of games built for instant accessibility versus games built for long-term engagement.",
  "Indie game coverage extends beyond browser-only titles to smaller independently developed games that are relevant to the Envizion audience. Many indie games explore mechanics, themes, or artistic directions that mainstream publishers avoid. The reviews give coverage to games that deserve more attention than they typically receive from large gaming publications focused on high-profile releases.",
  "Reviews are written after the reviewer has spent enough time with the game to form a genuine opinion. A puzzle game might require completing the full experience. An open-world game might require 10 to 20 hours. The goal is to write from a position of having actually played the game rather than summarising a trailer or press kit.",
  "No reviews are sponsored or paid for. Developers do not pay for coverage. Games are reviewed because they are interesting, notable, or relevant — not because the developer has a marketing budget. This keeps the coverage honest and useful to readers.",
  "Game Reviews is part of the Envizion platform at envizion.work."],
 ["Find a review of a browser game before spending time on it.","Discover indie games that align with your gameplay preferences.","Read about game design decisions and what makes a browser game work.","Get recommendations for games in a specific genre."],
 ["Reviews reflect a single player's experience — the game may play differently based on browser, device, and personal taste.","Some games update after a review is published — check the game's own changelog if the review describes issues that may have been patched.","Reviews are not endorsements — a critical review still aims to help readers decide for themselves."],
 ["If a reviewed game link is broken, the game may have been taken down or moved — search for the title directly.","If a browser game does not load, check browser compatibility — some games require specific APIs or permissions.","For suggestions of games to review, use the Contact page."],
 [("Are reviews spoiler-free?","Reviews aim to avoid major spoilers while giving enough context for a meaningful recommendation."),
  ("Do you review all genres?","Coverage spans puzzle, platformer, horror, simulation, RPG, and experimental games — no genre is excluded."),
  ("Can I suggest a game for review?","Yes. Use the Contact page."),
  ("Is the coverage free to read?","Yes. All reviews are free at envizion.work.")],
 [("Blog","https://envizion.work/reviews-blog/blog.html"),
  ("Reviews Home","https://envizion.work/reviews-blog/index.html"),
  ("Envizion Tools","https://envizion.work/tools/index.html"),
  ("About Envizion","https://envizion.work/tools2/about.html")]),
]


# ── PATCH ENGINE ────────────────────────────────────────────────────────────────

def patch_file(folder, filename, block, dry_run=False):
    path = os.path.join(folder, filename)
    if not os.path.exists(path):
        return "missing"
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    if START_MARKER not in content or END_MARKER not in content:
        return "no-block"
    start = content.index(START_MARKER)
    end   = content.index(END_MARKER) + len(END_MARKER)
    new_content = content[:start] + block + content[end:]
    if not dry_run:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)
    return "patched"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    counts = {"patched":0, "missing":0, "no-block":0, "error":0}

    for entry in PAGES:
        folder, filename = entry[0], entry[1]
        try:
            block = build_block(*entry)
            result = patch_file(folder, filename, block, dry_run=args.dry_run)
            counts[result] += 1
            label = "[DRY]" if args.dry_run else "PATCHED" if result=="patched" else result.upper()
            print(f"  {label}: {folder}/{filename}")
        except Exception as e:
            counts["error"] += 1
            print(f"  ERROR: {folder}/{filename} — {e}")

    print(f"\nDone: {counts['patched']} patched, {counts['missing']} missing, "
          f"{counts['no-block']} no SEO block, {counts['error']} errors")

if __name__ == "__main__":
    main()
