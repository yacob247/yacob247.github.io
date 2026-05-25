        // Initialize Icons
        lucide.createIcons();

        // Configure PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

        // UI Elements
        const fileInput = document.getElementById('fileInput');
        const fileLabel = document.getElementById('fileLabel');
        const fileSelectedInfo = document.getElementById('fileSelectedInfo');
        const fileNameDisplay = document.getElementById('fileNameDisplay');
        const convertBtn = document.getElementById('convertBtn');
        const progressArea = document.getElementById('progressArea');
        const progressBar = document.getElementById('progressBar');
        const statusText = document.getElementById('statusText');
        const percentageText = document.getElementById('percentageText');
        const logList = document.getElementById('logList');
        const logArea = document.getElementById('logArea');

        let currentFile = null;

        // File selection handling
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type === 'application/pdf') {
                currentFile = file;
                fileNameDisplay.textContent = file.name;
                fileSelectedInfo.classList.remove('hidden');
                fileLabel.textContent = "Change PDF file";
                convertBtn.disabled = false;
            } else {
                alert("Please select a valid PDF file.");
                resetFile();
            }
        });

        function resetFile() {
            currentFile = null;
            fileInput.value = '';
            fileSelectedInfo.classList.add('hidden');
            fileLabel.textContent = "Drag & drop your PDF here";
            convertBtn.disabled = true;
        }

        // Logging utility
        function log(message) {
            const li = document.createElement('li');
            li.textContent = `> ${message}`;
            logList.appendChild(li);
            logArea.scrollTop = logArea.scrollHeight;
        }

        // Update progress UI
        function setProgress(percent, status) {
            progressBar.style.width = `${percent}%`;
            percentageText.textContent = `${Math.round(percent)}%`;
            if (status) statusText.textContent = status;
        }

        // Escape HTML to prevent injection in Word doc
        function escapeHTML(str) {
            return str.replace(/[&<>'"]/g, 
                tag => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    "'": '&#39;',
                    '"': '&quot;'
                }[tag])
            );
        }

        // Main Conversion Process
        convertBtn.addEventListener('click', async () => {
            if (!currentFile) return;

            // UI Reset
            convertBtn.disabled = true;
            progressArea.classList.remove('hidden');
            logList.innerHTML = '';
            setProgress(0, "Reading PDF file...");
            log("Started conversion process...");

            try {
                const arrayBuffer = await currentFile.arrayBuffer();
                log("PDF loaded into memory.");
                
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const totalPages = pdf.numPages;
                log(`PDF parsed successfully. Total pages: ${totalPages}`);

                let wordHtmlContent = "";
                let worker = null;

                // Process pages
                for (let i = 1; i <= totalPages; i++) {
                    const pageBaseProgress = ((i - 1) / totalPages) * 100;
                    setProgress(pageBaseProgress, `Processing page ${i} of ${totalPages}...`);
                    log(`--- Extracting page ${i} ---`);

                    const page = await pdf.getPage(i);
                    
                    // Attempt FAST native text extraction first
                    log(`Attempting native text extraction...`);
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

                    // SMART FALLBACK: If native text is very short (likely an image or scanned page), use OCR
                    if (nativeText.trim().length < 50) {
                        log(`Page ${i} appears to be an image or scan. Falling back to Deep OCR...`);
                        
                        if (!worker) {
                            setProgress(pageBaseProgress, "Loading OCR Engine (First time setup)...");
                            log("Downloading Tesseract.js language models (English)...");
                            worker = await Tesseract.createWorker('eng');
                            log("OCR Engine ready.");
                        }

                        const scale = 2.0; 
                        const viewport = page.getViewport({ scale: scale });
                        
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;

                        log(`Rendering page ${i} to image for OCR...`);
                        await page.render({ canvasContext: context, viewport: viewport }).promise;

                        log(`Scanning image for text... (This may take a moment)`);
                        const { data } = await worker.recognize(canvas);
                        pageText = data.text;
                    } else {
                        log(`Native extraction found ${nativeText.length} characters.`);
                    }

                    if (!pageText || pageText.trim() === "") {
                        log(`Warning: No text found on page ${i}.`);
                    } else {
                        log(`Successfully processed page ${i}.`);
                    }

                    // Format text into paragraphs for Word
                    const formattedText = pageText.split('\n')
                        .map(line => line.trim())
                        .filter(line => line.length > 0)
                        .map(line => `<p style="margin-bottom: 10px; font-family: 'Calibri', sans-serif;">${escapeHTML(line)}</p>`)
                        .join('');

                    // Wrap page content and add a page break if it's not the last page
                    wordHtmlContent += `<div class="page-content">${formattedText || '<p><i>[Blank Page]</i></p>'}</div>`;
                    
                    if (i < totalPages) {
                        wordHtmlContent += `<br style="page-break-before: always; clear: both;" />`;
                    }
                }

                if (worker) {
                    await worker.terminate();
                    log("OCR Engine terminated.");
                }

                setProgress(95, "Generating Word Document...");
                log("Compiling document format...");
                
                // Export to Word
                exportHTMLToWord(wordHtmlContent, currentFile.name.replace('.pdf', '') + '_converted');
                
                setProgress(100, "Conversion Complete!");
                log("Success! File is ready for download.");
                
                // Add a visual success state
                convertBtn.textContent = "Convert Another File";
                convertBtn.classList.replace('bg-blue-600', 'bg-emerald-600');
                convertBtn.classList.replace('hover:bg-blue-700', 'hover:bg-emerald-700');
                convertBtn.disabled = false;
                
                // Reset button state on next file selection
                fileInput.addEventListener('change', () => {
                    convertBtn.textContent = "Convert to Word Document";
                    convertBtn.classList.replace('bg-emerald-600', 'bg-blue-600');
                    convertBtn.classList.replace('hover:bg-emerald-700', 'hover:bg-blue-700');
                }, { once: true });

            } catch (error) {
                console.error(error);
                log(`ERROR: ${error.message}`);
                setProgress(0, "Error occurred during conversion.");
                progressBar.classList.replace('bg-blue-600', 'bg-red-500');
                convertBtn.disabled = false;
            }
        });

        // Function to create a valid Word document from HTML
        function exportHTMLToWord(htmlContent, filename) {
            const header = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' 
                      xmlns:w='urn:schemas-microsoft-com:office:word' 
                      xmlns='http://www.w3.org/TR/REC-html40'>
                <head>
                    <meta charset='utf-8'>
                    <title>Export HTML to Word</title>
                    <style>
                        body { font-family: 'Calibri', Arial, sans-serif; font-size: 11pt; }
                        p { margin: 0 0 10pt 0; line-height: 1.15; }
                    </style>
                </head>
                <body>
            `;
            const footer = "</body></html>";
            const sourceHTML = header + htmlContent + footer;

            // Create a Blob with Word's MIME type
            const blob = new Blob(['\ufeff', sourceHTML], {
                type: 'application/msword'
            });

            // Trigger Download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename + '.doc';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
