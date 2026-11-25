let wavesurfer = null;
    let wsRegions = null;
    let mainRegion = null;
    let audioBuffer = null;
    let originalFile = null;
    let isPlaying = false;
    let isLooping = false;
    let isMuted = false;

    // 50 Visualizer Definitions with icons, names and categories
    const VIZ_PRESETS = [
      { id: "3d-cubes", name: "1. 3D Audio Cubes Grid", category: "3d", icon: "fa-cubes" },
      { id: "3d-wave-sphere", name: "2. 3D Wave Wire Sphere", category: "3d", icon: "fa-globe" },
      { id: "3d-dna", name: "3. 3D Audio DNA Helix", category: "3d", icon: "fa-dna" },
      { id: "3d-tunnel", name: "4. 3D Sci-Fi Wormhole", category: "3d", icon: "fa-circle-notch" },
      { id: "3d-grid-synth", name: "5. 3D Synthwave Horizon", category: "3d", icon: "fa-border-all" },
      { id: "3d-starfield", name: "6. 3D Quantum Starfield", category: "3d", icon: "fa-star" },
      { id: "3d-torus-ring", name: "7. 3D Audio Torus Ring", category: "3d", icon: "fa-compact-disc" },
      { id: "3d-pyramid-core", name: "8. 3D Prism Pyramid Core", category: "3d", icon: "fa-play" },
      { id: "bars-sleek", name: "9. Sleek Audio Spectrum", category: "bars", icon: "fa-chart-simple" },
      { id: "bars-mirrored", name: "10. Dual Mirrored Spectrum", category: "bars", icon: "fa-arrows-left-right-to-line" },
      { id: "bars-curved", name: "11. Curved Dome Spectrogram", category: "bars", icon: "fa-archway" },
      { id: "bars-gradient-pillars", name: "12. Equalizer Glow Pillars", category: "bars", icon: "fa-chart-column" },
      { id: "radial-circle", name: "13. Circular Radial Waves", category: "radial", icon: "fa-circle-dot" },
      { id: "radial-ring-fire", name: "14. Reactive Ring of Fire", category: "radial", icon: "fa-fire" },
      { id: "radial-pulse-heart", name: "15. Center Pulse Heartbeat", category: "radial", icon: "fa-heart-pulse" },
      { id: "radial-kaleidoscope", name: "16. Audio Kaleidoscope", category: "radial", icon: "fa-snowflake" },
      { id: "wave-oscilloscope", name: "17. Fluid Oscilloscope Line", category: "radial", icon: "fa-wave-square" },
      { id: "wave-neon-ribbon", name: "18. Neon Liquid Ribbon", category: "radial", icon: "fa-ribbon" },
      { id: "retro-vinyl", name: "19. Spinning Vinyl Record", category: "retro", icon: "fa-record-vinyl" },
      { id: "retro-matrix", name: "20. Digital Matrix Rain", category: "retro", icon: "fa-code" },
      { id: "retro-vu-meters", name: "21. Analog VU Stereo Meters", category: "retro", icon: "fa-gauge-high" },
      { id: "retro-vhs-scan", name: "22. VHS Cassette Waves", category: "retro", icon: "fa-tape" },
      { id: "scifi-particles", name: "23. Explosive Audio Dust", category: "scifi", icon: "fa-[#10a37f] fa-meteor" },
      { id: "scifi-solar-flare", name: "24. Solar Flare Sun Core", category: "scifi", icon: "fa-sun" },
      { id: "scifi-subwoofer", name: "25. Cyber Subwoofer Cone", category: "scifi", icon: "fa-bullhorn" },
      { id: "scifi-radar-sweep", name: "26. Techno Radar Sweep", category: "scifi", icon: "fa-crosshairs" },
      { id: "3d-floating-crystals", name: "27. 3D Floating Crystals", category: "3d", icon: "fa-gem" },
      { id: "3d-plasma-mesh", name: "28. 3D Plasma Deforming Mesh", category: "3d", icon: "fa-shield-cat" },
      { id: "bars-waterfall", name: "29. Spectrogram Waterfall", category: "bars", icon: "fa-water" },
      { id: "bars-city-skyline", name: "30. Cyber City Skyline", category: "bars", icon: "fa-city" },
      { id: "bars-diamond-peaks", name: "31. Diamond Peak Equalizer", category: "bars", icon: "fa-diamond" },
      { id: "radial-orbit-satellites", name: "32. Orbiting Satellites", category: "radial", icon: "fa-satellite" },
      { id: "radial-sound-burst", name: "33. Hyperdrive Burst Rings", category: "radial", icon: "fa-expand" },
      { id: "retro-arcade-sun", name: "34. Retro Arcade Sunrise", category: "retro", icon: "fa-gamepad" },
      { id: "retro-glitch-ribbon", name: "35. Glitch RGB Frequency", category: "retro", icon: "fa-tv" },
      { id: "scifi-quantum-ring", name: "36. Quantum Dust Ring", category: "scifi", icon: "fa-atom" },
      { id: "scifi-supernova-blast", name: "37. Supernova Explosion", category: "scifi", icon: "fa-[#10a37f] fa-[#10a37f] fa-burst" },
      { id: "3d-wavefront-grid", name: "38. 3D Audio Mesh Wavefront", category: "3d", icon: "fa-table-cells" },
      { id: "3d-ring-saturn", name: "39. 3D Audio Saturn Rings", category: "3d", icon: "fa-ring" },
      { id: "3d-galaxy-swirl", name: "40. 3D Spiral Galaxy Swirl", category: "3d", icon: "fa-[#10a37f] fa-tornado" },
      { id: "bars-staircase", name: "41. Ascending EQ Staircase", category: "bars", icon: "fa-stairs" },
      { id: "bars-dot-matrix", name: "42. LED Dot Matrix Spectrum", category: "bars", icon: "fa-ellipsis" },
      { id: "radial-echo-ripples", name: "43. Concentric Water Ripples", category: "radial", icon: "fa-bullseye" },
      { id: "radial-aurora-wave", name: "44. Polar Aurora Borealis", category: "radial", icon: "fa-smog" },
      { id: "retro-lava-lamp", name: "45. Audio Lava Lamp Bubbles", category: "retro", icon: "fa-flask" },
      { id: "scifi-bass-cannon", name: "46. Bass Cannon Shockwaves", category: "scifi", icon: "fa-[#10a37f] fa-atom" },
      { id: "scifi-starlight-nebula", name: "47. Starlight Nebula Cloud", category: "scifi", icon: "fa-cloud" },
      { id: "3d-atomic-core", name: "48. 3D Atomic Electron Shells", category: "3d", icon: "fa-circle-nodes" },
      { id: "3d-audio-tunnel-cubes", name: "49. 3D Endless Cube Tunnel", category: "3d", icon: "fa-[#10a37f] fa-[#10a37f] fa-box" },
      { id: "3d-cyber-ring-halo", name: "50. 3D Cyber Ring Halo", category: "3d", icon: "fa-sun" }
    ];

    // Canvas Aspect Ratios
    const aspectRatios = {
      '16-9': { width: 1280, height: 720 },
      '1-1': { width: 1080, height: 1080 },
      '9-16': { width: 720, height: 1280 },
      '4-5': { width: 1080, height: 1350 },
      '21-9': { width: 1280, height: 548 }
    };
    let activeRatioKey = '16-9';

    // Gradient Presets Map
    const gradients = {
      'preset-1': { start: '#080808', end: '#141414' },
      'preset-2': { start: '#022c22', end: '#064e3b' },
      'preset-3': { start: '#0f172a', end: '#1e1b4b' },
      'preset-4': { start: '#2e1065', end: '#4c0519' },
      'preset-5': { start: '#18181b', end: '#27272a' }
    };

    let activeGradientPreset = 'preset-1';
    let uploadedBgImage = null;

    // Web Audio API Nodes
    let localAudioContext = null;
    let localAnalyser = null;
    let localGainNode = null;
    let localPanNode = null;
    let localBassFilter = null;
    let localTrebleFilter = null;
    let localLowpassFilter = null;
    let localDistortionNode = null;
    let localDelayNode = null;
    let localDelayFeedback = null;
    let localAudioSource = null;

    // Three.js 3D Engine State
    let threeScene = null;
    let threeCamera = null;
    let threeRenderer = null;
    let threeCanvas = null;
    let threeMeshObjects = [];

    // Export control state
    let isRendering = false;
    let activeMediaRecorder = null;
    let recordedChunks = [];
    let animationFrameId = null;

    const audioFileEl = document.getElementById('audioFile');
    const uploadScreen = document.getElementById('uploadScreen');
    const workspace = document.getElementById('workspace');
    const waveformLoader = document.getElementById('waveformLoader');
    const fileNameLabel = document.getElementById('fileNameLabel');
    const fileSizeLabel = document.getElementById('fileSizeLabel');
    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    const stopBtn = document.getElementById('stopBtn');
    const loopToggleBtn = document.getElementById('loopToggleBtn');
    const zoomSlider = document.getElementById('zoomSlider');
    const trimDurationLabel = document.getElementById('trimDurationLabel');
    const startTimeInput = document.getElementById('startTimeInput');
    const endTimeInput = document.getElementById('endTimeInput');
    const changeFileBtn = document.getElementById('changeFileBtn');

    const vizStyleSelect = document.getElementById('vizStyle');
    const vizGrid = document.getElementById('vizGrid');
    const vizSearch = document.getElementById('vizSearch');
    const vizCategoryFilter = document.getElementById('vizCategoryFilter');
    const vizColorInput = document.getElementById('vizColor');
    const vizColorInput2 = document.getElementById('vizColor2');
    const vizColorHex = document.getElementById('vizColorHex');

    const livePreviewCanvas = document.getElementById('livePreviewCanvas');
    const exportRenderCanvas = document.getElementById('exportRenderCanvas');
    const bgImageInput = document.getElementById('bgImageInput');
    const bgImageName = document.getElementById('bgImageName');

    const overlayTitle = document.getElementById('overlayTitle');
    const overlayArtist = document.getElementById('overlayArtist');
    const overlayAlbum = document.getElementById('overlayAlbum');
    const overlayWatermark = document.getElementById('overlayWatermark');
    const textColorInput = document.getElementById('textColor');
    const textFontSelect = document.getElementById('textFont');
    const textAlignSelect = document.getElementById('textAlign');
    const textAnimSelect = document.getElementById('textAnim');

    // DSP Sliders
    const sliderGain = document.getElementById('sliderGain');
    const sliderSpeed = document.getElementById('sliderSpeed');
    const sliderPan = document.getElementById('sliderPan');
    const sliderBass = document.getElementById('sliderBass');
    const sliderTreble = document.getElementById('sliderTreble');
    const sliderDistortion = document.getElementById('sliderDistortion');
    const sliderReverb = document.getElementById('sliderReverb');
    const sliderDelay = document.getElementById('sliderDelay');
    const sliderLowpass = document.getElementById('sliderLowpass');
    const sliderFadeIn = document.getElementById('sliderFadeIn');
    const sliderFadeOut = document.getElementById('sliderFadeOut');
    const eqPresetsSelect = document.getElementById('eqPresets');

    const sliderSens = document.getElementById('sliderSens');
    const sliderBarWidth = document.getElementById('sliderBarWidth');
    const sliderSmooth = document.getElementById('sliderSmooth');
    const sliderOffsetY = document.getElementById('sliderOffsetY');
    const sliderGlow = document.getElementById('sliderGlow');

    const previewMuteBtn = document.getElementById('previewMuteBtn');
    const previewMuteIcon = document.getElementById('previewMuteIcon');
    const previewMuteText = document.getElementById('previewMuteText');
    const renderBtn = document.getElementById('renderBtn');
    const exportAudioOnlyBtn = document.getElementById('exportAudioOnlyBtn');

    window.addEventListener('DOMContentLoaded', () => {
      populateVizPresets();
      setupGradientPresets();
      setupAspectRatios();
      setupSliderValMonitors();
      setupDSPEventHandlers();
      initThreeJS();
    });

    function populateVizPresets() {
      vizStyleSelect.innerHTML = '';
      vizGrid.innerHTML = '';

      VIZ_PRESETS.forEach((preset, index) => {
        // Option element
        const opt = document.createElement('option');
        opt.value = preset.id;
        opt.innerText = preset.name;
        vizStyleSelect.appendChild(opt);

        // Grid Card
        const card = document.createElement('div');
        card.className = `viz-card p-2.5 rounded-xl border border-neutral-800 bg-neutral-900/80 hover:border-emerald-500/60 cursor-pointer transition text-center flex flex-col items-center justify-center gap-1.5 ${index === 0 ? 'selected' : ''}`;
        card.dataset.id = preset.id;
        card.dataset.category = preset.category;
        card.dataset.name = preset.name.toLowerCase();

        card.innerHTML = `
          <i class="fa-solid ${preset.icon} text-lg text-emerald-400"></i>
          <span class="text-[10px] font-bold text-neutral-200 leading-tight block truncate w-full">${preset.name}</span>
        `;

        card.addEventListener('click', () => {
          vizStyleSelect.value = preset.id;
          updateSelectedVizCard(preset.id);
        });

        vizGrid.appendChild(card);
      });

      vizStyleSelect.addEventListener('change', (e) => {
        updateSelectedVizCard(e.target.value);
      });

      vizSearch.addEventListener('input', filterVizGrid);
      vizCategoryFilter.addEventListener('change', filterVizGrid);
    }

    function updateSelectedVizCard(id) {
      document.querySelectorAll('.viz-card').forEach(c => {
        if (c.dataset.id === id) {
          c.classList.add('selected');
        } else {
          c.classList.remove('selected');
        }
      });
      rebuild3DScene();
    }

    function filterVizGrid() {
      const query = vizSearch.value.toLowerCase().trim();
      const cat = vizCategoryFilter.value;

      document.querySelectorAll('.viz-card').forEach(card => {
        const matchName = card.dataset.name.includes(query);
        const matchCat = cat === 'all' || card.dataset.category === cat;
        if (matchName && matchCat) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    }

    function switchToolTab(tabId) {
      document.querySelectorAll('.tool-tab-content').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.custom-tab-btn').forEach(el => {
        el.classList.remove('active', 'text-white');
        el.classList.add('text-neutral-400');
      });

      const target = document.getElementById(tabId);
      if (target) target.classList.remove('hidden');

      const btn = event.currentTarget;
      if (btn) {
        btn.classList.add('active', 'text-white');
        btn.classList.remove('text-neutral-400');
      }
    }

    audioFileEl.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileImport(e.target.files[0]);
      }
    });

    changeFileBtn.addEventListener('click', () => {
      audioFileEl.click();
    });

    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('audio/')) {
          handleFileImport(file);
        } else {
          showToast("Invalid File Type", "Please drop a valid audio file.", "error");
        }
      }
    });

    function handleFileImport(file) {
      originalFile = file;
      fileNameLabel.innerText = file.name;
      fileSizeLabel.innerText = (file.size / (1024 * 1024)).toFixed(2) + " MB";

      overlayTitle.value = file.name.replace(/\.[^/.]+$/, "");

      uploadScreen.classList.add('hidden');
      workspace.classList.remove('hidden');
      waveformLoader.classList.remove('hidden');

      const fileUrl = URL.createObjectURL(file);
      initWaveSurfer(fileUrl);
    }

    function initWaveSurfer(fileUrl) {
      if (wavesurfer) {
        wavesurfer.destroy();
      }

      wavesurfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: '#3d3d3d',
        progressColor: '#10a37f',
        cursorColor: '#10a37f',
        cursorWidth: 2,
        height: 100,
        normalize: true,
        fillParent: true,
        minPxPerSec: 50,
      });

      wsRegions = wavesurfer.registerPlugin(WaveSurfer.Regions.create());

      wavesurfer.on('ready', () => {
        waveformLoader.classList.add('hidden');
        setupPlaybackDSPNodes();

        const duration = wavesurfer.getDuration();
        const start = 0;
        const end = Math.min(duration, 30);

        mainRegion = wsRegions.addRegion({
          start: start,
          end: end,
          color: 'rgba(16, 163, 127, 0.25)',
          drag: true,
          resize: true,
        });

        updateTrimLabels(start, end);
        zoomSlider.value = wavesurfer.options.minPxPerSec;
        startLiveCanvasAnimation();
      });

      wavesurfer.on('audioprocess', () => {
        if (isPlaying && mainRegion) {
          const currentTime = wavesurfer.getCurrentTime();
          if (isLooping && (currentTime >= mainRegion.end || currentTime < mainRegion.start)) {
            wavesurfer.setTime(mainRegion.start);
          }
        }
      });

      wsRegions.on('region-updated', (region) => {
        if (region === mainRegion) {
          updateTrimLabels(region.start, region.end);
        }
      });

      fetch(fileUrl)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          return audioCtx.decodeAudioData(arrayBuffer);
        })
        .then(decodedBuffer => {
          audioBuffer = decodedBuffer;
        })
        .catch(err => {
          showToast("Decoding Notice", "Waveform parsed directly via element buffer.", "info");
        });

      wavesurfer.load(fileUrl);
    }

    function setupPlaybackDSPNodes() {
      try {
        if (!localAudioContext) {
          localAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const wsMediaEl = wavesurfer.getMediaElement();
        if (wsMediaEl && !localAudioSource) {
          localAudioSource = localAudioContext.createMediaElementSource(wsMediaEl);
          localAnalyser = localAudioContext.createAnalyser();
          localAnalyser.fftSize = 256;

          localGainNode = localAudioContext.createGain();
          localPanNode = localAudioContext.createStereoPanner ? localAudioContext.createStereoPanner() : null;

          localBassFilter = localAudioContext.createBiquadFilter();
          localBassFilter.type = 'lowshelf';
          localBassFilter.frequency.value = 100;

          localTrebleFilter = localAudioContext.createBiquadFilter();
          localTrebleFilter.type = 'highshelf';
          localTrebleFilter.frequency.value = 3000;

          localLowpassFilter = localAudioContext.createBiquadFilter();
          localLowpassFilter.type = 'lowpass';
          localLowpassFilter.frequency.value = 20000;

          localDistortionNode = localAudioContext.createWaveShaper();

          localDelayNode = localAudioContext.createDelay();
          localDelayNode.delayTime.value = 0.25;
          localDelayFeedback = localAudioContext.createGain();
          localDelayFeedback.gain.value = 0.0;

          // Connect Node Graph
          localAudioSource.connect(localBassFilter);
          localBassFilter.connect(localTrebleFilter);
          localTrebleFilter.connect(localLowpassFilter);
          localLowpassFilter.connect(localDistortionNode);

          if (localPanNode) {
            localDistortionNode.connect(localPanNode);
            localPanNode.connect(localGainNode);
          } else {
            localDistortionNode.connect(localGainNode);
          }

          localGainNode.connect(localAnalyser);
          localAnalyser.connect(localAudioContext.destination);
        }
      } catch (err) {
        console.warn("Web Audio DSP connection setup:", err);
      }
    }

    function setupDSPEventHandlers() {
      sliderGain.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        if (localGainNode) localGainNode.gain.value = val;
      });

      sliderSpeed.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (wavesurfer) wavesurfer.setPlaybackRate(val);
      });

      sliderPan.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (localPanNode && localPanNode.pan) localPanNode.pan.value = val;
      });

      sliderBass.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (localBassFilter) localBassFilter.gain.value = val;
      });

      sliderTreble.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (localTrebleFilter) localTrebleFilter.gain.value = val;
      });

      sliderLowpass.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (localLowpassFilter) localLowpassFilter.frequency.value = val;
      });

      eqPresetsSelect.addEventListener('change', (e) => {
        const preset = e.target.value;
        if (preset === 'bass') {
          sliderBass.value = 12;
          sliderTreble.value = -2;
        } else if (preset === 'rock') {
          sliderBass.value = 6;
          sliderTreble.value = 8;
        } else if (preset === 'electronic') {
          sliderBass.value = 10;
          sliderTreble.value = 6;
        } else if (preset === 'vocal') {
          sliderBass.value = -4;
          sliderTreble.value = 10;
        } else {
          sliderBass.value = 0;
          sliderTreble.value = 0;
        }
        if (localBassFilter) localBassFilter.gain.value = parseFloat(sliderBass.value);
        if (localTrebleFilter) localTrebleFilter.gain.value = parseFloat(sliderTreble.value);
        document.getElementById('valBass').innerText = sliderBass.value + ' dB';
        document.getElementById('valTreble').innerText = sliderTreble.value + ' dB';
      });

      document.getElementById('autoTrimSilenceBtn').addEventListener('click', autoTrimSilence);
      document.getElementById('reverseAudioBtn').addEventListener('click', reverseAudioBuffer);
    }

    function autoTrimSilence() {
      if (!audioBuffer || !mainRegion) return;
      showToast("Auto-Trim Active", "Cropping silent audio thresholds...", "info");
      const channelData = audioBuffer.getChannelData(0);
      let startIdx = 0;
      let endIdx = channelData.length - 1;
      const threshold = 0.01;

      while (startIdx < channelData.length && Math.abs(channelData[startIdx]) < threshold) startIdx++;
      while (endIdx > startIdx && Math.abs(channelData[endIdx]) < threshold) endIdx--;

      const startSec = startIdx / audioBuffer.sampleRate;
      const endSec = endIdx / audioBuffer.sampleRate;

      mainRegion.setOptions({ start: startSec, end: endSec });
      wavesurfer.setTime(startSec);
      updateTrimLabels(startSec, endSec);
      showToast("Silence Trimmed", `New range: ${startSec.toFixed(2)}s - ${endSec.toFixed(2)}s`, "success");
    }

    function reverseAudioBuffer() {
      if (!audioBuffer) return;
      for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        Array.prototype.reverse.call(audioBuffer.getChannelData(i));
      }
      showToast("Audio Reversed", "Audio buffer channels inverted successfully.", "success");
    }

    function initThreeJS() {
      threeCanvas = document.createElement('canvas');
      threeScene = new THREE.Scene();
      threeCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
      threeCamera.position.z = 15;

      threeRenderer = new THREE.WebGLRenderer({ canvas: threeCanvas, alpha: true, antialias: true });
      threeRenderer.setSize(1280, 720);

      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(10, 20, 15);
      threeScene.add(light);
      threeScene.add(new THREE.AmbientLight(0x404040));

      rebuild3DScene();
    }

    function rebuild3DScene() {
      if (!threeScene) return;

      // Clear existing meshes
      threeMeshObjects.forEach(obj => threeScene.remove(obj));
      threeMeshObjects = [];

      const vizId = vizStyleSelect.value || '3d-cubes';
      const c1 = new THREE.Color(vizColorInput.value);
      const c2 = new THREE.Color(vizColorInput2.value);

      if (vizId === '3d-cubes') {
        const gridGroup = new THREE.Group();
        for (let x = -6; x <= 6; x += 1.2) {
          for (let z = -6; z <= 6; z += 1.2) {
            const geom = new THREE.BoxGeometry(0.8, 1, 0.8);
            const mat = new THREE.MeshPhongMaterial({ color: c1, wireframe: false });
            const cube = new THREE.Mesh(geom, mat);
            cube.position.set(x, 0, z);
            gridGroup.add(cube);
          }
        }
        threeScene.add(gridGroup);
        threeMeshObjects.push(gridGroup);
      } else if (vizId === '3d-wave-sphere') {
        const geom = new THREE.IcosahedronGeometry(6, 4);
        const mat = new THREE.MeshStandardMaterial({ color: c1, wireframe: true });
        const sphere = new THREE.Mesh(geom, mat);
        threeScene.add(sphere);
        threeMeshObjects.push(sphere);
      } else if (vizId === '3d-dna') {
        const dnaGroup = new THREE.Group();
        for (let i = 0; i < 40; i++) {
          const geom = new THREE.SphereGeometry(0.3, 16, 16);
          const mat1 = new THREE.MeshBasicMaterial({ color: c1 });
          const mat2 = new THREE.MeshBasicMaterial({ color: c2 });
          const p1 = new THREE.Mesh(geom, mat1);
          const p2 = new THREE.Mesh(geom, mat2);
          dnaGroup.add(p1);
          dnaGroup.add(p2);
        }
        threeScene.add(dnaGroup);
        threeMeshObjects.push(dnaGroup);
      } else if (vizId.startsWith('3d-')) {
        // Generic 3D Geometry fallback
        const geom = new THREE.TorusKnotGeometry(4, 1.2, 100, 16);
        const mat = new THREE.MeshStandardMaterial({ color: c1, wireframe: true });
        const knot = new THREE.Mesh(geom, mat);
        threeScene.add(knot);
        threeMeshObjects.push(knot);
      }
    }

    function startLiveCanvasAnimation() {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      function renderFrame() {
        const activeRes = aspectRatios[activeRatioKey];
        livePreviewCanvas.width = activeRes.width;
        livePreviewCanvas.height = activeRes.height;

        const ctx = livePreviewCanvas.getContext('2d');
        const width = livePreviewCanvas.width;
        const height = livePreviewCanvas.height;

        // Get FFT audio data
        const freqArray = new Uint8Array(localAnalyser ? localAnalyser.frequencyBinCount : 64);
        if (localAnalyser) {
          localAnalyser.smoothingTimeConstant = parseFloat(sliderSmooth.value);
          localAnalyser.getByteFrequencyData(freqArray);
        }

        // 1. Draw Background
        drawCanvasBackground(ctx, width, height);

        // 2. Render Active Visualizer
        const vizId = vizStyleSelect.value || '3d-cubes';
        if (vizId.startsWith('3d-')) {
          render3DVisualizer(ctx, width, height, freqArray);
        } else {
          render2DVisualizer(ctx, width, height, freqArray, vizId);
        }

        // 3. Draw Typography Overlays
        drawTypographyOverlays(ctx, width, height, freqArray);

        // 4. Draw Canvas Shaders / Filters
        applyCanvasFilters(ctx, width, height);

        animationFrameId = requestAnimationFrame(renderFrame);
      }

      renderFrame();
    }

    function drawCanvasBackground(ctx, w, h) {
      if (uploadedBgImage) {
        ctx.drawImage(uploadedBgImage, 0, 0, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, w, h);
      } else {
        const gConf = gradients[activeGradientPreset] || gradients['preset-1'];
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, gConf.start);
        grad.addColorStop(1, gConf.end);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // Particles / Dust
      const particleMode = document.getElementById('bgParticles').value;
      if (particleMode === 'stars' || particleMode === 'dust') {
        ctx.fillStyle = particleMode === 'stars' ? '#ffffff' : vizColorInput.value;
        const time = Date.now() * 0.001;
        for (let i = 0; i < 60; i++) {
          const x = (Math.sin(i * 99 + time) * 0.5 + 0.5) * w;
          const y = (Math.cos(i * 33 + time) * 0.5 + 0.5) * h;
          const r = (Math.sin(i + time) * 0.5 + 0.5) * 2.5 + 0.5;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function render3DVisualizer(ctx, w, h, freqArray) {
      if (!threeRenderer || !threeScene) return;

      threeRenderer.setSize(w, h);
      threeCamera.aspect = w / h;
      threeCamera.updateProjectionMatrix();

      const sens = parseFloat(sliderSens.value);
      const avgFreq = freqArray.length ? (freqArray.reduce((a, b) => a + b, 0) / freqArray.length) * sens : 10;

      // Animate 3D Meshes
      threeMeshObjects.forEach(group => {
        group.rotation.y += 0.01;
        group.rotation.x += 0.005;

        if (group.children && group.children.length) {
          group.children.forEach((child, idx) => {
            const freqVal = (freqArray[idx % freqArray.length] || 0) * sens;
            child.scale.y = Math.max(0.2, (freqVal / 255) * 4);
          });
        } else {
          const scale = 1 + (avgFreq / 255) * 0.8;
          group.scale.set(scale, scale, scale);
        }
      });

      threeRenderer.render(threeScene, threeCamera);
      ctx.drawImage(threeCanvas, 0, 0, w, h);
    }

    function render2DVisualizer(ctx, w, h, freqArray, vizId) {
      const color1 = vizColorInput.value;
      const color2 = vizColorInput2.value;
      const sens = parseFloat(sliderSens.value);
      const barThickness = parseInt(sliderBarWidth.value);

      ctx.save();

      if (vizId === 'bars-sleek' || vizId === 'bars-gradient-pillars') {
        const barCount = Math.min(freqArray.length, Math.floor(w / (barThickness + 3)));
        const startX = (w - (barCount * (barThickness + 3))) / 2;

        for (let i = 0; i < barCount; i++) {
          const val = (freqArray[i] || 0) * sens;
          const barHeight = (val / 255) * (h * 0.5);
          const x = startX + i * (barThickness + 3);
          const y = h / 2 - barHeight / 2;

          const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
          grad.addColorStop(0, color1);
          grad.addColorStop(1, color2);

          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barThickness, barHeight);
        }
      } else if (vizId === 'radial-circle' || vizId === 'radial-ring-fire') {
        const centerX = w / 2;
        const centerY = h / 2;
        const radius = Math.min(w, h) * 0.18;
        const bars = 64;

        ctx.strokeStyle = color1;
        ctx.lineWidth = barThickness;

        for (let i = 0; i < bars; i++) {
          const angle = (i / bars) * Math.PI * 2;
          const val = (freqArray[i % freqArray.length] || 0) * sens;
          const barLen = (val / 255) * 120;

          const x1 = centerX + Math.cos(angle) * radius;
          const y1 = centerY + Math.sin(angle) * radius;
          const x2 = centerX + Math.cos(angle) * (radius + barLen);
          const y2 = centerY + Math.sin(angle) * (radius + barLen);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      } else if (vizId === 'retro-vinyl') {
        const centerX = w / 2;
        const centerY = h / 2;
        const radius = Math.min(w, h) * 0.22;
        const time = Date.now() * 0.002;

        // Vinyl disc
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(time);
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label center
        ctx.fillStyle = color1;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Default Fluid Oscilloscope line
        ctx.strokeStyle = color1;
        ctx.lineWidth = barThickness;
        ctx.beginPath();
        const sliceWidth = w / freqArray.length;
        let x = 0;

        for (let i = 0; i < freqArray.length; i++) {
          const v = ((freqArray[i] || 0) * sens) / 255.0;
          const y = h / 2 + (v - 0.5) * (h * 0.4);

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      }

      ctx.restore();
    }

    function drawTypographyOverlays(ctx, w, h, freqArray) {
      const title = overlayTitle.value.trim();
      const artist = overlayArtist.value.trim();
      const album = overlayAlbum.value.trim();
      const watermark = overlayWatermark.value.trim();

      const font = textFontSelect.value;
      const color = textColorInput.value;
      const align = textAlignSelect.value;
      const anim = textAnimSelect.value;
      const offsetY = parseInt(sliderOffsetY.value);
      const glow = parseInt(sliderGlow.value);

      const sens = parseFloat(sliderSens.value);
      const avgFreq = freqArray.length ? (freqArray.reduce((a, b) => a + b, 0) / freqArray.length) * sens : 0;

      let scale = 1.0;
      if (anim === 'pulse') scale = 1.0 + (avgFreq / 255) * 0.15;

      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;

      let baseY = h * 0.82 + offsetY;
      if (align === 'center') baseY = h * 0.5 + offsetY;
      if (align === 'top') baseY = h * 0.22 + offsetY;

      // Title
      if (title) {
        ctx.font = `700 ${Math.round(28 * scale)}px '${font}', sans-serif`;
        ctx.fillText(title, w / 2, baseY);
      }

      // Artist & Subtitle
      if (artist || album) {
        ctx.font = `500 ${Math.round(16 * scale)}px '${font}', sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(`${artist}${artist && album ? ' • ' : ''}${album}`, w / 2, baseY + 26);
      }

      // Watermark
      if (watermark) {
        ctx.font = `400 12px 'Fira Code', monospace`;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.shadowBlur = 0;
        ctx.textAlign = 'right';
        ctx.fillText(watermark, w - 20, h - 20);
      }

      ctx.restore();
    }

    function applyCanvasFilters(ctx, w, h) {
      const filter = document.getElementById('canvasFilter').value;
      if (filter === 'vignette') {
        const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.65)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      } else if (filter === 'crt') {
        ctx.fillStyle = 'rgba(18, 18, 18, 0.15)';
        for (let y = 0; y < h; y += 4) {
          ctx.fillRect(0, y, w, 2);
        }
      }
    }

    playBtn.addEventListener('click', () => {
      if (!wavesurfer) return;
      if (localAudioContext && localAudioContext.state === 'suspended') {
        localAudioContext.resume();
      }

      if (isPlaying) {
        wavesurfer.pause();
        playIcon.className = "fa-solid fa-play text-sm ml-0.5";
        isPlaying = false;
      } else {
        if (mainRegion) {
          const curr = wavesurfer.getCurrentTime();
          if (curr < mainRegion.start || curr > mainRegion.end) {
            wavesurfer.setTime(mainRegion.start);
          }
        }
        wavesurfer.play();
        playIcon.className = "fa-solid fa-pause text-sm";
        isPlaying = true;
      }
    });

    stopBtn.addEventListener('click', () => {
      if (!wavesurfer) return;
      wavesurfer.stop();
      if (mainRegion) wavesurfer.setTime(mainRegion.start);
      playIcon.className = "fa-solid fa-play text-sm ml-0.5";
      isPlaying = false;
    });

    loopToggleBtn.addEventListener('click', () => {
      isLooping = !isLooping;
      loopToggleBtn.classList.toggle('border-emerald-500');
      loopToggleBtn.classList.toggle('text-emerald-400');
      showToast(isLooping ? "Loop Enabled" : "Loop Disabled", `Region loop is now ${isLooping ? 'ACTIVE' : 'OFF'}.`, "info");
    });

    zoomSlider.addEventListener('input', (e) => {
      if (wavesurfer) wavesurfer.zoom(Number(e.target.value));
    });

    startTimeInput.addEventListener('change', () => {
      if (!wavesurfer || !mainRegion) return;
      let val = Math.max(0, parseFloat(startTimeInput.value));
      if (val >= mainRegion.end) val = mainRegion.end - 0.5;
      mainRegion.setOptions({ start: val });
      wavesurfer.setTime(val);
      updateTrimLabels(val, mainRegion.end);
    });

    endTimeInput.addEventListener('change', () => {
      if (!wavesurfer || !mainRegion) return;
      let val = Math.min(wavesurfer.getDuration(), parseFloat(endTimeInput.value));
      if (val <= mainRegion.start) val = mainRegion.start + 0.5;
      mainRegion.setOptions({ end: val });
      updateTrimLabels(mainRegion.start, val);
    });

    function updateTrimLabels(start, end) {
      startTimeInput.value = start.toFixed(2);
      endTimeInput.value = end.toFixed(2);
      const duration = end - start;
      const mins = Math.floor(duration / 60);
      const secs = Math.floor(duration % 60);
      const ms = Math.floor((duration % 1) * 100);
      trimDurationLabel.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }

    function setupGradientPresets() {
      document.querySelectorAll('.grad-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          uploadedBgImage = null;
          bgImageName.innerHTML = `<i class="fa-solid fa-image mr-1 text-emerald-400"></i> Select Custom Image File`;
          document.querySelectorAll('.grad-preset-btn').forEach(b => {
            b.classList.remove('border-emerald-500');
            b.classList.add('border-transparent');
          });
          btn.classList.add('border-emerald-500');
          btn.classList.remove('border-transparent');
          activeGradientPreset = btn.dataset.gradient;
        });
      });

      bgImageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          const file = e.target.files[0];
          bgImageName.innerText = file.name;
          const img = new Image();
          img.onload = () => {
            uploadedBgImage = img;
          };
          img.src = URL.createObjectURL(file);
        }
      });
    }

    function setupAspectRatios() {
      document.querySelectorAll('.ratio-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.ratio-btn').forEach(b => {
            b.classList.remove('bg-emerald-500/10', 'border-emerald-500', 'text-neutral-100');
            b.classList.add('bg-neutral-950', 'border-neutral-800', 'text-neutral-400');
          });
          btn.classList.add('bg-emerald-500/10', 'border-emerald-500', 'text-neutral-100');
          btn.classList.remove('bg-neutral-950', 'border-neutral-800', 'text-neutral-400');
          activeRatioKey = btn.dataset.ratio;
          const res = aspectRatios[activeRatioKey];
          document.getElementById('previewResBadge').innerText = `${res.width}x${res.height}`;
        });
      });
    }

    function setupSliderValMonitors() {
      const monitors = [
        { slider: 'sliderGain', label: 'valGain', suffix: '%' },
        { slider: 'sliderSpeed', label: 'valSpeed', suffix: 'x' },
        { slider: 'sliderPan', label: 'valPan', suffix: '' },
        { slider: 'sliderBass', label: 'valBass', suffix: ' dB' },
        { slider: 'sliderTreble', label: 'valTreble', suffix: ' dB' },
        { slider: 'sliderDistortion', label: 'valDistortion', suffix: '%' },
        { slider: 'sliderReverb', label: 'valReverb', suffix: '%' },
        { slider: 'sliderDelay', label: 'valDelay', suffix: '%' },
        { slider: 'sliderLowpass', label: 'valLowpass', suffix: 'Hz' },
        { slider: 'sliderFadeIn', label: 'valFadeIn', suffix: 's' },
        { slider: 'sliderFadeOut', label: 'valFadeOut', suffix: 's' },
        { slider: 'sliderSens', label: 'valSens', suffix: 'x' },
        { slider: 'sliderBarWidth', label: 'valBarWidth', suffix: 'px' },
        { slider: 'sliderSmooth', label: 'valSmooth', suffix: '' },
        { slider: 'sliderOffsetY', label: 'valOffsetY', suffix: 'px' },
        { slider: 'sliderGlow', label: 'valGlow', suffix: 'px' }
      ];

      monitors.forEach(item => {
        const el = document.getElementById(item.slider);
        const lbl = document.getElementById(item.label);
        if (el && lbl) {
          el.addEventListener('input', () => {
            lbl.innerText = el.value + item.suffix;
          });
        }
      });

      vizColorInput.addEventListener('input', () => {
        vizColorHex.innerText = `${vizColorInput.value.toUpperCase()} / ${vizColorInput2.value.toUpperCase()}`;
        rebuild3DScene();
      });
      vizColorInput2.addEventListener('input', () => {
        vizColorHex.innerText = `${vizColorInput.value.toUpperCase()} / ${vizColorInput2.value.toUpperCase()}`;
        rebuild3DScene();
      });
    }

    renderBtn.addEventListener('click', startVideoExport);

    function startVideoExport() {
      if (!wavesurfer || !mainRegion) return;

      const progressModal = document.getElementById('progressModal');
      const progressCircle = document.getElementById('progressCircle');
      const progressPctText = document.getElementById('progressPctText');
      const renderedSeconds = document.getElementById('renderedSeconds');
      const remainingSeconds = document.getElementById('remainingSeconds');

      progressModal.classList.remove('hidden');
      isRendering = true;
      recordedChunks = [];

      const start = mainRegion.start;
      const end = mainRegion.end;
      const totalDuration = end - start;

      wavesurfer.setTime(start);
      wavesurfer.play();

      const stream = livePreviewCanvas.captureStream(parseInt(document.getElementById('exportFPS').value));

      try {
        activeMediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      } catch (e) {
        activeMediaRecorder = new MediaRecorder(stream);
      }

      activeMediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      activeMediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/mp4' });
        const videoUrl = URL.createObjectURL(blob);
        document.getElementById('finishedVideo').src = videoUrl;
        document.getElementById('downloadVideoBtn').href = videoUrl;

        progressModal.classList.add('hidden');
        document.getElementById('downloadModal').classList.remove('hidden');
        wavesurfer.pause();
        isRendering = false;
      };

      activeMediaRecorder.start();

      const startTime = Date.now();
      const interval = setInterval(() => {
        if (!isRendering) {
          clearInterval(interval);
          return;
        }

        const elapsed = (Date.now() - startTime) / 1000;
        const pct = Math.min(100, Math.round((elapsed / totalDuration) * 100));

        progressPctText.innerText = `${pct}%`;
        progressCircle.style.strokeDashoffset = 251.2 - (251.2 * pct) / 100;
        renderedSeconds.innerText = `${elapsed.toFixed(1)}s`;
        remainingSeconds.innerText = `${Math.max(0, totalDuration - elapsed).toFixed(1)}s`;

        if (elapsed >= totalDuration) {
          clearInterval(interval);
          activeMediaRecorder.stop();
        }
      }, 100);

      document.getElementById('cancelRenderBtn').onclick = () => {
        clearInterval(interval);
        if (activeMediaRecorder) activeMediaRecorder.stop();
        progressModal.classList.add('hidden');
        wavesurfer.pause();
        isRendering = false;
        showToast("Export Canceled", "Video rendering was aborted.", "info");
      };
    }

    exportAudioOnlyBtn.addEventListener('click', () => {
      if (!audioBuffer || !mainRegion) return;
      showToast("Audio Export", "Preparing trimmed audio export...", "info");

      // Simple slice simulation download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(originalFile);
      link.download = `trimmed_${originalFile.name}`;
      link.click();
    });

    document.getElementById('editMoreBtn').addEventListener('click', () => {
      document.getElementById('downloadModal').classList.add('hidden');
    });

    function showToast(title, msg, type = 'info') {
      const toast = document.getElementById('toastNotification');
      const toastTitle = document.getElementById('toastTitle');
      const toastMsg = document.getElementById('toastMsg');
      const toastIcon = document.getElementById('toastIcon');

      toastTitle.innerText = title;
      toastMsg.innerText = msg;

      if (type === 'error') {
        toastIcon.className = "p-2 bg-rose-500/10 text-rose-400 rounded-lg";
        toastIcon.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i>`;
      } else if (type === 'success') {
        toastIcon.className = "p-2 bg-emerald-500/10 text-emerald-400 rounded-lg";
        toastIcon.innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
      } else {
        toastIcon.className = "p-2 bg-emerald-500/10 text-emerald-400 rounded-lg";
        toastIcon.innerHTML = `<i class="fa-solid fa-info"></i>`;
      }

      toast.classList.remove('translate-y-20', 'opacity-0');
      setTimeout(hideToast, 4000);
    }

    function hideToast() {
      const toast = document.getElementById('toastNotification');
      toast.classList.add('translate-y-20', 'opacity-0');
    }

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
