import os

PATCHES = {
    'tools2/envizion_playground.html': ('tool-about-playground', '''
<section id="tool-about-playground" style="padding:2rem;max-width:1000px;margin:2rem auto;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);"><h2 style="margin:0 0 1rem;font-size:1.8rem;font-weight:800;color:#0f172a;">Understanding the Playground Environment</h2>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">This sandbox environment lets you experiment with code and UI designs in real-time. You can test HTML structures, CSS layouts, and JavaScript functions without setting up any development tools. The instant preview updates as you type, making it perfect for learning, prototyping, and debugging.</p>
<h3 style="font-size:1.3rem;font-weight:700;color:#0f172a;margin:1.5rem 0 0.8rem;">Who Benefits Most</h3>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">Web developers can quickly test code snippets. Designers can experiment with layouts. Students can practice coding concepts. Educators can demonstrate web technologies live. The zero-setup nature makes it ideal for workshops, tutorials, and quick experimentation.</p>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">All processing is local and private. No code is sent to any server. Your experiments remain confidential. Close the tab and everything disappears. This tool is for unrestricted creative exploration of web technologies.</p>
</section>'''),
    'tools2/envizion_editor.html': ('tool-about-editor2', '''
<section id="tool-about-editor2" style="padding:2rem;max-width:1000px;margin:2rem auto;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);"><h2 style="margin:0 0 1rem;font-size:1.8rem;font-weight:800;color:#0f172a;">Browser-Based Code Editor Features</h2>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">This code editor provides syntax highlighting, auto-completion, and live preview for HTML, CSS, and JavaScript. It is designed for rapid prototyping and learning. The split-pane view shows your code alongside the rendered output, updating in real-time as you type.</p>
<h3 style="font-size:1.3rem;font-weight:700;color:#0f172a;margin:1.5rem 0 0.8rem;">Key Advantages</h3>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">No installation required - works in any modern browser. All code runs locally with no server upload. Perfect for testing snippets before integrating into larger projects. The live preview eliminates the save-refresh cycle of traditional development.</p>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">Use it for learning web development fundamentals, testing browser API features, debugging CSS layouts, or prototyping UI components. The editor supports multiple file types and provides a clean, distraction-free coding environment.</p>
</section>'''),
    'tools2/luma_dashboard_clone.html': ('tool-about-luma2', '''
<section id="tool-about-luma2" style="padding:2rem;max-width:1000px;margin:2rem auto;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);"><h2 style="margin:0 0 1rem;font-size:1.8rem;font-weight:800;color:#0f172a;">Dashboard Interface Overview</h2>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">This dashboard provides a visual interface for monitoring metrics, tracking performance, and analyzing data trends. The clean card-based layout organizes information into digestible sections for quick scanning and decision-making.</p>
<h3 style="font-size:1.3rem;font-weight:700;color:#0f172a;margin:1.5rem 0 0.8rem;">Practical Applications</h3>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">Dashboards are essential tools for tracking business KPIs, monitoring website analytics, reviewing user engagement metrics, and observing system performance. The visual format makes complex data accessible at a glance, enabling faster insights and better decisions.</p>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">This implementation demonstrates a modern dashboard layout with responsive design, data visualization components, and interactive elements. It can serve as a template for building custom monitoring interfaces for various applications.</p>
</section>'''),
    'website-envizion.html': ('about-envizion-more', '''
<section class="py-16 bg-white" id="about-envizion-more"><div class="container mx-auto px-6 max-w-5xl"><div class="bg-envizion-gray rounded-2xl p-8">
<h2 class="text-3xl font-heading font-black text-envizion-dark mb-4 tracking-tight">Why Choose Envizion Tools</h2>
<p class="text-gray-600 leading-relaxed font-medium mb-4">Envizion tools are designed with a simple philosophy: useful functionality should not require installation, accounts, or compromises on privacy. Every tool in the collection runs 100% in your browser, processes files locally, and leaves no trace after use.</p>
<p class="text-gray-600 leading-relaxed font-medium mb-4">The platform currently offers over 25 tools covering image processing, audio/video conversion, PDF manipulation, file encryption, creative utilities, and reference resources. New tools are added regularly based on user requests and emerging needs.</p>
<p class="text-gray-600 leading-relaxed font-medium">All Envizion tools are free to use with no limitations, no premium tiers, and no hidden costs. This commitment to free, private, browser-based tools reflects the core mission of Yacob Digital: making practical technology accessible to everyone.</p>
</div></div></section>'''),
    'tools/envizionomniconvertpro.html': ('about-omniconvert', '''
<section id="about-omniconvert" style="padding:2rem;max-width:1100px;margin:2rem auto;"><h2 style="font-size:1.8rem;font-weight:800;color:#0f172a;margin:0 0 1rem;">OmniConvert Pro Features</h2>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">OmniConvert Pro is a comprehensive file conversion workspace supporting images, audio, documents, and more. It consolidates multiple conversion tools into one unified interface, eliminating the need to switch between different applications for different file types.</p>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">The tool handles common formats including images (PNG, JPG, WEBP, GIF, BMP), audio (MP3, WAV, OGG, AAC), and text documents. All conversions happen locally in your browser. Your files never leave your device, ensuring complete privacy for sensitive documents.</p>
<p style="line-height:1.8;color:#334155;margin-bottom:1rem;">Ideal for content creators needing quick format conversions, office workers preparing documents, students converting files for assignments, and anyone who needs reliable file conversion without subscription fees or software installation.</p>
</section>'''),
    'editorial-policy.html': ('',
'''<div class="mt-12 p-8 bg-gray-50 rounded-xl border border-gray-200">
<h2 class="text-2xl font-heading font-black text-envizion-dark mb-4">Why These Policies Matter</h2>
<p class="text-gray-600 leading-relaxed font-medium mb-4">Clear editorial policies demonstrate to both readers and advertising platforms that a website operates with integrity and transparency. Google AdSense reviewers look for sites with established content standards, original material, and clear separation between editorial and advertising content.</p>
<p class="text-gray-600 leading-relaxed font-medium mb-4">Envizion publishes original content created by human writers. We do not use AI content generators to produce articles, reviews, or guides. Each piece is researched, outlined, and written with the goal of providing unique value to the reader. We believe this commitment to human-created content is essential to maintaining trust and meeting Google's quality standards.</p>
<p class="text-gray-600 leading-relaxed font-medium">Our review process ensures that all published content meets our quality benchmarks before appearing in the sitemap. Pages that do not meet these standards are kept in draft status until they have sufficient depth, context, and editorial care to stand alone as valuable resources for our readers.</p>
</div>''')
}

for fp, (sid, patch) in PATCHES.items():
    content = open(fp, 'r', encoding='utf-8', errors='ignore').read()
    if sid and sid in content:
        print(f'SKIP: {fp}')
        continue
    if '</main>' in content:
        content = content.replace('</main>', patch + '\n</main>')
    elif 'article' in content and '</article>' in content:
        content = content.replace('</article>', patch + '\n</article>')
    elif '</div><!-- END FOLDER NAV BAR -->' in content:
        content = content.replace('</div><!-- END FOLDER NAV BAR -->', patch + '\n</div><!-- END FOLDER NAV BAR -->')
    elif '</body>' in content:
        content = content.replace('</body>', '<main>\n' + patch + '\n</main>\n</body>')
    else:
        print(f'FAIL: {fp}')
        continue
    open(fp, 'w', encoding='utf-8').write(content)
    print(f'OK: {fp}')
print('Done!')