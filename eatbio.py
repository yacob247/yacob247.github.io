"""
3_add_eat_bio.py
----------------
Injects a founder/author E-A-T bio section into about.html if it
doesn't already have one.

The bio section is inserted just before the Publisher Quality Statement
section (which already exists in your about.html). This keeps the page
flow logical: company → methodology → founder → publisher statement.

Run from your repo root:
    python 3_add_eat_bio.py

Or pass the path to about.html:
    python 3_add_eat_bio.py /path/to/about.html

Customise the bio details in the BIO_* variables below.
"""

import os
import re
import sys

DRY_RUN    = False
ABOUT_PATH = sys.argv[1] if len(sys.argv) > 1 else "about.html"

# ── Customise these ───────────────────────────────────────────────────────────
BIO_NAME        = "Yacob"                          # founder first name
BIO_ROLE        = "Founder & Developer"
BIO_DESCRIPTION = (
    "Yacob Digital is an independent, self-funded development operation "
    "built and maintained by a solo developer with a background in "
    "full-stack web development, browser-based tooling, and client-side "
    "application design. Every product — from Envizion's tool library to "
    "the upcoming Creator Suite and Study Workspace — is hand-coded, "
    "tested, and deployed without outsourcing or AI-generated content pipelines."
)
BIO_SKILLS = [
    "HTML / CSS / JavaScript",
    "Client-side application architecture",
    "Browser API integration",
    "UI/UX design systems",
    "SEO & web performance optimisation",
]
BIO_GITHUB = "https://github.com/yacob247"
# ─────────────────────────────────────────────────────────────────────────────

# Build the skills list HTML
skills_html = "\n".join(
    f'                  <li class="flex items-center gap-2 text-xs text-gray-600">'
    f'<i data-lucide="check" class="w-3.5 h-3.5 text-envizion-primary flex-shrink-0"></i>{skill}</li>'
    for skill in BIO_SKILLS
)

EAT_SECTION = f"""
  <!-- E-A-T: Founder Bio Section (added for Google AdSense E-A-T compliance) -->
  <section class="py-16 bg-slate-50 border-b border-gray-100" id="founder">
    <div class="container mx-auto px-6 max-w-4xl">
      <div class="text-center mb-10">
        <span class="text-xs font-bold text-envizion-primary uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Who's Behind This</span>
        <h2 class="text-3xl font-heading font-black text-envizion-dark mt-3 tracking-tight">Founder &amp; Developer</h2>
      </div>
      <div class="bg-white rounded-2xl border border-slate-100 shadow-card p-8 flex flex-col md:flex-row gap-8 items-start">
        <!-- Avatar placeholder -->
        <div class="flex-shrink-0 w-20 h-20 rounded-full bg-envizion-primary flex items-center justify-center text-white text-3xl font-heading font-black select-none">
          {BIO_NAME[0].upper()}
        </div>
        <!-- Bio content -->
        <div class="flex-1">
          <div class="flex flex-wrap items-center gap-3 mb-3">
            <h3 class="text-xl font-heading font-black text-envizion-dark">{BIO_NAME}</h3>
            <span class="text-xs font-bold bg-blue-50 text-envizion-primary px-3 py-1 rounded-full border border-blue-200">{BIO_ROLE}</span>
          </div>
          <p class="text-sm text-gray-600 leading-relaxed mb-5">
            {BIO_DESCRIPTION}
          </p>
          <!-- Skills -->
          <div class="mb-5">
            <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Core Skills</p>
            <ul class="grid sm:grid-cols-2 gap-y-2 gap-x-4">
{skills_html}
            </ul>
          </div>
          <!-- GitHub link -->
          <a href="{BIO_GITHUB}" target="_blank" rel="noopener noreferrer"
             class="inline-flex items-center gap-2 text-xs font-bold text-envizion-primary hover:underline">
            <i data-lucide="github" class="w-4 h-4"></i>
            View work on GitHub
          </a>
        </div>
      </div>
    </div>
  </section>
"""

# We insert this just before the Publisher Quality Statement section
ANCHOR_PATTERN = re.compile(
    r'(<section[^>]*>\s*<div[^>]*>\s*<div[^>]*>\s*<div[^>]*>\s*'
    r'<div[^>]*>\s*<i[^>]*shield-check[^>]*>)',
    re.IGNORECASE | re.DOTALL
)

# Simpler fallback: find the publisher quality section by its heading text
FALLBACK_PATTERN = re.compile(
    r'(Publisher Quality Statement)',
    re.IGNORECASE
)


def already_has_bio(html: str) -> bool:
    return "founder" in html.lower() and "core skills" in html.lower()


def inject_bio(html: str) -> tuple[str, bool]:
    """Returns (modified_html, success)."""

    # Try to find the Publisher Quality Statement section to insert before it
    # Walk backwards from the text to find the opening <section> tag
    match = FALLBACK_PATTERN.search(html)
    if match:
        # Find the nearest <section before this match
        section_start = html.rfind("<section", 0, match.start())
        if section_start != -1:
            return html[:section_start] + EAT_SECTION + html[section_start:], True

    # Fallback: insert before </main>
    main_close = html.rfind("</main>")
    if main_close != -1:
        return html[:main_close] + EAT_SECTION + html[main_close:], True

    # Last resort: insert before </body>
    body_close = html.rfind("</body>")
    if body_close != -1:
        return html[:body_close] + EAT_SECTION + html[body_close:], True

    return html, False


def process(about_path: str):
    if not os.path.exists(about_path):
        print(f"ERROR: File not found: {about_path}")
        return

    with open(about_path, "r", encoding="utf-8", errors="replace") as f:
        original = f.read()

    if already_has_bio(original):
        print("about.html already contains a founder bio section — nothing to do.")
        return

    fixed, success = inject_bio(original)

    if not success:
        print("ERROR: Could not find a suitable insertion point in about.html.")
        return

    if DRY_RUN:
        print("[DRY RUN] Would inject E-A-T bio section into about.html")
        # Show a preview of what would be added
        print("\n--- SECTION PREVIEW (first 400 chars) ---")
        print(EAT_SECTION[:400])
        return

    with open(about_path, "w", encoding="utf-8") as f:
        f.write(fixed)

    print(f"✓ E-A-T founder bio section injected into: {os.path.abspath(about_path)}")
    print("  Lucide icons used: 'check', 'github' — already loaded by your existing lucide script.")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else ABOUT_PATH
    process(path)