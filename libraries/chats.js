/* chats.js — saves every chat (messages, uploaded files, images, code, your follow-up comments)
   in this browser and exports them as organised JSON / JSONL. No learning, just saving. */
(() => {
  const ST = "chats";
  const open = () => new Promise((res, rej) => { const r = indexedDB.open("chatstore", 1); r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: "id" }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = async (mode, f) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction(ST, mode); const q = f(t.objectStore(ST)); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  const put = c => tx("readwrite", s => s.put(c)).catch(e => console.warn("save:", e));
  const del = id => tx("readwrite", s => s.delete(id)).catch(() => {});
  const all = () => tx("readonly", s => s.getAll()).then(a => a || []).catch(() => []);

  const uid = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const now = () => new Date().toISOString();
  const blank = () => ({ id: uid(), title: "New chat", created: now(), updated: now(), files: [], messages: [] });
  let cur = blank(), pending = null;

  /* ---------- turning attachments into saveable records ---------- */
  const IMG = /^(png|jpe?g|gif|webp|bmp|svg|avif)$/i;
  const kindOf = f => f.img ? "image" : f.ext === "pdf" ? "pdf" : "text";
  async function shrink(url) {                          // images are stored as ≤1600px JPEG/PNG data URLs
    const blob = await (await fetch(url)).blob();
    try {
      const bmp = await createImageBitmap(blob), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      return { data_url: c.toDataURL(blob.type === "image/png" ? "image/png" : "image/jpeg", 0.88), width: c.width, height: c.height };
    } catch (_) { return { data_url: await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); }) }; }
  }
  async function snapshot(list) {
    const out = [];
    for (const f of list) {
      const rec = { name: f.name, ext: f.ext || "", kind: kindOf(f), language: f.ext || "", size: f.size || 0 };
      if (f.img) { try { Object.assign(rec, await shrink(f.img)); } catch (_) {} }
      if (f.text) { rec.text = f.text; rec.ocr = !!f.ocr; }
      out.push(rec);
    }
    return out;
  }
  const fileKey = r => r.name + "|" + (r.text ? r.text.length + r.text.slice(0, 60) : (r.data_url || "").length);
  function registerFiles(chat, recs) {                  // each distinct file is stored once per chat
    return recs.map(r => {
      const k = fileKey(r); let hit = chat.files.find(x => x._k === k);
      if (!hit) { hit = { id: "f" + (chat.files.length + 1), _k: k, ...r, first_seen_message: chat.messages.length + 1 }; chat.files.push(hit); }
      return hit.id;
    });
  }

  /* ---------- hooks called by index.html ---------- */
  function begin(text, files, before) {
    const last = cur.messages[cur.messages.length - 1];
    if (last && last.role === "assistant" && last.user_feedback == null) last.user_feedback = text;   // your next message = your comment on the previous reply
    pending = { text, before: before || "", time: now(), filesP: snapshot(files) };
  }
  async function end(box, code) {
    if (!pending) return;
    const p = pending; pending = null;
    const files = await p.filesP, ids = registerFiles(cur, files);
    const t = box.querySelector(".t"), reply = t ? t.textContent : "", isErr = !!(t && t.classList.contains("e"));
    const hasImg = files.some(f => f.kind === "image");
    const category = hasImg ? "image" : code ? "code" : files.length ? "file" : "chat";
    const language = (code && code.lang) || (files.find(f => f.ext) || {}).ext || "";
    const n = cur.messages.length + 1;
    cur.messages.push({ n, role: "user", time: p.time, category, language, text: p.text, file_ids: ids, edited_code_before: p.before || undefined });
    cur.messages.push({ n: n + 1, role: "assistant", time: now(), category, language, text: reply, error: isErr || undefined,
      code: code ? { language: code.lang, filename: code.name, content: code.code } : undefined, user_feedback: null });
    if (cur.title === "New chat") cur.title = p.text.replace(/\s+/g, " ").slice(0, 60);
    cur.updated = now();
    await put(strip(cur)); refresh();
  }
  const strip = c => JSON.parse(JSON.stringify(c));

  /* ---------- organised export ---------- */
  function build(chats) {
    const cat = { code: {}, image: [], file: [], chat: [] }, langs = {}, files = [];
    let msgs = 0;
    for (const c of chats) {
      c.messages.forEach(m => {
        msgs++;
        if (m.role !== "user") return;
        const ref = { chat_id: c.id, chat_title: c.title, message: m.n, language: m.language || undefined };
        if (m.category === "code") (cat.code[m.language || "other"] = cat.code[m.language || "other"] || []).push(ref);
        else cat[m.category].push(ref);
        if (m.language) langs[m.language] = (langs[m.language] || 0) + 1;
      });
      c.files.forEach(f => { const { _k, ...rest } = f; files.push({ chat_id: c.id, ...rest }); });
    }
    const filesBy = k => files.filter(f => f.kind === k).length;
    return {
      format: "ai-chat-export", version: 1, exported_at: now(),
      summary: { chats: chats.length, messages: msgs, files: files.length, images: filesBy("image"), text_files: filesBy("text"), pdfs: filesBy("pdf"),
        messages_by_category: { code: Object.values(cat.code).reduce((a, b) => a + b.length, 0), image: cat.image.length, file: cat.file.length, chat: cat.chat.length }, languages: langs },
      categories: cat,
      files,
      chats: chats.map(c => { const { files: _f, ...rest } = c; return { ...rest, file_ids: c.files.map(f => f.id) }; })
    };
  }
  function lines(chats) {                               // one training example per line: user → assistant
    const out = [];
    for (const c of chats) for (let i = 0; i < c.messages.length - 1; i++) {
      const u = c.messages[i], a = c.messages[i + 1];
      if (u.role !== "user" || a.role !== "assistant" || a.error) continue;
      out.push(JSON.stringify({ chat_id: c.id, exchange: (i / 2 | 0) + 1, category: u.category, language: u.language || null,
        messages: [{ role: "user", content: u.text }, { role: "assistant", content: a.text }],
        files: (u.file_ids || []).map(id => { const f = c.files.find(x => x.id === id); if (!f) return null; const { _k, ...r } = f; return r; }).filter(Boolean),
        code: a.code || null, user_feedback: a.user_feedback }));
    }
    return out.join("\n") + (out.length ? "\n" : "");
  }
  const download = (name, text, mime) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  async function everything() { const s = await all(); if (cur.messages.length && !s.find(x => x.id === cur.id)) s.push(strip(cur)); return s.sort((a, b) => a.created < b.created ? -1 : 1); }
  const exportJson = async ids => { const l = (await everything()).filter(c => !ids || ids.includes(c.id)); download("ai-chats-" + stamp() + ".json", JSON.stringify(build(l), null, 2), "application/json"); };
  const exportJsonl = async ids => { const l = (await everything()).filter(c => !ids || ids.includes(c.id)); download("ai-chats-" + stamp() + ".jsonl", lines(l), "application/x-ndjson"); };

  /* ---------- panel ---------- */
  function ui() {
    const css = document.createElement("style");
    css.textContent = "#chbtn{font:12px system-ui;background:var(--pill);border:1px solid var(--line);border-radius:999px;padding:3px 11px;color:var(--text)}#chbtn:hover{background:var(--pillon)}" +
      "#chpanel{display:none;position:fixed;top:44px;left:12px;z-index:50;width:min(380px,calc(100vw - 24px));max-height:72vh;overflow:auto;background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:12px;font:13px system-ui;box-shadow:0 12px 40px #0009}" +
      "#chpanel.on{display:block}#chpanel .row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}#chpanel button{font:12px system-ui;background:var(--pill);border:1px solid var(--line);border-radius:8px;padding:5px 10px;color:var(--text)}#chpanel button:hover{background:var(--pillon)}" +
      "#chpanel .pri{background:var(--accent);color:#191919;border-color:var(--accent);font-weight:600}#chpanel .it{border-top:1px solid var(--line);padding:8px 0}#chpanel .it b{display:block;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#chpanel small{color:var(--mute)}#chpanel .it .row{margin:6px 0 0}";
    document.head.append(css);
    const b = document.createElement("button"); b.id = "chbtn"; b.textContent = "🗂 Chats";
    const sp = document.querySelector("#left .top .sp"); sp.parentNode.insertBefore(b, sp);
    const p = document.createElement("div"); p.id = "chpanel"; document.body.append(p);
    b.onclick = () => { p.classList.toggle("on"); refresh(); };
    p.onclick = async e => {
      const t = e.target.closest("button"); if (!t) return; const a = t.dataset.a, id = t.dataset.id;
      if (a === "new") newChat(); else if (a === "json") exportJson(); else if (a === "jsonl") exportJsonl();
      else if (a === "one-json") exportJson([id]); else if (a === "one-jsonl") exportJsonl([id]);
      else if (a === "open") openChat(id);
      else if (a === "del" && confirm("Delete this saved chat?")) { await del(id); if (cur.id === id) newChat(true); refresh(); }
    };
    refresh();
  }
  async function refresh() {
    const p = document.getElementById("chpanel"); if (!p || !p.classList.contains("on")) return;
    const list = (await everything()).reverse(), esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    p.innerHTML = '<div class="row"><button class="pri" data-a="new">＋ New chat</button><button data-a="json">Export all · JSON</button><button data-a="jsonl">Export all · JSONL</button></div>' +
      (list.length ? list.map(c => '<div class="it"><b>' + esc(c.title) + (c.id === cur.id ? " ·  current" : "") + '</b><small>' + new Date(c.updated).toLocaleString() + " · " + c.messages.length + " messages · " + c.files.length + ' files</small>' +
        '<div class="row"><button data-a="open" data-id="' + c.id + '">Open</button><button data-a="one-json" data-id="' + c.id + '">JSON</button><button data-a="one-jsonl" data-id="' + c.id + '">JSONL</button><button data-a="del" data-id="' + c.id + '">Delete</button></div></div>').join("") : "<small>No saved chats yet. Every message you send is saved automatically.</small>");
  }
  function busy() { return document.body.classList.contains("busy"); }
  function newChat(force) { if (busy() && !force) return; cur = blank(); pending = null; window.__chat && window.__chat.reset(); refresh(); }
  async function openChat(id) {
    if (busy()) return; const c = (await all()).find(x => x.id === id); if (!c) return;
    cur = c; pending = null; window.__chat.reset();
    for (const m of c.messages) m.role === "user" ? window.__chat.show("user", m.text) : window.__chat.show("assistant", m.text, m.code && { lang: m.code.language, name: m.code.filename, code: m.code.content });
    document.getElementById("chpanel").classList.remove("on");
  }

  window.CHATS = { begin, end, newChat, exportJson, exportJsonl, _build: build, _lines: lines };
  if (typeof document !== "undefined") (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", ui) : ui());
})();
