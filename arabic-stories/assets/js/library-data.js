/* ═══════════════════════════════════════════════════════════════
   📚 مكتبة الحكايات العربية — فهرس البيانات المركزية (Literary Library Index)
   مؤلفات حقيقية من التراث العام + نصوص أصلية محفوظة الحقوق لهذه المكتبة.
   تُستَخدم من: index.html (الواجهة) و main.js (التصفية والإحصاءات)
   و _build.js (توليد صفحات القصص والمؤلفين).
   ═══════════════════════════════════════════════════════════════ */
(function (root, factory) {
  var LIB = factory();
  if (typeof module === "object" && module.exports) module.exports = LIB;
  root.LIBRARY = root.LIBRARY || LIB;
  if (root.document) root.LIBRARY = LIB;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ── المؤلفون / الأصول المعرَّفة بالموقع ────────────────── */
  var AUTHORS = {
    aesop:       { en: "Aesop",          years: "القرن ٦ ق.م", source: "wikisource" },
    grimms:      { en: "Brothers Grimm", years: "١٨١٢–١٨٧٥",  source: "gutenberg" },
    juhafolk:    { en: "Folk · Juhā",    years: "تراث شعبي",  source: "folk" },
    nights:      { en: "Arabian Nights", years: "تراث شعبي",  source: "wikisource" },
    kalila:      { en: "Kalīla wa-Dimna", years: "القرن ٨م",  source: "classic" },
    russiafolk:  { en: "Russian folk",   years: "تراث شعبي",  source: "folk" },
    arabicfolk:  { en: "Arabic folk",    years: "تراث شعبي",  source: "folk" },
    original:    { en: "Original",       years: "هذه المكتبة", source: "original" },
    chekhov:     { en: "Anton Chekhov",  years: "١٨٦٠–١٩٠٤", source: "gutenberg" },
    ohenry:      { en: "O. Henry",       years: "١٨٦٢–١٩١٠", source: "gutenberg" },
    andersen:    { en: "H. C. Andersen", years: "١٨٠٥–١٨٧٥", source: "gutenberg" },
    maupassant:  { en: "Guy de Maupassant", years: "١٨٥٠–١٨٩٣", source: "gutenberg" },
    stevenson:   { en: "R. L. Stevenson", years: "١٨٥٠–١٨٩٤", source: "gutenberg" }
  };

  /* ── دالة بناء سجلِّ قصة ─────────────────────────────── */
  function S(f, en, t, au, year, era, lang, origin, age, genre, themes, words, source, flip) {
    return { f: f, en: en, t: t, au: au, year: year, era: era, lang: lang,
      origin: origin, age: age, genre: genre, themes: themes, words: words,
      source: source, flip: flip || ("books/" + f + ".html") };
  }

  /*STORIES_BEGIN*/