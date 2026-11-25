     const searchForm = document.getElementById('search-form');
        const searchInput = document.getElementById('search-input');
        
        const loadingState = document.getElementById('loading-state');
        const loadingText = document.getElementById('loading-text');
        const errorState = document.getElementById('error-state');
        const emptyState = document.getElementById('empty-state');
        const resultContent = document.getElementById('result-content');
        
        const displayWord = document.getElementById('display-word');
        const meaningsContainer = document.getElementById('meanings-container');
        
        const ukBlock = document.getElementById('uk-pronunciation-block');
        const usBlock = document.getElementById('us-pronunciation-block');
        const generalBlock = document.getElementById('general-pronunciation-block');
        const ukPhonetic = document.getElementById('uk-phonetic');
        const usPhonetic = document.getElementById('us-phonetic');
        const generalPhonetic = document.getElementById('general-phonetic');

        const translationBlock = document.getElementById('translation-block');
        const translationWord = document.getElementById('translation-word');
        const translationLangLabel = document.getElementById('translation-lang-label');
        const langSelect = document.getElementById('lang-select');

        let audioData = { uk: null, us: null, general: null };
        let currentWordText = "";
        let currentTranslatedText = "";

        // API 1: Standard Dictionary
        const PRIMARY_API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/";
        // API 2: Wiktionary (Massive database for compounds, rare words)
        const WIKTIONARY_API_URL = "https://en.wiktionary.org/api/rest_v1/page/definition/";

        window.addEventListener('DOMContentLoaded', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const queryRaw = urlParams.get('q') || urlParams.get('word');

            if (queryRaw && queryRaw.trim() !== '') {
                const targetWord = extractTargetWord(queryRaw);
                searchInput.value = targetWord;
                startSearchProcess(targetWord);
            } else {
                if(searchInput) searchInput.focus();
            }
        });

        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const rawWord = searchInput.value;
            if (rawWord.trim()) {
                const targetWord = extractTargetWord(rawWord);
                
                try {
                    const url = new URL(window.location);
                    url.searchParams.set('q', targetWord);
                    window.history.pushState({}, '', url);
                } catch (err) {}
                
                searchInput.value = targetWord;
                startSearchProcess(targetWord);
            }
        });

        function resetApp() {
            searchInput.value = "";
            showView(emptyState);
            try {
                const url = new URL(window.location);
                url.searchParams.delete('q');
                window.history.pushState({}, '', url);
            } catch (err) {}
            document.title = "Instant Dictionary & Pronunciation";
        }

        function extractTargetWord(query) {
            let q = query.toLowerCase().trim();
            const fillerWords = ['meaning', 'definition', 'define', 'pronunciation', 'pronounce', 'how', 'to', 'what', 'is', 'the', 'of', 'in', 'english', 'a', 'an'];
            let words = q.split(/\s+/);
            let filteredWords = words.filter(w => !fillerWords.includes(w));
            if (filteredWords.length === 0) return words[0];
            return filteredWords[0];
        }

        langSelect.addEventListener('change', () => {
            if (currentWordText && !resultContent.classList.contains('hidden')) {
                fetchTranslation(currentWordText);
            } else if (langSelect.value === 'none') {
                translationBlock.classList.add('hidden');
                translationBlock.classList.remove('inline-flex');
            }
        });

        async function fetchTranslation(word) {
            const targetLang = langSelect.value;
            if (targetLang === 'none') {
                translationBlock.classList.add('hidden');
                translationBlock.classList.remove('inline-flex');
                return;
            }

            try {
                // Free, open endpoint used by extensions for simple word translation
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(word)}`;
                const response = await fetch(url);
                const data = await response.json();
                
                if (data && data[0] && data[0][0] && data[0][0][0]) {
                    currentTranslatedText = data[0][0][0];
                    translationWord.textContent = currentTranslatedText;
                    translationLangLabel.textContent = langSelect.options[langSelect.selectedIndex].text;
                    
                    translationBlock.classList.remove('hidden');
                    translationBlock.classList.add('inline-flex');
                }
            } catch (err) {
                console.error("Translation failed", err);
                translationBlock.classList.add('hidden');
                translationBlock.classList.remove('inline-flex');
            }
        }

        function playTranslatedAudio() {
            if ('speechSynthesis' in window && currentTranslatedText) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(currentTranslatedText);
                utterance.lang = langSelect.value; // Play in the target language's accent
                window.speechSynthesis.speak(utterance);
            }
        }

        async function startSearchProcess(word) {
            currentWordText = word;
            loadingText.textContent = "Searching primary dictionary...";
            showView(loadingState);
            document.title = `Dictionary: ${word}...`;
            
            let primaryFound = false;
            let wikiFound = false;

            // TIER 1: Try the standard dictionary first
            try {
                const response = await fetch(`${PRIMARY_API_URL}${encodeURIComponent(word)}`);
                if (response.ok) {
                    const data = await response.json();
                    renderPrimaryData(data[0]);
                    primaryFound = true;
                    return;
                }
            } catch (err) {
                console.warn("Primary API failure, falling back...", err);
            }
            
            // TIER 2: If standard fails (or threw a CORS/network error), try Wiktionary
            if (!primaryFound) {
                loadingText.textContent = "Searching extended Wiktionary database...";
                try {
                    const wikiResponse = await fetch(`${WIKTIONARY_API_URL}${encodeURIComponent(word)}`);
                    if (wikiResponse.ok) {
                        const wikiData = await wikiResponse.json();
                        if (wikiData.en) {
                            renderWiktionaryData(word, wikiData.en);
                            wikiFound = true;
                            return;
                        }
                    }
                } catch (err) {
                    console.warn("Wiktionary API failure (often CORS on 404), falling back...", err);
                }
            }

            // TIER 3: Absolute Fallback (Google Search UI Card)
            // This will safely show up if both dictionary requests fail to find the word
            if (!primaryFound && !wikiFound) {
                try {
                    renderUltimateFallback(word);
                } catch (error) {
                    // This acts as our safety guard in case renderUltimateFallback fails
                    document.getElementById('error-title').textContent = "Connection Error";
                    document.getElementById('error-message').textContent = "Please check your internet connection and try again.";
                    showView(errorState);
                    document.title = `Error: ${word}`;
                }
            }
        }

        function renderPrimaryData(data) {
            displayWord.textContent = data.word;
            document.title = `${data.word} - Pronunciation & Definition`;
            
            resetAudioUI();
            audioData = { uk: null, us: null, general: null, text: data.phonetic || "" };
            
            let bestGeneralAudio = null;
            if (data.phonetics && data.phonetics.length > 0) {
                data.phonetics.forEach(ph => {
                    const text = ph.text || data.phonetic;
                    const audio = ph.audio;
                    if (audio) {
                        bestGeneralAudio = audio;
                        if (audio.includes('-uk.mp3') || audio.includes('uk_pronunciation')) {
                            audioData.uk = audio;
                            ukPhonetic.textContent = text || "";
                            ukBlock.classList.remove('hidden');
                        } else if (audio.includes('-us.mp3') || audio.includes('us_pronunciation')) {
                            audioData.us = audio;
                            usPhonetic.textContent = text || "";
                            usBlock.classList.remove('hidden');
                        } else if (!audioData.general) {
                            audioData.general = audio;
                        }
                    }
                });
            }

            if (!audioData.uk && !audioData.us) {
                generalBlock.classList.remove('hidden');
                audioData.general = bestGeneralAudio;
            }

            meaningsContainer.innerHTML = '';
            
            data.meanings.forEach(meaning => {
                const section = document.createElement('div');
                section.className = 'mb-8';
                section.innerHTML = `<div class="mb-4"><span class="inline-block bg-[#002147] text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-sm shadow-sm">${meaning.partOfSpeech}</span></div>`;

                const defContainer = document.createElement('div');
                defContainer.className = 'space-y-5 pl-2 sm:pl-4';
                
                meaning.definitions.forEach((def, index) => {
                    const defBlock = document.createElement('div');
                    defBlock.className = 'flex gap-3';
                    defBlock.innerHTML = `<div class="flex-shrink-0 w-6 h-6 bg-gray-200 text-gray-700 text-xs font-bold rounded-full flex items-center justify-center mt-0.5">${index + 1}</div>`;
                    
                    const content = document.createElement('div');
                    content.innerHTML = `<p class="text-gray-900 font-semibold mb-1 leading-snug">${def.definition}</p>`;
                    if (def.example) {
                        content.innerHTML += `<p class="text-gray-600 italic text-sm pl-3 border-l-2 border-gray-300 mt-2">${def.example}</p>`;
                    }
                    defBlock.appendChild(content);
                    defContainer.appendChild(defBlock);
                });
                section.appendChild(defContainer);
                meaningsContainer.appendChild(section);
            });

            showView(resultContent);
            fetchTranslation(data.word); // Instantly fetch translation if enabled
            setTimeout(() => autoPlayBestAudio(), 400);
        }

        function renderWiktionaryData(word, wikiData) {
            displayWord.textContent = word;
            document.title = `${word} - Extended Definition`;
            
            resetAudioUI();
            generalBlock.classList.remove('hidden'); // Force general TTS button
            
            meaningsContainer.innerHTML = `
                <div class="mb-6 p-3 bg-blue-50 border-l-4 border-blue-400 text-sm text-blue-800">
                    <strong>Extended Database:</strong> This word was found in our massive secondary dictionary (Wiktionary).
                </div>
            `;
            
            wikiData.forEach(meaning => {
                const section = document.createElement('div');
                section.className = 'mb-8';
                section.innerHTML = `<div class="mb-4"><span class="inline-block bg-[#002147] text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-sm shadow-sm">${meaning.partOfSpeech}</span></div>`;

                const defContainer = document.createElement('div');
                defContainer.className = 'space-y-5 pl-2 sm:pl-4';
                
                meaning.definitions.forEach((def, index) => {
                    const defBlock = document.createElement('div');
                    defBlock.className = 'flex gap-3';
                    defBlock.innerHTML = `<div class="flex-shrink-0 w-6 h-6 bg-gray-200 text-gray-700 text-xs font-bold rounded-full flex items-center justify-center mt-0.5">${index + 1}</div>`;
                    
                    const content = document.createElement('div');
                    // Wiktionary returns HTML definitions, so we inject them safely styled
                    content.innerHTML = `<p class="text-gray-900 font-semibold mb-1 leading-snug wiktionary-def">${def.definition}</p>`;
                    
                    if (def.parsedExample) {
                        content.innerHTML += `<p class="text-gray-600 italic text-sm pl-3 border-l-2 border-gray-300 mt-2 wiktionary-def">${def.parsedExample}</p>`;
                    }
                    defBlock.appendChild(content);
                    defContainer.appendChild(defBlock);
                });
                section.appendChild(defContainer);
                meaningsContainer.appendChild(section);
            });

            showView(resultContent);
            fetchTranslation(word); // Instantly fetch translation if enabled
            setTimeout(() => autoPlayBestAudio(), 400);
        }

        function renderUltimateFallback(word) {
            displayWord.textContent = word;
            document.title = `${word} - Web Search`;
            
            resetAudioUI();
            generalBlock.classList.remove('hidden'); // Show TTS play button
            
            meaningsContainer.innerHTML = `
                <div class="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
                    <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                    </div>
                    <h3 class="text-lg font-bold text-gray-900 mb-2">Deep Web Search Required</h3>
                    <p class="text-gray-600 mb-6 max-w-md mx-auto text-sm">
                        "${word}" is not listed in our standard or extended databases. However, we have generated its pronunciation using AI, and you can instantly view Google's Oxford dictionary card below.
                    </p>
                    <a href="https://www.google.com/search?q=define+${encodeURIComponent(word)}" target="_blank" class="inline-flex items-center gap-2 bg-[#002147] hover:bg-blue-800 text-white font-semibold py-2 px-6 rounded-full transition-colors shadow-sm">
                        View Definition on Google
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                </div>
            `;
            
            showView(resultContent);
            fetchTranslation(word); // Instantly fetch translation if enabled
            
            // Even if the word doesn't exist, it ALWAYS pronounces it!
            setTimeout(() => autoPlayBestAudio(), 400);
        }

        function resetAudioUI() {
            ukBlock.classList.add('hidden');
            usBlock.classList.add('hidden');
            generalBlock.classList.add('hidden');
            audioData = { uk: null, us: null, general: null, text: "" };
        }

        function autoPlayBestAudio() {
            if (audioData.us) playAudio('us');
            else if (audioData.uk) playAudio('uk');
            else if (audioData.general) playAudio('general');
            else playTTSFallback(currentWordText);
        }

        function playAudio(type) {
            const url = audioData[type];
            if (url) {
                const audio = new Audio(url);
                audio.play().catch(e => {
                    console.warn("Audio file blocked, using free native TTS.");
                    playTTSFallback(currentWordText);
                });
            } else {
                playTTSFallback(currentWordText);
            }
        }

        function playTTSFallback(text) {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'en-US';
                utterance.rate = 0.9;
                
                const voices = window.speechSynthesis.getVoices();
                if (voices.length > 0) {
                    const goodVoice = voices.find(v => v.name.includes('Google US') || v.name.includes('Samantha') || (v.lang === 'en-US' && v.localService));
                    if (goodVoice) utterance.voice = goodVoice;
                }
                window.speechSynthesis.speak(utterance);
            }
        }

        if ('speechSynthesis' in window) {
            window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
        }

        function showView(viewElement) {
            loadingState.classList.add('hidden');
            errorState.classList.add('hidden');
            emptyState.classList.add('hidden');
            resultContent.classList.add('hidden');
            resultContent.classList.remove('flex');
            
            if(viewElement === resultContent) {
                viewElement.classList.remove('hidden');
                viewElement.classList.add('flex');
            } else {
                viewElement.classList.remove('hidden');
            }
        }


/* --- extracted inline scripts --- */
try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { console.warn("AdSense layout warning:", e); }

try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { console.warn("AdSense layout warning:", e); }

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
