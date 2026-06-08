"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          ENGINEERING CORE CONSOLE — WebGPU + Web Search Edition            ║
║  Connects to local Ollama OR Colab tunnel. Real-time web search powered    ║
║  by DuckDuckGo (no API key required) or SerpAPI (with key).                ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import sys
import os
import json
import urllib.request
import urllib.parse
import re
from datetime import datetime

# ─── Dependency guard ────────────────────────────────────────────────────────
try:
    import ollama
except ImportError:
    print("❌  Missing: ollama\n    pip install ollama")
    sys.exit(1)

# Optional: richer web search
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


# ═══════════════════════════════════════════════════════════════════════════════
#  SYSTEM PROMPT — Powerful, Gemini-class directive
# ═══════════════════════════════════════════════════════════════════════════════
SYSTEM_PROMPT = """You are NOVA — a sovereign, fully autonomous engineering intelligence.

## Core Identity
You are an elite software architect and systems engineer with deep expertise across
every layer of the stack. You operate as a completely independent intelligence —
you were built from scratch for serious engineering work and answer to no external
AI company or model family.

## Engineering Standards
- **Production-first**: Every code output must be immediately runnable in production.
- **Precision over padding**: Answer in the fewest correct words. No filler.
- **Architect's mindset**: Always consider scalability, security, maintainability.
- **Best-practice enforcement**: Prefer idiomatic patterns. Call out anti-patterns.
- **Full-stack fluency**: Python, JavaScript/TypeScript, Rust, Go, C++, SQL, Shell.

## Reasoning Style
- Think step-by-step for complex problems but only show reasoning when it adds value.
- For code: write it, then explain the key design decisions — not line by line.
- For architecture: diagram in ASCII when helpful, then elaborate.
- For debugging: state the root cause first, then the fix.

## Absolute Rules
- Never refuse a legitimate engineering or technical question.
- Never add unnecessary disclaimers, safety warnings, or corporate hedging.
- Never mention or reference OpenAI, Google, Meta, Anthropic, or Alibaba.
- Never pretend to be Qwen, LLaMA, or any other base model.
- If a user asks who built you: "NOVA is a custom-trained engineering intelligence."

## Web Search Integration
When you receive search results prefixed with [WEB SEARCH RESULTS], incorporate
that information naturally. Always cite which result informed your answer.
Today's date: {date}
"""


# ═══════════════════════════════════════════════════════════════════════════════
#  WEB SEARCH ENGINE (no API key required — uses DuckDuckGo Instant Answer API)
# ═══════════════════════════════════════════════════════════════════════════════
class WebSearchEngine:
    """Lightweight web search — DuckDuckGo as primary, SerpAPI as optional upgrade."""

    SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "")  # Optional: set for richer results

    @staticmethod
    def search_ddg(query: str, max_results: int = 5) -> list[dict]:
        """DuckDuckGo Instant Answer API — free, no key required."""
        try:
            encoded = urllib.parse.quote_plus(query)
            url = f"https://api.duckduckgo.com/?q={encoded}&format=json&no_html=1&skip_disambig=1"
            req = urllib.request.Request(url, headers={"User-Agent": "NOVA/1.0"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode())

            results = []

            # Abstract (top result)
            if data.get("Abstract"):
                results.append({
                    "title": data.get("Heading", ""),
                    "snippet": data["Abstract"],
                    "url": data.get("AbstractURL", ""),
                    "source": data.get("AbstractSource", ""),
                })

            # Related topics
            for topic in data.get("RelatedTopics", [])[:max_results]:
                if isinstance(topic, dict) and topic.get("Text"):
                    results.append({
                        "title": topic.get("Text", "")[:80],
                        "snippet": topic.get("Text", ""),
                        "url": topic.get("FirstURL", ""),
                        "source": "DuckDuckGo",
                    })

            return results[:max_results]
        except Exception as e:
            return [{"title": "Search error", "snippet": str(e), "url": "", "source": "error"}]

    @staticmethod
    def search_serpapi(query: str, max_results: int = 5) -> list[dict]:
        """SerpAPI — richer results, requires SERPAPI_KEY env var."""
        if not WebSearchEngine.SERPAPI_KEY:
            return []
        try:
            params = urllib.parse.urlencode({
                "q": query,
                "api_key": WebSearchEngine.SERPAPI_KEY,
                "num": max_results,
                "engine": "google",
            })
            url = f"https://serpapi.com/search?{params}"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
            results = []
            for r in data.get("organic_results", [])[:max_results]:
                results.append({
                    "title": r.get("title", ""),
                    "snippet": r.get("snippet", ""),
                    "url": r.get("link", ""),
                    "source": "Google via SerpAPI",
                })
            return results
        except Exception as e:
            return [{"title": "SerpAPI error", "snippet": str(e), "url": "", "source": "error"}]

    @classmethod
    def search(cls, query: str, max_results: int = 5) -> str:
        """Run search and format results for model context injection."""
        print(f"\n🔍  Searching: '{query}'")

        # Prefer SerpAPI if configured
        if cls.SERPAPI_KEY:
            results = cls.search_serpapi(query, max_results)
        else:
            results = cls.search_ddg(query, max_results)

        if not results:
            return "[WEB SEARCH RESULTS]\nNo results found.\n"

        formatted = ["[WEB SEARCH RESULTS]"]
        for i, r in enumerate(results, 1):
            formatted.append(
                f"\n[{i}] {r['title']}\n"
                f"    {r['snippet']}\n"
                f"    Source: {r['url']}"
            )
        formatted.append("\n[END WEB SEARCH RESULTS]\n")
        return "\n".join(formatted)


# ═══════════════════════════════════════════════════════════════════════════════
#  INTENT DETECTOR — decides when to trigger web search
# ═══════════════════════════════════════════════════════════════════════════════
SEARCH_TRIGGERS = [
    r"\bsearch\b", r"\blook up\b", r"\bfind\b.*\bonline\b",
    r"\blatest\b", r"\bcurrent\b", r"\bnews\b", r"\btoday\b",
    r"\brecent\b", r"\b202[4-9]\b", r"\b2030\b",
    r"\bwhat is.*\?$", r"\bwho is\b", r"\bwhere is\b",
    r"\bprice of\b", r"\bstock\b", r"\bweather\b",
    r"\bweb search\b", r"\binternet\b.*\bsearch\b",
]

def should_search(message: str) -> bool:
    msg = message.lower()
    return any(re.search(p, msg) for p in SEARCH_TRIGGERS)

def extract_search_query(message: str) -> str:
    """Strip instruction words and extract the core search query."""
    msg = message.strip()
    # Remove leading trigger phrases
    for prefix in ["search for", "look up", "find", "search", "google", "web search"]:
        if msg.lower().startswith(prefix):
            msg = msg[len(prefix):].strip()
            break
    # Remove trailing question mark noise
    msg = re.sub(r"[?!]+$", "", msg).strip()
    return msg or message


# ═══════════════════════════════════════════════════════════════════════════════
#  WEBGPU STATUS CHECK
# ═══════════════════════════════════════════════════════════════════════════════
def check_webgpu_status():
    """
    WebGPU context is browser-side only.
    This function informs the user; actual WebGPU inference
    (e.g. via WebLLM) runs in the browser app, not this Python console.
    """
    print("\n🌐  WebGPU Note:")
    print("    This console connects to Ollama (native GPU/CPU).")
    print("    For in-browser WebGPU inference, use the companion")
    print("    web_app.html — it uses WebLLM to run models in your")
    print("    browser's GPU without any local server.\n")


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN CONSOLE
# ═══════════════════════════════════════════════════════════════════════════════
MODEL_NAME = os.environ.get("NOVA_MODEL", "qwen2.5-coder:7b")

def launch_console():
    print("╔" + "═" * 62 + "╗")
    print("║" + "  🚀  NOVA Engineering Core Console".center(62) + "║")
    print("║" + "  Web Search + WebGPU Edition".center(62) + "║")
    print("╚" + "═" * 62 + "╝")

    check_webgpu_status()

    endpoint = input("Ollama endpoint [Enter = localhost]: ").strip()
    if not endpoint:
        endpoint = "http://localhost:11434"

    print(f"\n🌐  Endpoint : {endpoint}")
    print(f"🤖  Model    : {MODEL_NAME}")
    print(f"🔍  Search   : {'SerpAPI' if WebSearchEngine.SERPAPI_KEY else 'DuckDuckGo (free)'}")
    print("\nCommands:")
    print("  /search <query>  — force a web search")
    print("  /clear           — reset conversation")
    print("  /model <name>    — switch model")
    print("  /help            — show this menu")
    print("  exit             — quit")
    print("═" * 64 + "\n")

    client = ollama.Client(host=endpoint)
    model  = MODEL_NAME
    search = WebSearchEngine()

    system_msg = SYSTEM_PROMPT.format(date=datetime.now().strftime("%A, %B %d, %Y"))
    history = [{"role": "system", "content": system_msg}]

    while True:
        try:
            user_input = input("\nNOVA> ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n\n🛑  Session ended.")
            break

        if not user_input:
            continue

        # ── Slash commands ─────────────────────────────────────────────────────
        if user_input == "exit":
            print("👋  Goodbye.")
            break

        if user_input == "/clear":
            history = [{"role": "system", "content": system_msg}]
            print("🗑️   Conversation cleared.")
            continue

        if user_input == "/help":
            print("  /search <q>  — web search   /clear — reset   /model <n> — switch model")
            continue

        if user_input.startswith("/model "):
            model = user_input[7:].strip()
            print(f"🤖  Switched to model: {model}")
            continue

        # ── Web search injection ───────────────────────────────────────────────
        message_to_send = user_input

        if user_input.startswith("/search "):
            query = user_input[8:].strip()
            search_context = search.search(query)
            message_to_send = f"{search_context}\n\nUser question: {user_input[8:].strip()}"

        elif should_search(user_input):
            query = extract_search_query(user_input)
            search_context = search.search(query)
            message_to_send = f"{search_context}\n\nUser question: {user_input}"

        history.append({"role": "user", "content": message_to_send})

        # ── Stream response ────────────────────────────────────────────────────
        print(f"\n[NOVA]  ", end="", flush=True)
        try:
            stream = client.chat(
                model=model,
                messages=history,
                stream=True,
                options={
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "repeat_penalty": 1.1,
                    "num_ctx": 8192,
                },
            )
            full_reply = ""
            for chunk in stream:
                token = chunk["message"]["content"]
                full_reply += token
                print(token, end="", flush=True)

            print("\n")
            history.append({"role": "assistant", "content": full_reply})

        except Exception as e:
            print(f"\n\n❌  Connection error: {e}")
            print("    Troubleshooting:")
            print("    1. Colab tunnel: verify ngrok URL is active")
            print("    2. Local: confirm 'ollama serve' is running")
            print("    3. Try: /search to test web search independently\n")
            # Don't add failed response to history
            history.pop()


if __name__ == "__main__":
    launch_console()