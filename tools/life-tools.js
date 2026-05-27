const RAW_TOOLS = [
  ["age-calculator","Age Calculator","Planning","Calculate exact age and days lived from a birth date.","date:Birth date"],
  ["date-difference","Date Difference","Planning","Count the time between two dates for schedules, deadlines, and project windows.","date:Start date|date:End date"],
  ["countdown-maker","Countdown Maker","Planning","Count down to a future event or deadline.","date:Target date|text:Event name"],
  ["sleep-cycle","Sleep Cycle Planner","Health","Plan bedtimes around 90-minute sleep cycles.","time:Wake time|number:Cycles"],
  ["water-intake","Water Intake Planner","Health","Estimate daily water intake from weight and activity.","number:Weight kg|number:Activity minutes"],
  ["bmi-check","BMI Check","Health","Calculate body mass index and broad category.","number:Weight kg|number:Height cm"],
  ["bmr-estimator","BMR Estimator","Health","Estimate baseline daily calories.","number:Weight kg|number:Height cm|number:Age|select:Sex:Female,Male"],
  ["calorie-target","Calorie Target","Health","Set a simple daily calorie target from maintenance calories.","number:Maintenance calories|select:Goal:Lose,Gain,Maintain"],
  ["protein-target","Protein Target","Health","Estimate a useful daily protein range.","number:Weight kg"],
  ["pace-calculator","Pace Calculator","Fitness","Convert distance and time into pace and speed.","number:Distance km|number:Hours|number:Minutes"],
  ["study-planner","Study Session Planner","Study","Split a study block into repeatable focus and break sessions.","number:Total minutes|number:Block minutes|number:Break minutes"],
  ["timetable-blocks","Timetable Blocks","Study","Create equal time blocks between a start and end time.","time:Start|time:End|number:Block minutes"],
  ["grade-average","Weighted Grade Average","Study","Calculate weighted marks from score,weight rows.","textarea:Scores as score,weight"],
  ["final-grade","Final Grade Needed","Study","Work out what score is needed on a final assessment.","number:Current grade|number:Target grade|number:Final weight percent"],
  ["gpa-calculator","GPA Calculator","Study","Average GPA values from a pasted list.","textarea:GPA values"],
  ["cornell-notes","Cornell Notes Builder","Study","Turn raw notes into a review-friendly Cornell notes structure.","textarea:Notes"],
  ["essay-outline","Essay Outline Builder","Study","Create a structured essay plan from a topic, thesis, and arguments.","text:Topic|text:Thesis|textarea:Arguments"],
  ["citation-builder","Citation Builder","Study","Draft a simple source citation for research notes.","text:Author|text:Title|text:Website|text:URL|number:Year"],
  ["quiz-maker","Quiz Maker","Study","Generate revision questions from factual lines.","textarea:Facts, one per line"],
  ["flashcard-shuffle","Flashcard Shuffler","Study","Shuffle question-answer flashcard lines for revision.","textarea:Question - Answer lines"],
  ["tip-split","Bill And Tip Splitter","Money","Split a bill with tip across a group.","number:Bill|number:Tip percent|number:People"],
  ["discount-calculator","Discount Calculator","Money","Calculate sale price and savings.","number:Original price|number:Discount percent"],
  ["savings-goal","Savings Goal Planner","Money","Calculate weekly savings needed to reach a target.","number:Goal amount|number:Current savings|number:Weeks"],
  ["hourly-yearly","Hourly To Yearly Income","Money","Convert hourly pay into weekly, monthly, and yearly estimates.","number:Hourly rate|number:Hours per week"],
  ["loan-payment","Loan Payment Estimate","Money","Estimate a monthly loan repayment from amount, rate, and term.","number:Loan amount|number:Annual interest percent|number:Years"],
  ["subscription-total","Subscription Total","Money","Estimate yearly recurring subscription cost.","number:Monthly cost|number:Subscriptions"],
  ["unit-price","Unit Price Compare","Money","Compare two prices by unit amount.","number:Price A|number:Units A|number:Price B|number:Units B"],
  ["tax-estimator","Tax Add Or Remove","Money","Add tax to an amount or reverse tax from a total.","number:Amount|number:Tax percent|select:Mode:Add tax,Remove tax"],
  ["budget-ratio","Budget Ratio","Money","Split income into needs, wants, and savings buckets.","number:Income"],
  ["word-counter","Word Counter","Writing","Count words, characters, and paragraphs.","textarea:Text"],
  ["reading-time","Reading And Speaking Time","Writing","Estimate reading and speaking duration from pasted text.","textarea:Text"],
  ["case-converter","Case Converter","Writing","Convert text to title, sentence, upper, lower, or alternating case.","textarea:Text|select:Case:Title,Sentence,Upper,Lower,Alternating"],
  ["slug-generator","Slug Generator","Writing","Create a clean URL slug from a heading.","text:Heading"],
  ["character-limiter","Character Limiter","Writing","Trim text to a target character limit.","textarea:Text|number:Limit"],
  ["password-generator","Password Generator","Security","Generate a local password for planning drafts and temporary credentials.","number:Length|select:Symbols:Yes,No"],
  ["duplicate-lines","Duplicate Line Remover","Data","Remove repeated lines from lists, notes, or exports.","textarea:Lines"],
  ["sort-lines","Sort Lines","Data","Sort lines from A-Z or Z-A.","textarea:Lines|select:Order:A-Z,Z-A"],
  ["csv-preview","CSV Preview","Data","Preview simple CSV rows as readable columns.","textarea:CSV"],
  ["find-replace","Find And Replace","Data","Replace exact phrases in pasted text.","textarea:Text|text:Find|text:Replace"],
  ["length-converter","Length Converter","Converter","Convert between metres, kilometres, miles, feet, and inches.","number:Value|select:From:m,km,mi,ft,in|select:To:m,km,mi,ft,in"],
  ["weight-converter","Weight Converter","Converter","Convert between kilograms, grams, pounds, and ounces.","number:Value|select:From:kg,g,lb,oz|select:To:kg,g,lb,oz"],
  ["temperature-converter","Temperature Converter","Converter","Convert Celsius, Fahrenheit, and Kelvin.","number:Value|select:From:C,F,K|select:To:C,F,K"],
  ["area-converter","Area Converter","Converter","Convert common area units.","number:Value|select:From:sqm,hectare,acre,sqft|select:To:sqm,hectare,acre,sqft"],
  ["volume-converter","Volume Converter","Converter","Convert common liquid volume units.","number:Value|select:From:L,mL,gal,cup|select:To:L,mL,gal,cup"],
  ["speed-converter","Speed Converter","Converter","Convert common speed units.","number:Value|select:From:kmh,mph,ms,knot|select:To:kmh,mph,ms,knot"],
  ["data-converter","Data Storage Converter","Converter","Convert storage units using binary multiples.","number:Value|select:From:KB,MB,GB,TB|select:To:KB,MB,GB,TB"],
  ["cooking-converter","Cooking Converter","Converter","Convert teaspoon, tablespoon, cup, mL, and litre measures.","number:Value|select:From:tsp,tbsp,cup,mL,L|select:To:tsp,tbsp,cup,mL,L"],
  ["exchange-planner","Exchange Planner","Travel","Convert money with your own exchange rate.","number:Amount|number:Exchange rate"],
  ["time-offset","Time Offset","Travel","Shift a time forward or backward by hours.","time:Time|number:Offset hours"],
  ["aspect-ratio","Aspect Ratio","Design","Calculate proportional image height from a new width.","number:Original width|number:Original height|number:New width"],
  ["contrast-checker","Contrast Checker","Design","Check a text/background colour contrast ratio.","text:Text hex|text:Background hex"],
  ["palette-maker","Palette Maker","Design","Generate a simple palette from a base hex value.","text:Base hex"],
  ["resize-calculator","Image Resize Calculator","Design","Scale image dimensions by a percentage.","number:Width|number:Height|number:Scale percent"],
  ["headline-variants","Headline Variants","Creator","Generate practical headline angles from one idea.","text:Idea"],
  ["caption-helper","Caption Helper","Creator","Draft a short caption from a topic and tone.","text:Topic|select:Tone:Clear,Funny,Professional"],
  ["name-combiner","Name Combiner","Creator","Combine two words into quick naming options.","text:Word one|text:Word two"],
  ["random-picker","Random Picker","Decision","Pick one option from a pasted list.","textarea:Options"],
  ["decision-matrix","Decision Matrix","Decision","Score weighted options using name,score,weight rows.","textarea:Options as name,score,weight"],
  ["pros-cons-score","Pros And Cons Scorer","Decision","Compare the number of pros and cons in two lists.","textarea:Pros|textarea:Cons"],
  ["priority-wheel","Priority Wheel","Decision","Sort areas by score to reveal weak priorities.","textarea:Areas as name,score"],
  ["business-model","Business Model Sheet","Business","Estimate revenue, gross profit, net profit, and margin from core business drivers.","number:Unit price|number:Unit cost|number:Monthly orders|number:Marketing spend|number:Fixed costs"],
  ["break-even","Break-even Planner","Business","Find the sales volume needed to cover fixed costs with a product or service.","number:Fixed costs|number:Unit price|number:Unit variable cost"],
  ["cash-runway","Cash Runway","Business","Estimate how long available cash lasts at the current burn rate.","number:Cash balance|number:Monthly revenue|number:Monthly expenses"],
  ["customer-ltv","LTV And CAC Planner","Business","Estimate customer lifetime value and compare it with acquisition cost.","number:Average order value|number:Gross margin percent|number:Orders per customer|number:CAC"],
  ["campaign-planner","Ad Campaign Planner","Marketing","Forecast impressions, clicks, conversions, revenue, and profit from campaign inputs.","number:Budget|number:CPM|number:CTR percent|number:Conversion rate percent|number:AOV|number:Margin percent"],
  ["roas-break-even","Break-even ROAS","Marketing","Calculate minimum ROAS needed after product cost and fulfilment cost.","number:Sale price|number:Product cost|number:Fulfilment cost"],
  ["utm-builder","UTM Link Builder","Marketing","Build clean campaign URLs for analytics and channel tracking.","text:Base URL|text:Source|text:Medium|text:Campaign|text:Content"],
  ["creator-revenue","Creator Revenue Model","Creator","Estimate monthly creator income from ads, sponsors, affiliate sales, and products.","number:Monthly views|number:RPM|number:Sponsor revenue|number:Affiliate sales|number:Product sales"],
  ["youtube-calendar","YouTube Calendar","Creator","Generate a publishing calendar from a start date and weekly upload target.","date:Start date|number:Weeks|number:Uploads per week|text:Topic pillar"],
  ["thumbnail-brief","Thumbnail Brief","Creator","Turn a video idea into a practical thumbnail and title brief.","text:Video idea|text:Audience|text:Promise|select:Style:Clean,Bold,Documentary,Comparison"],
  ["seo-brief","SEO Brief Builder","Marketing","Create an outline for a search-focused page from intent, audience, and competitor gaps.","text:Primary keyword|text:Audience|select:Intent:Informational,Commercial,Transactional,Navigation|textarea:Competitor gaps"],
  ["invoice-builder","Invoice Draft Builder","Business","Draft a clean invoice summary from line items and payment terms.","text:Client|textarea:Items as description,quantity,price|number:Tax percent|text:Payment terms"],
  ["inventory-reorder","Inventory Reorder Planner","Operations","Calculate reorder point and estimated stockout timing for products.","number:Current stock|number:Daily sales|number:Lead time days|number:Safety stock"],
  ["capacity-planner","Operations Capacity Planner","Operations","Estimate project capacity from team size, weekly hours, and task effort.","number:People|number:Hours per person|number:Focus percent|number:Average task hours"],
  ["risk-register","Risk Register Builder","Operations","Score risks by likelihood and impact and sort the highest priorities first.","textarea:Risks as name,likelihood,impact"],
  ["data-quality-audit","Data Quality Audit","Data","Check pasted records for missing values, duplicate rows, and inconsistent row width.","textarea:CSV or rows"],
  ["json-formatter","JSON Formatter","Data","Format, validate, and summarize JSON data locally in the browser.","textarea:JSON"],
  ["regex-extractor","Regex Extractor","Data","Extract matching values from pasted text using a regular expression.","textarea:Text|text:Regex pattern|select:Flags:g,gi,gm,gim"],
  ["ai-accuracy-check","AI Accuracy Checklist","Research","Create a verification checklist for claims that need evidence before publishing.","textarea:Claims, one per line"],
  ["source-triangulator","Source Triangulator","Research","Score claims by the number and quality of supporting sources.","textarea:Rows as claim,sources,confidence"]
];

const TOOLS = RAW_TOOLS.map(([id, title, category, desc, fields]) => ({
  id,
  title,
  category,
  desc,
  fields: fields.split("|").map(parseField)
}));

const CATEGORY_COLOURS = {
  Planning: "#2563eb",
  Health: "#0f766e",
  Fitness: "#c2410c",
  Study: "#0f766e",
  Money: "#15803d",
  Writing: "#7c3aed",
  Data: "#475467",
  Security: "#101828",
  Converter: "#e11d48",
  Travel: "#b7791f",
  Design: "#9333ea",
  Creator: "#c2410c",
  Decision: "#101828",
  Business: "#2563eb",
  Marketing: "#9333ea",
  Operations: "#0f766e",
  Research: "#b7791f"
};

const STORAGE_KEY = "envizion-workbench-v1";
const $ = (id) => document.getElementById(id);
const fmt = (n, d = 2) => Number.isFinite(n) ? Number(n).toLocaleString(undefined, { maximumFractionDigits: d }) : "0";
const val = (data, label) => data.get(label) || "";
const num = (data, label) => parseFloat(val(data, label)) || 0;

let activeCategory = "All";
let activeQuery = "";
let projectCards = [];

function parseField(def) {
  const [type, label, options] = def.split(":");
  return { type, label, options: options ? options.split(",") : [] };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeOutput(value) {
  return escapeHtml(value)
    .replace(/&lt;strong&gt;/g, "<strong>")
    .replace(/&lt;\/strong&gt;/g, "</strong>");
}

function renderCategories() {
  const categories = ["All", ...new Set(TOOLS.map((tool) => tool.category))];
  $("category-tabs").innerHTML = categories.map((category) => (
    `<button type="button" class="${category === activeCategory ? "active" : ""}" data-category="${category}">${category}</button>`
  )).join("");
}

function renderLibrary() {
  renderCategories();
  const query = activeQuery.trim().toLowerCase();
  const visibleTools = TOOLS.filter((tool) => {
    const categoryMatch = activeCategory === "All" || tool.category === activeCategory;
    const queryMatch = `${tool.title} ${tool.category} ${tool.desc}`.toLowerCase().includes(query);
    return categoryMatch && queryMatch;
  });

  $("tool-count").textContent = visibleTools.length;
  $("tool-buttons").innerHTML = visibleTools.map((tool) => `
    <button type="button" data-tool="${tool.id}">
      <small>${tool.category}</small>
      <strong>${tool.title}</strong>
      <span>${tool.desc}</span>
    </button>
  `).join("");
}

function addTool(toolId) {
  const tool = TOOLS.find((item) => item.id === toolId);
  if (!tool) return;

  projectCards.push({
    uid: `${tool.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    toolId: tool.id,
    values: {},
    output: "Enter values, then run this tool."
  });

  updateAccent(tool.category);
  renderWorkspace();
  saveProject();
}

function getTool(toolId) {
  return TOOLS.find((tool) => tool.id === toolId) || TOOLS[0];
}

function updateAccent(category) {
  const colour = CATEGORY_COLOURS[category] || CATEGORY_COLOURS.Planning;
  document.documentElement.style.setProperty("--accent", colour);
  document.documentElement.style.setProperty("--accent-soft", `${colour}18`);
}

function fieldHtml(card, field) {
  const id = `${card.uid}-${field.label.replace(/\W+/g, "-")}`;
  const saved = card.values[field.label] || "";
  const common = `id="${id}" name="${escapeHtml(field.label)}" data-label="${escapeHtml(field.label)}"`;

  if (field.type === "textarea") {
    return `<label class="field full"><span>${escapeHtml(field.label)}</span><textarea ${common}>${escapeHtml(saved)}</textarea></label>`;
  }

  if (field.type === "select") {
    return `<label class="field"><span>${escapeHtml(field.label)}</span><select ${common}>${field.options.map((option) => (
      `<option ${option === saved ? "selected" : ""}>${escapeHtml(option)}</option>`
    )).join("")}</select></label>`;
  }

  return `<label class="field"><span>${escapeHtml(field.label)}</span><input type="${field.type}" ${common} value="${escapeHtml(saved)}" ${field.type === "number" ? "step=\"any\"" : ""}></label>`;
}

function renderWorkspace() {
  if (!projectCards.length) {
    $("workspace-cards").innerHTML = `<div class="empty-state">Choose tools from the library to build a multi-step project board. Add calculators, converters, writing utilities, and decision tools together, then run them as one project.</div>`;
    updateReport();
    updateStats();
    return;
  }

  $("workspace-cards").innerHTML = `
    <div class="sheet-header" role="row">
      <div>#</div>
      <div>Tool</div>
      <div>Inputs</div>
      <div>Output</div>
      <div>Actions</div>
    </div>
  ` + projectCards.map((card, index) => {
    const tool = getTool(card.toolId);
    return `
      <article class="tool-card" data-card="${card.uid}">
        <div class="row-number">${index + 1}</div>
        <div class="tool-card-head">
          <div>
            <p class="eyebrow">${escapeHtml(tool.category)}</p>
            <h3>${escapeHtml(tool.title)}</h3>
            <p>${escapeHtml(tool.desc)}</p>
          </div>
        </div>
        <form class="tool-form">
          ${tool.fields.map((field) => fieldHtml(card, field)).join("")}
        </form>
        <div class="result">${safeOutput(card.output)}</div>
        <div class="tool-card-actions">
          <button type="button" data-action="run">Run</button>
          <button type="button" data-action="copy">Copy</button>
          <button type="button" class="remove-card" data-action="remove">Remove</button>
        </div>
      </article>
    `;
  }).join("");

  updateReport();
  updateStats();
}

function readCardValues(card) {
  const element = document.querySelector(`[data-card="${card.uid}"]`);
  if (!element) return;

  const form = element.querySelector(".tool-form");
  card.values = {};
  new FormData(form).forEach((value, key) => {
    card.values[key] = value;
  });
}

function cardFormData(card) {
  const data = new FormData();
  Object.entries(card.values).forEach(([key, value]) => data.set(key, value));
  return data;
}

function runCard(card) {
  readCardValues(card);
  const action = ACTIONS[card.toolId];
  try {
    card.output = action ? action(cardFormData(card)) : "This tool is not available.";
  } catch (error) {
    card.output = `Check the input values and try again. ${error.message || ""}`.trim();
  }
}

function runAllCards() {
  projectCards.forEach(runCard);
  renderWorkspace();
  saveProject();
}

function removeCard(uid) {
  projectCards = projectCards.filter((card) => card.uid !== uid);
  renderWorkspace();
  saveProject();
}

function copyText(text, button) {
  const done = () => {
    if (!button) return;
    const original = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => { button.textContent = original; }, 1200);
  };

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(done);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  done();
}

function buildReport() {
  const title = $("project-title").value.trim() || "Untitled Envizion project";
  const context = $("project-context")?.value.trim() || "";
  const lines = [`${title}`, `Generated by Envizion Workbench`, ""];

  if (context) {
    lines.push("Project context");
    lines.push(context);
    lines.push("");
  }

  projectCards.forEach((card, index) => {
    const tool = getTool(card.toolId);
    lines.push(`${index + 1}. ${tool.title} (${tool.category})`);
    lines.push(stripTags(card.output || "No output yet."));
    lines.push("");
  });

  return lines.join("\n").trim();
}

function updateReport() {
  $("report-output").textContent = projectCards.length ? buildReport() : "Add two or more tools to build a project report.";
}

function updateStats() {
  const ready = projectCards.filter((card) => card.output && !card.output.startsWith("Enter values")).length;
  const categories = new Set(projectCards.map((card) => getTool(card.toolId).category));
  $("stat-tools").textContent = projectCards.length;
  $("stat-run").textContent = ready;
  $("stat-categories").textContent = categories.size;
}

function saveProject() {
  const payload = {
    title: $("project-title")?.value || "Untitled Envizion project",
    context: $("project-context")?.value || "",
    cards: projectCards
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadProject() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (saved.title) $("project-title").value = saved.title;
    if (saved.context) $("project-context").value = saved.context;
    if (Array.isArray(saved.cards)) projectCards = saved.cards.filter((card) => getTool(card.toolId));
  } catch (error) {
    projectCards = [];
  }

  if (!projectCards.length) {
    TOOLS.forEach((tool) => {
      projectCards.push({
        uid: `${tool.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        toolId: tool.id,
        values: {},
        output: "Enter values, then run this tool."
      });
    });
  }
}

function stripTags(value) {
  return String(value).replace(/<[^>]+>/g, "");
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function buildCsv() {
  const rows = [["Row", "Category", "Tool", "Inputs", "Output"]];
  projectCards.forEach((card, index) => {
    const tool = getTool(card.toolId);
    const inputs = Object.entries(card.values || {}).map(([key, value]) => `${key}: ${value}`).join("; ");
    rows.push([index + 1, tool.category, tool.title, inputs, stripTags(card.output || "")]);
  });
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const ACTIONS = {
  "age-calculator": d => { const b = new Date(val(d,"Birth date")); const now = new Date(); const days = Math.max(0, Math.floor((now - b) / 86400000)); return `<strong>${Math.floor(days/365.2425)} years old</strong>\n${days.toLocaleString()} days lived.`; },
  "date-difference": d => `${Math.abs(Math.round((new Date(val(d,"End date")) - new Date(val(d,"Start date"))) / 86400000)).toLocaleString()} days between dates.`,
  "countdown-maker": d => { const days = Math.ceil((new Date(val(d,"Target date")) - new Date()) / 86400000); return `<strong>${val(d,"Event name") || "Event"}</strong>\n${days} days remaining.`; },
  "sleep-cycle": d => { const wake = val(d,"Wake time") || "07:00"; const [h,m] = wake.split(":").map(Number); const cycles = num(d,"Cycles") || 5; const date = new Date(); date.setHours(h, m - cycles * 90, 0, 0); return `Suggested bedtime: <strong>${date.toTimeString().slice(0,5)}</strong>`; },
  "water-intake": d => `${fmt(num(d,"Weight kg") * 35 + num(d,"Activity minutes") * 12,0)} mL per day estimate.`,
  "bmi-check": d => { const bmi = num(d,"Weight kg") / ((num(d,"Height cm")/100 || 1) ** 2); return `BMI: <strong>${fmt(bmi)}</strong>\nCategory: ${bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy range" : bmi < 30 ? "Overweight" : "Obesity range"}`; },
  "bmr-estimator": d => { const male = val(d,"Sex") === "Male"; const bmr = 10*num(d,"Weight kg") + 6.25*num(d,"Height cm") - 5*num(d,"Age") + (male ? 5 : -161); return `Estimated BMR: <strong>${fmt(bmr,0)} calories/day</strong>`; },
  "calorie-target": d => { const m = num(d,"Maintenance calories"); const g = val(d,"Goal"); return `Target: <strong>${fmt(g==="Lose"?m-500:g==="Gain"?m+300:m,0)} calories/day</strong>`; },
  "protein-target": d => `${fmt(num(d,"Weight kg")*1.6,0)}g to ${fmt(num(d,"Weight kg")*2.2,0)}g protein/day.`,
  "pace-calculator": d => { const mins = num(d,"Hours")*60 + num(d,"Minutes"); return `Pace: <strong>${fmt(mins/(num(d,"Distance km") || 1))} min/km</strong>\nSpeed: ${fmt(num(d,"Distance km")/((mins || 1)/60))} km/h`; },
  "study-planner": d => makeBlocks(num(d,"Total minutes"), num(d,"Block minutes"), num(d,"Break minutes")),
  "timetable-blocks": d => timeBlocks(val(d,"Start"), val(d,"End"), num(d,"Block minutes")),
  "grade-average": d => weightedLines(val(d,"Scores as score,weight")),
  "final-grade": d => `Needed on final: <strong>${fmt((num(d,"Target grade") - num(d,"Current grade")*(1-num(d,"Final weight percent")/100))/(num(d,"Final weight percent")/100))}%</strong>`,
  "gpa-calculator": d => `Average GPA: <strong>${fmt(avgNums(val(d,"GPA values")))}</strong>`,
  "cornell-notes": d => `Cues:\n- Add key questions here\n\nNotes:\n${val(d,"Notes")}\n\nSummary:\nWrite a 3 sentence summary after review.`,
  "essay-outline": d => `Topic: ${val(d,"Topic")}\nThesis: ${val(d,"Thesis")}\n\nArguments:\n${val(d,"Arguments").split(/\r?\n/).filter(Boolean).map((x,i)=>`${i+1}. ${x}`).join("\n")}\n\nConclusion: Restate thesis and connect to the wider question.`,
  "citation-builder": d => `${val(d,"Author")} (${num(d,"Year") || "n.d."}). ${val(d,"Title")}. ${val(d,"Website")}. ${val(d,"URL")}`,
  "quiz-maker": d => val(d,"Facts, one per line").split(/\r?\n/).filter(Boolean).map((x,i)=>`${i+1}. What is important about: ${x}?`).join("\n"),
  "flashcard-shuffle": d => shuffle(val(d,"Question - Answer lines").split(/\r?\n/).filter(Boolean)).join("\n"),
  "tip-split": d => { const total = num(d,"Bill")*(1+num(d,"Tip percent")/100); return `Total: $${fmt(total)}\nEach pays: <strong>$${fmt(total/(num(d,"People")||1))}</strong>`; },
  "discount-calculator": d => { const saved = num(d,"Original price")*num(d,"Discount percent")/100; return `Sale price: <strong>$${fmt(num(d,"Original price")-saved)}</strong>\nSaved: $${fmt(saved)}`; },
  "savings-goal": d => `$${fmt((num(d,"Goal amount")-num(d,"Current savings"))/(num(d,"Weeks")||1))} needed per week.`,
  "hourly-yearly": d => { const week = num(d,"Hourly rate")*num(d,"Hours per week"); return `Weekly: $${fmt(week)}\nMonthly: $${fmt(week*52/12)}\nYearly: <strong>$${fmt(week*52)}</strong>`; },
  "loan-payment": d => { const r = num(d,"Annual interest percent")/100/12; const n = num(d,"Years")*12; const p = num(d,"Loan amount"); const pay = r ? p*r/(1-(1+r)**-n) : p/(n || 1); return `Monthly payment: <strong>$${fmt(pay)}</strong>`; },
  "subscription-total": d => `Yearly cost: <strong>$${fmt(num(d,"Monthly cost")*num(d,"Subscriptions")*12)}</strong>`,
  "unit-price": d => `A: $${fmt(num(d,"Price A")/(num(d,"Units A") || 1))}/unit\nB: $${fmt(num(d,"Price B")/(num(d,"Units B") || 1))}/unit`,
  "tax-estimator": d => { const a = num(d,"Amount"), t = num(d,"Tax percent")/100; return val(d,"Mode")==="Add tax" ? `$${fmt(a*(1+t))}` : `$${fmt(a/(1+t || 1))}`; },
  "budget-ratio": d => `Needs 50%: $${fmt(num(d,"Income")*.5)}\nWants 30%: $${fmt(num(d,"Income")*.3)}\nSavings 20%: $${fmt(num(d,"Income")*.2)}`,
  "word-counter": d => { const text = val(d,"Text"); return `Words: ${text.trim()?text.trim().split(/\s+/).length:0}\nCharacters: ${text.length}\nParagraphs: ${text.split(/\n\s*\n/).filter(Boolean).length}`; },
  "reading-time": d => { const words = val(d,"Text").trim().split(/\s+/).filter(Boolean).length; return `Reading: ${fmt(words/220,1)} min\nSpeaking: ${fmt(words/140,1)} min`; },
  "case-converter": d => convertCase(val(d,"Text"), val(d,"Case")),
  "slug-generator": d => val(d,"Heading").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),
  "character-limiter": d => val(d,"Text").slice(0, num(d,"Limit") || 160),
  "password-generator": d => makePassword(num(d,"Length") || 16, val(d,"Symbols")==="Yes"),
  "duplicate-lines": d => [...new Set(val(d,"Lines").split(/\r?\n/).filter(Boolean))].join("\n"),
  "sort-lines": d => val(d,"Lines").split(/\r?\n/).filter(Boolean).sort((a,b)=>val(d,"Order")==="Z-A"?b.localeCompare(a):a.localeCompare(b)).join("\n"),
  "csv-preview": d => val(d,"CSV").split(/\r?\n/).filter(Boolean).map(line => line.split(",").map(c => c.trim()).join(" | ")).join("\n"),
  "find-replace": d => val(d,"Find") ? val(d,"Text").split(val(d,"Find")).join(val(d,"Replace")) : val(d,"Text"),
  "length-converter": d => convert(num(d,"Value"), val(d,"From"), val(d,"To"), {m:1,km:1000,mi:1609.344,ft:.3048,in:.0254}),
  "weight-converter": d => convert(num(d,"Value"), val(d,"From"), val(d,"To"), {kg:1,g:.001,lb:.453592,oz:.0283495}),
  "temperature-converter": d => temp(num(d,"Value"), val(d,"From"), val(d,"To")),
  "area-converter": d => convert(num(d,"Value"), val(d,"From"), val(d,"To"), {sqm:1,hectare:10000,acre:4046.8564224,sqft:.092903}),
  "volume-converter": d => convert(num(d,"Value"), val(d,"From"), val(d,"To"), {L:1,mL:.001,gal:3.78541,cup:.236588}),
  "speed-converter": d => convert(num(d,"Value"), val(d,"From"), val(d,"To"), {kmh:1,mph:1.60934,ms:3.6,knot:1.852}),
  "data-converter": d => convert(num(d,"Value"), val(d,"From"), val(d,"To"), {KB:1,MB:1024,GB:1048576,TB:1073741824}),
  "cooking-converter": d => convert(num(d,"Value"), val(d,"From"), val(d,"To"), {tsp:4.92892,tbsp:14.7868,cup:236.588,mL:1,L:1000}),
  "exchange-planner": d => `${fmt(num(d,"Amount")*num(d,"Exchange rate"))} converted at your entered rate.`,
  "time-offset": d => { const [h,m] = (val(d,"Time")||"00:00").split(":").map(Number); const date = new Date(); date.setHours(h + num(d,"Offset hours"), m, 0, 0); return date.toTimeString().slice(0,5); },
  "aspect-ratio": d => `New height: <strong>${fmt(num(d,"Original height")*(num(d,"New width")/(num(d,"Original width") || 1)),0)}px</strong>`,
  "contrast-checker": d => contrast(val(d,"Text hex"), val(d,"Background hex")),
  "palette-maker": d => palette(val(d,"Base hex")),
  "resize-calculator": d => `New size: <strong>${fmt(num(d,"Width")*num(d,"Scale percent")/100,0)} x ${fmt(num(d,"Height")*num(d,"Scale percent")/100,0)}</strong>`,
  "headline-variants": d => [`Why ${val(d,"Idea")} matters now`, `The honest guide to ${val(d,"Idea")}`, `${val(d,"Idea")}: what people are missing`].join("\n"),
  "caption-helper": d => `${val(d,"Tone")} caption:\n${val(d,"Topic")} - the part worth paying attention to today.`,
  "name-combiner": d => [val(d,"Word one")+val(d,"Word two"), val(d,"Word two")+val(d,"Word one"), `${val(d,"Word one")} ${val(d,"Word two")} Studio`].join("\n"),
  "random-picker": d => shuffle(val(d,"Options").split(/\r?\n/).filter(Boolean))[0] || "No options entered.",
  "decision-matrix": d => weightedLines(val(d,"Options as name,score,weight")),
  "pros-cons-score": d => `Score: ${val(d,"Pros").split(/\r?\n/).filter(Boolean).length - val(d,"Cons").split(/\r?\n/).filter(Boolean).length}\nMore positive means the pros outweigh the cons.`,
  "priority-wheel": d => val(d,"Areas as name,score").split(/\r?\n/).filter(Boolean).sort((a,b)=>(parseFloat(a.split(",")[1])||0)-(parseFloat(b.split(",")[1])||0)).join("\n"),
  "business-model": d => { const revenue = num(d,"Unit price") * num(d,"Monthly orders"); const gross = (num(d,"Unit price") - num(d,"Unit cost")) * num(d,"Monthly orders"); const net = gross - num(d,"Marketing spend") - num(d,"Fixed costs"); return `Revenue: <strong>$${fmt(revenue)}</strong>\nGross profit: $${fmt(gross)}\nNet profit: $${fmt(net)}\nNet margin: ${fmt(revenue ? net / revenue * 100 : 0)}%`; },
  "break-even": d => { const contribution = num(d,"Unit price") - num(d,"Unit variable cost"); const units = contribution > 0 ? Math.ceil(num(d,"Fixed costs") / contribution) : 0; return `Contribution per sale: $${fmt(contribution)}\nBreak-even volume: <strong>${fmt(units,0)} sales</strong>\nBreak-even revenue: $${fmt(units * num(d,"Unit price"))}`; },
  "cash-runway": d => { const burn = num(d,"Monthly expenses") - num(d,"Monthly revenue"); const months = burn > 0 ? num(d,"Cash balance") / burn : Infinity; return burn <= 0 ? `Runway: <strong>positive cash flow</strong>\nMonthly surplus: $${fmt(Math.abs(burn))}` : `Monthly burn: $${fmt(burn)}\nRunway: <strong>${fmt(months,1)} months</strong>\nReview point: ${fmt(Math.max(months - 2, 0),1)} months`; },
  "customer-ltv": d => { const gross = num(d,"Average order value") * num(d,"Gross margin percent") / 100 * num(d,"Orders per customer"); const ratio = gross / (num(d,"CAC") || 1); return `Estimated LTV: <strong>$${fmt(gross)}</strong>\nCAC: $${fmt(num(d,"CAC"))}\nLTV:CAC ratio: ${fmt(ratio,1)}x\n${ratio >= 3 ? "Healthy acquisition room." : "Tight acquisition economics."}`; },
  "campaign-planner": d => { const impressions = num(d,"Budget") / (num(d,"CPM") || 1) * 1000; const clicks = impressions * num(d,"CTR percent") / 100; const conversions = clicks * num(d,"Conversion rate percent") / 100; const revenue = conversions * num(d,"AOV"); const profit = revenue * num(d,"Margin percent") / 100 - num(d,"Budget"); return `Impressions: ${fmt(impressions,0)}\nClicks: ${fmt(clicks,0)}\nConversions: ${fmt(conversions,1)}\nRevenue: $${fmt(revenue)}\nProfit after ad spend: <strong>$${fmt(profit)}</strong>`; },
  "roas-break-even": d => { const contribution = num(d,"Sale price") - num(d,"Product cost") - num(d,"Fulfilment cost"); const spend = Math.max(contribution, 0); const roas = num(d,"Sale price") / (spend || 1); return `Contribution before ads: $${fmt(contribution)}\nMaximum ad spend per sale: <strong>$${fmt(spend)}</strong>\nBreak-even ROAS: ${fmt(roas,2)}x`; },
  "utm-builder": d => { const base = val(d,"Base URL") || "https://example.com"; const params = new URLSearchParams({ utm_source: val(d,"Source"), utm_medium: val(d,"Medium"), utm_campaign: val(d,"Campaign") }); if (val(d,"Content")) params.set("utm_content", val(d,"Content")); return `${base}${base.includes("?") ? "&" : "?"}${params.toString()}`; },
  "creator-revenue": d => { const ads = num(d,"Monthly views") / 1000 * num(d,"RPM"); const total = ads + num(d,"Sponsor revenue") + num(d,"Affiliate sales") + num(d,"Product sales"); return `Ad revenue: $${fmt(ads)}\nSponsors: $${fmt(num(d,"Sponsor revenue"))}\nAffiliate: $${fmt(num(d,"Affiliate sales"))}\nProducts: $${fmt(num(d,"Product sales"))}\nTotal monthly estimate: <strong>$${fmt(total)}</strong>`; },
  "youtube-calendar": d => youtubeCalendar(val(d,"Start date"), num(d,"Weeks"), num(d,"Uploads per week"), val(d,"Topic pillar")),
  "thumbnail-brief": d => `Video: ${val(d,"Video idea")}\nAudience: ${val(d,"Audience")}\nMain promise: ${val(d,"Promise")}\nStyle: ${val(d,"Style")}\n\nThumbnail brief:\n- One clear subject\n- 2 to 4 word visual hook\n- High contrast background\n- Expression or object that proves the promise\n\nTitle angles:\n1. ${val(d,"Promise")} for ${val(d,"Audience")}\n2. I tested ${val(d,"Video idea")} so you do not have to\n3. The honest result of ${val(d,"Video idea")}`,
  "seo-brief": d => `Keyword: ${val(d,"Primary keyword")}\nAudience: ${val(d,"Audience")}\nIntent: ${val(d,"Intent")}\n\nPage outline:\n1. Direct answer and definition\n2. Practical steps or comparison\n3. Evidence, examples, and limitations\n4. Common mistakes\n5. FAQ\n\nCompetitor gaps to cover:\n${val(d,"Competitor gaps") || "- Add original examples, screenshots, data, or field experience."}`,
  "invoice-builder": d => invoiceDraft(val(d,"Client"), val(d,"Items as description,quantity,price"), num(d,"Tax percent"), val(d,"Payment terms")),
  "inventory-reorder": d => { const daily = num(d,"Daily sales") || 1; const reorder = daily * num(d,"Lead time days") + num(d,"Safety stock"); const days = num(d,"Current stock") / daily; return `Reorder point: <strong>${fmt(reorder,0)} units</strong>\nCurrent stock lasts about ${fmt(days,1)} days.\n${num(d,"Current stock") <= reorder ? "Reorder now." : "Stock is above reorder point."}`; },
  "capacity-planner": d => { const capacity = num(d,"People") * num(d,"Hours per person") * num(d,"Focus percent") / 100; const tasks = capacity / (num(d,"Average task hours") || 1); return `Weekly delivery capacity: <strong>${fmt(capacity,1)} focused hours</strong>\nEstimated task throughput: ${fmt(tasks,1)} tasks/week`; },
  "risk-register": d => scoredRows(val(d,"Risks as name,likelihood,impact"), "Risk"),
  "data-quality-audit": d => dataAudit(val(d,"CSV or rows")),
  "json-formatter": d => jsonFormat(val(d,"JSON")),
  "regex-extractor": d => regexExtract(val(d,"Text"), val(d,"Regex pattern"), val(d,"Flags")),
  "ai-accuracy-check": d => val(d,"Claims, one per line").split(/\r?\n/).filter(Boolean).map((claim, i) => `${i + 1}. ${claim}\n   Evidence needed: primary source, date, context, counterexample check, final human review.`).join("\n") || "Add claims to verify.",
  "source-triangulator": d => sourceScore(val(d,"Rows as claim,sources,confidence"))
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
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function avgNums(text) {
  const nums = text.match(/-?\d+(\.\d+)?/g)?.map(Number) || [];
  return nums.reduce((a,b)=>a+b,0) / (nums.length || 1);
}

function weightedLines(text) {
  let total = 0, weight = 0;
  const details = [];
  text.split(/\r?\n/).filter(Boolean).forEach(line => {
    const raw = line.split(",");
    const name = raw.length > 2 ? raw[0].trim() : "Item";
    const nums = raw.map(Number).filter(n => Number.isFinite(n));
    if (nums.length >= 2) {
      total += nums[0] * nums[1];
      weight += nums[1];
      details.push(`${name}: score ${nums[0]}, weight ${nums[1]}`);
    }
  });
  return `Weighted result: <strong>${fmt(total/(weight||1))}</strong>${details.length ? `\n${details.join("\n")}` : ""}`;
}

function makeBlocks(total, block, rest) {
  let out = [], used = 0, i = 1;
  block = block || 25;
  rest = rest || 5;
  while (used + block <= total) {
    out.push(`Block ${i++}: ${block} min focus`);
    used += block;
    if (used + rest < total) {
      out.push(`Break: ${rest} min`);
      used += rest;
    }
  }
  return out.join("\n") || "Increase total minutes or reduce block length.";
}

function timeBlocks(start, end, mins) {
  const [sh,sm]=(start||"09:00").split(":").map(Number), [eh,em]=(end||"17:00").split(":").map(Number);
  const d = new Date(), stop = new Date();
  d.setHours(sh,sm,0,0); stop.setHours(eh,em,0,0);
  mins = mins || 30;
  const out = [];
  while (d < stop) {
    const s = d.toTimeString().slice(0,5);
    d.setMinutes(d.getMinutes()+mins);
    out.push(`${s} - ${d.toTimeString().slice(0,5)}`);
  }
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
  const parse = hex => {
    const clean = hex.replace("#","").padEnd(6,"0").slice(0,6);
    return clean.match(/.{2}/g).map(x=>parseInt(x,16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);
  };
  const lum = hex => { const c = parse(hex); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
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

function youtubeCalendar(start, weeks, uploads, pillar) {
  const date = start ? new Date(start) : new Date();
  const total = Math.max(1, weeks || 4) * Math.max(1, uploads || 1);
  return Array.from({ length: total }, (_, i) => {
    const publish = new Date(date);
    publish.setDate(date.getDate() + Math.floor(i / Math.max(1, uploads || 1)) * 7 + (i % Math.max(1, uploads || 1)) * 2);
    return `${publish.toISOString().slice(0,10)} - ${pillar || "Topic"} video ${i + 1}: hook, proof, thumbnail, edit, publish`;
  }).join("\n");
}

function invoiceDraft(client, rows, taxPercent, terms) {
  let subtotal = 0;
  const lines = rows.split(/\r?\n/).filter(Boolean).map((line) => {
    const [desc = "Item", qty = "1", price = "0"] = line.split(",");
    const amount = (parseFloat(qty) || 0) * (parseFloat(price) || 0);
    subtotal += amount;
    return `${desc.trim()} - ${fmt(parseFloat(qty) || 0,0)} x $${fmt(parseFloat(price) || 0)} = $${fmt(amount)}`;
  });
  const tax = subtotal * taxPercent / 100;
  return `Client: ${client || "Client"}\n${lines.join("\n") || "Add line items as description,quantity,price."}\n\nSubtotal: $${fmt(subtotal)}\nTax: $${fmt(tax)}\nTotal: <strong>$${fmt(subtotal + tax)}</strong>\nTerms: ${terms || "Due on receipt"}`;
}

function scoredRows(text, fallback) {
  const rows = text.split(/\r?\n/).filter(Boolean).map((line) => {
    const [name = fallback, a = "0", b = "0"] = line.split(",");
    const score = (parseFloat(a) || 0) * (parseFloat(b) || 0);
    return { name: name.trim(), score, a: parseFloat(a) || 0, b: parseFloat(b) || 0 };
  }).sort((x, y) => y.score - x.score);
  return rows.map((row, i) => `${i + 1}. ${row.name}: ${row.score} (${row.a} x ${row.b})`).join("\n") || "Add rows as name,likelihood,impact.";
}

function dataAudit(text) {
  const rows = text.split(/\r?\n/).filter((line) => line.trim());
  const widths = rows.map((line) => line.split(",").length);
  const duplicateCount = rows.length - new Set(rows).size;
  const missing = rows.reduce((sum, line) => sum + line.split(",").filter((cell) => !cell.trim()).length, 0);
  const widthSet = new Set(widths);
  return `Rows: ${rows.length}\nColumns detected: ${widths[0] || 0}\nDuplicate rows: ${duplicateCount}\nMissing cells: ${missing}\nRow width consistency: <strong>${widthSet.size <= 1 ? "consistent" : "inconsistent"}</strong>`;
}

function jsonFormat(text) {
  try {
    const parsed = JSON.parse(text);
    const count = Array.isArray(parsed) ? `${parsed.length} array items` : `${Object.keys(parsed || {}).length} top-level keys`;
    return `${count}\n\n${JSON.stringify(parsed, null, 2)}`;
  } catch (error) {
    return `Invalid JSON: ${error.message}`;
  }
}

function regexExtract(text, pattern, flags) {
  try {
    const safeFlags = [...new Set((flags || "g").replace(/[^gimsuy]/g, "").split(""))].join("") || "g";
    const regex = new RegExp(pattern || ".+", safeFlags.includes("g") ? safeFlags : `${safeFlags}g`);
    const matches = [...text.matchAll(regex)].map((match) => match[1] || match[0]);
    return matches.join("\n") || "No matches found.";
  } catch (error) {
    return `Invalid regular expression: ${error.message}`;
  }
}

function sourceScore(text) {
  const rows = text.split(/\r?\n/).filter(Boolean).map((line) => {
    const [claim = "Claim", sources = "0", confidence = "0"] = line.split(",");
    const score = (parseFloat(sources) || 0) * (parseFloat(confidence) || 0);
    return { claim: claim.trim(), sources: parseFloat(sources) || 0, confidence: parseFloat(confidence) || 0, score };
  }).sort((a, b) => b.score - a.score);
  return rows.map((row, i) => `${i + 1}. ${row.claim}\n   Sources: ${row.sources}, confidence: ${row.confidence}/10, evidence score: ${fmt(row.score,1)}`).join("\n") || "Add rows as claim,sources,confidence.";
}

document.addEventListener("DOMContentLoaded", () => {
  loadProject();
  renderLibrary();
  renderWorkspace();
  updateAccent(getTool(projectCards[0]?.toolId || "word-counter").category);

  $("category-tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    renderLibrary();
  });

  $("tool-buttons").addEventListener("click", (event) => {
    const button = event.target.closest("[data-tool]");
    if (!button) return;
    addTool(button.dataset.tool);
  });

  $("tool-search").addEventListener("input", (event) => {
    activeQuery = event.target.value;
    renderLibrary();
  });

  $("workspace-cards").addEventListener("input", (event) => {
    const cardElement = event.target.closest("[data-card]");
    if (!cardElement) return;
    const card = projectCards.find((item) => item.uid === cardElement.dataset.card);
    if (!card) return;
    readCardValues(card);
    saveProject();
  });

  $("workspace-cards").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const cardElement = event.target.closest("[data-card]");
    const card = projectCards.find((item) => item.uid === cardElement.dataset.card);
    if (!card) return;

    if (button.dataset.action === "run") {
      runCard(card);
      renderWorkspace();
      saveProject();
    }
    if (button.dataset.action === "copy") {
      copyText(stripTags(card.output), button);
    }
    if (button.dataset.action === "remove") {
      removeCard(card.uid);
    }
  });

  $("run-all").addEventListener("click", runAllCards);
  $("add-all").addEventListener("click", () => {
    projectCards = TOOLS.map((tool) => ({
      uid: `${tool.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      toolId: tool.id,
      values: {},
      output: "Enter values, then run this tool."
    }));
    renderWorkspace();
    saveProject();
  });
  $("copy-report").addEventListener("click", (event) => copyText(buildReport(), event.currentTarget));
  $("project-title").addEventListener("input", () => {
    updateReport();
    saveProject();
  });
  $("project-context").addEventListener("input", () => {
    updateReport();
    saveProject();
  });
  $("clear-board").addEventListener("click", () => {
    projectCards = [];
    renderWorkspace();
    saveProject();
  });
  $("export-report").addEventListener("click", () => {
    const filename = `${($("project-title").value || "envizion-project").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
    downloadFile(filename, buildReport(), "text/plain");
  });
  $("export-csv").addEventListener("click", () => {
    const filename = `${($("project-title").value || "envizion-project").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    downloadFile(filename, buildCsv(), "text/csv");
  });
});
