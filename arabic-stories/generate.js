/*
  📚 مولّد كتب المكتبة — ينشئ ملفات HTML من بيانات القص
  التشغيل:  node generate.js   (من داخل مجلد arabic-stories)
  البيانات: books-data.js (كل قصة: عنوان، فئة، صفحات نصية، عبرة)
  يُنتج:   books/*.html  (كتب قلّابة تستخدم style.css و flipbook.js نفسيهما)
*/
"use strict";
var fs = require("fs");
var path = require("path");
var books = require("./books-data.js");

var AR = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩", "١٠", "١", "١٢", "١٣", "١٤", "١٥", "١٦", "١٧", "١٨", "١٩", "٢٠"];
function ar(n) { return AR[n] || String(n); }

var DIR = path.join(__dirname, "books");
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

var SHELL_TOP =
  "<!DOCTYPE html>\n<html lang=\"ar\" dir=\"rtl\">\n<head>\n<meta charset=\"UTF-8\">\n" +
  "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
  "<title>TITLE | مكتبة الحكايات العربية</title>\n" +
  "<link rel=\"stylesheet\" href=\"../assets/css/style.css\">\n</head>\n<body>\n" +
  "<header class=\"library-brow\"><span>📚 مكتبة الحكايات العربية</span><span class=\"gold\">قصص مجانية للجميع</span></header>\n\n" +
  "<div class=\"book-toolbar\">\n <a class=\"back-link\" href=\"../index.html\">↩ عودة إلى الرف</a>\n" +
  " <button class=\"pdf-btn small\" onclick=\"window.print()\">⬇ تحميل PDF</button>\n" +
  " <span class=\"page-ind\" id=\"pageInd\">TOT / TOT</span>\n</div>\n\n" +
  "<main class=\"book-stage\">\n <div class=\"book\" id=\"book\">\n\n";

var SHELL_BOTTOM =
  " </div>\n</main>\n\n" +
  "<div class=\"book-controls\">\n <button class=\"nav-btn\" id=\"prevBtn\">❮ السابقة</button>\n" +
  " <div class=\"flip-progress\"><span id=\"flipProgress\"></span></div>\n" +
  " <button class=\"nav-btn\" id=\"nextBtn\">التالية ❯</button>\n</div>\n" +
  "<p class=\"book-hint\">💡 قَلِّب الصفحات بأزرار الأسهم أو النقر على طرفي الكتاب أو السحب · <kbd>تحميل PDF</kbd> يحفظ الكتاب كاملاً</p>\n\n" +
  "<script src=\"../assets/js/flipbook.js\"></script>\n</body>\n</html>\n";

function face(el, pg) {
  return "<div class=\"face " + el.cls + "\" data-pg=\"" + ar(pg) + "\">\n" + el.body + "\n</div>\n";
}

function leaf(elA, elB) {
  return "<section class=\"leaf\">\n" + elA + elB + "</section>\n\n";
}

function coverPage(b) {
  return face({
    cls: "front",
    body: "<div class=\"cover\">\n<span class=\"cover-badge\">" + b.cat + "</span>\n" +
      "<span class=\"cover-emoji\">" + b.emo + "</span>\n<h1>" + b.t + "</h1>\n" +
      "<p class=\"cover-sub\">" + b.sub + "</p>\n" +
      "<p class=\"cover-folio\">المكتبة العربية · " + b.no + "</p>\n</div>"
  }, 1);
}

function textPage(cls, h, paras, pg) {
  var p = "";
  for (var i = 0; i < paras.length; i++) p += "<p>" + paras[i] + "</p>\n";
  return face({ cls: cls, body: "<article class=\"story-page\">\n<h2>" + h + "</h2>\n" + p + "</article>" }, pg);
}

function endPage(b, pg) {
  return face({
    cls: "back",
    body: "<div class=\"endpage\">\n<span class=\"end-emoji\">" + b.endEmo + "</span>\n" +
      "<h2>نهاية القصة</h2>\n<p>" + b.end + "</p>\n" +
      "<p class=\"end-moral\">💡 العبرة: " + b.moral + "</p>\n</div>"
  }, pg);
}

function build(b) {
  var n = b.pages.length;            // صفحات النص (عدد زوجي دائماً)
  var total = n + 2;                 // + الغلاف + صفحة النهاية
  var out = SHELL_TOP.replace("TITLE", b.t).replace(/TOT/g, ar(total));
  // أول ورقة: الغلاف (وجه أمامي) + الصفحة الأولى (وجه خلفي)
  out += leaf(coverPage(b), textPage("back", b.pages[0][0], b.pages[0][1], 2));
  // الأوراق الوسطى: نص مقسوم زوجياً
  var pg = 3;
  for (var i = 1; i < n - 1; i += 2) {
    out += leaf(
      textPage("front", b.pages[i][0], b.pages[i][1], pg),
      textPage("back", b.pages[i + 1][0], b.pages[i + 1][1], pg + 1)
    );
    pg += 2;
  }
  // آخر ورقة: آخر صفحة نصية + صفحة النهاية
  out += leaf(textPage("front", b.pages[n - 1][0], b.pages[n - 1][1], pg), endPage(b, pg + 1));
  return out + SHELL_BOTTOM;
}

books.forEach(function (b) {
  var file = path.join(DIR, b.f + ".html");
  fs.writeFileSync(file, build(b), "utf8");
  console.log("✓ " + b.f + ".html  (" + (b.pages.length + 2) + " صفحات)");
});
console.log("تم إنشاء " + books.length + " كتاباً في مجلد books/");
