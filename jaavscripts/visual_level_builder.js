{
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
    }
  }

// Import everything cleanly from the map
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

    // The exact assets from your game
    const ASSETS = {
      models: {
        mansionExterior: 'https://static.seeles.ai/data/asset/export/b41de708-ba2c-43e8-b35b-5d76b571d5c3/950949/threeJs_5f208905-f988-4c9f-adb9-a7b0d21b50ae.glb',
        bed: 'https://static.seeles.ai/data/asset/export/87762adf-7325-4b27-b439-615308aec2d6/696101/threeJs_f7e63846-c577-4ede-af30-2387d1f8e877.glb',
        wardrobe: 'https://static.seeles.ai/data/asset/export/75a22e8b-e45c-4324-b0d0-8a4b7be9671a/926000/threeJs_622b582e-8c04-4688-890f-ad2a8049c85d.glb',
        wardrobeTall: 'https://static.seeles.ai/data/asset/export/96f19401-a309-45ca-8dc4-c9c4c9ac2f73/772062/threeJs_00fd99df-b252-406e-b0af-ff01a7865276.glb',
        nightstandLamp: 'https://static.seeles.ai/data/asset/export/5e470864-f7dc-4035-8365-cb7fd74a4124/265259/threeJs_de654a49-4afd-4bae-ae72-39206853b2a2.glb',
        nightstand: 'https://static.seeles.ai/data/asset/export/033c9663-353d-459b-a6e6-a0fe25124369/941322/threeJs_3bb38d97-02b0-40bb-a68e-7aa3972f42bc.glb',
        door: 'https://static.seeles.ai/data/asset/export/f9ec49c9-4b4d-4e4e-9486-e2cf2a40f2c5/940952/threeJs_2382894d-1c08-44db-bc5e-f523a4200648.glb',
        cabinet: 'https://static.seeles.ai/data/asset/export/545b587f-51e1-4e67-bd40-ab8e65ffb1c6/801867/threeJs_7998f89c-4810-44ac-9127-1bc17eff7930.glb',
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
      }
    };

    // --- Promise-based IndexedDB wrapper for large GLB file storage ---
    const DB_NAME = 'WoodburyLevelBuilderDB';
    const DB_VERSION = 1;

    function openDatabase() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('custom_models')) {
            db.createObjectStore('custom_models');
          }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
      });
    }

    async function storeCustomModel(key, blob) {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('custom_models', 'readwrite');
        const store = tx.objectStore('custom_models');
        const request = store.put(blob, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    async function retrieveCustomModel(key) {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('custom_models', 'readonly');
        const store = tx.objectStore('custom_models');
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    // Custom Toast Notification Helper (Bypasses browser block alerts)
    function showToast(message, type = 'info') {
      const toast = document.getElementById('toast-notification');
      toast.innerText = message;
      toast.style.display = 'block';
      toast.style.borderLeftColor = type === 'error' ? '#b4b4b4' : type === 'success' ? '#10a37f' : '#10a37f';

      setTimeout(() => {
        toast.style.display = 'none';
      }, 3500);
    }

    // Custom Confirmation Dialog Helper (Safe for iframe/sandbox contexts)
    function showConfirm(message, onYes) {
      const modal = document.getElementById('custom-confirm-modal');
      const msgEl = document.getElementById('confirm-message');
      const yesBtn = document.getElementById('confirm-yes');
      const noBtn = document.getElementById('confirm-no');

      msgEl.innerText = message;
      modal.style.display = 'flex';

      const cleanup = () => {
        modal.style.display = 'none';
        yesBtn.onclick = null;
        noBtn.onclick = null;
      };

      yesBtn.onclick = () => {
        cleanup();
        onYes();
      };
      noBtn.onclick = () => {
        cleanup();
      };
    }

    // DOM Elements
    const container = document.getElementById('canvas-container');
    const selectEl = document.getElementById('asset-select');
    const spawnBtn = document.getElementById('btn-spawn');
    const spawnCustomBtn = document.getElementById('btn-spawn-custom');
    const fileUploadEl = document.getElementById('file-upload');
    const urlUploadEl = document.getElementById('url-upload');
    const deleteBtn = document.getElementById('btn-delete');
    const exportBtn = document.getElementById('btn-export');
    const outputTxt = document.getElementById('export-output');
    const loadingOverlay = document.getElementById('loading-overlay');
    const propertiesPanel = document.getElementById('properties-panel');

    // Storage Buttons & History Container
    const quickSaveBtn = document.getElementById('btn-quick-save');
    const quickLoadBtn = document.getElementById('btn-quick-load');
    const saveHistoryContainer = document.getElementById('save-history-container');
    const fileExportBtn = document.getElementById('btn-file-export');
    const fileImportInput = document.getElementById('file-import-json');
    const fileImportHistory = document.getElementById('file-import-history');
    const clearSceneBtn = document.getElementById('btn-clear-scene');

    // UI Input Elements
    const inputs = {
      px: document.getElementById('prop-px'),
      py: document.getElementById('prop-py'),
      pz: document.getElementById('prop-pz'),
      rx: document.getElementById('prop-rx'),
      ry: document.getElementById('prop-ry'),
      rz: document.getElementById('prop-rz'),
      sx: document.getElementById('prop-sx'),
      sy: document.getElementById('prop-sy'),
      sz: document.getElementById('prop-sz')
    };

    // Populate Asset Dropdown
    Object.keys(ASSETS.models).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = key;
      selectEl.appendChild(opt);
    });

    // Three.js Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222226);

    // Floor Grid to help sizing and placement
    const gridHelper = new THREE.GridHelper(50, 50, 0x555555, 0x333333);
    scene.add(gridHelper);

    // Lighting
    const ambient = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Far clipping plane configured to prevent models disappearing zoomed out
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100000);
    camera.position.set(0, 10, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Controls
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.05;

    // Selection helper box
    const selectionBox = new THREE.BoxHelper(undefined, 0xffff00);
    selectionBox.visible = false;
    scene.add(selectionBox);

    // Loaders
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    // State
    const placedObjects = [];
    let selectedObject = null;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Resize Handler
    window.addEventListener('resize', () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // Raycast selection
    renderer.domElement.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return; // Only left click selects

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(placedObjects, true);

      if (intersects.length > 0) {
        // Find the root group of the loaded model
        let object = intersects[0].object;
        while (object.parent && object.parent.type !== 'Scene' && !object.userData.isAssetRoot) {
          object = object.parent;
        }
        selectObject(object);
      } else {
        selectObject(null);
      }
    });

    // Link UI to Object Updates
    function updateUIFromObject() {
      if (!selectedObject) return;

      inputs.px.value = selectedObject.position.x.toFixed(3);
      inputs.py.value = selectedObject.position.y.toFixed(3);
      inputs.pz.value = selectedObject.position.z.toFixed(3);

      inputs.rx.value = THREE.MathUtils.radToDeg(selectedObject.rotation.x).toFixed(1);
      inputs.ry.value = THREE.MathUtils.radToDeg(selectedObject.rotation.y).toFixed(1);
      inputs.rz.value = THREE.MathUtils.radToDeg(selectedObject.rotation.z).toFixed(1);

      inputs.sx.value = selectedObject.scale.x.toFixed(3);
      inputs.sy.value = selectedObject.scale.y.toFixed(3);
      inputs.sz.value = selectedObject.scale.z.toFixed(3);
    }

    function updateObjectFromUI() {
      if (!selectedObject) return;

      selectedObject.position.set(
        parseFloat(inputs.px.value) || 0,
        parseFloat(inputs.py.value) || 0,
        parseFloat(inputs.pz.value) || 0
      );

      selectedObject.rotation.set(
        THREE.MathUtils.degToRad(parseFloat(inputs.rx.value) || 0),
        THREE.MathUtils.degToRad(parseFloat(inputs.ry.value) || 0),
        THREE.MathUtils.degToRad(parseFloat(inputs.rz.value) || 0)
      );

      selectedObject.scale.set(
        parseFloat(inputs.sx.value) || 1,
        parseFloat(inputs.sy.value) || 1,
        parseFloat(inputs.sz.value) || 1
      );

      if (selectionBox.visible) selectionBox.update();
    }

    // Bind UI inputs
    Object.values(inputs).forEach(input => {
      input.addEventListener('change', updateObjectFromUI);
      input.addEventListener('input', updateObjectFromUI);
    });

    function selectObject(obj) {
      selectedObject = obj;
      if (obj) {
        selectionBox.setFromObject(obj);
        selectionBox.visible = true;
        propertiesPanel.style.display = 'block';
        updateUIFromObject();
      } else {
        selectionBox.visible = false;
        propertiesPanel.style.display = 'none';
      }
    }

    // Spawn Placeholder Helper for local models on restore if they can't be found anywhere
    function createPlaceholderBox(item) {
      const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
      const material = new THREE.MeshBasicMaterial({ color: 0xff3333, wireframe: true });
      const box = new THREE.Mesh(geometry, material);

      box.userData.isAssetRoot = true;
      box.userData.assetKey = item.assetKey;
      box.userData.isCustom = item.isCustom;
      box.userData.customUrl = item.customUrl;
      box.userData.isPlaceholder = true;

      box.position.set(item.position.x, item.position.y, item.position.z);
      box.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);
      box.scale.set(item.scale.x, item.scale.y, item.scale.z);

      scene.add(box);
      placedObjects.push(box);
      selectObject(box);
    }

    // Helper to load and place models
    async function loadAndPlaceModel(url, assetKey, isCustom = false, customUrl = null, customTransform = null) {
      loadingOverlay.style.display = 'flex';
      try {
        const gltf = await gltfLoader.loadAsync(url);
        const model = gltf.scene;

        // Prepare Shadows and Flags
        model.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        model.userData.isAssetRoot = true;
        model.userData.assetKey = assetKey;
        model.userData.isCustom = isCustom;
        model.userData.customUrl = customUrl;

        if (customTransform) {
          model.position.set(customTransform.position.x, customTransform.position.y, customTransform.position.z);
          model.rotation.set(customTransform.rotation.x, customTransform.rotation.y, customTransform.rotation.z);
          model.scale.set(customTransform.scale.x, customTransform.scale.y, customTransform.scale.z);
        } else {
          model.position.set(0, 0, 0);
        }

        scene.add(model);
        placedObjects.push(model);

        selectObject(model);
      } catch (err) {
        console.error(err);
        if (customTransform) {
          // Keep layout intact by spawning a fallback wireframe placeholder box!
          createPlaceholderBox({
            assetKey: assetKey,
            isCustom: isCustom,
            customUrl: customUrl,
            position: customTransform.position,
            rotation: customTransform.rotation,
            scale: customTransform.scale
          });
        } else {
          showToast("Failed to load asset: " + err.message + "\n\nTry uploading the model directly.", 'error');
        }
      }
      loadingOverlay.style.display = 'none';
    }

    // Spawn Pre-defined Logic
    spawnBtn.addEventListener('click', () => {
      const assetKey = selectEl.value;
      const url = ASSETS.models[assetKey];
      if (url) loadAndPlaceModel(url, assetKey);
    });

    // Spawn Custom Logic
    spawnCustomBtn.addEventListener('click', async () => {
      const file = fileUploadEl.files[0];
      const urlVal = urlUploadEl.value.trim();

      if (file) {
        const key = 'custom_' + file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_');

        loadingOverlay.style.display = 'flex';
        try {
          await storeCustomModel(key, file);
          const localUrl = URL.createObjectURL(file);

          const existingPlaceholder = placedObjects.find(obj => obj.userData.isPlaceholder && obj.userData.assetKey === key);
          if (existingPlaceholder) {
            const transform = {
              position: { x: existingPlaceholder.position.x, y: existingPlaceholder.position.y, z: existingPlaceholder.position.z },
              rotation: { x: existingPlaceholder.rotation.x, y: existingPlaceholder.rotation.y, z: existingPlaceholder.rotation.z },
              scale: { x: existingPlaceholder.scale.x, y: existingPlaceholder.scale.y, z: existingPlaceholder.scale.z }
            };
            scene.remove(existingPlaceholder);
            const idx = placedObjects.indexOf(existingPlaceholder);
            if (idx > -1) placedObjects.splice(idx, 1);
            await loadAndPlaceModel(localUrl, key, true, null, transform);
          } else {
            await loadAndPlaceModel(localUrl, key, true, null);
          }
        } catch (dbError) {
          console.error(dbError);
          showToast("Failed to save custom asset to DB: " + dbError.message, 'error');
        }
        loadingOverlay.style.display = 'none';
        fileUploadEl.value = '';
      } else if (urlVal) {
        const key = 'custom_url_model';
        loadAndPlaceModel(urlVal, key, true, urlVal);
        urlUploadEl.value = '';
      } else {
        showToast("Please select a local .glb file or enter a valid URL.", 'error');
      }
    });

    deleteBtn.addEventListener('click', () => {
      if (selectedObject) {
        scene.remove(selectedObject);
        const index = placedObjects.indexOf(selectedObject);
        if (index > -1) placedObjects.splice(index, 1);
        selectObject(null);
      }
    });

    // Clear Scene
    clearSceneBtn.addEventListener('click', () => {
      showConfirm("Are you sure you want to clear all objects from the scene?", () => {
        selectObject(null);
        const copy = [...placedObjects];
        copy.forEach(obj => {
          scene.remove(obj);
        });
        placedObjects.length = 0;
        showToast("Scene cleared.", 'success');
      });
    });

    // Serialization Logic
    function serializeLayout() {
      return placedObjects.map(obj => ({
        assetKey: obj.userData.assetKey,
        isCustom: obj.userData.isCustom || false,
        customUrl: obj.userData.customUrl || null,
        isPlaceholder: obj.userData.isPlaceholder || false,
        position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
        rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
        scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z }
      }));
    }

    // Deserialization Logic (Recreate layout from saved JSON data)
    async function deserializeLayout(data) {
      if (!Array.isArray(data)) return;

      selectObject(null);
      const copy = [...placedObjects];
      copy.forEach(obj => scene.remove(obj));
      placedObjects.length = 0;

      for (const item of data) {
        let url = null;
        let isCustom = item.isCustom;

        if (isCustom) {
          if (item.embeddedData) {
            url = item.embeddedData;
            try {
              const res = await fetch(item.embeddedData);
              const blob = await res.blob();
              await storeCustomModel(item.assetKey, blob);
            } catch(e) {
              console.warn("Failed to cache embedded model locally", e);
            }
          } else if (item.customUrl) {
            url = item.customUrl;
          } else {
            try {
              const fileBlob = await retrieveCustomModel(item.assetKey);
              if (fileBlob) {
                url = URL.createObjectURL(fileBlob);
              } else {
                createPlaceholderBox(item);
                continue;
              }
            } catch (err) {
              console.error("Failed to fetch model from browser DB", err);
              createPlaceholderBox(item);
              continue;
            }
          }
        } else {
          url = ASSETS.models[item.assetKey];
        }

        if (url) {
          const transform = {
            position: item.position,
            rotation: item.rotation,
            scale: item.scale
          };
          await loadAndPlaceModel(url, item.assetKey, isCustom, item.customUrl, transform);
        }
      }
    }

    // --- LocalStorage Save History Management ---

    function getSaveHistory() {
      const historyJson = localStorage.getItem('woodbury_level_history');
      let history = historyJson ? JSON.parse(historyJson) : [];

      // Migrate old single-save if it exists and history is empty
      if (history.length === 0) {
        const oldSave = localStorage.getItem('woodbury_level_layout');
        if (oldSave) {
          history.push({
            timestamp: "Legacy Save",
            data: JSON.parse(oldSave)
          });
          localStorage.setItem('woodbury_level_history', JSON.stringify(history));
          localStorage.removeItem('woodbury_level_layout');
        }
      }
      return history;
    }

    // Helper to run individual exports cleanly
    async function packageAndDownloadLayout(layoutData, filename) {
      loadingOverlay.style.display = 'flex';
      try {
        const dataToExport = JSON.parse(JSON.stringify(layoutData));
        for (let item of dataToExport) {
          if (item.isCustom && !item.customUrl && !item.isPlaceholder) {
            try {
              const fileBlob = await retrieveCustomModel(item.assetKey);
              if (fileBlob) {
                const dataUrl = await new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result);
                  reader.onerror = reject;
                  reader.readAsDataURL(fileBlob);
                });
                item.embeddedData = dataUrl;
              }
            } catch (err) {
              console.warn("Could not embed model data for", item.assetKey);
            }
          }
        }

        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast("Layout file downloaded successfully!", 'success');
      } catch (err) {
        showToast("Export failed: " + err.message, 'error');
      } finally {
        loadingOverlay.style.display = 'none';
      }
    }

    // Dynamic rendering of save points and actions
    function renderHistoryUI() {
      const history = getSaveHistory();
      saveHistoryContainer.innerHTML = '';

      if (history.length === 0) {
        saveHistoryContainer.innerHTML = '<div style="padding: 10px; font-size: 11px; color: #ececec; text-align: center;">No saves found</div>';
        return;
      }

      history.forEach((save, index) => {
        const item = document.createElement('div');
        item.className = 'history-item';

        const timeSpan = document.createElement('span');
        timeSpan.className = 'history-time';
        if (index === 0) {
           timeSpan.innerHTML = `<strong>${save.timestamp} (Latest)</strong>`;
        } else {
           timeSpan.textContent = save.timestamp;
        }

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'history-actions';

        // Load specific history save
        const loadBtn = document.createElement('button');
        loadBtn.className = 'history-btn load';
        loadBtn.textContent = 'Load';
        loadBtn.title = 'Load this specific save point';
        loadBtn.onclick = () => {
          showConfirm(`Are you sure you want to load layout from ${save.timestamp}? Unsaved scene edits will be overwritten.`, async () => {
            await deserializeLayout(save.data);
            showToast("Saved point loaded!", 'success');
          });
        };

        // Export specific history save
        const exportBtn = document.createElement('button');
        exportBtn.className = 'history-btn export';
        exportBtn.textContent = 'Exp';
        exportBtn.title = 'Export this specific layout to your computer';
        exportBtn.onclick = async () => {
          const rawTime = save.timestamp.replace(/[^a-zA-Z0-9]/g, '_');
          await packageAndDownloadLayout(save.data, `woodbury_layout_${rawTime}.json`);
        };

        // Delete specific history save
        const delBtn = document.createElement('button');
        delBtn.className = 'history-btn delete';
        delBtn.textContent = '×';
        delBtn.title = 'Remove this save point from history';
        delBtn.onclick = () => {
          showConfirm(`Are you sure you want to delete the save from ${save.timestamp}?`, () => {
            const hist = getSaveHistory();
            hist.splice(index, 1);
            localStorage.setItem('woodbury_level_history', JSON.stringify(hist));
            renderHistoryUI();
            showToast("Save point removed.", 'success');
          });
        };

        actionsDiv.appendChild(loadBtn);
        actionsDiv.appendChild(exportBtn);
        actionsDiv.appendChild(delBtn);

        item.appendChild(timeSpan);
        item.appendChild(actionsDiv);
        saveHistoryContainer.appendChild(item);
      });
    }

    // Initialize UI list on start
    renderHistoryUI();

    quickSaveBtn.addEventListener('click', () => {
      const layoutData = serializeLayout();
      const history = getSaveHistory();

      // Add new save to the front
      history.unshift({
        timestamp: new Date().toLocaleString(),
        data: layoutData
      });

      // Keep only last 10
      if (history.length > 10) {
        history.length = 10;
      }

      localStorage.setItem('woodbury_level_history', JSON.stringify(history));
      renderHistoryUI();

      const oldText = quickSaveBtn.innerText;
      quickSaveBtn.innerText = "Saved!";
      quickSaveBtn.style.background = "#0d8f6f";
      setTimeout(() => {
        quickSaveBtn.innerText = oldText;
        quickSaveBtn.style.background = "#383838"; 
      }, 1500);
      showToast("Layout saved to history!", 'success');
    });

    quickLoadBtn.addEventListener('click', async () => {
      const history = getSaveHistory();
      if (history.length === 0) {
        showToast("No saved layout found in browser storage!", 'error');
        return;
      }
      await deserializeLayout(history[0].data);
      showToast("Latest save loaded!", 'success');
    });

    // Import a file directly into the local History array
    fileImportHistory.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (!Array.isArray(parsed)) {
            throw new Error("Invalid layout format (should be JSON array)");
          }

          const history = getSaveHistory();
          // Push to the top of history
          history.unshift({
            timestamp: `Imported: ${file.name.slice(0, 18)}`,
            data: parsed
          });

          if (history.length > 10) {
            history.length = 10;
          }

          localStorage.setItem('woodbury_level_history', JSON.stringify(history));
          renderHistoryUI();
          showToast("Imported successfully to History List!", 'success');
        } catch (err) {
          showToast("Failed to parse history JSON: " + err.message, 'error');
        }
        fileImportHistory.value = '';
      };
      reader.readAsText(file);
    });

    // --- Computer Layout File Operations ---

    fileExportBtn.addEventListener('click', async () => {
      const layoutData = serializeLayout();
      await packageAndDownloadLayout(layoutData, 'woodbury_level_layout.json');
    });

    fileImportInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          await deserializeLayout(parsed);
          showToast("Layout imported to active scene!", 'success');
        } catch (err) {
          showToast("Failed to import layout file: " + err.message, 'error');
        }
        fileImportInput.value = '';
      };
      reader.readAsText(file);
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      switch (e.key.toLowerCase()) {
        case 'delete': 
        case 'backspace':
          if (e.target.tagName !== 'INPUT') { 
            deleteBtn.click();
          }
          break;
      }
    });

    // Export Layout Code to JS
    exportBtn.addEventListener('click', () => {
      let code = `// --- CUSTOM GENERATED LAYOUT ---\n// Paste this into your buildProps() function\n\n`;
      const counts = {}; 

      placedObjects.forEach((obj) => {
        const key = obj.userData.assetKey;

        if (!counts[key]) counts[key] = 0;
        counts[key]++;

        const varName = `${key}_${counts[key]}`;
        const pos = obj.position;

        const box = new THREE.Box3().setFromObject(obj);
        const size = new THREE.Vector3();
        box.getSize(size);
        const height = size.y;
        const yaw = obj.rotation.y;

        code += `const ${varName} = cloneAsset(assets.${key});\n`;
        code += `if (${varName}) {\n`;
        code += `  placeObjectOnFloor(${varName}, new THREE.Vector3(${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)}), { targetHeight: ${height.toFixed(3)}, yaw: ${yaw.toFixed(3)} });\n`;
        code += `  scene.add(${varName});\n`;
        if (!['nightstandLamp', 'chandelier', 'mug'].includes(key)) {
           code += `  registerObstacleObject(${varName}, 0.08, 0.05);\n`;
        }
        code += `}\n\n`;
      });

      outputTxt.value = code;
      const oldText = exportBtn.innerText;
      exportBtn.innerText = "Code Generated!";
      exportBtn.style.background = "#10a37f";
      setTimeout(() => {
        exportBtn.innerText = oldText;
        exportBtn.style.background = "";
      }, 1500);
      showToast("Code generated successfully!", 'success');
    });

    // Animation Loop
    function animate() {
      requestAnimationFrame(animate);
      orbit.update();
      if (selectedObject && selectionBox.visible) {
        selectionBox.update();
      }
      renderer.render(scene, camera);
    }
    animate();

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
