"use strict";
const b = require("./books-data.js");
const out = [];
let tot = 0;
const re = /[\u0600-\u06FF]/;
for (const s of b) {
  let w = 0;
  const txt = JSON.stringify(s.pages) + " " + s.end;
  txt.split(/[\s،.؛:!؟"'«»()\-،0-9٠-٩]+/u).forEach((x) => { if (re.test(x)) w++; });
  tot += w;
  out.push(s.f + "|" + w);
}
console.log(out.join("\n"));
console.log("TOTAL|" + tot);