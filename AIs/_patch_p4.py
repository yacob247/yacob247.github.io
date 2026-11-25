# -*- coding: utf-8 -*-
# PATCH 1D: "+" attach menu (Select file / Images) + second hidden input + menu JS
text = open(r'index.html', 'r', encoding='utf-8').read()
def rep(old, new, count=1):
    global text
    assert text.count(old) == count, 'count=%d for %s' % (text.count(old), old[:60])
    text = text.replace(old, new)

old_btn = """<button onclick="window.triggerProtectedFileAttachment()" class="h-10 w-10 rounded-full hover:bg-gemini-card/80 text-slate-400 hover:text-white smooth-transition flex items-center justify-center" title="Upload custom file">
                                <i class="fa-regular fa-image text-[17px]"></i>
                            </button>"""
new_btn = """<div class="relative">
                                <button onclick="window.toggleAttachMenu(event)" class="h-10 w-10 rounded-full hover:bg-gemini-card/80 text-slate-400 hover:text-white smooth-transition flex items-center justify-center" title="Attach">
                                    <i class="fa-solid fa-plus text-[17px]"></i>
                                </button>
                                <div id="attach-menu" class="hidden absolute bottom-full mb-2 left-0 glass-menu rounded-2xl border border-gemini-border/50 shadow-2xl py-2 min-w-[200px] z-50">
                                    <div class="px-3 pb-1.5 pt-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Attach</div>
                                    <button onclick="window.attachPick('file')" class="w-full text-left px-4 py-2.5 hover:bg-gemini-card/60 smooth-transition flex items-center gap-3 text-xs text-slate-300"><i class="fa-solid fa-paperclip text-slate-400"></i> Select file (any type)</button>
                                    <button onclick="window.attachPick('image')" class="w-full text-left px-4 py-2.5 hover:bg-gemini-card/60 smooth-transition flex items-center gap-3 text-xs text-slate-300"><i class="fa-regular fa-image text-slate-400"></i> Images</button>
                                    <button onclick="window.attachPick('library')" class="w-full text-left px-4 py-2.5 hover:bg-gemini-card/60 smooth-transition flex items-center gap-3 text-xs text-slate-300"><i class="fa-solid fa-folder-open text-slate-400"></i> Open Library</button>
                                </div>
                            </div>"""
rep(old_btn, new_btn)

# second hidden input for images
rep('<input type="file" id="file-upload-input" accept="*" class="hidden" onchange="window.handleFileAttachment(this)">',
    '<input type="file" id="file-upload-input" accept="*" class="hidden" onchange="window.handleFileAttachment(this)">\n'
    '                            <input type="file" id="image-upload-input" accept="image/*" class="hidden" onchange="window.handleFileAttachment(this)">')

# menu JS + image trigger, added next to triggerProtectedFileAttachment
anchor = "document.getElementById('file-upload-input').click();"
assert text.count(anchor) == 1
text = text.replace(anchor,
    anchor +
    """


        window.toggleAttachMenu = (ev) => {
            if (ev) ev.stopPropagation();
            document.getElementById('attach-menu').classList.toggle('hidden');
        };
        window.attachPick = (kind) => {
            document.getElementById('attach-menu').classList.add('hidden');
            if (kind === 'image') document.getElementById('image-upload-input').click();
            else if (kind === 'library') { const b = document.getElementById('nav-library'); if (b) b.click(); }
            else document.getElementById('file-upload-input').click();
        };
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('attach-menu');
            if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target) && !(e.target.closest && e.target.closest('#attach-menu')) && !(e.target.previousElementSibling && e.target.closest && e.target.closest('.relative'))) {
                // only close when clicking truly outside the button+menu wrapper
                if (!e.target.closest || !e.target.closest('.relative')) menu.classList.add('hidden');
            }
        });""")

open(r'index.html', 'w', encoding='utf-8', newline='').write(text)
print('PATCH 1D OK (attach menu)')
