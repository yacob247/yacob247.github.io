
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
      ["pace-calculator","Pace Calculator","Fitness","Convert distance and time into pace and speed.","number:Distance kg|number:Hours|number:Minutes","=PACE(A1, B1, C1)"],
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
      ["source-triangulator","Source Triangulator","Research","Score assertions by source abundance.","textarea:Rows as claim,sources,confidence","=SOURCETRIANGULATE(A1)"],

      // 20 NEW ADDONS FOR SPREADSHEET CAPABILITY
      ["mortgage-calc","Mortgage Estimator","Money","Estimate mortgage payments.","number:Principal|number:Rate %|number:Years","=PMT(B1/100/12, C1*12, -A1)"],
      ["compound-interest","Compound Interest","Money","Calculate compound growth.","number:Principal|number:Rate %|number:Years|number:Times/Yr","=FV(B1/100/D1, C1*D1, 0, -A1)"],
      ["roi-calc","ROI Calculator","Money","Return on Investment percentage.","number:Initial Cost|number:Final Value","=(B1-A1)/A1"],
      ["profit-margin","Profit Margin","Business","Net profit margin.","number:Revenue|number:Cost","=(A1-B1)/A1"],
      ["markup-calc","Markup Calc","Business","Markup percentage.","number:Cost|number:Revenue","=(B1-A1)/A1"],
      ["ebitda-calc","EBITDA Calc","Business","EBITDA value.","number:Net Income|number:Interest|number:Taxes|number:D&A","=A1+B1+C1+D1"],
      ["cagr-calc","CAGR Calc","Business","Compound Annual Growth Rate.","number:Beginning Value|number:Ending Value|number:Years","=(B1/A1)^(1/C1)-1"],
      ["pomodoro-timer","Pomodoro Estimate","Planning","Count pomodoros needed.","number:Task Minutes","=ROUNDUP(A1/25,0) & \" Pomodoros\""],
      ["macros-calc","Macros Calc","Health","Calculate daily macros.","number:Calories|number:Protein %|number:Fat %","=MACROS(A1, B1, C1)"],
      ["ovulation-calc","Ovulation Estimate","Health","Estimate ovulation date.","date:Last Period|number:Cycle Length","=OVULATION(A1, B1)"],
      ["due-date-calc","Due Date Calc","Health","Pregnancy due date.","date:Last Period","=DUEDATE(A1)"],
      ["zodiac-sign","Zodiac Sign","Planning","Get Zodiac from birth date.","date:Birth Date","=ZODIAC(A1)"],
      ["moon-phase","Moon Phase","Planning","Estimate moon phase.","date:Date","=MOONPHASE(A1)"],
      ["days-in-month","Days In Month","Planning","Get total days for a given month.","date:Date","=DAYSINMONTH(A1)"],
      ["salary-to-hourly","Salary to Hourly","Money","Convert annual to hourly.","number:Annual Salary|number:Hours/Week","=A1/(B1*52)"],
      ["currency-conv","Currency Conv","Money","Simple rate conversion.","number:Amount|number:Rate","=A1*B1"],
      ["word-scramble","Word Scrambler","Writing","Scramble text characters.","text:Word","=SCRAMBLE(A1)"],
      ["anagram-check","Anagram Check","Writing","Check if two words are anagrams.","text:Word 1|text:Word 2","=ANAGRAM(A1, B1)"],
      ["palindrome-check","Palindrome Check","Writing","Check if word is palindrome.","text:Word","=PALINDROME(A1)"],
      ["random-quote","Random Quote Generator","Writing","Generate an inspirational snippet.","text:Subject","=RANDOMQUOTE(A1)"]
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

    const TOOLS = RAW_TOOLS.map(([id, title, category, desc, fields, exampleFormula]) => {
      const parsedFields = fields.split("|").map(def => {
        const [type, label, options] = def.split(":");
        return { type, label, options: options ? options.split(",") : [] };
      });
      return { id, title, category, desc, fields: parsedFields, exampleFormula };
    });

    const COLUMNS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""); // 26 Columns
    
    let sheets = { "Sheet 1": {} };
    let activeSheet = "Sheet 1";

    let selectedCell = "A1";
    let isEditing = false;
    let editingCoord = null;
    let selectionStart = "A1";
    let selectionEnd = "A1";
    let isDragging = false;
    let currentRowsRendered = 0;

    let historyUndo = [];
    let historyRedo = [];
    const WORKBOOK_INDEX_KEY = "envizion_excel_workbooks";
    const LAST_WORKBOOK_KEY = "envizion_excel_last_workbook";
    let currentWorkbookId = null;

    let evaluationCache = {};
    const excelParser = new formulaParser.Parser(); // Core parser library

    // Welcome Guide Configuration
    const WELCOME_KEY = "envizion_workbench_guide_dismissed";
    let welcomeModal, welcomeBackdrop, closeWelcomeBtn, startWorkbenchBtn, dontShowWelcomeCheckbox;

    // -------------------------------------------------------------------------
    // SYSTEM LIFECYCLE INITIALIZER
    // -------------------------------------------------------------------------
    window.onload = async function() {
      lucide.createIcons();
      setupFormulaParser();

      currentWorkbookId = getWorkbookIdFromUrl() || localStorage.getItem(LAST_WORKBOOK_KEY) || ensureDefaultWorkbook();
      const saved = localStorage.getItem(`envizion_excel_workbook_${currentWorkbookId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          sheets = parsed.sheets || sheets;
          activeSheet = parsed.activeSheet || Object.keys(sheets)[0];
          document.getElementById("project-title").value = parsed.title || "Untitled";
        } catch(e) {}
      }

      renderSheetTabs();
      rebuildGrid();
      renderAddonsList();
      renderFormulaGlossary();

      document.addEventListener("keydown", handleGlobalKeyDown);
      document.getElementById("formula-bar-input").addEventListener("input", handleFormulaBarInput);
      document.getElementById("formula-bar-input").addEventListener("keydown", handleFormulaBarKeyDown);
      document.getElementById("addon-search").addEventListener("input", filterAddons);
      document.getElementById("project-title").addEventListener("input", () => {
        saveToLocalStorage();
        syncWorkbookIndex();
      });

      if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        document.getElementById("theme-sun").classList.remove("hidden");
        document.getElementById("theme-moon").classList.add("hidden");
      }

      initWelcomeModal();
    };

    function initWelcomeModal() {
      welcomeModal = document.getElementById("envizion-welcome-modal");
      welcomeBackdrop = document.getElementById("envizion-modal-backdrop");
      closeWelcomeBtn = document.getElementById("close-welcome-btn");
      startWorkbenchBtn = document.getElementById("start-workbench-btn");
      dontShowWelcomeCheckbox = document.getElementById("dont-show-welcome");

      if (!welcomeModal) return;

      closeWelcomeBtn.addEventListener("click", closeWelcomeModal);
      startWorkbenchBtn.addEventListener("click", closeWelcomeModal);
      welcomeBackdrop.addEventListener("click", closeWelcomeModal);

      const alreadySeen = localStorage.getItem(WELCOME_KEY);
      if (!alreadySeen) {
        setTimeout(openWelcomeModal, 1000);
      }
    }

    function openWelcomeModal() {
      if (!welcomeModal) return;
      welcomeModal.classList.remove("opacity-0", "pointer-events-none");
      welcomeModal.querySelector(".relative").classList.remove("scale-95");
      welcomeModal.querySelector(".relative").classList.add("scale-100");
      welcomeModal.setAttribute("aria-hidden", "false");
    }

    function closeWelcomeModal() {
      if (!welcomeModal) return;
      welcomeModal.classList.add("opacity-0", "pointer-events-none");
      welcomeModal.querySelector(".relative").classList.remove("scale-100");
      welcomeModal.querySelector(".relative").classList.add("scale-95");
      welcomeModal.setAttribute("aria-hidden", "true");

      if (dontShowWelcomeCheckbox && dontShowWelcomeCheckbox.checked) {
        localStorage.setItem(WELCOME_KEY, "true");
      }
    }

    // -------------------------------------------------------------------------
    // FORMULA ENGINE CONFIGURATION & EXCEL STANDARD MATH REGISTRATION
    // -------------------------------------------------------------------------
    function setupFormulaParser() {
      excelParser.on('callCellValue', function(cellCoord, done) {
        const coord = cellCoord.label;
        const activeData = sheets[activeSheet] || {};
        const cell = activeData[coord];
        if (!cell) { done(""); return; }
        
        if (evaluationCache[coord] !== undefined) {
          done(evaluationCache[coord]);
          return;
        }
        
        evaluationCache[coord] = 0; // prevent circular dependency loops
        if (cell.formula) {
          const res = excelParser.parse(cell.formula.substring(1));
          const val = res.error ? res.error : res.result;
          evaluationCache[coord] = val;
          done(val);
        } else {
          let num = parseFloat(cell.value);
          const finalVal = (!isNaN(num) && cell.value !== "") ? num : cell.value;
          evaluationCache[coord] = finalVal;
          done(finalVal);
        }
      });

      excelParser.on('callRangeValue', function(startCellCoord, endCellCoord, done) {
        const bounds = getRangeBounds(startCellCoord.label, endCellCoord.label);
        let matrix = [];
        for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
          let rowVals = [];
          for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
            const coord = `${COLUMNS[c]}${r}`;
            rowVals.push(evaluateCell(coord));
          }
          matrix.push(rowVals);
        }
        done(matrix);
      });

      // Standard additions
      excelParser.setFunction('CONCATENATE', params => params.join(''));
      excelParser.setFunction('LEN', params => String(params[0]).length);
      excelParser.setFunction('NETWORKDAYS', params => {
        let d1 = new Date(params[0]), d2 = new Date(params[1]);
        if (isNaN(d1) || isNaN(d2)) return "#VALUE!";
        let days = 0;
        let cur = new Date(d1);
        while (cur <= d2) {
          if (cur.getDay() !== 0 && cur.getDay() !== 6) days++;
          cur.setDate(cur.getDate() + 1);
        }
        return days;
      });

      const customFormulasList = [
        "AGE", "DATEDIFF", "COUNTDOWN", "SLEEP", "WATER", "BMI", "BMR", "CALORIE", "PROTEIN", "PACE", 
        "STUDY", "FINALGRADE", "TIP", "DISCOUNT", "SAVINGS", "HOURLYTOYEARLY", "LOAN", "SUBSCRIPTION", 
        "UNITPRICE", "TAX", "BUDGET", "WORDCOUNT", "READINGTIME", "CASECONVERT", "SLUG", "CHARLIMIT", 
        "PASSWORD", "UNIQUE", "EXCHANGE", "TIMEOFFSET", "ASPECT", "CONTRAST", "BIZMODEL", "BREAKEVEN", 
        "RUNWAY", "REORDER", "MACROS", "OVULATION", "DUEDATE", "ZODIAC", "MOONPHASE", "DAYSINMONTH", 
        "SCRAMBLE", "ANAGRAM", "PALINDROME", "RANDOMQUOTE"
      ];
      
      customFormulasList.forEach(funcName => {
        excelParser.setFunction(funcName, function(params) {
          return runCustomFormula(funcName, params);
        });
      });
    }

    function evaluateCell(coord) {
      if (evaluationCache[coord] !== undefined) return evaluationCache[coord];
      const cell = (sheets[activeSheet] || {})[coord];
      if (!cell) return "";
      
      if (cell.formula) {
        evaluationCache[coord] = "...";
        const res = excelParser.parse(cell.formula.substring(1));
        const val = res.error ? res.error : res.result;
        evaluationCache[coord] = val;
        return val;
      } else {
        let num = parseFloat(cell.value);
        const val = (!isNaN(num) && cell.value !== "") ? num : cell.value;
        evaluationCache[coord] = val;
        return val;
      }
    }

    function reevaluateAll() {
      evaluationCache = {};
      const activeData = sheets[activeSheet] || {};
      Object.keys(activeData).forEach(coord => {
        updateCellDisplay(coord);
        applyCellStyle(coord);
      });
      updateSelectionVisuals();
      renderCharts();
    }

    // -------------------------------------------------------------------------
    // GRID RENDERING & INFINITE SCROLL
    // -------------------------------------------------------------------------
    const scrollObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        appendRows(50);
      }
    });

    function rebuildGrid() {
      const grid = document.getElementById("excel-grid");
      let html = `<div id="excel-grid-inner" class="grid select-none border-collapse" style="grid-template-columns: 45px repeat(${COLUMNS.length}, minmax(90px, 1fr));">`;
      html += `<div class="bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-300 dark:border-slate-700 h-7 sticky top-0 left-0 z-30"></div>`;
      
      COLUMNS.forEach((col, cIdx) => {
        html += `<div id="col-${cIdx}" class="bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-300 dark:border-slate-700 h-7 flex items-center justify-center font-mono font-bold text-slate-500 dark:text-slate-400 text-xs sticky top-0 z-20">${col}</div>`;
      });
      
      grid.innerHTML = html + `</div>`;
      currentRowsRendered = 0;
      appendRows(100);
      setupGridEvents();
      reevaluateAll();
    }

    function appendRows(count) {
      const gridInner = document.getElementById("excel-grid-inner");
      if (!gridInner) return;
      const fragment = document.createDocumentFragment();
      
      for (let r = currentRowsRendered + 1; r <= currentRowsRendered + count; r++) {
        const rowDiv = document.createElement('div');
        rowDiv.id = `row-${r}`;
        rowDiv.className = "bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-300 dark:border-slate-700 h-7 flex items-center justify-center font-mono font-bold text-slate-500 dark:text-slate-400 text-xs sticky left-0 z-10 select-none";
        rowDiv.innerText = r;
        fragment.appendChild(rowDiv);
        
        COLUMNS.forEach(col => {
          const coord = `${col}${r}`;
          const cellDiv = document.createElement('div');
          cellDiv.id = `cell-${coord}`;
          cellDiv.dataset.coord = coord;
          cellDiv.className = `border-r border-b border-slate-200 dark:border-slate-800 h-7 px-1.5 flex items-center font-mono text-xs overflow-hidden whitespace-nowrap text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-cell`;
          fragment.appendChild(cellDiv);
        });
      }
      gridInner.appendChild(fragment);
      currentRowsRendered += count;
      
      scrollObserver.disconnect();
      const lastRow = document.getElementById(`row-${currentRowsRendered}`);
      if (lastRow) scrollObserver.observe(lastRow);
      
      reevaluateAll();
    }

    let showFormulasMode = false;
    function updateCellDisplay(coord) {
      if (isEditing && editingCoord === coord) return;
      const el = document.getElementById(`cell-${coord}`);
      if (!el) return;
      
      const val = evaluateCell(coord);
      const activeData = sheets[activeSheet] || {};
      const cell = activeData[coord];
      
      if (showFormulasMode && cell && cell.formula) {
        el.innerText = cell.formula;
        el.classList.add('text-brand-600', 'dark:text-brand-400');
      } else {
        el.innerText = (val !== null && val !== undefined) ? val : "";
        el.classList.remove('text-brand-600', 'dark:text-brand-400');
      }
      el.title = (cell && cell.formula) ? `Formula: ${cell.formula}` : "";
    }

    function applyCellStyle(coord) {
      const el = document.getElementById(`cell-${coord}`);
      if (!el) return;
      const style = (sheets[activeSheet] || {})[coord]?.style || {};
      el.style.fontWeight = style.bold ? 'bold' : 'normal';
      el.style.fontStyle = style.italic ? 'italic' : 'normal';
      el.style.textDecoration = style.underline ? 'underline' : 'none';
      el.style.backgroundColor = style.bgColor || '';
      el.style.color = style.textColor || '';
      el.style.justifyContent = style.align === 'center' ? 'center' : (style.align === 'right' ? 'flex-end' : 'flex-start');
    }

    // -------------------------------------------------------------------------
    // GRID INTERACTION (SELECTION, EDITING)
    // -------------------------------------------------------------------------
    function setupGridEvents() {
      const grid = document.getElementById("excel-grid-inner");
      grid.addEventListener('mousedown', (e) => {
        const cell = e.target.closest('[data-coord]');
        if (!cell) return;
        if (isEditing) {
          if (cell.dataset.coord === editingCoord) return;
          saveCellEditingValue();
        }
        isDragging = true;
        selectionStart = cell.dataset.coord;
        selectionEnd = selectionStart;
        updateSelectionVisuals();
      });
      
      grid.addEventListener('mouseover', (e) => {
        if (!isDragging) return;
        const cell = e.target.closest('[data-coord]');
        if (!cell) return;
        selectionEnd = cell.dataset.coord;
        updateSelectionVisuals();
      });
      
      window.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          updateStatsPanel();
        }
      });

      grid.addEventListener('dblclick', (e) => {
        const cell = e.target.closest('[data-coord]');
        if (cell && !isEditing) editCell(cell.dataset.coord);
      });
    }

    function selectCell(coord) {
      if (isEditing) saveCellEditingValue();
      selectionStart = coord;
      selectionEnd = coord;
      updateSelectionVisuals();
      
      const el = document.getElementById(`cell-${coord}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }

    function updateSelectionVisuals() {
      document.querySelectorAll('.grid-cell-selected').forEach(el => el.classList.remove('grid-cell-selected'));
      document.querySelectorAll('.grid-header-active').forEach(el => el.classList.remove('grid-header-active'));
      
      const cells = getRangeCells(selectionStart, selectionEnd);
      cells.forEach(c => document.getElementById(`cell-${c}`)?.classList.add('grid-cell-selected'));
      
      selectedCell = selectionStart;
      document.getElementById("formula-cell-id").textContent = selectedCell;
      document.getElementById("status-selected-cell").textContent = selectedCell;
      
      const cellObj = (sheets[activeSheet] || {})[selectedCell] || { value: "", formula: "" };
      document.getElementById("formula-bar-input").value = cellObj.formula || cellObj.value;
      
      const bounds = getRangeBounds(selectionStart, selectionEnd);
      for(let c = bounds.minCol; c <= bounds.maxCol; c++) document.getElementById(`col-${c}`)?.classList.add('grid-header-active');
      for(let r = bounds.minRow; r <= bounds.maxRow; r++) document.getElementById(`row-${r}`)?.classList.add('grid-header-active');
      
      updateStatsPanel();
    }

    function updateStatsPanel() {
      const cells = getRangeCells(selectionStart, selectionEnd);
      if (cells.length <= 1) {
        document.getElementById("range-calc-sum").textContent = "";
        document.getElementById("range-calc-avg").textContent = "";
        document.getElementById("range-calc-count").textContent = "";
        return;
      }
      
      let sum = 0, countNum = 0, countAll = 0;
      cells.forEach(c => {
        const val = evaluateCell(c);
        if (val !== "" && val !== null) {
          countAll++;
          const num = parseFloat(val);
          if (!isNaN(num)) { sum += num; countNum++; }
        }
      });
      
      const fmt = (n) => Number.isFinite(n) ? Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0";
      document.getElementById("range-calc-sum").textContent = countNum > 0 ? `Sum: ${fmt(sum)}` : "";
      document.getElementById("range-calc-avg").textContent = countNum > 0 ? `Avg: ${fmt(sum/countNum)}` : "";
      document.getElementById("range-calc-count").textContent = `Count: ${countAll}`;
    }

    function editCell(coord, initialValue = null) {
      isEditing = true;
      editingCoord = coord;
      const el = document.getElementById(`cell-${coord}`);
      const val = (sheets[activeSheet] || {})[coord] ? ((sheets[activeSheet] || {})[coord].formula || (sheets[activeSheet] || {})[coord].value) : "";
      
      el.innerHTML = `<input type="text" id="active-editor" class="cell-input-active w-full h-full font-mono text-xs px-1 text-slate-900 bg-white dark:bg-slate-800 dark:text-slate-100 outline-none" value="${escapeHtml(initialValue !== null ? initialValue : val)}" />`;
      
      const editor = document.getElementById("active-editor");
      editor.focus();
      if (initialValue === null) editor.setSelectionRange(editor.value.length, editor.value.length);
      
      editor.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          saveCellEditingValue();
          const col = coord.match(/[A-Z]+/i)[0].toUpperCase();
          const row = parseInt(coord.match(/[0-9]+/)[0]);
          if (row < currentRowsRendered) selectCell(`${col}${row + 1}`);
          e.preventDefault(); e.stopPropagation();
        } else if (e.key === 'Escape') {
          isEditing = false;
          updateCellDisplay(coord);
          e.preventDefault(); e.stopPropagation();
        }
      });
      editor.addEventListener('blur', () => { if (isEditing && editingCoord === coord) saveCellEditingValue(); });
    }

    function saveCellEditingValue() {
      if (!isEditing) return;
      const editor = document.getElementById("active-editor");
      if (editor) {
        saveStateForHistory();
        setCellValue(editingCoord, editor.value);
        isEditing = false;
        reevaluateAll();
      }
    }

    function setCellValue(coord, val) {
      if (!sheets[activeSheet]) sheets[activeSheet] = {};
      if (!sheets[activeSheet][coord]) sheets[activeSheet][coord] = { value: "", formula: "", style: {} };

      if (val.startsWith("=")) {
        sheets[activeSheet][coord].formula = val;
        sheets[activeSheet][coord].value = val;
      } else {
        sheets[activeSheet][coord].formula = "";
        sheets[activeSheet][coord].value = val;
      }
      saveToLocalStorage();
    }

    // -------------------------------------------------------------------------
    // KEYBOARD NAVIGATION
    // -------------------------------------------------------------------------
    function handleGlobalKeyDown(e) {
      if (isEditing) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (!selectedCell) return;
      
      const col = selectedCell.match(/[A-Z]+/i)[0].toUpperCase();
      const row = parseInt(selectedCell.match(/[0-9]+/)[0]);
      let cIdx = COLUMNS.indexOf(col);

      if (e.key === 'ArrowUp' && row > 1) { selectCell(`${col}${row-1}`); e.preventDefault(); }
      else if (e.key === 'ArrowDown' || e.key === 'Enter') { selectCell(`${col}${row+1}`); e.preventDefault(); }
      else if (e.key === 'ArrowLeft' && cIdx > 0) { selectCell(`${COLUMNS[cIdx-1]}${row}`); e.preventDefault(); }
      else if (e.key === 'ArrowRight' && cIdx < COLUMNS.length - 1) { selectCell(`${COLUMNS[cIdx+1]}${row}`); e.preventDefault(); }
      else if (e.key === 'F2') { editCell(selectedCell); e.preventDefault(); }
      else if (e.key === 'Backspace' || e.key === 'Delete') {
        saveStateForHistory();
        const cells = getRangeCells(selectionStart, selectionEnd);
        cells.forEach(c => setCellValue(c, ""));
        reevaluateAll();
        e.preventDefault();
      }
      else if (e.ctrlKey && e.key === "z") { undo(); e.preventDefault(); }
      else if (e.ctrlKey && e.key === "y") { redo(); e.preventDefault(); }
      else if (e.ctrlKey && e.key === "b") { formatActiveCell('bold'); e.preventDefault(); }
      else if (e.ctrlKey && e.key === "i") { formatActiveCell('italic'); e.preventDefault(); }
      else if (e.ctrlKey && e.key === "u") { formatActiveCell('underline'); e.preventDefault(); }
      else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        editCell(selectedCell, e.key);
        e.preventDefault();
      }
    }

    function handleFormulaBarInput(e) { setCellValue(selectedCell, e.target.value); }
    function handleFormulaBarKeyDown(e) {
      if (e.key === "Enter") {
        document.getElementById("formula-bar-input").blur();
        reevaluateAll();
        const col = selectedCell.match(/[A-Z]+/i)[0].toUpperCase();
        const row = parseInt(selectedCell.match(/[0-9]+/)[0]);
        if (row < currentRowsRendered) selectCell(`${col}${row + 1}`);
      }
    }

    // -------------------------------------------------------------------------
    // CHART GENERATION
    // -------------------------------------------------------------------------
    function generateChart() {
      if (!selectionStart || !selectionEnd || selectionStart === selectionEnd) {
        alert("Please click and drag to select a range of cells before creating a chart.");
        return;
      }
      
      const bounds = getRangeBounds(selectionStart, selectionEnd);
      const labels = [];
      const datasets = [];
      
      for (let c = bounds.minCol + 1; c <= bounds.maxCol; c++) {
        datasets.push({
          label: evaluateCell(`${COLUMNS[c]}${bounds.minRow}`) || `Series ${c - bounds.minCol}`,
          data: [],
          borderWidth: 2,
          borderRadius: 4,
          backgroundColor: 'rgba(37, 99, 235, 0.5)',
          borderColor: 'rgba(37, 99, 235, 1)'
        });
      }
      
      for (let r = bounds.minRow + 1; r <= bounds.maxRow; r++) {
        labels.push(evaluateCell(`${COLUMNS[bounds.minCol]}${r}`));
        for (let c = bounds.minCol + 1; c <= bounds.maxCol; c++) {
          const val = parseFloat(evaluateCell(`${COLUMNS[c]}${r}`));
          datasets[c - bounds.minCol - 1].data.push(isNaN(val) ? 0 : val);
        }
      }

      const chartId = 'chart_' + Date.now();
      if (!sheets[activeSheet].charts) sheets[activeSheet].charts = [];
      sheets[activeSheet].charts.push({
        id: chartId,
        config: { type: 'bar', data: { labels, datasets }, options: { responsive: true, maintainAspectRatio: false } },
        x: 100, y: 100, width: 400, height: 250
      });
      
      saveToLocalStorage();
      renderCharts();
    }

    function renderCharts() {
      const layer = document.getElementById("charts-layer");
      layer.innerHTML = "";
      const charts = sheets[activeSheet].charts || [];
      
      charts.forEach((chartData, index) => {
        const chartDiv = document.createElement('div');
        chartDiv.className = "absolute bg-white dark:bg-slate-800 shadow-xl border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden pointer-events-auto flex flex-col";
        chartDiv.style.left = `${chartData.x}px`;
        chartDiv.style.top = `${chartData.y}px`;
        chartDiv.style.width = `${chartData.width}px`;
        chartDiv.style.height = `${chartData.height}px`;
        chartDiv.style.zIndex = 50 + index;
        
        chartDiv.innerHTML = `
          <div class="chart-header bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 py-1.5 flex justify-between items-center cursor-move select-none">
            <span class="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">Visualization Widget</span>
            <button onclick="deleteChart('${chartData.id}')" class="text-slate-400 hover:text-rose-500 transition-colors"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
          </div>
          <div class="flex-1 p-3 min-h-0 relative bg-white dark:bg-slate-800">
            <canvas id="${chartData.id}"></canvas>
          </div>
        `;
        layer.appendChild(chartDiv);
        
        const ctx = document.getElementById(chartData.id).getContext('2d');
        new Chart(ctx, chartData.config);
        
        let isDraggingChart = false, startX, startY;
        chartDiv.querySelector('.chart-header').addEventListener('mousedown', (e) => {
          isDraggingChart = true;
          startX = e.clientX - chartData.x;
          startY = e.clientY - chartData.y;
        });
        window.addEventListener('mousemove', (e) => {
          if (!isDraggingChart) return;
          chartData.x = e.clientX - startX;
          chartData.y = e.clientY - startY;
          chartDiv.style.transform = `translate(${chartData.x}px, ${chartData.y}px)`;
        });
        window.addEventListener('mouseup', () => {
          if (isDraggingChart) { isDraggingChart = false; chartDiv.style.transform = 'none'; chartDiv.style.left = `${chartData.x}px`; chartDiv.style.top = `${chartData.y}px`; saveToLocalStorage(); }
        });
      });
      lucide.createIcons();
    }

    function deleteChart(id) {
      if(sheets[activeSheet] && sheets[activeSheet].charts) {
        sheets[activeSheet].charts = sheets[activeSheet].charts.filter(c => c.id !== id);
        saveToLocalStorage();
        renderCharts();
      }
    }

    // -------------------------------------------------------------------------
    // HELPERS & RANGE UTILITIES
    // -------------------------------------------------------------------------
    function getRangeBounds(start, end) {
      const sCol = start.match(/[A-Z]+/i)[0].toUpperCase();
      const sRow = parseInt(start.match(/[0-9]+/)[0]);
      const eCol = end.match(/[A-Z]+/i)[0].toUpperCase();
      const eRow = parseInt(end.match(/[0-9]+/)[0]);
      return {
        minCol: Math.min(COLUMNS.indexOf(sCol), COLUMNS.indexOf(eCol)),
        maxCol: Math.max(COLUMNS.indexOf(sCol), COLUMNS.indexOf(eCol)),
        minRow: Math.min(sRow, eRow),
        maxRow: Math.max(sRow, eRow)
      };
    }

    function getRangeCells(start, end) {
      const bounds = getRangeBounds(start, end);
      let list = [];
      for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
        for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
          list.push(`${COLUMNS[c]}${r}`);
        }
      }
      return list;
    }

    // -------------------------------------------------------------------------
    // FORMATTING, FILE OPS & SIDEBAR LOGIC
    // -------------------------------------------------------------------------
    function formatActiveCell(type) {
      saveStateForHistory();
      const activeData = sheets[activeSheet] || {};
      if (!activeData[selectedCell]) activeData[selectedCell] = { value: "", formula: "", style: {} };
      if (!activeData[selectedCell].style) activeData[selectedCell].style = {};
      const style = activeData[selectedCell].style;
      if (type === 'bold') style.bold = !style.bold;
      if (type === 'italic') style.italic = !style.italic;
      if (type === 'underline') style.underline = !style.underline;
      if (type === 'align-left') style.align = 'left';
      if (type === 'align-center') style.align = 'center';
      if (type === 'align-right') style.align = 'right';
      saveToLocalStorage();
      reevaluateAll();
    }

    function applyColor(type, val) {
      saveStateForHistory();
      const activeData = sheets[activeSheet] || {};
      if (!activeData[selectedCell]) activeData[selectedCell] = { value: "", formula: "", style: {} };
      if (!activeData[selectedCell].style) activeData[selectedCell].style = {};
      activeData[selectedCell].style[type] = val;
      if (type === 'textColor') document.getElementById("color-text-indicator").style.backgroundColor = val;
      if (type === 'bgColor') document.getElementById("color-bg-indicator").style.backgroundColor = val;
      saveToLocalStorage();
      reevaluateAll();
    }

    function toggleSidebar() {
      const sidebar = document.getElementById("sidebar");
      sidebar.classList.toggle("hidden");
    }

    function clearGrid() {
      if(confirm("Are you sure you want to clear all data in this sheet?")) {
        saveStateForHistory();
        sheets[activeSheet] = {};
        saveToLocalStorage();
        rebuildGrid();
      }
    }

    // -------------------------------------------------------------------------
    // CUSTOM ADDON FUNCTIONS ENGINE
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
          const date = new Date(); date.setHours(h, m - cycles * 90, 0, 0);
          return `Bed at ${date.toTimeString().slice(0, 5)}`;
        }
        case "WATER": return `${Math.round(getNum(args[0]) * 35 + getNum(args[1]) * 12)} mL`;
        case "CALORIE": {
          const m = getNum(args[0]), goal = getStr(args[1]).toLowerCase();
          return `${Math.round(goal === "lose" ? m - 500 : goal === "gain" ? m + 300 : m)} kcal`;
        }
        case "PROTEIN": {
          const w = getNum(args[0]); return `${Math.round(w * 1.6)}g - ${Math.round(w * 2.2)}g`;
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
        case "HOURLYTOYEARLY": return `$${(getNum(args[0]) * getNum(args[1]) * 52).toLocaleString()}/yr`;
        case "LOAN": {
          const p = getNum(args[0]), r = getNum(args[1]) / 100 / 12, n = getNum(args[2]) * 12;
          if (!r) return `$${(p / n).toFixed(2)}`;
          const pay = p * r / (1 - (1 + r) ** -n);
          return `$${pay.toFixed(2)}/mo`;
        }
        case "SUBSCRIPTION": return `$${(getNum(args[0]) * getNum(args[1]) * 12).toFixed(2)}/yr`;
        case "UNITPRICE": {
          const rateA = getNum(args[1]) ? getNum(args[0]) / getNum(args[1]) : 0;
          const rateB = getNum(args[3]) ? getNum(args[2]) / getNum(args[3]) : 0;
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
        case "WORDCOUNT": return `${getStr(args[0]) ? getStr(args[0]).split(/\s+/).length : 0} words`;
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
        case "SLUG": return getStr(args[0]).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        case "CHARLIMIT": return getStr(args[0]).slice(0, getNum(args[1]) || 160);
        case "PASSWORD": {
          const len = getNum(args[0]) || 12;
          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789" + (getStr(args[1]).toLowerCase() === "yes" ? "!@#$%^&*_-+=" : "");
          return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        }
        case "UNIQUE": return [...new Set(getStr(args[0]).split("\n").filter(Boolean))].join(", ");
        case "EXCHANGE": return `$${(getNum(args[0]) * getNum(args[1])).toFixed(2)}`;
        case "TIMEOFFSET": {
          const [h, m] = (getStr(args[0]) || "00:00").split(":").map(Number);
          const date = new Date(); date.setHours(h + getNum(args[1]), m, 0, 0);
          return date.toTimeString().slice(0, 5);
        }
        case "ASPECT": return `${Math.round(getNum(args[1]) * (getNum(args[2]) / (getNum(args[0]) || 1)))}px`;
        case "CONTRAST": return "Ratio Output Simulated";
        case "BIZMODEL": {
          const rev = getNum(args[0]) * getNum(args[2]), gross = (getNum(args[0]) - getNum(args[1])) * getNum(args[2]);
          return `Net Profit: $${(gross - getNum(args[3]) - getNum(args[4])).toFixed(0)}`;
        }
        case "BREAKEVEN": {
          const contrib = getNum(args[1]) - getNum(args[2]);
          return contrib > 0 ? `${Math.ceil(getNum(args[0]) / contrib)} units` : "N/A";
        }
        case "RUNWAY": {
          const burn = getNum(args[2]) - getNum(args[1]);
          return burn <= 0 ? "Positive Cashflow" : `${(getNum(args[0]) / burn).toFixed(1)} months`;
        }
        case "REORDER": {
          const rop = getNum(args[1]) * getNum(args[2]) + getNum(args[3]);
          return getNum(args[0]) <= rop ? `REORDER (ROP: ${rop})` : `OK (ROP: ${rop})`;
        }
        case "MACROS": return `Prot: ${(getNum(args[0]) * (getNum(args[1])/100) / 4).toFixed(0)}g | Fat: ${(getNum(args[0]) * (getNum(args[2])/100) / 9).toFixed(0)}g | Carb: ${(getNum(args[0]) * (1 - getNum(args[1])/100 - getNum(args[2])/100) / 4).toFixed(0)}g`;
        case "OVULATION": {
          const d = new Date(getStr(args[0])); d.setDate(d.getDate() + (getNum(args[1]) || 28) - 14);
          return isNaN(d) ? "Inv date" : d.toISOString().split('T')[0];
        }
        case "DUEDATE": {
          const d = new Date(getStr(args[0])); d.setDate(d.getDate() + 280);
          return isNaN(d) ? "Inv date" : d.toISOString().split('T')[0];
        }
        case "ZODIAC": {
          const m = new Date(getStr(args[0])).getMonth()+1, d = new Date(getStr(args[0])).getDate();
          if((m==3&&d>=21)||(m==4&&d<=19)) return "Aries";
          if((m==4&&d>=20)||(m==5&&d<=20)) return "Taurus";
          if((m==5&&d>=21)||(m==6&&d<=20)) return "Gemini";
          return "Cancer/Leo/Virgo/Libra/Scorpio/Sagittarius/Capricorn/Aquarius/Pisces (simulated)";
        }
        case "MOONPHASE": return "Waxing Crescent (estimated)";
        case "DAYSINMONTH": {
          const d = new Date(getStr(args[0])); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        }
        case "SCRAMBLE": return getStr(args[0]).split('').sort(() => 0.5 - Math.random()).join('');
        case "ANAGRAM": return getStr(args[0]).split('').sort().join('') === getStr(args[1]).split('').sort().join('') ? 'TRUE' : 'FALSE';
        case "PALINDROME": return getStr(args[0]).toLowerCase().replace(/[^a-z0-9]/g, '') === getStr(args[0]).toLowerCase().replace(/[^a-z0-9]/g, '').split('').reverse().join('') ? 'TRUE' : 'FALSE';
        case "RANDOMQUOTE": {
          const quotes = ["Action is the foundational key.", "Do it now.", "Don't wait for opportunity, create it.", "Keep pushing forward."];
          return quotes[Math.floor(Math.random()*quotes.length)];
        }
        default: return "#UNKNOWN";
      }
    }

    // -------------------------------------------------------------------------
    // LOCAL STORAGE, WORKBOOKS, HISTORY
    // -------------------------------------------------------------------------
    function getWorkbookIdFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("file");
      return id && /^[a-zA-Z0-9_-]+$/.test(id) ? id : null;
    }

    function getWorkbookStorageKey(id) { return `envizion_excel_workbook_${id}`; }
    function makeWorkbookId() { return `wb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
    
    function readWorkbookIndex() {
      try { return JSON.parse(localStorage.getItem(WORKBOOK_INDEX_KEY) || "[]"); } 
      catch (e) { return []; }
    }

    function writeWorkbookIndex(items) { localStorage.setItem(WORKBOOK_INDEX_KEY, JSON.stringify(items)); }
    
    function ensureDefaultWorkbook() {
      const existing = readWorkbookIndex()[0];
      if (existing?.id) return existing.id;
      const id = makeWorkbookId();
      const now = new Date().toISOString();
      writeWorkbookIndex([{ id, title: "Envizion Excel Workbench", createdAt: now, updatedAt: now }]);
      localStorage.setItem(LAST_WORKBOOK_KEY, id);
      return id;
    }

    function syncWorkbookIndex() {
      const title = document.getElementById("project-title")?.value || "Untitled";
      const now = new Date().toISOString();
      const index = readWorkbookIndex();
      const existing = index.find((item) => item.id === currentWorkbookId);
      writeWorkbookIndex([{ id: currentWorkbookId, title, createdAt: existing?.createdAt || now, updatedAt: now }, ...index.filter((item) => item.id !== currentWorkbookId)]);
      localStorage.setItem(LAST_WORKBOOK_KEY, currentWorkbookId);
    }

    function saveToLocalStorage() {
      const title = document.getElementById("project-title").value;
      if (!currentWorkbookId) currentWorkbookId = ensureDefaultWorkbook();
      localStorage.setItem(getWorkbookStorageKey(currentWorkbookId), JSON.stringify({ sheets, activeSheet, title }));
      syncWorkbookIndex();
    }

    function saveStateForHistory() {
      historyUndo.push(JSON.stringify(sheets));
      historyRedo = []; 
    }

    function undo() {
      if (historyUndo.length > 0) {
        historyRedo.push(JSON.stringify(sheets));
        sheets = JSON.parse(historyUndo.pop());
        rebuildGrid();
        saveToLocalStorage();
      }
    }

    function redo() {
      if (historyRedo.length > 0) {
        historyUndo.push(JSON.stringify(sheets));
        sheets = JSON.parse(historyRedo.pop());
        rebuildGrid();
        saveToLocalStorage();
      }
    }

    // -------------------------------------------------------------------------
    // FILE/WORKBOOK MANAGEMENT (UPGRADES)
    // -------------------------------------------------------------------------
    function createNewWorkbookFromApp() {
      saveStateForHistory();
      const newId = makeWorkbookId();
      const now = new Date().toISOString();
      const index = readWorkbookIndex();
      writeWorkbookIndex([{ id: newId, title: "New Workbook", createdAt: now, updatedAt: now }, ...index]);
      
      currentWorkbookId = newId;
      sheets = { "Sheet 1": {} };
      activeSheet = "Sheet 1";
      document.getElementById("project-title").value = "New Workbook";
      
      saveToLocalStorage();
      renderSheetTabs();
      rebuildGrid();
    }

    function renameCurrentWorkbook() {
      const currentTitle = document.getElementById("project-title").value;
      const newTitle = prompt("Enter new name for this workbook:", currentTitle);
      if (newTitle && newTitle.trim()) {
        document.getElementById("project-title").value = newTitle.trim();
        saveToLocalStorage();
      }
    }

    function copyCurrentWorkbook() {
      const currentTitle = document.getElementById("project-title").value;
      const newId = makeWorkbookId();
      const now = new Date().toISOString();
      const index = readWorkbookIndex();
      writeWorkbookIndex([{ id: newId, title: `${currentTitle} (Copy)`, createdAt: now, updatedAt: now }, ...index]);
      
      localStorage.setItem(getWorkbookStorageKey(newId), JSON.stringify({ sheets, activeSheet, title: `${currentTitle} (Copy)` }));
      alert("Workbook copy created successfully!");
    }

    // Sheet Tabs Manager
    function renderSheetTabs() {
      const container = document.getElementById("sheet-tabs-container");
      container.innerHTML = Object.keys(sheets).map(sheetName => {
        const isActive = sheetName === activeSheet;
        const activeClass = isActive ? "bg-white dark:bg-slate-900 text-brand-600 shadow-sm font-bold" : "text-slate-500";
        return `<div class="flex items-center gap-1 px-3 py-1 rounded-md text-xs cursor-pointer ${activeClass}" onclick="switchSheet('${sheetName}')">
            <span>${sheetName}</span>
            ${Object.keys(sheets).length > 1 ? `<button onclick="event.stopPropagation(); deleteSheet('${sheetName}')"><i data-lucide="x" class="w-2.5 h-2.5"></i></button>` : ""}
          </div>`;
      }).join("");
      lucide.createIcons();
    }
    
    function switchSheet(name) { if(isEditing) saveCellEditingValue(); activeSheet = name; renderSheetTabs(); rebuildGrid(); saveToLocalStorage(); }
    function addSheet() { saveStateForHistory(); const newName = `Sheet ${Object.keys(sheets).length + 1}`; sheets[newName] = {}; activeSheet = newName; renderSheetTabs(); rebuildGrid(); saveToLocalStorage(); }
    function deleteSheet(name) { if(Object.keys(sheets).length <= 1) return; saveStateForHistory(); delete sheets[name]; if(activeSheet === name) activeSheet = Object.keys(sheets)[0]; renderSheetTabs(); rebuildGrid(); saveToLocalStorage(); }

    function toggleFormulaHelp() { document.getElementById("formula-help-overlay").classList.toggle("hidden"); }

    function renderFormulaGlossary() {
      const container = document.getElementById("formulas-glossary");
      const items = TOOLS.map(tool => `<div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-1"><div class="flex items-center justify-between"><strong class="text-brand-600 dark:text-brand-400 font-mono">${tool.exampleFormula.split('(')[0]}(...)</strong><span class="text-[9px] font-bold text-slate-400 uppercase">${tool.category}</span></div><p class="text-slate-600 dark:text-slate-300">${tool.desc}</p><div class="text-[10px] bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded font-mono text-slate-500">Ex: <span class="text-emerald-600">${tool.exampleFormula}</span></div></div>`).join("");

      container.innerHTML = `
        <div class="space-y-4">
          <div class="p-4 bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200 rounded-xl space-y-2">
            <h4 class="font-bold text-sm">Full Standard Excel Engine Active</h4>
            <p class="text-xs leading-relaxed opacity-90">
              The workbench supports <b>nearly every standard Excel and Sheets formula out-of-the-box</b>.
            </p>
            <div class="grid grid-cols-2 gap-4 text-xs font-mono opacity-80 pt-1">
              <ul class="space-y-1 list-disc pl-4">
                <li><b>Basic:</b> SUM, AVERAGE, MIN, MAX, PRODUCT</li>
                <li><b>Logic:</b> IF, IFS, IFERROR, COUNTIF, SUMIF</li>
                <li><b>Maths:</b> +, -, *, /, ^ (Exponents)</li>
                <li><b>Financial:</b> PMT, FV, PV, IRR, NPV</li>
              </ul>
              <ul class="space-y-1 list-disc pl-4">
                <li><b>Text:</b> CONCATENATE, LEN, LEFT, RIGHT, UPPER</li>
                <li><b>Lookup:</b> VLOOKUP, HLOOKUP, INDEX, MATCH</li>
                <li><b>Dates:</b> NETWORKDAYS, DATE, TODAY</li>
                <li><b>Stats:</b> MEDIAN, MODE, RANK, STDEV</li>
              </ul>
            </div>
            <p class="text-[10px] pt-1 opacity-70 italic">Example usages: =SUM(A1:B10) or =IF(A1>50, "Pass", "Fail") or =VLOOKUP(A1, B1:C10, 2)</p>
          </div>
          <div class="space-y-2">
            <h4 class="font-bold text-slate-700 dark:text-slate-300">Custom Envizion Tools Add-ons</h4>
            ${items}
          </div>
        </div>
      `;
    }

    function escapeHtml(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

    // Search and Render logic for Sidebar Tools
    function renderAddonsList() {
      const filterCat = document.getElementById("addon-categories");
      const categories = ["All", ...new Set(TOOLS.map(t => t.category))];
      filterCat.innerHTML = categories.map(cat => `<button onclick="filterCategory('${cat}')" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-600 transition-all shrink-0">${cat}</button>`).join("");
      displayToolsList(TOOLS);
    }
    
    function displayToolsList(toolsArray) {
      document.getElementById("addons-list").innerHTML = toolsArray.map(tool => `
        <div onclick="openAddonTool('${tool.id}')" class="p-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800/80 rounded-xl hover:border-brand-500 cursor-pointer transition-all space-y-1.5 select-none">
          <div class="flex items-center justify-between"><span class="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${CATEGORY_COLOURS[tool.category] || "bg-slate-100 text-slate-800"}">${tool.category}</span><code class="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono px-1 py-0.5 rounded">${tool.exampleFormula}</code></div>
          <h3 class="text-xs font-extrabold">${tool.title}</h3><p class="text-[10px] text-slate-400 font-medium">${tool.desc}</p>
        </div>`).join("");
    }
    
    function filterCategory(cat) { displayToolsList(cat === "All" ? TOOLS : TOOLS.filter(t => t.category === cat)); }
    function filterAddons(e) { const q = e.target.value.toLowerCase().trim(); displayToolsList(TOOLS.filter(t => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q))); }
    
    function openAddonTool(toolId) {
      const tool = TOOLS.find(t => t.id === toolId);
      if(!tool) return;
      const panel = document.getElementById("active-tool-panel");
      panel.classList.remove("hidden");
      let html = `<div class="space-y-3"><div class="flex items-center justify-between border-b pb-2"><h4 class="text-xs font-bold flex gap-1"><i data-lucide="sparkles" class="w-3.5 h-3.5 text-brand-500"></i> ${tool.title}</h4><button onclick="closeToolPanel()"><i data-lucide="x" class="w-3.5 h-3.5"></i></button></div><form id="active-tool-form" class="space-y-2 text-xs">`;
      tool.fields.forEach((f, idx) => {
        html += `<div class="flex justify-between items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border shadow-sm"><div><span class="block text-[10px] font-bold uppercase">${f.label}</span></div>`;
        if (f.type === "select") html += `<select id="tool-f-${idx}" class="bg-slate-50 border rounded px-2 py-1 text-xs outline-none w-28">${f.options.map(opt => `<option value="${opt}">${opt}</option>`).join("")}</select>`;
        else html += `<input type="text" id="tool-f-${idx}" placeholder="Cell or val" class="w-28 bg-slate-50 border rounded px-2 py-1 text-xs outline-none">`;
        html += `</div>`;
      });
      html += `<div class="pt-2 border-t space-y-1.5"><label class="block text-[10px] font-bold uppercase">Destination</label><div class="flex gap-2"><input type="text" id="tool-dest-cell" value="${selectedCell}" class="w-20 text-center font-bold bg-slate-100 border rounded py-1 text-xs"><button type="button" onclick="document.getElementById('tool-dest-cell').value = selectedCell" class="px-2 py-1 bg-slate-200 text-[10px] rounded">Use Selected</button></div></div>`;
      html += `<div class="flex gap-1.5 pt-3"><button type="button" onclick="injectCompiledFormula('${tool.id}')" class="flex-1 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-lg text-center">Insert Formula</button><button type="button" onclick="closeToolPanel()" class="px-3 py-2 bg-slate-200 rounded-lg font-bold">Cancel</button></div></form></div>`;
      panel.innerHTML = html;
      lucide.createIcons();
    }
    
    function closeToolPanel() { document.getElementById("active-tool-panel").classList.add("hidden"); }
    function injectCompiledFormula(toolId) {
      const tool = TOOLS.find(t => t.id === toolId);
      const dest = document.getElementById("tool-dest-cell").value.toUpperCase().trim();
      saveStateForHistory();
      const args = [];
      tool.fields.forEach((f, idx) => {
        const inputVal = document.getElementById(`tool-f-${idx}`).value.trim();
        if (f.type === "select" || (isNaN(parseFloat(inputVal)) && !/^[A-Z]+[0-9]+$/i.test(inputVal) && inputVal.length > 0)) args.push(`"${inputVal}"`);
        else args.push(inputVal || "0");
      });
      const mapping = { "age-calculator": "AGE", "date-difference": "DATEDIFF", "countdown-maker": "COUNTDOWN", "mortgage-calc": "PMT", "compound-interest": "FV", "business-model": "BIZMODEL" };
      const mapped = mapping[toolId] || toolId.toUpperCase().replace(/-/g, "");
      setCellValue(dest, `=${mapped}(${args.join(", ")})`);
      selectCell(dest);
      closeToolPanel();
    }
    
    function toggleTheme() {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      document.getElementById("theme-sun").classList.toggle("hidden", !isDark);
      document.getElementById("theme-moon").classList.toggle("hidden", isDark);
    }

    // -------------------------------------------------------------------------
    // EXCEL RIBBON & COMMAND FUNCTIONALITY
    // -------------------------------------------------------------------------

    // 1. Tab Switching Engine
    function switchRibbonTab(tabId) {
      const tabs = ['home', 'insert', 'formulas', 'data', 'view'];
      tabs.forEach(t => {
        const btn = document.getElementById('tab-btn-' + t);
        const content = document.getElementById('ribbon-' + t);
        if (!btn || !content) return;
        
        if (t === tabId) {
          content.classList.remove('hidden');
          content.classList.add('flex');
          btn.className = "px-3 py-1.5 text-xs font-semibold rounded-t bg-white dark:bg-slate-900 border-t border-l border-r border-slate-200 dark:border-slate-800 text-brand-600 dark:text-brand-400";
        } else {
          content.classList.remove('flex');
          content.classList.add('hidden');
          btn.className = "px-3 py-1.5 text-xs font-semibold rounded-t text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 border-t border-l border-r border-transparent transition-colors";
        }
      });
      if (window.lucide) lucide.createIcons();
    }

    // 2. Clipboard Group (Fully Localized & Preserves Data/Formulas)
    let internalClipboard = null;

    function execCopy() {
      internalClipboard = getRangeCells(selectionStart, selectionEnd).map(coord => ({
        coord,
        data: JSON.parse(JSON.stringify((sheets[activeSheet] || {})[coord] || {value: "", formula: "", style: {}}))
      }));
    }

    function execCut() {
      execCopy();
      clearSelectedCells();
    }

    function execPaste() {
      if (!internalClipboard || !internalClipboard.length) return;
      saveStateForHistory();

      const baseColIdx = COLUMNS.indexOf(selectionStart.match(/[A-Z]+/i)[0].toUpperCase());
      const baseRowIdx = parseInt(selectionStart.match(/[0-9]+/)[0]);
      const sourceBaseColIdx = COLUMNS.indexOf(internalClipboard[0].coord.match(/[A-Z]+/i)[0].toUpperCase());
      const sourceBaseRowIdx = parseInt(internalClipboard[0].coord.match(/[0-9]+/)[0]);

      internalClipboard.forEach(item => {
        const cIdx = COLUMNS.indexOf(item.coord.match(/[A-Z]+/i)[0].toUpperCase());
        const rIdx = parseInt(item.coord.match(/[0-9]+/)[0]);
        const targetColIdx = baseColIdx + (cIdx - sourceBaseColIdx);
        const targetRowIdx = baseRowIdx + (rIdx - sourceBaseRowIdx);

        if (targetColIdx >= 0 && targetColIdx < COLUMNS.length) {
          const targetCoord = `${COLUMNS[targetColIdx]}${targetRowIdx}`;
          if (!sheets[activeSheet]) sheets[activeSheet] = {};
          sheets[activeSheet][targetCoord] = JSON.parse(JSON.stringify(item.data));
        }
      });
      
      reevaluateAll();
      saveToLocalStorage();
    }

    function clearSelectedCells() {
      saveStateForHistory();
      const cells = getRangeCells(selectionStart, selectionEnd);
      cells.forEach(c => setCellValue(c, ""));
      reevaluateAll();
    }

    // 3. Formulas Group (Show Formulas feature)
    function toggleShowFormulas() {
      showFormulasMode = !showFormulasMode;
      const btn = document.getElementById('btn-show-formulas');
      if (showFormulasMode) {
        btn.classList.add('bg-brand-100', 'dark:bg-brand-900', 'text-brand-600', 'dark:text-brand-400');
      } else {
        btn.classList.remove('bg-brand-100', 'dark:bg-brand-900', 'text-brand-600', 'dark:text-brand-400');
      }
      reevaluateAll(); 
    }

    // 4. Data Group (Sorting & Cleaning)
    function sortSelectedRange(direction = 'asc') {
      const bounds = getRangeBounds(selectionStart, selectionEnd);
      if (bounds.minRow === bounds.maxRow) return;
      saveStateForHistory();

      const rowsData = [];
      for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
        const row = [];
        for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
          const coord = `${COLUMNS[c]}${r}`;
          row.push((sheets[activeSheet] || {})[coord] || {value: "", formula: "", style: {}});
        }
        rowsData.push(row);
      }

      rowsData.sort((a, b) => {
        const valA = (a[0].value || "").toString().toLowerCase();
        const valB = (b[0].value || "").toString().toLowerCase();
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });

      for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
        for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
          const coord = `${COLUMNS[c]}${r}`;
          if (!sheets[activeSheet]) sheets[activeSheet] = {};
          sheets[activeSheet][coord] = rowsData[r - bounds.minRow][c - bounds.minCol];
        }
      }
      reevaluateAll();
      saveToLocalStorage();
    }

    function removeDuplicates() {
      const bounds = getRangeBounds(selectionStart, selectionEnd);
      if (bounds.minRow === bounds.maxRow) return;
      saveStateForHistory();

      const seen = new Set();
      const uniqueRows = [];

      for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
        const row = [];
        let rowStr = "";
        for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
          const coord = `${COLUMNS[c]}${r}`;
          const cellData = (sheets[activeSheet] || {})[coord] || {value: "", formula: "", style: {}};
          row.push(cellData);
          rowStr += cellData.value + "|";
        }
        if (!seen.has(rowStr)) {
          seen.add(rowStr);
          uniqueRows.push(row);
        }
      }

      let currRow = bounds.minRow;
      uniqueRows.forEach(row => {
        for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
          const coord = `${COLUMNS[c]}${currRow}`;
          sheets[activeSheet][coord] = row[c - bounds.minCol];
        }
        currRow++;
      });

      for (let r = currRow; r <= bounds.maxRow; r++) {
        for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
          const coord = `${COLUMNS[c]}${r}`;
          sheets[activeSheet][coord] = {value: "", formula: "", style: {}};
        }
      }

      reevaluateAll();
      saveToLocalStorage();
    }

    // 5. View Group (Zoom & Gridlines)
    let hideGridlinesMode = false;
    function toggleGridlines() {
      hideGridlinesMode = !hideGridlinesMode;
      const btn = document.getElementById('btn-gridlines');
      
      if (hideGridlinesMode) {
        btn.classList.remove('bg-slate-200', 'dark:bg-slate-700');
        let style = document.getElementById('gridline-override-style');
        if (!style) {
          style = document.createElement('style');
          style.id = 'gridline-override-style';
          document.head.appendChild(style);
        }
        style.innerHTML = '#excel-grid-inner div[id^="cell-"] { border-right-color: transparent !important; border-bottom-color: transparent !important; }';
      } else {
        btn.classList.add('bg-slate-200', 'dark:bg-slate-700');
        const style = document.getElementById('gridline-override-style');
        if (style) style.innerHTML = '';
      }
    }

    function setZoom(scale) {
      const grid = document.getElementById('excel-grid');
      grid.style.transform = `scale(${scale})`;
      grid.style.transformOrigin = 'top left';
      grid.style.width = `${100 / scale}%`;
      grid.style.height = `${100 / scale}%`;
    }
  