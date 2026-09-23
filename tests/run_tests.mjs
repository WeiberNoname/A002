import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PhysicsEngine } from '../physicsEngine.js';
import { SettingsManager } from '../src/managers/SettingsManager.js';
import { AppStore } from '../src/managers/AppStore.js';
import { EventBus, eventBus } from '../src/managers/EventBus.js';
import { disposeHierarchy, disposeMaterial, disposeMixer, disposeRenderer } from '../src/core/GPUAssetManager.js';

import { AssetRegistryManager } from '../src/managers/AssetRegistryManager.js';
import { SceneStageManager } from '../src/core/SceneStageManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { globalTestReporter } from './TestReporter.mjs';

console.log('🧪 Starting Automated Unit Test Suite (Plan 001)...');

// 1. Test SettingsManager
console.log('▶ Testing SettingsManager defaults & fallback merging...');
const defaults = SettingsManager.getDefaultSettings();
assert.strictEqual(defaults.width, 350, 'Default width should be 350');
assert.strictEqual(defaults.height, 350, 'Default height should be 350');
assert.strictEqual(defaults.targetFps, 60, 'Default targetFps should be 60');
assert.strictEqual(defaults.language, 'en', 'Default language should be en');
assert.strictEqual(defaults.activeModel, 'procedural', 'Default activeModel should be procedural');
assert.strictEqual(defaults.sakuraRain, false, 'Default sakuraRain should be false');
assert.strictEqual(defaults.snowFall, false, 'Default snowFall should be false');
assert.strictEqual(defaults.dynamicBatterySaver, false, 'Default dynamicBatterySaver should be false');
assert.strictEqual(defaults.screenVisionAutoLoop, false, 'Default screenVisionAutoLoop should be false');
assert.strictEqual(defaults.screenVisionModel, 'moondream', 'Default screenVisionModel should be moondream');
assert.strictEqual(defaults.screenVisionDetail, 'medium', 'Default screenVisionDetail should be medium');
assert.strictEqual(defaults.screenVisionPostChat, true, 'Default screenVisionPostChat should be true');
assert.strictEqual(defaults.liveCaptionMirrorVision, true, 'Default liveCaptionMirrorVision should be true');
assert.strictEqual(defaults.liveCaptionAutoOpen, false, 'Default liveCaptionAutoOpen should be false');
assert.strictEqual(defaults.liveCaptionClickThrough, false, 'Default liveCaptionClickThrough should be false');
assert.strictEqual(defaults.liveCaptionBgColor, '#0b0f19', 'Default liveCaptionBgColor should be #0b0f19');
assert.strictEqual(defaults.liveCaptionBgOpacity, 0.90, 'Default liveCaptionBgOpacity should be 0.90');
assert.strictEqual(defaults.liveCaptionFontColor, '#ffffff', 'Default liveCaptionFontColor should be #ffffff');
assert.strictEqual(defaults.liveCaptionFontSize, 16, 'Default liveCaptionFontSize should be 16');
assert.strictEqual(defaults.bannerAutoOpen, false, 'Default bannerAutoOpen should be false');
assert.strictEqual(defaults.bannerClickThrough, false, 'Default bannerClickThrough should be false');
assert.strictEqual(defaults.bannerBgColor, '#0b0f19', 'Default bannerBgColor should be #0b0f19');
assert.strictEqual(defaults.bannerBgOpacity, 0.85, 'Default bannerBgOpacity should be 0.85');
assert.strictEqual(defaults.bannerImagePath, '', 'Default bannerImagePath should be empty');
assert.strictEqual(defaults.bannerLinkUrl, '', 'Default bannerLinkUrl should be empty');
assert.deepStrictEqual(defaults.bannerPlaylist, [], 'Default bannerPlaylist should be empty array');
assert.strictEqual(defaults.bannerDuration, 5, 'Default bannerDuration should be 5');
assert.strictEqual(defaults.bannerTransition, 'fade', 'Default bannerTransition should be fade');
assert.strictEqual(defaults.bannerAutoPlay, true, 'Default bannerAutoPlay should be true');
assert.strictEqual(defaults.aiPersonaPreset, 'supportive', 'Default aiPersonaPreset should be supportive');
assert.ok(defaults.aiPersonaPrompt.includes('companion'), 'Default aiPersonaPrompt should contain companion');
assert.strictEqual(defaults.aiResponseLanguage, 'auto', 'Default aiResponseLanguage should be auto');
assert.strictEqual(defaults.aiReplyStylePreset, 'default', 'Default aiReplyStylePreset should be default');
assert.strictEqual(defaults.aiCustomStylePrompt, '', 'Default aiCustomStylePrompt should be empty');
assert.strictEqual(defaults.aiPreferredWords, '', 'Default aiPreferredWords should be empty');
assert.strictEqual(defaults.synthVisionModel, 'moondream', 'Default synthVisionModel should be moondream');
assert.strictEqual(defaults.synthVisionDetail, 'medium', 'Default synthVisionDetail should be medium');
assert.strictEqual(defaults.synthTextModel, 'llama3.2', 'Default synthTextModel should be llama3.2');
assert.strictEqual(defaults.synthStyle, 'streamer', 'Default synthStyle should be streamer');
assert.strictEqual(defaults.synthCaptionCount, 3, 'Default synthCaptionCount should be 3');
assert.strictEqual(defaults.synthCaptionPacing, 3.0, 'Default synthCaptionPacing should be 3.0');
assert.strictEqual(defaults.synthAutoLoop, false, 'Default synthAutoLoop should be false');
assert.strictEqual(defaults.synthAutoInterval, 15, 'Default synthAutoInterval should be 15');
assert.strictEqual(defaults.synthAutoPlayHUD, true, 'Default synthAutoPlayHUD should be true');
assert.strictEqual(defaults.synthLanguage, 'auto', 'Default synthLanguage should be auto');
assert.strictEqual(defaults.mascotChatFont, 'inherit', 'Default mascotChatFont should be inherit');
assert.strictEqual(defaults.mascotChatFontSize, 14, 'Default mascotChatFontSize should be 14');

const merged = SettingsManager.mergeWithDefaults({
  scale: 2.5,
  targetFps: 120,
  customKey: 'test',
  mascotChatFont: "'Comic Sans MS', cursive",
  mascotChatFontSize: 18,
  snowFall: true,
  screenVisionAutoLoop: true,
  screenVisionInterval: 15,
  screenVisionModel: 'moondream',
  screenVisionPostChat: true,
  liveCaptionClickThrough: true,
  liveCaptionBgColor: '#1e1035',
  liveCaptionBgOpacity: 0.50,
  liveCaptionFontColor: '#38bdf8',
  liveCaptionFontSize: 20,
  bannerAutoOpen: true,
  bannerClickThrough: true,
  bannerBgColor: '#18181b',
  bannerBgOpacity: 0.60,
  bannerImagePath: 'sample.png',
  bannerLinkUrl: 'https://store.steampowered.com',
  bannerPlaylist: [{ id: 'ad1', imagePath: 'sample.png', linkUrl: 'https://store.steampowered.com', name: 'Test Ad' }],
  bannerDuration: 8,
  bannerTransition: 'slide-left',
  bannerAutoPlay: false,
  aiResponseLanguage: 'zh-TW',
  aiReplyStylePreset: 'captain_like',
  aiCustomStylePrompt: 'Speak like an admiral',
  aiPreferredWords: 'Aye aye, matey'
});
assert.strictEqual(merged.scale, 2.5, 'Scale should be overridden to 2.5');
assert.strictEqual(merged.targetFps, 120, 'targetFps should be overridden to 120');
assert.strictEqual(merged.mascotChatFont, "'Comic Sans MS', cursive", 'mascotChatFont should be overridden');
assert.strictEqual(merged.mascotChatFontSize, 18, 'mascotChatFontSize should be overridden to 18');
assert.strictEqual(merged.aiResponseLanguage, 'zh-TW', 'aiResponseLanguage should be overridden to zh-TW');
assert.strictEqual(merged.aiReplyStylePreset, 'captain_like', 'aiReplyStylePreset should be overridden to captain_like');
assert.strictEqual(merged.aiCustomStylePrompt, 'Speak like an admiral', 'aiCustomStylePrompt should be overridden');
assert.strictEqual(merged.aiPreferredWords, 'Aye aye, matey', 'aiPreferredWords should be overridden');
assert.strictEqual(merged.snowFall, true, 'snowFall should be overridden to true');
assert.strictEqual(merged.screenVisionAutoLoop, true, 'screenVisionAutoLoop should be overridden to true');
assert.strictEqual(merged.screenVisionInterval, 15, 'screenVisionInterval should be overridden to 15');
assert.strictEqual(merged.screenVisionModel, 'moondream', 'screenVisionModel should be overridden to moondream');
assert.strictEqual(merged.screenVisionPostChat, true, 'screenVisionPostChat should be overridden to true');
assert.strictEqual(merged.liveCaptionClickThrough, true, 'liveCaptionClickThrough should be overridden to true');
assert.strictEqual(merged.liveCaptionBgColor, '#1e1035', 'liveCaptionBgColor should be overridden to #1e1035');
assert.strictEqual(merged.liveCaptionBgOpacity, 0.50, 'liveCaptionBgOpacity should be overridden to 0.50');
assert.strictEqual(merged.liveCaptionFontColor, '#38bdf8', 'liveCaptionFontColor should be overridden to #38bdf8');
assert.strictEqual(merged.liveCaptionFontSize, 20, 'liveCaptionFontSize should be overridden to 20');
assert.strictEqual(merged.bannerAutoOpen, true, 'bannerAutoOpen should be overridden to true');
assert.strictEqual(merged.bannerClickThrough, true, 'bannerClickThrough should be overridden to true');
assert.strictEqual(merged.bannerBgColor, '#18181b', 'bannerBgColor should be overridden to #18181b');
assert.strictEqual(merged.bannerBgOpacity, 0.60, 'bannerBgOpacity should be overridden to 0.60');
assert.strictEqual(merged.bannerImagePath, 'sample.png', 'bannerImagePath should be overridden to sample.png');
assert.strictEqual(merged.bannerLinkUrl, 'https://store.steampowered.com', 'bannerLinkUrl should be overridden to steam URL');
assert.strictEqual(merged.bannerPlaylist.length, 1, 'bannerPlaylist should have 1 item');
assert.strictEqual(merged.bannerDuration, 8, 'bannerDuration should be overridden to 8');
assert.strictEqual(merged.bannerTransition, 'slide-left', 'bannerTransition should be overridden to slide-left');
assert.strictEqual(merged.bannerAutoPlay, false, 'bannerAutoPlay should be overridden to false');
assert.strictEqual(merged.width, 350, 'Unspecified width should fallback to 350');
assert.strictEqual(merged.activeModel, 'procedural', 'Fallback activeModel should be procedural');
console.log('✅ SettingsManager tests PASSED.');

// 2. Test PhysicsEngine
console.log('▶ Testing PhysicsEngine velocity & boundary collision calculations...');
const engine = new PhysicsEngine();
engine.configure({ enabled: true, gravity: 9.8, floorY: -1.2 });
assert.strictEqual(engine.enabled, true, 'Physics engine should be enabled');
assert.strictEqual(engine.gravity, 9.8, 'Gravity should be 9.8');

engine.applyImpulse({ x: 1.0, y: 5.0, z: 0 });
assert.strictEqual(engine.velocity.x, 1.0, 'Impulse X should equal 1.0');
assert.strictEqual(engine.velocity.y, 5.0, 'Impulse Y should equal 5.0');

engine.reset();
assert.strictEqual(engine.position.x, 0, 'Reset position X should be 0');
assert.strictEqual(engine.position.y, 0, 'Reset position Y should be 0');
assert.strictEqual(engine.velocity.y, 0, 'Reset velocity Y should be 0');
console.log('✅ PhysicsEngine tests PASSED.');

// 3. Test 12-Locale Key Parity & default_mascot key
console.log('▶ Testing 12-Locale Key Parity & default_mascot translations...');
const localesDir = path.join(__dirname, '..', 'locales');
const supportedLangs = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'fr', 'de', 'es', 'es-419', 'it', 'pt-BR', 'ru'];

supportedLangs.forEach(lang => {
  const filePath = path.join(localesDir, lang, 'translation.json');
  assert.strictEqual(fs.existsSync(filePath), true, `Translation file for ${lang} must exist`);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  assert.strictEqual(typeof content.default_mascot, 'string', `${lang} must contain default_mascot translation`);
  assert.strictEqual(content.default_mascot.length > 0, true, `${lang} default_mascot must not be empty`);
  assert.strictEqual(typeof content.snow_fall, 'string', `${lang} must contain snow_fall translation`);
  assert.strictEqual(content.snow_fall.length > 0, true, `${lang} snow_fall must not be empty`);
  assert.strictEqual(typeof content.mascot_chat_font, 'string', `${lang} must contain mascot_chat_font translation`);
  assert.strictEqual(content.mascot_chat_font.length > 0, true, `${lang} mascot_chat_font must not be empty`);
  assert.strictEqual(typeof content.mascot_chat_font_size, 'string', `${lang} must contain mascot_chat_font_size translation`);
  assert.strictEqual(content.mascot_chat_font_size.length > 0, true, `${lang} mascot_chat_font_size must not be empty`);
});
console.log('✅ 12-Locale Key Parity tests PASSED.');

// 4. Test AppStore Reactive Proxy & Subscriptions
console.log('▶ Testing AppStore reactive state & subscriber notifications...');
const store = new AppStore();
assert.strictEqual(store.state.isDragging, false, 'Default isDragging should be false');
assert.strictEqual(store.state.isSettingsOpen, false, 'Default isSettingsOpen should be false');

let notifiedVal = null;
const unsubscribe = store.subscribe('isDragging', (newVal) => {
  notifiedVal = newVal;
});

store.state.isDragging = true;
assert.strictEqual(store.state.isDragging, true, 'Direct write to store.state.isDragging should update');
assert.strictEqual(notifiedVal, true, 'Subscriber should be notified of state update');

unsubscribe();
store.state.isDragging = false;
assert.strictEqual(notifiedVal, true, 'Unsubscribed listener should not receive updates');

store.set({ cameraPitch: 0.5, cameraYaw: 1.2 });
assert.strictEqual(store.state.cameraPitch, 0.5, 'Batch set should update cameraPitch');
assert.strictEqual(store.state.cameraYaw, 1.2, 'Batch set should update cameraYaw');
console.log('✅ AppStore reactive tests PASSED.');

// 4.1 Test EventBus & Reactive Settings
console.log('▶ Testing EventBus channels, wildcards, and Reactive Settings Proxy...');
let eventPayload = null;
let wildcardEvent = null;
let onceCount = 0;

const offBus = eventBus.on('test:event', (payload) => {
  eventPayload = payload;
});
eventBus.on('test:*', (data) => {
  wildcardEvent = data.event;
});
eventBus.once('test:once', () => {
  onceCount++;
});

eventBus.emit('test:event', { foo: 'bar' });
assert.deepStrictEqual(eventPayload, { foo: 'bar' }, 'EventBus should dispatch payload to exact channel');
assert.strictEqual(wildcardEvent, 'test:event', 'EventBus should dispatch to wildcard channel');

eventBus.emit('test:once');
eventBus.emit('test:once');
assert.strictEqual(onceCount, 1, 'once() listeners must only fire a single time');

offBus();
eventBus.emit('test:event', { foo: 'updated' });
assert.deepStrictEqual(eventPayload, { foo: 'bar' }, 'Unsubscribed EventBus listener must not receive further events');

// Test SettingsManager.createReactiveSettings
let savedSettingsPayload = null;
const reactiveSettings = SettingsManager.createReactiveSettings({ activeModel: 'procedural' }, (saved) => {
  savedSettingsPayload = saved;
});

let reactiveEventPayload = null;
eventBus.on('settings:activeModel', (newVal) => {
  reactiveEventPayload = newVal;
});

reactiveSettings.activeModel = 'flag';
assert.strictEqual(reactiveSettings.activeModel, 'flag', 'Reactive settings property should mutate');
assert.strictEqual(reactiveEventPayload, 'flag', 'Mutating reactive settings should emit typed EventBus event');
console.log('✅ EventBus & Reactive Settings tests PASSED.');

// 5. Test GPUAssetManager Recursive Disposal
console.log('▶ Testing GPUAssetManager recursive VRAM & texture disposal...');
let geomDisposed = false;
let matDisposed = false;
let texDisposed = false;
let normDisposed = false;
let roughDisposed = false;
let mixerStopped = false;
let mixerUncached = false;
let rendererDisposed = false;
let contextLost = false;

const mockTexture = {
  isTexture: true,
  dispose: () => { texDisposed = true; }
};
const mockNormalTexture = {
  isTexture: true,
  dispose: () => { normDisposed = true; }
};
const mockRoughTexture = {
  isTexture: true,
  dispose: () => { roughDisposed = true; }
};

const mockMaterial = {
  map: mockTexture,
  normalMap: mockNormalTexture,
  roughnessMap: mockRoughTexture,
  dispose: () => { matDisposed = true; }
};

const mockGeometry = {
  dispose: () => { geomDisposed = true; }
};

const mockHierarchy = {
  children: [{ isChild: true }],
  traverse: (cb) => {
    cb({
      geometry: mockGeometry,
      material: mockMaterial
    });
  },
  remove: function(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) this.children.splice(idx, 1);
  }
};

disposeHierarchy(mockHierarchy);
assert.strictEqual(geomDisposed, true, 'Geometry must be disposed');
assert.strictEqual(matDisposed, true, 'Material must be disposed');
assert.strictEqual(texDisposed, true, 'Attached diffuse map must be disposed');
assert.strictEqual(normDisposed, true, 'Attached normal map must be disposed');
assert.strictEqual(roughDisposed, true, 'Attached roughness map must be disposed');
assert.strictEqual(mockHierarchy.children.length, 0, 'Children array must be cleared');

const mockMixer = {
  stopAllAction: () => { mixerStopped = true; },
  uncacheRoot: (root) => { if (root) mixerUncached = true; }
};
disposeMixer(mockMixer, mockHierarchy);
assert.strictEqual(mixerStopped, true, 'Mixer actions must be stopped');
assert.strictEqual(mixerUncached, true, 'Mixer root must be uncached');

const mockRenderer = {
  renderLists: { dispose: () => {} },
  dispose: () => { rendererDisposed = true; },
  forceContextLoss: () => { contextLost = true; }
};
disposeRenderer(mockRenderer);
assert.strictEqual(rendererDisposed, true, 'Renderer must be disposed');
assert.strictEqual(contextLost, true, 'Context loss must be forced');
console.log('✅ GPUAssetManager tests PASSED.');

// 6. Test Electron Security Bridge & Preload Configuration
console.log('▶ Testing Preload Script & Security Isolation configuration...');
const preloadPath = path.join(__dirname, '..', 'preload.js');
assert.strictEqual(fs.existsSync(preloadPath), true, 'preload.js must exist in app root');
const preloadContent = fs.readFileSync(preloadPath, 'utf8');
assert.strictEqual(preloadContent.includes('contextBridge.exposeInMainWorld'), true, 'preload.js must use contextBridge');
assert.strictEqual(preloadContent.includes('electronAPI'), true, 'preload.js must expose electronAPI');
assert.strictEqual(preloadContent.includes('fsBridge'), true, 'preload.js must expose fsBridge');
assert.strictEqual(preloadContent.includes('pathBridge'), true, 'preload.js must expose pathBridge');
assert.strictEqual(preloadContent.includes('urlBridge'), true, 'preload.js must expose urlBridge');
assert.strictEqual(preloadContent.includes('agentBridge'), true, 'preload.js must expose agentBridge');
assert.strictEqual(preloadContent.includes("'open-external-url'"), true, 'preload.js must whitelist open-external-url');
assert.strictEqual(preloadContent.includes("'set-ignore-mouse'"), true, 'preload.js must whitelist set-ignore-mouse');
assert.strictEqual(preloadContent.includes("'broadcast-caption-style'"), false, 'preload.js must not expose deprecated caption channels');
assert.strictEqual(preloadContent.includes("'open-banner-window'"), false, 'preload.js must not expose deprecated banner channels');

const mainPath = path.join(__dirname, '..', 'main.js');
const mainContent = fs.readFileSync(mainPath, 'utf8');
assert.strictEqual(mainContent.includes('contextIsolation: true'), true, 'main.js must enable contextIsolation: true');
assert.strictEqual(mainContent.includes('nodeIntegration: false'), true, 'main.js must set nodeIntegration: false');
assert.strictEqual(mainContent.includes("preload: path.join(__dirname, 'preload.js')"), true, 'main.js must load preload.js');
assert.strictEqual(mainContent.includes('startSteamRepaintLoop()'), true, 'main.js must dynamically start Steam repaint loop');
assert.strictEqual(mainContent.includes('stopSteamRepaintLoop()'), true, 'main.js must dynamically stop Steam repaint loop');
assert.strictEqual(mainContent.includes("ipcMain.on('open-external-url'"), true, 'main.js must handle open-external-url');
assert.strictEqual(mainContent.includes("ipcMain.handle('agent:execute-command'"), true, 'main.js must handle agent:execute-command');
assert.strictEqual(mainContent.includes("ipcMain.handle('agent:write-file'"), true, 'main.js must handle agent:write-file');
assert.strictEqual(mainContent.includes("ipcMain.on('open-banner-window'"), false, 'main.js must not handle deprecated banner window');
console.log('✅ Electron Security Bridge & Idle Optimization tests PASSED.');

// 7. Test SoundManager State, Volume Normalization & Snapshot
console.log('▶ Testing SoundManager volume clamping & state snapshot...');
import('../src/core/SoundManager.js').then(({ SoundManager }) => {
  const sm = new SoundManager();
  assert.strictEqual(sm.isMuted, false, 'Default isMuted should be false');
  assert.strictEqual(sm.masterVolume, 0.8, 'Default masterVolume should be 0.8');
  assert.strictEqual(sm.isPlaying('snow'), false, 'Default snow playing should be false');
  assert.strictEqual(sm.isPlaying('sakura'), false, 'Default sakura playing should be false');
  assert.strictEqual(sm.isPlaying('drum'), false, 'Default drum playing should be false');

  // Test volume clamping
  sm.setMasterVolume(1.5);
  assert.strictEqual(sm.masterVolume, 1.0, 'Master volume should clamp to 1.0');
  sm.setMasterVolume(-0.5);
  assert.strictEqual(sm.masterVolume, 0.0, 'Master volume should clamp to 0.0');

  sm.setTrackVolume('snow', 0.85);
  assert.strictEqual(sm.tracks.snow.volume, 0.85, 'Track snow volume should be 0.85');
  sm.setTrackVolume('sakura', 0.65);
  assert.strictEqual(sm.tracks.sakura.volume, 0.65, 'Track sakura volume should be 0.65');
  sm.setTrackVolume('drum', 0.95);
  assert.strictEqual(sm.tracks.drum.volume, 0.95, 'Track drum volume should be 0.95');

  const snap = sm.getSnapshot();
  assert.strictEqual(snap.snowVolume, 0.85, 'Snapshot snowVolume should be 0.85');
  assert.strictEqual(snap.sakuraVolume, 0.65, 'Snapshot sakuraVolume should be 0.65');
  assert.strictEqual(snap.drumVolume, 0.95, 'Snapshot drumVolume should be 0.95');

  // Test syncAtmosphere
  sm.syncAtmosphere({
    soundMuted: true,
    soundMasterVolume: 0.5,
    soundSnowVolume: 0.4,
    soundSakuraVolume: 0.9,
    sakuraRain: true,
    soundSakuraSync: true
  });
  assert.strictEqual(sm.isMuted, true, 'syncAtmosphere should set isMuted');
  assert.strictEqual(sm.masterVolume, 0.5, 'syncAtmosphere should set masterVolume');
  assert.strictEqual(sm.tracks.snow.volume, 0.4, 'syncAtmosphere should set snow track volume');
  assert.strictEqual(sm.tracks.sakura.volume, 0.9, 'syncAtmosphere should set sakura track volume');

  console.log('✅ SoundManager unit tests PASSED.');

  // Test 8: SceneStageManager & Model Fallback Resilience
  console.log('▶ Testing SceneStageManager & model fallback resilience...');
  {
    let proceduralLoaded = false;
    let humanoidLoaded = false;
    const mockManager = new SceneStageManager({
      THREE: {
        Group: class { constructor() { this.children = []; this.userData = {}; } add(c) { this.children.push(c); } remove() {} }
      },
      currentSettings: { activeModel: 'flag' },
      stateAccessors: {
        getCharacterGroup: () => null,
        setCharacterGroup: () => {},
        getInnerModelGroup: () => null,
        setInnerModelGroup: () => {},
        getCollisionProxy: () => null,
        setCollisionProxy: () => {}
      },
      callbacks: {
        createMascot: () => { proceduralLoaded = true; },
        generateModelPreview: () => {}
      }
    });

    // Test legacy flag fallback to procedural
    mockManager.detectAndLoadAsset();
    assert.strictEqual(proceduralLoaded, true, 'Legacy flag model preference should safely fall back to procedural mascot');

    // Test humanoid routing
    mockManager.currentSettings.activeModel = 'humanoid';
    mockManager.loadHumanoidModel = () => { humanoidLoaded = true; };
    mockManager.detectAndLoadAsset();
    assert.strictEqual(humanoidLoaded, true, 'Humanoid preference should invoke loadHumanoidModel');

    console.log('✅ SceneStageManager & model fallback resilience tests PASSED.');
  }

    // Test 9: SettingsManager with Texture & Flag Keys
    console.log('▶ Testing SettingsManager texture & flag key defaults and serialization...');
    const defaults = SettingsManager.getDefaultSettings();
    assert.strictEqual(defaults.customTexturePath, '', 'Default customTexturePath should be empty');
    assert.strictEqual(defaults.flagWindSpeed, 3.5, 'Default flagWindSpeed should be 3.5');
    assert.strictEqual(defaults.flagWaveIntensity, 0.35, 'Default flagWaveIntensity should be 0.35');
    assert.strictEqual(defaults.textureRepeatX, 1.0, 'Default textureRepeatX should be 1.0');
    assert.strictEqual(defaults.textureRepeatY, 1.0, 'Default textureRepeatY should be 1.0');
    assert.strictEqual(defaults.textureRoughness, 0.50, 'Default textureRoughness should be 0.50');
    assert.strictEqual(defaults.textureMetalness, 0.05, 'Default textureMetalness should be 0.05');
    assert.strictEqual(defaults.flagPreset, 'default', 'Default flagPreset should be default');

    console.log('✅ SettingsManager texture configuration unit tests PASSED.');

    // Test 10: LLMDirectorEngine AI Companion Dialogue & Conversational Engine
    console.log('▶ Testing LLMDirectorEngine companion conversations, persona customization & safety guardrails...');
    import('../src/core/LLMDirectorEngine.js').then(({ LLMDirectorEngine }) => {
      const mockSettings = { scale: 1.0, bobbing: false, spinY: false, speedY: 1.0, sakuraRain: false, enablePhysics: false };
      let saved = false;
      let spokenBubble = '';
      const engine = new LLMDirectorEngine({
        currentSettings: mockSettings,
        saveSettingsFile: () => { saved = true; },
        showSpeechBubble: (msg) => { spokenBubble = msg; }
      });

      // 1. Persona Prompt Resolution & Character Immersion (No forced desktop companion boilerplate)
      assert.ok(engine.getPersonaPrompt().includes('Director'), 'Default persona prompt must mention Director');
      const customEngine = new LLMDirectorEngine({
        currentSettings: { ...mockSettings, aiPersonaPrompt: 'You are a feisty tsundere character.' }
      });
      assert.strictEqual(customEngine.getPersonaPrompt(), 'You are a feisty tsundere character.');
      assert.ok(customEngine.buildSystemPrompt().includes('tsundere'), 'System prompt must contain custom persona');

      // Test concise character prompt (e.g. user just inputs "Batman")
      const batmanEngine = new LLMDirectorEngine({
        currentSettings: { ...mockSettings, aiPersonaPrompt: 'Batman' }
      });
      const batmanSysPrompt = batmanEngine.buildSystemPrompt();
      assert.ok(batmanSysPrompt.includes('You are Batman'), 'Should expand concise prompt to pure character immersion');
      assert.ok(!batmanSysPrompt.includes('your desktop companion'), 'Must NOT force "your desktop companion" background text');
      assert.ok(!batmanSysPrompt.includes('living on the user\'s desktop alongside their 3D mascot'), 'Must NOT force mascot assistant boilerplate');

      // Test dynamic persona switching & context reset via setPersona
      const switchResult = engine.setPersona('a shy boy riding on a bike', 'custom');
      assert.strictEqual(switchResult.preset, 'custom');
      assert.strictEqual(switchResult.displayName, 'a shy boy riding on a bike');
      assert.strictEqual(engine.conversationHistory.length, 1, 'setPersona must reset conversation history to fresh system prompt');
      assert.ok(engine.buildSystemPrompt().includes('a shy boy riding on a bike'), 'System prompt must contain updated persona');

      // Test display name resolution across presets
      engine.setPersona('', 'tsundere');
      assert.strictEqual(engine.getPersonaDisplayName(), 'Tsundere Partner');
      engine.setPersona('', 'maid');
      assert.strictEqual(engine.getPersonaDisplayName(), 'Devoted Maid / Butler');

      // Test prompt leakage sanitizer (Strip "Okay, I'm a shy boy, the wind is strong...")
      const leakedSample = "Okay, I'm a shy boy, the wind is strong, and the bike is moving fast ... U-um... h-hello!";
      const sanitizedOutput = engine._sanitizePersonaLeakage(leakedSample);
      assert.strictEqual(sanitizedOutput, "U-um... h-hello!", 'Sanitizer must strip meta-acknowledgment and prompt echo');

      const leakedPrefix2 = "Sure, as a shy boy on a bike: What do you want to know?";
      const sanitized2 = engine._sanitizePersonaLeakage(leakedPrefix2);
      assert.strictEqual(sanitized2, "What do you want to know?", 'Sanitizer must strip single-line meta prefix');

      // Test in-character greeting generation
      engine.setPersona('a shy boy riding on a bike', 'custom');
      engine.generatePersonaGreeting().then((greeting) => {
        assert.ok(greeting.length > 0, 'Greeting must not be empty');
        assert.ok(!greeting.startsWith('Okay'), 'Greeting must not start with meta acknowledgment');
        assert.ok(!greeting.includes('your desktop companion'), 'Greeting must not contain companion boilerplate');
      });

      // 1.1 Multi-Language Support Tests
      import('../src/core/LLMDirectorEngine.js').then(({ REPLY_STYLES, LANGUAGE_DIRECTIVES }) => {
        assert.ok(LANGUAGE_DIRECTIVES.auto, 'Must define auto language directive');
        assert.ok(LANGUAGE_DIRECTIVES.en, 'Must define en language directive');
        assert.ok(LANGUAGE_DIRECTIVES['zh-TW'], 'Must define zh-TW language directive');
        assert.ok(LANGUAGE_DIRECTIVES['zh-CN'], 'Must define zh-CN language directive');
        assert.ok(LANGUAGE_DIRECTIVES.ja, 'Must define ja language directive');
        assert.ok(LANGUAGE_DIRECTIVES.ko, 'Must define ko language directive');
        assert.ok(LANGUAGE_DIRECTIVES.es, 'Must define es language directive');
        assert.ok(LANGUAGE_DIRECTIVES.fr, 'Must define fr language directive');
        assert.ok(LANGUAGE_DIRECTIVES.de, 'Must define de language directive');

        // Test language directive injection into system prompt
        engine.setResponseLanguage('zh-TW');
        assert.ok(engine.buildSystemPrompt().includes('Traditional Chinese'), 'System prompt must include Traditional Chinese directive');

        engine.setResponseLanguage('ja');
        assert.ok(engine.buildSystemPrompt().includes('Japanese'), 'System prompt must include Japanese directive');

        engine.setResponseLanguage('auto');
        assert.ok(engine.buildSystemPrompt().includes('Detect the language'), 'System prompt must include auto-detect directive');

        // 1.2 Customized Reply Styles Tests (short, brave, direct, patient, crazy, cool, captain_like)
        assert.ok(REPLY_STYLES.short.includes('minimal in word count'), 'Must define short style');
        assert.ok(REPLY_STYLES.brave.includes('courage'), 'Must define brave style');
        assert.ok(REPLY_STYLES.direct.includes('direct'), 'Must define direct style');
        assert.ok(REPLY_STYLES.patient.includes('patience'), 'Must define patient style');
        assert.ok(REPLY_STYLES.crazy.includes('chaotic') || REPLY_STYLES.crazy.includes('eccentric'), 'Must define crazy style');
        assert.ok(REPLY_STYLES.cool.includes('suave') || REPLY_STYLES.cool.includes('confidence'), 'Must define cool style');
        assert.ok(REPLY_STYLES.captain_like.includes('Captain'), 'Must define captain_like style');

        // Test style directive injection into system prompt
        engine.setReplyStyle('short');
        assert.ok(engine.buildSystemPrompt().includes('minimal in word count'), 'System prompt must include short style');

        engine.setReplyStyle('brave');
        assert.ok(engine.buildSystemPrompt().includes('courage'), 'System prompt must include brave style');

        engine.setReplyStyle('direct');
        assert.ok(engine.buildSystemPrompt().includes('direct, blunt'), 'System prompt must include direct style');

        engine.setReplyStyle('patient');
        assert.ok(engine.buildSystemPrompt().includes('patience'), 'System prompt must include patient style');

        engine.setReplyStyle('crazy');
        assert.ok(engine.buildSystemPrompt().includes('eccentric'), 'System prompt must include crazy style');

        engine.setReplyStyle('cool');
        assert.ok(engine.buildSystemPrompt().includes('effortless confidence'), 'System prompt must include cool style');

        engine.setReplyStyle('captain_like');
        assert.ok(engine.buildSystemPrompt().includes('Captain'), 'System prompt must include captain_like style');

        engine.setReplyStyle('custom', 'Speak like a Victorian detective who loves tea');
        assert.ok(engine.buildSystemPrompt().includes('Speak like a Victorian detective who loves tea'), 'System prompt must include custom style prompt');

        // 1.3 Hosted Preferred Words & Catchphrases Influence Tests
        engine.setPreferredWords('Aye aye, matey, by the stars');
        const promptWithWords = engine.buildSystemPrompt();
        assert.ok(promptWithWords.includes('[SIGNATURE VOCABULARY & PREFERRED WORDS]'), 'Must include signature vocabulary header');
        assert.ok(promptWithWords.includes('Aye aye, matey, by the stars'), 'Must include preferred words list');

        // Test greeting under captain_like style + preferred words influence
        const offlineEngine = new LLMDirectorEngine({
          currentSettings: {
            ...mockSettings,
            aiDirectorEnabled: false,
            aiPersonaPrompt: 'Starship Commander',
            aiReplyStylePreset: 'captain_like',
            aiPreferredWords: 'Aye aye'
          }
        });
        offlineEngine.generatePersonaGreeting().then((captainGreeting) => {
          assert.ok(captainGreeting.includes('Captain') || captainGreeting.includes('stations'), 'Greeting must reflect captain style');
          assert.ok(captainGreeting.includes('Aye aye'), 'Greeting must incorporate hosted preferred words');
        });

        // 1.4 Traditional Chinese (zh-TW) Glyph Normalization & Same-Language Action Tests
        import('../src/core/LLMDirectorEngine.js').then(({ convertToTraditionalChinese }) => {
          const sampleSimplified = '这是一个骑自行车的男孩在说话，发现开始准备喜欢';
          const converted = convertToTraditionalChinese(sampleSimplified);
          assert.strictEqual(converted, '這是一個騎自行車的男孩在說話，發現開始準備喜歡', 'Must accurately convert simplified characters to authentic Traditional Chinese');

          engine.setResponseLanguage('zh-TW');
          const zhTWSysPrompt = engine.buildSystemPrompt();
          assert.ok(zhTWSysPrompt.includes('Traditional Chinese'), 'Prompt must require Traditional Chinese');
          assert.ok(zhTWSysPrompt.includes('100% SAME-LANGUAGE RULE FOR ACTIONS'), 'Prompt must enforce same-language actions');
          assert.ok(zhTWSysPrompt.includes('放慢踩踏腳踏車的速度'), 'Prompt must demonstrate Traditional Chinese action in asterisks');

          const zhTWOfflineEngine = new LLMDirectorEngine({
            currentSettings: {
              ...mockSettings,
              aiDirectorEnabled: false,
              aiPersonaPrompt: 'batman',
              aiResponseLanguage: 'zh-TW',
              aiReplyStylePreset: 'captain_like'
            }
          });
          zhTWOfflineEngine.generatePersonaGreeting().then((twGreeting) => {
            assert.ok(twGreeting.includes('*站在艦橋指揮'), 'Greeting must use Traditional Chinese inside action asterisks');
            assert.ok(!twGreeting.includes('站在这里'), 'Greeting must not contain Simplified Chinese');
            assert.ok(!twGreeting.includes('*stands'), 'Greeting must never contain English actions in Traditional Chinese mode');
          });
        });

        // 1.5 PixelProcessor Shader & Filter Unit Tests
        import('../src/services/PixelProcessor.js').then(async ({ PixelProcessor }) => {
        assert.ok(typeof PixelProcessor.applyChromaticAberration === 'function');
        assert.ok(typeof PixelProcessor.pixelate === 'function');
        assert.ok(typeof PixelProcessor.applyHalftone === 'function');
        assert.ok(typeof PixelProcessor.applyHolographicSheen === 'function');
        assert.ok(typeof PixelProcessor.applyDieCutOutline === 'function');

        // Graceful handling of empty/headless contexts
        assert.strictEqual(PixelProcessor.applyChromaticAberration(null, 100, 100), false);
        assert.strictEqual(PixelProcessor.applyHalftone(null, 100, 100), false);
        assert.strictEqual(PixelProcessor.applyHolographicSheen(null, 100, 100), false);

          // 1.8 LocalImageGenService Unit Tests
          const { LocalImageGenService } = await import('../src/services/LocalImageGenService.js');
          const imageGen = new LocalImageGenService({ currentSettings: { imageGenEnabled: true } });
          assert.ok(imageGen, 'LocalImageGenService must instantiate');
          assert.strictEqual(imageGen.isEnabled, true);

          const generatedFallback = await imageGen.generateImage('cyberpunk mascot');
          assert.ok(generatedFallback.dataUrl.startsWith('data:image/'), 'generateImage must return valid image data URL');
          assert.strictEqual(generatedFallback.prompt, 'cyberpunk mascot');
          assert.strictEqual(generatedFallback.source, 'procedural', 'Offline generator must return procedural source when SD is offline');

          // Ensure zero external cloud diffusion method exists
          assert.strictEqual(typeof imageGen._callInstantAiApi, 'undefined', 'External cloud diffusion API must be completely removed');

          // Test arbitrary offline prompts without presets
          const sunsetImg = await imageGen.generateImage('golden sunrise over majestic mountains');
          assert.ok(sunsetImg.dataUrl.startsWith('data:image/'));

          const castleImg = await imageGen.generateImage('ancient stone castle with glowing spires');
          assert.ok(castleImg.dataUrl.startsWith('data:image/'));

          const abstractImg = await imageGen.generateImage('hyperdimensional quantum consciousness');
          assert.ok(abstractImg.dataUrl.startsWith('data:image/'));

          // Test deterministic palette generation
          const customPalette = imageGen._generateDeterministicPalette('serendipity and harmony');
          assert.ok(customPalette.primary && customPalette.secondary && customPalette.accent);
          assert.ok(customPalette.bgTop.startsWith('hsl('));

          // Rigorous Mock Canvas Test verifying _generateProceduralFallback in active DOM
          const mockCtx = {
            createLinearGradient: () => ({ addColorStop: () => {} }),
            createRadialGradient: () => ({ addColorStop: () => {} }),
            fillRect: () => {},
            strokeRect: () => {},
            rect: () => {},
            beginPath: () => {},
            arc: () => {},
            ellipse: () => {},
            moveTo: () => {},
            lineTo: () => {},
            quadraticCurveTo: () => {},
            bezierCurveTo: () => {},
            closePath: () => {},
            stroke: () => {},
            fill: () => {},
            save: () => {},
            restore: () => {},
            translate: () => {},
            rotate: () => {},
            scale: () => {},
            fillText: () => {}
          };
          const originalDoc = globalThis.document;
          globalThis.document = {
            createElement: (tag) => {
              if (tag === 'canvas') {
                return {
                  width: 512,
                  height: 512,
                  getContext: () => mockCtx,
                  toDataURL: () => 'data:image/png;base64,mockRendered'
                };
              }
              return {};
            }
          };

          try {
            const testPrompts = [
              'completely random unknown prompt without presets',
              'golden sunrise over majestic mountains',
              'ancient stone castle with glowing spires',
              'phoenix rising from ashes',
              'cyberpunk mecha robot',
              'mystic diamond crystal',
              'futuristic flying car',
              'katana of light'
            ];
            for (const p of testPrompts) {
              const resUrl = imageGen._generateProceduralFallback(p, 512, 512);
              assert.strictEqual(resUrl, 'data:image/png;base64,mockRendered', `Must render procedural fallback for "${p}" without errors`);
            }
          } finally {
            globalThis.document = originalDoc;
          }

          // Heuristic Image Gen Intent Testing
          const drawIntent = engine.parseHeuristicIntent('/draw a futuristic flying car');
          assert.ok(drawIntent.imageGen, 'Engine must detect /draw intent');
          assert.strictEqual(drawIntent.imageGen.prompt, 'a futuristic flying car');

          const drawIntentZh = engine.parseHeuristicIntent('畫一張賽博朋克貓咪');
          assert.ok(drawIntentZh.imageGen, 'Engine must detect Chinese draw intent');
          assert.strictEqual(drawIntentZh.imageGen.prompt, '賽博朋克貓咪');

          // 1.9 ImageStudioUI Controller Unit Tests
          const { StickerStudioUI } = await import('../src/ui/StickerStudioUI.js');
          const studio = new StickerStudioUI({
            imageGenService: imageGen,
            currentSettings: { aiResponseLanguage: 'zh-TW' }
          });
          assert.ok(studio, 'StickerStudioUI must instantiate successfully');
          assert.strictEqual(studio.state.mode, 'txt2img');
          assert.strictEqual(studio.state.imageStyle, 'auto');
          assert.strictEqual(studio.state.imageProvider, 'auto');
        });
      });

      // 2. Safe Tool Calling Decoupling (Never mutates settings unexpectedly)
      assert.deepStrictEqual(engine.executeTool('setModelScale', { scale: 1.8 }), [], 'executeTool must safely return empty array');
      assert.deepStrictEqual(engine.executeProposal({ toolCalls: [{ name: 'test' }] }), [], 'executeProposal must safely return empty array');
      assert.strictEqual(mockSettings.scale, 1.0, 'Settings must not be mutated by tool calls');

      // 3. Conversational Chit-Chat & Humor
      const jokeResult = engine.parseHeuristicIntent('tell me a joke');
      assert.strictEqual(jokeResult.toolCalls.length, 0);
      assert.ok(jokeResult.text.length > 15, 'Should return friendly joke');

      // 4. Creative Writing (Poem & Story)
      const poemResult = engine.parseHeuristicIntent('write a poem');
      assert.strictEqual(poemResult.toolCalls.length, 0);
      assert.ok(poemResult.text.includes('Pixels') || poemResult.text.includes('screen') || poemResult.text.includes('🌟'), 'Should return creative poem');

      const storyResult = engine.parseHeuristicIntent('tell me a story');
      assert.strictEqual(storyResult.toolCalls.length, 0);
      assert.ok(storyResult.text.includes('Wanderer') || storyResult.text.includes('desktop'), 'Should return desktop companion story');

      // 5. Dynamic Clock & Date/Time
      const timeResult = engine.parseHeuristicIntent('what time is it');
      assert.strictEqual(timeResult.toolCalls.length, 0);
      assert.ok(timeResult.text.includes('current time is'), 'Should report current time');

      const dateResult = engine.parseHeuristicIntent('what day is today');
      assert.strictEqual(dateResult.toolCalls.length, 0);
      assert.ok(dateResult.text.includes('Today is') || dateResult.text.includes('2026'), 'Should report date');

      // 6. Emotional Support & Empathy
      const tiredResult = engine.parseHeuristicIntent('I am feeling tired today');
      assert.strictEqual(tiredResult.toolCalls.length, 0);
      assert.ok(tiredResult.text.includes('breather') || tiredResult.text.includes('hard') || tiredResult.text.includes('rest'), 'Should offer empathetic comfort');

      const debugResult = engine.parseHeuristicIntent('debugging javascript is hard');
      assert.strictEqual(debugResult.toolCalls.length, 0);
      assert.ok(debugResult.text.includes('developer') || debugResult.text.includes('relax') || debugResult.text.includes('coffee'), 'Should offer developer banter');

      const realResult = engine.parseHeuristicIntent('are you real');
      assert.strictEqual(realResult.toolCalls.length, 0);
      assert.ok(realResult.text.includes('shy boy') || realResult.text.includes('real'), 'Should reflect in-character identity');

      // 7. Desktop Companion Guides & Advice
      const tourResult = engine.parseHeuristicIntent('tell me about this app');
      assert.strictEqual(tourResult.toolCalls.length, 0);
      assert.ok(tourResult.text.includes('Companion') || tourResult.text.includes('Overview'), 'Should give feature tour');

      const modelsResult = engine.parseHeuristicIntent('what models are there');
      assert.strictEqual(modelsResult.toolCalls.length, 0);
      assert.ok(modelsResult.text.includes('Bunny') || modelsResult.text.includes('Flag'), 'Should list available models');

      const pianoResult = engine.parseHeuristicIntent('how to play piano');
      assert.strictEqual(pianoResult.toolCalls.length, 0);
      assert.ok(pianoResult.text.includes('A, S, D, F, G, H, J, K') || pianoResult.text.includes('scale'), 'Should explain piano shortcuts');

      const shortcutsResult = engine.parseHeuristicIntent('keyboard shortcuts');
      assert.strictEqual(shortcutsResult.toolCalls.length, 0);
      assert.ok(shortcutsResult.text.includes('Scroll Wheel') || shortcutsResult.text.includes('MMB'), 'Should explain viewport shortcuts');

      const codingTips = engine.parseHeuristicIntent('how can I use this app while I am coding?');
      assert.strictEqual(codingTips.toolCalls.length, 0);
      assert.ok(codingTips.text.includes('Click-Through') || codingTips.text.includes('Ignore Mouse'), 'Should advise on click-through mode');

      // 8. Open-Domain Companion Banter (Food, Space, Mini-Games)
      const foodResult = engine.parseHeuristicIntent('What is your favorite pizza topping?');
      assert.strictEqual(foodResult.toolCalls.length, 0);
      assert.ok(foodResult.text.length > 20, 'Should return natural food banter');

      const spaceResult = engine.parseHeuristicIntent('What do you think about black holes in space?');
      assert.strictEqual(spaceResult.toolCalls.length, 0);
      assert.ok(spaceResult.text.length > 20, 'Should return space banter');

      const coinResult = engine.parseHeuristicIntent('Flip a coin for me');
      assert.strictEqual(coinResult.toolCalls.length, 0);
      assert.ok(coinResult.text.includes('HEADS') || coinResult.text.includes('TAILS'), 'Should return coin flip');

      const diceResult = engine.parseHeuristicIntent('Roll a dice');
      assert.strictEqual(diceResult.toolCalls.length, 0);
      assert.ok(diceResult.text.includes('Result:') || diceResult.text.includes('dice'), 'Should return dice roll');

      // 9. Chinese Multi-Lingual Companion Support
      const zhJoke = engine.parseHeuristicIntent('讲个笑话');
      assert.strictEqual(zhJoke.toolCalls.length, 0);
      assert.ok(zhJoke.text.length > 10, 'Chinese joke should return');

      const zhTime = engine.parseHeuristicIntent('现在几点');
      assert.strictEqual(zhTime.toolCalls.length, 0);
      assert.ok(zhTime.text.includes('现在的时间是'), 'Chinese time should return');

      const zhIntro = engine.parseHeuristicIntent('介绍一下这个软件');
      assert.strictEqual(zhIntro.toolCalls.length, 0);
      assert.ok(zhIntro.text.includes('3D Desktop AI Companion'), 'Chinese tour should return');

      // 10. Archived AppContextRetriever RAG Knowledge Unit Tests
      import('../archive/function_director/AppContextRetriever.js').then(({ AppContextRetriever }) => {
        const flagContext = AppContextRetriever.retrieveContext('switch to waving flag with cyber preset');
        assert.ok(flagContext.includes('Flag Cloth Physics'), 'Archived RAG should retrieve flag cloth topic');

        const saveContext = AppContextRetriever.retrieveContext('save and refresh');
        assert.ok(saveContext.includes('Save & Refresh'), 'Archived RAG should retrieve save topic');

        const batteryContext = AppContextRetriever.retrieveContext('turn on dynamic battery saving');
        assert.ok(batteryContext.includes('Performance Optimization'), 'Archived RAG should retrieve performance topic');

        // 11. Conversational processUserMessage & Speech Bubble Callback
        engine.processUserMessage('Hello companion! How are you today?').then((assistantMsg) => {
          assert.strictEqual(assistantMsg.role, 'assistant');
          assert.ok(assistantMsg.content.length > 0, 'Assistant must respond with message content');
          assert.strictEqual(assistantMsg.actions.length, 0, 'Must have zero unexpected tool actions');
          assert.strictEqual(spokenBubble, assistantMsg.content, 'showSpeechBubble callback must receive companion reply');

          const report = engine.getFormattedReport();
          assert.ok(report.includes('# 🤖 AI Companion Diagnostic Log Report'), 'Report should have markdown header');
          assert.ok(report.includes('Safe Conversational Companion'), 'Report should describe safe engine mode');
          assert.ok(engine.diagnosticLogs.length > 0, 'Diagnostic logs should contain recorded turns');

          // Developer Tools Telemetry & Analytics Suite Tests
          const traces = engine.getTelemetryTraces();
          assert.ok(Array.isArray(traces) && traces.length > 0, 'getTelemetryTraces should return non-empty array');
          const lastTrace = traces[traces.length - 1];
          assert.ok(typeof lastTrace.latencyMs === 'number', 'Telemetry trace should contain latencyMs');

          // Test JSON Export
          const exportedJson = engine.exportTelemetryJSON();
          const parsed = JSON.parse(exportedJson);
          assert.strictEqual(parsed.schemaVersion, '1.0', 'Exported JSON should have schemaVersion 1.0');
          assert.strictEqual(parsed.traces.length, traces.length, 'Exported JSON should preserve traces count');

          // Test Telemetry Listener & Dataset Plug-Back
          let listenerNotified = false;
          engine.addTelemetryListener((evt) => {
            if (evt.type === 'load') listenerNotified = true;
          });
          const loadResult = engine.loadTelemetryDataset([{ id: 999, userInput: 'test replay', engineMode: 'test', latencyMs: 15, assistantResponse: 'ok', actions: [] }]);
          assert.strictEqual(loadResult, true, 'loadTelemetryDataset should return true for valid dataset');
          assert.strictEqual(listenerNotified, true, 'Telemetry listener should be notified of dataset load');
          assert.strictEqual(engine.getTelemetryTraces().length, 1, 'Loaded dataset should be set active');

                // Test AssetRegistryManager Ingestion & 3D Model Scanning
                console.log('▶ Testing AssetRegistryManager 3D Ingestion & SceneStageManager Scanning...');
                const registry = new AssetRegistryManager();
                const glbMeta = registry.detectFileType({ name: 'robot.glb' });
                assert.strictEqual(glbMeta.type, 'model', 'GLB file must be model type');
                assert.strictEqual(glbMeta.category, '3D Model', 'GLB category must be 3D Model');

                const gltfMeta = registry.detectFileType({ name: 'character.gltf' });
                assert.strictEqual(gltfMeta.type, 'model', 'GLTF file must be model type');

                const gifMeta = registry.detectFileType({ name: 'pattern.gif' });
                assert.strictEqual(gifMeta.type, 'texture', 'GIF file must be categorized as texture type');
                assert.strictEqual(gifMeta.category, 'Texture', 'GIF category must be Texture');

                const pngMeta = registry.detectFileType({ name: 'skin.png' });
                assert.strictEqual(pngMeta.type, 'texture', 'PNG file must be texture type');

                const midMeta = registry.detectFileType({ name: 'bach.mid' });
                assert.strictEqual(midMeta.type, 'score', 'MID file must be score type');

                // Test SceneStageManager 3D model discovery
                const mockFs = {
                  existsSync: (p) => true,
                  readdirSync: (p) => ['fox.glb', 'dance.gltf', 'texture.png', 'cat.gif', 'readme.txt', 'song.mp3']
                };
                const stageMgr = new SceneStageManager({
                  fs: mockFs,
                  getAssetsPath: () => '/mock/assets'
                });
                const discovered = stageMgr.scanForModels();
                assert.deepStrictEqual(discovered, ['fox.glb', 'dance.gltf'], 'scanForModels must discover only 3D .glb and .gltf files');
                console.log('✅ AssetRegistryManager & SceneStageManager 3D Model tests PASSED.');

                // Test HumanoidMascotBuilder & Procedural Humanoid Rig
                console.log('▶ Testing HumanoidMascotBuilder procedural 3D humanoid & skeletal animations...');
                import('../src/core/HumanoidMascotBuilder.js').then(({ createProceduralHumanoid }) => {
                  const mockTHREE = {
                    Group: class { constructor() { this.children = []; this.position = { set: () => {}, x: 0, y: 0, z: 0 }; this.rotation = { set: () => {}, x: 0, y: 0, z: 0 }; this.scale = { set: () => {} }; this.userData = {}; } add(c) { this.children.push(c); } },
                    Mesh: class { constructor(g, m) { this.geom = g; this.mat = m; this.position = { set: () => {}, x: 0, y: 0, z: 0 }; this.rotation = { set: () => {}, x: 0, y: 0, z: 0 }; this.scale = { set: () => {} }; this.userData = {}; } },
                    BoxGeometry: class { constructor() {} translate() {} rotateX() {} rotateY() {} rotateZ() {} },
                    CylinderGeometry: class { constructor() {} translate() {} rotateX() {} rotateY() {} rotateZ() {} },
                    SphereGeometry: class { constructor() {} translate() {} rotateX() {} rotateY() {} rotateZ() {} },
                    MeshPhysicalMaterial: class { constructor(opts) { Object.assign(this, opts); } },
                    MeshStandardMaterial: class { constructor(opts) { Object.assign(this, opts); } },
                    MeshBasicMaterial: class { constructor(opts) { Object.assign(this, opts); } }
                  };
                  const mockScene = new mockTHREE.Group();
                  const humanoidResult = createProceduralHumanoid(mockTHREE, mockScene);
                  assert.ok(humanoidResult !== null, 'createProceduralHumanoid must return controller');
                  assert.ok(humanoidResult.joints !== null, 'Humanoid must create joint hierarchy');
                  assert.ok(humanoidResult.joints.head !== null, 'Humanoid must contain head node');
                  assert.ok(humanoidResult.joints.torso !== null, 'Humanoid must contain torso node');
                  assert.ok(humanoidResult.joints.leftArm !== null, 'Humanoid must contain leftArm node');
                  assert.ok(humanoidResult.joints.rightArm !== null, 'Humanoid must contain rightArm node');
                  assert.deepStrictEqual(humanoidResult.availableAnimations, ['Idle', 'Wave', 'Dance', 'Look_Around'], 'Humanoid must declare 4 animations');
                  
                  // Test animation updates across all clips
                  humanoidResult.updateAnimation(1.0, 'idle');
                  humanoidResult.updateAnimation(1.5, 'wave');
                  humanoidResult.updateAnimation(2.0, 'dance');
                  humanoidResult.updateAnimation(2.5, 'look_around');
                  humanoidResult.resetJoints();
                  console.log('✅ HumanoidMascotBuilder & skeletal animation tests PASSED.');
                });

                // Test ScreenVisionService (Multimodal Vision payload & fallback)
                import('../src/services/ScreenVisionService.js').then(async ({ ScreenVisionService }) => {
                  console.log('▶ Testing ScreenVisionService local multimodal vision engine...');
                  const sanitized = ScreenVisionService.sanitizeBase64('data:image/jpeg;base64,abc123XYZ==');
                  assert.strictEqual(sanitized, 'abc123XYZ==', 'Sanitizer must strip data URI prefix');

                  const payload = ScreenVisionService.createVisionPayload({
                    model: 'llama3.2-vision',
                    detail: 'more',
                    prompt: 'What game is this?',
                    base64Image: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                    stream: true
                  });
                  assert.strictEqual(payload.model, 'llama3.2-vision', 'Payload model must be llama3.2-vision');
                  assert.strictEqual(payload.prompt, 'What game is this?', 'Payload prompt must match');
                  assert.strictEqual(payload.stream, true, 'Stream must be true');
                  assert.strictEqual(payload.images.length, 1, 'Payload must contain 1 base64 image');
                  assert.strictEqual(payload.options.num_predict, 260, 'More detail preset should allocate 260 tokens');

                  const payloadFew = ScreenVisionService.createVisionPayload({ detail: 'few', base64Image: 'abc' });
                  assert.strictEqual(payloadFew.options.num_predict, 50, 'Few detail preset should allocate 50 tokens');

                  const service = new ScreenVisionService();
                  const fallback = service.generateFallbackVisionAnalysis(1280, 720, 'llama3.2-vision', 'Connection refused');
                  assert(fallback.startsWith('Output:'), 'Fallback must start with Output: prefix');
                  assert(fallback.includes('1280x720'), 'Fallback must mention resolution');

                  console.log('✅ ScreenVisionService multimodal vision tests PASSED.');

                  // Test VisionCaptionSynthesizerService (Vision -> LLM Caption Synthesizer archived service)
                  const { VisionCaptionSynthesizerService, SYNTH_STYLE_PERSONAS, convertToTraditionalChinese } = await import('../archive/streamer_overlays/VisionCaptionSynthesizerService.js');
                  console.log('▶ Testing VisionCaptionSynthesizerService native multilingual variables, 11 personas & S2T converter...');
                    assert(SYNTH_STYLE_PERSONAS.streamer, 'Must define streamer persona');
                    assert(SYNTH_STYLE_PERSONAS.tw_streamer, 'Must define tw_streamer persona');
                    assert(SYNTH_STYLE_PERSONAS.roast, 'Must define roast/meme persona');
                    assert(SYNTH_STYLE_PERSONAS.coach, 'Must define coach persona');
                    assert(SYNTH_STYLE_PERSONAS.funny, 'Must define funny/comedy persona');
                    assert(SYNTH_STYLE_PERSONAS.serious, 'Must define serious/analytical persona');
                    assert(SYNTH_STYLE_PERSONAS.gamer, 'Must define gamer persona');
                    assert(SYNTH_STYLE_PERSONAS.poetic, 'Must define poetic persona');
                    assert(SYNTH_STYLE_PERSONAS.mascot, 'Must define mascot persona');
                    assert(SYNTH_STYLE_PERSONAS.narrator, 'Must define narrator persona');
                    assert(SYNTH_STYLE_PERSONAS.action, 'Must define action persona');

                    // Test Native System Prompt Generation
                    const zhTWPrompt = VisionCaptionSynthesizerService.buildNativeSystemPrompt('tw_streamer', 'zh-TW', 3);
                    assert(zhTWPrompt.includes('實況'), 'Traditional Chinese prompt must use native Traditional terminology');
                    assert(zhTWPrompt.includes('繁體中文'), 'Traditional Chinese prompt must enforce Traditional Chinese');

                    const zhPrompt = VisionCaptionSynthesizerService.buildNativeSystemPrompt('streamer', 'zh', 4);
                    assert(zhPrompt.includes('实况'), 'Simplified Chinese prompt must use Simplified terminology');
                    assert(zhPrompt.includes('恰好 4'), 'Simplified Chinese prompt must scale count');

                    // Test S2T Glyph Normalizer
                    const simplifiedSample = '这个点发出动静，走位非常到位，破盾击杀！';
                    const traditionalResult = convertToTraditionalChinese(simplifiedSample);
                    assert.strictEqual(traditionalResult, '這個點發出動靜，走位非常到位，破盾擊殺！', 'Must correctly convert simplified characters to traditional');

                    const rawText = '1. First energetic subtitle!\n2. Second atmospheric sentence.\n- Third clean line.\n4. Fourth funny joke.';
                    const parsed = VisionCaptionSynthesizerService.parseCaptionOutput(rawText, 'zh-TW');
                    assert.strictEqual(parsed.length, 4, 'Must parse 4 clean lines without numbers');
                    assert.strictEqual(parsed[0], 'First energetic subtitle!');
                    assert.strictEqual(parsed[1], 'Second atmospheric sentence.');
                    assert.strictEqual(parsed[2], 'Third clean line.');
                    assert.strictEqual(parsed[3], 'Fourth funny joke.');

                    console.log('✅ VisionCaptionSynthesizerService unit tests PASSED.');

                    // Test SpeechSynthesisService (Zero-Latency Offline TTS Engine)
                    const { SpeechSynthesisService } = await import('../src/services/SpeechSynthesisService.js');
                    console.log('▶ Testing SpeechSynthesisService offline TTS engine & voice resolution...');
                    const ttsService = new SpeechSynthesisService();
                    ttsService.voices = [
                      { name: 'Microsoft David Desktop - English (United States)', lang: 'en-US', default: true },
                      { name: 'Microsoft Zira Desktop - English (United States)', lang: 'en-US', default: false },
                      { name: 'Microsoft Hanhan Desktop - Chinese (Taiwan)', lang: 'zh-TW', default: false },
                      { name: 'Microsoft Yaoyao Desktop - Chinese (Simplified)', lang: 'zh-CN', default: false },
                      { name: 'Microsoft Haruka Desktop - Japanese (Japan)', lang: 'ja-JP', default: false }
                    ];

                    const twVoice = ttsService.getBestVoice('zh-TW');
                    assert(twVoice && twVoice.lang === 'zh-TW', 'Must resolve Traditional Chinese voice');

                    const jaVoice = ttsService.getBestVoice('ja');
                    assert(jaVoice && jaVoice.lang === 'ja-JP', 'Must resolve Japanese voice by prefix');

                    const enVoice = ttsService.getBestVoice('en');
                    assert(enVoice && enVoice.lang === 'en-US', 'Must resolve English voice');

                    // Test Female Voice Resolution
                    const femaleVoice = ttsService.getBestVoice('en', { preset: 'female_anime' });
                    assert(femaleVoice && femaleVoice.name.includes('Zira'), 'Must resolve female voice (Zira) for female_anime preset');

                    // Test Explicit Voice Selection by Name
                    const explicitDavid = ttsService.getBestVoice('en', { voiceName: 'Microsoft David Desktop - English (United States)' });
                    assert(explicitDavid && explicitDavid.name.includes('David'), 'Must resolve explicit voice by exact name');

                    // Test getInstalledVoices with gender classification
                    const installed = ttsService.getInstalledVoices();
                    assert(installed.length === 5, 'Must return all installed voices');
                    const ziraEntry = installed.find(v => v.name.includes('Zira'));
                    assert(ziraEntry && ziraEntry.gender === 'female', 'Must classify Zira as female voice');
                    const davidEntry = installed.find(v => v.name.includes('David'));
                    assert(davidEntry && davidEntry.gender === 'male', 'Must classify David as male voice');

                    // Test State Change Listeners
                    let reportedSpeaking = null;
                    const listener = (isSpeaking) => { reportedSpeaking = isSpeaking; };
                    ttsService.onStateChange(listener);
                    ttsService._notifyState(true);
                    assert.strictEqual(reportedSpeaking, true, 'Must notify true when speaking');
                    ttsService._notifyState(false);
                    assert.strictEqual(reportedSpeaking, false, 'Must notify false when stopped');
                    ttsService.offStateChange(listener);

                    console.log('✅ SpeechSynthesisService unit tests PASSED.');

                    // Test Overlay Window Files & Safe Overlay Deprecation Integrity
                    console.log('▶ Testing Clean Desktop Companion Integrity & Safe Overlay Archival...');
                    import('fs').then((fs) => {
                      // Confirm streamer overlays are cleanly decoupled from app root
                      assert.strictEqual(fs.existsSync('caption.html'), false, 'caption.html overlay window must be removed from app root');
                      assert.strictEqual(fs.existsSync('caption.js'), false, 'caption.js overlay controller must be removed from app root');
                      assert.strictEqual(fs.existsSync('banner.html'), false, 'banner.html sponsor window must be removed from app root');
                      assert.strictEqual(fs.existsSync('banner.js'), false, 'banner.js sponsor controller must be removed from app root');

                      // Confirm safely preserved in archive
                      assert.strictEqual(fs.existsSync('archive/streamer_overlays/caption.html'), true, 'caption.html must be preserved in archive');
                      assert.strictEqual(fs.existsSync('archive/streamer_overlays/banner.html'), true, 'banner.html must be preserved in archive');

                      // Confirm orphaned live chat files are safely removed
                      assert.strictEqual(fs.existsSync('chat.html'), false, 'Orphaned chat.html must be removed');
                      assert.strictEqual(fs.existsSync('chat.js'), false, 'Orphaned chat.js must be removed');
                      assert.strictEqual(fs.existsSync('src/services/LiveAudienceAIService.js'), false, 'Orphaned LiveAudienceAIService.js must be removed');
                      assert.strictEqual(fs.existsSync('src/ui/LiveChatSimulatorUI.js'), false, 'Orphaned LiveChatSimulatorUI.js must be removed');

                      // Confirm function directing tool modules are decoupled from active src and preserved in archive
                      assert.strictEqual(fs.existsSync('src/core/director/ToolRegistry.js'), false, 'ToolRegistry must be removed from active core');
                      assert.strictEqual(fs.existsSync('src/core/director/domains'), false, 'domains directory must be removed from active core');
                      assert.strictEqual(fs.existsSync('src/core/director/AppContextRetriever.js'), false, 'AppContextRetriever must be removed from active core');
                      assert.strictEqual(fs.existsSync('archive/function_director/ToolRegistry.js'), true, 'ToolRegistry must be preserved in archive');
                      assert.strictEqual(fs.existsSync('archive/function_director/AppContextRetriever.js'), true, 'AppContextRetriever must be preserved in archive');
                      assert.strictEqual(fs.existsSync('archive/function_director/UIStateInspector.js'), true, 'UIStateInspector must be preserved in archive');
                      assert.strictEqual(fs.existsSync('archive/function_director/domains/DisplayTools.js'), true, 'DisplayTools must be preserved in archive');
                      assert.strictEqual(fs.existsSync('archive/function_director/domains/AtmosphereTools.js'), true, 'AtmosphereTools must be preserved in archive');
                      assert.strictEqual(fs.existsSync('src/core/director/OpenDomainCompanionChat.js'), true, 'OpenDomainCompanionChat must remain active');

                      // Confirm sticker services are cleanly decoupled from active src and preserved in archive
                      assert.strictEqual(fs.existsSync('src/services/LiveStickerSynthesizerService.js'), false, 'LiveStickerSynthesizerService must be removed from active src');
                      assert.strictEqual(fs.existsSync('src/services/StickerPackExporterService.js'), false, 'StickerPackExporterService must be removed from active src');
                      assert.strictEqual(fs.existsSync('src/services/DesktopStickerPinService.js'), false, 'DesktopStickerPinService must be removed from active src');
                      assert.strictEqual(fs.existsSync('src/services/AnimatedTextSynthesizer.js'), false, 'AnimatedTextSynthesizer must be removed from active src');

                      assert.strictEqual(fs.existsSync('archive/sticker_services/LiveStickerSynthesizerService.js'), true, 'LiveStickerSynthesizerService must be preserved in archive');
                      assert.strictEqual(fs.existsSync('archive/sticker_services/StickerPackExporterService.js'), true, 'StickerPackExporterService must be preserved in archive');
                      assert.strictEqual(fs.existsSync('archive/sticker_services/DesktopStickerPinService.js'), true, 'DesktopStickerPinService must be preserved in archive');
                      assert.strictEqual(fs.existsSync('archive/sticker_services/AnimatedTextSynthesizer.js'), true, 'AnimatedTextSynthesizer must be preserved in archive');

                      console.log('✅ Clean Desktop Companion Integrity & Safe Tool Archival tests PASSED.');

                      // Test LocalImageGenService Multi-Style & Offline Generation Engine
                      console.log('▶ Testing LocalImageGenService multi-style synthesis & auto-inference...');
                      import('../src/services/LocalImageGenService.js').then(async ({ LocalImageGenService }) => {
                        const imgGen = new LocalImageGenService();
                        assert.ok(imgGen, 'LocalImageGenService must instantiate');

                        // Test explicit style selection
                        const resWater = await imgGen.generateImage('serene lotus pond', { style: 'watercolor' });
                        assert.ok(resWater.dataUrl, 'Must generate an image dataUrl');
                        assert.strictEqual(resWater.style, 'watercolor', 'Must record watercolor style');

                        const resAnimeExplicit = await imgGen.generateImage('magical adventure', { style: 'anime' });
                        assert.strictEqual(resAnimeExplicit.style, 'anime', 'Must respect explicit anime style');

                        // Test smart auto-inference across varied artistic keywords
                        const resPixel = await imgGen.generateImage('retro 8bit dungeon crawler', { style: 'auto' });
                        assert.strictEqual(resPixel.style, 'pixel_art', 'Must detect pixel_art from 8bit keyword');

                        const resAnimeAuto = await imgGen.generateImage('anime girl warrior', { style: 'auto' });
                        assert.strictEqual(resAnimeAuto.style, 'anime', 'Must detect anime style');

                        const resOil = await imgGen.generateImage('oil painting of sunset mountains', { style: 'auto' });
                        assert.strictEqual(resOil.style, 'oil_painting', 'Must detect oil_painting style');

                        const resCyber = await imgGen.generateImage('cyberpunk neon samurai', { style: 'auto' });
                        assert.strictEqual(resCyber.style, 'cyberpunk', 'Must detect cyberpunk style');

                        const resLandscape = await imgGen.generateImage('mountain landscape sunset lake', { style: 'auto' });
                        assert.strictEqual(resLandscape.style, 'landscape', 'Must detect landscape style');

                        console.log('✅ LocalImageGenService multi-style synthesis tests PASSED.');

                        // Test MascotMailService & DirectChatUI 3D Mail Flight & Speech Bubble
                        console.log('▶ Testing MascotMailService 3D mail flight & DirectChatUI speech bubble...');
                        const { MascotMailService } = await import('../src/core/MascotMailService.js');
                        const { DirectChatUI } = await import('../src/ui/DirectChatUI.js');
                        const { soundManager } = await import('../src/core/SoundManager.js');

                        class MockVector3 {
                          constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
                          set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
                          clone() { return new MockVector3(this.x, this.y, this.z); }
                          copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
                          add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
                          lerp(v, alpha) { this.x += (v.x - this.x) * alpha; this.y += (v.y - this.y) * alpha; this.z += (v.z - this.z) * alpha; return this; }
                          unproject() { return this; }
                          project() { return this; }
                        }

                        // Mock THREE for headless testing
                        const mockTHREE = {
                          Vector3: MockVector3,
                          Group: class {
                            constructor() {
                              this.children = [];
                              this.position = new MockVector3(0, 0, 0);
                              this.rotation = { x: 0, y: 0, z: 0 };
                              this.scale = new MockVector3(1, 1, 1);
                            }
                            add(child) { this.children.push(child); }
                            remove(child) { const idx = this.children.indexOf(child); if (idx >= 0) this.children.splice(idx, 1); }
                            traverse(fn) { fn(this); this.children.forEach(c => c.traverse ? c.traverse(fn) : fn(c)); }
                          },
                          BoxGeometry: class { constructor() {} dispose() {} },
                          BufferGeometry: class { constructor() { this.attributes = {}; } setAttribute(k, v) { this.attributes[k] = v; } computeVertexNormals() {} dispose() {} },
                          BufferAttribute: class { constructor(arr, itemSize) { this.array = arr; this.itemSize = itemSize; } },
                          CylinderGeometry: class { constructor() {} dispose() {} },
                          SphereGeometry: class { constructor() {} dispose() {} },
                          MeshStandardMaterial: class { constructor(opts) { Object.assign(this, opts); } dispose() {} },
                          MeshBasicMaterial: class { constructor(opts) { Object.assign(this, opts); } dispose() {} },
                          Mesh: class {
                            constructor(geo, mat) {
                              this.geometry = geo;
                              this.material = mat;
                              this.position = new MockVector3(0, 0, 0);
                              this.rotation = { x: 0, y: 0, z: 0 };
                              this.scale = new MockVector3(1, 1, 1);
                              this.isMesh = true;
                            }
                            traverse(fn) { fn(this); }
                          },
                          DoubleSide: 2
                        };

                        const mockScene = {
                          add: (obj) => { mockScene.children.push(obj); },
                          remove: (obj) => { const i = mockScene.children.indexOf(obj); if (i >= 0) mockScene.children.splice(i, 1); },
                          children: []
                        };
                        const mockCharGroup = new mockTHREE.Group();

                        const mailService = new MascotMailService({
                          THREE: mockTHREE,
                          scene: mockScene,
                          characterGroup: mockCharGroup
                        });
                        assert.ok(mailService, 'MascotMailService must instantiate');

                        // Test procedural mail mesh creation & rigged components
                        const mailMesh = mailService.createMailMesh();
                        assert.ok(mailMesh, 'createMailMesh must produce 3D mail group');
                        assert.ok(mailMesh.children.length >= 3, 'Mail mesh must have envelope body, flap, and seal');
                        assert.ok(mailMesh.userData.flapPivot, 'Mail mesh must have hinged flap pivot');
                        assert.ok(mailMesh.userData.letterMesh, 'Mail mesh must have interior letter sheet');

                        // Test particle spawning & lifetime update
                        mailService.spawnParticle(new MockVector3(0, 0, 0));
                        assert.ok(mailService.activeParticles.length >= 1, 'activeParticles should have spawned particle');
                        mailService.update(0.6); // Particle should expire and clean up
                        assert.strictEqual(mailService.activeParticles.length, 0, 'Expired particles must be cleaned up');

                        // Test sendUserMail flight queue and delivery callback
                        let deliveredToMascot = false;
                        mailService.sendUserMail({ x: 200, y: 400 }, () => {
                          deliveredToMascot = true;
                        });
                        assert.strictEqual(mailService.activeMails.length, 1, 'Active mails queue must have 1 animation');
                        assert.strictEqual(mailService.activeMails[0].direction, 'to_mascot');

                        // Step animation to completion
                        mailService.update(0.5);
                        assert.strictEqual(deliveredToMascot, false, 'Should still be flying halfway');
                        mailService.update(0.5);
                        assert.strictEqual(deliveredToMascot, true, 'Callback must fire upon arrival');
                        assert.strictEqual(mailService.activeMails.length, 0, 'Active mails must be empty after arrival');

                        // Test sendMascotMail return flight & opening sequence
                        let deliveredToUser = false;
                        mailService.sendMascotMail({ x: 200, y: 500 }, () => {
                          deliveredToUser = true;
                        });
                        assert.strictEqual(mailService.activeMails.length, 1);
                        assert.strictEqual(mailService.activeMails[0].direction, 'to_user');
                        mailService.update(1.2);
                        assert.strictEqual(deliveredToUser, true, 'Return mail must arrive at user and open');

                        // Test DirectChatUI controller & letterbox archive
                        const directChat = new DirectChatUI({
                          mascotMailService: mailService,
                          characterGroup: mockCharGroup
                        });
                        assert.ok(directChat, 'DirectChatUI must instantiate');
                        assert.strictEqual(directChat.isChatOpen, true);

                        // Test Letterbox recording
                        directChat.recordLetter('Warm greetings from your mascot!');
                        assert.strictEqual(directChat.lettersHistory.length, 1, 'Letter must be archived in mailbox');
                        assert.strictEqual(directChat.lettersHistory[0].text, 'Warm greetings from your mascot!');

                        // Test Mascot Mail Chat Font & Size application
                        directChat.applyFont("'Consolas', monospace", 16);
                        assert.strictEqual(directChat.chatFont, "'Consolas', monospace", 'DirectChatUI must update chatFont');
                        assert.strictEqual(directChat.chatFontSize, 16, 'DirectChatUI must update chatFontSize');
                        assert.strictEqual(directChat.currentSettings.mascotChatFont, "'Consolas', monospace", 'currentSettings must sync mascotChatFont');
                        assert.strictEqual(directChat.currentSettings.mascotChatFontSize, 16, 'currentSettings must sync mascotChatFontSize');

                        // Test SoundManager mail SFX methods
                        soundManager.playMailWhoosh();
                        soundManager.playMailOpenChime();

                        console.log('✅ MascotMailService & DirectChatUI tests PASSED.');
                        console.log('✅ LLMDirectorEngine, OpenDomainCompanionChat & DevTools Telemetry unit tests PASSED.');
                        await import('./test_coding_agent.mjs');
                        await import('./test_toolchain.mjs');
                        await import('./test_telemetry.mjs');
                        await import('./test_hello_c.mjs');
                        await import('./test_tool_call_parser.mjs');
                        const finalReport = globalTestReporter.saveReport();
                        console.log(`\n🎉 ALL UNIT TEST SUITES PASSED CLEANLY (${finalReport.summary.passed}/${finalReport.summary.total} - ${finalReport.summary.passRate})`);
                        console.log(`📊 AI Test Report saved: tests/test_results.json & workspace/test_report.json`);
                      });
                    });
                  });
                });
              });
            });
          });



