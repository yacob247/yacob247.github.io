
import os
import re
import argparse
from pathlib import Path

# ─────────────────────────────────────────────
# CONTENT LIBRARY
# Maps filename keywords → educational content
# Each entry: (title, 400+ word HTML content)
# ─────────────────────────────────────────────

def get_content_for_file(filepath: str) -> tuple[str, str]:
    """Return (panel_title, html_content) based on filename."""
    name = Path(filepath).stem.lower().replace("-", "_").replace(" ", "_")

    # ── Specific tool matches ──────────────────────────────────────────────

    if any(k in name for k in ["pdf_merger", "pdfmerger", "pdf_merge"]):
        return "How PDF Merging Works", """
<h3>What is PDF Merging?</h3>
<p>PDF merging is the process of combining two or more separate PDF documents into a single, unified file. Whether you're compiling a report, bundling invoices, or assembling a portfolio, merging PDFs saves time and keeps your documents organised.</p>
<h3>How the Process Works</h3>
<p>When you upload multiple PDF files, the tool reads each document's internal structure — including pages, fonts, images, and metadata. It then stitches the pages together in the order you specify, preserving all original formatting, embedded fonts, and image quality. The output is a brand-new PDF file that contains all selected pages in sequence.</p>
<h3>Why Use a PDF Merger?</h3>
<ul>
<li><strong>Save time:</strong> Instead of printing and rescanning documents, merge them digitally in seconds.</li>
<li><strong>Stay organised:</strong> Keep related documents together in one file rather than managing multiple attachments.</li>
<li><strong>Professional output:</strong> Merged PDFs look clean and consistent, ideal for sending to clients or submitting to institutions.</li>
<li><strong>Reduce file clutter:</strong> One file is easier to store, share, and find than dozens of separate PDFs.</li>
</ul>
<h3>Common Use Cases</h3>
<p>Students merge lecture notes and assignment sheets into one revision file. Businesses combine contracts, addendums, and signature pages. Lawyers bundle case documents. Accountants compile monthly financial statements. The tool is useful anywhere multiple documents need to travel together.</p>
<h3>Privacy and Security</h3>
<p>All processing happens locally in your browser. Your files are never uploaded to a server, meaning no third party ever sees your documents. This makes the tool safe for sensitive files like contracts, medical records, and financial statements.</p>
<h3>Tips for Best Results</h3>
<p>Arrange your files in the exact order you want before merging. If your PDFs contain form fields, make sure they are either all filled or all blank to avoid conflicts. For very large files, merging may take a few extra seconds — this is normal and depends on your device's processing speed.</p>
<h3>Understanding PDF Structure</h3>
<p>PDF stands for Portable Document Format, created by Adobe in 1993. Unlike Word documents, PDFs look identical on every device and operating system. Each PDF is made up of objects — pages, fonts, images, and streams — all stored in a cross-reference table. When merging, the tool combines these object trees carefully so nothing is lost or corrupted.</p>
"""

    if any(k in name for k in ["pdf_compress", "secure_pdf", "pdf_compressor"]):
        return "How PDF Compression Works", """
<h3>What is PDF Compression?</h3>
<p>PDF compression reduces the file size of a PDF document without visibly degrading its content. Large PDFs are common when they contain high-resolution images, embedded fonts, or complex graphics. Compression makes them easier to email, upload, and store.</p>
<h3>The Science Behind Compression</h3>
<p>PDF files can be compressed using lossless or lossy methods. Lossless compression (like Flate/ZIP) reorganises data more efficiently without removing anything — perfect for text-heavy documents. Lossy compression reduces image quality slightly to achieve much smaller file sizes — ideal when visual perfection is less important than file size.</p>
<h3>What Gets Compressed?</h3>
<ul>
<li><strong>Images:</strong> Photos and graphics are the biggest contributors to file size. Reducing their resolution or re-encoding them saves the most space.</li>
<li><strong>Fonts:</strong> Embedded fonts can be subsetted — only the characters actually used in the document are kept.</li>
<li><strong>Streams:</strong> Binary data streams inside the PDF are re-compressed using efficient algorithms.</li>
<li><strong>Metadata:</strong> Unnecessary metadata and thumbnails can be stripped to reduce overhead.</li>
</ul>
<h3>When Should You Compress?</h3>
<p>Compress a PDF before emailing it if your mail provider has attachment limits (usually 10–25 MB). Compress before uploading to a web form or portal with file size restrictions. Compress scanned documents — these are often needlessly large because scanners default to high resolution.</p>
<h3>Privacy Note</h3>
<p>This tool processes everything locally in your browser. Your PDF never leaves your device, making it safe for confidential documents.</p>
<h3>What is "Secure" PDF Compression?</h3>
<p>Secure compression means the file size is reduced while also ensuring no data leaks during the process. No third-party server touches your file — everything happens in-browser using WebAssembly, a technology that lets complex tasks run directly on your device at near-native speed.</p>
<h3>Understanding File Size vs Quality</h3>
<p>Compression is always a trade-off. A 10 MB scanned document might compress down to 500 KB with minimal visible loss. A diagram-heavy engineering document might only compress by 20% before quality degrades. Use the quality slider to find the right balance for your specific use case.</p>
"""

    if any(k in name for k in ["image_resizer", "image_resize", "img_resize"]):
        return "How Image Resizing Works", """
<h3>What is Image Resizing?</h3>
<p>Image resizing changes the dimensions of a digital image — its width and height in pixels. Whether you need a thumbnail for a website, a specific size for social media, or a smaller file for email, resizing is one of the most common image editing tasks.</p>
<h3>Pixels, Resolution, and Dimensions Explained</h3>
<p>A digital image is made up of pixels — tiny coloured squares arranged in a grid. A 1920×1080 image has 1,920 pixels across and 1,080 pixels down, totalling over two million pixels. Resolution refers to how densely those pixels are packed, measured in DPI (dots per inch). Resizing changes the grid dimensions; resolution affects print quality.</p>
<h3>How Resizing Algorithms Work</h3>
<p>When you shrink an image, pixels are merged or dropped. When you enlarge one, new pixels must be invented — a process called interpolation. Common methods include:</p>
<ul>
<li><strong>Nearest neighbour:</strong> Fast but blocky — good for pixel art.</li>
<li><strong>Bilinear:</strong> Smooth results, slightly blurry on extreme enlargements.</li>
<li><strong>Bicubic:</strong> Higher quality, considers surrounding pixels for smoother gradients.</li>
<li><strong>Lanczos:</strong> Best for photographs, sharpest results when downsizing.</li>
</ul>
<h3>Aspect Ratio — Why It Matters</h3>
<p>Aspect ratio is the proportional relationship between width and height. A 1:1 ratio is a square; 16:9 is widescreen. Resizing without locking the aspect ratio causes stretching or squishing. Always lock proportions unless you intentionally want distortion.</p>
<h3>Common Use Cases</h3>
<p>Web developers resize images to speed up page load times. Social media managers create platform-specific crops. Photographers prepare print-ready files at 300 DPI. Email marketers reduce attachment sizes. Online sellers create consistent product thumbnails.</p>
<h3>Privacy and Processing</h3>
<p>All resizing happens directly in your browser using the HTML5 Canvas API. No image data is sent to any server. Your files stay on your device throughout the entire process.</p>
<h3>Tips for Best Results</h3>
<p>Always start with the largest version of your image — resizing down preserves quality; resizing up from a small file will look blurry. For web use, target 72–96 DPI. For print, use 300 DPI minimum. Save as PNG for transparency, JPG for photographs.</p>
"""

    if any(k in name for k in ["background_remover", "bg_remover", "background_remove"]):
        return "How Background Removal Works", """
<h3>What is Background Removal?</h3>
<p>Background removal is the process of isolating the main subject of a photo — a person, product, or object — and making everything else transparent. The result is an image with no background, saved as a PNG with a transparent layer.</p>
<h3>How AI Background Removal Works</h3>
<p>Modern background removal uses deep learning — specifically a type of neural network trained on millions of images. The model learns to detect edges, identify foreground subjects, and predict which pixels belong to the subject versus the background. This process is called semantic segmentation.</p>
<p>The model analyses every pixel and assigns it a probability score: how likely is this pixel part of the foreground? Pixels above a threshold are kept; pixels below are made transparent. Edge pixels get blended for smooth, natural-looking cutouts.</p>
<h3>Common Use Cases</h3>
<ul>
<li><strong>E-commerce:</strong> Product photos on white or transparent backgrounds look more professional and meet marketplace requirements (Amazon, eBay, Etsy).</li>
<li><strong>Profile pictures:</strong> Remove distracting backgrounds from headshots.</li>
<li><strong>Graphic design:</strong> Place subjects onto custom backgrounds in presentations or posters.</li>
<li><strong>ID and passport photos:</strong> Meet official white-background requirements.</li>
</ul>
<h3>Why Results Vary</h3>
<p>Background removal works best when the subject has clear edges and contrasts well with the background. It struggles with: hair and fur (complex edges), transparent objects like glass, camouflage clothing that blends into the background, and subjects with similar colour to the background.</p>
<h3>Privacy</h3>
<p>Your images are processed locally. No photo is ever uploaded to a remote server — your privacy is fully protected.</p>
<h3>Tips for Best Results</h3>
<p>Use well-lit photos with clear contrast between subject and background. Avoid busy patterns behind the subject. Higher resolution images produce cleaner edges. After removal, zoom in to check fine details like hair — touch up manually if needed.</p>
<h3>File Formats Explained</h3>
<p>Transparent backgrounds require the PNG format — JPG does not support transparency. When you download your result, it will be a PNG file. You can then place it on any coloured background in a design tool.</p>
"""

    if any(k in name for k in ["vocal", "music_sep", "vocal_remover", "vocal_music"]):
        return "How Vocal and Music Separation Works", """
<h3>What is Vocal Separation?</h3>
<p>Vocal separation (also called stem separation or source separation) is the process of splitting a mixed audio track into its individual components — typically vocals, drums, bass, and other instruments. The result lets you isolate or remove specific elements from a song.</p>
<h3>The Technology: AI Source Separation</h3>
<p>Traditional audio editing couldn't separate mixed tracks because all sounds are blended together in a single waveform. Modern AI changes this using deep neural networks trained on thousands of songs where the original stems (individual tracks) are known. The model learns the spectral and temporal patterns that distinguish a human voice from a guitar, or a kick drum from a snare.</p>
<p>The process works in the frequency domain: audio is converted into a spectrogram (a visual map of frequencies over time), the neural network masks out the target source, and the result is converted back to audio.</p>
<h3>Common Use Cases</h3>
<ul>
<li><strong>Karaoke:</strong> Remove vocals to create an instrumental backing track.</li>
<li><strong>Music practice:</strong> Isolate a single instrument to learn it by ear.</li>
<li><strong>Remixing:</strong> Extract stems for creative remixing and mashups.</li>
<li><strong>Audio restoration:</strong> Remove unwanted background music from recordings.</li>
<li><strong>Transcription:</strong> Isolate vocals to make lyrics easier to hear and transcribe.</li>
</ul>
<h3>Why Results Aren't Perfect</h3>
<p>Separation quality depends on how "cleanly" the original was mixed. Heavily compressed tracks or tracks where vocals and instruments occupy the same frequencies are harder to separate cleanly. Some "bleed" (residual sound from the other source) is normal and expected.</p>
<h3>Privacy and Processing</h3>
<p>Audio processing runs locally in your browser using WebAssembly. Your audio files are never uploaded — everything happens on your device.</p>
<h3>Understanding Audio Formats</h3>
<p>Audio is stored as a waveform — a series of numerical samples representing air pressure over time. MP3 and AAC compress this by discarding frequencies the human ear struggles to hear. WAV stores raw uncompressed audio. For best separation results, use WAV or high-bitrate MP3 (256kbps+).</p>
"""

    if any(k in name for k in ["mp4", "mp3", "video_compress", "superfast_video", "mediaforge"]):
        return "How Video and Audio Conversion Works", """
<h3>What is Video/Audio Conversion?</h3>
<p>Conversion changes a media file from one format to another — for example, turning an MP4 video into an MP3 audio file, or compressing a large video into a smaller one. Different devices and platforms require different formats, making conversion an essential everyday task.</p>
<h3>How Encoding Works</h3>
<p>Video files contain multiple streams: a video stream (frames of images), an audio stream (sound), and sometimes subtitle streams. A codec (coder-decoder) compresses these streams to reduce file size. Common video codecs include H.264, H.265 (HEVC), and VP9. Common audio codecs include AAC, MP3, and Opus.</p>
<p>When you convert a video to MP3, the tool discards the video stream entirely and re-encodes only the audio stream into the MP3 format — much smaller because it contains no visual data.</p>
<h3>Bitrate and Quality</h3>
<p>Bitrate measures how much data is used per second of media (in kbps or Mbps). Higher bitrate = better quality but larger file. For MP3 audio: 128kbps is acceptable, 192kbps is good, 320kbps is near-lossless. For video: 1 Mbps suits web streaming; 8–20 Mbps suits HD archiving.</p>
<h3>Common Use Cases</h3>
<ul>
<li><strong>MP4 → MP3:</strong> Extract audio from a YouTube download, interview, or lecture.</li>
<li><strong>Video compression:</strong> Reduce file size for uploading to email or social media.</li>
<li><strong>Format compatibility:</strong> Convert to a format your device or software supports.</li>
<li><strong>Audio editing:</strong> Extract a clean audio track for podcast editing or voice-over work.</li>
</ul>
<h3>Why File Size Varies</h3>
<p>File size depends on duration, resolution, bitrate, and codec efficiency. H.265 produces files roughly half the size of H.264 at the same quality — but takes longer to encode. Choosing the right codec for your use case saves significant storage space.</p>
<h3>Privacy</h3>
<p>All conversion happens in your browser. Your media files never leave your device — no uploads, no servers, complete privacy.</p>
"""

    if any(k in name for k in ["encrypt", "stegano", "universal_file_encr", "secure_convert"]):
        return "How File Encryption Works", """
<h3>What is File Encryption?</h3>
<p>Encryption transforms your file's data into an unreadable scrambled format using a mathematical key. Only someone with the correct key (password) can unscramble it. Without the key, the data looks like random noise — useless to anyone who intercepts it.</p>
<h3>How Modern Encryption Works</h3>
<p>This tool uses AES (Advanced Encryption Standard), the global standard used by banks, governments, and military organisations. AES-256 uses a 256-bit key — that's 2²⁵⁶ possible combinations. Even the world's fastest supercomputer would take longer than the age of the universe to crack it by brute force.</p>
<p>Your password is not the key directly. Instead, it's passed through a key derivation function (PBKDF2 or Argon2) that stretches it into a cryptographic key and adds a random "salt" — preventing precomputed dictionary attacks.</p>
<h3>Steganography: Hiding in Plain Sight</h3>
<p>Steganography is a separate but related concept: hiding data inside another file rather than scrambling it. For example, a secret message can be hidden in the least-significant bits of an image's pixel values — changing them so slightly that the image looks completely normal to the human eye. The hidden data is invisible unless you know it's there and have the tool to extract it.</p>
<h3>When to Use Encryption</h3>
<ul>
<li>Before sharing sensitive documents over email or messaging apps</li>
<li>When storing private files on shared or cloud storage</li>
<li>Before uploading personal or financial data to any online service</li>
<li>When sending confidential work files across the internet</li>
</ul>
<h3>Privacy</h3>
<p>Encryption and decryption both happen locally in your browser. Your files and passwords never touch a server. Not even this website's owner can see what you encrypt.</p>
<h3>Important: Remember Your Password</h3>
<p>There is no password recovery. AES-256 encryption is designed so that lost passwords mean lost data — permanently. Store your password in a password manager (Bitwarden, 1Password) before encrypting anything important.</p>
"""

    if any(k in name for k in ["htmlviewer", "html_viewer", "codeweb"]):
        return "How HTML Rendering Works", """
<h3>What is an HTML Viewer?</h3>
<p>An HTML viewer renders raw HTML, CSS, and JavaScript code as a visual webpage — exactly as a browser would display it. It's invaluable for testing snippets, previewing templates, debugging layouts, and learning web development without needing a local server.</p>
<h3>How Browsers Render HTML</h3>
<p>When a browser receives HTML, it builds a DOM (Document Object Model) — a tree structure representing every element on the page. It then fetches and applies CSS to determine how each element looks (colours, sizes, positions). Finally, JavaScript is executed to add interactivity. This entire process — parsing, styling, and scripting — is called rendering.</p>
<h3>The Three Core Web Technologies</h3>
<ul>
<li><strong>HTML (HyperText Markup Language):</strong> Defines structure and content — headings, paragraphs, images, links, forms.</li>
<li><strong>CSS (Cascading Style Sheets):</strong> Controls appearance — colours, fonts, layout, spacing, animations.</li>
<li><strong>JavaScript:</strong> Adds behaviour — click events, form validation, dynamic content updates, API calls.</li>
</ul>
<h3>What is the DOM?</h3>
<p>The DOM is a live, in-memory representation of your HTML page. JavaScript can read and modify the DOM in real time — adding new elements, changing text, hiding sections — without reloading the page. Every interactive website uses the DOM extensively.</p>
<h3>Use Cases for an HTML Viewer</h3>
<p>Web developers test isolated code snippets before integrating them into larger projects. Students learning HTML practice writing and immediately seeing results. Email marketers preview HTML email templates. Designers prototype layouts quickly without a full development environment.</p>
<h3>Security Considerations</h3>
<p>Code runs in a sandboxed iframe — isolated from the rest of this website. Malicious scripts cannot access your cookies, storage, or other browser data from within the viewer.</p>
<h3>Learning HTML: Where to Start</h3>
<p>Begin with the basic page structure: <code>&lt;html&gt;</code>, <code>&lt;head&gt;</code>, and <code>&lt;body&gt;</code>. Add headings with <code>&lt;h1&gt;</code> through <code>&lt;h6&gt;</code>, paragraphs with <code>&lt;p&gt;</code>, and links with <code>&lt;a href=""&gt;</code>. Once comfortable, move to CSS for styling, then JavaScript for interactivity. HTML is the foundation of every website on the internet.</p>
"""

    if any(k in name for k in ["image_optimizer", "img_optimizer", "imagesupscaler", "upscaler"]):
        return "How Image Optimisation Works", """
<h3>What is Image Optimisation?</h3>
<p>Image optimisation reduces the file size of images while maintaining acceptable visual quality. Optimised images load faster on websites, consume less bandwidth, and improve user experience — especially on mobile connections.</p>
<h3>Why Image Size Matters for the Web</h3>
<p>Images typically account for 50–80% of a webpage's total weight. Large, unoptimised images slow down page load times significantly. Google's Core Web Vitals — a key ranking factor — penalise slow-loading pages. Optimising images directly improves SEO performance, bounce rates, and conversions.</p>
<h3>Optimisation Techniques</h3>
<ul>
<li><strong>Compression:</strong> Reducing the amount of data used to represent the image, either losslessly (no quality change) or lossily (slight quality reduction for large size savings).</li>
<li><strong>Format conversion:</strong> Modern formats like WebP and AVIF are 25–50% smaller than JPEG at the same visual quality.</li>
<li><strong>Dimension reduction:</strong> Serving images at the exact size they'll display rather than scaling them down with CSS.</li>
<li><strong>Metadata stripping:</strong> Removing EXIF data (camera model, GPS location, timestamps) that adds file size without affecting appearance.</li>
</ul>
<h3>AI Upscaling Explained</h3>
<p>Traditional upscaling blurs images because it invents new pixels by averaging neighbours. AI upscaling uses neural networks trained on millions of high-resolution images to intelligently predict what fine details should look like. The result is sharper, more detailed enlargements — not just blurry zooms.</p>
<h3>Choosing the Right Format</h3>
<p>Use JPEG for photographs (no transparency needed). Use PNG for graphics, logos, and images requiring transparency. Use WebP for the web — it supports both photography and transparency at smaller sizes. Use SVG for logos and icons that need to scale to any size.</p>
<h3>Privacy</h3>
<p>All image processing happens locally in your browser. Your images are never uploaded to any server.</p>
"""

    if any(k in name for k in ["teleprompter"]):
        return "How a Teleprompter Works", """
<h3>What is a Teleprompter?</h3>
<p>A teleprompter is a tool that displays scrolling text in front of a speaker or presenter, allowing them to read their script while maintaining eye contact with the camera or audience. Traditionally used by news anchors and politicians, digital teleprompters are now accessible to anyone.</p>
<h3>How Physical Teleprompters Work</h3>
<p>Professional broadcast teleprompters use a half-silvered mirror (called a beam splitter) placed at 45° in front of the camera lens. The text is displayed on a screen below and reflected upward by the mirror — visible to the presenter but invisible on camera. The presenter reads the reflected text while looking directly into the lens, creating the illusion of natural, unscripted speech.</p>
<h3>Digital Teleprompters</h3>
<p>Software teleprompters like this one display text on a screen that scrolls at a controlled speed. They're used by video creators, podcasters, lecturers, and public speakers who want to deliver polished, word-perfect presentations without memorising every line.</p>
<h3>Scroll Speed and Reading</h3>
<p>The ideal scroll speed depends on your natural speaking pace, typically 130–160 words per minute for conversational delivery. Slower speeds allow for emphasis and pausing; faster speeds suit rapid information delivery. Adjust until the speed matches how you naturally speak when relaxed.</p>
<h3>Tips for Using a Teleprompter Effectively</h3>
<ul>
<li>Practise with the script before recording — familiarity makes reading smoother.</li>
<li>Write scripts conversationally, not formally — it sounds more natural when read aloud.</li>
<li>Use short sentences and avoid complex words you might stumble over.</li>
<li>Keep your gaze at the centre of the text, not tracking individual words.</li>
<li>Use font sizes large enough to read comfortably from your shooting distance.</li>
</ul>
<h3>Why Teleprompters Improve Content Quality</h3>
<p>Reading from a script reduces filler words (um, uh, like), eliminates long pauses while you think, and ensures you cover every point. The result is more professional, concise, and confident-sounding content with fewer takes needed.</p>
"""

    if any(k in name for k in ["dictionary", "instant_dict"]):
        return "How Digital Dictionaries Work", """
<h3>What is an Instant Dictionary?</h3>
<p>An instant dictionary provides real-time word definitions, pronunciations, etymologies, and usage examples as you type. Unlike printed dictionaries, digital dictionaries can search millions of entries in milliseconds and offer contextual information beyond a single definition.</p>
<h3>How Dictionary Lookups Work</h3>
<p>Behind every instant dictionary is a data structure optimised for fast text search. A trie (prefix tree) stores words character by character, allowing the system to find all words starting with your typed characters instantly. More advanced systems use inverted indexes (like search engines) that map every word to its definition record.</p>
<h3>Etymology: Where Words Come From</h3>
<p>Etymology is the study of word origins. Most English words come from Latin, Greek, Old French, or Old English (Anglo-Saxon). Understanding etymology helps you deduce the meanings of unfamiliar words — for example, "bio" (Greek: life) appears in biology, biography, and biosphere. Knowing roots dramatically expands your vocabulary.</p>
<h3>Parts of Speech</h3>
<ul>
<li><strong>Noun:</strong> A person, place, thing, or idea (dog, London, freedom)</li>
<li><strong>Verb:</strong> An action or state (run, is, believe)</li>
<li><strong>Adjective:</strong> Describes a noun (red, fast, happy)</li>
<li><strong>Adverb:</strong> Modifies a verb, adjective, or other adverb (quickly, very, well)</li>
<li><strong>Preposition:</strong> Shows relationship (in, on, under, between)</li>
</ul>
<h3>Phonetic Pronunciation</h3>
<p>Pronunciation guides use the International Phonetic Alphabet (IPA) — a standardised system where each symbol represents exactly one sound. For example, /θ/ represents the "th" sound in "think". IPA removes ambiguity because English spelling alone doesn't reliably indicate pronunciation.</p>
<h3>Why Vocabulary Matters</h3>
<p>Research consistently links vocabulary size to reading comprehension, academic performance, and professional success. Studies suggest that people with larger vocabularies earn more, communicate more effectively, and process complex information faster. Regular dictionary use is one of the most efficient ways to build vocabulary deliberately.</p>
"""

    if any(k in name for k in ["image_text", "text_extractor", "ocr", "extract"]):
        return "How Text Extraction from Images Works", """
<h3>What is OCR?</h3>
<p>OCR stands for Optical Character Recognition — the technology that reads text from images, scanned documents, and photographs and converts it into editable, searchable digital text. It bridges the gap between the physical and digital worlds.</p>
<h3>How OCR Works</h3>
<p>OCR follows a multi-step process:</p>
<ul>
<li><strong>Pre-processing:</strong> The image is cleaned — converted to greyscale, contrast is enhanced, and skew (tilt) is corrected to improve accuracy.</li>
<li><strong>Segmentation:</strong> The image is divided into regions, then lines, then individual words and characters.</li>
<li><strong>Character recognition:</strong> Each character is compared against trained templates or analysed by a neural network that has learned what each letter looks like across thousands of fonts.</li>
<li><strong>Post-processing:</strong> A language model checks the recognised text against a dictionary, correcting likely errors based on context.</li>
</ul>
<h3>Modern AI-Powered OCR</h3>
<p>Traditional OCR struggled with handwriting, unusual fonts, and low-quality scans. Modern systems use convolutional neural networks (CNNs) trained on massive datasets of text images. They recognise not just printed text but handwriting, stylised fonts, rotated text, and even text in natural scenes (like street signs in photos).</p>
<h3>Common Use Cases</h3>
<ul>
<li>Digitising printed books, articles, and historical documents</li>
<li>Extracting text from screenshots for editing or searching</li>
<li>Reading receipts and invoices for accounting software</li>
<li>Making scanned PDFs searchable and copy-pasteable</li>
<li>Translating text from photos taken abroad</li>
</ul>
<h3>Factors That Affect Accuracy</h3>
<p>Image quality is the most important factor. High contrast, clear fonts, and proper lighting yield near-perfect results. Blurry images, unusual typefaces, very small text, or complex backgrounds reduce accuracy. For best results, use images with at least 300 DPI resolution.</p>
<h3>Privacy</h3>
<p>Image processing and text extraction happen entirely in your browser. Your images are never sent to any server.</p>
"""

    if any(k in name for k in ["voice_record", "voice_recorder"]):
        return "How Voice Recording Works", """
<h3>How Your Browser Records Audio</h3>
<p>Modern web browsers can access your microphone directly using the Web Audio API and MediaStream Recording API — no app download or plugin required. When you grant microphone permission, the browser creates a live audio stream from your device's microphone and captures it as a digital audio file.</p>
<h3>How Sound Becomes Digital Data</h3>
<p>Sound is a wave — vibrations in air pressure. A microphone converts these pressure changes into an electrical signal. Analogue-to-digital conversion (ADC) samples this signal thousands of times per second (typically 44,100 times — 44.1 kHz) and stores each sample as a number. The result is a digital waveform that can be stored, edited, and played back perfectly.</p>
<h3>Audio Quality: Sample Rate and Bit Depth</h3>
<ul>
<li><strong>Sample rate:</strong> How many samples per second. 44.1 kHz (CD quality) captures frequencies up to 22 kHz — beyond human hearing. Higher is only needed for professional audio production.</li>
<li><strong>Bit depth:</strong> How many levels of detail per sample. 16-bit = 65,536 levels (CD standard). 24-bit = 16.7 million levels (studio standard). Higher bit depth captures quieter sounds more accurately.</li>
</ul>
<h3>Audio Formats</h3>
<p>Recordings are saved as WAV (uncompressed, large files, perfect quality), MP3 (compressed, lossy, 90% smaller), or WebM/Opus (modern web format, excellent compression with minimal quality loss). Choose WAV when you'll be editing the recording; choose MP3 or Opus for sharing and storage.</p>
<h3>Common Use Cases</h3>
<ul>
<li>Voice memos and meeting recordings</li>
<li>Podcast recording and rough drafts</li>
<li>Voice-over recordings for videos</li>
<li>Language learning — recording yourself for self-assessment</li>
<li>Oral presentations and interview practice</li>
</ul>
<h3>Tips for Better Recordings</h3>
<p>Record in a quiet room — background noise is the biggest quality killer. Speak 15–30 cm from the microphone. Avoid rooms with hard, reflective surfaces (they cause echo). A simple foam windscreen reduces breath pops and wind noise dramatically.</p>
"""

    if any(k in name for k in ["watermark", "video_watermark"]):
        return "How Video Watermarking Works", """
<h3>What is a Watermark?</h3>
<p>A watermark is a visible or invisible mark embedded into a video or image to identify its owner, protect copyright, or brand content. Visible watermarks appear as text or logos overlaid on the content. Invisible (digital) watermarks hide identification data in the file's pixel data without affecting appearance.</p>
<h3>How Visible Video Watermarks Work</h3>
<p>A visible watermark is composited (blended) onto each frame of a video during export. The watermark layer — typically a logo, text, or combination — is placed at a specified position, size, and opacity. Semi-transparent watermarks (30–60% opacity) remain visible without completely obscuring the content underneath.</p>
<h3>Why Creators Use Watermarks</h3>
<ul>
<li><strong>Copyright protection:</strong> Makes it immediately clear who created the content, deterring theft.</li>
<li><strong>Brand recognition:</strong> Every share of watermarked content promotes your brand automatically.</li>
<li><strong>Proof of ownership:</strong> Provides evidence of origin in copyright disputes.</li>
<li><strong>Preview protection:</strong> Watermarked previews can be shared freely while the clean version is kept for paying customers.</li>
</ul>
<h3>Frame-by-Frame Processing</h3>
<p>Video is a sequence of still images (frames) played back rapidly — typically 24, 30, or 60 frames per second. Applying a watermark means compositing the watermark onto every individual frame. A 1-minute video at 30fps contains 1,800 frames — all processed sequentially in your browser.</p>
<h3>Position and Opacity Best Practices</h3>
<p>Place watermarks in corners or edges where they're visible but least obstructive. Avoid dead-centre placement — it covers too much of the content. For maximum protection, some creators use moving watermarks that drift slowly across the video, making removal nearly impossible without destroying the content underneath.</p>
<h3>Privacy</h3>
<p>All video processing happens locally in your browser using the Canvas API. Your video files never leave your device.</p>
"""

    if any(k in name for k in ["glb", "fbx", "3d_model", "model_viewer", "animator"]):
        return "How 3D Model Viewing Works", """
<h3>What are 3D Models?</h3>
<p>A 3D model is a mathematical representation of an object in three-dimensional space. It defines the object's shape (geometry), surface appearance (materials and textures), and optionally its movement (animation). 3D models power everything from video games and animated films to product design and architecture.</p>
<h3>How 3D Models are Structured</h3>
<p>Most 3D models consist of:</p>
<ul>
<li><strong>Vertices:</strong> Points in 3D space defined by X, Y, Z coordinates.</li>
<li><strong>Edges:</strong> Lines connecting vertices.</li>
<li><strong>Faces/Polygons:</strong> Flat surfaces formed by connecting edges — usually triangles or quads.</li>
<li><strong>Meshes:</strong> The complete collection of vertices, edges, and faces forming the object's shape.</li>
<li><strong>Materials and Textures:</strong> Image maps applied to the mesh surface to give it colour, reflectivity, and detail.</li>
</ul>
<h3>Common 3D File Formats</h3>
<p>GLB (binary GLTF) is the modern standard for web-based 3D — compact, efficient, and supported by browsers natively. FBX is used in animation pipelines and game engines like Unity and Unreal. OBJ is a simple, universal format for geometry without animation. GLTF 2.0 is the "JPEG of 3D" — designed for fast web delivery.</p>
<h3>How WebGL Renders 3D</h3>
<p>Your browser renders 3D models using WebGL — a JavaScript API that communicates directly with your device's GPU. The GPU applies transformations (rotation, scaling, translation), calculates lighting and shadows, and rasterises (converts) the 3D geometry into 2D pixels on your screen — all at 60 frames per second.</p>
<h3>What is FBX to GLB Conversion?</h3>
<p>FBX files are large and proprietary — not ideal for web delivery. Converting to GLB reduces file size significantly while preserving geometry, materials, animations, and scene hierarchy. GLB files can be embedded directly in webpages and viewed in AR on modern mobile devices.</p>
<h3>Applications of 3D Viewing</h3>
<p>Architects share building models with clients. Product designers present prototypes. Game developers review assets. Educators demonstrate anatomy or physics. E-commerce sites let customers rotate products before buying. 3D on the web is rapidly becoming a standard part of digital communication.</p>
"""

    if any(k in name for k in ["bulk_webp", "webp_converter", "image_convert"]):
        return "How Image Format Conversion Works", """
<h3>What is WebP?</h3>
<p>WebP is a modern image format developed by Google, designed specifically for the web. It supports both lossy and lossless compression, as well as transparency (like PNG) and animation (like GIF) — all in a single, efficient format.</p>
<h3>WebP vs JPEG vs PNG</h3>
<p>WebP typically produces files 25–35% smaller than JPEG at equivalent visual quality. Compared to PNG, WebP lossless files are about 26% smaller. This means faster page loads, lower bandwidth costs, and better performance scores — without visible quality loss.</p>
<h3>How Image Encoding Works</h3>
<p>Image encoding converts raw pixel data into a compressed format. Lossy encoding (like JPEG) discards some image data — particularly in areas the human eye is less sensitive to, such as high-frequency colour transitions. Lossless encoding (like PNG and WebP lossless) reorganises data more efficiently without discarding any information, so the original can be reconstructed perfectly.</p>
<h3>Bulk Conversion</h3>
<p>Bulk conversion processes multiple files simultaneously or sequentially, applying the same settings to all. This is essential for web developers optimising entire image libraries, photographers converting RAW files, and content creators standardising formats across a project.</p>
<h3>Browser Support</h3>
<p>WebP is now supported by all major browsers: Chrome, Firefox, Safari (since 2020), Edge, and Opera. If you're building a website, serving WebP images significantly improves performance without any visible trade-off for your visitors.</p>
<h3>Privacy</h3>
<p>All conversion happens locally in your browser. Your images are processed on your device and never uploaded to any server.</p>
<h3>Tips</h3>
<p>Use WebP lossless for graphics, logos, and screenshots where pixel-perfect quality matters. Use WebP lossy (quality 75–85%) for photographs — the size savings are dramatic with virtually no visible quality difference at these settings.</p>
"""

    if any(k in name for k in ["omniconvert", "universal", "converter"]):
        return "How Universal File Conversion Works", """
<h3>What is File Conversion?</h3>
<p>File conversion transforms a file from one format to another, making it compatible with different software, devices, or platforms. Every file format stores data differently — conversion reads the original structure and writes it into the target format's structure.</p>
<h3>Why So Many File Formats Exist</h3>
<p>Different formats are optimised for different purposes. JPEG sacrifices some image quality to achieve small file sizes, ideal for web photos. PNG preserves perfect quality with transparency support, ideal for graphics. MP4 stores video efficiently for streaming. DOCX stores formatted text documents. No single format is perfect for everything — hence the need for conversion.</p>
<h3>How Conversion Works Technically</h3>
<p>Conversion is a two-step process: decode and encode. First, the original file is decoded — its compressed data is expanded back into raw form (raw pixels, raw audio samples, raw text). Then the raw data is encoded into the target format using that format's compression and structure rules.</p>
<h3>Lossless vs Lossy Conversion</h3>
<p>Some conversions are lossless — the data survives perfectly (e.g., PNG to WebP lossless). Others are inherently lossy — some quality is sacrificed (e.g., WAV to MP3). Converting between lossy formats multiple times degrades quality further with each step, a phenomenon called generation loss. Always convert from the highest-quality source you have.</p>
<h3>Common Conversions and Why</h3>
<ul>
<li><strong>PDF to text:</strong> Make scanned documents searchable and editable.</li>
<li><strong>Image format:</strong> Switch between JPEG, PNG, WebP for web or print use.</li>
<li><strong>Video format:</strong> Ensure compatibility with editing software or playback devices.</li>
<li><strong>Audio format:</strong> Reduce file size or ensure compatibility with music players.</li>
</ul>
<h3>Privacy</h3>
<p>All conversions happen locally in your browser. No files are ever uploaded to a server.</p>
"""

    if any(k in name for k in ["mediaplayer", "media_player"]):
        return "How Media Players Work", """
<h3>What is a Media Player?</h3>
<p>A media player is software that reads and plays audio and video files. It decodes compressed media data in real time, converting it back into raw audio samples for your speakers and raw image frames for your display.</p>
<h3>How Video Playback Works</h3>
<p>A video file contains encoded frames — each frame is a compressed still image. The player decodes these frames one by one at the video's frame rate (typically 24–60 per second) and displays them in sequence, creating the illusion of motion. Simultaneously, it decodes the audio stream and synchronises it precisely with the video using timestamps embedded in the file.</p>
<h3>Codecs: The Compression Engines</h3>
<p>A codec (coder-decoder) is the algorithm used to compress and decompress media. H.264 is the most widely supported video codec — efficient and compatible with virtually every device. H.265 (HEVC) offers the same quality at half the file size but requires more processing power. VP9 and AV1 are open-source alternatives used by YouTube and Netflix.</p>
<h3>Container Formats vs Codecs</h3>
<p>A common source of confusion: the file extension (MP4, MKV, MOV, AVI) is the container — it tells you the file's packaging format. The codec is what's inside. An MP4 file can contain H.264, H.265, or other video codecs. An MKV container can hold almost any codec. When a video "won't play," it's usually because the device doesn't support the specific codec inside the container — not the container itself.</p>
<h3>Local vs Streaming Playback</h3>
<p>Streaming (YouTube, Netflix) delivers video in small chunks, buffering slightly ahead of playback. Local playback reads directly from your storage device. Local playback has no buffering delays but requires the full file to be stored on your device.</p>
<h3>Browser-Based Media Players</h3>
<p>The HTML5 <code>&lt;video&gt;</code> and <code>&lt;audio&gt;</code> elements allow browsers to play media natively — no Flash or plugins needed. The Web Audio API provides advanced audio processing capabilities, enabling equalisation, effects, and visualisation directly in the browser.</p>
"""

    if any(k in name for k in ["velolink", "link", "url"]):
        return "How Link Management and URL Shortening Works", """
<h3>What is URL Shortening?</h3>
<p>URL shortening converts long, complex web addresses into shorter, more manageable links. A long URL like <code>https://example.com/products/category/item?ref=homepage&utm_source=email</code> becomes something like <code>short.ly/abc123</code> — easier to share, type, and remember.</p>
<h3>How URL Redirects Work</h3>
<p>When someone clicks a shortened URL, their browser sends a request to the shortener's server. The server looks up the short code in its database, finds the original long URL, and sends back an HTTP redirect (status code 301 or 302) telling the browser to go to the real destination. This happens in milliseconds — usually imperceptible to the user.</p>
<h3>301 vs 302 Redirects</h3>
<ul>
<li><strong>301 (Permanent redirect):</strong> Tells search engines the page has moved permanently. Search engines pass "link juice" (ranking authority) to the new URL. Use for permanent changes.</li>
<li><strong>302 (Temporary redirect):</strong> Tells browsers and search engines the redirect is temporary. No permanent ranking transfer. Use for short-term promotions or testing.</li>
</ul>
<h3>UTM Parameters and Tracking</h3>
<p>UTM parameters are tags added to URLs to track campaign performance in analytics tools. For example: <code>?utm_source=email&utm_medium=newsletter&utm_campaign=sale</code>. They tell you exactly where your traffic comes from and which campaigns drive the most clicks — essential for measuring marketing ROI.</p>
<h3>QR Codes and Links</h3>
<p>QR codes are visual encodings of URLs. When scanned by a smartphone camera, they direct the user to the encoded URL instantly. Combining short URLs with QR codes creates trackable, scannable links for print materials, product packaging, and offline marketing.</p>
<h3>Link Management Best Practices</h3>
<ul>
<li>Use descriptive short codes when possible (brand/campaign-name) rather than random characters</li>
<li>Always test links before publishing</li>
<li>Add UTM parameters to all marketing links for analytics tracking</li>
<li>Check link destinations periodically — broken links damage user experience and SEO</li>
</ul>
"""

    # ── Fallback: generic educational content ─────────────────────────────
    clean_name = Path(filepath).stem.replace("_", " ").replace("-", " ").title()
    return f"About {clean_name}", f"""
<h3>What Does This Tool Do?</h3>
<p>This tool is designed to simplify a common digital task that would otherwise require technical knowledge, expensive software, or a complex workflow. Built entirely in your browser, it processes your files locally — meaning nothing you upload ever leaves your device.</p>
<h3>How Browser-Based Tools Work</h3>
<p>Modern web browsers are remarkably powerful computing environments. Using technologies like WebAssembly, the Web Audio API, the Canvas API, and the File System Access API, your browser can perform tasks that once required dedicated desktop applications — image processing, audio editing, file conversion, encryption, and more.</p>
<p>WebAssembly (WASM) in particular is a game-changer: it allows near-native-speed code written in C++, Rust, or other languages to run directly inside your browser. Libraries that power professional desktop software can be compiled to WASM and used on any website.</p>
<h3>Why "Local Processing" Matters</h3>
<p>When a tool processes your files locally, it means:</p>
<ul>
<li><strong>Privacy:</strong> Your files never travel over the internet to a server — no third party sees your data.</li>
<li><strong>Speed:</strong> Processing starts instantly without waiting for upload and download times.</li>
<li><strong>No account required:</strong> Nothing is stored anywhere — no sign-up, no cloud storage, no data retention.</li>
<li><strong>Works offline:</strong> Once the page is loaded, many tools work even without an active internet connection.</li>
</ul>
<h3>File Formats and Compatibility</h3>
<p>Digital files come in hundreds of formats, each designed for specific purposes. Understanding file formats helps you choose the right tool and settings. Every format makes trade-offs between file size, quality, compatibility, and features. This tool is built to handle the most common formats for its task category.</p>
<h3>Getting the Best Results</h3>
<p>Start with the highest-quality version of your file whenever possible. Tools that compress or convert media work better when given more data to start with — you can always reduce quality, but you cannot recover detail that was never there. Read the tool's options carefully; small setting changes can make a significant difference to output quality.</p>
<h3>Learning More</h3>
<p>Each tool on this site is built on open web standards. If you're curious about the technologies behind it — WebAssembly, Web Audio, Canvas, WebGL — the Mozilla Developer Network (MDN) is the best free resource for learning how browsers work under the hood.</p>
"""


# ─────────────────────────────────────────────
# HTML SNIPPET GENERATOR
# ─────────────────────────────────────────────

def build_snippet(panel_title: str, panel_content: str) -> str:
    return f"""
<!-- KNOW MORE PANEL — injected by inject_know_more.py -->
<style>
  #km-btn {{
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 9998;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 50px;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(37,99,235,0.35);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease, transform 0.2s ease;
    letter-spacing: 0.01em;
  }}
  body:hover #km-btn,
  #km-btn:hover,
  #km-btn.km-visible {{
    opacity: 1;
    pointer-events: auto;
  }}
  #km-btn:hover {{
    transform: scale(1.05);
    background: #1d4ed8;
  }}
  #km-overlay {{
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 9997;
    pointer-events: none;
  }}
  #km-panel {{
    position: fixed;
    top: 0;
    right: -420px;
    width: 400px;
    height: 100%;
    background: #fff;
    z-index: 9999;
    box-shadow: -4px 0 32px rgba(0,0,0,0.15);
    transition: right 0.35s cubic-bezier(0.4,0,0.2,1);
    overflow-y: auto;
    padding: 32px 28px 48px;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }}
  @media (prefers-color-scheme: dark) {{
    #km-panel {{ background: #1a1a2e; color: #e2e2e2; }}
    #km-panel h2 {{ color: #7eb3ff; }}
    #km-panel h3 {{ color: #a8c7ff; }}
    #km-panel a {{ color: #7eb3ff; }}
    #km-panel ul li {{ color: #d0d0d0; }}
  }}
  #km-panel.km-open {{ right: 0; }}
  body.km-shifted {{ transition: margin-right 0.35s cubic-bezier(0.4,0,0.2,1); margin-right: 400px; }}
  #km-close {{
    position: sticky;
    top: 0;
    float: right;
    background: none;
    border: none;
    font-size: 22px;
    cursor: pointer;
    color: #666;
    line-height: 1;
    padding: 0 0 8px 8px;
    margin-bottom: -8px;
  }}
  #km-close:hover {{ color: #111; }}
  #km-panel h2 {{
    font-size: 18px;
    font-weight: 700;
    color: #1d3557;
    margin: 8px 0 20px;
    line-height: 1.3;
  }}
  #km-panel h3 {{
    font-size: 15px;
    font-weight: 600;
    color: #2563eb;
    margin: 22px 0 8px;
  }}
  #km-panel p {{
    font-size: 14px;
    line-height: 1.7;
    color: #374151;
    margin: 0 0 12px;
  }}
  #km-panel ul {{
    padding-left: 18px;
    margin: 0 0 12px;
  }}
  #km-panel ul li {{
    font-size: 14px;
    line-height: 1.65;
    color: #374151;
    margin-bottom: 6px;
  }}
  #km-panel code {{
    background: #f1f5f9;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 12px;
    font-family: 'Fira Code', monospace;
  }}
</style>

<button id="km-btn" onclick="kmToggle()" title="Know More">📖 Know More</button>

<div id="km-panel" role="complementary" aria-label="Educational information panel">
  <button id="km-close" onclick="kmClose()" aria-label="Close panel">✕</button>
  <h2>{panel_title}</h2>
  {panel_content}
</div>

<script>
(function() {{
  var panel = document.getElementById('km-panel');
  var btn   = document.getElementById('km-btn');
  var open  = false;

  window.kmToggle = function() {{
    open ? kmClose() : kmOpen();
  }};

  window.kmOpen = function() {{
    open = true;
    panel.classList.add('km-open');
    document.body.classList.add('km-shifted');
    btn.classList.add('km-visible');
    btn.textContent = '✕ Close';
  }};

  window.kmClose = function() {{
    open = false;
    panel.classList.remove('km-open');
    document.body.classList.remove('km-shifted');
    btn.textContent = '📖 Know More';
  }};
}})();
</script>
<!-- END KNOW MORE PANEL -->
"""


# ─────────────────────────────────────────────
# FILE PROCESSOR
# ─────────────────────────────────────────────

SKIP_PATTERNS = [
    "privacy", "terms", "contact", "about", "editorial",
    "404", "woodbury", "blog-post", "game.html",
    "gamevault", "indexcopy", "team.html", "trivia",
    "archive2022", "RREADME", "website-envizion",
    "luma_dashboard", "envizion_editor", "envizion_playground",
]

def should_skip(filepath: str) -> bool:
    name = Path(filepath).name.lower()
    for pattern in SKIP_PATTERNS:
        if pattern.lower() in name:
            return True
    return False

def already_injected(html: str) -> bool:
    return 'id="km-btn"' in html or 'id="km-panel"' in html

def remove_old_injection(html: str) -> str:
    """Strip a previous injection so we can replace it cleanly."""
    start = html.find("<!-- KNOW MORE PANEL")
    end   = html.find("<!-- END KNOW MORE PANEL -->")
    if start != -1 and end != -1:
        html = html[:start] + html[end + len("<!-- END KNOW MORE PANEL -->"):]
    return html

def process_file(filepath: str, dry_run: bool = False, force: bool = False) -> str:
    """Inject know-more snippet into a single HTML file. Returns status string."""
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        html = f.read()

    if already_injected(html):
        if force:
            html = remove_old_injection(html)
        else:
            return "SKIPPED (already injected)"

    if "</body>" not in html.lower():
        return "SKIPPED (no </body> tag found)"

    panel_title, panel_content = get_content_for_file(filepath)
    snippet = build_snippet(panel_title, panel_content)

    # Insert before the LAST </body> tag (case-insensitive)
    idx = html.lower().rfind("</body>")
    new_html = html[:idx] + snippet + "\n" + html[idx:]

    if not dry_run:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_html)
        return f"INJECTED  →  '{panel_title}'"
    else:
        return f"DRY-RUN   →  Would inject '{panel_title}'"


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Inject 'Know More' educational panels into HTML tool pages."
    )
    parser.add_argument(
        "--folder",
        required=True,
        help="Root folder of your website (searched recursively)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would happen without modifying any files"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-inject even if panel already exists (replaces old one)"
    )
    args = parser.parse_args()

    root = Path(args.folder)
    if not root.exists():
        print(f"ERROR: Folder not found: {root}")
        return

    html_files = sorted(root.rglob("*.html"))
    if not html_files:
        print(f"No HTML files found in: {root}")
        return

    print(f"\n{'DRY RUN — ' if args.dry_run else ''}Processing {len(html_files)} HTML files in: {root}\n")
    print(f"{'FILE':<65} STATUS")
    print("─" * 95)

    injected = skipped = errors = 0

    for filepath in html_files:
        rel = str(filepath.relative_to(root))

        if should_skip(str(filepath)):
            print(f"{rel:<65} SKIPPED (policy/non-tool page)")
            skipped += 1
            continue

        try:
            status = process_file(str(filepath), dry_run=args.dry_run, force=args.force)
            print(f"{rel:<65} {status}")
            if "INJECTED" in status or "DRY-RUN" in status:
                injected += 1
            else:
                skipped += 1
        except Exception as e:
            print(f"{rel:<65} ERROR: {e}")
            errors += 1

    print("\n" + "─" * 95)
    print(f"Done.  Injected: {injected}  |  Skipped: {skipped}  |  Errors: {errors}\n")
    if args.dry_run:
        print("This was a DRY RUN — no files were modified.\n")


if __name__ == "__main__":
    main()