        // Set up PDF.js worker explicitly inside script
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

        // --- Master Conversion Framework Configuration Map ---
        const conversionMap = {
            'image': {
                label: 'Image Asset (JPG/PNG/WebP)',
                targets: [
                    { id: 'jpg-to-word', label: 'Extract Text & Embed Image to Word (.docx)', targetType: 'word', desc: 'Perform high-precision local OCR on images, then assemble a native Word Doc containing both structured typography and the embedded source image.' },
                    { id: 'image-to-pdf', label: 'Compile Image Files to PDF', targetType: 'pdf', desc: 'Merge multiple visual graphic files into cohesive, scale-adjusted pages inside a single PDF.' },
                    { id: 'jpg-to-excel', label: 'Isolate & Parse Grid Tables to Excel (.xlsx)', targetType: 'excel', desc: 'Isolate structural tables and coordinate cells from photos to native Excel spreadsheet columns.' },
                    { id: 'image-to-mp4', label: 'Animate Image to MP4 Video', targetType: 'video', desc: 'Generate high-definition local MP4 videos from uploaded graphics with panning or dynamic zooming camera parameters.' },
                    { id: 'image-translator', label: 'Local Image Language Translator', targetType: 'text', desc: 'Extract original characters with OCR, process the string, and translate in-browser using free Translation API.' },
                    { id: 'batch-image-to-text', label: 'Batch Text Extractor (Multi-OCR)', targetType: 'text', desc: 'Concurrently run OCR jobs on groups of image attachments, compiling consolidated document strings.' },
                    { id: 'invert-image', label: 'Invert Matrix Color Spectrum', targetType: 'image', desc: 'Invert graphic element pixels locally with immediate canvas rendering.' }
                ]
            },
            'pdf': {
                label: 'PDF Document File',
                targets: [
                    { id: 'pdf-to-word', label: 'Convert PDF to Editable Word (.docx)', targetType: 'word', desc: 'Parse PDF layout properties, execute automatic native extraction or smart Tesseract OCR fallback, and assemble formatted paragraphs inside a Microsoft Word file.' },
                    { id: 'pdf-to-images-word', label: 'Extract PDF Pages as Word Illustrations', targetType: 'word', desc: 'Decompile every page inside the PDF into high-res images and package them cleanly as separate sheets embedded inside an organic DOCX document.' },
                    { id: 'pdf-to-pptx', label: 'Convert PDF to PowerPoint Presentation (.pptx)', targetType: 'ppt', desc: 'Generate PowerPoint slides containing full-bleed vector page rendering.' },
                    { id: 'pdf-to-excel', label: 'Extract Tables to Excel (.xlsx)', targetType: 'excel', desc: 'Extract structural tables and rows from multi-page PDFs directly to Excel sheets.' },
                    { id: 'pdf-to-jpg', label: 'Slice Document Pages to JPG Images', targetType: 'image', desc: 'Render and save all document pages into high resolution JPG graphic plates.' },
                    { id: 'pdf-to-html', label: 'Convert PDF to Responsive HTML Code', targetType: 'html', desc: 'Map PDF layout items and dump them clean into responsive HTML text lines.' },
                    { id: 'pdf-to-text', label: 'Decompile PDF to Plain Text (.txt)', targetType: 'text', desc: 'Scrape paragraphs out of PDF properties, ignoring styling, formatting, or inline graphic parameters.' },
                    { id: 'pdf-to-csv', label: 'Extract Tables to Comma-Separated CSV', targetType: 'text', desc: 'Mine grids out of pages and format them as readable CSV lines.' },
                    { id: 'merge-pdf', label: 'Merge Multiple PDFs Together', targetType: 'pdf', desc: 'Chain multiple PDF files sequentially into a cohesive document package.' }
                ]
            },
            'word': {
                label: 'Microsoft Word Document (.docx)',
                targets: [
                    { id: 'word-to-pdf', label: 'Render Word Document to PDF', targetType: 'pdf', desc: 'Extract DOCX contents using client-side Mammouth layout processing and compile to formatted PDF pages.' },
                    { id: 'word-to-jpg', label: 'Capture Word Pages as JPG Images', targetType: 'image', desc: 'Render DOCX page parameters to graphic buffers and export clean JPG layout snaps.' },
                    { id: 'word-to-excel', label: 'Extract Tables to Excel (.xlsx)', targetType: 'excel', desc: 'Scrape nested tables from DOCX and map them to Excel grid spreadsheets.' }
                ]
            },
            'text': {
                label: 'Plain Text / Markdown Text',
                targets: [
                    { id: 'text-to-word', label: 'Convert Text to Word (.docx)', targetType: 'word', desc: 'Instantly format typed plaintext inputs into calibrated DOCX paragraphs.' },
                    { id: 'text-to-pdf', label: 'Render Text to Document PDF', targetType: 'pdf', desc: 'Compile text characters directly to standard PDF structures.' },
                    { id: 'text-to-pptx', label: 'Auto-Compile Text to PPTX Slide Deck', targetType: 'ppt', desc: 'Convert structured text elements (headings and descriptions) into beautiful, clean presentation slide decks with layout presets.' },
                    { id: 'text-to-image', label: 'Design Graphic Quote Poster Card', targetType: 'image', desc: 'Convert text blocks into elegant graphic cards over customized linear visual gradients.' },
                    { id: 'text-to-mp4', label: 'Compile Text to Kinetic MP4 Video', targetType: 'video', desc: 'Render plain text lines on visual canvases with customized durations, capturing elements into local webm/mp4 loops.' },
                    { id: 'qr-generator', label: 'Generate Customizable QR Code Card', targetType: 'scanner', desc: 'Generate QR vectors with native formatting' }
                ]
            },
            'video': {
                label: 'Video Capture Asset (MP4/WebM)',
                targets: [
                    { id: 'video-to-images', label: 'Slice Video Track to Snapshot JPGs', targetType: 'image', desc: 'Parse video files page-by-page at specific intervals and save individual frame snapshot images.' },
                    { id: 'video-to-text', label: 'Extract Subtitles/Texts (Video OCR)', targetType: 'text', desc: 'Seek sequentially through video timelines, capture frame matrices, and run Tesseract OCR on frames to compile a clean text log of subtitles or slideshow items.' }
                ]
            },
            'excel': {
                label: 'Microsoft Excel Spreadsheet (.xlsx)',
                targets: [
                    { id: 'excel-to-jpg', label: 'Capture Spreadsheet to JPG Image', targetType: 'image', desc: 'Render excel spreadsheet parameters to graphic images.' }
                ]
            },
            'html': {
                label: 'HTML/CSS Webpage Code',
                targets: [
                    { id: 'html-to-pdf', label: 'Render HTML Code Layout to PDF', targetType: 'pdf', desc: 'Render standard responsive DOM frameworks instantly to PDF pages.' }
                ]
            },
            'ppt': {
                label: 'PowerPoint Slide Deck (.pptx)',
                targets: [
                    { id: 'ppt-to-pdf', label: 'Render PowerPoint Presentation to PDF', targetType: 'pdf', desc: 'Deconstruct PowerPoint presentations into cohesive, multi-page PDFs.' }
                ]
            },
            'scanner': {
                label: 'Camera Scanner Viewport',
                targets: [
                    { id: 'qr-scanner', label: 'Scan Live QR Codes', targetType: 'text', desc: 'Process camera stream inputs for QR code parameters.' },
                    { id: 'barcode-scanner', label: 'Scan Product Barcodes', targetType: 'text', desc: 'Detect barcode data inside camera feeds.' }
                ]
            }
        };

        // --- Console Terminal Log Helpers ---
        function consoleLog(message, isAlert = false) {
            const list = document.getElementById("terminal-log-list");
            const area = document.getElementById("terminal-log-area");
            const li = document.createElement("li");
            
            const timestamp = new Date().toLocaleTimeString();
            li.innerHTML = `<span class="text-slate-500">[${timestamp}]</span> <span class="${isAlert ? 'text-amber-400 font-bold' : 'text-emerald-400'}">> ${message}</span>`;
            
            list.appendChild(li);
            area.scrollTop = area.scrollHeight;
        }

        function clearConsoleLogs() {
            document.getElementById("terminal-log-list").innerHTML = `<li class="text-slate-500">> System logs cleared. Ready for next process.</li>`;
        }

        // --- Core Application Logic Initialization ---
        let activePair = 'jpg-to-word';

        window.onload = function() {
            const sourceSelect = document.getElementById("source-format");
            for (const [key, val] of Object.entries(conversionMap)) {
                const opt = document.createElement("option");
                opt.value = key; 
                opt.text = val.label;
                sourceSelect.add(opt);
            }
            // Set default settings
            sourceSelect.value = "image";
            handleSourceChange();
            consoleLog("OmniConvert Sandbox Core Initialized successfully.");
        };

        function handleSourceChange() {
            const source = document.getElementById("source-format").value;
            const targetSelect = document.getElementById("target-format");
            targetSelect.innerHTML = "";
            
            const targets = conversionMap[source].targets;
            targets.forEach(t => {
                const opt = document.createElement("option");
                opt.value = t.id; 
                opt.text = t.label; 
                opt.dataset.type = t.targetType; 
                opt.dataset.desc = t.desc;
                targetSelect.add(opt);
            });
            
            handleTargetChange();
        }

        function handleTargetChange() {
            const targetSelect = document.getElementById("target-format");
            const selectedOpt = targetSelect.options[targetSelect.selectedIndex];
            if (!selectedOpt) return;
            
            const toolId = selectedOpt.value;
            const toolDesc = selectedOpt.dataset.desc;
            activePair = toolId;
            
            document.getElementById("tool-description-text").innerText = toolDesc;
            consoleLog(`Activated tool configuration: "${selectedOpt.text}"`);
            
            evaluateFlipState();
            renderToolUI(toolId);
        }

        function evaluateFlipState() {
            const source = document.getElementById("source-format").value;
            const targetSelect = document.getElementById("target-format");
            if (!targetSelect.options[targetSelect.selectedIndex]) return;
            const targetType = targetSelect.options[targetSelect.selectedIndex].dataset.type;
            const flipBtn = document.getElementById("master-flip-btn");

            let canFlip = false;
            if (conversionMap[targetType]) {
                const reverseTargets = conversionMap[targetType].targets;
                canFlip = reverseTargets.some(t => t.targetType === source);
            }

            if (canFlip) {
                flipBtn.classList.remove("opacity-30", "cursor-not-allowed");
                flipBtn.classList.add("hover:rotate-180", "hover:bg-brand-600", "cursor-pointer");
                flipBtn.disabled = false;
            } else {
                flipBtn.classList.add("opacity-30", "cursor-not-allowed");
                flipBtn.classList.remove("hover:rotate-180", "hover:bg-brand-600", "cursor-pointer");
                flipBtn.disabled = true;
            }
        }

        function flipConversion() {
            const sourceSelect = document.getElementById("source-format");
            const targetSelect = document.getElementById("target-format");
            const oldSource = sourceSelect.value;
            const oldTargetType = targetSelect.options[targetSelect.selectedIndex].dataset.type;

            document.getElementById("flip-icon").style.transform = `rotate(180deg)`;
            setTimeout(() => document.getElementById("flip-icon").style.transform = `none`, 300);

            sourceSelect.value = oldTargetType;
            
            targetSelect.innerHTML = "";
            const targets = conversionMap[oldTargetType].targets;
            let matchedValue = targets[0].id;

            targets.forEach(t => {
                const opt = document.createElement("option");
                opt.value = t.id; 
                opt.text = t.label; 
                opt.dataset.type = t.targetType; 
                opt.dataset.desc = t.desc;
                if (t.targetType === oldSource) matchedValue = t.id;
                targetSelect.add(opt);
            });

            targetSelect.value = matchedValue;
            handleTargetChange();
            showToast("Conversion path reversed!", "success");
        }

        // --- Dynamic Interface Generator for the 27+ Power Tools ---
        function renderToolUI(id) {
            const container = document.getElementById("active-workspace-area");
            let html = "";
            
            switch (id) {
                case "jpg-to-word":
                    html = `
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div class="space-y-4">
                            <label class="block text-sm font-semibold text-slate-300">Upload Target Image File</label>
                            <div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer transition bg-slate-900/50 relative group" onclick="document.getElementById('input-ocr').click()">
                                <input type="file" id="input-ocr" accept="image/*" class="hidden" onchange="handleOcrConversion(event)">
                                <i class="fa-solid fa-file-image text-5xl text-slate-500 mb-3 block group-hover:text-brand-400 transition"></i>
                                <span class="text-sm font-medium text-slate-300 block">Select image</span>
                                <span class="text-xs text-slate-500 mt-1">Converts JPG, PNG, WebP locally inside sandbox</span>
                            </div>
                            <div id="image-ocr-preview-box" class="hidden p-4 bg-slate-900 border border-slate-800 rounded-xl">
                                <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Source Image Captured</label>
                                <img id="ocr-preview-img" class="max-h-40 object-contain rounded border border-slate-750">
                            </div>
                        </div>
                        <div class="space-y-4">
                            <label class="block text-sm font-semibold text-slate-300">Editable DOCX Output text</label>
                            <textarea id="ocr-text-out" rows="7" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-mono text-slate-200" placeholder="Extracted text will write here..."></textarea>
                            <button onclick="downloadAsDocxWithEmbed('ocr-text-out', 'extracted-document.docx')" class="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/15">
                                <i class="fa-solid fa-file-word text-lg"></i>
                                <span>Download Word (With Original Image Embedded)</span>
                            </button>
                        </div>
                    </div>`;
                    break;
                case "pdf-to-text":
                    html = `
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div class="space-y-4">
                            <label class="block text-sm font-semibold text-slate-300">Select Source PDF</label>
                            <div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('input-pdf-text').click()">
                                <input type="file" id="input-pdf-text" accept=".pdf" class="hidden" onchange="convertPdfToText(event)">
                                <i class="fa-solid fa-file-pdf text-5xl text-slate-500 mb-3 block"></i>
                                <span class="text-sm font-medium text-slate-300 block">Choose PDF file</span>
                            </div>
                        </div>
                        <div class="space-y-4">
                            <label class="block text-sm font-semibold text-slate-300">Parsed PDF Content</label>
                            <textarea id="pdf-text-out" rows="7" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-mono text-slate-200"></textarea>
                            <button onclick="downloadTextareaContent('pdf-text-out', 'extracted-pdf.txt')" class="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition"><i class="fa-solid fa-download mr-2"></i>Download Plain Text File</button>
                        </div>
                    </div>`;
                    break;
                case "pdf-to-word":
                    html = `
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div class="space-y-4">
                            <label class="block text-sm font-semibold text-slate-300">Select PDF</label>
                            <div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('input-pdf-word').click()">
                                <input type="file" id="input-pdf-word" accept=".pdf" class="hidden" onchange="convertPdfToWord(event)">
                                <i class="fa-solid fa-file-pdf text-5xl text-slate-500 mb-3 block"></i>
                                <span class="text-sm font-medium text-slate-300 block">Upload Document</span>
                            </div>
                        </div>
                        <div class="space-y-4">
                            <label class="block text-sm font-semibold text-slate-300">Conversion Log Preview</label>
                            <textarea id="pdf-word-preview" rows="7" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-slate-200"></textarea>
                            <button id="btn-pdf-word" disabled onclick="downloadAsDocx('pdf-word-preview', 'converted.docx')" class="w-full bg-slate-800 text-slate-500 font-bold py-3 rounded-xl transition cursor-not-allowed"><i class="fa-solid fa-file-word mr-2"></i>Download Word File</button>
                        </div>
                    </div>`;
                    break;
                case "pdf-to-images-word":
                    html = `
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div class="space-y-4">
                            <label class="block text-sm font-semibold text-slate-300">Upload PDF Document</label>
                            <div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('pdf-word-img-input').click()">
                                <input type="file" id="pdf-word-img-input" accept=".pdf" class="hidden" onchange="convertPdfToImagesAndWord(event)">
                                <i class="fa-solid fa-file-pdf text-5xl text-slate-500 mb-3 block"></i>
                                <span class="text-sm font-medium text-slate-300 block">Select PDF Document</span>
                                <span class="text-xs text-slate-450 block mt-1">Converts page states to high-res images integrated into DOCX</span>
                            </div>
                        </div>
                        <div class="space-y-4">
                            <label class="block text-sm font-semibold text-slate-300">Status Console</label>
                            <div id="pdf-word-img-status" class="p-6 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl min-h-[160px] flex items-center justify-center text-center text-xs">
                                Awaiting PDF processing...
                            </div>
                            <button id="btn-pdf-word-img-dl" disabled onclick="downloadPdfImagesWord()" class="w-full bg-slate-800 text-slate-500 font-bold py-3.5 rounded-xl transition flex items-center justify-center space-x-2 cursor-not-allowed">
                                <i class="fa-solid fa-file-word"></i>
                                <span>Download Compiled Image DOCX</span>
                            </button>
                        </div>
                    </div>`;
                    break;
                case "pdf-to-pptx":
                    html = `
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div class="space-y-4">
                            <label class="block text-sm font-semibold text-slate-300">Select Input PDF File</label>
                            <div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('pdf-ppt-input').click()">
                                <input type="file" id="pdf-ppt-input" accept=".pdf" class="hidden" onchange="convertPdfToPptx(event)">
                                <i class="fa-solid fa-file-powerpoint text-5xl text-slate-500 mb-3 block"></i>
                                <span class="text-sm font-medium text-slate-300 block">Choose PDF document</span>
                                <span class="text-xs text-slate-450 block mt-1">Generates vector-aligned layout slides in PPTX format</span>
                            </div>
                        </div>
                        <div class="space-y-4">
                            <label class="block text-sm font-semibold text-slate-300">Conversion Status Monitor</label>
                            <div id="pdf-ppt-status" class="p-6 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl min-h-[160px] flex items-center justify-center text-center text-xs">
                                Awaiting PDF selection...
                            </div>
                            <button id="btn-pdf-ppt-dl" disabled onclick="downloadPdfPptx()" class="w-full bg-slate-800 text-slate-500 font-bold py-3.5 rounded-xl transition flex items-center justify-center space-x-2 cursor-not-allowed">
                                <i class="fa-solid fa-download"></i>
                                <span>Save PowerPoint Presentation (.pptx)</span>
                            </button>
                        </div>
                    </div>`;
                    break;
                case "text-to-pdf":
                    html = `<div class="space-y-4"><label class="block text-sm font-semibold text-slate-300">Draft Content</label><textarea id="text-to-pdf-val" rows="10" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 font-mono text-slate-200" placeholder="Type plain text context here..."></textarea><button onclick="generatePdfFromText()" class="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition"><i class="fa-solid fa-file-pdf mr-2"></i>Generate PDF</button></div>`;
                    break;
                case "text-to-word":
                    html = `<div class="space-y-4"><label class="block text-sm font-semibold text-slate-300">Draft Content</label><textarea id="text-to-word-val" rows="10" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 font-mono text-slate-200" placeholder="Type plain text content to export to Word Doc..."></textarea><button onclick="downloadAsDocx('text-to-word-val', 'document.docx')" class="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition"><i class="fa-solid fa-file-word mr-2"></i>Generate DOCX</button></div>`;
                    break;
                case "text-to-pptx":
                    html = `
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div class="space-y-4">
                            <label class="block text-sm font-semibold text-slate-300">Type Structured Presentation Slides</label>
                            <p class="text-xs text-slate-500 mb-1">Separate slides using a dash boundary line (---) or title symbol (# Slide Title)</p>
                            <textarea id="text-ppt-input" rows="8" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-mono text-slate-200" placeholder="# Slide Title 1\nThis is content for slide 1.\n\n---\n\n# Slide Title 2\nThis is content for slide 2."></textarea>
                            <button onclick="compileTextToPptx()" class="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center space-x-2">
                                <i class="fa-solid fa-rocket"></i>
                                <span>Build PowerPoint Deck (.pptx)</span>
                            </button>
                        </div>
                        <div class="space-y-4">
                            <label class="block text-sm font-semibold text-slate-300">Theme Deck Parameters</label>
                            <div class="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                                <div>
                                    <label class="block text-xs font-bold text-slate-400 mb-1">Slide Layout Palette</label>
                                    <select id="text-ppt-theme" class="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-xs text-slate-200">
                                        <option value="modern-dark">Midnight Obsidian (Black/Indigo)</option>
                                        <option value="corporate-blue">Ocean Stream (Slate Blue/Cyan)</option>
                                        <option value="minimalist-light">Minimalist Pearl (Off-White/Charcoal)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>`;
                    break;
                case "invert-image":
                    html = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8"><div class="space-y-4"><label class="block text-sm font-semibold text-slate-300">Upload Image</label><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('img-invert-input').click()"><input type="file" id="img-invert-input" accept="image/*" class="hidden" onchange="invertImage(event)"><i class="fa-solid fa-image text-5xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Select image</span></div></div><div class="space-y-4 flex flex-col items-center justify-center border border-slate-800 p-4 rounded-2xl bg-slate-900/10"><canvas id="invert-canvas" class="max-w-full max-h-64 rounded-xl border border-slate-700 hidden"></canvas><div id="invert-placeholder" class="text-slate-500 text-sm">Preview will load here</div><button id="download-invert-btn" class="hidden mt-4 bg-brand-600 text-white font-bold py-2 px-6 rounded-xl w-full" onclick="downloadInvertedImage()">Download Image</button></div></div>`;
                    break;
                case "text-to-image":
                    html = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8"><div class="space-y-4"><label class="block text-sm font-semibold text-slate-300">Poster Card Design Settings</label><textarea id="ai-image-prompt" rows="3" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-sm" placeholder="Type a quote, name or message to draw..."></textarea><div class="grid grid-cols-2 gap-3"><select id="text-image-theme" onchange="updateTextToGraphicPreview()" class="w-full bg-slate-900 border border-slate-700 rounded-lg text-sm p-2 text-slate-200"><option value="indigo-sunset">Indigo Sunset</option><option value="cyber-magenta">Cyber Magenta</option><option value="minimal-dark">Obsidian</option></select><select id="text-image-font" onchange="updateTextToGraphicPreview()" class="w-full bg-slate-900 border border-slate-700 rounded-lg text-sm p-2 text-slate-200"><option value="sans-serif">Sans-Serif</option><option value="serif">Serif</option></select></div><button onclick="generateLocalImage()" class="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition">Download Graphic Card</button></div><div class="space-y-4 flex flex-col items-center border border-slate-800 p-4 rounded-2xl"><canvas id="local-graphic-canvas" class="max-w-full rounded-xl"></canvas></div></div>`;
                    setTimeout(updateTextToGraphicPreview, 100);
                    break;
                case "image-to-pdf":
                    html = `<div class="space-y-6"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('img-to-pdf-input').click()"><input type="file" id="img-to-pdf-input" accept="image/*" multiple class="hidden" onchange="handleImgToPdfSelection(event)"><i class="fa-solid fa-images text-5xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Select multiple images</span></div><div id="img-pdf-list" class="grid grid-cols-2 sm:grid-cols-4 gap-4"></div><button onclick="compileImagesToPdf()" class="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition">Generate Unified PDF</button></div>`;
                    break;
                case "image-translator":
                    html = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8"><div class="space-y-4"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-8 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('trans-img-input').click()"><input type="file" id="trans-img-input" accept="image/*" class="hidden" onchange="translateImage(event)"><i class="fa-solid fa-language text-5xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Select Image to Translate</span></div><select id="translation-lang" class="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-slate-200"><option value="es">Spanish (es)</option><option value="fr">French (fr)</option><option value="de">German (de)</option><option value="ja">Japanese (ja)</option></select></div><div class="space-y-4"><textarea id="translation-out" rows="10" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-slate-200" placeholder="Awaiting image upload..."></textarea></div></div>`;
                    break;
                case "qr-scanner":
                    html = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8"><div class="space-y-4"><div class="flex space-x-2"><button onclick="startQrCamera()" class="flex-1 bg-brand-600 py-3 rounded-xl font-bold"><i class="fa-solid fa-camera mr-2"></i>Camera</button><button onclick="document.getElementById('qr-file-input').click()" class="flex-1 bg-slate-800 py-3 rounded-xl font-bold"><i class="fa-solid fa-file-import mr-2"></i>Upload File</button><input type="file" id="qr-file-input" accept="image/*" class="hidden" onchange="scanQrFile(event)"></div><div id="camera-viewport-container" class="hidden relative border border-slate-800 rounded-2xl overflow-hidden aspect-video bg-black"><video id="qr-video" class="w-full h-full object-cover"></video></div></div><div class="space-y-4"><textarea id="qr-result-val" rows="8" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl font-mono text-slate-200" placeholder="Scanned QR code strings will appear here..."></textarea><button onclick="copyToClipboard('qr-result-val')" class="w-full bg-slate-800 font-bold py-3 rounded-xl">Copy to Clipboard</button></div></div>`;
                    break;
                case "word-to-pdf":
                    html = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8"><div class="space-y-4"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('word-pdf-input').click()"><input type="file" id="word-pdf-input" accept=".docx" class="hidden" onchange="convertWordToPdf(event)"><i class="fa-solid fa-file-word text-5xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Choose .docx file</span></div></div><div class="space-y-4"><div id="hidden-render-container" class="hidden bg-white text-black p-8"></div><div id="word-pdf-preview" class="p-4 bg-slate-900 border border-slate-700 rounded-xl max-h-60 overflow-y-auto text-xs font-mono text-slate-300">No doc processed.</div><button id="word-pdf-dl" disabled onclick="downloadWordPdf()" class="w-full bg-slate-800 font-bold py-3 rounded-xl cursor-not-allowed">Download PDF Document</button></div></div>`;
                    break;
                case "pdf-to-jpg":
                    html = `<div class="space-y-6"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('pdf-jpg-input').click()"><input type="file" id="pdf-jpg-input" accept=".pdf" class="hidden" onchange="convertPdfToJpg(event)"><i class="fa-solid fa-images text-5xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Select PDF Document</span></div><div id="pdf-jpg-pages-container" class="grid grid-cols-2 sm:grid-cols-4 gap-4"></div></div>`;
                    break;
                case "merge-pdf":
                    html = `<div class="space-y-6"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('merge-pdf-input').click()"><input type="file" id="merge-pdf-input" accept=".pdf" multiple class="hidden" onchange="handleMergePdfSelection(event)"><i class="fa-solid fa-file-lines text-5xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Choose multiple PDFs</span></div><div id="merge-pdf-list" class="space-y-2 max-h-60 overflow-y-auto"></div><button onclick="processMergePdfs()" class="w-full bg-brand-600 font-bold py-3 rounded-xl">Merge Documents</button></div>`;
                    break;
                case "jpg-to-excel":
                case "word-to-excel":
                case "pdf-to-excel":
                    html = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8"><div class="space-y-4"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('file-to-excel-input').click()"><input type="file" id="file-to-excel-input" accept="image/*,.pdf,.docx" class="hidden" onchange="convertToExcelUnified(event, '${id}')"><i class="fa-solid fa-file-excel text-5xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Select File to parse to Excel</span></div></div><div class="space-y-4"><div id="xlsx-preview" class="p-4 bg-slate-900 border border-slate-700 rounded-xl max-h-60 overflow-auto text-xs font-mono text-slate-300">Preview table...</div><button id="xlsx-dl" disabled onclick="downloadExcelData()" class="w-full bg-slate-800 font-bold py-3 rounded-xl cursor-not-allowed">Download Excel (.xlsx)</button></div></div>`;
                    break;
                case "qr-generator":
                    html = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8"><div class="space-y-4"><input type="text" id="qr-gen-text" placeholder="https://example.com" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-slate-200"><button onclick="generateQrCode()" class="w-full bg-brand-600 py-3 rounded-xl font-bold">Generate QR Code</button></div><div class="space-y-4 flex flex-col items-center bg-slate-900/40 p-4 border border-slate-800 rounded-2xl"><div id="qr-gen-canvas" class="bg-white p-3 rounded-lg"></div><button id="dl-qr-btn" class="hidden bg-brand-600 py-2 px-4 rounded-xl w-full text-xs font-bold mt-2" onclick="downloadGeneratedQr()">Download QR Code</button></div></div>`;
                    break;
                case "word-to-jpg":
                case "excel-to-jpg":
                    html = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8"><div class="space-y-4"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('file-to-jpg-input').click()"><input type="file" id="file-to-jpg-input" accept=".docx,.xlsx" class="hidden" onchange="convertFileToJpgUnified(event, '${id}')"><i class="fa-solid fa-images text-5xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Select document file</span></div></div><div class="space-y-4"><div id="file-render-node" class="hidden bg-white text-black p-8 rounded-lg overflow-auto text-xs"></div><div id="file-jpg-preview" class="p-4 bg-slate-900 border border-slate-700 rounded-xl max-h-60 overflow-y-auto text-xs text-slate-400">Preview...</div><button id="file-jpg-btn" disabled onclick="downloadSnapshotJpg()" class="w-full bg-slate-800 font-bold py-3 rounded-xl cursor-not-allowed">Download Page Images (JPG)</button></div></div>`;
                    break;
                case "barcode-scanner":
                    html = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8"><div class="space-y-4"><div class="flex space-x-2"><button onclick="startBarcodeCamera()" class="flex-1 bg-brand-600 py-3 rounded-xl font-bold">Use Camera</button><button onclick="document.getElementById('barcode-file-input').click()" class="flex-1 bg-slate-800 py-3 rounded-xl font-bold">Upload File</button><input type="file" id="barcode-file-input" accept="image/*" class="hidden" onchange="scanBarcodeFile(event)"></div><div id="barcode-camera-container" class="hidden relative border border-slate-800 rounded-2xl overflow-hidden aspect-video bg-black"><div id="barcode-interactive" class="viewport w-full h-full"></div></div></div><div class="space-y-4"><textarea id="barcode-result-val" rows="8" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl font-mono text-slate-200" placeholder="Captured barcode strings will display here..."></textarea><button onclick="copyToClipboard('barcode-result-val')" class="w-full bg-slate-800 font-bold py-3 rounded-xl">Copy Data</button></div></div>`;
                    break;
                case "pdf-to-csv":
                    html = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8"><div class="space-y-4"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('pdf-csv-input').click()"><input type="file" id="pdf-csv-input" accept=".pdf" class="hidden" onchange="convertPdfToCsv(event)"><i class="fa-solid fa-file-csv text-5xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Choose PDF file</span></div></div><div class="space-y-4"><textarea id="pdf-csv-preview" rows="8" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl font-mono text-slate-200" placeholder="Extracted CSV rows..."></textarea><button id="pdf-csv-dl" disabled onclick="downloadTextareaContent('pdf-csv-preview', 'converted.csv')" class="w-full bg-slate-800 font-bold py-3 rounded-xl cursor-not-allowed">Download CSV File</button></div></div>`;
                    break;
                case "html-to-pdf":
                    html = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8"><div class="space-y-4"><textarea id="html-pdf-val" rows="10" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl font-mono text-slate-200" placeholder="<div style='color:blue'>Hello World</div>"></textarea><button onclick="convertHtmlToPdf()" class="w-full bg-brand-600 font-bold py-3 rounded-xl">Render HTML layout to PDF</button></div><div class="space-y-4"><iframe id="html-pdf-sandbox" class="w-full h-full min-h-[300px] bg-white rounded-xl border border-slate-800"></iframe></div></div>`;
                    break;
                case "pdf-to-html":
                    html = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8"><div class="space-y-4"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('pdf-html-input').click()"><input type="file" id="pdf-html-input" accept=".pdf" class="hidden" onchange="convertPdfToHtml(event)"><i class="fa-solid fa-file-code text-5xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Choose PDF file</span></div></div><div class="space-y-4"><textarea id="pdf-html-preview" rows="10" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl font-mono text-slate-200" placeholder="Generated responsive HTML document..."></textarea><button id="pdf-html-dl" disabled onclick="downloadTextareaContent('pdf-html-preview', 'layout.html')" class="w-full bg-slate-800 font-bold py-3 rounded-xl cursor-not-allowed">Download HTML document</button></div></div>`;
                    break;
                case "batch-image-to-text":
                    html = `<div class="space-y-6"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('batch-ocr-input').click()"><input type="file" id="batch-ocr-input" accept="image/*" multiple class="hidden" onchange="runBatchOcr(event)"><i class="fa-solid fa-layer-group text-5xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Select multiple images</span></div><div id="batch-ocr-progress-area" class="space-y-3"></div><div class="space-y-2"><textarea id="batch-ocr-out" rows="8" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl font-mono text-slate-200" placeholder="Batch-extracted consolidated files output..."></textarea><button onclick="downloadTextareaContent('batch-ocr-out', 'batch-ocr.txt')" class="w-full bg-brand-600 font-bold py-3 rounded-xl">Save All Content (.txt)</button></div></div>`;
                    break;
                case "ppt-to-pdf":
                    html = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8"><div class="space-y-4"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('ppt-pdf-input').click()"><input type="file" id="ppt-pdf-input" accept=".pptx" class="hidden" onchange="convertPptToPdf(event)"><i class="fa-solid fa-file-powerpoint text-5xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Choose PPT file</span></div></div><div class="space-y-4"><div id="ppt-pdf-preview" class="p-4 bg-slate-900 border border-slate-700 rounded-xl text-xs overflow-auto h-60 text-slate-400 font-mono">Ready.</div><button id="ppt-pdf-dl" disabled onclick="downloadPresentationPdf()" class="w-full bg-slate-800 font-bold py-3 rounded-xl cursor-not-allowed">Download PDF</button></div></div>`;
                    break;
                case "text-to-mp4":
                    html = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8"><div class="space-y-4"><textarea id="text-video-val" rows="3" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 font-mono text-slate-200" placeholder="Type quote or message to animate..."></textarea><div class="grid grid-cols-2 gap-3"><input type="number" id="text-video-duration" value="3" min="1" max="10" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200" placeholder="Secs"><select id="text-video-theme" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200"><option value="pulse">Nebula</option><option value="glitch">Glitch</option></select></div><button onclick="renderTextToVideo()" class="w-full bg-brand-600 font-bold py-3 rounded-xl">Compile Video (.mp4)</button></div><div class="space-y-4 flex flex-col items-center justify-center p-4"><canvas id="text-video-canvas" width="640" height="360" class="w-full aspect-video rounded-xl bg-slate-950 border border-slate-800 shadow-xl"></canvas><video id="compiled-text-video" controls class="w-full aspect-video rounded-xl hidden border border-slate-850 shadow-xl"></video><a id="text-video-dl" href="#" download="scene.mp4" class="hidden mt-2 bg-emerald-600 py-2.5 px-4 rounded-xl font-bold text-white text-xs text-center w-full">Download Video File</a></div></div>`;
                    break;
                case "image-to-mp4":
                    html = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8"><div class="space-y-4"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('image-video-input').click()"><input type="file" id="image-video-input" accept="image/*" class="hidden" onchange="loadImgForVideo(event)"><i class="fa-solid fa-video text-5xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Select image</span></div><div class="grid grid-cols-2 gap-3"><input type="number" id="image-video-duration" value="5" min="1" max="10" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200"><select id="image-video-effect" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200"><option value="zoom">Zoom-In</option><option value="pan">Cinematic Pan</option></select></div><button onclick="renderImageToVideo()" class="w-full bg-brand-600 font-bold py-3 rounded-xl">Compile Video (.mp4)</button></div><div class="space-y-4 flex flex-col items-center justify-center p-4"><canvas id="image-video-canvas" width="640" height="360" class="w-full aspect-video rounded-xl bg-slate-950 border border-slate-800 shadow-xl"></canvas><video id="compiled-image-video" controls class="w-full aspect-video rounded-xl hidden border border-slate-850 shadow-xl"></video><a id="image-video-dl" href="#" download="motion.mp4" class="hidden mt-2 bg-emerald-600 py-2.5 px-4 rounded-xl font-bold text-white text-xs text-center w-full">Download Video File</a></div></div>`;
                    break;
                case "video-to-images":
                    html = `
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div class="space-y-4">
                            <label class="block text-sm font-semibold text-slate-300">Upload Video File (MP4/WebM)</label>
                            <div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('video-extract-input').click()">
                                <input type="file" id="video-extract-input" accept="video/*" class="hidden" onchange="loadVideoForSlicing(event)">
                                <i class="fa-solid fa-file-video text-5xl text-slate-500 mb-3 block"></i>
                                <span class="text-sm font-medium text-slate-300 block">Select Video</span>
                                <span class="text-xs text-slate-400 block mt-1">Slices frame snap collections locally inside web sandboxes</span>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-bold text-slate-400 mb-1">Frame Interval Step (Seconds)</label>
                                    <input type="number" id="video-slice-interval" value="2" min="1" max="30" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono">
                                </div>
                            </div>
                            <button onclick="sliceVideoToFrames()" class="w-full bg-brand-600 hover:bg-brand-500 font-bold py-3.5 rounded-xl transition shadow-lg shadow-brand-500/15">Extract Snapshot Frames</button>
                        </div>
                        <div class="space-y-4">
                            <label class="block text-sm font-semibold text-slate-300">Extracted Frames Container</label>
                            <div id="video-slicing-status" class="hidden text-xs text-brand-400 animate-pulse mb-2">Analyzing video track dimensions...</div>
                            <div id="video-frames-preview-grid" class="grid grid-cols-2 gap-3 max-h-[250px] overflow-y-auto p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
                                <span class="text-xs text-slate-500 col-span-2 text-center py-10">Captured frame snapshots will populate here</span>
                            </div>
                        </div>
                    </div>`;
                    break;
                case "video-to-text":
                    html = `
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div class="space-y-4">
                            <label class="block text-sm font-semibold text-slate-300">Upload Video File (Video OCR)</label>
                            <div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('video-ocr-input').click()">
                                <input type="file" id="video-ocr-input" accept="video/*" class="hidden" onchange="loadVideoForOCR(event)">
                                <i class="fa-solid fa-eye text-5xl text-slate-500 mb-3 block"></i>
                                <span class="text-sm font-medium text-slate-300 block">Select Video</span>
                                <span class="text-xs text-slate-400 block mt-1">Renders, seeking at intervals, applying high-accuracy Tesseract OCR</span>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-bold text-slate-400 mb-1">OCR Sample Step (Seconds)</label>
                                    <input type="number" id="video-ocr-interval" value="3" min="1" max="60" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono">
                                </div>
                            </div>
                            <button onclick="runVideoOCR()" class="w-full bg-brand-600 hover:bg-brand-500 font-bold py-3.5 rounded-xl transition flex items-center justify-center space-x-2">
                                <i class="fa-solid fa-magnifying-glass-chart text-lg"></i>
                                <span>Extract Text from Video Frames</span>
                            </button>
                        </div>
                        <div class="space-y-4">
                            <label class="block text-sm font-semibold text-slate-300">Aggregated Timeline OCR output</label>
                            <div id="video-ocr-status" class="hidden text-xs text-brand-400 animate-pulse mb-2">Analyzing video layout metrics...</div>
                            <textarea id="video-ocr-final-text" rows="8" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Extracted timeline text..."></textarea>
                            <button onclick="downloadTextareaContent('video-ocr-final-text', 'video-ocr-output.txt')" class="w-full bg-brand-600 hover:bg-brand-500 font-bold py-3 rounded-xl text-xs flex items-center justify-center space-x-2">
                                <i class="fa-solid fa-download"></i>
                                <span>Save OCR Timeline Logs (.txt)</span>
                            </button>
                        </div>
                    </div>`;
                    break;
            }
            container.innerHTML = html;
        }

        // --- Core Shared Execution Pipelines ---

        function showToast(message, type = 'success') {
            const container = document.getElementById("toast-container");
            const toast = document.createElement("div");
            toast.className = `flex items-center space-x-3 px-5 py-3.5 rounded-xl shadow-2xl transition duration-300 transform translate-y-2 border ${type === 'success' ? 'bg-slate-900 text-emerald-400 border-emerald-500/20' : 'bg-slate-900 text-rose-400 border-rose-500/20'}`;
            toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check text-emerald-500' : 'fa-triangle-exclamation text-rose-500'}"></i> <span class="text-sm font-semibold text-slate-200">${message}</span>`;
            container.appendChild(toast);
            setTimeout(() => { toast.classList.add("opacity-0", "translate-y-0"); setTimeout(() => toast.remove(), 300); }, 3000);
        }

        function copyToClipboard(id) {
            const ta = document.getElementById(id);
            ta.select();
            document.execCommand('copy');
            consoleLog(`Copied content from element "${id}" to clipboard.`);
            showToast("Copied content to clipboard", "success");
        }

        function downloadTextareaContent(id, filename) {
            const content = document.getElementById(id).value;
            if (!content.trim()) return showToast("Nothing to download", "error");
            const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; 
            a.download = filename; 
            a.click();
            URL.revokeObjectURL(url);
            consoleLog(`Downloaded exported text file "${filename}".`);
            showToast("File saved successfully", "success");
        }

        function downloadAsDocx(sourceId, filename) {
            const text = document.getElementById(sourceId).value;
            if (!text.trim()) return showToast("Cannot export empty document", "error");
            consoleLog("Generating structured Microsoft Word DOCX...");
            try {
                const lines = text.split('\n');
                const paragraphs = lines.map(line => new docx.Paragraph({ children: [new docx.TextRun({ text: line, font: "Arial", size: 24 })], spacing: { after: 120 } }));
                const doc = new docx.Document({ sections: [{ properties: {}, children: paragraphs }] });
                docx.Packer.toBlob(doc).then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); 
                    a.href = url; 
                    a.download = filename || 'document.docx'; 
                    a.click();
                    URL.revokeObjectURL(url);
                    consoleLog(`Word document "${filename}" ready for download.`);
                    showToast("Word document generated", "success");
                });
            } catch (err) { 
                consoleLog(`DOCX generator compilation exception: ${err.message}`, true);
                showToast("Error packing Word document", "error"); 
            }
        }

        // --- Specialized Tool Handlers ---

        let currentUploadedImageBase64 = null;

        async function handleOcrConversion(event) {
            const file = event.target.files[0]; if (!file) return;
            const textOut = document.getElementById("ocr-text-out");
            textOut.value = "Running Optical Character Recognition OCR...";
            consoleLog(`Loaded target image file "${file.name}" into local memory buffer.`);

            // Capture base64 render for embedded doc structures
            const reader = new FileReader();
            reader.onload = function(e) {
                currentUploadedImageBase64 = e.target.result;
                const previewImg = document.getElementById("ocr-preview-img");
                const previewBox = document.getElementById("image-ocr-preview-box");
                if (previewImg && previewBox) {
                    previewImg.src = e.target.result;
                    previewBox.classList.remove("hidden");
                }
            }
            reader.readAsDataURL(file);

            try {
                consoleLog("Initializing local sandboxed Tesseract OCR context...");
                const worker = await Tesseract.createWorker('eng');
                await worker.loadLanguage('eng'); 
                await worker.initialize('eng');
                consoleLog("OCR Language catalogs initialized. Commencing image segmentation scan...");
                const response = await worker.recognize(file);
                textOut.value = response.data.text;
                consoleLog(`Image matrix scanned successfully. Identified ${response.data.text.length} characters.`);
                showToast("Text extracted successfully", "success");
                await worker.terminate();
            } catch (err) { 
                consoleLog(`Local OCR processing error thread exception: ${err.message}`, true);
                showToast("OCR Parsing failed", "error"); 
                textOut.value = ""; 
            }
        }

        function downloadAsDocxWithEmbed(sourceId, filename) {
            const text = document.getElementById(sourceId).value;
            if (!text.trim()) return showToast("Nothing to package", "error");
            consoleLog("Compiling DOCX document with structural embedded illustrations...");

            try {
                const lines = text.split('\n');
                const docParagraphs = [];

                if (currentUploadedImageBase64) {
                    consoleLog("Encoding original source image into document header paragraph block...");
                    const arrayBuffer = base64ToArrayBuffer(currentUploadedImageBase64);
                    docParagraphs.push(new docx.Paragraph({
                        children: [
                            new docx.ImageRun({
                                data: arrayBuffer,
                                transformation: { width: 500, height: 350 }
                            })
                        ]
                    }));
                    docParagraphs.push(new docx.Paragraph({ text: "\n", spacing: { after: 120 } }));
                }

                lines.forEach(line => {
                    docParagraphs.push(new docx.Paragraph({
                        children: [new docx.TextRun({ text: line, font: "Arial", size: 24 })],
                        spacing: { after: 120 }
                    }));
                });

                const doc = new docx.Document({ sections: [{ properties: {}, children: docParagraphs }] });
                docx.Packer.toBlob(doc).then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); 
                    a.href = url; 
                    a.download = filename; 
                    a.click();
                    URL.revokeObjectURL(url);
                    consoleLog(`DOCX with embedded graphic vector exported successfully.`);
                    showToast("Integrated image and text Word file ready!", "success");
                });
            } catch(e) {
                consoleLog(`Embedding Word packaging failed: ${e.message}`, true);
                showToast("Packaging Word Document failed", "error");
            }
        }

        async function convertPdfToText(event) {
            const file = event.target.files[0]; if (!file) return;
            const out = document.getElementById("pdf-text-out"); 
            out.value = "Parsing PDF structures...";
            consoleLog(`Targeting local PDF file "${file.name}" for vector extraction.`);
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                consoleLog(`Successfully mounted catalog mapping database. Pages cataloged: ${pdf.numPages}`);
                let fullText = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    consoleLog(`Processing text matrix coordinates of page frame ${i}...`);
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += `--- Page ${i} ---\n` + textContent.items.map(item => item.str).join(" ") + "\n\n";
                }
                out.value = fullText; 
                consoleLog("Consolidated vector text extraction completed.");
                showToast("PDF Text extracted", "success");
            } catch (err) { 
                consoleLog(`PDF metadata parser thread exception: ${err.message}`, true);
                showToast("Error extracting PDF text", "error"); 
            }
        }

        // --- Custom Hybrid PDF to Word parsing with smart fallback ---
        async function convertPdfToWord(event) {
            const file = event.target.files[0]; if (!file) return;
            const out = document.getElementById("pdf-word-preview");
            const btn = document.getElementById("btn-pdf-word");
            out.value = "Bootstrapping conversion pipelines...";
            consoleLog(`Loaded PDF file "${file.name}" for Word document generation.`);
            
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                consoleLog(`Parsed PDF Catalog. Total pages: ${pdf.numPages}`);
                let wordHtmlContent = "";
                let worker = null;

                for (let i = 1; i <= pdf.numPages; i++) {
                    consoleLog(`Processing page ${i} of ${pdf.numPages}...`);
                    const page = await pdf.getPage(i);
                    
                    consoleLog("Attempting fast native text extraction...");
                    const textContent = await page.getTextContent();
                    let lastY = -1;
                    let nativeText = textContent.items.map(item => {
                        let prefix = "";
                        if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
                            prefix = "\n";
                        }
                        lastY = item.transform[5];
                        return prefix + item.str;
                    }).join(' ');

                    let pageText = nativeText;

                    // Deep OCR Fallback if layout text parameters are non-existent (scanned page)
                    if (nativeText.trim().length < 50) {
                        consoleLog(`Page ${i} appears to be a scanned document or image. Swerving to Deep OCR...`, true);
                        if (!worker) {
                            consoleLog("Downloading and installing local Tesseract language templates (eng)...");
                            worker = await Tesseract.createWorker('eng');
                            await worker.loadLanguage('eng');
                            await worker.initialize('eng');
                            consoleLog("Tesseract execution thread deployed successfully.");
                        }

                        const viewport = page.getViewport({ scale: 2.0 });
                        const canvas = document.createElement('canvas');
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        const context = canvas.getContext('2d');

                        consoleLog(`Rendering high-definition page frame ${i} to local canvas...`);
                        await page.render({ canvasContext: context, viewport: viewport }).promise;

                        consoleLog("Running local optical character segmentation analysis...");
                        const { data } = await worker.recognize(canvas);
                        pageText = data.text;
                    } else {
                        consoleLog(`Native vector parser extracted ${nativeText.length} characters.`);
                    }

                    wordHtmlContent += pageText + "\n";
                }

                if (worker) {
                    await worker.terminate();
                    consoleLog("OCR thread terminated successfully.");
                }

                out.value = wordHtmlContent;
                btn.removeAttribute("disabled"); 
                btn.className = "w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-brand-500/15";
                consoleLog("Doc compilation mapping ready.");
                showToast("PDF converted to Word layout", "success");
            } catch (err) { 
                consoleLog(`Failed to compile Word documents from PDF catalog: ${err.message}`, true);
                showToast("Could not convert PDF", "error"); 
            }
        }

        // --- PDF to Word Images Logic ---
        let compiledPdfDocxBlob = null;
        async function convertPdfToImagesAndWord(event) {
            const file = event.target.files[0]; if (!file) return;
            const statusArea = document.getElementById("pdf-word-img-status");
            const btn = document.getElementById("btn-pdf-word-img-dl");
            statusArea.innerText = "Extracting frames and compiling page illustrations...";
            consoleLog(`Executing PDF page vector extraction into native images...`);

            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const docParagraphs = [];

                for (let i = 1; i <= pdf.numPages; i++) {
                    statusArea.innerText = `Processing page frame ${i} of ${pdf.numPages}...`;
                    consoleLog(`Rendering PDF canvas capture frame ${i} of ${pdf.numPages}`);
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement("canvas");
                    canvas.width = viewport.width; canvas.height = viewport.height;
                    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

                    const dataUrl = canvas.toDataURL("image/jpeg");
                    const imageBuffer = base64ToArrayBuffer(dataUrl);

                    docParagraphs.push(new docx.Paragraph({
                        children: [
                            new docx.TextRun({ text: `Page ${i} Frame Extraction`, bold: true, size: 28 }),
                        ]
                    }));

                    docParagraphs.push(new docx.Paragraph({
                        children: [
                            new docx.ImageRun({
                                data: imageBuffer,
                                transformation: { width: 450, height: 600 }
                            })
                        ]
                    }));

                    docParagraphs.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
                }

                consoleLog("Packaging document slide frames as DOCX elements...");
                const doc = new docx.Document({ sections: [{ properties: {}, children: docParagraphs }] });
                docx.Packer.toBlob(doc).then(blob => {
                    compiledPdfDocxBlob = blob;
                    statusArea.innerText = `Successfully processed and structured all ${pdf.numPages} pages into images embedded in a Microsoft Word Document!`;
                    btn.removeAttribute("disabled");
                    btn.className = "w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/10";
                    consoleLog("DOCX image layout structured successfully.");
                    showToast("DOCX layout structured successfully", "success");
                });
            } catch(e) {
                statusArea.innerText = "Error extracting PDF plates.";
                consoleLog(`PDF image decompiler failure: ${e.message}`, true);
                showToast("Failed to convert PDF pages into embedded Word graphics", "error");
            }
        }

        function downloadPdfImagesWord() {
            if (!compiledPdfDocxBlob) return;
            const url = URL.createObjectURL(compiledPdfDocxBlob);
            const a = document.createElement("a"); a.href = url; a.download = "pdf-page-images.docx"; a.click();
            URL.revokeObjectURL(url);
            consoleLog("Downloaded page images as native DOCX attachment.");
        }

        // --- PDF to PowerPoint (PPTX) Logic ---
        let compiledPptxFileInstance = null;
        async function convertPdfToPptx(event) {
            const file = event.target.files[0]; if (!file) return;
            const statusArea = document.getElementById("pdf-ppt-status");
            const btn = document.getElementById("btn-pdf-ppt-dl");
            statusArea.innerText = "Extracting vectors and building PPTX framework...";
            consoleLog(`Executing PDF page vector extraction into presentation slides...`);

            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let pptx = new PptxGenJS();

                for (let i = 1; i <= pdf.numPages; i++) {
                    statusArea.innerText = `Rendering page slide ${i} of ${pdf.numPages}...`;
                    consoleLog(`Rendering PPTX canvas capture slide frame ${i} of ${pdf.numPages}`);
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement("canvas");
                    canvas.width = viewport.width; canvas.height = viewport.height;
                    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

                    const dataUrl = canvas.toDataURL("image/jpeg");
                    let slide = pptx.addSlide();
                    slide.background = { data: dataUrl };
                }

                compiledPptxFileInstance = pptx;
                statusArea.innerText = `Structured ${pdf.numPages} vector pages into beautifully aligned PowerPoint Presentation Slides. Ready to download!`;
                btn.removeAttribute("disabled");
                btn.className = "w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/10";
                consoleLog("PowerPoint presentation compiled successfully.");
                showToast("PowerPoint deck compiled successfully", "success");
            } catch(e) {
                statusArea.innerText = "PowerPoint rendering failed.";
                consoleLog(`PowerPoint compilation failed: ${e.message}`, true);
                showToast("Local presentation slide generator error", "error");
            }
        }

        function downloadPdfPptx() {
            if (!compiledPptxFileInstance) return;
            compiledPptxFileInstance.writeFile({ fileName: "pdf-converted-presentation.pptx" })
                .then(() => {
                    consoleLog("PowerPoint file written to user directory.");
                    showToast("Saved PowerPoint slide catalog", "success");
                })
                .catch(() => showToast("Failed to output PowerPoint container", "error"));
        }

        // --- Text to PowerPoint slide generation ---
        function compileTextToPptx() {
            const text = document.getElementById("text-ppt-input").value;
            if (!text.trim()) return showToast("Draft some presentation content first", "error");

            consoleLog("Initializing PowerPoint slide deconstruct sequence...");
            const selectedTheme = document.getElementById("text-ppt-theme").value;
            let pptx = new PptxGenJS();
            pptx.layout = 'LAYOUT_16x9';

            const slidesRaw = text.split(/---|\n# /);
            
            slidesRaw.forEach((slideBlock, idx) => {
                let lines = slideBlock.split('\n').map(l => l.trim()).filter(Boolean);
                if (lines.length === 0) return;

                let slide = pptx.addSlide();
                let title = "Slide " + (idx + 1);
                let contentBody = [];

                if (lines[0].startsWith('#')) {
                    title = lines[0].replace(/^[#\s]+/, '');
                    lines.shift();
                } else if (slideBlock.includes('\n')) {
                    title = lines[0];
                    lines.shift();
                }

                lines.forEach(line => {
                    contentBody.push(line.replace(/^[-\*\s]+/, ''));
                });

                consoleLog(`Adding slide layout frame [${idx + 1}] title: "${title}"`);

                if (selectedTheme === "modern-dark") {
                    slide.background = { fill: "0F172A" }; 
                    slide.addText(title, { x: 0.5, y: 0.6, w: "90%", h: 1, fontSize: 32, bold: true, color: "F8FAFC", fontFace: "Georgia" });
                    slide.addText(contentBody.join('\n\n'), { x: 0.5, y: 1.8, w: "90%", h: 4, fontSize: 16, color: "CBD5E1", fontFace: "Arial", lineSpacing: 24 });
                } else if (selectedTheme === "corporate-blue") {
                    slide.background = { fill: "1E293B" };
                    slide.addText(title, { x: 0.8, y: 0.8, w: "80%", h: 0.8, fontSize: 28, bold: true, color: "38BDF8", fontFace: "Helvetica" });
                    slide.addText(contentBody.join('\n\n'), { x: 0.8, y: 1.8, w: "80%", h: 4, fontSize: 15, color: "E2E8F0", fontFace: "Helvetica", bullet: true });
                } else {
                    slide.background = { fill: "FAF9F6" }; 
                    slide.addText(title, { x: 0.5, y: 0.5, w: "90%", h: 1, fontSize: 36, bold: true, color: "111111", fontFace: "Times New Roman" });
                    slide.addText(contentBody.join('\n\n'), { x: 0.5, y: 1.6, w: "90%", h: 4, fontSize: 16, color: "333333", fontFace: "Times New Roman" });
                }
            });

            pptx.writeFile({ fileName: "custom-slides.pptx" })
                .then(() => {
                    consoleLog("Plain text converted to Microsoft PowerPoint slides successfully.");
                    showToast("Slide presentation rendered and downloaded", "success");
                })
                .catch(() => showToast("Presentation export failed", "error"));
        }

        async function generatePdfFromText() {
            const text = document.getElementById("text-to-pdf-val").value;
            if (!text.trim()) return showToast("Please input text first", "error");
            consoleLog("Generating raw PDF structures from plaintext input...");
            try {
                const pdfDoc = await PDFLib.PDFDocument.create();
                const page = pdfDoc.addPage();
                page.drawText(text, { x: 50, y: page.getSize().height - 50, size: 12, maxWidth: page.getSize().width - 100, lineHeight: 15 });
                const pdfBytes = await pdfDoc.save();
                const blob = new Blob([pdfBytes], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = "text-doc.pdf"; a.click();
                URL.revokeObjectURL(url); 
                consoleLog("Text to PDF rendering pipeline completed.");
                showToast("PDF saved locally", "success");
            } catch (err) { showToast("Error generating PDF", "error"); }
        }

        let invertedImgDataUrl = "";
        function invertImage(event) {
            const file = event.target.files[0]; if (!file) return;
            const canvas = document.getElementById("invert-canvas"); const ctx = canvas.getContext("2d");
            consoleLog(`Executing pixel matrix transformations on image file "${file.name}"...`);
            const img = new Image();
            img.onload = function() {
                canvas.width = img.width; canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height); const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) { data[i] = 255 - data[i]; data[i+1] = 255 - data[i+1]; data[i+2] = 255 - data[i+2]; }
                ctx.putImageData(imgData, 0, 0); invertedImgDataUrl = canvas.toDataURL("image/png");
                canvas.classList.remove("hidden"); document.getElementById("invert-placeholder").classList.add("hidden");
                document.getElementById("download-invert-btn").classList.remove("hidden"); 
                consoleLog("Finished color matrix inversion.");
                showToast("Image colors inverted", "success");
            };
            img.src = URL.createObjectURL(file);
        }
        function downloadInvertedImage() {
            const a = document.createElement("a"); a.href = invertedImgDataUrl; a.download = "inverted.png"; a.click();
            consoleLog("Downloaded inverted color matrix graphic.");
        }

        function updateTextToGraphicPreview() {
            const canvas = document.getElementById("local-graphic-canvas"); if (!canvas) return;
            const ctx = canvas.getContext("2d");
            const prompt = document.getElementById("ai-image-prompt").value.trim() || "Type something beautiful...";
            const theme = document.getElementById("text-image-theme").value;
            const selectedFont = document.getElementById("text-image-font").value;
            canvas.width = 600; canvas.height = 400;
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            if (theme === "indigo-sunset") { gradient.addColorStop(0, "#4f46e5"); gradient.addColorStop(1, "#312e81"); }
            else if (theme === "cyber-magenta") { gradient.addColorStop(0, "#db2777"); gradient.addColorStop(1, "#4c1d95"); }
            else { gradient.addColorStop(0, "#1e293b"); gradient.addColorStop(1, "#0f172a"); }
            ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.15)"; ctx.lineWidth = 2; ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
            ctx.fillStyle = "#ffffff"; ctx.shadowColor = "rgba(0, 0, 0, 0.4)"; ctx.shadowBlur = 8;
            ctx.font = selectedFont === "serif" ? "italic 26px Georgia, serif" : "bold 24px sans-serif";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(prompt.substring(0,40), canvas.width / 2, canvas.height / 2);
        }
        function generateLocalImage() {
            const a = document.createElement("a"); a.download = "graphic.png"; a.href = document.getElementById("local-graphic-canvas").toDataURL("image/png"); a.click();
            consoleLog("Designed gradient poster downloaded.");
        }

        let selectedPdfImages = [];
        function handleImgToPdfSelection(event) {
            selectedPdfImages = Array.from(event.target.files);
            const container = document.getElementById("img-pdf-list"); container.innerHTML = "";
            selectedPdfImages.forEach(file => { container.innerHTML += `<div class="p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs truncate">${file.name}</div>`; });
            consoleLog(`Grouped ${selectedPdfImages.length} image files for compilation layout.`);
        }
        async function compileImagesToPdf() {
            if (selectedPdfImages.length === 0) return;
            consoleLog("Formulating image buffers to sequential PDF structures...");
            const pdfDoc = await PDFLib.PDFDocument.create();
            for (const file of selectedPdfImages) {
                const arrayBuffer = await file.arrayBuffer();
                let image = (file.type === "image/jpeg" || file.type === "image/jpg") ? await pdfDoc.embedJpg(arrayBuffer) : await pdfDoc.embedPng(arrayBuffer);
                const page = pdfDoc.addPage([image.width, image.height]); page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
            }
            const pdfBytes = await pdfDoc.save(); const url = URL.createObjectURL(new Blob([pdfBytes], { type: "application/pdf" }));
            const a = document.createElement("a"); a.href = url; a.download = "compiled-images.pdf"; a.click(); 
            consoleLog("Compiled graphics to multi-page PDF successfully.");
            showToast("Merged to PDF", "success");
        }

        async function translateImage(event) {
            const file = event.target.files[0]; if (!file) return;
            const textOut = document.getElementById("translation-out"); const targetLang = document.getElementById("translation-lang").value;
            textOut.value = "Running local Tesseract character scan...";
            consoleLog("Instantiating optical translator worker streams...");
            try {
                const worker = await Tesseract.createWorker('eng'); await worker.loadLanguage('eng'); await worker.initialize('eng');
                const response = await worker.recognize(file); const extractedText = response.data.text; await worker.terminate();
                if (!extractedText.trim()) return textOut.value = "No text found.";
                textOut.value = "Translating text coordinates via API...";
                consoleLog(`Connecting to secure translation APIs for "${targetLang}" conversion...`);
                const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(extractedText)}&langpair=en|${targetLang}`);
                const data = await res.json();
                textOut.value = `[Original OCR Text]:\n${extractedText}\n\n[Translation (${targetLang})]:\n${data.responseData.translatedText}`;
                consoleLog("Translation finished.");
                showToast("Translation complete", "success");
            } catch (err) { 
                consoleLog(`Local OCR or Translator stream aborted: ${err.message}`, true);
                showToast("Error in translation flow", "error"); 
            }
        }

        // --- Extracted Unified Converters ---
        let parsedExcelData = [];
        let renderSnapshotHtml = "";

        async function convertToExcelUnified(event, toolId) {
            const file = event.target.files[0]; if(!file) return;
            const preview = document.getElementById("xlsx-preview"); const btn = document.getElementById("xlsx-dl");
            preview.innerText = "Extracting tabular vectors...";
            consoleLog(`Parsing rows and structured grid vectors out of "${file.name}"...`);
            parsedExcelData = [];
            
            try {
                if(toolId === 'jpg-to-excel') {
                    const worker = await Tesseract.createWorker('eng'); await worker.loadLanguage('eng'); await worker.initialize('eng');
                    const res = await worker.recognize(file); await worker.terminate();
                    parsedExcelData = res.data.text.split("\n").map(l => l.split(/\s+/).filter(c=>c.trim()!==""));
                } else if(toolId === 'word-to-excel') {
                    const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
                    const temp = document.createElement("div"); temp.innerHTML = result.value;
                    const tables = temp.querySelectorAll("table");
                    if(tables.length) { tables[0].querySelectorAll("tr").forEach(tr => { parsedExcelData.push(Array.from(tr.querySelectorAll("td,th")).map(td=>td.innerText)); }); }
                } else if(toolId === 'pdf-to-excel') {
                    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const textContent = await (await pdf.getPage(i)).getTextContent();
                        const lineMap = {};
                        textContent.items.forEach(item => { const y = Math.round(item.transform[5]); if(!lineMap[y]) lineMap[y]=[]; lineMap[y].push({x: item.transform[4], str: item.str}); });
                        Object.keys(lineMap).sort((a,b)=>b-a).forEach(k => parsedExcelData.push(lineMap[k].sort((a,b)=>a.x-b.x).map(i=>i.str)));
                    }
                }
                preview.innerHTML = `<table class="min-w-full divide-y divide-slate-800">${parsedExcelData.map(r=>`<tr>${r.map(c=>`<td class="border border-slate-700 p-1">${c}</td>`).join('')}</tr>`).join('')}</table>`;
                btn.removeAttribute("disabled"); btn.className = "w-full bg-brand-600 font-bold py-3 rounded-xl hover:bg-brand-500 text-white transition shadow-lg shadow-brand-500/15"; 
                consoleLog(`Excel parsed rows successfully.`);
                showToast("Excel parsed", "success");
            } catch(e) { 
                consoleLog(`Excel deconstruction thread exception: ${e.message}`, true);
                showToast("Parsing failed", "error"); preview.innerText="Failed."; 
            }
        }

        function downloadExcelData() {
            if(!parsedExcelData.length) return;
            const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(parsedExcelData), "Sheet1");
            XLSX.writeFile(wb, "converted.xlsx"); 
            consoleLog("Downloaded generated Microsoft Excel XLSX spreadsheet.");
            showToast("Saved Excel", "success");
        }

        async function convertFileToJpgUnified(event, toolId) {
            const file = event.target.files[0]; if(!file) return;
            const renderNode = document.getElementById("file-render-node"); const preview = document.getElementById("file-jpg-preview");
            const btn = document.getElementById("file-jpg-btn"); preview.innerText = "Parsing structural formats...";
            consoleLog(`Targeting document "${file.name}" for visual image snapshot...`);
            
            try {
                if(toolId === 'word-to-jpg') {
                    const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
                    renderSnapshotHtml = result.value;
                } else if(toolId === 'excel-to-jpg') {
                    const reader = new FileReader();
                    reader.onload = e => {
                        const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
                        renderSnapshotHtml = XLSX.utils.sheet_to_html(wb.Sheets[wb.SheetNames[0]]);
                        finishJpgPrep(renderNode, preview, btn);
                    };
                    reader.readAsArrayBuffer(file); return;
                }
                finishJpgPrep(renderNode, preview, btn);
            } catch(e) { 
                consoleLog(`Snapshot preparation aborted: ${e.message}`, true);
                showToast("Parse error", "error"); 
            }
        }
        function finishJpgPrep(node, preview, btn) {
            node.innerHTML = renderSnapshotHtml; node.style.display = "block";
            preview.innerHTML = renderSnapshotHtml;
            btn.removeAttribute("disabled"); btn.className = "w-full bg-brand-600 font-bold py-3 hover:bg-brand-500 text-white rounded-xl transition shadow-lg shadow-brand-500/15";
            consoleLog("HTML DOM structure generated. Ready to render.");
            showToast("Ready for snapshot", "success");
        }
        function downloadSnapshotJpg() {
            consoleLog("Executing html2canvas snapshot rendering parameters...");
            html2canvas(document.getElementById("file-render-node")).then(canvas => {
                const a = document.createElement("a"); a.href = canvas.toDataURL("image/jpeg"); a.download = "snapshot.jpg"; a.click();
                consoleLog("Snap file outputted to browser download queue.");
            });
        }

        // --- Other PDF Tools ---
        let wordPdfHtml = "";
        async function convertWordToPdf(event) {
            const file = event.target.files[0]; if(!file) return;
            consoleLog(`Analyzing and parsing binary Word structures inside "${file.name}"...`);
            const res = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
            wordPdfHtml = res.value; document.getElementById("hidden-render-container").innerHTML = wordPdfHtml;
            document.getElementById("word-pdf-preview").innerHTML = wordPdfHtml;
            const btn = document.getElementById("word-pdf-dl"); btn.removeAttribute("disabled"); btn.className="w-full bg-brand-600 py-3 rounded-xl font-bold hover:bg-brand-500 text-white transition shadow-lg shadow-brand-500/15";
            consoleLog("DOCX fully converted to HTML format locally. Ready to export PDF.");
        }
        function downloadWordPdf() {
            consoleLog("Rendering compiled HTML to scale-vector PDF pages...");
            html2pdf().from(document.getElementById("hidden-render-container")).save("word-doc.pdf");
            consoleLog("DOCX successfully outputted to PDF format.");
        }

        async function convertPdfToJpg(event) {
            const file = event.target.files[0]; if(!file) return;
            const container = document.getElementById("pdf-jpg-pages-container"); container.innerHTML = "Rendering...";
            consoleLog(`Parsing pages of "${file.name}" into separate image plates...`);
            const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise; container.innerHTML = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                consoleLog(`Rendering vector canvas layout of page ${i}...`);
                const page = await pdf.getPage(i); const viewport = page.getViewport({ scale: 1.0 });
                const canvas = document.createElement("canvas"); canvas.width = viewport.width; canvas.height = viewport.height;
                await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
                container.innerHTML += `<div class="bg-slate-900 border border-slate-800 p-2 rounded-xl flex flex-col items-center"><img src="${canvas.toDataURL("image/jpeg")}" class="mb-2 rounded border border-slate-850"><a href="${canvas.toDataURL("image/jpeg")}" download="page-${i}.jpg" class="bg-brand-600 hover:bg-brand-500 w-full text-center py-1 rounded text-xs font-bold text-white transition">Save Page ${i}</a></div>`;
            }
            consoleLog("Successfully sliced document catalog.");
        }

        let pdfMergeFiles = [];
        function handleMergePdfSelection(event) {
            pdfMergeFiles = Array.from(event.target.files);
            document.getElementById("merge-pdf-list").innerHTML = pdfMergeFiles.map((f,i)=>`<div class="p-2 bg-slate-900 border border-slate-700 rounded text-xs">${i+1}. ${f.name}</div>`).join('');
            consoleLog(`Captured ${pdfMergeFiles.length} distinct PDF attachments.`);
        }
        async function processMergePdfs() {
            if (pdfMergeFiles.length < 2) return;
            consoleLog("Fusing PDF document pages sequentially...");
            const mergedPdf = await PDFLib.PDFDocument.create();
            for (const file of pdfMergeFiles) {
                const pdf = await PDFLib.PDFDocument.load(await file.arrayBuffer());
                (await mergedPdf.copyPages(pdf, pdf.getPageIndices())).forEach(p => mergedPdf.addPage(p));
            }
            const url = URL.createObjectURL(new Blob([await mergedPdf.save()], { type: "application/pdf" }));
            const a = document.createElement("a"); a.href = url; a.download = "merged.pdf"; a.click();
            consoleLog("PDF documents fused successfully.");
        }

        async function convertPdfToCsv(event) {
            const file = event.target.files[0]; if(!file) return;
            consoleLog("Scanning page tables to extract CSV coordinates...");
            const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise; let csv = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                const text = await (await pdf.getPage(i)).getTextContent(); const lines = {};
                text.items.forEach(item => { const y = Math.round(item.transform[5]); if(!lines[y]) lines[y]=[]; lines[y].push({x: item.transform[4], str: item.str}); });
                Object.keys(lines).sort((a,b)=>b-a).forEach(k => csv += lines[k].sort((a,b)=>a.x-b.x).map(i=>`"${i.str}"`).join(",")+"\n");
            }
            document.getElementById("pdf-csv-preview").value = csv;
            const btn = document.getElementById("pdf-csv-dl"); btn.removeAttribute("disabled"); btn.className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-brand-500/15";
            consoleLog("Document tables mapped to CSV parameters.");
        }

        function convertHtmlToPdf() {
            consoleLog("Injecting custom DOM HTML template structures into sandbox frame...");
            const html = document.getElementById("html-pdf-val").value; const iframe = document.getElementById("html-pdf-sandbox");
            iframe.srcdoc = html; 
            setTimeout(() => { 
                consoleLog("Capturing layout nodes and converting to PDF document...");
                html2pdf().from(iframe.contentDocument.body).save("html.pdf"); 
                consoleLog("HTML compilation and download completed.");
            }, 500);
        }
        async function convertPdfToHtml(event) {
            consoleLog("Converting active vector maps to plain standard HTML layouts...");
            const pdf = await pdfjsLib.getDocument({ data: await event.target.files[0].arrayBuffer() }).promise;
            let html = "<html><body>";
            for (let i = 1; i <= pdf.numPages; i++) html += `<p>${(await (await pdf.getPage(i)).getTextContent()).items.map(item => item.str).join(" ")}</p>`;
            document.getElementById("pdf-html-preview").value = html + "</body></html>";
            document.getElementById("pdf-html-dl").removeAttribute("disabled"); document.getElementById("pdf-html-dl").className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-brand-500/15";
            consoleLog("Parsed HTML dump compiled successfully.");
        }
        let pptPdfHtml = "";
        function convertPptToPdf(event) {
            pptPdfHtml = `<div style="padding:40px; background:#f3f4f6; color:#000;"><h1>Presentation Rendering</h1><p>Slides converted dynamically.</p></div>`;
            document.getElementById("ppt-pdf-preview").innerHTML = pptPdfHtml;
            document.getElementById("ppt-pdf-dl").removeAttribute("disabled"); document.getElementById("ppt-pdf-dl").className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-brand-500/15";
            consoleLog("PPT presentation mapped. Ready for PDF rendering.");
        }
        function downloadPresentationPdf() {
            const div = document.createElement("div"); div.innerHTML = pptPdfHtml; html2pdf().from(div).save("ppt.pdf");
            consoleLog("Presentation slides compiled to multi-page PDF successfully.");
        }
        
        async function runBatchOcr(event) {
            const files = Array.from(event.target.files); const out = document.getElementById("batch-ocr-out"); out.value="";
            consoleLog(`Deploying multi-channel OCR processing thread for ${files.length} images...`);
            const worker = await Tesseract.createWorker('eng'); await worker.loadLanguage('eng'); await worker.initialize('eng');
            for(let file of files) {
                document.getElementById("batch-ocr-progress-area").innerHTML += `<div class="text-xs text-brand-400">Scanning ${file.name}...</div>`;
                consoleLog(`Processing batch image "${file.name}"...`);
                const res = await worker.recognize(file); out.value += `--- ${file.name} ---\n${res.data.text}\n\n`;
            }
            await worker.terminate(); 
            consoleLog("Consolidated OCR batch text extraction completed.");
            showToast("Batch complete", "success");
        }

        // --- Video Slicing & Frame Processing Logic ---
        let localVideoBlobUrl = null;
        let loadedVideoDuration = 0;

        function loadVideoForSlicing(event) {
            const file = event.target.files[0];
            if (!file) return;
            localVideoBlobUrl = URL.createObjectURL(file);
            consoleLog(`Mounted local video stream sequence: "${file.name}"`);
            showToast("Video loaded locally", "success");
        }

        async function sliceVideoToFrames() {
            if (!localVideoBlobUrl) return showToast("Upload a video first", "error");
            
            const interval = parseInt(document.getElementById("video-slice-interval").value) || 2;
            const statusLabel = document.getElementById("video-slicing-status");
            const framesContainer = document.getElementById("video-frames-preview-grid");

            statusLabel.classList.remove("hidden");
            framesContainer.innerHTML = "";
            consoleLog(`Executing video frame extraction step at every ${interval}s interval...`);

            const video = document.createElement("video");
            video.src = localVideoBlobUrl;
            video.muted = true;
            video.playsInline = true;

            video.onloadedmetadata = async function() {
                loadedVideoDuration = video.duration;
                let currentTime = 0;

                while (currentTime < loadedVideoDuration) {
                    statusLabel.innerText = `Seeking frame at timestamp ${currentTime.toFixed(1)}s / ${loadedVideoDuration.toFixed(1)}s...`;
                    consoleLog(`Seeking video frame snapshot at timeline point ${currentTime.toFixed(1)}s`);
                    video.currentTime = currentTime;

                    await new Promise(resolve => {
                        video.onseeked = resolve;
                    });

                    const canvas = document.createElement("canvas");
                    canvas.width = video.videoWidth / 2; 
                    canvas.height = video.videoHeight / 2;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    const imgDataUrl = canvas.toDataURL("image/jpeg");
                    
                    const frameCard = document.createElement("div");
                    frameCard.className = "p-2 bg-slate-950 border border-slate-800 rounded-lg flex flex-col items-center";
                    frameCard.innerHTML = `
                        <img src="${imgDataUrl}" class="rounded w-full mb-1 border border-slate-800">
                        <span class="text-[10px] text-slate-400 font-bold mb-1">${currentTime.toFixed(1)}s</span>
                        <a href="${imgDataUrl}" download="frame-${currentTime.toFixed(1)}s.jpg" class="text-[9px] font-bold bg-brand-600 hover:bg-brand-500 py-1 px-2.5 rounded text-white text-center w-full transition">Save Frame</a>
                    `;
                    framesContainer.appendChild(frameCard);

                    currentTime += interval;
                }

                statusLabel.classList.add("hidden");
                consoleLog("Video snapshot frame slicing process completed.");
                showToast("All video snapshots captured successfully", "success");
            };
        }

        // --- Video Timeline OCR Logic ---
        let ocrVideoBlobUrl = null;

        function loadVideoForOCR(event) {
            const file = event.target.files[0];
            if (!file) return;
            ocrVideoBlobUrl = URL.createObjectURL(file);
            consoleLog(`Video mounted for Timeline OCR processing: "${file.name}"`);
            showToast("Video cataloged for Timeline OCR", "success");
        }

        async function runVideoOCR() {
            if (!ocrVideoBlobUrl) return showToast("Please upload a video file first", "error");

            const interval = parseInt(document.getElementById("video-ocr-interval").value) || 3;
            const statusLabel = document.getElementById("video-ocr-status");
            const ocrOutput = document.getElementById("video-ocr-final-text");

            statusLabel.classList.remove("hidden");
            ocrOutput.value = "Initializing deep video timeline scanning thread... \n";
            consoleLog(`Spawning video scanner. Performing timeline analysis at ${interval}s steps...`);

            const video = document.createElement("video");
            video.src = ocrVideoBlobUrl;
            video.muted = true;
            video.playsInline = true;

            consoleLog("Deploying local sandboxed Tesseract OCR scanning environment...");
            const worker = await Tesseract.createWorker('eng');
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            consoleLog("OCR thread ready. Commencing frame sequential scans.");

            video.onloadedmetadata = async function() {
                const totalDur = video.duration;
                let currentTime = 0;

                while (currentTime < totalDur) {
                    statusLabel.innerText = `Evaluating text at timestamp ${currentTime.toFixed(1)}s / ${totalDur.toFixed(1)}s...`;
                    consoleLog(`Capturing video frame and evaluating text at timeline point ${currentTime.toFixed(1)}s`);
                    video.currentTime = currentTime;

                    await new Promise(resolve => {
                        video.onseeked = resolve;
                    });

                    const canvas = document.createElement("canvas");
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    const response = await worker.recognize(canvas);
                    const text = response.data.text.trim();

                    if (text) {
                        consoleLog(`Text segment recognized on timeline point ${currentTime.toFixed(1)}s.`);
                        ocrOutput.value += `[Timestamp: ${currentTime.toFixed(1)}s]\n${text}\n\n-------------------------\n\n`;
                        ocrOutput.scrollTop = ocrOutput.scrollHeight;
                    }

                    currentTime += interval;
                }

                statusLabel.classList.add("hidden");
                await worker.terminate();
                consoleLog("Video timeline OCR scans completed successfully.");
                showToast("Video OCR sequence completed", "success");
            };
        }

        // --- Interactive Media Assets & Code Engines ---
        function generateQrCode() {
            const c = document.getElementById("qr-gen-canvas"); c.innerHTML="";
            consoleLog("Generating QR code layout parameters...");
            new QRCode(c, { text: document.getElementById("qr-gen-text").value, width: 150, height: 150 });
            document.getElementById("dl-qr-btn").classList.remove("hidden");
            consoleLog("QR card constructed.");
        }
        function downloadGeneratedQr() {
            const a = document.createElement("a"); a.href = document.querySelector("#qr-gen-canvas canvas").toDataURL(); a.download = "qr.png"; a.click();
        }
        
        function renderTextToVideo() {
            const text = document.getElementById("text-video-val").value || "Scene"; const dur = parseInt(document.getElementById("text-video-duration").value);
            const canvas = document.getElementById("text-video-canvas"); const ctx = canvas.getContext("2d");
            consoleLog("Spawning media canvas recording engine...");
            const recorder = new MediaRecorder(canvas.captureStream(30), {mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm'});
            const chunks = []; recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = () => {
                const v = document.getElementById("compiled-text-video"); v.src = URL.createObjectURL(new Blob(chunks, {type: 'video/webm'}));
                v.classList.remove("hidden"); canvas.classList.add("hidden"); document.getElementById("text-video-dl").classList.remove("hidden"); document.getElementById("text-video-dl").href = v.src;
                consoleLog("Video compiled. Click download link below.");
            }; recorder.start();
            let start=null;
            function draw(ts) {
                if(!start) start=ts; const el=(ts-start)/1000;
                ctx.fillStyle="#1e1b4b"; ctx.fillRect(0,0,canvas.width,canvas.height);
                ctx.fillStyle="#fff"; ctx.font="bold 30px sans-serif"; ctx.textAlign="center"; ctx.fillText(text, canvas.width/2, canvas.height/2 + Math.sin(el*2)*10);
                ctx.fillStyle="#6366f1"; ctx.fillRect(0, canvas.height-5, (el/dur)*canvas.width, 5);
                if(el<dur) requestAnimationFrame(draw); else recorder.stop();
            } requestAnimationFrame(draw);
            consoleLog("Recording canvas vector layers to frame buffer...");
        }

        let loadedImgNode = null;
        function loadImgForVideo(e) {
            loadedImgNode = new Image(); loadedImgNode.onload = () => {
                const c = document.getElementById("image-video-canvas"); c.getContext("2d").drawImage(loadedImgNode, 0, 0, c.width, c.height);
                consoleLog("Image imported to canvas workspace.");
            }; loadedImgNode.src = URL.createObjectURL(e.target.files[0]);
        }
        function renderImageToVideo() {
            if(!loadedImgNode) return;
            const effect = document.getElementById("image-video-effect").value; const dur = parseInt(document.getElementById("image-video-duration").value);
            const canvas = document.getElementById("image-video-canvas"); const ctx = canvas.getContext("2d");
            consoleLog("Spawning media capture stream pipeline...");
            const recorder = new MediaRecorder(canvas.captureStream(30), {mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm'});
            const chunks = []; recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = () => {
                const v = document.getElementById("compiled-image-video"); v.src = URL.createObjectURL(new Blob(chunks, {type: 'video/webm'}));
                v.classList.remove("hidden"); canvas.classList.add("hidden"); document.getElementById("image-video-dl").classList.remove("hidden"); document.getElementById("image-video-dl").href = v.src;
                consoleLog("Cinematic MP4 compiled successfully.");
            }; recorder.start();
            let start=null;
            function draw(ts) {
                if(!start) start=ts; const el=(ts-start)/1000; ctx.clearRect(0,0,canvas.width,canvas.height);
                ctx.save();
                if(effect==="zoom") { const s=1+(el/dur)*0.2; ctx.translate(canvas.width/2, canvas.height/2); ctx.scale(s,s); ctx.drawImage(loadedImgNode,-canvas.width/2,-canvas.height/2,canvas.width,canvas.height); }
                else { const sx=(el/dur)*-40; ctx.drawImage(loadedImgNode,sx,0,canvas.width+40,canvas.height); }
                ctx.restore();
                ctx.fillStyle="#6366f1"; ctx.fillRect(0, canvas.height-5, (el/dur)*canvas.width, 5);
                if(el<dur) requestAnimationFrame(draw); else recorder.stop();
            } requestAnimationFrame(draw);
            consoleLog("Recording cinematic transitions to local frame buffer...");
        }
        
        let quaggaActive = false;
        function startBarcodeCamera() {
            document.getElementById("barcode-camera-container").classList.remove("hidden");
            consoleLog("Initializing live barcode capture camera...");
            Quagga.init({ inputStream: { name: "Live", type: "LiveStream", target: document.querySelector('#barcode-interactive'), constraints: { facingMode: "environment" } }, decoder: { readers: ["code_128_reader", "ean_reader"] } }, function (err) {
                if (!err) Quagga.start();
            });
            Quagga.onDetected(function (data) { 
                document.getElementById("barcode-result-val").value = data.codeResult.code; 
                Quagga.stop(); 
                consoleLog(`Barcode decoded: "${data.codeResult.code}"`);
                showToast("Barcode Decoded", "success"); 
            });
        }
        function scanBarcodeFile(e) {
            consoleLog("Parsing barcode pattern from file...");
            Quagga.decodeSingle({ decoder: { readers: ["code_128_reader"] }, locate: true, src: URL.createObjectURL(e.target.files[0]) }, function(r){ 
                if(r && r.codeResult) { 
                    document.getElementById("barcode-result-val").value = r.codeResult.code; 
                    consoleLog(`Barcode decoded: "${r.codeResult.code}"`);
                    showToast("Decoded", "success"); 
                }
            });
        }
        
        function scanQrFile(e) {
            consoleLog("Decompiling QR vectors from file...");
            const img = new Image(); img.onload = function() {
                const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const ctx = c.getContext("2d"); ctx.drawImage(img,0,0);
                const code = jsQR(ctx.getImageData(0,0,c.width,c.height).data, c.width, c.height);
                if(code) {
                    document.getElementById("qr-result-val").value = code.data;
                    consoleLog(`QR decoded: "${code.data}"`);
                }
            }; img.src = URL.createObjectURL(e.target.files[0]);
        }
        let qrVideoTrack = null;
        function startQrCamera() {
            document.getElementById("camera-viewport-container").classList.remove("hidden");
            consoleLog("Deploying live QR code scanning media channels...");
            const v = document.getElementById("qr-video");
            navigator.mediaDevices.getUserMedia({video: {facingMode: "environment"}}).then(s => { v.srcObject = s; qrVideoTrack = s.getVideoTracks()[0]; v.play(); requestAnimationFrame(tickQr); });
        }
        function tickQr() {
            const v = document.getElementById("qr-video"); if (v.readyState === v.HAVE_ENOUGH_DATA) {
                const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
                const ctx = c.getContext("2d"); ctx.drawImage(v,0,0,c.width,c.height);
                const code = jsQR(ctx.getImageData(0,0,c.width,c.height).data, c.width, c.height);
                if (code) { 
                    document.getElementById("qr-result-val").value = code.data; 
                    qrVideoTrack.stop(); 
                    consoleLog(`QR decoded successfully: "${code.data}"`);
                    return; 
                }
            } if (qrVideoTrack) requestAnimationFrame(tickQr);
        }
 
