import os, re

PATCHES = {
    'tools/omniconvert-home.html': 'About OmniConvert Pro',
    'tools/instant-dictionary-home.html': 'About the Instant Dictionary',
    'tools/mediaforge-home.html': 'About MediaForge Pro',
    'tools/media-library.html': 'About the Media Library',
    'tools/pdf-to-text-home.html': 'About the PDF to Text Tool',
    'tools/pdfstotxt.html': 'About PDF Text Extraction',
    'tools/teleprompter-home.html': 'About the Teleprompter',
    'tools/life-tools-home.html': 'About Life Tools',
}

CONTENT = '''<section id="tool-about" style="padding:2rem;max-width:1000px;margin:2rem auto;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);font-family:system-ui,sans-serif;">
<h2 style="margin:0 0 1rem;font-size:1.8rem;font-weight:800;color:#0f172a;">__TITLE__</h2>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;font-size:1rem;">This free browser-based tool is part of the Envizion collection, designed to help you complete common digital tasks quickly and privately. All processing happens locally in your browser, meaning your files never leave your device. No account is required, no data is stored on any server, and there are no installation requirements.</p>
<h3 style="margin:1.5rem 0 0.8rem;font-size:1.3rem;font-weight:700;color:#0f172a;">How It Works</h3>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;font-size:1rem;">Modern web browsers have become powerful computing platforms capable of performing complex tasks that once required dedicated desktop software. Using technologies like WebAssembly, Canvas API, Web Audio API, and the File System Access API, this tool delivers professional-grade functionality directly in your browser. Simply open the page, use the tool, and close it when done. There is nothing to download and nothing to install.</p>
<h3 style="margin:1.5rem 0 0.8rem;font-size:1.3rem;font-weight:700;color:#0f172a;">Privacy First Design</h3>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;font-size:1rem;">Every Envizion tool is built with privacy as a core principle. When you use this tool, your files are processed entirely within your browser session. There are no upload servers, no data retention, and no third-party access to your content. This makes the tool suitable for sensitive documents, personal media, and any files you prefer to keep private. Once you close the browser tab, no trace of your activity remains.</p>
<h3 style="margin:1.5rem 0 0.8rem;font-size:1.3rem;font-weight:700;color:#0f172a;">Who Should Use This Tool</h3>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;font-size:1rem;">This tool is designed for anyone who needs to complete a specific task without the complexity of traditional software. Whether you are a student working on assignments, a professional handling documents, a content creator processing media, or someone who simply needs a quick utility, this tool provides a straightforward solution. The interface is designed to be intuitive and requires no technical expertise to operate.</p>
<h3 style="margin:1.5rem 0 0.8rem;font-size:1.3rem;font-weight:700;color:#0f172a;">Getting Started</h3>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;font-size:1rem;">To begin using this tool, simply navigate to the main interface and follow the on-screen prompts. Most tools support drag-and-drop file selection for convenience. Detailed instructions are provided within the tool interface. If you need additional guidance, refer to the Envizion Tools Guide for comprehensive documentation covering all available features and best practices.</p>
</section>'''

for fp in sorted(PATCHES.keys()):
    content = open(fp, 'r', encoding='utf-8', errors='ignore').read()
    if 'tool-about' in content:
        print(f'SKIP: {fp}')
        continue
    title = PATCHES[fp]
    patch = CONTENT.replace('__TITLE__', title)
    if '</main>' in content:
        content = content.replace('</main>', patch + '\n</main>')
        open(fp, 'w', encoding='utf-8').write(content)
        print(f'OK: {fp}')
    elif '</body>' in content:
        content = content.replace('</body>', '<main>\n' + patch + '\n</main>\n</body>')
        open(fp, 'w', encoding='utf-8').write(content)
        print(f'OK: {fp}')
    else:
        print(f'FAIL: {fp}')

print('Done!')