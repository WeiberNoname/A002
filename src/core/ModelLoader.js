/**
 * Core 3D Model Loader Adapter Module
 * Provides backward-compatible procedural facades over SceneStageManager.
 */

import { SceneStageManager } from './SceneStageManager.js';

let sharedStageManager = null;

function getStageManager(ctx) {
  if (!sharedStageManager || (ctx && ctx.scene && sharedStageManager.scene !== ctx.scene)) {
    sharedStageManager = new SceneStageManager(ctx || {});
  } else if (ctx) {
    Object.assign(sharedStageManager, ctx);
    if (ctx.currentSettings) sharedStageManager.currentSettings = ctx.currentSettings;
    if (ctx.state) sharedStageManager.state = ctx.state;
    if (ctx.callbacks) sharedStageManager.callbacks = ctx.callbacks;
  }
  return sharedStageManager;
}

/**
 * Scans the assets directory for valid 3D model files (.glb, .gltf).
 * @param {Object} fs - File system module reference.
 * @param {Function} getAssetsPath - Callback returning absolute assets directory path.
 * @returns {Array<string>} Array of discovered model filenames.
 */
export function scanForModels(fs, getAssetsPath) {
  const manager = getStageManager({ fs, getAssetsPath });
  return manager.scanForModels();
}

/**
 * Detects active model preference and loads appropriate asset.
 * @param {Object} ctx - Context dependencies.
 */
export function detectAndLoadAsset(ctx) {
  const manager = getStageManager(ctx);
  manager.detectAndLoadAsset();
}

/**
 * Safely falls back to procedural mascot if custom model loading fails or is selected.
 * @param {Object} ctx - Context dependencies.
 */
export function fallbackToProcedural(ctx) {
  const manager = getStageManager(ctx);
  manager.loadProceduralModel();
}


/**
 * Loads the native 3D Procedural Cyber Humanoid Mascot cleanly.
 * @param {Object} ctx - Context dependencies.
 */
export function loadHumanoidModel(ctx) {
  const manager = getStageManager(ctx);
  manager.loadHumanoidModel();
}

/**
 * Loads custom GLTF/GLB model from file path cleanly with race condition protection.
 * @param {Object} ctx - Context dependencies.
 * @param {string} filePath - Absolute path or URL to GLTF/GLB file.
 */
export function loadCustomModel(ctx, filePath) {
  const manager = getStageManager(ctx);
  manager.loadCustomModel(filePath);
}

/**
 * Applies selected animation loop based on activeAnimation setting or auto-keyword matching.
 * @param {Object} ctx - Context dependencies.
 */
export function applySelectedAnimation(ctx) {
  const manager = getStageManager(ctx);
  manager.applySelectedAnimation();
}

export { SceneStageManager };
