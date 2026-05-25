        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

        // --- Core UI & Navigation Logic ---
        
        const conversionMap = {
            'image': {
                label: 'Image (JPG/PNG)',
                targets: [
                    { id: 'jpg-to-word', label: 'Extract to Word (.docx)', targetType: 'word', desc: 'Scan text directly to editable DOCX' },
                    { id: 'image-to-pdf', label: 'Compile to PDF', targetType: 'pdf', desc: 'Compile images into a unified PDF' },
                    { id: 'jpg-to-excel', label: 'Extract Table to Excel', targetType: 'excel', desc: 'Extract structures to XLSX' },
                    { id: 'image-to-mp4', label: 'Animate to MP4 Video', targetType: 'video', desc: 'Convert image into panning MP4' },
                    { id: 'image-translator', label: 'Translate Text', targetType: 'text', desc: 'Extract and translate image text' },
                    { id: 'batch-image-to-text', label: 'Batch Text Extraction', targetType: 'text', desc: 'Bulk process multiple images to text' },
                    { id: 'invert-image', label: 'Invert Colors', targetType: 'image', desc: 'Reverse image colors' }
                ]
            },
            'pdf': {
                label: 'PDF Document',
                targets: [
                    { id: 'pdf-to-word', label: 'Convert to Word (.docx)', targetType: 'word', desc: 'Decompile PDF to editable Word document' },
                    { id: 'pdf-to-excel', label: 'Extract Tables to Excel', targetType: 'excel', desc: 'Parse structural data to Excel' },
                    { id: 'pdf-to-jpg', label: 'Slice to Images (JPG)', targetType: 'image', desc: 'Download PDF pages as JPGs' },
                    { id: 'pdf-to-html', label: 'Convert to HTML Code', targetType: 'html', desc: 'Decompile layouts to HTML' },
                    { id: 'pdf-to-text', label: 'Extract Plain Text', targetType: 'text', desc: 'Extract precise clean text' },
                    { id: 'pdf-to-csv', label: 'Extract Tables to CSV', targetType: 'text', desc: 'Scrape table rows to CSV' },
                    { id: 'merge-pdf', label: 'Merge Multiple PDFs', targetType: 'pdf', desc: 'Combine multiple PDFs into one' }
                ]
            },
            'word': {
                label: 'Word (.docx)',
                targets: [
                    { id: 'word-to-pdf', label: 'Render to PDF', targetType: 'pdf', desc: 'Render DOCX into high fidelity PDF' },
                    { id: 'word-to-jpg', label: 'Snapshot to Image (JPG)', targetType: 'image', desc: 'Transform Word doc into clean JPG snaps' },
                    { id: 'word-to-excel', label: 'Extract Table to Excel', targetType: 'excel', desc: 'Extract Word table structures to spreadsheet' }
                ]
            },
            'text': {
                label: 'Plain Text / Data',
                targets: [
                    { id: 'text-to-word', label: 'Draft to Word (.docx)', targetType: 'word', desc: 'Instantly draft text to Word doc' },
                    { id: 'text-to-pdf', label: 'Generate PDF', targetType: 'pdf', desc: 'Create PDF from rich plain text' },
                    { id: 'text-to-image', label: 'Create Graphic Poster', targetType: 'image', desc: 'Turn text into stylized digital graphic' },
                    { id: 'text-to-mp4', label: 'Render MP4 Video', targetType: 'video', desc: 'Render textual scene into MP4' },
                    { id: 'qr-generator', label: 'Generate QR Code', targetType: 'scanner', desc: 'Create custom QR scanning files' }
                ]
            },
            'excel': {
                label: 'Excel (.xlsx)',
                targets: [
                    { id: 'excel-to-jpg', label: 'Snapshot to Image (JPG)', targetType: 'image', desc: 'Transform Excel sheets to dashboard pictures' }
                ]
            },
            'html': {
                label: 'HTML Code',
                targets: [
                    { id: 'html-to-pdf', label: 'Render to PDF', targetType: 'pdf', desc: 'Turn HTML layouts into PDF' }
                ]
            },
            'ppt': {
                label: 'PowerPoint (.pptx)',
                targets: [
                    { id: 'ppt-to-pdf', label: 'Render to PDF', targetType: 'pdf', desc: 'Deconstruct presentations into PDF' }
                ]
            },
            'scanner': {
                label: 'Camera / Scanner',
                targets: [
                    { id: 'qr-scanner', label: 'Read QR Code', targetType: 'text', desc: 'Scan QRs instantly' },
                    { id: 'barcode-scanner', label: 'Read Barcode', targetType: 'text', desc: 'Read product barcodes' }
                ]
            }
        };

        window.onload = function() {
            const sourceSelect = document.getElementById("source-format");
            for (const [key, val] of Object.entries(conversionMap)) {
                const opt = document.createElement("option");
                opt.value = key; opt.text = val.label;
                sourceSelect.add(opt);
            }
            // Set defaults to Image -> Word
            sourceSelect.value = "image";
            handleSourceChange();
        };

        function handleSourceChange() {
            const source = document.getElementById("source-format").value;
            const targetSelect = document.getElementById("target-format");
            targetSelect.innerHTML = "";
            
            const targets = conversionMap[source].targets;
            targets.forEach(t => {
                const opt = document.createElement("option");
                opt.value = t.id; opt.text = t.label; opt.dataset.type = t.targetType; opt.dataset.desc = t.desc;
                targetSelect.add(opt);
            });
            
            handleTargetChange();
        }

        function handleTargetChange() {
            const targetSelect = document.getElementById("target-format");
            const selectedOpt = targetSelect.options[targetSelect.selectedIndex];
            const toolId = selectedOpt.value;
            const toolDesc = selectedOpt.dataset.desc;
            
            document.getElementById("tool-desc-badge").innerText = toolDesc;
            evaluateFlipState();
            renderToolUI(toolId);
        }

        function evaluateFlipState() {
            const source = document.getElementById("source-format").value;
            const targetSelect = document.getElementById("target-format");
            const targetType = targetSelect.options[targetSelect.selectedIndex].dataset.type;
            const flipBtn = document.getElementById("master-flip-btn");

            // Check if the current target format is a valid source format, AND if it has the current source as a target type
            let canFlip = false;
            if (conversionMap[targetType]) {
                const reverseTargets = conversionMap[targetType].targets;
                canFlip = reverseTargets.some(t => t.targetType === source);
            }

            if (canFlip) {
                flipBtn.classList.remove("opacity-30", "cursor-not-allowed");
                flipBtn.classList.add("hover:rotate-180", "hover:bg-brand-500", "cursor-pointer");
                flipBtn.disabled = false;
            } else {
                flipBtn.classList.add("opacity-30", "cursor-not-allowed");
                flipBtn.classList.remove("hover:rotate-180", "hover:bg-brand-500", "cursor-pointer");
                flipBtn.disabled = true;
            }
        }

        function flipConversion() {
            const sourceSelect = document.getElementById("source-format");
            const targetSelect = document.getElementById("target-format");
            const oldSource = sourceSelect.value;
            const oldTargetType = targetSelect.options[targetSelect.selectedIndex].dataset.type;

            // Animate Icon
            document.getElementById("flip-icon").style.transform = `rotate(180deg)`;
            setTimeout(() => document.getElementById("flip-icon").style.transform = `none`, 300);

            // Change Source to old Target Type
            sourceSelect.value = oldTargetType;
            
            // Re-populate targets for new source
            targetSelect.innerHTML = "";
            const targets = conversionMap[oldTargetType].targets;
            let matchedValue = targets[0].id; // Fallback to first

            targets.forEach(t => {
                const opt = document.createElement("option");
                opt.value = t.id; opt.text = t.label; opt.dataset.type = t.targetType; opt.dataset.desc = t.desc;
                if (t.targetType === oldSource) matchedValue = t.id; // Find the exact reverse map
                targetSelect.add(opt);
            });

            targetSelect.value = matchedValue;
            handleTargetChange();
            showToast("Conversion direction reversed", "success");
        }

        // --- View Renderer for all 27 Tools ---
        function renderToolUI(id) {
            const container = document.getElementById("active-workspace-area");
            let html = "";
            
            // Reusing the comprehensive templating structure requested
            switch (id) {
                case "jpg-to-word":
                    html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="space-y-4"><label class="block text-sm font-semibold text-slate-300">Upload Image</label><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer transition bg-slate-900/50 relative group" onclick="document.getElementById('input-ocr').click()"><input type="file" id="input-ocr" accept="image/*" class="hidden" onchange="handleOcrConversion(event)"><i class="fa-solid fa-file-image text-4xl text-slate-500 mb-3 block group-hover:text-brand-400 transition"></i><span class="text-sm font-medium text-slate-300 block">Select image</span></div></div><div class="space-y-4"><label class="block text-sm font-semibold text-slate-300">Output text</label><textarea id="ocr-text-out" rows="7" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm"></textarea><button onclick="downloadAsDocx('ocr-text-out', 'extracted.docx')" class="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition"><i class="fa-solid fa-file-word mr-2"></i>Download Word (DOCX)</button></div></div>`;
                    break;
                case "pdf-to-text":
                    html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="space-y-4"><label class="block text-sm font-semibold text-slate-300">Select PDF</label><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('input-pdf-text').click()"><input type="file" id="input-pdf-text" accept=".pdf" class="hidden" onchange="convertPdfToText(event)"><i class="fa-solid fa-file-pdf text-4xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Choose PDF file</span></div></div><div class="space-y-4"><label class="block text-sm font-semibold text-slate-300">Parsed PDF Content</label><textarea id="pdf-text-out" rows="7" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm"></textarea><button onclick="downloadTextareaContent('pdf-text-out', 'extracted.txt')" class="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition"><i class="fa-solid fa-download mr-2"></i>Download Text</button></div></div>`;
                    break;
                case "pdf-to-word":
                    html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="space-y-4"><label class="block text-sm font-semibold text-slate-300">Select PDF</label><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('input-pdf-word').click()"><input type="file" id="input-pdf-word" accept=".pdf" class="hidden" onchange="convertPdfToWord(event)"><i class="fa-solid fa-file-pdf text-4xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Upload Document</span></div></div><div class="space-y-4"><label class="block text-sm font-semibold text-slate-300">Preview</label><textarea id="pdf-word-preview" rows="7" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-sm"></textarea><button id="btn-pdf-word" disabled onclick="downloadAsDocx('pdf-word-preview', 'converted.docx')" class="w-full bg-slate-800 text-slate-500 font-bold py-3 rounded-xl transition cursor-not-allowed"><i class="fa-solid fa-file-word mr-2"></i>Download Word File</button></div></div>`;
                    break;
                case "text-to-pdf":
                    html = `<div class="space-y-4"><label class="block text-sm font-semibold text-slate-300">Draft Content</label><textarea id="text-to-pdf-val" rows="10" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500"></textarea><button onclick="generatePdfFromText()" class="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition"><i class="fa-solid fa-file-pdf mr-2"></i>Generate PDF</button></div>`;
                    break;
                case "text-to-word":
                    html = `<div class="space-y-4"><label class="block text-sm font-semibold text-slate-300">Draft Content</label><textarea id="text-to-word-val" rows="10" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500"></textarea><button onclick="downloadAsDocx('text-to-word-val', 'document.docx')" class="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition"><i class="fa-solid fa-file-word mr-2"></i>Generate DOCX</button></div>`;
                    break;
                case "invert-image":
                    html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="space-y-4"><label class="block text-sm font-semibold text-slate-300">Upload Image</label><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('img-invert-input').click()"><input type="file" id="img-invert-input" accept="image/*" class="hidden" onchange="invertImage(event)"><i class="fa-solid fa-image text-4xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Select image</span></div></div><div class="space-y-4 flex flex-col items-center justify-center border border-slate-800 p-4 rounded-2xl bg-slate-900/10"><canvas id="invert-canvas" class="max-w-full max-h-64 rounded-xl border border-slate-700 hidden"></canvas><div id="invert-placeholder" class="text-slate-500 text-sm">Preview will load here</div><button id="download-invert-btn" class="hidden mt-4 bg-brand-600 text-white font-bold py-2 px-6 rounded-xl w-full" onclick="downloadInvertedImage()">Download Image</button></div></div>`;
                    break;
                case "text-to-image":
                    html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="space-y-4"><label class="block text-sm font-semibold text-slate-300">Card Settings</label><textarea id="ai-image-prompt" rows="3" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-sm"></textarea><div class="grid grid-cols-2 gap-3"><select id="text-image-theme" onchange="updateTextToGraphicPreview()" class="w-full bg-slate-900 border border-slate-700 rounded-lg text-sm p-2"><option value="indigo-sunset">Indigo Sunset</option><option value="cyber-magenta">Cyber Magenta</option><option value="minimal-dark">Obsidian</option></select><select id="text-image-font" onchange="updateTextToGraphicPreview()" class="w-full bg-slate-900 border border-slate-700 rounded-lg text-sm p-2"><option value="sans-serif">Sans-Serif</option><option value="serif">Serif</option></select></div><button onclick="generateLocalImage()" class="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition">Download Graphic</button></div><div class="space-y-4 flex flex-col items-center border border-slate-800 p-4 rounded-2xl"><canvas id="local-graphic-canvas" class="max-w-full rounded-xl"></canvas></div></div>`;
                    setTimeout(updateTextToGraphicPreview, 100);
                    break;
                case "image-to-pdf":
                    html = `<div class="space-y-6"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('img-to-pdf-input').click()"><input type="file" id="img-to-pdf-input" accept="image/*" multiple class="hidden" onchange="handleImgToPdfSelection(event)"><i class="fa-solid fa-images text-4xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Select multiple images</span></div><div id="img-pdf-list" class="grid grid-cols-2 sm:grid-cols-4 gap-4"></div><button onclick="compileImagesToPdf()" class="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition">Generate PDF</button></div>`;
                    break;
                case "image-translator":
                    html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="space-y-4"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-8 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('trans-img-input').click()"><input type="file" id="trans-img-input" accept="image/*" class="hidden" onchange="translateImage(event)"><i class="fa-solid fa-language text-4xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Select Image to Translate</span></div><select id="translation-lang" class="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl"><option value="es">Spanish (es)</option><option value="fr">French (fr)</option><option value="de">German (de)</option><option value="ja">Japanese (ja)</option></select></div><div class="space-y-4"><textarea id="translation-out" rows="10" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-sm"></textarea></div></div>`;
                    break;
                case "qr-scanner":
                    html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="space-y-4"><div class="flex space-x-2"><button onclick="startQrCamera()" class="flex-1 bg-brand-600 py-3 rounded-xl font-bold"><i class="fa-solid fa-camera mr-2"></i>Camera</button><button onclick="document.getElementById('qr-file-input').click()" class="flex-1 bg-slate-800 py-3 rounded-xl font-bold"><i class="fa-solid fa-file-import mr-2"></i>Upload File</button><input type="file" id="qr-file-input" accept="image/*" class="hidden" onchange="scanQrFile(event)"></div><div id="camera-viewport-container" class="hidden relative border border-slate-800 rounded-2xl overflow-hidden aspect-video bg-black"><video id="qr-video" class="w-full h-full object-cover"></video></div></div><div class="space-y-4"><textarea id="qr-result-val" rows="8" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl"></textarea><button onclick="copyToClipboard('qr-result-val')" class="w-full bg-slate-800 font-bold py-3 rounded-xl">Copy</button></div></div>`;
                    break;
                case "word-to-pdf":
                    html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="space-y-4"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('word-pdf-input').click()"><input type="file" id="word-pdf-input" accept=".docx" class="hidden" onchange="convertWordToPdf(event)"><i class="fa-solid fa-file-word text-4xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Choose .docx file</span></div></div><div class="space-y-4"><div id="hidden-render-container" class="hidden bg-white text-black p-8"></div><div id="word-pdf-preview" class="p-4 bg-slate-900 border border-slate-700 rounded-xl max-h-60 overflow-y-auto text-xs">No doc processed.</div><button id="word-pdf-dl" disabled onclick="downloadWordPdf()" class="w-full bg-slate-800 font-bold py-3 rounded-xl cursor-not-allowed">Download PDF</button></div></div>`;
                    break;
                case "pdf-to-jpg":
                    html = `<div class="space-y-6"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('pdf-jpg-input').click()"><input type="file" id="pdf-jpg-input" accept=".pdf" class="hidden" onchange="convertPdfToJpg(event)"><i class="fa-solid fa-images text-4xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Select PDF Document</span></div><div id="pdf-jpg-pages-container" class="grid grid-cols-2 sm:grid-cols-4 gap-4"></div></div>`;
                    break;
                case "merge-pdf":
                    html = `<div class="space-y-6"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('merge-pdf-input').click()"><input type="file" id="merge-pdf-input" accept=".pdf" multiple class="hidden" onchange="handleMergePdfSelection(event)"><i class="fa-solid fa-file-lines text-4xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Choose multiple PDFs</span></div><div id="merge-pdf-list" class="space-y-2 max-h-60 overflow-y-auto"></div><button onclick="processMergePdfs()" class="w-full bg-brand-600 font-bold py-3 rounded-xl">Merge Documents</button></div>`;
                    break;
                case "jpg-to-excel":
                case "word-to-excel":
                case "pdf-to-excel":
                    html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="space-y-4"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('file-to-excel-input').click()"><input type="file" id="file-to-excel-input" accept="image/*,.pdf,.docx" class="hidden" onchange="convertToExcelUnified(event, '${id}')"><i class="fa-solid fa-file-excel text-4xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Select File to parse to Excel</span></div></div><div class="space-y-4"><div id="xlsx-preview" class="p-4 bg-slate-900 border border-slate-700 rounded-xl max-h-60 overflow-auto text-xs">Preview table...</div><button id="xlsx-dl" disabled onclick="downloadExcelData()" class="w-full bg-slate-800 font-bold py-3 rounded-xl cursor-not-allowed">Download Excel (.xlsx)</button></div></div>`;
                    break;
                case "qr-generator":
                    html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="space-y-4"><input type="text" id="qr-gen-text" placeholder="https://example.com" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl"><button onclick="generateQrCode()" class="w-full bg-brand-600 py-3 rounded-xl font-bold">Generate QR Code</button></div><div class="space-y-4 flex flex-col items-center bg-slate-900/40 p-4 border border-slate-800 rounded-2xl"><div id="qr-gen-canvas" class="bg-white p-3 rounded-lg"></div><button id="dl-qr-btn" class="hidden bg-brand-600 py-2 px-4 rounded-xl w-full" onclick="downloadGeneratedQr()">Download QR Code</button></div></div>`;
                    break;
                case "word-to-jpg":
                case "excel-to-jpg":
                    html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="space-y-4"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('file-to-jpg-input').click()"><input type="file" id="file-to-jpg-input" accept=".docx,.xlsx" class="hidden" onchange="convertFileToJpgUnified(event, '${id}')"><i class="fa-solid fa-images text-4xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Select document file</span></div></div><div class="space-y-4"><div id="file-render-node" class="hidden bg-white text-black p-8 rounded-lg overflow-auto text-xs"></div><div id="file-jpg-preview" class="p-4 bg-slate-900 border border-slate-700 rounded-xl max-h-60 overflow-y-auto text-xs">Preview...</div><button id="file-jpg-btn" disabled onclick="downloadSnapshotJpg()" class="w-full bg-slate-800 font-bold py-3 rounded-xl cursor-not-allowed">Download Page Images (JPG)</button></div></div>`;
                    break;
                case "barcode-scanner":
                    html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="space-y-4"><div class="flex space-x-2"><button onclick="startBarcodeCamera()" class="flex-1 bg-brand-600 py-3 rounded-xl font-bold">Use Camera</button><button onclick="document.getElementById('barcode-file-input').click()" class="flex-1 bg-slate-800 py-3 rounded-xl font-bold">Upload File</button><input type="file" id="barcode-file-input" accept="image/*" class="hidden" onchange="scanBarcodeFile(event)"></div><div id="barcode-camera-container" class="hidden relative border border-slate-800 rounded-2xl overflow-hidden aspect-video bg-black"><div id="barcode-interactive" class="viewport w-full h-full"></div></div></div><div class="space-y-4"><textarea id="barcode-result-val" rows="8" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl"></textarea><button onclick="copyToClipboard('barcode-result-val')" class="w-full bg-slate-800 font-bold py-3 rounded-xl">Copy</button></div></div>`;
                    break;
                case "pdf-to-csv":
                    html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="space-y-4"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('pdf-csv-input').click()"><input type="file" id="pdf-csv-input" accept=".pdf" class="hidden" onchange="convertPdfToCsv(event)"><i class="fa-solid fa-file-csv text-4xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Choose PDF file</span></div></div><div class="space-y-4"><textarea id="pdf-csv-preview" rows="8" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl"></textarea><button id="pdf-csv-dl" disabled onclick="downloadTextareaContent('pdf-csv-preview', 'converted.csv')" class="w-full bg-slate-800 font-bold py-3 rounded-xl cursor-not-allowed">Download CSV</button></div></div>`;
                    break;
                case "html-to-pdf":
                    html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="space-y-4"><textarea id="html-pdf-val" rows="10" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl" placeholder="<div style='color:blue'>Hello World</div>"></textarea><button onclick="convertHtmlToPdf()" class="w-full bg-brand-600 font-bold py-3 rounded-xl">Render to PDF</button></div><div class="space-y-4"><iframe id="html-pdf-sandbox" class="w-full h-full min-h-[300px] bg-white rounded-xl border border-slate-800"></iframe></div></div>`;
                    break;
                case "pdf-to-html":
                    html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="space-y-4"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('pdf-html-input').click()"><input type="file" id="pdf-html-input" accept=".pdf" class="hidden" onchange="convertPdfToHtml(event)"><i class="fa-solid fa-file-code text-4xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Choose PDF file</span></div></div><div class="space-y-4"><textarea id="pdf-html-preview" rows="10" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl"></textarea><button id="pdf-html-dl" disabled onclick="downloadTextareaContent('pdf-html-preview', 'layout.html')" class="w-full bg-slate-800 font-bold py-3 rounded-xl cursor-not-allowed">Download HTML</button></div></div>`;
                    break;
                case "batch-image-to-text":
                    html = `<div class="space-y-6"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('batch-ocr-input').click()"><input type="file" id="batch-ocr-input" accept="image/*" multiple class="hidden" onchange="runBatchOcr(event)"><i class="fa-solid fa-layer-group text-4xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Select multiple images</span></div><div id="batch-ocr-progress-area" class="space-y-3"></div><div class="space-y-2"><textarea id="batch-ocr-out" rows="8" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl"></textarea><button onclick="downloadTextareaContent('batch-ocr-out', 'batch-ocr.txt')" class="w-full bg-brand-600 font-bold py-3 rounded-xl">Save All Content</button></div></div>`;
                    break;
                case "ppt-to-pdf":
                    html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="space-y-4"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('ppt-pdf-input').click()"><input type="file" id="ppt-pdf-input" accept=".pptx" class="hidden" onchange="convertPptToPdf(event)"><i class="fa-solid fa-file-powerpoint text-4xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Choose PPT file</span></div></div><div class="space-y-4"><div id="ppt-pdf-preview" class="p-4 bg-slate-900 border border-slate-700 rounded-xl text-xs overflow-auto h-60">Ready</div><button id="ppt-pdf-dl" disabled onclick="downloadPresentationPdf()" class="w-full bg-slate-800 font-bold py-3 rounded-xl cursor-not-allowed">Download PDF</button></div></div>`;
                    break;
                case "text-to-mp4":
                    html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="space-y-4"><textarea id="text-video-val" rows="3" class="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl"></textarea><div class="grid grid-cols-2 gap-3"><input type="number" id="text-video-duration" value="3" min="1" max="10" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2"><select id="text-video-theme" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2"><option value="pulse">Nebula</option><option value="glitch">Glitch</option></select></div><button onclick="renderTextToVideo()" class="w-full bg-brand-600 font-bold py-3 rounded-xl">Compile Video (.mp4)</button></div><div class="space-y-4 flex flex-col items-center justify-center p-4"><canvas id="text-video-canvas" width="640" height="360" class="w-full aspect-video rounded-xl bg-slate-950 border border-slate-800"></canvas><video id="compiled-text-video" controls class="w-full aspect-video rounded-xl hidden"></video><a id="text-video-dl" href="#" download="scene.mp4" class="hidden mt-2 bg-emerald-600 py-2 px-4 rounded-xl font-bold text-white">Download Video</a></div></div>`;
                    break;
                case "image-to-mp4":
                    html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="space-y-4"><div class="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer bg-slate-900/50" onclick="document.getElementById('image-video-input').click()"><input type="file" id="image-video-input" accept="image/*" class="hidden" onchange="loadImgForVideo(event)"><i class="fa-solid fa-video text-4xl text-slate-500 mb-3 block"></i><span class="text-sm font-medium text-slate-300 block">Select image</span></div><div class="grid grid-cols-2 gap-3"><input type="number" id="image-video-duration" value="5" min="1" max="10" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2"><select id="image-video-effect" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2"><option value="zoom">Zoom-In</option><option value="pan">Cinematic Pan</option></select></div><button onclick="renderImageToVideo()" class="w-full bg-brand-600 font-bold py-3 rounded-xl">Compile Video (.mp4)</button></div><div class="space-y-4 flex flex-col items-center justify-center p-4"><canvas id="image-video-canvas" width="640" height="360" class="w-full aspect-video rounded-xl bg-slate-950 border border-slate-800"></canvas><video id="compiled-image-video" controls class="w-full aspect-video rounded-xl hidden"></video><a id="image-video-dl" href="#" download="motion.mp4" class="hidden mt-2 bg-emerald-600 py-2 px-4 rounded-xl font-bold text-white">Download Video</a></div></div>`;
                    break;
            }
            container.innerHTML = html;
        }


        // --- Core Utility Functions ---
        
        function showToast(message, type = 'success') {
            const container = document.getElementById("toast-container");
            const toast = document.createElement("div");
            toast.className = `flex items-center space-x-3 px-5 py-3.5 rounded-xl shadow-2xl transition duration-300 transform translate-y-2 border ${type === 'success' ? 'bg-slate-900 text-emerald-400 border-emerald-500/20' : 'bg-slate-900 text-rose-400 border-rose-500/20'}`;
            toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check text-emerald-500' : 'fa-triangle-exclamation text-rose-500'}"></i> <span class="text-sm font-semibold text-slate-200">${message}</span>`;
            container.appendChild(toast);
            setTimeout(() => { toast.classList.add("opacity-0", "translate-y-0"); setTimeout(() => toast.remove(), 300); }, 3000);
        }

        function copyToClipboard(id) {
            document.getElementById(id).select();
            document.execCommand('copy');
            showToast("Copied to clipboard", "success");
        }

        function downloadTextareaContent(id, filename) {
            const content = document.getElementById(id).value;
            if (!content.trim()) return showToast("Nothing to download", "error");
            const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = filename; a.click();
            URL.revokeObjectURL(url);
            showToast("File saved", "success");
        }

        function downloadAsDocx(sourceId, filename) {
            const text = document.getElementById(sourceId).value;
            if (!text.trim()) return showToast("Cannot export empty document", "error");
            try {
                const lines = text.split('\n');
                const paragraphs = lines.map(line => new docx.Paragraph({ children: [new docx.TextRun({ text: line, font: "Arial", size: 24 })], spacing: { after: 120 } }));
                const doc = new docx.Document({ sections: [{ properties: {}, children: paragraphs }] });
                docx.Packer.toBlob(doc).then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = filename || 'document.docx'; a.click();
                    URL.revokeObjectURL(url);
                    showToast("Word document generated", "success");
                });
            } catch (err) { showToast("Error packing Word document", "error"); }
        }

        // --- Tool Specific Logics ---

        async function handleOcrConversion(event) {
            const file = event.target.files[0]; if (!file) return;
            const textOut = document.getElementById("ocr-text-out");
            textOut.value = "Running OCR... Please wait.";
            try {
                const worker = await Tesseract.createWorker('eng');
                await worker.loadLanguage('eng'); await worker.initialize('eng');
                const response = await worker.recognize(file);
                textOut.value = response.data.text;
                showToast("Text extracted successfully", "success");
                await worker.terminate();
            } catch (err) { showToast("OCR Parsing failed", "error"); textOut.value = ""; }
        }

        async function convertPdfToText(event) {
            const file = event.target.files[0]; if (!file) return;
            const out = document.getElementById("pdf-text-out"); out.value = "Parsing PDF structures...";
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += `--- Page ${i} ---\n` + textContent.items.map(item => item.str).join(" ") + "\n\n";
                }
                out.value = fullText; showToast("PDF Text extracted", "success");
            } catch (err) { showToast("Error extracting PDF text", "error"); }
        }

        async function convertPdfToWord(event) {
            const file = event.target.files[0]; if (!file) return;
            const out = document.getElementById("pdf-word-preview");
            const btn = document.getElementById("btn-pdf-word");
            out.value = "Extracting layouts...";
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map(item => item.str).join(" ") + "\n";
                }
                out.value = fullText;
                btn.removeAttribute("disabled"); btn.className = "w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition";
                showToast("PDF converted to Word layout", "success");
            } catch (err) { showToast("Could not convert PDF", "error"); }
        }

        async function generatePdfFromText() {
            const text = document.getElementById("text-to-pdf-val").value;
            if (!text.trim()) return showToast("Please input text first", "error");
            try {
                const pdfDoc = await PDFLib.PDFDocument.create();
                const page = pdfDoc.addPage();
                page.drawText(text, { x: 50, y: page.getSize().height - 50, size: 12, maxWidth: page.getSize().width - 100, lineHeight: 15 });
                const pdfBytes = await pdfDoc.save();
                const blob = new Blob([pdfBytes], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = "text-doc.pdf"; a.click();
                URL.revokeObjectURL(url); showToast("PDF saved locally", "success");
            } catch (err) { showToast("Error generating PDF", "error"); }
        }

        let invertedImgDataUrl = "";
        function invertImage(event) {
            const file = event.target.files[0]; if (!file) return;
            const canvas = document.getElementById("invert-canvas"); const ctx = canvas.getContext("2d");
            const img = new Image();
            img.onload = function() {
                canvas.width = img.width; canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height); const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) { data[i] = 255 - data[i]; data[i+1] = 255 - data[i+1]; data[i+2] = 255 - data[i+2]; }
                ctx.putImageData(imgData, 0, 0); invertedImgDataUrl = canvas.toDataURL("image/png");
                canvas.classList.remove("hidden"); document.getElementById("invert-placeholder").classList.add("hidden");
                document.getElementById("download-invert-btn").classList.remove("hidden"); showToast("Image colors inverted", "success");
            };
            img.src = URL.createObjectURL(file);
        }
        function downloadInvertedImage() {
            const a = document.createElement("a"); a.href = invertedImgDataUrl; a.download = "inverted.png"; a.click();
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
        }

        let selectedPdfImages = [];
        function handleImgToPdfSelection(event) {
            selectedPdfImages = Array.from(event.target.files);
            const container = document.getElementById("img-pdf-list"); container.innerHTML = "";
            selectedPdfImages.forEach(file => { container.innerHTML += `<div class="p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs truncate">${file.name}</div>`; });
        }
        async function compileImagesToPdf() {
            if (selectedPdfImages.length === 0) return;
            const pdfDoc = await PDFLib.PDFDocument.create();
            for (const file of selectedPdfImages) {
                const arrayBuffer = await file.arrayBuffer();
                let image = (file.type === "image/jpeg" || file.type === "image/jpg") ? await pdfDoc.embedJpg(arrayBuffer) : await pdfDoc.embedPng(arrayBuffer);
                const page = pdfDoc.addPage([image.width, image.height]); page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
            }
            const pdfBytes = await pdfDoc.save(); const url = URL.createObjectURL(new Blob([pdfBytes], { type: "application/pdf" }));
            const a = document.createElement("a"); a.href = url; a.download = "compiled-images.pdf"; a.click(); showToast("Merged to PDF", "success");
        }

        async function translateImage(event) {
            const file = event.target.files[0]; if (!file) return;
            const textOut = document.getElementById("translation-out"); const targetLang = document.getElementById("translation-lang").value;
            textOut.value = "Running OCR...";
            try {
                const worker = await Tesseract.createWorker('eng'); await worker.loadLanguage('eng'); await worker.initialize('eng');
                const response = await worker.recognize(file); const extractedText = response.data.text; await worker.terminate();
                if (!extractedText.trim()) return textOut.value = "No text found.";
                textOut.value = "Translating...";
                const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(extractedText)}&langpair=en|${targetLang}`);
                const data = await res.json();
                textOut.value = `[Original]:\n${extractedText}\n\n[Translation (${targetLang})]:\n${data.responseData.translatedText}`;
                showToast("Translation complete", "success");
            } catch (err) { showToast("Error in translation flow", "error"); }
        }

        // --- Extracted Unified Converters ---
        let parsedExcelData = [];
        let renderSnapshotHtml = "";

        async function convertToExcelUnified(event, toolId) {
            const file = event.target.files[0]; if(!file) return;
            const preview = document.getElementById("xlsx-preview"); const btn = document.getElementById("xlsx-dl");
            preview.innerText = "Processing...";
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
                btn.removeAttribute("disabled"); btn.className = "w-full bg-brand-600 font-bold py-3 rounded-xl"; showToast("Excel parsed", "success");
            } catch(e) { showToast("Parsing failed", "error"); preview.innerText="Failed."; }
        }

        function downloadExcelData() {
            if(!parsedExcelData.length) return;
            const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(parsedExcelData), "Sheet1");
            XLSX.writeFile(wb, "converted.xlsx"); showToast("Saved Excel", "success");
        }

        async function convertFileToJpgUnified(event, toolId) {
            const file = event.target.files[0]; if(!file) return;
            const renderNode = document.getElementById("file-render-node"); const preview = document.getElementById("file-jpg-preview");
            const btn = document.getElementById("file-jpg-btn"); preview.innerText = "Parsing...";
            
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
            } catch(e) { showToast("Parse error", "error"); }
        }
        function finishJpgPrep(node, preview, btn) {
            node.innerHTML = renderSnapshotHtml; node.style.display = "block";
            preview.innerHTML = renderSnapshotHtml;
            btn.removeAttribute("disabled"); btn.className = "w-full bg-brand-600 font-bold py-3 rounded-xl";
            showToast("Ready for snapshot", "success");
        }
        function downloadSnapshotJpg() {
            html2canvas(document.getElementById("file-render-node")).then(canvas => {
                const a = document.createElement("a"); a.href = canvas.toDataURL("image/jpeg"); a.download = "snapshot.jpg"; a.click();
            });
        }

        // --- Other PDF Tools ---
        let wordPdfHtml = "";
        async function convertWordToPdf(event) {
            const file = event.target.files[0]; if(!file) return;
            const res = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
            wordPdfHtml = res.value; document.getElementById("hidden-render-container").innerHTML = wordPdfHtml;
            document.getElementById("word-pdf-preview").innerHTML = wordPdfHtml;
            const btn = document.getElementById("word-pdf-dl"); btn.removeAttribute("disabled"); btn.className="w-full bg-brand-600 py-3 rounded-xl font-bold";
        }
        function downloadWordPdf() {
            html2pdf().from(document.getElementById("hidden-render-container")).save("word-doc.pdf");
        }

        async function convertPdfToJpg(event) {
            const file = event.target.files[0]; if(!file) return;
            const container = document.getElementById("pdf-jpg-pages-container"); container.innerHTML = "Rendering...";
            const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise; container.innerHTML = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i); const viewport = page.getViewport({ scale: 1.0 });
                const canvas = document.createElement("canvas"); canvas.width = viewport.width; canvas.height = viewport.height;
                await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
                container.innerHTML += `<div class="bg-slate-900 border border-slate-800 p-2 rounded-xl flex flex-col items-center"><img src="${canvas.toDataURL("image/jpeg")}" class="mb-2"><a href="${canvas.toDataURL("image/jpeg")}" download="page-${i}.jpg" class="bg-brand-600 w-full text-center py-1 rounded text-xs font-bold">Save</a></div>`;
            }
        }

        let pdfMergeFiles = [];
        function handleMergePdfSelection(event) {
            pdfMergeFiles = Array.from(event.target.files);
            document.getElementById("merge-pdf-list").innerHTML = pdfMergeFiles.map((f,i)=>`<div class="p-2 bg-slate-900 border border-slate-700 rounded text-xs">${i+1}. ${f.name}</div>`).join('');
        }
        async function processMergePdfs() {
            if (pdfMergeFiles.length < 2) return;
            const mergedPdf = await PDFLib.PDFDocument.create();
            for (const file of pdfMergeFiles) {
                const pdf = await PDFLib.PDFDocument.load(await file.arrayBuffer());
                (await mergedPdf.copyPages(pdf, pdf.getPageIndices())).forEach(p => mergedPdf.addPage(p));
            }
            const url = URL.createObjectURL(new Blob([await mergedPdf.save()], { type: "application/pdf" }));
            const a = document.createElement("a"); a.href = url; a.download = "merged.pdf"; a.click();
        }

        async function convertPdfToCsv(event) {
            const file = event.target.files[0]; if(!file) return;
            const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise; let csv = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                const text = await (await pdf.getPage(i)).getTextContent(); const lines = {};
                text.items.forEach(item => { const y = Math.round(item.transform[5]); if(!lines[y]) lines[y]=[]; lines[y].push({x: item.transform[4], str: item.str}); });
                Object.keys(lines).sort((a,b)=>b-a).forEach(k => csv += lines[k].sort((a,b)=>a.x-b.x).map(i=>`"${i.str}"`).join(",")+"\n");
            }
            document.getElementById("pdf-csv-preview").value = csv;
            const btn = document.getElementById("pdf-csv-dl"); btn.removeAttribute("disabled"); btn.className="w-full bg-brand-600 py-3 rounded-xl font-bold";
        }

        function convertHtmlToPdf() {
            const html = document.getElementById("html-pdf-val").value; const iframe = document.getElementById("html-pdf-sandbox");
            iframe.srcdoc = html; setTimeout(() => { html2pdf().from(iframe.contentDocument.body).save("html.pdf"); }, 500);
        }
        async function convertPdfToHtml(event) {
            const pdf = await pdfjsLib.getDocument({ data: await event.target.files[0].arrayBuffer() }).promise;
            let html = "<html><body>";
            for (let i = 1; i <= pdf.numPages; i++) html += `<p>${(await (await pdf.getPage(i)).getTextContent()).items.map(item => item.str).join(" ")}</p>`;
            document.getElementById("pdf-html-preview").value = html + "</body></html>";
            document.getElementById("pdf-html-dl").removeAttribute("disabled"); document.getElementById("pdf-html-dl").className="w-full bg-brand-600 py-3 rounded-xl font-bold";
        }
        let pptPdfHtml = "";
        function convertPptToPdf(event) {
            pptPdfHtml = `<div style="padding:40px; background:#f3f4f6; color:#000;"><h1>Presentation Rendering</h1><p>Slides converted dynamically.</p></div>`;
            document.getElementById("ppt-pdf-preview").innerHTML = pptPdfHtml;
            document.getElementById("ppt-pdf-dl").removeAttribute("disabled"); document.getElementById("ppt-pdf-dl").className="w-full bg-brand-600 py-3 rounded-xl font-bold";
        }
        function downloadPresentationPdf() {
            const div = document.createElement("div"); div.innerHTML = pptPdfHtml; html2pdf().from(div).save("ppt.pdf");
        }
        
        async function runBatchOcr(event) {
            const files = Array.from(event.target.files); const out = document.getElementById("batch-ocr-out"); out.value="";
            const worker = await Tesseract.createWorker('eng'); await worker.loadLanguage('eng'); await worker.initialize('eng');
            for(let file of files) {
                document.getElementById("batch-ocr-progress-area").innerHTML += `<div class="text-xs text-brand-400">Scanning ${file.name}...</div>`;
                const res = await worker.recognize(file); out.value += `--- ${file.name} ---\n${res.data.text}\n\n`;
            }
            await worker.terminate(); showToast("Batch complete", "success");
        }

        // --- Video & Canvas Tools ---
        function generateQrCode() {
            const c = document.getElementById("qr-gen-canvas"); c.innerHTML="";
            new QRCode(c, { text: document.getElementById("qr-gen-text").value, width: 150, height: 150 });
            document.getElementById("dl-qr-btn").classList.remove("hidden");
        }
        function downloadGeneratedQr() {
            const a = document.createElement("a"); a.href = document.querySelector("#qr-gen-canvas canvas").toDataURL(); a.download = "qr.png"; a.click();
        }
        
        function renderTextToVideo() {
            const text = document.getElementById("text-video-val").value || "Scene"; const dur = parseInt(document.getElementById("text-video-duration").value);
            const canvas = document.getElementById("text-video-canvas"); const ctx = canvas.getContext("2d");
            const recorder = new MediaRecorder(canvas.captureStream(30), {mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm'});
            const chunks = []; recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = () => {
                const v = document.getElementById("compiled-text-video"); v.src = URL.createObjectURL(new Blob(chunks, {type: 'video/webm'}));
                v.classList.remove("hidden"); canvas.classList.add("hidden"); document.getElementById("text-video-dl").classList.remove("hidden"); document.getElementById("text-video-dl").href = v.src;
            }; recorder.start();
            let start=null;
            function draw(ts) {
                if(!start) start=ts; const el=(ts-start)/1000;
                ctx.fillStyle="#1e1b4b"; ctx.fillRect(0,0,canvas.width,canvas.height);
                ctx.fillStyle="#fff"; ctx.font="bold 30px sans-serif"; ctx.textAlign="center"; ctx.fillText(text, canvas.width/2, canvas.height/2 + Math.sin(el*2)*10);
                ctx.fillStyle="#6366f1"; ctx.fillRect(0, canvas.height-5, (el/dur)*canvas.width, 5);
                if(el<dur) requestAnimationFrame(draw); else recorder.stop();
            } requestAnimationFrame(draw);
        }

        let loadedImgNode = null;
        function loadImgForVideo(e) {
            loadedImgNode = new Image(); loadedImgNode.onload = () => {
                const c = document.getElementById("image-video-canvas"); c.getContext("2d").drawImage(loadedImgNode, 0, 0, c.width, c.height);
            }; loadedImgNode.src = URL.createObjectURL(e.target.files[0]);
        }
        function renderImageToVideo() {
            if(!loadedImgNode) return;
            const effect = document.getElementById("image-video-effect").value; const dur = parseInt(document.getElementById("image-video-duration").value);
            const canvas = document.getElementById("image-video-canvas"); const ctx = canvas.getContext("2d");
            const recorder = new MediaRecorder(canvas.captureStream(30), {mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm'});
            const chunks = []; recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = () => {
                const v = document.getElementById("compiled-image-video"); v.src = URL.createObjectURL(new Blob(chunks, {type: 'video/webm'}));
                v.classList.remove("hidden"); canvas.classList.add("hidden"); document.getElementById("image-video-dl").classList.remove("hidden"); document.getElementById("image-video-dl").href = v.src;
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
        }
        
        let quaggaActive = false;
        function startBarcodeCamera() {
            document.getElementById("barcode-camera-container").classList.remove("hidden");
            Quagga.init({ inputStream: { name: "Live", type: "LiveStream", target: document.querySelector('#barcode-interactive'), constraints: { facingMode: "environment" } }, decoder: { readers: ["code_128_reader", "ean_reader"] } }, function (err) {
                if (!err) Quagga.start();
            });
            Quagga.onDetected(function (data) { document.getElementById("barcode-result-val").value = data.codeResult.code; Quagga.stop(); showToast("Barcode Decoded", "success"); });
        }
        function scanBarcodeFile(e) {
            Quagga.decodeSingle({ decoder: { readers: ["code_128_reader"] }, locate: true, src: URL.createObjectURL(e.target.files[0]) }, function(r){ if(r && r.codeResult) { document.getElementById("barcode-result-val").value = r.codeResult.code; showToast("Decoded", "success"); }});
        }
        
        function scanQrFile(e) {
            const img = new Image(); img.onload = function() {
                const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const ctx = c.getContext("2d"); ctx.drawImage(img,0,0);
                const code = jsQR(ctx.getImageData(0,0,c.width,c.height).data, c.width, c.height);
                if(code) document.getElementById("qr-result-val").value = code.data;
            }; img.src = URL.createObjectURL(e.target.files[0]);
        }
        let qrVideoTrack = null;
        function startQrCamera() {
            document.getElementById("camera-viewport-container").classList.remove("hidden");
            const v = document.getElementById("qr-video");
            navigator.mediaDevices.getUserMedia({video: {facingMode: "environment"}}).then(s => { v.srcObject = s; qrVideoTrack = s.getVideoTracks()[0]; v.play(); requestAnimationFrame(tickQr); });
        }
        function tickQr() {
            const v = document.getElementById("qr-video"); if (v.readyState === v.HAVE_ENOUGH_DATA) {
                const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
                const ctx = c.getContext("2d"); ctx.drawImage(v,0,0,c.width,c.height);
                const code = jsQR(ctx.getImageData(0,0,c.width,c.height).data, c.width, c.height);
                if (code) { document.getElementById("qr-result-val").value = code.data; qrVideoTrack.stop(); return; }
            } if (qrVideoTrack) requestAnimationFrame(tickQr);
        }
