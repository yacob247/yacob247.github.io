// Configure PDF.js worker securely for local browser execution
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

(function(){
  // ── VAST TAG URLs ─────────────────────────────────────────────
  var VAST_MONETAG = "https://subtle-injury.com/dSmuFnz.dgGMNbvuZHGRUK/Perm/9kubZVUelxkEPhTOc/zoNBD/A/wAMfDHkLtTN_zgMO0YMiDwADxqMDwE";
  var VAST_HILLTOP = "//relieved-understanding.com/b.XuVVsydZGnl/0IYZWtcM/telmk9/udZhUml/kSPeTIcGzzMnzIkB5/OJTRMkt-N_zkMoz/O/Tmkr5MNEwH";
  var VAST = VAST_HILLTOP || VAST_MONETAG;
  // ─────────────────────────────────────────────────────────────

  /* ── Inline outstream player ── */
  var outstreamReady = false, outstreamPlayer;
  var outSkip  = document.getElementById('evz-outstream-skip');
  var outTimer, outElapsed = 0;

  function initOutstream(){
    if(typeof videojs==='undefined'||typeof google==='undefined'){setTimeout(initOutstream,400);return;}
    if(outstreamReady) return;
    outstreamPlayer = videojs('evz-outstream-vid',{controls:false,muted:true,autoplay:true,fluid:false,width:640,height:360});
    outstreamPlayer.ima({adTagUrl:VAST});
    outstreamPlayer.on('adstart',function(){
      outElapsed=0; outSkip.style.display='none';
      outTimer=setInterval(function(){
        outElapsed++;
        if(outElapsed>=10){outSkip.style.display='block';clearInterval(outTimer);}
      },1000);
    });
    outstreamPlayer.on('adend',function(){clearInterval(outTimer);collapseOutstream();});
    outstreamPlayer.on('aderror',function(){clearInterval(outTimer);collapseOutstream();});
    outstreamPlayer.ready(function(){outstreamPlayer.play().catch(function(){});});
    outstreamReady=true;
  }

  function collapseOutstream(){
    var wrap=document.getElementById('evz-outstream-inline');
    if(wrap) wrap.classList.add('collapsed');
    try{ outstreamPlayer.pause(); }catch(e){}
  }
  outSkip.addEventListener('click',collapseOutstream);
  document.getElementById('evz-outstream-close').addEventListener('click',collapseOutstream);

  /* ── Rewarded gate player ── */
  var rewardedReady=false, rewardedPlayer;
  var rewardedOverlay = document.getElementById('evz-rewarded-overlay');
  var rewardedCountdown = document.getElementById('evz-rewarded-countdown');
  var rewardedSkipBtn = document.getElementById('evz-rewarded-skip-btn');
  var pendingDownloadHref = null;
  var rewardTimer, rewardElapsed;

  function initRewarded(){
    if(typeof videojs==='undefined'||typeof google==='undefined'){setTimeout(initRewarded,400);return;}
    if(rewardedReady) return;
    rewardedPlayer = videojs('evz-rewarded-vid',{controls:false,muted:true,autoplay:false,fluid:false,width:520,height:292});
    rewardedPlayer.ima({adTagUrl:VAST});
    rewardedPlayer.on('adstart',function(){
      rewardElapsed=0; rewardedSkipBtn.style.display='none';
      rewardTimer=setInterval(function(){
        rewardElapsed++;
        var left=30-rewardElapsed;
        rewardedCountdown.textContent=left>0?left+'s':'';
        if(rewardElapsed>=30){
          clearInterval(rewardTimer);
          rewardedSkipBtn.style.display='block';
          rewardedCountdown.textContent='';
          rewardedSkipBtn.textContent='Download Now ↓';
        }
      },1000);
    });
    rewardedPlayer.on('adend',function(){
      clearInterval(rewardTimer);
      closeRewarded();
    });
    rewardedPlayer.on('aderror',function(){clearInterval(rewardTimer);closeRewarded();});
    rewardedReady=true;
  }

  function openRewarded(href){
    pendingDownloadHref=href;
    rewardedOverlay.classList.add('active');
    rewardedCountdown.textContent='30s';
    rewardedSkipBtn.style.display='none';
    if(rewardedReady){
      try{rewardedPlayer.ima.requestAds();rewardedPlayer.play();}catch(e){closeRewarded();}
    }
  }

  function closeRewarded(){
    rewardedOverlay.classList.remove('active');
    try{rewardedPlayer.pause();}catch(e){}
    if(pendingDownloadHref){window.location.href=pendingDownloadHref;pendingDownloadHref=null;}
  }

  rewardedSkipBtn.addEventListener('click',closeRewarded);

  /* ── Hook download triggers ── */
  window.addEventListener('load',function(){
    initOutstream();
    initRewarded();

    var dlSelectors=[
      'a[download]','a[href*="download"]','a[href*=".zip"]',
      'a[href*=".exe"]','a[href*=".pdf"]',
      'button[id*="download"]','button[class*="download"]',
      '.download-btn','#download-btn','[data-action="download"]'
    ];
    document.querySelectorAll(dlSelectors.join(',')).forEach(function(el){
      el.addEventListener('click',function(e){
        e.preventDefault();
        var href=(el.tagName==='A'&&el.href)?el.href:null;
        openRewarded(href);
      });
    });
  });
})();

(function(){
  setInterval(function(){
    if(document.hidden)return;
    document.querySelectorAll('.evz-col-box iframe').forEach(function(f){
      f.src=f.src.split('?')[0]+'?_t='+Date.now();
    });
  },45000);
})();

(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement,document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

const yearElement = document.getElementById('year');
    if (yearElement) yearElement.textContent = new Date().getFullYear();

    async function convertPdfToPurePngPdf(pdfArrayBuffer) {
        const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;

        const { PDFDocument } = PDFLib;
        const newPdfDoc = await PDFDocument.create();

        for (let i = 1; i <= numPages; i++) {
            setLoading(true, "Flattening to PNG...", `Rasterizing page ${i} of ${numPages} into pure PNG image`);
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
            const pngDataUrl = canvas.toDataURL('image/png');
            const pngImage = await newPdfDoc.embedPng(pngDataUrl);

            const physicalWidth = viewport.width / 2.0;
            const physicalHeight = viewport.height / 2.0;
            const newPage = newPdfDoc.addPage([physicalWidth, physicalHeight]);

            newPage.drawImage(pngImage, { x: 0, y: 0, width: physicalWidth, height: physicalHeight });
        }

        return await newPdfDoc.save();
    }

    async function downloadPdfPagesAsPngs(pdfArrayBuffer, baseFileName) {
        const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;

        for (let i = 1; i <= numPages; i++) {
            setLoading(true, "Generating PNG Image...", `Exporting page ${i} of ${numPages} as PNG file`);
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: ctx, viewport: viewport }).promise;

            const pngDataUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = pngDataUrl;
            a.download = `${baseFileName}_Page_${i}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            await delay(300);
        }
    }

    const modalOverlay = document.getElementById('customModalOverlay');
    const modalBox = document.getElementById('customModalBox');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalActions = document.getElementById('modalActions');

    function showModal(title, message, type = 'alert', onConfirm = null) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalActions.innerHTML = ''; 

        const createBtn = (text, classes, onClick) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.className = `px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${classes}`;
            btn.onclick = () => {
                closeModal();
                if (onClick) onClick();
            };
            return btn;
        };

        if (type === 'confirm') {
            modalActions.appendChild(createBtn('Cancel', 'bg-slate-100 text-slate-700 hover:bg-slate-200', null));
            modalActions.appendChild(createBtn('Confirm', 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm', onConfirm));
        } else {
            modalActions.appendChild(createBtn('OK', 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm', onConfirm));
        }

        modalOverlay.classList.remove('hidden');
        setTimeout(() => {
            modalBox.classList.remove('scale-95', 'opacity-0');
            modalBox.classList.add('scale-100', 'opacity-100');
        }, 10);
    }

    function closeModal() {
        modalBox.classList.remove('scale-100', 'opacity-100');
        modalBox.classList.add('scale-95', 'opacity-0');
        setTimeout(() => { modalOverlay.classList.add('hidden'); }, 200);
    }

    let applicationFiles = [];
    let fileIdCounter = 0;

    const dropzone = document.getElementById('dropzone');
    const fileList = document.getElementById('fileList');
    const emptyState = document.getElementById('emptyState');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    const loadingSubText = document.getElementById('loadingSubText');
    const compressToggle = document.getElementById('compressToggle');

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('bg-blue-50/50', 'border-blue-500');
    });
    dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropzone.classList.remove('bg-blue-50/50', 'border-blue-500');
    });
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('bg-blue-50/50', 'border-blue-500');
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    });

    function setLoading(isLoading, text = "Processing...", subText = "") {
        loadingText.textContent = text;
        loadingSubText.textContent = subText;
        if (isLoading) loadingOverlay.classList.remove('hidden');
        else loadingOverlay.classList.add('hidden');
    }

    const delay = ms => new Promise(res => setTimeout(res, ms));

    async function convertHtmlToSearchablePdfBytes(htmlContent) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!window.pdfMake.vfs && window.pdfMake.vfs_fonts) {
                   window.pdfMake.vfs = window.pdfMake.vfs_fonts;
                }

                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlContent, 'text/html');
                const images = doc.querySelectorAll('img');

                const imagePromises = Array.from(images).map(img => {
                    return new Promise((imgResolve) => {
                        const src = img.getAttribute('src') || '';

                        if (!src.startsWith('data:image/jpeg') && !src.startsWith('data:image/png')) {
                            const span = doc.createElement('span');
                            span.textContent = '[Image removed to preserve document stability]';
                            span.style.color = '#94a3b8'; 
                            span.style.fontSize = '12px';
                            span.style.fontStyle = 'italic';
                            img.replaceWith(span);
                            imgResolve();
                        } else {
                            const tempImg = new Image();
                            tempImg.onload = () => {
                                const MAX_WIDTH = 495;
                                const scale = tempImg.width > MAX_WIDTH ? (MAX_WIDTH / tempImg.width) : 1;
                                const finalWidth = tempImg.width * scale;
                                img.setAttribute('width', finalWidth);
                                imgResolve();
                            };
                            tempImg.onerror = imgResolve; 
                            tempImg.src = src;
                        }
                    });
                });

                await Promise.all(imagePromises);
                const sanitizedHtml = doc.body.innerHTML;

                const pdfMakeResult = htmlToPdfmake(sanitizedHtml, {
                    imagesByReference: true, 
                    defaultStyles: {
                        p: { margin: [0, 5, 0, 5], fontSize: 12, lineHeight: 1.2 },
                        h1: { fontSize: 24, bold: true, margin: [0, 15, 0, 10] },
                        h2: { fontSize: 20, bold: true, margin: [0, 12, 0, 8] },
                        a: { color: '#2563eb', decoration: 'underline' }
                    }
                });

                const docDefinition = {
                    content: pdfMakeResult.content || pdfMakeResult, 
                    images: pdfMakeResult.images || {},
                    pageSize: 'A4',
                    pageMargins: [ 50, 60, 50, 60 ], 
                    defaultStyle: { font: 'Roboto', fontSize: 11, color: '#1e293b' }
                };

                const pdfDocGenerator = pdfMake.createPdf(docDefinition);
                pdfDocGenerator.getBuffer((buffer) => resolve(new Uint8Array(buffer)));
            } catch (error) {
                console.error("PDFMake conversion error:", error);
                reject(error);
            }
        });
    }

    async function formatImageForPdf(file) {
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.create();
        const ocrMode = document.getElementById('ocrModeSelect').value;

        // PATH 1: STRICT TEXT EXTRACTION (NO IMAGE RENDERED)
        if (ocrMode === 'text_only') {
            setLoading(true, "Extracting Text...", `Running OCR on ${file.name}. This may take a moment.`);
            try {
                if (typeof Tesseract === 'undefined') throw new Error("Tesseract.js not loaded.");

                const worker = await Tesseract.createWorker("eng");
                const imageUrl = URL.createObjectURL(file);
                const ret = await worker.recognize(imageUrl);
                URL.revokeObjectURL(imageUrl);
                await worker.terminate();

                const textExtracted = ret.data && ret.data.text ? ret.data.text.trim() : "";

                // If text found, format it. If not, state clearly it failed to find text.
                const formattedText = textExtracted.length > 0
                    ? textExtracted.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
                    : "<i>[No recognizable text was found in this image]</i>";

                const htmlString = `
                    <div style="font-family: sans-serif; padding: 10px;">
                        <h2 style="color: #64748b; font-size: 14px; margin-bottom: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">Extracted Text from Image: ${file.name}</h2>
                        <p style="font-size: 12px; line-height: 1.5;">${formattedText}</p>
                    </div>
                `;
                return await convertHtmlToSearchablePdfBytes(htmlString);

            } catch (e) {
                console.error("OCR failed fundamentally", e);
                // Return a PDF clearly stating OCR broke, DO NOT fall back to rendering the image.
                const htmlString = `
                    <div style="font-family: sans-serif; padding: 10px;">
                        <h2 style="color: #e11d48; font-size: 14px; margin-bottom: 15px; border-bottom: 1px solid #fecdd3; padding-bottom: 5px;">OCR Processing Error: ${file.name}</h2>
                        <p style="font-size: 12px; line-height: 1.5; color: #be123c;">The text extraction engine failed to process this file entirely.</p>
                    </div>
                `;
                return await convertHtmlToSearchablePdfBytes(htmlString);
            }
            // Notice: The function returns here. It physically cannot proceed to the image step.
        }

        // PATH 2: STRICT IMAGE EMBEDDING (NO TEXT EXTRACTION)
        setLoading(true, "Formatting Image...", `Processing ${file.name} as PNG for embedding`);

        // Drawing the file to a Canvas first guarantees it will be a perfect PNG, 
        // avoiding PDFLib crashes if the user uploads unsupported webp/heic/etc.
        const pngBytes = await new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(async (blob) => {
                    URL.revokeObjectURL(url);
                    if (blob) {
                         resolve(await blob.arrayBuffer());
                    } else {
                         reject(new Error("Canvas to Blob failed"));
                    }
                }, 'image/png');
            };
            img.onerror = (e) => {
                URL.revokeObjectURL(url);
                reject(new Error("Failed to load image structure."));
            };
            img.src = url;
        });

        let image = await pdfDoc.embedPng(pngBytes);
        const sizeMode = document.getElementById('imageSizeSelect').value;
        let pageWidth, pageHeight, drawWidth, drawHeight, x, y;

        if (sizeMode === 'original') {
            pageWidth = image.width;
            pageHeight = image.height;
            drawWidth = image.width;
            drawHeight = image.height;
            x = 0; y = 0;
        } else {
            let a4Width = 595.28; let a4Height = 841.89; 
            if (image.width > image.height) { pageWidth = a4Height; pageHeight = a4Width; }
            else { pageWidth = a4Width; pageHeight = a4Height; }

            const imgDims = image.scaleToFit(pageWidth - 80, pageHeight - 80); 
            drawWidth = imgDims.width; drawHeight = imgDims.height;
            x = pageWidth / 2 - drawWidth / 2; y = pageHeight / 2 - drawHeight / 2;
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawImage(image, { x, y, width: drawWidth, height: drawHeight });

        return await pdfDoc.save();
    }

    function handleFiles(files) {
        if (!files || files.length === 0) return;

        for (const file of files) {
            applicationFiles.push({
                id: fileIdCounter++,
                originalFile: file,
                name: file.name,
                type: file.type || 'Unknown',
                selected: true,
                processedCache: null // Caching system defers processing to download time
            });
        }
        renderFileList();
        document.getElementById('fileInput').value = "";
    }

    async function convertFileToPdf(file) {
        const { PDFDocument, StandardFonts } = PDFLib;
        const ocrMode = document.getElementById('ocrModeSelect').value;

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            const rawBytes = new Uint8Array(await file.arrayBuffer());
            if (ocrMode === 'none') {
                return await convertPdfToPurePngPdf(rawBytes.buffer);
            }
            return rawBytes;
        }

        if (file.name.toLowerCase().endsWith('.docx')) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToHtml({arrayBuffer: arrayBuffer});
            const htmlString = result.value || "<i>[Blank Document]</i>";
            const pdfBytes = await convertHtmlToSearchablePdfBytes(htmlString);
            if (ocrMode === 'none') {
                return await convertPdfToPurePngPdf(pdfBytes.buffer);
            }
            return pdfBytes;
        }

        if (file.type === 'text/html' || file.type === 'text/plain' || 
            file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.txt')) {
            let text = await file.text();
            if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
                text = `<p>${text.replace(/\n/g, '<br>')}</p>`;
            }
            const pdfBytes = await convertHtmlToSearchablePdfBytes(text);
            if (ocrMode === 'none') {
                return await convertPdfToPurePngPdf(pdfBytes.buffer);
            }
            return pdfBytes;
        }

        if (file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|webp|heic)$/i)) {
            return await formatImageForPdf(file);
        } 

        else {
            const pdfDoc = await PDFDocument.create();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const page = pdfDoc.addPage([595.28, 841.89]);
            const text = `File: ${file.name}\n\nThis format cannot be rendered natively in-browser.`;
            page.drawText(text, { x: 50, y: 780, size: 14, font, color: PDFLib.rgb(0.9, 0.2, 0.2) });
            return await pdfDoc.save();
        }
    }

    function renderFileList() {
        fileList.innerHTML = "";
        if (applicationFiles.length === 0) {
            fileList.appendChild(emptyState);
            return;
        }

        applicationFiles.forEach((fileObj, index) => {
            const li = document.createElement('li');
            li.className = "flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 group";

            const wasConverted = !fileObj.name.toLowerCase().endsWith('.pdf');
            const sizeInMB = (fileObj.originalFile.size / (1024 * 1024)).toFixed(2);

            let typeIcon = `<svg class="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>`;
            if (wasConverted) {
                 typeIcon = `<svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>`;
            }

            li.innerHTML = `
                <div class="flex items-center gap-4 overflow-hidden w-full">
                    <input type="checkbox" class="w-5 h-5 accent-blue rounded cursor-pointer flex-shrink-0" 
                           ${fileObj.selected ? 'checked' : ''} 
                           onchange="toggleSelection(${fileObj.id}, this.checked)">
                    <div class="flex-shrink-0 bg-white shadow-sm border border-slate-100 rounded-lg p-2">
                        ${typeIcon}
                    </div>
                    <div class="flex flex-col min-w-0 flex-grow">
                        <span class="font-bold text-slate-700 truncate" title="${fileObj.name}">${fileObj.name}</span>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-xs font-semibold px-2 py-0.5 ${wasConverted ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'} rounded uppercase tracking-wider">${wasConverted ? 'Needs Format' : 'Native PDF'}</span>
                            <span class="text-xs text-slate-500 font-medium">${sizeInMB} MB</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-3 ml-4 flex-shrink-0">
                    <span class="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full shadow-inner border border-slate-200">#${index + 1}</span>
                    <button onclick="removeFile(${fileObj.id})" class="text-slate-400 hover:text-rose-600 p-2 rounded-full hover:bg-rose-50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-200" aria-label="Remove File">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            `;
            fileList.appendChild(li);
        });
    }

    function toggleSelection(id, isChecked) {
        const file = applicationFiles.find(f => f.id === id);
        if (file) file.selected = isChecked;
    }

    function toggleSelectAll(selectAll) {
        applicationFiles.forEach(f => f.selected = selectAll);
        renderFileList();
    }

    function removeFile(id) {
        applicationFiles = applicationFiles.filter(f => f.id !== id);
        renderFileList();
    }

    function clearAllFiles() {
        if(applicationFiles.length === 0) return;
        showModal("Clear All Files", "Are you sure you want to remove all files from the workspace?", "confirm", () => {
            applicationFiles = [];
            renderFileList();
        });
    }

    async function getPdfBytesForFile(fileObj) {
        const currentOcrMode = document.getElementById('ocrModeSelect').value;
        const currentImageSize = document.getElementById('imageSizeSelect').value;

        // Use cached version ONLY if the dropdown settings haven't changed.
        if (fileObj.processedCache 
            && fileObj.processedCache.ocrMode === currentOcrMode 
            && fileObj.processedCache.imageSize === currentImageSize) {
            return fileObj.processedCache.pdfBytes;
        }

        const bytes = await convertFileToPdf(fileObj.originalFile);

        fileObj.processedCache = {
            pdfBytes: bytes,
            ocrMode: currentOcrMode,
            imageSize: currentImageSize
        };

        return bytes;
    }

    async function mergePdfBytes(processedFiles) {
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        for (const pFile of processedFiles) {
            try {
                const pdfToMerge = await PDFDocument.load(pFile.pdfBytes);
                const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            } catch (e) {
                console.error("Error merging document:", pFile.name, e);
            }
        }
        return await mergedPdf.save();
    }

    async function applyHighQualityImageCompression(pdfBytes) {
        setLoading(true, "Compressing PDF Document...", "Converting pages to high-res images to save space...");

        const loadingTask = pdfjsLib.getDocument({data: pdfBytes});
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;

        const { PDFDocument } = PDFLib;
        const newPdfDoc = await PDFDocument.create();

        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.5 }); 

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
            const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.85); 
            const jpgImage = await newPdfDoc.embedJpg(jpegDataUrl);

            const physicalWidth = viewport.width / 2.5;
            const physicalHeight = viewport.height / 2.5;
            const newPage = newPdfDoc.addPage([physicalWidth, physicalHeight]);

            newPage.drawImage(jpgImage, { x: 0, y: 0, width: physicalWidth, height: physicalHeight });
            setLoading(true, "Compressing PDF Document...", `Rasterized crisp image for page ${i} of ${numPages}`);
        }
        return await newPdfDoc.save();
    }

    function triggerDownload(bytes, filename) {
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    async function downloadSelectedMerged() {
        const selected = applicationFiles.filter(f => f.selected);
        if (selected.length === 0) return showModal("Notice", "Please select at least one file to merge.");
        const shouldCompress = compressToggle.checked;
        const outputFormat = document.getElementById('outputFormatSelect').value;

        try {
            const processedFiles = [];
            for (let i = 0; i < selected.length; i++) {
                setLoading(true, `Processing file ${i+1} of ${selected.length}...`, `Reading ${selected[i].name} with current settings.`);
                const bytes = await getPdfBytesForFile(selected[i]);
                processedFiles.push({ name: selected[i].name, pdfBytes: bytes });
            }

            setLoading(true, "Merging files...", "Combining selected files...");
            let finalBytes = await mergePdfBytes(processedFiles);

            if (shouldCompress) finalBytes = await applyHighQualityImageCompression(finalBytes);

            if (outputFormat === 'png') {
                await downloadPdfPagesAsPngs(finalBytes.buffer, `Merged_Pages_${Date.now()}`);
            } else {
                triggerDownload(finalBytes, `Merged_Document_${Date.now()}.pdf`);
            }

        } catch (error) {
            showModal("Error", "An error occurred during processing.");
            console.error(error);
        }
        setLoading(false);
    }

    async function downloadSelectedSeparately() {
        const selected = applicationFiles.filter(f => f.selected);
        if (selected.length === 0) return showModal("Notice", "Please select at least one file to download.");
        const outputFormat = document.getElementById('outputFormatSelect').value;

        const executeDownload = async () => {
            try {
                for (let i = 0; i < selected.length; i++) {
                    const fileObj = selected[i];
                    setLoading(true, `Processing file ${i+1} of ${selected.length}...`, `Reading ${fileObj.name} with current settings.`);

                    const newName = fileObj.name.substring(0, fileObj.name.lastIndexOf('.')) || fileObj.name;
                    let exportBytes = await getPdfBytesForFile(fileObj);

                    if (compressToggle.checked) {
                        exportBytes = await applyHighQualityImageCompression(exportBytes);
                    }

                    if (outputFormat === 'png') {
                        await downloadPdfPagesAsPngs(exportBytes.buffer, newName);
                    } else {
                        setLoading(true, "Preparing downloads...", "Downloading files sequentially...");
                        triggerDownload(exportBytes, `${newName}_Formatted.pdf`);
                    }
                    await delay(300);
                }
            } catch (error) {
                console.error(error);
                showModal("Error", "An error occurred downloading the files.");
            }
            setLoading(false);
        };

        if (selected.length > 5) {
            showModal("Bulk Download", `You are about to trigger ${selected.length} separate downloads. Do you want to continue?`, "confirm", executeDownload);
        } else {
            executeDownload();
        }
    }

(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function() {
  if (window.innerWidth <= 768) return;

  // Left Sidebar with Direct Links
  const leftSidebar = document.createElement('div');
  leftSidebar.className = 'ad-sidebar ad-sidebar-left';
  leftSidebar.innerHTML = `
    <button class="ad-sidebar-toggle" aria-label="Toggle Left Ad">Hide Ad</button>
    <div class="ad-sidebar-content">
      <iframe class="ad-sidebar-iframe" src="https://omg10.com/4/11638044" loading="lazy" scrolling="no"></iframe>
      <iframe class="ad-sidebar-iframe" src="https://omg10.com/4/11638043" loading="lazy" scrolling="no"></iframe>
      <iframe class="ad-sidebar-iframe" src="https://omg10.com/4/11638042" loading="lazy" scrolling="no"></iframe>
    </div>
  `;

  // Right Sidebar with Direct Links
  const rightSidebar = document.createElement('div');
  rightSidebar.className = 'ad-sidebar ad-sidebar-right';
  rightSidebar.innerHTML = `
    <button class="ad-sidebar-toggle" aria-label="Toggle Right Ad">Hide Ad</button>
    <div class="ad-sidebar-content">
      <iframe class="ad-sidebar-iframe" src="https://omg10.com/4/11638041" loading="lazy" scrolling="no"></iframe>
      <iframe class="ad-sidebar-iframe" src="https://omg10.com/4/11638040" loading="lazy" scrolling="no"></iframe>
    </div>
  `;

  document.body.appendChild(leftSidebar);
  document.body.appendChild(rightSidebar);

  function setupToggle(sidebar) {
    const btn = sidebar.querySelector('.ad-sidebar-toggle');
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const isCollapsed = sidebar.classList.toggle('collapsed');
      btn.textContent = isCollapsed ? 'Show Ad' : 'Hide Ad';
    });
  }

  setupToggle(leftSidebar);
  setupToggle(rightSidebar);
})();

(function(s){s.dataset.zone='11637854',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11637756',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11649331',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))

(function(s){s.dataset.zone='11649335',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))
