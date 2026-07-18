#!/usr/bin/env python3
"""
do_it_all.py
Run from site root. Does everything in one shot:
1. Injects footer into FIX (content) pages only
2. Ensures footer is inside </body></html>
"""
import re
from pathlib import Path

FOOTER = '''<!-- Footer -->
<footer class="bg-envizion-darker text-white pt-16 pb-8 border-t border-envizion-darker relative z-20">
  <div class="container mx-auto px-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
      <div class="lg:col-span-1 space-y-6">
        <a class="flex flex-col inline-block mb-2" href="{p}index.html">
          <div class="flex items-center gap-2">
            <img alt="Yacob Digital logo" class="w-8 h-8 rounded-full border border-gray-700 object-cover" src="{p}logo.png"/>
            <span class="text-xl font-heading font-black text-white tracking-tight">YACOB DIGITAL</span>
          </div>
          <span class="text-[8px] text-gray-400 font-bold tracking-widest uppercase mt-1 ml-10">Websites &amp; Apps</span>
        </a>
        <p class="text-xs text-gray-300 leading-relaxed pr-4 font-medium">Yacob Digital is the home of Envizion, its live collection of browser-based tools and resources.</p>
        <p class="text-[10px] text-gray-400 font-medium">Contact: <a href="mailto:support@envizion.work" class="text-envizion-primary hover:underline">support@envizion.work</a></p>
        <a class="inline-flex items-center gap-2 text-xs font-bold text-white hover:text-envizion-primary transition group" href="{p}website-envizion.html">View Envizion Page</a>
      </div>
      <div>
        <h2 class="text-sm font-bold uppercase tracking-wider mb-6 text-gray-200">Websites &amp; Apps</h2>
        <ul class="space-y-3 text-xs text-gray-300 font-medium">
          <li><a class="hover:text-white transition" href="{p}website-envizion.html">Envizion Website Page</a></li>
          <li><a class="hover:text-white transition" href="{p}guides/">Guides &amp; Documentation</a></li>
          <li><a class="hover:text-white transition" href="{p}tools/">All Tools</a></li>
        </ul>
      </div>
      <div>
        <h2 class="text-sm font-bold uppercase tracking-wider mb-6 text-gray-200">Legal &amp; Trust</h2>
        <ul class="space-y-3 text-xs text-gray-300 font-medium">
          <li><a class="hover:text-white transition" href="{p}about.html">About Us</a></li>
          <li><a class="hover:text-white transition" href="{p}privacy.html">Privacy Policy</a></li>
          <li><a class="hover:text-white transition" href="{p}terms.html">Terms of Service</a></li>
          <li><a class="hover:text-white transition" href="{p}editorial-policy.html">Editorial Policy</a></li>
          <li><a class="hover:text-white transition" href="{p}disclaimer.html">Disclaimer</a></li>
          <li><a class="hover:text-white transition" href="{p}contact.html">Contact Us</a></li>
        </ul>
      </div>
      <div>
        <h2 class="text-sm font-bold uppercase tracking-wider mb-6 text-gray-200">Quick Links</h2>
        <ul class="space-y-3 text-xs text-gray-300 font-medium">
          <li><a class="hover:text-white transition" href="{p}index.html">Company Homepage</a></li>
          <li><a class="hover:text-white transition" href="{p}index.html#page-directory">Portfolio</a></li>
          <li><a class="hover:text-white transition" href="{p}contact.html">Contact Us</a></li>
          <li><a class="hover:text-white transition" href="https://github.com/yacob247" target="_blank" rel="noopener noreferrer">GitHub Profile</a></li>
        </ul>
      </div>
    </div>
    <div class="border-t border-gray-800/60 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-semibold text-gray-400 tracking-wider uppercase">
      <p>&copy; 2026 Yacob Digital. All rights reserved. Australian registered entity.</p>
      <div class="flex items-center gap-4">
        <a class="hover:text-white transition" href="{p}about.html">About</a>
        <span class="text-gray-600">|</span>
        <a class="hover:text-white transition" href="{p}privacy.html">Privacy Policy</a>
        <span class="text-gray-600">|</span>
        <a class="hover:text-white transition" href="{p}terms.html">Terms &amp; Conditions</a>
        <span class="text-gray-600">|</span>
        <a class="hover:text-white transition" href="{p}contact.html">Contact</a>
      </div>
    </div>
  </div>
</footer>'''

# content/landing pages only - prefix = relative path back to root
FIX = {
    "about.html": "",
    "codewebabout.html": "",
    "contact.html": "",
    "disclaimer.html": "",
    "editorial-policy.html": "",
    "index.html": "",
    "privacy.html": "",
    "terms.html": "",
    "website-envizion.html": "",
    "guides/encryption-guide.html": "../",
    "guides/file-formats-guide.html": "../",
    "guides/index.html": "../",
    "guides/media-processing-guide.html": "../",
    "guides/privacy-tools-guide.html": "../",
    "reviews-blog/404.html": "../",
    "reviews-blog/blog.html": "../",
    "reviews-blog/index.html": "../",
    "tools/background-remover-home.html": "../",
    "tools/envizionomniconvertpro.html": "../",
    "tools/index.html": "../",
    "tools/instant-dictionary-home.html": "../",
    "tools/life-tools-home.html": "../",
    "tools/media-library.html": "../",
    "tools/mediaforge-home.html": "../",
    "tools/mediaplayer-home.html": "../",
    "tools/mp4tomp3-home.html": "../",
    "tools/omniconvert-home.html": "../",
    "tools/pdf-to-text-home.html": "../",
    "tools/teleprompter-home.html": "../",
    "tools/tools-guide.html": "../",
    "tools2/about.html": "../",
    "tools2/bulk_webp_converter.html": "../",
    "tools2/contact.html": "../",
    "tools2/image_resizer.html": "../",
    "tools2/index.html": "../",
    "tools2/luma_dashboard_clone.html": "../",
    "tools2/mp3_editor_mp4_converter.html": "../",
    "tools2/pdf_merger.html": "../",
    "tools2/privacy.html": "../",
    "tools2/secure_converter.html": "../",
    "tools2/secure_pdf_compressor.html": "../",
    "tools2/superfast_video_compressor.html": "../",
}

FOOTER_RE = re.compile(r'<!--\s*Footer\s*-->.*?</footer>', re.DOTALL | re.IGNORECASE)

def process(rel, prefix):
    path = Path(rel)
    if not path.exists():
        return "MISSING"
    content = path.read_text(encoding='utf-8', errors='ignore')
    footer_html = FOOTER.replace('{p}', prefix)
    # Remove existing footer if any
    content = FOOTER_RE.sub('', content)
    # Insert before </body>
    if '</body>' in content:
        content = content.replace('</body>', footer_html + '\n</body>')
    else:
        content = content.rstrip() + '\n' + footer_html + '\n</body>\n</html>\n'
    path.write_text(content, encoding='utf-8')
    return "DONE"

def main():
    for rel, prefix in sorted(FIX.items()):
        result = process(rel, prefix)
        print(f"  {result:>8} : {rel}")
    print("\nAll done.")

if __name__ == '__main__':
    main()