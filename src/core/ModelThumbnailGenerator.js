/**
 * ModelThumbnailGenerator
 * Memory-safe offscreen WebGL snapshot engine backed by GPUAssetManager's
 * singleton PooledThumbnailRenderer to eliminate WebGL context exhaustion and VRAM leaks.
 */

import { thumbnailRendererPool, disposeHierarchy, disposeMixer } from './GPUAssetManager.js';

export class ModelThumbnailGenerator {
  /**
   * Captures an offscreen beauty-angle snapshot of a 3D model, automatically posing
   * skeletal animations into an active in-motion frame if animations exist.
   * @param {Object} deps - Dependencies: { file, objectUrl, THREE, GLTFLoader, width, height, animationTime }
   * @returns {Promise<string|null>} Data URL of the generated PNG thumbnail
   */
  static async captureModelSnapshot(deps = {}) {
    const {
      file,
      objectUrl,
      THREE = (typeof window !== 'undefined' ? window.THREE : null),
      GLTFLoader = (typeof window !== 'undefined' ? window.GLTFLoader : null),
      animationTime = 0.35
    } = deps;

    if (!THREE || !GLTFLoader || (!file && !objectUrl)) {
      return null;
    }

    const url = objectUrl || (file ? URL.createObjectURL(file) : null);
    if (!url) return null;

    return new Promise((resolve) => {
      try {
        const loader = new GLTFLoader();
        loader.load(url, (gltf) => {
          let mixer = null;
          let model = null;
          try {
            model = gltf.scene || gltf;

            // In-Animation Posing:
            if (gltf.animations && gltf.animations.length > 0) {
              mixer = new THREE.AnimationMixer(model);
              const primaryClip = gltf.animations[0];
              const action = mixer.clipAction(primaryClip);
              action.play();

              const duration = primaryClip.duration || 1.0;
              const sample = (animationTime !== undefined && animationTime > 0)
                ? Math.min(animationTime, duration)
                : Math.min(duration * 0.25, 0.45);

              mixer.update(sample);
              model.updateMatrixWorld(true);
            } else {
              model.updateMatrixWorld(true);
            }

            // Capture snapshot using the singleton Pooled WebGL context
            const dataUrl = thumbnailRendererPool.captureSnapshot(THREE, model);

            resolve(dataUrl);
          } catch (e) {
            console.warn('[ModelThumbnailGenerator] Render capture failed:', e);
            resolve(null);
          } finally {
            // Clean up temporary model and mixer from GPU memory
            if (mixer) {
              disposeMixer(mixer, model);
            }
            if (model) {
              disposeHierarchy(model);
            }
          }
        }, undefined, (err) => {
          console.warn('[ModelThumbnailGenerator] GLTF load failed:', err);
          resolve(null);
        });
      } catch (err) {
        console.warn('[ModelThumbnailGenerator] Unexpected error:', err);
        resolve(null);
      }
    });
  }

  /**
   * Captures the live in-animation frame from an active Three.js renderer canvas.
   * @param {HTMLCanvasElement} canvas - Active WebGL canvas element
   * @returns {string|null} Data URL of the snapshot
   */
  static captureLiveCanvasSnapshot(canvas) {
    if (!canvas) return null;
    try {
      return canvas.toDataURL('image/png');
    } catch (e) {
      console.warn('[ModelThumbnailGenerator] Live canvas capture error:', e);
      return null;
    }
  }
}
