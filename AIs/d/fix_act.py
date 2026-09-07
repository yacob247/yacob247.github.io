# -*- coding: utf-8 -*-
content = open('c:/Users/youse/Downloads/d/index.html', 'r', encoding='utf-8').read()

# Find start and end of handleActMode function
start_marker = 'async function handleActMode(loaderId, prompt) {'
end_marker = '        document.addEventListener(\'DOMContentLoaded\''

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f'ERROR: start={start_idx}, end={end_idx}')
else:
    new_func = '''async function handleActMode(loaderId, prompt) {
            const aspectRatio = document.getElementById('aspect-ratio').value;
            const styleModifier = document.getElementById('style-modifier').value;
            const parts = aspectRatio.split('x');
            const width = parts[0];
            const height = parts[1];

            // Build prompt locally (image gen is server-side, no model needed)
            let finalPrompt = buildImagePrompt(prompt, styleModifier);

            let genInterval = setInterval(() => {
                const progressEl = document.getElementById('progress-text-' + loaderId);
                if (progressEl) progressEl.textContent = 'Generating';
            }, 500);

            try {
                const seed = Math.floor(Math.random() * 999999999);
                const encodedPrompt = encodeURIComponent(finalPrompt);
                const imageUrl = 'https://image.pollinations.ai/prompt/' + encodedPrompt + '?seed=' + seed + '&width=' + width + '&height=' + height + '&nologo=true';
                const img = new Image();
                await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = imageUrl; });
                clearInterval(genInterval);
                const isPortrait = parseInt(height) > parseInt(width);
                const imgClass = isPortrait ? 'max-w-md w-full' : 'max-w-full';
                replaceLoaderWithContent(loaderId, '<div class="w-8 h-8 rounded-md bg-cds-surface1 border border-cds-border flex items-center justify-center flex-shrink-0 mt-1"><i class="fa-solid fa-wand-magic-sparkles text-cds-accent text-sm"></i></div><div class="flex-1 font-serif text-cds-textMain text-[1.05rem] leading-relaxed pt-1"><p class="mb-2 text-cds-textMain/90">Prompt used:</p><p class="text-cds-textMuted italic mb-3">' + escapeHTML(finalPrompt) + '</p><div class="relative group inline-block ' + imgClass + '"><img src="' + imageUrl + '" alt="Generated artwork" class="rounded-xl border border-cds-border shadow-lg w-full h-auto image-fade-in bg-cds-surface1"><div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2"><a href="' + imageUrl + '" download="OmniStudio_Gen.jpg" target="_blank" class="w-8 h-8 bg-cds-surface3/80 backdrop-blur-md rounded-lg flex items-center justify-center text-cds-textMain hover:bg-cds-surface4 transition-colors border border-cds-border/50" title="Open Full Resolution"><i class="fa-solid fa-arrow-up-right-from-square text-xs"></i></a></div></div></div>');
                addMessageToChat(currentChatId, 'image', { url: imageUrl, prompt: finalPrompt, width: width, height: height });
            } catch (error) {
                clearInterval(genInterval);
                replaceLoaderWithError(loaderId, "The generation server timed out or failed to respond.");
            }
        }

'''

    result = content[:start_idx] + new_func + content[end_idx:]
    open('c:/Users/youse/Downloads/d/index.html', 'w', encoding='utf-8').write(result)
    print(f'Replaced! New file size: {len(result)} chars')