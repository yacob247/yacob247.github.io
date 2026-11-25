/* ==== ShortStories immersive reader (v2) — full story text per book ==== */
(function () {
  "use strict";
  if (!window.SS_DATA) {
    console.warn("SS reader: data not loaded");
    return;
  }
  var modal = document.getElementById("readerModal");
  if (!modal || !window.SS_READER_BOOT) SS_READER_BOOT = null;
  var els = {};
  function id(x) { els[x] = document.getElementById(x); }
  id("readerClose"); id("readerPage"); id("readerTitle"); id("readerAuthor");
  id("readerAge"); id("readerHeading"); id("readerText"); id("readerQuote");
  id("readerNext"); id("readerPrev"); id("readerProgress"); id("readerPrint");
  var cur = null, chapter = 0;

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function pageLabel() {
    var total = cur ? cur.pages.length + 2 : 6;
    if (chapter === 0) return "الغلاف / " + total;
    if (chapter > cur.pages.length) return "النهاية / " + total;
    return chapter + " / " + total;
  }

  function render() {
    if (!cur) return;
    els.readerTitle.textContent = cur.t;
    els.readerAuthor.textContent = cur.sub;
    els.readerAge.textContent = cur.cat;
    var total = cur.pages.length + 2;
    var pct = (chapter / (total - 1)) * 100;
    els.readerProgress.style.width = minmax(pct, 4, 100) + "%";
    els.readerPage.textContent = pageLabel();
    if (chapter === 0) {
      els.readerHeading.textContent = "عن هذه الحكاية";
      els.readerText.textContent = cur.desc || "";
      els.readerQuote.textContent = cur.moral ? "العبرة — " + cur.moral : "كل حكاية نافذة إلى قلب آخر.";
    } else if (chapter > cur.pages.length) {
      els.readerHeading.textContent = "نهاية القصة";
      els.readerText.textContent = cur.end || "";
      els.readerQuote.textContent = cur.moral ? "العبرة — " + cur.moral : "وتبقى الحكاية معك.";
    } else {
      var pg = cur.pages[chapter - 1];
      els.readerHeading.textContent = pg[0];
      els.readerText.innerHTML = pg[1].map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
      els.readerQuote.textContent = "";
    }
    els.readerNext.disabled = chapter >= total - 1;
    els.readerPrev.disabled = chapter <= 0;
  }

  function minmax(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function open(slug) {
    cur = window.SS_DATA[slug];
    if (!cur) return;
    chapter = 0;
    render();
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    if (els.readerClose) els.readerClose.focus();
  }

  function close() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[data-story]") : null;
    if (!a) return;
    e.preventDefault();
    open(a.getAttribute("data-story"));
  });

  if (els.readerClose) els.readerClose.addEventListener("click", close);
  if (els.readerNext) els.readerNext.addEventListener("click", function () { if (cur && chapter < cur.pages.length + 1) { chapter++; render(); } });
  if (els.readerPrev) els.readerPrev.addEventListener("click", function () { if (cur && chapter > 0) { chapter--; render(); } });
  if (els.readerPrint) els.readerPrint.addEventListener("click", function () { window.print(); });
  if (modal) modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
  document.addEventListener("keydown", function (e) {
    if (!modal.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") { if (els.readerNext && !els.readerNext.disabled) els.readerNext.click(); }
    if (e.key === "ArrowRight") { if (els.readerPrev && !els.readerPrev.disabled) els.readerPrev.click(); }
  });
})();
