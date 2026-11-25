/* ═══════════════════════════════════════════════════════════════
   🛠 استديو القلّابة — منطق بناء وتنظيم القلّابة (المصنع المنفصل)
   استيراد: نصوص .txt · PDF · شرائح Google · صفحة يدوية
   تنظيم: إضافة/حذف/إعادة ترتيب داخل القلّابة — كل ذلك هنا،
   منفصلاً تماماً عن المتجر وصفحات المنتجات.
   يعمل محلياً: LocalStorage + FileReader + pdf.js (من CDN عن بُعد).
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var STORE_KEY = "arabic-studio-v1";
  var state = { name: "", pages: [] };
  var cur = 0;   /* فهرس الصفحة المعروضة */

  /* ── أدوات ─────────────────────────────────────── */
  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { console.warn("حفظ فشل", e); }
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) { state = JSON.parse(raw); state.pages = state.pages || []; state.name = state.name || ""; }
    } catch (e) { state = { name: "", pages: [] }; }
  }

  /* ── بناء الصفحات ──────────────────────────────── */
  function addPage(pg, saveIt) {
    state.pages.push(pg);
    cur = state.pages.length - 1;
    renderList(); renderPreview();
    if (saveIt !== false) save();
  }

  /* ── استيراد نص .txt ───────────────────────────── */
  function importTxt(file) {
    var r = new FileReader();
    r.onload = function () {
      var text = String(r.result).replace(/\r\n?/g, "\n");
      var paras = text.split(/\n{2,}/).map(function (b) { return b.trim(); }).filter(Boolean);
      var per = Math.max(4, Math.ceil(paras.length / 6)); /* ~6 صفحات */
      for (var i = 0; i < paras.length; i += per) {
        addPage({ id: uid(), type: "text", title: "مقطع " + (i / per + 1), paras: paras.slice(i, i + per) }, false);
      }
      renderList(); renderPreview(); save();
    };
    r.readAsText(file, "UTF-8");
  }

  /* ── تحميل pdf.js عند الحاجة ───────────────────── */
  var PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
  var PDFWORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
  function ensurePdf(cb) {
    if (window.pdfjsLib) { try { pdfjsLib.GlobalWorkerOptions.workerSrc = PDFWORKER; } catch (e) {} return cb(); }
    var s = document.createElement("script");
    s.src = PDFJS_URL;
    s.onload = function () {
      try { pdfjsLib.GlobalWorkerOptions.workerSrc = PDFWORKER; } catch (e) {}
      cb();
    };
    document.head.appendChild(s);
  }

  /* ── استيراد PDF ───────────────────────────────── */
  function importPdf(file) {
    ensurePdf(function () {
      var fr = new FileReader();
      fr.onload = function () {
        var task = pdfjsLib.getDocument({ data: fr.result });
        task.promise.then(function (pdf) {
          var n = 0;
          function nextPage() {
            if (n >= pdf.numPages) { renderList(); renderPreview(); save(); return; }
            n++;
            pdf.getPage(n).then(function (pg) {
              var vp = pg.getViewport({ scale: 2 });
              var canvas = document.createElement("canvas");
              canvas.width = vp.width; canvas.height = vp.height;
              pg.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise.then(function () {
                var url = canvas.toDataURL("image/jpeg", 0.85);
                addPage({ id: uid(), type: "image", title: "صفحة " + n, src: url }, false);
                nextPage();
              });
            });
          }
          nextPage();
        }).catch(function (e) { alert("تعذّر قراءة الـPDF: " + e); });
      };
      fr.readAsArrayBuffer(file);
    });
  }

  /* ── استيراد شرائح Google ──────────────────────── */
  function importSlide(url) {
    url = (url || "").trim();
    if (!/^https:\/\/(docs\.google\.com|drive\.google\.com)\//.test(url) && url.indexOf("/embed") === -1) {
      alert("ألصق رابط «نشر على الويب · تضمين» من جوجل سلایدز (يبدأ بـ https://docs.google.com/presentation/d/e/…/embed)");
      return;
    }
    addPage({ id: uid(), type: "slide", title: "شريحة Google", src: url });
  }

  /* ── إضافة صفحة يدوية ──────────────────────────── */
  function addManual() {
    var t = prompt("عنوان الصفحة:", "صفحة جديدة");
    if (t == null) return;
    var body = prompt("محتويات الصفحة (كل سطر فقرة):", "");
    if (body == null) return;
    var paras = String(body).split(/\n+/).map(function (p) { return p.trim(); }).filter(Boolean);
    if (!paras.length) paras = [""];
    addPage({ id: uid(), type: "text", title: t || "صفحة جديدة", paras: paras });
  }

  /* ── عرض قائمة الصفحات ─────────────────────────── */
  function thumbHTML(pg) {
    if (pg.type === "image") return '<img src="' + esc(pg.src) + '" alt="">';
    if (pg.type === "slide") return '<span style="font-size:1.6rem;">📽️</span>';
    return '<span style="font-size:1.6rem;">📄</span>';
  }
  function renderList() {
    var list = $("stList");
    list.innerHTML = "";
    document.getElementById("stCount").textContent = state.pages.length + " صفحة";
    state.pages.forEach(function (pg, i) {
      var li = document.createElement("li");
      li.className = "st-item" + (i === cur ? " cur" : "");
      li.draggable = true;
      li.innerHTML =
        '<div class="thumb">' + thumbHTML(pg) + '</div>' +
        '<div class="meta"><div class="tt">' + esc(pg.title) + '</div><small>أمر ' + (i + 1) + '</small></div>' +
        '<div class="ops">' +
          '<button class="st-op up" title="أعلى">▲</button>' +
          '<button class="st-op down" title="أسفل">▼</button>' +
          '<button class="st-op del" title="حذف">🗑</button>' +
        '</div>';
      li.addEventListener("click", function (e) {
        if (e.target.closest(".ops")) return;
        cur = i; markCur(); renderPreview();
      });
      li.querySelector(".up").addEventListener("click", function (e) { e.stopPropagation(); move(i, -1); });
      li.querySelector(".down").addEventListener("click", function (e) { e.stopPropagation(); move(i, 1); });
      li.querySelector(".del").addEventListener("click", function (e) { e.stopPropagation(); del(i); });
      li.addEventListener("dragstart", function () { dragFrom = i; li.classList.add("dragging"); });
      li.addEventListener("dragend", function () { li.classList.remove("dragging"); list.querySelectorAll(".drop-above").forEach(function (x) { x.classList.remove("drop-above"); }); });
      li.addEventListener("dragover", function (e) { e.preventDefault(); li.classList.add("drop-above"); });
      li.addEventListener("dragleave", function () { li.classList.remove("drop-above"); });
      li.addEventListener("drop", function (e) {
        e.preventDefault(); li.classList.remove("drop-above");
        if (dragFrom == null) return;
        var f = dragFrom, to = i;
        if (f === to) return;
        var item = state.pages.splice(f, 1)[0];
        state.pages.splice(to, 0, item);
        cur = to;
        dragFrom = null;
        save(); renderList(); renderPreview();
      });
      list.appendChild(li);
    });
    markCur();
  }
  var dragFrom = null;
  function markCur() {
    var items = document.querySelectorAll("#stList .st-item");
    for (var i = 0; i < items.length; i++) items[i].classList.toggle("cur", i === cur);
  }
  function move(i, dir) {
    var j = i + dir;
    if (j < 0 || j >= state.pages.length) return;
    var t = state.pages[i]; state.pages[i] = state.pages[j]; state.pages[j] = t;
    cur = j;
    save(); renderList(); renderPreview();
  }
  function del(i) {
    if (!confirm("حذف هذه الصفحة؟")) return;
    state.pages.splice(i, 1);
    if (cur >= state.pages.length) cur = Math.max(0, state.pages.length - 1);
    save(); renderList(); renderPreview();
  }


  /* ── المعاينة الحيّة ───────────────────────────── */
  function renderPreview() {
    var box = $("stPage");
    var ctr = $("stCounter");
    if (!state.pages.length) {
      box.innerHTML = '<div class="st-empty">🛠 لا صفحات بعد — استورد ملفاً من اليسار أو أضف صفحة يدوية.<br>القصّة تُبنى هنا (في المصنع) ثم تتحول إلى قلّابة.</div>';
      ctr.textContent = "٠ / ٠";
      return;
    }
    var pg = state.pages[cur];
    var inner = "";
    if (pg.type === "slide") {
      inner = '<iframe src="' + esc(pg.src) + '" allowfullscreen></iframe>';
    } else if (pg.type === "image") {
      inner = '<img src="' + esc(pg.src) + '" alt="">';
    } else {
      inner = '<h3>' + esc(pg.title) + "</h3>" + pg.paras.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
    }
    box.innerHTML = inner + '<span class="pg-num">' + (cur + 1) + " / " + state.pages.length + "</span>";
    ctr.textContent = (cur + 1) + " / " + state.pages.length;
  }

  /* ── طباعة / تحويل إلى PDF ─────────────────────── */
  function buildPrint() {
    var area = $("stPrint");
    area.innerHTML = "";
    if (!state.pages.length) { alert("لا صفحات لطباعتها."); return; }
    state.pages.forEach(function (pg, i) {
      var sheet = document.createElement("div");
      sheet.className = "st-sheet";
      var inner = "";
      if (pg.type === "slide") inner = '<iframe src="' + esc(pg.src) + '" style="width:100%;height:100%;border:0;"></iframe>';
      else if (pg.type === "image") inner = '<img src="' + esc(pg.src) + '" style="max-width:100%;">';
      else inner = '<h3>' + esc(pg.title) + "</h3>" + pg.paras.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
      sheet.innerHTML = inner + '<span class="pg">' + (i + 1) + " / " + state.pages.length + "</span>";
      area.appendChild(sheet);
    });
    window.print();
  }

  /* ── توصيل الواجهة ─────────────────────────────── */
  function wire() {
    var nameIn = $("stName");
    nameIn.value = state.name;
    nameIn.addEventListener("input", function () { state.name = nameIn.value; save(); document.title = "🛠 " + (state.name || "استديو القلّابة"); });

    $("btnTxt").addEventListener("click", function () { $("fileTxt").click(); });
    $("fileTxt").addEventListener("change", function (e) {
      if (e.target.files[0]) importTxt(e.target.files[0]);
      e.target.value = "";
    });
    $("btnPdf").addEventListener("click", function () { $("filePdf").click(); });
    $("filePdf").addEventListener("change", function (e) {
      if (e.target.files[0]) importPdf(e.target.files[0]);
      e.target.value = "";
    });
    $("btnSlide").addEventListener("click", function () { importSlide($("slideUrl").value); });
    $("btnAdd").addEventListener("click", addManual);
    $("prevBtn").addEventListener("click", function () { if (cur > 0) { cur--; renderList(); renderPreview(); } });
    $("nextBtn").addEventListener("click", function () { if (cur < state.pages.length - 1) { cur++; renderList(); renderPreview(); } });
    $("btnPrint").addEventListener("click", buildPrint);
    $("btnClear").addEventListener("click", function () {
      if (confirm("تفريغ كل الصفحات؟")) { state.pages = []; cur = 0; save(); renderList(); renderPreview(); }
    });
    document.addEventListener("keydown", function (e) {
      if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === "ArrowLeft") $("nextBtn").click();
      if (e.key === "ArrowRight") $("prevBtn").click();
    });
  }

  load();
  wire();
  renderList();
  renderPreview();
  document.title = "🛠 " + (state.name || "استديو القلّابة — المصنع");
})();

