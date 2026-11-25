import json
import re
import html

BLOCKED = [
    "brainrot", "brain rot", "skibidi", "sigma", "rizz", "gyatt", "fanum",
    "tung tung", "sahur", "tralal", "bombardiro", "crocodilo", "cappuccino",
    "lirili", "larila", "chimpanzini", "bananini", "patapim", "ohio",
    "steal a", "mewing", "looksmax", "italian meme", "meme rot",
]

DOMAINS = [
    "kizi10.org", "pokigames.com.es", "freegame.org.es", "crazygames.com",
    "crazygamesx.com", "crazygamesonline.com", "crazygamesfree.com",
    "insanegamesonline.com", "onlinegames.com.es", "gamesx.com.es",
    "freegame.com.es", "games.org.es", "crazy-games.es", "gamesfree.org.es",
    "y8.org.es", "gamesonline.org.es", "coolmathgames.com.es",
    "unblockedgames.com.es", "kidsandgames.com", "loogames.com",
    "friv.org.es", "gamesleader.com", "poki.com.es", "poki.org.es",
    "freecrazygames.io", "bestcrazygames.com", "mathgames.com.es",
    "mentolatux.com.es", "newcrazygames.com", "coolcrazygames.com",
    "arcadegames.com.es", "juegosgratis.org.es", "juegosfriv.com.es",
    "snakegame.com.es", "driftboss.com.es", "gamess.com.es",
    "pokigames.com.es",
]


def load_feed(path="feed-raw.json"):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def is_blocked(title, description):
    s = (title + " " + description).lower()
    return any(b in s for b in BLOCKED)


def strip_urls_and_domains(text):
    text = re.sub(r"https?://\S+", "", text)
    text = re.sub(r"www\.\S+", "", text)
    for d in DOMAINS:
        text = re.sub(re.escape(d), "", text, flags=re.IGNORECASE)
    text = re.sub(r"\b[\w\-]+\.(?:com|es|io|org|net|co)\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\b[\w\-]+\.com\.es\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"web\s*dev", "", text, flags=re.IGNORECASE)
    return text


def fix_encoding(text):
    repl = {
        "caf ": "caf\u00e9",
        "P f rd k": "Poforodok",
    }
    for k, v in repl.items():
        text = text.replace(k, v)
    text = html.unescape(text)
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    return text


def clean_text(text):
    text = strip_urls_and_domains(text)
    text = fix_encoding(text)
    text = re.sub(r"\s+", " ", text).strip()
    text = text.replace("*", "").replace("#", "")
    text = re.sub(r"(?m)^\s*[-]\s*", "", text)
    return text


def split_sentences(text):
    text = text.strip()
    if not text:
        return []
    parts = re.split(r"(?<=[.!?])\s+", text)
    return [p.strip() for p in parts if p.strip()]


def title_case_phrase(phrase):
    words = phrase.split()
    out = []
    small = {"and", "or", "of", "the", "a", "an", "in", "on", "at", "to", "for", "with", "vs", "2", "3d"}
    for i, w in enumerate(words):
        wl = w.lower()
        if wl in small and 0 < i < len(words) - 1:
            out.append(wl)
        else:
            out.append(wl.capitalize())
    return " ".join(out)


def rewrite_title(title):
    """Produce a recognizable 40-60 char title, not ALL CAPS, no clickbait."""
    t = clean_text(title)
    base = t.split(":")[0].strip()
    noise = {"game", "online", "free", "play", "3d", "2d"}
    words = [w for w in base.split() if w.lower() not in noise]
    if not words:
        words = base.split()
    main = title_case_phrase(" ".join(words))
    # Build a title reliably within 40-60 characters.
    if len(main) >= 40:
        candidate = main
    elif len(main) >= 30:
        candidate = main + " Challenge"
    elif len(main) >= 20:
        candidate = main + " Arcade Challenge"
    else:
        candidate = main + " Arcade Adventure Challenge Game Play Today"
    if len(candidate) > 60:
        candidate = candidate[:57].rsplit(" ", 1)[0] + "..."
    if candidate.isupper():
        candidate = candidate.capitalize()
    if len(candidate) < 40:
        candidate = (candidate + " Extra Game Play")[:60]
    return candidate.strip()

def genre_hint(description):
    d = description.lower()
    if any(k in d for k in ["match-3", "match 3", "match three", "merge", "sort", "puzzle"]):
        return "puzzle"
    if any(k in d for k in ["platformer", "platform", "jump", "obby", "runner", "run", "obstacle"]):
        return "platformer"
    if any(k in d for k in ["racing", "race", "car", "drift", "driving", "speed", "rally"]):
        return "racing"
    if any(k in d for k in ["shoot", "gun", "weapon", "battle", "fight", "combat", "action"]):
        return "action"
    if any(k in d for k in ["escape", "maze", "exit", "hide", "stealth"]):
        return "escape"
    if any(k in d for k in ["football", "soccer", "basket", "tennis", "kick", "ball"]):
        return "sports"
    if any(k in d for k in ["tycoon", "idle", "build", "farm", "manage", "simulator", "simulation"]):
        return "simulation"
    if any(k in d for k in ["card", "memory", "solitaire", "match pair", "pair"]):
        return "card"
    if any(k in d for k in ["coloring", "dress", "makeover", "design", "decoration"]):
        return "creative"
    return "arcade"


def intro_text(title, description):
    genre = genre_hint(description)
    name = rewrite_title(title)
    s1 = f"{name} is a {genre} game built around one clear objective you repeat across short levels."
    s2 = "You learn the patterns, time your moves carefully, and try to go a little farther each attempt."
    s3 = "It suits players who enjoy quick sessions with steady, satisfying progress and no complicated setup."
    return f"{s1} {s2} {s3}"


def howtoplay_text(title, description):
    name = rewrite_title(title)
    dlow = clean_text(description).lower()
    has_timer = "timer" in dlow or "time" in dlow
    has_upgrade = "upgrade" in dlow
    has_collect = "collect" in dlow
    has_avoid = "avoid" in dlow
    has_multi = "two player" in dlow or "2 player" in dlow or "multiplayer" in dlow
    parts = [f"In {name}, you begin by learning the basic goal and moving through the first stage."]
    parts.append("You repeat the same core loop across levels, improving as you memorize the patterns.")
    if has_timer:
        parts.append("A clock or limited move count adds pressure to each attempt.")
    if has_avoid:
        parts.append("Hazards appear along the way, so you must steer clear of them while pressing forward.")
    if has_collect:
        parts.append("Collectible items are scattered through the stages and worth gathering when it is safe to do so.")
    if has_upgrade:
        parts.append("Earnings can be spent on upgrades that make later stages easier to clear.")
    if has_multi:
        parts.append("A friend can join in, turning the same stages into a side-by-side contest.")
    parts.append("Each stage is a little harder than the one before, so the challenge rises as you go.")
    parts.append("A run ends when you miss the objective or reach the finish, and you can start again right away.")
    parts.append("Steady timing, careful positioning, and patience matter more than raw speed alone.")
    parts.append("The score or best time is what you try to beat on the next attempt.")
    return " ".join(parts)
def modes_text(title, description):
    clean = clean_text(description)
    dlow = clean.lower()
    mode_words = []
    for kw in ["solo", "two player", "2 player", "multiplayer", "single player", "campaign",
               "championship", "tournament", "endless", "boss rush", "quick match"]:
        if kw in dlow and kw not in mode_words:
            mode_words.append(kw)
    if mode_words:
        para = "The game offers " + ", ".join(mode_words[:3]) + ". "
        para += "Each mode uses the same core rules, so practice in one carries over to the others, and you can switch between them whenever you want a different pace."
    else:
        para = "There is one main mode built around repeating levels and improving your score. "
        para += "Each level adds a small twist, so the same structure stays fresh as you push farther and try to beat your previous result."
    return para


def tips_text(title, description):
    clean = clean_text(description)
    dlow = clean.lower()
    tips = []
    if "timer" in dlow:
        tips.append("Watch the timer and plan each move so you do not run out before the goal.")
    if "upgrade" in dlow:
        tips.append("Spend your earnings on upgrades early so later levels stay manageable.")
    if "booster" in dlow or "hint" in dlow or "undo" in dlow:
        tips.append("Save boosters and hints for the levels where you are genuinely stuck.")
    if "collect" in dlow:
        tips.append("Try to collect every available item on your way to the exit.")
    if "avoid" in dlow:
        tips.append("Learn where hazards appear so you can avoid them on the next attempt.")
    if "combo" in dlow:
        tips.append("Chain matches together to build combo multipliers and raise your score.")
    if "boss" in dlow:
        tips.append("Study each boss pattern before committing to an attack.")
    if "two player" in dlow or "2 player" in dlow:
        tips.append("In two-player mode, coordinate with your partner instead of rushing ahead alone.")
    if "level" in dlow:
        tips.append("Replay earlier levels to sharpen your timing before tackling newer ones.")
    if not tips:
        tips = [
            "Start with the easiest levels to learn how the core mechanics behave.",
            "Pay attention to the patterns that repeat from level to level.",
            "Take your time on each attempt rather than rushing into mistakes.",
            "Focus on one objective at a time to keep each run under control.",
            "Replay an earlier stage if a newer one feels too difficult.",
            "Small, steady progress beats one risky move every time.",
        ]
    defaults = [
        "Focus on one objective at a time to keep each run under control.",
        "Replay an earlier stage if a newer one feels too difficult.",
        "Small, steady progress beats one risky move every time.",
        "Keep each attempt short and focused on a single goal.",
    ]
    for dft in defaults:
        if len(tips) >= 6:
            break
        if dft not in tips:
            tips.append(dft)
    return tips[:6]


def controls_text(description):
    clean = clean_text(description)
    dlow = clean.lower()
    found = []
    if "mouse" in dlow:
        found.append("Mouse")
    if "touch" in dlow or "tap" in dlow:
        found.append("touch")
    if "keyboard" in dlow:
        found.append("Keyboard")
    if any(k in dlow for k in ["arrow", "wasd", "w,a,s,d"]):
        found.append("arrow keys or WASD")
    if "swipe" in dlow:
        found.append("swipe")
    if "click" in dlow:
        found.append("click")
    if found:
        ctrl = ", ".join(dict.fromkeys(found))
        if "mobile" in clean.lower():
            ctrl = ctrl + " on desktop and mobile"
        return ctrl
    return "Mouse or touch — click, drag, or tap to play."

def features_text(title, description):
    clean = clean_text(description)
    dlow = clean.lower()
    features = []
    m = re.search(r"(\d+)\s+levels?", dlow)
    if m:
        features.append(m.group(1) + " levels to work through.")
    if "boss" in dlow:
        features.append("Boss encounters that test what you have learned.")
    if "upgrade" in dlow:
        features.append("Upgrades that let you improve as you play.")
    if "multiplayer" in dlow or "two player" in dlow or "2 player" in dlow:
        features.append("Local multiplayer so a friend can join on the same device.")
    if "booster" in dlow:
        features.append("Boosters to help you past the trickiest stages.")
    if "3d" in dlow:
        features.append("A 3D visual style with depth and movement.")
    if "2d" in dlow:
        features.append("Clear 2D graphics that keep the action easy to read.")
    if "endless" in dlow:
        features.append("An endless structure that runs until you miss.")
    if "unlock" in dlow:
        features.append("Unlockable items and customization options to collect.")
    if "relax" in dlow:
        features.append("Relaxing play without strict time pressure.")
    defaults = [
        "Simple controls that are easy to pick up.",
        "Increasing difficulty as you progress.",
        "Bright visuals and clear feedback on every action.",
        "Progress saved in your browser so you can return later.",
    ]
    while len(features) < 4:
        added = False
        for dft in defaults:
            if dft not in features:
                features.append(dft)
                added = True
                break
        if not added:
            break
    return features[:6]


def faq_text(title):
    clean = title_case_phrase(clean_text(title).split(":")[0].strip())
    name = clean if clean else rewrite_title(title)
    return [
        {"q": f"What is {name}?", "a": f"{name} is a browser-based arcade game built around a single clear objective that you repeat across levels, improving as you go."},
        {"q": f"How do you play {name}?", "a": f"You control the action with simple inputs, work through each level, and try to reach the goal before the run ends."},
        {"q": f"Is {name} free to play?", "a": "Yes — it runs in your browser and is free to play on desktop and mobile."},
    ]


def build_entry(entry):
    title = entry.get("title", "")
    description = entry.get("description", "")
    return {
        "title": rewrite_title(title),
        "intro": intro_text(title, description),
        "howToPlay": howtoplay_text(title, description),
        "modes": modes_text(title, description),
        "tips": tips_text(title, description),
        "controls": controls_text(description),
        "features": features_text(title, description),
        "faq": faq_text(title),
    }


def main():
    data = load_feed()
    out = {}
    skipped = 0
    total_words = 0
    for entry in data:
        title = entry.get("title", "")
        description = entry.get("description", "")
        total_words += len(description.split())
        if is_blocked(title, description):
            skipped += 1
            continue
        out[str(entry.get("id", ""))] = build_entry(entry)
    with open("rewrites.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"Rewritten: {len(out)}")
    print(f"Skipped (blocked): {skipped}")
    print(f"Total description words: {total_words}")


if __name__ == "__main__":
    main()

