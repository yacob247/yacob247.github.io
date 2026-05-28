   const RAW_TOOLS = [
      ["age-calculator","Age Calculator","Planning","Calculate exact age and days lived from a birth date.","date:Birth date","=AGE(A1)"],
      ["date-difference","Date Difference","Planning","Count the time between two dates.","date:Start date|date:End date","=DATEDIFF(A1, B1)"],
      ["countdown-maker","Countdown Maker","Planning","Count down to a future event or deadline.","date:Target date|text:Event name","=COUNTDOWN(A1, \"Launch\")"],
      ["sleep-cycle","Sleep Cycle Planner","Health","Plan bedtimes around 90-minute sleep cycles.","time:Wake time|number:Cycles","=SLEEP(A1, 5)"],
      ["water-intake","Water Intake Planner","Health","Estimate daily water intake from weight and activity.","number:Weight kg|number:Activity minutes","=WATER(A1, B1)"],
      ["bmi-check","BMI Check","Health","Calculate body mass index and broad category.","number:Weight kg|number:Height cm","=BMI(A1, B1)"],
      ["bmr-estimator","BMR Estimator","Health","Estimate baseline daily calories.","number:Weight kg|number:Height cm|number:Age|select:Sex:Female,Male","=BMR(A1, B1, C1, \"Female\")"],
      ["calorie-target","Calorie Target","Health","Set a simple daily calorie target from maintenance.","number:Maintenance calories|select:Goal:Lose,Gain,Maintain","=CALORIE(A1, \"Lose\")"],
      ["protein-target","Protein Target","Health","Estimate a useful daily protein range.","number:Weight kg","=PROTEIN(A1)"],
      ["pace-calculator","Pace Calculator","Fitness","Convert distance and time into pace and speed.","number:Distance km|number:Hours|number:Minutes","=PACE(A1, B1, C1)"],
      ["study-planner","Study Session Planner","Study","Split a study block into focus and break sessions.","number:Total minutes|number:Block minutes|number:Break minutes","=STUDY(A1, 25, 5)"],
      ["timetable-blocks","Timetable Blocks","Study","Create equal time blocks between start and end.","time:Start|time:End|number:Block minutes","=TIMETABLE(A1, B1, 45)"],
      ["grade-average","Weighted Grade Average","Study","Calculate weighted marks from score,weight rows.","textarea:Scores as score,weight","=GRADEAVERAGE(A1)"],
      ["final-grade","Final Grade Needed","Study","Work out score needed on a final assessment.","number:Current grade|number:Target grade|number:Final weight percent","=FINALGRADE(A1, B1, C1)"],
      ["gpa-calculator","GPA Calculator","Study","Average GPA values from a pasted list.","textarea:GPA values","=GPACALC(A1)"],
      ["cornell-notes","Cornell Notes Builder","Study","Turn raw notes into a review-friendly structure.","textarea:Notes","=CORNELL(A1)"],
      ["essay-outline","Essay Outline Builder","Study","Create a structured essay plan.","text:Topic|text:Thesis|textarea:Arguments","=ESSAY(A1, B1, C1)"],
      ["citation-builder","Citation Builder","Study","Draft a simple source citation.","text:Author|text:Title|text:Website|text:URL|number:Year","=CITATION(A1, B1, C1, D1, E1)"],
      ["quiz-maker","Quiz Maker","Study","Generate revision questions from factual lines.","textarea:Facts","=QUIZ(A1)"],
      ["flashcard-shuffle","Flashcard Shuffler","Study","Shuffle question-answer flashcard lines.","textarea:Question-Answer lines","=FLASHCARD(A1)"],
      ["tip-split","Bill And Tip Splitter","Money","Split a bill with tip across a group.","number:Bill|number:Tip percent|number:People","=TIP(A1, 15, B1)"],
      ["discount-calculator","Discount Calculator","Money","Calculate sale price and savings.","number:Original price|number:Discount percent","=DISCOUNT(A1, B1)"],
      ["savings-goal","Savings Goal Planner","Money","Calculate weekly savings needed to reach a target.","number:Goal amount|number:Current savings|number:Weeks","=SAVINGS(A1, B1, C1)"],
      ["hourly-yearly","Hourly To Yearly Income","Money","Convert hourly pay into weekly, monthly, and yearly estimates.","number:Hourly rate|number:Hours per week","=HOURLYTOYEARLY(A1, B1)"],
      ["loan-payment","Loan Payment Estimate","Money","Estimate monthly repayment from amount, rate, and term.","number:Loan amount|number:Annual interest percent|number:Years","=LOAN(A1, B1, C1)"],
      ["subscription-total","Subscription Total","Money","Estimate yearly recurring subscription cost.","number:Monthly cost|number:Subscriptions","=SUBSCRIPTION(A1, B1)"],
      ["unit-price","Unit Price Compare","Money","Compare two prices by unit amount.","number:Price A|number:Units A|number:Price B|number:Units B","=UNITPRICE(A1, B1, C1, D1)"],
      ["tax-estimator","Tax Add Or Remove","Money","Add tax to an amount or reverse tax.","number:Amount|number:Tax percent|select:Mode:Add tax,Remove tax","=TAX(A1, B1, \"Add tax\")"],
      ["budget-ratio","Budget Ratio","Money","Split income into needs, wants, and savings.","number:Income","=BUDGET(A1)"],
      ["word-counter","Word Counter","Writing","Count words, characters, and paragraphs.","textarea:Text","=WORDCOUNT(A1)"],
      ["reading-time","Reading And Speaking Time","Writing","Estimate reading and speaking duration.","textarea:Text","=READINGTIME(A1)"],
      ["case-converter","Case Converter","Writing","Convert text to title, sentence, upper, lower, etc.","textarea:Text|select:Case:Title,Sentence,Upper,Lower,Alternating","=CASECONVERT(A1, \"Title\")"],
      ["slug-generator","Slug Generator","Writing","Create a clean URL slug from text.","text:Heading","=SLUG(A1)"],
      ["character-limiter","Character Limiter","Writing","Trim text to a target character limit.","textarea:Text|number:Limit","=CHARLIMIT(A1, 160)"],
      ["password-generator","Password Generator","Security","Generate a clean temporary password.","number:Length|select:Symbols:Yes,No","=PASSWORD(A1, \"Yes\")"],
      ["duplicate-lines","Duplicate Line Remover","Data","Remove repeated lines from lists.","textarea:Lines","=UNIQUE(A1)"],
      ["sort-lines","Sort Lines","Data","Sort lines alphabetically.","textarea:Lines|select:Order:A-Z,Z-A","=SORTLINES(A1, \"A-Z\")"],
      ["csv-preview","CSV Preview","Data","Preview simple CSV rows as columns.","textarea:CSV","=CSVPREVIEW(A1)"],
      ["find-replace","Find And Replace","Data","Replace exact phrases in pasted text.","textarea:Text|text:Find|text:Replace","=REPLACEPHRASE(A1, B1, C1)"],
      ["length-converter","Length Converter","Converter","Convert between m, km, mi, ft, in.","number:Value|select:From:m,km,mi,ft,in|select:To:m,km,mi,ft,in","=CONVERTLENGTH(A1, \"m\", \"ft\")"],
      ["weight-converter","Weight Converter","Converter","Convert between kg, g, lb, oz.","number:Value|select:From:kg,g,lb,oz|select:To:kg,g,lb,oz","=CONVERTWEIGHT(A1, \"kg\", \"lb\")"],
      ["temperature-converter","Temperature Converter","Converter","Convert C, F, K.","number:Value|select:From:C,F,K|select:To:C,F,K","=CONVERTTEMP(A1, \"C\", \"F\")"],
      ["area-converter","Area Converter","Converter","Convert common area units.","number:Value|select:From:sqm,hectare,acre,sqft|select:To:sqm,hectare,acre,sqft","=CONVERTAREA(A1, \"sqm\", \"acre\")"],
      ["volume-converter","Volume Converter","Converter","Convert common liquid volume units.","number:Value|select:From:L,mL,gal,cup|select:To:L,mL,gal,cup","=CONVERTVOLUME(A1, \"L\", \"gal\")"],
      ["speed-converter","Speed Converter","Converter","Convert common speed units.","number:Value|select:From:kmh,mph,ms,knot|select:To:kmh,mph,ms,knot","=CONVERTSPEED(A1, \"kmh\", \"mph\")"],
      ["data-converter","Data Storage Converter","Converter","Convert storage units using binary.","number:Value|select:From:KB,MB,GB,TB|select:To:KB,MB,GB,TB","=CONVERTDATA(A1, \"GB\", \"MB\")"],
      ["cooking-converter","Cooking Converter","Converter","Convert tsp, tbsp, cup, mL, L.","number:Value|select:From:tsp,tbsp,cup,mL,L|select:To:tsp,tbsp,cup,mL,L","=CONVERTCOOKING(A1, \"cup\", \"mL\")"],
      ["exchange-planner","Exchange Planner","Travel","Convert money with your own exchange rate.","number:Amount|number:Exchange rate","=EXCHANGE(A1, B1)"],
      ["time-offset","Time Offset","Travel","Shift a time forward or backward.","time:Time|number:Offset hours","=TIMEOFFSET(A1, B1)"],
      ["aspect-ratio","Aspect Ratio","Design","Calculate proportional height from new width.","number:Original width|number:Original height|number:New width","=ASPECT(A1, B1, C1)"],
      ["contrast-checker","Contrast Checker","Design","Check text/background contrast ratio.","text:Text hex|text:Background hex","=CONTRAST(A1, B1)"],
      ["palette-maker","Palette Maker","Design","Generate simple palette from base hex.","text:Base hex","=PALETTE(A1)"],
      ["resize-calculator","Image Resize Calculator","Design","Scale image dimensions by percentage.","number:Width|number:Height|number:Scale percent","=RESIZE(A1, B1, C1)"],
      ["headline-variants","Headline Variants","Creator","Generate 3 practical headline angles.","text:Idea","=HEADLINES(A1)"],
      ["caption-helper","Caption Helper","Creator","Draft social caption from topic & tone.","text:Topic|select:Tone:Clear,Funny,Professional","=CAPTION(A1, \"Clear\")"],
      ["name-combiner","Name Combiner","Creator","Combine words into naming options.","text:Word one|text:Word two","=NAMECOMBINE(A1, B1)"],
      ["random-picker","Random Picker","Decision","Pick one option from a pasted list.","textarea:Options","=RANDOMPICK(A1)"],
      ["decision-matrix","Decision Matrix","Decision","Score weighted options using name,score,weight.","textarea:Options as name,score,weight","=DECISIONMATRIX(A1)"],
      ["pros-cons-score","Pros And Cons Scorer","Decision","Compare counts of pros and cons in lists.","textarea:Pros|textarea:Cons","=PROSCONS(A1, B1)"],
      ["priority-wheel","Priority Wheel","Decision","Sort areas by score to find weaknesses.","textarea:Areas as name,score","=PRIORITYWHEEL(A1)"],
      ["business-model","Business Model Sheet","Business","Estimate revenue, gross/net profit & margins.","number:Unit price|number:Unit cost|number:Monthly orders|number:Marketing spend|number:Fixed costs","=BIZMODEL(A1, B1, C1, D1, E1)"],
      ["break-even","Break-even Planner","Business","Find break-even sales volume.","number:Fixed costs|number:Unit price|number:Unit variable cost","=BREAKEVEN(A1, B1, C1)"],
      ["cash-runway","Cash Runway","Business","Estimate cash runway months from burn.","number:Cash balance|number:Monthly revenue|number:Monthly expenses","=RUNWAY(A1, B1, C1)"],
      ["customer-ltv","LTV And CAC Planner","Business","Estimate lifetime value vs acquisition cost.","number:Average order value|number:Gross margin percent|number:Orders per customer|number:CAC","=LTVCAC(A1, B1, C1, D1)"],
      ["campaign-planner","Ad Campaign Planner","Marketing","Forecast impressions, clicks, conversions, revenue, profit.","number:Budget|number:CPM|number:CTR percent|number:Conversion rate percent|number:AOV|number:Margin percent","=CAMPAIGN(A1, B1, C1, D1, E1, F1)"],
      ["roas-break-even","Break-even ROAS","Marketing","Calculate minimum target ROAS.","number:Sale price|number:Product cost|number:Fulfilment cost","=ROAS(A1, B1, C1)"],
      ["utm-builder","UTM Link Builder","Marketing","Build analytics-ready campaign URLs.","text:Base URL|text:Source|text:Medium|text:Campaign|text:Content","=UTM(A1, \"Google\", \"CPC\", \"Promo\")"],
      ["creator-revenue","Creator Revenue Model","Creator","Estimate monthly revenue across ads/sponsors.","number:Monthly views|number:RPM|number:Sponsor revenue|number:Affiliate sales|number:Product sales","=CREATORREV(A1, B1, C1, D1, E1)"],
      ["youtube-calendar","YouTube Calendar","Creator","Generate content publishing calendar.","date:Start date|number:Weeks|number:Uploads per week|text:Topic pillar","=YOUTUBECAL(A1, B1, C1, \"Tech\")"],
      ["thumbnail-brief","Thumbnail Brief","Creator","Draft thumbnail strategy from video concept.","text:Video idea|text:Audience|text:Promise|select:Style:Clean,Bold,Documentary,Comparison","=THUMBNAIL(A1, B1, C1, \"Bold\")"],
      ["seo-brief","SEO Brief Builder","Marketing","Create page architecture for search topic.","text:Primary keyword|text:Audience|select:Intent:Informational,Commercial,Transactional,Navigation|textarea:Competitor gaps","=SEOBRIEF(A1, B1, \"Informational\", C1)"],
      ["invoice-builder","Invoice Draft Builder","Business","Draft invoice totals from details.","text:Client|textarea:Items as description,quantity,price|number:Tax percent|text:Payment terms","=INVOICE(A1, B1, 10)"],
      ["inventory-reorder","Inventory Reorder Planner","Operations","Calculate reorder threshold trigger.","number:Current stock|number:Daily sales|number:Lead time days|number:Safety stock","=REORDER(A1, B1, C1, D1)"],
      ["capacity-planner","Operations Capacity Planner","Operations","Estimate human resource project bandwidth.","number:People|number:Hours per person|number:Focus percent|number:Average task hours","=CAPACITY(A1, B1, C1, D1)"],
      ["risk-register","Risk Register Builder","Operations","Evaluate list of risks and categorize.","textarea:Risks as name,likelihood,impact","=RISKREGISTER(A1)"],
      ["data-quality-audit","Data Quality Audit","Data","Scan columns for anomalies or empty fields.","textarea:CSV or rows","=DATAAUDIT(A1)"],
      ["json-formatter","JSON Formatter","Data","Format and validate JSON blocks.","textarea:JSON","=JSONFORMAT(A1)"],
      ["regex-extractor","Regex Extractor","Data","Extract matches based on pattern.","textarea:Text|text:Regex pattern|select:Flags:g,gi,gm,gim","=REGEXEXTRACT(A1, \"[0-9]+\")"],
      ["ai-accuracy-check","AI Accuracy Checklist","Research","Produce verifications list from assertions.","textarea:Claims, one per line","=AIACCURACY(A1)"],
      ["source-triangulator","Source Triangulator","Research","Score assertions by source abundance.","textarea:Rows as claim,sources,confidence","=SOURCETRIANGULATE(A1)"]
    ];

    const CATEGORY_COLOURS = {
      Planning: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 border-blue-300",
      Health: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200 border-teal-300",
      Fitness: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200 border-orange-300",
      Study: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200 border-teal-300",
      Money: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-300",
      Writing: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200 border-purple-300",
      Data: "bg-slate-100 text-slate-800 dark:bg-slate-850 dark:text-slate-200 border-slate-300",
      Security: "bg-neutral-100 text-neutral-800 dark:bg-neutral-850 dark:text-neutral-200 border-neutral-300",
      Converter: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border-rose-300",
      Travel: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border-amber-300",
      Design: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200 border-indigo-300",
      Creator: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200 border-orange-300",
      Decision: "bg-stone-100 text-stone-800 dark:bg-stone-850 dark:text-stone-200 border-stone-300",
      Business: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200 border-cyan-300",
      Marketing: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200 border-pink-300",
      Operations: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 border-blue-300",
      Research: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200 border-yellow-300"
    };

    // Parse RAW_TOOLS into Structured Object
    const TOOLS = RAW_TOOLS.map(([id, title, category, desc, fields, exampleFormula]) => {
      const parsedFields = fields.split("|").map(def => {
        const [type, label, options] = def.split(":");
        return { type, label, options: options ? options.split(",") : [] };
      });
      return { id, title, category, desc, fields: parsedFields, exampleFormula };
    });

    // -------------------------------------------------------------------------
    // SPREADSHEET STATE
    // -------------------------------------------------------------------------
    const COLUMNS = "ABCDEFGHIJKLMNOPQRST".split(""); // 20 Columns
    const ROW_COUNT = 50;                             // 50 Rows
    
    // We store multiple sheets in an object
    let sheets = {
      "Sheet 1": {},
      "Sheet 2": {},
      "Sheet 3": {}
    };
    let activeSheet = "Sheet 1";

    let selectedCell = "A1";
    let isEditing = false;
    let dragStart = null;
    let selectedRange = null; // e.g., {startCol: 0, startRow: 0, endCol: 3, endRow: 5}

    // History for Undo/Redo
    let historyUndo = [];
    let historyRedo = [];
    const LEGACY_STORAGE_KEY = "envizion_excel_sheets";
    const WORKBOOK_INDEX_KEY = "envizion_excel_workbooks";
    const LAST_WORKBOOK_KEY = "envizion_excel_last_workbook";
    let currentWorkbookId = null;

    // Helper functions for formatting
    const fmt = (n, d = 2) => Number.isFinite(n) ? Number(n).toLocaleString(undefined, { maximumFractionDigits: d }) : "0";

    // -------------------------------------------------------------------------
    // SYSTEM SETUP ONLOAD
    // -------------------------------------------------------------------------
    window.onload = async function() {
      // Initialize Lucide icons
      lucide.createIcons();

      const sharedWorkbookId = getShareIdFromUrl();
      if (sharedWorkbookId) {
        currentWorkbookId = await importSharedWorkbook(sharedWorkbookId);
        if (currentWorkbookId) {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("share");
          cleanUrl.searchParams.set("file", currentWorkbookId);
          window.history.replaceState({}, "", cleanUrl.toString());
        }
      }

      currentWorkbookId = currentWorkbookId || getWorkbookIdFromUrl() || localStorage.getItem(LAST_WORKBOOK_KEY) || ensureDefaultWorkbook();

      // Check LocalStorage
      const saved = localStorage.getItem(getWorkbookStorageKey(currentWorkbookId)) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          sheets = parsed.sheets || sheets;
          activeSheet = parsed.activeSheet || activeSheet;
          const projTitle = document.getElementById("project-title");
          if(parsed.title) projTitle.value = parsed.title;
        } catch(e) {}
      }

      // Generate elements
      renderSheetTabs();
      renderGrid();
      renderAddonsList();
      renderFormulaGlossary();

      // Setup global key/click listeners for spreadsheet grid interaction
      document.addEventListener("keydown", handleGlobalKeyDown);
      document.getElementById("formula-bar-input").addEventListener("input", handleFormulaBarInput);
      document.getElementById("formula-bar-input").addEventListener("keydown", handleFormulaBarKeyDown);
      document.getElementById("addon-search").addEventListener("input", filterAddons);

      // Save title changes
      document.getElementById("project-title").addEventListener("input", saveToLocalStorage);
      syncWorkbookIndex();

      // Detect Theme
      if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        document.getElementById("theme-sun").classList.remove("hidden");
        document.getElementById("theme-moon").classList.add("hidden");
      }
    };

    // -------------------------------------------------------------------------
    // LOCAL STORAGE & HISTORY (UNDO/REDO)
    // -------------------------------------------------------------------------
    function getWorkbookIdFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("file");
      return id && /^[a-zA-Z0-9_-]+$/.test(id) ? id : null;
    }

    function getShareIdFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("share");
      return id && /^[a-zA-Z0-9_-]+$/.test(id) ? id : null;
    }

    function getWorkbookStorageKey(id) {
      return `envizion_excel_workbook_${id}`;
    }

    function makeWorkbookId() {
      return `wb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    function readWorkbookIndex() {
      try {
        return JSON.parse(localStorage.getItem(WORKBOOK_INDEX_KEY) || "[]");
      } catch (error) {
        return [];
      }
    }

    function writeWorkbookIndex(items) {
      localStorage.setItem(WORKBOOK_INDEX_KEY, JSON.stringify(items));
    }

    function getShareDb() {
      if (!window.firebase || !window.ENVIZION_FIREBASE_CONFIG) return null;
      if (!firebase.apps.length) firebase.initializeApp(window.ENVIZION_FIREBASE_CONFIG);
      return firebase.firestore();
    }

    function getCurrentWorkbookData() {
      const title = document.getElementById("project-title")?.value || "Untitled workbook";
      return {
        sheets,
        activeSheet,
        title
      };
    }

    async function importSharedWorkbook(shareId) {
      const db = getShareDb();
      if (!db) {
        alert("This shared workbook could not be opened because Firebase did not load.");
        return null;
      }
      try {
        const snap = await db.collection("lifeToolWorkbookShares").doc(shareId).get();
        if (!snap.exists) {
          alert("This shared workbook link was not found.");
          return null;
        }
        const shared = snap.data();
        const data = shared.data;
        if (!data?.sheets) {
          alert("This shared workbook is missing workbook data.");
          return null;
        }
        const id = makeWorkbookId();
        const now = new Date().toISOString();
        const title = `${data.title || shared.title || "Shared workbook"} copy`;
        const copyData = {
          sheets: data.sheets,
          activeSheet: data.activeSheet || "Sheet 1",
          title
        };
        localStorage.setItem(getWorkbookStorageKey(id), JSON.stringify(copyData));
        writeWorkbookIndex([{ id, title, createdAt: now, updatedAt: now }, ...readWorkbookIndex()]);
        localStorage.setItem(LAST_WORKBOOK_KEY, id);
        return id;
      } catch (error) {
        alert("Could not open this shared workbook. Check the link or try again later.");
        return null;
      }
    }

    function ensureDefaultWorkbook() {
      const existing = readWorkbookIndex()[0];
      if (existing?.id) return existing.id;

      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      const id = makeWorkbookId();
      const now = new Date().toISOString();
      const title = "Envizion Excel Workbench";
      writeWorkbookIndex([{ id, title, createdAt: now, updatedAt: now }]);
      localStorage.setItem(LAST_WORKBOOK_KEY, id);
      if (legacy) {
        localStorage.setItem(getWorkbookStorageKey(id), legacy);
      } else {
        localStorage.setItem(getWorkbookStorageKey(id), JSON.stringify({
          sheets: { "Sheet 1": {} },
          activeSheet: "Sheet 1",
          title
        }));
      }
      return id;
    }

    function syncWorkbookIndex() {
      const title = document.getElementById("project-title")?.value || "Untitled workbook";
      const now = new Date().toISOString();
      const index = readWorkbookIndex();
      const existing = index.find((item) => item.id === currentWorkbookId);
      const nextItem = {
        id: currentWorkbookId,
        title,
        createdAt: existing?.createdAt || now,
        updatedAt: now
      };
      writeWorkbookIndex([nextItem, ...index.filter((item) => item.id !== currentWorkbookId)]);
      localStorage.setItem(LAST_WORKBOOK_KEY, currentWorkbookId);
    }

    function createNewWorkbookFromApp() {
      const title = prompt("Name this workbook", "Untitled workbook") || "Untitled workbook";
      const id = makeWorkbookId();
      const now = new Date().toISOString();
      const data = {
        sheets: { "Sheet 1": {} },
        activeSheet: "Sheet 1",
        title
      };
      localStorage.setItem(getWorkbookStorageKey(id), JSON.stringify(data));
      writeWorkbookIndex([{ id, title, createdAt: now, updatedAt: now }, ...readWorkbookIndex()]);
      localStorage.setItem(LAST_WORKBOOK_KEY, id);
      window.location.href = `life-tools.html?file=${encodeURIComponent(id)}`;
    }

    function renameCurrentWorkbook() {
      const titleInput = document.getElementById("project-title");
      const currentTitle = titleInput?.value || "Untitled workbook";
      const nextTitle = prompt("Rename this workbook", currentTitle);
      if (!nextTitle || !nextTitle.trim()) return;
      titleInput.value = nextTitle.trim();
      saveToLocalStorage();
    }

    function copyCurrentWorkbook() {
      saveToLocalStorage();
      const data = getCurrentWorkbookData();
      const id = makeWorkbookId();
      const now = new Date().toISOString();
      const title = `${data.title || "Untitled workbook"} copy`;
      localStorage.setItem(getWorkbookStorageKey(id), JSON.stringify({ ...data, title }));
      writeWorkbookIndex([{ id, title, createdAt: now, updatedAt: now }, ...readWorkbookIndex()]);
      localStorage.setItem(LAST_WORKBOOK_KEY, id);
      window.location.href = `life-tools.html?file=${encodeURIComponent(id)}`;
    }

    async function shareCurrentWorkbookByEmail() {
      saveToLocalStorage();
      const db = getShareDb();
      if (!db) {
        alert("Sharing is not available because Firebase did not load.");
        return;
      }
      const data = getCurrentWorkbookData();
      try {
        const doc = await db.collection("lifeToolWorkbookShares").add({
          title: data.title || "Untitled workbook",
          data,
          sourceId: currentWorkbookId,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        const shareUrl = new URL("life-tools.html", window.location.href);
        shareUrl.searchParams.set("share", doc.id);
        const subject = encodeURIComponent(`Envizion workbook: ${data.title || "Untitled workbook"}`);
        const body = encodeURIComponent(`Open this link to make your own local copy of the workbook:\n\n${shareUrl.toString()}`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
      } catch (error) {
        alert("Could not create the share link. Check Firebase rules or try again later.");
      }
    }

    function saveStateForHistory() {
      historyUndo.push(JSON.stringify(sheets));
      historyRedo = []; // clear redo on new action
    }

    function undo() {
      if (historyUndo.length > 0) {
        historyRedo.push(JSON.stringify(sheets));
        sheets = JSON.parse(historyUndo.pop());
        renderGrid();
        saveToLocalStorage();
      }
    }

    function redo() {
      if (historyRedo.length > 0) {
        historyUndo.push(JSON.stringify(sheets));
        sheets = JSON.parse(historyRedo.pop());
        renderGrid();
        saveToLocalStorage();
      }
    }

    function saveToLocalStorage() {
      const projTitle = document.getElementById("project-title").value;
      if (!currentWorkbookId) currentWorkbookId = ensureDefaultWorkbook();
      localStorage.setItem(getWorkbookStorageKey(currentWorkbookId), JSON.stringify(getCurrentWorkbookData()));
      syncWorkbookIndex();
    }

    // -------------------------------------------------------------------------
    // THEME TOGGLE
    // -------------------------------------------------------------------------
    function toggleTheme() {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      
      const sun = document.getElementById("theme-sun");
      const moon = document.getElementById("theme-moon");
      if (isDark) {
        sun.classList.remove("hidden");
        moon.classList.add("hidden");
      } else {
        sun.classList.add("hidden");
        moon.classList.remove("hidden");
      }
    }

    // -------------------------------------------------------------------------
    // SPREADSHEET RENDER ENGINE
    // -------------------------------------------------------------------------
    function renderGrid() {
      const grid = document.getElementById("excel-grid");
      const activeData = sheets[activeSheet] || {};
      
      let html = `<div class="grid select-none border-collapse overflow-auto" style="grid-template-columns: 45px repeat(${COLUMNS.length}, minmax(90px, 1fr));">`;
      
      // 1. TOP CORNER EMPTY CELL & HEADER COLUMN LABELS (A, B, C...)
      html += `<div class="bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-300 dark:border-slate-700 h-7 flex items-center justify-center font-mono font-bold text-slate-500 dark:text-slate-400 text-xs sticky top-0 left-0 z-20"></div>`;
      
      COLUMNS.forEach((col, cIdx) => {
        html += `
          <div id="col-${cIdx}" class="bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-300 dark:border-slate-700 h-7 flex items-center justify-center font-mono font-bold text-slate-500 dark:text-slate-400 text-xs sticky top-0 z-10 transition-colors">
            ${col}
          </div>
        `;
      });

      // 2. ROWS
      for (let r = 1; r <= ROW_COUNT; r++) {
        // Row label sidebar indicator (1, 2, 3...)
        html += `
          <div id="row-${r}" class="bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-300 dark:border-slate-700 w-11 h-7 flex items-center justify-center font-mono font-bold text-slate-500 dark:text-slate-400 text-xs sticky left-0 z-10 transition-colors">
            ${r}
          </div>
        `;

        COLUMNS.forEach((col, cIdx) => {
          const coord = `${col}${r}`;
          const cellObj = activeData[coord] || { value: "", formula: "", style: {} };
          
          // Evaluate standard formula if starting with '='
          const evaluatedVal = evaluateCell(coord);
          
          // Style assembly
          const style = cellObj.style || {};
          let styleStr = "";
          if (style.bold) styleStr += "font-weight: bold;";
          if (style.italic) styleStr += "font-style: italic;";
          if (style.underline) styleStr += "text-decoration: underline;";
          if (style.bgColor) styleStr += `background-color: ${style.bgColor};`;
          if (style.textColor) styleStr += `color: ${style.textColor};`;
          if (style.align) {
            styleStr += `text-align: ${style.align};`;
          } else {
            styleStr += "text-align: left;";
          }

          // Build classes
          const isSelected = (coord === selectedCell);
          const cellClass = `border-r border-b border-slate-200 dark:border-slate-800 h-7 px-1.5 flex items-center font-mono text-xs cursor-pointer overflow-hidden whitespace-nowrap transition-all select-none text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 ${isSelected ? 'grid-cell-selected bg-blue-50 dark:bg-blue-950/20' : ''}`;
          
          // Align utility wrapper class
          let justifyClass = "justify-start";
          if (style.align === "center") justifyClass = "justify-center";
          if (style.align === "right") justifyClass = "justify-end";

          html += `
            <div 
              id="cell-${coord}" 
              data-coord="${coord}" 
              onclick="selectCell('${coord}')" 
              ondblclick="editCell('${coord}')"
              class="${cellClass} ${justifyClass}"
              style="${styleStr}"
              title="Formula: ${cellObj.formula || cellObj.value}"
            >
              ${evaluatedVal}
            </div>
          `;
        });
      }

      html += `</div>`;
      grid.innerHTML = html;

      // Update calculations stats panel if cell selection exists
      updateHighlightHeaders();
      updateSelectedCellLabel();
    }

    // -------------------------------------------------------------------------
    // EVALUATION ENGINE (FORMULA RUNNER + 70 CUSTOM FORMULAS)
    // -------------------------------------------------------------------------
    function getRawValue(coord) {
      const activeData = sheets[activeSheet] || {};
      return activeData[coord] ? activeData[coord].value : "";
    }

    function evaluateCell(coord, visited = new Set()) {
      if (visited.has(coord)) return "#REF!"; // Circular reference guard
      
      const activeData = sheets[activeSheet] || {};
      const cellObj = activeData[coord];
      if (!cellObj) return "";

      const raw = String(cellObj.value || "");
      if (!raw.startsWith("=")) {
        return raw;
      }

      visited.add(coord);
      try {
        const formula = raw.substring(1).trim();
        return parseAndSolveFormula(formula, visited);
      } catch (e) {
        return "#VALUE!";
      }
    }

    // Custom functions mapped to excel formulas
    function parseAndSolveFormula(formulaStr, visited) {
      // 1. Standard Aggregations: SUM, AVERAGE, MIN, MAX, COUNT
      // Match SUM(A1:B3) etc.
      const aggRegex = /(SUM|AVERAGE|MIN|MAX|COUNT)\(([A-Z]+[0-9]+):([A-Z]+[0-9]+)\)/i;
      let match;
      while ((match = aggRegex.exec(formulaStr)) !== null) {
        const funcName = match[1].toUpperCase();
        const startCell = match[2];
        const endCell = match[3];
        const cellsInRange = getRangeCells(startCell, endCell);
        
        const vals = cellsInRange.map(c => {
          const v = parseFloat(evaluateCell(c, new Set(visited)));
          return isNaN(v) ? 0 : v;
        });

        let res = 0;
        if (funcName === "SUM") res = vals.reduce((a, b) => a + b, 0);
        if (funcName === "AVERAGE") res = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        if (funcName === "MIN") res = Math.min(...vals);
        if (funcName === "MAX") res = Math.max(...vals);
        if (funcName === "COUNT") res = vals.length;

        formulaStr = formulaStr.replace(match[0], res);
      }

      // 2. Custom Advanced Envizion Handlers
      // E.g., =BMI(A1, B1) or =BMI(72, 180)
      const customFormulaRegex = /([A-Z_]+)\(([^)]*)\)/i;
      while ((match = customFormulaRegex.exec(formulaStr)) !== null) {
        const funcName = match[1].toUpperCase();
        const rawArgs = match[2].split(",").map(arg => arg.trim());
        
        // Resolve arguments (could be literal or cell reference)
        const args = rawArgs.map(arg => {
          // Check if argument is a cell reference
          if (/^[A-Z]+[0-9]+$/i.test(arg)) {
            return evaluateCell(arg.toUpperCase(), new Set(visited));
          }
          // Remove wrapping quotes if text literal
          if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
            return arg.substring(1, arg.length - 1);
          }
          return arg;
        });

        const calculatedVal = runCustomFormula(funcName, args);
        formulaStr = formulaStr.replace(match[0], calculatedVal);
      }

      // 3. Resolve Individual Standard Cell References (e.g., A1, B4)
      const cellRefRegex = /\b([A-Z]+[0-9]+)\b/i;
      while ((match = cellRefRegex.exec(formulaStr)) !== null) {
        const ref = match[1].toUpperCase();
        const refVal = parseFloat(evaluateCell(ref, new Set(visited)));
        formulaStr = formulaStr.replace(match[0], isNaN(refVal) ? 0 : refVal);
      }

      // 4. Solve residual standard algebraic arithmetic securely
      // Allow only numbers, operators, brackets, and spaces
      const cleanFormula = formulaStr.replace(/[^0-9.+\-*/() ]/g, "");
      try {
        const finalVal = new Function(`return ${cleanFormula}`)();
        return typeof finalVal === 'number' ? parseFloat(finalVal.toFixed(4)) : finalVal;
      } catch (e) {
        return "#ERROR!";
      }
    }

    function getRangeCells(start, end) {
      const sCol = start.match(/[A-Z]+/i)[0].toUpperCase();
      const sRow = parseInt(start.match(/[0-9]+/)[0]);
      const eCol = end.match(/[A-Z]+/i)[0].toUpperCase();
      const eRow = parseInt(end.match(/[0-9]+/)[0]);

      const scIdx = COLUMNS.indexOf(sCol);
      const ecIdx = COLUMNS.indexOf(eCol);

      const minCol = Math.min(scIdx, ecIdx);
      const maxCol = Math.max(scIdx, ecIdx);
      const minRow = Math.min(sRow, eRow);
      const maxRow = Math.max(sRow, eRow);

      const list = [];
      for (let c = minCol; c <= maxCol; c++) {
        for (let r = minRow; r <= maxRow; r++) {
          list.push(`${COLUMNS[c]}${r}`);
        }
      }
      return list;
    }

    // -------------------------------------------------------------------------
    // DYNAMIC EXECUTION ENGINE FOR CUSTOM ENVIZION FUNCTIONS
    // -------------------------------------------------------------------------
    function runCustomFormula(name, args) {
      const getNum = (v) => parseFloat(v) || 0;
      const getStr = (v) => String(v ?? "").trim();
      
      switch (name) {
        case "BMI": {
          const w = getNum(args[0]), h = getNum(args[1]);
          if (!w || !h) return "Missing inputs";
          const bmi = w / ((h / 100) ** 2);
          const cat = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy" : bmi < 30 ? "Overweight" : "Obese";
          return `${bmi.toFixed(1)} (${cat})`;
        }
        case "BMR": {
          const w = getNum(args[0]), h = getNum(args[1]), a = getNum(args[2]), sex = getStr(args[3]);
          const base = 10 * w + 6.25 * h - 5 * a;
          const bmr = sex.toLowerCase() === "male" ? base + 5 : base - 161;
          return `${Math.round(bmr)} kcal`;
        }
        case "AGE": {
          const bDate = new Date(getStr(args[0]));
          if (isNaN(bDate)) return "Invalid birthdate";
          const diff = Math.max(0, Math.floor((new Date() - bDate) / 86400000));
          return `${Math.floor(diff/365.2425)} yrs (${diff.toLocaleString()} days)`;
        }
        case "DATEDIFF": {
          const d1 = new Date(getStr(args[0])), d2 = new Date(getStr(args[1]));
          if(isNaN(d1) || isNaN(d2)) return "Invalid dates";
          return `${Math.abs(Math.round((d2 - d1) / 86400000))} days`;
        }
        case "COUNTDOWN": {
          const d = new Date(getStr(args[0])), ev = getStr(args[1]) || "Event";
          if (isNaN(d)) return "Invalid date";
          const days = Math.ceil((d - new Date()) / 86400000);
          return `${ev}: ${days} days left`;
        }
        case "SLEEP": {
          const wake = getStr(args[0]) || "07:00", cycles = getNum(args[1]) || 5;
          const [h, m] = wake.split(":").map(Number);
          const date = new Date();
          date.setHours(h, m - cycles * 90, 0, 0);
          return `Bed at ${date.toTimeString().slice(0, 5)}`;
        }
        case "WATER": {
          return `${Math.round(getNum(args[0]) * 35 + getNum(args[1]) * 12)} mL`;
        }
        case "CALORIE": {
          const m = getNum(args[0]), goal = getStr(args[1]).toLowerCase();
          return `${Math.round(goal === "lose" ? m - 500 : goal === "gain" ? m + 300 : m)} kcal`;
        }
        case "PROTEIN": {
          const w = getNum(args[0]);
          return `${Math.round(w * 1.6)}g - ${Math.round(w * 2.2)}g`;
        }
        case "PACE": {
          const dist = getNum(args[0]), hrs = getNum(args[1]), mins = getNum(args[2]);
          const totalMins = hrs * 60 + mins;
          if(!dist) return "0 min/km";
          return `${(totalMins / dist).toFixed(2)} min/km`;
        }
        case "STUDY": {
          const total = getNum(args[0]), block = getNum(args[1]) || 25, rest = getNum(args[2]) || 5;
          let blocks = Math.floor(total / (block + rest));
          return `${blocks} focused sessions`;
        }
        case "FINALGRADE": {
          const curr = getNum(args[0]), tar = getNum(args[1]), w = getNum(args[2]) / 100;
          if (!w) return "N/A";
          return `${((tar - curr * (1 - w)) / w).toFixed(1)}% needed`;
        }
        case "TIP": {
          const bill = getNum(args[0]), tip = getNum(args[1]), people = getNum(args[2]) || 1;
          const total = bill * (1 + tip / 100);
          return `Total: $${total.toFixed(2)} (Each: $${(total / people).toFixed(2)})`;
        }
        case "DISCOUNT": {
          const p = getNum(args[0]), disc = getNum(args[1]);
          const saved = p * (disc / 100);
          return `Sale: $${(p - saved).toFixed(2)} (Saved $${saved.toFixed(2)})`;
        }
        case "SAVINGS": {
          const g = getNum(args[0]), curr = getNum(args[1]), w = getNum(args[2]) || 1;
          return `$${((g - curr) / w).toFixed(2)}/wk`;
        }
        case "HOURLYTOYEARLY": {
          const rate = getNum(args[0]), hours = getNum(args[1]);
          return `$${(rate * hours * 52).toLocaleString()}/yr`;
        }
        case "LOAN": {
          const p = getNum(args[0]), r = getNum(args[1]) / 100 / 12, n = getNum(args[2]) * 12;
          if (!r) return `$${(p / n).toFixed(2)}`;
          const pay = p * r / (1 - (1 + r) ** -n);
          return `$${pay.toFixed(2)}/mo`;
        }
        case "SUBSCRIPTION": {
          return `$${(getNum(args[0]) * getNum(args[1]) * 12).toFixed(2)}/yr`;
        }
        case "UNITPRICE": {
          const pA = getNum(args[0]), uA = getNum(args[1]), pB = getNum(args[2]), uB = getNum(args[3]);
          const rateA = uA ? pA / uA : 0;
          const rateB = uB ? pB / uB : 0;
          return `A: $${rateA.toFixed(3)}/u | B: $${rateB.toFixed(3)}/u`;
        }
        case "TAX": {
          const amt = getNum(args[0]), t = getNum(args[1]) / 100, mode = getStr(args[2]).toLowerCase();
          return mode === "add tax" ? `$${(amt * (1 + t)).toFixed(2)}` : `$${(amt / (1 + t)).toFixed(2)}`;
        }
        case "BUDGET": {
          const inc = getNum(args[0]);
          return `Needs: $${(inc*0.5).toFixed(0)} | Wants: $${(inc*0.3).toFixed(0)} | Savings: $${(inc*0.2).toFixed(0)}`;
        }
        case "WORDCOUNT": {
          const text = getStr(args[0]);
          return `${text ? text.split(/\s+/).length : 0} words`;
        }
        case "READINGTIME": {
          const words = getStr(args[0]).split(/\s+/).filter(Boolean).length;
          return `Read: ${(words/220).toFixed(1)}m | Speak: ${(words/140).toFixed(1)}m`;
        }
        case "CASECONVERT": {
          const text = getStr(args[0]), mode = getStr(args[1]).toLowerCase();
          if (mode === "upper") return text.toUpperCase();
          if (mode === "lower") return text.toLowerCase();
          if (mode === "title") return text.replace(/\b\w/g, c => c.toUpperCase());
          return text;
        }
        case "SLUG": {
          return getStr(args[0]).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        }
        case "CHARLIMIT": {
          return getStr(args[0]).slice(0, getNum(args[1]) || 160);
        }
        case "PASSWORD": {
          const len = getNum(args[0]) || 12;
          const symb = getStr(args[1]).toLowerCase() === "yes";
          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789" + (symb ? "!@#$%^&*_-+=" : "");
          return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        }
        case "UNIQUE": {
          return [...new Set(getStr(args[0]).split("\n").filter(Boolean))].join(", ");
        }
        case "EXCHANGE": {
          return `$${(getNum(args[0]) * getNum(args[1])).toFixed(2)}`;
        }
        case "TIMEOFFSET": {
          const [h, m] = (getStr(args[0]) || "00:00").split(":").map(Number);
          const date = new Date();
          date.setHours(h + getNum(args[1]), m, 0, 0);
          return date.toTimeString().slice(0, 5);
        }
        case "ASPECT": {
          const oW = getNum(args[0]), oH = getNum(args[1]), nW = getNum(args[2]);
          return `${Math.round(oH * (nW / (oW || 1)))}px`;
        }
        case "CONTRAST": {
          const parse = hex => {
            const clean = hex.replace("#","").padEnd(6,"0").slice(0,6);
            return clean.match(/.{2}/g).map(x=>parseInt(x,16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);
          };
          const a = getStr(args[0]), b = getStr(args[1]);
          if(!a || !b) return "Hex needed";
          const lum = hex => { const c = parse(hex); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
          const ratio = (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
          return `${ratio.toFixed(1)}:1 (${ratio >= 4.5 ? 'Pass' : 'Low'})`;
        }
        case "BIZMODEL": {
          const price = getNum(args[0]), cost = getNum(args[1]), ord = getNum(args[2]), mkt = getNum(args[3]), fixed = getNum(args[4]);
          const rev = price * ord;
          const gross = (price - cost) * ord;
          const net = gross - mkt - fixed;
          return `Net Profit: $${net.toFixed(0)}`;
        }
        case "BREAKEVEN": {
          const fixed = getNum(args[0]), p = getNum(args[1]), v = getNum(args[2]);
          const contrib = p - v;
          return contrib > 0 ? `${Math.ceil(fixed / contrib)} units` : "N/A";
        }
        case "RUNWAY": {
          const cash = getNum(args[0]), rev = getNum(args[1]), exp = getNum(args[2]);
          const burn = exp - rev;
          return burn <= 0 ? "Positive Cashflow" : `${(cash / burn).toFixed(1)} months`;
        }
        case "REORDER": {
          const stock = getNum(args[0]), daily = getNum(args[1]), lead = getNum(args[2]), safety = getNum(args[3]);
          const rop = daily * lead + safety;
          return stock <= rop ? `REORDER (ROP: ${rop})` : `OK (ROP: ${rop})`;
        }
        default:
          return "#UNKNOWN FUNCTION";
      }
    }

    // -------------------------------------------------------------------------
    // SPREADSHEET CELL INTERACTION (CLICK, DOUBLE-CLICK, EDIT)
    // -------------------------------------------------------------------------
    function selectCell(coord) {
      if (isEditing && selectedCell !== coord) {
        saveCellEditingValue();
      }

      selectedCell = coord;
      isEditing = false;
      
      // Update Selection Labels
      document.getElementById("formula-cell-id").textContent = coord;
      document.getElementById("status-selected-cell").textContent = coord;
      
      const activeData = sheets[activeSheet] || {};
      const cellObj = activeData[coord] || { value: "", formula: "" };
      document.getElementById("formula-bar-input").value = cellObj.formula || cellObj.value;

      renderGrid();
    }

    function editCell(coord) {
      isEditing = true;
      const cellElement = document.getElementById(`cell-${coord}`);
      const activeData = sheets[activeSheet] || {};
      const cellObj = activeData[coord] || { value: "", formula: "" };
      
      const currentValue = cellObj.formula || cellObj.value;

      cellElement.innerHTML = `
        <input 
          type="text" 
          id="active-editor" 
          class="cell-input-active w-full h-full font-mono text-xs px-1 text-slate-900 bg-white dark:bg-slate-800 dark:text-slate-100 outline-none" 
          value="${escapeHtml(currentValue)}"
        />
      `;

      const editor = document.getElementById("active-editor");
      editor.focus();
      editor.select();

      // Save on enter or lose focus
      editor.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
          saveCellEditingValue();
          e.preventDefault();
        }
        if (e.key === "Escape") {
          isEditing = false;
          renderGrid();
        }
      });

      editor.addEventListener("blur", saveCellEditingValue);
    }

    function saveCellEditingValue() {
      if (!isEditing) return;
      
      const editor = document.getElementById("active-editor");
      if (editor) {
        saveStateForHistory();
        const newVal = editor.value;
        setCellValue(selectedCell, newVal);
        isEditing = false;
        renderGrid();
      }
    }

    function setCellValue(coord, val) {
      const activeData = sheets[activeSheet] || {};
      if (!activeData[coord]) {
        activeData[coord] = { value: "", formula: "", style: {} };
      }

      if (val.startsWith("=")) {
        activeData[coord].formula = val;
        activeData[coord].value = val;
      } else {
        activeData[coord].formula = "";
        activeData[coord].value = val;
      }

      sheets[activeSheet] = activeData;
      saveToLocalStorage();
    }

    // Update highlights in row/column headers
    function updateHighlightHeaders() {
      // Clear past active headers
      document.querySelectorAll('[id^="col-"]').forEach(el => el.classList.remove('grid-header-active'));
      document.querySelectorAll('[id^="row-"]').forEach(el => el.classList.remove('grid-header-active'));

      if (!selectedCell) return;
      const col = selectedCell.match(/[A-Z]+/i)[0].toUpperCase();
      const row = parseInt(selectedCell.match(/[0-9]+/)[0]);

      const colIdx = COLUMNS.indexOf(col);
      const colEl = document.getElementById(`col-${colIdx}`);
      const rowEl = document.getElementById(`row-${row}`);

      if (colEl) colEl.classList.add('grid-header-active');
      if (rowEl) rowEl.classList.add('grid-header-active');
    }

    // -------------------------------------------------------------------------
    // KEYBOARD NAVIGATION
    // -------------------------------------------------------------------------
    function handleGlobalKeyDown(e) {
      if (isEditing) return; // Ignore global shortcuts when inside editing session

      const col = selectedCell.match(/[A-Z]+/i)[0].toUpperCase();
      const row = parseInt(selectedCell.match(/[0-9]+/)[0]);
      let cIdx = COLUMNS.indexOf(col);

      if (e.key === "ArrowUp" && row > 1) {
        selectCell(`${col}${row - 1}`);
        e.preventDefault();
      }
      else if (e.key === "ArrowDown" && row < ROW_COUNT) {
        selectCell(`${col}${row + 1}`);
        e.preventDefault();
      }
      else if (e.key === "ArrowLeft" && cIdx > 0) {
        selectCell(`${COLUMNS[cIdx - 1]}${row}`);
        e.preventDefault();
      }
      else if (e.key === "ArrowRight" && cIdx < COLUMNS.length - 1) {
        selectCell(`${COLUMNS[cIdx + 1]}${row}`);
        e.preventDefault();
      }
      else if (e.key === "Enter") {
        editCell(selectedCell);
        e.preventDefault();
      }
      else if (e.key === "Backspace" || e.key === "Delete") {
        saveStateForHistory();
        setCellValue(selectedCell, "");
        renderGrid();
        e.preventDefault();
      }
      // Ctrl+Z & Ctrl+Y Support
      else if (e.ctrlKey && e.key === "z") {
        undo();
        e.preventDefault();
      }
      else if (e.ctrlKey && e.key === "y") {
        redo();
        e.preventDefault();
      }
      // Format Hotkeys
      else if (e.ctrlKey && e.key === "b") {
        formatActiveCell('bold');
        e.preventDefault();
      }
      else if (e.ctrlKey && e.key === "i") {
        formatActiveCell('italic');
        e.preventDefault();
      }
      else if (e.ctrlKey && e.key === "u") {
        formatActiveCell('underline');
        e.preventDefault();
      }
    }

    // -------------------------------------------------------------------------
    // FORMULA BAR CONTROL
    // -------------------------------------------------------------------------
    function handleFormulaBarInput(e) {
      // Live sync to cell value
      setCellValue(selectedCell, e.target.value);
    }

    function handleFormulaBarKeyDown(e) {
      if (e.key === "Enter") {
        document.getElementById("formula-bar-input").blur();
        renderGrid();
      }
    }

    function updateSelectedCellLabel() {
      const activeData = sheets[activeSheet] || {};
      const cellObj = activeData[selectedCell] || { value: "", formula: "" };
      document.getElementById("formula-bar-input").value = cellObj.formula || cellObj.value;
    }

    // -------------------------------------------------------------------------
    // FORMATTING STYLES
    // -------------------------------------------------------------------------
    function formatActiveCell(type) {
      saveStateForHistory();
      const activeData = sheets[activeSheet] || {};
      if (!activeData[selectedCell]) {
        activeData[selectedCell] = { value: "", formula: "", style: {} };
      }
      if (!activeData[selectedCell].style) {
        activeData[selectedCell].style = {};
      }

      const style = activeData[selectedCell].style;

      if (type === 'bold') style.bold = !style.bold;
      if (type === 'italic') style.italic = !style.italic;
      if (type === 'underline') style.underline = !style.underline;
      if (type === 'align-left') style.align = 'left';
      if (type === 'align-center') style.align = 'center';
      if (type === 'align-right') style.align = 'right';

      sheets[activeSheet] = activeData;
      saveToLocalStorage();
      renderGrid();
    }

    function applyColor(type, val) {
      saveStateForHistory();
      const activeData = sheets[activeSheet] || {};
      if (!activeData[selectedCell]) {
        activeData[selectedCell] = { value: "", formula: "", style: {} };
      }
      if (!activeData[selectedCell].style) {
        activeData[selectedCell].style = {};
      }

      activeData[selectedCell].style[type] = val;
      
      // Update indicator circle
      if (type === 'textColor') document.getElementById("color-text-indicator").style.backgroundColor = val;
      if (type === 'bgColor') document.getElementById("color-bg-indicator").style.backgroundColor = val;

      sheets[activeSheet] = activeData;
      saveToLocalStorage();
      renderGrid();
    }

    // -------------------------------------------------------------------------
    // SHEETS MANAGER
    // -------------------------------------------------------------------------
    function renderSheetTabs() {
      const container = document.getElementById("sheet-tabs-container");
      container.innerHTML = Object.keys(sheets).map(sheetName => {
        const isActive = sheetName === activeSheet;
        const activeClass = isActive 
          ? "bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm font-bold" 
          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200";
        return `
          <div class="flex items-center gap-1 px-3 py-1 rounded-md text-xs cursor-pointer transition-all ${activeClass}" onclick="switchSheet('${sheetName}')">
            <span>${sheetName}</span>
            ${Object.keys(sheets).length > 1 ? `
              <button onclick="event.stopPropagation(); deleteSheet('${sheetName}')" class="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-rose-500 transition-colors">
                <i data-lucide="x" class="w-2.5 h-2.5"></i>
              </button>
            ` : ""}
          </div>
        `;
      }).join("");
      lucide.createIcons();
    }

    function switchSheet(name) {
      if (isEditing) saveCellEditingValue();
      activeSheet = name;
      renderSheetTabs();
      renderGrid();
      saveToLocalStorage();
    }

    function addSheet() {
      saveStateForHistory();
      const nextNum = Object.keys(sheets).length + 1;
      const newName = `Sheet ${nextNum}`;
      sheets[newName] = {};
      activeSheet = newName;
      renderSheetTabs();
      renderGrid();
      saveToLocalStorage();
    }

    function deleteSheet(name) {
      if (Object.keys(sheets).length <= 1) return;
      saveStateForHistory();
      delete sheets[name];
      if (activeSheet === name) {
        activeSheet = Object.keys(sheets)[0];
      }
      renderSheetTabs();
      renderGrid();
      saveToLocalStorage();
    }

    // -------------------------------------------------------------------------
    // SYSTEM WIDGET ADDS & ONE-CLICK FORMULA TEMPLATES
    // -------------------------------------------------------------------------
    function insertTemplateMenu() {
      // Insert preset calculations cleanly into the grid starting at selected Cell
      const col = selectedCell.match(/[A-Z]+/i)[0].toUpperCase();
      const row = parseInt(selectedCell.match(/[0-9]+/)[0]);
      let cIdx = COLUMNS.indexOf(col);

      // Simple prompt or dropdown to inject a predefined template block
      const templateType = prompt(
        "Enter a template number to inject directly at your selection:\n\n" +
        "1. Loan Calculator Dashboard (Amount, Interest, Repayment)\n" +
        "2. BMI Body Tracker Sheet\n" +
        "3. Business Runway Planner Template\n" +
        "4. Simple Bill & Tip Split Dashboard"
      );

      if (!templateType) return;

      saveStateForHistory();
      if (templateType === "1") {
        // Loan Calculator Template layout
        injectLabelValue(cIdx, row, "LOAN REPAYMENT PLANNER", true, "#dbeafe");
        injectLabelValue(cIdx, row+1, "Loan Principal ($)", false);
        injectLabelValue(cIdx+1, row+1, "250000", false);
        injectLabelValue(cIdx, row+2, "Annual Rate (%)", false);
        injectLabelValue(cIdx+1, row+2, "5.5", false);
        injectLabelValue(cIdx, row+3, "Term in Years", false);
        injectLabelValue(cIdx+1, row+3, "30", false);
        injectLabelValue(cIdx, row+4, "Est. Monthly Payment", true, "#fef08a");
        
        // Write the custom Formula referencing relative coordinates!
        const c1 = `${COLUMNS[cIdx+1]}${row+1}`;
        const c2 = `${COLUMNS[cIdx+1]}${row+2}`;
        const c3 = `${COLUMNS[cIdx+1]}${row+3}`;
        injectLabelValue(cIdx+1, row+4, `=LOAN(${c1}, ${c2}, ${c3})`, true);
      }
      else if (templateType === "2") {
        // BMI Body Tracker
        injectLabelValue(cIdx, row, "FITNESS BMI TRACKER", true, "#ccfbf1");
        injectLabelValue(cIdx, row+1, "Weight (kg)", false);
        injectLabelValue(cIdx+1, row+1, "75", false);
        injectLabelValue(cIdx, row+2, "Height (cm)", false);
        injectLabelValue(cIdx+1, row+2, "182", false);
        injectLabelValue(cIdx, row+3, "Calculated Index", true, "#99f6e4");
        
        const c1 = `${COLUMNS[cIdx+1]}${row+1}`;
        const c2 = `${COLUMNS[cIdx+1]}${row+2}`;
        injectLabelValue(cIdx+1, row+3, `=BMI(${c1}, ${c2})`, true);
      }
      else if (templateType === "3") {
        // Business Runway Planner
        injectLabelValue(cIdx, row, "BUSINESS RUNWAY PLAN", true, "#dbeafe");
        injectLabelValue(cIdx, row+1, "Cash Balance ($)", false);
        injectLabelValue(cIdx+1, row+1, "50000", false);
        injectLabelValue(cIdx, row+2, "Monthly Revenue ($)", false);
        injectLabelValue(cIdx+1, row+2, "4500", false);
        injectLabelValue(cIdx, row+3, "Monthly Outflows ($)", false);
        injectLabelValue(cIdx+1, row+3, "12000", false);
        injectLabelValue(cIdx, row+4, "Cash Runway (Months)", true, "#fed7aa");
        
        const c1 = `${COLUMNS[cIdx+1]}${row+1}`;
        const c2 = `${COLUMNS[cIdx+1]}${row+2}`;
        const c3 = `${COLUMNS[cIdx+1]}${row+3}`;
        injectLabelValue(cIdx+1, row+4, `=RUNWAY(${c1}, ${c2}, ${c3})`, true);
      }
      else if (templateType === "4") {
        // Tip Split
        injectLabelValue(cIdx, row, "BILL TIP SPLITTER", true, "#fef08a");
        injectLabelValue(cIdx, row+1, "Subtotal Bill ($)", false);
        injectLabelValue(cIdx+1, row+1, "124.50", false);
        injectLabelValue(cIdx, row+2, "Tip Rate (%)", false);
        injectLabelValue(cIdx+1, row+2, "18", false);
        injectLabelValue(cIdx, row+3, "Size of Party", false);
        injectLabelValue(cIdx+1, row+3, "4", false);
        injectLabelValue(cIdx, row+4, "Split Totals Due", true, "#fef08a");
        
        const c1 = `${COLUMNS[cIdx+1]}${row+1}`;
        const c2 = `${COLUMNS[cIdx+1]}${row+2}`;
        const c3 = `${COLUMNS[cIdx+1]}${row+3}`;
        injectLabelValue(cIdx+1, row+4, `=TIP(${c1}, ${c2}, ${c3})`, true);
      }

      renderGrid();
    }

    function injectLabelValue(colIdx, rowIdx, text, isHeader = false, bgColor = null) {
      if (colIdx >= COLUMNS.length || rowIdx > ROW_COUNT) return;
      const coord = `${COLUMNS[colIdx]}${rowIdx}`;
      setCellValue(coord, text);
      
      const activeData = sheets[activeSheet] || {};
      if (isHeader) {
        activeData[coord].style = { bold: true, align: "center", bgColor: bgColor || "#f1f5f9" };
      } else if (bgColor) {
        activeData[coord].style = { bgColor: bgColor };
      }
    }

    // -------------------------------------------------------------------------
    // SIDEBAR ADD-ONS LIST & FILTERING
    // -------------------------------------------------------------------------
    function renderAddonsList() {
      const container = document.getElementById("addons-list");
      const filterCat = document.getElementById("addon-categories");
      
      // Populate unique categories
      const categories = ["All", ...new Set(TOOLS.map(t => t.category))];
      filterCat.innerHTML = categories.map(cat => {
        return `
          <button onclick="filterCategory('${cat}')" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-300 transition-all shrink-0">
            ${cat}
          </button>
        `;
      }).join("");

      // Render all cards
      displayToolsList(TOOLS);
    }

    function displayToolsList(toolsArray) {
      const container = document.getElementById("addons-list");
      container.innerHTML = toolsArray.map(tool => {
        const badgeColor = CATEGORY_COLOURS[tool.category] || "bg-slate-100 text-slate-800";
        return `
          <div onclick="openAddonTool('${tool.id}')" class="p-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800/80 rounded-xl hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md cursor-pointer transition-all space-y-1.5 select-none">
            <div class="flex items-center justify-between">
              <span class="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeColor}">
                ${tool.category}
              </span>
              <code class="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono font-bold px-1 py-0.5 rounded">
                ${tool.exampleFormula}
              </code>
            </div>
            <h3 class="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">${tool.title}</h3>
            <p class="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">${tool.desc}</p>
          </div>
        `;
      }).join("");
    }

    function filterCategory(cat) {
      if (cat === "All") {
        displayToolsList(TOOLS);
      } else {
        displayToolsList(TOOLS.filter(t => t.category === cat));
      }
    }

    function filterAddons(e) {
      const q = e.target.value.toLowerCase().trim();
      const filtered = TOOLS.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.category.toLowerCase().includes(q) || 
        t.desc.toLowerCase().includes(q)
      );
      displayToolsList(filtered);
    }

    // -------------------------------------------------------------------------
    // SIDEBAR DYNAMIC INPUT GENERATION & FORMULA WRITING
    // -------------------------------------------------------------------------
    function openAddonTool(toolId) {
      const tool = TOOLS.find(t => t.id === toolId);
      if (!tool) return;

      const panel = document.getElementById("active-tool-panel");
      panel.classList.remove("hidden");

      let html = `
        <div class="space-y-3">
          <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h4 class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
              <i data-lucide="sparkles" class="w-3.5 h-3.5 text-brand-500 animate-pulse"></i> Link ${tool.title}
            </h4>
            <button onclick="closeToolPanel()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
          </div>
          
          <p class="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
            Map cells (e.g., A1, B3) or direct numbers into parameters. We will compile it as a formula in the selected destination.
          </p>

          <form id="active-tool-form" class="space-y-2 text-xs">
      `;

      tool.fields.forEach((f, idx) => {
        const commonId = `tool-f-${idx}`;
        html += `
          <div class="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-800/60 shadow-sm">
            <div class="space-y-0.5">
              <span class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">${f.label}</span>
              <span class="block text-[8px] text-slate-400 italic">E.g., B${idx+2} or values</span>
            </div>
        `;

        if (f.type === "select") {
          html += `
            <select id="${commonId}" class="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs outline-none focus:border-brand-500">
              ${f.options.map(opt => `<option value="${opt}">${opt}</option>`).join("")}
            </select>
          `;
        } else {
          // Dynamic fields allowing both raw text, numbers, or cell coordinates
          html += `
            <input type="text" id="${commonId}" placeholder="Enter cell or value" class="w-28 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs outline-none focus:border-brand-500 font-mono">
          `;
        }

        html += `</div>`;
      });

      // Target Cell Selector
      html += `
        <div class="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
          <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">Destination Cell</label>
          <div class="flex gap-2">
            <input type="text" id="tool-dest-cell" value="${selectedCell}" class="w-20 text-center font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded py-1 text-xs font-mono">
            <button type="button" onclick="syncActiveDestCell()" class="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-[10px]">Use Selection</button>
          </div>
        </div>

        <div class="flex gap-1.5 pt-3">
          <button type="button" onclick="injectCompiledFormula('${tool.id}')" class="flex-1 py-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold rounded-lg shadow-sm transition-colors text-center">
            Insert Dynamic Formula
          </button>
          <button type="button" onclick="closeToolPanel()" class="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      </form>
      `;

      panel.innerHTML = html;
      lucide.createIcons();
    }

    function closeToolPanel() {
      document.getElementById("active-tool-panel").classList.add("hidden");
    }

    function syncActiveDestCell() {
      document.getElementById("tool-dest-cell").value = selectedCell;
    }

    function injectCompiledFormula(toolId) {
      const tool = TOOLS.find(t => t.id === toolId);
      if (!tool) return;

      const dest = document.getElementById("tool-dest-cell").value.toUpperCase().trim();
      if (!/^[A-Z]+[0-9]+$/i.test(dest)) {
        alert("Please specify a valid single cell (e.g., A1, C3) as destination.");
        return;
      }

      saveStateForHistory();

      // Gather parameters and build the Excel function call
      const args = [];
      tool.fields.forEach((f, idx) => {
        const inputVal = document.getElementById(`tool-f-${idx}`).value.trim();
        
        // Wrap literal strings in quotes unless it looks like a number or is a cell reference
        if (f.type === "select" || (isNaN(parseFloat(inputVal)) && !/^[A-Z]+[0-9]+$/i.test(inputVal) && inputVal.length > 0)) {
          // If it doesn't already have quotes, wrap it
          if (!(inputVal.startsWith('"') || inputVal.startsWith("'"))) {
            args.push(`"${inputVal}"`);
          } else {
            args.push(inputVal);
          }
        } else {
          args.push(inputVal || "0");
        }
      });

      // Map dynamic naming matching runCustomFormula cases
      const formulaMapping = {
        "age-calculator": "AGE",
        "date-difference": "DATEDIFF",
        "countdown-maker": "COUNTDOWN",
        "sleep-cycle": "SLEEP",
        "water-intake": "WATER",
        "bmi-check": "BMI",
        "bmr-estimator": "BMR",
        "calorie-target": "CALORIE",
        "protein-target": "PROTEIN",
        "pace-calculator": "PACE",
        "study-planner": "STUDY",
        "final-grade": "FINALGRADE",
        "tip-split": "TIP",
        "discount-calculator": "DISCOUNT",
        "savings-goal": "SAVINGS",
        "hourly-yearly": "HOURLYTOYEARLY",
        "loan-payment": "LOAN",
        "subscription-total": "SUBSCRIPTION",
        "unit-price": "UNITPRICE",
        "tax-estimator": "TAX",
        "budget-ratio": "BUDGET",
        "word-counter": "WORDCOUNT",
        "reading-time": "READINGTIME",
        "case-converter": "CASECONVERT",
        "slug-generator": "SLUG",
        "character-limiter": "CHARLIMIT",
        "password-generator": "PASSWORD",
        "duplicate-lines": "UNIQUE",
        "exchange-planner": "EXCHANGE",
        "time-offset": "TIMEOFFSET",
        "aspect-ratio": "ASPECT",
        "contrast-checker": "CONTRAST",
        "business-model": "BIZMODEL",
        "break-even": "BREAKEVEN",
        "cash-runway": "RUNWAY",
        "inventory-reorder": "REORDER"
      };

      const mappedFuncName = formulaMapping[toolId] || toolId.toUpperCase().replace(/-/g, "");
      const compiledString = `=${mappedFuncName}(${args.join(", ")})`;

      setCellValue(dest, compiledString);
      selectCell(dest);
      renderGrid();
      closeToolPanel();
    }

    // -------------------------------------------------------------------------
    // FILE HANDLERS (CSV EXPORT / IMPORT)
    // -------------------------------------------------------------------------
    function exportCSV() {
      const activeData = sheets[activeSheet] || {};
      let rows = [];

      for (let r = 1; r <= ROW_COUNT; r++) {
        let rowCells = [];
        COLUMNS.forEach(col => {
          const coord = `${col}${r}`;
          const cellObj = activeData[coord];
          
          // Export computed evaluated string, escaping quotes
          const valStr = cellObj ? evaluateCell(coord) : "";
          rowCells.push(`"${String(valStr).replace(/"/g, '""')}"`);
        });
        rows.push(rowCells.join(","));
      }

      const csvContent = rows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${activeSheet.replace(/\s+/g, "_")}_export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    function importCSV(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        saveStateForHistory();
        const text = e.target.result;
        const rows = text.split(/\r?\n/);
        
        const activeData = {};
        
        rows.forEach((row, rIdx) => {
          if (rIdx >= ROW_COUNT) return;
          const rowNum = rIdx + 1;
          
          // Primitive CSV parser handle wrapping quotes
          let colIdx = 0;
          let currentCellStr = "";
          let insideQuotes = false;

          for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') {
              insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
              if (colIdx < COLUMNS.length) {
                const coord = `${COLUMNS[colIdx]}${rowNum}`;
                activeData[coord] = { value: currentCellStr.trim(), formula: "", style: {} };
              }
              currentCellStr = "";
              colIdx++;
            } else {
              currentCellStr += char;
            }
          }

          // Leftover cell handle
          if (colIdx < COLUMNS.length && currentCellStr) {
            const coord = `${COLUMNS[colIdx]}${rowNum}`;
            activeData[coord] = { value: currentCellStr.trim(), formula: "", style: {} };
          }
        });

        sheets[activeSheet] = activeData;
        renderGrid();
        saveToLocalStorage();
      };
      reader.readAsText(file);
    }

    function clearGrid() {
      const confirmClear = confirm("Are you sure you want to erase all data in the current tab?");
      if (confirmClear) {
        saveStateForHistory();
        sheets[activeSheet] = {};
        renderGrid();
        saveToLocalStorage();
      }
    }

    // -------------------------------------------------------------------------
    // OTHER SYSTEM MODALS / HELP PANEL GLOSSARY
    // -------------------------------------------------------------------------
    function toggleFormulaHelp() {
      const overlay = document.getElementById("formula-help-overlay");
      overlay.classList.toggle("hidden");
    }

    function toggleSidebar() {
      const sidebar = document.getElementById("sidebar");
      sidebar.classList.toggle("hidden");
    }

    function renderFormulaGlossary() {
      const container = document.getElementById("formulas-glossary");
      
      const items = TOOLS.map(tool => {
        return `
          <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-1">
            <div class="flex items-center justify-between">
              <strong class="text-brand-600 dark:text-brand-400 font-mono">${tool.exampleFormula.split('(')[0]}(...)</strong>
              <span class="text-[9px] font-bold text-slate-400 uppercase">${tool.category}</span>
            </div>
            <p class="text-slate-600 dark:text-slate-300">${tool.desc}</p>
            <div class="text-[10px] bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded font-mono text-slate-500 dark:text-slate-400">
              Usage Example: <span class="text-emerald-600">${tool.exampleFormula}</span>
            </div>
          </div>
        `;
      }).join("");

      container.innerHTML = `
        <div class="space-y-4">
          <div class="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 rounded-xl space-y-1">
            <h4 class="font-bold">Standard Excel Formula Support</h4>
            <p class="text-[11px] leading-relaxed">
              We also support standard math operations (e.g. <code class="font-bold">=A1+B1</code>, <code class="font-bold">=C5*1.1</code>) and functions across dynamic ranges:
            </p>
            <ul class="list-disc pl-4 text-[11px] space-y-1 pt-1">
              <li><strong>SUM(range):</strong> e.g., <code class="bg-blue-100/50 dark:bg-blue-900/50 px-1 py-0.5 rounded">=SUM(A1:B3)</code></li>
              <li><strong>AVERAGE(range):</strong> e.g., <code class="bg-blue-100/50 dark:bg-blue-900/50 px-1 py-0.5 rounded">=AVERAGE(C1:C10)</code></li>
              <li><strong>MIN / MAX(range):</strong> e.g., <code class="bg-blue-100/50 dark:bg-blue-900/50 px-1 py-0.5 rounded">=MAX(A1:D1)</code></li>
              <li><strong>COUNT(range):</strong> e.g., <code class="bg-blue-100/50 dark:bg-blue-900/50 px-1 py-0.5 rounded">=COUNT(A1:B10)</code></li>
            </ul>
          </div>
          <div class="space-y-2">
            <h4 class="font-bold text-slate-700 dark:text-slate-300">Envizion Formula Functions</h4>
            ${items}
          </div>
        </div>
      `;
    }

    // Utility escape html helper
    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
