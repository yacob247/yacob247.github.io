// Generates a browser-friendly data bundle (SS_DATA) from books-data.js
"use strict";
const fs = require("fs");
const books = require("./books-data.js");

const data = {};
books.forEach((b) => {
  data[b.f] = {
    t: b.t,
    f: b.f,
    cat: b.cat,
    emo: b.emo,
    sub: b.sub,
    desc: b.pages[0][1][0] || "",
    end: b.end,
    moral: b.moral,
    pages: b.pages.map((p) => [p[0], p[1]])
  };
});

const out =
  "/* ShortStories reader data — 30 stories, full text */\n" +
  "window.SS_DATA = " + JSON.stringify(data) + ";\n";

fs.writeFileSync("assets/js/stories-data.js", out, "utf8");
console.log("✓ stories-data.js written (" + books.length + " stories)");
