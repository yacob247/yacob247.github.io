import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

import AudioManager from './audiomanager.js';
import { CameraEffects } from './cameraeffects.js';
import { PlayerController } from './playercontroller.js';
import { EnemyController } from './enemycontroller.js';
import { GAME_COPY, ASSET_URLS } from './assets.js';

const FLOOR_Y_FIRST = 0;
const FLOOR_Y_SECOND = 3.55;
const EYE_HEIGHT = 1.62;
const CHARACTER_YAW_OFFSET = Math.PI;
const PLAYER_START = new THREE.Vector3(-2.2, FLOOR_Y_SECOND, 11.2);
const CAMERA_UP = new THREE.Vector3(0, 1, 0);
const CAMERA_COLLISION_SAMPLES = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0.22, 0, 0),
  new THREE.Vector3(-0.22, 0, 0),
  new THREE.Vector3(0, 0.18, 0)
];

const canvas = document.getElementById('game');
const loadingPanel = document.getElementById('loading-panel');
const loadingStatus = document.getElementById('loading-status');
const startPanel = document.getElementById('start-panel');
const startButton = document.getElementById('start-button');
const introCopy = document.getElementById('intro-copy');
const hud = document.getElementById('hud');
const objectiveEl = document.getElementById('objective');
const eventStatusEl = document.getElementById('event-status');
const flashlightStatusEl = document.getElementById('flashlight-status');
const statusLineEl = document.getElementById('status-line');
const promptEl = document.getElementById('prompt');
const subtitleEl = document.getElementById('subtitle');
const fadeEl = document.getElementById('fade');
const endPanel = document.getElementById('end-panel');
const endTitle = document.getElementById('end-title');
const endDesc = document.getElementById('end-desc');
const mobileControls = document.getElementById('mobile-controls');
const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');
const interactButton = document.getElementById('interact-button');
const flashlightButton = document.getElementById('flashlight-button');

introCopy.textContent = GAME_COPY.intro;

THREE.ColorManagement.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030406);
scene.fog = new THREE.FogExp2(0x030406, 0.045);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 220);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous');
const rgbeLoader = new RGBELoader();
rgbeLoader.setCrossOrigin('anonymous');
const fbxLoader = new FBXLoader();
fbxLoader.setCrossOrigin('anonymous');

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/basis/');
ktx2Loader.detectSupport(renderer);

const gltfLoader = new GLTFLoader();
gltfLoader.setCrossOrigin('anonymous');
gltfLoader.setDRACOLoader(dracoLoader);
gltfLoader.setKTX2Loader(ktx2Loader);
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

const audio = new AudioManager().init(camera);
const cameraEffects = new CameraEffects(camera, renderer);
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();

const tempVecA = new THREE.Vector3();
const tempVecB = new THREE.Vector3();
const tempVecC = new THREE.Vector3();
const tempBox = new THREE.Box3();
const tempQuat = new THREE.Quaternion();

const state = {
  started: false,
  booted: false,
  gameOver: false,
  currentAct: 1,
  assets: null,
  loadingFailures: [],
  pointerLocked: false,
  isTouchMode: window.matchMedia('(pointer: coarse)').matches,
  hoveredInteractable: null,
  promptVisible: false,
  inputSuppressed: false,
  flashlightOn: true,
  subtitlesToken: 0,
  ambienceTimer: 0,
  currentObjective: '',
  currentEvent: '',
  mixers: [],
  interactables: [],
  colliderMeshes: [],
  animatedDoors: [],
  cctv: { feeds: [], screens: [], timer: 0 },
  eventTriggered: false,
  activeScript: null,
  scriptTimer: 0,
  scriptStep: 0,
  houseLights: [],
  roomDoor: null,
  frontDoor: null,
  drawer: null,
  wardrobe: null,
  playerFloorY: FLOOR_Y_SECOND,
  hidePhase: 'outside',
  hideTimer: 0,
  isHidden: false,
  canExitWardrobe: false,
  canUseFrontDoor: false,
  preHidePosition: new THREE.Vector3(),
  preHidePlayerPosition: new THREE.Vector3(),
  preHideRotation: new THREE.Quaternion(),
  lookYaw: Math.PI,
  lookPitch: -0.16,
  cameraDistance: 4.8,
  cameraCurrentTarget: new THREE.Vector3(),
  cameraCurrentPosition: new THREE.Vector3(),
  activeTouchLookId: null,
  touchLookLast: { x: 0, y: 0 },
  player: null,
  intruderEntity: null,
  liamEntity: null,
  noraEntity: null,
  rainParticles: null,
  moonLight: null,
  road: {
    spokenToLiam: false,
    trunkOpened: false,
    emergencyUnlocked: false,
    gateCalled: false,
    checkpointUnlocked: false,
    shelterReached: false,
    storyStage: 0,
    roadEndZ: -124,
    gateBarrier: null,
    gateBarrierOpen: 0,
    gateBarrierTarget: 0,
    trunk: null,
    flareLight: null,
    umbrellaTaken: false,
    umbrellaOpen: false,
    umbrellaTimer: 0,
    umbrellaProxy: null,
    umbrellaStand: null,
    destinationMarker: null,
    checkpointFire: null,
    shelterArea: new THREE.Box3(),
    car: null
  },
  zones: {
    upstairsLanding: new THREE.Box3(),
    intruderCatch: new THREE.Box3()
  }
};

const player = {
  root: new THREE.Group(),
  visualPivot: new THREE.Group(),
  visual: null,
  focusAnchor: new THREE.Object3D(),
  controller: null,
  umbrella: null
};
player.root.add(player.visualPivot);
player.focusAnchor.position.set(0, 1.5, 0);
player.root.add(player.focusAnchor);
state.player = player;
scene.add(player.root);

const flashlight = new THREE.SpotLight(0xf7f0d2, 36, 85, Math.PI / 4.1, 0.45, 1.2);
flashlight.castShadow = true;
flashlight.shadow.mapSize.set(512, 512);
flashlight.shadow.camera.near = 0.2;
flashlight.shadow.camera.far = 85;
flashlight.target.position.set(0, -0.04, -1.6);
camera.add(flashlight);
camera.add(flashlight.target);
scene.add(camera);

player.controller = new PlayerController(player.root);
player.controller.setCamera(camera);
player.controller.setKeyBindings({ attack: 'r' });
player.controller.setCollisionConfig({ wallCheckDistance: 0.42, groundProbeHeight: 0.6, groundSnapDistance: 0.2 });
player.controller.setFallReset({ y: -20, position: PLAYER_START.clone() });
player.controller.setAnimationUrls({
  idle: ASSET_URLS.motions.idle,
  walk: ASSET_URLS.motions.walk,
  run: ASSET_URLS.motions.run,
  jump: ASSET_URLS.motions.run,
  attack: ASSET_URLS.motions.point
});

bindInput();
boot().catch((error) => {
  console.error(error);
  loadingStatus.textContent = error.message;
});

async function boot() {
  setStatus('Loading estate assets...');
  bindStartButton();
  loadingStatus.textContent = 'Resolving critical assets...';
  state.assets = await loadCriticalAssets();
  loadingStatus.textContent = 'Resolving cast and motions...';
  await loadOptionalCharacterAssets();
  setStatus('Building world...');
  buildWorld(state.assets);
  await applyPlayerVisual();
  await player.controller.init({ skipAnimation: false });
  updateCollisionTargets();
  preloadDynamicAssets();
  player.root.position.copy(PLAYER_START);
  player.root.rotation.y = Math.PI;
  setPlayerYaw(Math.PI);
  updateFollowCamera(true);
  window.addEventListener('resize', onResize);
  loadingPanel.classList.add('hidden');
  startPanel.classList.remove('hidden');
  state.booted = true;
  animate();
}

function bindStartButton() {
  startButton.addEventListener('click', () => {
    audio.resume();
    state.started = true;
    hud.classList.remove('hidden');
    startPanel.classList.add('hidden');
    if (state.isTouchMode) mobileControls.classList.remove('hidden');
    lockPointer();
    setObjective('Step onto the upstairs landing and listen.');
    setEvent('Rain whispers against the windows.');
    audio.playBGM(ASSET_URLS.audio.rainLoop, { volume: 0.34, loop: true, fadeIn: 1 });
  }, { once: true });
}

function bindInput() {
  document.addEventListener('pointerlockchange', () => {
    state.pointerLocked = document.pointerLockElement === canvas;
  });

  canvas.addEventListener('click', () => {
    if (state.started && !state.gameOver && !state.isTouchMode && !state.isHidden && !state.inputSuppressed) {
      lockPointer();
    }
  });

  document.addEventListener('mousemove', (event) => {
    if (!state.pointerLocked || state.isTouchMode || state.isHidden) return;
    state.lookYaw -= event.movementX * 0.0024;
    state.lookPitch = THREE.MathUtils.clamp(state.lookPitch - event.movementY * 0.0019, -0.68, 0.38);
  });

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (event.repeat) return;

    if (state.gameOver) return;
    if (key === 'e' && state.started) {
      event.preventDefault();
      performInteraction();
      return;
    }
    if (key === 'f' && state.started) {
      event.preventDefault();
      toggleFlashlight();
      return;
    }
    if (key === 'escape' && state.pointerLocked) {
      document.exitPointerLock?.();
      return;
    }
  });

  if (!state.isTouchMode) return;

  let joystickActive = false;
  let joystickPointerId = null;
  const joystickCenter = { x: 0, y: 0, radius: 46 };

  const updateJoystickFromEvent = (event) => {
    const dx = event.clientX - joystickCenter.x;
    const dy = event.clientY - joystickCenter.y;
    const max = joystickCenter.radius;
    const distance = Math.min(max, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    const px = Math.cos(angle) * distance;
    const py = Math.sin(angle) * distance;
    joystickKnob.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
    player.controller.setJoystickMove(px / max, py / max);
  };

  joystickBase.addEventListener('pointerdown', (event) => {
    joystickActive = true;
    joystickPointerId = event.pointerId;
    joystickBase.setPointerCapture(event.pointerId);
    const rect = joystickBase.getBoundingClientRect();
    joystickCenter.x = rect.left + rect.width / 2;
    joystickCenter.y = rect.top + rect.height / 2;
    updateJoystickFromEvent(event);
  });

  joystickBase.addEventListener('pointermove', (event) => {
    if (!joystickActive || event.pointerId !== joystickPointerId) return;
    updateJoystickFromEvent(event);
  });

  const releaseJoystick = (event) => {
    if (!joystickActive || event.pointerId !== joystickPointerId) return;
    joystickActive = false;
    joystickPointerId = null;
    joystickKnob.style.transform = 'translate(-50%, -50%)';
    player.controller.setJoystickMove(0, 0);
  };

  joystickBase.addEventListener('pointerup', releaseJoystick);
  joystickBase.addEventListener('pointercancel', releaseJoystick);

  interactButton.addEventListener('click', () => performInteraction());
  flashlightButton.addEventListener('click', () => toggleFlashlight());

  window.addEventListener('pointerdown', (event) => {
    if (!state.started || event.target.closest('#mobile-controls')) return;
    state.activeTouchLookId = event.pointerId;
    state.touchLookLast.x = event.clientX;
    state.touchLookLast.y = event.clientY;
  });

  window.addEventListener('pointermove', (event) => {
    if (event.pointerId !== state.activeTouchLookId || state.gameOver || state.isHidden) return;
    const dx = event.clientX - state.touchLookLast.x;
    const dy = event.clientY - state.touchLookLast.y;
    state.touchLookLast.x = event.clientX;
    state.touchLookLast.y = event.clientY;
    state.lookYaw -= dx * 0.004;
    state.lookPitch = THREE.MathUtils.clamp(state.lookPitch - dy * 0.003, -0.68, 0.38);
  });

  window.addEventListener('pointerup', (event) => {
    if (event.pointerId === state.activeTouchLookId) state.activeTouchLookId = null;
  });
}

function lockPointer() {
  if (state.isTouchMode) return;
  canvas.requestPointerLock?.();
}

async function loadCriticalAssets() {
  const tasks = {
    hdri: loadHDRI(ASSET_URLS.hdri.nightField),
    floorMat: loadMaterialSet(ASSET_URLS.materials.floor, { repeat: [5, 5] }),
    wallMat: loadMaterialSet(ASSET_URLS.materials.wall, { repeat: [3, 2] }),
    fabricMat: loadMaterialSet(ASSET_URLS.materials.fabric, { repeat: [2, 2] }),
    plasterMat: loadMaterialSet(ASSET_URLS.materials.plaster, { repeat: [3, 2] })
  };

  for (const [key, url] of Object.entries(ASSET_URLS.models)) {
    tasks[key] = loadGLTF(url);
  }

  const results = await settleObject(tasks);
  if (results.hdri) {
    results.hdri.mapping = THREE.EquirectangularReflectionMapping;
  }
  return results;
}

async function loadOptionalCharacterAssets() {
  const tasks = {
    playerAvatar: loadFBX(ASSET_URLS.characters.player),
    intruderAvatar: loadFBX(ASSET_URLS.characters.intruder),
    liamAvatar: loadFBX(ASSET_URLS.characters.liam),
    noraAvatar: loadFBX(ASSET_URLS.characters.nora),
    walkMotion: loadFBXMotion(ASSET_URLS.motions.walk),
    idleMotion: loadFBXMotion(ASSET_URLS.motions.idle),
    stalkMotion: loadFBXMotion(ASSET_URLS.motions.stalk),
    runMotion: loadFBXMotion(ASSET_URLS.motions.run),
    phoneMotion: loadFBXMotion(ASSET_URLS.motions.phone),
    dismissMotion: loadFBXMotion(ASSET_URLS.motions.dismiss),
    pointMotion: loadFBXMotion(ASSET_URLS.motions.point)
  };
  const results = await settleObject(tasks);
  Object.assign(state.assets, results);
}

async function settleObject(tasks) {
  const entries = Object.entries(tasks);
  const settled = await Promise.allSettled(entries.map(([, promise]) => promise));
  const result = {};
  settled.forEach((item, index) => {
    const key = entries[index][0];
    if (item.status === 'fulfilled') {
      result[key] = item.value;
    } else {
      console.warn(`${key} failed to load`, item.reason);
      state.loadingFailures.push(key);
      result[key] = null;
    }
  });
  return result;
}

async function loadHDRI(url) {
  const hdr = await rgbeLoader.loadAsync(url);
  const envMap = pmrem.fromEquirectangular(hdr).texture;
  hdr.dispose();
  return envMap;
}

async function loadGLTF(url) {
  const gltf = await gltfLoader.loadAsync(url);
  prepareShadows(gltf.scene);
  return gltf.scene;
}

async function loadFBX(url) {
  const object = await fbxLoader.loadAsync(url);
  prepareShadows(object);
  return object;
}

async function loadFBXMotion(url) {
  const object = await fbxLoader.loadAsync(url);
  return object.animations?.[0] || null;
}

async function loadMaterialSet(entry, options = {}) {
  const [color, normal] = await Promise.all([
    textureLoader.loadAsync(entry.color),
    textureLoader.loadAsync(entry.normal)
  ]);
  color.colorSpace = THREE.SRGBColorSpace;
  color.wrapS = color.wrapT = THREE.RepeatWrapping;
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  if (options.repeat) {
    color.repeat.set(options.repeat[0], options.repeat[1]);
    normal.repeat.set(options.repeat[0], options.repeat[1]);
  }
  return new THREE.MeshStandardMaterial({
    map: color,
    normalMap: normal,
    roughness: 0.88,
    metalness: 0.04
  });
}

function prepareShadows(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of materials) {
      if (!mat) continue;
      if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
      mat.needsUpdate = true;
    }
  });
}

async function applyPlayerVisual() {
  const avatar = cloneAsset(state.assets.playerAvatar);
  if (!avatar) {
    const fallback = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 1.15, 4, 10),
      new THREE.MeshStandardMaterial({ color: 0x304050, roughness: 0.85 })
    );
    fallback.position.y = 0.98;
    player.visual = fallback;
    player.visualPivot.add(fallback);
    return;
  }

  fitHeight(avatar, 1.82);
  avatar.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(avatar);
  const center = box.getCenter(new THREE.Vector3());
  avatar.position.set(-center.x, -box.min.y, -center.z);
  player.visualPivot.rotation.y = CHARACTER_YAW_OFFSET;
  player.visual = avatar;
  player.visualPivot.add(avatar);
}

function cloneAsset(asset) {
  if (!asset) return null;
  try {
    return skeletonClone(asset);
  } catch {
    return asset.clone(true);
  }
}

function fitHeight(object, targetHeight) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  if (size.y <= 0) return;
  object.scale.multiplyScalar(targetHeight / size.y);
  object.updateMatrixWorld(true);
}

// Measures an object's real footprint (width/depth/height) after any prior
// scaling, so layout code can space pieces apart based on their true size
// instead of guessed constants.
function measureFootprint(object) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  return { width: size.x, depth: size.z, height: size.y, box };
}

function placeObjectOnFloor(object, position, { yaw = 0, targetHeight = null } = {}) {
  if (targetHeight) fitHeight(object, targetHeight);
  object.rotation.y = yaw;
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  object.position.x += position.x - center.x;
  object.position.z += position.z - center.z;
  object.position.y += position.y - box.min.y;
  object.updateMatrixWorld(true);
}

function getFallbackMaterial(colorValue) {
  return new THREE.MeshStandardMaterial({ color: colorValue, roughness: 0.88, metalness: 0.05 });
}

function getFallbackModel(colorValue, w, h, d) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), getFallbackMaterial(colorValue));
  mesh.position.y = h / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

function setStatus(text) {
  statusLineEl.textContent = `Status: ${text}`;
}

function setObjective(text) {
  state.currentObjective = text;
  objectiveEl.textContent = `Objective: ${text}`;
}

function setEvent(text) {
  state.currentEvent = text;
  eventStatusEl.textContent = text;
}

function showSubtitle(text, duration = 2.5) {
  state.subtitlesToken += 1;
  const token = state.subtitlesToken;
  subtitleEl.textContent = text;
  subtitleEl.classList.remove('hidden');
  window.setTimeout(() => {
    if (state.subtitlesToken === token) subtitleEl.classList.add('hidden');
  }, duration * 1000);
}

function showPrompt(text) {
  promptEl.textContent = text;
  promptEl.classList.remove('hidden');
  state.promptVisible = true;
}

function hidePrompt() {
  if (!state.promptVisible) return;
  promptEl.classList.add('hidden');
  state.promptVisible = false;
}

function flashFade(opacity, duration, onPeak) {
  fadeEl.style.transition = `opacity ${duration}ms ease`;
  fadeEl.style.opacity = String(opacity);
  window.setTimeout(() => {
    onPeak?.();
    fadeEl.style.opacity = '0';
  }, duration);
}

function createInteractProxy(position, size) {
  const proxy = new THREE.Mesh(
    new THREE.BoxGeometry(size.x, size.y, size.z),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
  );
  proxy.position.copy(position);
  return proxy;
}

function registerInteractable(entry) {
  entry.mesh.userData.interactable = entry;
  state.interactables.push(entry);
}

function addColliderMesh(mesh) {
  mesh.userData.isCollider = true;
  state.colliderMeshes.push(mesh);
}

function registerObstacleObject(object, padding = 0.08, yPadding = 0.08) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3()).add(new THREE.Vector3(padding * 2, yPadding * 2, padding * 2));
  const center = box.getCenter(new THREE.Vector3());
  const collider = new THREE.Mesh(
    new THREE.BoxGeometry(size.x, size.y, size.z),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
  );
  collider.position.copy(center);
  scene.add(collider);
  addColliderMesh(collider);
  return collider;
}

function updateCollisionTargets() {
  player.controller.setCollisionTargets(state.colliderMeshes);
}

function isBlocked(position) {
  tempBox.min.set(position.x - 0.28, position.y + 0.02, position.z - 0.28);
  tempBox.max.set(position.x + 0.28, position.y + 1.9, position.z + 0.28);
  for (const mesh of state.colliderMeshes) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.intersectsBox(tempBox)) return true;
  }
  return false;
}

function setPlayerYaw(yaw) {
  player.root.rotation.y = yaw;
  state.lookYaw = yaw + Math.PI;
}

function getPlayerFocusPosition() {
  return player.focusAnchor.getWorldPosition(new THREE.Vector3());
}

function preloadDynamicAssets() {
  audio.preload([
    ASSET_URLS.audio.thunder,
    ASSET_URLS.audio.suspenseSting,
    ASSET_URLS.audio.floorCreak,
    ASSET_URLS.audio.ghostWhoosh,
    ASSET_URLS.audio.lightSwitch
  ]).catch((error) => console.warn('Optional audio preloading failed', error));
}

// ---------------------------------------------------------------------------
// World construction
// ---------------------------------------------------------------------------
//
// The estate (house interior, road, gate) is a fixed hand-placed scene built
// from the loaded GLTF/FBX assets. Past the end of the road (state.road.roadEndZ)
// the world stops being scripted and becomes an endless procedurally generated
// woodland made of streamed chunks, so the player can keep walking forever in
// that direction instead of hitting a hard boundary.

const CHUNK_SIZE = 40;
const CHUNK_LOAD_RADIUS = 2; // chunks around the player kept resident
const terrainAssetKeys = ['treeA', 'treeB', 'treeC', 'rockA', 'rockB'];

function buildWorld(assets) {
  buildLighting();
  const houseInfo = buildGroundAndHouse(assets);
  buildRoad(assets, houseInfo?.frontZ);
  buildCast(assets);
  buildCCTV(houseInfo);
  state.terrain = createEndlessTerrain(assets);
}

function buildLighting() {
  if (state.assets.hdri) {
    scene.environment = state.assets.hdri;
  }

  const moon = new THREE.DirectionalLight(0x9db8d9, 0.55);
  moon.position.set(-40, 60, -20);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 180;
  moon.shadow.camera.left = -80;
  moon.shadow.camera.right = 80;
  moon.shadow.camera.top = 80;
  moon.shadow.camera.bottom = -80;
  scene.add(moon);
  scene.add(moon.target);
  state.moonLight = moon;

  scene.add(new THREE.HemisphereLight(0x1c2436, 0x05070a, 0.5));

  // A few warm interior lamps so the house doesn't read as pitch black.
  const lampPositions = [
    new THREE.Vector3(-2.2, FLOOR_Y_SECOND + 2.1, 9.5),
    new THREE.Vector3(3.4, FLOOR_Y_FIRST + 2.2, -2.0)
  ];
  for (const pos of lampPositions) {
    const lamp = new THREE.PointLight(0xffcf9b, 6, 12, 2);
    lamp.position.copy(pos);
    lamp.castShadow = false;
    scene.add(lamp);
    state.houseLights.push(lamp);
  }
}

function buildGroundAndHouse(assets) {
  // House footprint floor (covers the scripted area only; beyond it the
  // endless terrain system takes over). Sized after we know the real house
  // bounds below; start with a safe default and resize once measured.
  const floorMat = assets.floorMat || getFallbackMaterial(0x2a2f36);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, FLOOR_Y_FIRST, 0);
  floor.receiveShadow = true;
  scene.add(floor);
  addColliderMesh(floor);

  const upperFloor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
  upperFloor.rotation.x = -Math.PI / 2;
  upperFloor.position.set(0, FLOOR_Y_SECOND, 8);
  upperFloor.receiveShadow = true;
  scene.add(upperFloor);
  addColliderMesh(upperFloor);

  // Measure the house first so every other placement is relative to its
  // *real* footprint instead of a guessed number.
  let houseBounds = null;
  if (assets.mansionExterior) {
    const house = assets.mansionExterior;
    house.position.set(0, FLOOR_Y_FIRST, 0);
    house.updateMatrixWorld(true);
    scene.add(house);
    registerObstacleObject(house, 0.05, 0.05);
    const { box } = measureFootprint(house);
    houseBounds = box;
  }

  // Fallback room bounds if the house model didn't load/measure (keeps
  // layout sane rather than guessing absolute numbers blind).
  const room = houseBounds || new THREE.Box3(
    new THREE.Vector3(-9, FLOOR_Y_FIRST, -9),
    new THREE.Vector3(9, FLOOR_Y_FIRST + 6, 9)
  );
  const roomMinX = room.min.x + 0.6;
  const roomMaxX = room.max.x - 0.6;
  const roomMinZ = room.min.z + 0.6;
  const roomMaxZ = room.max.z - 0.6;

  if (assets.staircase) {
    placeObjectOnFloor(assets.staircase, new THREE.Vector3(roomMaxX - 2, FLOOR_Y_FIRST, roomMaxZ - 2), { yaw: Math.PI });
    scene.add(assets.staircase);
    registerObstacleObject(assets.staircase, 0.05, 0.05);
  }

  // Each entry places a piece flush against a wall edge, using its real
  // measured width/depth so neighbouring pieces don't overlap and nothing
  // floats past the wall it's meant to sit against.
  const upstairsBedroom = {
    minX: roomMinX, maxX: -1, minZ: roomMinZ + 6, maxZ: roomMaxZ, y: FLOOR_Y_SECOND
  };
  const livingArea = {
    minX: roomMinX, maxX: roomMaxX, minZ: roomMinZ, maxZ: 2, y: FLOOR_Y_FIRST
  };
  const kitchenArea = {
    minX: roomMinX, maxX: -1, minZ: roomMinZ, maxZ: 2, y: FLOOR_Y_FIRST
  };

  let bedroomCursorX = upstairsBedroom.minX + 0.3;
  let livingCursorX = livingArea.minX + 0.3;
  let kitchenCursorX = kitchenArea.minX + 0.3;

  function placeAlongWall(key, areaCursor, area, yaw, gap = 0.25) {
    const source = assets[key];
    const piece = source ? source.clone(true) : getFallbackModel(0x3a4452, 1, 1, 1);
    if (!source) fitHeight(piece, 1); // fallback boxes: normalize to authored size only
    const { width, depth } = measureFootprint(piece);
    const span = Math.abs(yaw % Math.PI) < 0.01 ? width : depth;

    const x = Math.min(areaCursor.x + span / 2, area.maxX - span / 2);
    const z = (area.minZ + area.maxZ) / 2;

    placeObjectOnFloor(piece, new THREE.Vector3(x, area.y, z), { yaw });
    scene.add(piece);
    if (key !== 'chandelier' && key !== 'nightstandLamp') {
      registerObstacleObject(piece, 0.05, 0.05);
    }
    areaCursor.x = x + span / 2 + gap;
    return piece;
  }

  const bedCursor = { x: bedroomCursorX };
  const bed = placeAlongWall('bed', bedCursor, upstairsBedroom, Math.PI / 2);
  placeAlongWall('nightstand', bedCursor, upstairsBedroom, 0);
  if (assets.nightstandLamp && bed) {
    const lamp = assets.nightstandLamp.clone(true);
    const { width } = measureFootprint(bed);
    placeObjectOnFloor(lamp, new THREE.Vector3(bed.position.x, upstairsBedroom.y, upstairsBedroom.minZ + 0.4), { yaw: 0 });
    scene.add(lamp);
  }
  const wardrobePos = placeAlongWall('wardrobe', bedCursor, upstairsBedroom, 0);
  if (assets.cabinet) {
    placeAlongWall('cabinet', bedCursor, upstairsBedroom, Math.PI / 2);
  }

  const livingCursor = { x: livingCursorX };
  placeAlongWall('sofa', livingCursor, livingArea, Math.PI);
  placeAlongWall('tv', livingCursor, livingArea, 0);
  placeAlongWall('bookcase', livingCursor, livingArea, -Math.PI / 2);

  const kitchenCursor = { x: kitchenCursorX };
  placeAlongWall('kitchenCounter', kitchenCursor, kitchenArea, Math.PI / 2);
  placeAlongWall('fridge', kitchenCursor, kitchenArea, Math.PI / 2);
  placeAlongWall('oven', kitchenCursor, kitchenArea, Math.PI / 2);

  const center = { x: (roomMinX + roomMaxX) / 2 };
  const centerArea = { minX: roomMinX, maxX: roomMaxX, minZ: 2.5, maxZ: roomMaxZ - 4, y: FLOOR_Y_FIRST };
  placeAlongWall('diningSet', center, centerArea, 0);
  placeAlongWall('piano', center, centerArea, Math.PI);
  placeAlongWall('consoleTable', center, centerArea, 0);
  placeAlongWall('coatRack', center, centerArea, 0);

  if (assets.chandelier) {
    const chandelier = assets.chandelier.clone(true);
    chandelier.position.set((roomMinX + roomMaxX) / 2, FLOOR_Y_SECOND + 2.6, (roomMinZ + roomMaxZ) / 2);
    scene.add(chandelier);
  }

  if (assets.wardrobeTall) {
    const wardrobe = assets.wardrobeTall.clone(true);
    const wPos = wardrobePos ? wardrobePos.position.clone() : new THREE.Vector3(roomMinX + 1, FLOOR_Y_SECOND, upstairsBedroom.minZ + 1);
    placeObjectOnFloor(wardrobe, wPos, { yaw: 0 });
    scene.add(wardrobe);
    state.wardrobe = wardrobe;
    const { width, depth, height } = measureFootprint(wardrobe);
    registerInteractable({
      mesh: createInteractProxy(wardrobe.position.clone().add(new THREE.Vector3(0, height / 2, 0)), { x: width, y: height, z: depth }),
      label: 'Hide in wardrobe',
      type: 'wardrobe',
      onInteract: () => toggleWardrobeHide()
    });
    scene.add(state.interactables[state.interactables.length - 1].mesh);
  }

  if (assets.door) {
    const roomDoor = assets.door.clone(true);
    placeObjectOnFloor(roomDoor, new THREE.Vector3((roomMinX + roomMaxX) / 2, FLOOR_Y_SECOND, roomMaxZ - 0.2), { yaw: 0 });
    scene.add(roomDoor);
    state.roomDoor = roomDoor;

    const frontDoor = assets.door.clone(true);
    const { height: doorHeight, width: doorWidth, depth: doorDepth } = measureFootprint(frontDoor);
    placeObjectOnFloor(frontDoor, new THREE.Vector3(0, FLOOR_Y_FIRST, roomMaxZ + 0.2), { yaw: 0 });
    scene.add(frontDoor);
    state.frontDoor = frontDoor;
    registerInteractable({
      mesh: createInteractProxy(frontDoor.position.clone().add(new THREE.Vector3(0, doorHeight / 2, 0)), { x: doorWidth, y: doorHeight, z: Math.max(doorDepth, 0.6) }),
      label: 'Open front door',
      type: 'frontDoor',
      onInteract: () => exitThroughFrontDoor()
    });
    scene.add(state.interactables[state.interactables.length - 1].mesh);
  }

  return { frontZ: roomMaxZ };
}

function buildRoad(assets, houseFrontZ) {
  const roadStartZ = (houseFrontZ ?? 18) + 2;
  const roadLength = roadStartZ - state.road.roadEndZ;
  const roadGeo = new THREE.PlaneGeometry(8, roadLength);
  const roadMat = getFallbackMaterial(0x14171b);
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, FLOOR_Y_FIRST + 0.01, roadStartZ - roadLength / 2);
  road.receiveShadow = true;
  scene.add(road);
  addColliderMesh(road);

  const treelineKeys = ['treeA', 'treeB', 'treeC'];
  for (let z = roadStartZ; z > state.road.roadEndZ; z -= 6) {
    for (const side of [-1, 1]) {
      const key = treelineKeys[Math.floor(Math.random() * treelineKeys.length)];
      const source = assets[key];
      if (!source) continue;
      const tree = source.clone(true);
      const x = side * (6 + Math.random() * 4);
      placeObjectOnFloor(tree, new THREE.Vector3(x, FLOOR_Y_FIRST, z + (Math.random() - 0.5) * 3), {
        yaw: Math.random() * Math.PI * 2,
        targetHeight: 6 + Math.random() * 3
      });
      scene.add(tree);
      registerObstacleObject(tree, 0.1, 0.4);
    }
  }

  if (assets.sedan) {
    const car = assets.sedan.clone(true);
    placeObjectOnFloor(car, new THREE.Vector3(2.6, FLOOR_Y_FIRST, roadStartZ - 1.5), { yaw: Math.PI / 2 });
    scene.add(car);
    state.road.car = car;
    registerObstacleObject(car, 0.05, 0.05);
    const { width: carWidth, depth: carDepth, height: carHeight } = measureFootprint(car);
    registerInteractable({
      mesh: createInteractProxy(car.position.clone().add(new THREE.Vector3(0, carHeight / 2, 0)), { x: carWidth, y: carHeight, z: carDepth }),
      label: 'Open trunk',
      type: 'trunk',
      onInteract: () => openTrunk()
    });
    scene.add(state.interactables[state.interactables.length - 1].mesh);
  }

  if (assets.roadsideShelter) {
    const shelter = assets.roadsideShelter.clone(true);
    placeObjectOnFloor(shelter, new THREE.Vector3(-4, FLOOR_Y_FIRST, -40), { yaw: Math.PI / 6 });
    scene.add(shelter);
    registerObstacleObject(shelter, 0.05, 0.05);
    const { width: shelterW, depth: shelterD, height: shelterH } = measureFootprint(shelter);
    state.road.shelterArea.setFromCenterAndSize(
      shelter.position.clone().add(new THREE.Vector3(0, shelterH / 2, 0)),
      new THREE.Vector3(shelterW, shelterH, shelterD)
    );
  }

  if (assets.signpost) {
    const sign = assets.signpost.clone(true);
    placeObjectOnFloor(sign, new THREE.Vector3(5.5, FLOOR_Y_FIRST, -78), { yaw: -Math.PI / 8 });
    scene.add(sign);
    registerObstacleObject(sign, 0.08, 0.08);
  }

  if (assets.umbrella) {
    const stand = assets.umbrella.clone(true);
    placeObjectOnFloor(stand, new THREE.Vector3(1.4, FLOOR_Y_FIRST, roadStartZ - 2.5), { yaw: 0 });
    scene.add(stand);
    state.road.umbrellaStand = stand;
    const { width: umbW, depth: umbD, height: umbH } = measureFootprint(stand);
    registerInteractable({
      mesh: createInteractProxy(stand.position.clone().add(new THREE.Vector3(0, umbH / 2, 0)), { x: Math.max(umbW, 0.5), y: umbH, z: Math.max(umbD, 0.5) }),
      label: 'Take umbrella',
      type: 'umbrella',
      onInteract: () => takeUmbrella()
    });
    scene.add(state.interactables[state.interactables.length - 1].mesh);
  }

  // Simple barrier gate near the scripted road end.
  const barrierGeo = new THREE.BoxGeometry(6, 0.18, 0.18);
  const barrier = new THREE.Mesh(barrierGeo, getFallbackMaterial(0xb6471f));
  barrier.position.set(0, FLOOR_Y_FIRST + 1.0, state.road.roadEndZ + 6);
  barrier.castShadow = true;
  scene.add(barrier);
  state.road.gateBarrier = barrier;
  registerObstacleObject(barrier, 0.05, 0.05);

  const destMarker = new THREE.Object3D();
  destMarker.position.set(0, FLOOR_Y_FIRST, state.road.roadEndZ);
  scene.add(destMarker);
  state.road.destinationMarker = destMarker;

  state.zones.upstairsLanding.setFromCenterAndSize(
    new THREE.Vector3(-2.2, FLOOR_Y_SECOND + 1, 11.5),
    new THREE.Vector3(4, 3, 4)
  );
  state.zones.intruderCatch.setFromCenterAndSize(
    new THREE.Vector3(0, FLOOR_Y_FIRST + 1, -2),
    new THREE.Vector3(30, 4, 30)
  );
}

function buildCast(assets) {
  state.intruderEntity = spawnCastMember(assets.intruderAvatar, new THREE.Vector3(6, FLOOR_Y_FIRST, -10), {
    detectionRange: 9,
    attackRange: 1.8,
    speed: 1.6
  });
  state.liamEntity = spawnCastMember(assets.liamAvatar, new THREE.Vector3(3, FLOOR_Y_FIRST, 17), {
    detectionRange: 0,
    attackRange: 0,
    speed: 0
  });
  state.noraEntity = spawnCastMember(assets.noraAvatar, new THREE.Vector3(-3, FLOOR_Y_FIRST, 17), {
    detectionRange: 0,
    attackRange: 0,
    speed: 0
  });
}

function spawnCastMember(avatarAsset, position, options = {}) {
  const model = cloneAsset(avatarAsset);
  if (!model) return null;
  fitHeight(model, 1.82);
  model.rotation.y = CHARACTER_YAW_OFFSET;
  model.position.copy(position);
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  scene.add(model);

  const controller = new EnemyController(model);
  controller.setPlayer(player.root);
  controller.detectionRange = options.detectionRange ?? 8;
  controller.attackRange = options.attackRange ?? 2;
  controller.speed = options.speed ?? 2;
  controller.setCollisionTargets(state.colliderMeshes);
  controller.init({ skipAnimation: true }).catch(() => {});

  return { model, controller };
}

function buildCCTV(houseInfo) {
  if (!state.assets.cctv) return;
  const cam = state.assets.cctv.clone(true);

  // Mount high on a wall, at a real measured height, instead of floor level
  // (a floor-placed CCTV unit was the "walk-through" prop before — mounting
  // it on the wall both looks right and removes the floor-level pass-through).
  const mountZ = houseInfo?.frontZ ? houseInfo.frontZ - 0.4 : -8.5;
  const mountY = FLOOR_Y_FIRST + 2.6;
  cam.position.set(0, mountY, mountZ);
  cam.rotation.y = Math.PI;
  cam.updateMatrixWorld(true);
  scene.add(cam);
  state.cctv.feeds.push(cam);

  // Give it a real, snug collider (not a giant invisible box) sized from the
  // model's actual measured footprint so it blocks the camera/player properly
  // but doesn't feel like an oversized wall.
  const { width, depth, height } = measureFootprint(cam);
  registerObstacleObject(cam, 0.02, 0.02);
  return cam;
}

// ---- Endless procedural terrain ------------------------------------------
//
// Beyond the scripted road/house area (z < roadEndZ - bufferGap, or far off
// to either side), the world is generated on the fly in fixed-size chunks
// around the player and discarded once they're far enough away, giving a
// world that never runs out.

function createEndlessTerrain(assets) {
  return {
    chunks: new Map(),
    assets,
    lastChunkKey: null
  };
}

function chunkKeyFor(x, z) {
  const cx = Math.floor(x / CHUNK_SIZE);
  const cz = Math.floor(z / CHUNK_SIZE);
  return `${cx}:${cz}`;
}

function hash2D(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function isInsideScriptedArea(worldX, worldZ) {
  // Scripted estate + road occupy roughly x in [-16, 16], z in [roadEndZ-8, 28].
  return worldZ > state.road.roadEndZ - 8 && worldZ < 28 && Math.abs(worldX) < 16;
}

function chunkOverlapsScriptedArea(cx, cz) {
  const originX = cx * CHUNK_SIZE;
  const originZ = cz * CHUNK_SIZE;
  // Check all 4 corners plus center; if any fall inside the scripted zone, skip this chunk entirely.
  const points = [
    [originX, originZ],
    [originX + CHUNK_SIZE, originZ],
    [originX, originZ + CHUNK_SIZE],
    [originX + CHUNK_SIZE, originZ + CHUNK_SIZE],
    [originX + CHUNK_SIZE / 2, originZ + CHUNK_SIZE / 2]
  ];
  return points.some(([x, z]) => isInsideScriptedArea(x, z));
}

function generateChunk(cx, cz, terrain) {
  if (chunkOverlapsScriptedArea(cx, cz)) {
    // Empty placeholder group, no ground mesh, no colliders, nothing rendered
    // inside or near the hand-built house/road area.
    const empty = new THREE.Group();
    empty.userData.groundMesh = null;
    return empty;
  }

  const group = new THREE.Group();
  const originX = cx * CHUNK_SIZE;
  const originZ = cz * CHUNK_SIZE;

  const groundGeo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 1, 1);
  const groundMat = getFallbackMaterial(0x161c16);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(originX + CHUNK_SIZE / 2, FLOOR_Y_FIRST - 0.02, originZ + CHUNK_SIZE / 2);
  ground.receiveShadow = true;
  group.add(ground);
  group.userData.groundMesh = ground;

  const propCount = 10;
  for (let i = 0; i < propCount; i++) {
    const localX = hash2D(cx * 13.1 + i * 3.7, cz * 7.9) * CHUNK_SIZE;
    const localZ = hash2D(cx * 5.3, cz * 17.2 + i * 2.1) * CHUNK_SIZE;
    const worldX = originX + localX;
    const worldZ = originZ + localZ;

    if (isInsideScriptedArea(worldX, worldZ)) continue;

    const pick = hash2D(worldX, worldZ);
    const key = terrainAssetKeys[Math.floor(pick * terrainAssetKeys.length) % terrainAssetKeys.length];
    const source = terrain.assets[key];
    if (!source) continue;

    const prop = source.clone(true);
    const isTree = key.startsWith('tree');
    placeObjectOnFloor(prop, new THREE.Vector3(worldX, FLOOR_Y_FIRST, worldZ), {
      yaw: hash2D(worldX * 0.7, worldZ * 1.3) * Math.PI * 2,
      targetHeight: isTree ? 5 + hash2D(worldX, worldZ + 1) * 4 : undefined
    });
    if (!isTree) {
      const scale = 0.6 + hash2D(worldX + 1, worldZ) * 0.8;
      prop.scale.multiplyScalar(scale);
    }
    prop.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    group.add(prop);
  }

  scene.add(group);
  return group;
}

function updateEndlessTerrain() {
  const terrain = state.terrain;
  if (!terrain) return;

  const px = player.root.position.x;
  const pz = player.root.position.z;
  const key = chunkKeyFor(px, pz);

  if (key !== terrain.lastChunkKey) {
    terrain.lastChunkKey = key;

    const pcx = Math.floor(px / CHUNK_SIZE);
    const pcz = Math.floor(pz / CHUNK_SIZE);

    terrain.needed = new Set();
    for (let dx = -CHUNK_LOAD_RADIUS; dx <= CHUNK_LOAD_RADIUS; dx++) {
      for (let dz = -CHUNK_LOAD_RADIUS; dz <= CHUNK_LOAD_RADIUS; dz++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        const k = `${cx}:${cz}`;
        terrain.needed.add(k);
        if (!terrain.chunks.has(k) && !terrain.pending?.has(k)) {
          if (!terrain.pending) terrain.pending = new Set();
          terrain.pending.add(k);
        }
      }
    }

    // Unload chunks no longer needed immediately (cheap, no stutter).
    for (const [k, group] of terrain.chunks) {
      if (!terrain.needed.has(k)) {
        scene.remove(group);
        const groundMesh = group.userData.groundMesh;
        if (groundMesh) {
          const idx = state.colliderMeshes.indexOf(groundMesh);
          if (idx !== -1) state.colliderMeshes.splice(idx, 1);
        }
        group.traverse((child) => {
          if (child.isMesh) child.geometry?.dispose?.();
        });
        terrain.chunks.delete(k);
      }
    }
    if (terrain.pending) {
      for (const k of [...terrain.pending]) {
        if (!terrain.needed.has(k)) terrain.pending.delete(k);
      }
    }
  }

  // Spread generation across frames: build at most a couple chunks per frame.
  if (terrain.pending && terrain.pending.size > 0) {
    const CHUNKS_PER_FRAME = 2;
    let built = 0;
    for (const k of terrain.pending) {
      if (built >= CHUNKS_PER_FRAME) break;
      const [cx, cz] = k.split(':').map(Number);
      const group = generateChunk(cx, cz, terrain);
      terrain.chunks.set(k, group);
      if (group.userData.groundMesh) {
        addColliderMesh(group.userData.groundMesh);
        updateCollisionTargets();
        for (const entity of [state.intruderEntity, state.liamEntity, state.noraEntity]) {
          entity?.controller?.setCollisionTargets(state.colliderMeshes);
        }
      }
      terrain.pending.delete(k);
      built++;
    }
  }
}

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

function toggleWardrobeHide() {
  state.isHidden = !state.isHidden;
  if (state.isHidden) {
    showSubtitle('You climb into the wardrobe and hold still.', 2.5);
    state.canExitWardrobe = true;
  } else {
    showSubtitle('You ease the wardrobe door open.', 2);
  }
}

function exitThroughFrontDoor() {
  showSubtitle('The front door creaks open onto the storm.', 2.5);
  audio.playSFX(ASSET_URLS.audio.floorCreak, { volume: 0.6 });
  setObjective('Make it down the road before the lights die.');
}

function openTrunk() {
  if (state.road.trunkOpened) return;
  state.road.trunkOpened = true;
  showSubtitle('The trunk pops open. Empty, but the road is clearer now.', 2.5);
}

function takeUmbrella() {
  if (state.road.umbrellaTaken) return;
  state.road.umbrellaTaken = true;
  showSubtitle('You grab the umbrella from the stand.', 2);
}

function performInteraction() {
  if (!state.hoveredInteractable) return;
  state.hoveredInteractable.onInteract?.();
}

function toggleFlashlight() {
  state.flashlightOn = !state.flashlightOn;
  flashlight.visible = state.flashlightOn;
  flashlightStatusEl.textContent = `Flashlight: ${state.flashlightOn ? 'ON' : 'OFF'}`;
  audio.playSFX(ASSET_URLS.audio.lightSwitch, { volume: 0.5 });
}

function updateInteractionHover() {
  if (state.interactables.length === 0) {
    state.hoveredInteractable = null;
    hidePrompt();
    return;
  }

  const focusPos = getPlayerFocusPosition();
  let closest = null;
  let closestDist = Infinity;
  for (const entry of state.interactables) {
    const dist = entry.mesh.position.distanceTo(focusPos);
    if (dist < closestDist) {
      closestDist = dist;
      closest = entry;
    }
  }

  if (closest && closestDist < 2.4) {
    state.hoveredInteractable = closest;
    showPrompt(`Press E: ${closest.label}`);
  } else {
    state.hoveredInteractable = null;
    hidePrompt();
  }
}

// ---------------------------------------------------------------------------
// Camera follow
// ---------------------------------------------------------------------------

function updateFollowCamera(snap = false) {
  const focusPos = getPlayerFocusPosition();

  const yaw = state.lookYaw;
  const pitch = state.lookPitch;
  const dist = state.cameraDistance;

  const offset = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch)
  ).multiplyScalar(dist);

  tempVecA.copy(focusPos).add(offset);

  // Simple collision pull-in so the camera doesn't clip through walls.
  let safeDist = dist;
  for (const sample of CAMERA_COLLISION_SAMPLES) {
    tempVecB.copy(focusPos).add(sample);
    raycaster.set(tempVecB, offset.clone().normalize());
    raycaster.far = dist;
    const hits = raycaster.intersectObjects(state.colliderMeshes, false);
    if (hits.length > 0 && hits[0].distance < safeDist) {
      safeDist = Math.max(0.6, hits[0].distance - 0.2);
    }
  }

  tempVecC.copy(focusPos).add(offset.clone().setLength(safeDist));

  if (snap) {
    state.cameraCurrentPosition.copy(tempVecC);
    state.cameraCurrentTarget.copy(focusPos);
  } else {
    state.cameraCurrentPosition.lerp(tempVecC, 0.25);
    state.cameraCurrentTarget.lerp(focusPos, 0.35);
  }

  camera.position.copy(state.cameraCurrentPosition);
  camera.up.copy(CAMERA_UP);
  camera.lookAt(state.cameraCurrentTarget);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  if (!state.started || state.gameOver) {
    renderer.render(scene, camera);
    return;
  }

  if (!state.isHidden && !state.inputSuppressed) {
    player.controller.update(delta);
  }

  updateEndlessTerrain();
  updateInteractionHover();

  for (const entity of [state.intruderEntity, state.liamEntity, state.noraEntity]) {
    if (entity?.controller) entity.controller.update(delta);
  }

  for (const mixer of state.mixers) mixer.update(delta);

  updateFollowCamera(false);
  cameraEffects.update(delta);
  cameraEffects.applyShakeToCamera(camera);

  renderer.render(scene, camera);
}