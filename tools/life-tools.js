const TOOLS = [
  ["age-calculator","Age Calculator","Life Planning","See exact age and next birthday.","date:Birth date"],
  ["date-difference","Date Difference","Life Planning","Count time between two dates.","date:Start date|date:End date"],
  ["countdown-maker","Countdown Maker","Life Planning","Countdown to a future date.","date:Target date|text:Event name"],
  ["sleep-cycle","Sleep Cycle Planner","Health","Plan sleep around 90-minute cycles.","time:Wake time|number:Cycles"],
  ["water-intake","Water Intake Planner","Health","Estimate daily water needs.","number:Weight kg|number:Activity minutes"],
  ["bmi-check","BMI Check","Health","Calculate BMI category.","number:Weight kg|number:Height cm"],
  ["bmr-estimator","BMR Estimator","Health","Estimate baseline calories.","number:Weight kg|number:Height cm|number:Age|select:Sex:Female,Male"],
  ["calorie-target","Calorie Target","Health","Set daily calorie target.","number:Maintenance calories|select:Goal:Lose,Gain,Maintain"],
  ["protein-target","Protein Target","Health","Estimate protein range.","number:Weight kg"],
  ["pace-calculator","Pace Calculator","Fitness","Convert distance and time to pace.","number:Distance km|number:Hours|number:Minutes"],
  ["tip-split","Tip Splitter","Money","Split bill and tip.","number:Bill|number:Tip percent|number:People"],
  ["discount-calculator","Discount Calculator","Money","Calculate sale price.","number:Original price|number:Discount percent"],
  ["savings-goal","Savings Goal Planner","Money","Plan savings pace.","number:Goal amount|number:Current savings|number:Weeks"],
  ["hourly-yearly","Hourly to Yearly","Money","Convert hourly pay.","number:Hourly rate|number:Hours per week"],
  ["loan-payment","Loan Payment","Money","Estimate monthly payment.","number:Loan amount|number:Annual interest percent|number:Years"],
  ["subscription-total","Subscription Total","Money","Calculate yearly subscriptions.","number:Monthly cost|number:Subscriptions"],
  ["unit-price","Unit Price Compare","Money","Compare two unit prices.","number:Price A|number:Units A|number:Price B|number:Units B"],
  ["tax-estimator","Tax Estimator","Money","Add or remove tax.","number:Amount|number:Tax percent|select:Mode:Add tax,Remove tax"],
  ["exchange-planner","Exchange Planner","Travel","Convert currency using your rate.","number:Amount|number:Exchange rate"],
  ["budget-ratio","Budget Ratio","Money","Split income into buckets.","number:Income"],
  ["word-counter","Word Counter","Writing","Count words and characters.","textarea:Text"],
  ["reading-time","Reading Time","Writing","Estimate read and speech time.","textarea:Text"],
  ["case-converter","Case Converter","Writing","Convert text case.","textarea:Text|select:Case:Title,Sentence,Upper,Lower,Alternating"],
  ["slug-generator","Slug Generator","Writing","Make clean URL slug.","text:Heading"],
  ["password-generator","Password Generator","Security","Generate a local password.","number:Length|select:Symbols:Yes,No"],
  ["character-limiter","Character Limiter","Writing","Trim text to a limit.","textarea:Text|number:Limit"],
  ["duplicate-lines","Duplicate Line Remover","Writing","Remove repeated lines.","textarea:Lines"],
  ["sort-lines","Sort Lines","Writing","Sort text lines.","textarea:Lines|select:Order:A-Z,Z-A"],
  ["csv-preview","CSV Preview","Data","Preview CSV as table text.","textarea:CSV"],
  ["find-replace","Find and Replace","Writing","Replace words or phrases.","textarea:Text|text:Find|text:Replace"],
  ["grade-average","Grade Average","Study","Weighted grade average.","textarea:Scores as score,weight"],
  ["final-grade","Final Grade Needed","Study","Required final score.","number:Current grade|number:Target grade|number:Final weight percent"],
  ["gpa-calculator","GPA Calculator","Study","Average GPA values.","textarea:GPA values"],
  ["study-planner","Study Session Planner","Study","Split study time into blocks.","number:Total minutes|number:Block minutes|number:Break minutes"],
  ["flashcard-shuffle","Flashcard Shuffler","Study","Shuffle flashcard lines.","textarea:Question - Answer lines"],
  ["cornell-notes","Cornell Notes Builder","Study","Structure notes.","textarea:Notes"],
  ["essay-outline","Essay Outline Builder","Study","Build essay outline.","text:Topic|text:Thesis|textarea:Arguments"],
  ["citation-builder","Citation Builder","Study","Simple citation builder.","text:Author|text:Title|text:Website|text:URL|number:Year"],
  ["quiz-maker","Quiz Maker","Study","Create quiz prompts.","textarea:Facts, one per line"],
  ["timetable-blocks","Timetable Blocks","Study","Make equal time blocks.","time:Start|time:End|number:Block minutes"],
  ["length-converter","Length Converter","Converter","Convert length units.","number:Value|select:From:m,km,mi,ft,in|select:To:m,km,mi,ft,in"],
  ["weight-converter","Weight Converter","Converter","Convert weight units.","number:Value|select:From:kg,g,lb,oz|select:To:kg,g,lb,oz"],
  ["temperature-converter","Temperature Converter","Converter","Convert temperature.","number:Value|select:From:C,F,K|select:To:C,F,K"],
  ["area-converter","Area Converter","Converter","Convert area units.","number:Value|select:From:sqm,hectare,acre,sqft|select:To:sqm,hectare,acre,sqft"],
  ["volume-converter","Volume Converter","Converter","Convert volume units.","number:Value|select:From:L,mL,gal,cup|select:To:L,mL,gal,cup"],
  ["speed-converter","Speed Converter","Converter","Convert speed units.","number:Value|select:From:kmh,mph,ms,knot|select:To:kmh,mph,ms,knot"],
  ["data-converter","Data Storage Converter","Converter","Convert data storage.","number:Value|select:From:KB,MB,GB,TB|select:To:KB,MB,GB,TB"],
  ["time-offset","Time Offset","Travel","Shift time by hours.","time:Time|number:Offset hours"],
  ["cooking-converter","Cooking Converter","Kitchen","Convert cooking measures.","number:Value|select:From:tsp,tbsp,cup,mL,L|select:To:tsp,tbsp,cup,mL,L"],
  ["aspect-ratio","Aspect Ratio","Design","Preserve aspect ratio.","number:Original width|number:Original height|number:New width"],
  ["contrast-checker","Contrast Checker","Design","Check colour contrast.","text:Text hex|text:Background hex"],
  ["palette-maker","Palette Maker","Design","Generate colour palette.","text:Base hex"],
  ["resize-calculator","Image Resize Calculator","Design","Scale dimensions.","number:Width|number:Height|number:Scale percent"],
  ["caption-helper","Caption Helper","Creator","Draft short captions.","text:Topic|select:Tone:Clear,Funny,Professional"],
  ["headline-variants","Headline Variants","Creator","Generate headline angles.","text:Idea"],
  ["name-combiner","Name Combiner","Creator","Mix name ideas.","text:Word one|text:Word two"],
  ["random-picker","Random Picker","Decision","Pick from a list.","textarea:Options"],
  ["decision-matrix","Decision Matrix","Decision","Score weighted options.","textarea:Options as name,score,weight"],
  ["pros-cons-score","Pros and Cons Scorer","Decision","Score pros and cons.","textarea:Pros|textarea:Cons"],
  ["priority-wheel","Life Priority Wheel","Decision","Rate life areas.","textarea:Areas as name,score"]
].map(([id,title,category,desc,fields]) => ({ id,title,category,desc,fields: fields.split("|").map(parseField) }));

function parseField(def) {
  const [type, label, options] = def.split(":");
  return { type, label, options: options ? options.split(",") : [] };
}

const $ = (id) => document.getElementById(id);
const fmt = (n, d = 2) => Number.isFinite(n) ? Number(n).toLocaleString(undefined, { maximumFractionDigits: d }) : "0";
const val = (data, label) => data.get(label) || "";
const num = (data, label) => parseFloat(val(data, label)) || 0;
let active = TOOLS[0];

function renderNav() {
  const categories = ["All", ...new Set(TOOLS.map(t => t.category))];
  $("category-tabs").innerHTML = categories.map((c, i) => `<button type="button" class="${i === 0 ? "active" : ""}" data-cat="${c}">${c}</button>`).join("");
  $("category-tabs").addEventListener("click", e => {
    if (!e.target.dataset.cat) return;
    document.querySelectorAll("#category-tabs button").forEach(b => b.classList.toggle("active", b === e.target));
    renderButtons(e.target.dataset.cat, $("tool-search").value);
  });
  $("tool-search").addEventListener("input", () => renderButtons(document.querySelector("#category-tabs .active").dataset.cat, $("tool-search").value));
  renderButtons("All", "");
}

function renderButtons(category, query) {
  const q = query.toLowerCase();
  const list = TOOLS.filter(t => (category === "All" || t.category === category) && `${t.title} ${t.desc} ${t.category}`.toLowerCase().includes(q));
  $("tool-buttons").innerHTML = list.map(t => `<button type="button" class="${t.id === active.id ? "active" : ""}" data-tool="${t.id}"><span>${t.title}</span><small>${t.category}</small></button>`).join("");
  $("tool-buttons").onclick = e => {
    const button = e.target.closest("[data-tool]");
    if (!button) return;
    setActive(button.dataset.tool);
    // Smooth scroll to tool workspace on mobile/tablets
    if (window.innerWidth <= 980) {
      document.querySelector(".tool-panel").scrollIntoView({ behavior: 'smooth' });
    }
  };
}

// Dynamically updates global CSS variables to match active tool's category
function updateCategoryTheme(category) {
  const formattedCat = category.toLowerCase().replace(/\s+/g, '-');
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  const rgb = computedStyle.getPropertyValue(`--accent-rgb-${formattedCat}`).trim();
  
  if (rgb) {
    root.style.setProperty('--accent', `rgb(${rgb})`);
    root.style.setProperty('--accent-glow', `rgba(${rgb}, 0.04)`);
    root.style.setProperty('--accent-light', `rgba(${rgb}, 0.12)`);
  }
}

function setActive(id) {
  active = TOOLS.find(t => t.id === id) || TOOLS[0];
  location.hash = active.id;
  $("active-title").textContent = active.title;
  $("active-category").textContent = active.category;
  $("active-desc").textContent = active.desc;
  $("tool-form").innerHTML = active.fields.map(fieldHtml).join("") + `<div class="field full"><button type="submit">Run tool</button></div>`;
  document.querySelectorAll("#tool-buttons button").forEach(b => b.classList.toggle("active", b.dataset.tool === active.id));
  $("result").textContent = "Enter values and run the tool.";
  
  // Transition background color theme
  updateCategoryTheme(active.category);
}

function fieldHtml(field) {
  const name = field.label;
  const common = `name="${name}" id="${name.replace(/\W+/g, "-")}"`;
  if (field.type === "textarea") return `<label class="field full"><span>${name}</span><textarea ${common}></textarea></label>`;
  if (field.type === "select") return `<label class="field"><span>${name}</span><select ${common}>${field.options.map(o => `<option>${o}</option>`).join("")}</select></label>`;
  return `<label class="field"><span>${name}</span><input type="${field.type}" ${common} ${field.type === "number" ? "step=\"any\"" : ""}></label>`;
}

function result(html) {
  $("result").innerHTML = html;
}

const ACTIONS = {
  "age-calculator": d => { const b = new Date(val(d,"Birth date")); const now = new Date(); const days = Math.floor((now - b) / 86400000); return `<strong>${Math.floor(days/365.2425)} years old</strong>\n${days.toLocaleString()} days lived.`; },
  "date-difference": d => `${Math.abs(Math.round((new Date(val(d,"End date")) - new Date(val(d,"Start date"))) / 86400000)).toLocaleString()} days between dates.`,
  "countdown-maker": d => { const days = Math.ceil((new Date(val(d,"Target date")) - new Date()) / 86400000); return `<strong>${val(d,"Event name") || "Event"}</strong>\n${days} days remaining.`; },
  "sleep-cycle": d => { const wake = val(d,"Wake time") || "07:00"; const [h,m] = wake.split(":").map(Number); const cycles = num(d,"Cycles") || 5; const date = new Date(); date.setHours(h, m - cycles * 90, 0, 0); return `Suggested bedtime: <strong>${date.toTimeString().slice(0,5)}</strong>`; },
  "water-intake": d => `${fmt(num(d,"Weight kg") * 35 + num(d,"Activity minutes") * 12,0)} mL per day estimate.`,
  "bmi-check": d => { const bmi = num(d,"Weight kg") / ((num(d,"Height cm")/100) ** 2); return `BMI: <strong>${fmt(bmi)}</strong>\nCategory: ${bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy range" : bmi < 30 ? "Overweight" : "Obesity range"}`; },
  "bmr-estimator": d => { const male = val(d,"Sex") === "Male"; const bmr = 10*num(d,"Weight kg") + 6.25*num(d,"Height cm") - 5*num(d,"Age") + (male ? 5 : -161); return `Estimated BMR: <strong>${fmt(bmr,0)} calories/day</strong>`; },
  "calorie-target": d => { const m = num(d,"Maintenance calories"); const g = val(d,"Goal"); return `Target: <strong>${fmt(g==="Lose"?m-500:g==="Gain"?m+300:m,0)} calories/day</strong>`; },
  "protein-target": d => `${fmt(num(d,"Weight kg")*1.6,0)}g to ${fmt(num(d,"Weight kg")*2.2,0)}g protein/day.`,
  "pace-calculator": d => { const mins = num(d,"Hours")*60 + num(d,"Minutes"); return `Pace: <strong>${fmt(mins/num(d,"Distance km"))} min/km</strong>\nSpeed: ${fmt(num(d,"Distance km")/(mins/60))} km/h`; },
  "tip-split": d => { const total = num(d,"Bill")*(1+num(d,"Tip percent")/100); return `Total: $${fmt(total)}\nEach pays: <strong>$${fmt(total/(num(d,"People")||1))}</strong>`; },
  "discount-calculator": d => { const saved = num(d,"Original price")*num(d,"Discount percent")/100; return `Sale price: <strong>$${fmt(num(d,"Original price")-saved)}</strong>\nSaved: $${fmt(saved)}`; },
  "savings-goal": d => `$${fmt((num(d,"Goal amount")-num(d,"Current savings"))/(num(d,"Weeks")||1))} needed per week.`,
  "hourly-yearly": d => { const week = num(d,"Hourly rate")*num(d,"Hours per week"); return `Weekly: $${fmt(week)}\nMonthly: $${fmt(week*52/12)}\nYearly: <strong>$${fmt(week*52)}</strong>`; },
  "loan-payment": d => { const r = num(d,"Annual interest percent")/100/12; const n = num(d,"Years")*12; const p = num(d,"Loan amount"); const pay = r ? p*r/(1-(1+r)**-n) : p/n; return `Monthly payment: <strong>$${fmt(pay)}</strong>`; },
  "subscription-total": d => `Yearly cost: <strong>$${fmt(num(d,"Monthly cost")*num(d,"Subscriptions")*12)}</strong>`,
  "unit-price": d => `A: $${fmt(num(d,"Price A")/num(d,"Units A"))}/unit\nB: $${fmt(num(d,"Price B")/num(d,"Units B"))}/unit`,
  "tax-estimator": d => { const a = num(d,"Amount"), t = num(d,"Tax percent")/100; return val(d,"Mode")==="Add tax" ? `$${fmt(a*(1+t))}` : `$${fmt(a/(1+t))}`; },
  "exchange-planner": d => `${fmt(num(d,"Amount")*num(d,"Exchange rate"))} converted at your entered rate.`,
  "budget-ratio": d => `Needs 50%: $${fmt(num(d,"Income")*.5)}\nWants 30%: $${fmt(num(d,"Income")*.3)}\nSavings 20%: $${fmt(num(d,"Income")*.2)}`,
  "word-counter": d => { const text = val(d,"Text"); return `Words: ${text.trim()?text.trim().split(/\s+/).length:0}\nCharacters: ${text.length}\nParagraphs: ${text.split(/\n\s*\n/).filter(Boolean).length}`; },
  "reading-time": d => { const words = val(d,"Text").trim().split(/\s+/).filter(Boolean).length; return `Reading: ${fmt(words/220,1)} min\nSpeaking: ${fmt(words/140,1)} min`; },
  "case-converter": d => convertCase(val(d,"Text"), val(d,"Case")),
  "slug-generator": d => val(d,"Heading").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),
  "password-generator": d => makePassword(num(d,"Length") || 16, val(d,"Symbols")==="Yes"),
  "character-limiter": d => val(d,"Text").slice(0, num(d,"Limit") || 160),
  "duplicate-lines": d => [...new Set(val(d,"Lines").split(/\r?\n/).filter(Boolean))].join("\n"),
  "sort-lines": d => val(d,"Lines").split(/\r?\n/).filter(Boolean).sort((a,b)=>val(d,"Order")==="Z-A"?b.localeCompare(a):a.localeCompare(b)).join("\n"),
  "csv-preview": d => val(d,"CSV").split(/\r?\n/).map(line => line.split(",").map(c => c.trim()).join(" | ")).join("\n"),
  "find-replace": d => val(d,"Text").split(val(d,"Find")).join(val(d,"Replace")),
  "grade-average": d => weightedLines(val(d,"Scores as score,weight")),
  "final-grade": d => `Needed on final: <strong>${fmt((num(d,"Target grade") - num(d,"Current grade")*(1-num(d,"Final weight percent")/100))/(num(d,"Final weight percent")/100))}%</strong>`,
  "gpa-calculator": d => `Average GPA: <strong>${fmt(avgNums(val(d,"GPA values")))}</strong>`,
  "study-planner": d => makeBlocks(num(d,"Total minutes"), num(d,"Block minutes"), num(d,"Break minutes")),
  "flashcard-shuffle": d => shuffle(val(d,"Question - Answer lines").split(/\r?\n/).filter(Boolean)).join("\n"),
  "cornell-notes": d => `Cues:\n- Add key questions here\n\nNotes:\n${val(d,"Notes")}\n\nSummary:\nWrite a 3 sentence summary after review.`,
  "essay-outline": d => `Topic: ${val(d,"Topic")}\nThesis: ${val(d,"Thesis")}\n\nArguments:\n${val(d,"Arguments").split(/\r?\n/).map((x,i)=>`${i+1}. ${x}`).join("\n")}\n\nConclusion: Restate thesis and connect to the wider question.`,
  "citation-builder": d => `${val(d,"Author")} (${num(d,"Year")||"n.d."}). ${val(d,"Title")}. ${val(d,"Website")}. ${val(d,"URL")}`,
  "quiz-maker": d => val(d,"Facts, one per line").split(/\r?\n/).filter(Boolean).map((x,i)=>`${i+1}. What is important about: ${x}?`).join("\n"),
  "timetable-blocks": d => timeBlocks(val(d,"Start"), val(d,"End"), num(d,"Block minutes")),
  "length-converter": d => convert(num(d,"Value"), val(d,"From"), val(d,"To"), {m:1,km:1000,mi:1609.344,ft:.3048,in:.0254}),
  "weight-converter": d => convert(num(d,"Value"), val(d,"From"), val(d,"To"), {kg:1,g:.001,lb:.453592,oz:.0283495}),
  "temperature-converter": d => temp(num(d,"Value"), val(d,"From"), val(d,"To")),
  "area-converter": d => convert(num(d,"Value"), val(d,"From"), val(d,"To"), {sqm:1,hectare:10000,acre:4046.8564224,sqft:.092903}),
  "volume-converter": d => convert(num(d,"Value"), val(d,"From"), val(d,"To"), {L:1,mL:.001,gal:3.78541,cup:.236588}),
  "speed-converter": d => convert(num(d,"Value"), val(d,"From"), val(d,"To"), {kmh:1,mph:1.60934,ms:3.6,knot:1.852}),
  "data-converter": d => convert(num(d,"Value"), val(d,"From"), val(d,"To"), {KB:1,MB:1024,GB:1048576,TB:1073741824}),
  "time-offset": d => { const [h,m] = (val(d,"Time")||"00:00").split(":").map(Number); const date = new Date(); date.setHours(h + num(d,"Offset hours"), m, 0, 0); return date.toTimeString().slice(0,5); },
  "cooking-converter": d => convert(num(d,"Value"), val(d,"From"), val(d,"To"), {tsp:4.92892,tbsp:14.7868,cup:236.588,mL:1,L:1000}),
  "aspect-ratio": d => `New height: <strong>${fmt(num(d,"Original height")*(num(d,"New width")/num(d,"Original width")),0)}px</strong>`,
  "contrast-checker": d => contrast(val(d,"Text hex"), val(d,"Background hex")),
  "palette-maker": d => palette(val(d,"Base hex")),
  "resize-calculator": d => `New size: <strong>${fmt(num(d,"Width")*num(d,"Scale percent")/100,0)} x ${fmt(num(d,"Height")*num(d,"Scale percent")/100,0)}</strong>`,
  "caption-helper": d => `${val(d,"Tone")} caption:\n${val(d,"Topic")} — the part worth paying attention to today.`,
  "headline-variants": d => [`Why ${val(d,"Idea")} matters now`, `The honest guide to ${val(d,"Idea")}`, `${val(d,"Idea")}: what people are missing`].join("\n"),
  "name-combiner": d => [val(d,"Word one")+val(d,"Word two"), val(d,"Word two")+val(d,"Word one"), `${val(d,"Word one")} ${val(d,"Word two")} Studio`].join("\n"),
  "random-picker": d => shuffle(val(d,"Options").split(/\r?\n/).filter(Boolean))[0] || "No options entered.",
  "decision-matrix": d => weightedLines(val(d,"Options as name,score,weight")),
  "pros-cons-score": d => `Score: ${val(d,"Pros").split(/\r?\n/).filter(Boolean).length - val(d,"Cons").split(/\r?\n/).filter(Boolean).length}\nMore positive means the pros outweigh the cons.`,
  "priority-wheel": d => val(d,"Areas as name,score").split(/\r?\n/).filter(Boolean).sort((a,b)=>(parseFloat(a.split(",")[1])||0)-(parseFloat(b.split(",")[1])||0)).join("\n")
};

function convertCase(text, mode) {
  if (mode === "Upper") return text.toUpperCase();
  if (mode === "Lower") return text.toLowerCase();
  if (mode === "Alternating") return text.split("").map((c,i)=>i%2?c.toLowerCase():c.toUpperCase()).join("");
  if (mode === "Sentence") return text.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, c => c.toUpperCase());
  return text.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function makePassword(length, symbols) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789" + (symbols ? "!@#$%^&*_-+=" : "");
  return Array.from({length}, () => chars[Math.floor(Math.random()*chars.length)]).join("");
}

function avgNums(text) {
  const nums = text.match(/-?\d+(\.\d+)?/g)?.map(Number) || [];
  return nums.reduce((a,b)=>a+b,0) / (nums.length || 1);
}

function weightedLines(text) {
  let total = 0, weight = 0;
  text.split(/\r?\n/).forEach(line => {
    const parts = line.split(",").map(Number).filter(n => Number.isFinite(n));
    if (parts.length >= 2) { total += parts[0] * parts[1]; weight += parts[1]; }
  });
  return `Weighted result: <strong>${fmt(total/(weight||1))}</strong>`;
}

function makeBlocks(total, block, rest) {
  let out = [], used = 0, i = 1;
  while (used + block <= total) { out.push(`Block ${i++}: ${block} min focus`); used += block; if (used + rest < total) { out.push(`Break: ${rest} min`); used += rest; } }
  return out.join("\n");
}

function timeBlocks(start, end, mins) {
  const [sh,sm]=(start||"09:00").split(":").map(Number), [eh,em]=(end||"17:00").split(":").map(Number);
  const d = new Date(), stop = new Date();
  d.setHours(sh,sm,0,0); stop.setHours(eh,em,0,0);
  const out = [];
  while (d < stop) { const s = d.toTimeString().slice(0,5); d.setMinutes(d.getMinutes()+mins); out.push(`${s} - ${d.toTimeString().slice(0,5)}`); }
  return out.join("\n");
}

function convert(value, from, to, map) {
  return `<strong>${fmt(value * map[from] / map[to])} ${to}</strong>`;
}

function temp(value, from, to) {
  const c = from === "C" ? value : from === "F" ? (value-32)*5/9 : value-273.15;
  const out = to === "C" ? c : to === "F" ? c*9/5+32 : c+273.15;
  return `<strong>${fmt(out)} ${to}</strong>`;
}

function contrast(a, b) {
  const lum = hex => { const c = hex.replace("#","").match(/.{2}/g).map(x=>parseInt(x,16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
  const ratio = (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
  return `Contrast ratio: <strong>${fmt(ratio)}:1</strong>\n${ratio >= 4.5 ? "Passes normal text AA." : "Needs stronger contrast for normal text."}`;
}

function palette(hex) {
  const clean = hex.replace("#","").padEnd(6,"0").slice(0,6);
  const n = parseInt(clean,16);
  return [0,24,48,72,96].map(x => `#${((n+x*65793)&0xffffff).toString(16).padStart(6,"0")}`).join("\n");
}

function shuffle(arr) {
  return arr.map(v => [Math.random(), v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
}

document.addEventListener("DOMContentLoaded", () => {
  renderNav();
  setActive(location.hash.slice(1) || "age-calculator");
  $("tool-form").addEventListener("submit", e => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    result(ACTIONS[active.id](data));
  });
  
  // Tactical feedback on result copying
  $("copy-result").addEventListener("click", () => {
    const textToCopy = $("result").innerText;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        const copyBtn = $("copy-result");
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = "✓ Copied!";
        copyBtn.style.background = "#f0fdf4";
        copyBtn.style.color = "#16a34a";
        copyBtn.style.borderColor = "#bbf7d0";
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
          copyBtn.style.background = "";
          copyBtn.style.color = "";
          copyBtn.style.borderColor = "";
        }, 1800);
      });
    } else {
      // Fallback
      const el = document.createElement('textarea');
      el.value = textToCopy;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  });
  if (window.adsbygoogle) document.querySelectorAll(".adsbygoogle").forEach(() => { try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {} });
});