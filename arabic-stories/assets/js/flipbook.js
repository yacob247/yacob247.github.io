/* ═══════
   📚 مكتبة الحكايات العربية — الملف البرمجي الموحّد (template)
   ═══════
   1) محرّك القلّابة ثلاثي الأبعاد (قلب الصفحات)
   2) تصفية رفّ المكتبة حسب الفئة العمرية + البحث
   3) تحويل الأرقام إلى أرقام عربية مشرقية (١ ٢ ٣)
   4) فتح نافذة الطباعة تلقائياً عند فتح الرابط وإنهائه بـ #pdf
   ═══════ */
(function () {
  "use strict";

  /* ── أدوات عامة ─────────────────────────── */
  function arNum(n) {
    try { return n.toLocaleString("ar-EG"); } catch (e) { return String(n); }
  }

  /* ── 1) محرّك القلّابة ──────────────────── */
  var book = document.getElementById("book");
  if (book) {
    var leaves = Array.prototype.slice.call(book.querySelectorAll(".leaf"));
    var total = leaves.length * 2;
    var idx = 0; /* عدد الصفحات المقلوبة */
    var pageInd = document.getElementById("pageInd");
    var progress = document.getElementById("flipProgress");
    var nextBtn = document.getElementById("nextBtn");
    var prevBtn = document.getElementById("prevBtn");

    function setZ() {
      leaves.forEach(function (leaf, i) {
        leaf.classList.toggle("turned", i < idx);
        /* الصفحات غير المقلوبة (جهة اليمين): الأقرب للأعلى z أكبر */
        leaf.style.zIndex = i < idx ? (i + 1) : (500 + (leaves.length - i));
        leaf.style.pointerEvents = (i === idx || i === idx - 1) ? "auto" : "none";
      });
    }

    function render() {
      setZ();
      var right = idx < leaves.length ? 1 + idx * 2 : 0;   /* صفحة اليمين (1-based) */
      var left = idx > 0 ? idx * 2 : 0;                     /* صفحة اليسار (1-based) */
      var txt = "الغلاف";
      if (right > 1 && left > 0) txt = arNum(left) + "–" + arNum(right);
      else if (right > 1) txt = arNum(right);
      if (idx === leaves.length) txt = "النهاية";
      if (pageInd) pageInd.textContent = txt + " / " + arNum(total);
      if (progress) progress.style.width = Math.round((idx / leaves.length) * 100) + "%";
      if (nextBtn) nextBtn.disabled = idx >= leaves.length;
      if (prevBtn) prevBtn.disabled = idx <= 0;
    }

    function turn(dir) {
      idx = Math.max(0, Math.min(leaves.length, idx + dir));
      render();
    }

    if (nextBtn) nextBtn.addEventListener("click", function () { turn(1); });
    if (prevBtn) prevBtn.addEventListener("click", function () { turn(-1); });
    document.addEventListener("keydown", function (e) {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); turn(1); }   /* قلب نحو اليسار (عربي) */
      if (e.key === "ArrowRight") { e.preventDefault(); turn(-1); }
      if (e.key === " ") { e.preventDefault(); turn(1); }
    });

    /* النقر على يمين/يسار الكتاب */
    if (book) book.addEventListener("click", function (e) {
      var r = book.getBoundingClientRect();
      var x = e.clientX - r.left;
      if (x < r.width * 0.42) turn(-1); else if (x > r.width * 0.58) turn(1);
    });

    /* السحب باللمس */
    var sx = null;
    book.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    book.addEventListener("touchend", function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (dx > 45) turn(-1); else if (dx < -45) turn(1);
      sx = null;
    }, { passive: true });

    render();
  }

  /* ── 4) تحميل PDF فوراً عند #pdf ────────── */
  if (location.hash === "#pdf") {
    setTimeout(function () { window.print(); }, 700);
  }
})();
/* ── 2) تصفية الرف + البحث (نطاق مستقل) ───────── */
(function () {
  "use strict";
  function arNum(n) {
    try { return n.toLocaleString("ar-EG"); } catch (e) { return String(n); }
  }
  var filterBtns = Array.prototype.slice.call(document.querySelectorAll("[data-filter]"));
  if (filterBtns.length) {
    var cards = Array.prototype.slice.call(document.querySelectorAll("[data-age]"));
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
      if (countEl) countEl.textContent = arNum(n) + " من " + arNum(30) + " قصة";
    }

    filterBtns.forEach(function (b) {
      b.addEventListener("click", function () { apply(b.getAttribute("data-filter")); });
    });

    var search = document.getElementById("searchBox");
    if (search) {
      search.addEventListener("input", function () {
        var q = search.value.trim();
        cards.forEach(function (card) {
          var t = (card.getAttribute("data-title") || "") + card.textContent;
          card.classList.toggle("hidden", q !== "" && t.indexOf(q) === -1);
        });
      });
    }
    apply("all");
  }
})();
