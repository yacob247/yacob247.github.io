#!/usr/bin/env python3
"""
patch_stream.py — make codeRoute stream the generated file live in the chat.

Replaces the whole classify/codeRoute/serve/directRoute block (from the previous
patch) with an expanded version that adds:
  · renderLiveCode()      — inline editor card appended to chat
  · attachLiveCodeActions — Copy + Download buttons after streaming completes
  · guessExt / mimeFor / stripFenceDisplay — helpers
  · new codeRoute         — token-by-token streaming into the live editor

Creates index.html.bak2 on first run. Idempotent.

Usage:
    python3 patch_stream.py
"""

import sys
from pathlib import Path

FILE = Path("index.html")
START = "    // ── intent classifier: the ONE reasoning step before any path is chosen ──"
END   = "    async function chat(text, targetChat, requestFiles = []) {"

NEW_BLOCK = r'''    // ── streaming code view: what the model writes appears live, char by char ──
    function ensureLiveStyles() {
        if (document.getElementById("live-code-styles")) return;
        const s = document.createElement("style");
        s.id = "live-code-styles";
        s.textContent =
            "@keyframes livepulse{50%{opacity:.25}}" +
            ".live-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#00d4ff;animation:livepulse 1s infinite;margin-right:6px;vertical-align:middle;}" +
            ".live-dot.done{animation:none;background:#22c55e;}" +
            ".live-dot.err{animation:none;background:#fb7185;}" +
            ".live-editor{width:100%;min-height:320px;background:#0b1224;color:#a5f3fc;border:0;padding:14px 16px;" +
            "font-family:Consolas,'Courier New',monospace;font-size:.82rem;line-height:1.5;outline:none;resize:vertical;white-space:pre;overflow:auto;}";
        document.head.appendChild(s);
    }

    function renderLiveCode(title, targetChat) {
        if (S.cur.id !== targetChat.id) return null;
        ensureLiveStyles();
        const card = document.createElement("div");
        card.className = "inline-card";
        const header = document.createElement("div");
        header.className = "ic-header";
        const ttl = document.createElement("span");
        ttl.className = "ic-title";
        ttl.textContent = title;
        const acts = document.createElement("div");
        acts.className = "ic-actions";
        const badge = document.createElement("span");
        badge.style.cssText = "font-size:.72rem;color:#94a3b8;font-family:ui-monospace,monospace;display:flex;align-items:center;";
        badge.innerHTML = '<span class="live-dot"></span><span class="live-char">0 chars · connecting…</span>';
        acts.appendChild(badge);
        header.append(ttl, acts);
        const ta = document.createElement("textarea");
        ta.className = "live-editor";
        ta.spellcheck = false;
        ta.readOnly = true;
        ta.placeholder = "Waiting for the first tokens…";
        card.append(header, ta);
        $("chat").appendChild(card);
        autoscroll();
        return { card, ta, ttl, badge, acts };
    }

    function attachLiveCodeActions(live, filename) {
        live.ta.readOnly = false;
        const copy = document.createElement("button");
        copy.className = "ic-btn";
        copy.textContent = "Copy";
        copy.onclick = async () => {
            try {
                await navigator.clipboard.writeText(live.ta.value);
                copy.textContent = "Copied ✓";
                setTimeout(() => copy.textContent = "Copy", 1400);
            } catch (_) { live.ta.select(); document.execCommand("copy"); }
        };
        const dl = document.createElement("button");
        dl.className = "ic-btn";
        dl.style.cssText = "background:#00d4ff;color:#000;border-color:#00d4ff;";
        dl.textContent = "Download";
        dl.onclick = () => {
            const blob = new Blob([live.ta.value], { type: mimeFor(filename) });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        };
        live.ta.oninput = () => {
            const c = live.badge.querySelector(".live-char");
            if (c) c.textContent = live.ta.value.length + " chars · edited";
        };
        live.acts.append(copy, dl);
    }

    function guessExt(text) {
        const t = String(text).toLowerCase();
        if (/\b(python|\.py)\b/.test(t)) return "py";
        if (/\b(typescript|\.ts)\b/.test(t)) return "ts";
        if (/\b(javascript|\.js|node)\b/.test(t)) return "js";
        if (/\b(css)\b/.test(t)) return "css";
        if (/\b(svg)\b/.test(t)) return "svg";
        if (/\b(markdown|\.md)\b/.test(t)) return "md";
        return "html";
    }

    function mimeFor(filename) {
        const ext = String(filename).split(".").pop().toLowerCase();
        const map = {
            html: "text/html", htm: "text/html", js: "text/javascript", mjs: "text/javascript",
            ts: "text/plain", py: "text/x-python", css: "text/css", json: "application/json",
            svg: "image/svg+xml", md: "text/markdown", txt: "text/plain"
        };
        return map[ext] || "text/plain";
    }

    // Show the code without the ``` fence markers while streaming
    function stripFenceDisplay(raw) {
        let s = raw;
        const open = s.match(/^```[a-z0-9+#]*[ \t]*\r?\n/i);
        if (open) s = s.slice(open[0].length);
        s = s.replace(/```\s*$/i, "");
        return s;
    }

    // ── intent classifier: the ONE reasoning step before any path is chosen ──
    async function classify(text) {
        if (!engine) return "answer";
        try {
            const raw = await llmText([
                { role: "system", content:
`Classify the user request. Reply with ONE word:
build  = they want you to WRITE a file, tool, page, app, or code
use    = they want you to USE one of your tools to do something for them
answer = they want information, a chat reply, or an explanation
Topic words like "image", "upscale", "document" appear in BOTH use and build requests.
Judge by the verb and object, not the topic.
Examples:
"upscale my photo" -> use
"write an upscaler tool" -> build
"what is upscaling" -> answer
"make me a website" -> build
"read this page https://..." -> use
"hi" -> answer` },
                { role: "user", content: String(text).slice(0, 800) }
            ], 5, 0, () => false);
            const word = raw.trim().toLowerCase().replace(/[^a-z]/g, "");
            if (word.startsWith("build")) return "build";
            if (word.startsWith("use")) return "use";
            return "answer";
        } catch (_) { return "answer"; }
    }

    // ── code path: STREAM a complete file into a live editor ──
    async function codeRoute(text, targetChat) {
        let stopped = false;
        currentGenInterrupt = () => { stopped = true; };

        const status = createClaudeBlock(targetChat);
        addNote(status, "Reasoned: build → I will write a file for you, not use an image tool.");
        addNote(status, "Streaming the code below — watch it appear ↓");
        setStatus(status, "Streaming…");

        const ext0 = guessExt(text);
        const live = renderLiveCode("Generating " + ext0 + " file…", targetChat);
        if (!live) {
            bub("(Chat switched — build cancelled.)", "s", false, targetChat);
            setStatus(status, "Cancelled", true);
            currentGenInterrupt = null;
            return true;
        }

        const t0 = performance.now();
        let raw = "";
        const setChar = (txt, cls) => {
            const c = live.badge.querySelector(".live-char");
            if (c) c.textContent = txt;
            const d = live.badge.querySelector(".live-dot");
            if (d && cls !== undefined) d.className = "live-dot" + (cls ? " " + cls : "");
        };

        try {
            const hist = targetChat.msgs.slice(-4).filter(m => m.c !== "s")
                .map(m => ({ role: m.c === "u" ? "user" : "assistant", content: m.t }));

            const stream = await engine.chat.completions.create({
                stream: true,
                temperature: 0.2,
                max_tokens: 2200,
                messages: [
                    { role: "system", content:
                      "You write complete, working, self-contained files. Reply with exactly ONE fenced code block:\n" +
                      "```<extension>\n<full file content>\n```\n" +
                      "Rules: no commentary, no placeholders, no ellipses, no '...'. If the user asks for a tool, page or app, " +
                      "produce a single .html file with inline CSS and JS that actually runs when opened. Complete code only." },
                    ...hist,
                    { role: "user", content: text }
                ]
            });

            // ── the live part ──
            let lastPaint = 0, lastLen = 0;
            for await (const chunk of stream) {
                if (stopped) break;
                const delta = chunk.choices?.[0]?.delta?.content || "";
                if (!delta) continue;
                raw += delta;
                const now = performance.now();
                const grew = raw.length - lastLen >= 8;
                if (grew || delta.includes("\n") || now - lastPaint > 55) {
                    const shown = stripFenceDisplay(raw);
                    live.ta.value = shown;
                    live.ta.scrollTop = live.ta.scrollHeight;
                    setChar(raw.length + " chars · streaming…");
                    lastPaint = now;
                    lastLen = raw.length;
                    if (delta.includes("\n")) autoscroll();
                }
            }

            // ── finalise ──
            const secs = ((performance.now() - t0) / 1000).toFixed(1);

            if (stopped) {
                setChar(raw.length + " chars · stopped", "err");
                addResultRow(status, "Interrupted — partial code kept in the editor above.");
                setStatus(status, "Stopped", true);
                currentGenInterrupt = null;
                return true;
            }

            const fence = raw.match(/```([a-z0-9+#]*)[ \t]*\r?\n([\s\S]*?)```/i);
            const ext = (fence && fence[1] ? fence[1] : ext0).toLowerCase().replace(/[^a-z0-9]/g, "") || "html";
            const clean = (fence ? fence[2] : stripFenceDisplay(raw)).trim();

            live.ta.value = clean;

            const titleM = clean.match(/<title>([^<]{1,60})<\/title>/i);
            const stem = (titleM ? titleM[1] : text.slice(0, 32)).toLowerCase()
                .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "file";
            const filename = stem + "." + ext;
            live.ttl.textContent = filename;
            setChar(clean.length + " chars · ready · " + secs + "s", "done");
            attachLiveCodeActions(live, filename);

            if (clean.length >= 40) {
                const out = await aiTools.runTool("create_files", { files: [{ filename, content: clean }] });
                if (out.files && out.files.length) renderToolDownloads(out.files, targetChat);
                addResultRow(status, "Finished " + filename + " · " + clean.length + " chars · " + secs + "s");
                bub("Here's " + filename + ". You can edit it in the card, then download and open it.", "a", false, targetChat);
                setStatus(status, "Done · " + secs + "s", true);
            } else {
                addResultRow(status, "Only " + clean.length + " chars produced — too short to be a real file.");
                bub("That came out too short to be useful. Switch to Qwen 3.5 4B for larger code, or ask again.", "s", false, targetChat);
                setStatus(status, "Too short", true);
            }
        } catch (e) {
            setChar("error", "err");
            setStatus(status, "Build failed", true);
            bub("Could not write the file: " + (e.message || e), "s", false, targetChat);
        }
        currentGenInterrupt = null;
        return true;
    }

    // ── turn a tool result into a human sentence, not a JSON dump ──
    async function serve(originalText, toolResult, targetChat) {
        try {
            const reply = await llmText([
                { role: "system", content:
                  "You just used a tool to serve the user. Reply as Yacob in one or two sentences: " +
                  "what you did for them, and what they can do next. " +
                  "Do NOT say 'the tool returned' or dump JSON. Speak to them like a person." },
                { role: "user", content:
                  "User asked: " + originalText + "\n" +
                  "Tool result: " + JSON.stringify(toolResult).slice(0, 1200) }
            ], 160, 0.5, () => false);
            bub(reply || "Done.", "a", false, targetChat);
        } catch (_) {
            bub("Done.", "a", false, targetChat);
        }
    }

    // ── the ONLY routing decision: understand first, then choose a path ──
    async function directRoute(text, targetChat, requestFiles = []) {
        const kind = await classify(text);

        if (kind === "build") return codeRoute(text, targetChat);

        if (/^(?:please\s+)?(?:use|run|call)\s+(\w+)/i.test(text))
            return managerRoute(text, targetChat, requestFiles);

        return false;
    }

'''


def main() -> int:
    if not FILE.exists():
        print(f"error: {FILE} not found in {Path.cwd()}", file=sys.stderr)
        return 2

    raw = FILE.read_bytes()
    crlf = b"\r\n" in raw
    src = raw.decode("utf-8").replace("\r\n", "\n")

    if "function renderLiveCode" in src:
        print("[skip] streaming codeRoute already present.")
        return 0

    start = src.find(START)
    end   = src.find(END, start if start != -1 else 0)
    if start == -1 or end == -1:
        print("error: could not find the classify/codeRoute block.", file=sys.stderr)
        print("       expected markers:")
        print("       START:", START[:60] + "…")
        print("       END:  ", END[:60] + "…")
        return 3

    backup = FILE.with_name("index.html.bak2")
    if not backup.exists():
        backup.write_bytes(raw)
        print(f"[backup] wrote {backup}")

    new_src = src[:start] + NEW_BLOCK + src[end:]
    out = new_src.replace("\n", "\r\n") if crlf else new_src
    FILE.write_bytes(out.encode("utf-8"))

    checks = [
        ("renderLiveCode",     "function renderLiveCode"),
        ("streaming loop",     "for await (const chunk of stream)"),
        ("live editor styling","live-editor"),
        ("copy/download",      "attachLiveCodeActions"),
        ("stripFenceDisplay",  "function stripFenceDisplay"),
        ("classify",           "async function classify"),
        ("serve",              "async function serve"),
    ]
    print(f"[ok] rewrote codeRoute with live streaming\n")
    print("Verification:")
    ok = True
    for label, needle in checks:
        p = needle in new_src
        print(f"  [{'YES' if p else 'NO '}] {label}")
        ok = ok and p
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())