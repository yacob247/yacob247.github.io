tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        brand: {
                            500: '#10b981', // Emerald
                            600: '#059669',
                            900: '#064e3b',
                        },
                        dark: {
                            800: '#1e293b',
                            900: '#0f172a',
                        }
                    }
                }
            }
        }

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

/**
         * STEGANOVAULT CORE LOGIC
         * Handles UI state, cryptography, and LSB image encoding/decoding.
         */

        // UI Elements
        const tabEncode = document.getElementById('tab-encode');
        const tabDecode = document.getElementById('tab-decode');
        const tabAnalyze = document.getElementById('tab-analyze');
        const viewEncode = document.getElementById('view-encode');
        const viewDecode = document.getElementById('view-decode');
        const viewAnalyze = document.getElementById('view-analyze');

        const encodeFile = document.getElementById('encode-file');
        const encodeDropzone = document.getElementById('encode-dropzone');
        const encodePreviewContainer = document.getElementById('encode-preview-container');
        const encodePlaceholder = document.getElementById('encode-placeholder');
        const encodePreview = document.getElementById('encode-preview');
        const encodeFilename = document.getElementById('encode-filename');
        const btnRemoveEncode = document.getElementById('btn-remove-encode');
        const encodeText = document.getElementById('encode-text');
        const encodePassword = document.getElementById('encode-password');
        const btnEncode = document.getElementById('btn-encode');
        const capacityContainer = document.getElementById('capacity-container');
        const capacityText = document.getElementById('capacity-text');
        const capacityBar = document.getElementById('capacity-bar');

        const decodeFile = document.getElementById('decode-file');
        const decodeDropzone = document.getElementById('decode-dropzone');
        const decodePreviewContainer = document.getElementById('decode-preview-container');
        const decodePlaceholder = document.getElementById('decode-placeholder');
        const decodePreview = document.getElementById('decode-preview');
        const decodeFilename = document.getElementById('decode-filename');
        const btnRemoveDecode = document.getElementById('btn-remove-decode');
        const decodePassword = document.getElementById('decode-password');
        const btnDecode = document.getElementById('btn-decode');
        const decodeResultContainer = document.getElementById('decode-result-container');
        const decodeText = document.getElementById('decode-text');
        const btnCopy = document.getElementById('btn-copy');

        const analyzeFile = document.getElementById('analyze-file');
        const analyzeDropzone = document.getElementById('analyze-dropzone');
        const analyzePreviewContainer = document.getElementById('analyze-preview-container');
        const analyzePlaceholder = document.getElementById('analyze-placeholder');
        const analyzePreview = document.getElementById('analyze-preview');
        const analyzeFilename = document.getElementById('analyze-filename');
        const btnRemoveAnalyze = document.getElementById('btn-remove-analyze');
        const btnAnalyze = document.getElementById('btn-analyze');

        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // State
        let currentImage = {
            element: new Image(),
            loaded: false,
            width: 0,
            height: 0,
            maxBytes: 0,
            type: 'encode' // 'encode' or 'decode'
        };

        // --- UI Handlers ---

        // switchTab is fully defined below after the forensic tab elements exist
        let switchTab = function(mode) { /* placeholder, replaced below */ };

        const tabForensic = document.getElementById('tab-forensic');
        const viewForensic = document.getElementById('view-forensic');

        // Patch switchTab to handle 4th tab
        const _origSwitchTab = switchTab;
        switchTab = function(mode) {
            [tabEncode, tabDecode, tabAnalyze, tabForensic].forEach(tab => {
                tab.classList.replace('text-brand-500', 'text-slate-400');
                tab.classList.replace('text-purple-400', 'text-slate-400');
                tab.classList.remove('border-b-2', 'border-brand-500', 'border-purple-500', 'bg-dark-900', 'font-semibold');
                tab.classList.add('font-medium');
            });
            [viewEncode, viewDecode, viewAnalyze, viewForensic].forEach(v => v.classList.add('hidden'));

            if (mode === 'encode') {
                tabEncode.classList.replace('text-slate-400', 'text-brand-500');
                tabEncode.classList.add('border-b-2', 'border-brand-500', 'bg-dark-900', 'font-semibold');
                tabEncode.classList.remove('font-medium');
                viewEncode.classList.remove('hidden');
            } else if (mode === 'decode') {
                tabDecode.classList.replace('text-slate-400', 'text-brand-500');
                tabDecode.classList.add('border-b-2', 'border-brand-500', 'bg-dark-900', 'font-semibold');
                tabDecode.classList.remove('font-medium');
                viewDecode.classList.remove('hidden');
            } else if (mode === 'analyze') {
                tabAnalyze.classList.replace('text-slate-400', 'text-brand-500');
                tabAnalyze.classList.add('border-b-2', 'border-brand-500', 'bg-dark-900', 'font-semibold');
                tabAnalyze.classList.remove('font-medium');
                viewAnalyze.classList.remove('hidden');
            } else if (mode === 'forensic') {
                tabForensic.classList.replace('text-slate-400', 'text-purple-400');
                tabForensic.classList.add('border-b-2', 'border-purple-500', 'bg-dark-900', 'font-semibold');
                tabForensic.classList.remove('font-medium');
                viewForensic.classList.remove('hidden');
            }
        };

        tabEncode.addEventListener('click', () => switchTab('encode'));
        tabDecode.addEventListener('click', () => switchTab('decode'));
        tabAnalyze.addEventListener('click', () => switchTab('analyze'));
        tabForensic.addEventListener('click', () => switchTab('forensic'));

        function showToast(message, type = 'info') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;

            let icon = '';
            if (type === 'error') icon = '<svg class="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
            else if (type === 'success') icon = '<svg class="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';

            toast.innerHTML = `${icon} <span class="text-sm font-medium">${message}</span>`;
            container.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = 'fadeOut 0.3s ease-in forwards';
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        }

        // --- File Handling ---

        function setupDropzone(dropzone, input, previewContainer, placeholder, previewImg, filenameEl, mode) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            ['dragenter', 'dragover'].forEach(eventName => {
                dropzone.addEventListener(eventName, () => dropzone.classList.add('dropzone-active'), false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, () => dropzone.classList.remove('dropzone-active'), false);
            });

            dropzone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const files = dt.files;
                handleFiles(files, mode);
            });

            input.addEventListener('change', function() {
                handleFiles(this.files, mode);
            });
        }

        function handleFiles(files, mode) {
            if (!files || files.length === 0) return;
            const file = files[0];

            if (!file.type.startsWith('image/')) {
                showToast("Please upload a valid image file.", "error");
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                loadImage(e.target.result, file.name, mode);
            };
            reader.readAsDataURL(file);
        }

        function loadImage(dataUrl, filename, mode) {
            currentImage.element.onload = () => {
                currentImage.loaded = true;
                currentImage.width = currentImage.element.width;
                currentImage.height = currentImage.element.height;
                currentImage.type = mode;

                // 1 pixel = 3 channels (RGB) = 3 bits. 
                // Total Bits = W * H * 3
                // Total Bytes = floor(Total Bits / 8)
                currentImage.maxBytes = Math.floor((currentImage.width * currentImage.height * 3) / 8);

                if (mode === 'encode') {
                    encodePreview.src = dataUrl;
                    encodeFilename.textContent = filename;
                    encodePlaceholder.classList.add('hidden');
                    encodePreviewContainer.classList.remove('hidden');
                    encodePreviewContainer.classList.add('flex');
                    capacityContainer.classList.remove('hidden');
                    updateCapacity();
                } else if (mode === 'decode') {
                    decodePreview.src = dataUrl;
                    decodeFilename.textContent = filename;
                    decodePlaceholder.classList.add('hidden');
                    decodePreviewContainer.classList.remove('hidden');
                    decodePreviewContainer.classList.add('flex');
                    decodeResultContainer.classList.add('hidden');
                } else if (mode === 'analyze') {
                    analyzePreview.src = dataUrl;
                    analyzeFilename.textContent = filename;
                    analyzePlaceholder.classList.add('hidden');
                    analyzePreviewContainer.classList.remove('hidden');
                    analyzePreviewContainer.classList.add('flex');
                }
            };
            currentImage.element.src = dataUrl;
        }

        function removeImage(mode) {
            currentImage.loaded = false;
            if (mode === 'encode') {
                encodeFile.value = '';
                encodePreview.src = '';
                encodePlaceholder.classList.remove('hidden');
                encodePreviewContainer.classList.add('hidden');
                encodePreviewContainer.classList.remove('flex');
                capacityContainer.classList.add('hidden');
                encodeText.value = '';
            } else if (mode === 'decode') {
                decodeFile.value = '';
                decodePreview.src = '';
                decodePlaceholder.classList.remove('hidden');
                decodePreviewContainer.classList.add('hidden');
                decodePreviewContainer.classList.remove('flex');
                decodeResultContainer.classList.add('hidden');
                decodeText.value = '';
            } else if (mode === 'analyze') {
                analyzeFile.value = '';
                analyzePreview.src = '';
                analyzePlaceholder.classList.remove('hidden');
                analyzePreviewContainer.classList.add('hidden');
                analyzePreviewContainer.classList.remove('flex');
            }
        }

        btnRemoveEncode.addEventListener('click', (e) => { e.stopPropagation(); removeImage('encode'); });
        btnRemoveDecode.addEventListener('click', (e) => { e.stopPropagation(); removeImage('decode'); });
        btnRemoveAnalyze.addEventListener('click', (e) => { e.stopPropagation(); removeImage('analyze'); });

        setupDropzone(encodeDropzone, encodeFile, encodePreviewContainer, encodePlaceholder, encodePreview, encodeFilename, 'encode');
        setupDropzone(decodeDropzone, decodeFile, decodePreviewContainer, decodePlaceholder, decodePreview, decodeFilename, 'decode');
        setupDropzone(analyzeDropzone, analyzeFile, analyzePreviewContainer, analyzePlaceholder, analyzePreview, analyzeFilename, 'analyze');

        encodeText.addEventListener('input', updateCapacity);
        encodePassword.addEventListener('input', updateCapacity);

        function updateCapacity() {
            if (!currentImage.loaded) return;

            // Calculate approximate payload size
            const textEncoder = new TextEncoder();
            const textBytes = textEncoder.encode(encodeText.value).length;

            // Overhead: 4 bytes (length) + 1 byte (flag) = 5 bytes min
            let overhead = 5;
            if (encodePassword.value.length > 0) {
                // If encrypted: + 16 bytes (salt) + 12 bytes (IV) + 16 bytes (Auth Tag)
                overhead += 16 + 12 + 16;
            }

            const totalBytes = textBytes + overhead;
            const percentage = Math.min(100, (totalBytes / currentImage.maxBytes) * 100);

            capacityText.textContent = `${totalBytes.toLocaleString()} / ${currentImage.maxBytes.toLocaleString()} Bytes`;
            capacityBar.style.width = `${percentage}%`;

            if (percentage > 100) {
                capacityBar.classList.replace('bg-brand-500', 'bg-red-500');
                capacityText.classList.add('text-red-400');
                btnEncode.disabled = true;
            } else {
                capacityBar.classList.replace('bg-red-500', 'bg-brand-500');
                capacityText.classList.remove('text-red-400');
                btnEncode.disabled = false;
            }
        }

        btnCopy.addEventListener('click', () => {
            decodeText.select();
            document.execCommand('copy');
            showToast('Decoded text copied to clipboard!', 'success');
        });

        // --- Cryptography Module ---

        const CryptoModule = {
            // Derives an AES-GCM key from a password and salt using PBKDF2
            async deriveKey(password, salt) {
                const enc = new TextEncoder();
                const keyMaterial = await window.crypto.subtle.importKey(
                    "raw",
                    enc.encode(password),
                    { name: "PBKDF2" },
                    false,
                    ["deriveKey"]
                );
                return window.crypto.subtle.deriveKey(
                    {
                        name: "PBKDF2",
                        salt: salt,
                        iterations: 100000,
                        hash: "SHA-256"
                    },
                    keyMaterial,
                    { name: "AES-GCM", length: 256 },
                    false,
                    ["encrypt", "decrypt"]
                );
            },

            async encrypt(plaintext, password) {
                const enc = new TextEncoder();
                const plainBytes = enc.encode(plaintext);

                // Generate Salt and IV
                const salt = window.crypto.getRandomValues(new Uint8Array(16));
                const iv = window.crypto.getRandomValues(new Uint8Array(12));

                const key = await this.deriveKey(password, salt);

                const cipherBuffer = await window.crypto.subtle.encrypt(
                    { name: "AES-GCM", iv: iv },
                    key,
                    plainBytes
                );

                const cipherBytes = new Uint8Array(cipherBuffer);

                // Payload structure: [16b Salt] + [12b IV] + [Ciphertext]
                const payload = new Uint8Array(salt.length + iv.length + cipherBytes.length);
                payload.set(salt, 0);
                payload.set(iv, salt.length);
                payload.set(cipherBytes, salt.length + iv.length);

                return payload;
            },

            async decrypt(payload, password) {
                try {
                    // Extract parts: [16b Salt] + [12b IV] + [Ciphertext]
                    const salt = payload.slice(0, 16);
                    const iv = payload.slice(16, 28);
                    const cipherBytes = payload.slice(28);

                    const key = await this.deriveKey(password, salt);

                    const plainBuffer = await window.crypto.subtle.decrypt(
                        { name: "AES-GCM", iv: iv },
                        key,
                        cipherBytes
                    );

                    const dec = new TextDecoder();
                    return dec.decode(plainBuffer);
                } catch (e) {
                    console.error("Decryption failed", e);
                    throw new Error("Invalid password or corrupted data.");
                }
            }
        };

        // --- Steganography Module ---

        const StegoModule = {

            // Converts Uint8Array to an array of individual bits (0 or 1)
            bytesToBits(bytes) {
                const bits = new Uint8Array(bytes.length * 8);
                for (let i = 0; i < bytes.length; i++) {
                    for (let j = 0; j < 8; j++) {
                        bits[i * 8 + j] = (bytes[i] >> (7 - j)) & 1;
                    }
                }
                return bits;
            },

            // Converts array of bits back to Uint8Array
            bitsToBytes(bits) {
                const bytes = new Uint8Array(Math.floor(bits.length / 8));
                for (let i = 0; i < bytes.length; i++) {
                    let byte = 0;
                    for (let j = 0; j < 8; j++) {
                        byte = (byte << 1) | bits[i * 8 + j];
                    }
                    bytes[i] = byte;
                }
                return bytes;
            },

            // Converts a 32-bit unsigned integer to 32 bits array
            int32ToBits(num) {
                const bits = new Uint8Array(32);
                for (let i = 0; i < 32; i++) {
                    bits[31 - i] = (num >>> i) & 1;
                }
                return bits;
            },

            // Converts 32 bits array back to 32-bit unsigned integer
            bitsToInt32(bits) {
                let num = 0;
                for (let i = 0; i < 32; i++) {
                    num = (num << 1) | bits[i];
                }
                return num >>> 0;
            },

            async encode(imageElement, text, password) {
                // 1. Prepare data payload
                let payloadBytes;
                let isEncrypted = password && password.trim().length > 0;

                if (isEncrypted) {
                    payloadBytes = await CryptoModule.encrypt(text, password);
                } else {
                    const enc = new TextEncoder();
                    payloadBytes = enc.encode(text);
                }

                // 2. Format entire structure
                // Structure: [32-bit Length of Data] + [1-bit Flag (8 bits padded)] + [Data Payload]
                // Length represents the bit length of (Flag + Data Payload)
                const flagByte = new Uint8Array([isEncrypted ? 1 : 0]);
                const dataAndFlag = new Uint8Array(flagByte.length + payloadBytes.length);
                dataAndFlag.set(flagByte, 0);
                dataAndFlag.set(payloadBytes, flagByte.length);

                const dataBits = this.bytesToBits(dataAndFlag);
                const lengthBits = this.int32ToBits(dataBits.length);

                const totalBits = new Uint8Array(lengthBits.length + dataBits.length);
                totalBits.set(lengthBits, 0);
                totalBits.set(dataBits, lengthBits.length);

                // 3. Draw image to canvas to get pixel data
                canvas.width = imageElement.width;
                canvas.height = imageElement.height;
                ctx.drawImage(imageElement, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const pixels = imageData.data;

                // Capacity Check
                // 1 pixel = 4 bytes (RGBA). We use RGB (3 bytes/pixel)
                const availableBits = (pixels.length / 4) * 3;
                if (totalBits.length > availableBits) {
                    throw new Error("Message is too large for this image.");
                }

                // 4. Encode bits into LSB of R, G, B channels
                let bitIndex = 0;
                for (let i = 0; i < pixels.length; i++) {
                    // Skip Alpha channel (every 4th byte: 3, 7, 11...)
                    if ((i + 1) % 4 === 0) continue; 

                    if (bitIndex < totalBits.length) {
                        // Clear the least significant bit and set it to our data bit
                        pixels[i] = (pixels[i] & 0xFE) | totalBits[bitIndex];
                        bitIndex++;
                    } else {
                        break; // All bits encoded
                    }
                }

                // 5. Put altered data back
                ctx.putImageData(imageData, 0, 0);

                // 6. Return as PNG data URL (Lossless is strictly required)
                return canvas.toDataURL('image/png');
            },

            async decode(imageElement, password) {
                canvas.width = imageElement.width;
                canvas.height = imageElement.height;
                ctx.drawImage(imageElement, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const pixels = imageData.data;

                // 1. Extract Length (First 32 bits)
                let lengthBits = new Uint8Array(32);
                let bitIndex = 0;
                let pixelIndex = 0;

                while (bitIndex < 32 && pixelIndex < pixels.length) {
                    if ((pixelIndex + 1) % 4 !== 0) {
                        lengthBits[bitIndex] = pixels[pixelIndex] & 1;
                        bitIndex++;
                    }
                    pixelIndex++;
                }

                const dataLengthBits = this.bitsToInt32(lengthBits);

                // Safety checks
                if (dataLengthBits === 0 || dataLengthBits > (pixels.length / 4) * 3 - 32) {
                    throw new Error("No hidden data found or image is corrupted.");
                }

                // 2. Extract Data Bits
                let extractedDataBits = new Uint8Array(dataLengthBits);
                let dataBitIndex = 0;

                while (dataBitIndex < dataLengthBits && pixelIndex < pixels.length) {
                    if ((pixelIndex + 1) % 4 !== 0) {
                        extractedDataBits[dataBitIndex] = pixels[pixelIndex] & 1;
                        dataBitIndex++;
                    }
                    pixelIndex++;
                }

                if (dataBitIndex < dataLengthBits) {
                    throw new Error("Image data is truncated or corrupted.");
                }

                // 3. Reconstruct Bytes
                const payloadBytes = this.bitsToBytes(extractedDataBits);

                // 4. Parse Flag and Data
                const isEncrypted = payloadBytes[0] === 1;
                const actualData = payloadBytes.slice(1);

                if (isEncrypted) {
                    if (!password || password.trim() === '') {
                        throw new Error("This payload is encrypted. A password is required.");
                    }
                    return await CryptoModule.decrypt(actualData, password);
                } else {
                    const dec = new TextDecoder();
                    return dec.decode(actualData);
                }
            },

            async analyze(imageElement) {
                canvas.width = imageElement.width;
                canvas.height = imageElement.height;
                ctx.drawImage(imageElement, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const pixels = imageData.data;

                // Amplify the LSB of R, G, B channels to 255. 
                // Keep Alpha intact.
                for (let i = 0; i < pixels.length; i += 4) {
                    pixels[i] = (pixels[i] & 1) ? 255 : 0;       // R
                    pixels[i+1] = (pixels[i+1] & 1) ? 255 : 0;   // G
                    pixels[i+2] = (pixels[i+2] & 1) ? 255 : 0;   // B
                    pixels[i+3] = 255; // Set alpha to fully opaque
                }

                ctx.putImageData(imageData, 0, 0);
                return canvas.toDataURL('image/png');
            }
        };

        // --- Execute Actions ---

        btnEncode.addEventListener('click', async () => {
            if (!currentImage.loaded) {
                showToast("Please select an image first.", "error");
                return;
            }
            if (!encodeText.value) {
                showToast("Please enter a secret message.", "error");
                return;
            }

            btnEncode.disabled = true;
            const originalText = btnEncode.innerHTML;
            btnEncode.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processing...`;

            try {
                // Yield thread to UI
                await new Promise(r => setTimeout(r, 50)); 

                const dataUrl = await StegoModule.encode(
                    currentImage.element, 
                    encodeText.value, 
                    encodePassword.value
                );

                // Trigger Download
                const link = document.getElementById('download-link');
                link.href = dataUrl;

                // Suggest filename
                const originalName = encodeFilename.textContent;
                const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
                link.download = `${baseName}_secure.png`;
                link.click();

                showToast("Image encoded and downloaded successfully!", "success");

                // Clear text for security
                encodeText.value = '';
                encodePassword.value = '';
                updateCapacity();

            } catch (err) {
                console.error(err);
                showToast(err.message || "An error occurred during encoding.", "error");
            } finally {
                btnEncode.disabled = false;
                btnEncode.innerHTML = originalText;
            }
        });

        btnDecode.addEventListener('click', async () => {
            if (!currentImage.loaded) {
                showToast("Please select an encoded PNG image first.", "error");
                return;
            }

            btnDecode.disabled = true;
            decodeResultContainer.classList.add('hidden');
            const originalText = btnDecode.innerHTML;
            btnDecode.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Analyzing...`;

            try {
                await new Promise(r => setTimeout(r, 50)); 

                const secretText = await StegoModule.decode(
                    currentImage.element,
                    decodePassword.value
                );

                decodeText.value = secretText;
                decodeResultContainer.classList.remove('hidden');
                showToast("Data successfully extracted!", "success");
                decodePassword.value = '';

            } catch (err) {
                console.error(err);
                showToast(err.message || "Failed to extract data. Image may not contain payload.", "error");
            } finally {
                btnDecode.disabled = false;
                btnDecode.innerHTML = originalText;
            }
        });

        btnAnalyze.addEventListener('click', async () => {
            if (!currentImage.loaded || currentImage.type !== 'analyze') {
                showToast("Please select an image to analyze.", "error");
                return;
            }

            btnAnalyze.disabled = true;
            const originalText = btnAnalyze.innerHTML;
            btnAnalyze.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Analyzing LSB...`;

            try {
                await new Promise(r => setTimeout(r, 50)); 
                const analyzedDataUrl = await StegoModule.analyze(currentImage.element);

                // Show the analyzed image in the preview
                analyzePreview.src = analyzedDataUrl;
                showToast("LSB Analysis complete. Noise indicates modified bits.", "success");
            } catch (err) {
                console.error(err);
                showToast("Failed to analyze image.", "error");
            } finally {
                btnAnalyze.disabled = false;
                btnAnalyze.innerHTML = originalText;
            }
        });

        // ─── Forensic Tab State & Dropzone ───────────────────────────────────────
        let forensicImage = { element: new Image(), loaded: false };

        const forensicFile      = document.getElementById('forensic-file');
        const forensicDropzone  = document.getElementById('forensic-dropzone');
        const forensicPreviewContainer = document.getElementById('forensic-preview-container');
        const forensicPlaceholder      = document.getElementById('forensic-placeholder');
        const forensicPreview          = document.getElementById('forensic-preview');
        const forensicFilename         = document.getElementById('forensic-filename');
        const btnRemoveForensic        = document.getElementById('btn-remove-forensic');
        const btnForensic              = document.getElementById('btn-forensic');
        const forensicPassword         = document.getElementById('forensic-password');
        const forensicChiContainer     = document.getElementById('forensic-chi-container');
        const forensicChiResult        = document.getElementById('forensic-chi-result');
        const forensicResultsContainer = document.getElementById('forensic-results-container');
        const forensicResults          = document.getElementById('forensic-results');

        setupDropzone(forensicDropzone, forensicFile,
            forensicPreviewContainer, forensicPlaceholder,
            forensicPreview, forensicFilename, 'forensic');

        // Override loadImage to also handle forensic mode
        const _origLoadImage = loadImage;
        loadImage = function(dataUrl, filename, mode) {
            if (mode !== 'forensic') { _origLoadImage(dataUrl, filename, mode); return; }
            forensicImage.element.onload = () => {
                forensicImage.loaded = true;
                forensicPreview.src = dataUrl;
                forensicFilename.textContent = filename;
                forensicPlaceholder.classList.add('hidden');
                forensicPreviewContainer.classList.remove('hidden');
                forensicPreviewContainer.classList.add('flex');
            };
            forensicImage.element.src = dataUrl;
        };

        btnRemoveForensic.addEventListener('click', (e) => {
            e.stopPropagation();
            forensicImage.loaded = false;
            forensicFile.value = '';
            forensicPreview.src = '';
            forensicPlaceholder.classList.remove('hidden');
            forensicPreviewContainer.classList.add('hidden');
            forensicPreviewContainer.classList.remove('flex');
            forensicChiContainer.classList.add('hidden');
            forensicResultsContainer.classList.add('hidden');
            forensicResults.innerHTML = '';
        });

        // ─── Universal Forensic Extraction Engine ────────────────────────────────

        const ForensicModule = {

            // Get raw RGBA pixel array from any image element
            getPixels(imgEl) {
                const c = document.createElement('canvas');
                c.width = imgEl.naturalWidth || imgEl.width;
                c.height = imgEl.naturalHeight || imgEl.height;
                const x = c.getContext('2d', { willReadFrequently: true });
                x.drawImage(imgEl, 0, 0);
                return { pixels: x.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
            },

            // Chi-Square statistical attack — detects LSB manipulation
            chiSquare(pixels) {
                // For each channel, count observed pairs of values (2k, 2k+1)
                // In a clean image they differ; a stego image equalises them
                const chans = [[], [], []]; // R, G, B
                for (let i = 0; i < pixels.length; i += 4) {
                    chans[0].push(pixels[i]);
                    chans[1].push(pixels[i+1]);
                    chans[2].push(pixels[i+2]);
                }
                const names = ['Red', 'Green', 'Blue'];
                const results = [];
                let overallSuspicion = 0;
                for (let c = 0; c < 3; c++) {
                    const freq = new Array(256).fill(0);
                    for (const v of chans[c]) freq[v]++;
                    let chi2 = 0;
                    let pairs = 0;
                    for (let k = 0; k < 128; k++) {
                        const o0 = freq[2*k], o1 = freq[2*k+1];
                        const expected = (o0 + o1) / 2;
                        if (expected > 0) { chi2 += Math.pow(o0 - expected, 2) / expected; pairs++; }
                    }
                    // p-value approximation for chi2 with `pairs` DOF
                    // Rule of thumb: chi2/pairs > 1.0 = suspicious
                    const ratio = pairs > 0 ? chi2 / pairs : 0;
                    const suspicion = ratio < 0.5 ? 'HIGH (likely stego)' : ratio < 1.5 ? 'MEDIUM' : 'LOW (likely clean)';
                    overallSuspicion += (ratio < 0.5 ? 2 : ratio < 1.5 ? 1 : 0);
                    results.push(`  ${names[c]} channel:  χ²/df = ${ratio.toFixed(3)}  →  Suspicion: ${suspicion}`);
                }
                const verdict = overallSuspicion >= 4 ? '⚠️  STRONG evidence of LSB steganography' :
                                overallSuspicion >= 2 ? '⚠️  MODERATE evidence of LSB steganography' :
                                '✅  No strong statistical evidence of steganography';
                return `Chi-Square Steganalysis Results\n${'─'.repeat(50)}\n${results.join('\n')}\n${'─'.repeat(50)}\n  Overall Verdict: ${verdict}`;
            },

            // Extract bits from pixels using a given channel order and bit depth
            extractBits(pixels, channelOrder, bitDepth, scanOrder, w, h) {
                const bits = [];
                const totalPixels = pixels.length / 4;
                const indices = scanOrder === 'row'
                    ? Array.from({ length: totalPixels }, (_, i) => i)
                    : (() => {
                        const idx = [];
                        for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) idx.push(y * w + x);
                        return idx;
                    })();
                const mask = (1 << bitDepth) - 1;
                for (const pi of indices) {
                    const base = pi * 4;
                    for (const ch of channelOrder) {
                        if (ch > 2) continue;
                        const byteVal = pixels[base + ch];
                        for (let b = bitDepth - 1; b >= 0; b--) {
                            bits.push((byteVal >> b) & 1);
                        }
                    }
                }
                return bits;
            },

            bitsToBytes(bits) {
                const bytes = new Uint8Array(Math.floor(bits.length / 8));
                for (let i = 0; i < bytes.length; i++) {
                    let byte = 0;
                    for (let j = 0; j < 8; j++) {
                        byte = (byte << 1) | bits[i * 8 + j];
                    }
                    bytes[i] = byte;
                }
                return bytes;
            },

            // Score how "readable" the bytes are (higher = more likely real data)
            readabilityScore(bytes) {
                const check = bytes.slice(0, Math.min(512, bytes.length));
                let printable = 0, nulls = 0;
                for (const b of check) {
                    if (b === 0) nulls++;
                    else if ((b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13) printable++;
                }
                if (nulls > check.length * 0.5) return 0;
                return printable / check.length;
            },

            // Known magic bytes for file type detection
            detectFileType(bytes) {
                const h = bytes;
                if (h[0]===0x89&&h[1]===0x50&&h[2]===0x4E&&h[3]===0x47) return 'PNG image';
                if (h[0]===0xFF&&h[1]===0xD8&&h[2]===0xFF) return 'JPEG image';
                if (h[0]===0x47&&h[1]===0x49&&h[2]===0x46) return 'GIF image';
                if (h[0]===0x25&&h[1]===0x50&&h[2]===0x44&&h[3]===0x46) return 'PDF document';
                if (h[0]===0x50&&h[1]===0x4B&&h[2]===0x03&&h[3]===0x04) return 'ZIP archive';
                if (h[0]===0x52&&h[1]===0x61&&h[2]===0x72&&h[3]===0x21) return 'RAR archive';
                if (h[0]===0x7F&&h[1]===0x45&&h[2]===0x4C&&h[3]===0x46) return 'ELF binary';
                if (h[0]===0x4D&&h[1]===0x5A) return 'Windows EXE/DLL';
                if (h[0]===0xCA&&h[1]===0xFE&&h[2]===0xBA&&h[3]===0xBE) return 'Java class';
                if (h[0]===0x1F&&h[1]===0x8B) return 'GZIP archive';
                if (h[0]===0xFD&&h[1]===0x37&&h[2]===0x7A&&h[3]===0x58&&h[4]===0x5A&&h[5]===0x00) return 'XZ archive';
                if (h[0]===0x42&&h[1]===0x5A&&h[2]===0x68) return 'BZIP2 archive';
                // SteganoVault own format: first byte is 0x00 or 0x01 (flag), followed by plausible data
                if ((h[0]===0||h[0]===1) && bytes.length > 10) return 'SteganoVault payload (flag byte detected)';
                return null;
            },

            // Also try SteganoVault's own header format (32-bit length prefix)
            trySteganoVaultDecode(bytes) {
                if (bytes.length < 5) return null;
                // Read 32-bit big-endian length (in bits)
                const lenBits = (bytes[0]<<24)|(bytes[1]<<16)|(bytes[2]<<8)|bytes[3];
                const lenBytes = Math.ceil(lenBits / 8);
                if (lenBytes <= 0 || lenBytes > bytes.length - 4) return null;
                const payload = bytes.slice(4, 4 + lenBytes);
                return payload;
            },

            hexDump(bytes, maxBytes = 256) {
                const slice = bytes.slice(0, maxBytes);
                const lines = [];
                for (let i = 0; i < slice.length; i += 16) {
                    const chunk = slice.slice(i, i + 16);
                    const hex = Array.from(chunk).map(b => b.toString(16).padStart(2,'0')).join(' ').padEnd(47);
                    const ascii = Array.from(chunk).map(b => (b>=32&&b<=126) ? String.fromCharCode(b) : '.').join('');
                    lines.push(`${i.toString(16).padStart(4,'0')}  ${hex}  |${ascii}|`);
                }
                if (bytes.length > maxBytes) lines.push(`... (${bytes.length - maxBytes} more bytes)`);
                return lines.join('\n');
            },

            async run(imgEl, password) {
                const { pixels, w, h } = this.getPixels(imgEl);

                // Chi-Square first
                const chiReport = this.chiSquare(pixels);

                // Channel orders to try
                const channelOrders = [
                    { name: 'RGB', order: [0,1,2] },
                    { name: 'RBG', order: [0,2,1] },
                    { name: 'GRB', order: [1,0,2] },
                    { name: 'GBR', order: [1,2,0] },
                    { name: 'BRG', order: [2,0,1] },
                    { name: 'BGR', order: [2,1,0] },
                    { name: 'R only', order: [0] },
                    { name: 'G only', order: [1] },
                    { name: 'B only', order: [2] },
                    { name: 'RGBA',  order: [0,1,2,3] },
                ];
                const bitDepths   = [1, 2, 3, 4];
                const scanOrders  = ['row', 'column'];

                const candidates = [];

                for (const co of channelOrders) {

                    // YIELD TO MAIN THREAD: 
                    // Placed securely in the outermost loop (runs only 10 times) 
                    // This is enough to prevent the "Page Unresponsive" error 
                    // without modifying your functional logic inside.
                    await new Promise(r => setTimeout(r, 0));

                    for (const bd of bitDepths) {
                        for (const so of scanOrders) {
                            const bits  = this.extractBits(pixels, co.order, bd, so, w, h);
                            const bytes = this.bitsToBytes(bits);

                            // Score
                            const score = this.readabilityScore(bytes);
                            const fileType = this.detectFileType(bytes);
                            const svPayload = this.trySteganoVaultDecode(bytes);

                            // Attempt text decode
                            let textPreview = '';
                            try { textPreview = new TextDecoder('utf-8', { fatal: true }).decode(bytes.slice(0, 512)); } catch(e) {
                                try { textPreview = new TextDecoder('latin1').decode(bytes.slice(0, 512)); } catch(e2) {}
                            }

                            // Attempt SteganoVault AES decrypt if password given and sv payload found
                            let decrypted = null;
                            if (password && svPayload && svPayload[0] === 1) {
                                try {
                                    decrypted = await CryptoModule.decrypt(svPayload.slice(1), password);
                                } catch(e) {}
                            }
                            // Also try direct AES if the bytes look encrypted (flag=1)
                            if (!decrypted && password && bytes[4] === 1 && svPayload) {
                                try { decrypted = await CryptoModule.decrypt(svPayload.slice(1), password); } catch(e) {}
                            }

                            candidates.push({
                                label: `${co.name} | ${bd}-bit LSB | ${so}-scan`,
                                score,
                                fileType,
                                textPreview: textPreview.slice(0, 300),
                                hexDump: this.hexDump(bytes),
                                decrypted,
                                totalBytes: bytes.length,
                            });
                        }
                    }
                }

                // Sort by score descending, file-type hits first
                candidates.sort((a,b) => {
                    const af = a.fileType ? 1 : 0, bf = b.fileType ? 1 : 0;
                    if (af !== bf) return bf - af;
                    return b.score - a.score;
                });

                return { chiReport, candidates: candidates.slice(0, 20) };
            }
        };

        // ─── Forensic Button Handler ──────────────────────────────────────────────
        btnForensic.addEventListener('click', async () => {
            if (!forensicImage.loaded) {
                showToast('Please select an image first.', 'error');
                return;
            }
            btnForensic.disabled = true;
            const origText = btnForensic.innerHTML;
            btnForensic.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Scanning all permutations…`;

            try {
                await new Promise(r => setTimeout(r, 60));
                const pw = forensicPassword.value;
                const { chiReport, candidates } = await ForensicModule.run(forensicImage.element, pw);

                // Show chi-square
                forensicChiResult.textContent = chiReport;
                forensicChiContainer.classList.remove('hidden');

                // Render candidates
                forensicResults.innerHTML = '';
                for (const c of candidates) {
                    const highlight = c.fileType || c.score > 0.7 || c.decrypted;
                    const card = document.createElement('div');
                    card.className = `rounded-lg p-4 border ${highlight ? 'border-purple-500/60 bg-purple-900/20' : 'border-slate-700 bg-dark-900'}`;
                    card.innerHTML = `
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-bold font-mono ${highlight ? 'text-purple-300' : 'text-slate-400'}">${c.label}</span>
                            <span class="text-xs text-slate-500">Readability: ${(c.score*100).toFixed(0)}% | ${c.totalBytes.toLocaleString()} bytes</span>
                        </div>
                        ${c.fileType ? `<div class="mb-2 text-xs font-bold text-yellow-400">⚠️ File signature detected: ${c.fileType}</div>` : ''}
                        ${c.decrypted ? `<div class="mb-2"><span class="text-xs font-bold text-green-400">🔓 AES-256 decryption succeeded!</span><pre class="mt-1 text-xs text-green-300 bg-dark-900 rounded p-2 overflow-x-auto whitespace-pre-wrap">${c.decrypted.slice(0,500)}</pre></div>` : ''}
                        <details class="mt-1">
                            <summary class="text-xs text-slate-500 cursor-pointer hover:text-slate-300">â–¶ Text preview (${Math.round(c.score*100)}% printable)</summary>
                            <pre class="mt-1 text-xs text-slate-400 bg-dark-900 rounded p-2 overflow-x-auto whitespace-pre-wrap">${c.textPreview.replace(/</g,'&lt;')}</pre>
                        </details>
                        <details class="mt-1">
                            <summary class="text-xs text-slate-500 cursor-pointer hover:text-slate-300">â–¶ Hex dump (first 256 bytes)</summary>
                            <pre class="mt-1 text-xs text-slate-400 font-mono bg-dark-900 rounded p-2 overflow-x-auto">${c.hexDump}</pre>
                        </details>
                    `;
                    forensicResults.appendChild(card);
                }
                forensicResultsContainer.classList.remove('hidden');
                showToast(`Forensic scan complete. ${candidates.length} extraction candidates ranked.`, 'success');
            } catch(err) {
                console.error(err);
                showToast(err.message || 'Forensic extraction failed.', 'error');
            } finally {
                btnForensic.disabled = false;
                btnForensic.innerHTML = origText;
            }
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
