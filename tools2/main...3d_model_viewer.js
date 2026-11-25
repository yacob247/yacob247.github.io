{
            "imports": {
                "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
                "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
            }
        }

import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { TransformControls } from 'three/addons/controls/TransformControls.js';

        // Loaders
        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
        import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
        import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
        import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
        import { STLLoader } from 'three/addons/loaders/STLLoader.js';
        import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
        import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';
        import { TDSLoader } from 'three/addons/loaders/TDSLoader.js';

        // Exporters
        import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
        import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
        import { STLExporter } from 'three/addons/exporters/STLExporter.js';
        import { PLYExporter } from 'three/addons/exporters/PLYExporter.js';

        // --- State ---
        let scene, camera, renderer, controls, transformControl;
        let currentModel = null;
        let isWireframe = false;
        let currentMode = 'standard';
        let gridHelper = null;
        let ambientLight, dirLight, dirLight2;
        let isAutoRotate = false;
        let shadowsEnabled = false;
        let isExploded = false;
        let clonedModels = [];
        const depthMaterial = new THREE.MeshDepthMaterial();
        const matcapMaterial = new THREE.MeshMatcapMaterial();

        // --- Animator state ---
        let animMixer = null;
        let animClock = new THREE.Clock();
        let animCurrentAction = null;
        let animData = []; // {id, name, clip, action, sourceFile}
        let animCharModel = null;
        let animLoopEnabled = true;
        let animRawFiles = {}; // fileName -> ArrayBuffer

        // --- Materials ---
        const normalMaterial = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
        let uvMaterial = null;

        // --- DOM Elements ---
        const container = document.getElementById('canvas-container');
        const fileInput = document.getElementById('file-input');
        const loadingOverlay = document.getElementById('loading-overlay');
        const noModelText = document.getElementById('no-model-text');
        const toast = document.getElementById('toast');

        // Inspection Buttons
        const btnReset = document.getElementById('btn-reset');
        const btnWireframe = document.getElementById('btn-wireframe');
        const btnNormals = document.getElementById('btn-normals');
        const btnUv = document.getElementById('btn-uv');
        const btnDepth = document.getElementById('btn-depth');
        const btnFlat = document.getElementById('btn-flat');
        const btnXray = document.getElementById('btn-xray');

        // Scene controls
        const bgColorPicker = document.getElementById('bg-color-picker');
        const ambientSlider = document.getElementById('ambient-slider');
        const dirSlider = document.getElementById('dir-slider');
        const btnGrid = document.getElementById('btn-grid');
        const btnAutoRotate = document.getElementById('btn-autorotate');
        const btnShadows = document.getElementById('btn-shadows');
        const btnScreenshot = document.getElementById('btn-screenshot');
        const btnCenter = document.getElementById('btn-center');
        const btnExplode = document.getElementById('btn-explode');

        // Editor & Converter Buttons
        const colorPicker = document.getElementById('color-picker');
        const emissivePicker = document.getElementById('emissive-picker');
        const metalnessSlider = document.getElementById('metalness-slider');
        const roughnessSlider = document.getElementById('roughness-slider');
        const opacitySlider = document.getElementById('opacity-slider');
        const btnTrans = document.getElementById('btn-trans');
        const btnRot = document.getElementById('btn-rot');
        const btnScale = document.getElementById('btn-scale');
        const btnExport = document.getElementById('btn-export');
        const exportFormat = document.getElementById('export-format');
        const textureInput = document.getElementById('texture-input');
        const normalTextureInput = document.getElementById('normal-texture-input');
        const btnFlipNormals = document.getElementById('btn-flip-normals');
        const btnCenterModel = document.getElementById('btn-center-model');
        const btnClone = document.getElementById('btn-clone');
        const btnDelete = document.getElementById('btn-delete');

        // --- Sample Data (must be declared before init() calls populateSamples) ---
        const GLB_SAMPLES = [
            { name: 'Avocado', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Avocado/glTF-Binary/Avocado.glb' },
            { name: 'DamagedHelmet', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb' },
            { name: 'BoomBox', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BoomBox/glTF-Binary/BoomBox.glb' },
            { name: 'FlightHelmet', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/FlightHelmet/glTF-Binary/FlightHelmet.glb' },
            { name: 'WaterBottle', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/WaterBottle/glTF-Binary/WaterBottle.glb' },
            { name: 'SciFiHelmet', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SciFiHelmet/glTF-Binary/SciFiHelmet.glb' },
            { name: 'DragonAttenuation', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DragonAttenuation/glTF-Binary/DragonAttenuation.glb' },
            { name: 'Fox (Animated)', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb' },
            { name: 'CesiumMilkTruck', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb' },
            { name: 'Lantern', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Lantern/glTF-Binary/Lantern.glb' },
        ];
        const OBJ_SAMPLES = [
            { name: 'Utah Teapot', url: 'https://raw.githubusercontent.com/nicktindall/cyclopedia/master/examples/geometry-demo/assets/teapot.obj' },
            { name: 'Stanford Bunny', url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/master/data/bunny.obj' },
            { name: 'African Head', url: 'https://raw.githubusercontent.com/ssloy/tinyrenderer/master/obj/african_head/african_head.obj' },
            { name: 'Cube reference', url: 'https://raw.githubusercontent.com/nicktindall/cyclopedia/master/examples/loaders/assets/cube.obj' },
            { name: 'Diablo model', url: 'https://raw.githubusercontent.com/ssloy/tinyrenderer/master/obj/diablo3_pose/diablo3_pose.obj' },
            { name: 'Spot (cow)', url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/master/data/spot.obj' },
            { name: 'Horse mesh', url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/master/data/horse.obj' },
            { name: 'Camelhead', url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/master/data/camelhead.obj' },
            { name: 'Armadillo', url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/master/data/armadillo.obj' },
            { name: 'Cheburashka', url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/master/data/cheburashka.obj' },
        ];

        init();
        animate();

        function init() {
            // Scene
            scene = new THREE.Scene();
            scene.background = new THREE.Color('#212121');

            // Camera
            camera = new THREE.PerspectiveCamera(45, (window.innerWidth - 300) / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 2, 5);

            // Renderer
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
            renderer.setSize(window.innerWidth - 300, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.0;
            renderer.shadowMap.enabled = false;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            container.appendChild(renderer.domElement);

            // Controls
            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;

            // Transform Controls (Editor)
            transformControl = new TransformControls(camera, renderer.domElement);
            transformControl.addEventListener('dragging-changed', function (event) {
                controls.enabled = !event.value;
            });
            scene.add(transformControl);

            // Lighting
            ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
            scene.add(ambientLight);

            dirLight = new THREE.DirectionalLight(0xffffff, 2);
            dirLight.position.set(5, 10, 7.5);
            dirLight.castShadow = false;
            dirLight.shadow.mapSize.width = 2048;
            dirLight.shadow.mapSize.height = 2048;
            scene.add(dirLight);

            dirLight2 = new THREE.DirectionalLight(0xffffff, 1);
            dirLight2.position.set(-5, -5, -5);
            scene.add(dirLight2);

            // Generate UV Checker Material
            uvMaterial = new THREE.MeshBasicMaterial({ 
                map: createUVCheckerTexture(),
                side: THREE.DoubleSide
            });

            // Grid Helper
            gridHelper = new THREE.GridHelper(20, 80, 0x334155, 0x1e293b);
            scene.add(gridHelper);

            // Matcap texture (procedural clay-like)
            const matcapCanvas = document.createElement('canvas');
            matcapCanvas.width = 256; matcapCanvas.height = 256;
            const mc = matcapCanvas.getContext('2d');
            const grd = mc.createRadialGradient(90, 80, 10, 128, 128, 140);
            grd.addColorStop(0, '#b4b4b4'); grd.addColorStop(0.4, '#b4b4b4'); grd.addColorStop(1, '#b4b4b4');
            mc.fillStyle = grd; mc.fillRect(0, 0, 256, 256);
            matcapMaterial.matcap = new THREE.CanvasTexture(matcapCanvas);

            // Event Listeners
            window.addEventListener('resize', onWindowResize);
            fileInput.addEventListener('change', handleFileUpload);
            document.addEventListener('dragover', (e) => e.preventDefault());
            document.addEventListener('drop', handleDrop);

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (document.activeElement.tagName === 'INPUT') return;
                if (e.key === 'w' || e.key === 'W') toggleWireframe();
                if (e.key === 'n' || e.key === 'N') setMode('normals');
                if (e.key === 'u' || e.key === 'U') setMode('uv');
                if (e.key === 'd' || e.key === 'D') setMode('depth');
                if (e.key === 'm' || e.key === 'M') setMode('flat');
                if (e.key === 'x' || e.key === 'X') setMode('xray');
                if (e.key === 'p' || e.key === 'P') takeScreenshot();
                if (e.key === 'Escape') setMode('standard');
            });

            // Inspection Bindings
            btnReset.addEventListener('click', () => setMode('standard'));
            btnWireframe.addEventListener('click', toggleWireframe);
            btnNormals.addEventListener('click', () => setMode('normals'));
            btnUv.addEventListener('click', () => setMode('uv'));
            btnDepth.addEventListener('click', () => setMode('depth'));
            btnFlat.addEventListener('click', () => setMode('flat'));
            btnXray.addEventListener('click', () => setMode('xray'));

            // Scene controls
            bgColorPicker.addEventListener('input', (e) => { scene.background = new THREE.Color(e.target.value); });
            ambientSlider.addEventListener('input', (e) => { ambientLight.intensity = e.target.value / 100; });
            dirSlider.addEventListener('input', (e) => { dirLight.intensity = e.target.value / 100; });
            btnGrid.addEventListener('click', () => {
                gridHelper.visible = !gridHelper.visible;
                btnGrid.textContent = gridHelper.visible ? 'ON' : 'OFF';
                btnGrid.classList.toggle('on', gridHelper.visible);
            });
            btnAutoRotate.addEventListener('click', () => {
                isAutoRotate = !isAutoRotate;
                controls.autoRotate = isAutoRotate;
                controls.autoRotateSpeed = 1.5;
                btnAutoRotate.textContent = isAutoRotate ? 'ON' : 'OFF';
                btnAutoRotate.classList.toggle('on', isAutoRotate);
            });
            btnShadows.addEventListener('click', () => {
                shadowsEnabled = !shadowsEnabled;
                renderer.shadowMap.enabled = shadowsEnabled;
                dirLight.castShadow = shadowsEnabled;
                if (currentModel) currentModel.traverse(c => { if (c.isMesh) { c.castShadow = shadowsEnabled; c.receiveShadow = shadowsEnabled; } });
                btnShadows.textContent = shadowsEnabled ? 'ON' : 'OFF';
                btnShadows.classList.toggle('on', shadowsEnabled);
                showToast('Shadows ' + (shadowsEnabled ? 'enabled' : 'disabled'));
            });
            btnScreenshot.addEventListener('click', takeScreenshot);
            btnCenter.addEventListener('click', resetCamera);
            btnExplode.addEventListener('click', toggleExplode);

            // Editor
            btnTrans.addEventListener('click', () => setTransformMode('translate', btnTrans));
            btnRot.addEventListener('click', () => setTransformMode('rotate', btnRot));
            btnScale.addEventListener('click', () => setTransformMode('scale', btnScale));
            btnExport.addEventListener('click', () => exportFile(exportFormat.value));
            colorPicker.addEventListener('input', updateModelColor);
            emissivePicker.addEventListener('input', updateEmissive);
            metalnessSlider.addEventListener('input', (e) => updateMaterialProp('metalness', e.target.value / 100));
            roughnessSlider.addEventListener('input', (e) => updateMaterialProp('roughness', e.target.value / 100));
            opacitySlider.addEventListener('input', (e) => updateMaterialProp('opacity', e.target.value / 100));
            textureInput.addEventListener('change', handleTextureUpload);
            normalTextureInput.addEventListener('change', handleNormalMapUpload);
            btnFlipNormals.addEventListener('click', flipNormals);
            btnCenterModel.addEventListener('click', centerModelToOrigin);
            btnClone.addEventListener('click', cloneModel);
            btnDelete.addEventListener('click', deleteModel);

            // Tabs
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                    btn.classList.add('active');
                    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
                });
            });

            // Populate samples
            populateSamples();
        }

        // --- Custom UV Checker Texture ---
        function createUVCheckerTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 1024;
            const context = canvas.getContext('2d');
            const numSquares = 32;
            const squareSize = canvas.width / numSquares;

            for (let i = 0; i < numSquares; i++) {
                for (let j = 0; j < numSquares; j++) {
                    context.fillStyle = (i + j) % 2 === 0 ? '#b4b4b4' : '#2f2f2f';
                    context.fillRect(i * squareSize, j * squareSize, squareSize, squareSize);
                    if ((i + j) % 2 === 0) {
                        context.fillStyle = '#b4b4b4';
                        context.beginPath();
                        context.arc(i * squareSize + squareSize/2, j * squareSize + squareSize/2, 2, 0, Math.PI * 2);
                        context.fill();
                    }
                }
            }
            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            return texture;
        }

        // --- File Handling & Loaders ---
        function handleDrop(event) {
            event.preventDefault();
            if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
                loadFile(event.dataTransfer.files[0]);
            }
        }

        function handleFileUpload(event) {
            if (event.target.files && event.target.files.length > 0) {
                loadFile(event.target.files[0]);
            }
        }

        function loadFile(file) {
            const extension = file.name.split('.').pop().toLowerCase();
            const url = URL.createObjectURL(file);

            loadingOverlay.style.display = 'flex';
            loadingOverlay.querySelector('h2').innerText = 'Processing Geometry...';
            noModelText.style.display = 'none';

            if (currentModel) {
                transformControl.detach();
                scene.remove(currentModel);
                currentModel.traverse((child) => {
                    if (child.isMesh) {
                        child.geometry.dispose();
                        if (child.material.isMaterial) child.material.dispose();
                    }
                });
            }

            try {
                switch (extension) {
                    case 'glb':
                    case 'gltf':
                        new GLTFLoader().load(url, (gltf) => setupModel(gltf.scene), undefined, handleError);
                        break;
                    case 'obj':
                        new OBJLoader().load(url, (obj) => setupModel(obj), undefined, handleError);
                        break;
                    case 'fbx':
                        new FBXLoader().load(url, (fbx) => setupModel(fbx), undefined, handleError);
                        break;
                    case 'stl':
                        new STLLoader().load(url, (geo) => {
                            const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide });
                            setupModel(new THREE.Mesh(geo, mat));
                        }, undefined, handleError);
                        break;
                    case 'ply':
                        new PLYLoader().load(url, (geo) => {
                            geo.computeVertexNormals();
                            const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide });
                            setupModel(new THREE.Mesh(geo, mat));
                        }, undefined, handleError);
                        break;
                    case 'dae':
                        new ColladaLoader().load(url, (collada) => setupModel(collada.scene), undefined, handleError);
                        break;
                    case '3ds':
                        new TDSLoader().load(url, (tds) => setupModel(tds), undefined, handleError);
                        break;
                    case 'json': {
                        // Three.js ObjectLoader JSON scene graph
                        const loader = new THREE.ObjectLoader();
                        loader.load(url, (obj) => setupModel(obj), undefined, handleError);
                        break;
                    }
                    case 'svg': {
                        // Render SVG as a flat plane texture
                        new THREE.TextureLoader().load(url, (tex) => {
                            tex.colorSpace = THREE.SRGBColorSpace;
                            const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
                            const geo = new THREE.PlaneGeometry(5, 5 * (tex.image.height / tex.image.width || 1));
                            setupModel(new THREE.Mesh(geo, mat));
                        }, undefined, handleError);
                        break;
                    }
                    case 'png':
                    case 'jpg':
                    case 'jpeg':
                    case 'webp': {
                        // Image as textured plane
                        new THREE.TextureLoader().load(url, (tex) => {
                            tex.colorSpace = THREE.SRGBColorSpace;
                            const ar = tex.image.width / (tex.image.height || 1);
                            const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
                            setupModel(new THREE.Mesh(new THREE.PlaneGeometry(5, 5/ar), mat));
                        }, undefined, handleError);
                        break;
                    }
                    default:
                        showToast('Format .' + extension + ' not supported for 3D view');
                        loadingOverlay.style.display = 'none';
                }
            } catch (err) {
                handleError(err);
            }
        }

        function handleError(error) {
            console.error('Error loading model:', error);
            loadingOverlay.style.display = 'none';
            noModelText.style.display = 'flex';
            const msg = error && error.message ? error.message : String(error);
            showToast('âš  Load failed: ' + msg.slice(0, 60));
        }

        function setupModel(model) {
            currentModel = model;

            // Backup materials and ensure standardized setup
            currentModel.traverse((child) => {
                if (child.isMesh) {
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.userData.originalMaterial = child.material.map(m => m.clone());
                        } else {
                            child.userData.originalMaterial = child.material.clone();
                            child.userData.originalMaterial.side = THREE.DoubleSide; 
                        }
                    } else {
                         child.userData.originalMaterial = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, color: colorPicker.value });
                         child.material = child.userData.originalMaterial;
                    }
                    child.castShadow = shadowsEnabled;
                    child.receiveShadow = shadowsEnabled;
                }
            });

            // Center and Scale Model
            const box = new THREE.Box3().setFromObject(currentModel);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);

            const targetSize = 5;
            const scale = targetSize / maxDim;
            currentModel.scale.set(scale, scale, scale);

            const newBox = new THREE.Box3().setFromObject(currentModel);
            const newCenter = newBox.getCenter(new THREE.Vector3());

            currentModel.position.sub(newCenter);
            currentModel.position.y += (newBox.getSize(new THREE.Vector3()).y / 2);

            scene.add(currentModel);

            // Attach editor controls
            transformControl.attach(currentModel);
            setTransformMode('translate', btnTrans);

            camera.position.set(0, targetSize/2, targetSize * 1.5);
            controls.target.set(0, targetSize/2, 0);
            controls.update();

            loadingOverlay.style.display = 'none';
            noModelText.style.display = 'none';
            isWireframe = false;
            isExploded = false;
            setMode('standard');
            updateStats(currentModel);
            document.getElementById('sb-mode').textContent = 'Model loaded · Standard View';
            showToast('Model loaded successfully!');
        }

        // --- Editing Tools ---
        function setTransformMode(mode, activeBtn) {
            if(!currentModel) return;
            transformControl.setMode(mode);
            [btnTrans, btnRot, btnScale].forEach(btn => { btn.classList.remove('active'); });
            activeBtn.classList.add('active');
        }

        function updateModelColor(e) {
            if (!currentModel) return;
            const color = new THREE.Color(e.target.value);
            currentModel.traverse((child) => {
                if (child.isMesh && child.material) {
                    // Update active material
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.color && m.color.set(color));
                    } else {
                        if (child.material.color) child.material.color.set(color);
                    }
                    // Update fallback standard material
                    if (child.userData.originalMaterial) {
                         if (Array.isArray(child.userData.originalMaterial)) {
                             child.userData.originalMaterial.forEach(m => m.color && m.color.set(color));
                         } else {
                             if (child.userData.originalMaterial.color) child.userData.originalMaterial.color.set(color);
                         }
                    }
                }
            });
        }

        // --- Converter & Exporters ---
        function exportFile(format) {
            if (!currentModel) return alert('Please load a model first.');

            loadingOverlay.style.display = 'flex';
            loadingOverlay.querySelector('h2').innerText = `Exporting to ${format.toUpperCase()}...`;

            // Temporarily detach gizmos so they aren't exported
            transformControl.detach();

            setTimeout(() => {
                try {
                    if (format === 'glb' || format === 'gltf') {
                        const exporter = new GLTFExporter();
                        exporter.parse(currentModel, (result) => {
                            if (result instanceof ArrayBuffer) {
                                saveArrayBuffer(result, 'envizion_export.glb');
                            } else {
                                saveString(JSON.stringify(result, null, 2), 'envizion_export.gltf');
                            }
                            afterExport();
                        }, (err) => { console.error(err); alert('Export failed'); }, { binary: format === 'glb' });
                    } else if (format === 'obj') {
                        const exporter = new OBJExporter();
                        saveString(exporter.parse(currentModel), 'envizion_export.obj');
                        afterExport();
                    } else if (format === 'stl') {
                        const exporter = new STLExporter();
                        saveString(exporter.parse(currentModel), 'envizion_export.stl');
                        afterExport();
                    } else if (format === 'ply') {
                        const exporter = new PLYExporter();
                        exporter.parse(currentModel, (result) => {
                            if (result instanceof ArrayBuffer) {
                                saveArrayBuffer(result, 'envizion_export.ply');
                            } else {
                                saveString(result, 'envizion_export.ply');
                            }
                            afterExport();
                        }, { binary: true });
                    }
                } catch (err) {
                    console.error(err);
                    alert('An error occurred during export.');
                    afterExport();
                }
            }, 100);
        }

        function afterExport() {
            transformControl.attach(currentModel); // re-attach gizmos
            loadingOverlay.style.display = 'none';
        }

        function saveString(text, filename) {
            saveBlob(new Blob([text], { type: 'text/plain' }), filename);
        }

        function saveArrayBuffer(buffer, filename) {
            saveBlob(new Blob([buffer], { type: 'application/octet-stream' }), filename);
        }

        function saveBlob(blob, filename) {
            const link = document.createElement('a');
            link.style.display = 'none';
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        // --- Inspection Tools Logic ---
        function toggleWireframe() {
            if (!currentModel) return;
            isWireframe = !isWireframe;
            currentModel.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.wireframe = isWireframe);
                    } else {
                        child.material.wireframe = isWireframe;
                    }
                }
            });
            btnWireframe.classList.toggle('active', isWireframe);
        }

        function setMode(mode) {
            if (!currentModel) return;
            currentMode = mode;
            const allModeBtns = [btnReset, btnNormals, btnUv, btnDepth, btnFlat, btnXray];
            allModeBtns.forEach(btn => { btn.classList.remove('active'); });

            if (mode === 'standard') { btnReset.classList.add('active'); }
            if (mode === 'normals') { btnNormals.classList.add('active'); }
            if (mode === 'uv') { btnUv.classList.add('active'); }
            if (mode === 'depth') { btnDepth.classList.add('active'); }
            if (mode === 'flat') { btnFlat.classList.add('active'); }
            if (mode === 'xray') { btnXray.classList.add('active'); }

            currentModel.traverse((child) => {
                if (child.isMesh) {
                    if (mode === 'standard') child.material = child.userData.originalMaterial;
                    else if (mode === 'normals') child.material = normalMaterial;
                    else if (mode === 'uv') child.material = uvMaterial;
                    else if (mode === 'depth') child.material = depthMaterial;
                    else if (mode === 'flat') child.material = matcapMaterial;
                    else if (mode === 'xray') child.material = new THREE.MeshBasicMaterial({ color: 0x88ccff, wireframe: false, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });

                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.wireframe = isWireframe);
                    } else {
                        if (mode !== 'xray') child.material.wireframe = isWireframe;
                    }
                }
            });
            showToast('Mode: ' + mode.charAt(0).toUpperCase() + mode.slice(1));
        }

        // --- Toast ---
        let toastTimer;
        function showToast(msg) {
            toast.textContent = msg;
            toast.style.display = 'block';
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 2500);
        }

        // --- Model Stats ---
        function updateStats(model) {
            let verts = 0, faces = 0, mats = new Set();
            model.traverse(c => {
                if (c.isMesh) {
                    const g = c.geometry;
                    if (g.attributes.position) verts += g.attributes.position.count;
                    if (g.index) faces += g.index.count / 3;
                    else if (g.attributes.position) faces += g.attributes.position.count / 3;
                    const m = Array.isArray(c.material) ? c.material : [c.material];
                    m.forEach(mat => mat && mats.add(mat.uuid));
                }
            });
            document.getElementById('stat-verts').textContent = verts.toLocaleString();
            document.getElementById('stat-faces').textContent = Math.round(faces).toLocaleString();
            document.getElementById('stat-mats').textContent = mats.size;
            document.getElementById('model-stats').style.display = 'flex';
        }

        // --- Screenshot ---
        function takeScreenshot() {
            renderer.render(scene, camera);
            const url = renderer.domElement.toDataURL('image/png');
            const a = document.createElement('a'); a.href = url; a.download = 'envizion_screenshot.png';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            showToast('Screenshot saved!');
        }

        // --- Reset Camera ---
        function resetCamera() {
            if (currentModel) {
                const box = new THREE.Box3().setFromObject(currentModel);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                camera.position.set(center.x, center.y + maxDim * 0.5, center.z + maxDim * 1.8);
                controls.target.copy(center);
            } else {
                camera.position.set(0, 2, 5);
                controls.target.set(0, 0, 0);
            }
            controls.update();
            showToast('Camera reset');
        }

        // --- Explode View ---
        function toggleExplode() {
            if (!currentModel) return;
            isExploded = !isExploded;
            const center = new THREE.Box3().setFromObject(currentModel).getCenter(new THREE.Vector3());
            let i = 0;
            currentModel.traverse(c => {
                if (c.isMesh) {
                    if (!c.userData.origPos) c.userData.origPos = c.position.clone();
                    if (isExploded) {
                        const dir = c.getWorldPosition(new THREE.Vector3()).sub(center).normalize();
                        c.position.copy(c.userData.origPos).addScaledVector(dir, 0.8 * (i + 1) * 0.3);
                    } else {
                        c.position.copy(c.userData.origPos);
                    }
                    i++;
                }
            });
            showToast(isExploded ? 'Explode view ON' : 'Explode view OFF');
        }

        // --- Material property update ---
        function updateMaterialProp(prop, value) {
            if (!currentModel) return;
            currentModel.traverse(c => {
                if (c.isMesh && c.material) {
                    const mats = Array.isArray(c.material) ? c.material : [c.material];
                    mats.forEach(m => {
                        if (prop in m) { m[prop] = value; if (prop === 'opacity') m.transparent = value < 1; m.needsUpdate = true; }
                    });
                    const origMats = Array.isArray(c.userData.originalMaterial) ? c.userData.originalMaterial : (c.userData.originalMaterial ? [c.userData.originalMaterial] : []);
                    origMats.forEach(m => { if (prop in m) { m[prop] = value; if (prop === 'opacity') m.transparent = value < 1; m.needsUpdate = true; } });
                }
            });
        }

        // --- Emissive update ---
        function updateEmissive(e) {
            if (!currentModel) return;
            const color = new THREE.Color(e.target.value);
            currentModel.traverse(c => {
                if (c.isMesh && c.material) {
                    const mats = Array.isArray(c.material) ? c.material : [c.material];
                    mats.forEach(m => { if (m.emissive) m.emissive.set(color); });
                }
            });
        }

        // --- Texture Upload ---
        function handleTextureUpload(e) {
            if (!currentModel || !e.target.files[0]) return;
            const url = URL.createObjectURL(e.target.files[0]);
            new THREE.TextureLoader().load(url, (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                currentModel.traverse(c => {
                    if (c.isMesh) {
                        const mats = Array.isArray(c.material) ? c.material : [c.material];
                        mats.forEach(m => { m.map = tex; m.needsUpdate = true; });
                    }
                });
                showToast('Texture applied!');
            });
        }

        function handleNormalMapUpload(e) {
            if (!currentModel || !e.target.files[0]) return;
            const url = URL.createObjectURL(e.target.files[0]);
            new THREE.TextureLoader().load(url, (tex) => {
                currentModel.traverse(c => {
                    if (c.isMesh) {
                        const mats = Array.isArray(c.material) ? c.material : [c.material];
                        mats.forEach(m => { m.normalMap = tex; m.needsUpdate = true; });
                    }
                });
                showToast('Normal map applied!');
            });
        }

        // --- Flip Normals ---
        function flipNormals() {
            if (!currentModel) return;
            currentModel.traverse(c => {
                if (c.isMesh) {
                    const pos = c.geometry.attributes.position;
                    if (c.geometry.index) {
                        const idx = c.geometry.index.array;
                        for (let i = 0; i < idx.length; i += 3) {
                            const tmp = idx[i+1]; idx[i+1] = idx[i+2]; idx[i+2] = tmp;
                        }
                        c.geometry.index.needsUpdate = true;
                    }
                    c.geometry.computeVertexNormals();
                }
            });
            showToast('Normals flipped!');
        }

        // --- Center to Origin ---
        function centerModelToOrigin() {
            if (!currentModel) return;
            const box = new THREE.Box3().setFromObject(currentModel);
            const center = box.getCenter(new THREE.Vector3());
            currentModel.position.sub(center);
            showToast('Centered to origin');
        }

        // --- Clone ---
        function cloneModel() {
            if (!currentModel) return;
            const clone = currentModel.clone();
            clone.position.x += 2;
            scene.add(clone);
            clonedModels.push(clone);
            showToast('Object cloned!');
        }

        // --- Delete ---
        function deleteModel() {
            if (!currentModel) return;
            transformControl.detach();
            scene.remove(currentModel);
            currentModel.traverse(c => { if (c.isMesh) { c.geometry.dispose(); if (c.material.isMaterial) c.material.dispose(); } });
            currentModel = null;
            document.getElementById('model-stats').style.display = 'none';
            noModelText.style.display = 'flex';
            showToast('Model deleted');
        }

        // --- Samples ---

        function populateSamples() {
            const glbContainer = document.getElementById('samples-glb');
            GLB_SAMPLES.forEach(s => {
                const card = document.createElement('div');
                card.className = 'sample-card';
                card.innerHTML = `<span class="sname">${s.name}</span><span class="ext-badge ext-glb">GLB</span>`;
                card.addEventListener('click', () => loadFromURL(s.url, s.name + '.glb', 'glb'));
                glbContainer.appendChild(card);
            });
            const objContainer = document.getElementById('samples-obj');
            OBJ_SAMPLES.forEach(s => {
                const card = document.createElement('div');
                card.className = 'sample-card';
                card.innerHTML = `<span class="sname">${s.name}</span><span class="ext-badge ext-obj">OBJ</span>`;
                card.addEventListener('click', () => loadFromURL(s.url, s.name + '.obj', 'obj'));
                objContainer.appendChild(card);
            });
        }

        // loadFromURL: fetch the remote file as ArrayBuffer first, then create a local
        // blob URL for Three.js. This avoids the DataCloneError that occurs when Three.js
        // tries to postMessage a Request object to its worker for cross-origin URLs.
        async function loadFromURL(url, name, ext) {
            loadingOverlay.style.display = 'flex';
            loadingOverlay.querySelector('h2').innerText = `Fetching ${name}…`;
            noModelText.style.display = 'none';
            if (currentModel) { transformControl.detach(); scene.remove(currentModel); currentModel = null; }

            try {
                const resp = await fetch(url);
                if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${name}`);
                const buf = await resp.arrayBuffer();
                const mimeMap = { glb: 'model/gltf-binary', gltf: 'model/gltf+json', obj: 'text/plain' };
                const blob = new Blob([buf], { type: mimeMap[ext] || 'application/octet-stream' });
                const blobURL = URL.createObjectURL(blob);

                loadingOverlay.querySelector('h2').innerText = `Loading ${name}…`;

                if (ext === 'glb' || ext === 'gltf') {
                    new GLTFLoader().load(blobURL, (gltf) => { URL.revokeObjectURL(blobURL); setupModel(gltf.scene); }, undefined, (e) => { URL.revokeObjectURL(blobURL); handleError(e); });
                } else if (ext === 'obj') {
                    new OBJLoader().load(blobURL, (obj) => { URL.revokeObjectURL(blobURL); setupModel(obj); }, undefined, (e) => { URL.revokeObjectURL(blobURL); handleError(e); });
                }
            } catch (e) {
                handleError(e);
            }
        }

        // --- Render Loop ---
        function animate() {
            requestAnimationFrame(animate);
            const delta = animClock.getDelta();
            if (animMixer) animMixer.update(delta);
            controls.update();
            renderer.render(scene, camera);
        }

        function onWindowResize() {
            const width = window.innerWidth - 300;
            const height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }

        // ═══════════════════════════════════════════════════════════════
        // LEVEL BUILDER — all functions ported from visual_level_builder
        // ═══════════════════════════════════════════════════════════════

        // ── IDB for custom model blobs ────────────────────────────────
        const LB_DB_NAME = 'EnvizionLevelBuilderDB';
        const LB_DB_VERSION = 1;

        function lbOpenDatabase() {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open(LB_DB_NAME, LB_DB_VERSION);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('custom_models'))
                        db.createObjectStore('custom_models');
                };
                req.onsuccess = (e) => resolve(e.target.result);
                req.onerror  = (e) => reject(e.target.error);
            });
        }
        async function lbStoreCustomModel(key, blob) {
            const db = await lbOpenDatabase();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('custom_models', 'readwrite');
                tx.objectStore('custom_models').put(blob, key).onsuccess = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        }
        async function lbRetrieveCustomModel(key) {
            const db = await lbOpenDatabase();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('custom_models', 'readonly');
                const req = tx.objectStore('custom_models').get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror  = () => reject(req.error);
            });
        }

        // ── Confirm modal ─────────────────────────────────────────────
        function lbShowConfirm(message, onYes) {
            const modal = document.getElementById('lb-confirm-modal');
            document.getElementById('lb-confirm-msg').textContent = message;
            modal.style.display = 'flex';
            const yes = document.getElementById('lb-confirm-yes');
            const no  = document.getElementById('lb-confirm-no');
            const cleanup = () => { modal.style.display = 'none'; yes.onclick = no.onclick = null; };
            yes.onclick = () => { cleanup(); onYes(); };
            no.onclick  = () => cleanup();
        }

        // ── Level Builder state ───────────────────────────────────────
        const lbPlacedObjects = [];
        let lbSelectedObject  = null;
        const lbRaycaster     = new THREE.Raycaster();
        const lbMouse         = new THREE.Vector2();

        // Selection highlight box
        const lbSelectionBox  = new THREE.BoxHelper(undefined, 0xffff00);
        lbSelectionBox.visible = false;
        scene.add(lbSelectionBox);

        // DRACOLoader for level builder (reuse existing gltfLoader or make a separate one)
        const lbDraco = new DRACOLoader();
        lbDraco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        const lbGltfLoader = new GLTFLoader();
        lbGltfLoader.setDRACOLoader(lbDraco);

        // ── Asset catalogue (same as level builder) ───────────────────
        const LB_ASSETS = {
            mansionExterior: 'https://static.seeles.ai/data/asset/export/b41de708-ba2c-43e8-b35b-5d76b571d5c3/950949/threeJs_5f208905-f988-4c9f-adb9-a7b0d21b50ae.glb',
            bed:             'https://static.seeles.ai/data/asset/export/87762adf-7325-4b27-b439-615308aec2d6/696101/threeJs_f7e63846-c577-4ede-af30-2387d1f8e877.glb',
            wardrobe:        'https://static.seeles.ai/data/asset/export/75a22e8b-e45c-4324-b0d0-8a4b7be9671a/926000/threeJs_622b582e-8c04-4688-890f-ad2a8049c85d.glb',
            wardrobeTall:    'https://static.seeles.ai/data/asset/export/96f19401-a309-45ca-8dc4-c9c4c9ac2f73/772062/threeJs_00fd99df-b252-406e-b0af-ff01a7865276.glb',
            nightstandLamp:  'https://static.seeles.ai/data/asset/export/5e470864-f7dc-4035-8365-cb7fd74a4124/265259/threeJs_de654a49-4afd-4bae-ae72-39206853b2a2.glb',
            nightstand:      'https://static.seeles.ai/data/asset/export/033c9663-353d-459b-a6e6-a0fe25124369/941322/threeJs_3bb38d97-02b0-40bb-a68e-7aa3972f42bc.glb',
            door:            'https://static.seeles.ai/data/asset/export/f9ec49c9-4b4d-4e4e-9486-e2cf2a40f2c5/940952/threeJs_2382894d-1c08-44db-bc5e-f523a4200648.glb',
            cabinet:         'https://static.seeles.ai/data/asset/export/545b587f-51e1-4e67-bd40-ab8e65ffb1c6/801867/threeJs_7998f89c-4810-44ac-9127-1bc17eff7930.glb',
            staircase:       'https://static.seeles.ai/data/asset/export/72c23955-9776-44ae-9b92-4b3d9c45eba1/990654/threeJs_1ea4dddb-1341-47d6-b082-1c01bd698dcd.glb',
            sofa:            'https://static.seeles.ai/data/asset/export/856a1fcf-65bd-49b8-8bed-ad25fedb6a2d/952363/threeJs_9524eec5-6042-4bf1-a97a-3495b1fb5ef3.glb',
            tv:              'https://static.seeles.ai/data/asset/export/4685be39-6fc5-4e11-a805-dac56fdb76e1/1002151/threeJs_47e72340-cf45-4ba0-b680-aacf0254bfea.glb',
            diningSet:       'https://static.seeles.ai/data/asset/export/21395a31-f8bf-4209-a3af-f3a431d2a5f9/741545/threeJs_4cba11a0-8fb9-4241-a969-ab9ccdda2872.glb',
            kitchenCounter:  'https://static.seeles.ai/data/asset/export/be7f2cb4-f34b-4ea1-849c-e83b84e29898/651080/threeJs_ac250853-8e8b-4348-a0cc-fcc03b328aea.glb',
            fridge:          'https://static.seeles.ai/data/asset/export/763c0da0-561f-4e03-9de9-5be3491c9173/947937/threeJs_9909ef65-3cf7-4973-becb-fa900d444074.glb',
            oven:            'https://static.seeles.ai/data/asset/export/eed90304-0a2c-4a7e-bf76-342d74f35aa7/961961/threeJs_d35fd5ce-4777-46bc-af6e-6f166042c40e.glb',
            sofa2:           'https://static.seeles.ai/data/asset/export/c3ec7ce1-3ae1-4636-9a98-2fb6fa4ac284/928429/threeJs_fb57af7c-643b-4ae9-bfd4-bbb938dd8950.glb',
            bookcase:        'https://static.seeles.ai/data/asset/export/6d62fd3d-2ad2-43ca-99a3-b5c851236c90/948388/threeJs_95a6ca55-4c21-41b8-9fbb-f6b388c5bf62.glb',
            piano:           'https://static.seeles.ai/data/asset/export/0e5d8045-145f-47e1-8746-e37cff00e507/1004953/threeJs_45897f52-d74a-4090-942f-3fc9567149cb.glb',
            sedan:           'https://static.seeles.ai/data/asset/export/3413f54e-8823-4e53-bd7e-4f4842188a2c/926701/threeJs_901136ed-767f-45f7-85fb-9200a8183909.glb',
            chandelier:      'https://static.seeles.ai/data/asset/export/d1a8d737-1a51-4089-80b5-99388c4918c8/922373/threeJs_2f19c5e9-3cd9-47c9-ad25-2a80cb52f52c.glb',
            cctv:            'https://static.seeles.ai/data/asset/export/671eae22-d8f3-4a47-a33a-9b26118e89dd/1017881/threeJs_1017881_2892281.glb',
            umbrella:        'https://static.seeles.ai/data/asset/export/864143a6-3199-4b2c-83bf-2d286c421720/988440/threeJs_b6b5dd6d-be97-4452-818a-97009f898971.glb',
            coatRack:        'https://static.seeles.ai/data/asset/export/cfae5b0e-ab83-4164-9d78-a3a700a640fc/916520/threeJs_41e8f957-e670-44df-8066-f7ff60762376.glb',
            consoleTable:    'https://static.seeles.ai/data/asset/export/34ddedd0-87b5-455a-96a5-4d022fdb77dc/941072/threeJs_9eff8419-70e5-4e3c-8289-97e61dff85f7.glb',
            plantStand:      'https://static.seeles.ai/data/asset/export/cff30703-b91c-4c99-9d97-6a8da37b6805/652292/threeJs_a368cc01-4309-4b6b-8fa7-6b6628025587.glb',
            loungeSet:       'https://static.seeles.ai/data/asset/export/c3ec7ce1-3ae1-4636-9a98-2fb6fa4ac284/928429/threeJs_fb57af7c-643b-4ae9-bfd4-bbb938dd8950.glb',
            roadsideShelter: 'https://static.seeles.ai/data/asset/export/04d04503-1ba0-497b-9fda-cddee24d37ab/764936/threeJs_ff802237-ea48-4341-94ca-6ea844ec9374.glb',
            signpost:        'https://static.seeles.ai/data/asset/export/2723de8d-f08c-4d57-a838-fc4c33edf317/929444/threeJs_c27a3194-da1e-4fc9-8998-b611566b6cf3.glb',
        };

        // Populate asset dropdown
        (function() {
            const sel = document.getElementById('lb-asset-select');
            Object.keys(LB_ASSETS).forEach(k => {
                const o = document.createElement('option');
                o.value = k; o.textContent = k;
                sel.appendChild(o);
            });
        })();

        // ── Select / deselect ─────────────────────────────────────────
        function lbSelectObject(obj) {
            lbSelectedObject = obj;
            const panel = document.getElementById('lb-properties-panel');
            if (obj) {
                lbSelectionBox.setFromObject(obj);
                lbSelectionBox.visible = true;
                panel.style.display = 'flex';
                lbUpdateUIFromObject();
            } else {
                lbSelectionBox.visible = false;
                panel.style.display = 'none';
            }
        }

        // ── Properties panel sync ─────────────────────────────────────
        const lbInputs = {
            px: document.getElementById('lb-px'), py: document.getElementById('lb-py'), pz: document.getElementById('lb-pz'),
            rx: document.getElementById('lb-rx'), ry: document.getElementById('lb-ry'), rz: document.getElementById('lb-rz'),
            sx: document.getElementById('lb-sx'), sy: document.getElementById('lb-sy'), sz: document.getElementById('lb-sz'),
        };
        function lbUpdateUIFromObject() {
            if (!lbSelectedObject) return;
            const o = lbSelectedObject;
            lbInputs.px.value = o.position.x.toFixed(3);
            lbInputs.py.value = o.position.y.toFixed(3);
            lbInputs.pz.value = o.position.z.toFixed(3);
            lbInputs.rx.value = THREE.MathUtils.radToDeg(o.rotation.x).toFixed(1);
            lbInputs.ry.value = THREE.MathUtils.radToDeg(o.rotation.y).toFixed(1);
            lbInputs.rz.value = THREE.MathUtils.radToDeg(o.rotation.z).toFixed(1);
            lbInputs.sx.value = o.scale.x.toFixed(3);
            lbInputs.sy.value = o.scale.y.toFixed(3);
            lbInputs.sz.value = o.scale.z.toFixed(3);
        }
        function lbUpdateObjectFromUI() {
            if (!lbSelectedObject) return;
            const o = lbSelectedObject;
            o.position.set(parseFloat(lbInputs.px.value)||0, parseFloat(lbInputs.py.value)||0, parseFloat(lbInputs.pz.value)||0);
            o.rotation.set(
                THREE.MathUtils.degToRad(parseFloat(lbInputs.rx.value)||0),
                THREE.MathUtils.degToRad(parseFloat(lbInputs.ry.value)||0),
                THREE.MathUtils.degToRad(parseFloat(lbInputs.rz.value)||0)
            );
            o.scale.set(parseFloat(lbInputs.sx.value)||1, parseFloat(lbInputs.sy.value)||1, parseFloat(lbInputs.sz.value)||1);
            if (lbSelectionBox.visible) lbSelectionBox.update();
        }
        Object.values(lbInputs).forEach(inp => {
            inp.addEventListener('change', lbUpdateObjectFromUI);
            inp.addEventListener('input',  lbUpdateObjectFromUI);
        });

        // ── Raycast select on canvas click (only when Level tab active) ──
        renderer.domElement.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            const activeTab = document.querySelector('#tab-strip .tab-btn.active');
            if (!activeTab || activeTab.dataset.tab !== 'level') return;
            const rect = renderer.domElement.getBoundingClientRect();
            lbMouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
            lbMouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
            lbRaycaster.setFromCamera(lbMouse, camera);
            const hits = lbRaycaster.intersectObjects(lbPlacedObjects, true);
            if (hits.length > 0) {
                let obj = hits[0].object;
                while (obj.parent && obj.parent.type !== 'Scene' && !obj.userData.isAssetRoot) obj = obj.parent;
                lbSelectObject(obj);
            } else {
                lbSelectObject(null);
            }
        });

        // ── Placeholder box (fallback when model can't be loaded) ─────
        function lbCreatePlaceholderBox(item) {
            const box = new THREE.Mesh(
                new THREE.BoxGeometry(1.5, 1.5, 1.5),
                new THREE.MeshBasicMaterial({ color: 0xff3333, wireframe: true })
            );
            box.userData.isAssetRoot = true;
            box.userData.assetKey    = item.assetKey;
            box.userData.isCustom    = item.isCustom;
            box.userData.customUrl   = item.customUrl;
            box.userData.isPlaceholder = true;
            box.position.set(item.position.x, item.position.y, item.position.z);
            box.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);
            box.scale.set(item.scale.x, item.scale.y, item.scale.z);
            scene.add(box);
            lbPlacedObjects.push(box);
            lbSelectObject(box);
        }

        // ── Load and place model ──────────────────────────────────────
        async function lbLoadAndPlace(url, assetKey, isCustom = false, customUrl = null, customTransform = null) {
            loadingOverlay.style.display = 'flex';
            try {
                const gltf = await lbGltfLoader.loadAsync(url);
                const model = gltf.scene;
                model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
                model.userData.isAssetRoot = true;
                model.userData.assetKey    = assetKey;
                model.userData.isCustom    = isCustom;
                model.userData.customUrl   = customUrl;
                if (customTransform) {
                    model.position.set(customTransform.position.x, customTransform.position.y, customTransform.position.z);
                    model.rotation.set(customTransform.rotation.x, customTransform.rotation.y, customTransform.rotation.z);
                    model.scale.set(customTransform.scale.x, customTransform.scale.y, customTransform.scale.z);
                }
                scene.add(model);
                lbPlacedObjects.push(model);
                lbSelectObject(model);
            } catch (err) {
                console.error(err);
                if (customTransform) {
                    lbCreatePlaceholderBox({ assetKey, isCustom, customUrl, position: customTransform.position, rotation: customTransform.rotation, scale: customTransform.scale });
                } else {
                    showToast('Failed to load: ' + err.message);
                }
            }
            loadingOverlay.style.display = 'none';
        }

        // ── Spawn preset ──────────────────────────────────────────────
        document.getElementById('lb-spawn').addEventListener('click', () => {
            const key = document.getElementById('lb-asset-select').value;
            if (LB_ASSETS[key]) lbLoadAndPlace(LB_ASSETS[key], key);
        });

        // ── Spawn custom (file or URL) ────────────────────────────────
        document.getElementById('lb-spawn-custom').addEventListener('click', async () => {
            const file = document.getElementById('lb-file-upload').files[0];
            const urlVal = document.getElementById('lb-url-upload').value.trim();
            if (file) {
                const key = 'custom_' + file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
                loadingOverlay.style.display = 'flex';
                try {
                    await lbStoreCustomModel(key, file);
                    const localUrl = URL.createObjectURL(file);
                    const existing = lbPlacedObjects.find(o => o.userData.isPlaceholder && o.userData.assetKey === key);
                    if (existing) {
                        const t = { position: existing.position.clone(), rotation: existing.rotation.clone(), scale: existing.scale.clone() };
                        scene.remove(existing);
                        lbPlacedObjects.splice(lbPlacedObjects.indexOf(existing), 1);
                        await lbLoadAndPlace(localUrl, key, true, null, { position: t.position, rotation: t.rotation, scale: t.scale });
                    } else {
                        await lbLoadAndPlace(localUrl, key, true, null);
                    }
                } catch (e) { showToast('DB error: ' + e.message); }
                loadingOverlay.style.display = 'none';
                document.getElementById('lb-file-upload').value = '';
            } else if (urlVal) {
                lbLoadAndPlace(urlVal, 'custom_url_model', true, urlVal);
                document.getElementById('lb-url-upload').value = '';
            } else {
                showToast('Select a file or enter a URL.');
            }
        });

        // ── Delete selected ───────────────────────────────────────────
        document.getElementById('lb-delete').addEventListener('click', () => {
            if (!lbSelectedObject) return;
            scene.remove(lbSelectedObject);
            lbPlacedObjects.splice(lbPlacedObjects.indexOf(lbSelectedObject), 1);
            lbSelectObject(null);
            showToast('Object deleted');
        });

        // ── Clear all ─────────────────────────────────────────────────
        document.getElementById('lb-clear-scene').addEventListener('click', () => {
            lbShowConfirm('Clear all placed objects from the scene?', () => {
                lbSelectObject(null);
                [...lbPlacedObjects].forEach(o => scene.remove(o));
                lbPlacedObjects.length = 0;
                showToast('Scene cleared');
            });
        });

        // ── Serialize / Deserialize ───────────────────────────────────
        function lbSerialize() {
            return lbPlacedObjects.map(o => ({
                assetKey:      o.userData.assetKey,
                isCustom:      o.userData.isCustom    || false,
                customUrl:     o.userData.customUrl   || null,
                isPlaceholder: o.userData.isPlaceholder || false,
                position: { x: o.position.x, y: o.position.y, z: o.position.z },
                rotation: { x: o.rotation.x, y: o.rotation.y, z: o.rotation.z },
                scale:    { x: o.scale.x,    y: o.scale.y,    z: o.scale.z    },
            }));
        }
        async function lbDeserialize(data) {
            if (!Array.isArray(data)) return;
            lbSelectObject(null);
            [...lbPlacedObjects].forEach(o => scene.remove(o));
            lbPlacedObjects.length = 0;
            for (const item of data) {
                let url = null;
                if (item.isCustom) {
                    if (item.embeddedData) {
                        url = item.embeddedData;
                        try { const r = await fetch(item.embeddedData); await lbStoreCustomModel(item.assetKey, await r.blob()); } catch(e) {}
                    } else if (item.customUrl) {
                        url = item.customUrl;
                    } else {
                        try {
                            const blob = await lbRetrieveCustomModel(item.assetKey);
                            if (blob) url = URL.createObjectURL(blob);
                            else { lbCreatePlaceholderBox(item); continue; }
                        } catch(e) { lbCreatePlaceholderBox(item); continue; }
                    }
                } else {
                    url = LB_ASSETS[item.assetKey];
                }
                if (url) await lbLoadAndPlace(url, item.assetKey, item.isCustom, item.customUrl,
                    { position: item.position, rotation: item.rotation, scale: item.scale });
            }
        }

        // ── Save history ──────────────────────────────────────────────
        function lbGetHistory() {
            const raw = localStorage.getItem('envizion_level_history');
            return raw ? JSON.parse(raw) : [];
        }
        function lbSaveHistory(hist) {
            localStorage.setItem('envizion_level_history', JSON.stringify(hist));
        }
        function lbRenderHistory() {
            const hist = lbGetHistory();
            const el   = document.getElementById('lb-history-container');
            if (hist.length === 0) {
                el.innerHTML = '<div style="padding:8px;font-size:10px;color:var(--text-muted);text-align:center;">No saves yet</div>';
                return;
            }
            el.innerHTML = '';
            hist.forEach((save, i) => {
                const row = document.createElement('div');
                row.className = 'lb-history-item';
                row.innerHTML = `<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${save.timestamp}">${i===0?'<b>':''}${save.timestamp}${i===0?' (Latest)</b>':''}</span>`;
                const loadB = document.createElement('button');
                loadB.className = 'lb-hbtn'; loadB.textContent = 'Load';
                loadB.onclick = () => lbShowConfirm(`Load layout from ${save.timestamp}?`, async () => { await lbDeserialize(save.data); showToast('Layout loaded'); });
                const expB = document.createElement('button');
                expB.className = 'lb-hbtn'; expB.textContent = 'Exp';
                expB.onclick = async () => await lbPackageAndDownload(save.data, 'envizion_layout_' + save.timestamp.replace(/[^a-zA-Z0-9]/g,'_') + '.json');
                const delB = document.createElement('button');
                delB.className = 'lb-hbtn del'; delB.textContent = '×';
                delB.onclick = () => lbShowConfirm(`Delete save from ${save.timestamp}?`, () => { const h=lbGetHistory(); h.splice(i,1); lbSaveHistory(h); lbRenderHistory(); showToast('Save deleted'); });
                row.appendChild(loadB); row.appendChild(expB); row.appendChild(delB);
                el.appendChild(row);
            });
        }
        lbRenderHistory();

        // ── Quick Save ────────────────────────────────────────────────
        document.getElementById('lb-quick-save').addEventListener('click', () => {
            const hist = lbGetHistory();
            hist.unshift({ timestamp: new Date().toLocaleString(), data: lbSerialize() });
            if (hist.length > 10) hist.length = 10;
            lbSaveHistory(hist);
            lbRenderHistory();
            showToast('Layout saved to history');
        });

        // ── Quick Load ────────────────────────────────────────────────
        document.getElementById('lb-quick-load').addEventListener('click', async () => {
            const hist = lbGetHistory();
            if (!hist.length) { showToast('No saves found'); return; }
            await lbDeserialize(hist[0].data);
            showToast('Latest save loaded');
        });

        // ── Package & Download ────────────────────────────────────────
        async function lbPackageAndDownload(layoutData, filename) {
            loadingOverlay.style.display = 'flex';
            try {
                const data = JSON.parse(JSON.stringify(layoutData));
                for (const item of data) {
                    if (item.isCustom && !item.customUrl && !item.isPlaceholder) {
                        try {
                            const blob = await lbRetrieveCustomModel(item.assetKey);
                            if (blob) {
                                item.embeddedData = await new Promise((res, rej) => {
                                    const r = new FileReader(); r.onloadend = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob);
                                });
                            }
                        } catch(e) {}
                    }
                }
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
                a.download = filename;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                showToast('Layout exported');
            } catch(e) { showToast('Export failed: ' + e.message); }
            loadingOverlay.style.display = 'none';
        }

        // ── File export ───────────────────────────────────────────────
        document.getElementById('lb-file-export').addEventListener('click', async () => {
            await lbPackageAndDownload(lbSerialize(), 'envizion_level_layout.json');
        });

        // ── File import (scene) ───────────────────────────────────────
        document.getElementById('lb-file-import').addEventListener('change', (e) => {
            const file = e.target.files[0]; if (!file) return;
            const r = new FileReader();
            r.onload = async (ev) => {
                try { await lbDeserialize(JSON.parse(ev.target.result)); showToast('Layout imported'); }
                catch(err) { showToast('Import failed: ' + err.message); }
                e.target.value = '';
            };
            r.readAsText(file);
        });

        // ── Import to history ─────────────────────────────────────────
        document.getElementById('lb-import-history').addEventListener('change', (e) => {
            const file = e.target.files[0]; if (!file) return;
            const r = new FileReader();
            r.onload = (ev) => {
                try {
                    const parsed = JSON.parse(ev.target.result);
                    if (!Array.isArray(parsed)) throw new Error('Expected JSON array');
                    const hist = lbGetHistory();
                    hist.unshift({ timestamp: 'Imported: ' + file.name.slice(0,20), data: parsed });
                    if (hist.length > 10) hist.length = 10;
                    lbSaveHistory(hist); lbRenderHistory();
                    showToast('Imported to history');
                } catch(err) { showToast('Parse failed: ' + err.message); }
                e.target.value = '';
            };
            r.readAsText(file);
        });

        // ── Export layout code (JS snippet for buildProps) ────────────
        document.getElementById('lb-export-code').addEventListener('click', () => {
            if (!lbPlacedObjects.length) { showToast('No objects placed yet'); return; }
            const counts = {};
            let code = '// --- GENERATED LAYOUT ---\n// Paste into buildProps()\n\n';
            lbPlacedObjects.forEach(obj => {
                const key = obj.userData.assetKey;
                counts[key] = (counts[key] || 0) + 1;
                const varName = `${key}_${counts[key]}`;
                const p = obj.position;
                const box = new THREE.Box3().setFromObject(obj);
                const sz = new THREE.Vector3(); box.getSize(sz);
                code += `const ${varName} = cloneAsset(assets.${key});\n`;
                code += `if (${varName}) {\n`;
                code += `  placeObjectOnFloor(${varName}, new THREE.Vector3(${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}), { targetHeight: ${sz.y.toFixed(3)}, yaw: ${obj.rotation.y.toFixed(3)} });\n`;
                code += `  scene.add(${varName});\n`;
                code += `  registerObstacleObject(${varName}, 0.08, 0.05);\n`;
                code += `}\n\n`;
            });
            document.getElementById('lb-export-output').value = code;
            showToast('Code generated');
        });

        // ── Delete key shortcut (level tab only) ─────────────────────
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const activeTab = document.querySelector('#tab-strip .tab-btn.active');
            if (!activeTab || activeTab.dataset.tab !== 'level') return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                document.getElementById('lb-delete').click();
            }
        });

        // ═══════════════════════════════════════════════════════════════
        // ANIMATOR — FBX/GLB animation system (from animator_studio)
        // ═══════════════════════════════════════════════════════════════

        function animB64(buf) {
            let b = ''; const u = new Uint8Array(buf); const c = 0x8000;
            for (let i = 0; i < u.length; i += c) b += String.fromCharCode.apply(null, u.subarray(i, i+c));
            return btoa(b);
        }
        function animFromB64(b64) {
            const b = atob(b64); const u = new Uint8Array(b.length);
            for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
            return u.buffer;
        }

        // IDB for animator workspace
        const ANIM_IDB = 'envizionAnimatorDB';
        function animOpenDB() {
            return new Promise((res, rej) => {
                const r = indexedDB.open(ANIM_IDB, 1);
                r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('ws')) r.result.createObjectStore('ws'); };
                r.onsuccess = () => res(r.result);
                r.onerror = () => rej(r.error);
            });
        }
        async function animIDBPut(k, v) {
            const db = await animOpenDB();
            return new Promise((res, rej) => { const tx = db.transaction('ws','readwrite'); tx.objectStore('ws').put(v,k); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); });
        }
        async function animIDBGet(k) {
            const db = await animOpenDB();
            return new Promise((res, rej) => { const tx = db.transaction('ws','readonly'); const r = tx.objectStore('ws').get(k); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
        }

        function animRenderList() {
            const list = document.getElementById('anim-list');
            list.innerHTML = '';
            document.getElementById('anim-count-label').textContent = animData.length + ' loaded';
            animData.forEach(a => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-panel);font-size:11px;';
                row.innerHTML = `<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-primary);" title="${a.name}">${a.name}</span>
                    <button data-id="${a.id}" class="anim-play-btn" style="font-size:10px;padding:2px 8px;background:var(--accent-primary);color:#ececec;border:none;border-radius:var(--radius-sm);cursor:pointer;">â–¶</button>
                    <button data-id="${a.id}" class="anim-del-btn" style="font-size:10px;padding:2px 6px;background:transparent;color:var(--accent-primary);border:1px solid rgba(255, 255, 255, 0.12);border-radius:var(--radius-sm);cursor:pointer;">✕</button>`;
                list.appendChild(row);
            });
            list.querySelectorAll('.anim-play-btn').forEach(btn => {
                btn.addEventListener('click', () => animPlay(btn.dataset.id));
            });
            list.querySelectorAll('.anim-del-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    const a = animData.find(x => x.id === id);
                    if (a && a.action) { try { animMixer && animMixer.uncacheAction(a.clip); } catch(e){} }
                    animData = animData.filter(x => x.id !== id);
                    animRenderList();
                    showToast('Animation removed');
                });
            });
        }

        function animPlay(id) {
            if (!animMixer || !animCharModel) { showToast('Load a character FBX first'); return; }
            const a = animData.find(x => x.id === id);
            if (!a) return;
            if (animCurrentAction) animCurrentAction.fadeOut(0.2);
            animCurrentAction = animMixer.clipAction(a.clip);
            animCurrentAction.reset();
            animCurrentAction.setLoop(animLoopEnabled ? THREE.LoopRepeat : THREE.LoopOnce);
            animCurrentAction.clampWhenFinished = !animLoopEnabled;
            animCurrentAction.fadeIn(0.2).play();
            document.getElementById('anim-active-label').textContent = a.name;
            // highlight active
            document.querySelectorAll('.anim-play-btn').forEach(b => b.style.background = b.dataset.id === id ? 'var(--accent-primary-2)' : 'var(--accent-primary)');
        }

        async function animHandleFiles(files) {
            for (const file of files) {
                const ext = file.name.split('.').pop().toLowerCase();
                const buf = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=()=>rej(r.error); r.readAsArrayBuffer(file); });
                animRawFiles[file.name] = buf;

                if (ext === 'fbx') {
                    let fbx;
                    try { fbx = new FBXLoader().parse(buf, ''); }
                    catch(e) { showToast('FBX parse error: ' + e.message); continue; }

                    // First valid FBX with mesh becomes character
                    if (!animCharModel && fbx.children.length > 0) {
                        if (animMixer) { animMixer.stopAllAction(); animMixer = null; }
                        if (animCharModel) scene.remove(animCharModel);
                        animCharModel = fbx;
                        animCharModel.traverse(c => { if (c.isMesh) { c.castShadow=true; c.receiveShadow=true; } });
                        // Normalize bone names for Mixamo
                        animCharModel.traverse(c => { if (c.isBone && c.name) c.name = c.name.replace(/.*mixamorig/i,'mixamorig'); });
                        const box = new THREE.Box3().setFromObject(animCharModel);
                        const sz = new THREE.Vector3(); box.getSize(sz);
                        const sc = 1.8 / Math.max(sz.x, sz.y, sz.z);
                        animCharModel.scale.setScalar(sc);
                        const ctr = new THREE.Vector3(); box.getCenter(ctr);
                        animCharModel.position.set(-ctr.x*sc, -box.min.y*sc, -ctr.z*sc);
                        scene.add(animCharModel);
                        animMixer = new THREE.AnimationMixer(animCharModel);
                        document.getElementById('anim-char-status').textContent = '✓ ' + file.name;
                        document.getElementById('anim-char-status').style.color = 'var(--accent-primary)';
                    }

                    // Extract clips
                    if (fbx.animations && fbx.animations.length > 0) {
                        fbx.animations.forEach((clip, i) => {
                            clip.tracks.forEach(t => { t.name = t.name.replace(/.*mixamorig/i,'mixamorig'); });
                            let name = clip.name || file.name.replace('.fbx','');
                            if (/take001|mixamocom/i.test(name)) name = file.name.replace('.fbx','');
                            animData.push({ id: Date.now()+Math.random()+''+i, name, clip, sourceFile: file.name });
                        });
                    }
                } else if (ext === 'glb' || ext === 'gltf') {
                    const blob = new Blob([buf], {type:'model/gltf-binary'});
                    const url = URL.createObjectURL(blob);
                    const gltf = await new Promise((res,rej)=>new GLTFLoader().load(url, res, undefined, rej));
                    URL.revokeObjectURL(url);
                    if (!animCharModel) {
                        if (animMixer) { animMixer.stopAllAction(); animMixer = null; }
                        animCharModel = gltf.scene;
                        scene.add(animCharModel);
                        animMixer = new THREE.AnimationMixer(animCharModel);
                        document.getElementById('anim-char-status').textContent = '✓ ' + file.name;
                        document.getElementById('anim-char-status').style.color = 'var(--accent-primary)';
                    }
                    if (gltf.animations && gltf.animations.length > 0) {
                        gltf.animations.forEach((clip, i) => {
                            animData.push({ id: Date.now()+Math.random()+''+i, name: clip.name || file.name, clip, sourceFile: file.name });
                        });
                    }
                }
            }
            animRenderList();
            if (animData.length > 0 && !animCurrentAction) animPlay(animData[0].id);
            showToast('Animator: ' + animData.length + ' clips loaded');
        }

        document.getElementById('anim-fbx-input').addEventListener('change', async (e) => {
            const files = Array.from(e.target.files); if (!files.length) return;
            await animHandleFiles(files);
            e.target.value = '';
        });

        document.getElementById('anim-loop-btn').addEventListener('click', () => {
            animLoopEnabled = !animLoopEnabled;
            const btn = document.getElementById('anim-loop-btn');
            btn.textContent = animLoopEnabled ? 'ON' : 'OFF';
            btn.classList.toggle('on', animLoopEnabled);
            if (animCurrentAction) {
                animCurrentAction.setLoop(animLoopEnabled ? THREE.LoopRepeat : THREE.LoopOnce);
                animCurrentAction.clampWhenFinished = !animLoopEnabled;
            }
        });

        document.getElementById('anim-speed-slider').addEventListener('input', (e) => {
            if (animCurrentAction) animCurrentAction.timeScale = e.target.value / 100;
        });

        // Animator Quick Save / Load (IDB — metadata only, no raw buffers)
        document.getElementById('anim-save-btn').addEventListener('click', async () => {
            const snap = {
                savedAt: new Date().toISOString(),
                files: Object.fromEntries(Object.entries(animRawFiles).map(([k,v])=>[k, animB64(v)])),
                clips: animData.map(a => ({ name: a.name, sourceFile: a.sourceFile }))
            };
            await animIDBPut('snap', snap);
            document.getElementById('anim-save-status').textContent = 'Saved ' + new Date().toLocaleTimeString();
            showToast('Animator workspace saved');
        });

        document.getElementById('anim-load-btn').addEventListener('click', async () => {
            const snap = await animIDBGet('snap');
            if (!snap) { showToast('No saved workspace found'); return; }
            animRawFiles = {};
            const files = [];
            for (const [name, b64] of Object.entries(snap.files)) {
                const buf = animFromB64(b64);
                animRawFiles[name] = buf;
                files.push(new File([buf], name));
            }
            animData = []; animCharModel = null; animCurrentAction = null;
            if (animMixer) { animMixer.stopAllAction(); animMixer = null; }
            await animHandleFiles(files);
            document.getElementById('anim-save-status').textContent = 'Loaded save from ' + new Date(snap.savedAt).toLocaleString();
            showToast('Animator workspace loaded');
        });

        // Animator JSON export (metadata + embedded base64 files)
        document.getElementById('anim-export-json-btn').addEventListener('click', () => {
            if (!animData.length && !Object.keys(animRawFiles).length) { showToast('Nothing to export'); return; }
            const snap = {
                savedAt: new Date().toISOString(),
                files: Object.fromEntries(Object.entries(animRawFiles).map(([k,v])=>[k, animB64(v)])),
                clips: animData.map(a => ({ name: a.name, sourceFile: a.sourceFile }))
            };
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([JSON.stringify(snap)], {type:'application/json'}));
            a.download = 'envizion_animator_' + Date.now() + '.json';
            a.click(); URL.revokeObjectURL(a.href);
            showToast('Animator workspace exported');
        });

        document.getElementById('anim-import-json-input').addEventListener('change', async (e) => {
            const file = e.target.files[0]; if (!file) return;
            try {
                const snap = JSON.parse(await file.text());
                if (!snap.files) throw new Error('Invalid format');
                animRawFiles = {};
                const files = [];
                for (const [name, b64] of Object.entries(snap.files)) {
                    const buf = animFromB64(b64);
                    animRawFiles[name] = buf;
                    files.push(new File([buf], name));
                }
                animData = []; animCharModel = null; animCurrentAction = null;
                if (animMixer) { animMixer.stopAllAction(); animMixer = null; }
                await animHandleFiles(files);
                showToast('Animator workspace imported');
            } catch(err) { showToast('Import failed: ' + err.message); }
            e.target.value = '';
        });

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
