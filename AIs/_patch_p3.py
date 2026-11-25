# -*- coding: utf-8 -*-
# PATCH 1C: attachment bubble above sent user messages + pass attachment at call sites
text = open(r'index.html', 'r', encoding='utf-8').read()
def rep(old, new, count=1):
    global text
    assert text.count(old) == count, 'count=%d for %s' % (text.count(old), old[:60])
    text = text.replace(old, new)

# 1) appendMessage signature accepts attachment
rep("        function appendMessage(role, content, animate = true) {",
    "        function appendMessage(role, content, animate = true, attachment = null) {")

# 2) build attachHtml in the user branch
rep("""            if (role === 'user') {
                div.className = `flex justify-end w-full ${animate ? 'fade-in' : ''}`;""",
"""            if (role === 'user') {
                div.className = `flex justify-end w-full ${animate ? 'fade-in' : ''}`;
                let attachHtml = '';
                if (attachment) {
                    if (attachment.kind === 'image') attachHtml = `<div class="flex justify-end mb-2"><img src="${attachment.src}" class="max-w-[280px] max-h-56 rounded-2xl border border-gemini-border/40 shadow-lg"></div>`;
                    else if (attachment.kind === 'audio') attachHtml = `<div class="flex justify-end mb-2"><div class="flex items-center gap-2 px-3 py-2 bg-gemini-card border border-gemini-border/40 rounded-2xl text-xs text-slate-300 max-w-[280px]"><i class="fa-solid fa-music text-orange-400"></i><span class="truncate">${escapeHtmlString(attachment.name || 'audio')}</span></div></div>`;
                    else if (attachment.kind === 'video') attachHtml = `<div class="flex justify-end mb-2"><div class="flex items-center gap-2 px-3 py-2 bg-gemini-card border border-gemini-border/40 rounded-2xl text-xs text-slate-300 max-w-[280px]"><i class="fa-solid fa-film text-pink-400"></i><span class="truncate">${escapeHtmlString(attachment.name || 'video')}</span></div></div>`;
                    else attachHtml = `<div class="flex justify-end mb-2"><div class="flex items-center gap-2 px-3 py-2 bg-gemini-card border border-gemini-border/40 rounded-2xl text-xs text-slate-300 max-w-[280px]"><i class="fa-solid fa-file-lines text-slate-400"></i><span class="truncate">${escapeHtmlString(attachment.name || 'file')}</span></div></div>`;
                }""")

# 3) render attachHtml inside the bubble
rep("""                    <div class="max-w-[85%] md:max-w-[75%] px-5 py-3.5 bg-gemini-inputBg border border-gemini-border/40 rounded-[24px] rounded-br-sm text-[14px] leading-relaxed text-slate-200 shadow-sm relative overflow-hidden break-words">
                        ${htmlContent}
                    </div>""",
"""                    <div class="max-w-[85%] md:max-w-[75%] flex flex-col items-end px-5 py-3.5 bg-gemini-inputBg border border-gemini-border/40 rounded-[24px] rounded-br-sm text-[14px] leading-relaxed text-slate-200 shadow-sm relative overflow-hidden break-words">
                        ${attachHtml}
                        <div class="w-full">${htmlContent}</div>
                    </div>""")

# 4) snapshot the attachment at send start (right after fullPrompt construction)
rep("""            let fullPrompt = userText;
            const chatImage = attachedImageBase64;
            const chatImageName = attachedFileName;""",
"""            let fullPrompt = userText;
            const chatImage = attachedImageBase64;
            const chatImageName = attachedFileName;
            const sendAttachment = chatImage ? { kind: 'image', src: chatImage, name: chatImageName }
                : attachedMediaUrl ? { kind: attachedMediaKind, name: attachedFileName }
                : attachedFileContent ? { kind: 'file', name: attachedFileName } : null;""")

# 5) pass attachment at all user-message call sites
rep("appendMessage('user', userText || 'Analyze this image.');",
    "appendMessage('user', userText || 'Analyze this image.', true, sendAttachment);")
rep("appendMessage('user', userText || 'Process this image with the best matching tool.');",
    "appendMessage('user', userText || 'Process this image with the best matching tool.', true, sendAttachment);")
rep("appendMessage('user', fullPrompt);",
    "appendMessage('user', fullPrompt, true, sendAttachment);", count=3)

open(r'index.html', 'w', encoding='utf-8', newline='').write(text)
print('PATCH 1C OK (attachment bubbles)')
