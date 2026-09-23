/**
 * GPUAssetManager
 * Standardized GPU VRAM Lifecycle & Memory Safety Pipeline.
 * Handles recursive geometry/material/texture disposal, AnimationMixer root uncaching,
 * and a singleton PooledThumbnailRenderer to eliminate WebGL context exhaustion.
 */

/**
 * Standard Three.js texture property names.
 */
const TEXTURE_SLOTS = [
  'map',
  'alphaMap',
  'aoMap',
  'bumpMap',
  'displacementMap',
  'emissiveMap',
  'envMap',
  'lightMap',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
  'specularMap',
  'gradientMap',
  'clearcoatMap',
  'clearcoatRoughnessMap',
  'sheenColorMap',
  'transmissionMap',
  'thicknessMap'
];

/**
 * Recursively disposes all GPU textures and shader uniforms on a material.
 * @param {Object} material - THREE.Material instance.
 */
export function disposeMaterial(material) {
  if (!material) return;

  for (let i = 0; i < TEXTURE_SLOTS.length; i++) {
    const slot = TEXTURE_SLOTS[i];
    const tex = material[slot];
    if (tex && typeof tex.dispose === 'function') {
      try {
        tex.dispose();
      } catch (e) {
        console.warn(`[GPUAssetManager] Error disposing texture ${slot}:`, e);
      }
    }
  }

  // Dispose ShaderMaterial uniforms
  if (material.uniforms) {
    for (const key in material.uniforms) {
      const u = material.uniforms[key];
      if (u && u.value && u.value.isTexture && typeof u.value.dispose === 'function') {
        try {
          u.value.dispose();
        } catch (e) { }
      }
    }
  }

  try {
    material.dispose();
  } catch (e) {
    console.warn('[GPUAssetManager] Error disposing material:', e);
  }
}

/**
 * Traverses a 3D object hierarchy and aggressively disposes all geometries,
 * vertex buffers, materials, textures, skeletons, and child nodes from VRAM.
 * @param {Object} rootNode - THREE.Object3D / THREE.Scene / THREE.Group to recursively clean.
 */
export function disposeHierarchy(rootNode) {
  if (!rootNode) return;

  if (typeof rootNode.traverse === 'function') {
    rootNode.traverse((child) => {
      // 1. Dispose Geometry & Attribute Buffers
      if (child.geometry && typeof child.geometry.dispose === 'function') {
        try {
          child.geometry.dispose();
        } catch (e) {
          console.warn('[GPUAssetManager] Error disposing geometry:', e);
        }
      }

      // 2. Dispose Instanced Mesh Buffers
      if (child.isInstancedMesh && child.instanceMatrix && typeof child.instanceMatrix.dispose === 'function') {
        try {
          child.instanceMatrix.dispose();
        } catch (e) { }
      }

      // 3. Dispose Materials & Attached Textures
      if (child.material) {
        if (Array.isArray(child.material)) {
          for (let i = 0; i < child.material.length; i++) {
            disposeMaterial(child.material[i]);
          }
        } else {
          disposeMaterial(child.material);
        }
      }

      // 4. Dispose Skeletal Rigging & Bone Textures
      if (child.skeleton) {
        if (child.skeleton.boneTexture && typeof child.skeleton.boneTexture.dispose === 'function') {
          try {
            child.skeleton.boneTexture.dispose();
          } catch (e) { }
        }
        if (typeof child.skeleton.dispose === 'function') {
          try {
            child.skeleton.dispose();
          } catch (e) { }
        }
      }
    });
  }

  // 5. Remove all child references to free CPU memory
  if (rootNode.children && Array.isArray(rootNode.children)) {
    while (rootNode.children.length > 0) {
      rootNode.remove(rootNode.children[0]);
    }
  }
}

/**
 * Safely stops and unbinds an AnimationMixer from memory.
 * @param {Object} mixer - THREE.AnimationMixer instance
 * @param {Object} rootNode - Root 3D model node
 */
export function disposeMixer(mixer, rootNode) {
  if (!mixer) return;
  try {
    mixer.stopAllAction();
    if (rootNode && typeof mixer.uncacheRoot === 'function') {
      mixer.uncacheRoot(rootNode);
    }
  } catch (e) {
    console.warn('[GPUAssetManager] Error unbinding mixer:', e);
  }
}

/**
 * Disposes a WebGLRenderer and forces context loss.
 * @param {Object} renderer - THREE.WebGLRenderer
 */
export function disposeRenderer(renderer) {
  if (!renderer) return;
  try {
    if (renderer.renderLists && typeof renderer.renderLists.dispose === 'function') {
      renderer.renderLists.dispose();
    }
    renderer.dispose();
    if (typeof renderer.forceContextLoss === 'function') {
      renderer.forceContextLoss();
    }
  } catch (e) {
    console.warn('[GPUAssetManager] Error disposing renderer:', e);
  }
}

/**
 * Singleton Pooled Thumbnail Renderer
 * Reuses a single WebGL context for offscreen snapshots, completely eliminating
 * browser WebGL context limits (Chromium 16-context cap) and VRAM fragmentation.
 */
class PooledThumbnailRenderer {
  constructor() {
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.width = 256;
    this.height = 256;
    this.initialized = false;
  }

  init(THREE) {
    if (this.initialized || !THREE || typeof document === 'undefined') return;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'low-power'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1.0, 0.1, 100);

    // Studio 3-Point Lighting Rig
    const ambLight = new THREE.AmbientLight(0xffffff, 0.95);
    this.scene.add(ambLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(3.5, 4.5, 5);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    fillLight.position.set(-3.5, 1.5, -2.5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfbbf24, 0.6);
    rimLight.position.set(0, 5, -4);
    this.scene.add(rimLight);

    this.initialized = true;
  }

  /**
   * Renders a model object and returns its data URL, cleanly disposing temporary staging nodes.
   * @param {Object} THREE - Three.js namespace
   * @param {Object} modelObject - Three.js Object3D/Group to snapshot
   * @param {Object} options - { animationMixer, fov, cameraPos }
   * @returns {string|null} Data URL
   */
  captureSnapshot(THREE, modelObject, options = {}) {
    if (!this.initialized) {
      this.init(THREE);
    }
    if (!this.renderer || !this.scene || !this.camera || !modelObject) {
      return null;
    }

    const stageGroup = new THREE.Group();
    stageGroup.add(modelObject);
    this.scene.add(stageGroup);

    try {
      const box = new THREE.Box3().setFromObject(modelObject);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      modelObject.position.set(-center.x, -center.y, -center.z);

      const maxDim = Math.max(size.x, size.y, size.z) || 1.0;
      const fov = this.camera.fov * (Math.PI / 180);
      const distance = (maxDim / 2) / Math.tan(fov / 2) * 1.30;

      this.camera.position.set(distance * 0.42, distance * 0.30, distance * 0.95);
      this.camera.lookAt(0, 0, 0);

      this.renderer.render(this.scene, this.camera);
      const dataUrl = this.canvas.toDataURL('image/png');

      return dataUrl;
    } catch (e) {
      console.warn('[GPUAssetManager] Pooled thumbnail capture failed:', e);
      return null;
    } finally {
      // Remove staging group and dispose only temporary wrapper
      this.scene.remove(stageGroup);
    }
  }

  dispose() {
    if (this.scene) {
      disposeHierarchy(this.scene);
    }
    if (this.renderer) {
      disposeRenderer(this.renderer);
    }
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.initialized = false;
  }
}

export const thumbnailRendererPool = new PooledThumbnailRenderer();
