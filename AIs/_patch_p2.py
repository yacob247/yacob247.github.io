# -*- coding: utf-8 -*-
# PATCH 1B: web search engine + branch in runNexusTool
text = open(r'index.html', 'r', encoding='utf-8').read()

old_branch = "        let out;\n        if (id === 'bg-remove') {"
assert text.count(old_branch) == 1
text = text.replace(old_branch,
    "        let out;\n"
    "        if (id === 'web-search') {\n"
    "            const q = typeof args === 'string' ? args : ((args && args.prompt) || '');\n"
    "            out = { type: 'text', text: await window.nexusWebSearch(q) };\n"
    "        } else if (id === 'bg-remove') {")

anchor = '    // Audio/video tool runner for chat attachments'
assert anchor in text
ws = '''    // ---------- WEB SEARCH (CORS-friendly; optional SerpAPI key for Google-grade results) ----------
    window.NEXUS_SEARCH_KEY = ''; // <-- paste a SerpAPI key here for full web search; empty = keyless Wikipedia/DuckDuckGo fallback
    window.nexusWebSearch = async (query) => {
        query = (query || '').trim();
        if (!query) throw new Error('No search query given.');
        if (window.NEXUS_SEARCH_KEY) {
            const r = await fetch('https://serpapi.com/search.json?q=' + encodeURIComponent(query) + '&api_key=' + window.NEXUS_SEARCH_KEY + '&num=6');
            const j = await r.json();
            const items = (j.organic_results || []).slice(0, 6).map(x => '- ' + (x.title || '') + '\\n  ' + (x.link || '') + '\\n  ' + ((x.snippet || '').slice(0, 220))).join('\\n');
            return 'Web results for "' + query + '" (Google via SerpAPI):\\n' + (items || 'No results found.');
        }
        let out = '';
        try {
            const r = await fetch('https://api.duckduckgo.com/?q=' + encodeURIComponent(query) + '&format=json&no_html=1');
            const j = await r.json();
            if (j.AbstractText) out += '- ' + (j.Heading || query) + '\\n  ' + (j.AbstractURL || '') + '\\n  ' + j.AbstractText.slice(0, 300) + '\\n';
            for (const t of (j.RelatedTopics || []).slice(0, 3)) if (t.Text) out += '- ' + t.Text.slice(0, 200) + '\\n  ' + (t.FirstURL || '') + '\\n';
        } catch (e) {}
        try {
            const r = await fetch('https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(query) + '&format=json&origin=*&srlimit=4');
            const j = await r.json();
            out += (j.query.search || []).map(x => '- ' + x.title + '\\n  https://en.wikipedia.org/wiki/' + encodeURIComponent(x.title.replace(/ /g, '_')) + '\\n  ' + x.snippet.replace(/<[^>]+>/g, '').slice(0, 200)).join('\\n');
        } catch (e) {}
        return 'Web results for "' + query + '" (keyless mode: Wikipedia/DuckDuckGo - add a SerpAPI key for full Google results):\\n' + (out || 'No results found.');
    };

'''
text = text.replace(anchor, ws + anchor, 1)
open(r'index.html', 'w', encoding='utf-8', newline='').write(text)
print('PATCH 1B OK (web search)')
