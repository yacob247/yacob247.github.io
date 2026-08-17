const fs = require('fs');

const file = 'index.html';
let html = fs.readFileSync(file, 'utf8');

const toolsSection = `<!-- Section: Envizion Tools -->
<section class="py-16 lg:py-20 bg-envizion-gray" id="tools">
<div class="container mx-auto px-6">
<div class="text-center mb-12">
<h2 class="text-2xl md:text-3xl font-heading font-black text-envizion-dark mb-3">Explore Envizion</h2>
<p class="text-sm text-gray-500 max-w-2xl mx-auto">Start with a clear section overview, then choose an individual browser tool when you know what you need.</p>
</div>
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
<a href="https://envizion.work/tools/index.html" class="block bg-white border border-gray-100 rounded-lg p-5 hover:border-envizion-primary hover:shadow-card transition group">
<h3 class="font-heading font-bold text-sm text-envizion-dark mb-1 group-hover:text-envizion-primary transition-colors">Tools Directory</h3>
<p class="text-xs text-gray-500 leading-relaxed">Browse media, document, image, audio, and everyday browser utilities with a short explanation for each.</p>
<span class="mt-3 inline-block text-[10px] font-bold text-envizion-primary uppercase tracking-wide">Browse tools &rarr;</span>
</a>
<a href="https://envizion.work/tools/tools-guide.html" class="block bg-white border border-gray-100 rounded-lg p-5 hover:border-envizion-primary hover:shadow-card transition group">
<h3 class="font-heading font-bold text-sm text-envizion-dark mb-1 group-hover:text-envizion-primary transition-colors">Tools Guide</h3>
<p class="text-xs text-gray-500 leading-relaxed">Compare workflows, file handling, privacy expectations, and the right starting point before opening a tool.</p>
<span class="mt-3 inline-block text-[10px] font-bold text-envizion-primary uppercase tracking-wide">Read the guide &rarr;</span>
</a>
<a href="https://envizion.work/tools2/index.html" class="block bg-white border border-gray-100 rounded-lg p-5 hover:border-envizion-primary hover:shadow-card transition group">
<h3 class="font-heading font-bold text-sm text-envizion-dark mb-1 group-hover:text-envizion-primary transition-colors">Advanced Tools</h3>
<p class="text-xs text-gray-500 leading-relaxed">Explore the separate Tools 2.0 collection for video, 3D, creative, and developer workflows.</p>
<span class="mt-3 inline-block text-[10px] font-bold text-envizion-primary uppercase tracking-wide">Open Tools 2.0 &rarr;</span>
</a>
<a href="https://envizion.work/tools2/envizion_editor.html" class="block bg-white border border-gray-100 rounded-lg p-5 hover:border-envizion-primary hover:shadow-card transition group">
<h3 class="font-heading font-bold text-sm text-envizion-dark mb-1 group-hover:text-envizion-primary transition-colors">Envizion Video Editor</h3>
<p class="text-xs text-gray-500 leading-relaxed">Read how the local timeline editor handles clips, images, audio, text, filters, transitions, and export.</p>
<span class="mt-3 inline-block text-[10px] font-bold text-envizion-primary uppercase tracking-wide">View editor &rarr;</span>
</a>
</div>
</div>
</section>
`;

const reviewsSection = `<!-- Section: Reviews &amp; Blog -->
<section class="py-16 lg:py-20 bg-envizion-gray" id="reviews-blog">
<div class="container mx-auto px-6">
<div class="text-center mb-12">
<h2 class="text-2xl md:text-3xl font-heading font-black text-envizion-dark mb-3">Reviews &amp; Blog</h2>
<p class="text-sm text-gray-500 max-w-2xl mx-auto">Original game reviews, practical articles, and topic guides from the Envizion editorial section.</p>
</div>
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
<a href="https://envizion.work/reviews-blog/index.html" class="block bg-white border border-gray-100 rounded-lg p-5 hover:border-envizion-primary hover:shadow-card transition group">
<h3 class="font-heading font-bold text-sm text-envizion-dark mb-1 group-hover:text-envizion-primary transition-colors">Reviews Hub</h3>
<p class="text-xs text-gray-500 leading-relaxed">Browse the GameVault review collection and move from the overview to an individual review.</p>
<span class="mt-3 inline-block text-[10px] font-bold text-envizion-primary uppercase tracking-wide">Browse reviews &rarr;</span>
</a>
<a href="https://envizion.work/reviews-blog/blog.html" class="block bg-white border border-gray-100 rounded-lg p-5 hover:border-envizion-primary hover:shadow-card transition group">
<h3 class="font-heading font-bold text-sm text-envizion-dark mb-1 group-hover:text-envizion-primary transition-colors">Blog Articles</h3>
<p class="text-xs text-gray-500 leading-relaxed">Read the article index for technology notes, gaming commentary, and practical explainers.</p>
<span class="mt-3 inline-block text-[10px] font-bold text-envizion-primary uppercase tracking-wide">Read articles &rarr;</span>
</a>
<a href="https://envizion.work/guides/" class="block bg-white border border-gray-100 rounded-lg p-5 hover:border-envizion-primary hover:shadow-card transition group">
<h3 class="font-heading font-bold text-sm text-envizion-dark mb-1 group-hover:text-envizion-primary transition-colors">Practical Guides</h3>
<p class="text-xs text-gray-500 leading-relaxed">Find focused documentation about media processing, file formats, encryption, and privacy tools.</p>
<span class="mt-3 inline-block text-[10px] font-bold text-envizion-primary uppercase tracking-wide">Open guides &rarr;</span>
</a>
<a href="https://envizion.work/editorial-policy.html" class="block bg-white border border-gray-100 rounded-lg p-5 hover:border-envizion-primary hover:shadow-card transition group">
<h3 class="font-heading font-bold text-sm text-envizion-dark mb-1 group-hover:text-envizion-primary transition-colors">Editorial Policy</h3>
<p class="text-xs text-gray-500 leading-relaxed">See how reviews, guides, and practical content are structured and maintained.</p>
<span class="mt-3 inline-block text-[10px] font-bold text-envizion-primary uppercase tracking-wide">Read policy &rarr;</span>
</a>
</div>
</div>
</section>
`;

const toolsPattern = /<!-- Section: Envizion Tools -->[\s\S]*?(?=<!-- Section: Reviews &amp; Blog -->)/;
const reviewsPattern = /<!-- Section: Reviews &amp; Blog -->[\s\S]*?(?=<!-- Section: Final CTA -->)/;
if (!toolsPattern.test(html) || !reviewsPattern.test(html)) throw new Error('Company homepage section markers not found.');
html = html.replace(toolsPattern, toolsSection);
html = html.replace(reviewsPattern, reviewsSection);
fs.writeFileSync(file, html, 'utf8');
console.log('Curated company homepage navigation to section landing pages.');
