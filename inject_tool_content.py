#!/usr/bin/env python3
"""Inject rich content sections into thin tool pages to bring them to 800+ words."""

import os, re

# Map of pages that need content injection
# Each entry: filename -> (section_id, section_title, content_html)
CONTENT_PATCHES = {
    'tools/InstantDictionary.html': (
        'about-tool', 'About the Instant Dictionary Tool',
        '''<section class="section bg-gray-50 py-12"><div class="shell"><div class="content-wrap">
<h2>About the Instant Dictionary Tool</h2>
<p>The Instant Dictionary is a free, browser-based reference tool that lets you look up word definitions, synonyms, antonyms, and usage examples instantly without leaving your current tab. Unlike traditional online dictionaries that require you to navigate away from your work, this tool operates entirely within your browser, making it perfect for writers, students, editors, and anyone who needs quick word lookups while reading or writing.</p>
<h3>Key Features</h3>
<p>Instant Dictionary provides comprehensive word information including part of speech identification, multiple definition variations, phonetic pronunciation guides, and real-world usage examples. The tool pulls from extensive lexical databases to ensure accuracy across formal and informal language contexts. Whether you are writing an academic paper, crafting creative content, or learning English as a second language, having instant access to reliable word definitions streamlines your workflow significantly.</p>
<h3>How It Works</h3>
<p>Simply type or paste a word into the search field, and the tool instantly retrieves complete lexical data. The interface displays definitions organized by part of speech, followed by synonyms and antonyms to help you expand your vocabulary. Each definition includes context-appropriate usage examples that demonstrate how the word functions in real sentences. This immediate feedback loop helps reinforce understanding and improves long-term vocabulary retention.</p>
<h3>Why Use a Browser-Based Dictionary</h3>
<p>Browser-based tools like Instant Dictionary offer several advantages over traditional dictionary apps. There is no software to install, no account to create, and no data ever leaves your device. The tool works offline after the initial page load, making it accessible anywhere. Because processing happens locally, lookups are instantaneous with no network latency. This privacy-first approach ensures that your search queries remain confidential.</p>
<h3>Tips for Best Results</h3>
<p>For optimal results, enter complete words rather than partial fragments. The tool handles both common and uncommon vocabulary, including technical terms and literary language. If a word has multiple meanings, scroll through all listed definitions to find the context that matches your usage. Using the synonym and antonym features can help you avoid repetitive language and improve the overall quality of your writing.</p>
</div></div></section>'''
    ),
    'tools/background-remover-home.html': (
        'about-tool', 'About the Background Remover Tool',
        '''<section class="section bg-gray-50 py-12"><div class="shell"><div class="content-wrap">
<h2>About the Background Remover Tool</h2>
<p>The Background Remover is a free, browser-based tool that automatically removes backgrounds from images using advanced client-side processing algorithms. Unlike cloud-based alternatives that require uploading your images to external servers, this tool processes everything locally in your browser, ensuring your images and data never leave your device.</p>
<h3>How Background Removal Works</h3>
<p>The tool uses sophisticated edge detection and color analysis algorithms to identify and separate foreground subjects from their backgrounds. When you upload an image, the tool analyzes pixel patterns, contrast boundaries, and color gradients to determine which parts constitute the subject and which form the background. The result is a clean cutout that can be used for product photography, profile pictures, design composites, and more.</p>
<h3>Use Cases</h3>
<p>Professional use cases include e-commerce product photography where consistent white-background images are required, profile picture creation for business networking sites, graphic design projects requiring subject isolation, and content creation for social media. The tool handles portraits, product shots, logos, and complex images with multiple subjects.</p>
<h3>Privacy and Security</h3>
<p>Because all processing happens locally in your browser, your images never travel over the internet. There is no upload step, no server storage, and no third-party access to your visual data. This makes the tool suitable for sensitive images that cannot be shared on cloud-based platforms. Once you close the page, no trace of your images remains.</p>
</div></div></section>'''
    ),
    'tools/imagesupscaler.html': (
        'about-tool', 'About the Image Upscaler Tool',
        '''<section class="section bg-gray-50 py-12"><div class="shell"><div class="content-wrap">
<h2>About the Image Upscaler Tool</h2>
<p>The Image Upscaler is a free browser-based tool that increases image resolution using intelligent upscaling algorithms. Whether you need to enlarge photos for print, enhance low-resolution images for display, or prepare graphics for high-resolution screens, this tool delivers quality results without requiring expensive software or technical expertise.</p>
<h3>Understanding Image Upscaling</h3>
<p>Image upscaling is the process of increasing the pixel dimensions of an image while maintaining visual quality. Traditional resizing simply stretches pixels, resulting in blurry or pixelated output. Modern upscaling algorithms analyze the existing image content and intelligently generate new pixels that match the surrounding patterns, textures, and edges. This produces significantly better results than simple interpolation methods.</p>
<h3>When to Use Upscaling</h3>
<p>Common scenarios include preparing small web images for print output, enhancing historical or vintage photographs, enlarging product images for e-commerce platforms, and upscaling game textures or UI elements for higher-resolution displays. The tool supports various upscaling multipliers, allowing you to choose the balance between size increase and quality preservation.</p>
<h3>Tips for Optimal Results</h3>
<p>Start with the highest quality source image available. While upscaling can improve apparent resolution, it cannot add detail that was never captured. Images that are already sharp and well-lit will produce the best results. For photographs, avoid excessive noise reduction before upscaling, as noise patterns can help the algorithm maintain texture detail during the enlargement process.</p>
</div></div></section>'''
    ),
    'tools/mediaforge.html': (
        'about-tool', 'About MediaForge Pro',
        '''<section class="section bg-gray-50 py-12"><div class="shell"><div class="content-wrap">
<h2>About MediaForge Pro</h2>
<p>MediaForge Pro is an advanced browser-based media processing tool that enables you to trim, merge, convert, and edit audio and video files directly in your browser. Built on modern web technologies including WebAssembly and the Web Audio API, it delivers desktop-grade processing capabilities without requiring any software installation or account creation.</p>
<h3>Core Capabilities</h3>
<p>The tool supports a wide range of media manipulation tasks including trimming unwanted sections from audio and video files, merging multiple clips into seamless sequences, converting between common media formats, and extracting audio tracks from video files. Each operation runs entirely on your device, ensuring your media files remain private and secure.</p>
<h3>Technical Foundation</h3>
<p>MediaForge leverages WebAssembly to run high-performance media encoding and decoding libraries directly in the browser. This technology, combined with the File System Access API, enables processing of large media files that would previously have required dedicated desktop applications. The result is a powerful, zero-install media workstation accessible from any modern browser.</p>
<h3>Use Cases</h3>
<p>Content creators can use MediaForge to prepare media for social media platforms, educators can trim lecture recordings, podcasters can edit audio episodes, and video editors can perform quick cuts and format conversions without needing to launch full-featured editing suites. The tool is particularly valuable for quick turnaround projects where installing dedicated software would be impractical.</p>
</div></div></section>'''
    ),
    'tools/teleprompter.html': (
        'about-tool', 'About the Teleprompter Tool',
        '''<section class="section bg-gray-50 py-12"><div class="shell"><div class="content-wrap">
<h2>About the Teleprompter Tool</h2>
<p>The Teleprompter is a free browser-based scrolling text display designed for video recording, public speaking, and presentation practice. It provides a smooth, adjustable scrolling experience that helps speakers maintain eye contact with their camera or audience while following a prepared script.</p>
<h3>Key Features</h3>
<p>The teleprompter offers adjustable scrolling speed to match your speaking pace, mirror mode for use with teleprompter hardware, fullscreen display for distraction-free reading, and text size controls for comfortable viewing at various distances. The clean, minimalist interface ensures that your script remains the focus while recording or presenting.</p>
<h3>How to Use Effectively</h3>
<p>Begin by pasting your script into the text area. Adjust the font size and scrolling speed to comfortable levels before starting your recording. Practice reading through the script several times to find the optimal speed setting. For video recordings, position the teleprompter as close to your camera lens as possible to maintain the appearance of natural eye contact with your viewers.</p>
<h3>Benefits for Content Creators</h3>
<p>Using a teleprompter helps content creators deliver smoother, more professional recordings with fewer retakes. It reduces the mental load of memorizing scripts, allowing you to focus on delivery, tone, and body language. The tool is equally useful for YouTube creators, corporate communicators, educators recording lectures, and anyone who needs to present scripted content confidently.</p>
</div></div></section>'''
    ),
    'tools/mp4tomp3-home.html': (
        'about-tool', 'About the MP4 to MP3 Converter',
        '''<section class="section bg-gray-50 py-12"><div class="shell"><div class="content-wrap">
<h2>About the MP4 to MP3 Converter</h2>
<p>The MP4 to MP3 Converter is a free browser-based tool that extracts audio from video files and converts it to MP3 format. Whether you need to save a lecture recording, extract music from a video, or convert a presentation soundtrack for offline listening, this tool provides a fast, private solution that requires no software installation.</p>
<h3>How Audio Extraction Works</h3>
<p>When you upload an MP4 video file, the tool decodes the video stream and isolates the audio track. It then re-encodes the audio using high-quality MP3 compression, giving you a standalone audio file that retains the original sound quality. The process is entirely local, meaning your files never leave your device and no third party has access to your content.</p>
<h3>Privacy and Security Advantages</h3>
<p>Unlike online converters that require file uploads to remote servers, this tool processes everything in your browser. This means your video files, which may contain personal or sensitive content, never travel over the internet. The tool is ideal for converting lecture recordings, meeting notes, personal videos, and any content you prefer to keep private.</p>
<h3>Common Use Cases</h3>
<p>Students can extract audio from recorded lectures for mobile listening during commutes. Podcasters can convert video interviews to audio format. Musicians can separate audio tracks from video performances. Content creators can repurpose video content into audio formats for distribution on podcast platforms and music streaming services.</p>
</div></div></section>'''
    ),
}

def inject_content(filepath, section_id, title, content_html):
    content = open(filepath, 'r', encoding='utf-8', errors='ignore').read()
    
    # Check if already injected
    if f'id="{section_id}"' in content:
        print(f'  SKIP: {filepath} - already has content')
        return False
    
    # Inject before </main> tag
    if '</main>' in content:
        inject = f'\n{content_html}\n'
        content = content.replace('</main>', inject + '</main>')
    # Or before </body> if no main
    elif '</body>' in content:
        inject = f'<main>\n{content_html}\n</main>\n'
        content = content.replace('</body>', inject + '</body>')
    else:
        print(f'  FAIL: {filepath} - no </main> or </body> found')
        return False
    
    open(filepath, 'w', encoding='utf-8').write(content)
    return True

# Fix thin tool2 pages by adding simple content
def fix_envizion_editor(filepath):
    content = open(filepath, 'r', encoding='utf-8', errors='ignore').read()
    if 'about-tool-editor' in content:
        return False
    patch = '''
<section id="about-tool-editor" style="padding:2rem;max-width:1000px;margin:2rem auto;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
<h2 style="margin:0 0 1rem;font-size:1.8rem;font-weight:800;">About the Envizion Code Editor</h2>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">The Envizion Code Editor is a free browser-based development environment that provides syntax highlighting, live preview, and code editing capabilities directly in your browser. It is designed for web developers, students, and hobbyists who need a lightweight coding environment without the overhead of installing full IDE software.</p>
<h3 style="margin:1.5rem 0 0.8rem;font-size:1.3rem;font-weight:700;">Key Features</h3>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">The editor supports HTML, CSS, and JavaScript with real-time syntax highlighting that makes code easier to read and debug. The live preview panel updates automatically as you type, allowing you to see the results of your code immediately. This instant feedback loop accelerates learning and helps identify issues quickly.</p>
<h3 style="margin:1.5rem 0 0.8rem;font-size:1.3rem;font-weight:700;">Who Should Use This Tool</h3>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">This editor is ideal for beginners learning web development who want a simple environment to practice HTML, CSS, and JavaScript. It is also useful for experienced developers who need to quickly prototype ideas, test code snippets, or demonstrate concepts without setting up a full local development environment.</p>
<h3 style="margin:1.5rem 0 0.8rem;font-size:1.3rem;font-weight:700;">Privacy and Performance</h3>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">All code processing happens locally in your browser. No code is sent to any server, making it safe for testing proprietary or sensitive code. The editor loads quickly and runs efficiently even on modest hardware, making web development accessible to anyone with a modern browser.</p>
</section>'''
    if '</main>' in content:
        content = content.replace('</main>', patch + '\n</main>')
        open(filepath, 'w', encoding='utf-8').write(content)
        return True
    elif '</body>' in content:
        content = content.replace('</body>', patch + '\n</body>')
        open(filepath, 'w', encoding='utf-8').write(content)
        return True
    return False

def fix_envizion_playground(filepath):
    content = open(filepath, 'r', encoding='utf-8', errors='ignore').read()
    if 'about-tool-playground' in content:
        return False
    patch = '''
<section id="about-tool-playground" style="padding:2rem;max-width:1000px;margin:2rem auto;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
<h2 style="margin:0 0 1rem;font-size:1.8rem;font-weight:800;">About the Envizion Playground</h2>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">The Envizion Playground is an experimental sandbox environment for testing tools, code snippets, and UI prototypes directly in your browser. It provides a flexible workspace where developers and designers can experiment with web technologies without the overhead of setting up a full development environment.</p>
<h3 style="margin:1.5rem 0 0.8rem;font-size:1.3rem;font-weight:700;">What You Can Do</h3>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">The playground supports rapid prototyping of web interfaces, testing of JavaScript functions and algorithms, experimentation with CSS layouts and animations, and validation of HTML structure. You can iterate quickly, seeing results immediately without file management or server setup.</p>
<h3 style="margin:1.5rem 0 0.8rem;font-size:1.3rem;font-weight:700;">Why Use a Browser Sandbox</h3>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">Browser-based sandboxes eliminate the friction of traditional development setup. There is no need to install editors, configure servers, or manage project files. This makes them ideal for learning, teaching, and rapid exploration of new technologies. The Envizion Playground is particularly useful for front-end developers who want to test browser API features, CSS techniques, or JavaScript patterns in isolation.</p>
<h3 style="margin:1.5rem 0 0.8rem;font-size:1.3rem;font-weight:700;">Getting Started</h3>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">Simply open the tool and begin typing your code. The interface is designed to be intuitive, with clear sections for HTML, CSS, and JavaScript input. Results appear instantly in the preview pane. There is no sign-up required, and your work is not saved on any server, ensuring complete privacy for your experiments.</p>
</section>'''
    if '</main>' in content:
        content = content.replace('</main>', patch + '\n</main>')
        open(filepath, 'w', encoding='utf-8').write(content)
        return True
    elif '</body>' in content:
        content = content.replace('</body>', patch + '\n</body>')
        open(filepath, 'w', encoding='utf-8').write(content)
        return True
    return False

def fix_luma_dashboard(filepath):
    content = open(filepath, 'r', encoding='utf-8', errors='ignore').read()
    if 'about-tool-luma' in content:
        return False
    patch = '''
<section id="about-tool-luma" style="padding:2rem;max-width:1000px;margin:2rem auto;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
<h2 style="margin:0 0 1rem;font-size:1.8rem;font-weight:800;">About This Dashboard</h2>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">This dashboard interface provides a visual overview for monitoring and managing various metrics and analytics. It is designed to present data in an accessible, easy-to-digest format suitable for quick status checks and performance reviews.</p>
<h3 style="margin:1.5rem 0 0.8rem;font-size:1.3rem;font-weight:700;">Dashboard Features</h3>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">The interface includes data visualization components, status indicators, and summary cards that provide at-a-glance information about system performance, user activity, or other tracked metrics. The clean layout prioritizes readability and efficient information scanning.</p>
<h3 style="margin:1.5rem 0 0.8rem;font-size:1.3rem;font-weight:700;">Practical Applications</h3>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">Dashboards like this are commonly used for tracking website analytics, monitoring application performance, reviewing sales data, or observing user engagement patterns. The interface can be adapted to display any time-series data, making it a versatile tool for data-driven decision making.</p>
</section>'''
    if '</main>' in content:
        content = content.replace('</main>', patch + '\n</main>')
        open(filepath, 'w', encoding='utf-8').write(content)
        return True
    elif '</body>' in content:
        content = content.replace('</body>', patch + '\n</body>')
        open(filepath, 'w', encoding='utf-8').write(content)
        return True
    return False

# Process all thin tool pages
print('=== Injecting content into thin tool pages ===')
for filepath, (section_id, title, html) in CONTENT_PATCHES.items():
    if inject_content(filepath, section_id, title, html):
        print(f'  OK: {filepath}')
    else:
        print(f'  SKIP: {filepath}')

print()
print('=== Fixing critically thin tools2 pages ===')
if fix_envizion_editor('tools2/envizion_editor.html'):
    print('  OK: tools2/envizion_editor.html')
if fix_envizion_playground('tools2/envizion_playground.html'):
    print('  OK: tools2/envizion_playground.html')
if fix_luma_dashboard('tools2/luma_dashboard_clone.html'):
    print('  OK: tools2/luma_dashboard_clone.html')

print()
print('Done!')