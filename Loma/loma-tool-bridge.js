// ════════════════════════════════════════════════════════════════════════════
//  LOMA EXTERNAL TOOL BRIDGE  —  music-gen.html + image-gen.html
//
//  DROP THIS ENTIRE BLOCK into index.html just before the closing </script>
//
//  HOW IT WORKS:
//  1. LOMA's AI response is scanned for special tags:
//       [GENERATE_MUSIC: prompt="..." style="..." bpm=90 duration=30]
//       [GENERATE_IMAGE: prompt="..." style="flux" ratio="1024x1024"]
//
//  2. When a tag is detected, a hidden iframe on your domain loads the
//     corresponding tool page and posts a request to it.
//
//  3. The tool page does the work (Pollinations API), then postMessages
//     the result (audio blob URL or image data URI) back here.
//
//  4. LOMA's chat displays the result inline — audio player or <img>.
//
//  DEPLOY:
//    • music-gen.html  → https://yourdomain.com/tools/music-gen.html
//    • image-gen.html  → https://yourdomain.com/tools/image-gen.html
//    • Update TOOL_BASE_URL below to match your domain.
// ════════════════════════════════════════════════════════════════════════════

const TOOL_BASE_URL = 'https://yourdomain.com/tools'; // ← CHANGE THIS

// ── Hidden iframe pool ───────────────────────────────────────────────────────
const _toolIframes = {};

function _getToolIframe(toolName) {
    if (_toolIframes[toolName]) return _toolIframes[toolName];

    const iframe = document.createElement('iframe');
    iframe.src = `${TOOL_BASE_URL}/${toolName}.html`;
    iframe.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:-9999px;border:0;';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
    document.body.appendChild(iframe);
    _toolIframes[toolName] = iframe;
    return iframe;
}

// ── Pending promise map ───────────────────────────────────────────────────────
const _pendingToolRequests = {};

function _callTool(toolName, requestType, resultType, payload) {
    return new Promise((resolve, reject) => {
        const id      = Date.now() + Math.random();
        const iframe  = _getToolIframe(toolName);
        const timeout = setTimeout(() => {
            delete _pendingToolRequests[id];
            reject(new Error(`Tool "${toolName}" timed out after 90s`));
        }, 90_000);

        _pendingToolRequests[id] = { resolve, reject, timeout, resultType };

        // Wait for iframe to be ready, then post
        const sendMsg = () => iframe.contentWindow?.postMessage({ type: requestType, payload, _id: id }, '*');

        if (iframe.contentDocument?.readyState === 'complete') {
            sendMsg();
        } else {
            iframe.onload = sendMsg;
        }
    });
}

// ── Unified message listener ──────────────────────────────────────────────────
window.addEventListener('message', (e) => {
    const msg = e.data;
    if (!msg || typeof msg !== 'object') return;

    // Find a pending request that matches this result type
    for (const [id, entry] of Object.entries(_pendingToolRequests)) {
        if (msg.type === entry.resultType) {
            clearTimeout(entry.timeout);
            delete _pendingToolRequests[id];
            if (msg.error) {
                entry.reject(new Error(msg.error));
            } else {
                entry.resolve(msg);
            }
            break;
        }
    }
});

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Ask LOMA to generate music.
 * @param {string} prompt
 * @param {object} opts  — { style, bpm, key, duration }
 * @returns {Promise<{audioUrl:string, prompt:string, duration:number}>}
 */
window.lomaGenerateMusic = async function(prompt, opts = {}) {
    return _callTool('music-gen', 'LOMA_MUSIC_REQUEST', 'LOMA_MUSIC_RESULT', { prompt, ...opts });
};

/**
 * Ask LOMA to generate an image.
 * @param {string} prompt
 * @param {object} opts  — { style, ratio, seed, negative, enhance, nologo }
 * @returns {Promise<{imageUrl:string, imageData:string, prompt:string}>}
 */
window.lomaGenerateImage = async function(prompt, opts = {}) {
    return _callTool('image-gen', 'LOMA_IMAGE_REQUEST', 'LOMA_IMAGE_RESULT', { prompt, ...opts });
};

// ── Tag parser — scans AI reply text for tool invocation tags ─────────────────
//
//  LOMA's system prompt should include:
//  "When you want to generate music, output exactly:
//   [GENERATE_MUSIC: prompt="<desc>" style="<style>" bpm=<bpm> duration=<secs>]
//  When you want to generate an image, output exactly:
//   [GENERATE_IMAGE: prompt="<desc>" style="<model>" ratio="<WxH>"]"
//
const MUSIC_TAG_RE = /\[GENERATE_MUSIC:\s*([^\]]+)\]/gi;
const IMAGE_TAG_RE = /\[GENERATE_IMAGE:\s*([^\]]+)\]/gi;

function _parseTagAttrs(attrString) {
    const result = {};
    // Matches: key="value" or key=value
    const re = /(\w+)=(?:"([^"]*)"|([\w\d\.\-]+))/g;
    let m;
    while ((m = re.exec(attrString)) !== null) {
        result[m[1]] = m[2] !== undefined ? m[2] : m[3];
    }
    return result;
}

/**
 * Given a raw AI reply string, find all tool tags, execute them,
 * and return a new string with the tags replaced by rich HTML.
 *
 * Call this AFTER streaming is complete, passing the final text.
 */
window.lomaProcessToolTags = async function(replyText, outputElement) {
    let processed = replyText;

    // ── Music tags ────────────────────────────────────────────────────────────
    const musicMatches = [...replyText.matchAll(MUSIC_TAG_RE)];
    for (const match of musicMatches) {
        const attrs = _parseTagAttrs(match[1]);
        const placeholder = `<span class="loma-tool-pending" data-tag="${encodeURIComponent(match[0])}">
            <span class="loma-loading-dot"></span>
            <span class="loma-loading-dot"></span>
            <span class="loma-loading-dot"></span>
            <em style="font-size:11px;color:#9e9e9e;margin-left:6px;">Generating music: "${attrs.prompt}"…</em>
        </span>`;

        processed = processed.replace(match[0], placeholder);
        if (outputElement) outputElement.innerHTML = parseMarkdownResponse ? parseMarkdownResponse(processed, true) : processed;

        try {
            const result = await window.lomaGenerateMusic(attrs.prompt, {
                style:    attrs.style,
                bpm:      parseInt(attrs.bpm) || 90,
                key:      attrs.key || '',
                duration: parseInt(attrs.duration) || 30
            });

            const audioHTML = `
<div class="loma-tool-result" style="margin:12px 0;padding:12px 14px;background:#16181c;border:1px solid #2a2d33;border-radius:10px;">
  <div style="font-size:10px;color:#9e9e9e;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.08em;">🎵 Generated Music</div>
  <audio controls style="width:100%;outline:none;" src="${result.audioUrl}"></audio>
  <div style="font-size:10px;color:#6b7280;margin-top:6px;">Prompt: "${result.prompt}" · ${result.duration}s</div>
</div>`;

            processed = processed.replace(placeholder, audioHTML);
        } catch (err) {
            const errHTML = `<span style="color:#f87171;font-size:12px;">⚠ Music generation failed: ${err.message}</span>`;
            processed = processed.replace(placeholder, errHTML);
        }

        if (outputElement) outputElement.innerHTML = parseMarkdownResponse ? parseMarkdownResponse(processed, true) : processed;
    }

    // ── Image tags ────────────────────────────────────────────────────────────
    const imageMatches = [...replyText.matchAll(IMAGE_TAG_RE)];
    for (const match of imageMatches) {
        const attrs = _parseTagAttrs(match[1]);
        const placeholder = `<span class="loma-tool-pending" data-tag="${encodeURIComponent(match[0])}">
            <span class="loma-loading-dot"></span><span class="loma-loading-dot"></span><span class="loma-loading-dot"></span>
            <em style="font-size:11px;color:#9e9e9e;margin-left:6px;">Generating image: "${attrs.prompt}"…</em>
        </span>`;

        processed = processed.replace(match[0], placeholder);
        if (outputElement) outputElement.innerHTML = parseMarkdownResponse ? parseMarkdownResponse(processed, true) : processed;

        try {
            const result = await window.lomaGenerateImage(attrs.prompt, {
                style:    attrs.style    || 'flux',
                ratio:    attrs.ratio    || '1024x1024',
                seed:     attrs.seed     || null,
                negative: attrs.negative || '',
                enhance:  attrs.enhance  !== 'false',
                nologo:   true
            });

            const imgHTML = `
<div class="loma-tool-result" style="margin:12px 0;padding:12px 14px;background:#16181c;border:1px solid #2a2d33;border-radius:10px;">
  <div style="font-size:10px;color:#9e9e9e;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.08em;">🎨 Generated Image</div>
  <img src="${result.imageData}" alt="${attrs.prompt}" style="width:100%;border-radius:6px;display:block;">
  <div style="font-size:10px;color:#6b7280;margin-top:6px;">Prompt: "${result.prompt}" · model: ${attrs.style||'flux'}</div>
  <div style="margin-top:8px;display:flex;gap:8px;">
    <a href="${result.imageData}" download="loma-image-${Date.now()}.png" style="font-size:11px;color:#a8c7fa;text-decoration:none;padding:5px 10px;background:#1a1c20;border:1px solid #2a2d33;border-radius:5px;">Download</a>
  </div>
</div>`;

            processed = processed.replace(placeholder, imgHTML);
        } catch (err) {
            const errHTML = `<span style="color:#f87171;font-size:12px;">⚠ Image generation failed: ${err.message}</span>`;
            processed = processed.replace(placeholder, errHTML);
        }

        if (outputElement) outputElement.innerHTML = parseMarkdownResponse ? parseMarkdownResponse(processed, true) : processed;
    }

    return processed;
};

// ── Hook into the existing streaming pipeline ─────────────────────────────────
//
//  index.html already calls appendOrUpdateMessage() when streaming ends.
//  We wrap it to post-process tool tags automatically.
//
//  Find this line in index.html (around the streaming loop):
//      contentHTML += parseMarkdownResponse(cleanParsedReply, true);
//
//  Add this right AFTER the streaming loop finishes (after the for-await loop
//  ends and you call appendOrUpdateMessage for the final time):
//
//      await window.lomaProcessToolTags(rawAccumulated, outputElement);
//
//  Where `outputElement` is the DOM node returned by appendOrUpdateMessage.
//
//  That's the ONLY change needed in the existing code.
//  Everything else (iframe pool, message listener, tag parsing) is above.
// ════════════════════════════════════════════════════════════════════════════

// ── Inject required CSS for loading dots ─────────────────────────────────────
(function injectToolCSS() {
    if (document.getElementById('loma-tool-styles')) return;
    const s = document.createElement('style');
    s.id = 'loma-tool-styles';
    s.textContent = `
.loma-loading-dot {
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #a8c7fa;
    margin: 0 2px;
    animation: lomaToolBounce 1.4s infinite ease-in-out both;
}
.loma-loading-dot:nth-child(1){animation-delay:-0.32s}
.loma-loading-dot:nth-child(2){animation-delay:-0.16s}
@keyframes lomaToolBounce {
    0%,80%,100%{transform:scale(0);opacity:0.3}
    40%{transform:scale(1);opacity:1}
}
.loma-tool-result audio::-webkit-media-controls-panel { background: #1a1c20; }
    `;
    document.head.appendChild(s);
})();

// ── Update system prompt to teach LOMA the tool tags ────────────────────────
//  Call this once after the page loads to append the tool instructions.
(function patchSystemPrompt() {
    const TOOL_ADDON = `

You have two external tools available. Use them when the user asks for music or images.

To generate music, output EXACTLY (nothing else on that line):
[GENERATE_MUSIC: prompt="<descriptive prompt>" style="<style>" bpm=<number> duration=<seconds>]

To generate an image, output EXACTLY:
[GENERATE_IMAGE: prompt="<descriptive prompt>" style="flux" ratio="1024x1024"]

Available music styles: lo-fi hip hop, ambient electronic, cinematic orchestral, acoustic folk, synthwave retro, jazz piano trio, classical piano, dark techno, upbeat pop, chillout beats
Available image styles: flux, turbo, flux-anime, flux-3d, flux-realism

You can use these tools mid-response. Think first (what should the music/image be?), then emit the tag, then continue your text. The system will replace the tag with the actual media automatically.`;

    // Patch the live config if it's already loaded
    if (typeof systemConfig !== 'undefined' && systemConfig.systemPrompt) {
        if (!systemConfig.systemPrompt.includes('GENERATE_MUSIC')) {
            systemConfig.systemPrompt += TOOL_ADDON;
        }
    }

    // Also patch the textarea in the settings panel so it persists on save
    const ta = document.getElementById('config-system-prompt');
    if (ta && !ta.value.includes('GENERATE_MUSIC')) {
        ta.value += TOOL_ADDON;
    }
})();

console.log('[LOMA Tools] Bridge loaded — music-gen + image-gen ready.');