import re

SRC  = r"C:\Users\youse\Downloads\AIs\1text.html"
DEST = r"C:\Users\youse\Downloads\AIs\1text_new.html"

with open(SRC, 'r', encoding='utf-8') as f:
    html = f.read()

lines = html.split('\n')
print(f"Total lines: {len(lines)}")

# ── 1. Remove boot overlay (lines 419-444, 0-indexed 418-443)
lines[418:444] = []
print("Removed boot overlay")

# Recount after deletion
html = '\n'.join(lines)
lines = html.split('\n')

# ── 2. Remove outer header (now around lines 446-469 → search by content)
html = '\n'.join(lines)

# Remove the outer NexusAI header bar
html = re.sub(
    r'    <!-- Header -->\n    <header class="glass-panel shrink-0.*?</header>\n',
    '', html, flags=re.DOTALL
)
print("Removed outer header")

# ── 3. Remove tool sidebar + main wrapper div opening
html = re.sub(
    r'<div class="flex-1 flex overflow-hidden relative">\n\n        <!-- Sidebar Navigation -->.*?<!-- VIEW: Local AI Chat \(Gemini Workspace\) -->\n',
    '', html, flags=re.DOTALL
)
print("Removed sidebar")

# ── 4. Remove view-grid and view-workspace and closing main/div tags
html = re.sub(
    r'            <!-- VIEW: Category Grid -->.*?    </div>\n<script type="module">',
    '<script type="module">',
    html, flags=re.DOTALL
)
print("Removed view-grid + view-workspace")

# ── 5. Make view-local-ai always visible and full screen
html = html.replace(
    '<div id="view-local-ai" class="hidden h-full w-full absolute inset-0">',
    '<div id="view-local-ai" class="h-screen w-full flex flex-col">'
)
print("Made chat full screen")

# ── 6. Remove SD-Turbo / Janus loading code (sdLoadSessions, loadJanusInner, etc.)
# Remove from probeWebGPU through end of sdGenerate
html = re.sub(
    r'    // Probe the actual WebGPU stack.*?        return canvas\.toDataURL\(\'image/png\'\);\n    \}',
    "    // SD-Turbo removed — image gen handled via canvas tools",
    html, flags=re.DOTALL
)
print("Removed SD-Turbo code")

# ── 7. Remove Janus fetch interceptor redirects (SD + Janus blocks)
html = re.sub(
    r'        // Redirect Janus text-to-image downloads.*?        return ogFetch\(resource, config\);\n    \};',
    "        return ogFetch(resource, config);\n    };",
    html, flags=re.DOTALL
)
print("Removed Janus/SD fetch redirectors")

# ── 8. Remove loadJanusInner + imgEl button listener + janusGenerate + sdGenerate
html = re.sub(
    r'    async function loadJanusInner\(\).*?// NEXUS TOOL BRIDGE',
    '    // NEXUS TOOL BRIDGE',
    html, flags=re.DOTALL
)
print("Removed Janus/SD load functions")

# ── 9. Remove boot sequence runner and boot table builder
html = re.sub(
    r'    // ==========================================\n    // BOOT ENVIRONMENT TABLE.*?    setTimeout\(runBootSequence, 300\);',
    '',
    html, flags=re.DOTALL
)
print("Removed boot sequence")

# ── 10. Update R2 base URL constant to include demucs path
html = html.replace(
    "const R2_BASE = 'https://pub-406a7f3fa4d44f41b5317520aa1aaf4a.r2.dev';",
    """const R2_BASE   = 'https://pub-406a7f3fa4d44f41b5317520aa1aaf4a.r2.dev';
    const R2_DEMUCS = R2_BASE + '/demucs/htdemucs_fp16weights.onnx';
    const R2_WHISPER = R2_BASE + '/whisper';"""
)
print("Updated R2 constants")

# ── 11. Add Demucs vocal isolator IMPL after IMPL.noise
DEMUCS_IMPL = r"""
    // ── Demucs vocal isolator (htdemucs fp16, onnxruntime-web) ──────────────
    let demucsSession = null;
    async function ensureDemucs(setProgress) {
        if (demucsSession) return demucsSession;
        setProgress && setProgress(5, 'Loading Demucs model (~166MB, cached)…');
        const ort = await loadOrt();
        const res = await fetch(R2_DEMUCS);
        const buf = await res.arrayBuffer();
        setProgress && setProgress(60, 'Building Demucs ONNX session…');
        demucsSession = await ort.InferenceSession.create(buf, { executionProviders: ['wasm'] });
        setProgress && setProgress(100, 'Demucs ready');
        return demucsSession;
    }
    IMPL.vocals = async ({ audioUrl, setProgress }) => {
        setProgress(5, 'Loading vocal isolator…');
        const sess = await ensureDemucs(p => setProgress(p, 'Loading Demucs…'));
        setProgress(65, 'Decoding audio…');
        const { ac, buf } = await decodeAudio(audioUrl);
        const sr = 44100;
        // Resample to 44100 stereo (Demucs requirement)
        const offCtx = new OfflineAudioContext(2, Math.ceil(buf.duration * sr), sr);
        const src = offCtx.createBufferSource(); src.buffer = buf; src.connect(offCtx.destination); src.start();
        const resampled = await offCtx.startRendering();
        const L = resampled.getChannelData(0), R = resampled.numberOfChannels > 1 ? resampled.getChannelData(1) : L;
        const len = L.length;
        const mix = new Float32Array(2 * len);
        for (let i = 0; i < len; i++) { mix[i] = L[i]; mix[len + i] = R[i]; }
        const ort = await loadOrt();
        const input = new ort.Tensor('float32', mix, [1, 2, len]);
        setProgress(75, 'Separating vocals (this takes ~30s)…');
        const out = await sess.run({ mix: input });
        // stems shape: [1,4,2,samples] → stem 0=drums,1=bass,2=other,3=vocals
        const stems = out.stems || out[Object.keys(out)[0]];
        const nSamples = stems.dims[3];
        const vocalL = stems.data.slice(3 * 2 * nSamples, 3 * 2 * nSamples + nSamples);
        const vocalR = stems.data.slice(3 * 2 * nSamples + nSamples, 3 * 2 * nSamples + 2 * nSamples);
        // Encode to WAV stereo
        const wav = encodeWavStereo(vocalL, vocalR, sr);
        setProgress(100, 'Done');
        return { type: 'audio', blob: wav, url: URL.createObjectURL(wav), name: 'vocals.wav', ext: 'wav' };
    };
    IMPL.instrumental = async ({ audioUrl, setProgress }) => {
        setProgress(5, 'Loading vocal isolator…');
        const sess = await ensureDemucs(p => setProgress(p, 'Loading Demucs…'));
        setProgress(65, 'Decoding audio…');
        const { ac, buf } = await decodeAudio(audioUrl);
        const sr = 44100;
        const offCtx = new OfflineAudioContext(2, Math.ceil(buf.duration * sr), sr);
        const src = offCtx.createBufferSource(); src.buffer = buf; src.connect(offCtx.destination); src.start();
        const resampled = await offCtx.startRendering();
        const L = resampled.getChannelData(0), R = resampled.numberOfChannels > 1 ? resampled.getChannelData(1) : L;
        const len = L.length;
        const mix = new Float32Array(2 * len);
        for (let i = 0; i < len; i++) { mix[i] = L[i]; mix[len + i] = R[i]; }
        const ort = await loadOrt();
        const input = new ort.Tensor('float32', mix, [1, 2, len]);
        setProgress(75, 'Separating stems…');
        const out = await sess.run({ mix: input });
        const stems = out.stems || out[Object.keys(out)[0]];
        const nSamples = stems.dims[3];
        // Sum drums+bass+other (stems 0,1,2) for instrumental
        const instL = new Float32Array(nSamples), instR = new Float32Array(nSamples);
        for (let s = 0; s < 3; s++) {
            const sL = stems.data.slice(s * 2 * nSamples, s * 2 * nSamples + nSamples);
            const sR = stems.data.slice(s * 2 * nSamples + nSamples, s * 2 * nSamples + 2 * nSamples);
            for (let i = 0; i < nSamples; i++) { instL[i] += sL[i]; instR[i] += sR[i]; }
        }
        const wav = encodeWavStereo(instL, instR, sr);
        setProgress(100, 'Done');
        return { type: 'audio', blob: wav, url: URL.createObjectURL(wav), name: 'instrumental.wav', ext: 'wav' };
    };
    function encodeWavStereo(L, R, sr) {
        const buf = new ArrayBuffer(44 + L.length * 4);
        const dv = new DataView(buf);
        const w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
        w(0,'RIFF'); dv.setUint32(4, 36 + L.length * 4, true); w(8,'WAVE'); w(12,'fmt ');
        dv.setUint32(16,16,true); dv.setUint16(20,3,true); dv.setUint16(22,2,true);
        dv.setUint32(24,sr,true); dv.setUint32(28,sr*8,true); dv.setUint16(32,8,true); dv.setUint16(34,32,true);
        w(36,'data'); dv.setUint32(40, L.length * 4 * 2, true);
        let o = 44;
        for (let i = 0; i < L.length; i++) {
            dv.setFloat32(o, L[i], true); o += 4;
            dv.setFloat32(o, R[i], true); o += 4;
        }
        return new Blob([buf], { type: 'audio/wav' });
    }
"""
html = html.replace(
    "    IMPL.sync = async",
    DEMUCS_IMPL + "\n    IMPL.sync = async"
)
print("Added Demucs vocal isolator")

# ── 12. Update tool protocol / system prompt to list all tools including vocals
OLD_PROTO = "return `\\nYou are NexusAI. All tools (background removal, image generation/editing) run automatically in code when requested — never refuse. Files are 100% local, no server. For code: complete standalone file, real working inline CSS/JS.`;"
NEW_PROTO = """return `\\nYou are Loma, a powerful local AI assistant. You have access to these tools — trigger them with [[TOOL:id]] or [[TOOL:id|{"key":"value"}]]:
IMAGE: bg-remove (background removal), upscale, color, repair, deblur, relight, sketch, blend, style, vector, inpaint, outpaint, remove, tag, ocr, face, mod
VIDEO: t2v, i2v, cam, scene, physics, cut, textedit, broll, green, track, reformat, fps, vidstyle, grade, viderase, faceswap, lipsync, body
AUDIO: vocals (isolate vocals via Demucs), instrumental (remove vocals), noise, sub (transcribe→SRT), clone, sync
When the user uploads a file, use it. All processing is 100% local. Never refuse. For code output: complete standalone file with inline CSS/JS.\`;"""
html = html.replace(OLD_PROTO, NEW_PROTO)
print("Updated system prompt with all tools")

# ── 13. Add file upload button to chat input area
html = html.replace(
    '<button id="chat-send-btn"',
    '<input type="file" id="chat-file-input" class="hidden" accept="image/*,video/*,audio/*,.pdf,.txt,.csv">'
    + '<button onclick="document.getElementById(\'chat-file-input\').click()" class="p-2 text-gemini-textMuted hover:text-gemini-accent rounded-full smooth-transition" title="Attach file"><i class="fa-solid fa-paperclip"></i></button>'
    + '<button id="chat-send-btn"'
)
print("Added file upload button")

# ── 14. Fix nav-local-ai auto-activate (remove click dependency since it's full screen now)
html = html.replace(
    "document.getElementById('nav-local-ai').addEventListener('click', function() {",
    "// nav-local-ai removed — chat is always visible\n    if (false) (function() {"
)
html = html.replace(
    "    });\n    // hide local AI view when navigating away",
    "    })();\n    // hide local AI view when navigating away"
)
print("Fixed nav-local-ai")

# ── 15. Remove sdModel/janusModel variable declarations
html = re.sub(r'    let sdModel.*?let janusLastError.*?;', '', html)
html = re.sub(r'    let sdSessions.*?= null;', '', html)
print("Removed SD/Janus vars")

with open(DEST, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nDone! Saved to {DEST}")
print(f"New line count: {len(html.split(chr(10)))}")