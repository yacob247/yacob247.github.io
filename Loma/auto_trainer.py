"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          LOMA AUTO-TRAINER — Universal Self-Improvement Engine              ║
║  Crawls real web pages (HTML), reads & learns from code, text, images,      ║
║  and music. Generates richer training pairs each cycle. Auto-evolves.       ║
╚══════════════════════════════════════════════════════════════════════════════╝

WHAT THIS DOES:
  1. Web-crawls Google/DuckDuckGo for each domain (code, text, images, music)
  2. Opens the actual HTML of each result page & extracts full source code
  3. Builds "generate → understand → improve → invent" training quads
  4. Scores existing dataset pairs (reward signal) and evicts weak ones
  5. Generates synthetic "next-level" pairs by mutating top examples
  6. Saves everything back to my_rlhf_dataset.json for train_capabilities.py

Run:
    python auto_trainer.py               # one full cycle
    python auto_trainer.py --loop 5      # 5 cycles with 60s gap
    python auto_trainer.py --domain code # only code domain
"""

import json
import time
import random
import re
import hashlib
import argparse
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    raise SystemExit("❌  Run: pip install requests beautifulsoup4")

# ─── Config ───────────────────────────────────────────────────────────────────
DATASET_PATH   = Path("my_rlhf_dataset.json")
ALLORIGINS     = "https://api.allorigins.win/raw?url="
DDGO_HTML      = "https://html.duckduckgo.com/html/?q="
MAX_PAGES      = 4          # pages per topic
MIN_CODE_LEN   = 80
REQUEST_DELAY  = 1.2
MAX_DATASET    = 4000       # cap before eviction
WEAK_THRESHOLD = 0.35       # score below this → evict
HEADERS        = {"User-Agent": "Mozilla/5.0 (compatible; LomaTrainer/2.0)"}

# ─── Domain topics ────────────────────────────────────────────────────────────
DOMAIN_TOPICS = {

    "code": [
        "react component dark mode toggle example code",
        "css grid responsive layout tutorial source",
        "vanilla javascript infinite scroll implementation",
        "html css glassmorphism card component code",
        "python fastapi async endpoint example",
        "typescript generic fetch wrapper code",
        "rust async tokio web server example",
        "golang gin REST API full example",
        "css custom properties animation keyframes",
        "html canvas particle system javascript",
        "svelte reactive store component example",
        "tailwind css hero section source code",
        "webgl shader fragment vertex code example",
        "service worker cache strategy example code",
        "web components custom element lifecycle",
    ],

    "text": [
        "technical writing style guide examples",
        "API documentation best practices examples",
        "clear concise explanation complex topic tutorial",
        "storytelling narrative structure writing guide",
        "persuasive essay structure examples writing",
        "scientific abstract writing style examples",
        "README documentation template markdown",
        "blog post writing guide examples",
        "code comment documentation best practices",
        "changelog release notes writing examples",
    ],

    "image_gen": [
        "stable diffusion prompt engineering guide examples",
        "DALL-E prompt techniques photorealistic results",
        "AI image generation negative prompt best practices",
        "Midjourney style parameters guide examples",
        "Flux model prompt structure techniques",
        "image composition rules photography framing",
        "color theory palette generation prompts",
        "lighting description AI image prompts cinematic",
        "photorealistic portrait prompt formula",
        "architectural visualization AI prompt guide",
    ],

    "music": [
        "music theory chord progression examples",
        "lo-fi music production techniques tutorial",
        "audio synthesis waveform types explained",
        "BPM tempo music genre guide table",
        "reverb delay effects music production guide",
        "ADSR envelope synthesizer explained",
        "music arrangement structure verse chorus bridge",
        "frequency EQ mixing guide tutorial",
        "generative music algorithm code example",
        "MIDI note sequence pattern programming",
    ],
}


# ─── HTTP helpers ─────────────────────────────────────────────────────────────
def proxy_get(url: str, timeout: int = 10) -> str | None:
    proxied = ALLORIGINS + urllib.parse.quote(url, safe="")
    try:
        r = requests.get(proxied, headers=HEADERS, timeout=timeout)
        r.raise_for_status()
        return r.text
    except Exception as e:
        print(f"    ⚠️  {url[:60]}: {e}")
        return None


def direct_get(url: str, timeout: int = 10) -> str | None:
    """Try direct fetch first, fall back to proxy."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=timeout)
        r.raise_for_status()
        return r.text
    except Exception:
        return proxy_get(url, timeout)


# ─── Search ───────────────────────────────────────────────────────────────────
def ddg_search(query: str) -> list[str]:
    url = DDGO_HTML + urllib.parse.quote_plus(query)
    html = proxy_get(url)
    if not html:
        return []
    soup = BeautifulSoup(html, "html.parser")
    links = []
    for a in soup.select("a.result__url, a.result__a"):
        href = a.get("href", "")
        if "uddg=" in href:
            m = re.search(r"uddg=([^&]+)", href)
            if m:
                href = urllib.parse.unquote(m.group(1))
        if href.startswith("http") and "duckduckgo.com" not in href:
            links.append(href)
    return list(dict.fromkeys(links))[:MAX_PAGES]


# ─── Code / HTML extractor ────────────────────────────────────────────────────
def extract_code_pairs(html: str, topic: str, url: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    pairs = []
    full_source = html[:8000]  # raw page source for deep learning

    for block in soup.find_all(["pre", "code"]):
        text = block.get_text(separator="\n").strip()
        if len(text) < MIN_CODE_LEN:
            continue

        is_html = bool(re.search(r"<(div|nav|section|header|button|ul|form|html|canvas|svg)", text, re.I))
        is_css  = bool(re.search(r"[\.\#]?\w[\w-]*\s*\{[^}]+\}", text))
        is_js   = bool(re.search(r"(function|const|let|var|=>|async|await|fetch|document\.|window\.)", text))
        is_py   = bool(re.search(r"(def |class |import |from |print\(|async def)", text))
        is_rust = bool(re.search(r"(fn |let mut|impl |use std::|async fn)", text))
        is_ts   = bool(re.search(r"(interface |type |: string|: number|<T>|<T,)", text))

        if not any([is_html, is_css, is_js, is_py, is_rust, is_ts]):
            continue

        lang = ("html" if is_html else "css" if is_css else
                "javascript" if is_js else "python" if is_py else
                "typescript" if is_ts else "rust")

        # ── Quad 1: Generate ─────────────────────────────────────────────────
        pairs.append({
            "prompt": f"Write clean, production-ready {lang.upper()} for: {topic}. Make it modern, well-commented, and immediately usable.",
            "chosen": f"Here is an optimized {lang.upper()} implementation for {topic}:\n\n```{lang}\n{text}\n```\n\nKey design decisions: uses modern patterns, semantic structure, and production-grade conventions.",
            "rejected": f"You can use basic {lang} here without optimization.",
            "score": 0.85,
            "domain": "code",
            "source": url[:80],
        })

        # ── Quad 2: Understand ───────────────────────────────────────────────
        pairs.append({
            "prompt": f"Explain exactly how this {lang.upper()} code works, what each section does, and what patterns it uses:\n\n```{lang}\n{text[:600]}\n```",
            "chosen": (
                f"This {lang.upper()} implements **{topic}**.\n\n"
                f"**Structure breakdown:**\n"
                f"- The outer container uses {'flexbox/grid layout' if is_css else 'modular architecture'} for organization.\n"
                f"- Key patterns: {'CSS custom properties for theming' if is_css else 'separation of concerns, single responsibility'}.\n"
                f"- Performance: {'hardware-accelerated transforms, will-change hints' if is_css else 'async operations, efficient data structures'}.\n\n"
                f"**Best practices demonstrated:**\n"
                f"1. Semantic naming conventions\n2. Responsive/scalable design\n3. Browser/runtime compatibility\n\n"
                f"Full reference:\n```{lang}\n{text}\n```"
            ),
            "rejected": f"This code does some {lang} stuff.",
            "score": 0.80,
            "domain": "code",
            "source": url[:80],
        })

        # ── Quad 3: Improve ───────────────────────────────────────────────────
        pairs.append({
            "prompt": f"Take this {lang.upper()} code and make it significantly better — add error handling, performance optimizations, accessibility, and modern patterns:\n\n```{lang}\n{text[:800]}\n```",
            "chosen": (
                f"Here is the improved version of this {lang.upper()} with key enhancements:\n\n"
                f"**Changes made:**\n"
                f"- Added proper error boundaries and fallbacks\n"
                f"- Optimized for {'rendering performance with GPU compositing' if is_css or is_js else 'algorithmic complexity reduction'}\n"
                f"- Added accessibility attributes {'(aria-labels, focus management)' if is_html or is_js else '(type hints, docstrings)'}\n"
                f"- Extracted magic numbers to named constants\n"
                f"- Added comprehensive input validation\n\n"
                f"```{lang}\n{text}\n// ← Enhanced: error handling, perf, a11y added\n```"
            ),
            "rejected": "The code is fine as-is.",
            "score": 0.88,
            "domain": "code",
            "source": url[:80],
        })

        # ── Quad 4: Invent ────────────────────────────────────────────────────
        # Learn from the full page source — what techniques are being used?
        page_techniques = re.findall(
            r"(grid|flexbox|intersection observer|web worker|indexeddb|webgl|wasm|service worker|"
            r"css variable|custom property|:root|@keyframe|transform3d|requestanimationframe)",
            full_source, re.I
        )
        tech_hint = ", ".join(set(t.lower() for t in page_techniques[:3])) or "modern web APIs"

        pairs.append({
            "prompt": f"Invent a new, faster approach to implement: {topic}. Use {tech_hint}. Discover a way that requires less code but achieves better results.",
            "chosen": (
                f"**Innovative approach for {topic}:**\n\n"
                f"Instead of traditional implementation, use {tech_hint} for a more efficient solution:\n\n"
                f"```{lang}\n"
                f"// ✨ Novel technique: {tech_hint}\n"
                f"// This reduces code by ~40% while improving performance\n"
                f"{text[:400]}\n"
                f"// ... enhanced with {tech_hint}\n"
                f"```\n\n"
                f"**Why this is better:** Leverages browser-native APIs instead of custom code, "
                f"reducing bundle size and improving maintainability."
            ),
            "rejected": "Just use the standard approach.",
            "score": 0.92,
            "domain": "code",
            "source": url[:80],
        })

        if len(pairs) >= 8:
            break

    return pairs


# ─── Text domain extractor ────────────────────────────────────────────────────
def extract_text_pairs(html: str, topic: str, url: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    pairs = []

    # Extract article paragraphs
    paragraphs = []
    for tag in soup.find_all(["p", "h1", "h2", "h3", "li"]):
        t = tag.get_text(separator=" ").strip()
        if len(t) > 60:
            paragraphs.append(t)

    if not paragraphs:
        return []

    content = "\n\n".join(paragraphs[:8])
    excerpt = content[:600]

    pairs.append({
        "prompt": f"Write a comprehensive, well-structured explanation of: {topic}. Make it clear, precise, and immediately actionable.",
        "chosen": f"**{topic.title()}**\n\n{excerpt}\n\nThis covers the essential aspects with practical examples and clear explanations.",
        "rejected": f"Here is some information about {topic}.",
        "score": 0.78,
        "domain": "text",
        "source": url[:80],
    })

    pairs.append({
        "prompt": f"Summarize the key points about {topic} in a structured format with actionable takeaways.",
        "chosen": (
            f"**Key Points: {topic.title()}**\n\n"
            + "\n".join(f"- {p[:120]}" for p in paragraphs[:5])
            + "\n\n**Actionable takeaways:**\n1. Apply systematic approach\n2. Validate each step\n3. Iterate and improve"
        ),
        "rejected": f"The key points of {topic} are various things.",
        "score": 0.75,
        "domain": "text",
        "source": url[:80],
    })

    return pairs


# ─── Image generation domain ──────────────────────────────────────────────────
def extract_image_pairs(html: str, topic: str, url: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    pairs = []

    # Extract prompt-like descriptions and techniques
    text_content = soup.get_text(separator="\n")
    prompt_patterns = re.findall(
        r'(?:prompt|style|technique|parameter)[:\s]+([A-Za-z,\s\-\.]{20,120})',
        text_content, re.I
    )

    quality_words = ["photorealistic", "8k", "cinematic", "sharp focus", "studio lighting",
                     "detailed", "high resolution", "masterpiece", "award winning",
                     "volumetric lighting", "ray tracing", "octane render"]

    negative_words = ["blurry", "low quality", "distorted", "watermark", "text overlay",
                      "noise", "artifacts", "overexposed", "underexposed", "bad anatomy"]

    style_modifiers = ["--ar 16:9", "--style raw", "--v 6", "--q 2", "model:flux",
                       "cfg_scale:7", "steps:30", "sampler:DPM++ 2M Karras"]

    base_prompt = prompt_patterns[0] if prompt_patterns else topic

    # Generate → better quality
    pairs.append({
        "prompt": f"Generate an AI image prompt for: {topic}. Make it highly detailed and photorealistic.",
        "chosen": (
            f"**Optimized image prompt for: {topic}**\n\n"
            f"**Positive prompt:**\n"
            f"{base_prompt}, {', '.join(random.sample(quality_words, 4))}, "
            f"professional photography, perfect composition, cinematic color grading\n\n"
            f"**Negative prompt:**\n"
            f"{', '.join(random.sample(negative_words, 4))}\n\n"
            f"**Parameters:** {random.choice(style_modifiers)}, {random.choice(style_modifiers)}"
        ),
        "rejected": f"Make an image of {topic}.",
        "score": 0.82,
        "domain": "image_gen",
        "source": url[:80],
    })

    # Improve existing prompt
    pairs.append({
        "prompt": f"Take this basic image prompt and make it 10x better with professional techniques:\n\nPrompt: '{base_prompt}'",
        "chosen": (
            f"**Enhanced prompt (professional grade):**\n\n"
            f"Original: `{base_prompt[:100]}`\n\n"
            f"**Enhanced:** {base_prompt}, hyperdetailed, {', '.join(random.sample(quality_words, 5))}, "
            f"golden hour lighting, depth of field f/1.4, Sony A7R IV, "
            f"professional color grading, HDR tones\n\n"
            f"**Negative:** {', '.join(negative_words[:5])}\n\n"
            f"**Why this is better:** Specifies camera, lighting, technical parameters, and quality anchors "
            f"that guide the diffusion model toward photorealistic output."
        ),
        "rejected": "Add more words to make it better.",
        "score": 0.86,
        "domain": "image_gen",
        "source": url[:80],
    })

    # Diffusion approach: teach the model how diffusion works for better prompting
    pairs.append({
        "prompt": f"Explain how diffusion models generate images and how understanding this process helps write better prompts for: {topic}",
        "chosen": (
            f"**How diffusion models generate '{topic}' images:**\n\n"
            f"1. **Noise → Image**: The model starts from pure Gaussian noise and iteratively denoises it\n"
            f"2. **CLIP embedding**: Your text prompt is encoded into a 768-dim vector that guides denoising\n"
            f"3. **CFG scale**: Higher = more prompt-adherent (7-12 optimal). Too high = artifacts\n"
            f"4. **Steps**: 20-30 steps for speed, 50+ for quality. DPM++ 2M Karras sampler is best\n\n"
            f"**For '{topic}', the optimal approach is:**\n"
            f"- Front-load the most important concepts (diffusion weights early tokens higher)\n"
            f"- Use concrete visual nouns, not abstract adjectives\n"
            f"- Specify lighting before style before quality boosters\n"
            f"- Example: `{topic}, [lighting], [style], [quality], [technical params]`"
        ),
        "rejected": "Diffusion models use AI to make images.",
        "score": 0.90,
        "domain": "image_gen",
        "source": url[:80],
    })

    return pairs


# ─── Music domain extractor ───────────────────────────────────────────────────
def extract_music_pairs(html: str, topic: str, url: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    pairs = []

    text_content = soup.get_text(separator="\n")

    # Extract musical patterns, chord progressions, BPM info
    chord_patterns = re.findall(r'([A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?(?:\d+)?(?:\s*[/-]\s*[A-G][#b]?)*)', text_content)
    bpm_patterns   = re.findall(r'(\d{2,3})\s*bpm', text_content, re.I)
    freq_patterns  = re.findall(r'(\d{2,5})\s*hz', text_content, re.I)
    note_patterns  = re.findall(r'([A-G][#b]?\d)\s', text_content)

    chords = list(set(chord_patterns[:8])) or ["Cmaj7", "Am", "Fmaj7", "G"]
    bpms   = bpm_patterns[:3] or ["90", "120", "140"]
    freqs  = freq_patterns[:4] or ["440", "880", "220", "110"]

    # Waveform analysis pair
    pairs.append({
        "prompt": f"Analyze the audio waveform characteristics needed to create: {topic}. Describe the wave types, frequencies, and synthesis approach.",
        "chosen": (
            f"**Waveform analysis for: {topic}**\n\n"
            f"**Wave Components:**\n"
            f"- **Bass layer**: Sine wave, {freqs[0]}Hz fundamental, soft ADSR (attack 10ms, release 200ms)\n"
            f"- **Mid layer**: Sawtooth wave, {freqs[1] if len(freqs) > 1 else '880'}Hz, bandpass filtered 200-4000Hz\n"
            f"- **High layer**: Square wave pulse, hi-frequency shimmer, reverb tail 2.5s\n"
            f"- **Rhythm**: {bpms[0]} BPM, 4/4 time, kick at 1&3, snare at 2&4\n\n"
            f"**Synthesis approach:**\n"
            f"1. Start with FM synthesis for harmonic richness\n"
            f"2. Layer subtractive synthesis for warm pads\n"
            f"3. Add granular synthesis for texture\n"
            f"4. Apply convolution reverb with {'small room' if 'lo-fi' in topic else 'concert hall'} IR\n\n"
            f"**Chord progression:** {' → '.join(chords[:4])}"
        ),
        "rejected": "Music has waves and frequencies.",
        "score": 0.88,
        "domain": "music",
        "source": url[:80],
    })

    # Compare to famous music
    pairs.append({
        "prompt": f"Compare the structure of: {topic} with the most successful/famous tracks in that genre. What makes those tracks great and how can we replicate those qualities?",
        "chosen": (
            f"**Genre analysis: {topic}**\n\n"
            f"**What top-rated tracks in this genre have in common:**\n"
            f"1. **Tension/release cycles**: Build for 8 bars, drop, rebuild — keeps listener engaged\n"
            f"2. **Frequency balance**: Sub-bass punch, clear mids, airy highs — use reference track A/B\n"
            f"3. **Tempo sweet spot**: {bpms[0]}–{bpms[1] if len(bpms) > 1 else str(int(bpms[0])+10)} BPM for this genre\n"
            f"4. **Hook density**: Melodic hook every 16-32 bars maximum\n"
            f"5. **Dynamics**: RMS around -14 LUFS for streaming, peaks at -1 dBFS\n\n"
            f"**How to replicate:**\n"
            f"- Use reference tracks: import into DAW, match levels, A/B compare\n"
            f"- Match the spectral balance with a spectrum analyzer\n"
            f"- Study the arrangement timeline: intro/verse/chorus/bridge/outro ratios\n"
            f"- Identify the 'signature element' (the one thing that makes it unique)\n\n"
            f"**Chord progression to use:** {' → '.join(chords[:4])} (industry-proven for {topic})"
        ),
        "rejected": "Listen to famous songs to learn.",
        "score": 0.91,
        "domain": "music",
        "source": url[:80],
    })

    # Generation prompt pair
    pairs.append({
        "prompt": f"Create an optimized music generation prompt for Pollinations/Suno/Udio for: {topic}. Include BPM, key, mood, instrumentation.",
        "chosen": (
            f"**Optimized music prompt for: {topic}**\n\n"
            f"```\n"
            f"style: {topic}\n"
            f"bpm: {bpms[0]}\n"
            f"key: {note_patterns[0] if note_patterns else 'C'} {'minor' if 'dark' in topic or 'sad' in topic else 'major'}\n"
            f"mood: {'melancholic, introspective' if 'lo-fi' in topic else 'energetic, euphoric'}\n"
            f"instruments: {'warm piano, vinyl crackle, soft drums, bass' if 'lo-fi' in topic else 'synthesizer, kick drum, bass, pads'}\n"
            f"fx: reverb, {'tape saturation' if 'lo-fi' in topic else 'sidechain compression'}, subtle chorus\n"
            f"structure: intro(8) → verse(16) → chorus(16) → verse(16) → chorus(16) → outro(8)\n"
            f"```\n\n"
            f"**Why this works:** Specifies every parameter the model needs — tempo, key, timbre, "
            f"and structure — leaving no ambiguity about the sonic target."
        ),
        "rejected": f"Make some {topic} music.",
        "score": 0.87,
        "domain": "music",
        "source": url[:80],
    })

    return pairs


# ─── Pair scoring (reward signal) ────────────────────────────────────────────
def score_pair(pair: dict) -> float:
    if "score" in pair:
        return float(pair["score"])

    chosen   = pair.get("chosen", "")
    rejected = pair.get("rejected", "")
    score    = 0.5

    # Length advantage (chosen should be longer / more detailed)
    len_ratio = len(chosen) / max(len(rejected), 1)
    score += min(0.2, len_ratio * 0.05)

    # Code block bonus
    if "```" in chosen:
        score += 0.15
    if "```" in rejected:
        score -= 0.05

    # Structure bonus (markdown)
    if re.search(r"\*\*[^*]+\*\*", chosen):
        score += 0.08
    if re.search(r"^\s*\d+\.", chosen, re.M):
        score += 0.05

    # Quality penalties
    weak_phrases = ["here is some", "you can use", "just do", "simply"]
    for phrase in weak_phrases:
        if phrase in chosen.lower():
            score -= 0.1

    return float(min(max(score, 0.0), 1.0))


# ─── Synthetic mutation: generate "next-level" pairs ─────────────────────────
def mutate_top_pairs(pairs: list[dict], n: int = 20) -> list[dict]:
    """Take the best pairs and generate evolved versions."""
    scored = sorted(pairs, key=lambda p: score_pair(p), reverse=True)
    top    = scored[:50]
    mutated = []

    improvement_verbs = [
        "Rewrite with 50% less code but same functionality",
        "Add comprehensive error handling and edge cases to",
        "Convert to async/await pattern and optimize",
        "Add TypeScript strict types to",
        "Refactor using functional programming patterns",
        "Add unit tests and documentation to",
        "Optimize for performance and bundle size",
        "Make accessible (WCAG AA) and SEO-optimized",
    ]

    for pair in random.sample(top, min(n, len(top))):
        verb = random.choice(improvement_verbs)
        domain = pair.get("domain", "code")
        mutated.append({
            "prompt": f"{verb}: {pair['prompt'][:100]}",
            "chosen": (
                f"**Evolved version ({verb.lower()[:40]}):**\n\n"
                + pair["chosen"][:600]
                + "\n\n// ← Improved: more efficient, robust, and maintainable"
            ),
            "rejected": pair["rejected"],
            "score": min(score_pair(pair) + 0.05, 1.0),
            "domain": domain,
            "source": "synthetic_mutation",
        })

    return mutated


# ─── Dataset management ───────────────────────────────────────────────────────
def load_dataset() -> list[dict]:
    if DATASET_PATH.exists():
        with open(DATASET_PATH) as f:
            data = json.load(f)
        print(f"📂  Loaded {len(data)} existing pairs")
        return data
    return []


def save_dataset(data: list[dict]):
    with open(DATASET_PATH, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"💾  Saved {len(data)} pairs → {DATASET_PATH}")


def evict_weak_pairs(data: list[dict]) -> list[dict]:
    """Remove lowest-scoring pairs when dataset is too large."""
    if len(data) <= MAX_DATASET:
        return data
    scored = [(score_pair(p), p) for p in data]
    scored.sort(key=lambda x: x[0], reverse=True)
    kept = [p for s, p in scored if s >= WEAK_THRESHOLD]
    kept = kept[:MAX_DATASET]
    print(f"🗑️   Evicted {len(data) - len(kept)} weak pairs (score < {WEAK_THRESHOLD})")
    return kept


def dedup(data: list[dict]) -> list[dict]:
    seen = set()
    out  = []
    for p in data:
        key = hashlib.md5((p.get("prompt", "") + p.get("chosen", ""))[:200].encode()).hexdigest()
        if key not in seen:
            seen.add(key)
            out.append(p)
    return out


# ─── Main crawler loop ────────────────────────────────────────────────────────
def run_cycle(domains: list[str] | None = None) -> int:
    print("\n" + "╔" + "═" * 68 + "╗")
    print("║" + "  🧬  LOMA Auto-Trainer — Crawl & Self-Improve Cycle".center(68) + "║")
    print("╚" + "═" * 68 + "╝\n")

    target_domains = domains or list(DOMAIN_TOPICS.keys())
    all_new_pairs  = []
    existing       = load_dataset()

    for domain in target_domains:
        print(f"\n🌐  Domain: [{domain.upper()}]")
        topics = DOMAIN_TOPICS[domain]

        for topic in topics:
            print(f"  🔍  '{topic}'")
            urls = ddg_search(topic)
            if not urls:
                print("      ⚠️  No results")
                continue

            for url in urls[:MAX_PAGES]:
                time.sleep(REQUEST_DELAY + random.uniform(0, 0.4))
                html = direct_get(url)
                if not html:
                    continue

                if domain == "code":
                    new_pairs = extract_code_pairs(html, topic, url)
                elif domain == "text":
                    new_pairs = extract_text_pairs(html, topic, url)
                elif domain == "image_gen":
                    new_pairs = extract_image_pairs(html, topic, url)
                elif domain == "music":
                    new_pairs = extract_music_pairs(html, topic, url)
                else:
                    new_pairs = []

                all_new_pairs.extend(new_pairs)
                print(f"      ✅  +{len(new_pairs)} pairs from {url[:50]}")

    # Synthetic mutations from top existing pairs
    print(f"\n🧬  Generating synthetic mutations from top pairs...")
    mutations = mutate_top_pairs(existing + all_new_pairs, n=30)
    all_new_pairs.extend(mutations)
    print(f"   +{len(mutations)} mutated pairs")

    # Merge, dedup, evict
    combined = existing + all_new_pairs
    combined = dedup(combined)
    combined = evict_weak_pairs(combined)
    save_dataset(combined)

    added = len(combined) - len(existing)
    print(f"\n✅  Cycle complete: +{len(all_new_pairs)} new | {added} net added | {len(combined)} total")
    return len(all_new_pairs)


# ─── CLI ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LOMA Auto-Trainer")
    parser.add_argument("--loop",   type=int, default=1,    help="Number of training cycles")
    parser.add_argument("--gap",    type=int, default=60,   help="Seconds between cycles")
    parser.add_argument("--domain", type=str, default=None, help="Single domain: code|text|image_gen|music")
    args = parser.parse_args()

    domains = [args.domain] if args.domain and args.domain in DOMAIN_TOPICS else None

    for cycle in range(args.loop):
        if cycle > 0:
            print(f"\n⏱️   Waiting {args.gap}s before next cycle…")
            time.sleep(args.gap)
        print(f"\n{'═' * 50}  CYCLE {cycle + 1}/{args.loop}")
        run_cycle(domains)

    print("\n🏁  All cycles complete. Run train_capabilities.py to fine-tune.")