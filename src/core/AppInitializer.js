/**
 * Application Lifecycle & Initializer Module (<150 lines)
 * Encapsulates environment checks, i18n setup, Three.js WebGL renderer pipeline,
 * lighting creation, spatial helpers, window resizing, and main process IPC listeners.
 */

import { soundManager } from './SoundManager.js';

export async function initializeApp(deps) {
  const {
    THREE,
    ipcRenderer,
    initI18n,
    physicsEngine,
    currentSettings,
    readSettingsFile,
    state,
    callbacks,
    onWindowResize
  } = deps;

  const container = document.getElementById('container');

  // Query if application is running in developer mode
  const isDevMode = ipcRenderer.sendSync('is-dev-mode');
  if (isDevMode) {
    document.body.classList.add('dev-mode');
  }

  // Load settings configuration file if it exists in assets/
  if (readSettingsFile) {
    state.hasSettingsFile = readSettingsFile();
  }

  // Configure Physics Engine
  if (physicsEngine) {
    physicsEngine.configure({
      enabled: currentSettings.enablePhysics,
      gravity: currentSettings.physicsGravity,
      restitution: currentSettings.physicsElasticity,
      enableFloor: currentSettings.physicsFloor
    });
  }

  // Initialize i18next multi-language framework
  if (initI18n) {
    await initI18n(currentSettings.language);
  }

  const settingsPanel = document.getElementById('settings-panel');
  if (settingsPanel && currentSettings.fontSizeScale) {
    settingsPanel.style.setProperty('--panel-font-scale', currentSettings.fontSizeScale);
  }
  if (typeof document !== 'undefined') {
    if (currentSettings.mascotChatFont) {
      document.documentElement.style.setProperty('--mascot-chat-font', currentSettings.mascotChatFont);
    }
    if (currentSettings.mascotChatFontSize) {
      document.documentElement.style.setProperty('--mascot-chat-font-size', `${currentSettings.mascotChatFontSize}px`);
    }
  }

  // 1. Create Scene
  const scene = new THREE.Scene();
  state.scene = scene;

  // 2. Create Camera
  const initialWidth = window.innerWidth || (container && container.clientWidth) || 350;
  const initialHeight = window.innerHeight || (container && container.clientHeight) || 350;
  const camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 100);
  camera.position.set(0, 0, 5.5);
  state.camera = camera;

  // 3. Create Renderer with full transparency and dynamic GPU power preference
  const powerPref = currentSettings && currentSettings.gpuLowPower ? 'low-power' : ((currentSettings && currentSettings.gpuOptimize) ? 'high-performance' : 'default');
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: powerPref });
  renderer.setSize(initialWidth, initialHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (container) container.appendChild(renderer.domElement);
  state.renderer = renderer;

  // 4. Add Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);
  state.ambientLight = ambientLight;

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
  keyLight.position.set(5, 8, 5);
  scene.add(keyLight);
  state.keyLight = keyLight;

  const fillLight = new THREE.PointLight(0xffb6c1, 0.6, 15);
  fillLight.position.set(-4, -2, 3);
  scene.add(fillLight);
  state.fillLight = fillLight;

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
  rimLight.position.set(0, 5, -5);
  scene.add(rimLight);
  state.rimLight = rimLight;

  // Spatial Helpers
  const axesHelper = new THREE.AxesHelper(1.5);
  scene.add(axesHelper);
  state.axesHelper = axesHelper;

  const gridHelper = new THREE.GridHelper(10, 10, 0x555555, 0x222222);
  gridHelper.position.y = -1.2;
  scene.add(gridHelper);
  state.gridHelper = gridHelper;

  // Setup Stage Lighting
  if (callbacks.updateXYZVisibility) callbacks.updateXYZVisibility();
  if (callbacks.updateStageLighting) callbacks.updateStageLighting();

  // Auto-detect custom asset or load procedural mascot
  if (callbacks.detectAndLoadAsset) callbacks.detectAndLoadAsset();

  // Hook Interaction & Dragging
  if (callbacks.setupInteraction) callbacks.setupInteraction();

  // Setup Settings UI panel listeners
  if (state.hasSettingsFile && callbacks.setupSettingsUI) {
    callbacks.setupSettingsUI();
    if (callbacks.updateGearPosition) callbacks.updateGearPosition();
  }

  // Initialize 3D Preview Generator
  if (callbacks.startBackgroundPreviewGenerator) callbacks.startBackgroundPreviewGenerator();

  // Initialize Sound Engine & Sync Active Atmosphere
  soundManager.syncAtmosphere(currentSettings);
  ['click', 'pointerdown', 'mousedown', 'keydown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, () => soundManager.resumeAudioContext(), { passive: true });
  });

  // Start Animation Loop
  if (callbacks.animate) callbacks.animate();

  if (state.wasConfigHealed) {
    ipcRenderer.send('log-diagnostic', '[Config Recovery] Default settings restored due to config file issue.');
  }

  if (onWindowResize) {
    window.addEventListener('resize', onWindowResize);
  }

  // IPC Event Listeners
  ipcRenderer.on('steam-overlay-active', (event, active) => {
    if (active) {
      document.body.classList.add('steam-overlay-active');
    } else {
      document.body.classList.remove('steam-overlay-active');
    }
  });

  ipcRenderer.on('force-hover-exit', () => {
    if (state.getIsMouseOverCharacter && state.getIsMouseOverCharacter()) {
      if (state.setIsMouseOverCharacter) state.setIsMouseOverCharacter(false);
      document.body.style.cursor = 'default';
      if (callbacks.updateIgnoreMouseState) callbacks.updateIgnoreMouseState();
    }
  });
}
