/**
 * Mascot Preview & Thumbnail Generator Module
 * Handles synchronous canvas snapshot preview generation,
 * background offscreen preview queuing, mascot grid card DOM population,
 * localized card titles, and preview thumbnail cache clearing.
 */

import { createProceduralMascot } from '../core/MascotBuilder.js';
import { createProceduralHumanoid } from '../core/HumanoidMascotBuilder.js';
import { ModelThumbnailGenerator } from '../core/ModelThumbnailGenerator.js';
import { disposeHierarchy } from '../core/GPUAssetManager.js';
import { formatHumanLabel } from './uiUtils.js';

export const DEFAULT_FALLBACK_ICON = "data:image/svg+xml;utf8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="blueBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#141c2e"/>
      <stop offset="100%" stop-color="#0a0f1d"/>
    </linearGradient>
    <linearGradient id="cubeTop" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
    <linearGradient id="cubeLeft" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
    <linearGradient id="cubeRight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#1e40af"/>
    </linearGradient>
    <filter id="blueGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="120" height="120" rx="8" fill="url(#blueBg)"/>
  <rect width="118" height="118" x="1" y="1" rx="7" fill="none" stroke="rgba(56,189,248,0.25)" stroke-width="1"/>
  <g filter="url(#blueGlow)" transform="translate(60, 60)">
    <polygon points="0,-30 26,-15 0,0 -26,-15" fill="url(#cubeTop)" stroke="#93c5fd" stroke-width="1.2"/>
    <polygon points="-26,-15 0,0 0,30 -26,15" fill="url(#cubeLeft)" stroke="#3b82f6" stroke-width="1.2"/>
    <polygon points="0,0 26,-15 26,15 0,30" fill="url(#cubeRight)" stroke="#60a5fa" stroke-width="1.2"/>
    <line x1="0" y1="0" x2="0" y2="30" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
    <line x1="0" y1="0" x2="-26" y2="-15" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
    <line x1="0" y1="0" x2="26" y2="-15" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
  </g>
</svg>
`.trim());

/**
 * Triggers re-scanning and populates model dropdowns in the UI.
 * @param {Object} ctx - Context dependencies.
 */
export function populateModelDropdownUI(ctx) {
  const { callbacks } = ctx;
  if (callbacks && callbacks.populateModelDropdown) {
    callbacks.populateModelDropdown();
  }
}

/**
 * Generates a PNG thumbnail preview for a specific model key from isolated renderer canvas.
 * @param {Object} ctx - Context dependencies.
 * @param {string} modelKey - Active model filename or 'procedural'.
 */
export function generateModelPreview(ctx, modelKey) {
  const { fs, path, getAssetsPath, callbacks } = ctx;
  const assetsDir = getAssetsPath();
  const previewsDir = path.join(assetsDir, '.previews');

  if (!fs.existsSync(previewsDir)) {
    try {
      fs.mkdirSync(previewsDir, { recursive: true });
    } catch (e) {
      console.warn("Could not create previews directory:", e);
    }
  }
  const previewPath = path.join(previewsDir, `${modelKey}.png`);
  if (fs.existsSync(previewPath)) return;

  generateMascotPreviewInBackground(ctx, modelKey);

  if (callbacks && callbacks.populateModelDropdown) {
    callbacks.populateModelDropdown();
  }
}

/**
 * Populates the mascot selection grid DOM cards in the settings panel.
 * @param {Object} ctx - Context dependencies.
 */
export function populateModelDropdown(ctx) {
  const { fs, path, pathToFileURL, getAssetsPath, currentSettings, callbacks, state, t } = ctx;
  if (callbacks && callbacks.scanForModels) {
    callbacks.scanForModels();
  }

  const gridContainer = document.getElementById('model-select-grid');
  const modelSelect = document.getElementById('model-select');
  if (!gridContainer || !modelSelect) return;

  gridContainer.innerHTML = '';

  const discovered = state && state.discoveredModels ? state.discoveredModels : [];
  const customModelAssets = window.__assetRegistryManager ? window.__assetRegistryManager.getAssets('model') : [];
  const customModelNames = customModelAssets.map(a => a.name);

  const options = ['procedural', 'humanoid', ...discovered];
  customModelNames.forEach(name => {
    if (!options.includes(name)) {
      options.push(name);
    }
  });

  const assetsDir = getAssetsPath();

  const countBadge = document.getElementById('mascot-count-badge');
  if (countBadge) {
    countBadge.textContent = `${options.length} Mascots`;
  }

  options.forEach(modelKey => {
    const card = document.createElement('div');
    const isSelected = (currentSettings.activeModel || 'procedural') === modelKey;
    card.className = `studio-select-card mascot-card ${isSelected ? 'selected' : ''}`;
    card.setAttribute('data-id', modelKey);

    const thumbWrapper = document.createElement('div');
    thumbWrapper.className = 'studio-select-thumb asset-thumbnail-wrapper';

    const img = document.createElement('img');
    img.className = 'mascot-thumbnail asset-thumbnail-img';
    img.dataset.mascot = modelKey;

    const matchingAsset = customModelAssets.find(a => a.name === modelKey);
    const previewPath = path.join(assetsDir, '.previews', `${modelKey}.png`);

    if (matchingAsset && matchingAsset.thumbnailUrl) {
      img.src = matchingAsset.thumbnailUrl;
    } else if (fs.existsSync(previewPath)) {
      img.src = pathToFileURL(previewPath).href + "?t=" + Date.now();
    } else if (modelKey === 'humanoid') {
      generateMascotPreviewInBackground(ctx, 'humanoid');
    } else if (modelKey === 'procedural') {
      generateMascotPreviewInBackground(ctx, 'procedural');
    } else {
      img.src = DEFAULT_FALLBACK_ICON;
      if (matchingAsset && (ctx.THREE || window.THREE) && (ctx.GLTFLoader || window.GLTFLoader)) {
        ModelThumbnailGenerator.captureModelSnapshot({
          file: matchingAsset.file,
          objectUrl: matchingAsset.objectUrl,
          THREE: ctx.THREE || window.THREE,
          GLTFLoader: ctx.GLTFLoader || window.GLTFLoader
        }).then(dataUrl => {
          if (dataUrl) {
            matchingAsset.thumbnailUrl = dataUrl;
            img.src = dataUrl;
          }
        });
      }
    }
    thumbWrapper.appendChild(img);

    const label = document.createElement('div');
    label.className = 'studio-select-label asset-card-label';
    let subText = '3D Model';

    if (modelKey === 'procedural') {
      label.textContent = (typeof t === 'function') ? t('default_mascot', 'Default Bunny 🐰') : 'Default Bunny 🐰';
      subText = 'Procedural Mascot';
    } else if (modelKey === 'humanoid') {
      label.textContent = (typeof t === 'function') ? t('model_humanoid', 'Cyber Android 🤖') : 'Cyber Android 🤖';
      subText = 'Procedural Rig';
    } else {
      label.textContent = formatHumanLabel(modelKey);
      subText = matchingAsset ? `${matchingAsset.category} • ${matchingAsset.sizeFormatted}` : 'Custom 3D Model';
    }

    const sub = document.createElement('div');
    sub.className = 'studio-select-sub asset-card-sub';
    sub.textContent = isSelected ? '🟢 Active' : subText;

    card.appendChild(thumbWrapper);
    card.appendChild(label);
    card.appendChild(sub);

    card.addEventListener('click', () => {
      if (currentSettings.activeModel === modelKey) return;
      gridContainer.querySelectorAll('.studio-select-card').forEach(c => {
        c.classList.remove('selected');
        const cSub = c.querySelector('.studio-select-sub');
        const cKey = c.getAttribute('data-id');
        if (cSub) {
          if (cKey === 'procedural') cSub.textContent = 'Procedural Mascot';
          else if (cKey === 'humanoid') cSub.textContent = 'Procedural Rig';
          else {
            const mAsset = customModelAssets.find(a => a.name === cKey);
            cSub.textContent = mAsset ? `${mAsset.category} • ${mAsset.sizeFormatted}` : 'Custom GLTF';
          }
        }
      });
      card.classList.add('selected');
      sub.textContent = '🟢 Active';

      modelSelect.value = modelKey;
      modelSelect.dispatchEvent(new Event('change'));
    });

    gridContainer.appendChild(card);
  });

  if (window.__assetRegistryManager && !window.__mascotRegistrySubscribed) {
    window.__mascotRegistrySubscribed = true;
    window.__assetRegistryManager.subscribe(() => populateModelDropdown(ctx));
  }
}

/**
 * Starts background preview generator queue for models missing PNG thumbnails.
 * @param {Object} ctx - Context dependencies.
 */
export function startBackgroundPreviewGenerator(ctx) {
  const { fs, path, getAssetsPath, state, callbacks } = ctx;
  if (callbacks && callbacks.scanForModels) {
    callbacks.scanForModels();
  }
  const assetsDir = getAssetsPath();
  const previewsDir = path.join(assetsDir, '.previews');

  if (!fs.existsSync(previewsDir)) {
    try {
      fs.mkdirSync(previewsDir, { recursive: true });
    } catch (e) {
      return;
    }
  }

  const discovered = state && state.discoveredModels ? state.discoveredModels : [];
  const allModels = ['procedural', 'humanoid', ...discovered];
  const queue = allModels.filter(modelKey => {
    const previewPath = path.join(previewsDir, `${modelKey}.png`);
    return !fs.existsSync(previewPath);
  });

  if (queue.length > 0) {
    console.log(`Starting background preview generator for ${queue.length} models:`, queue);
    const intervalId = setInterval(() => {
      if (queue.length === 0) {
        clearInterval(intervalId);
        return;
      }

      const nextModel = queue.shift();
      generateMascotPreviewInBackground(ctx, nextModel);
    }, 1000);
  }
}

/**
 * Generates preview snapshot PNG offscreen in an isolated Three.js context.
 * @param {Object} ctx - Context dependencies.
 * @param {string} modelKey - Model key string.
 */
export function generateMascotPreviewInBackground(ctx, modelKey) {
  const {
    THREE,
    GLTFLoader,
    renderer,
    fs,
    path,
    pathToFileURL,
    getAssetsPath
  } = ctx;

  if (!renderer || !THREE) return;

  const assetsDir = getAssetsPath();
  const previewsDir = path.join(assetsDir, '.previews');
  const previewPath = path.join(previewsDir, `${modelKey}.png`);

  if (fs.existsSync(previewPath)) return;

  if (modelKey === 'procedural') {
    const previewScene = new THREE.Scene();
    const previewCamera = new THREE.PerspectiveCamera(45, 1.0, 0.1, 100);
    previewCamera.position.set(0, 0, 5.5);
    previewCamera.lookAt(0, 0, 0);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.95);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(3, 4, 5);
    previewScene.add(ambLight);
    previewScene.add(dirLight);

    createProceduralMascot(THREE, previewScene);

    try {
      renderer.render(previewScene, previewCamera);
      const dataUrl = renderer.domElement.toDataURL("image/png");
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(previewPath, base64Data, 'base64');
      console.log(`Generated canonical preview for: procedural`);

      const imgEl = document.querySelector(`.mascot-thumbnail[data-mascot="procedural"]`);
      if (imgEl) {
        imgEl.src = pathToFileURL(previewPath).href + "?t=" + Date.now();
      }
    } catch (e) {
      console.warn("Failed background capture for procedural mascot:", e);
    } finally {
      disposeHierarchy(previewScene);
    }
  } else if (modelKey === 'humanoid') {
    const previewScene = new THREE.Scene();
    const previewCamera = new THREE.PerspectiveCamera(45, 1.0, 0.1, 100);
    previewCamera.position.set(0, 0.2, 5.0);
    previewCamera.lookAt(0, 0.2, 0);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.95);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(3, 4, 5);
    previewScene.add(ambLight);
    previewScene.add(dirLight);

    createProceduralHumanoid(THREE, previewScene);

    try {
      renderer.render(previewScene, previewCamera);
      const dataUrl = renderer.domElement.toDataURL("image/png");
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(previewPath, base64Data, 'base64');
      console.log(`Generated canonical preview for: humanoid`);

      const imgEl = document.querySelector(`.mascot-thumbnail[data-mascot="humanoid"]`);
      if (imgEl) {
        imgEl.src = pathToFileURL(previewPath).href + "?t=" + Date.now();
      }
    } catch (e) {
      console.warn("Failed background capture for humanoid mascot:", e);
    } finally {
      disposeHierarchy(previewScene);
    }
  } else {
    const filePath = path.join(assetsDir, modelKey);
    let fileUrl = filePath;
    try {
      fileUrl = pathToFileURL(filePath).href;
    } catch (e) { }

    const loader = new GLTFLoader();
    loader.load(fileUrl, (gltf) => {
      const previewScene = new THREE.Scene();
      const previewCamera = new THREE.PerspectiveCamera(45, 1.0, 0.1, 100);

      const ambLight = new THREE.AmbientLight(0xffffff, 0.95);
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
      dirLight.position.set(3, 4, 5);
      previewScene.add(ambLight);
      previewScene.add(dirLight);

      const tempModel = gltf.scene || gltf;
      const tempGroup = new THREE.Group();
      previewScene.add(tempGroup);

      // 🎬 In-Animation posing: Play primary clip and advance into animation cycle
      let mixer = null;
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(tempModel);
        const clip = gltf.animations[0];
        const action = mixer.clipAction(clip);
        action.play();
        const duration = clip.duration || 1.0;
        mixer.update(Math.min(duration * 0.25, 0.45));
        tempModel.updateMatrixWorld(true);
      } else {
        tempModel.updateMatrixWorld(true);
      }

      const box = new THREE.Box3().setFromObject(tempModel);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      tempModel.position.set(-center.x, -center.y, -center.z);

      const padding = 1.35;
      const innerGroup = new THREE.Group();
      innerGroup.add(tempModel);
      innerGroup.position.y = - size.y * (padding - 1) / 2;
      tempGroup.add(innerGroup);

      const visibleHeight = size.y * padding;
      const zPos = visibleHeight / (2 * Math.tan((previewCamera.fov * Math.PI) / 360));
      previewCamera.position.set(0, 0, zPos + (size.z / 2));
      previewCamera.lookAt(0, 0, 0);

      try {
        renderer.render(previewScene, previewCamera);
        const dataUrl = renderer.domElement.toDataURL("image/png");
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
        fs.writeFileSync(previewPath, base64Data, 'base64');
        console.log(`Generated canonical in-animation preview for custom model: ${modelKey}`);

        const imgEls = document.querySelectorAll(`.mascot-thumbnail[data-mascot="${modelKey}"], img[data-asset-thumb="${modelKey}"]`);
        imgEls.forEach(imgEl => {
          imgEl.src = pathToFileURL(previewPath).href + "?t=" + Date.now();
        });
      } catch (e) {
        console.warn(`Failed background capture for custom model: ${modelKey}`, e);
      } finally {
        if (mixer) {
          disposeMixer(mixer, tempModel);
        }
        disposeHierarchy(previewScene);
      }
    }, undefined, (err) => {
      console.warn(`Failed to load ${modelKey} for background preview:`, err);
    });
  }
}

/**
 * Purges cached PNG previews and restarts background preview generation queue.
 * @param {Object} ctx - Context dependencies.
 */
export function forceRefreshAllPreviews(ctx) {
  const { fs, path, getAssetsPath, ipcRenderer } = ctx;
  const assetsDir = getAssetsPath();
  const previewsDir = path.join(assetsDir, '.previews');
  if (fs.existsSync(previewsDir)) {
    try {
      const files = fs.readdirSync(previewsDir);
      files.forEach(file => {
        const filePath = path.join(previewsDir, file);
        fs.unlinkSync(filePath);
      });
    } catch (e) {
      console.warn("Could not clear previews folder:", e);
    }
  }

  const thumbnails = document.querySelectorAll('.mascot-thumbnail');
  thumbnails.forEach(img => {
    img.src = DEFAULT_FALLBACK_ICON;
  });

  startBackgroundPreviewGenerator(ctx);

  if (ipcRenderer) {
    ipcRenderer.send('log-diagnostic', '[Preview Refresh] All mascot thumbnail previews refreshed.');
  }
}
