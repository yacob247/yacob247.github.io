tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
                        mono: ['"JetBrains Mono"', 'monospace'],
                    }
                }
            }
        }

document.addEventListener('DOMContentLoaded', () => {
            const dropzone = document.getElementById('dropzone');
            const fileInput = document.getElementById('fileInput');
            const uploadPrompt = document.getElementById('uploadPrompt');
            const imagePreviewContainer = document.getElementById('imagePreviewContainer');
            const imagePreview = document.getElementById('imagePreview');
            const textOverlay = document.getElementById('textOverlay');

            const statusContainer = document.getElementById('statusContainer');
            const statusText = document.getElementById('statusText');
            const statusPercentage = document.getElementById('statusPercentage');
            const progressBar = document.getElementById('progressBar');

            const outputText = document.getElementById('outputText');
            const copyBtn = document.getElementById('copyBtn');
            const clearBtn = document.getElementById('clearBtn');
            const copyToast = document.getElementById('copyToast');
            const selectAllOverlayBtn = document.getElementById('selectAllOverlayBtn');
            const workspaceControls = document.getElementById('workspaceControls');
            const opacitySlider = document.getElementById('opacitySlider');
            const opacityVal = document.getElementById('opacityVal');

            const langSelect = document.getElementById('langSelect');
            const accuracyBoost = document.getElementById('accuracyBoost');
            const procCanvas = document.getElementById('procCanvas');

            const expandImgBtn = document.getElementById('expandImgBtn');

            // Theater elements
            const theaterModal = document.getElementById('theaterModal');
            const closeTheaterBtn = document.getElementById('closeTheaterBtn');
            const theaterPreview = document.getElementById('theaterPreview');
            const theaterTextOverlay = document.getElementById('theaterTextOverlay');
            const theaterOpacitySlider = document.getElementById('theaterOpacitySlider');
            const theaterOpacityVal = document.getElementById('theaterOpacityVal');
            const theaterSelectAllBtn = document.getElementById('theaterSelectAllBtn');

            // Stats
            const statWords = document.getElementById('statWords');
            const statConfidence = document.getElementById('statConfidence');
            const statLines = document.getElementById('statLines');

            let isProcessing = false;
            let ocrData = null; 
            let lastOcrScale = 1; // Scaling multiplier tracking
            let isExpanded = false;

            // --- About Modal Logic ---
            const aboutBtn = document.getElementById('aboutBtn');
            const closeAboutBtn = document.getElementById('closeAboutBtn');
            const aboutModalWrapper = document.getElementById('aboutModalWrapper');
            const aboutModalContent = document.getElementById('aboutModalContent');

            function toggleAboutModal(show) {
                if (show) {
                    aboutModalWrapper.classList.remove('opacity-0', 'pointer-events-none');
                    aboutModalContent.classList.remove('scale-95');
                } else {
                    aboutModalWrapper.classList.add('opacity-0', 'pointer-events-none');
                    aboutModalContent.classList.add('scale-95');
                }
            }
            aboutBtn.addEventListener('click', () => toggleAboutModal(true));
            closeAboutBtn.addEventListener('click', () => toggleAboutModal(false));
            aboutModalWrapper.addEventListener('click', (e) => {
                if (e.target === aboutModalWrapper) toggleAboutModal(false);
            });

            // Auto-trigger the System Overview modal on load
            setTimeout(() => {
                toggleAboutModal(true);
            }, 600);

            // --- Theater Expanded Pop-out View Logic ---
            function toggleTheaterMode(show) {
                isExpanded = show;
                if(show) {
                    theaterPreview.src = imagePreview.src;
                    theaterOpacitySlider.value = opacitySlider.value;
                    theaterOpacityVal.textContent = opacityVal.textContent;

                    theaterModal.classList.remove('opacity-0', 'pointer-events-none');
                    document.body.style.overflow = 'hidden';
                    setTimeout(renderTheaterTextOverlay, 150);
                } else {
                    theaterModal.classList.add('opacity-0', 'pointer-events-none');
                    document.body.style.overflow = '';
                    theaterTextOverlay.innerHTML = '';
                    theaterPreview.src = '';
                }
            }

            expandImgBtn.addEventListener('click', () => toggleTheaterMode(true));
            closeTheaterBtn.addEventListener('click', () => toggleTheaterMode(false));

            // Sync Opacity inside the theater mode
            theaterOpacitySlider.addEventListener('input', (e) => {
                const val = e.target.value;
                theaterOpacityVal.textContent = `${val}%`;

                // Keep the standard opacity slider in sync
                opacitySlider.value = val;
                opacityVal.textContent = `${val}%`;

                updateOpacityForContainer(theaterTextOverlay, val);
                updateOpacityForContainer(textOverlay, val);
            });

            // Sync Opacity inside standard workspace
            opacitySlider.addEventListener('input', (e) => {
                const val = e.target.value;
                opacityVal.textContent = `${val}%`;

                theaterOpacitySlider.value = val;
                theaterOpacityVal.textContent = `${val}%`;

                updateOpacityForContainer(textOverlay, val);
                updateOpacityForContainer(theaterTextOverlay, val);
            });

            function updateOpacityForContainer(container, val) {
                if (val > 0) {
                    container.classList.add('show-overlay-text');
                    const spans = container.querySelectorAll('.selectable-text');
                    spans.forEach(span => {
                        span.style.color = `rgba(248, 250, 252, ${val / 100})`;
                        span.style.backgroundColor = `rgba(15, 23, 42, ${(val / 100) * 0.95})`;
                    });
                } else {
                    container.classList.remove('show-overlay-text');
                    const spans = container.querySelectorAll('.selectable-text');
                    spans.forEach(span => {
                        span.style.color = 'rgba(0, 0, 0, 0)';
                        span.style.backgroundColor = 'transparent';
                    });
                }
            }

            // Select all for theater mode
            theaterSelectAllBtn.addEventListener('click', () => {
                const range = document.createRange();
                range.selectNodeContents(theaterTextOverlay);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            });

            // Recalculate dynamic overlays when the window bounds resize
            const resizeObserver = new ResizeObserver(() => {
                if (ocrData && imagePreview.src) {
                    renderTextOverlay();
                    if(isExpanded) renderTheaterTextOverlay();
                }
            });
            resizeObserver.observe(document.getElementById('imageWrapper'));

            // --- 1. Clipboard Paste Event Handler ---
            document.addEventListener('paste', (e) => {
                if (isProcessing) return;
                const items = e.clipboardData.items;
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        e.preventDefault();
                        const file = items[i].getAsFile();
                        handleFile(file);
                        break;
                    }
                }
            });

            // --- 2. Drag & Drop Event Handling ---
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, preventDefaults, false);
            });
            function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
            ['dragenter', 'dragover'].forEach(eventName => {
                dropzone.addEventListener(eventName, () => {
                    if (!isProcessing) dropzone.classList.add('dropzone-active');
                }, false);
            });
            ['dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, () => { dropzone.classList.remove('dropzone-active'); }, false);
            });
            dropzone.addEventListener('drop', (e) => {
                if (isProcessing) return;
                const files = e.dataTransfer.files;
                if (files.length > 0 && files[0].type.startsWith('image/')) { handleFile(files[0]); }
            });

            // --- 3. Click-to-Upload Trigger ---
            fileInput.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    handleFile(this.files[0]);
                    this.value = ''; 
                }
            });

            function handleFile(file) {
                if (!file.type.startsWith('image/')) {
                    alert('Please load a valid image asset (PNG, JPG, WEBP, or BMP).');
                    return;
                }

                ocrData = null;
                textOverlay.innerHTML = '';
                theaterTextOverlay.innerHTML = '';
                workspaceControls.classList.add('hidden');

                if(isExpanded) toggleTheaterMode(false);

                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.src = e.target.result;
                    uploadPrompt.classList.add('hidden');
                    imagePreviewContainer.classList.remove('hidden');
                    dropzone.classList.add('has-image');

                    processAndOCR(file);
                };
                reader.readAsDataURL(file);
            }

            // High Accuracy Processing Pipeline (With 2x Upscaling)
            function processAndOCR(file) {
                const tempImg = new Image();
                tempImg.onload = () => {
                    let sourceToOCR = tempImg;
                    lastOcrScale = 1;

                    if (accuracyBoost.checked) {
                        lastOcrScale = 2; // Auto-Upscale by 200%

                        const ctx = procCanvas.getContext('2d', { willReadFrequently: true });
                        procCanvas.width = tempImg.naturalWidth * lastOcrScale;
                        procCanvas.height = tempImg.naturalHeight * lastOcrScale;

                        // Enforce premium bilinear upscaling filters
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(tempImg, 0, 0, procCanvas.width, procCanvas.height);

                        const imgData = ctx.getImageData(0, 0, procCanvas.width, procCanvas.height);
                        const data = imgData.data;

                        // Grayscale and High-Contrast enhancements
                        for (let i = 0; i < data.length; i += 4) {
                            const r = data[i], g = data[i+1], b = data[i+2];
                            let gray = 0.299 * r + 0.587 * g + 0.114 * b;

                            if (gray > 128) { gray = Math.min(255, gray * 1.12); } 
                            else { gray = Math.max(0, gray * 0.88); }

                            data[i] = gray; data[i+1] = gray; data[i+2] = gray;
                        }
                        ctx.putImageData(imgData, 0, 0);
                        sourceToOCR = procCanvas.toDataURL('image/jpeg', 0.95);
                    }

                    performOCR(sourceToOCR);
                };
                tempImg.src = URL.createObjectURL(file);
            }

            // Render coordinates overlay for Standard View
            function renderTextOverlay() {
                renderOverlayForContainer(imagePreview, textOverlay);
            }

            // Render coordinates overlay for Theater Mode view
            function renderTheaterTextOverlay() {
                renderOverlayForContainer(theaterPreview, theaterTextOverlay);
            }

            function renderOverlayForContainer(imgElement, overlayContainer) {
                if (!ocrData || !imgElement.src) return;

                overlayContainer.innerHTML = ''; 

                const rect = imgElement.getBoundingClientRect();
                const naturalW = imgElement.naturalWidth;
                const naturalH = imgElement.naturalHeight;

                if (!naturalW || !naturalH) return; 

                // Account for 2x scaling when mapping coordinates
                const scaleX = rect.width / (naturalW * lastOcrScale);
                const scaleY = rect.height / (naturalH * lastOcrScale);

                const processedLines = [];

                ocrData.lines.forEach(line => {
                    if (line.confidence < 20 || !line.text.trim()) return;
                    processedLines.push(line.text.trim());

                    const bbox = line.bbox;
                    const left = bbox.x0 * scaleX;
                    const top = bbox.y0 * scaleY;
                    const width = (bbox.x1 - bbox.x0) * scaleX;
                    const height = (bbox.y1 - bbox.y0) * scaleY;

                    const lineEl = document.createElement('div');
                    lineEl.className = 'ocr-line-container';
                    lineEl.style.position = 'absolute';
                    lineEl.style.left = `${left}px`;
                    lineEl.style.top = `${top}px`;
                    lineEl.style.width = `${width}px`;
                    lineEl.style.height = `${height}px`;
                    lineEl.style.overflow = 'hidden';

                    const textSpan = document.createElement('span');
                    textSpan.className = 'selectable-text';
                    textSpan.textContent = line.text; 

                    textSpan.style.position = 'absolute';
                    textSpan.style.left = '0';
                    textSpan.style.top = '50%';
                    textSpan.style.transform = 'translateY(-50%)';
                    textSpan.style.whiteSpace = 'nowrap';
                    textSpan.style.fontSize = `${height * 0.75}px`;
                    textSpan.style.fontFamily = 'monospace, sans-serif'; 
                    textSpan.style.transformOrigin = 'left center';

                    const op = parseInt(opacitySlider.value);
                    if (op > 0) {
                        textSpan.style.color = `rgba(248, 250, 252, ${op / 100})`;
                        textSpan.style.backgroundColor = `rgba(15, 23, 42, ${(op / 100) * 0.95})`;
                    }

                    lineEl.appendChild(textSpan);
                    overlayContainer.appendChild(lineEl);

                    const naturalSpanWidth = textSpan.getBoundingClientRect().width;
                    if (naturalSpanWidth > 0 && width > 0) {
                        const stretchFactor = width / naturalSpanWidth;
                        textSpan.style.transform = `translateY(-50%) scaleX(${stretchFactor})`;
                    }
                });

                if (opacitySlider.value > 0) { overlayContainer.classList.add('show-overlay-text'); }

                // Sync Output Pane Text only on first render/load
                if(processedLines.length > 0 && !outputText.value && overlayContainer === textOverlay) {
                    outputText.value = processedLines.join('\n');
                }
            }

            async function performOCR(source) {
                isProcessing = true;
                fileInput.disabled = true;

                outputText.value = '';
                copyBtn.disabled = true;
                clearBtn.disabled = true;
                statusContainer.classList.remove('hidden');
                progressBar.style.width = '0%';
                statusPercentage.textContent = '0%';
                statusText.innerHTML = '<i class="ph ph-spinner-gap animate-spin text-lg"></i> Booting engine core...';

                statWords.textContent = '...';
                statConfidence.textContent = '...';
                statLines.textContent = '...';

                try {
                    const selectedLang = langSelect.value;
                    const result = await Tesseract.recognize(
                        source,
                        selectedLang,
                        {
                            logger: m => {
                                if (m.status === 'recognizing text') {
                                    const progress = Math.round(m.progress * 100);
                                    progressBar.style.width = `${progress}%`;
                                    statusPercentage.textContent = `${progress}%`;
                                    statusText.innerHTML = '<i class="ph ph-eye text-lg"></i> Rasterizing text arrays...';
                                } else {
                                    statusText.innerHTML = `<i class="ph ph-cpu animate-pulse text-lg"></i> ${m.status}...`;
                                }
                            }
                        }
                    );

                    ocrData = result.data;
                    renderTextOverlay();

                    const parsedText = outputText.value.trim();
                    if (parsedText && parsedText !== "No text could be processed in this image.") {
                        copyBtn.disabled = false;
                        clearBtn.disabled = false;
                        workspaceControls.classList.remove('hidden');
                        statusText.innerHTML = '<i class="ph-fill ph-check-circle text-green-400 text-lg"></i> System mapping synchronized!';
                        progressBar.classList.replace('bg-blue-600', 'bg-green-500');

                        statWords.textContent = ocrData.words.length;
                        statConfidence.textContent = `${Math.round(ocrData.confidence)}%`;
                        statLines.textContent = ocrData.lines.filter(l => l.confidence >= 20 && l.text.trim()).length;
                    } else {
                        outputText.value = "No text could be processed in this image.";
                        clearBtn.disabled = false;
                        statusText.innerHTML = '<i class="ph-fill ph-warning-circle text-yellow-400 text-lg"></i> OCR scanning complete. No text detected.';
                        statWords.textContent = '0';
                        statConfidence.textContent = '0%';
                        statLines.textContent = '0';
                    }

                } catch (error) {
                    console.error(error);
                    outputText.value = "OCR process failed. Please try again with a cleaner image.";
                    statusText.innerHTML = '<i class="ph-fill ph-x-circle text-rose-500 text-lg"></i> Pipeline execution failure.';
                } finally {
                    isProcessing = false;
                    fileInput.disabled = false;
                    setTimeout(() => {
                        statusContainer.classList.add('hidden');
                        progressBar.classList.replace('bg-green-500', 'bg-blue-600');
                    }, 4000);
                }
            }

            // Copy Handler
            copyBtn.addEventListener('click', () => {
                if (!outputText.value) return;
                navigator.clipboard.writeText(outputText.value).then(() => {
                    copyToast.classList.remove('opacity-0', 'translate-y-2');
                    setTimeout(() => copyToast.classList.add('opacity-0', 'translate-y-2'), 2500);
                }).catch(() => {
                    outputText.select();
                    document.execCommand('copy');
                    copyToast.classList.remove('opacity-0', 'translate-y-2');
                    setTimeout(() => copyToast.classList.add('opacity-0', 'translate-y-2'), 2500);
                });
            });

            // Reset UI States Handler
            clearBtn.addEventListener('click', () => {
                if(isExpanded) toggleTheaterMode(false);
                outputText.value = '';
                uploadPrompt.classList.remove('hidden');
                imagePreviewContainer.classList.add('hidden');
                dropzone.classList.remove('has-image');
                workspaceControls.classList.add('hidden');
                imagePreview.src = '';
                textOverlay.innerHTML = '';
                ocrData = null;
                copyBtn.disabled = true;
                clearBtn.disabled = true;
                statWords.textContent = '-';
                statConfidence.textContent = '-';
                statLines.textContent = '-';
                opacitySlider.value = 0;
                opacityVal.textContent = "0%";
            });
        });

(function() {
    const upBtn = document.getElementById('envizion-scroll-up-btn');
    const folderBtn = document.getElementById('envizion-folder-nav-btn');

    function checkScrollPosition() {
        // Calculate document coordinates and viewport dimensions
        const windowHeight = window.innerHeight;
        const scrollY = window.scrollY || window.pageYOffset;
        const documentHeight = document.documentElement.scrollHeight;

        // Triggers visibility when user is within 40px of the absolute page bottom
        if ((windowHeight + scrollY) >= (documentHeight - 40)) {
            upBtn.classList.add('visible-at-bottom');
            folderBtn.classList.add('visible-at-bottom');
        } else {
            upBtn.classList.remove('visible-at-bottom');
            folderBtn.classList.remove('visible-at-bottom');
        }
    }

    window.addEventListener('scroll', checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);
    // Initial run to verify height state on short pages
    document.addEventListener('DOMContentLoaded', checkScrollPosition);
    checkScrollPosition();
})();

(function() {
  var INDEX = null, LOADING = false;

  function loadIndex(cb) {
    if (INDEX) { cb(); return; }
    if (LOADING) { setTimeout(function() { loadIndex(cb); }, 100); return; }
    LOADING = true;
    fetch('/search-index.json')
      .then(function(r) { return r.json(); })
      .then(function(d) { INDEX = d; LOADING = false; cb(); })
      .catch(function() {
        INDEX = [];
        LOADING = false;
        var s = document.getElementById('ez-search-status');
        if (s) s.textContent = 'Search index not found.';
      });
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function highlight(text, query) {
    if (!text) return '';
    var words = query.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    var CONTEXT = 60, found = [];
    words.forEach(function(w) {
      var wl = w.toLowerCase(), tl = text.toLowerCase(), i = 0;
      while ((i = tl.indexOf(wl, i)) !== -1) {
        found.push({ start: i, end: i + wl.length });
        i += wl.length;
      }
    });
    if (!found.length) return '';
    found.sort(function(a, b) { return a.start - b.start; });
    var wins = [];
    found.forEach(function(f) {
      var ws = Math.max(0, f.start - CONTEXT), we = Math.min(text.length, f.end + CONTEXT);
      if (wins.length && ws <= wins[wins.length-1].end) {
        wins[wins.length-1].end = Math.max(wins[wins.length-1].end, we);
        wins[wins.length-1].matches.push(f);
      } else {
        wins.push({ start: ws, end: we, matches: [f] });
      }
    });
    var parts = [];
    wins.slice(0, 3).forEach(function(win) {
      var slice = text.slice(win.start, win.end), off = win.start, h = '', cur = 0;
      win.matches.forEach(function(f) {
        var ls = f.start - off, le = f.end - off;
        if (ls < 0 || le > slice.length) return;
        h += escHtml(slice.slice(cur, ls));
        h += '<mark style="background:#4f8ef7;color:#fff;border-radius:2px;padding:0 2px;">' + escHtml(slice.slice(ls, le)) + '</mark>';
        cur = le;
      });
      h += escHtml(slice.slice(cur));
      parts.push((win.start > 0 ? '...' : '') + h + (win.end < text.length ? '...' : ''));
    });
    return parts.join(' | ');
  }

  function score(page, words) {
    var s = 0;
    var tl = (page.title || '').toLowerCase();
    var hl = (page.headings || []).join(' ').toLowerCase();
    var bl = (page.body || '').toLowerCase();
    var dl = (page.desc || '').toLowerCase();
    words.forEach(function(w) {
      var wl = w.toLowerCase();
      if (tl.indexOf(wl) > -1) s += 10;
      if (dl.indexOf(wl) > -1) s += 5;
      if (hl.indexOf(wl) > -1) s += 4;
      if (bl.indexOf(wl) > -1) s += 1;
    });
    return s;
  }

  window.ezSearch = function(q) {
    var status = document.getElementById('ez-search-status');
    var results = document.getElementById('ez-search-results');
    if (!q.trim()) { status.textContent = 'Type to search...'; results.innerHTML = ''; return; }
    status.textContent = 'Searching...';
    results.innerHTML = '';
    loadIndex(function() {
      var words = q.trim().split(/\s+/).filter(Boolean);
      var hits = INDEX.map(function(p) { return { page: p, s: score(p, words) }; })
        .filter(function(x) { return x.s > 0; })
        .sort(function(a, b) { return b.s - a.s; })
        .slice(0, 12);
      if (!hits.length) { status.textContent = 'No results for "' + escHtml(q) + '"'; return; }
      status.textContent = hits.length + ' result' + (hits.length === 1 ? '' : 's') + ' for "' + q + '"';
      results.innerHTML = hits.map(function(h) {
        var p = h.page, snippet = highlight(p.body, q) || highlight(p.desc, q) || '';
        return '<a href="' + p.url + '" style="display:block;padding:12px 14px;border-radius:8px;background:#1c1c30;border:1px solid #2a2a4a;text-decoration:none;color:inherit;">'
          + '<div style="font-weight:600;color:#7eb3ff;font-size:14px;margin-bottom:4px;">' + escHtml(p.title) + '</div>'
          + (snippet ? '<div style="font-size:12px;color:#aaa;line-height:1.6;">' + snippet + '</div>' : '')
          + '<div style="font-size:11px;color:#444;margin-top:4px;">' + p.url + '</div>'
          + '</a>';
      }).join('');
    });
  };

  window.ezOpen = function() {
    var ov = document.getElementById('ez-search-overlay');
    ov.style.display = 'flex';
    document.body.style.overflow = 'visible';
    loadIndex(function() {});
    setTimeout(function() { document.getElementById('ez-search-input').focus(); }, 60);
  };

  window.ezClose = function() {
    document.getElementById('ez-search-overlay').style.display = 'none';
    document.body.style.overflow = '';
  };

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') ezClose();
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); ezOpen(); }
  });

  document.getElementById('ez-search-overlay').addEventListener('click', function(e) {
    if (e.target === this) ezClose();
  });
}());

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
