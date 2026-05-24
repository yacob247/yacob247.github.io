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
                searchInput.focus();
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
            
            try {
                // TIER 1: Try the standard dictionary first
                const response = await fetch(`${PRIMARY_API_URL}${encodeURIComponent(word)}`);
                
                if (response.ok) {
                    const data = await response.json();
                    renderPrimaryData(data[0]);
                    return;
                }
                
                // TIER 2: If standard fails, try Wiktionary (Huge database)
                loadingText.textContent = "Searching extended Wiktionary database...";
                const wikiResponse = await fetch(`${WIKTIONARY_API_URL}${encodeURIComponent(word)}`);
                
                if (wikiResponse.ok) {
                    const wikiData = await wikiResponse.json();
                    if (wikiData.en) {
                        renderWiktionaryData(word, wikiData.en);
                        return;
                    }
                }

                // TIER 3: Absolute Fallback (Google/Oxford Bridge)
                renderUltimateFallback(word);

            } catch (error) {
                document.getElementById('error-title').textContent = "Connection Error";
                document.getElementById('error-message').textContent = "Please check your internet connection and try again.";
                showView(errorState);
                document.title = `Error: ${word}`;
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
            fetchTranslation(word); // Instantly fetch translation if enabled
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
