/**
 * SceneStageManager
 * Unified, memory-safe 3D model lifecycle, skeletal animation loop,
 * texture mapping, and GPU VRAM resource manager.
 */

import { createProceduralMascot } from './MascotBuilder.js';
import { createProceduralHumanoid } from './HumanoidMascotBuilder.js';
import { disposeHierarchy, disposeMixer } from './GPUAssetManager.js';

export class SceneStageManager {
  constructor(deps = {}) {
    this.THREE = deps.THREE || (typeof window !== 'undefined' ? window.THREE : null);
    this.GLTFLoader = deps.GLTFLoader || (typeof window !== 'undefined' ? window.GLTFLoader : null);
    this.scene = deps.scene || null;
    this.camera = deps.camera || null;
    this.renderer = deps.renderer || null;
    this.getAssetsPath = deps.getAssetsPath || null;
    this.fs = deps.fs || null;
    this.path = deps.path || null;
    this.pathToFileURL = deps.pathToFileURL || null;
    this.currentSettings = deps.currentSettings || {};
    this.state = deps.state || {};
    this.callbacks = deps.callbacks || {};

    this.loadToken = 0;
    this.activeModelKey = 'procedural';
    this.characterGroup = null;
    this.innerModelGroup = null;
    this.collisionProxy = null;
    this.humanoidController = null;
    this.mixer = null;
    this.idleAction = null;
    this.reactAction = null;
    this.loadedAnimations = [];
    this.availableAnimations = [];
    this.customModelLoaded = false;
    this.extractedDefaultTextureUrl = null;
  }

  /**
   * Scans the assets folder for available .glb and .gltf files.
   * @returns {Array<string>}
   */
  scanForModels() {
    if (!this.fs || typeof this.getAssetsPath !== 'function') return [];
    const discovered = [];
    const assetsDir = this.getAssetsPath();

    if (!this.fs.existsSync(assetsDir)) {
      try {
        this.fs.mkdirSync(assetsDir, { recursive: true });
      } catch (e) {
        console.warn('[SceneStageManager] Could not create assets directory:', e);
      }
    }

    if (this.fs.existsSync(assetsDir)) {
      try {
        const files = this.fs.readdirSync(assetsDir);
        files.forEach(file => {
          if (file.toLowerCase().endsWith('.glb') || file.toLowerCase().endsWith('.gltf')) {
            discovered.push(file);
          }
        });
      } catch (e) {
        console.warn('[SceneStageManager] Error scanning models:', e);
      }
    }

    if (this.state && typeof this.state.setDiscoveredModels === 'function') {
      this.state.setDiscoveredModels(discovered);
    }
    return discovered;
  }

  /**
   * Systematically cleans up VRAM, geoms, materials, textures, and mixer hooks.
   */
  disposeCurrentModel() {
    if (this.mixer) {
      disposeMixer(this.mixer, this.characterGroup);
      this.mixer = null;
    }
    this.idleAction = null;
    this.reactAction = null;
    this.loadedAnimations = [];
    this.availableAnimations = [];

    if (this.state) {
      this.state.mixer = null;
      this.state.idleAction = null;
      this.state.reactAction = null;
      this.state.loadedAnimations = [];
      this.state.availableAnimations = [];
      this.state.customModelLoaded = false;
    }

    const existingGroup = this.characterGroup || (this.state && this.state.getCharacterGroup ? this.state.getCharacterGroup() : null);
    if (existingGroup && this.scene) {
      disposeHierarchy(existingGroup);
      this.scene.remove(existingGroup);
    }

    this.characterGroup = null;
    this.innerModelGroup = null;
    this.collisionProxy = null;
    this.customModelLoaded = false;
  }

  /**
   * Detects preference and routes to appropriate model builder.
   */
  detectAndLoadAsset() {
    this.scanForModels();
    const active = this.currentSettings.activeModel || 'procedural';

    if (active === 'humanoid' || active === 'procedural_humanoid') {
      this.loadHumanoidModel();
      return;
    }

    if (active === 'flag' || active === 'procedural') {
      this.loadProceduralModel();
      return;
    }

    const discovered = (this.state && this.state.discoveredModels) || [];
    if (discovered.includes(active)) {
      const fullPath = this.path ? this.path.join(this.getAssetsPath(), active) : active;
      this.loadCustomModel(fullPath);
      return;
    }

    if (discovered.length > 0) {
      this.currentSettings.activeModel = discovered[0];
      const fullPath = this.path ? this.path.join(this.getAssetsPath(), discovered[0]) : discovered[0];
      this.loadCustomModel(fullPath);
      return;
    }

    this.currentSettings.activeModel = 'procedural';
    this.loadProceduralModel();
  }

  /**
   * Loads the native Procedural Cyber Humanoid Mascot with Skeletal Joints.
   */
  loadHumanoidModel() {
    this.loadToken++;
    this.disposeCurrentModel();
    this.activeModelKey = 'humanoid';
    this.currentSettings.activeModel = 'humanoid';

    const targetW = (typeof window !== 'undefined' && window.innerWidth) || this.currentSettings.width || 350;
    const targetH = (typeof window !== 'undefined' && window.innerHeight) || this.currentSettings.height || 350;
    if (this.camera) {
      this.camera.aspect = targetW / targetH;
      this.camera.updateProjectionMatrix();
      this.camera.position.set(0, 0, 5.0);
      this.camera.lookAt(0, 0, 0);
    }
    if (this.renderer) {
      this.renderer.setSize(targetW, targetH);
    }

    if (this.THREE && this.scene) {
      const result = createProceduralHumanoid(this.THREE, this.scene);
      if (result) {
        const scale = this.currentSettings.scale || 1.0;
        result.characterGroup.scale.set(scale, scale, scale);
        this.scene.add(result.characterGroup);
        this.characterGroup = result.characterGroup;
        this.innerModelGroup = result.innerModelGroup;
        this.collisionProxy = result.collisionProxy;
        this.humanoidController = result;
        this.availableAnimations = result.availableAnimations || ['Idle', 'Wave', 'Dance', 'Look_Around'];

        if (this.state.setCharacterGroup) this.state.setCharacterGroup(result.characterGroup);
        if (this.state.setInnerModelGroup) this.state.setInnerModelGroup(result.innerModelGroup);
        if (this.state.setCollisionProxy) this.state.setCollisionProxy(result.collisionProxy);
      }
    }

    if (this.callbacks.populateAnimationDropdown) {
      this.callbacks.populateAnimationDropdown();
    }
  }

  /**
   * Loads the native Procedural Bunny Mascot.
   */
  loadProceduralModel() {
    this.loadToken++;
    this.disposeCurrentModel();
    this.activeModelKey = 'procedural';
    this.currentSettings.activeModel = 'procedural';

    const targetW = (typeof window !== 'undefined' && window.innerWidth) || this.currentSettings.width || 350;
    const targetH = (typeof window !== 'undefined' && window.innerHeight) || this.currentSettings.height || 350;
    if (this.camera) {
      this.camera.aspect = targetW / targetH;
      this.camera.updateProjectionMatrix();
      this.camera.position.set(0, 0, 4.8);
      this.camera.lookAt(0, 0, 0);
    }
    if (this.renderer) {
      this.renderer.setSize(targetW, targetH);
    }

    if (this.callbacks.createMascot) {
      this.callbacks.createMascot();
    } else if (this.THREE && this.scene) {
      const charGroup = new this.THREE.Group();
      const res = createProceduralMascot(this.THREE, charGroup);
      const scale = this.currentSettings.scale || 1.0;
      charGroup.scale.set(scale, scale, scale);
      this.scene.add(charGroup);
      this.characterGroup = charGroup;
      if (this.state.setCharacterGroup) this.state.setCharacterGroup(charGroup);
      if (res && res.innerModelGroup && this.state.setInnerModelGroup) this.state.setInnerModelGroup(res.innerModelGroup);
      if (res && res.collisionProxy && this.state.setCollisionProxy) this.state.setCollisionProxy(res.collisionProxy);
    }

    if (this.callbacks.populateAnimationDropdown) {
      this.callbacks.populateAnimationDropdown();
    }
  }


  /**
   * Loads custom GLTF/GLB model from file path, object URL, or blob.
   * @param {string} filePath - Path or URL string.
   */
  loadCustomModel(filePath) {
    const currentLoadId = ++this.loadToken;
    this.disposeCurrentModel();

    let fileUrl = filePath;
    if (typeof filePath === 'string' && (filePath.startsWith('blob:') || filePath.startsWith('data:') || filePath.startsWith('http:') || filePath.startsWith('https:'))) {
      fileUrl = filePath;
    } else if (this.pathToFileURL && typeof filePath === 'string') {
      try {
        fileUrl = this.pathToFileURL(filePath).href;
      } catch (e) {
        console.warn('[SceneStageManager] Could not convert path to file URL:', e);
      }
    }

    const LoaderClass = this.GLTFLoader || (typeof window !== 'undefined' ? window.GLTFLoader : null);
    if (!LoaderClass || !this.THREE || !this.scene) {
      console.warn('[SceneStageManager] Three.js or GLTFLoader unavailable, falling back');
      this.loadProceduralModel();
      return;
    }

    try {
      const loader = new LoaderClass();
      loader.load(fileUrl, (gltf) => {
        if (currentLoadId !== this.loadToken) {
          console.log('[SceneStageManager] Discarding stale GLTF load');
          return;
        }

        const model = gltf.scene || gltf;
        const charGroup = new this.THREE.Group();
        this.scene.add(charGroup);
        this.characterGroup = charGroup;
        if (this.state.setCharacterGroup) this.state.setCharacterGroup(charGroup);

        const box = new this.THREE.Box3().setFromObject(model);
        const size = box.getSize(new this.THREE.Vector3());
        const center = box.getCenter(new this.THREE.Vector3());

        model.position.set(-center.x, -center.y, -center.z);

        // Find primary diffuse atlas and preserve native materials
        let maxTexPixels = 0;
        let bestTextureImg = null;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              if (!child.userData.originalMaterial) {
                child.userData.originalMaterial = Array.isArray(child.material)
                  ? child.material.map(m => m.clone())
                  : child.material.clone();
              }
              materials.forEach(mat => {
                mat.side = this.THREE.DoubleSide;
                mat.needsUpdate = true;
                if (mat.map && mat.map.image) {
                  mat.map.needsUpdate = true;
                  const img = mat.map.image;
                  const w = img.width || img.naturalWidth || 0;
                  const h = img.height || img.naturalHeight || 0;
                  const pixels = w * h;
                  if (pixels > maxTexPixels && w >= 64 && h >= 64) {
                    maxTexPixels = pixels;
                    bestTextureImg = img;
                  } else if (!bestTextureImg && pixels > 0) {
                    bestTextureImg = img;
                  }
                }
              });
            }
          }
        });

        if (bestTextureImg && typeof document !== 'undefined') {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = bestTextureImg.width || bestTextureImg.naturalWidth || 512;
            canvas.height = bestTextureImg.height || bestTextureImg.naturalHeight || 512;
            const ctx2d = canvas.getContext('2d');
            ctx2d.drawImage(bestTextureImg, 0, 0, canvas.width, canvas.height);
            this.extractedDefaultTextureUrl = canvas.toDataURL('image/png');
            if (typeof window !== 'undefined') {
              window.__activeModelDefaultTextureUrl = this.extractedDefaultTextureUrl;
              if (window.__assetRegistryManager) {
                window.__assetRegistryManager.notify();
              }
            }
          } catch (e) {
            console.warn('[SceneStageManager] Could not extract model texture canvas:', e);
          }
        }

        const padding = 1.35;
        const innerGroup = new this.THREE.Group();
        innerGroup.add(model);
        innerGroup.position.y = - size.y * (padding - 1) / 2;

        charGroup.add(innerGroup);
        this.innerModelGroup = innerGroup;
        if (this.state.setInnerModelGroup) this.state.setInnerModelGroup(innerGroup);

        const proxyGeom = new this.THREE.BoxGeometry(size.x, size.y, size.z);
        const proxyMat = new this.THREE.MeshBasicMaterial({ visible: false });
        const collisionProxy = new this.THREE.Mesh(proxyGeom, proxyMat);
        collisionProxy.position.set(0, 0, 0);
        innerGroup.add(collisionProxy);
        this.collisionProxy = collisionProxy;
        if (this.state.setCollisionProxy) this.state.setCollisionProxy(collisionProxy);

        const scale = this.currentSettings.scale || 1.0;
        charGroup.scale.set(scale, scale, scale);

        const targetW = (typeof window !== 'undefined' && window.innerWidth) || this.currentSettings.width || 350;
        const targetH = (typeof window !== 'undefined' && window.innerHeight) || this.currentSettings.height || 350;
        if (this.camera) {
          const aspect = targetW / targetH;
          this.camera.aspect = aspect;
          this.camera.updateProjectionMatrix();
          const fovRad = (this.camera.fov * Math.PI) / 360;
          const requiredDistanceY = (size.y * padding) / (2 * Math.tan(fovRad));
          const requiredDistanceX = (size.x * padding) / (2 * Math.tan(fovRad) * aspect);
          const zPos = Math.max(requiredDistanceY, requiredDistanceX, 2.5) + ((size.z) / 2);
          this.camera.position.set(0, 0, zPos);
          this.camera.lookAt(0, 0, 0);
        }
        if (this.renderer) {
          this.renderer.setSize(targetW, targetH);
        }

        this.loadedAnimations = gltf.animations || [];
        this.availableAnimations = this.loadedAnimations.map((clip, idx) => clip.name || `Animation ${idx + 1}`);
        if (this.state) {
          this.state.loadedAnimations = this.loadedAnimations;
          this.state.availableAnimations = this.availableAnimations;
        }

        if (this.loadedAnimations.length > 0) {
          this.mixer = new this.THREE.AnimationMixer(model);
          if (this.state) this.state.mixer = this.mixer;
          this.applySelectedAnimation();
        }

        this.customModelLoaded = true;
        if (this.state) this.state.customModelLoaded = true;

        if (this.callbacks.populateAnimationDropdown) {
          this.callbacks.populateAnimationDropdown();
        }

        const fileName = (this.path && typeof filePath === 'string') ? this.path.basename(filePath) : filePath;
        setTimeout(() => {
          if (this.callbacks.generateModelPreview) this.callbacks.generateModelPreview(fileName);
        }, 150);
      }, undefined, (error) => {
        if (currentLoadId === this.loadToken) {
          console.error('[SceneStageManager] Failed to load custom GLB/GLTF model:', error);
          this.loadProceduralModel();
        }
      });
    } catch (err) {
      if (currentLoadId === this.loadToken) {
        console.error('[SceneStageManager] Synchronous loader crash:', err);
        this.loadProceduralModel();
      }
    }
  }

  /**
   * Applies selected animation loop based on activeAnimation setting or auto-keyword matching.
   */
  applySelectedAnimation() {
    if (!this.mixer || !this.THREE) return;

    this.mixer.stopAllAction();
    this.idleAction = null;
    this.reactAction = null;
    if (this.state) {
      this.state.idleAction = null;
      this.state.reactAction = null;
    }

    if (this.currentSettings.activeAnimation === 'none') {
      console.log('[SceneStageManager] Animation is set to none (static pose).');
      return;
    }

    const clips = this.loadedAnimations || [];
    if (clips.length === 0) return;

    let targetClip = null;

    if (this.currentSettings.activeAnimation && this.currentSettings.activeAnimation !== 'default') {
      targetClip = clips.find(c => (c.name || '').toLowerCase() === this.currentSettings.activeAnimation.toLowerCase());
      if (!targetClip) {
        const idx = parseInt(this.currentSettings.activeAnimation.replace('Animation ', ''), 10) - 1;
        if (!isNaN(idx) && clips[idx]) targetClip = clips[idx];
      }
    }

    if (!targetClip) {
      const idleKeywords = ['idle', 'stay', 'breathe', 'stand', 'look', 'loop', 'default', 'walk', 'run'];
      targetClip = clips.find(clip => {
        const name = (clip.name || '').toLowerCase();
        return idleKeywords.some(keyword => name.includes(keyword));
      });
      if (!targetClip) {
        targetClip = clips[0];
      }
    }

    if (clips.length > 1) {
      const reactKeywords = ['jump', 'spin', 'click', 'react', 'interact', 'pet', 'wave', 'dance', 'happy'];
      const reactClip = clips.find(clip => {
        const name = (clip.name || '').toLowerCase();
        return reactKeywords.some(keyword => name.includes(keyword)) && clip !== targetClip;
      });
      if (reactClip) {
        this.reactAction = this.mixer.clipAction(reactClip);
        this.reactAction.setLoop(this.THREE.LoopOnce);
        this.reactAction.clampWhenFinished = true;
        if (this.state) this.state.reactAction = this.reactAction;
      }
    }

    if (targetClip) {
      this.idleAction = this.mixer.clipAction(targetClip);
      this.idleAction.setLoop(this.THREE.LoopRepeat);
      this.idleAction.setEffectiveWeight(1.0);
      this.idleAction.setEffectiveTimeScale(1.0);
      this.idleAction.reset().play();
      if (this.state) this.state.idleAction = this.idleAction;
    }
  }

  /**
   * Applies a texture to the active mesh or restores original materials.
   * @param {string} textureUrl - Data URL or image path.
   */
  applyTexture(textureUrl) {
    if (!this.innerModelGroup || !this.THREE) return;


    if (this.currentSettings.flagPreset === 'model_default' || !textureUrl) {
      this.innerModelGroup.traverse((child) => {
        if (child.isMesh && child.userData.originalMaterial) {
          child.material = Array.isArray(child.userData.originalMaterial)
            ? child.userData.originalMaterial.map(m => m.clone())
            : child.userData.originalMaterial.clone();
          child.material.needsUpdate = true;
        }
      });
      return;
    }

    const textureLoader = new this.THREE.TextureLoader();
    textureLoader.load(textureUrl, (loadedTex) => {
      loadedTex.flipY = false;
      loadedTex.wrapS = this.THREE.RepeatWrapping;
      loadedTex.wrapT = this.THREE.RepeatWrapping;
      loadedTex.repeat.set(this.currentSettings.textureRepeatX || 1.0, this.currentSettings.textureRepeatY || 1.0);

      this.innerModelGroup.traverse((child) => {
        if (child.isMesh && child.material && !child.name.toLowerCase().includes('eye')) {
          const mat = Array.isArray(child.material) ? child.material[0] : child.material;
          mat.map = loadedTex;
          mat.roughness = this.currentSettings.textureRoughness !== undefined ? this.currentSettings.textureRoughness : 0.50;
          mat.metalness = this.currentSettings.textureMetalness !== undefined ? this.currentSettings.textureMetalness : 0.05;
          mat.needsUpdate = true;
        }
      });
    });
  }

  /**
   * Advances the animation mixer by delta time.
   * @param {number} delta - Delta time in seconds.
   */
  update(delta) {
    if (this.mixer) {
      this.mixer.update(delta);
    }
  }
}
