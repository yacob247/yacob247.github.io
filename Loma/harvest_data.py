import json
import time
import random
import urllib.parse
import urllib.request
import re

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    raise SystemExit("❌  Run: pip install requests beautifulsoup4")

# ─── Config ───────────────────────────────────────────────────────────────────
ALLORIGINS    = "https://api.allorigins.win/raw?url="   # correct endpoint
DDGO_SEARCH   = "https://html.duckduckgo.com/html/?q="
MAX_PAGES     = 3          # links to follow per topic
MIN_CODE_LEN  = 60        # ignore tiny snippets
REQUEST_DELAY = 1.5       # seconds between requests — be polite
HEADERS       = {"User-Agent": "Mozilla/5.0 (compatible; DataHarvester/1.0)"}

# ─── Topics: what the model should learn to generate AND understand ────────────
TOPICS = [
    "modern navbar css flexbox",
    "responsive card grid html css",
    "css pulsing button animation",
    "html css hero section landing page",
    "css dark mode toggle javascript",
    "responsive sidebar navigation html css",
    "css glassmorphism card effect",
    "html css sticky header scroll",
    "css grid photo gallery responsive",
    "html form validation css styling",
]


def proxy_get(url: str, timeout: int = 8) -> str | None:
    """Fetch any URL through allorigins to bypass CORS/blocks."""
    proxied = ALLORIGINS + urllib.parse.quote(url, safe="")
    try:
        r = requests.get(proxied, headers=HEADERS, timeout=timeout)
        r.raise_for_status()
        return r.text
    except Exception as e:
        print(f"    ⚠️  Fetch failed ({url[:60]}…): {e}")
        return None


def search_duckduckgo(query: str) -> list[str]:
    """Return a list of result URLs from DuckDuckGo HTML search."""
    url = DDGO_SEARCH + urllib.parse.quote_plus(query)
    html = proxy_get(url)
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    links = []
    for a in soup.select("a.result__url, a.result__a"):
        href = a.get("href", "")
        # DuckDuckGo wraps real URLs — unwrap if needed
        if "uddg=" in href:
            href = urllib.parse.unquote(re.search(r"uddg=([^&]+)", href).group(1))
        if href.startswith("http") and "duckduckgo.com" not in href:
            links.append(href)
    return list(dict.fromkeys(links))[:MAX_PAGES]   # deduplicate, limit


def extract_code_blocks(html: str, topic: str) -> list[dict]:
    """
    Pull <code>/<pre> blocks that look like HTML/CSS.
    For each block, also generate an 'explain this' pair so the model
    learns to *understand* code, not just reproduce it.
    """
    soup = BeautifulSoup(html, "html.parser")
    pairs = []

    for block in soup.find_all(["pre", "code"]):
        text = block.get_text(separator="\n").strip()

        # Must be long enough and look like HTML or CSS
        if len(text) < MIN_CODE_LEN:
            continue
        is_html = bool(re.search(r"<(div|nav|section|header|button|ul|form|html)", text, re.I))
        is_css  = bool(re.search(r"[\.\#\*]?\w+\s*\{[^}]+\}", text))
        if not (is_html or is_css):
            continue

        # Detect language label for the code fence
        lang = "html" if is_html else "css"

        # ── Pair 1: Generation (prompt → produce code) ────────────────────────
        pairs.append({
            "prompt": f"Write clean, production-ready {lang.upper()} code for: {topic}.",
            "chosen": f"Here is the optimized {lang.upper()} implementation:\n\n```{lang}\n{text}\n```",
            "rejected": f"You could use a basic {lang} structure here."   # weak answer
        })

        # ── Pair 2: Understanding (ask model to explain the code) ─────────────
        pairs.append({
            "prompt": f"Explain how the following {lang.upper()} code works and what each part does:\n\n```{lang}\n{text[:600]}\n```",
            "chosen": (
                f"This {lang.upper()} snippet implements **{topic}**. "
                f"Here is a breakdown of the key parts:\n\n"
                f"- The structure uses `{'flexbox' if 'flex' in text.lower() else 'standard layout'}` "
                f"for positioning.\n"
                f"- Key selectors/elements target the main container and its children.\n"
                f"- The approach ensures responsiveness and cross-browser compatibility.\n\n"
                f"Full code for reference:\n```{lang}\n{text}\n```"
            ),
            "rejected": f"This is some {lang} code that does styling things."
        })

        # ── Pair 3: Search/lookup understanding ───────────────────────────────
        pairs.append({
            "prompt": f"Search for and explain best practices for implementing: {topic}.",
            "chosen": (
                f"When implementing **{topic}**, these are the key practices:\n\n"
                f"1. Use semantic HTML elements for structure.\n"
                f"2. Apply CSS custom properties (variables) for maintainability.\n"
                f"3. Ensure responsiveness with media queries or flexible units.\n"
                f"4. Test across browsers (Chrome, Firefox, Safari).\n\n"
                f"Here is a working implementation:\n```{lang}\n{text}\n```"
            ),
            "rejected": "Just search online for tutorials about this."
        })

        # Stop at 2 blocks per page to keep quality high
        if len(pairs) >= 6:
            break

    return pairs


def harvest(topics: list[str]) -> list[dict]:
    all_pairs = []
    seen_code  = set()   # dedup by code content hash

    for topic in topics:
        print(f"\n🔍  Topic: '{topic}'")
        urls = search_duckduckgo(topic + " example code tutorial")
        print(f"    Found {len(urls)} pages to crawl")

        if not urls:
            print("    ⚠️  No results — skipping")
            continue

        for url in urls:
            print(f"    📄  {url[:70]}")
            time.sleep(REQUEST_DELAY + random.uniform(0, 0.5))

            html = proxy_get(url)
            if not html:
                continue

            pairs = extract_code_blocks(html, topic)
            for pair in pairs:
                # Deduplicate by hashing the chosen text
                key = hash(pair["chosen"][:200])
                if key not in seen_code:
                    seen_code.add(key)
                    all_pairs.append(pair)

        print(f"    ✅  Running total: {len(all_pairs)} pairs")

    return all_pairs


def main():
    print("╔" + "═" * 58 + "╗")
    print("║" + "  🌐  HTML/CSS Data Harvester — Web Crawler".center(58) + "║")
    print("║" + "  Generates: generate + understand + search pairs".center(58) + "║")
    print("╚" + "═" * 58 + "╝\n")

    new_pairs = harvest(TOPICS)
    print(f"\n📦  Harvested {len(new_pairs)} total training pairs")

    # ── Merge with existing dataset ───────────────────────────────────────────
    dataset_path = "my_rlhf_dataset.json"
    try:
        with open(dataset_path, "r") as f:
            existing = json.load(f)
        print(f"📂  Loaded {len(existing)} existing entries from '{dataset_path}'")
    except FileNotFoundError:
        existing = []
        print(f"📂  No existing dataset found — creating new '{dataset_path}'")

    # Merge and validate schema
    combined = existing + new_pairs
    valid = [
        d for d in combined
        if d.get("prompt", "").strip()
        and d.get("chosen", "").strip()
    ]
    invalid = len(combined) - len(valid)
    if invalid:
        print(f"⚠️  Dropped {invalid} entries with missing prompt/chosen fields")

    with open(dataset_path, "w") as f:
        json.dump(valid, f, indent=4, ensure_ascii=False)

    print(f"✅  Saved {len(valid)} total entries → '{dataset_path}'")
    print(f"    (+{len(new_pairs)} new | {len(existing)} existing)\n")


if __name__ == "__main__":
    main()