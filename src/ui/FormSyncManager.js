/**
 * Settings Form Synchronization Manager Module (<80 lines)
 * Encapsulates form slider synchronization, animation clip selection dropdown population, and spotlight card UI rendering.
 */

import { gatherSettingsFormElements } from './FormDOMGatherer.js';

export function createFormSyncManager(deps) {
  const {
    currentSettings,
    availableAnimations,
    syncSlidersUIUtil,
    populateAnimationDropdownUtil,
    updateXYZVisibility,
    updateStageLighting,
    saveSettingsFile,
    t
  } = deps;

  const syncSlidersUI = () => {
    const elements = gatherSettingsFormElements();
    const valWidth = document.getElementById('val-width');
    const valHeight = document.getElementById('val-height');
    const valScale = document.getElementById('val-scale');
    const valSpeedX = document.getElementById('val-speed-x');
    const valSpeedY = document.getElementById('val-speed-y');
    const valSpeedZ = document.getElementById('val-speed-z');
    const valTargetFps = document.getElementById('val-target-fps');
    const valPhysicsGravity = document.getElementById('val-physics-gravity');
    const valPhysicsElasticity = document.getElementById('val-physics-elasticity');
    const valFontScale = document.getElementById('val-font-scale');
    const valAmbientIntensity = document.getElementById('val-ambient-intensity');
    const panel = document.getElementById('settings-panel');

    syncSlidersUIUtil({
      currentSettings,
      ...elements,
      valWidth,
      valHeight,
      valScale,
      valSpeedX,
      valSpeedY,
      valSpeedZ,
      valTargetFps,
      valPhysicsGravity,
      valPhysicsElasticity,
      valFontScale,
      panel,
      valAmbientIntensity,
      updateXYZVisibility,
      populateAnimationDropdown,
      updateStageLighting
    });
  };

  const populateAnimationDropdown = () => {
    const animSelect = document.getElementById('anim-select');
    const modelSelect = document.getElementById('model-select');
    const clips = typeof deps.getAvailableAnimations === 'function'
      ? deps.getAvailableAnimations()
      : (deps.availableAnimations || []);
    populateAnimationDropdownUtil({
      animSelect,
      modelSelect,
      availableAnimations: clips,
      currentSettings
    });
  };

  return {
    syncSlidersUI,
    populateAnimationDropdown
  };
}
