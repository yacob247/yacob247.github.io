       const searchForm = document.getElementById('search-form');
        const searchInput = document.getElementById('search-input');
        
        // Views
        const loadingState = document.getElementById('loading-state');
        const errorState = document.getElementById('error-state');
        const emptyState = document.getElementById('empty-state');
        const resultContent = document.getElementById('result-content');
        
        // Elements
        const displayWord = document.getElementById('display-word');
        const meaningsContainer = document.getElementById('meanings-container');
        
        // Audio Elements
        const ukBlock = document.getElementById('uk-pronunciation-block');
        const usBlock = document.getElementById('us-pronunciation-block');
        const generalBlock = document.getElementById('general-pronunciation-block');
        const ukPhonetic = document.getElementById('uk-phonetic');
        const usPhonetic = document.getElementById('us-phonetic');
        const generalPhonetic = document.getElementById('general-phonetic');

        // State
        let audioData = {
            uk: null,
            us: null,
            general: null
        };
        let currentWordText = "";

        const API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/";

        window.addEventListener('DOMContentLoaded', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const queryRaw = urlParams.get('q') || urlParams.get('word');

            if (queryRaw && queryRaw.trim() !== '') {
                // Smart extraction: Handle "pyrimidine meaning" or "define apple"
                const targetWord = extractTargetWord(queryRaw);
                searchInput.value = targetWord;
                fetchWordData(targetWord);
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
                
                searchInput.value = targetWord; // update input with cleaned word
                fetchWordData(targetWord);
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
        }

        // Smart Natural Language Processing (NLP) simulator
        function extractTargetWord(query) {
            let q = query.toLowerCase().trim();
            // Words to strip out if the user types them in the search bar
            const fillerWords = ['meaning', 'definition', 'define', 'pronunciation', 'pronounce', 'how', 'to', 'what', 'is', 'the', 'of', 'in', 'english', 'a', 'an'];
            
            let words = q.split(/\s+/);
            // Filter out fillers
            let filteredWords = words.filter(w => !fillerWords.includes(w));
            
            // If filtering removes everything (e.g. they searched "define"), fallback to the original query
            if (filteredWords.length === 0) return words[0];
            
            // Return the first significant word (dictionary API usually only takes 1 word anyway)
            return filteredWords[0];
        }

        async function fetchWordData(word) {
            showView(loadingState);
            document.title = `Dictionary: ${word}...`;
            
            try {
                const response = await fetch(`${API_URL}${encodeURIComponent(word)}`);
                const data = await response.json();

                if (!response.ok) {
                    throw { 
                        title: data.title || "Not Found", 
                        message: data.message || "We couldn't find definitions for that word." 
                    };
                }

                renderWordData(data[0]);
                document.title = `${data[0].word} - Pronunciation & Definition`;
                
                // Instantly pronounce the word automatically
                setTimeout(() => autoPlayBestAudio(), 400);

            } catch (error) {
                document.getElementById('error-title').textContent = error.title;
                document.getElementById('error-message').textContent = error.message;
                showView(errorState);
                document.title = `Not found: ${word}`;
            }
        }

        function renderWordData(data) {
            currentWordText = data.word;
            displayWord.textContent = data.word;
            
            // Reset Audio UI
            ukBlock.classList.add('hidden');
            usBlock.classList.add('hidden');
            generalBlock.classList.add('hidden');
            audioData = { uk: null, us: null, general: null, text: data.phonetic || "" };
            
            let bestGeneralAudio = null;

            if (data.phonetics && data.phonetics.length > 0) {
                data.phonetics.forEach(ph => {
                    const text = ph.text || data.phonetic;
                    const audio = ph.audio;
                    
                    if (audio) {
                        bestGeneralAudio = audio; // Fallback
                        
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
                            generalPhonetic.textContent = text || "";
                        }
                    }
                });
            }

            // Fallback for general block
            if (!audioData.uk && !audioData.us) {
                generalBlock.classList.remove('hidden');
                generalPhonetic.textContent = audioData.text;
                audioData.general = bestGeneralAudio;
            }

            meaningsContainer.innerHTML = '';
            
            data.meanings.forEach(meaning => {
                const section = document.createElement('div');
                section.className = 'mb-8';
                
                // Cambridge style part-of-speech block (Blue rectangle)
                section.innerHTML = `
                    <div class="mb-4">
                        <span class="inline-block bg-[#002147] text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-sm shadow-sm">
                            ${meaning.partOfSpeech}
                        </span>
                    </div>
                `;

                const defContainer = document.createElement('div');
                defContainer.className = 'space-y-5 pl-2 sm:pl-4';
                
                meaning.definitions.forEach((def, index) => {
                    const defBlock = document.createElement('div');
                    defBlock.className = 'flex gap-3';
                    
                    // Numbering
                    const number = document.createElement('div');
                    number.className = 'flex-shrink-0 w-6 h-6 bg-gray-200 text-gray-700 text-xs font-bold rounded-full flex items-center justify-center mt-0.5';
                    number.textContent = index + 1;
                    
                    const content = document.createElement('div');
                    
                    // Definition text
                    const defText = document.createElement('p');
                    defText.className = 'text-gray-900 font-semibold mb-1 leading-snug';
                    defText.textContent = def.definition;
                    content.appendChild(defText);
                    
                    // Example (Cambridge style: indented, italic, dark gray border)
                    if (def.example) {
                        const example = document.createElement('p');
                        example.className = 'text-gray-600 italic text-sm pl-3 border-l-2 border-gray-300 mt-2';
                        example.textContent = def.example;
                        content.appendChild(example);
                    }

                    defBlock.appendChild(number);
                    defBlock.appendChild(content);
                    defContainer.appendChild(defBlock);
                });
                
                section.appendChild(defContainer);

                // Synonyms (Clean comma separated list)
                if (meaning.synonyms && meaning.synonyms.length > 0) {
                    const synDiv = document.createElement('div');
                    synDiv.className = 'mt-4 pl-9 text-sm text-gray-700';
                    synDiv.innerHTML = `<span class="font-bold text-[#002147]">Synonyms:</span> `;
                    
                    meaning.synonyms.slice(0, 8).forEach((syn, i, arr) => {
                        const span = document.createElement('span');
                        span.className = 'text-blue-600 hover:underline cursor-pointer';
                        span.textContent = syn;
                        span.onclick = () => {
                            searchInput.value = syn;
                            searchForm.dispatchEvent(new Event('submit'));
                            window.scrollTo(0,0);
                        };
                        synDiv.appendChild(span);
                        if (i < arr.length - 1) {
                            synDiv.appendChild(document.createTextNode(', '));
                        }
                    });
                    section.appendChild(synDiv);
                }

                meaningsContainer.appendChild(section);
            });

            showView(resultContent);
        }

        function autoPlayBestAudio() {
            // Priority: US -> UK -> General -> TTS Fallback
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
                    console.warn("Audio element failed, using TTS fallback.");
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
                    // Look for a native quality voice
                    const goodVoice = voices.find(v => v.name.includes('Google US') || v.name.includes('Samantha') || (v.lang === 'en-US' && v.localService));
                    if (goodVoice) utterance.voice = goodVoice;
                }

                window.speechSynthesis.speak(utterance);
            }
        }

        // Preload voices
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
