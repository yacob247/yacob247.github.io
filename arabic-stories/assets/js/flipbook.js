/* ═══════════════════════════════════════════════════════════════
   📚 مكتبة الحكايات العربية — محرّك القلّابة (Fliphtml5-style engine)
   ===============================================================
   يعمل على كل كتب books/*.html (هيكل .book / .leaf / .face) دون تعديلها.
   يضيف تلقائياً شريط أدوات: فهرس صور مصغّرة، بحث، تكبير/تصغير،
   ملء الشاشة، قراءة صوتية (TTS)، تحميل PDF. مع سحب بزخم وظلال قلب.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* الأرقام العربية المشرقية */
  function arNum(n) {
    try { return n.toLocaleString("ar-EG"); } catch (e) { return String(n); }
  }
  window.arNum = arNum;

  /* ══════════ محرّك القلّابة ══════════ */
  var book = document.getElementById("book");
  if (book) {
    var leaves = Array.prototype.slice.call(book.querySelectorAll(".leaf"));
    var total = leaves.length * 2;
    var idx = 0;
    var pageInd = document.getElementById("pageInd");
    var progress = document.getElementById("flipProgress");
    var nextBtn = document.getElementById("nextBtn");
    var prevBtn = document.getElementById("prevBtn");
    var stage = book.closest(".book-stage") || book.parentElement;
    function setAllPageInd(txt) {
      var all = document.querySelectorAll("#pageInd");
      for (var a = 0; a < all.length; a++) all[a].textContent = txt;
    }


    /* حقن شريط الأدوات إن لم يوجد */
    if (!document.getElementById("fbBar")) {
      var bar = document.createElement("div");
      bar.className = "fb-bar";
      bar.innerHTML =
        '<button class="fb-btn" data-fb="back" title="الرئيسية">🏠</button>' +
        '<button class="fb-btn" data-fb="thumbs" title="الفهرس">🗂</button>' +
        '<button class="fb-btn" data-fb="zoomout" title="تصغير">➖</button>' +
        '<button class="fb-btn" data-fb="zoomin" title="تكبير">➕</button>' +
        '<button class="fb-btn" data-fb="full" title="ملء الشاشة">⛶</button>' +
        '<button class="fb-btn" data-fb="tts" title="اقرأ بصوت">🔉</button>' +
        '<button class="fb-btn" data-fb="print" title="تحميل PDF">⬇</button>' +
        '<input class="fb-search" type="search" data-fb="search" placeholder="بحث…" aria-label="بحث">' +
        '<span class="page-ind" id="pageInd">١ / ' + arNum(total) + '</span>';
      if (stage) stage.before(bar); else book.parentNode.insertBefore(bar, book);
    }

    /* لوحة الفهرست/الصور المصغّرة */
    var panels = document.getElementById("fbPanels");
    if (!panels) {
      panels = document.createElement("div");
      panels.id = "fbPanels";
      panels.className = "fb-panels";
      panels.innerHTML = '<div class="fb-thumbs" id="fbThumbs"></div><div class="fb-searchbox" id="fbSearchbox"></div>';
      if (stage) stage.before(panels); else book.parentNode.insertBefore(panels, book);
    }
    var thumbsBox = document.getElementById("fbThumbs");
    var searchBoxEl = document.getElementById("fbSearchbox");

    var turnShadow = document.createElement("div");
    turnShadow.className = "fb-turnshadow";
    book.appendChild(turnShadow);

    function setZ() {
      leaves.forEach(function (leaf, i) {
        leaf.classList.toggle("turned", i < idx);
        leaf.style.zIndex = i < idx ? (i + 1) : (500 + (leaves.length - i));
        leaf.style.pointerEvents = (i === idx || i === idx - 1) ? "auto" : "none";
      });
    }
    function render() {
      setZ();
      turnShadow.style.opacity = 0;
      var right = idx < leaves.length ? 1 + idx * 2 : 0;
      var left = idx > 0 ? idx * 2 : 0;
      var txt = "الغلاف";
      if (right > 1 && left > 0) txt = arNum(left) + "–" + arNum(right);
      else if (right > 1) txt = arNum(right);
      if (idx === leaves.length) txt = "النهاية";
      setAllPageInd(txt + " / " + arNum(total));
      if (progress) progress.style.width = Math.round((idx / leaves.length) * 100) + "%";
      if (nextBtn) nextBtn.disabled = idx >= leaves.length;
      if (prevBtn) prevBtn.disabled = idx <= 0;
      markThumbs();
    }
    function turn(dir, animate) {
      idx = Math.max(0, Math.min(leaves.length, idx + dir));
      if (animate !== false) {
        turnShadow.style.opacity = 1;
        setTimeout(function () { turnShadow.style.opacity = 0; }, 250);
        var leaf = leaves[idx + (dir > 0 ? -1 : 0)];
        if (leaf) leaf.classList.remove("anim");
        void leaf && leaf.offsetWidth;
        if (leaf) leaf.classList.add("anim");
      }
      render();
    }

    /* الأزرار القديمة + الجديدة في الشريط */
    if (nextBtn) nextBtn.addEventListener("click", function () { turn(1); });
    if (prevBtn) prevBtn.addEventListener("click", function () { turn(-1); });

    /* النقر على طرفي الكتاب (عربي) */
    if (book) book.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest(".fb-thumbs")) return;
      var r = book.getBoundingClientRect();
      var x = e.clientX - r.left;
      if (x < r.width * 0.42) turn(-1); else if (x > r.width * 0.58) turn(1);
    });

    /* سحب بالماوس/اللمس مع زخم */
    var dragging = false, startX = 0, startIdx = idx, vel = 0, lastX = 0, lastT = 0;
    function down(e) {
      var pt = e.touches ? e.touches[0] : e;
      dragging = true; startX = pt.clientX; lastX = pt.clientX; lastT = Date.now();
      startIdx = idx; vel = 0;
    }
    function move(e) {
      if (!dragging) return;
      var pt = e.touches ? e.touches[0] : e;
      var now = Date.now(), dt = Math.max(1, now - lastT);
      vel = (pt.clientX - lastX) / dt;
      lastX = pt.clientX; lastT = now;
      e.preventDefault();
    }
    function up(e) {
      if (!dragging) return;
      dragging = false;
      var dx = lastX - startX;
      if (Math.abs(dx) > 60 || Math.abs(vel) > 0.5) {
        if (dx > 60 || vel > 0.5) turn(-1); else turn(1);
      }
    }
    if (window.PointerEvent) {
      book.addEventListener("pointerdown", down);
      book.addEventListener("pointermove", move);
      book.addEventListener("pointerup", up);
      book.addEventListener("pointerleave", function () { dragging = false; });
    } else {
      book.addEventListener("touchstart", down, { passive: false });
      book.addEventListener("touchmove", move, { passive: false });
      book.addEventListener("touchend", up);
    }

    document.addEventListener("keydown", function (e) {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); turn(1); }
      if (e.key === "ArrowRight") { e.preventDefault(); turn(-1); }
      if (e.key === " ") { e.preventDefault(); turn(1); }
    });

    /* ── الفهرس: صور مصغّرة لكل وجه ── */
    var faces = [];
    leaves.forEach(function (leaf, i) {
      Array.prototype.slice.call(leaf.children).forEach(function (face) {
        faces.push({ leaf: leaf, face: face, gi: i });
      });
    });
    function markThumbs() {
      var all = thumbsBox ? thumbsBox.children : [];
      for (var j = 0; j < all.length; j++) all[j].classList.toggle("on", false);
    }
    function buildThumbs() {
      if (!thumbsBox) return;
      thumbsBox.innerHTML = "";
      faces.forEach(function (f, n) {
        var t = document.createElement("button");
        t.className = "fb-thumb";
        t.innerHTML = '<span class="n">' + arNum(n + 1) + "</span><div class='mini'>" +
          (f.face.querySelector(".cover") ? f.face.querySelector(".cover").innerHTML :
           f.face.querySelector(".story-page") ? f.face.querySelector(".story-page h2").innerHTML : "")
          + "</div>";
        t.addEventListener("click", function () {
          idx = f.gi; render();
          if (thumbsBox.closest(".open")) document.getElementById("fbPanels").classList.remove("open");
        });
        t.querySelectorAll(".cover,.story-page").forEach(function (el) { el.classList.add("render"); });
        thumbsBox.appendChild(t);
      });
    }
    if (thumbsBox) buildThumbs();

    /* ── البحث داخل النص ── */
    var storyHeads = [];
    faces.forEach(function (f) {
      Array.prototype.slice.call(f.face.querySelectorAll(".story-page h2,.story-page p,.cover h1,.endpage p"))
        .forEach(function (el) {
          var html = el.innerHTML;
          storyHeads.push({ g: f.gi, el: el, html: html });
        });
    });
    function doSearch(q) {
      if (!searchBoxEl) return;
      searchBoxEl.innerHTML = "";
      if (!q) return;
      q = q.trim();
      var hits = storyHeads.filter(function (h) { return h.html.indexOf(q) !== -1; });
      if (!hits.length) { searchBoxEl.innerHTML = "<p style='padding:10px;color:#777;'>لا نتائج</p>"; return; }
      hits.slice(0, 20).forEach(function (h) {
        var b = document.createElement("button");
        b.textContent = (h.el.tagName === "H2" ? "" : "… ") + h.html.slice(0, 44);
        b.addEventListener("click", function () {
          idx = h.g; render();
          document.getElementById("fbPanels").classList.remove("open");
        });
        searchBoxEl.appendChild(b);
      });
    }

    /* ── أزرار الشريط ── */
    bar.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-fb]");
      if (!btn) return;
      var act = btn.getAttribute("data-fb");
      if (act === "back") { location.href = btn.classList.contains("no-bar") ? "#story-start" : "../index.html"; }
      if (act === "thumbs") {
        panels.classList.toggle("open");
        if (panels.classList.contains("open") && searchBoxEl.value) panels.classList.remove("open");
      }
      if (act === "zoomin" || act === "zoomout") {
        zoom = Math.max(0.5, Math.min(2.2, zoom + (act === "zoomin" ? 0.2 : -0.2)));
        book.style.transform = "scale(" + zoom + ")";
        book.style.transformOrigin = "center top";
      }
      if (act === "full") {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (stage.requestFullscreen) stage.requestFullscreen();
        else if (book.requestFullscreen) book.requestFullscreen();
      }
      if (act === "print") { window.print(); }
      if (act === "tts") {
        if (window.speechSynthesis && window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); btn.title = "اقرأ بصوت"; return; }
        var txt = book.innerText.replace(/\s+/g, " ").trim();
        var u = new SpeechSynthesisUtterance(txt);
        u.lang = "ar-SA"; u.rate = 0.95;
        window.speechSynthesis.speak(u);
        u.onend = function () { btn.title = "اقرأ بصوت"; };
        btn.title = "إيقاف القراءة";
      }
    });
    var sInput = bar.querySelector("[data-fb=search]");
    if (sInput) sInput.addEventListener("input", function () {
      panels.classList.add("open");
      doSearch(this.value);
    });

    var zoom = 1;
    render();
  }

  /* ══════════ فتح PDF مباشرة عند #pdf ══════════ */
  if (location.hash === "#pdf") {
    setTimeout(function () { window.print(); }, 700);
  }

  /* ══════════ تصفية الرف + العدادات (توافق قديم) ══════════ */
  var filterBtns = Array.prototype.slice.call(document.querySelectorAll("[data-filter]"));
  var cards = Array.prototype.slice.call(document.querySelectorAll(".card"));
  if (filterBtns.length && cards.length) {
    var countEl = document.getElementById("storyCount");
    function apply(f) {
      var n = 0;
      cards.forEach(function (card) {
        var show = f === "all" || card.getAttribute("data-age") === f;
        card.classList.toggle("hidden", !show);
        if (show) n++;
      });
      filterBtns.forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-filter") === f);
      });
      if (countEl) countEl.textContent = arNum(n) + " من " + arNum(cards.length) + " قصة";
    }
    filterBtns.forEach(function (b) {
      b.addEventListener("click", function () { apply(b.getAttribute("data-filter")); });
    });
    var searchBox = document.getElementById("searchBox");
    if (searchBox) {
      searchBox.addEventListener("input", function () {
        var q = searchBox.value.trim();
        cards.forEach(function (card) {
          var t = (card.getAttribute("data-title") || "") + card.textContent;
          card.classList.toggle("hidden", q !== "" && t.indexOf(q) === -1);
        });
      });
    }
    apply("all");
  }

  /* ══════════ قارئ ShortStories (توافق قديم) ══════════ */
  var modal = document.getElementById("readerModal");
  if (modal) {
    (function () {
      var mcard = Array.prototype.slice.call(document.querySelectorAll(".card"));
      var t = document.getElementById("readerTitle"), a = document.getElementById("readerAuthor");
      var age = document.getElementById("readerAge"), head = document.getElementById("readerHeading");
      var tx = document.getElementById("readerText"), q = document.getElementById("readerQuote");
      var pg = document.getElementById("readerPage"), pr = document.getElementById("readerProgress");
      var step = 1, cur = null;
      function esc(s) { return (s || "").replace(/\s+/g, " ").trim(); }
      function upd() { pg.textContent = step.toLocaleString("ar-EG") + " / ٦"; pr.style.width = (step * 16.66) + "%"; }
      function open(card) {
        cur = card; step = 1;
        var c = card.querySelector(".mini-cover"), h = c.querySelector("h3"), sub = c.querySelector(".sub");
        t.textContent = esc(h.textContent); a.textContent = esc(sub.textContent);
        age.textContent = esc(c.querySelector(".cover-badge").textContent);
        head.textContent = "مدخل إلى الحكاية";
        tx.textContent = esc(card.querySelector(":scope > p").textContent);
        q.textContent = "القراءة الجيدة لا تنهي الحكاية، بل تفتح فيها سؤالاً جديداً.";
        modal.classList.add("open"); modal.setAttribute("aria-hidden", "false"); upd();
        document.getElementById("readerClose").focus();
      }
      mcard.forEach(function (card) {
        if (!card.querySelector(".card-actions a")) return;
        card.querySelectorAll(".card-actions a").forEach(function (link) {
          link.addEventListener("click", function (e) { e.preventDefault(); open(card); });
        });
      });
      function close() { modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true"); }
      document.getElementById("readerClose").addEventListener("click", close);
      document.getElementById("readerNext").addEventListener("click", function () { step = Math.min(6, step + 1); upd(); });
      document.getElementById("readerPrev").addEventListener("click", function () { step = Math.max(1, step - 1); upd(); });
      document.getElementById("readerPrint").addEventListener("click", function () { window.print(); });
      modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
    })();
  }
})();
