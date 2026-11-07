{
            "imports": {
                "three": "https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js",
                "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/",
                "fflate": "https://unpkg.com/fflate@0.8.0/esm/index.js"
            }
        }

import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
        import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

        // --- Core 3D Variables ---
        let scene, camera, renderer, controls;
        let clock = new THREE.Clock();

        // Cumulative Character & Animation State
        let currentModel = null;
        let mixer = null;
        let currentAction = null;
        // Updated state to handle velocities internally
        let animationData = []; // { id, name, exportId, sourceFile, clip, action, key, order, moveDir, moveSpeed, checked }
        let uploadedModelFileName = "my_character.fbx"; 

        // Sequence Playback Tracking
        let isPlayingSequence = false;
        let activeSequence = [];
        let activeSequenceIndex = 0;

        // Loaders
        const gltfLoader = new GLTFLoader();
        const fbxLoader = new FBXLoader();

        // DOM Elements
        const canvasContainer = document.getElementById('canvas-container');
        const uploadFilesInput = document.getElementById('upload-files');
        const btnExportCode = document.getElementById('btn-export-code');
        const animListContainer = document.getElementById('animation-list');
        const emptyAnimText = document.getElementById('empty-anim-text');
        const charStatus = document.getElementById('char-status');
        const btnResetPos = document.getElementById('btn-reset-pos');
        const animCount = document.getElementById('anim-count');
        const activeAnimLabel = document.getElementById('active-anim-label');
        const template = document.getElementById('anim-item-template');

        // Bulk Action UI
        const bulkActionPanel = document.getElementById('bulk-action-panel');
        const bulkKeyInput = document.getElementById('bulk-key-input');
        const selectedCountLabel = document.getElementById('selected-count');

        // Modal Elements
        const exportModal = document.getElementById('export-modal');
        const btnCloseModal = document.getElementById('btn-close-modal');
        const exportCodeArea = document.getElementById('export-code-area');
        const btnCopyCode = document.getElementById('btn-copy-code');

        const activeKeys = new Set();
        let generatedSnippets = {};
        let currentActiveTabId = 'tab-assets';
        let slotMap = {}; // populated by openExportModal, read by mergeIntoWoodbury
        let currentActiveSlot = null; // which slot-tab is selected in the sidebar UI ('' = Unassigned)
        const SLOT_PRESETS = ['idle', 'walk', 'walkBack', 'strafeLeft', 'strafeRight', 'run', 'jump', 'crouch'];
        let originalUploadedFiles = {}; // fileName -> ArrayBuffer, cached for Quick Save / Export (raw FBX bytes)

        // --- Sanitization Utility ---
        function sanitizeToCamelCase(str) {
            return str.replace(/\.[^/.]+$/, "") 
                      .replace(/[^a-zA-Z0-9]/g, ' ') 
                      .trim()
                      .split(/\s+/)
                      .map((word, index) => {
                          if (index === 0) return word.toLowerCase();
                          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                      })
                      .join('');
        }

        // --- Async File Reader Helper ---
        function readFileAsArrayBuffer(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
                reader.readAsArrayBuffer(file);
            });
        }

        // --- Init Scene ---
        function init() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1e293b);
            scene.fog = new THREE.Fog(0x1e293b, 10, 50);

            camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
            camera.position.set(0, 1.5, 4);

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            canvasContainer.appendChild(renderer.domElement);

            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.target.set(0, 1, 0);

            // Lighting
            const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
            hemiLight.position.set(0, 20, 0);
            scene.add(hemiLight);

            const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
            dirLight.position.set(-3, 10, 10);
            dirLight.castShadow = true;
            dirLight.shadow.camera.top = 4;
            dirLight.shadow.camera.bottom = -4;
            dirLight.shadow.camera.left = -4;
            dirLight.shadow.camera.right = 4;
            dirLight.shadow.camera.near = 0.1;
            dirLight.shadow.camera.far = 40;
            scene.add(dirLight);

            // Floor
            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(200, 200),
                new THREE.MeshStandardMaterial({ color: 0x111827, depthWrite: false })
            );
            mesh.rotation.x = - Math.PI / 2;
            mesh.receiveShadow = true;
            scene.add(mesh);

            const grid = new THREE.GridHelper(200, 200, 0x374151, 0x1f2937);
            grid.material.opacity = 0.5;
            grid.material.transparent = true;
            scene.add(grid);

            window.addEventListener('resize', onWindowResize);

            // Unified File Input listener
            uploadFilesInput.addEventListener('change', handleFilesUpload);

            // Modal Listeners
            btnExportCode.addEventListener('click', openExportModal);
            btnCloseModal.addEventListener('click', () => exportModal.classList.add('hidden'));
            btnCopyCode.addEventListener('click', copyCodeToClipboard);
            document.getElementById('btn-do-merge').addEventListener('click', mergeIntoWoodbury);

            window.addEventListener('keydown', handleGlobalKeydown);
            window.addEventListener('keyup', handleGlobalKeyup);

            renderer.setAnimationLoop(animate);
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        // --- Multi-File Cumulative Upload Logic ---

        async function handleFilesUpload(event) {
            const files = Array.from(event.target.files);
            if (!files.length) return;

            const msg = files.length === 1 ? 'Processing 1 file...' : `Processing ${files.length} files...`;
            showToast(msg, false);
            document.body.style.cursor = 'wait';

            for (const file of files) {
                const ext = file.name.split('.').pop().toLowerCase();
                try {
                    if (ext === 'fbx') {
                        const buffer = await readFileAsArrayBuffer(file);
                        originalUploadedFiles[file.name] = buffer; // cache raw bytes for Quick Save / Export
                        let fbx;
                        try {
                            fbx = fbxLoader.parse(buffer, '');
                        } catch (parseErr) {
                            if (parseErr && parseErr.message && (parseErr.message.includes('FBX version not supported') || parseErr.message.includes('FileVersion'))) {
                                throw new Error("Unsupported FBX 6.1 (ASCII). Download standard 'FBX' from Mixamo.");
                            } else {
                                throw parseErr;
                            }
                        }

                        // Set up primary model if it doesn't exist
                        if (!currentModel && fbx.children.length > 0) {
                            uploadedModelFileName = file.name;
                            setupCharacterMesh(fbx);
                        }

                        // Extract animations and append to our global list
                        if (fbx.animations && fbx.animations.length > 0) {
                            fbx.animations.forEach((clip, index) => {
                                clip.tracks.forEach(track => {
                                    track.name = track.name.replace(/.*mixamorig/g, 'mixamorig');
                                });

                                const action = mixer ? mixer.clipAction(clip) : null;

                                let cleanName = (clip.name || `Animation_${index + 1}`).replace('.fbx', '').replace(/[^a-zA-Z0-9]/g, '');
                                if (cleanName.toLowerCase() === 'take001' || cleanName.toLowerCase() === 'mixamocom') {
                                    cleanName = file.name.replace('.fbx', '').replace(/[^a-zA-Z0-9]/g, '');
                                }

                                // Auto-generate an initial camelCase ID to be safe
                                let initialExportId = cleanName.charAt(0).toLowerCase() + cleanName.slice(1);

                                // Auto-detect slot from animation name (Mixamo naming conventions)
                                const nameLower = cleanName.toLowerCase();
                                let autoSlot = '';
                                let autoDir = 'none';
                                let autoSpeed = 0;
                                if (nameLower.includes('idle') || nameLower.includes('stand')) {
                                    autoSlot = 'idle'; initialExportId = 'idle';
                                } else if (nameLower.includes('run') || nameLower.includes('sprint')) {
                                    autoSlot = 'run'; autoDir = 'fwd'; autoSpeed = 6; initialExportId = 'run';
                                } else if (nameLower.includes('walk') && (nameLower.includes('back') || nameLower.includes('backward'))) {
                                    autoSlot = 'walkBack'; autoDir = 'back'; autoSpeed = 2.5; initialExportId = 'walkBack';
                                } else if (nameLower.includes('walk') && (nameLower.includes('left') || nameLower.includes('strafe'))) {
                                    autoSlot = 'strafeLeft'; autoDir = 'left'; autoSpeed = 3; initialExportId = 'strafeLeft';
                                } else if (nameLower.includes('walk') && nameLower.includes('right')) {
                                    autoSlot = 'strafeRight'; autoDir = 'right'; autoSpeed = 3; initialExportId = 'strafeRight';
                                } else if (nameLower.includes('walk')) {
                                    autoSlot = 'walk'; autoDir = 'fwd'; autoSpeed = 3.5; initialExportId = 'walk';
                                } else if (nameLower.includes('jump')) {
                                    autoSlot = 'jump'; initialExportId = 'jump';
                                } else if (nameLower.includes('crouch') || nameLower.includes('sneak')) {
                                    autoSlot = 'crouch'; autoDir = 'fwd'; autoSpeed = 1.5; initialExportId = 'crouch';
                                }

                                animationData.push({
                                    id: Date.now() + Math.random() + index,
                                    name: cleanName,
                                    exportId: initialExportId, 
                                    sourceFile: file.name,
                                    clip: clip,
                                    action: action,
                                    key: '',
                                    order: animationData.length + 1, 
                                    slot: autoSlot,
                                    moveDir: autoDir,
                                    moveSpeed: autoSpeed,
                                    checked: false
                                });
                            });
                        }
                    } else if (ext === 'glb' || ext === 'gltf') {
                         showToast(`GLB/GLTF parsing is basic in this version. Proceeding...`, 2000);
                    }
                } catch (err) {
                    handleError(new Error(`File [${file.name}]: ${err.message}`));
                }
            }

            document.body.style.cursor = 'default';
            renderAnimationList();

            if (animationData.length > 0) {
                btnExportCode.disabled = false;
                showToast(`Workspace updated! ${animationData.length} total animations loaded.`);
                if (!currentAction) playAnimationIsolated(animationData[0].id);
            }

            event.target.value = ''; // Reset input to allow re-uploading the same file if needed
        }

        function setupCharacterMesh(model) {
            currentModel = model;

            currentModel.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.material) {
                        child.material.depthWrite = true;
                        if(child.material.transparent) child.material.alphaTest = 0.5;
                    }
                }
            });

            const box = new THREE.Box3().setFromObject(currentModel);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const scaleFactor = 1.8 / maxDim;

            currentModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
            box.setFromObject(currentModel);
            const center = new THREE.Vector3();
            box.getCenter(center);
            currentModel.position.x = -center.x;
            currentModel.position.z = -center.z;
            currentModel.position.y = -box.min.y;

            scene.add(currentModel);
            mixer = new THREE.AnimationMixer(currentModel);

            // Listen for end of LoopOnce animations to chain sequences
            mixer.addEventListener('finished', (e) => {
                if (isPlayingSequence && activeSequence.length > 0) {
                    if (e.action === currentAction) {
                        activeSequenceIndex = (activeSequenceIndex + 1) % activeSequence.length;
                        playRawAction(activeSequence[activeSequenceIndex], false);
                    }
                }
            });

            charStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> Connected';
            charStatus.className = 'text-xs text-neutral-300';
            btnResetPos.classList.remove('hidden');
            emptyAnimText.style.display = 'none';
        }

        window.resetCharacterPos = function() {
            if (currentModel) {
                // Calculate difference to shift camera target and camera smoothly
                const diffX = 0 - currentModel.position.x;
                const diffZ = 0 - currentModel.position.z;

                currentModel.position.x = 0;
                currentModel.position.z = 0;

                controls.target.x += diffX;
                controls.target.z += diffZ;
                camera.position.x += diffX;
                camera.position.z += diffZ;

                showToast("Character location recentered.");
            }
        };

        window.resetWorkspace = function() {
            if (currentModel) {
                scene.remove(currentModel);
                currentModel.traverse(child => {
                    if (child.isMesh) {
                        child.geometry.dispose();
                        if(child.material.dispose) child.material.dispose();
                    }
                });
            }
            if (mixer) {
                mixer.stopAllAction();
                mixer = null;
            }
            currentModel = null;
            currentAction = null;
            animationData = [];
            uploadedModelFileName = "my_character.fbx";
            currentActiveSlot = null;
            pendingEmptySlots = new Set();
            originalUploadedFiles = {}; // clear cached raw file bytes for export/save

            charStatus.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Missing';
            charStatus.className = 'text-xs text-neutral-300';
            btnResetPos.classList.add('hidden');
            btnExportCode.disabled = true;
            activeAnimLabel.textContent = "None";

            clearSelection();
            renderAnimationList();
            showToast("Workspace fully cleared. Ready for fresh uploads.");
        };

        // --- Animation Control Logic ---

        function playSequence(animGroup) {
            if (!animGroup || animGroup.length === 0) return;

            // Check if this exact sequence is already active to prevent restart loops
            const isSameSequence = isPlayingSequence && 
                                   activeSequence.length === animGroup.length && 
                                   activeSequence.every((a, i) => a.id === animGroup[i].id);
            if (isSameSequence) return; 

            isPlayingSequence = true;
            activeSequence = animGroup;
            activeSequenceIndex = 0;
            playRawAction(activeSequence[0], false);
        }

        function playAnimationIsolated(id) {
            const anim = animationData.find(a => a.id === id);
            if(!anim) return;

            if (!isPlayingSequence && currentAction === anim.action) return; 

            isPlayingSequence = false;
            activeSequence = [];
            playRawAction(anim, true);
        }

        function playRawAction(anim, loopRepeat = false) {
            const nextAction = anim.action;
            if (!nextAction) return;

            nextAction.reset();

            if (!loopRepeat) {
                nextAction.setLoop(THREE.LoopOnce, 1);
                nextAction.clampWhenFinished = true;
            } else {
                nextAction.setLoop(THREE.LoopRepeat);
                nextAction.clampWhenFinished = false;
            }

            nextAction.setEffectiveTimeScale(1);
            nextAction.setEffectiveWeight(1);
            nextAction.play();

            if (currentAction && currentAction !== nextAction) {
                nextAction.crossFadeFrom(currentAction, 0.3, true);
            }

            currentAction = nextAction;
            updatePlayButtonsState(anim.id);

            if (isPlayingSequence) {
                 activeAnimLabel.textContent = `SEQ: ${anim.name} (${activeSequenceIndex + 1}/${activeSequence.length})`;
            } else {
                 activeAnimLabel.textContent = anim.name;
            }
        }

        function updatePlayButtonsState(activeAnimId) {
            document.querySelectorAll('.play-btn').forEach(btn => {
                btn.classList.remove('bg-neutral-700', 'hover:bg-neutral-700');
                btn.classList.add('bg-neutral-600', 'hover:bg-neutral-700');
                btn.innerHTML = '<i class="fa-solid fa-play"></i>';
            });

            if (activeAnimId) {
                const activeRow = document.querySelector(`[data-id="${activeAnimId}"] .play-btn`);
                if(activeRow) {
                    activeRow.classList.remove('bg-neutral-600', 'hover:bg-neutral-700');
                    activeRow.classList.add('bg-neutral-700', 'hover:bg-neutral-700');
                    activeRow.innerHTML = '<i class="fa-solid fa-pause"></i>';
                }
            }
        }

        function handleGlobalKeydown(e) {
            if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') return;
            const key = e.key.toLowerCase();
            activeKeys.add(key);
            checkActiveKeyTriggers();
        }

        function handleGlobalKeyup(e) {
            if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') return;
            const key = e.key.toLowerCase();
            activeKeys.delete(key);
            checkActiveKeyTriggers();
        }

        function checkActiveKeyTriggers() {
            if (animationData.length === 0) return;

            const keyGroups = {};
            animationData.forEach(anim => {
                const cleanKey = anim.key.trim().toLowerCase();
                if (cleanKey) {
                    if (!keyGroups[cleanKey]) keyGroups[cleanKey] = [];
                    keyGroups[cleanKey].push(anim);
                }
            });

            const sortedKeys = Object.keys(keyGroups).sort((a, b) => {
                const lenA = a.split('+').length;
                const lenB = b.split('+').length;
                return lenB - lenA; 
            });

            for (const keyCombo of sortedKeys) {
                const requiredKeys = keyCombo.split('+').map(k => k.trim());
                const allPressed = requiredKeys.every(k => activeKeys.has(k));
                if (allPressed) {
                    const group = keyGroups[keyCombo].sort((a, b) => a.order - b.order);
                    if (group.length > 1) {
                        playSequence(group);
                    } else {
                        playAnimationIsolated(group[0].id);
                    }
                    return;
                }
            }

            // Default Behavior when no keys are pressed (Idle loop / sequence)
            if (activeKeys.size === 0) {
                const idleGroup = animationData.filter(a => !a.key.trim()).sort((a, b) => a.order - b.order);
                if (idleGroup.length > 1) {
                    playSequence(idleGroup);
                } else if (idleGroup.length === 1) {
                    playAnimationIsolated(idleGroup[0].id);
                } else if (animationData.length > 0) {
                    playAnimationIsolated(animationData[0].id);
                }
            }
        }

        // --- Bulk Actions & Selection Helpers ---

        window.clearSelection = function() {
            animationData.forEach(anim => anim.checked = false);
            renderAnimationList();
            updateBulkPanelVisibility();
        };

        window.applyBulkKey = function() {
            const rawKey = bulkKeyInput.value.trim().toLowerCase();
            let appliedCount = 0;

            let highestOrder = 0;
            animationData.forEach(a => {
                if (a.key === rawKey && a.order > highestOrder) highestOrder = a.order;
            });

            animationData.forEach(anim => {
                if (anim.checked) {
                    anim.key = rawKey;
                    highestOrder++;
                    anim.order = highestOrder; 
                    anim.checked = false; 
                    appliedCount++;
                }
            });

            if (appliedCount > 0) {
                showToast(`Mapped ${appliedCount} animations to key: "${rawKey.toUpperCase()}"`);
                bulkKeyInput.value = '';
                renderAnimationList();
                updateBulkPanelVisibility();
            }
        };

        function updateBulkPanelVisibility() {
            const checkedAnims = animationData.filter(a => a.checked);
            if (checkedAnims.length > 0) {
                bulkActionPanel.classList.remove('hidden');
                selectedCountLabel.textContent = checkedAnims.length;
            } else {
                bulkActionPanel.classList.add('hidden');
            }
        }

        // --- UI Rendering ---

        // Returns { slotName: [anims...] } including an '' (Unassigned) bucket, sorted by slot insertion/order
        function getSlotGroups() {
            const groups = {};
            animationData.forEach(a => {
                const s = (a.slot || '').trim();
                if (!groups[s]) groups[s] = [];
                groups[s].push(a);
            });
            return groups;
        }

        function renderSlotTabs() {
            const strip = document.getElementById('slot-tab-strip');
            if (!strip) return;
            strip.innerHTML = '';

            const groups = getSlotGroups();
            // Named slots first (sorted alphabetically) — includes pending empty slots with 0 anims — Unassigned last
            const namedSlotsSet = new Set(Object.keys(groups).filter(s => s !== ''));
            pendingEmptySlots.forEach(s => namedSlotsSet.add(s));
            const namedSlots = Array.from(namedSlotsSet).sort();
            const hasUnassigned = (groups[''] || []).length > 0;

            // Keep currentActiveSlot valid (a slot is valid if it has anims OR is a pending empty slot)
            const isValidSlot = (s) => s === '' ? hasUnassigned : (namedSlots.includes(s));
            if (currentActiveSlot === null || !isValidSlot(currentActiveSlot)) {
                currentActiveSlot = namedSlots[0] !== undefined ? namedSlots[0] : (hasUnassigned ? '' : null);
            }

            function makeTabBtn(slotName, label, count) {
                const btn = document.createElement('button');
                const isActive = currentActiveSlot === slotName;
                btn.className = 'px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition flex items-center gap-1.5 ' +
                    (isActive
                        ? 'bg-neutral-600/90 border-neutral-600 text-neutral-100 shadow shadow-black/20'
                        : 'bg-neutral-800 border-neutral-600 text-neutral-300 hover:bg-neutral-700 hover:border-neutral-600');
                btn.innerHTML = `<i class="fa-solid fa-layer-group text-[9px] ${isActive ? '' : 'text-neutral-300/70'}"></i> ${label} <span class="opacity-70">×${count}</span>`;
                btn.addEventListener('click', () => {
                    currentActiveSlot = slotName;
                    renderSlotTabs();
                    renderAnimationList();
                });
                return btn;
            }

            namedSlots.forEach(name => {
                strip.appendChild(makeTabBtn(name, name, (groups[name] || []).length));
            });

            if (hasUnassigned) {
                strip.appendChild(makeTabBtn('', 'Unassigned', groups[''].length));
            }

            // + Add Slot button
            const addBtn = document.createElement('button');
            addBtn.className = 'px-2.5 py-1.5 rounded-md text-[11px] font-semibold border border-dashed border-neutral-600/60 text-neutral-300 hover:bg-neutral-900/20 transition flex items-center gap-1';
            addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Slot';
            addBtn.title = 'Create a new empty slot tab (e.g. crouch, prone, dodge...)';
            addBtn.addEventListener('click', () => promptNewSlot());
            strip.appendChild(addBtn);

            // Quick-add preset chips (only presets not already in use)
            const unusedPresets = SLOT_PRESETS.filter(p => !namedSlots.includes(p));
            if (unusedPresets.length > 0 && animationData.length > 0) {
                const presetWrap = document.createElement('div');
                presetWrap.className = 'w-full flex flex-wrap gap-1 mt-1';
                presetWrap.innerHTML = '<span class="text-[9px] text-neutral-400 mr-1 self-center">Presets:</span>';
                unusedPresets.forEach(p => {
                    const chip = document.createElement('button');
                    chip.className = 'px-2 py-0.5 rounded text-[9px] bg-neutral-900 border border-neutral-600 text-neutral-400 hover:text-neutral-300 hover:border-neutral-600 transition';
                    chip.textContent = p;
                    chip.addEventListener('click', () => createEmptySlot(p));
                    presetWrap.appendChild(chip);
                });
                strip.appendChild(presetWrap);
            }
        }

        function promptNewSlot() {
            const name = (window.prompt('New slot name (letters/numbers/underscore only), e.g. crouch, prone, dodge:') || '').trim().replace(/[^a-zA-Z0-9_]/g, '');
            if (!name) return;
            createEmptySlot(name);
        }

        function createEmptySlot(name) {
            // An "empty" slot has no animations yet — just switch focus to it.
            // It becomes real the moment an animation's Slot field is set to this name.
            currentActiveSlot = name;
            const groups = getSlotGroups();
            if (!groups[name]) {
                // Track as a pending empty slot so the tab shows even with 0 anims
                pendingEmptySlots.add(name);
            }
            renderSlotTabs();
            renderAnimationList();
            showToast(`Slot "${name}" created — assign an animation's Slot field to "${name}" to fill it.`, 4000);
        }

        let pendingEmptySlots = new Set();

        function renderAnimationList() {
            animListContainer.innerHTML = '';
            animCount.textContent = `${animationData.length} loaded`;

            if (animationData.length === 0) {
                if(emptyAnimText) emptyAnimText.style.display = 'block';
                document.getElementById('slot-tab-strip').innerHTML = '';
                return;
            } else {
                if(emptyAnimText) emptyAnimText.style.display = 'none';
            }

            renderSlotTabs();

            const groups = getSlotGroups();
            let visibleAnims;
            if (currentActiveSlot === null) {
                visibleAnims = [];
            } else {
                visibleAnims = groups[currentActiveSlot] || [];
                pendingEmptySlots.delete(currentActiveSlot); // real now if it has anims, but tab persists via groups anyway
            }

            if (visibleAnims.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'text-center text-xs text-neutral-400 py-8 border border-dashed border-neutral-600 rounded-lg';
                empty.innerHTML = currentActiveSlot
                    ? `No animations in slot "<span class="text-neutral-300 font-mono">${currentActiveSlot}</span>" yet.<br>Set an animation's <span class="text-neutral-300">Slot</span> field to "${currentActiveSlot}" below, or upload one.`
                    : 'Select or create a slot tab above.';
                animListContainer.appendChild(empty);
            }

            visibleAnims.forEach(anim => {
                const clone = template.content.cloneNode(true);
                const wrapper = clone.querySelector('div');
                wrapper.dataset.id = anim.id;

                clone.querySelector('.anim-name').textContent = anim.name;
                clone.querySelector('.anim-name').title = anim.name;
                clone.querySelector('.anim-source').textContent = anim.sourceFile;

                const playBtn = clone.querySelector('.play-btn');
                playBtn.addEventListener('click', () => playAnimationIsolated(anim.id));

                // Delete Animation Logic
                const deleteBtn = clone.querySelector('.delete-btn');
                deleteBtn.addEventListener('click', () => {
                    if (anim.action === currentAction) {
                        anim.action.stop();
                        currentAction = null;
                        isPlayingSequence = false;
                    } else if (isPlayingSequence && activeSequence.some(a => a.id === anim.id)) {
                        activeSequence = activeSequence.filter(a => a.id !== anim.id);
                        if(activeSequence.length === 0) isPlayingSequence = false;
                    }

                    animationData = animationData.filter(a => a.id !== anim.id);

                    if (mixer && anim.clip) {
                        try { mixer.uncacheClip(anim.clip); mixer.uncacheAction(anim.clip); } catch(e) {}
                    }

                    renderAnimationList();
                    updateBulkPanelVisibility();

                    if (animationData.length > 0 && !currentAction) {
                        playAnimationIsolated(animationData[0].id);
                    } else if (animationData.length === 0) {
                        activeAnimLabel.textContent = "None";
                        btnExportCode.disabled = true;
                        if(emptyAnimText) emptyAnimText.style.display = 'block';
                    }
                });

                // Sequence Playback Button
                const playSeqBtn = clone.querySelector('.play-seq-btn');
                playSeqBtn.addEventListener('click', () => {
                    const currentKey = anim.key.trim().toLowerCase();
                    const group = animationData.filter(a => a.key.trim().toLowerCase() === currentKey).sort((a,b) => a.order - b.order);
                    playSequence(group);
                });

                const checkbox = clone.querySelector('.anim-select');
                checkbox.checked = anim.checked;
                checkbox.addEventListener('change', (e) => {
                    anim.checked = e.target.checked;
                    updateBulkPanelVisibility();
                });

                // Standard Data Binds
                const keyInput = clone.querySelector('.key-input');
                keyInput.value = anim.key;
                keyInput.addEventListener('input', (e) => {
                    anim.key = e.target.value.trim().toLowerCase();
                    renderGroupBadges();
                });

                const orderInput = clone.querySelector('.order-input');
                orderInput.value = anim.order;
                orderInput.addEventListener('change', (e) => {
                    anim.order = parseInt(e.target.value) || 1;
                });

                const exportIdInput = clone.querySelector('.export-id-input');
                exportIdInput.value = anim.exportId;
                exportIdInput.addEventListener('input', (e) => {
                    anim.exportId = e.target.value.trim().replace(/[^a-zA-Z0-9_]/g, '');
                });

                // Velocity Physics Binds
                const dirInput = clone.querySelector('.dir-input');
                dirInput.value = anim.moveDir || 'none';
                dirInput.addEventListener('change', (e) => {
                    anim.moveDir = e.target.value;
                });

                const speedInput = clone.querySelector('.speed-input');
                speedInput.value = anim.moveSpeed || '';
                speedInput.addEventListener('input', (e) => {
                    anim.moveSpeed = parseFloat(e.target.value) || 0;
                });

                // Slot binding — changing this moves the card to a different tab
                const slotInput = clone.querySelector('.slot-input');
                slotInput.value = anim.slot || '';
                slotInput.addEventListener('change', (e) => {
                    const newSlot = e.target.value.trim().replace(/[^a-zA-Z0-9_]/g, '');
                    anim.slot = newSlot;
                    currentActiveSlot = newSlot; // follow the animation to its new tab
                    renderAnimationList();
                });
                slotInput.addEventListener('input', (e) => {
                    anim.slot = e.target.value.trim().replace(/[^a-zA-Z0-9_]/g, '');
                });

                animListContainer.appendChild(clone);
            });

            if (currentAction) {
                const activeData = animationData.find(a => a.action === currentAction);
                if (activeData) updatePlayButtonsState(activeData.id); 
            }

            renderGroupBadges();
        }

        function renderGroupBadges() {
            const keyCounts = {};
            animationData.forEach(anim => {
                const k = anim.key.trim().toLowerCase();
                if (k) keyCounts[k] = (keyCounts[k] || 0) + 1;
            });

            animationData.forEach(anim => {
                const card = document.querySelector(`[data-id="${anim.id}"]`);
                if (!card) return;

                const badge = card.querySelector('.group-badge');
                const playSeqBtn = card.querySelector('.play-seq-btn');
                const cleanKey = anim.key.trim().toLowerCase();

                if (cleanKey && keyCounts[cleanKey] > 1) {
                    playSeqBtn.classList.remove('hidden');
                    playSeqBtn.querySelector('.seq-key-label').textContent = cleanKey.toUpperCase();
                    badge.classList.add('hidden');
                } else {
                    playSeqBtn.classList.add('hidden');
                    if (cleanKey && keyCounts[cleanKey] === 1) {
                        badge.classList.remove('hidden');
                        badge.textContent = `KEY: ${cleanKey.toUpperCase()}`;
                    } else {
                        badge.classList.add('hidden');
                    }
                }
            });
        }

        // --- Woodbury Code Generator & Tab Handler ---

        window.switchTab = function(tabId) {
            currentActiveTabId = tabId;
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('border-neutral-600', 'text-neutral-300');
                btn.classList.add('border-transparent', 'text-neutral-300', 'hover:text-neutral-300');
            });
            const activeBtn = document.getElementById(`btn-${tabId}`);
            if (activeBtn) {
                activeBtn.classList.add('border-neutral-600', 'text-neutral-300');
                activeBtn.classList.remove('border-transparent', 'text-neutral-300', 'hover:text-neutral-300');
            }

            const snippetContent = document.getElementById('snippet-tab-content');
            const mergeContent   = document.getElementById('merge-tab-content');
            const snippetFooter  = document.getElementById('snippet-footer');
            const mergeFooter    = document.getElementById('merge-footer');

            if (tabId === 'tab-merge') {
                snippetContent.classList.add('hidden');
                snippetFooter.classList.add('hidden');
                mergeContent.classList.remove('hidden');
                mergeFooter.classList.remove('hidden');
                return;
            }

            snippetContent.classList.remove('hidden');
            snippetFooter.classList.remove('hidden');
            mergeContent.classList.add('hidden');
            mergeFooter.classList.add('hidden');

            refreshTabOutput(tabId);
        };

        // Called when source textarea changes — re-render current tab
        window.onWoodburySourceChange = function() {
            const src = (document.getElementById('woodbury-source-input').value || '').trim();
            const statusEl = document.getElementById('source-status');
            if (src.length > 500) {
                statusEl.textContent = '✓ source loaded';
                statusEl.className = 'text-[10px] shrink-0 text-neutral-400';
            } else if (src.length > 0) {
                statusEl.textContent = 'âš  too short?';
                statusEl.className = 'text-[10px] shrink-0 text-neutral-400';
            } else {
                statusEl.textContent = '';
            }
            if (currentActiveTabId && currentActiveTabId !== 'tab-merge') {
                refreshTabOutput(currentActiveTabId);
            }
        };

        function refreshTabOutput(tabId) {
            const desc = document.getElementById('tab-desc');
            const exportCodeArea = document.getElementById('export-code-area');
            const src = (document.getElementById('woodbury-source-input').value || '').trim();
            const hasSrc = src.length > 500;

            const tabDescs = {
                'tab-assets':     `<i class="fa-solid fa-list-check text-neutral-300"></i> ${hasSrc ? 'Full merged <code class="bg-neutral-800 px-1 rounded text-neutral-300">ASSETS</code> block — copy and paste this wholesale to replace the existing one.' : 'Merge these lines into your <code class="bg-neutral-800 px-1 rounded text-neutral-300">const ASSETS = { ... }</code> object. Paste source above for a complete ready-to-paste block.'}`,
                'tab-preload':    `<i class="fa-solid fa-hourglass-start text-neutral-300"></i> ${hasSrc ? 'Full merged tasks object for <code class="bg-neutral-800 px-1 rounded text-neutral-300">loadOptionalIntruderAssets()</code> — paste this wholesale.' : 'Add these lines into the tasks object inside <code class="bg-neutral-800 px-1 rounded text-neutral-300">loadOptionalIntruderAssets()</code>. Paste source above for a complete block.'}`,
                'tab-builder':    `<i class="fa-solid fa-hammer text-neutral-300"></i> Complete <code class="bg-neutral-800 px-1 rounded text-neutral-300">buildInteractivePlayerCharacter</code> function — replace the existing one entirely.`,
                'tab-controller': `<i class="fa-solid fa-gamepad text-neutral-300"></i> Complete <code class="bg-neutral-800 px-1 rounded text-neutral-300">updatePlayer(delta)</code> — replace entirely. Each <strong class="text-neutral-300">Slot</strong> you configured becomes its own independent if-block. New slots are added; existing slots with the same name are replaced.`,
            };
            if (desc && tabDescs[tabId]) desc.innerHTML = tabDescs[tabId];

            if (!hasSrc) {
                // No source — show raw generated snippet as before
                exportCodeArea.value = generatedSnippets[tabId] || '';
                return;
            }

            // Source provided — show fully merged output for this tab
            exportCodeArea.value = buildMergedSnippet(tabId, src);
        }

        // Build the merged output for a single tab given Woodbury source
        function buildMergedSnippet(tabId, src) {
            if (tabId === 'tab-assets') {
                return mergeAssetsBlock(src);
            } else if (tabId === 'tab-preload') {
                return mergePreloadBlock(src);
            } else if (tabId === 'tab-builder') {
                return generatedSnippets['tab-builder'] || '';
            } else if (tabId === 'tab-controller') {
                return generatedSnippets['tab-controller'] || '';
            }
            return generatedSnippets[tabId] || '';
        }

        function mergeAssetsBlock(src) {
            const snippet = generatedSnippets['tab-assets'] || '';
            if (!snippet) return '';

            const charKeyMatch = snippet.match(/character:\s*\{\s*(\w+):\s*'([^']+)'/);
            const motionBlock  = snippet.match(/motions:\s*\{([\s\S]*?)\}/);
            const newMotions   = {};
            if (motionBlock) {
                for (const p of motionBlock[1].matchAll(/(\w+):\s*'([^']+)'/g)) newMotions[p[1]] = p[2];
            }

            let charBlock = '';
            const charRx = /character\s*:\s*\{([\s\S]*?)\}/;
            const charMatch = src.match(charRx);
            const existingCharPairs = {};
            if (charMatch) {
                for (const p of charMatch[1].matchAll(/(\w+)\s*:\s*'([^']+)'/g)) existingCharPairs[p[1]] = p[2];
            }
            if (charKeyMatch) existingCharPairs[charKeyMatch[1]] = charKeyMatch[2];
            charBlock = '  character: {\n' +
                Object.entries(existingCharPairs).map(([k,v]) => `    ${k}: '${v}'`).join(',\n') +
                '\n  }';

            const motRx = /motions\s*:\s*\{([\s\S]*?)\}/;
            const motMatch = src.match(motRx);
            const existingMotions = {};
            if (motMatch) {
                for (const p of motMatch[1].matchAll(/(\w+)\s*:\s*'([^']+)'/g)) existingMotions[p[1]] = p[2];
            }
            for (const [k, v] of Object.entries(newMotions)) existingMotions[k] = v;
            const motBlock = '  motions: {\n' +
                Object.entries(existingMotions).map(([k,v]) => `    ${k}: '${v}'`).join(',\n') +
                '\n  }';

            return charBlock + ',\n' + motBlock;
        }

        function mergePreloadBlock(src) {
            const snippet = generatedSnippets['tab-preload'] || '';
            if (!snippet) return '';

            const newLines = {};
            for (const line of snippet.trim().split('\n')) {
                const m = line.trim().match(/^(\w+)\s*:/);
                if (m) newLines[m[1]] = line.trim().replace(/,$/, '');
            }

            const tasksRx = /loadOptionalIntruderAssets[\s\S]*?const\s+tasks\s*=\s*\{([\s\S]*?)\};/;
            const tasksMatch = src.match(tasksRx);
            const existingLines = {}; 
            if (tasksMatch) {
                for (const line of tasksMatch[1].split('\n')) {
                    const m = line.trim().match(/^(\w+)\s*:/);
                    if (m) existingLines[m[1]] = line.trim().replace(/,$/, '');
                }
            }

            for (const [k, v] of Object.entries(newLines)) existingLines[k] = v;
            const entries = Object.values(existingLines);
            return entries.map((l, i) => '        ' + l + (i < entries.length - 1 ? ',' : '')).join('\n');
        }

        // --- FIND AND REPLACE / ADD THIS FUNCTION ---
function buildInteractivePlayerCharacter(fbxGltfModel) {
    if (!fbxGltfModel) return;

    // 1. Add character to the scene
    state.playerGroup = fbxGltfModel;
    scene.add(state.playerGroup);

    // 2. Set initial position/scale if needed
    state.playerGroup.scale.setScalar(1.0); 
    state.playerGroup.position.set(0, 0, 0);

    // 3. Setup the Animation Mixer
    state.mixer = new THREE.AnimationMixer(state.playerGroup);

    // 4. Store and trigger animations (assuming animations are attached to the file)
    state.animations = {};
    if (fbxGltfModel.animations && fbxGltfModel.animations.length > 0) {
        fbxGltfModel.animations.forEach((clip) => {
            // Give names to your clips (e.g., 'idle', 'walk', 'run')
            const action = state.mixer.clipAction(clip);
            state.animations[clip.name.toLowerCase()] = action;
        });

        // Trigger default animation (e.g., idle)
        const firstAnim = Object.keys(state.animations)[0];
        if (firstAnim && state.animations[firstAnim]) {
            state.animations[firstAnim].play();
        }
    }
}

        function openExportModal() {
            if(animationData.length === 0) return;

            const characterAssetKey = sanitizeToCamelCase(uploadedModelFileName);

            // ── ASSETS & PRELOAD ──────────────────────────────────────────────────
            let motionAssetDefs = "";
            let preloadLines = "";
            let tryBindings = "";

            animationData.forEach((anim, i) => {
                const motionKey = anim.exportId || `motion_${i}`;
                const sep = i === animationData.length - 1 ? "" : ",\n";
                motionAssetDefs += `    ${motionKey}: './assets/${anim.sourceFile}'${sep}`;
                preloadLines    += `        ${motionKey}Motion: withTimeout(loadFBXMotion(ASSETS.motions.${motionKey}), 12000, '${motionKey}Motion'),\n`;
                tryBindings     += `          tryBindMotion(entity, state.assets.${motionKey}Motion, '${motionKey}');\n`;
            });

            // ── SLOT-BASED CONTROLLER GENERATION ─────────────────────────────────
            // Group animations by SLOT — each unique slot = one independent if-block
            slotMap = {};  // reset module-level slotMap
            const noSlotAnims = [];
            animationData.forEach(anim => {
                const s = (anim.slot || '').trim();
                if (!s) { noSlotAnims.push(anim); return; }
                if (!slotMap[s]) slotMap[s] = [];
                slotMap[s].push(anim);
            });

            function buildVelocityLine(dir, speed, indent) {
                if (dir === 'fwd')   return `${indent}state.velocity.addScaledVector(forward,  ${speed});\n`;
                if (dir === 'back')  return `${indent}state.velocity.addScaledVector(forward, -${speed});\n`;
                if (dir === 'left')  return `${indent}state.velocity.addScaledVector(right,  -${speed});\n`;
                if (dir === 'right') return `${indent}state.velocity.addScaledVector(right,   ${speed});\n`;
                return '';
            }

            function buildAnimBlock(group, slotName, indent, isDefault) {
                let out = '';
                if (group.length === 1) {
                    const anim = group[0];
                    const id = anim.exportId || 'idle';
                    out += `${indent}setCharacterAction(customEntity, '${id}');\n`;
                    if (anim.moveDir !== 'none' && anim.moveSpeed > 0) {
                        out += buildVelocityLine(anim.moveDir, anim.moveSpeed, indent);
                    }
                    if (!isDefault) out += `${indent}${slotName}Triggered = true;\n`;
                } else {
                    const seqKey = slotName + (isDefault ? '_dflt' : '_seq');
                    const seqElements = group.map(a => {
                        const ms = Math.round((a.clip?.duration || 1) * 1000);
                        return `{ name: '${a.exportId || 'idle'}', duration: ${ms}, dir: '${a.moveDir}', speed: ${a.moveSpeed} }`;
                    }).join(`,\n${indent}  `);
                    out += `${indent}const _seq_${seqKey} = [\n${indent}  ${seqElements}\n${indent}];\n`;
                    out += `${indent}if (customEntity._activeSlot !== '${seqKey}') {\n`;
                    out += `${indent}  customEntity._activeSlot = '${seqKey}';\n`;
                    out += `${indent}  customEntity._seqIdx = 0;\n`;
                    out += `${indent}  customEntity._seqTime = Date.now();\n`;
                    out += `${indent}}\n`;
                    out += `${indent}if (Date.now() - customEntity._seqTime > _seq_${seqKey}[customEntity._seqIdx].duration) {\n`;
                    out += `${indent}  customEntity._seqIdx = (customEntity._seqIdx + 1) % _seq_${seqKey}.length;\n`;
                    out += `${indent}  customEntity._seqTime = Date.now();\n`;
                    out += `${indent}}\n`;
                    out += `${indent}const _cur_${seqKey} = _seq_${seqKey}[customEntity._seqIdx];\n`;
                    out += `${indent}setCharacterAction(customEntity, _cur_${seqKey}.name);\n`;
                    out += `${indent}if      (_cur_${seqKey}.dir === 'fwd')   state.velocity.addScaledVector(forward,  _cur_${seqKey}.speed);\n`;
                    out += `${indent}else if (_cur_${seqKey}.dir === 'back')  state.velocity.addScaledVector(forward, -_cur_${seqKey}.speed);\n`;
                    out += `${indent}else if (_cur_${seqKey}.dir === 'left')  state.velocity.addScaledVector(right,  -_cur_${seqKey}.speed);\n`;
                    out += `${indent}else if (_cur_${seqKey}.dir === 'right') state.velocity.addScaledVector(right,   _cur_${seqKey}.speed);\n`;
                    if (!isDefault) out += `${indent}${slotName}Triggered = true;\n`;
                }
                return out;
            }

            function buildSlotBlock(slotName, anims) {
                // Group anims in this slot by key trigger
                const keyGroups = {};
                anims.forEach(anim => {
                    const k = (anim.key || '').trim().toLowerCase();
                    if (!keyGroups[k]) keyGroups[k] = [];
                    keyGroups[k].push(anim);
                });

                // Sort: longer combos first, then empty-key (default) last
                const keyList = Object.keys(keyGroups).sort((a, b) => {
                    if (!a && b) return 1;
                    if (a && !b) return -1;
                    return b.split('+').length - a.split('+').length;
                });

                let block = `      // ── Slot: ${slotName} ──────────────────────────────────\n`;
                block    += `      if (customEntity) {\n`;
                block    += `        let ${slotName}Triggered = false;\n`;

                const nonDefaultKeys = keyList.filter(k => k !== '');
                nonDefaultKeys.forEach((triggerKey, idx) => {
                    const group = keyGroups[triggerKey].sort((a, b) => a.order - b.order);
                    const keys = triggerKey.split('+').map(k => k.trim());
                    const cond = keys.map(k => `state.keys.has('${k}')`).join(' && ');
                    const stmt = idx === 0 ? 'if' : 'else if';
                    block += `        ${stmt} (${cond}) {\n`;
                    block += buildAnimBlock(group, slotName, '          ', false);
                    block += `        }\n`;
                });

                // Default/idle group (no key assigned = else branch)
                const defaultGroup = keyGroups[''];
                if (defaultGroup && defaultGroup.length > 0) {
                    const elseStmt = nonDefaultKeys.length > 0 ? '        else {' : '        {';
                    block += `${elseStmt}\n`;
                    block += buildAnimBlock(defaultGroup.sort((a,b) => a.order - b.order), slotName, '          ', true);
                    block += `        }\n`;
                } else if (nonDefaultKeys.length > 0) {
                    block += `        // no default action for slot '${slotName}'\n`;
                }

                block += `      }\n\n`;
                return block;
            }

            let allSlotBlocks = '';
            for (const [slotName, anims] of Object.entries(slotMap)) {
                allSlotBlocks += buildSlotBlock(slotName, anims);
            }

            if (noSlotAnims.length > 0) {
                allSlotBlocks += `      // ── Unslotted (assign a Slot in the studio): ${noSlotAnims.map(a=>a.exportId||a.name).join(', ')} ──\n\n`;
            }

            // Default animation for initial setCharacterAction in builder
            let defaultAnimObj = animationData.find(a => (a.slot||'').toLowerCase() === 'idle')
                              || animationData.find(a => a.name.toLowerCase().includes('idle'))
                              || animationData[0];
            let defaultAnimName = defaultAnimObj?.exportId || 'idle';

            // ── GENERATE SNIPPETS ─────────────────────────────────────────────────
            generatedSnippets['tab-assets'] = `  character: {\n    ${characterAssetKey}: './assets/${uploadedModelFileName}'\n  },\n  motions: {\n${motionAssetDefs}\n  }`;

            generatedSnippets['tab-preload'] = `        ${characterAssetKey}: withTimeout(loadFBX(ASSETS.character.${characterAssetKey}), 14000, '${characterAssetKey}'),\n${preloadLines.trimEnd()}`;

            generatedSnippets['tab-builder'] = `      function buildInteractivePlayerCharacter(assets) {
        const entity = createCharacterEntity(assets.${characterAssetKey}, { targetHeight: 1.8, yawOffset: CHARACTER_YAW_OFFSET });
        if (entity) {
${tryBindings}
          // Always resolve to a real bound action — never leave the entity with nothing playing (T-pose).
          setCharacterAction(entity, entity.actions['${defaultAnimName}'] ? '${defaultAnimName}' : (entity.actions.idle ? 'idle' : (entity.actions.walk ? 'walk' : Object.keys(entity.actions)[0])));
          entity.root.position.set(0, FLOOR_Y_FIRST || 0, 0);
          scene.add(entity.root);
          state.myCustomEntity = entity;
        }
      }
      buildInteractivePlayerCharacter(state.assets);`;

            generatedSnippets['tab-controller'] = `    function updatePlayer(delta) {
      if (!state.started || !controls.isLocked || state.gameOver || state.inputSuppressed || state.isHidden) return;

      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      state.velocity.set(0, 0, 0);
      const customEntity = state.myCustomEntity;

${allSlotBlocks}
      // ── Idle fallback: no movement key held — always keep a real action playing ──
      if (customEntity && state.velocity.lengthSq() < 0.0001) {
        setCharacterAction(customEntity, customEntity.actions.idle ? 'idle' : (customEntity.actions.walk ? 'walk' : customEntity.fallbackMotion));
      }

      // ── Move & floor snap ─────────────────────────────────────────────
      movePlayerAxis('x', state.velocity.x * delta);
      movePlayerAxis('z', state.velocity.z * delta);

      if (customEntity) {
        if (state.velocity.lengthSq() > 0.001) {
          const moveDir = state.velocity.clone().normalize();
          customEntity.root.rotation.y = Math.atan2(moveDir.x, moveDir.z);
        }

        const charPos = customEntity.root.position;
        const floorY = getFloorHeightAt(charPos.x, charPos.z);
        if (floorY !== null) {
          state.playerFloorY = floorY;
          charPos.y = floorY;
        }

        const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const idealCameraPos = charPos.clone().add(new THREE.Vector3(0, EYE_HEIGHT, 0));
        idealCameraPos.addScaledVector(lookDir, -2.5);

        // ── Head bob: advance timer only while actually moving ──────────
        if (typeof state.headBobTimer !== 'number') state.headBobTimer = 0;
        const isMoving = state.velocity.lengthSq() > 0.001;
        if (isMoving) {
          state.headBobTimer += delta * 9.5; // bob speed
          const bobY = Math.sin(state.headBobTimer) * 0.045;
          const bobX = Math.cos(state.headBobTimer * 0.5) * 0.03;
          idealCameraPos.y += bobY;
          const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
          idealCameraPos.addScaledVector(camRight, bobX);
        } else {
          state.headBobTimer = 0;
        }

        camera.position.copy(idealCameraPos);

        if (state.currentAct === 1 && !state.eventTriggered && state.zones.upstairsLanding.containsPoint(charPos)) {
          triggerIntruderSequence();
        }
      }
    }`;

            exportModal.classList.remove('hidden');
            const tabToShow = currentActiveTabId === 'tab-merge' ? 'tab-merge' : currentActiveTabId;
            switchTab(tabToShow);
        }
        function copyCodeToClipboard() {
            exportCodeArea.select();
            exportCodeArea.setSelectionRange(0, 99999); 
            document.execCommand('copy');

            const originalText = btnCopyCode.innerHTML;
            btnCopyCode.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            btnCopyCode.classList.replace('bg-neutral-600', 'bg-neutral-600');
            setTimeout(() => {
                btnCopyCode.innerHTML = originalText;
                btnCopyCode.classList.replace('bg-neutral-600', 'bg-neutral-600');
            }, 2000);
        }

        // --- Utilities ---
        let toastTimeout;
        function showToast(message, hideDelay = 3000) {
            const toast = document.getElementById('toast');
            document.getElementById('toast-msg').textContent = message;
            toast.classList.remove('translate-y-20', 'opacity-0');
            clearTimeout(toastTimeout);
            if (hideDelay) {
                toastTimeout = setTimeout(() => {
                    toast.classList.add('translate-y-20', 'opacity-0');
                }, hideDelay);
            }
        }

        function handleError(err) {
            console.error(err);
            showToast("Error: " + err.message, 6000);
        }

        // --- Render Loop ---
        function animate() {
            const delta = clock.getDelta();
            if (mixer) mixer.update(delta);

            // Allow LIVE in-studio movement visualization when testing actions
            if (currentModel) {
                let activeAnim = null;
                if (isPlayingSequence && activeSequence.length > 0) {
                    activeAnim = activeSequence[activeSequenceIndex];
                } else if (currentAction) {
                    activeAnim = animationData.find(a => a.action === currentAction);
                }

                if (activeAnim && activeAnim.moveDir !== 'none' && activeAnim.moveSpeed > 0) {
                    const speed = activeAnim.moveSpeed * delta;
                    const moveVec = new THREE.Vector3();

                    if (activeAnim.moveDir === 'fwd') moveVec.z = speed;
                    if (activeAnim.moveDir === 'back') moveVec.z = -speed;
                    if (activeAnim.moveDir === 'left') moveVec.x = speed;
                    if (activeAnim.moveDir === 'right') moveVec.x = -speed;

                    if (moveVec.lengthSq() > 0) {
                        currentModel.position.add(moveVec);
                        controls.target.add(moveVec);
                        camera.position.add(moveVec);
                    }
                }
            }

            controls.update();
            renderer.render(scene, camera);
        }

        // --- Merge Engine ---

        function mergeIntoWoodbury() {
            const sourceInput = document.getElementById('woodbury-source-input-merge');
            const statusBox = document.getElementById('merge-status');
            const source = sourceInput.value.trim();

            if (!source) {
                showToast('Paste your Woodbury HTML source first.', 3000);
                return;
            }
            if (animationData.length === 0) {
                showToast('No animations loaded yet — upload FBX files first.', 3000);
                return;
            }

            openExportModal(); 
            exportModal.classList.add('hidden'); 

            const logs = [];
            let result = source;

            const assetsSnippet = generatedSnippets['tab-assets'] || '';
            if (assetsSnippet) {
                const charKeyMatch   = assetsSnippet.match(/character:\s*\{\s*(\w+):\s*'([^']+)'/);
                const motionBlock    = assetsSnippet.match(/motions:\s*\{([\s\S]*?)\}/);
                const newMotionPairs = {};
                if (motionBlock) {
                    const pairs = motionBlock[1].matchAll(/(\w+):\s*'([^']+)'/g);
                    for (const p of pairs) newMotionPairs[p[1]] = p[2];
                }

                if (charKeyMatch) {
                    const [, charKey, charFile] = charKeyMatch;
                    const charBlockRx = /(character\s*:\s*\{)([\s\S]*?)(\})/;
                    if (charBlockRx.test(result)) {
                        result = result.replace(charBlockRx, (m, open, inner, close) => {
                            let cleaned = inner.replace(new RegExp(`\\s*${charKey}\\s*:[^,\n}]+,?`), '').trimEnd();
                            if (cleaned && !cleaned.endsWith(',')) cleaned += ',';
                            return `${open}\n    ${charKey}: '${charFile}'${cleaned ? '\n    ' + cleaned.trim() : ''}\n  ${close}`;
                        });
                        logs.push({ ok: true, msg: `✓ ASSETS.character: added/replaced '${charKey}'.` });
                    } else {
                        logs.push({ ok: false, msg: `⚠ ASSETS.character block not found — skipped.` });
                    }
                }

                if (Object.keys(newMotionPairs).length > 0) {
                    const motionBlockRx = /(motions\s*:\s*\{)([\s\S]*?)(\})/;
                    if (motionBlockRx.test(result)) {
                        result = result.replace(motionBlockRx, (m, open, inner, close) => {
                            let updated = inner;
                            const added = [];
                            for (const [key, file] of Object.entries(newMotionPairs)) {
                                const keyRx = new RegExp(`(\\s*)(${key})(\\s*:\\s*)('[^']*')(,?)`, 'g');
                                if (keyRx.test(updated)) {
                                    updated = updated.replace(new RegExp(`(\\b${key}\\b\\s*:\\s*)'[^']*'`), `$1'${file}'`);
                                    added.push(`replaced '${key}'`);
                                } else {
                                    updated = updated.trimEnd();
                                    if (updated && !updated.endsWith(',')) updated += ',';
                                    updated += `\n    ${key}: '${file}'`;
                                    added.push(`added '${key}'`);
                                }
                            }
                            logs.push({ ok: true, msg: `✓ ASSETS.motions: ${added.join(', ')}.` });
                            return `${open}${updated}\n  ${close}`;
                        });
                    } else {
                        logs.push({ ok: false, msg: `⚠ ASSETS.motions block not found — skipped.` });
                    }
                }
            }

            const preloadSnippet = generatedSnippets['tab-preload'] || '';
            if (preloadSnippet) {
                const newPreloadPairs = {};
                const preloadLines = preloadSnippet.trim().split('\n');
                preloadLines.forEach(line => {
                    const m = line.match(/^\s*(\w+)\s*:/);
                    if (m) newPreloadPairs[m[1]] = line.trim().replace(/,$/, '');
                });

                const loadFnRx = /(loadOptionalIntruderAssets[\s\S]*?const\s+tasks\s*=\s*\{)([\s\S]*?)(\};)/;
                if (loadFnRx.test(result)) {
                    result = result.replace(loadFnRx, (m, open, inner, close) => {
                        let updated = inner;
                        const added = [];
                        for (const [key, newLine] of Object.entries(newPreloadPairs)) {
                            const keyRx = new RegExp(`\\b${key}\\b\\s*:.*`);
                            if (keyRx.test(updated)) {
                                updated = updated.replace(keyRx, newLine + ',');
                                added.push(`replaced '${key}'`);
                            } else {
                                updated = updated.trimEnd();
                                if (updated && !updated.endsWith(',')) updated += ',';
                                updated += `\n        ${newLine},`;
                                added.push(`added '${key}'`);
                            }
                        }
                        logs.push({ ok: true, msg: `✓ Loading Queue: ${added.join(', ')}.` });
                        return `${open}${updated}\n      ${close}`;
                    });
                } else {
                    logs.push({ ok: false, msg: `⚠ loadOptionalIntruderAssets tasks block not found — skipped.` });
                }
            }

            const builderSnippet = generatedSnippets['tab-builder'] || '';
            if (builderSnippet) {
                const builderFnRx = /function\s+buildInteractivePlayerCharacter\s*\([\s\S]*?\}\s*\n\s*buildInteractivePlayerCharacter\([^)]*\);/;
                if (builderFnRx.test(result)) {
                    result = result.replace(builderFnRx, builderSnippet.trim());
                    logs.push({ ok: true, msg: `✓ Scene Builder: buildInteractivePlayerCharacter replaced entirely.` });
                } else {
                    const fnOnlyRx = /function\s+buildInteractivePlayerCharacter\s*\([\s\S]*?\n\s*\}/;
                    if (fnOnlyRx.test(result)) {
                        const fnPart = builderSnippet.replace(/\n\s*buildInteractivePlayerCharacter\([^)]*\);.*$/, '').trim();
                        result = result.replace(fnOnlyRx, fnPart);
                        logs.push({ ok: true, msg: `✓ Scene Builder: function body replaced.` });
                    } else {
                        logs.push({ ok: false, msg: `⚠ buildInteractivePlayerCharacter function not found — builder section skipped.` });
                    }
                }
            }

            // ── TAB 4: PLAYER CONTROLLER — slot-aware merge ───────────────────────
            // Strategy:
            //   1. Try to replace the full updatePlayer function (safest, first try)
            //   2. If that fails, tell the user to use Tab 4 manually
            const controllerSnippet = generatedSnippets['tab-controller'] || '';
            if (controllerSnippet) {
                // Match updatePlayer up to (but not including) movePlayerAxis
                const updatePlayerRx = /function\s+updatePlayer\s*\([\s\S]*?(?=\n\s*function\s+movePlayerAxis)/;
                // Also match the standalone fixed updatePlayer from a previous session (our fixed one ends with the camera block + closing brace)
                const standaloneRx = /\/\/ --- FIXED updatePlayer ---\s*\nfunction updatePlayer[\s\S]*?\n    \}/;
                if (updatePlayerRx.test(result)) {
                    result = result.replace(updatePlayerRx, controllerSnippet.trim() + '\n\n    ');
                    logs.push({ ok: true, msg: `✓ Player Controller: updatePlayer replaced with ${Object.keys(slotMap).length} slot(s).` });
                } else if (standaloneRx.test(result)) {
                    result = result.replace(standaloneRx, controllerSnippet.trim());
                    logs.push({ ok: true, msg: `✓ Player Controller: replaced standalone updatePlayer block.` });
                } else {
                    const fallbackRx = /function\s+updatePlayer\s*\(delta\)\s*\{[\s\S]*?\n    \}/;
                    if (fallbackRx.test(result)) {
                        result = result.replace(fallbackRx, controllerSnippet.trim());
                        logs.push({ ok: true, msg: `✓ Player Controller: replaced via fallback match.` });
                    } else {
                        logs.push({ ok: false, msg: `⚠ updatePlayer not matched — paste Tab 4 manually.` });
                    }
                }
            }

            statusBox.classList.remove('hidden');
            statusBox.innerHTML = logs.map(l =>
                `<div class="${l.ok ? 'text-neutral-300' : 'text-neutral-300'}">${l.msg}</div>`
            ).join('');

            const blob = new Blob([result], { type: 'text/html' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url;
            a.download = 'woodbury_getaway_updated.html';
            a.click();
            URL.revokeObjectURL(url);
            showToast('Merged file successfully downloaded!', 4000);
        }

        // =============================================
        // WOODBURY ASSET MANAGER
        // =============================================

        // Embedded Woodbury ASSETS state — mirrors woodbury_getaway.html ASSETS block
        window.woodburyAssets = {
          hdri: {
            nightField: 'https://static.seeles.ai/data/asset/export/43092a55-d0c1-4bbe-b476-f068bc775b69/969948/hdri_35a0af44-f982-45db-95d2-4dcc67bbc787.hdr'
          },
          models: {
            bed: 'https://static.seeles.ai/data/asset/export/87762adf-7325-4b27-b439-615308aec2d6/696101/threeJs_f7e63846-c577-4ede-af30-2387d1f8e877.glb',
            wardrobe: 'https://static.seeles.ai/data/asset/export/75a22e8b-e45c-4324-b0d0-8a4b7be9671a/926000/threeJs_622b582e-8c04-4688-890f-ad2a8049c85d.glb',
            wardrobeTall: 'https://static.seeles.ai/data/asset/export/96f19401-a309-45ca-8dc4-c9c4c9ac2f73/772062/threeJs_00fd99df-b252-406e-b0af-ff01a7865276.glb',
            nightstandLamp: 'https://static.seeles.ai/data/asset/export/5e470864-f7dc-4035-8365-cb7fd74a4124/265259/threeJs_de654a49-4afd-4bae-ae72-39206853b2a2.glb',
            nightstand: 'https://static.seeles.ai/data/asset/export/033c9663-353d-459b-a6e6-a0fe25124369/941322/threeJs_3bb38d97-02b0-40bb-a68e-7aa3972f42bc.glb',
            door: 'https://static.seeles.ai/data/asset/export/f9ec49c9-4b4d-4e4e-9486-e2cf2a40f2c5/940952/threeJs_2382894d-1c08-44db-bc5e-f523a4200648.glb',
            cabinet: 'https://static.seeles.ai/data/asset/export/545b587f-51e1-4e67-bd40-ab8e65ffb1c6/801867/threeJs_7998f89c-4810-44ac-9127-1bc17eff7930.glb',
            mansionExterior: 'https://static.seeles.ai/data/asset/export/b41de708-ba2c-43e8-b35b-5d76b571d5c3/950949/threeJs_5f208905-f988-4c9f-adb9-a7b0d21b50ae.glb',
            staircase: 'https://static.seeles.ai/data/asset/export/72c23955-9776-44ae-9b92-4b3d9c45eba1/990654/threeJs_1ea4dddb-1341-47d6-b082-1c01bd698dcd.glb',
            sofa: 'https://static.seeles.ai/data/asset/export/856a1fcf-65bd-49b8-8bed-ad25fedb6a2d/952363/threeJs_9524eec5-6042-4bf1-a97a-3495b1fb5ef3.glb',
            tv: 'https://static.seeles.ai/data/asset/export/4685be39-6fc5-4e11-a805-dac56fdb76e1/1002151/threeJs_47e72340-cf45-4ba0-b680-aacf0254bfea.glb',
            diningSet: 'https://static.seeles.ai/data/asset/export/21395a31-f8bf-4209-a3af-f3a431d2a5f9/741545/threeJs_4cba11a0-8fb9-4241-a969-ab9ccdda2872.glb',
            kitchenCounter: 'https://static.seeles.ai/data/asset/export/be7f2cb4-f34b-4ea1-849c-e83b84e29898/651080/threeJs_ac250853-8e8b-4348-a0cc-fcc03b328aea.glb',
            fridge: 'https://static.seeles.ai/data/asset/export/763c0da0-561f-4e03-9de9-5be3491c9173/947937/threeJs_9909ef65-3cf7-4973-becb-fa900d444074.glb',
            oven: 'https://static.seeles.ai/data/asset/export/eed90304-0a2c-4a7e-bf76-342d74f35aa7/961961/threeJs_d35fd5ce-4777-46bc-af6e-6f166042c40e.glb',
            cctv: 'https://static.seeles.ai/data/asset/export/671eae22-d8f3-4a47-a33a-9b26118e89dd/1017881/threeJs_1017881_2892281.glb',
            umbrella: 'https://static.seeles.ai/data/asset/export/864143a6-3199-4b2c-83bf-2d286c421720/988440/threeJs_b6b5dd6d-be97-4452-818a-97009f898971.glb',
            sedan: 'https://static.seeles.ai/data/asset/export/3413f54e-8823-4e53-bd7e-4f4842188a2c/926701/threeJs_901136ed-767f-45f7-85fb-9200a8183909.glb',
            coatRack: 'https://static.seeles.ai/data/asset/export/cfae5b0e-ab83-4164-9d78-a3a700a640fc/916520/threeJs_41e8f957-e670-44df-8066-f7ff60762376.glb',
            piano: 'https://static.seeles.ai/data/asset/export/0e5d8045-145f-47e1-8746-e37cff00e507/1004953/threeJs_45897f52-d74a-4090-942f-3fc9567149cb.glb',
            bookcase: 'https://static.seeles.ai/data/asset/export/6d62fd3d-2ad2-43ca-99a3-b5c851236c90/948388/threeJs_95a6ca55-4c21-41b8-9fbb-f6b388c5bf62.glb',
            loungeSet: 'https://static.seeles.ai/data/asset/export/c3ec7ce1-3ae1-4636-9a98-2fb6fa4ac284/928429/threeJs_fb57af7c-643b-4ae9-bfd4-bbb938dd8950.glb',
            consoleTable: 'https://static.seeles.ai/data/asset/export/34ddedd0-87b5-455a-96a5-4d022fdb77dc/941072/threeJs_9eff8419-70e5-4e3c-8289-97e61dff85f7.glb',
            plantStand: 'https://static.seeles.ai/data/asset/export/cff30703-b91c-4c99-9d97-6a8da37b6805/652292/threeJs_a368cc01-4309-4b6b-8fa7-6b6628025587.glb',
            chandelier: 'https://static.seeles.ai/data/asset/export/d1a8d737-1a51-4089-80b5-99388c4918c8/922373/threeJs_2f19c5e9-3cd9-47c9-ad25-2a80cb52f52c.glb',
            roadsideShelter: 'https://static.seeles.ai/data/asset/export/04d04503-1ba0-497b-9fda-cddee24d37ab/764936/threeJs_ff802237-ea48-4341-94ca-6ea844ec9374.glb',
            signpost: 'https://static.seeles.ai/data/asset/export/2723de8d-f08c-4d57-a838-fc4c33edf317/929444/threeJs_c27a3194-da1e-4fc9-8998-b611566b6cf3.glb',
            myCustomModel: 'https://yacob247.github.io/Trial%202/procedural_city_6.glb'
          },
          motions: {
            walk: 'https://static.seeles.ai/data/asset/export/4ecd19cc-ca7c-4efa-b1d6-e57fac737c75/1005961/source.fbx',
            idle: 'https://static.seeles.ai/data/asset/export/50ed8b8c-9197-48b6-a511-7bbb4b4533a6/1005967/source.fbx',
            stalk: 'https://static.seeles.ai/data/asset/export/f979ad42-fabe-4fd3-b71b-c7721c524f61/1005972/source.fbx',
            run: 'https://static.seeles.ai/data/asset/export/19e6092d-2886-4e9e-af49-501409f7f118/1005942/source.fbx',
            phone: 'https://static.seeles.ai/data/asset/export/e8692fb8-551e-4c2a-bae3-4ef7c04318ae/1005929/source.fbx',
            dismiss: 'https://static.seeles.ai/data/asset/export/e56649bd-ce8c-4940-b24f-21590c3da3fa/1006009/source.fbx',
            point: 'https://static.seeles.ai/data/asset/export/c8210b6b-93c5-402b-839c-ba5b9379a448/1005964/source.fbx'
          }
        };

        // Woodbury source HTML cache (loaded in merge tab)
        let woodburySourceHTML = null;

        function renderWoodburyAssetList() {
            const list = document.getElementById('woodbury-asset-list');
            const countEl = document.getElementById('wb-asset-count');
            list.innerHTML = '';

            const sections = [
                { key: 'models', label: 'Model', icon: 'fa-cube', color: 'text-neutral-300' },
                { key: 'motions', label: 'Motion', icon: 'fa-person-walking', color: 'text-neutral-300' }
            ];

            let total = 0;
            sections.forEach(({ key, label, icon, color }) => {
                const entries = Object.entries(woodburyAssets[key] || {});
                if (!entries.length) return;

                const header = document.createElement('div');
                header.className = 'text-[9px] uppercase tracking-widest text-neutral-400 font-bold mt-2 mb-1 px-1';
                header.textContent = label + 's';
                list.appendChild(header);

                entries.forEach(([id, url]) => {
                    total++;
                    const ext = url.split('.').pop().split('?')[0].toUpperCase();
                    const isFbx = ext === 'FBX';

                    const row = document.createElement('div');
                    row.className = 'flex items-center gap-1.5 bg-neutral-800/70 hover:bg-neutral-700/80 rounded px-2 py-1.5 group cursor-pointer border border-transparent hover:border-neutral-600 transition';
                    row.title = url;
                    row.innerHTML = `
                        <i class="fa-solid ${icon} ${color} text-[10px] shrink-0"></i>
                        <span class="font-mono text-[11px] text-neutral-300 flex-1 truncate" title="ASSETS.${key}.${id}">${id}</span>
                        <span class="text-[9px] text-neutral-400 shrink-0">${ext}</span>
                        <button class="wb-load-btn shrink-0 text-[10px] text-neutral-300 hover:text-neutral-300 px-1 opacity-0 group-hover:opacity-100 transition" title="Load into viewport">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="wb-del-btn shrink-0 text-[10px] text-neutral-400/70 hover:text-neutral-300 px-0.5 opacity-0 group-hover:opacity-100 transition" title="Delete from Woodbury state">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    `;

                    row.querySelector('.wb-load-btn').addEventListener('click', (e) => {
                        e.stopPropagation();
                        loadWoodburyAsset(key, id, url, isFbx);
                    });
                    row.querySelector('.wb-del-btn').addEventListener('click', (e) => {
                        e.stopPropagation();
                        deleteWoodburyAsset(key, id);
                    });
                    // click row = load
                    row.addEventListener('click', () => loadWoodburyAsset(key, id, url, isFbx));

                    list.appendChild(row);
                });
            });

            countEl.textContent = total + ' assets';
        }

        function loadWoodburyAsset(category, id, url, isFbx) {
            if (!url.startsWith('http')) {
                showToast(`"${id}" is a local file path — upload it manually.`, 3000);
                return;
            }
            showToast(`Loading ASSETS.${category}.${id}…`, 2000);

            // Fetch as blob to bypass CORS on loaders
            fetch(url)
                .then(r => {
                    if (!r.ok) throw new Error('Fetch failed: ' + r.status);
                    return r.arrayBuffer();
                })
                .then(buffer => {
                    const fakeFile = new File([buffer], id + '.' + (isFbx ? 'fbx' : 'glb'), {
                        type: isFbx ? 'application/octet-stream' : 'model/gltf-binary'
                    });
                    // Inject into the existing upload handler
                    handleFilesLoaded([fakeFile]);
                })
                .catch(err => {
                    showToast(`Failed to load "${id}": ${err.message}`, 4000);
                });
        }

        function deleteWoodburyAsset(category, id) {
            if (!woodburyAssets[category] || !(id in woodburyAssets[category])) return;
            delete woodburyAssets[category][id];
            renderWoodburyAssetList();
            showToast(`Deleted ASSETS.${category}.${id} from state.`, 2000);
        }

        window.saveWoodburyFile = function() {
            // Read woodbury source from merge textarea if pasted, else use embedded state only
            const mergeInput = document.getElementById('woodbury-source-input-merge');
            let source = mergeInput ? mergeInput.value.trim() : '';

            if (!source) {
                // No source pasted — just download the ASSETS block as a snippet
                const assetsSnippet = buildAssetsSnippet();
                const blob = new Blob([assetsSnippet], { type: 'text/javascript' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'woodbury_ASSETS_updated.js';
                a.click();
                URL.revokeObjectURL(a.href);
                showToast('Downloaded updated ASSETS snippet. Paste Woodbury source in Merge tab for full file.', 4000);
                return;
            }

            // Replace ASSETS block in full source
            const newAssets = buildAssetsSnippet();
            // Match from `const ASSETS = {` to the closing `};` on its own line
            const assetsRx = /[ \t]*const ASSETS\s*=\s*\{[\s\S]*?\n[ \t]*\};/;
            let updated = source;
            if (assetsRx.test(source)) {
                updated = source.replace(assetsRx, newAssets);
                showToast('ASSETS replaced — downloading woodbury_getaway.html', 3000);
            } else {
                showToast('Could not find ASSETS block — inserting before game script closes', 3000);
                // Target the last closing script tag (game script, not importmap)
                const lastScriptClose = source.lastIndexOf('<\/script>');
                if (lastScriptClose !== -1) {
                    updated = source.slice(0, lastScriptClose) + newAssets + '\n    <\/script>' + source.slice(lastScriptClose + 9);
                }
            }

            const blob = new Blob([updated], { type: 'text/html' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'woodbury_getaway.html';
            a.click();
            URL.revokeObjectURL(a.href);
        };

        function buildAssetsSnippet() {
            const WA = woodburyAssets;
            let lines = ['    const ASSETS = {'];
            // hdri
            if (WA.hdri && Object.keys(WA.hdri).length) {
                lines.push('      hdri: {');
                Object.entries(WA.hdri).forEach(([k,v]) => lines.push(`        ${k}: '${v}'`));
                lines.push('      },');
            }
            // models
            lines.push('      models: {');
            Object.entries(WA.models || {}).forEach(([k,v]) => lines.push(`        ${k}: '${v}',`));
            lines.push('      },');
            // motions
            lines.push('      motions: {');
            Object.entries(WA.motions || {}).forEach(([k,v]) => lines.push(`        ${k}: '${v}',`));
            lines.push('      }');
            lines.push('    };');
            return lines.join('\n');
        }

        // Shim: wrap existing upload handler to be callable programmatically
        const _origUploadInput = document.getElementById('upload-files');
        function handleFilesLoaded(files) {
            // Dispatch a synthetic change on the file input
            // We override the files property via DataTransfer
            try {
                const dt = new DataTransfer();
                files.forEach(f => dt.items.add(f));
                _origUploadInput.files = dt.files;
                _origUploadInput.dispatchEvent(new Event('change'));
            } catch(e) {
                showToast('Could not inject file — browser may block DataTransfer override.', 4000);
            }
        }

        // =============================================
        // WORKSPACE PERSISTENCE — IndexedDB Quick Save/Load + File Import/Export
        // =============================================

        const ANIM_DB_NAME = 'animatorStudioDB';
        const ANIM_DB_STORE = 'workspace';
        const ANIM_DB_KEY = 'quicksave'; // single named slot, overwritten each Quick Save

        function openAnimDB() {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open(ANIM_DB_NAME, 1);
                req.onupgradeneeded = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains(ANIM_DB_STORE)) {
                        db.createObjectStore(ANIM_DB_STORE);
                    }
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }

        async function idbPut(key, value) {
            const db = await openAnimDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(ANIM_DB_STORE, 'readwrite');
                tx.objectStore(ANIM_DB_STORE).put(value, key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        }

        async function idbGet(key) {
            const db = await openAnimDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(ANIM_DB_STORE, 'readonly');
                const req = tx.objectStore(ANIM_DB_STORE).get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }

        // --- Binary <-> base64 helpers (chunked to avoid call-stack blowups on big files) ---
        function arrayBufferToBase64(buffer) {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const chunkSize = 0x8000;
            for (let i = 0; i < bytes.length; i += chunkSize) {
                binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
            }
            return btoa(binary);
        }

        function base64ToArrayBuffer(base64) {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return bytes.buffer;
        }

        // Build a fully serializable snapshot of the entire workspace (model + anim files + all metadata)
        function buildWorkspaceSnapshot() {
            // Collect just the raw files actually referenced (character model + each anim's source file)
            const neededFiles = new Set();
            if (uploadedModelFileName) neededFiles.add(uploadedModelFileName);
            animationData.forEach(a => { if (a.sourceFile) neededFiles.add(a.sourceFile); });

            const files = {};
            neededFiles.forEach(name => {
                if (originalUploadedFiles[name]) {
                    files[name] = arrayBufferToBase64(originalUploadedFiles[name]);
                }
            });

            return {
                version: 1,
                savedAt: new Date().toISOString(),
                uploadedModelFileName,
                files, // { fileName: base64 }
                animations: animationData.map(a => ({
                    name: a.name,
                    exportId: a.exportId,
                    sourceFile: a.sourceFile,
                    key: a.key,
                    order: a.order,
                    slot: a.slot,
                    moveDir: a.moveDir,
                    moveSpeed: a.moveSpeed
                })),
                pendingEmptySlots: Array.from(pendingEmptySlots),
                woodburyAssets: window.woodburyAssets
            };
        }

        // Rebuild the entire workspace (scene, mixer, animationData, UI) from a snapshot
        async function restoreWorkspaceSnapshot(snapshot) {
            if (!snapshot || !snapshot.files) throw new Error('Invalid or empty workspace snapshot.');

            // Reset current workspace first
            if (currentModel) {
                scene.remove(currentModel);
                currentModel.traverse(child => {
                    if (child.isMesh) {
                        child.geometry.dispose();
                        if (child.material && child.material.dispose) child.material.dispose();
                    }
                });
            }
            if (mixer) { mixer.stopAllAction(); mixer = null; }
            currentModel = null;
            currentAction = null;
            animationData = [];
            originalUploadedFiles = {};

            // Restore raw files into the cache + originalUploadedFiles
            const fileBuffers = {};
            for (const [name, b64] of Object.entries(snapshot.files)) {
                const buf = base64ToArrayBuffer(b64);
                fileBuffers[name] = buf;
                originalUploadedFiles[name] = buf;
            }

            uploadedModelFileName = snapshot.uploadedModelFileName || 'my_character.fbx';

            // Re-parse each unique FBX file (character mesh comes from uploadedModelFileName;
            // animations are matched back up by sourceFile + name)
            const uniqueFiles = Object.keys(fileBuffers);
            for (const fileName of uniqueFiles) {
                const buffer = fileBuffers[fileName];
                let fbx;
                try {
                    fbx = fbxLoader.parse(buffer, '');
                } catch (e) {
                    showToast(`Could not re-parse "${fileName}": ${e.message}`, 5000);
                    continue;
                }

                if (fileName === uploadedModelFileName && !currentModel && fbx.children.length > 0) {
                    setupCharacterMesh(fbx);
                }

                if (fbx.animations && fbx.animations.length > 0) {
                    fbx.animations.forEach((clip, index) => {
                        clip.tracks.forEach(track => {
                            track.name = track.name.replace(/.*mixamorig/g, 'mixamorig');
                        });
                        const action = mixer ? mixer.clipAction(clip) : null;

                        // Find the saved metadata entry that matches this clip (by sourceFile + ordinal)
                        const matchesForFile = snapshot.animations.filter(a => a.sourceFile === fileName);
                        const meta = matchesForFile[index] || matchesForFile[0];

                        animationData.push({
                            id: Date.now() + Math.random() + index,
                            name: (meta && meta.name) || clip.name || `Animation_${index + 1}`,
                            exportId: (meta && meta.exportId) || 'anim',
                            sourceFile: fileName,
                            clip: clip,
                            action: action,
                            key: (meta && meta.key) || '',
                            order: (meta && meta.order) || (animationData.length + 1),
                            slot: (meta && meta.slot) || '',
                            moveDir: (meta && meta.moveDir) || 'none',
                            moveSpeed: (meta && meta.moveSpeed) || 0,
                            checked: false
                        });
                    });
                }
            }

            pendingEmptySlots = new Set(snapshot.pendingEmptySlots || []);
            currentActiveSlot = null;

            if (snapshot.woodburyAssets) {
                window.woodburyAssets = snapshot.woodburyAssets;
                renderWoodburyAssetList();
            }

            renderAnimationList();
            if (animationData.length > 0) {
                btnExportCode.disabled = false;
                if (!currentAction) playAnimationIsolated(animationData[0].id);
            }
        }

        window.quickSaveWorkspace = async function() {
            const statusEl = document.getElementById('quicksave-status');
            if (animationData.length === 0 && !currentModel) {
                showToast('Nothing to save yet — upload a character first.', 3000);
                return;
            }
            try {
                showToast('Saving workspace…', false);
                const snapshot = buildWorkspaceSnapshot();
                await idbPut(ANIM_DB_KEY, snapshot);
                showToast('Quick Save complete.', 2500);
                if (statusEl) statusEl.textContent = `Last saved: ${new Date(snapshot.savedAt).toLocaleTimeString()}`;
            } catch (err) {
                handleError(new Error('Quick Save failed: ' + err.message));
            }
        };

        window.quickLoadWorkspace = async function() {
            try {
                showToast('Loading saved workspace…', false);
                const snapshot = await idbGet(ANIM_DB_KEY);
                if (!snapshot) {
                    showToast('No Quick Save found yet.', 3000);
                    return;
                }
                await restoreWorkspaceSnapshot(snapshot);
                showToast('Quick Load complete.', 2500);
                const statusEl = document.getElementById('quicksave-status');
                if (statusEl) statusEl.textContent = `Loaded save from: ${new Date(snapshot.savedAt).toLocaleString()}`;
            } catch (err) {
                handleError(new Error('Quick Load failed: ' + err.message));
            }
        };

        window.exportWorkspaceFile = function() {
            if (animationData.length === 0 && !currentModel) {
                showToast('Nothing to export yet — upload a character first.', 3000);
                return;
            }
            try {
                const snapshot = buildWorkspaceSnapshot();
                const blob = new Blob([JSON.stringify(snapshot)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `animator_studio_workspace_${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(a.href);
                showToast('Workspace exported.', 3000);
            } catch (err) {
                handleError(new Error('Export failed: ' + err.message));
            }
        };

        document.getElementById('import-workspace-input').addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            try {
                showToast('Importing workspace…', false);
                const text = await file.text();
                const snapshot = JSON.parse(text);
                await restoreWorkspaceSnapshot(snapshot);
                showToast('Workspace imported successfully.', 3000);
            } catch (err) {
                handleError(new Error('Import failed: ' + err.message));
            } finally {
                event.target.value = '';
            }
        });

        // Init Woodbury panel
        renderWoodburyAssetList();

        init();

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
